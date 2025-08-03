# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-08-03

### Added
- **Blapu App Initial Implementation**: Complete application setup with governance, store, and wallet functionality
  - Governance system with proposal creation and voting
  - Store page with product listings and purchase functionality
  - Wallet integration with multiple Algorand wallet support
  - Feature flag system for controlled feature rollout
  - Network settings and configuration management
  - Comprehensive UI components and styling

### Fixed
- **Pera Wallet Production Build Issues**: Resolved `TypeError: np.from is not a function` and related function name mangling errors in production builds
  - Disabled minification to prevent function name mangling (`minify: false`)
  - Added comprehensive Buffer polyfills for Node.js compatibility
  - Implemented custom Vite plugin to transform mangled function names
  - Added runtime Buffer polyfill for browser compatibility
  - Enhanced TypeScript configuration to suppress external library type errors
  - Added warning suppression for wallet library build warnings
  - Updated Pera wallet library from v1.3.4 to v1.4.2
  - Implemented manual chunking for wallet libraries to prevent bundling conflicts

### Changed
- **Store Page Enhancements**: Updated store functionality with improved UI and user experience
- **WalletConnect Button Improvements**: Enhanced wallet connection interface and error handling
- **Dependency Cleanup**: Removed unused dependencies and cleaned up package.json

### Technical Details
- **Vite Configuration**: Added manual chunking, disabled minification, and enhanced polyfills
- **TypeScript**: Suppressed type checking for external wallet libraries
- **Buffer Polyfills**: Added comprehensive Node.js Buffer support for browser environment
- **Build Optimization**: Separated wallet libraries into individual chunks for better error isolation
- **Error Handling**: Enhanced wallet connection error handling with specific error messages
- **Feature Flags**: Implemented comprehensive feature flag system for development control

### Files Modified
- `vite.config.ts` - Comprehensive build configuration updates
- `tsconfig.app.json` - TypeScript error suppression
- `src/App.tsx` - Added Buffer polyfill import and wallet configuration
- `src/polyfills/buffer-polyfill.ts` - Runtime Buffer polyfill
- `src/types/wallet-libs.d.ts` - Type declarations for wallet libraries
- `src/pages/Store.tsx` - Enhanced store functionality
- `src/components/WalletConnectButton.tsx` - Improved wallet connection interface
- `package.json` - Updated @perawallet/connect to v1.4.2 and cleaned dependencies
- `src/constants/featureFlags.ts` - Feature flag system implementation
- `src/components/FeatureFlagGuard.tsx` - Feature flag protection components

### Testing
- ✅ Build completes successfully without errors
- ✅ Pera wallet connects properly in production
- ✅ All wallet libraries properly chunked
- ✅ Function names preserved during build process
- ✅ Buffer polyfills working correctly
- ✅ Store functionality working as expected
- ✅ Feature flags properly controlling feature access

### Impact
- **Before**: Pera wallet failed with `np.from is not a function` error in production
- **After**: Pera wallet works correctly in both development and production environments
- **Performance**: Slightly larger bundle size due to disabled minification, but improved reliability
- **Compatibility**: Enhanced browser compatibility for Node.js Buffer functions
- **User Experience**: Improved store interface and wallet connection experience

## [Unreleased]

### Fixed
- **Pera Wallet Production Build Issues**: Resolved `TypeError: np.from is not a function` and related function name mangling errors in production builds
  - Disabled minification to prevent function name mangling (`minify: false`)
  - Added comprehensive Buffer polyfills for Node.js compatibility
  - Implemented custom Vite plugin to transform mangled function names
  - Added runtime Buffer polyfill for browser compatibility
  - Enhanced TypeScript configuration to suppress external library type errors
  - Added warning suppression for wallet library build warnings
  - Updated Pera wallet library from v1.3.4 to v1.4.2
  - Implemented manual chunking for wallet libraries to prevent bundling conflicts

### Technical Details
- **Vite Configuration**: Added manual chunking, disabled minification, and enhanced polyfills
- **TypeScript**: Suppressed type checking for external wallet libraries
- **Buffer Polyfills**: Added comprehensive Node.js Buffer support for browser environment
- **Build Optimization**: Separated wallet libraries into individual chunks for better error isolation
- **Error Handling**: Enhanced wallet connection error handling with specific error messages

### Files Modified
- `vite.config.ts` - Comprehensive build configuration updates
- `tsconfig.app.json` - TypeScript error suppression
- `src/App.tsx` - Added Buffer polyfill import
- `src/polyfills/buffer-polyfill.ts` - Runtime Buffer polyfill
- `src/types/wallet-libs.d.ts` - Type declarations for wallet libraries
- `package.json` - Updated @perawallet/connect to v1.4.2

### Testing
- ✅ Build completes successfully without errors
- ✅ Pera wallet connects properly in production
- ✅ All wallet libraries properly chunked
- ✅ Function names preserved during build process
- ✅ Buffer polyfills working correctly

### Impact
- **Before**: Pera wallet failed with `np.from is not a function` error in production
- **After**: Pera wallet works correctly in both development and production environments
- **Performance**: Slightly larger bundle size due to disabled minification, but improved reliability
- **Compatibility**: Enhanced browser compatibility for Node.js Buffer functions 