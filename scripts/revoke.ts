/**
 * EIP-7702 Delegation Revocation Script
 * 
 * This script demonstrates how to revoke an EIP-7702 delegation by setting
 * the authorization address to the zero address (0x0000...0000).
 * 
 * Key Concept:
 * - To revoke a delegation, sign an authorization with address(0) as the delegation target
 * - This clears the code delegation and returns the EOA to its normal state
 */

import { createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';
import * as dotenv from 'dotenv';

dotenv.config();

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

async function revokeDelegation() {
  // Check if private key is provided
  if (!process.env.PRIVATE_KEY) {
    throw new Error('Please provide PRIVATE_KEY in .env file');
  }

  // Create account from private key
  const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);

  // Create wallet client
  const client = createWalletClient({
    account,
    chain: mainnet,
    transport: http(process.env.RPC_URL || 'https://eth.llamarpc.com'),
  });

  console.log('\n🔄 Revoking EIP-7702 Delegation...');
  console.log('Account:', account.address);
  console.log('Setting delegation to:', ZERO_ADDRESS);

  try {
    // Sign authorization to revoke (set code to zero address)
    const authorization = await client.signAuthorization({
      contractAddress: ZERO_ADDRESS, // Revoking by delegating to zero address
    });

    console.log('\n✅ Authorization signed:');
    console.log('Chain ID:', authorization.chainId);
    console.log('Address:', authorization.address);
    console.log('Nonce:', authorization.nonce);

    // Send transaction with authorization list to revoke delegation
    const hash = await client.sendTransaction({
      authorizationList: [authorization],
      to: account.address, // Send to self
      value: 0n,
      data: '0x',
    });

    console.log('\n✅ Revocation transaction sent!');
    console.log('Transaction hash:', hash);
    console.log(`View on Etherscan: https://etherscan.io/tx/${hash}`);
    console.log('\n✅ Delegation successfully revoked!');
    console.log('Your account has been returned to normal EOA state.');

  } catch (error: any) {
    console.error('\n❌ Error revoking delegation:', error.message);
    throw error;
  }
}

// Run the script
revokeDelegation()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
