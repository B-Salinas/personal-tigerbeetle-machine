import { testConnection, initializeAccounts, closeConnection } from './tigerbeetleClient';

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

    // Close the connection
    await closeConnection();
  } catch (error) {
    console.error('Error during testing:', error);
    process.exit(1);
  }
}

main(); 