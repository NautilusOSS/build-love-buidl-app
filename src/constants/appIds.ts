import { NetworkId } from "@txnlab/use-wallet-react";

// App IDs for different networks
export const APP_IDS = {
  [NetworkId.LOCALNET]: {
    GOVERNANCE: 3612,
    ELECTION: 0,
    TREASURY: 0,
    ATOKEN: 3614,
  },
  [NetworkId.TESTNET]: {
    GOVERNANCE: 0,
    ELECTION: 0,
    TREASURY: 0,
    ATOKEN: 0,
  },
  [NetworkId.MAINNET]: {
    GOVERNANCE: 0,
    ELECTION: 0,
    TREASURY: 0,
    ATOKEN: 0,
  },
  [NetworkId.VOIMAIN]: {
    GOVERNANCE: 45489275,
    ELECTION: 0,
    TREASURY: 0,
    ATOKEN: 45489277,
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
