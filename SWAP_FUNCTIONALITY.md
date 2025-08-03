# ALGO ASA ↔ ALGO ARC200 Swap Functionality

## Overview

This implementation adds the ability to swap between ALGO ASA and ALGO ARC200 tokens within the Wallet component. The swap functionality leverages the existing transfer functions to perform the actual token conversions.

## Features

### Supported Swaps
- **ALGO ASA → ALGO ARC200**: Converts ALGO ASA tokens to ALGO ARC200 tokens
- **ALGO ARC200 → ALGO ASA**: Converts ALGO ARC200 tokens to ALGO ASA tokens
- **ALGO ARC200 → ALGO ASA 2**: Converts ALGO ARC200 tokens to ALGO ASA 2 tokens
- **ALGO ASA 2 → ALGO ARC200**: Converts ALGO ASA 2 tokens to ALGO ARC200 tokens
- **ALGO ASA → ALGO ASA 2**: Converts ALGO ASA tokens to ALGO ASA 2 tokens
- **ALGO ASA 2 → ALGO ASA**: Converts ALGO ASA 2 tokens to ALGO ASA tokens

### Implementation Details

#### Core Functions
- `handleSwap()`: Main swap execution function that routes to appropriate transfer functions
- `isSwapAllowed()`: Validates if a swap between two tokens is allowed
- `transferASAToARC200()`: Handles ASA to ARC200 conversion
- `transferARC200ToASA()`: Handles ARC200 to ASA conversion
- `transferARC200ToASA2()`: Handles ARC200 to ASA2 conversion
- `transferASA2ToARC200()`: Handles ASA2 to ARC200 conversion
- `transferASAToASA2()`: Handles ASA to ASA2 conversion
- `transferASA2ToASA()`: Handles ASA2 to ASA conversion

#### Token Bucket IDs
- `"algo-asa"`: ALGO ASA token bucket
- `"algo-arc200"`: ALGO ARC200 token bucket
- `"algo-asa-2"`: ALGO ASA 2 token bucket

#### Feature Flag Protection
The swap functionality is protected by the `isSwapEnabled` feature flag, which is controlled by the environment variable:
```
VITE_FEATURE_SWAP_ENABLED=true
```

## Usage

### Enabling Swap Functionality
1. Set the environment variable: `VITE_FEATURE_SWAP_ENABLED=true`
2. Restart the application

### Performing a Swap
1. Click the "Swap" button in the Wallet interface
2. Select the token you want to swap from (ALGO ASA, ALGO ARC200, or ALGO ASA 2)
3. Select the token you want to swap to
4. Enter the amount to swap
5. Confirm the transaction

### Swap Validation
- Cannot swap to the same token type
- Must have sufficient balance for the swap
- Currently supports ALGO ASA ↔ ALGO ARC200 swaps, ALGO ARC200 ↔ ALGO ASA 2, and ALGO ASA ↔ ALGO ASA 2
- Other token pairs fall back to mock swap functionality

## Technical Implementation

### Swap Flow
1. **Validation**: Check user input, balances, and swap permissions
2. **Amount Conversion**: Convert user input to micro units (6 decimals)
3. **Route Selection**: Determine which transfer function to use based on token pair
4. **Execution**: Call the appropriate transfer function
5. **Success Handling**: Update UI and refresh balances

### Error Handling
- Insufficient balance validation
- Invalid amount validation
- Network transaction errors
- Feature flag protection

### UI Components
- Swap modal with step-by-step interface
- Token selection dropdowns
- Amount input with validation
- Success/error messaging
- Loading states during transaction

## Future Enhancements

1. **Additional Token Pairs**: Support for other ASA ↔ ARC200 token swaps
2. **Price Impact**: Real-time price impact calculation
3. **Slippage Protection**: User-configurable slippage tolerance
4. **Transaction History**: Track and display swap history
5. **Gas Optimization**: Optimize transaction fees for swaps

## Testing

To test the swap functionality:

1. Enable the swap feature flag
2. Ensure you have balances in both ALGO ASA and ALGO ARC200
3. Try swapping in both directions
4. Verify balance updates after successful swaps
5. Test error conditions (insufficient balance, invalid amounts)

## Dependencies

- `ulujs`: For CONTRACT and ABI functionality
- `algosdk`: For Algorand blockchain interactions
- `@txnlab/use-wallet-react`: For wallet connection and signing 