import algosdk from "algosdk";

// Configuration interface for the faucet
export interface FaucetConfig {
  // Network configuration
  network: "mainnet" | "testnet" | "betanet" | "localnet";
  server: string;
  port: number;
  token: string;

  // Faucet account configuration
  faucetMnemonic: string;

  // Funding configuration
  defaultAmount: number; // in microAlgos
  maxAmount: number; // in microAlgos
  minBalance: number; // minimum balance to maintain in faucet account

  // Rate limiting
  cooldownPeriod: number; // in milliseconds
  maxRequestsPerHour: number;
}

// Default configuration for testnet
export const DEFAULT_FAUCET_CONFIG: FaucetConfig = {
  network: "localnet",
  server: "http://10.0.0.31",
  port: 4001,
  token: "",
  faucetMnemonic:
    "game list violin lens desert jealous earth prefer bless ski dentist lesson harbor avoid oyster skate episode digital pelican sound clay heavy digital about warm", // EEVANUYDDZKHTH3NLFU5PV6HUS2QEOEXSF7LF2IL4YGNJD7WNIGZDIQ4ZQ
  defaultAmount: 1000000, // 1 ALGO
  maxAmount: 10000000, // 10 ALGO
  minBalance: 1000000, // 1 ALGO minimum balance
  cooldownPeriod: 60000, // 1 minute
  maxRequestsPerHour: 10,
};

// Request tracking for rate limiting
interface FaucetRequest {
  address: string;
  timestamp: number;
  amount: number;
}

export class AlgorandFaucet {
  private config: FaucetConfig;
  private client: algosdk.Algodv2;
  private faucetAccount: algosdk.Account;
  private requestHistory: FaucetRequest[] = [];
  private faucetAddress: string;

  constructor(config: Partial<FaucetConfig> = {}) {
    this.config = { ...DEFAULT_FAUCET_CONFIG, ...config };

    if (!this.config.faucetMnemonic) {
      throw new Error("Faucet mnemonic is required");
    }

    // Initialize Algorand client
    this.client = new algosdk.Algodv2(
      this.config.token,
      this.config.server,
      this.config.port
    );

    // Initialize faucet account from mnemonic
    this.faucetAccount = algosdk.mnemonicToSecretKey(
      this.config.faucetMnemonic
    );
    this.faucetAddress = this.faucetAccount.addr;
  }

  /**
   * Get faucet account information
   */
  async getFaucetInfo() {
    try {
      const accountInfo = await this.client
        .accountInformation(this.faucetAddress)
        .do();
      return {
        address: this.faucetAddress,
        balance: accountInfo.amount,
        balanceInAlgos: algosdk.microalgosToAlgos(accountInfo.amount),
        assets: accountInfo.assets || [],
        applications: accountInfo["created-apps"] || [],
        totalCreatedAssets: accountInfo["total-created-assets"] || 0,
        totalCreatedApps: accountInfo["total-created-apps"] || 0,
      };
    } catch (error) {
      throw new Error(`Failed to get faucet info: ${error}`);
    }
  }

  /**
   * Check if faucet has sufficient balance
   */
  async hasSufficientBalance(amount: number): Promise<boolean> {
    const info = await this.getFaucetInfo();
    return info.balance >= amount + this.config.minBalance;
  }

  /**
   * Check rate limiting for an address
   */
  private checkRateLimit(address: string): {
    allowed: boolean;
    message?: string;
  } {
    const now = Date.now();
    const oneHourAgo = now - 3600000; // 1 hour in milliseconds

    // Clean old requests
    this.requestHistory = this.requestHistory.filter(
      (req) => req.timestamp > oneHourAgo
    );

    // Check hourly limit
    const hourlyRequests = this.requestHistory.filter(
      (req) => req.address === address
    );

    if (hourlyRequests.length >= this.config.maxRequestsPerHour) {
      return {
        allowed: false,
        message: `Rate limit exceeded. Maximum ${this.config.maxRequestsPerHour} requests per hour.`,
      };
    }

    // Check cooldown period
    const lastRequest = hourlyRequests[hourlyRequests.length - 1];
    if (
      lastRequest &&
      now - lastRequest.timestamp < this.config.cooldownPeriod
    ) {
      const remainingTime =
        this.config.cooldownPeriod - (now - lastRequest.timestamp);
      return {
        allowed: false,
        message: `Please wait ${Math.ceil(
          remainingTime / 1000
        )} seconds before making another request.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Validate recipient address
   */
  private validateAddress(address: string): boolean {
    try {
      algosdk.decodeAddress(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Fund an account with ALGOs
   */
  async fundAccount(
    recipientAddress: string,
    amount?: number
  ): Promise<{
    success: boolean;
    txId?: string;
    message: string;
    amount?: number;
  }> {
    console.log("fundAccount", recipientAddress, amount);
    try {
      // Validate recipient address
      if (!this.validateAddress(recipientAddress)) {
        return {
          success: false,
          message: "Invalid recipient address",
        };
      }

      // Use default amount if not specified
      const fundingAmount = amount || this.config.defaultAmount;

      // Validate amount
      if (fundingAmount <= 0) {
        return {
          success: false,
          message: "Amount must be greater than 0",
        };
      }

      if (fundingAmount > this.config.maxAmount) {
        return {
          success: false,
          message: `Amount exceeds maximum allowed (${algosdk.microalgosToAlgos(
            this.config.maxAmount
          )} ALGO)`,
        };
      }

      // Check rate limiting
      const rateLimitCheck = this.checkRateLimit(recipientAddress);
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          message: rateLimitCheck.message || "Rate limit exceeded",
        };
      }

      // Check faucet balance
      if (!(await this.hasSufficientBalance(fundingAmount))) {
        const info = await this.getFaucetInfo();
        return {
          success: false,
          message: `Insufficient faucet balance. Available: ${algosdk.microalgosToAlgos(
            info.balance
          )} ALGO`,
        };
      }

      // Get suggested transaction parameters
      const suggestedParams = await this.client.getTransactionParams().do();

      // Create payment transaction
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: this.faucetAddress,
        to: recipientAddress,
        amount: fundingAmount,
        suggestedParams,
      });

      // Sign the transaction
      const signedTxn = txn.signTxn(this.faucetAccount.sk);

      // Submit the transaction
      const { txId } = await this.client.sendRawTransaction(signedTxn).do();

      // Wait for confirmation
      const confirmation = await algosdk.waitForConfirmation(
        this.client,
        txId,
        4
      );

      // Record the request for rate limiting
      this.requestHistory.push({
        address: recipientAddress,
        timestamp: Date.now(),
        amount: fundingAmount,
      });

      return {
        success: true,
        txId,
        message: `Successfully funded ${algosdk.microalgosToAlgos(
          fundingAmount
        )} ALGO to ${recipientAddress}`,
        amount: fundingAmount,
      };
    } catch (error) {
      console.error("Faucet funding error:", error);
      return {
        success: false,
        message: `Funding failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  /**
   * Get faucet statistics
   */
  getStats() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const oneDayAgo = now - 86400000;

    const hourlyRequests = this.requestHistory.filter(
      (req) => req.timestamp > oneHourAgo
    );
    const dailyRequests = this.requestHistory.filter(
      (req) => req.timestamp > oneDayAgo
    );

    const totalFunded = this.requestHistory.reduce(
      (sum, req) => sum + req.amount,
      0
    );
    const hourlyFunded = hourlyRequests.reduce(
      (sum, req) => sum + req.amount,
      0
    );
    const dailyFunded = dailyRequests.reduce((sum, req) => sum + req.amount, 0);

    return {
      totalRequests: this.requestHistory.length,
      hourlyRequests: hourlyRequests.length,
      dailyRequests: dailyRequests.length,
      totalFunded: algosdk.microalgosToAlgos(totalFunded),
      hourlyFunded: algosdk.microalgosToAlgos(hourlyFunded),
      dailyFunded: algosdk.microalgosToAlgos(dailyFunded),
      uniqueAddresses: new Set(this.requestHistory.map((req) => req.address))
        .size,
    };
  }

  /**
   * Clear request history (useful for testing)
   */
  clearHistory() {
    this.requestHistory = [];
  }
}

// Utility function to create a faucet instance with environment variables
export function createFaucetFromEnv(): AlgorandFaucet {
  const config: Partial<FaucetConfig> = {
    network: (process.env.ALGORAND_NETWORK as any) || "testnet",
    server: process.env.ALGORAND_SERVER || "https://testnet-api.algonode.cloud",
    port: parseInt(process.env.ALGORAND_PORT || "443"),
    token: process.env.ALGORAND_TOKEN || "",
    faucetMnemonic: process.env.FAUCET_MNEMONIC || "",
    defaultAmount: parseInt(process.env.FAUCET_DEFAULT_AMOUNT || "1000000"),
    maxAmount: parseInt(process.env.FAUCET_MAX_AMOUNT || "10000000"),
    minBalance: parseInt(process.env.FAUCET_MIN_BALANCE || "1000000"),
    cooldownPeriod: parseInt(process.env.FAUCET_COOLDOWN || "60000"),
    maxRequestsPerHour: parseInt(process.env.FAUCET_MAX_REQUESTS || "10"),
  };

  return new AlgorandFaucet(config);
}

// Export default instance for easy use
export default AlgorandFaucet;
