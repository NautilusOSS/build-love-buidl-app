import { NetworkId } from "@txnlab/use-wallet-react";

// App IDs for different networks
export const APP_IDS = {
  [NetworkId.LOCALNET]: {
    GOVERNANCE: 6379,
    TREASURY: 0, // TODO: Add actual treasury app ID when available
    ATOKEN: 6381,
    AASA: 0,
    AASA_V2_ASSET_ID: 0,
    AASA_V2_APP_ID: 0,
  },
  [NetworkId.TESTNET]: {
    GOVERNANCE: 743653026,
    TREASURY: 0, // TODO: Add testnet treasury app ID when deployed
    ATOKEN: 743653037,
    AASA: 0,
    AASA_V2_ASSET_ID: 0,
    AASA_V2_APP_ID: 0,
  },
  [NetworkId.MAINNET]: {
    GOVERNANCE: 0, // TODO: Add mainnet governance app ID when deployed
    TREASURY: 0, // TODO: Add mainnet treasury app ID when deployed
    ATOKEN: 3152574674, // TODO: Add mainnet ATOKEN app ID when deployed
    AASA: 401752010,
    AASA_V2_ASSET_ID: 3152688482,
    AASA_V2_APP_ID: 3152688333,
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

export const getAasaAppId = (networkId: NetworkId): number => {
  return APP_IDS[networkId]?.AASA || 0;
};

export const getAasaV2AssetId = (networkId: NetworkId): number => {
  return APP_IDS[networkId]?.AASA_V2_ASSET_ID || 0;
};

export const getAasaV2AppId = (networkId: NetworkId): number => {
  return APP_IDS[networkId]?.AASA_V2_APP_ID || 0;
};

// Legacy function for backward compatibility
export const govAppId = getGovernanceAppId;
