# Wallet Connection Modal

## Overview

The wallet connection modal is a reusable component that allows users to connect their Algorand wallets to the governance platform. It provides a clean, user-friendly interface for wallet selection and connection.

## Features

- **Network Selection**: Choose between Algorand Mainnet and Voi Testnet
- **Wallet Support**: Supports multiple wallet providers:
  - Pera Wallet
  - Defly Wallet
  - Kibisis Wallet
  - Lute Wallet
  - Biatec Wallet
  - WalletConnect
- **Account Management**: Select from multiple accounts within a connected wallet
- **Search Functionality**: Search through wallet accounts by address
- **Connection Status**: Visual feedback for connection state and active wallet
- **Responsive Design**: Works on desktop and mobile devices

## Usage

### Basic Implementation

```tsx
import WalletConnectModal from "@/components/WalletConnectModal";

function MyComponent() {
  const handleWalletConnect = () => {
    console.log("Wallet connected successfully!");
  };

  return (
    <WalletConnectModal onConnect={handleWalletConnect}>
      <Button>Connect Wallet</Button>
    </WalletConnectModal>
  );
}
```

### With Custom Styling

```tsx
<WalletConnectModal onConnect={handleWalletConnect}>
  <Button 
    variant="outline"
    className="px-6 py-3 text-lg font-bold border-2 border-white text-white hover:bg-white hover:text-black"
  >
    Connect Wallet 
  </Button>
</WalletConnectModal>
```

## Component Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `React.ReactNode` | Yes | The trigger element (usually a button) |
| `onConnect` | `() => void` | No | Callback function called when wallet connects successfully |

## Supported Networks

- **Algorand Mainnet**: Production network for real transactions
- **Voi Testnet**: Test network for development and testing

## Supported Wallets

### Algorand Mainnet
- Pera Wallet
- Defly Wallet
- Kibisis Wallet
- Lute Wallet
- Biatec Wallet
- WalletConnect

### Voi Testnet
- Kibisis Wallet
- Lute Wallet
- Biatec Wallet
- WalletConnect

## Implementation Details

### State Management
The modal uses React state to manage:
- Modal open/close state
- Connection status for each wallet
- Search query for account filtering
- Active network selection

### Error Handling
- 5-second timeout for wallet connections
- Graceful error handling with console logging
- Automatic cleanup of connection states

### Accessibility
- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- Focus management

## Integration with Governance Page

The wallet connection modal is integrated into the Governance page to enable users to:

1. **Connect Wallet**: Click the "Connect Wallet" button to open the modal
2. **Select Network**: Choose between Algorand Mainnet and Voi Testnet
3. **Choose Wallet**: Select from available wallet providers
4. **Select Account**: Choose from available accounts in the wallet
5. **Create Proposals**: Once connected, users can create governance proposals

## Styling

The modal uses shadcn/ui components with consistent styling:
- Clean, modern design
- Consistent with the overall application theme
- Responsive layout for all screen sizes
- Smooth animations and transitions

## Future Enhancements

Potential improvements for the wallet connection modal:

1. **Additional Networks**: Support for more Algorand networks
2. **Wallet Icons**: Add wallet provider logos
3. **Connection History**: Remember previously used wallets
4. **Advanced Settings**: Wallet-specific configuration options
5. **Multi-wallet Support**: Connect multiple wallets simultaneously
6. **Transaction Signing**: Direct transaction signing within the modal 