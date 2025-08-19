import { NetworkId } from "@txnlab/use-wallet-react";

// App IDs for different networks
export const APP_IDS = {
  [NetworkId.LOCALNET]: {
    GOVERNANCE: 3933,
    TREASURY: 0, // TODO: Add actual treasury app ID when available
    ATOKEN: 3935,
  },
  [NetworkId.TESTNET]: {
    GOVERNANCE: 744323178, 
    TREASURY: 0, // TODO: Add testnet treasury app ID when deployed
    ATOKEN: 743653037, 
  },
  [NetworkId.MAINNET]: {
    GOVERNANCE: 0, // TODO: Add mainnet governance app ID when deployed
    TREASURY: 0, // TODO: Add mainnet treasury app ID when deployed
    ATOKEN: 0, // TODO: Add mainnet ATOKEN app ID when deployed
  },
} as const;

// Helper function to get governance app ID for a network
export const getGovernanceAppId = (networkId: NetworkId): number => {
  return APP_IDS[networkId]?.GOVERNANCE || 0;
};

// Helper function to get treasury app ID for a network
export const getTreasuryAppId = (networkId: NetworkId): number => {
  return APP_IDS[networkId]?.TREASURY || 0;
};

export const getATokenAppId = (networkId: NetworkId): number => {
  return APP_IDS[networkId]?.ATOKEN || 0;
};

// Legacy function for backward compatibility
export const govAppId = getGovernanceAppId;
