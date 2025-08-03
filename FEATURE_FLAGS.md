# Feature Flags

This application uses a feature flag system to control the availability of different features. Feature flags can be controlled via environment variables.

## Available Feature Flags

### Governance Features

| Flag                                | Description                                  | Default |
| ----------------------------------- | -------------------------------------------- | ------- |
| `VITE_FEATURE_GOVERNANCE_ENABLED`   | Enable/disable all governance features       | `true`  |
| `VITE_FEATURE_GOVERNANCE_PROPOSALS` | Enable/disable proposal creation and viewing | `true`  |
| `VITE_FEATURE_GOVERNANCE_VOTING`    | Enable/disable voting functionality          | `true`  |
| `VITE_FEATURE_GOVERNANCE_DASHBOARD` | Enable/disable governance dashboard          | `true`  |
| `VITE_FEATURE_GOVERNANCE_ADMIN`     | Enable/disable admin panel                   | `true`  |
| `VITE_FEATURE_GOVERNANCE_DEMO`      | Enable/disable demo features                 | `true`  |

### Wallet Features

| Flag                          | Description                         | Default |
| ----------------------------- | ----------------------------------- | ------- |
| `VITE_FEATURE_WALLET_ENABLED` | Enable/disable wallet functionality | `true`  |

### PowerUp Features

| Flag                           | Description                          | Default |
| ------------------------------ | ------------------------------------ | ------- |
| `VITE_FEATURE_POWERUP_ENABLED` | Enable/disable PowerUp functionality | `true`  |

### Transfer Features

| Flag                              | Description                           | Default |
| --------------------------------- | ------------------------------------- | ------- |
| `VITE_FEATURE_TRANSFER_ENABLED`   | Enable/disable all transfer features  | `true`  |
| `VITE_FEATURE_TRANSFER_INTERNAL`  | Enable/disable internal transfers     | `true`  |
| `VITE_FEATURE_TRANSFER_EXTERNAL`  | Enable/disable external transfers     | `true`  |

## Usage

### Environment Variables

Create a `.env` file in the root directory and add the feature flags you want to disable:

```env
# Disable governance features
VITE_FEATURE_GOVERNANCE_ENABLED=false

# Disable specific governance features
VITE_FEATURE_GOVERNANCE_ADMIN=false
VITE_FEATURE_GOVERNANCE_DEMO=false

# Disable wallet features
VITE_FEATURE_WALLET_ENABLED=false

# Disable PowerUp features
VITE_FEATURE_POWERUP_ENABLED=false

# Disable transfer features
VITE_FEATURE_TRANSFER_ENABLED=false

# Disable specific transfer features
VITE_FEATURE_TRANSFER_INTERNAL=false
VITE_FEATURE_TRANSFER_EXTERNAL=false
```

### In Code

You can use the feature flags in your React components:

```tsx
import { useFeatureFlags } from "@/constants/featureFlags";

const MyComponent = () => {
  const { 
    isGovernanceEnabled, 
    isGovernanceProposalsEnabled,
    isTransferEnabled,
    isInternalTransferEnabled,
    isExternalTransferEnabled 
  } = useFeatureFlags();

  if (!isGovernanceEnabled()) {
    return <div>Governance is disabled</div>;
  }

  return (
    <div>
      {isGovernanceProposalsEnabled() && <button>Create Proposal</button>}
      {isInternalTransferEnabled() && <button>Internal Transfer</button>}
      {isExternalTransferEnabled() && <button>External Transfer</button>}
    </div>
  );
};
```

### Route Protection

Routes are automatically protected using the `FeatureFlagGuard` component:

```tsx
import { GovernanceGuard } from "@/components/FeatureFlagGuard";

<Route
  path="/governance"
  element={
    <GovernanceGuard>
      <Governance />
    </GovernanceGuard>
  }
/>;
```

## Navigation

The sidebar navigation automatically respects feature flags. Items will only appear if their corresponding feature is enabled.

## Development

To add a new feature flag:

1. Add the flag to the `FeatureFlags` interface in `src/constants/featureFlags.ts`
2. Add the environment variable handling in `getEnvFeatureFlags()`
3. Add a helper function to check the flag
4. Update the `useFeatureFlags` hook
5. Create a guard component if needed
6. Update the documentation

## Testing

You can test feature flags by setting environment variables:

```bash
# Disable governance for testing
VITE_FEATURE_GOVERNANCE_ENABLED=false npm run dev

# Disable transfer features for testing
VITE_FEATURE_TRANSFER_ENABLED=false npm run dev
VITE_FEATURE_TRANSFER_INTERNAL=false npm run dev
VITE_FEATURE_TRANSFER_EXTERNAL=false npm run dev
```
