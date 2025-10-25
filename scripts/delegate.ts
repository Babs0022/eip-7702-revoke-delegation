/**
 * EIP-7702 Delegation Script
 * 
 * This script demonstrates how to delegate your EOA to a smart contract
 * using EIP-7702. This is the opposite of revocation.
 * 
 * Key Concept:
 * - Sign an authorization to delegate code execution to a target contract
 * - Your EOA temporarily acts like the target contract
 * - Can be revoked at any time by delegating to zero address
 */

import { createWalletClient, http, Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';
import * as dotenv from 'dotenv';

dotenv.config();

async function delegateToContract() {
  // Check if required environment variables are provided
  if (!process.env.PRIVATE_KEY) {
    throw new Error('Please provide PRIVATE_KEY in .env file');
  }

  if (!process.env.DELEGATION_CONTRACT) {
    throw new Error('Please provide DELEGATION_CONTRACT address in .env file');
  }

  // Create account from private key
  const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);
  const delegationContract = process.env.DELEGATION_CONTRACT as Address;

  // Create wallet client
  const client = createWalletClient({
    account,
    chain: mainnet,
    transport: http(process.env.RPC_URL || 'https://eth.llamarpc.com'),
  });

  console.log('\n🔗 Setting up EIP-7702 Delegation...');
  console.log('Account:', account.address);
  console.log('Delegating to:', delegationContract);

  try {
    // Sign authorization to delegate to target contract
    const authorization = await client.signAuthorization({
      contractAddress: delegationContract,
    });

    console.log('\n✅ Authorization signed:');
    console.log('Chain ID:', authorization.chainId);
    console.log('Address:', authorization.address);
    console.log('Nonce:', authorization.nonce);

    // Send transaction with authorization list
    const hash = await client.sendTransaction({
      authorizationList: [authorization],
      to: account.address, // Send to self to activate delegation
      value: 0n,
      data: '0x',
    });

    console.log('\n✅ Delegation transaction sent!');
    console.log('Transaction hash:', hash);
    console.log(`View on Etherscan: https://etherscan.io/tx/${hash}`);
    console.log('\n✅ Delegation successfully established!');
    console.log('Your EOA now acts as the delegated contract.');
    console.log('\n⚠️  Remember: You can revoke this delegation at any time using the revoke script.');

  } catch (error: any) {
    console.error('\n❌ Error establishing delegation:', error.message);
    throw error;
  }
}

// Run the script
delegateToContract()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
