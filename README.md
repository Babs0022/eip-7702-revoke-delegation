# EIP-7702 Delegation Revocation Guide

> Complete guide and implementation for revoking EIP-7702 delegations on EVM addresses. Includes code examples, scripts, and comprehensive documentation.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Viem](https://img.shields.io/badge/Viem-2.21-green.svg)](https://viem.sh/)

## 📑 Table of Contents

- [Overview](#overview)
- [What is EIP-7702?](#what-is-eip-7702)
- [How Revocation Works](#how-revocation-works)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Technical Details](#technical-details)
- [Security Considerations](#security-considerations)
- [Resources](#resources)

## 🔍 Overview

This repository provides a complete implementation guide for revoking EIP-7702 delegations on any EVM address. EIP-7702 allows Externally Owned Accounts (EOAs) to temporarily behave like smart contracts by delegating their code execution to a contract. This guide shows you how to safely revoke such delegations.

## 🤖 What is EIP-7702?

EIP-7702 ("Set EOA account code for one transaction") is an Ethereum Improvement Proposal that enables EOAs to temporarily delegate their code execution to a smart contract. This provides:

- ✅ Smart account capabilities for regular wallets
- ✅ Batch transaction execution
- ✅ Gasless transactions (via paymasters)
- ✅ Enhanced security features
- ✅ **Reversible delegation** (can be revoked at any time)

### Key Features

- **Temporary Delegation**: Only active during the transaction
- **Authorization-based**: Requires explicit signature from the EOA
- **Revocable**: Can be cleared by delegating to zero address
- **Backward Compatible**: Works with existing Ethereum infrastructure

## 🔄 How Revocation Works

### The Revocation Mechanism

To revoke an EIP-7702 delegation, you simply **delegate to the zero address** (`0x0000000000000000000000000000000000000000`). This clears the delegation and returns your EOA to its normal state.

### Step-by-Step Process

1. **Sign Authorization**: Create an authorization object with the zero address as the target
2. **Send Transaction**: Include the authorization in an EIP-7702 transaction
3. **Confirmation**: Once mined, the delegation is cleared

```typescript
// The key to revocation: delegate to zero address
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const authorization = await client.signAuthorization({
  contractAddress: ZERO_ADDRESS, // This revokes the delegation
});
```

## ⚙️ Prerequisites

Before using this repository, ensure you have:

- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager
- **Private key** of the EOA you want to revoke delegation from
- **RPC endpoint** (e.g., Alchemy, Infura, or public RPC)
- **Basic understanding** of Ethereum and smart contracts

## 📦 Installation

1. **Clone the repository:**

```bash
git clone https://github.com/Babs0022/eip-7702-revoke-delegation.git
cd eip-7702-revoke-delegation
```

2. **Install dependencies:**

```bash
npm install
# or
yarn install
```

3. **Set up environment variables:**

```bash
cp .env.example .env
```

## 🔑 Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Your EOA private key (DO NOT COMMIT THIS FILE)
PRIVATE_KEY=your_private_key_here

# RPC endpoint URL
RPC_URL=https://eth.llamarpc.com

# (Optional) For delegation script - contract address to delegate to
DELEGATION_CONTRACT=0x...
```

**⚠️ Security Warning**: Never commit your `.env` file or expose your private key!

## 🚀 Usage

### Revoke Delegation

To revoke an existing EIP-7702 delegation:

```bash
npm run revoke
```

This script will:
1. Load your account from the private key
2. Sign an authorization to delegate to zero address
3. Send the transaction to revoke the delegation
4. Display the transaction hash and confirmation

### Establish Delegation

To set up a new delegation (opposite of revocation):

```bash
npm run delegate
```

**Note**: Make sure to set `DELEGATION_CONTRACT` in your `.env` file first.

### Check Current Delegation Status

```bash
npm run check-delegation
```

## 🔌 Technical Details

### Authorization Structure

An EIP-7702 authorization tuple contains:

```typescript
interface Authorization {
  chainId: bigint;      // Network chain ID
  address: Address;     // Contract address to delegate to (0x0 for revocation)
  nonce: bigint;        // Current nonce of the EOA
  yParity: number;      // Signature recovery bit
  r: Hex;               // Signature r value
  s: Hex;               // Signature s value
}
```

### Transaction Flow

```
1. EOA signs authorization with address = 0x0
   ↓
2. Transaction includes authorizationList
   ↓
3. EVM processes authorization during transaction
   ↓
4. Delegation is cleared, EOA returns to normal state
   ↓
5. Transaction completes successfully
```

### Code Implementation

The revocation script (`scripts/revoke.ts`) demonstrates:

- ✅ Signing authorization with viem
- ✅ Setting delegation target to zero address
- ✅ Sending EIP-7702 transaction
- ✅ Error handling and logging
- ✅ Transaction confirmation

### Gas Considerations

- Revocation transactions are standard EIP-7702 transactions
- Gas costs are similar to regular transactions
- No additional contract interaction required
- Estimated gas: ~50,000 - 100,000 units

## 🔒 Security Considerations

### Best Practices

1. **🔑 Private Key Security**
   - Never share or commit your private key
   - Use hardware wallets when possible
   - Keep `.env` in `.gitignore`

2. **✅ Verify Transactions**
   - Always review transaction details before signing
   - Check the delegation target address
   - Verify the chain ID matches your network

3. **🛡️ Delegation Safety**
   - Only delegate to audited contracts
   - Understand what the delegated contract can do
   - Revoke delegations when no longer needed

4. **🌐 Network Awareness**
   - Ensure you're on the correct network
   - Use testnet for experimentation
   - Mainnet delegations involve real assets

### Potential Risks

- **Malicious Contracts**: Delegating to unaudited contracts can be dangerous
- **Key Compromise**: If your private key is stolen, attacker can control delegations
- **Transaction Reverts**: Always handle transaction failures gracefully

## 📚 Resources

### Official Documentation

- [EIP-7702 Specification](https://eips.ethereum.org/EIPS/eip-7702)
- [Viem EIP-7702 Docs](https://viem.sh/docs/eip7702)
- [Ethereum Magicians Discussion](https://ethereum-magicians.org/t/eip-7702-set-eoa-account-code/19923)

### Implementation Examples

- [EIP-7702 Examples (GitHub)](https://github.com/marcelomorgado/eip7702-examples)
- [Implementing EIP-7702: Low-Level Guide](https://hackmd.io/@nachomazzara/eip7702-almost-low-level-guide)
- [OpenZeppelin EOA Delegation](https://docs.openzeppelin.com/contracts/5.x/eoa-delegation)

### Tools & Libraries

- [Viem](https://viem.sh/) - TypeScript interface for Ethereum
- [EIP-7702 Tools](https://eip.tools/eip/7702) - EIP-7702 reference
- [Revoke.cash EIP-7702 Guide](https://revoke.cash/learn/wallets/what-is-eip7702)

### Community

- [Ethereum Research Forums](https://ethresear.ch/)
- [EIP-7702 Website](https://eip7702.io/)
- [Best Practices Guide](https://hackmd.io/@rimeissner/eip7702-best-practices)

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This software is provided "as is", without warranty of any kind. Use at your own risk. Always test on testnets before using on mainnet. The authors are not responsible for any losses or damages.

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone https://github.com/Babs0022/eip-7702-revoke-delegation.git
cd eip-7702-revoke-delegation
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your PRIVATE_KEY and RPC_URL

# 3. Revoke delegation
npm run revoke
```

## 💬 Support

If you have questions or need help:

- Open an [Issue](https://github.com/Babs0022/eip-7702-revoke-delegation/issues)
- Check the [Resources](#resources) section
- Review the code examples in `/scripts`

---

**Made with ❤️ for the Ethereum community**
