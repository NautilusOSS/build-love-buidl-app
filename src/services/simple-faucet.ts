import algosdk from "algosdk";

export class SimpleFaucet {
  private client: algosdk.Algodv2;
  private faucetAccount: algosdk.Account;

  constructor(algodClient: algosdk.Algodv2, mnemonic: string) {
    this.client = algodClient;
    this.faucetAccount = algosdk.mnemonicToSecretKey(mnemonic);
  }

  /**
   * Fund an account with ALGOs
   */
  async fundAccount(
    recipientAddress: string,
    amount: number = 1000000 // 1 ALGO default
  ): Promise<{
    success: boolean;
    txId?: string;
    message: string;
  }> {
    try {
      // Validate recipient address
      try {
        algosdk.decodeAddress(recipientAddress);
      } catch {
        return {
          success: false,
          message: "Invalid recipient address",
        };
      }

      // Get suggested transaction parameters
      const suggestedParams = await this.client.getTransactionParams().do();

      // Create payment transaction
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: this.faucetAccount.addr,
        to: recipientAddress,
        amount: amount,
        suggestedParams,
      });

      // Sign the transaction
      const signedTxn = txn.signTxn(this.faucetAccount.sk);

      // Submit the transaction
      const { txId } = await this.client.sendRawTransaction(signedTxn).do();

      // Wait for confirmation
      await algosdk.waitForConfirmation(this.client, txId, 4);

      return {
        success: true,
        txId,
        message: `Successfully funded ${algosdk.microalgosToAlgos(amount)} ALGO to ${recipientAddress}`,
      };
    } catch (error) {
      console.error("Faucet funding error:", error);
      return {
        success: false,
        message: `Funding failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Get faucet account address
   */
  getFaucetAddress(): string {
    return this.faucetAccount.addr;
  }

  /**
   * Get faucet account balance
   */
  async getBalance(): Promise<number> {
    try {
      const accountInfo = await this.client.accountInformation(this.faucetAccount.addr).do();
      return accountInfo.amount;
    } catch (error) {
      throw new Error(`Failed to get balance: ${error}`);
    }
  }
} 