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
    case 'STUDENT_LOAN': return 5;
    case 'IOU': return 6;
    default: return 0;
  }
}

// Function to test the connection
export async function testConnection(): Promise<boolean> {
  try {
    // Try to create a test account to verify connection
    const testAccount = {
      id: 999999n,
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

    try {
      await client.createAccounts([testAccount]);
      console.log('Successfully connected to TigerBeetle server!');
      return true;
    } catch (createError: any) {
      // If account already exists, that's fine - we're still connected
      if (createError.message && createError.message.includes('exists')) {
        console.log('Successfully connected to TigerBeetle server! (test account already exists)');
        return true;
      }
      throw createError;
    }
  } catch (error) {
    console.error('Failed to connect to TigerBeetle server:', error);
    return false;
  }
}

// Function to verify a single account was created correctly
async function verifyAccount(id: bigint, expectedDebits: bigint, expectedCredits: bigint): Promise<boolean> {
  try {
    // Try up to 3 times with a small delay between attempts
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Verification attempt ${attempt} for account ${id}`);
      
      const [account] = await client.lookupAccounts([id]);
      if (!account) {
        console.log(`Account ${id} not found on attempt ${attempt}, waiting 100ms...`);
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }
      
      console.log(`Verifying account ${id}:`);
      console.log(`  Expected debits: ${expectedDebits}, got: ${account.debits_posted}`);
      console.log(`  Expected credits: ${expectedCredits}, got: ${account.credits_posted}`);
      console.log(`  Code: ${account.code}`);
      console.log(`  Flags: ${account.flags}`);
      
      if (account.debits_posted !== expectedDebits || account.credits_posted !== expectedCredits) {
        console.error(`Account ${id} has incorrect balances`);
        return false;
      }
      
      return true;
    }
    
    console.error(`Account ${id} not found after 3 attempts`);
    return false;
  } catch (error) {
    console.error(`Failed to verify account ${id}:`, error);
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
      const accountId = BigInt(index + 100); // Start from 100 to avoid conflicts
      console.log(`\nPreparing account ${accountId}:`);
      console.log(`  Name: ${account.name}`);
      console.log(`  Category: ${account.category}`);
      console.log(`  Current Balance: $${account.currentBalance.toFixed(2)}`);
      console.log(`  Total Amount: $${account.totalAmount.toFixed(2)}`);
      
      const tigerbeetleAccount = {
        id: accountId,
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
        code: categoryToNumber(account.category),
        flags: (() => {
          let flags = 0;
          
          // For credit cards and loans, ensure we don't exceed credit limit
          if (account.category === 'CREDIT_CARD' || 
              account.category === 'LOAN' || 
              account.category === 'STUDENT_LOAN' || 
              account.category === 'IOU') {
            flags |= 2; // debits_must_not_exceed_credits flag
          }
          
          // For active checking accounts only, ensure we don't overdraft
          if (account.category === 'CHECKING' && !account.isClosed) {
            flags |= 4; // credits_must_not_exceed_debits flag
          }
          
          // For closed accounts with remaining balance, treat them like loans
          if (account.isClosed && account.currentBalance > 0) {
            flags |= 2; // debits_must_not_exceed_credits flag
          }
          
          // Add history tracking for all accounts
          flags |= 8; // history flag for balance history
          
          return flags;
        })(),
        timestamp: 0n,
      };
      
      console.log('TigerBeetle account data:', {
        id: tigerbeetleAccount.id.toString(),
        debits_posted: tigerbeetleAccount.debits_posted.toString(),
        credits_posted: tigerbeetleAccount.credits_posted.toString(),
        code: tigerbeetleAccount.code,
        flags: tigerbeetleAccount.flags
      });
      
      return tigerbeetleAccount;
    });

    // Try to create each account individually to better handle errors
    for (const account of accounts) {
      try {
        // Wait a small amount before each account creation
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const result = await client.createAccounts([account]);
        console.log(`Created account ${account.id} successfully`);
        
        // Wait a small amount after creation before verification
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Verify the account was created correctly
        const verified = await verifyAccount(
          account.id,
          account.debits_posted,
          account.credits_posted
        );
        
        if (!verified) {
          console.error(`Account ${account.id} verification failed`);
          throw new Error(`Account ${account.id} verification failed`);
        }
        
      } catch (error: any) {
        if (error.message && error.message.includes('exists')) {
          console.log(`Account ${account.id} already exists, verifying...`);
          const verified = await verifyAccount(
            account.id,
            account.debits_posted,
            account.credits_posted
          );
          if (!verified) {
            throw new Error(`Existing account ${account.id} has incorrect balances`);
          }
        } else {
          console.error(`Failed to create account ${account.id}:`, error);
          throw error;
        }
      }
    }

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
    const accountIds = [...Array(ACCOUNTS.length).keys()].map(i => BigInt(i + 100)); // Match the new ID scheme
    console.log(`Looking up ${accountIds.length} accounts with IDs:`, accountIds);
    
    // Get all accounts in smaller batches to avoid any potential limits
    const batchSize = 5;
    const allAccounts = [];
    
    for (let i = 0; i < accountIds.length; i += batchSize) {
      const batchIds = accountIds.slice(i, i + batchSize);
      console.log(`Looking up batch of accounts:`, batchIds);
      const batchAccounts = await client.lookupAccounts(batchIds);
      allAccounts.push(...batchAccounts);
    }
    
    console.log(`Found ${allAccounts.length} accounts`);
    
    if (allAccounts.length !== ACCOUNTS.length) {
      console.warn(`Warning: Expected ${ACCOUNTS.length} accounts but found ${allAccounts.length}`);
      console.log('Account IDs found:', allAccounts.map(a => a.id));
    }
    
    // Create a map of account IDs to balance information
    const balances = new Map<bigint, { currentBalance: number; totalAmount: number }>();
    allAccounts.forEach(account => {
      console.log(`Processing account ${account.id}:`);
      console.log(`  debits_posted: ${account.debits_posted}`);
      console.log(`  credits_posted: ${account.credits_posted}`);
      console.log(`  code: ${account.code}`);
      console.log(`  flags: ${account.flags}`);
      
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

// Function to get detailed payment progress for debt accounts
export async function getDebtProgress(): Promise<Map<bigint, {
  name: string;
  category: string;
  totalAmount: number;
  currentBalance: number;
  percentagePaid: number;
  remainingBalance: number;
  nextPaymentDue?: Date;
  minimumPayment?: number;
}>> {
  try {
    console.log('Getting debt payment progress...');
    const balances = await getAccountBalances();
    const debtProgress = new Map();

    ACCOUNTS.forEach((account, index) => {
      const accountId = BigInt(index + 100); // Match our ID scheme
      const balance = balances.get(accountId);
      
      if (balance && (
        account.category === 'CREDIT_CARD' ||
        account.category === 'LOAN' ||
        account.category === 'STUDENT_LOAN' ||
        account.category === 'IOU'
      )) {
        const remainingBalance = balance.totalAmount - balance.currentBalance;
        const percentagePaid = (balance.currentBalance / balance.totalAmount) * 100;
        
        debtProgress.set(accountId, {
          name: account.name,
          category: account.category,
          totalAmount: balance.totalAmount,
          currentBalance: balance.currentBalance,
          percentagePaid: Math.round(percentagePaid * 100) / 100,
          remainingBalance: Math.round(remainingBalance * 100) / 100,
          nextPaymentDue: account.paymentSchedule?.dueDate,
          minimumPayment: account.paymentSchedule?.minimumPayment
        });
      }
    });

    return debtProgress;
  } catch (error) {
    console.error('Failed to get debt progress:', error);
    throw error;
  }
} 