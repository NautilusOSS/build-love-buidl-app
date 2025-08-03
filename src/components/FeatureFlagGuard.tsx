import React from 'react';
import { useFeatureFlags } from '@/constants/featureFlags';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Lock } from 'lucide-react';

interface FeatureFlagGuardProps {
  children: React.ReactNode;
  feature: 'isGovernanceEnabled' | 'isGovernanceProposalsEnabled' | 'isGovernanceVotingEnabled' | 'isGovernanceDashboardEnabled' | 'isGovernanceAdminEnabled' | 'isGovernanceDemoEnabled' | 'isWalletEnabled' | 'isPowerUpEnabled' | 'isStoreEnabled' | 'isTransferEnabled' | 'isInternalTransferEnabled' | 'isExternalTransferEnabled' | 'isBuyAlgoEnabled' | 'isSwapEnabled';
  fallback?: React.ReactNode;
  showLockIcon?: boolean;
}

export const FeatureFlagGuard: React.FC<FeatureFlagGuardProps> = ({
  children,
  feature,
  fallback,
  showLockIcon = true,
}) => {
  const featureFlags = useFeatureFlags();
  const isEnabled = featureFlags[feature]();

  if (isEnabled) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {showLockIcon ? (
              <Lock className="h-12 w-12 text-muted-foreground" />
            ) : (
              <AlertTriangle className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
          <CardTitle className="text-xl font-bold">
            Feature Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-4">
            This feature is currently disabled or under maintenance.
          </p>
          <p className="text-sm text-muted-foreground">
            Please check back later or contact support if you believe this is an error.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

// Specific feature guard components for common use cases
export const GovernanceGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <FeatureFlagGuard feature="isGovernanceEnabled">
    {children}
  </FeatureFlagGuard>
);

export const GovernanceProposalsGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <FeatureFlagGuard feature="isGovernanceProposalsEnabled">
    {children}
  </FeatureFlagGuard>
);

export const GovernanceVotingGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <FeatureFlagGuard feature="isGovernanceVotingEnabled">
    {children}
  </FeatureFlagGuard>
);

export const GovernanceDashboardGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <FeatureFlagGuard feature="isGovernanceDashboardEnabled">
    {children}
  </FeatureFlagGuard>
);

export const GovernanceAdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <FeatureFlagGuard feature="isGovernanceAdminEnabled">
    {children}
  </FeatureFlagGuard>
);

export const GovernanceDemoGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <FeatureFlagGuard feature="isGovernanceDemoEnabled">
    {children}
  </FeatureFlagGuard>
);

export const WalletGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <FeatureFlagGuard feature="isWalletEnabled">
    {children}
  </FeatureFlagGuard>
);

export const PowerUpGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <FeatureFlagGuard feature="isPowerUpEnabled">
    {children}
  </FeatureFlagGuard>
);

export const StoreGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <FeatureFlagGuard feature="isStoreEnabled">
    {children}
  </FeatureFlagGuard>
);

export const TransferGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <FeatureFlagGuard feature="isTransferEnabled">
    {children}
  </FeatureFlagGuard>
);

export const InternalTransferGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <FeatureFlagGuard feature="isInternalTransferEnabled">
    {children}
  </FeatureFlagGuard>
);

export const ExternalTransferGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <FeatureFlagGuard feature="isExternalTransferEnabled">
    {children}
  </FeatureFlagGuard>
);

export const BuyAlgoGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <FeatureFlagGuard feature="isBuyAlgoEnabled">
    {children}
  </FeatureFlagGuard>
);

export const SwapGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <FeatureFlagGuard feature="isSwapEnabled">
    {children}
  </FeatureFlagGuard>
); 