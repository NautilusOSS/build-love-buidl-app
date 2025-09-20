import algosdk from "algosdk";

// Localnet configuration from environment variables
const LOCALNET_ALGOD_URL = import.meta.env.VITE_LOCALNET_ALGOD_URL || "http://localhost:4001";
const LOCALNET_TOKEN = import.meta.env.VITE_LOCALNET_TOKEN || "";

// Genesis account mnemonic from environment variables
const GENESIS_MNEMONIC = import.meta.env.VITE_GENESIS_MNEMONIC || 
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon";

export interface LocalnetAccount {
  address: string;
  mnemonic: string;
  secretKey: Uint8Array;
}

export interface FundingResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

/**
 * Creates a new localnet algod client
 */
export function createLocalnetAlgodClient(): algosdk.Algodv2 {
  return new algosdk.Algodv2(LOCALNET_TOKEN, LOCALNET_ALGOD_URL, "");
}

/**
 * Validates a mnemonic phrase
 */
export function validateMnemonic(mnemonic: string): boolean {
  try {
    algosdk.mnemonicToSecretKey(mnemonic);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Gets the genesis account for funding
 */
export function getGenesisAccount(): algosdk.Account {
  if (!validateMnemonic(GENESIS_MNEMONIC)) {
    throw new Error("Invalid genesis mnemonic in environment variables. Please check VITE_GENESIS_MNEMONIC");
  }
  return algosdk.mnemonicToSecretKey(GENESIS_MNEMONIC);
}

/**
 * Generates a new account
 */
export function generateAccount(): LocalnetAccount {
  const account = algosdk.generateAccount();
  return {
    address: account.addr,
    mnemonic: algosdk.secretKeyToMnemonic(account.sk),
    secretKey: account.sk,
  };
}

/**
 * Funds an account using the genesis account
 */
export async function fundAccount(
  address: string, 
  amount: number = 1000000
): Promise<FundingResult> {
  try {
    const algodClient = createLocalnetAlgodClient();
    const genesisAccount = getGenesisAccount();
    
    // Get transaction parameters
    const suggestedParams = await algodClient.getTransactionParams().do();
    
    // Create payment transaction
    const txn = algosdk.makePaymentTxnWithSuggestedParams(
      genesisAccount.addr,
      address,
      amount,
      undefined,
      undefined,
      suggestedParams
    );
    
    // Sign and send transaction
    const signedTxn = txn.signTxn(genesisAccount.sk);
    const txId = await algodClient.sendRawTransaction(signedTxn).do();
    
    // Wait for confirmation
    await algosdk.waitForConfirmation(algodClient, txId.txId, 4);
    
    return {
      success: true,
      transactionId: txId.txId,
    };
  } catch (error) {
    console.error("Failed to fund account:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Creates a new account and funds it automatically
 */
export async function createFundedAccount(
  fundAmount: number = 1000000
): Promise<{
  account: LocalnetAccount;
  funding: FundingResult;
}> {
  const account = generateAccount();
  const funding = await fundAccount(account.address, fundAmount);
  
  return {
    account,
    funding,
  };
}

/**
 * Gets the current localnet configuration
 */
export function getLocalnetConfig() {
  return {
    algodUrl: LOCALNET_ALGOD_URL,
    token: LOCALNET_TOKEN,
    genesisMnemonic: GENESIS_MNEMONIC,
    isUsingEnvMnemonic: !!import.meta.env.VITE_GENESIS_MNEMONIC,
  };
}

/**
 * Checks if localnet is available
 */
export async function isLocalnetAvailable(): Promise<boolean> {
  try {
    const algodClient = createLocalnetAlgodClient();
    await algodClient.status().do();
    return true;
  } catch (error) {
    return false;
  }
}
