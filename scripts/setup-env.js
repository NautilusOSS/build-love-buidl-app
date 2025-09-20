#!/usr/bin/env node

/**
 * Setup script for localnet environment variables
 * Run this script to create a .env file with localnet configuration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envContent = `# Localnet Configuration
VITE_LOCALNET_ALGOD_URL=http://localhost:4001
VITE_LOCALNET_TOKEN=

# Genesis Account Mnemonic (for funding localnet accounts)
# Replace with your own genesis account mnemonic
# You can get this from your localnet setup or use the default Algorand genesis
VITE_GENESIS_MNEMONIC=abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon

# Alternative: Use a specific funded account for testing
# VITE_TEST_ACCOUNT_MNEMONIC=your test account mnemonic here
`;

const envPath = path.join(__dirname, '..', '.env');

try {
  if (fs.existsSync(envPath)) {
    console.log('✅ .env file already exists');
    console.log('📝 You can edit it to customize your localnet configuration');
  } else {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env file with default localnet configuration');
    console.log('📝 Edit .env to customize your settings');
  }
  
  console.log('\n🔧 Environment Variables:');
  console.log('- VITE_LOCALNET_ALGOD_URL: Algod server URL (default: http://localhost:4001)');
  console.log('- VITE_LOCALNET_TOKEN: Algod API token (default: empty)');
  console.log('- VITE_GENESIS_MNEMONIC: Genesis account mnemonic for funding');
  console.log('\n💡 Tip: Make sure your localnet is running before using the app');
  
} catch (error) {
  console.error('❌ Failed to create .env file:', error.message);
  process.exit(1);
}
