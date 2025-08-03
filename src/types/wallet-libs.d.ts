// Type declarations for wallet libraries to suppress TypeScript errors

declare module '@perawallet/connect' {
  export interface PeraWalletConnectOptions {
    chainId?: number;
    [key: string]: any;
  }
  
  export class PeraWalletConnect {
    constructor(options?: PeraWalletConnectOptions);
    connect(): Promise<any>;
    disconnect(): void;
    [key: string]: any;
  }
  
  export default PeraWalletConnect;
}

declare module '@walletconnect/modal' {
  export interface WalletConnectModalOptions {
    projectId: string;
    [key: string]: any;
  }
  
  export class WalletConnectModal {
    constructor(options?: WalletConnectModalOptions);
    openModal(): void;
    closeModal(): void;
    [key: string]: any;
  }
  
  export default WalletConnectModal;
}

declare module '@blockshake/defly-connect' {
  export interface DeflyWalletConnectOptions {
    [key: string]: any;
  }
  
  export class DeflyWalletConnect {
    constructor(options?: DeflyWalletConnectOptions);
    connect(): Promise<any>;
    disconnect(): void;
    [key: string]: any;
  }
  
  export default DeflyWalletConnect;
}

declare module 'lute-connect' {
  export interface LuteWalletConnectOptions {
    [key: string]: any;
  }
  
  export class LuteWalletConnect {
    constructor(options?: LuteWalletConnectOptions);
    connect(): Promise<any>;
    disconnect(): void;
    [key: string]: any;
  }
  
  export default LuteWalletConnect;
}

// Suppress any remaining type errors from wallet libraries
declare global {
  interface Window {
    [key: string]: any;
  }
} 