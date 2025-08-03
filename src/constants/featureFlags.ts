// Feature flags configuration
// These can be controlled via environment variables or runtime configuration

export interface FeatureFlags {
  governance: {
    enabled: boolean;
    proposals: boolean;
    voting: boolean;
    dashboard: boolean;
    admin: boolean;
    demo: boolean;
  };
  wallet: {
    enabled: boolean;
  };
  powerUp: {
    enabled: boolean;
  };
  store: {
    enabled: boolean;
  };
  transfer: {
    enabled: boolean;
    internal: boolean;
    external: boolean;
  };
  buyAlgo: {
    enabled: boolean;
  };
  swap: {
    enabled: boolean;
  };
}

// Default feature flags configuration
const defaultFeatureFlags: FeatureFlags = {
  governance: {
    enabled: true,
    proposals: true,
    voting: true,
    dashboard: true,
    admin: true,
    demo: true,
  },
  wallet: {
    enabled: true,
  },
  powerUp: {
    enabled: true,
  },
  store: {
    enabled: true,
  },
  transfer: {
    enabled: true,
    internal: true,
    external: true,
  },
  buyAlgo: {
    enabled: true,
  },
  swap: {
    enabled: false,
  },
};

// Environment variable overrides
const getEnvFeatureFlags = (): Partial<FeatureFlags> => {
  const env = import.meta.env;
  
  return {
    governance: {
      enabled: env.VITE_FEATURE_GOVERNANCE_ENABLED !== 'false',
      proposals: env.VITE_FEATURE_GOVERNANCE_PROPOSALS !== 'false',
      voting: env.VITE_FEATURE_GOVERNANCE_VOTING !== 'false',
      dashboard: env.VITE_FEATURE_GOVERNANCE_DASHBOARD !== 'false',
      admin: env.VITE_FEATURE_GOVERNANCE_ADMIN !== 'false',
      demo: env.VITE_FEATURE_GOVERNANCE_DEMO !== 'false',
    },
    wallet: {
      enabled: env.VITE_FEATURE_WALLET_ENABLED !== 'false',
    },
    powerUp: {
      enabled: env.VITE_FEATURE_POWERUP_ENABLED !== 'false',
    },
    store: {
      enabled: env.VITE_FEATURE_STORE_ENABLED !== 'false',
    },
    transfer: {
      enabled: env.VITE_FEATURE_TRANSFER_ENABLED !== 'false',
      internal: env.VITE_FEATURE_TRANSFER_INTERNAL !== 'false',
      external: env.VITE_FEATURE_TRANSFER_EXTERNAL !== 'false',
    },
    buyAlgo: {
      enabled: env.VITE_FEATURE_BUY_ALGO_ENABLED !== 'false',
    },
    swap: {
      enabled: env.VITE_FEATURE_SWAP_ENABLED === 'true',
    },
  };
};

// Merge default flags with environment overrides
export const featureFlags: FeatureFlags = {
  governance: {
    ...defaultFeatureFlags.governance,
    ...getEnvFeatureFlags().governance,
  },
  wallet: {
    ...defaultFeatureFlags.wallet,
    ...getEnvFeatureFlags().wallet,
  },
  powerUp: {
    ...defaultFeatureFlags.powerUp,
    ...getEnvFeatureFlags().powerUp,
  },
  store: {
    ...defaultFeatureFlags.store,
    ...getEnvFeatureFlags().store,
  },
  transfer: {
    ...defaultFeatureFlags.transfer,
    ...getEnvFeatureFlags().transfer,
  },
  buyAlgo: {
    ...defaultFeatureFlags.buyAlgo,
    ...getEnvFeatureFlags().buyAlgo,
  },
  swap: {
    ...defaultFeatureFlags.swap,
    ...getEnvFeatureFlags().swap,
  },
};

// Helper functions to check feature flags
export const isGovernanceEnabled = (): boolean => featureFlags.governance.enabled;
export const isGovernanceProposalsEnabled = (): boolean => 
  featureFlags.governance.enabled && featureFlags.governance.proposals;
export const isGovernanceVotingEnabled = (): boolean => 
  featureFlags.governance.enabled && featureFlags.governance.voting;
export const isGovernanceDashboardEnabled = (): boolean => 
  featureFlags.governance.enabled && featureFlags.governance.dashboard;
export const isGovernanceAdminEnabled = (): boolean => 
  featureFlags.governance.enabled && featureFlags.governance.admin;
export const isGovernanceDemoEnabled = (): boolean => 
  featureFlags.governance.enabled && featureFlags.governance.demo;
export const isWalletEnabled = (): boolean => featureFlags.wallet.enabled;
export const isPowerUpEnabled = (): boolean => featureFlags.powerUp.enabled;
export const isStoreEnabled = (): boolean => featureFlags.store.enabled;
export const isTransferEnabled = (): boolean => featureFlags.transfer.enabled;
export const isInternalTransferEnabled = (): boolean => 
  featureFlags.transfer.enabled && featureFlags.transfer.internal;
export const isExternalTransferEnabled = (): boolean => 
  featureFlags.transfer.enabled && featureFlags.transfer.external;
export const isBuyAlgoEnabled = (): boolean => featureFlags.buyAlgo.enabled;
export const isSwapEnabled = (): boolean => featureFlags.swap.enabled;

// Hook for React components to use feature flags
export const useFeatureFlags = () => {
  return {
    featureFlags,
    isGovernanceEnabled,
    isGovernanceProposalsEnabled,
    isGovernanceVotingEnabled,
    isGovernanceDashboardEnabled,
    isGovernanceAdminEnabled,
    isGovernanceDemoEnabled,
    isWalletEnabled,
    isPowerUpEnabled,
    isStoreEnabled,
    isTransferEnabled,
    isInternalTransferEnabled,
    isExternalTransferEnabled,
    isBuyAlgoEnabled,
    isSwapEnabled,
  };
}; 