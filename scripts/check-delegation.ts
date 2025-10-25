import { createPublicClient, http, type Address, type Chain } from 'viem';
import { mainnet, sepolia, base, baseSepolia } from 'viem/chains';
import * as dotenv from 'dotenv';

dotenv.config();

// EIP-7702 delegation indicator
const DELEGATION_INDICATOR = '0xef0100';

// Network configurations
const networks: Record<string, { chain: Chain; rpcUrl: string }> = {
  mainnet: {
    chain: mainnet,
    rpcUrl: process.env.MAINNET_RPC_URL || 'https://eth.llamarpc.com',
  },
  sepolia: {
    chain: sepolia,
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
  },
  base: {
    chain: base,
    rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  },
  baseSepolia: {
    chain: baseSepolia,
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
  },
};

/**
 * Check if an address has EIP-7702 delegation active
 * @param address - The address to check
 * @param networkName - The network to check on (default: 'mainnet')
 * @returns Object containing delegation status and details
 */
export async function checkDelegation(
  address: Address,
  networkName: string = 'mainnet'
) {
  const network = networks[networkName];
  
  if (!network) {
    throw new Error(
      `Unknown network: ${networkName}. Available networks: ${Object.keys(networks).join(', ')}`
    );
  }

  const client = createPublicClient({
    chain: network.chain,
    transport: http(network.rpcUrl),
  });

  try {
    // Get the account code
    const code = await client.getCode({ address });

    if (!code || code === '0x') {
      return {
        isDelegated: false,
        address,
        network: networkName,
        message: 'No code at address (EOA or no delegation)',
      };
    }

    // Check if code starts with EIP-7702 delegation indicator
    const isDelegated = code.toLowerCase().startsWith(DELEGATION_INDICATOR);

    if (isDelegated) {
      // Parse delegated address from code
      // Format: 0xef0100 + 20 bytes (address)
      const delegatedAddress = ('0x' + code.slice(8, 48)) as Address;

      return {
        isDelegated: true,
        address,
        network: networkName,
        delegatedTo: delegatedAddress,
        code,
        message: `Address is delegated to ${delegatedAddress}`,
      };
    }

    return {
      isDelegated: false,
      address,
      network: networkName,
      code,
      message: 'Address has code but no EIP-7702 delegation',
    };
  } catch (error) {
    throw new Error(
      `Failed to check delegation: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Display detailed delegation information
 * @param address - The address to check
 * @param networkName - The network to check on
 */
export async function displayDelegationInfo(
  address: Address,
  networkName: string = 'mainnet'
) {
  console.log('\n=== EIP-7702 Delegation Check ===');
  console.log(`Address: ${address}`);
  console.log(`Network: ${networkName}`);
  console.log('================================\n');

  try {
    const result = await checkDelegation(address, networkName);

    console.log('Status:', result.isDelegated ? '✓ DELEGATED' : '✗ NOT DELEGATED');
    console.log('Message:', result.message);

    if (result.isDelegated && result.delegatedTo) {
      console.log('\nDelegation Details:');
      console.log(`  Delegated To: ${result.delegatedTo}`);
      console.log(`  Code: ${result.code}`);
    } else if (result.code) {
      console.log(`\nCode found: ${result.code.slice(0, 66)}${result.code.length > 66 ? '...' : ''}`);
    }

    console.log('\n================================\n');

    return result;
  } catch (error) {
    console.error('\nError:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Check delegation status for multiple addresses
 * @param addresses - Array of addresses to check
 * @param networkName - The network to check on
 */
export async function checkMultipleDelegations(
  addresses: Address[],
  networkName: string = 'mainnet'
) {
  console.log('\n=== Checking Multiple Addresses ===');
  console.log(`Network: ${networkName}`);
  console.log(`Total addresses: ${addresses.length}`);
  console.log('===================================\n');

  const results = [];

  for (const address of addresses) {
    try {
      const result = await checkDelegation(address, networkName);
      results.push(result);
      
      console.log(`${address}: ${result.isDelegated ? '✓ Delegated' : '✗ Not delegated'}`);
      if (result.isDelegated && result.delegatedTo) {
        console.log(`  → ${result.delegatedTo}`);
      }
    } catch (error) {
      console.error(`${address}: Error - ${error instanceof Error ? error.message : String(error)}`);
      results.push({
        isDelegated: false,
        address,
        network: networkName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log('\n===================================\n');

  return results;
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('\nUsage:');
    console.log('  Single address: ts-node scripts/check-delegation.ts <address> [network]');
    console.log('  Multiple addresses: ts-node scripts/check-delegation.ts <address1> <address2> ... [network]');
    console.log('\nSupported networks: mainnet, sepolia, base, baseSepolia');
    console.log('\nExamples:');
    console.log('  ts-node scripts/check-delegation.ts 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
    console.log('  ts-node scripts/check-delegation.ts 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb base');
    console.log('  ts-node scripts/check-delegation.ts 0xAddr1 0xAddr2 0xAddr3 sepolia\n');
    process.exit(1);
  }

  // Check if last argument is a network name
  const lastArg = args[args.length - 1];
  const isNetwork = Object.keys(networks).includes(lastArg);
  const networkName = isNetwork ? lastArg : 'mainnet';
  const addresses = isNetwork ? args.slice(0, -1) : args;

  // Validate addresses
  const validAddresses = addresses.filter((addr) => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      console.error(`Invalid address format: ${addr}`);
      return false;
    }
    return true;
  }) as Address[];

  if (validAddresses.length === 0) {
    console.error('No valid addresses provided');
    process.exit(1);
  }

  // Execute check
  (async () => {
    try {
      if (validAddresses.length === 1) {
        await displayDelegationInfo(validAddresses[0], networkName);
      } else {
        await checkMultipleDelegations(validAddresses, networkName);
      }
    } catch (error) {
      console.error('\nFatal error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  })();
}
