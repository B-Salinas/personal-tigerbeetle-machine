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
    // Convert our account data to TigerBeetle account format
    const accounts = ACCOUNTS.map((account, index) => ({
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
    }));

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