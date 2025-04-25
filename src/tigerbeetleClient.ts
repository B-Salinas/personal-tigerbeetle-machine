import { createClient, Client } from 'tigerbeetle-node';
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
    // Initial delay to allow for account creation to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try up to 5 times with an increasing delay between attempts
    for (let attempt = 1; attempt <= 5; attempt++) {
      console.log(`Verification attempt ${attempt} for account ${id}`);
      
      const [account] = await client.lookupAccounts([id]);
      if (!account) {
        const delay = attempt * 1000; // Increasing delay with each attempt
        console.log(`Account ${id} not found on attempt ${attempt}, waiting ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
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
    
    console.error(`Account ${id} not found after 5 attempts`);
    return false;
  } catch (error) {
    console.error(`Failed to verify account ${id}:`, error);
    return false;
  }
}

// Function to verify all accounts in a batch
async function verifyAllAccounts(accounts: any[]): Promise<boolean> {
  try {
    console.log('\nPerforming batch verification of all accounts...');
    
    // Split accounts into smaller batches
    const batchSize = 3;
    const batches = [];
    for (let i = 0; i < accounts.length; i += batchSize) {
      batches.push(accounts.slice(i, i + batchSize));
    }
    
    // Try up to 5 times with longer delays
    for (let attempt = 1; attempt <= 5; attempt++) {
      console.log(`\nBatch verification attempt ${attempt}`);
      let allAccountsFound = true;
      
      // Process each small batch
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const batchIds = batch.map(a => a.id);
        console.log(`\nVerifying batch ${batchIndex + 1}/${batches.length} with IDs:`, batchIds.join(', '));
        
        const foundAccounts = await client.lookupAccounts(batchIds);
        console.log(`Found ${foundAccounts.length} accounts out of ${batch.length} expected in this batch`);
        
        if (foundAccounts.length !== batch.length) {
          allAccountsFound = false;
          continue;
        }
        
        // Verify each account's balances
        for (const expected of batch) {
          const found = foundAccounts.find(a => a.id === expected.id);
          if (!found) {
            console.error(`Account ${expected.id} missing from batch`);
            allAccountsFound = false;
            continue;
          }
          
          if (found.debits_posted !== expected.debits_posted || 
              found.credits_posted !== expected.credits_posted) {
            console.error(`Account ${expected.id} has incorrect balances`);
            console.log(`  Expected debits: ${expected.debits_posted}, got: ${found.debits_posted}`);
            console.log(`  Expected credits: ${expected.credits_posted}, got: ${found.credits_posted}`);
            allAccountsFound = false;
          } else {
            console.log(`Account ${expected.id} verified successfully`);
          }
        }
      }
      
      if (allAccountsFound) {
        console.log('All accounts verified successfully!');
        return true;
      }
      
      if (attempt < 5) {
        const delay = attempt * 2000; // Increasing delay with each attempt
        console.log(`\nWaiting ${delay}ms before next verification attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return false;
  } catch (error) {
    console.error('Failed to verify accounts in batch:', error);
    return false;
  }
}

interface AccountData {
  id: number;
  name: string;
  category: string;
  currentBalance: number;
  totalAmount: number;
}

const ACCOUNT_DATA: AccountData[] = [
  {
    id: 101,
    name: "Checking Account",
    category: "checking",
    currentBalance: 1000,
    totalAmount: 1000
  },
  {
    id: 102,
    name: "Savings Account",
    category: "savings",
    currentBalance: 5000,
    totalAmount: 5000
  },
  {
    id: 103,
    name: "Credit Card",
    category: "credit",
    currentBalance: 0,
    totalAmount: 10000
  }
];

function getAccountsToCreate(): AccountData[] {
  return ACCOUNT_DATA;
}

export async function initializeAccounts(client: Client): Promise<void> {
  console.log('Starting account initialization...');
  const accounts = ACCOUNTS; // Use the ACCOUNTS array directly instead of getAccountsToCreate
  console.log(`Number of accounts to create: ${accounts.length}\n`);

  // Create accounts one at a time
  for (const account of accounts) {
    console.log(`Preparing account ${account.id}:`);
    console.log(`  Name: ${account.name}`);
    console.log(`  Category: ${account.category}`);
    console.log(`  Current Balance: $${(account.currentBalance).toFixed(2)}`);
    console.log(`  Total Amount: $${(account.totalAmount).toFixed(2)}`);

    // Convert to TigerBeetle account format with proper ID conversion
    const tbAccount = {
      id: BigInt(parseInt(account.id) + 100), // Add 100 to match the expected ID scheme
      debits_pending: 0n,
      debits_posted: BigInt(Math.round(account.currentBalance * 100)), // Convert to cents and BigInt
      credits_pending: 0n,
      credits_posted: BigInt(Math.round(account.totalAmount * 100)), // Convert to cents and BigInt
      user_data: 0n,
      user_data_128: 0n,
      user_data_64: 0n,
      user_data_32: 0,
      reserved: 0,
      ledger: 1,
      code: categoryToNumber(account.category), // Use the category number
      flags: account.isActive ? 0 : 1, // Set flags based on account status
      timestamp: 0n
    };

    console.log('TigerBeetle account data:', {
      id: tbAccount.id.toString(),
      debits_posted: tbAccount.debits_posted.toString(),
      credits_posted: tbAccount.credits_posted.toString(),
      code: tbAccount.code.toString(),
      flags: tbAccount.flags.toString()
    });
    console.log();

    try {
      console.log(`Creating account ${tbAccount.id}...`);
      const error = await client.createAccounts([tbAccount]);
      
      if (error.length > 0) {
        if (error[0].result === 2) {
          console.log('Account already exists, verifying its state...');
        } else {
          throw new Error(`Failed to create account: ${error[0].result}`);
        }
      }
      
      // Increased initial wait time before verification
      console.log(`Waiting before verifying account ${tbAccount.id}...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Verify account with multiple retries
      let verified = false;
      for (let attempt = 1; attempt <= 5; attempt++) {
        console.log(`Verification attempt ${attempt} for account ${tbAccount.id}...`);
        const lookupResult = await client.lookupAccounts([tbAccount.id]);
        
        if (lookupResult.length === 0) {
          if (attempt === 5) {
            throw new Error(`Account ${tbAccount.id} not found after 5 verification attempts`);
          }
          // Exponential backoff for retries
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`Account not found, waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        const foundAccount = lookupResult[0];
        if (foundAccount.id !== tbAccount.id) {
          throw new Error(`Account ${tbAccount.id} verification failed - ID mismatch`);
        }
        
        // Verify balances match
        if (foundAccount.debits_posted !== tbAccount.debits_posted ||
            foundAccount.credits_posted !== tbAccount.credits_posted) {
          console.error(`Account ${tbAccount.id} has incorrect balances:`);
          console.error(`Expected debits: ${tbAccount.debits_posted}, got: ${foundAccount.debits_posted}`);
          console.error(`Expected credits: ${tbAccount.credits_posted}, got: ${foundAccount.credits_posted}`);
          if (attempt === 5) {
            throw new Error(`Account ${tbAccount.id} balance verification failed after 5 attempts`);
          }
          continue;
        }
        
        verified = true;
        console.log(`Account ${tbAccount.id} verified successfully\n`);
        break;
      }
      
      if (!verified) {
        throw new Error(`Failed to verify account ${tbAccount.id} after all attempts`);
      }
    } catch (error) {
      console.error(`Failed to process account ${tbAccount.id}:`, error);
      throw error;
    }
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
    const accountIds = ACCOUNTS.map(account => BigInt(parseInt(account.id) + 100));
    console.log(`Looking up ${accountIds.length} accounts with IDs:`, accountIds.map(id => id.toString()));
    
    // Get all accounts in smaller batches to avoid any potential limits
    const batchSize = 5;
    const allAccounts = [];
    
    for (let i = 0; i < accountIds.length; i += batchSize) {
      const batchIds = accountIds.slice(i, i + batchSize);
      console.log(`Looking up batch of accounts:`, batchIds.map(id => id.toString()));
      const batchAccounts = await client.lookupAccounts(batchIds);
      allAccounts.push(...batchAccounts);
    }
    
    console.log(`Found ${allAccounts.length} accounts`);
    
    if (allAccounts.length !== ACCOUNTS.length) {
      console.warn(`Warning: Expected ${ACCOUNTS.length} accounts but found ${allAccounts.length}`);
      console.log('Account IDs found:', allAccounts.map(a => a.id.toString()));
    }
    
    // Create a map of account IDs to balance information
    const balances = new Map<bigint, { currentBalance: number; totalAmount: number }>();
    allAccounts.forEach(account => {
      console.log(`Processing account ${account.id}:`);
      console.log(`  debits_posted: ${account.debits_posted}`);
      console.log(`  credits_posted: ${account.credits_posted}`);
      console.log(`  code: ${account.code}`);
      console.log(`  flags: ${account.flags}`);
      
      // Convert from cents (stored in TigerBeetle) back to dollars
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