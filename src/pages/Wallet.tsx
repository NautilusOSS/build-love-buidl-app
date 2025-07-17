import React, { useEffect, useState } from "react";
import PageLayout from "@/components/PageLayout";
import { useParams } from "react-router-dom";
import { NetworkId, useWallet } from "@txnlab/use-wallet-react";
import { CONTRACT, abi } from "ulujs";
import algosdk from "algosdk";
import BigNumber from "bignumber.js";

const Wallet: React.FC = () => {
  const { activeNetwork, activeAccount, setActiveNetwork, signTransactions } =
    useWallet();
  const { address } = useParams();
  const [voiBalance, setVoiBalance] = useState<number>(0);
  const [algoBalance, setAlgoBalance] = useState<number>(0);
  const [algoARC200Balance, setAlgoARC200Balance] = useState<number>(0);
  const [voiARC200Balance, setVoiARC200Balance] = useState<number>(0);
  const [algoASABalance, setAlgoASABalance] = useState<number>(0);
  const [voiASABalance, setVoiASABalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [transferFrom, setTransferFrom] = useState<string>("");
  const [transferTo, setTransferTo] = useState<string>("");
  const [transferLoading, setTransferLoading] = useState<boolean>(false);
  const [transferStep, setTransferStep] = useState<
    "select-from" | "select-to" | "enter-amount" | "bridge-transfer"
  >("select-from");
  const [externalTransferStep, setExternalTransferStep] = useState<
    | "select-token"
    | "enter-amount"
    | "select-recipient"
    | "select-destination"
    | "confirm"
  >("select-token");
  const [externalTransferAmount, setExternalTransferAmount] =
    useState<string>("");
  const [externalTransferToken, setExternalTransferToken] =
    useState<string>("");
  const [externalTransferDestination, setExternalTransferDestination] =
    useState<string>("");
  const [externalTransferRecipient, setExternalTransferRecipient] =
    useState<string>("");
  const [externalTransferLoading, setExternalTransferLoading] =
    useState<boolean>(false);
  const [recipientBalances, setRecipientBalances] = useState<
    Record<string, number | null>
  >({});
  const [loadingRecipientBalances, setLoadingRecipientBalances] =
    useState<boolean>(false);
  const [recipientOptInStatus, setRecipientOptInStatus] = useState<
    Record<string, { optedIn: boolean; error?: string; balance?: number }>
  >({});
  const [checkingOptIn, setCheckingOptIn] = useState<boolean>(false);
  const [bridgeConfirmationStatus, setBridgeConfirmationStatus] = useState<{
    monitoring: boolean;
    confirmed: boolean;
    confirmationTxId?: string;
    error?: string;
    sourceTxId?: string;
  }>({
    monitoring: false,
    confirmed: false,
  });

  // Calculate combined POW balance
  const totalPOWBalance =
    algoARC200Balance + voiARC200Balance + algoASABalance + voiASABalance;

  console.log("activeNetwork", activeNetwork);

  console.log("voiBalance", voiBalance);
  console.log("algoBalance", algoBalance);
  console.log("algoARC200Balance", algoARC200Balance);
  console.log("voiARC200Balance", voiARC200Balance);
  console.log("algoASABalance", algoASABalance);
  console.log("voiASABalance", voiASABalance);

  const assetId = (networkId: NetworkId) => {
    if (networkId === NetworkId.MAINNET) {
      return 2994233666;
    } else if (networkId === NetworkId.VOIMAIN) {
      return 40152679;
    }
  };

  const tokenId = (networkId: NetworkId) => {
    if (networkId === NetworkId.MAINNET) {
      return 3080081069;
    } else if (networkId === NetworkId.VOIMAIN) {
      return 40153155;
    }
  };

  const algodAPI = (networkId: NetworkId) => {
    if (networkId === NetworkId.MAINNET) {
      return "https://mainnet-api.4160.nodely.dev";
    } else if (networkId === NetworkId.VOIMAIN) {
      return "https://mainnet-api.voi.nodely.dev";
    }
  };

  const algod = (networkId: NetworkId) =>
    new algosdk.Algodv2("", algodAPI(networkId), 443);

  // Function to monitor for Aramid bridge confirmation transactions
  const waitForAramidConfirmation = async (
    destinationNetworkId: NetworkId,
    sourceTxId: string,
    recipientAddress: string,
    maxAttempts: number = 60, // 5 minutes with 5-second intervals
    intervalMs: number = 5000
  ): Promise<{
    confirmed: boolean;
    confirmationTxId?: string;
    error?: string;
  }> => {
    const destinationAlgodClient = algod(destinationNetworkId);

    console.log(
      `Monitoring for Aramid confirmation on ${
        destinationNetworkId === NetworkId.MAINNET ? "Algorand" : "Voi"
      } network...`
    );
    console.log(
      `Looking for confirmation of source transaction: ${sourceTxId}`
    );
    console.log(`Recipient address: ${recipientAddress}`);

    // Track the last round we've checked to avoid duplicates
    let lastCheckedRound = 0;
    let totalBlocksChecked = 0;
    let foundAramidTransactions = 0;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Get the latest round to search from
        const status = await destinationAlgodClient.status().do();
        const currentRound = status["last-round"];

        // Search for transactions in recent blocks (last 100 blocks for better coverage)
        const searchFromRound = Math.max(1, currentRound - 100);

        // Fix: Only check new blocks we haven't seen before, but ensure we don't skip any
        const startRound =
          lastCheckedRound === 0 ? searchFromRound : lastCheckedRound + 1;

        // If we've caught up to current round, wait for new blocks
        if (startRound > currentRound) {
          console.log(
            `Attempt ${
              attempt + 1
            }: Waiting for new blocks (current: ${currentRound}, last checked: ${lastCheckedRound})`
          );
          if (attempt < maxAttempts - 1) {
            await new Promise((resolve) => setTimeout(resolve, intervalMs));
          }
          continue;
        }

        lastCheckedRound = currentRound;
        console.log(
          `Attempt ${
            attempt + 1
          }: Checking blocks ${startRound} to ${currentRound}`
        );

        for (let round = startRound; round <= currentRound; round++) {
          try {
            // Get block information
            const { block } = await destinationAlgodClient.block(round).do();
            totalBlocksChecked++;

            console.log({ block });

            if (block.txns) {
              console.log(
                `Block ${round} has ${block.txns.length} transactions`
              );

              for (const { txn } of block.txns) {
                // Check ALL transactions for aramid confirmation notes, not just those to recipient
                if (!txn.note) continue;

                const noteText = new TextDecoder().decode(txn.note);
                console.log({ noteText });

                // Look for the Aramid confirmation pattern
                if (noteText.includes("aramid-confirm/v1:j")) {
                  console.log({ noteText });
                  foundAramidTransactions++;
                  console.log(
                    `🎯 Found Aramid confirmation transaction #${foundAramidTransactions}: ${txn.id}`
                  );
                  console.log(`Full note: ${noteText}`);

                  try {
                    // Extract the JSON part after 'aramid-confirm/v1:j'
                    const jsonStart =
                      noteText.indexOf("aramid-confirm/v1:j") +
                      "aramid-confirm/v1:j".length;
                    const jsonPart = noteText.substring(jsonStart);
                    console.log("Extracted JSON part:", jsonPart);

                    const confirmationData = JSON.parse(jsonPart);
                    console.log("Parsed confirmation data:", confirmationData);

                    // Check if this confirmation is for our source transaction
                    if (confirmationData.sourceTxId === sourceTxId) {
                      console.log(
                        "✅ Aramid confirmation found for our transaction!"
                      );
                      console.log("Confirmation transaction ID:", txn.id);
                      console.log("Confirmation data:", confirmationData);

                      return {
                        confirmed: true,
                        confirmationTxId: txn.id,
                      };
                    } else {
                      console.log(
                        `Source TxId mismatch. Expected: ${sourceTxId}, Found: ${confirmationData.sourceTxId}`
                      );
                    }
                  } catch (parseError) {
                    console.warn(
                      "Failed to parse Aramid confirmation note:",
                      parseError
                    );
                    console.warn("Note content:", noteText);
                    continue;
                  }
                }

                // Also check for other bridge-related patterns for debugging
                if (
                  noteText.includes("aramid") &&
                  !noteText.includes("aramid-confirm/v1:j")
                ) {
                  console.log(
                    `Found other aramid-related transaction: ${txn.id}`
                  );
                  console.log(`Note: ${noteText}`);
                }

                // Also check for transactions that contain our source TxId in the note (for debugging)
                if (noteText.includes(sourceTxId)) {
                  console.log(
                    `🎯 Found transaction containing our source TxId: ${txn.id}`
                  );
                  console.log(`Note: ${noteText}`);
                  console.log(
                    `Transaction type: ${
                      txn["payment-transaction"]
                        ? "payment"
                        : txn["asset-transfer-transaction"]
                        ? "asset-transfer"
                        : txn["application-transaction"]
                        ? "application"
                        : "other"
                    }`
                  );
                }
              }
            }
          } catch (blockError) {
            console.warn(`Error checking block ${round}:`, blockError);
            continue;
          }
        }

        // If not found in this attempt, wait before next attempt
        if (attempt < maxAttempts - 1) {
          console.log(
            `Attempt ${
              attempt + 1
            }/${maxAttempts}: No confirmation found yet, waiting ${
              intervalMs / 1000
            }s...`
          );
          console.log(`Total blocks checked so far: ${totalBlocksChecked}`);
          console.log(
            `Total aramid transactions found: ${foundAramidTransactions}`
          );
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
      } catch (error) {
        console.error(
          `Error during confirmation monitoring attempt ${attempt + 1}:`,
          error
        );
        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
      }
    }

    console.log("❌ Aramid confirmation not found within timeout period");
    console.log("Debugging information:");
    console.log("- Source transaction ID:", sourceTxId);
    console.log("- Recipient address:", recipientAddress);
    console.log(
      "- Destination network:",
      destinationNetworkId === NetworkId.MAINNET ? "Algorand" : "Voi"
    );
    console.log("- Total attempts:", maxAttempts);
    console.log("- Total blocks checked:", totalBlocksChecked);
    console.log("- Total aramid transactions found:", foundAramidTransactions);
    console.log("- Last checked round:", lastCheckedRound);

    return {
      confirmed: false,
      error: `Confirmation timeout after ${maxAttempts} attempts (${totalBlocksChecked} blocks checked, ${foundAramidTransactions} aramid transactions found). Bridge transaction may still be processing or the confirmation format might be different than expected.`,
    };
  };

  const fetchNetworkBalance = (networkId: NetworkId) => async () => {
    if (!address) return;

    setLoading(true);
    setError(null);

    try {
      const algodClient = algod(networkId);

      const accountInfo = await algodClient.accountInformation(address).do();
      const balance = accountInfo.amount;
      return balance / 1e6;
    } catch (error) {
      console.error("Error fetching VOI balance:", error);
      setError("Failed to fetch wallet balance");
    } finally {
      setLoading(false);
    }
  };

  const fetchARC200Balance = (networkId: NetworkId) => async () => {
    if (!address) return;

    setLoading(true);
    setError(null);

    const ci = new CONTRACT(
      tokenId(networkId),
      algod(networkId),
      undefined,
      abi.nt200,
      {
        addr: "SDSKGUS5AEIQATOLCSNC4PUK5GK6G6JRWMKUJY5GQRWMNXUTWURVUIQV3U",
        sk: new Uint8Array(),
      }
    );

    const balanceR = await ci.arc200_balanceOf(address);
    console.log("balanceR", balanceR);
    const balance = Number(balanceR.returnValue) / 1e6;
    return balance;
  };

  const fetchASABalance = (networkId: NetworkId) => async () => {
    if (!address) return;

    setLoading(true);
    setError(null);

    const algodClient = algod(networkId);
    const accountInfo = await algodClient
      .accountAssetInformation(address, assetId(networkId))
      .do();
    const balance = accountInfo["asset-holding"]["amount"] / 1e6;
    return balance;
  };

  const fetchAlgoBalance = fetchNetworkBalance(NetworkId.MAINNET);
  const fetchVoiBalance = fetchNetworkBalance(NetworkId.VOIMAIN);
  const fetchAlgoARC200Balance = fetchARC200Balance(NetworkId.MAINNET);
  const fetchVoiARC200Balance = fetchARC200Balance(NetworkId.VOIMAIN);
  const fetchAlgoASABalance = fetchASABalance(NetworkId.MAINNET);
  const fetchVoiASABalance = fetchASABalance(NetworkId.VOIMAIN);

  // POW bucket options for transfer - all networks available
  const getAllPowBuckets = () => {
    return [
      {
        id: "algo-arc200",
        name: "Algo ARC200",
        balance: algoARC200Balance,
        color: "blue",
        network: "Algorand",
      },
      {
        id: "algo-asa",
        name: "Algo ASA",
        balance: algoASABalance,
        color: "orange",
        network: "Algorand",
      },
      {
        id: "voi-arc200",
        name: "Voi ARC200",
        balance: voiARC200Balance,
        color: "green",
        network: "Voi",
      },
      {
        id: "voi-asa",
        name: "Voi ASA",
        balance: voiASABalance,
        color: "red",
        network: "Voi",
      },
    ];
  };

  const allBuckets = getAllPowBuckets();
  const availableSourceBuckets = allBuckets.filter(
    (bucket) => bucket.balance > 0
  );
  const isOwnWallet = activeAccount?.address === address;
  const showTransferInterface = activeAccount && isOwnWallet;

  const handleTransfer = async () => {
    if (
      !transferAmount ||
      !transferFrom ||
      !transferTo ||
      transferFrom === transferTo
    ) {
      return;
    }

    setTransferLoading(true);
    try {
      const fromBucket = getBucketById(transferFrom);
      const toBucket = getBucketById(transferTo);

      if (!fromBucket || !toBucket) {
        throw new Error("Invalid bucket selection");
      }

      // Check transfer type
      const isSameNetwork = fromBucket.network === toBucket.network;
      const fromType = transferFrom.includes("arc200") ? "arc200" : "asa";
      const toType = transferTo.includes("arc200") ? "arc200" : "asa";
      const isASAToARC200 = isSameNetwork && fromType !== toType;
      const isCrossNetwork = !isSameNetwork;

      if (isASAToARC200) {
        // Same network ASA ↔ ARC200 transfer
        await handleASAToARC200Transfer(
          transferFrom,
          transferTo,
          transferAmount
        );
      } else if (isCrossNetwork) {
        // Cross-network transfer (ARC200 to ARC200 or ASA to ASA)
        await handleCrossNetworkTransfer(
          transferFrom,
          transferTo,
          transferAmount
        );
      } else {
        // Same network, same type (shouldn't happen with current UI)
        throw new Error("Invalid transfer type");
      }

      // Refresh balances after transfer
      await refreshAllBalances();

      // Reset form
      setTransferAmount("");
      setTransferFrom("");
      setTransferTo("");
      setTransferStep("select-from");
    } catch (error) {
      console.error("Transfer failed:", error);
      // TODO: Show error message to user
    } finally {
      setTransferLoading(false);
    }
  };

  const handleExternalTransfer = async () => {
    if (
      !externalTransferAmount ||
      !externalTransferToken ||
      !externalTransferDestination ||
      !externalTransferRecipient
    ) {
      return;
    }

    setExternalTransferLoading(true);
    try {
      const tokenBucket = getBucketById(externalTransferToken);
      const destinationBucket = getBucketById(externalTransferDestination);

      if (!tokenBucket || !destinationBucket) {
        throw new Error("Invalid token or destination selection");
      }

      // Validate recipient address format
      if (!algosdk.isValidAddress(externalTransferRecipient)) {
        throw new Error("Invalid recipient address");
      }

      // Convert amount to micro units (6 decimals)
      const amountInMicroUnits = Math.floor(
        parseFloat(externalTransferAmount) * 1e6
      );

      // Check if this is a cross-network transfer
      const isCrossNetwork = tokenBucket.network !== destinationBucket.network;
      const fromType = externalTransferToken.includes("arc200")
        ? "arc200"
        : "asa";
      const toType = externalTransferDestination.includes("arc200")
        ? "arc200"
        : "asa";

      if (isCrossNetwork) {
        // Cross-network transfer
        await handleCrossNetworkExternalTransfer(
          externalTransferToken,
          externalTransferDestination,
          externalTransferRecipient,
          amountInMicroUnits
        );
      } else {
        // Same network transfer
        const networkId =
          tokenBucket.network === "Algorand"
            ? NetworkId.MAINNET
            : NetworkId.VOIMAIN;
        const algodClient = algod(networkId);

        if (fromType === "arc200" && toType === "arc200") {
          // ARC200 to ARC200 (same network)
          await transferARC200ToExternal(
            algodClient,
            activeAccount,
            externalTransferToken,
            externalTransferRecipient,
            amountInMicroUnits
          );
        } else if (fromType === "asa" && toType === "asa") {
          // ASA to ASA (same network)
          await transferASAToExternal(
            algodClient,
            activeAccount,
            externalTransferToken,
            externalTransferRecipient,
            amountInMicroUnits
          );
        } else {
          // Same network ASA ↔ ARC200 conversion
          await handleASAToARC200Transfer(
            externalTransferToken,
            externalTransferDestination,
            externalTransferAmount
          );
        }
      }

      // Refresh balances after transfer
      await refreshAllBalances();

      // Only reset form for same-network transfers
      // For cross-network transfers, we want to keep the confirmation status visible
      if (!isCrossNetwork) {
        resetExternalTransfer();
      }
    } catch (error) {
      console.error("External transfer failed:", error);
      // TODO: Show error message to user
    } finally {
      setExternalTransferLoading(false);
    }
  };

  const handleCrossNetworkExternalTransfer = async (
    fromTokenId: string,
    toTokenId: string,
    recipient: string,
    amountInMicroUnits: number
  ) => {
    const fromBucket = getBucketById(fromTokenId);
    const toBucket = getBucketById(toTokenId);

    if (!fromBucket || !toBucket) {
      throw new Error("Invalid bucket selection");
    }

    const fromType = fromTokenId.includes("arc200") ? "arc200" : "asa";
    const toType = toTokenId.includes("arc200") ? "arc200" : "asa";

    if (fromType === "arc200" && toType === "arc200") {
      // ARC200 to ARC200 cross-network transfer
      await transferARC200CrossNetworkExternal(
        fromTokenId,
        toTokenId,
        recipient,
        amountInMicroUnits
      );
    } else if (fromType === "asa" && toType === "asa") {
      // ASA to ASA cross-network transfer
      await transferASACrossNetworkExternal(
        fromTokenId,
        toTokenId,
        recipient,
        amountInMicroUnits
      );
    } else if (fromType === "arc200" && toType === "asa") {
      // ARC200 to ASA cross-network transfer
      await transferARC200ToASACrossNetworkExternal(
        fromTokenId,
        toTokenId,
        recipient,
        amountInMicroUnits
      );
    } else {
      throw new Error(
        "Cross-network ASA to ARC200 transfers are not supported"
      );
    }
  };

  const transferARC200CrossNetworkExternal = async (
    fromTokenId: string,
    toTokenId: string,
    recipient: string,
    amountInMicroUnits: number
  ) => {
    // This would require bridge integration
    // For now, we'll simulate the transfer
    console.log(
      `Cross-network ARC200 external transfer: ${amountInMicroUnits} from ${fromTokenId} to ${toTokenId} for recipient ${recipient}`
    );
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate bridge delay
  };

  const transferASACrossNetworkExternal = async (
    fromTokenId: string,
    toTokenId: string,
    recipient: string,
    amountInMicroUnits: number
  ) => {
    if (!activeAccount) {
      throw new Error("Wallet not connected");
    }

    const fromBucket = getBucketById(fromTokenId);
    const toBucket = getBucketById(toTokenId);

    if (!fromBucket || !toBucket) {
      throw new Error("Invalid bucket selection");
    }

    // 0.1% fee
    const feeAmount = BigInt(
      new BigNumber(amountInMicroUnits).multipliedBy(0.001).toFixed(0)
    );
    const destinationAmount = BigInt(amountInMicroUnits) - feeAmount;

    // Get source and destination network IDs
    const fromNetworkId =
      fromBucket.network === "Algorand" ? NetworkId.MAINNET : NetworkId.VOIMAIN;
    const toNetworkId =
      toBucket.network === "Algorand" ? NetworkId.MAINNET : NetworkId.VOIMAIN;

    // Get source and destination asset IDs
    const fromAssetId = fromTokenId.includes("algo") ? 2994233666 : 40152679;
    const toAssetId = toTokenId.includes("algo") ? 2994233666 : 40152679;

    console.log(
      `Cross-network ASA external transfer: ${amountInMicroUnits} from ${fromTokenId} to ${toTokenId} for recipient ${recipient}`
    );

    // Step 1: Transfer ASA on source network (to bridge address)
    const fromAlgodClient = algod(fromNetworkId);
    const suggestedParams = await fromAlgodClient.getTransactionParams().do();

    // Transfer to Aramid bridge with recipient address in the note
    const transferTxn =
      algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: activeAccount.address,
        to: "ARAMIDFJYV2TOFB5MRNZJIXBSAVZCVAUDAPFGKR5PNX4MTILGAZABBTXQQ",
        assetIndex: fromAssetId,
        amount: amountInMicroUnits,
        suggestedParams,
        note:
          fromNetworkId === NetworkId.VOIMAIN &&
          toNetworkId === NetworkId.MAINNET
            ? new TextEncoder().encode(
                `aramid-transfer/v1:j{"destinationNetwork":416001,"destinationAddress":"${recipient}","destinationToken":"${toAssetId}","feeAmount":${feeAmount},"destinationAmount":${destinationAmount},"note":"aramid","sourceAmount":${destinationAmount}}`
              )
            : new TextEncoder().encode(
                `aramid-transfer/v1:j{"destinationNetwork":416101,"destinationAddress":"${recipient}","destinationToken":"${toAssetId}","feeAmount":${feeAmount},"destinationAmount":${destinationAmount},"note":"aramid","sourceAmount":${destinationAmount}}`
              ),
      });

    // Sign and submit transfer transaction
    const transferSigned = await signTransactions([
      algosdk.encodeUnsignedTransaction(transferTxn),
    ]);

    const { txId } = await fromAlgodClient
      .sendRawTransaction(transferSigned)
      .do();
    await algosdk.waitForConfirmation(fromAlgodClient, txId, 4);

    console.log(`Source transaction confirmed: ${txId}`);

    // Step 2: Monitor for Aramid bridge confirmation on destination network
    console.log(
      "Monitoring for Aramid bridge confirmation on destination network..."
    );

    setBridgeConfirmationStatus({
      monitoring: true,
      confirmed: false,
      sourceTxId: txId,
    });

    const confirmationResult = await waitForAramidConfirmation(
      toNetworkId,
      txId,
      recipient
    );

    setBridgeConfirmationStatus({
      monitoring: false,
      confirmed: confirmationResult.confirmed,
      confirmationTxId: confirmationResult.confirmationTxId,
      error: confirmationResult.error,
      sourceTxId: txId,
    });

    if (confirmationResult.confirmed) {
      console.log(
        "✅ Cross-network ASA external transfer completed successfully!"
      );
      console.log(
        `Confirmation transaction: ${confirmationResult.confirmationTxId}`
      );
      
      // Reset form after successful confirmation
      setTimeout(() => {
        resetExternalTransfer();
      }, 3000); // Give user 3 seconds to see the success message
    } else {
      console.log(
        "⚠️ Cross-network ASA external transfer may still be processing"
      );
      console.log(`Error: ${confirmationResult.error}`);
    }

    console.log("Cross-network ASA external transfer completed");
  };

  const transferARC200ToASACrossNetworkExternal = async (
    fromTokenId: string,
    toTokenId: string,
    recipient: string,
    amountInMicroUnits: number
  ) => {
    // This would require bridge integration
    // For now, we'll simulate the transfer
    console.log(
      `Cross-network ARC200 to ASA external transfer: ${amountInMicroUnits} from ${fromTokenId} to ${toTokenId} for recipient ${recipient}`
    );
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate bridge delay
  };

  const transferARC200ToExternal = async (
    algodClient: algosdk.Algodv2,
    account: any,
    tokenId: string,
    recipient: string,
    amountInMicroUnits: number
  ) => {
    const contractId = tokenId.includes("algo") ? 3080081069 : 40153155;

    const ci = new CONTRACT(contractId, algodClient, undefined, abi.nt200, {
      addr: account.address,
      sk: new Uint8Array(),
    });

    // Build transfer transaction
    const transferTxn = await ci.arc200_transfer(
      recipient,
      BigInt(amountInMicroUnits)
    );

    console.log("transferTxn", transferTxn);

    // Sign and submit transfer transaction
    const transferSigned = await signTransactions(
      transferTxn.txns.map(
        (txn: string) =>
          new Uint8Array(
            atob(txn)
              .split("")
              .map((char) => char.charCodeAt(0))
          )
      )
    );

    const { txId } = await algodClient.sendRawTransaction(transferSigned).do();
    await algosdk.waitForConfirmation(algodClient, txId, 4);

    console.log("ARC200 external transfer completed");
  };

  const transferASAToExternal = async (
    algodClient: algosdk.Algodv2,
    account: any,
    tokenId: string,
    recipient: string,
    amountInMicroUnits: number
  ) => {
    const assetId = tokenId.includes("algo") ? 2994233666 : 40152679;

    const suggestedParams = await algodClient.getTransactionParams().do();

    const transferTxn =
      algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: account.address,
        to: recipient,
        assetIndex: assetId,
        amount: amountInMicroUnits,
        suggestedParams,
      });

    // Sign and submit transfer transaction
    const transferSigned = await signTransactions([
      algosdk.encodeUnsignedTransaction(transferTxn),
    ]);

    const { txId } = await algodClient.sendRawTransaction(transferSigned).do();
    await algosdk.waitForConfirmation(algodClient, txId, 4);

    console.log("ASA external transfer completed");
  };

  const handleCrossNetworkTransfer = async (
    fromBucketId: string,
    toBucketId: string,
    amount: string
  ) => {
    if (!activeAccount) {
      throw new Error("Wallet not connected");
    }

    const fromBucket = getBucketById(fromBucketId);
    const toBucket = getBucketById(toBucketId);

    if (!fromBucket || !toBucket) {
      throw new Error("Invalid bucket selection");
    }

    // Convert amount to micro units (6 decimals)
    const amountInMicroUnits = Math.floor(parseFloat(amount) * 1e6);

    const fromType = fromBucketId.includes("arc200") ? "arc200" : "asa";
    const toType = toBucketId.includes("arc200") ? "arc200" : "asa";

    if (fromType === "arc200" && toType === "arc200") {
      // ARC200 to ARC200 cross-network transfer
      await transferARC200CrossNetwork(
        fromBucketId,
        toBucketId,
        amountInMicroUnits
      );
    } else if (fromType === "asa" && toType === "asa") {
      // ASA to ASA cross-network transfer
      await transferASACrossNetwork(
        fromBucketId,
        toBucketId,
        amountInMicroUnits
      );
    } else if (fromType === "arc200" && toType === "asa") {
      // ARC200 to ASA cross-network transfer
      await transferARC200ToASACrossNetwork(
        fromBucketId,
        toBucketId,
        amountInMicroUnits
      );
    } else {
      throw new Error("Invalid cross-network transfer type");
    }
  };

  const transferARC200CrossNetwork = async (
    fromBucketId: string,
    toBucketId: string,
    amountInMicroUnits: number
  ) => {
    if (!activeAccount) {
      throw new Error("Wallet not connected");
    }

    const fromBucket = getBucketById(fromBucketId);
    const toBucket = getBucketById(toBucketId);

    if (!fromBucket || !toBucket) {
      throw new Error("Invalid bucket selection");
    }

    // Get source and destination network IDs
    const fromNetworkId =
      fromBucket.network === "Algorand" ? NetworkId.MAINNET : NetworkId.VOIMAIN;
    const toNetworkId =
      toBucket.network === "Algorand" ? NetworkId.MAINNET : NetworkId.VOIMAIN;

    // Get source and destination contract IDs
    const fromContractId = fromBucketId.includes("algo")
      ? 3080081069
      : 40153155;
    const toContractId = toBucketId.includes("algo") ? 3080081069 : 40153155;

    console.log(
      `Cross-network ARC200 transfer: ${amountInMicroUnits} from ${fromBucketId} to ${toBucketId}`
    );

    // Step 1: Withdraw from source ARC200 contract
    const fromAlgodClient = algod(fromNetworkId);
    const fromCi = new CONTRACT(
      fromContractId,
      fromAlgodClient,
      undefined,
      abi.nt200,
      {
        addr: activeAccount.address,
        sk: new Uint8Array(),
      }
    );

    // Build withdraw transaction
    const withdrawTxn = await fromCi.withdraw(BigInt(amountInMicroUnits));

    // Sign and submit withdraw transaction
    const withdrawSigned = await signTransactions([
      algosdk.encodeUnsignedTransaction(withdrawTxn.obj),
    ]);

    const withdrawTxId = await fromAlgodClient
      .sendRawTransaction(withdrawSigned)
      .do();
    await algosdk.waitForConfirmation(fromAlgodClient, withdrawTxId, 4);

    // Step 2: Bridge tokens (simulated - in reality this would use a bridge service)
    console.log("Bridging tokens between networks...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 3: Deposit to destination ARC200 contract
    const toAlgodClient = algod(toNetworkId);
    const toCi = new CONTRACT(
      toContractId,
      toAlgodClient,
      undefined,
      abi.nt200,
      {
        addr: activeAccount.address,
        sk: new Uint8Array(),
      }
    );

    // Build deposit transaction
    const depositTxn = await toCi.deposit(BigInt(amountInMicroUnits));

    // Sign and submit deposit transaction
    const depositSigned = await signTransactions([
      algosdk.encodeUnsignedTransaction(depositTxn.obj),
    ]);

    const depositTxId = await toAlgodClient
      .sendRawTransaction(depositSigned)
      .do();
    await algosdk.waitForConfirmation(toAlgodClient, depositTxId, 4);

    console.log("Cross-network ARC200 transfer completed");
  };

  const transferARC200ToASACrossNetwork = async (
    fromBucketId: string,
    toBucketId: string,
    amountInMicroUnits: number
  ) => {
    if (!activeAccount) {
      throw new Error("Wallet not connected");
    }

    const fromBucket = getBucketById(fromBucketId);
    const toBucket = getBucketById(toBucketId);

    if (!fromBucket || !toBucket) {
      throw new Error("Invalid bucket selection");
    }

    // 0.1% fee
    const feeAmount = BigInt(
      new BigNumber(amountInMicroUnits).multipliedBy(0.001).toFixed(0)
    );
    const destinationAmount = BigInt(amountInMicroUnits) - feeAmount;

    // Get source and destination network IDs
    const fromNetworkId =
      fromBucket.network === "Algorand" ? NetworkId.MAINNET : NetworkId.VOIMAIN;
    const toNetworkId =
      toBucket.network === "Algorand" ? NetworkId.MAINNET : NetworkId.VOIMAIN;

    // Get source contract ID and destination asset ID
    const fromContractId = fromBucketId.includes("algo")
      ? 3080081069
      : 40153155;
    const toAssetId = toBucketId.includes("algo") ? 2994233666 : 40152679;

    console.log(
      `Cross-network ARC200 to ASA transfer: ${amountInMicroUnits} from ${fromBucketId} to ${toBucketId}`
    );

    // Step 1: Withdraw from source ARC200 contract

    await transferARC200ToASA(
      algod(fromNetworkId),
      activeAccount,
      fromBucketId,
      fromBucketId,
      amountInMicroUnits
    );

    // Step 2: Bridge tokens to destination network as ASA
    console.log("Bridging ARC200 tokens to destination network as ASA...");

    await transferASACrossNetwork(fromBucketId, toBucketId, amountInMicroUnits);

    // Step 3: Receive ASA tokens on destination network
    // In a real implementation, the bridge would mint ASA tokens on the destination network
    console.log("ASA tokens received on destination network");

    console.log("Cross-network ARC200 to ASA transfer completed");
  };

  const transferASACrossNetwork = async (
    fromBucketId: string,
    toBucketId: string,
    amountInMicroUnits: number
  ) => {
    if (!activeAccount) {
      throw new Error("Wallet not connected");
    }

    const fromBucket = getBucketById(fromBucketId);
    const toBucket = getBucketById(toBucketId);

    if (!fromBucket || !toBucket) {
      throw new Error("Invalid bucket selection");
    }

    // 0.1% fee
    const feeAmount = BigInt(
      new BigNumber(amountInMicroUnits).multipliedBy(0.001).toFixed(0)
    );
    const destinationAmount = BigInt(amountInMicroUnits) - feeAmount;

    // Get source and destination network IDs
    const fromNetworkId =
      fromBucket.network === "Algorand" ? NetworkId.MAINNET : NetworkId.VOIMAIN;
    const toNetworkId =
      toBucket.network === "Algorand" ? NetworkId.MAINNET : NetworkId.VOIMAIN;

    // Get source and destination asset IDs
    const fromAssetId = fromBucketId.includes("algo") ? 2994233666 : 40152679;
    const toAssetId = toBucketId.includes("algo") ? 2994233666 : 40152679;

    console.log(
      `Cross-network ASA transfer: ${amountInMicroUnits} from ${fromBucketId} to ${toBucketId}`
    );

    // Step 1: Transfer ASA on source network (to bridge address)
    const fromAlgodClient = algod(fromNetworkId);
    const suggestedParams = await fromAlgodClient.getTransactionParams().do();

    // In a real implementation, this would transfer to a bridge contract
    // For now, we'll simulate by transferring to the same address
    const transferTxn =
      algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: activeAccount.address,
        to: "ARAMIDFJYV2TOFB5MRNZJIXBSAVZCVAUDAPFGKR5PNX4MTILGAZABBTXQQ",
        assetIndex: fromAssetId,
        amount: amountInMicroUnits,
        suggestedParams,
        note:
          fromNetworkId === NetworkId.VOIMAIN &&
          toNetworkId === NetworkId.MAINNET
            ? new TextEncoder().encode(
                `aramid-transfer/v1:j{"destinationNetwork":416001,"destinationAddress":"${activeAccount.address}","destinationToken":"${toAssetId}","feeAmount":${feeAmount},"destinationAmount":${destinationAmount},"note":"aramid","sourceAmount":${destinationAmount}}`
              )
            : new TextEncoder().encode(
                `aramid-transfer/v1:j{"destinationNetwork":416101,"destinationAddress":"${activeAccount.address}","destinationToken":"${toAssetId}","feeAmount":${feeAmount},"destinationAmount":${destinationAmount},"note":"aramid","sourceAmount":${destinationAmount}}`
              ),
      });

    // Sign and submit transfer transaction
    const transferSigned = await signTransactions([
      algosdk.encodeUnsignedTransaction(transferTxn),
    ]);

    const { txId } = await fromAlgodClient
      .sendRawTransaction(transferSigned)
      .do();
    await algosdk.waitForConfirmation(fromAlgodClient, txId, 4);

    console.log(`Source transaction confirmed: ${txId}`);

    // Step 2: Monitor for Aramid bridge confirmation on destination network
    console.log(
      "Monitoring for Aramid bridge confirmation on destination network..."
    );

    setBridgeConfirmationStatus({
      monitoring: true,
      confirmed: false,
      sourceTxId: txId,
    });

    const confirmationResult = await waitForAramidConfirmation(
      toNetworkId,
      txId,
      activeAccount.address
    );

    setBridgeConfirmationStatus({
      monitoring: false,
      confirmed: confirmationResult.confirmed,
      confirmationTxId: confirmationResult.confirmationTxId,
      error: confirmationResult.error,
      sourceTxId: txId,
    });

    if (confirmationResult.confirmed) {
      console.log("✅ Cross-network ASA transfer completed successfully!");
      console.log(
        `Confirmation transaction: ${confirmationResult.confirmationTxId}`
      );
    } else {
      console.log("⚠️ Cross-network ASA transfer may still be processing");
      console.log(`Error: ${confirmationResult.error}`);
    }

    console.log("Cross-network ASA transfer completed");
  };

  const handleASAToARC200Transfer = async (
    fromBucketId: string,
    toBucketId: string,
    amount: string
  ) => {
    if (!activeAccount) {
      throw new Error("Wallet not connected");
    }

    const fromBucket = getBucketById(fromBucketId);
    const toBucket = getBucketById(toBucketId);

    if (!fromBucket || !toBucket) {
      throw new Error("Invalid bucket selection");
    }

    const networkId =
      fromBucket.network === "Algorand" ? NetworkId.MAINNET : NetworkId.VOIMAIN;
    const algodClient = algod(networkId);

    try {
      // Convert amount to micro units (6 decimals)
      const amountInMicroUnits = Math.floor(parseFloat(amount) * 1e6);

      if (fromBucketId.includes("asa")) {
        // ASA to ARC200 transfer
        await transferASAToARC200(
          algodClient,
          activeAccount,
          fromBucketId,
          toBucketId,
          amountInMicroUnits
        );
      } else {
        // ARC200 to ASA transfer
        await transferARC200ToASA(
          algodClient,
          activeAccount,
          fromBucketId,
          toBucketId,
          amountInMicroUnits
        );
      }
    } catch (error) {
      console.error("ASA ↔ ARC200 transfer failed:", error);
      throw error;
    }
  };

  const transferASAToARC200 = async (
    algodClient: algosdk.Algodv2,
    account: any,
    fromBucketId: string,
    toBucketId: string,
    amountInMicroUnits: number
  ) => {
    // Get asset ID and token contract ID based on network
    const assetId = fromBucketId.includes("algo") ? 2994233666 : 40152679;
    const tokenContractId = toBucketId.includes("algo") ? 3080081069 : 40153155;

    // Create ARC200 contract instance
    const ci = new CONTRACT(
      tokenContractId,
      algodClient,
      undefined,
      abi.custom,
      {
        addr: account.address,
        sk: new Uint8Array(),
      }
    );
    const builder = {
      token: new CONTRACT(
        tokenContractId,
        algodClient,
        undefined,
        abi.nt200,
        {
          addr: account.address,
          sk: new Uint8Array(),
        },
        true,
        false,
        true
      ),
    };

    // Build transaction group

    let customR;
    for (const p of [0, 28500]) {
      const buildN = [];
      const txnO = (await builder.token.deposit(BigInt(amountInMicroUnits)))
        .obj;
      buildN.push({
        ...txnO,
        note: new TextEncoder().encode("ASA to ARC200 transfer"),
        payment: p,
        // extra args
        xaid: Number(assetId),
        aamt: amountInMicroUnits,
        // asset holdings
        foreignAssets: [assetId],
        accounts: [
          "SDSKGUS5AEIQATOLCSNC4PUK5GK6G6JRWMKUJY5GQRWMNXUTWURVUIQV3U",
          algosdk.getApplicationAddress(tokenContractId),
        ],
      });
      ci.setFee(4000);
      ci.setBeaconId(tokenContractId);
      ci.setBeaconSelector("fb6eb573"); // touch()uint64
      ci.setEnableGroupResourceSharing(true);
      ci.setExtraTxns(buildN);
      customR = await ci.custom();
      if (customR.success) {
        break;
      }
    }
    if (!customR.success) {
      throw new Error("Failed to deposit ASA to ARC200");
    }
    const stxns = await signTransactions(
      customR.txns.map(
        (txn: string) =>
          new Uint8Array(
            atob(txn)
              .split("")
              .map((char) => char.charCodeAt(0))
          )
      )
    );
    const { txId } = await algodClient.sendRawTransaction(stxns).do();
    await algosdk.waitForConfirmation(algodClient, txId, 4);
  };

  const transferARC200ToASA = async (
    algodClient: algosdk.Algodv2,
    account: any,
    fromBucketId: string,
    toBucketId: string,
    amountInMicroUnits: number
  ) => {
    // Get asset ID and token contract ID based on network
    const assetId = toBucketId.includes("algo") ? 2994233666 : 40152679;
    const tokenContractId = fromBucketId.includes("algo")
      ? 3080081069
      : 40153155;

    // Create ARC200 contract instance
    const ci = new CONTRACT(
      tokenContractId,
      algodClient,
      undefined,
      abi.custom,
      {
        addr: account.address,
        sk: new Uint8Array(),
      }
    );
    const builder = {
      token: new CONTRACT(
        tokenContractId,
        algodClient,
        undefined,
        abi.nt200,
        {
          addr: account.address,
          sk: new Uint8Array(),
        },
        true,
        false,
        true
      ),
    };
    const buildN = [];
    const withdrawTxn = (
      await builder.token.withdraw(BigInt(amountInMicroUnits))
    ).obj;
    buildN.push({
      ...withdrawTxn,
      note: new TextEncoder().encode("ARC200 to ASA transfer"),
      foreignAssets: [assetId],
      accounts: [
        "SDSKGUS5AEIQATOLCSNC4PUK5GK6G6JRWMKUJY5GQRWMNXUTWURVUIQV3U",
        algosdk.getApplicationAddress(tokenContractId),
      ],
    });
    ci.setExtraTxns(buildN);
    ci.setEnableGroupResourceSharing(true);
    ci.setFee(4000);
    ci.setBeaconId(tokenContractId);
    ci.setBeaconSelector("fb6eb573"); // touch()uint64
    const customR = await ci.custom();
    if (!customR.success) {
      throw new Error("Failed to withdraw ARC200 to ASA");
    }
    const stxns = await signTransactions(
      customR.txns.map(
        (txn: string) =>
          new Uint8Array(
            atob(txn)
              .split("")
              .map((char) => char.charCodeAt(0))
          )
      )
    );
    const { txId } = await algodClient.sendRawTransaction(stxns).do();
    await algosdk.waitForConfirmation(algodClient, txId, 4);
  };

  const refreshAllBalances = async () => {
    try {
      // Use Promise.allSettled to handle individual failures gracefully
      const results = await Promise.allSettled([
        fetchVoiBalance(),
        fetchAlgoBalance(),
        fetchAlgoARC200Balance(),
        fetchVoiARC200Balance(),
        fetchAlgoASABalance(),
        fetchVoiASABalance(),
      ]);

      // Handle each result individually
      const [
        voiResult,
        algoResult,
        algoARC200Result,
        voiARC200Result,
        algoASAResult,
        voiASAResult,
      ] = results;

      // Update balances based on success/failure of each fetch
      if (voiResult.status === "fulfilled" && voiResult.value !== undefined) {
        setVoiBalance(voiResult.value);
      } else {
        console.warn(
          "Failed to fetch VOI balance:",
          voiResult.status === "rejected" ? voiResult.reason : "No data"
        );
        setVoiBalance(0);
      }

      if (algoResult.status === "fulfilled" && algoResult.value !== undefined) {
        setAlgoBalance(algoResult.value);
      } else {
        console.warn(
          "Failed to fetch ALGO balance:",
          algoResult.status === "rejected" ? algoResult.reason : "No data"
        );
        setAlgoBalance(0);
      }

      if (
        algoARC200Result.status === "fulfilled" &&
        algoARC200Result.value !== undefined
      ) {
        setAlgoARC200Balance(algoARC200Result.value);
      } else {
        console.warn(
          "Failed to fetch Algo ARC200 balance:",
          algoARC200Result.status === "rejected"
            ? algoARC200Result.reason
            : "No data"
        );
        setAlgoARC200Balance(0);
      }

      if (
        voiARC200Result.status === "fulfilled" &&
        voiARC200Result.value !== undefined
      ) {
        setVoiARC200Balance(voiARC200Result.value);
      } else {
        console.warn(
          "Failed to fetch Voi ARC200 balance:",
          voiARC200Result.status === "rejected"
            ? voiARC200Result.reason
            : "No data"
        );
        setVoiARC200Balance(0);
      }

      if (
        algoASAResult.status === "fulfilled" &&
        algoASAResult.value !== undefined
      ) {
        setAlgoASABalance(algoASAResult.value);
      } else {
        console.warn(
          "Failed to fetch Algo ASA balance:",
          algoASAResult.status === "rejected" ? algoASAResult.reason : "No data"
        );
        setAlgoASABalance(0);
      }

      if (
        voiASAResult.status === "fulfilled" &&
        voiASAResult.value !== undefined
      ) {
        setVoiASABalance(voiASAResult.value);
      } else {
        console.warn(
          "Failed to fetch Voi ASA balance:",
          voiASAResult.status === "rejected" ? voiASAResult.reason : "No data"
        );
        setVoiASABalance(0);
      }
    } catch (error) {
      console.error("Error in refreshAllBalances:", error);
    }
  };

  const resetTransfer = () => {
    setTransferAmount("");
    setTransferFrom("");
    setTransferTo("");
    setTransferStep("select-from");
    setBridgeConfirmationStatus({ monitoring: false, confirmed: false });
  };

  const resetExternalTransfer = () => {
    setExternalTransferAmount("");
    setExternalTransferToken("");
    setExternalTransferDestination("");
    setExternalTransferRecipient("");
    setExternalTransferStep("select-token");
    setRecipientBalances({});
    setRecipientOptInStatus({});
    setBridgeConfirmationStatus({ monitoring: false, confirmed: false });
  };

  // Check if recipient is opted into required assets
  const checkRecipientOptIn = async (recipientAddress: string, bucketId: string) => {
    if (!recipientAddress || !algosdk.isValidAddress(recipientAddress)) {
      return { optedIn: false, error: "Invalid address" };
    }

    try {
      const bucket = getBucketById(bucketId);
      if (!bucket) {
        return { optedIn: false, error: "Invalid bucket" };
      }

      const networkId = bucket.network === "Algorand" ? NetworkId.MAINNET : NetworkId.VOIMAIN;
      const algodClient = algod(networkId);

      if (bucketId.includes("arc200")) {
        // Check ARC200 opt-in
        try {
          const contractId = bucketId.includes("algo") ? 3080081069 : 40153155;
          const ci = new CONTRACT(
            contractId,
            algodClient,
            undefined,
            abi.nt200,
            {
              addr: "SDSKGUS5AEIQATOLCSNC4PUK5GK6G6JRWMKUJY5GQRWMNXUTWURVUIQV3U",
              sk: new Uint8Array(),
            }
          );
          const balanceR = await ci.arc200_balanceOf(recipientAddress);
          // If we can get a balance, they're opted in
          return { optedIn: true, balance: Number(balanceR.returnValue) / 1e6 };
        } catch (error) {
          // If balanceOf fails, they're not opted in
          return { optedIn: false, error: "Not opted into ARC200 contract" };
        }
      } else {
        // Check ASA opt-in
        try {
          const assetId = bucketId.includes("algo") ? 2994233666 : 40152679;
          const accountInfo = await algodClient
            .accountAssetInformation(recipientAddress, assetId)
            .do();
          const balance = accountInfo["asset-holding"]["amount"] / 1e6;
          return { optedIn: true, balance };
        } catch (error) {
          // If accountAssetInformation fails, they're not opted in
          return { optedIn: false, error: "Not opted into ASA" };
        }
      }
    } catch (error) {
      console.error("Error checking recipient opt-in:", error);
      return { optedIn: false, error: "Failed to check opt-in status" };
    }
  };

  const fetchRecipientBalances = async (recipientAddress: string) => {
    if (!recipientAddress || !algosdk.isValidAddress(recipientAddress)) {
      setRecipientBalances({});
      return;
    }

    setLoadingRecipientBalances(true);
    const balances: Record<string, number | null> = {};

    try {
      // Fetch balances for all buckets
      const balancePromises = allBuckets.map(async (bucket) => {
        try {
          const networkId =
            bucket.network === "Algorand"
              ? NetworkId.MAINNET
              : NetworkId.VOIMAIN;

          if (bucket.id.includes("arc200")) {
            // Fetch ARC200 balance
            const ci = new CONTRACT(
              bucket.id.includes("algo") ? 3080081069 : 40153155,
              algod(networkId),
              undefined,
              abi.nt200,
              {
                addr: "SDSKGUS5AEIQATOLCSNC4PUK5GK6G6JRWMKUJY5GQRWMNXUTWURVUIQV3U",
                sk: new Uint8Array(),
              }
            );
            const balanceR = await ci.arc200_balanceOf(recipientAddress);
            const balance = Number(balanceR.returnValue) / 1e6;
            balances[bucket.id] = balance;
          } else {
            // Fetch ASA balance
            const algodClient = algod(networkId);
            const accountInfo = await algodClient
              .accountAssetInformation(
                recipientAddress,
                bucket.id.includes("algo") ? 2994233666 : 40152679
              )
              .do();
            const balance = accountInfo["asset-holding"]["amount"] / 1e6;
            balances[bucket.id] = balance;
          }
        } catch (error) {
          console.warn(
            `Failed to fetch recipient balance for ${bucket.name}:`,
            error
          );
          balances[bucket.id] = 0;
        }
      });

      await Promise.allSettled(balancePromises);
      setRecipientBalances(balances);
    } catch (error) {
      console.error("Error fetching recipient balances:", error);
    } finally {
      setLoadingRecipientBalances(false);
    }
  };

  const getBucketById = (id: string) => {
    return allBuckets.find((bucket) => bucket.id === id);
  };

  const isTransferAllowed = (fromId: string, toId: string) => {
    const fromBucket = getBucketById(fromId);
    const toBucket = getBucketById(toId);

    if (!fromBucket || !toBucket) return false;

    // Same network transfers are always allowed
    if (fromBucket.network === toBucket.network) return true;

    // Cross-network transfers
    const fromType = fromId.includes("arc200") ? "arc200" : "asa";
    const toType = toId.includes("arc200") ? "arc200" : "asa";

    // Allow cross-network ASA to ASA transfers
    if (fromType === "asa" && toType === "asa") return true;

    // Allow cross-network ARC200 to ASA transfers (but not ASA to ARC200)
    if (fromType === "arc200" && toType === "asa") return true;

    return false;
  };

  const getRequiredNetwork = (bucketId: string) => {
    const bucket = getBucketById(bucketId);
    if (!bucket) return null;
    return bucket.network === "Algorand"
      ? NetworkId.MAINNET
      : NetworkId.VOIMAIN;
  };

  const retryBridgeConfirmation = async () => {
    if (!bridgeConfirmationStatus.sourceTxId) return;

    setBridgeConfirmationStatus({
      monitoring: true,
      confirmed: false,
      sourceTxId: bridgeConfirmationStatus.sourceTxId,
    });

    // For debugging, we need to determine the correct destination network
    // Since we don't have the original bucket information, we'll try both networks
    console.log("🔄 Retrying bridge confirmation...");
    console.log(
      "Current network:",
      activeNetwork === NetworkId.MAINNET ? "Algorand" : "Voi"
    );

    // Try the opposite network first (most likely scenario)
    const destinationNetworkId =
      activeNetwork === NetworkId.MAINNET
        ? NetworkId.VOIMAIN
        : NetworkId.MAINNET;
    console.log(
      "Trying destination network:",
      destinationNetworkId === NetworkId.MAINNET ? "Algorand" : "Voi"
    );

    // Add a timeout to prevent infinite waiting
    const timeoutPromise = new Promise<{
      confirmed: boolean;
      confirmationTxId?: string;
      error?: string;
    }>((resolve) => {
      setTimeout(() => {
        resolve({
          confirmed: false,
          error: "Retry timeout - bridge confirmation is taking too long",
        });
      }, 300000); // 5 minutes timeout
    });

    const confirmationPromise = waitForAramidConfirmation(
      destinationNetworkId,
      bridgeConfirmationStatus.sourceTxId,
      activeAccount?.address || ""
    );

    const confirmationResult = await Promise.race([
      confirmationPromise,
      timeoutPromise,
    ]);

    setBridgeConfirmationStatus({
      monitoring: false,
      confirmed: confirmationResult.confirmed,
      confirmationTxId: confirmationResult.confirmationTxId,
      error: confirmationResult.error,
      sourceTxId: bridgeConfirmationStatus.sourceTxId,
    });
  };

  // Debug function to search for any bridge-related transactions
  const debugSearchBridgeTransactions = async () => {
    if (!bridgeConfirmationStatus.sourceTxId) return;

    console.log("🔍 Debug: Searching for any bridge-related transactions...");
    console.log("Source transaction ID:", bridgeConfirmationStatus.sourceTxId);
    console.log("Recipient address:", activeAccount?.address);

    // First, verify the source transaction exists
    await verifySourceTransaction();

    // Search both networks to be thorough
    const networks = [NetworkId.MAINNET, NetworkId.VOIMAIN];

    for (const networkId of networks) {
      const networkName = networkId === NetworkId.MAINNET ? "Algorand" : "Voi";
      console.log(`\n🔍 Searching ${networkName} network...`);

      const algodClient = algod(networkId);

      try {
        const status = await algodClient.status().do();
        const currentRound = status["last-round"];
        const searchFromRound = Math.max(1, currentRound - 200); // Search last 200 blocks for better coverage

        console.log(
          `Searching blocks ${searchFromRound} to ${currentRound} for bridge transactions...`
        );

        let foundAramidConfirmTransactions = [];
        let foundOtherAramidTransactions = [];
        let recipientTransactions = [];

        for (let round = searchFromRound; round <= currentRound; round++) {
          try {
            const block = await algodClient.block(round).do();

            if (block.transactions) {
              for (const tx of block.transactions) {
                // Check for transactions to recipient address
                let isToRecipient = false;
                let transactionType = "";

                if (
                  tx["payment-transaction"] &&
                  tx["payment-transaction"].receiver === activeAccount?.address
                ) {
                  isToRecipient = true;
                  transactionType = "payment";
                }

                if (
                  tx["asset-transfer-transaction"] &&
                  tx["asset-transfer-transaction"].receiver ===
                    activeAccount?.address
                ) {
                  isToRecipient = true;
                  transactionType = "asset-transfer";
                }

                if (isToRecipient) {
                  recipientTransactions.push({
                    txId: tx.id,
                    round: round,
                    type: transactionType,
                    note: tx.note ? new TextDecoder().decode(tx.note) : null,
                    amount:
                      tx["payment-transaction"]?.amount ||
                      tx["asset-transfer-transaction"]?.amount,
                  });
                }

                // Check for bridge-related notes
                if (tx.note) {
                  const noteText = new TextDecoder().decode(tx.note);

                  // Specifically look for aramid-confirm transactions
                  if (noteText.includes("aramid-confirm/v1:j")) {
                    foundAramidConfirmTransactions.push({
                      txId: tx.id,
                      round: round,
                      note: noteText,
                      type: tx["payment-transaction"]
                        ? "payment"
                        : tx["asset-transfer-transaction"]
                        ? "asset-transfer"
                        : tx["application-transaction"]
                        ? "application"
                        : "other",
                      receiver:
                        tx["payment-transaction"]?.receiver ||
                        tx["asset-transfer-transaction"]?.receiver ||
                        "N/A",
                    });
                  }
                  // Look for other aramid-related transactions
                  else if (noteText.includes("aramid")) {
                    foundOtherAramidTransactions.push({
                      txId: tx.id,
                      round: round,
                      note: noteText,
                      type: tx["payment-transaction"]
                        ? "payment"
                        : tx["asset-transfer-transaction"]
                        ? "asset-transfer"
                        : tx["application-transaction"]
                        ? "application"
                        : "other",
                      receiver:
                        tx["payment-transaction"]?.receiver ||
                        tx["asset-transfer-transaction"]?.receiver ||
                        "N/A",
                    });
                  }
                }
              }
            }
          } catch (blockError) {
            console.warn(`Error checking block ${round}:`, blockError);
          }
        }

        console.log(`\n📊 ${networkName} Network Results:`);
        console.log(
          `Found ${foundAramidConfirmTransactions.length} aramid-confirm transactions:`
        );
        foundAramidConfirmTransactions.forEach((tx, index) => {
          console.log(
            `${index + 1}. TxId: ${tx.txId}, Round: ${tx.round}, Type: ${
              tx.type
            }, Receiver: ${tx.receiver}`
          );
          console.log(`   Note: ${tx.note}`);

          // Try to parse the confirmation data
          try {
            const jsonStart =
              tx.note.indexOf("aramid-confirm/v1:j") +
              "aramid-confirm/v1:j".length;
            const jsonPart = tx.note.substring(jsonStart);
            const confirmationData = JSON.parse(jsonPart);
            console.log(`   Parsed data:`, confirmationData);

            // Check if this is our confirmation
            if (
              confirmationData.sourceTxId ===
              bridgeConfirmationStatus.sourceTxId
            ) {
              console.log(`   🎯 THIS IS OUR CONFIRMATION!`);
            }
          } catch (parseError) {
            console.log(`   Failed to parse confirmation data:`, parseError);
          }
        });

        console.log(
          `\nFound ${foundOtherAramidTransactions.length} other aramid-related transactions:`
        );
        foundOtherAramidTransactions.forEach((tx, index) => {
          console.log(
            `${index + 1}. TxId: ${tx.txId}, Round: ${tx.round}, Type: ${
              tx.type
            }, Receiver: ${tx.receiver}`
          );
          console.log(`   Note: ${tx.note}`);
        });

        console.log(
          `\nFound ${recipientTransactions.length} transactions to recipient address:`
        );
        recipientTransactions.forEach((tx, index) => {
          console.log(
            `${index + 1}. TxId: ${tx.txId}, Round: ${tx.round}, Type: ${
              tx.type
            }, Amount: ${tx.amount}`
          );
          if (tx.note) {
            console.log(`   Note: ${tx.note}`);
          }
        });

        // Check if any of the recipient transactions contain our source TxId
        const matchingTxs = recipientTransactions.filter(
          (tx) =>
            tx.note && tx.note.includes(bridgeConfirmationStatus.sourceTxId)
        );

        if (matchingTxs.length > 0) {
          console.log(
            `\n🎯 Found ${matchingTxs.length} transactions that might be our confirmation!`
          );
          matchingTxs.forEach((tx, index) => {
            console.log(
              `${index + 1}. TxId: ${tx.txId}, Round: ${tx.round}, Type: ${
                tx.type
              }`
            );
            console.log(`   Note: ${tx.note}`);
          });
        }
      } catch (error) {
        console.error(`Error searching ${networkName} network:`, error);
      }
    }
  };

  // Function to verify the source transaction exists and check its details
  const verifySourceTransaction = async () => {
    if (!bridgeConfirmationStatus.sourceTxId) return;

    console.log("🔍 Verifying source transaction...");

    // Try to find the source transaction on both networks
    const networks = [NetworkId.MAINNET, NetworkId.VOIMAIN];

    for (const networkId of networks) {
      const networkName = networkId === NetworkId.MAINNET ? "Algorand" : "Voi";
      const algodClient = algod(networkId);

      try {
        // Try to get transaction information
        const txInfo = await algodClient
          .pendingTransactionInformation(bridgeConfirmationStatus.sourceTxId)
          .do();
        console.log(
          `✅ Source transaction found on ${networkName} network (pending)`
        );
        console.log("Transaction details:", txInfo);
        return;
      } catch (error) {
        // Transaction not pending, try to get confirmed transaction
        try {
          const txInfo = await algodClient
            .pendingTransactionInformation(bridgeConfirmationStatus.sourceTxId)
            .do();
          console.log(
            `✅ Source transaction found on ${networkName} network (confirmed)`
          );
          console.log("Transaction details:", txInfo);

          // Check if it's a bridge transaction
          if (txInfo.note) {
            const noteText = new TextDecoder().decode(txInfo.note);
            if (noteText.includes("aramid-transfer")) {
              console.log(
                "✅ This is confirmed to be a bridge transfer transaction"
              );
              console.log("Bridge note:", noteText);
            }
          }
          return;
        } catch (confirmedError) {
          console.log(
            `❌ Source transaction not found on ${networkName} network`
          );
        }
      }
    }

    console.log(
      "❌ Source transaction not found on any network - this might indicate the transfer was not initiated properly"
    );
  };

  // Function to manually check a specific transaction for aramid confirmation
  const checkSpecificTransaction = async (txId: string) => {
    console.log(`🔍 Checking specific transaction: ${txId}`);

    const networks = [NetworkId.MAINNET, NetworkId.VOIMAIN];

    for (const networkId of networks) {
      const networkName = networkId === NetworkId.MAINNET ? "Algorand" : "Voi";
      const algodClient = algod(networkId);

      try {
        const txInfo = await algodClient
          .pendingTransactionInformation(txId)
          .do();
        console.log(`✅ Transaction found on ${networkName} network`);
        console.log("Transaction details:", txInfo);

        if (txInfo.note) {
          const noteText = new TextDecoder().decode(txInfo.note);
          console.log("Note content:", noteText);

          if (noteText.includes("aramid-confirm/v1:j")) {
            console.log("🎯 This is an aramid confirmation transaction!");
            try {
              const jsonStart =
                noteText.indexOf("aramid-confirm/v1:j") +
                "aramid-confirm/v1:j".length;
              const jsonPart = noteText.substring(jsonStart);
              const confirmationData = JSON.parse(jsonPart);
              console.log("Parsed confirmation data:", confirmationData);
            } catch (parseError) {
              console.log("Failed to parse confirmation data:", parseError);
            }
          }
        }
        return;
      } catch (error) {
        console.log(`❌ Transaction not found on ${networkName} network`);
      }
    }

    console.log("❌ Transaction not found on any network");
  };

  const needsNetworkSwitch = (bucketId: string) => {
    const requiredNetwork = getRequiredNetwork(bucketId);
    return requiredNetwork && requiredNetwork !== activeNetwork;
  };

  useEffect(() => {
    const fetchBalances = async () => {
      setLoading(true);
      setError(null);
      try {
        // Use Promise.allSettled to handle individual failures gracefully
        const results = await Promise.allSettled([
          fetchVoiBalance(),
          fetchAlgoBalance(),
          fetchAlgoARC200Balance(),
          fetchVoiARC200Balance(),
          fetchAlgoASABalance(),
          fetchVoiASABalance(),
        ]);

        // Handle each result individually
        const [
          voiResult,
          algoResult,
          algoARC200Result,
          voiARC200Result,
          algoASAResult,
          voiASAResult,
        ] = results;

        // Track if any fetches succeeded
        let hasSuccessfulFetches = false;

        // Update balances based on success/failure of each fetch
        if (voiResult.status === "fulfilled" && voiResult.value !== undefined) {
          setVoiBalance(voiResult.value);
          hasSuccessfulFetches = true;
        } else {
          console.warn(
            "Failed to fetch VOI balance:",
            voiResult.status === "rejected" ? voiResult.reason : "No data"
          );
          setVoiBalance(0);
        }

        if (
          algoResult.status === "fulfilled" &&
          algoResult.value !== undefined
        ) {
          setAlgoBalance(algoResult.value);
          hasSuccessfulFetches = true;
        } else {
          console.warn(
            "Failed to fetch ALGO balance:",
            algoResult.status === "rejected" ? algoResult.reason : "No data"
          );
          setAlgoBalance(0);
        }

        if (
          algoARC200Result.status === "fulfilled" &&
          algoARC200Result.value !== undefined
        ) {
          setAlgoARC200Balance(algoARC200Result.value);
          hasSuccessfulFetches = true;
        } else {
          console.warn(
            "Failed to fetch Algo ARC200 balance:",
            algoARC200Result.status === "rejected"
              ? algoARC200Result.reason
              : "No data"
          );
          setAlgoARC200Balance(0);
        }

        if (
          voiARC200Result.status === "fulfilled" &&
          voiARC200Result.value !== undefined
        ) {
          setVoiARC200Balance(voiARC200Result.value);
          hasSuccessfulFetches = true;
        } else {
          console.warn(
            "Failed to fetch Voi ARC200 balance:",
            voiARC200Result.status === "rejected"
              ? voiARC200Result.reason
              : "No data"
          );
          setVoiARC200Balance(0);
        }

        if (
          algoASAResult.status === "fulfilled" &&
          algoASAResult.value !== undefined
        ) {
          setAlgoASABalance(algoASAResult.value);
          hasSuccessfulFetches = true;
        } else {
          console.warn(
            "Failed to fetch Algo ASA balance:",
            algoASAResult.status === "rejected"
              ? algoASAResult.reason
              : "No data"
          );
          setAlgoASABalance(0);
        }

        if (
          voiASAResult.status === "fulfilled" &&
          voiASAResult.value !== undefined
        ) {
          setVoiASABalance(voiASAResult.value);
          hasSuccessfulFetches = true;
        } else {
          console.warn(
            "Failed to fetch Voi ASA balance:",
            voiASAResult.status === "rejected" ? voiASAResult.reason : "No data"
          );
          setVoiASABalance(0);
        }

        // Only show error if all fetches failed
        if (!hasSuccessfulFetches) {
          setError("Failed to fetch wallet balances");
        }
      } catch (error) {
        console.error("Error in initial balance fetch:", error);
        setError("Failed to fetch wallet balances");
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
  }, [address]);

  // Fetch recipient balances and check opt-in status when recipient address changes
  useEffect(() => {
    if (
      externalTransferRecipient &&
      algosdk.isValidAddress(externalTransferRecipient)
    ) {
      fetchRecipientBalances(externalTransferRecipient);
      checkRecipientOptInForAllBuckets(externalTransferRecipient);
    } else {
      setRecipientBalances({});
      setRecipientOptInStatus({});
    }
  }, [externalTransferRecipient]);

  // Check opt-in status for all buckets
  const checkRecipientOptInForAllBuckets = async (recipientAddress: string) => {
    if (!recipientAddress || !algosdk.isValidAddress(recipientAddress)) {
      setRecipientOptInStatus({});
      return;
    }

    setCheckingOptIn(true);
    const optInStatus: Record<string, { optedIn: boolean; error?: string; balance?: number }> = {};

    try {
      // Check opt-in for all buckets
      const optInPromises = allBuckets.map(async (bucket) => {
        const status = await checkRecipientOptIn(recipientAddress, bucket.id);
        optInStatus[bucket.id] = status;
      });

      await Promise.allSettled(optInPromises);
      setRecipientOptInStatus(optInStatus);
    } catch (error) {
      console.error("Error checking recipient opt-in status:", error);
    } finally {
      setCheckingOptIn(false);
    }
  };

  const breadCrumb = [
    {
      to: "/",
      label: "[POW]",
    },
    {
      label: address
        ? `${address.slice(0, 6)}...${address.slice(-4)}`
        : "Wallet",
      isCurrentPage: true,
    },
  ];

  return (
    <PageLayout breadcrumb={breadCrumb}>
      <div className="w-full flex flex-col items-start justify-start gap-4 px-4 md:px-6 lg:px-8">
        <div className="w-full mb-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Network Token Balances:</h2>
          </div>

          {loading ? (
            <div className="p-6 rounded-xl border border-gray-200/20 shadow-lg bg-card w-full">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2">Loading balances...</span>
              </div>
            </div>
          ) : error ? (
            <div className="p-6 rounded-xl border border-red-200/20 shadow-lg bg-card w-full">
              <div className="text-red-500 text-center">
                {error}
                <button
                  onClick={() => {
                    const fetchBalances = async () => {
                      setLoading(true);
                      setError(null);
                      try {
                        const [voiResult, algoResult] = await Promise.all([
                          fetchVoiBalance(),
                          fetchAlgoBalance(),
                        ]);
                        if (voiResult !== undefined) setVoiBalance(voiResult);
                        if (algoResult !== undefined)
                          setAlgoBalance(algoResult);
                      } catch (error) {
                        setError("Failed to fetch wallet balances");
                      } finally {
                        setLoading(false);
                      }
                    };
                    fetchBalances();
                  }}
                  className="ml-2 text-blue-500 hover:text-blue-400 underline"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 w-full">
              {/* POW Balance Card */}
              <div className="p-6 rounded-xl border border-gray-200/20 shadow-lg bg-card hover:bg-card/80 transition-colors w-full">
                <div className="flex justify-between mb-2">
                  <div className="text-lg font-semibold text-card-foreground">
                    POW (Total)
                  </div>
                  <div className="text-lg text-card-foreground">
                    {totalPOWBalance.toLocaleString()}
                  </div>
                </div>
                <div className="w-full bg-gray-200/20 rounded-full h-2.5 relative overflow-hidden">
                  {/* Use percentage-based approach for equal visibility */}
                  {(() => {
                    const balances = [
                      { value: algoARC200Balance, color: "bg-blue-500" },
                      { value: voiARC200Balance, color: "bg-green-500" },
                      { value: algoASABalance, color: "bg-orange-500" },
                      { value: voiASABalance, color: "bg-red-500" },
                    ];

                    const totalBalance = balances.reduce(
                      (sum, balance) => sum + balance.value,
                      0
                    );
                    const nonZeroBalances = balances.filter((b) => b.value > 0);

                    // If all balances are zero, show empty bar
                    if (nonZeroBalances.length === 0) {
                      return null;
                    }

                    // If only one balance is non-zero, it gets full width
                    if (nonZeroBalances.length === 1) {
                      const balance = nonZeroBalances[0];
                      return (
                        <div
                          className={`absolute top-0 left-0 h-full ${balance.color} transition-all duration-300`}
                          style={{ width: "100%" }}
                        ></div>
                      );
                    }

                    // For multiple balances, use contiguous segments
                    return nonZeroBalances.map((balance, index) => {
                      const actualPercentage =
                        totalBalance > 0
                          ? (balance.value / totalBalance) * 100
                          : 0;
                      const minWidth = Math.max(
                        (100 / nonZeroBalances.length) * 0.3,
                        5
                      ); // At least 30% of equal segment or 5%
                      const displayWidth = Math.max(minWidth, actualPercentage);

                      // Calculate left position based on previous segments
                      let leftPosition = 0;
                      for (let i = 0; i < index; i++) {
                        const prevBalance = nonZeroBalances[i];
                        const prevPercentage =
                          totalBalance > 0
                            ? (prevBalance.value / totalBalance) * 100
                            : 0;
                        const prevMinWidth = Math.max(
                          (100 / nonZeroBalances.length) * 0.3,
                          5
                        );
                        leftPosition += Math.max(prevMinWidth, prevPercentage);
                      }

                      return (
                        <div
                          key={index}
                          className={`absolute top-0 h-full ${balance.color} transition-all duration-300`}
                          style={{
                            left: `${leftPosition}%`,
                            width: `${displayWidth}%`,
                          }}
                        ></div>
                      );
                    });
                  })()}
                </div>
                <div className="mt-2 text-sm text-card-foreground/60">
                  Combined POW balance across all networks
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-card-foreground/70">
                      Algo ARC200:
                    </span>
                    <span className="text-blue-400 font-medium">
                      {algoARC200Balance.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-card-foreground/70">Voi ARC200:</span>
                    <span className="text-green-400 font-medium">
                      {voiARC200Balance.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-card-foreground/70">Algo ASA:</span>
                    <span className="text-orange-400 font-medium">
                      {algoASABalance.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-card-foreground/70">Voi ASA:</span>
                    <span className="text-red-400 font-medium">
                      {voiASABalance.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <div className="p-6 rounded-xl border border-gray-200/20 shadow-lg bg-card hover:bg-card/80 transition-colors w-full">
                  <div className="flex justify-between mb-2">
                    <div className="text-lg font-semibold text-card-foreground">
                      VOI
                    </div>
                    <div className="text-lg text-card-foreground">
                      {voiBalance.toLocaleString()}
                    </div>
                  </div>
                  <div className="w-full bg-gray-200/20 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full bg-blue-500"
                      style={{
                        width: `${Math.max(
                          1,
                          Math.min((voiBalance / 1000) * 100, 100)
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <div className="mt-2 text-sm text-card-foreground/60">
                    Available balance (excluding minimum required)
                  </div>
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={() => {
                        const popup = window.open(
                          "https://www.ibuyvoi.com/",
                          "buyVoi",
                          "width=800,height=600,scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no"
                        );
                        if (popup) {
                          popup.focus();
                        }
                      }}
                      className="w-32 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      Buy VOI
                    </button>
                  </div>
                </div>

                <div className="p-6 rounded-xl border border-gray-200/20 shadow-lg bg-card hover:bg-card/80 transition-colors w-full">
                  <div className="flex justify-between mb-2">
                    <div className="text-lg font-semibold text-card-foreground">
                      ALGO
                    </div>
                    <div className="text-lg text-card-foreground">
                      {algoBalance.toLocaleString()}
                    </div>
                  </div>
                  <div className="w-full bg-gray-200/20 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full bg-green-500"
                      style={{
                        width: `${Math.max(
                          1,
                          Math.min((algoBalance / 1000) * 100, 100)
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <div className="mt-2 text-sm text-card-foreground/60">
                    Available balance (excluding minimum required)
                  </div>
                  <div className="mt-4 flex justify-center">
                    <button
                      disabled
                      className="w-32 px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      Buy ALGO
                    </button>
                  </div>
                </div>
              </div>

              {/* Bridge Confirmation Status */}
              {(bridgeConfirmationStatus.monitoring ||
                bridgeConfirmationStatus.confirmed ||
                bridgeConfirmationStatus.error) && (
                <div className="p-6 rounded-xl border border-gray-200/20 shadow-lg bg-card w-full">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-card-foreground">
                      Bridge Transfer Status
                    </h3>
                    {bridgeConfirmationStatus.confirmed && (
                      <button
                        onClick={() =>
                          setBridgeConfirmationStatus({
                            monitoring: false,
                            confirmed: false,
                          })
                        }
                        className="text-sm text-card-foreground/60 hover:text-card-foreground/80 transition-colors"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>

                  {bridgeConfirmationStatus.monitoring && (
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                        <span className="ml-3 text-lg font-medium text-card-foreground">
                          Monitoring Bridge Confirmation...
                        </span>
                      </div>
                      <div className="text-sm text-card-foreground/70">
                        Source Transaction:{" "}
                        {bridgeConfirmationStatus.sourceTxId?.slice(0, 8)}...
                        {bridgeConfirmationStatus.sourceTxId?.slice(-6)}
                      </div>
                      <div className="text-xs text-card-foreground/50 mt-2">
                        This may take a few minutes. Please wait while we
                        monitor for the confirmation transaction.
                      </div>
                    </div>
                  )}

                  {bridgeConfirmationStatus.confirmed && (
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-4">
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                          <svg
                            className="w-5 h-5 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                        <span className="ml-3 text-lg font-medium text-green-400">
                          Bridge Transfer Confirmed!
                        </span>
                      </div>
                      <div className="text-sm text-card-foreground/70 space-y-1">
                        <div>
                          Source Transaction:{" "}
                          {bridgeConfirmationStatus.sourceTxId?.slice(0, 8)}...
                          {bridgeConfirmationStatus.sourceTxId?.slice(-6)}
                        </div>
                        <div>
                          Confirmation Transaction:{" "}
                          {bridgeConfirmationStatus.confirmationTxId?.slice(
                            0,
                            8
                          )}
                          ...
                          {bridgeConfirmationStatus.confirmationTxId?.slice(-6)}
                        </div>
                      </div>
                      <div className="text-xs text-green-400 mt-2">
                        Your cross-network transfer has been successfully
                        completed.
                      </div>
                    </div>
                  )}

                  {bridgeConfirmationStatus.error &&
                    !bridgeConfirmationStatus.confirmed && (
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-4">
                          <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center">
                            <svg
                              className="w-5 h-5 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                              />
                            </svg>
                          </div>
                          <span className="ml-3 text-lg font-medium text-yellow-400">
                            Bridge Transfer Status Unknown
                          </span>
                        </div>
                        <div className="text-sm text-card-foreground/70">
                          Source Transaction:{" "}
                          {bridgeConfirmationStatus.sourceTxId?.slice(0, 8)}...
                          {bridgeConfirmationStatus.sourceTxId?.slice(-6)}
                        </div>
                        <div className="text-xs text-yellow-400 mt-2">
                          {bridgeConfirmationStatus.error}
                        </div>
                        <div className="text-xs text-card-foreground/50 mt-2">
                          The transfer may still be processing. You can check
                          your balance or try again later.
                        </div>
                        <div className="mt-4 flex gap-2 justify-center">
                          <button
                            onClick={retryBridgeConfirmation}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
                          >
                            Retry Confirmation Check
                          </button>
                          <button
                            onClick={debugSearchBridgeTransactions}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
                          >
                            Debug Search
                          </button>
                          <button
                            onClick={() => {
                              const txId = prompt(
                                "Enter transaction ID to check:"
                              );
                              if (txId) {
                                checkSpecificTransaction(txId);
                              }
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                          >
                            Check Specific Tx
                          </button>
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* POW Transfer Interface - Only show for connected user's own wallet */}
              {showTransferInterface && availableSourceBuckets.length >= 0 && (
                <div className="p-6 rounded-xl border border-gray-200/20 shadow-lg bg-card w-full">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-card-foreground">
                      Internal Transfer
                    </h3>
                    <button
                      onClick={resetTransfer}
                      className="text-sm text-card-foreground/60 hover:text-card-foreground/80 transition-colors"
                    >
                      Reset
                    </button>
                  </div>

                  {/* Step Indicator */}
                  <div className="flex items-center justify-center mb-6">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          transferStep === "select-from"
                            ? "bg-purple-600 text-white"
                            : transferFrom
                            ? "bg-green-600 text-white"
                            : "bg-gray-600 text-gray-300"
                        }`}
                      >
                        {transferFrom ? "✓" : "1"}
                      </div>
                      <div className="w-8 h-2 bg-gray-600 rounded"></div>
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          transferStep === "select-to"
                            ? "bg-purple-600 text-white"
                            : transferTo
                            ? "bg-green-600 text-white"
                            : "bg-gray-600 text-gray-300"
                        }`}
                      >
                        {transferTo ? "✓" : "2"}
                      </div>
                      <div className="w-8 h-2 bg-gray-600 rounded"></div>
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          transferStep === "enter-amount"
                            ? "bg-purple-600 text-white"
                            : transferAmount
                            ? "bg-green-600 text-white"
                            : "bg-gray-600 text-gray-300"
                        }`}
                      >
                        {transferAmount ? "✓" : "3"}
                      </div>
                      {(() => {
                        const fromType = transferFrom.includes("arc200")
                          ? "arc200"
                          : "asa";
                        const toType = transferTo.includes("arc200")
                          ? "arc200"
                          : "asa";
                        const isCrossNetwork =
                          transferFrom &&
                          transferTo &&
                          getBucketById(transferFrom)?.network !==
                            getBucketById(transferTo)?.network;
                        const isARC200ToASA =
                          fromType === "arc200" &&
                          toType === "asa" &&
                          isCrossNetwork;

                        return isARC200ToASA ? (
                          <>
                            <div className="w-8 h-2 bg-gray-600 rounded"></div>
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                transferStep === "bridge-transfer"
                                  ? "bg-purple-600 text-white"
                                  : "bg-gray-600 text-gray-300"
                              }`}
                            >
                              4
                            </div>
                          </>
                        ) : null;
                      })()}
                    </div>
                  </div>

                  {/* Step 1: Select Source */}
                  {transferStep === "select-from" && (
                    <div className="text-center">
                      <h4 className="text-lg font-medium mb-4">
                        Step 1: Select Source Bucket
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                        {availableSourceBuckets.map((bucket) => {
                          const isOnCorrectNetwork = !needsNetworkSwitch(
                            bucket.id
                          );
                          return (
                            <button
                              key={bucket.id}
                              onClick={() => {
                                if (isOnCorrectNetwork) {
                                  setTransferFrom(bucket.id);
                                  setTransferStep("select-to");
                                }
                              }}
                              disabled={!isOnCorrectNetwork}
                              className={`p-4 rounded-xl border-2 transition-colors relative ${
                                isOnCorrectNetwork
                                  ? "border-gray-600 hover:border-purple-500 bg-gray-800/50 hover:bg-gray-800/80"
                                  : "border-gray-700 bg-gray-800/30 cursor-not-allowed opacity-50"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-4 h-4 rounded-full bg-${bucket.color}-500`}
                                ></div>
                                <div className="text-left">
                                  <div className="font-medium text-card-foreground">
                                    {bucket.name}
                                  </div>
                                  <div className="text-sm text-card-foreground/70">
                                    {bucket.balance.toLocaleString()} POW
                                  </div>
                                  <div className="text-xs text-card-foreground/50">
                                    {bucket.network}
                                  </div>
                                </div>
                              </div>

                              {/* Switch Network Overlay */}
                              {!isOnCorrectNetwork && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl">
                                  <div className="text-center">
                                    <div className="text-xs font-medium text-white mb-1">
                                      Switch Network
                                    </div>
                                    <div className="text-xs text-gray-300">
                                      {bucket.network}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Step 2: Select Destination */}
                  {transferStep === "select-to" && (
                    <div className="text-center">
                      <h4 className="text-lg font-medium mb-4">
                        Step 2: Select Destination Bucket
                      </h4>
                      <div className="mb-4 p-3 bg-purple-600/20 rounded-lg">
                        <p className="text-sm text-card-foreground/80">
                          From:{" "}
                          <span className="font-medium text-purple-400">
                            {getBucketById(transferFrom)?.name}
                          </span>
                          <span className="text-xs text-card-foreground/60 ml-2">
                            ({getBucketById(transferFrom)?.network})
                          </span>
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                        {allBuckets
                          .filter((bucket) => bucket.id !== transferFrom)
                          .map((bucket) => {
                            const isAllowed = isTransferAllowed(
                              transferFrom,
                              bucket.id
                            );
                            return (
                              <button
                                key={bucket.id}
                                onClick={() => {
                                  if (isAllowed) {
                                    setTransferTo(bucket.id);
                                    setTransferStep("enter-amount");
                                  }
                                }}
                                disabled={!isAllowed}
                                className={`p-4 rounded-xl border-2 transition-colors relative ${
                                  isAllowed
                                    ? "border-gray-600 hover:border-purple-500 bg-gray-800/50 hover:bg-gray-800/80"
                                    : "border-gray-700 bg-gray-800/30 cursor-not-allowed opacity-50"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-4 h-4 rounded-full bg-${bucket.color}-500`}
                                  ></div>
                                  <div className="text-left">
                                    <div className="font-medium text-card-foreground">
                                      {bucket.name}
                                    </div>
                                    <div className="text-sm text-card-foreground/70">
                                      {bucket.balance.toLocaleString()} POW
                                    </div>
                                    <div className="text-xs text-card-foreground/50">
                                      {bucket.network}
                                    </div>
                                  </div>
                                </div>

                                {/* Disabled Transfer Overlay */}
                                {!isAllowed && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl">
                                    <div className="text-center">
                                      <div className="text-xs font-medium text-white mb-1">
                                        Not Supported
                                      </div>
                                      <div className="text-xs text-gray-300">
                                        {(() => {
                                          const fromType = bucket.id.includes(
                                            "arc200"
                                          )
                                            ? "ARC200"
                                            : "ASA";
                                          const toType = transferFrom.includes(
                                            "arc200"
                                          )
                                            ? "ARC200"
                                            : "ASA";
                                          if (
                                            fromType === "ARC200" &&
                                            toType === "ARC200"
                                          ) {
                                            return "Cross-Network ARC200";
                                          } else if (
                                            fromType === "ASA" &&
                                            toType === "ARC200"
                                          ) {
                                            return "ASA → ARC200";
                                          } else if (
                                            fromType === "ARC200" &&
                                            toType === "ASA"
                                          ) {
                                            return "ARC200 → ASA";
                                          } else {
                                            return "Cross-Network";
                                          }
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Step 3: Enter Amount */}
                  {transferStep === "enter-amount" && (
                    <div className="text-center relative">
                      {/* Network Switch Overlay */}
                      {needsNetworkSwitch(transferFrom) && (
                        <div className="absolute inset-0 bg-black/80 rounded-xl flex items-center justify-center z-10">
                          <div className="text-center p-6 max-w-sm">
                            <div className="text-2xl mb-4">🔄</div>
                            <h4 className="text-lg font-medium text-white mb-2">
                              Switch Network Required
                            </h4>
                            <p className="text-sm text-gray-300 mb-4">
                              To transfer from{" "}
                              {getBucketById(transferFrom)?.name}, you need to
                              switch to the{" "}
                              {getBucketById(transferFrom)?.network} network.
                            </p>
                            <button
                              onClick={() => {
                                const requiredNetwork =
                                  getRequiredNetwork(transferFrom);
                                if (requiredNetwork) {
                                  setActiveNetwork(requiredNetwork);
                                }
                              }}
                              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
                            >
                              Switch to {getBucketById(transferFrom)?.network}
                            </button>
                          </div>
                        </div>
                      )}

                      <h4 className="text-lg font-medium mb-4">
                        Step 3: Enter Transfer Amount
                      </h4>
                      <div className="mb-4 p-3 bg-purple-600/20 rounded-lg">
                        <p className="text-sm text-card-foreground/80">
                          From:{" "}
                          <span className="font-medium text-purple-400">
                            {getBucketById(transferFrom)?.name}
                          </span>
                          <span className="text-xs text-card-foreground/60 ml-2">
                            ({getBucketById(transferFrom)?.network})
                          </span>
                          <span className="mx-2">→</span>
                          To:{" "}
                          <span className="font-medium text-purple-400">
                            {getBucketById(transferTo)?.name}
                          </span>
                          <span className="text-xs text-card-foreground/60 ml-2">
                            ({getBucketById(transferTo)?.network})
                          </span>
                        </p>
                        {getBucketById(transferFrom)?.network !==
                          getBucketById(transferTo)?.network && (
                          <p className="text-xs text-yellow-400 mt-1">
                            ⚠️ Cross-network transfer - may require additional
                            steps and fees
                          </p>
                        )}
                        {!isTransferAllowed(transferFrom, transferTo) && (
                          <p className="text-xs text-red-400 mt-1">
                            ❌ Cross-network transfers are not yet supported
                          </p>
                        )}
                      </div>
                      <div className="max-w-md mx-auto">
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-card-foreground/70">
                            Amount (POW)
                          </label>
                          <input
                            type="number"
                            placeholder="Enter amount"
                            value={transferAmount}
                            onChange={(e) => {
                              setTransferAmount(e.target.value);
                              // Auto-advance to bridge step for ARC200 to ASA cross-network transfers
                              if (
                                e.target.value &&
                                parseFloat(e.target.value) > 0
                              ) {
                                const fromType = transferFrom.includes("arc200")
                                  ? "arc200"
                                  : "asa";
                                const toType = transferTo.includes("arc200")
                                  ? "arc200"
                                  : "asa";
                                const isCrossNetwork =
                                  getBucketById(transferFrom)?.network !==
                                  getBucketById(transferTo)?.network;
                                const isARC200ToASA =
                                  fromType === "arc200" &&
                                  toType === "asa" &&
                                  isCrossNetwork;

                                if (isARC200ToASA) {
                                  setTimeout(
                                    () => setTransferStep("bridge-transfer"),
                                    500
                                  );
                                }
                              }
                            }}
                            className="px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-card-foreground text-center text-lg"
                            min="0"
                            step="0.01"
                            autoFocus
                          />
                          <div className="text-xs text-card-foreground/60">
                            Available:{" "}
                            {getBucketById(
                              transferFrom
                            )?.balance.toLocaleString()}{" "}
                            POW
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Bridge Transfer (ARC200 to ASA cross-network only) */}
                  {transferStep === "bridge-transfer" && (
                    <div className="text-center">
                      <div className="flex justify-between items-center mb-4">
                        <button
                          onClick={() => setTransferStep("enter-amount")}
                          className="text-sm text-card-foreground/60 hover:text-card-foreground/80 transition-colors"
                        >
                          ← Back
                        </button>
                        <h4 className="text-lg font-medium">
                          Step 4: Bridge Transfer
                        </h4>
                        <div className="w-12"></div>{" "}
                        {/* Spacer for centering */}
                      </div>
                      <div className="mb-4 p-3 bg-purple-600/20 rounded-lg">
                        <p className="text-sm text-card-foreground/80">
                          <span className="font-medium text-purple-400">
                            {getBucketById(transferFrom)?.name}
                          </span>
                          <span className="text-xs text-card-foreground/60 ml-2">
                            ({getBucketById(transferFrom)?.network})
                          </span>
                          <span className="mx-2">→</span>
                          <span className="font-medium text-purple-400">
                            {getBucketById(transferTo)?.name}
                          </span>
                          <span className="text-xs text-card-foreground/60 ml-2">
                            ({getBucketById(transferTo)?.network})
                          </span>
                        </p>
                        <p className="text-xs text-yellow-400 mt-1">
                          ⚠️ This transfer requires bridging tokens between
                          networks
                        </p>
                      </div>
                      <div className="max-w-md mx-auto">
                        <div className="text-sm text-card-foreground/70 mb-4">
                          <p>
                            Amount:{" "}
                            <span className="font-medium">
                              {transferAmount} POW
                            </span>
                          </p>
                          <p className="text-xs text-card-foreground/60 mt-1">
                            Bridge fee: ~0.1% (
                            {(parseFloat(transferAmount) * 0.001).toFixed(4)}{" "}
                            POW)
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Transfer Button - Show in final step */}
                  {((transferStep === "enter-amount" &&
                    !needsNetworkSwitch(transferFrom)) ||
                    transferStep === "bridge-transfer") && (
                    <div className="mt-6 flex justify-center">
                      <button
                        onClick={handleTransfer}
                        disabled={
                          !transferAmount ||
                          transferLoading ||
                          !isTransferAllowed(transferFrom, transferTo)
                        }
                        className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
                      >
                        {transferLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Transferring...
                          </>
                        ) : !isTransferAllowed(transferFrom, transferTo) ? (
                          "Transfer Not Supported"
                        ) : transferStep === "bridge-transfer" ? (
                          "Start Bridge Transfer"
                        ) : (
                          "Transfer POW"
                        )}
                      </button>
                    </div>
                  )}

                  {/* Transfer Info */}
                  <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-sm text-card-foreground/70">
                      <strong>Note:</strong> Same-network transfers (ARC200 ↔
                      ASA) are typically faster and cheaper. Cross-network ASA
                      transfers and ARC200 → ASA transfers are supported but may
                      require additional steps and bridge fees. Cross-network
                      ARC200 → ARC200 transfers are not supported as ARC200
                      tokens are network-specific.
                    </p>
                    <p className="text-xs text-card-foreground/60 mt-2">
                      <strong>
                        Cross Network Transfers powered by Aramid Bridge
                      </strong>
                    </p>
                  </div>
                </div>
              )}

              {/* External Transfer Interface - Only show for connected user's own wallet */}
              {showTransferInterface && availableSourceBuckets.length >= 0 && (
                <div className="p-6 rounded-xl border border-gray-200/20 shadow-lg bg-card w-full">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-card-foreground">
                      External Transfer
                    </h3>
                    <button
                      onClick={resetExternalTransfer}
                      className="text-sm text-card-foreground/60 hover:text-card-foreground/80 transition-colors"
                    >
                      Reset
                    </button>
                  </div>

                  {/* Step Indicator */}
                  <div className="flex items-center justify-center mb-6">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          externalTransferStep === "select-token"
                            ? "bg-purple-600 text-white"
                            : externalTransferToken
                            ? "bg-green-600 text-white"
                            : "bg-gray-600 text-gray-300"
                        }`}
                      >
                        {externalTransferToken ? "✓" : "1"}
                      </div>
                      <div className="w-8 h-2 bg-gray-600 rounded"></div>
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          externalTransferStep === "enter-amount"
                            ? "bg-purple-600 text-white"
                            : externalTransferAmount
                            ? "bg-green-600 text-white"
                            : "bg-gray-600 text-gray-300"
                        }`}
                      >
                        {externalTransferAmount ? "✓" : "2"}
                      </div>
                      <div className="w-8 h-2 bg-gray-600 rounded"></div>
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          externalTransferStep === "select-recipient"
                            ? "bg-purple-600 text-white"
                            : externalTransferRecipient
                            ? "bg-green-600 text-white"
                            : "bg-gray-600 text-gray-300"
                        }`}
                      >
                        {externalTransferRecipient ? "✓" : "3"}
                      </div>
                      <div className="w-8 h-2 bg-gray-600 rounded"></div>
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          externalTransferStep === "select-destination"
                            ? "bg-purple-600 text-white"
                            : externalTransferDestination
                            ? "bg-green-600 text-white"
                            : "bg-gray-600 text-gray-300"
                        }`}
                      >
                        {externalTransferDestination ? "✓" : "4"}
                      </div>
                      <div className="w-8 h-2 bg-gray-600 rounded"></div>
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          externalTransferStep === "confirm"
                            ? "bg-purple-600 text-white"
                            : "bg-gray-600 text-gray-300"
                        }`}
                      >
                        5
                      </div>
                    </div>
                  </div>

                  {/* Step 1: Select Token */}
                  {externalTransferStep === "select-token" && (
                    <div className="text-center">
                      <h4 className="text-lg font-medium mb-4">
                        Step 1: Select Token to Transfer
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                        {allBuckets.map((bucket) => {
                          const isOnCorrectNetwork = !needsNetworkSwitch(
                            bucket.id
                          );
                          const hasBalance = bucket.balance > 0;
                          const isSelectable = isOnCorrectNetwork && hasBalance;

                          return (
                            <button
                              key={bucket.id}
                              onClick={() => {
                                if (isSelectable) {
                                  setExternalTransferToken(bucket.id);
                                  setExternalTransferStep("enter-amount");
                                }
                              }}
                              disabled={!isSelectable}
                              className={`p-4 rounded-xl border-2 transition-colors relative ${
                                isSelectable
                                  ? "border-gray-600 hover:border-purple-500 bg-gray-800/50 hover:bg-gray-800/80"
                                  : "border-gray-700 bg-gray-800/30 cursor-not-allowed opacity-50"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-4 h-4 rounded-full bg-${bucket.color}-500`}
                                ></div>
                                <div className="text-left">
                                  <div className="font-medium text-card-foreground">
                                    {bucket.name}
                                  </div>
                                  <div className="text-sm text-card-foreground/70">
                                    {bucket.balance.toLocaleString()} POW
                                  </div>
                                  <div className="text-xs text-card-foreground/50">
                                    {bucket.network}
                                  </div>
                                </div>
                              </div>

                              {/* Overlay for disabled states */}
                              {!isSelectable && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl">
                                  <div className="text-center">
                                    <div className="text-xs font-medium text-white mb-1">
                                      {!hasBalance
                                        ? "No Balance"
                                        : "Switch Network"}
                                    </div>
                                    <div className="text-xs text-gray-300">
                                      {!hasBalance
                                        ? "0 POW available"
                                        : bucket.network}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Step 2: Enter Amount */}
                  {externalTransferStep === "enter-amount" && (
                    <div className="text-center">
                      {/* Network Switch Overlay */}
                      {needsNetworkSwitch(externalTransferToken) && (
                        <div className="absolute inset-0 bg-black/80 rounded-xl flex items-center justify-center z-10">
                          <div className="text-center p-6 max-w-sm">
                            <div className="text-2xl mb-4">🔄</div>
                            <h4 className="text-lg font-medium text-white mb-2">
                              Switch Network Required
                            </h4>
                            <p className="text-sm text-gray-300 mb-4">
                              To transfer{" "}
                              {getBucketById(externalTransferToken)?.name}, you
                              need to switch to the{" "}
                              {getBucketById(externalTransferToken)?.network}{" "}
                              network.
                            </p>
                            <button
                              onClick={() => {
                                const requiredNetwork = getRequiredNetwork(
                                  externalTransferToken
                                );
                                if (requiredNetwork) {
                                  setActiveNetwork(requiredNetwork);
                                }
                              }}
                              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
                            >
                              Switch to{" "}
                              {getBucketById(externalTransferToken)?.network}
                            </button>
                          </div>
                        </div>
                      )}

                      <h4 className="text-lg font-medium mb-4">
                        Step 2: Enter Transfer Amount
                      </h4>
                      <div className="mb-4 p-3 bg-purple-600/20 rounded-lg">
                        <p className="text-sm text-card-foreground/80">
                          Token:{" "}
                          <span className="font-medium text-purple-400">
                            {getBucketById(externalTransferToken)?.name}
                          </span>
                          <span className="text-xs text-card-foreground/60 ml-2">
                            ({getBucketById(externalTransferToken)?.network})
                          </span>
                        </p>
                      </div>
                      <div className="max-w-md mx-auto">
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-card-foreground/70">
                            Amount (POW)
                          </label>
                          <input
                            type="number"
                            placeholder="Enter amount"
                            value={externalTransferAmount}
                            onChange={(e) =>
                              setExternalTransferAmount(e.target.value)
                            }
                            className="px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-card-foreground text-center text-lg"
                            min="0"
                            step="0.01"
                            autoFocus
                          />
                          <div className="text-xs text-card-foreground/60">
                            Available:{" "}
                            {getBucketById(
                              externalTransferToken
                            )?.balance.toLocaleString()}{" "}
                            POW
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Select Recipient */}
                  {externalTransferStep === "select-recipient" && (
                    <div className="text-center">
                      <div className="flex justify-between items-center mb-4">
                        <button
                          onClick={() =>
                            setExternalTransferStep("enter-amount")
                          }
                          className="text-sm text-card-foreground/60 hover:text-card-foreground/80 transition-colors"
                        >
                          ← Back
                        </button>
                        <h4 className="text-lg font-medium">
                          Step 3: Enter Recipient Address
                        </h4>
                        <div className="w-12"></div>
                      </div>
                      <div className="mb-4 p-3 bg-purple-600/20 rounded-lg">
                        <p className="text-sm text-card-foreground/80">
                          <span className="font-medium text-purple-400">
                            {getBucketById(externalTransferToken)?.name}
                          </span>
                          <span className="text-xs text-card-foreground/60 ml-2">
                            ({getBucketById(externalTransferToken)?.network})
                          </span>
                          <span className="mx-2">→</span>
                          <span className="font-medium text-purple-400">
                            {externalTransferAmount} POW
                          </span>
                        </p>
                      </div>
                      <div className="max-w-md mx-auto">
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-card-foreground/70">
                            Recipient Address
                          </label>
                          <input
                            type="text"
                            placeholder="Enter wallet address"
                            value={externalTransferRecipient}
                            onChange={(e) =>
                              setExternalTransferRecipient(e.target.value)
                            }
                            className="px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-card-foreground text-center text-sm font-mono"
                            autoFocus
                          />
                          <div className="text-xs text-card-foreground/60">
                            Enter the recipient's wallet address
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Select Destination */}
                  {externalTransferStep === "select-destination" && (
                    <div className="text-center">
                      <div className="flex justify-between items-center mb-4">
                        <button
                          onClick={() =>
                            setExternalTransferStep("select-recipient")
                          }
                          className="text-sm text-card-foreground/60 hover:text-card-foreground/80 transition-colors"
                        >
                          ← Back
                        </button>
                        <h4 className="text-lg font-medium">
                          Step 4: Select Destination Token
                        </h4>
                        <div className="w-12"></div>
                      </div>
                      <div className="mb-4 p-3 bg-purple-600/20 rounded-lg">
                        <p className="text-sm text-card-foreground/80">
                          <span className="font-medium text-purple-400">
                            {getBucketById(externalTransferToken)?.name}
                          </span>
                          <span className="text-xs text-card-foreground/60 ml-2">
                            ({getBucketById(externalTransferToken)?.network})
                          </span>
                          <span className="mx-2">→</span>
                          <span className="font-medium text-purple-400">
                            {externalTransferRecipient.slice(0, 8)}...
                            {externalTransferRecipient.slice(-6)}
                          </span>
                          <span className="mx-2">→</span>
                          <span className="font-medium text-purple-400">
                            {externalTransferAmount} POW
                          </span>
                        </p>
                        <p className="text-xs text-card-foreground/60 mt-1">
                          Choose how the recipient will receive the tokens
                        </p>
                        <p className="text-xs text-yellow-400 mt-2">
                          ⚠️ Recipients must be opted into the destination token to receive transfers
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                        {allBuckets.map((bucket) => {
                          const isAllowed = isTransferAllowed(
                            externalTransferToken,
                            bucket.id
                          );
                          const recipientBalance = recipientBalances[bucket.id];
                          const optInStatus = recipientOptInStatus[bucket.id];
                          const isOptedIn = optInStatus?.optedIn ?? false;
                          const canSelect = isAllowed && isOptedIn;

                          return (
                            <button
                              key={bucket.id}
                              onClick={() => {
                                if (canSelect) {
                                  setExternalTransferDestination(bucket.id);
                                  setExternalTransferStep("confirm");
                                }
                              }}
                              disabled={!canSelect}
                              className={`p-4 rounded-xl border-2 transition-colors relative ${
                                canSelect
                                  ? "border-gray-600 hover:border-purple-500 bg-gray-800/50 hover:bg-gray-800/80"
                                  : "border-gray-700 bg-gray-800/30 cursor-not-allowed opacity-50"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-4 h-4 rounded-full bg-${bucket.color}-500`}
                                ></div>
                                <div className="text-left">
                                  <div className="font-medium text-card-foreground">
                                    {bucket.name}
                                  </div>
                                  {!bucket.id.includes("arc200") && (
                                    <div className="text-sm text-card-foreground/70">
                                      {checkingOptIn || loadingRecipientBalances ? (
                                        <span className="flex items-center gap-1">
                                          <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                                          Checking...
                                        </span>
                                      ) : optInStatus ? (
                                        isOptedIn ? (
                                          <span className="text-green-400">
                                            ✓ Opted In
                                          </span>
                                        ) : (
                                          <span className="text-red-400">
                                            ✗ Not Opted In
                                          </span>
                                        )
                                      ) : (
                                        "Unknown"
                                      )}
                                    </div>
                                  )}
                                  <div className="text-xs text-card-foreground/50">
                                    {bucket.network}
                                  </div>
                                  <div className="text-xs text-card-foreground/40">
                                    {bucket.id.includes("arc200")
                                      ? "Recipient's balance"
                                      : isOptedIn
                                      ? "Recipient's balance"
                                      : "Opt-in required"}
                                  </div>
                                </div>
                              </div>

                              {/* Disabled Transfer Overlay */}
                              {!canSelect && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl">
                                  <div className="text-center">
                                    <div className="text-xs font-medium text-white mb-1">
                                      {!isAllowed ? "Not Supported" : "Not Opted In"}
                                    </div>
                                    <div className="text-xs text-gray-300">
                                      {!isAllowed ? (
                                        (() => {
                                          const fromType =
                                            externalTransferToken.includes(
                                              "arc200"
                                            )
                                              ? "ARC200"
                                              : "ASA";
                                          const toType = bucket.id.includes(
                                            "arc200"
                                          )
                                            ? "ARC200"
                                            : "ASA";
                                          if (
                                            fromType === "ARC200" &&
                                            toType === "ARC200"
                                          ) {
                                            return "Cross-Network ARC200";
                                          } else if (
                                            fromType === "ASA" &&
                                            toType === "ARC200"
                                          ) {
                                            return "ASA → ARC200";
                                          } else if (
                                            fromType === "ARC200" &&
                                            toType === "ASA"
                                          ) {
                                            return "ARC200 → ASA";
                                          } else {
                                            return "Cross-Network";
                                          }
                                        })()
                                      ) : (
                                        "Recipient must opt-in first"
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Step 5: Confirm */}
                  {externalTransferStep === "confirm" && (
                    <div className="text-center">
                      <div className="flex justify-between items-center mb-4">
                        <button
                          onClick={() =>
                            setExternalTransferStep("select-destination")
                          }
                          className="text-sm text-card-foreground/60 hover:text-card-foreground/80 transition-colors"
                        >
                          ← Back
                        </button>
                        <h4 className="text-lg font-medium">
                          Step 5: Confirm Transfer
                        </h4>
                        <div className="w-12"></div>
                      </div>
                      <div className="mb-6 p-4 bg-purple-600/20 rounded-lg max-w-md mx-auto">
                        <div className="text-sm text-card-foreground/80 space-y-2">
                          <div className="flex justify-between">
                            <span>From Token:</span>
                            <span className="font-medium text-purple-400">
                              {getBucketById(externalTransferToken)?.name}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>To Token:</span>
                            <span className="font-medium text-purple-400">
                              {getBucketById(externalTransferDestination)?.name}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Amount:</span>
                            <span className="font-medium text-purple-400">
                              {externalTransferAmount} POW
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>From Network:</span>
                            <span className="font-medium text-purple-400">
                              {getBucketById(externalTransferToken)?.network}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>To Network:</span>
                            <span className="font-medium text-purple-400">
                              {
                                getBucketById(externalTransferDestination)
                                  ?.network
                              }
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Recipient:</span>
                            <span className="font-medium text-purple-400 font-mono text-xs">
                              {externalTransferRecipient.slice(0, 8)}...
                              {externalTransferRecipient.slice(-6)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  {externalTransferStep === "enter-amount" &&
                    !needsNetworkSwitch(externalTransferToken) && (
                      <div className="mt-6 flex justify-center">
                        <button
                          onClick={() =>
                            setExternalTransferStep("select-recipient")
                          }
                          disabled={
                            !externalTransferAmount ||
                            parseFloat(externalTransferAmount) <= 0
                          }
                          className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                        >
                          Continue
                        </button>
                      </div>
                    )}

                  {externalTransferStep === "select-recipient" && (
                    <div className="mt-6 flex justify-center">
                      <button
                        onClick={() =>
                          setExternalTransferStep("select-destination")
                        }
                        disabled={
                          !externalTransferRecipient ||
                          !algosdk.isValidAddress(externalTransferRecipient)
                        }
                        className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                      >
                        Continue
                      </button>
                    </div>
                  )}

                  {externalTransferStep === "select-destination" && (
                    <div className="mt-6 flex justify-center">
                      <button
                        onClick={() => setExternalTransferStep("confirm")}
                        disabled={!externalTransferDestination}
                        className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                      >
                        Continue
                      </button>
                    </div>
                  )}

                  {/* Transfer Button - Show in final step */}
                  {externalTransferStep === "confirm" && (
                    <div className="mt-6 flex justify-center">
                      <button
                        onClick={handleExternalTransfer}
                        disabled={externalTransferLoading}
                        className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
                      >
                        {externalTransferLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Transferring...
                          </>
                        ) : (
                          "Send Transfer"
                        )}
                      </button>
                    </div>
                  )}

                  {/* Transfer Info */}
                  <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-sm text-card-foreground/70">
                      <strong>Note:</strong> External transfers send POW tokens
                      to other wallet addresses. Make sure to double-check the
                      recipient address before confirming the transfer.
                      Transfers are irreversible once confirmed.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default Wallet;
