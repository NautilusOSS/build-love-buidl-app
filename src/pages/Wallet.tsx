import React, { useEffect, useState } from "react";
import PageLayout from "@/components/PageLayout";
import { Link, useParams } from "react-router-dom";
import { NetworkId, useWallet } from "@txnlab/use-wallet-react";
import { CONTRACT, abi } from "ulujs";
import algosdk from "algosdk";
import BigNumber from "bignumber.js";
import { APP_SPEC as ATokenAppSpec } from "@/clients/ATokenClient";
import {
  getAasaAppId,
  getAasaV2AppId,
  getAasaV2AssetId,
  getATokenAppId,
} from "@/constants/appIds";
import { useFeatureFlags } from "@/constants/featureFlags";
import NetworkSettingsModal from "@/components/NetworkSettingsModal";

const Wallet: React.FC = () => {
  const { activeNetwork, activeAccount, setActiveNetwork, signTransactions } =
    useWallet();
  const { address } = useParams();
  const {
    isInternalTransferEnabled,
    isExternalTransferEnabled,
    isPowerUpEnabled,
    isBuyAlgoEnabled,
    isSwapEnabled,
  } = useFeatureFlags();
  const [voiBalance, setVoiBalance] = useState<number>(0);
  const [algoBalance, setAlgoBalance] = useState<number>(0);
  const [localnetBalance, setLocalnetBalance] = useState<number>(0);
  const [algoARC200Balance, setAlgoARC200Balance] = useState<number>(0);
  const [voiARC200Balance, setVoiARC200Balance] = useState<number>(0);
  const [algoASABalance, setAlgoASABalance] = useState<number>(0);
  const [algoASA2Balance, setAlgoASA2Balance] = useState<number>(0);
  const [voiASABalance, setVoiASABalance] = useState<number>(0);
  const [localnetARC200Balance, setLocalnetARC200Balance] = useState<number>(0);
  const [testnetARC200Balance, setTestnetARC200Balance] = useState<number>(0);
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
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [modalTransferAmount, setModalTransferAmount] = useState<string>("");
  const [modalTransferAddress, setModalTransferAddress] = useState<string>("");
  const [modalTransferLoading, setModalTransferLoading] =
    useState<boolean>(false);
  const [modalTransferError, setModalTransferError] = useState<string>("");
  const [modalTransferSuccess, setModalTransferSuccess] = useState<{
    txId: string;
    amount: string;
    recipient: string;
  } | null>(null);
  const [mintLoading, setMintLoading] = useState<boolean>(false);
  const [mintError, setMintError] = useState<string>("");
  const [mintSuccess, setMintSuccess] = useState<{
    txId: string;
    amount: string;
  } | null>(null);

  // Swap interface state
  const [showSwapModal, setShowSwapModal] = useState<boolean>(false);
  const [swapFromToken, setSwapFromToken] = useState<string>("");
  const [swapToToken, setSwapToToken] = useState<string>("");
  const [swapAmount, setSwapAmount] = useState<string>("");
  const [swapLoading, setSwapLoading] = useState<boolean>(false);
  const [swapError, setSwapError] = useState<string>("");
  const [swapSuccess, setSwapSuccess] = useState<{
    txId: string;
    fromAmount: string;
    toAmount: string;
    fromToken: string;
    toToken: string;
  } | null>(null);
  const [swapStep, setSwapStep] = useState<
    "select-from" | "select-to" | "enter-amount" | "confirm"
  >("select-from");

  // Network settings state
  const [networkSettings, setNetworkSettings] = useState<{
    [key in NetworkId]: boolean;
  }>({
    [NetworkId.LOCALNET]: true,
    [NetworkId.TESTNET]: false,
    [NetworkId.MAINNET]: true,
    [NetworkId.VOIMAIN]: false,
  } as { [key in NetworkId]: boolean });

  // Network settings modal state
  const [showNetworkSettingsModal, setShowNetworkSettingsModal] = useState<boolean>(false);

  console.log("activeNetwork", activeNetwork);

  console.log("voiBalance", voiBalance);
  console.log("algoBalance", algoBalance);
  console.log("localnetBalance", localnetBalance);
  console.log("algoARC200Balance", algoARC200Balance);
  console.log("voiARC200Balance", voiARC200Balance);
  console.log("algoASABalance", algoASABalance);
  console.log("voiASABalance", voiASABalance);
  console.log("localnetARC200Balance", localnetARC200Balance);
  console.log("testnetARC200Balance", testnetARC200Balance);

  // Helper function to detect if current network is localnet
  const isLocalnet = () => {
    // Check if the active network configuration points to localhost
    return activeNetwork && activeNetwork === NetworkId.LOCALNET;
  };

  const isTestnet = () => {
    // Check if the active network configuration points to testnet
    return activeNetwork && activeNetwork === NetworkId.TESTNET;
  };

  const isMintingAllowed = () => {
    // Allow minting on both localnet and testnet
    return isLocalnet() || isTestnet();
  };

  // Helper function to check if a network is enabled
  const isNetworkEnabled = (networkId: NetworkId) => {
    return networkSettings[networkId] || false;
  };

  // Helper function to get enabled networks
  const getEnabledNetworks = () => {
    return Object.entries(networkSettings)
      .filter(([_, enabled]) => enabled)
      .map(([networkId]) => networkId as NetworkId);
  };

  // Calculate combined POW balance (only for enabled networks)
  console.log("algoARC200Balance", algoARC200Balance);
  console.log("algoASABalance", algoASABalance);
  console.log("algoASA2Balance", algoASA2Balance);
  const algoMainnetBalance = isNetworkEnabled(NetworkId.MAINNET)
    ? new BigNumber(algoARC200Balance)
        .plus(algoASABalance)
        .plus(algoASA2Balance)
        .toNumber()
    : 0;
  const totalPOWBalance =
    algoMainnetBalance +
    (isNetworkEnabled(NetworkId.VOIMAIN)
      ? voiARC200Balance + voiASABalance
      : 0) +
    (isNetworkEnabled(NetworkId.LOCALNET) ? localnetARC200Balance : 0) +
    (isNetworkEnabled(NetworkId.TESTNET) ? testnetARC200Balance : 0);

  const assetId = (networkId: NetworkId) => {
    if (networkId === NetworkId.MAINNET) {
      return 401752010; // BLAPU
    } else if (networkId === NetworkId.VOIMAIN) {
      return 0;
    } else {
      // For localnet, testnet or any other network, return 0 as placeholder
      return 0;
    }
  };

  // const tokenId = (networkId: NetworkId) => {
  //   if (networkId === NetworkId.MAINNET) {
  //     return 3080081069;
  //   } else if (networkId === NetworkId.VOIMAIN) {
  //     return 40153155;
  //   } else {
  //     // Localnet ARC200 contract ID
  //     return 3669;
  //   }
  // };

  const algodAPI = (networkId: NetworkId) => {
    if (networkId === NetworkId.MAINNET) {
      return "https://mainnet-api.4160.nodely.dev";
    } else if (networkId === NetworkId.VOIMAIN) {
      return "https://mainnet-api.voi.nodely.dev";
    } else if (networkId === NetworkId.TESTNET) {
      return "https://testnet-api.4160.nodely.dev";
    } else {
      // For localnet or any other network, use localhost
      return "http://localhost";
    }
  };

  const algodPort = (networkId: NetworkId) => {
    if (networkId === NetworkId.MAINNET) {
      return 443;
    } else if (networkId === NetworkId.VOIMAIN) {
      return 443;
    } else if (networkId === NetworkId.TESTNET) {
      return 443;
    } else {
      return 4001;
    }
  };

  const algod = (networkId: NetworkId) =>
    new algosdk.Algodv2("", algodAPI(networkId), algodPort(networkId));

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
    if (!address) return 0;

    setLoading(true);
    setError(null);

    try {
      const algodClient = algod(networkId);

      const accountInfo = await algodClient.accountInformation(address).do();
      const balance = accountInfo.amount;
      return balance / 1e6;
    } catch (error) {
      console.error(`Error fetching ${networkId} balance:`, error);
      setError("Failed to fetch wallet balance");
      return 0; // Return 0 instead of undefined to prevent NaN
    } finally {
      setLoading(false);
    }
  };

  const fetchARC200Balance = (networkId: NetworkId) => async () => {
    if (!address) return 0;
    if (assetId(networkId) === 0) return 0;
    const aTokenAppId = getATokenAppId(networkId);

    console.log({ aTokenAppId, networkId });

    if (aTokenAppId === 0) {
      console.error(`${networkId} AToken app ID is 0`);
      return 0;
    }

    setLoading(true);
    setError(null);

    try {
      const ci = new CONTRACT(
        aTokenAppId,
        algod(networkId),
        undefined,
        {
          name: "ARC200",
          description: "ARC200",
          methods: ATokenAppSpec.contract.methods,
          events: [],
        },
        {
          addr: address,
          sk: new Uint8Array(),
        }
      );

      const decimals = Number((await ci.arc200_decimals()).returnValue);
      const atomic = (await ci.arc200_balanceOf(address)).returnValue;
      console.log("atomic", atomic);
      console.log("decimals", decimals);
      const standard = new BigNumber(atomic.toString())
        .dividedBy(new BigNumber(10).pow(decimals))
        .toFixed(decimals);
      console.log("standard", standard);
      return standard;
    } catch (error) {
      console.error(`Error fetching ${networkId} ARC200 balance:`, error);
      setError("Failed to fetch ARC200 balance");
      return 0; // Return 0 instead of undefined to prevent NaN
    } finally {
      setLoading(false);
    }
  };

  const fetchASA2Balance = (networkId: NetworkId) => async () => {
    if (!address) return 0;

    const id = getAasaV2AssetId(networkId);
    console.log({ fetchASA2Balance: { id, networkId } });
    if (id === 0) return 0;

    console.log({ id, networkId });

    setLoading(true);
    setError(null);

    try {
      const algodClient = algod(networkId);
      const assetInfo = await algodClient.getAssetByID(id).do();

      const accountInfo = await algodClient
        .accountAssetInformation(address, id)
        .do()
        .catch((error) => {
          console.error(`Error fetching ${networkId} ASA balance:`, error);
          return {
            "asset-holding": { amount: 0 },
          };
        });

      console.log({
        fetchASA2Balance: { accountInfo, assetInfo, id, networkId },
      });

      const decimals = assetInfo.params.decimals;
      const atomic = accountInfo["asset-holding"]["amount"];
      const standard = new BigNumber(atomic.toString())
        .dividedBy(new BigNumber(10).pow(decimals))
        .toFixed(decimals);

      const balance = standard;

      return balance;
    } catch (error) {
      console.error(`Error fetching ${networkId} ASA balance:`, error);
      setError("Failed to fetch ASA balance");
      return 0; // Return 0 instead of undefined to prevent NaN
    } finally {
      setLoading(false);
    }
  };

  const fetchASABalance = (networkId: NetworkId) => async () => {
    if (!address) return 0;
    if (assetId(networkId) === 0) return 0;

    const id = assetId(networkId);

    console.log({ id, networkId });

    setLoading(true);
    setError(null);

    try {
      const algodClient = algod(networkId);
      const assetInfo = await algodClient.getAssetByID(id).do();

      const accountInfo = await algodClient
        .accountAssetInformation(address, id)
        .do()
        .catch((error) => {
          console.error(`Error fetching ${networkId} ASA balance:`, error);
          return {
            "asset-holding": { amount: 0 },
          };
        });

      console.log({ accountInfo, assetInfo });

      const balance =
        accountInfo["asset-holding"]["amount"] /
        10 ** assetInfo.params.decimals;

      console.log({ balance });

      if (isNaN(balance)) {
        console.error(`${networkId} ASA balance calculation resulted in NaN`);
        return 0;
      }

      return balance;
    } catch (error) {
      console.error(`Error fetching ${networkId} ASA balance:`, error);
      setError("Failed to fetch ASA balance");
      return 0; // Return 0 instead of undefined to prevent NaN
    } finally {
      setLoading(false);
    }
  };

  const fetchAlgoBalance = fetchNetworkBalance(NetworkId.MAINNET);
  const fetchTestnetBalance = fetchNetworkBalance(NetworkId.TESTNET);
  const fetchVoiBalance = fetchNetworkBalance(NetworkId.VOIMAIN);

  // Custom localnet balance fetch function
  const fetchLocalnetBalance = async () => {
    if (!address) return;

    setLoading(true);
    setError(null);

    try {
      const token =
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
      const server = "http://10.0.0.31";
      const port = 4001;
      const algodClient = new algosdk.Algodv2(token, server, port);
      const accountInfo = await algodClient.accountInformation(address).do();
      const balance = accountInfo.amount;
      return balance / 1e6;
    } catch (error) {
      console.error("Error fetching Localnet balance:", error);
      setError("Failed to fetch localnet balance");
    } finally {
      setLoading(false);
    }
  };

  // Custom localnet ARC200 balance fetch function
  const fetchLocalnetARC200Balance = async () => {
    if (!address) return 0;

    console.log("Fetching localnet ARC200 balance for address:", address);

    try {
      const token =
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
      const server = "http://10.0.0.31";
      const port = 4001;
      const algodClient = new algosdk.Algodv2(token, server, port);

      console.log("Created algod client for localnet");

      const ci = new CONTRACT(
        getATokenAppId(NetworkId.LOCALNET),
        algodClient,
        undefined,
        abi.nt200,
        {
          addr: address,
          sk: new Uint8Array(),
        }
      );

      console.log("Created CONTRACT instance for localnet ARC200");

      const balanceR = await ci.arc200_balanceOf(address);
      console.log("localnet balanceR", balanceR);

      if (!balanceR || !balanceR.returnValue) {
        console.warn("No balance returned from localnet ARC200 contract");
        return 0;
      }

      const balance = Number(balanceR.returnValue) / 1e6;
      console.log("Calculated localnet ARC200 balance:", balance);

      if (isNaN(balance)) {
        console.error(
          "Balance calculation resulted in NaN. balanceR.returnValue:",
          balanceR.returnValue
        );
        return 0;
      }

      return balance;
    } catch (error) {
      console.error("Error fetching Localnet ARC200 balance:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        address,
      });
      return 0;
    }
  };

  const fetchAlgoARC200Balance = fetchARC200Balance(NetworkId.MAINNET);
  const fetchTestnetARC200Balance = fetchARC200Balance(NetworkId.TESTNET);
  const fetchVoiARC200Balance = fetchARC200Balance(NetworkId.VOIMAIN);
  const fetchAlgoASABalance = fetchASABalance(NetworkId.MAINNET);
  const fetchAlgoASA2Balance = fetchASA2Balance(NetworkId.MAINNET);
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
        id: "algo-asa-2",
        name: "Algo ASA 2",
        balance: algoASA2Balance, // Using same balance for now, can be updated later
        color: "pink",
        network: "Algorand",
      },
      {
        id: "testnet-arc200",
        name: "Algorand Testnet ARC200",
        balance: testnetARC200Balance,
        color: "yellow",
        network: "Algorand Testnet",
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
      {
        id: "localnet-arc200",
        name: "Localnet ARC200",
        balance: localnetARC200Balance,
        color: "purple",
        network: "Localnet",
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
    const assetId = getAasaAppId(activeNetwork);
    const tokenContractId = getATokenAppId(activeNetwork);

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
      const i = {
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
      };
      console.log("i", i);
      buildN.push(i);
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

  const transferARC200ToASA2 = async (
    algodClient: algosdk.Algodv2,
    account: any,
    fromBucketId: string,
    toBucketId: string,
    amountInMicroUnits: number | bigint
  ) => {
    // Get asset ID and token contract ID based on network
    const assetId = getAasaAppId(activeNetwork);
    const tokenContractId = getATokenAppId(activeNetwork);
    const tokenContractId2AppId = getAasaV2AppId(activeNetwork);
    const tokenContractId2AssetId = getAasaV2AssetId(activeNetwork);

    console.log({ assetId, tokenContractId });

    if (!assetId || !tokenContractId) {
      throw new Error("Invalid network or asset unavailable");
    }

    // Create ARC200 contract instance
    const ci = new CONTRACT(
      tokenContractId2AppId,
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
      asa: new CONTRACT(
        tokenContractId2AppId,
        algodClient,
        undefined,
        {
          name: "saw200",
          desc: "saw200",
          methods: [
            {
              name: "deposit",
              args: [
                {
                  type: "uint64",
                },
              ],
              returns: {
                type: "void",
              },
            },
          ],
          events: [],
        },
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
    {
      // arc200 transfer txn
      const transferTxn = (
        await builder.token.arc200_transfer(
          algosdk.getApplicationAddress(tokenContractId2AppId),
          BigInt(0)
        )
      ).obj;
      buildN.push({
        ...transferTxn,
        note: new TextEncoder().encode("ARC200 0 PAYMENT"),
        payment: 28500,
      });
    }
    {
      // arc200 approve txn
      const approveTxn = (
        await builder.token.arc200_approve(
          algosdk.getApplicationAddress(tokenContractId2AppId),
          BigInt(amountInMicroUnits)
        )
      ).obj;
      buildN.push({
        ...approveTxn,
        note: new TextEncoder().encode("APPROVE ARC200 to ASA2 transfer"),
        payment: 28100,
      });
    }
    {
      const depositTxn = (await builder.asa.deposit(BigInt(amountInMicroUnits)))
        .obj;
      console.log("depositTxn", depositTxn);
      buildN.push({
        ...depositTxn,
        note: new TextEncoder().encode("ARC200 to ASA2 transfer"),
        foreignAssets: [assetId, tokenContractId2AssetId],
        accounts: [
          "SDSKGUS5AEIQATOLCSNC4PUK5GK6G6JRWMKUJY5GQRWMNXUTWURVUIQV3U",
          algosdk.getApplicationAddress(tokenContractId2AppId),
          algosdk.getApplicationAddress(tokenContractId),
        ],
        payment: 28500,
      });
    }
    ci.setExtraTxns(buildN);
    ci.setEnableGroupResourceSharing(true);
    ci.setFee(4000);
    ci.setBeaconId(tokenContractId);
    ci.setBeaconSelector("fb6eb573"); // touch()uint64
    const customR = await ci.custom();
    console.log("customR", customR);
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

  const transferARC200ToASA = async (
    algodClient: algosdk.Algodv2,
    account: any,
    fromBucketId: string,
    toBucketId: string,
    amountInMicroUnits: number | bigint
  ) => {
    // Get asset ID and token contract ID based on network
    const assetId = getAasaAppId(activeNetwork);
    const tokenContractId = getATokenAppId(activeNetwork);

    console.log({ assetId, tokenContractId });

    if (!assetId || !tokenContractId) {
      throw new Error("Invalid network or asset unavailable");
    }

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
    console.log("customR", customR);
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

  const transferASA2ToARC200 = async (
    algodClient: algosdk.Algodv2,
    account: any,
    fromBucketId: string,
    toBucketId: string,
    amountInMicroUnits: number | bigint
  ) => {
    // Get asset ID and token contract ID based on network
    const assetId2 = getAasaAppId(activeNetwork);
    const assetId = getAasaV2AssetId(activeNetwork);
    const tokenContractId2AppId = getAasaV2AppId(activeNetwork);
    const tokenContractId = getATokenAppId(activeNetwork);

    if (!assetId || !tokenContractId || !tokenContractId2AppId) {
      throw new Error("Invalid network or asset unavailable");
    }

    console.log({
      assetId,
      tokenContractId,
      tokenContractId2AppId,
      amountInMicroUnits,
    });

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
      asa: new CONTRACT(
        tokenContractId2AppId,
        algodClient,
        undefined,
        {
          name: "saw200",
          desc: "saw200",
          methods: [
            {
              name: "withdraw",
              args: [
                {
                  type: "uint64",
                },
              ],
              returns: {
                type: "void",
              },
            },
          ],
          events: [],
        },
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
    {
      // ASA2 withdraw txn
      const withdrawTxn = (
        await builder.asa.withdraw(BigInt(amountInMicroUnits))
      ).obj;
      const assetTransfer = {
        type: "axfer",
        xaid: assetId,
        aamt: BigInt(amountInMicroUnits),
        arcv: algosdk.getApplicationAddress(tokenContractId2AppId),
      };
      buildN.push({
        ...withdrawTxn,
        ...assetTransfer,
        note: new TextEncoder().encode("ASA2 to ARC200 transfer"),
        foreignAssets: [assetId2],
        accounts: [
          "SDSKGUS5AEIQATOLCSNC4PUK5GK6G6JRWMKUJY5GQRWMNXUTWURVUIQV3U",
          //algosdk.getApplicationAddress(tokenContractId2AppId),
          algosdk.getApplicationAddress(tokenContractId),
        ],
        payment: 28500,
      });
    }
    ci.setExtraTxns(buildN);
    ci.setEnableGroupResourceSharing(true);
    ci.setFee(4000);
    ci.setBeaconId(tokenContractId);
    ci.setBeaconSelector("fb6eb573"); // touch()uint64
    const customR = await ci.custom();
    console.log("customR", customR);
    if (!customR.success) {
      throw new Error("Failed to convert ASA2 to ARC200");
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

  const transferASAToASA2 = async (
    algodClient: algosdk.Algodv2,
    account: any,
    fromBucketId: string,
    toBucketId: string,
    amountInMicroUnits: number
  ) => {
    // Get asset IDs and contract IDs based on network
    const assetId = getAasaAppId(activeNetwork);
    const assetId2 = getAasaV2AssetId(activeNetwork);
    const tokenContractId = getATokenAppId(activeNetwork);
    const tokenContractId2AppId = getAasaV2AppId(activeNetwork);

    console.log({
      assetId,
      assetId2,
      tokenContractId,
      tokenContractId2AppId,
      amountInMicroUnits,
    });

    if (!assetId || !assetId2 || !tokenContractId || !tokenContractId2AppId) {
      throw new Error("Invalid network or asset unavailable");
    }

    // Create ASA2 contract instance
    const ci = new CONTRACT(
      tokenContractId2AppId,
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
      asa: new CONTRACT(
        tokenContractId2AppId,
        algodClient,
        undefined,
        {
          name: "saw200",
          desc: "saw200",
          methods: [
            {
              name: "deposit",
              args: [
                {
                  type: "uint64",
                },
              ],
              returns: {
                type: "void",
              },
            },
          ],
          events: [],
        },
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
    {
      const depositTxn = (
        await builder.token.deposit(BigInt(amountInMicroUnits))
      ).obj;
      buildN.push({
        ...depositTxn,
        payment: 28500,
        note: new TextEncoder().encode("ASA to ARC200 transfer"),
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
    }
    {
      // arc200 approve txn
      const approveTxn = (
        await builder.token.arc200_approve(
          algosdk.getApplicationAddress(tokenContractId2AppId),
          BigInt(amountInMicroUnits)
        )
      ).obj;
      buildN.push({
        ...approveTxn,
        note: new TextEncoder().encode("APPROVE ARC200 to ASA2 transfer"),
        payment: 28100,
      });
    }
    {
      const depositTxn = (await builder.asa.deposit(BigInt(amountInMicroUnits)))
        .obj;
      console.log("depositTxn", depositTxn);
      buildN.push({
        ...depositTxn,
        note: new TextEncoder().encode("ARC200 to ASA2 transfer"),
        foreignAssets: [assetId, assetId2],
        accounts: [
          "SDSKGUS5AEIQATOLCSNC4PUK5GK6G6JRWMKUJY5GQRWMNXUTWURVUIQV3U",
          algosdk.getApplicationAddress(tokenContractId2AppId),
          algosdk.getApplicationAddress(tokenContractId),
        ],
        payment: 28500,
      });
    }
    ci.setExtraTxns(buildN);
    ci.setEnableGroupResourceSharing(true);
    ci.setFee(4000);
    ci.setBeaconId(tokenContractId2AppId);
    ci.setBeaconSelector("fb6eb573"); // touch()uint64
    const customR = await ci.custom();
    console.log("customR", customR);
    if (!customR.success) {
      throw new Error("Failed to convert ASA to ASA2");
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

  const transferASA2ToASA = async (
    algodClient: algosdk.Algodv2,
    account: any,
    fromBucketId: string,
    toBucketId: string,
    amountInMicroUnits: number | bigint
  ) => {
    // Get asset IDs and contract IDs based on network
    const assetId = getAasaAppId(activeNetwork);
    const assetId2 = getAasaV2AssetId(activeNetwork);
    const tokenContractId = getATokenAppId(activeNetwork);
    const tokenContractId2AppId = getAasaV2AppId(activeNetwork);

    console.log({
      assetId,
      assetId2,
      tokenContractId,
      tokenContractId2AppId,
      amountInMicroUnits,
    });

    if (!assetId || !assetId2 || !tokenContractId || !tokenContractId2AppId) {
      throw new Error("Invalid network or asset unavailable");
    }

    // Create ASA2 contract instance
    const ci = new CONTRACT(
      tokenContractId2AppId,
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
      asa: new CONTRACT(
        tokenContractId2AppId,
        algodClient,
        undefined,
        {
          name: "saw200",
          desc: "saw200",
          methods: [
            {
              name: "withdraw",
              args: [
                {
                  type: "uint64",
                },
              ],
              returns: {
                type: "void",
              },
            },
          ],
          events: [],
        },
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
    {
      // ASA2 withdraw txn
      const withdrawTxn = (
        await builder.asa.withdraw(BigInt(amountInMicroUnits))
      ).obj;
      const assetTransfer = {
        type: "axfer",
        xaid: assetId2,
        aamt: BigInt(amountInMicroUnits),
        arcv: algosdk.getApplicationAddress(tokenContractId2AppId),
      };
      buildN.push({
        ...withdrawTxn,
        ...assetTransfer,
        note: new TextEncoder().encode("ASA2 to ARC200 transfer"),
        foreignAssets: [assetId2],
        accounts: [
          "SDSKGUS5AEIQATOLCSNC4PUK5GK6G6JRWMKUJY5GQRWMNXUTWURVUIQV3U",
          //algosdk.getApplicationAddress(tokenContractId2AppId),
          algosdk.getApplicationAddress(tokenContractId),
        ],
        payment: 28500,
      });
    }
    {
      // ARC200 withdraw txn
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
    }
    ci.setExtraTxns(buildN);
    ci.setEnableGroupResourceSharing(true);
    ci.setFee(4000);
    ci.setBeaconId(tokenContractId2AppId);
    ci.setBeaconSelector("fb6eb573"); // touch()uint64
    const customR = await ci.custom();
    console.log("customR", customR);
    if (!customR.success) {
      throw new Error("Failed to convert ASA2 to ASA");
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
      // If localnet is active, only fetch localnet balance
      if (isLocalnet()) {
        const [localnetResult, localnetARC200Result] = await Promise.allSettled(
          [fetchLocalnetBalance(), fetchLocalnetARC200Balance()]
        );

        if (
          localnetResult.status === "fulfilled" &&
          localnetResult.value !== undefined
        ) {
          setLocalnetBalance(localnetResult.value);
        } else {
          setLocalnetBalance(0);
        }

        if (
          localnetARC200Result.status === "fulfilled" &&
          localnetARC200Result.value !== undefined
        ) {
          const balance = localnetARC200Result.value;
          if (isNaN(balance)) {
            console.error("Localnet ARC200 balance is NaN, setting to 0");
            setLocalnetARC200Balance(0);
          } else {
            setLocalnetARC200Balance(balance);
          }
        } else {
          console.warn(
            "Localnet ARC200 balance fetch failed:",
            localnetARC200Result.status === "rejected"
              ? localnetARC200Result.reason
              : "No data"
          );
          setLocalnetARC200Balance(0);
        }

        // Set other balances to 0 for localnet
        setVoiBalance(0);
        setAlgoBalance(0);
        setAlgoARC200Balance(0);
        setVoiARC200Balance(0);
        setAlgoASABalance(0);
        setAlgoASA2Balance(0);
        setVoiASABalance(0);
        setTestnetARC200Balance(0);
      } else {
        // Build array of balance fetch promises based on enabled networks
        const balancePromises: Promise<any>[] = [];
        const balanceTypes: string[] = [];

        // Add balance fetches for enabled networks only
        if (isNetworkEnabled(NetworkId.VOIMAIN)) {
          balancePromises.push(fetchVoiBalance());
          balancePromises.push(fetchVoiARC200Balance());
          balancePromises.push(fetchVoiASABalance());
          balanceTypes.push("voi", "voiARC200", "voiASA");
        }
        if (isNetworkEnabled(NetworkId.MAINNET)) {
          balancePromises.push(fetchAlgoBalance());
          balancePromises.push(fetchAlgoARC200Balance());
          balancePromises.push(fetchAlgoASABalance());
          balancePromises.push(fetchAlgoASA2Balance());
          balanceTypes.push("algo", "algoARC200", "algoASA", "algoASA2");
        }
        if (isNetworkEnabled(NetworkId.TESTNET)) {
          balancePromises.push(fetchTestnetARC200Balance());
          balanceTypes.push("testnetARC200");
        }

        // Use Promise.allSettled to handle individual failures gracefully
        const results = await Promise.allSettled(balancePromises);

        // Handle each result individually
        const resultIndex = 0;

        // Process results based on enabled networks
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const balanceType = balanceTypes[i];

          if (result.status === "fulfilled" && result.value !== undefined) {
            // Set the appropriate balance based on the type
            switch (balanceType) {
              case "voi":
                setVoiBalance(result.value);
                break;
              case "voiARC200":
                setVoiARC200Balance(result.value);
                break;
              case "voiASA":
                setVoiASABalance(result.value);
                break;
              case "algo":
                setAlgoBalance(result.value);
                break;
              case "algoARC200":
                setAlgoARC200Balance(result.value);
                break;
              case "algoASA":
                setAlgoASABalance(result.value);
                break;
              case "algoASA2":
                setAlgoASA2Balance(result.value);
                break;
              case "testnetARC200":
                setTestnetARC200Balance(result.value);
                break;
            }
          } else {
            // Set balance to 0 and log error
            console.warn(
              `Failed to fetch ${balanceType} balance:`,
              result.status === "rejected" ? result.reason : "No data"
            );

            switch (balanceType) {
              case "voi":
                setVoiBalance(0);
                break;
              case "voiARC200":
                setVoiARC200Balance(0);
                break;
              case "voiASA":
                setVoiASABalance(0);
                break;
              case "algo":
                setAlgoBalance(0);
                break;
              case "algoARC200":
                setAlgoARC200Balance(0);
                break;
              case "algoASA":
                setAlgoASABalance(0);
                break;
              case "algoASA2":
                setAlgoASA2Balance(0);
                break;
              case "testnetARC200":
                setTestnetARC200Balance(0);
                break;
            }
          }
        }

        // Set disabled network balances to 0
        if (!isNetworkEnabled(NetworkId.VOIMAIN)) {
          setVoiBalance(0);
          setVoiARC200Balance(0);
          setVoiASABalance(0);
        }
        if (!isNetworkEnabled(NetworkId.MAINNET)) {
          setAlgoBalance(0);
          setAlgoARC200Balance(0);
          setAlgoASABalance(0);
          setAlgoASA2Balance(0);
        }
        if (!isNetworkEnabled(NetworkId.TESTNET)) {
          setTestnetARC200Balance(0);
        }
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

  // Swap functions
  const resetSwap = () => {
    setSwapStep("select-from");
    setSwapFromToken("");
    setSwapToToken("");
    setSwapAmount("");
    setSwapLoading(false);
    setSwapError("");
    setSwapSuccess(null);
  };

  const getAvailableTokensForSwap = () => {
    const buckets = getAllPowBuckets();
    return buckets.filter((bucket) => {
      // Get balance for this bucket
      let balance = 0;
      switch (bucket.id) {
        case "algo-arc200":
          balance = algoARC200Balance;
          break;
        case "algo-asa":
          balance = algoASABalance;
          break;
        case "algo-asa-2":
          balance = algoASA2Balance; // Using same balance as algo-asa for now
          break;
        case "voi-arc200":
          balance = voiARC200Balance;
          break;
        case "voi-asa":
          balance = voiASABalance;
          break;
        case "localnet-arc200":
          balance = localnetARC200Balance;
          break;
        case "testnet-arc200":
          balance = testnetARC200Balance;
          break;
        default:
          balance = 0;
      }
      return balance > 0;
    });
  };

  const getTokenBalance = (tokenId: string) => {
    switch (tokenId) {
      case "algo-arc200":
        return algoARC200Balance;
      case "algo-asa":
        return algoASABalance;
      case "algo-asa-2":
        return algoASA2Balance; // Using same balance as algo-asa for now
      case "voi-arc200":
        return voiARC200Balance;
      case "voi-asa":
        return voiASABalance;
      case "localnet-arc200":
        return localnetARC200Balance;
      case "testnet-arc200":
        return testnetARC200Balance;
      default:
        return 0;
    }
  };

  const isSwapAllowed = (fromTokenId: string, toTokenId: string) => {
    // Basic validation - can't swap to same token
    if (fromTokenId === toTokenId) return false;

    // Check if both tokens are available
    const fromBalance = getTokenBalance(fromTokenId);

    // Currently support ALGO ASA ↔ ALGO ARC200 swaps, ALGO ARC200 ↔ ALGO ASA 2, and ALGO ASA ↔ ALGO ASA 2
    if (
      (fromTokenId === "algo-asa" && toTokenId === "algo-arc200") ||
      (fromTokenId === "algo-arc200" && toTokenId === "algo-asa") ||
      (fromTokenId === "algo-arc200" && toTokenId === "algo-asa-2") ||
      (fromTokenId === "algo-asa-2" && toTokenId === "algo-arc200") ||
      (fromTokenId === "algo-asa" && toTokenId === "algo-asa-2") ||
      (fromTokenId === "algo-asa-2" && toTokenId === "algo-asa")
    ) {
      return fromBalance > 0;
    }

    // For other token pairs, check if both tokens have balances
    const toBalance = getTokenBalance(toTokenId);
    return fromBalance > 0 && toBalance >= 0; // Allow swaps even if destination has 0 balance
  };

  const handleSwap = async () => {
    if (!activeAccount || !swapFromToken || !swapToToken || !swapAmount) {
      setSwapError("Please fill in all required fields");
      return;
    }

    const amount = parseFloat(swapAmount);
    if (isNaN(amount) || amount <= 0) {
      setSwapError("Please enter a valid amount");
      return;
    }

    const fromBalance = getTokenBalance(swapFromToken);
    if (amount > fromBalance) {
      setSwapError("Insufficient balance for swap");
      return;
    }

    setSwapLoading(true);
    setSwapError("");

    try {
      // Convert amount to micro units (6 decimals)
      const amountInMicroUnits = Math.floor(amount * 1e6);

      let txId: string;
      let estimatedOutput: number;

      // Check if this is an ALGO ASA to ALGO ARC200 swap
      if (swapFromToken === "algo-asa" && swapToToken === "algo-arc200") {
        console.log("Executing ALGO ASA to ALGO ARC200 swap");

        // Use the existing transferASAToARC200 function
        const algodClient = algod(activeNetwork);
        const assetInfo = await algodClient
          .getAssetByID(getAasaAppId(activeNetwork))
          .do();
        const amountInMicroUnits = Math.floor(
          amount * 10 ** assetInfo.params.decimals
        );
        await transferASAToARC200(
          algodClient,
          activeAccount,
          swapFromToken,
          swapToToken,
          amountInMicroUnits
        );

        // For now, use a mock transaction ID since the transfer function doesn't return one
        txId = "SWAP_ASA_TO_ARC200_" + Date.now().toString(36);
        estimatedOutput = amount; // 1:1 ratio for now
      } else if (
        swapFromToken === "algo-arc200" &&
        swapToToken === "algo-asa"
      ) {
        console.log("Executing ALGO ARC200 to ALGO ASA swap");
        const decimals = 19; // TODO fetch
        const amountInMicroUnits = BigInt(
          new BigNumber(amount)
            .multipliedBy(new BigNumber(10).pow(decimals))
            .toFixed(0)
        );
        // Use the existing transferARC200ToASA function
        const algodClient = algod(activeNetwork);
        await transferARC200ToASA(
          algodClient,
          activeAccount,
          swapFromToken,
          swapToToken,
          amountInMicroUnits
        );

        // For now, use a mock transaction ID since the transfer function doesn't return one
        txId = "SWAP_ARC200_TO_ASA_" + Date.now().toString(36);
        estimatedOutput = amount; // 1:1 ratio for now
      } else if (
        swapFromToken === "algo-arc200" &&
        swapToToken === "algo-asa-2"
      ) {
        console.log("Executing ALGO ARC200 to ALGO ASA 2 swap");
        const decimals = 19; // TODO fetch
        const amountInMicroUnits = BigInt(
          new BigNumber(amount)
            .multipliedBy(new BigNumber(10).pow(decimals))
            .toFixed(0)
        );
        // Use the existing transferARC200ToASA function for the new route
        const algodClient = algod(activeNetwork);
        await transferARC200ToASA2(
          algodClient,
          activeAccount,
          swapFromToken,
          swapToToken,
          amountInMicroUnits
        );

        // For now, use a mock transaction ID since the transfer function doesn't return one
        txId = "SWAP_ARC200_TO_ASA2_" + Date.now().toString(36);
        estimatedOutput = amount; // 1:1 ratio for now
      } else if (
        swapFromToken === "algo-asa-2" &&
        swapToToken === "algo-arc200"
      ) {
        console.log("Executing ALGO ASA 2 to ALGO ARC200 swap");
        const decimals = 19; // TODO fetch
        const amountInMicroUnits = BigInt(
          new BigNumber(amount)
            .multipliedBy(new BigNumber(10).pow(decimals))
            .toFixed(0)
        );
        // Use the new transferASA2ToARC200 function
        const algodClient = algod(activeNetwork);
        await transferASA2ToARC200(
          algodClient,
          activeAccount,
          swapFromToken,
          swapToToken,
          amountInMicroUnits
        );

        // For now, use a mock transaction ID since the transfer function doesn't return one
        txId = "SWAP_ASA2_TO_ARC200_" + Date.now().toString(36);
        estimatedOutput = amount; // 1:1 ratio for now
      } else if (swapFromToken === "algo-asa" && swapToToken === "algo-asa-2") {
        console.log("Executing ALGO ASA to ALGO ASA 2 swap");
        const decimals = 0; // TODO fetch
        const amountInMicroUnits = Math.floor(amount * 10 ** decimals);
        // Use the new transferASAToASA2 function
        const algodClient = algod(activeNetwork);
        await transferASAToASA2(
          algodClient,
          activeAccount,
          swapFromToken,
          swapToToken,
          amountInMicroUnits
        );

        // For now, use a mock transaction ID since the transfer function doesn't return one
        txId = "SWAP_ASA_TO_ASA2_" + Date.now().toString(36);
        estimatedOutput = amount; // 1:1 ratio for now
      } else if (swapFromToken === "algo-asa-2" && swapToToken === "algo-asa") {
        console.log("Executing ALGO ASA 2 to ALGO ASA swap");
        const decimals = 19; // TODO fetch
        const amountInMicroUnits = BigInt(
          new BigNumber(amount)
            .multipliedBy(new BigNumber(10).pow(decimals))
            .toFixed(0)
        );
        // Use the new transferASA2ToASA function
        const algodClient = algod(activeNetwork);
        await transferASA2ToASA(
          algodClient,
          activeAccount,
          swapFromToken,
          swapToToken,
          amountInMicroUnits
        );

        // For now, use a mock transaction ID since the transfer function doesn't return one
        txId = "SWAP_ASA2_TO_ASA_" + Date.now().toString(36);
        estimatedOutput = amount; // 1:1 ratio for now
      } else {
        // Fallback to mock swap for other token pairs
        console.log("Using mock swap for unsupported token pair");
        await new Promise((resolve) => setTimeout(resolve, 2000));

        txId =
          "SWAP" +
          Date.now().toString(36) +
          Math.random().toString(36).substr(2);
        estimatedOutput = amount;
      }

      setSwapSuccess({
        txId: txId,
        fromAmount: swapAmount,
        toAmount: estimatedOutput.toFixed(2),
        fromToken: getBucketById(swapFromToken)?.name || swapFromToken,
        toToken: getBucketById(swapToToken)?.name || swapToToken,
      });

      // Reset form after success
      setTimeout(() => {
        setShowSwapModal(false);
        resetSwap();
        refreshAllBalances();
      }, 3000);
    } catch (error) {
      console.error("Swap error:", error);
      setSwapError("Failed to execute swap. Please try again.");
    } finally {
      setSwapLoading(false);
    }
  };

  const handleModalTransfer = async () => {
    if (!activeAccount) {
      setModalTransferError(
        "Wallet not connected. Please connect your wallet first."
      );
      return;
    }

    if (!modalTransferAmount || !modalTransferAddress) {
      console.log("Missing required fields:", {
        modalTransferAmount,
        modalTransferAddress,
      });
      setModalTransferError("Please enter both amount and recipient address.");
      return;
    }

    setModalTransferLoading(true);
    try {
      // Validate address
      if (!algosdk.isValidAddress(modalTransferAddress)) {
        throw new Error("Invalid recipient address");
      }

      // Convert amount to micro units (6 decimals)
      const amountInMicroUnits = Math.floor(
        parseFloat(modalTransferAmount) * 1e6
      );

      console.log("Starting transfer with:", {
        amount: modalTransferAmount,
        amountInMicroUnits,
        recipient: modalTransferAddress,
        contractId: getATokenAppId(activeNetwork),
        network: activeNetwork,
      });

      // Use the active network configuration
      let algodClient: algosdk.Algodv2;
      let contractId: number;

      if (activeNetwork === NetworkId.LOCALNET) {
        // For localnet, use local configuration
        const token =
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        const server = "http://10.0.0.31";
        const port = 4001;
        algodClient = new algosdk.Algodv2(token, server, port);
        contractId = getATokenAppId(NetworkId.LOCALNET);
      } else {
        // For other networks, use standard configuration
        algodClient = algod(activeNetwork);
        contractId = getATokenAppId(activeNetwork);
      }

      console.log("Created algod client for network:", activeNetwork);

      const ci = new CONTRACT(contractId, algodClient, undefined, abi.nt200, {
        addr: activeAccount.address,
        sk: new Uint8Array(),
      });

      console.log("Created contract instance with ID:", contractId);

      // Build transfer transaction
      ci.setPaymentAmount(19700);
      const transferTxn = await ci.arc200_transfer(
        modalTransferAddress,
        BigInt(amountInMicroUnits)
      );

      console.log("transferTxn", transferTxn);

      console.log("Transfer transaction built:", transferTxn);

      if (!transferTxn || !transferTxn.txns || transferTxn.txns.length === 0) {
        throw new Error("Failed to build transfer transaction");
      }

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

      console.log("Transactions signed, submitting...");

      const { txId } = await algodClient
        .sendRawTransaction(transferSigned)
        .do();

      console.log("Transaction submitted with ID:", txId);

      await algosdk.waitForConfirmation(algodClient, txId, 4);

      console.log("Modal transfer completed:", txId);

      // Set success state with transaction details
      setModalTransferSuccess({
        txId,
        amount: modalTransferAmount,
        recipient: modalTransferAddress,
      });

      // Reset form fields
      setModalTransferAmount("");
      setModalTransferAddress("");
      setModalTransferError("");

      // Refresh balances
      await refreshAllBalances();

      // Auto-close modal after 5 seconds
      setTimeout(() => {
        setShowTransferModal(false);
        setModalTransferSuccess(null);
      }, 5000);
    } catch (error) {
      console.error("Modal transfer failed:", error);
      setModalTransferError(error.message);
    } finally {
      setModalTransferLoading(false);
    }
  };

  // Handle mint function for localnet and Algorand testnet
  const handleMint = async () => {
    if (!activeAccount) {
      setMintError("Wallet not connected. Please connect your wallet first.");
      return;
    }

    if (!isMintingAllowed()) {
      setMintError("Minting is only allowed on Localnet and Algorand Testnet.");
      return;
    }

    setMintLoading(true);
    setMintError("");
    setMintSuccess(null);

    try {
      // Use preset amount of 1000
      const mintAmount = "1000";
      // Convert amount to micro units (6 decimals)
      const amountInMicroUnits = Math.floor(parseFloat(mintAmount) * 1e6);

      // Determine the network and get appropriate configuration
      const currentNetwork = activeNetwork;
      console.log("Current network:", currentNetwork);
      const contractId = getATokenAppId(currentNetwork);
      console.log("Contract ID:", contractId);

      console.log("Starting mint with:", {
        amount: mintAmount,
        amountInMicroUnits,
        contractId,
        network: currentNetwork,
      });

      let algodClient: algosdk.Algodv2;
      let token: string;

      if (isLocalnet()) {
        // For localnet ARC200, use local configuration
        token =
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        const server = "http://10.0.0.31";
        const port = 4001;
        algodClient = new algosdk.Algodv2(token, server, port);
      } else if (isTestnet()) {
        // For Algorand testnet, use the standard testnet configuration
        token = ""; // No token needed for testnet
        algodClient = algod(currentNetwork);
      } else {
        throw new Error("Minting is not supported on this network");
      }

      console.log("Created algod client for network:", currentNetwork);

      const ci = new CONTRACT(
        contractId,
        algodClient,
        undefined,
        {
          name: "ARC200",
          description: "ARC200",
          methods: ATokenAppSpec.contract.methods,
          events: [],
        },
        {
          addr: activeAccount.address,
          sk: new Uint8Array(),
        }
      );

      console.log("Created contract instance with ID:", contractId);

      // Build mint transaction
      ci.setPaymentAmount(19700);
      const mintTxn = await ci.mint(BigInt(amountInMicroUnits));

      console.log("Mint transaction built:", mintTxn);

      if (!mintTxn || !mintTxn.txns || mintTxn.txns.length === 0) {
        throw new Error("Failed to build mint transaction");
      }

      // Sign and submit mint transaction
      const mintSigned = await signTransactions(
        mintTxn.txns.map(
          (txn: string) =>
            new Uint8Array(
              atob(txn)
                .split("")
                .map((char) => char.charCodeAt(0))
            )
        )
      );

      console.log("Transactions signed, submitting...");

      const { txId } = await algodClient.sendRawTransaction(mintSigned).do();

      console.log("Transaction submitted with ID:", txId);

      await algosdk.waitForConfirmation(algodClient, txId, 4);

      console.log("Mint completed:", txId);

      // Set success state with transaction details
      setMintSuccess({
        txId,
        amount: mintAmount,
      });

      // Reset error state
      setMintError("");

      // Refresh balances
      await refreshAllBalances();

      // Auto-clear success message after 5 seconds
      setTimeout(() => {
        setMintSuccess(null);
      }, 5000);
    } catch (error) {
      console.error("Mint failed:", error);
      setMintError(error.message || "Failed to mint tokens");
    } finally {
      setMintLoading(false);
    }
  };

  // Check if recipient is opted into required assets
  const checkRecipientOptIn = async (
    recipientAddress: string,
    bucketId: string
  ) => {
    if (!recipientAddress || !algosdk.isValidAddress(recipientAddress)) {
      return { optedIn: false, error: "Invalid address" };
    }

    try {
      const bucket = getBucketById(bucketId);
      if (!bucket) {
        return { optedIn: false, error: "Invalid bucket" };
      }

      const networkId =
        bucket.network === "Algorand" ? NetworkId.MAINNET : NetworkId.VOIMAIN;
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

        const foundAramidConfirmTransactions = [];
        const foundOtherAramidTransactions = [];
        const recipientTransactions = [];

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
        // If localnet is active, only fetch localnet balance
        if (isLocalnet()) {
          const [localnetResult, localnetARC200Result] =
            await Promise.allSettled([
              fetchLocalnetBalance(),
              fetchLocalnetARC200Balance(),
            ]);

          if (
            localnetResult.status === "fulfilled" &&
            localnetResult.value !== undefined
          ) {
            setLocalnetBalance(localnetResult.value);
          } else {
            setLocalnetBalance(0);
          }

          if (
            localnetARC200Result.status === "fulfilled" &&
            localnetARC200Result.value !== undefined
          ) {
            const balance = localnetARC200Result.value;
            if (isNaN(balance)) {
              console.error("Localnet ARC200 balance is NaN, setting to 0");
              setLocalnetARC200Balance(0);
            } else {
              setLocalnetARC200Balance(balance);
            }
          } else {
            console.warn(
              "Localnet ARC200 balance fetch failed:",
              localnetARC200Result.status === "rejected"
                ? localnetARC200Result.reason
                : "No data"
            );
            setLocalnetARC200Balance(0);
          }

          // Set other balances to 0 for localnet
          setVoiBalance(0);
          setAlgoBalance(0);
          setAlgoARC200Balance(0);
          setVoiARC200Balance(0);
          setAlgoASABalance(0);
          setAlgoASA2Balance(0);
          setVoiASABalance(0);
          setTestnetARC200Balance(0);
        } else {
          // Build array of balance fetch promises based on enabled networks
          const balancePromises: Promise<any>[] = [];
          const balanceTypes: string[] = [];

          // Add balance fetches for enabled networks only
          if (isNetworkEnabled(NetworkId.VOIMAIN)) {
            balancePromises.push(fetchVoiBalance());
            balancePromises.push(fetchVoiARC200Balance());
            balancePromises.push(fetchVoiASABalance());
            balanceTypes.push("voi", "voiARC200", "voiASA");
          }
          if (isNetworkEnabled(NetworkId.MAINNET)) {
            balancePromises.push(fetchAlgoBalance());
            balancePromises.push(fetchAlgoARC200Balance());
            balancePromises.push(fetchAlgoASABalance());
            balancePromises.push(fetchAlgoASA2Balance());
            balanceTypes.push("algo", "algoARC200", "algoASA", "algoASA2");
          }
          if (isNetworkEnabled(NetworkId.TESTNET)) {
            balancePromises.push(fetchTestnetARC200Balance());
            balanceTypes.push("testnetARC200");
          }

          // Use Promise.allSettled to handle individual failures gracefully
          const results = await Promise.allSettled(balancePromises);

          // Track if any fetches succeeded
          let hasSuccessfulFetches = false;

          // Handle each result individually
          const resultIndex = 0;

          // Process results based on enabled networks
          for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const balanceType = balanceTypes[i];

            if (result.status === "fulfilled" && result.value !== undefined) {
              // Set the appropriate balance based on the type
              switch (balanceType) {
                case "voi":
                  setVoiBalance(result.value);
                  hasSuccessfulFetches = true;
                  break;
                case "voiARC200":
                  setVoiARC200Balance(result.value);
                  hasSuccessfulFetches = true;
                  break;
                case "voiASA":
                  setVoiASABalance(result.value);
                  hasSuccessfulFetches = true;
                  break;
                case "algo":
                  setAlgoBalance(result.value);
                  hasSuccessfulFetches = true;
                  break;
                case "algoARC200":
                  setAlgoARC200Balance(result.value);
                  hasSuccessfulFetches = true;
                  break;
                case "algoASA":
                  setAlgoASABalance(result.value);
                  hasSuccessfulFetches = true;
                  break;
                case "algoASA2":
                  setAlgoASA2Balance(result.value);
                  hasSuccessfulFetches = true;
                  break;
                case "testnetARC200":
                  setTestnetARC200Balance(result.value);
                  hasSuccessfulFetches = true;
                  break;
              }
            } else {
              // Set balance to 0 and log error
              console.warn(
                `Failed to fetch ${balanceType} balance:`,
                result.status === "rejected" ? result.reason : "No data"
              );

              switch (balanceType) {
                case "voi":
                  setVoiBalance(0);
                  break;
                case "voiARC200":
                  setVoiARC200Balance(0);
                  break;
                case "voiASA":
                  setVoiASABalance(0);
                  break;
                case "algo":
                  setAlgoBalance(0);
                  break;
                case "algoARC200":
                  setAlgoARC200Balance(0);
                  break;
                case "algoASA":
                  setAlgoASABalance(0);
                  break;
                case "algoASA2":
                  setAlgoASA2Balance(0);
                  break;
                case "testnetARC200":
                  setTestnetARC200Balance(0);
                  break;
              }
            }
          }

          // Set disabled network balances to 0
          if (!isNetworkEnabled(NetworkId.VOIMAIN)) {
            setVoiBalance(0);
            setVoiARC200Balance(0);
            setVoiASABalance(0);
          }
          if (!isNetworkEnabled(NetworkId.MAINNET)) {
            setAlgoBalance(0);
            setAlgoARC200Balance(0);
            setAlgoASABalance(0);
            setAlgoASA2Balance(0);
          }
          if (!isNetworkEnabled(NetworkId.TESTNET)) {
            setTestnetARC200Balance(0);
          }

          // Only show error if all fetches failed
          if (!hasSuccessfulFetches) {
            setError("Failed to fetch wallet balances");
          }
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
    const optInStatus: Record<
      string,
      { optedIn: boolean; error?: string; balance?: number }
    > = {};

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
      label: "[BLAPU]",
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
            <div className="flex gap-2">
              {isPowerUpEnabled() && (
                <Link
                  to={`/blapuup/${address}`}
                  className="px-4 py-2 bg-[#1EAEDB] hover:bg-[#1EAEDB]/90 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
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
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Power UP
                </Link>
              )}
              {isSwapEnabled && (
                <button
                  onClick={() => {
                    setShowSwapModal(true);
                    resetSwap();
                  }}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
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
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                  Swap
                </button>
              )}
            </div>
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
                        // If localnet is active, only fetch localnet balance
                        if (isLocalnet()) {
                          const localnetResult = await fetchLocalnetBalance();
                          if (localnetResult !== undefined) {
                            setLocalnetBalance(localnetResult);
                          } else {
                            setLocalnetBalance(0);
                          }
                          // Set other balances to 0 for localnet
                          setVoiBalance(0);
                          setAlgoBalance(0);
                        } else {
                          const [voiResult, algoResult] = await Promise.all([
                            fetchVoiBalance(),
                            fetchAlgoBalance(),
                          ]);
                          if (voiResult !== undefined) setVoiBalance(voiResult);
                          if (algoResult !== undefined)
                            setAlgoBalance(algoResult);
                        }
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
              {/* Network Settings Button */}
              <div className="p-6 rounded-xl border border-gray-200/20 shadow-lg bg-card hover:bg-card/80 transition-colors w-full">
                <div className="flex justify-between items-center">
                  <div className="text-lg font-semibold text-card-foreground">
                    Network Settings
                  </div>
                  <button
                    onClick={() => setShowNetworkSettingsModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Configure Networks
                  </button>
                </div>
                <div className="mt-4 text-sm text-card-foreground/60">
                  Configure which networks to fetch balances from. Only enabled networks will be fetched.
                </div>
              </div>

              {/* POW Balance Card */}
              <div className="p-6 rounded-xl border border-gray-200/20 shadow-lg bg-card hover:bg-card/80 transition-colors w-full">
                <div className="flex justify-between mb-2">
                  <div className="text-lg font-semibold text-card-foreground">
                    BLAPU (Total)
                  </div>
                  <div className="text-lg text-card-foreground">
                    {totalPOWBalance.toLocaleString()}
                  </div>
                </div>
                <div className="w-full bg-gray-200/20 rounded-full h-2.5 relative overflow-hidden">
                  {/* Use percentage-based approach for equal visibility */}
                  {(() => {
                    const balances = isLocalnet()
                      ? [
                          {
                            value: localnetARC200Balance,
                            color: "bg-purple-500",
                          },
                        ]
                      : [
                          // Only include balances for enabled networks
                          ...(isNetworkEnabled(NetworkId.MAINNET)
                            ? [
                                {
                                  value: algoARC200Balance,
                                  color: "bg-blue-500",
                                },
                                {
                                  value: algoASABalance,
                                  color: "bg-orange-500",
                                },
                                {
                                  value: algoASA2Balance,
                                  color: "bg-pink-500",
                                },
                              ]
                            : []),
                          ...(isNetworkEnabled(NetworkId.VOIMAIN)
                            ? [
                                {
                                  value: voiARC200Balance,
                                  color: "bg-green-500",
                                },
                                { value: voiASABalance, color: "bg-red-500" },
                              ]
                            : []),
                          ...(isNetworkEnabled(NetworkId.TESTNET)
                            ? [
                                {
                                  value: testnetARC200Balance,
                                  color: "bg-yellow-500",
                                },
                              ]
                            : []),
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
                {/* Balance breakdown - Show different breakdowns based on network settings */}
                {!isLocalnet() ? (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    {isNetworkEnabled(NetworkId.MAINNET) && (
                      <>
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
                          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                          <span className="text-card-foreground/70">
                            Algo ASA:
                          </span>
                          <span className="text-orange-400 font-medium">
                            {algoASABalance.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                          <span className="text-card-foreground/70">
                            Algo ASA 2:
                          </span>
                          <span className="text-pink-400 font-medium">
                            {algoASA2Balance.toLocaleString()}
                          </span>
                        </div>
                      </>
                    )}
                    {isNetworkEnabled(NetworkId.VOIMAIN) && (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="text-card-foreground/70">
                            Voi ARC200:
                          </span>
                          <span className="text-green-400 font-medium">
                            {voiARC200Balance.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <span className="text-card-foreground/70">
                            Voi ASA:
                          </span>
                          <span className="text-red-400 font-medium">
                            {voiASABalance.toLocaleString()}
                          </span>
                        </div>
                      </>
                    )}
                    {isNetworkEnabled(NetworkId.TESTNET) && (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span className="text-card-foreground/70">
                          Algorand Testnet ARC200:
                        </span>
                        <span className="text-yellow-400 font-medium">
                          {testnetARC200Balance.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    {isNetworkEnabled(NetworkId.LOCALNET) && (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <span className="text-card-foreground/70">
                          Localnet ARC200:
                        </span>
                        <span className="text-purple-400 font-medium">
                          {localnetARC200Balance.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {isNetworkEnabled(NetworkId.TESTNET) && (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span className="text-card-foreground/70">
                          Algorand Testnet ARC200:
                        </span>
                        <span className="text-yellow-400 font-medium">
                          {testnetARC200Balance.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {/* Localnet/Algorand Testnet ARC200 Transfer, Mint, and Swap Buttons - Only show when on localnet or testnet */}
                {isMintingAllowed() && (
                  <div className="mt-4 flex justify-center gap-3">
                    <button
                      onClick={() => {
                        setShowTransferModal(true);
                        setModalTransferError("");
                        setModalTransferSuccess(null);
                        setModalTransferAmount("");
                        setModalTransferAddress("");
                      }}
                      className="w-32 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
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
                          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                        />
                      </svg>
                      Transfer
                    </button>
                    <button
                      onClick={handleMint}
                      disabled={mintLoading}
                      className="w-32 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      {mintLoading ? (
                        <svg
                          className="w-4 h-4 animate-spin"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      ) : (
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
                      )}
                      {mintLoading ? "Minting..." : "Mint 1000"}
                    </button>
                    {isSwapEnabled && (
                      <button
                        onClick={() => {
                          setShowSwapModal(true);
                          resetSwap();
                        }}
                        className="w-32 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
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
                            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                          />
                        </svg>
                        Swap
                      </button>
                    )}
                  </div>
                )}

                {/* Mint Messages - Only show when on localnet or testnet */}
                {isMintingAllowed() && (
                  <div className="mt-4 space-y-3">
                    {/* Error Message */}
                    {mintError && (
                      <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2">
                        {mintError}
                      </div>
                    )}

                    {/* Success Message */}
                    {mintSuccess && (
                      <div className="text-green-400 text-sm bg-green-900/20 border border-green-500/30 rounded-lg px-3 py-2">
                        Successfully minted {mintSuccess.amount} POW tokens!
                        <br />
                        Transaction ID: {mintSuccess.txId}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* VOI and ALGO Balance Cards - Only show when NOT on localnet and networks are enabled */}
              {!isLocalnet() && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  {isNetworkEnabled(NetworkId.VOIMAIN) && (
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
                  )}

                  {isNetworkEnabled(NetworkId.MAINNET) && (
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
                        {isBuyAlgoEnabled() && (
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
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Localnet Balance Card - Only show when active network is localnet */}
              {isLocalnet() && (
                <div className="p-6 rounded-xl border border-gray-200/20 shadow-lg bg-card hover:bg-card/80 transition-colors w-full">
                  <div className="flex justify-between mb-2">
                    <div className="text-lg font-semibold text-card-foreground">
                      LOCALNET
                    </div>
                    <div className="text-lg text-card-foreground">
                      {localnetBalance.toLocaleString()}
                    </div>
                  </div>
                  <div className="w-full bg-gray-200/20 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full bg-purple-500"
                      style={{
                        width: `${Math.max(
                          1,
                          Math.min((localnetBalance / 1000) * 100, 100)
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <div className="mt-2 text-sm text-card-foreground/60">
                    Available balance (excluding minimum required)
                  </div>
                </div>
              )}

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

              {/* Internal Transfer Interface - Only show for connected user's own wallet and NOT on localnet, and only when Mainnet is enabled */}
              {showTransferInterface &&
                availableSourceBuckets.length >= 0 &&
                !isLocalnet() &&
                (isNetworkEnabled(NetworkId.MAINNET) ||
                  isNetworkEnabled(NetworkId.VOIMAIN)) &&
                isInternalTransferEnabled() && (
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
                                            const toType =
                                              transferFrom.includes("arc200")
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
                                  const fromType = transferFrom.includes(
                                    "arc200"
                                  )
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
                        transfers and ARC200 → ASA transfers are supported but
                        may require additional steps and bridge fees.
                        Cross-network ARC200 → ARC200 transfers are not
                        supported as ARC200 tokens are network-specific.
                      </p>
                      <p className="text-xs text-card-foreground/60 mt-2">
                        <strong>
                          Cross Network Transfers powered by Aramid Bridge
                        </strong>
                      </p>
                    </div>
                  </div>
                )}

              {/* External Transfer Interface - Only show for connected user's own wallet and NOT on localnet, and only when Mainnet is enabled */}
              {showTransferInterface &&
                availableSourceBuckets.length >= 0 &&
                !isLocalnet() &&
                (isNetworkEnabled(NetworkId.MAINNET) ||
                  isNetworkEnabled(NetworkId.VOIMAIN)) &&
                isExternalTransferEnabled() && (
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
                            const isSelectable =
                              isOnCorrectNetwork && hasBalance;

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
                                {getBucketById(externalTransferToken)?.name},
                                you need to switch to the{" "}
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
                            ⚠️ Recipients must be opted into the destination
                            token to receive transfers
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                          {allBuckets.map((bucket) => {
                            const isAllowed = isTransferAllowed(
                              externalTransferToken,
                              bucket.id
                            );
                            const recipientBalance =
                              recipientBalances[bucket.id];
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
                                        {checkingOptIn ||
                                        loadingRecipientBalances ? (
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
                                        {!isAllowed
                                          ? "Not Supported"
                                          : "Not Opted In"}
                                      </div>
                                      <div className="text-xs text-gray-300">
                                        {!isAllowed
                                          ? (() => {
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
                                          : "Recipient must opt-in first"}
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
                                {
                                  getBucketById(externalTransferDestination)
                                    ?.name
                                }
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
                        <strong>Note:</strong> External transfers send POW
                        tokens to other wallet addresses. Make sure to
                        double-check the recipient address before confirming the
                        transfer. Transfers are irreversible once confirmed.
                      </p>
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
          <div className="bg-card border border-gray-200/20 rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-card-foreground">
                Transfer POW Tokens
              </h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-card-foreground/60 hover:text-card-foreground/80 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Transfer Success Confirmation */}
              {modalTransferSuccess && (
                <div className="p-4 bg-green-600/20 border border-green-500/30 rounded-lg">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-3">
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
                    </div>
                    <h4 className="text-lg font-semibold text-green-400 mb-2">
                      Transfer Successful!
                    </h4>
                    <div className="text-sm text-green-300 space-y-1">
                      <div>
                        <span className="font-medium">Amount:</span>{" "}
                        {modalTransferSuccess.amount} POW
                      </div>
                      <div>
                        <span className="font-medium">Recipient:</span>{" "}
                        {modalTransferSuccess.recipient.slice(0, 8)}...
                        {modalTransferSuccess.recipient.slice(-6)}
                      </div>
                      <div>
                        <span className="font-medium">Transaction ID:</span>{" "}
                        <span className="font-mono text-xs">
                          {modalTransferSuccess.txId.slice(0, 8)}...
                          {modalTransferSuccess.txId.slice(-6)}
                        </span>
                        <br />
                        <a
                          href={(() => {
                            switch (activeNetwork) {
                              case NetworkId.LOCALNET:
                                return `https://lora.algokit.io/localnet/transaction/${modalTransferSuccess.txId}`;
                              case NetworkId.TESTNET:
                                return `https://testnet.algoexplorer.io/tx/${modalTransferSuccess.txId}`;
                              case NetworkId.MAINNET:
                                return `https://algoexplorer.io/tx/${modalTransferSuccess.txId}`;
                              case NetworkId.VOIMAIN:
                                return `https://explorer.voi.network/tx/${modalTransferSuccess.txId}`;
                              default:
                                return `https://algoexplorer.io/tx/${modalTransferSuccess.txId}`;
                            }
                          })()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline text-xs inline-flex items-center gap-1 mt-1"
                        >
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                          View on Explorer
                        </a>
                      </div>
                    </div>
                    <div className="text-xs text-green-200 mt-3">
                      Modal will close automatically in a few seconds...
                    </div>
                  </div>
                </div>
              )}

              {/* Wallet Connection Warning */}
              {!activeAccount && (
                <div className="p-3 bg-red-600/20 border border-red-500/30 rounded-lg">
                  <div className="text-sm text-red-400">
                    <div className="flex items-center gap-2 mb-1">
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
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                      </svg>
                      <span className="font-medium">Wallet Not Connected</span>
                    </div>
                    <div className="text-xs text-red-300">
                      Please connect your wallet to perform transfers.
                    </div>
                  </div>
                </div>
              )}

              {/* Form Content - Only show when not in success state */}
              {!modalTransferSuccess && (
                <>
                  {/* Current Balance Info */}
                  <div className="p-3 bg-purple-600/20 rounded-lg">
                    <div className="text-sm text-card-foreground/80">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <span className="font-medium">
                          {activeNetwork === NetworkId.LOCALNET
                            ? "Localnet"
                            : activeNetwork === NetworkId.TESTNET
                            ? "Algorand Testnet"
                            : activeNetwork === NetworkId.MAINNET
                            ? "Algorand Mainnet"
                            : activeNetwork === NetworkId.VOIMAIN
                            ? "Voi Mainnet"
                            : "Network"}{" "}
                          ARC200 Balance
                        </span>
                      </div>
                      <div className="text-lg font-semibold text-purple-400">
                        {(() => {
                          switch (activeNetwork) {
                            case NetworkId.LOCALNET:
                              return localnetARC200Balance.toLocaleString();
                            case NetworkId.TESTNET:
                              return testnetARC200Balance.toLocaleString();
                            case NetworkId.MAINNET:
                              return algoARC200Balance.toLocaleString();
                            case NetworkId.VOIMAIN:
                              return voiARC200Balance.toLocaleString();
                            default:
                              return "0";
                          }
                        })()}{" "}
                        POW
                      </div>
                    </div>
                  </div>

                  {/* Recipient Address Input */}
                  <div>
                    <label className="text-sm font-medium text-card-foreground/70 mb-2 block">
                      Recipient Address
                    </label>
                    <input
                      type="text"
                      placeholder="Enter wallet address"
                      value={modalTransferAddress}
                      onChange={(e) => setModalTransferAddress(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-card-foreground text-sm font-mono focus:border-purple-500 focus:outline-none transition-colors"
                      autoFocus
                    />
                    <div className="text-xs text-card-foreground/60 mt-1">
                      Enter the recipient's wallet address
                    </div>
                  </div>

                  {/* Amount Input */}
                  <div>
                    <label className="text-sm font-medium text-card-foreground/70 mb-2 block">
                      Amount (POW)
                    </label>
                    <input
                      type="number"
                      placeholder="Enter amount"
                      value={modalTransferAmount}
                      onChange={(e) => setModalTransferAmount(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-card-foreground text-center text-lg focus:border-purple-500 focus:outline-none transition-colors"
                      min="0"
                      step="0.01"
                    />
                    <div className="text-xs text-card-foreground/60 mt-1">
                      Available:{" "}
                      {(() => {
                        switch (activeNetwork) {
                          case NetworkId.LOCALNET:
                            return localnetARC200Balance.toLocaleString();
                          case NetworkId.TESTNET:
                            return testnetARC200Balance.toLocaleString();
                          case NetworkId.MAINNET:
                            return algoARC200Balance.toLocaleString();
                          case NetworkId.VOIMAIN:
                            return voiARC200Balance.toLocaleString();
                          default:
                            return "0";
                        }
                      })()}{" "}
                      POW
                    </div>
                  </div>

                  {/* Transfer Button */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleModalTransfer}
                      disabled={
                        !activeAccount ||
                        !modalTransferAmount ||
                        !modalTransferAddress ||
                        modalTransferLoading ||
                        !algosdk.isValidAddress(modalTransferAddress) ||
                        parseFloat(modalTransferAmount) <= 0 ||
                        parseFloat(modalTransferAmount) >
                          (() => {
                            switch (activeNetwork) {
                              case NetworkId.LOCALNET:
                                return localnetARC200Balance;
                              case NetworkId.TESTNET:
                                return testnetARC200Balance;
                              case NetworkId.MAINNET:
                                return algoARC200Balance;
                              case NetworkId.VOIMAIN:
                                return voiARC200Balance;
                              default:
                                return 0;
                            }
                          })()
                      }
                      className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      {modalTransferLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Transferring...
                        </>
                      ) : (
                        <>
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
                              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                            />
                          </svg>
                          Send Transfer
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowTransferModal(false)}
                      className="px-4 py-3 text-card-foreground/60 hover:text-card-foreground/80 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}

              {/* Validation Messages - Only show when not in success state */}
              {!modalTransferSuccess && (
                <>
                  {!activeAccount && (
                    <div className="text-xs text-red-400">
                      Wallet not connected. Please connect your wallet first.
                    </div>
                  )}
                  {modalTransferAddress &&
                    !algosdk.isValidAddress(modalTransferAddress) && (
                      <div className="text-xs text-red-400">
                        Please enter a valid wallet address
                      </div>
                    )}
                  {modalTransferAmount &&
                    parseFloat(modalTransferAmount) > localnetARC200Balance && (
                      <div className="text-xs text-red-400">
                        Amount exceeds available balance
                      </div>
                    )}
                  {modalTransferAmount &&
                    parseFloat(modalTransferAmount) <= 0 && (
                      <div className="text-xs text-red-400">
                        Amount must be greater than 0
                      </div>
                    )}

                  {/* Transfer Error Message */}
                  {modalTransferError && (
                    <div className="text-xs text-red-400 bg-red-400/10 p-2 rounded">
                      {modalTransferError}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Swap Modal */}
      {isSwapEnabled && showSwapModal && (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
          <div className="bg-card border border-gray-200/20 rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-card-foreground">
                Swap BLAPU Tokens
              </h3>
              <button
                onClick={() => setShowSwapModal(false)}
                className="text-card-foreground/60 hover:text-card-foreground/80 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Swap Success Confirmation */}
              {swapSuccess && (
                <div className="p-4 bg-green-600/20 border border-green-500/30 rounded-lg">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-3">
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
                    </div>
                    <h4 className="text-lg font-semibold text-green-400 mb-2">
                      Swap Successful!
                    </h4>
                    <div className="text-sm text-green-300 space-y-1">
                      <div>
                        <span className="font-medium">From:</span>{" "}
                        {swapSuccess.fromAmount} {swapSuccess.fromToken}
                      </div>
                      <div>
                        <span className="font-medium">To:</span>{" "}
                        {swapSuccess.toAmount} {swapSuccess.toToken}
                      </div>
                      <div>
                        <span className="font-medium">Transaction ID:</span>{" "}
                        <span className="font-mono text-xs">
                          {swapSuccess.txId.slice(0, 8)}...
                          {swapSuccess.txId.slice(-6)}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-green-200 mt-3">
                      Modal will close automatically in a few seconds...
                    </div>
                  </div>
                </div>
              )}

              {/* Wallet Connection Warning */}
              {!activeAccount && (
                <div className="p-3 bg-red-600/20 border border-red-500/30 rounded-lg">
                  <div className="text-sm text-red-400">
                    <div className="flex items-center gap-2 mb-1">
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
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                      </svg>
                      <span className="font-medium">Wallet Not Connected</span>
                    </div>
                    <div className="text-xs text-red-300">
                      Please connect your wallet to perform swaps.
                    </div>
                  </div>
                </div>
              )}

              {/* Form Content - Only show when not in success state */}
              {!swapSuccess && (
                <>
                  {/* Step 1: Select From Token */}
                  {swapStep === "select-from" && (
                    <div>
                      <h4 className="text-lg font-medium mb-4">
                        Step 1: Select Token to Swap From
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {getAvailableTokensForSwap().map((bucket) => (
                          <button
                            key={bucket.id}
                            onClick={() => {
                              setSwapFromToken(bucket.id);
                              setSwapStep("select-to");
                            }}
                            className="p-4 border border-gray-600 rounded-lg hover:border-orange-500 hover:bg-orange-500/10 transition-colors text-left"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                              <span className="font-medium text-card-foreground">
                                {bucket.name}
                              </span>
                            </div>
                            <div className="text-sm text-card-foreground/70">
                              Balance:{" "}
                              {getTokenBalance(bucket.id).toLocaleString()} POW
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 2: Select To Token */}
                  {swapStep === "select-to" && (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <button
                          onClick={() => setSwapStep("select-from")}
                          className="text-sm text-card-foreground/60 hover:text-card-foreground/80 transition-colors"
                        >
                          ← Back
                        </button>
                        <h4 className="text-lg font-medium">
                          Step 2: Select Token to Swap To
                        </h4>
                        <div className="w-12"></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {getAllPowBuckets().map((bucket) => {
                          const isAllowed = isSwapAllowed(
                            swapFromToken,
                            bucket.id
                          );
                          const canSelect =
                            isAllowed && bucket.id !== swapFromToken;

                          return (
                            <button
                              key={bucket.id}
                              onClick={() => {
                                if (canSelect) {
                                  setSwapToToken(bucket.id);
                                  setSwapStep("enter-amount");
                                }
                              }}
                              disabled={!canSelect}
                              className={`p-4 border rounded-lg transition-colors text-left relative ${
                                canSelect
                                  ? "border-gray-600 hover:border-orange-500 hover:bg-orange-500/10"
                                  : "border-gray-700 bg-gray-800/50 cursor-not-allowed"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                <span className="font-medium text-card-foreground">
                                  {bucket.name}
                                </span>
                              </div>
                              <div className="text-sm text-card-foreground/70">
                                Available for swap
                              </div>
                              {!canSelect && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
                                  <div className="text-center">
                                    <div className="text-xs font-medium text-white mb-1">
                                      {bucket.id === swapFromToken
                                        ? "Same Token"
                                        : "Not Available"}
                                    </div>
                                    <div className="text-xs text-gray-300">
                                      {bucket.id === swapFromToken
                                        ? "Cannot swap to same token"
                                        : "Select a different token"}
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
                  {swapStep === "enter-amount" && (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <button
                          onClick={() => setSwapStep("select-to")}
                          className="text-sm text-card-foreground/60 hover:text-card-foreground/80 transition-colors"
                        >
                          ← Back
                        </button>
                        <h4 className="text-lg font-medium">
                          Step 3: Enter Swap Amount
                        </h4>
                        <div className="w-12"></div>
                      </div>

                      <div className="mb-4 p-3 bg-orange-600/20 rounded-lg">
                        <div className="text-sm text-card-foreground/80">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                            <span className="font-medium">
                              Swapping from {getBucketById(swapFromToken)?.name}
                            </span>
                          </div>
                          <div className="text-lg font-semibold text-orange-400">
                            Available:{" "}
                            {getTokenBalance(swapFromToken).toLocaleString()}{" "}
                            POW
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-card-foreground/70 mb-2 block">
                          Amount to Swap (POW)
                        </label>
                        <input
                          type="number"
                          placeholder="Enter amount"
                          value={swapAmount}
                          onChange={(e) => setSwapAmount(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-card-foreground text-center text-lg focus:border-orange-500 focus:outline-none transition-colors"
                          min="0"
                          step="0.01"
                        />
                        <div className="text-xs text-card-foreground/60 mt-1">
                          You will receive approximately{" "}
                          {swapAmount ? parseFloat(swapAmount).toFixed(2) : "0"}{" "}
                          POW in {getBucketById(swapToToken)?.name}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Confirm */}
                  {swapStep === "confirm" && (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <button
                          onClick={() => setSwapStep("enter-amount")}
                          className="text-sm text-card-foreground/60 hover:text-card-foreground/80 transition-colors"
                        >
                          ← Back
                        </button>
                        <h4 className="text-lg font-medium">
                          Step 4: Confirm Swap
                        </h4>
                        <div className="w-12"></div>
                      </div>

                      <div className="mb-6 p-4 bg-orange-600/20 rounded-lg max-w-md mx-auto">
                        <div className="text-sm text-card-foreground/80 space-y-2">
                          <div className="flex justify-between">
                            <span>From Token:</span>
                            <span className="font-medium text-orange-400">
                              {getBucketById(swapFromToken)?.name}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>To Token:</span>
                            <span className="font-medium text-orange-400">
                              {getBucketById(swapToToken)?.name}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Amount:</span>
                            <span className="font-medium text-orange-400">
                              {swapAmount} POW
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Estimated Output:</span>
                            <span className="font-medium text-orange-400">
                              {swapAmount
                                ? parseFloat(swapAmount).toFixed(2)
                                : "0"}{" "}
                              POW
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  {swapStep === "enter-amount" && (
                    <div className="mt-6 flex justify-center">
                      <button
                        onClick={() => setSwapStep("confirm")}
                        disabled={
                          !swapAmount ||
                          parseFloat(swapAmount) <= 0 ||
                          parseFloat(swapAmount) >
                            getTokenBalance(swapFromToken)
                        }
                        className="px-8 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                      >
                        Continue
                      </button>
                    </div>
                  )}

                  {/* Swap Button - Show in final step */}
                  {swapStep === "confirm" && (
                    <div className="mt-6 flex justify-center">
                      <button
                        onClick={handleSwap}
                        disabled={swapLoading}
                        className="px-8 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
                      >
                        {swapLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Swapping...
                          </>
                        ) : (
                          "Execute Swap"
                        )}
                      </button>
                    </div>
                  )}

                  {/* Swap Info */}
                  <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-sm text-card-foreground/70">
                      <strong>Note:</strong> Swaps allow you to exchange POW
                      tokens between different networks and token types. The
                      exchange rate is 1:1 for this demo. In a real
                      implementation, rates would be determined by market
                      conditions.
                    </p>
                  </div>
                </>
              )}

              {/* Validation Messages - Only show when not in success state */}
              {!swapSuccess && (
                <>
                  {!activeAccount && (
                    <div className="text-xs text-red-400">
                      Wallet not connected. Please connect your wallet first.
                    </div>
                  )}
                  {swapAmount &&
                    parseFloat(swapAmount) > getTokenBalance(swapFromToken) && (
                      <div className="text-xs text-red-400">
                        Amount exceeds available balance
                      </div>
                    )}
                  {swapAmount && parseFloat(swapAmount) <= 0 && (
                    <div className="text-xs text-red-400">
                      Amount must be greater than 0
                    </div>
                  )}

                  {/* Swap Error Message */}
                  {swapError && (
                    <div className="text-xs text-red-400 bg-red-400/10 p-2 rounded">
                      {swapError}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Network Settings Modal */}
      <NetworkSettingsModal
        open={showNetworkSettingsModal}
        onOpenChange={setShowNetworkSettingsModal}
        networkSettings={networkSettings}
        onNetworkSettingsChange={setNetworkSettings}
        onRefreshBalances={refreshAllBalances}
      />
    </PageLayout>
  );
};

export default Wallet;
