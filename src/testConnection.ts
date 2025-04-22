import { testConnection, initializeAccounts, closeConnection, getAccountBalances } from './tigerbeetleClient';

async function main() {
  try {
    // Test the connection
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('Failed to connect to TigerBeetle server');
      process.exit(1);
    }

    // Initialize accounts
    await initializeAccounts();

    // Get and display account balances
    const balances = await getAccountBalances();
    console.log('\nAccount Balances:');
    balances.forEach((balanceInfo, id) => {
      console.log(`Account ${id}:`);
      console.log(`  Current Balance: $${balanceInfo.currentBalance.toFixed(2)}`);
      console.log(`  Total Amount: $${balanceInfo.totalAmount.toFixed(2)}`);
      console.log(`  Remaining: $${(balanceInfo.totalAmount - balanceInfo.currentBalance).toFixed(2)}`);
      console.log('---');
    });

    // Close the connection
    await closeConnection();
  } catch (error) {
    console.error('Error during testing:', error);
    process.exit(1);
  }
}

main(); 