import { createClient } from 'tigerbeetle-node';
import { ACCOUNTS } from './accountTypes';

// Configuration for TigerBeetle client
const CLUSTER_ID = 0n; // Using BigInt for cluster ID
const REPLICA_ADDRESSES = ['127.0.0.1:3000']; // Updated to match server port

// Create and export the TigerBeetle client
export const client = createClient({
  cluster_id: CLUSTER_ID,
  replica_addresses: REPLICA_ADDRESSES,
});

// Helper function to convert account categories to numbers
function categoryToNumber(category: string): number {
  switch (category) {
    case 'CHECKING': return 1;
    case 'SAVINGS': return 2;
    case 'CREDIT_CARD': return 3;
    case 'LOAN': return 4;
    default: return 0;
  }
}

// Function to test the connection
export async function testConnection(): Promise<boolean> {
  try {
    // Try to create a test account to verify connection
    const testAccount = {
      id: 1n,
      debits_pending: 0n,
      debits_posted: 0n,
      credits_pending: 0n,
      credits_posted: 0n,
      user_data: 0n,
      user_data_128: 0n,
      user_data_64: 0n,
      user_data_32: 0,
      reserved: 0,
      ledger: 1,
      code: 1,
      flags: 0,
      timestamp: 0n,
    };

    await client.createAccounts([testAccount]);
    console.log('Successfully connected to TigerBeetle server!');
    return true;
  } catch (error) {
    console.error('Failed to connect to TigerBeetle server:', error);
    return false;
  }
}

// Function to initialize our accounts in TigerBeetle
export async function initializeAccounts(): Promise<void> {
  try {
    console.log('Starting account initialization...');
    console.log(`Number of accounts to create: ${ACCOUNTS.length}`);
    
    // Convert our account data to TigerBeetle account format
    const accounts = ACCOUNTS.map((account, index) => {
      console.log(`\nPreparing account ${index + 1}:`);
      console.log(`  Name: ${account.name}`);
      console.log(`  Category: ${account.category}`);
      console.log(`  Current Balance: $${account.currentBalance.toFixed(2)}`);
      console.log(`  Total Amount: $${account.totalAmount.toFixed(2)}`);
      
      return {
        id: BigInt(index + 1),
        debits_pending: 0n,
        debits_posted: BigInt(Math.round(account.currentBalance * 100)),
        credits_pending: 0n,
        credits_posted: BigInt(Math.round(account.totalAmount * 100)),
        user_data: BigInt(categoryToNumber(account.category)),
        user_data_128: 0n,
        user_data_64: 0n,
        user_data_32: 0,
        reserved: 0,
        ledger: 1,
        code: 1,
        flags: account.isClosed ? 1 : 0,
        timestamp: 0n,
      };
    });

    console.log('\nCreating accounts in TigerBeetle...');
    await client.createAccounts(accounts);
    console.log('Successfully initialized accounts in TigerBeetle!');
  } catch (error) {
    console.error('Failed to initialize accounts:', error);
    throw error;
  }
}

// Function to close the client connection
export async function closeConnection(): Promise<void> {
  try {
    // TigerBeetle client doesn't have a close method, so we just log
    console.log('TigerBeetle connection will be automatically cleaned up');
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  }
}

// Function to get account balances
export async function getAccountBalances(): Promise<Map<bigint, { currentBalance: number; totalAmount: number }>> {
  try {
    console.log('Getting account balances...');
    const accountIds = [...Array(ACCOUNTS.length).keys()].map(i => BigInt(i + 1));
    console.log(`Looking up ${accountIds.length} accounts`);
    
    // Get all accounts
    const accounts = await client.lookupAccounts(accountIds);
    console.log(`Found ${accounts.length} accounts`);
    
    // Create a map of account IDs to balance information
    const balances = new Map<bigint, { currentBalance: number; totalAmount: number }>();
    accounts.forEach(account => {
      console.log(`Processing account ${account.id}`);
      balances.set(account.id, {
        currentBalance: Number(account.debits_posted) / 100,
        totalAmount: Number(account.credits_posted) / 100
      });
    });
    
    return balances;
  } catch (error) {
    console.error('Failed to get account balances:', error);
    throw error;
  }
} 