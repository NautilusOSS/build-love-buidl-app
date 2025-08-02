import { AlgorandFaucet, FaucetConfig } from '../service/faucet';
import algosdk from 'algosdk';

// Example 1: Basic faucet usage with testnet
async function basicFaucetExample() {
  console.log('=== Basic Faucet Example ===');
  
  const config: FaucetConfig = {
    network: 'testnet',
    server: 'https://testnet-api.algonode.cloud',
    port: 443,
    token: '',
    faucetMnemonic: 'your 25-word mnemonic phrase here', // Replace with actual mnemonic
    defaultAmount: 1000000, // 1 ALGO
    maxAmount: 10000000, // 10 ALGO
    minBalance: 1000000, // 1 ALGO minimum balance
    cooldownPeriod: 60000, // 1 minute
    maxRequestsPerHour: 10
  };

  try {
    const faucet = new AlgorandFaucet(config);
    
    // Get faucet information
    const info = await faucet.getFaucetInfo();
    console.log('Faucet Info:', info);
    
    // Fund an account
    const recipientAddress = 'RECIPIENT_ADDRESS_HERE'; // Replace with actual address
    const result = await faucet.fundAccount(recipientAddress, 2000000); // 2 ALGO
    
    if (result.success) {
      console.log('Funding successful!');
      console.log('Transaction ID:', result.txId);
      console.log('Amount funded:', algosdk.microalgosToAlgos(result.amount), 'ALGO');
    } else {
      console.log('Funding failed:', result.message);
    }
    
    // Get statistics
    const stats = faucet.getStats();
    console.log('Faucet Stats:', stats);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Example 2: Environment-based configuration
async function environmentBasedExample() {
  console.log('=== Environment-Based Example ===');
  
  // This would typically come from environment variables
  const config: Partial<FaucetConfig> = {
    faucetMnemonic: process.env.FAUCET_MNEMONIC || '',
    network: (process.env.ALGORAND_NETWORK as any) || 'testnet',
    server: process.env.ALGORAND_SERVER || 'https://testnet-api.algonode.cloud',
    defaultAmount: parseInt(process.env.FAUCET_DEFAULT_AMOUNT || '1000000'),
    maxAmount: parseInt(process.env.FAUCET_MAX_AMOUNT || '10000000')
  };

  try {
    const faucet = new AlgorandFaucet(config);
    
    // Check if faucet has sufficient balance
    const hasBalance = await faucet.hasSufficientBalance(5000000); // 5 ALGO
    console.log('Has sufficient balance for 5 ALGO:', hasBalance);
    
    if (hasBalance) {
      const recipientAddress = 'RECIPIENT_ADDRESS_HERE';
      const result = await faucet.fundAccount(recipientAddress);
      
      console.log('Funding result:', result);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Example 3: Batch funding multiple accounts
async function batchFundingExample() {
  console.log('=== Batch Funding Example ===');
  
  const config: FaucetConfig = {
    network: 'testnet',
    server: 'https://testnet-api.algonode.cloud',
    port: 443,
    token: '',
    faucetMnemonic: 'your 25-word mnemonic phrase here',
    defaultAmount: 1000000, // 1 ALGO
    maxAmount: 10000000, // 10 ALGO
    minBalance: 1000000,
    cooldownPeriod: 60000,
    maxRequestsPerHour: 10
  };

  const faucet = new AlgorandFaucet(config);
  
  // List of addresses to fund
  const addresses = [
    'ADDRESS_1_HERE',
    'ADDRESS_2_HERE',
    'ADDRESS_3_HERE'
  ];
  
  const results = [];
  
  for (const address of addresses) {
    try {
      console.log(`Funding ${address}...`);
      const result = await faucet.fundAccount(address, 1000000); // 1 ALGO each
      results.push({ address, result });
      
      // Wait a bit between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`Failed to fund ${address}:`, error);
      results.push({ address, result: { success: false, message: error } });
    }
  }
  
  console.log('Batch funding results:', results);
  
  // Summary
  const successful = results.filter(r => r.result.success).length;
  const failed = results.length - successful;
  console.log(`Batch funding complete: ${successful} successful, ${failed} failed`);
}

// Example 4: Faucet monitoring and maintenance
async function faucetMonitoringExample() {
  console.log('=== Faucet Monitoring Example ===');
  
  const config: FaucetConfig = {
    network: 'testnet',
    server: 'https://testnet-api.algonode.cloud',
    port: 443,
    token: '',
    faucetMnemonic: 'your 25-word mnemonic phrase here',
    defaultAmount: 1000000,
    maxAmount: 10000000,
    minBalance: 1000000,
    cooldownPeriod: 60000,
    maxRequestsPerHour: 10
  };

  const faucet = new AlgorandFaucet(config);
  
  // Monitor faucet health
  async function monitorFaucet() {
    try {
      const info = await faucet.getFaucetInfo();
      const stats = faucet.getStats();
      
      console.log('=== Faucet Health Check ===');
      console.log('Balance:', algosdk.microalgosToAlgos(info.balance), 'ALGO');
      console.log('Total requests today:', stats.dailyRequests);
      console.log('Total funded today:', stats.dailyFunded, 'ALGO');
      console.log('Unique addresses funded:', stats.uniqueAddresses);
      
      // Check if balance is getting low
      if (info.balance < 5000000) { // Less than 5 ALGO
        console.warn('⚠️  Faucet balance is getting low!');
      }
      
      // Check if usage is high
      if (stats.hourlyRequests > 8) {
        console.warn('⚠️  High usage detected!');
      }
      
    } catch (error) {
      console.error('Monitoring error:', error);
    }
  }
  
  // Run monitoring every 5 minutes
  await monitorFaucet();
  
  // In a real application, you might set up an interval:
  // setInterval(monitorFaucet, 5 * 60 * 1000);
}

// Example 5: Custom rate limiting and validation
async function customValidationExample() {
  console.log('=== Custom Validation Example ===');
  
  const config: FaucetConfig = {
    network: 'testnet',
    server: 'https://testnet-api.algonode.cloud',
    port: 443,
    token: '',
    faucetMnemonic: 'your 25-word mnemonic phrase here',
    defaultAmount: 1000000,
    maxAmount: 10000000,
    minBalance: 1000000,
    cooldownPeriod: 30000, // 30 seconds
    maxRequestsPerHour: 5 // More restrictive
  };

  const faucet = new AlgorandFaucet(config);
  
  // Custom validation function
  function validateFundingRequest(address: string, amount: number): { valid: boolean; message?: string } {
    // Check if address is valid
    try {
      algosdk.decodeAddress(address);
    } catch {
      return { valid: false, message: 'Invalid Algorand address' };
    }
    
    // Check if amount is reasonable
    if (amount > 5000000) { // 5 ALGO max
      return { valid: false, message: 'Amount too high for this faucet' };
    }
    
    // Add any other custom validation logic here
    // For example, check against a blacklist, whitelist, etc.
    
    return { valid: true };
  }
  
  const recipientAddress = 'RECIPIENT_ADDRESS_HERE';
  const amount = 2000000; // 2 ALGO
  
  // Apply custom validation
  const validation = validateFundingRequest(recipientAddress, amount);
  
  if (!validation.valid) {
    console.log('Validation failed:', validation.message);
    return;
  }
  
  // Proceed with funding
  try {
    const result = await faucet.fundAccount(recipientAddress, amount);
    console.log('Funding result:', result);
  } catch (error) {
    console.error('Funding error:', error);
  }
}

// Run examples (commented out for safety)
// Uncomment and modify the examples to run them

// basicFaucetExample();
// environmentBasedExample();
// batchFundingExample();
// faucetMonitoringExample();
// customValidationExample();

export {
  basicFaucetExample,
  environmentBasedExample,
  batchFundingExample,
  faucetMonitoringExample,
  customValidationExample
}; 