# TECHNICAL GUIDE: EIP-7702 Delegation and Revocation

## Overview
EIP-7702 (Set ECDSA key as an authorized smart contract signer) introduces a standardized mechanism that allows an EOA (externally owned account) to delegate authority to a smart contract or another entity through a structured authorization. This enables account abstraction-like behavior while preserving EOA compatibility and wallet UX. This guide covers the specification, delegation and revocation flows, transaction structures, authorization format, gas/security trade-offs, verification, reference implementations using Viem and low-level code, and current network support including Base.

## Goals and Properties
- Backward-compatible with EOAs and existing tooling
- Explicit, signed authorization objects that can be attached to transactions
- Revocable delegation with clear validity windows and replay protection
- Verifiable by clients, contracts, and indexers
- Extensible for session keys, meta-transactions, and paymasters

## Key Concepts
- Delegator: The EOA that owns the private key and grants authority
- Delegate/Authorized: The contract or EOA that is allowed to act on behalf of delegator
- Authorization: A typed payload signed by the delegator that specifies scope and constraints
- Verifier: Logic (client or contract) that checks signature validity, domain separation, limits, and replay protection

## Authorization Object (Canonical Fields)
While specific client libs may vary, an authorization generally includes:
- chainId: EIP-155 chain ID for replay protection
- delegator: Address of EOA granting authority
- authorized: Address receiving authority (smart contract or EOA)
- nonce: Monotonic counter or unique salt scoped to delegator, prevents replay
- validAfter / validUntil: Optional timestamps or block numbers defining validity window
- callType / mode: Whether authorization applies to a specific call pattern (e.g., call, delegatecall, create)
- maxGas / maxFee: Optional spending caps
- context: Optional opaque bytes to bind to a session/context
- signature: ECDSA signature by delegator over the typed data domain and struct

Note: Concrete wire format is commonly implemented using EIP-712 typed data for human readability and wallet compatibility.

## Transaction Attachment
- Authorization can be attached to a transaction by the authorized party or relayer
- The transaction’s from may remain the authorized party while the execution respects the delegator’s authority via verification hooks
- Alternatively, a dedicated entry point contract can accept the authorization and execute the intended call if valid

## Delegation Flow
1) Delegator prepares an Authorization struct with desired constraints
2) Delegator signs EIP-712 typed data using their EOA key
3) Delegate (or relayer) submits a transaction including the Authorization and intended call data
4) On-chain logic verifies the signature and constraints; if valid, proceeds as if acting with delegator’s authority

## Revocation Flow
Revocation is crucial for safety:
- Strategy A: On-chain revocation registry mapping (delegator, authorized, nonce or sessionId) => revoked
- Strategy B: Nonce invalidation: increment monotonic nonce so older sessions become invalid
- Strategy C: Validity window expiry (validUntil) for short-lived sessions
- Strategy D: Scope-limited authorizations that cannot perform critical actions

When revoking on-chain, the delegator (or a break-glass guardian) sends a revoke transaction that updates the registry. Verification logic MUST check the registry before accepting an authorization.

## Verification Logic (High-Level)
Given (auth, signature, callData):
- Check chainId, domain separator, and typed data hash
- Recover signer from signature; require signer == delegator
- Validate validity window (block.timestamp within [validAfter, validUntil])
- Check nonce policy: require nonce unused and mark as used
- Check on-chain revocation registry: require not revoked(authKey)
- Optionally enforce scope: target, function selectors, value, gas caps
- If all pass, execute call on behalf of delegator

## Security Model and Considerations
- Principle of least privilege: scope authorized target(s) and functions narrowly
- Time-bounded sessions: prefer short validUntil and refresh when needed
- Nonce strategy: per-session random salt plus mapping to prevent collisions
- Replay protection: EIP-155 chainId + nonce + per-delegator salt
- Signature malleability: enforce EIP-2/EIP-2098 normalized signatures and strict v in {27,28} or yParity format
- Storage DoS: store compact revocation keys (e.g., keccak of canonical auth) rather than whole structs
- Gas griefing: provide maxGas/maxFee bounds in auth; reject if exceeded
- Upgradability risks: if using upgradeable verifiers/entry points, protect with timelocks and audits
- Phishing: UX should clearly show who is delegating to whom and the scope/time

## Gas Considerations
- Verifying EIP-712 ECDSA costs ~3k-6k for keccak plus 3k for ecrecover precompile (actual around 3k + 3k + 150 gas/word, network dependent)
- Reading/writing nonce and revocation mappings cost SLOAD/SSTORE; consider event-based revocation with bitmap compression
- Bundling multiple calls via a single authorization amortizes verification cost
- Using CREATE2 salts or context bytes can avoid extra storage writes

## Reference Types (EIP-712)
Domain:
- name: "EIP-7702 Authorization"
- version: "1"
- chainId
- verifyingContract: address of verifier or registry (if applicable)

Types Authorization:
- delegator: address
- authorized: address
- nonce: uint256
- validAfter: uint48
- validUntil: uint48
- callType: uint8
- maxGas: uint256
- maxFeePerGas: uint256
- context: bytes

Hash: keccak256(abi.encode(…)) as per EIP-712

## Solidity: Minimal Verifier Example
pragma solidity ^0.8.24;

library Sig {
    function recover(bytes32 digest, bytes memory signature) internal pure returns (address) {
        if (signature.length == 65) {
            bytes32 r; bytes32 s; uint8 v;
            assembly { r := mload(add(signature, 0x20)) s := mload(add(signature, 0x40)) v := byte(0, mload(add(signature, 0x60))) }
            require(v == 27 || v == 28, "bad v");
            return ecrecover(digest, v, r, s);
        } else if (signature.length == 64) {
            bytes32 r; bytes32 vs; assembly { r := mload(add(signature, 0x20)) vs := mload(add(signature, 0x40)) }
            bytes32 s = vs & bytes32(0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff);
            uint8 v = uint8((uint256(vs) >> 255) + 27);
            return ecrecover(digest, v, r, s);
        } else {
            revert("bad sig len");
        }
    }
}

contract RevocationRegistry {
    event Revoked(bytes32 authKey);
    mapping(bytes32 => bool) public revoked;
    function revoke(bytes32 authKey) external {
        revoked[authKey] = true;
        emit Revoked(authKey);
    }
}

contract EIP7702Verifier {
    bytes32 public constant AUTH_TYPEHASH = keccak256(
        "Authorization(address delegator,address authorized,uint256 nonce,uint48 validAfter,uint48 validUntil,uint8 callType,uint256 maxGas,uint256 maxFeePerGas,bytes context)"
    );
    bytes32 public immutable DOMAIN_SEPARATOR;
    RevocationRegistry public immutable registry;
    mapping(address => uint256) public nonces; // simple nonce policy per delegator

    constructor(string memory name, address _registry) {
        DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes(name)),
            keccak256(bytes("1")),
            block.chainid,
            address(this)
        ));
        registry = RevocationRegistry(_registry);
    }

    struct Authorization { address delegator; address authorized; uint256 nonce; uint48 validAfter; uint48 validUntil; uint8 callType; uint256 maxGas; uint256 maxFeePerGas; bytes context; }

    function hashAuth(Authorization memory a) public pure returns (bytes32) {
        return keccak256(abi.encode(
            AUTH_TYPEHASH, a.delegator, a.authorized, a.nonce, a.validAfter, a.validUntil, a.callType, a.maxGas, a.maxFeePerGas, keccak256(a.context)
        ));
    }

    function verify(Authorization memory a, bytes memory sig) public view returns (bool) {
        // domain separation
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, hashAuth(a)));
        address signer = Sig.recover(digest, sig);
        if (signer != a.delegator) return false;
        if (a.validAfter != 0 && block.timestamp < a.validAfter) return false;
        if (a.validUntil != 0 && block.timestamp > a.validUntil) return false;
        bytes32 authKey = keccak256(abi.encodePacked(block.chainid, a.delegator, a.authorized, a.nonce));
        if (registry.revoked(authKey)) return false;
        if (a.nonce != nonces[a.delegator]) return false; // simple monotonic policy
        return true;
    }

    function consumeAndExecute(Authorization calldata a, bytes calldata sig, address to, uint256 value, bytes calldata data) external payable {
        require(verify(a, sig), "invalid auth");
        nonces[a.delegator] = a.nonce + 1;
        // execute as regular call; advanced patterns may support delegatecall/create
        (bool ok, bytes memory ret) = to.call{value: value, gas: a.maxGas}(data);
        require(ok, string(ret));
    }
}

## Viem Example (TypeScript)
import { createWalletClient, http, parseEther, encodeFunctionData } from "viem";
import { base } from "viem/chains";

// Typed data
const domain = {
  name: "EIP-7702 Authorization",
  version: "1",
  chainId: base.id,
  verifyingContract: "0xVerifierAddress",
} as const;

const types = {
  Authorization: [
    { name: "delegator", type: "address" },
    { name: "authorized", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "validAfter", type: "uint48" },
    { name: "validUntil", type: "uint48" },
    { name: "callType", type: "uint8" },
    { name: "maxGas", type: "uint256" },
    { name: "maxFeePerGas", type: "uint256" },
    { name: "context", type: "bytes" },
  ],
} as const;

const auth = {
  delegator: "0xDEAD...",
  authorized: "0xBEEF...",
  nonce: 0n,
  validAfter: 0n,
  validUntil: 0n,
  callType: 0,
  maxGas: 1_000_000n,
  maxFeePerGas: 20_000_000_000n,
  context: "0x",
} as const;

const client = createWalletClient({ chain: base, transport: http() });
const signature = await client.signTypedData({ domain, types, primaryType: "Authorization", message: auth, account: "0xDEAD..." });

// Submit to Verifier contract
// e.g., consumeAndExecute(a, sig, to, value, data)

## Low-Level Encoding Notes
- EIP-712 hash: keccak256(0x1901 || domainSeparator || structHash)
- 2098 64-byte signatures pack v into highest bit of s (yParity)
- authKey recommendation: keccak256(chainId || delegator || authorized || nonce)
- Use abi.encode with keccak256(a.context) to avoid variable-length ambiguity

## Verification & Testing
- Unit tests: signature recovery, boundary timestamps, nonce increments, revoked cases
- Property tests: randomized contexts, gas caps, and re-entrancy behavior
- Fuzz: invalid v/s, altered domain, altered fields across chains
- On-chain events: emit AuthorizationUsed and Revoked for indexing
- Off-chain verification: replicate EIP-712 hash and ecrecover to cross-check

## Network Support
- Ethereum mainnet: subject to client/wallet support for attached authorizations
- Base network (chainId 8453): Viem example above shows domain chainId and typical RPC usage; recommend verifying gasPrice and blob fees (if applicable) and using EIP-1559
- Testnets: Base Sepolia (84532) recommended for testing; use faucets and lower maxFeePerGas

## Operational Guidance
- Keep revocation endpoints accessible and publicized
- Provide emergency revoke script that bumps nonce or writes to registry
- Expose read-only view helpers for frontends to show active delegations
- Document threat model and assumptions

## Commit Message
Add comprehensive technical documentation
