import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useWallet } from "@txnlab/use-wallet-react";
import algosdk from "algosdk";
import { CONTRACT, abi } from "ulujs";
import BigNumber from "bignumber.js";
import { AirdropEntry, AirdropIndexEntry } from "@/types/airdrop";
import { convertToMountainTime } from "@/utils/timezone";
import { convertToUTCTime } from "@/pages/Airdrop";

// Global constant for the target airdrop ID
export const TARGET_AIRDROP_ID = "000-pow";

// Utility function to convert base64 to Uint8Array (browser-compatible)
const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

interface AccountAirdropProps {
  address: string;
  onDataLoaded?: (data: AirdropEntry | null) => void;
  showClaimButtons?: boolean;
}

const AccountAirdrop: React.FC<AccountAirdropProps> = ({
  address,
  onDataLoaded,
  showClaimButtons = true,
}) => {
  const {
    activeNetwork,
    activeAccount,
    algodClient,
    signTransactions,
    activeWalletAddresses,
  } = useWallet();
  const [airdropData, setAirdropData] = useState<AirdropEntry | null>(null);
  const [currentAirdropInfo, setCurrentAirdropInfo] =
    useState<AirdropIndexEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClaimLoading, setIsClaimLoading] = useState<{
    voi: boolean;
    algo: boolean;
  }>({ voi: false, algo: false });
  const [isAirdropOpen, setIsAirdropOpen] = useState(false);
  const [timeUntilOpen, setTimeUntilOpen] = useState<string>("");
  const [timeUntilEnd, setTimeUntilEnd] = useState<string>("");
  const [hasClaimedThisSession, setHasClaimedThisSession] = useState(false);
  const { toast } = useToast();

  // Add network checking functions
  const isVoiNetwork = () => activeNetwork.toLowerCase().includes("voi");
  const isAlgoNetwork = () =>
    activeNetwork.toLowerCase().includes("mainnet") ||
    activeNetwork.toLowerCase().includes("algo");

  const isAddressInWallet = (address: string) => {
    return activeWalletAddresses?.includes(address);
  };

  // Function to load spending allowance and update airdrop amounts
  const loadSpendingAllowance = async (
    airdropEntry: AirdropEntry,
    airdropInfo: AirdropIndexEntry
  ) => {
    if (!algodClient || !airdropEntry) return airdropEntry;

    try {
      const updatedEntry = { ...airdropEntry };

      // Store original amounts before they get overwritten
      const originalVoi = airdropEntry.Voi;
      const originalAlgo = airdropEntry.Algo;
      const originalTotal = airdropEntry.Total;

      // Check VOI network allowance
      if (airdropEntry.Voi > 0) {
        const voiTokenId = airdropInfo.token_ids.Voi;
        const ciTokenVoi = new CONTRACT(
          voiTokenId,
          algodClient,
          undefined,
          abi.nt200,
          {
            addr: address,
            sk: new Uint8Array(),
          }
        );

        const voiAllowanceR = await ciTokenVoi.arc200_allowance(
          airdropInfo.airdrop_address,
          address
        );

        if (voiAllowanceR.success) {
          // Use BigNumber for precise calculation
          const voiAllowance = new BigNumber(voiAllowanceR.returnValue)
            .dividedBy(10 ** 6)
            .toNumber();
          if (voiAllowance < airdropEntry.Voi) {
            updatedEntry.Voi = voiAllowance;
            console.log(
              `VOI allowance: ${voiAllowance} (original: ${airdropEntry.Voi})`
            );
          }
        }
      }

      // Check Algorand network allowance
      if (airdropEntry.Algo > 0) {
        const algoTokenId = airdropInfo.token_ids.Algorand;
        const ciTokenAlgo = new CONTRACT(
          algoTokenId,
          algodClient,
          undefined,
          abi.nt200,
          {
            addr: address,
            sk: new Uint8Array(),
          }
        );

        const algoAllowanceR = await ciTokenAlgo.arc200_allowance(
          airdropInfo.airdrop_address,
          address
        );

        if (algoAllowanceR.success) {
          // Use BigNumber for precise calculation
          const algoAllowance = new BigNumber(algoAllowanceR.returnValue)
            .dividedBy(10 ** 6)
            .toNumber();
          if (algoAllowance < airdropEntry.Algo) {
            updatedEntry.Algo = algoAllowance;
            console.log(
              `Algorand allowance: ${algoAllowance} (original: ${airdropEntry.Algo})`
            );
          }
        }
      }

      // Recalculate total using BigNumber for precision
      updatedEntry.Total = new BigNumber(updatedEntry.Voi)
        .plus(updatedEntry.Algo)
        .toNumber();

      // Store original amounts in the updated entry for reference
      (updatedEntry as any).originalVoi = originalVoi;
      (updatedEntry as any).originalAlgo = originalAlgo;
      (updatedEntry as any).originalTotal = originalTotal;

      return updatedEntry;
    } catch (error) {
      console.error("Error loading spending allowance:", error);
      return airdropEntry; // Return original entry if allowance check fails
    }
  };

  useEffect(() => {
    const fetchAirdropData = async () => {
      if (!address) return;

      setIsLoading(true);
      setError(null);
      try {
        // First, fetch the index.json to get available airdrops
        const indexResponse = await fetch(
          "https://nautilusoss.github.io/airdrop/index.json"
        );
        if (!indexResponse.ok) {
          throw new Error("Failed to fetch airdrop index");
        }
        const indexData = await indexResponse.json();

        // Find the POW airdrop
        const powAirdrop = indexData.find(
          (airdrop: AirdropIndexEntry) => airdrop.id === TARGET_AIRDROP_ID
        );
        if (!powAirdrop) {
          throw new Error("POW airdrop not found in index");
        }
        setCurrentAirdropInfo(powAirdrop);

        // Now fetch the specific airdrop data
        const response = await fetch(
          `https://nautilusoss.github.io/airdrop/data/${powAirdrop.id}.json`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch airdrop data");
        }
        const data = await response.json();

        // Find the specific address in the airdrop data
        const matchingEntry = data.find(
          (entry: AirdropEntry) =>
            entry.Address.toLowerCase() === address.toLowerCase()
        );

        if (matchingEntry) {
          // Load spending allowance and update amounts
          const updatedEntry = await loadSpendingAllowance(
            matchingEntry,
            powAirdrop
          );
          setAirdropData(updatedEntry);
          onDataLoaded?.(updatedEntry);
        } else {
          setAirdropData(null);
          onDataLoaded?.(null);
        }
      } catch (err) {
        console.error("Error fetching airdrop data:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
        onDataLoaded?.(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAirdropData();
  }, [address, onDataLoaded, algodClient]);

  useEffect(() => {
    const updateCountdown = () => {
      if (!currentAirdropInfo) return;

      const now = new Date().getTime();
      //const startTime = convertToMountainTime(currentAirdropInfo.start_date).getTime();
      const startTime = convertToUTCTime("2025-06-24").getTime();
      const endTime =
        startTime + parseInt(currentAirdropInfo.period) * 24 * 60 * 60 * 1000;

      const timeLeft = startTime - now;
      const timeLeftUntilEnd = endTime - now;

      if (timeLeft <= 0) {
        setIsAirdropOpen(true);
        setTimeUntilOpen("");
      } else {
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        setTimeUntilOpen(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        setIsAirdropOpen(false);
      }

      if (timeLeftUntilEnd > 0) {
        const endDays = Math.floor(timeLeftUntilEnd / (1000 * 60 * 60 * 24));
        const endHours = Math.floor(
          (timeLeftUntilEnd % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const endMinutes = Math.floor(
          (timeLeftUntilEnd % (1000 * 60 * 60)) / (1000 * 60)
        );
        const endSeconds = Math.floor((timeLeftUntilEnd % (1000 * 60)) / 1000);

        setTimeUntilEnd(
          `${endDays}d ${endHours}h ${endMinutes}m ${endSeconds}s`
        );
      } else {
        setTimeUntilEnd("Ended");
      }
    };

    const timer = setInterval(updateCountdown, 1000);
    updateCountdown();

    return () => clearInterval(timer);
  }, [currentAirdropInfo]);

  const handleClaim = async (network: "voi" | "algo", amount: number) => {
    if (!isAirdropOpen) {
      toast({
        variant: "destructive",
        description: "Airdrop has not started yet",
        duration: 3000,
      });
      return;
    }
    if (!activeAccount) {
      toast({
        variant: "destructive",
        description: "Please connect your wallet first",
        duration: 3000,
      });
      return;
    }
    if (!isAddressInWallet(address)) {
      toast({
        variant: "destructive",
        description: "Please connect the wallet that owns this address",
        duration: 3000,
      });
      return;
    }
    if (!currentAirdropInfo) {
      toast({
        variant: "destructive",
        description: "Airdrop information not available",
        duration: 3000,
      });
      return;
    }

    const amountBI = BigInt(
      new BigNumber(amount).multipliedBy(10 ** 6).toFixed(0)
    );
    setIsClaimLoading((prev) => ({
      ...prev,
      [network]: true,
    }));

    try {
      const tokenId =
        currentAirdropInfo.token_ids[network === "algo" ? "Algorand" : "Voi"];
      const assetId =
        currentAirdropInfo.asset_ids[network === "algo" ? "Algorand" : "Voi"];

      const ciToken = new CONTRACT(tokenId, algodClient, undefined, abi.nt200, {
        addr: activeAccount.address,
        sk: new Uint8Array(),
      });

      const arc200_allowanceR = await ciToken.arc200_allowance(
        currentAirdropInfo.airdrop_address,
        activeAccount.address
      );
      if (!arc200_allowanceR.success) {
        throw new Error(arc200_allowanceR.error);
      }
      const arc200_allowance = arc200_allowanceR.returnValue;

      if (arc200_allowance < amountBI) {
        toast({
          variant: "default",
          description: "Airdrop already claimed",
          duration: 3000,
        });
        return;
      }

      if (currentAirdropInfo.type === "asset_id_and_token_id") {
        const ci = new CONTRACT(tokenId, algodClient, undefined, abi.custom, {
          addr: address,
          sk: new Uint8Array(),
        });

        const builder = {
          token: new CONTRACT(
            tokenId,
            algodClient,
            undefined,
            abi.nt200,
            {
              addr: address,
              sk: new Uint8Array(),
            },
            true,
            false,
            true
          ),
        };

        const buildN = [];

        // Balance check and transfer setup
        {
          const balanceAirdrop = await ciToken.arc200_balanceOf(
            currentAirdropInfo.airdrop_address
          );
          const balanceRecipient = await ciToken.arc200_balanceOf(address);

          const owner = currentAirdropInfo.airdrop_address;
          const spender = address;

          const txnO = (
            await builder.token.arc200_transferFrom(owner, spender, amountBI)
          ).obj;
          const optin = {
            xaid: Number(assetId),
            snd: address,
            arcv: address,
            foreignAssets: [assetId],
            accounts: [
              currentAirdropInfo.airdrop_address,
              algosdk.getApplicationAddress(tokenId),
            ],
          };
          buildN.push({
            ...txnO,
            ...optin,
            note: new TextEncoder().encode(
              `arc200_transferFrom spender: ${spender} owner: ${owner} amount: ${amount}`
            ),
          });
        }

        // Withdraw
        {
          const txnO = (await builder.token.withdraw(amountBI)).obj;
          buildN.push({
            ...txnO,
            note: new TextEncoder().encode(
              `withdraw pow: arc200 -> standard asset`
            ),
          });
        }

        ci.setPaymentAmount(1e5);
        ci.setFee(3000);
        ci.setBeaconId(tokenId);
        ci.setBeaconSelector("fb6eb573");
        ci.setEnableGroupResourceSharing(true);
        ci.setExtraTxns(buildN);

        const customR = await ci.custom();
        if (!customR.success) {
          throw new Error(customR.error);
        }

        const stxns = await signTransactions(
          customR.txns.map((txn: string) => base64ToUint8Array(txn))
        );

        const { txId } = await algodClient.sendRawTransaction(stxns).do();
        console.log("Transaction successful:", txId);

        // Update the airdrop data to reflect the claimed amount
        setAirdropData((prevData) => {
          if (!prevData) return prevData;

          const updatedData = { ...prevData };
          if (network === "voi") {
            updatedData.Voi = 0; // Set to 0 since it was just claimed
          } else if (network === "algo") {
            updatedData.Algo = 0; // Set to 0 since it was just claimed
          }

          // Recalculate total
          updatedData.Total = new BigNumber(updatedData.Voi)
            .plus(updatedData.Algo)
            .toNumber();

          return updatedData;
        });

        // Set claimed state for this session
        setHasClaimedThisSession(true);

        // Get the appropriate explorer URL based on network
        const explorerUrl =
          network === "voi"
            ? `https://voiager.xyz/transaction/${txId}`
            : `https://allo.info/tx/${txId}`;

        toast({
          description: (
            <div className="flex flex-col gap-2">
              <span>
                Successfully claimed {amount} POW on {network} network
              </span>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 underline text-sm"
              >
                View in Explorer →
              </a>
            </div>
          ),
          duration: 5000,
        });
      } else {
        throw new Error("Token ID airdrop not implemented yet");
      }
    } catch (error) {
      console.error("Claim error:", error);
      toast({
        variant: "destructive",
        description:
          error instanceof Error ? error.message : "Failed to claim POW",
        duration: 3000,
      });
    } finally {
      setIsClaimLoading((prev) => ({
        ...prev,
        [network]: false,
      }));
    }
  };

  const ClaimButton = ({
    network,
    amount,
  }: {
    network: "voi" | "algo";
    amount: number;
  }) => (
    <Button
      className="mt-auto text-lg px-6 py-3 rounded-xl shadow-lg font-bold bg-[#1EAEDB] hover:bg-[#31BFEC] text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={
        isLoading ||
        isClaimLoading[network] ||
        !isAddressInWallet(address) ||
        !isAirdropOpen ||
        (network === "voi" ? !isVoiNetwork() : !isAlgoNetwork())
      }
      onClick={() => handleClaim(network, amount)}
      title={
        !isAddressInWallet(address) ? "Please connect the recipient wallet" : ""
      }
    >
      {isClaimLoading[network]
        ? "Claiming..."
        : !isAddressInWallet(address)
        ? "Connect Wallet"
        : network === "voi" && !isVoiNetwork()
        ? "Switch to VOI Network"
        : network === "algo" && !isAlgoNetwork()
        ? "Switch to Algorand Network"
        : !isAirdropOpen
        ? `Claim in ${timeUntilOpen}`
        : "Claim POW"}
    </Button>
  );

  if (isLoading) {
    return (
      <div className="text-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-[#1EAEDB] border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-lg">Loading airdrop data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md w-full">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (!airdropData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center max-w-md w-full">
        <p className="text-yellow-700">No airdrop found for this address</p>
      </div>
    );
  }

  // Check if airdrop has been fully claimed (both networks have 0 allowance)
  const isFullyClaimed =
    (airdropData.Voi === 0 && airdropData.Algo === 0) || hasClaimedThisSession;

  if (isFullyClaimed) {
    return (
      <div className="w-full max-w-3xl">
        <div className="bg-card border border-green-200/20 dark:border-green-400/20 rounded-2xl p-8 shadow-[0_4px_20px_-4px_rgba(34,197,94,0.1)] dark:shadow-[0_4px_20px_-4px_rgba(74,222,128,0.15)] text-center">
          <div className="mb-4">
            <svg
              className="w-16 h-16 text-green-500 dark:text-green-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-green-700 dark:text-green-300 mb-2">
            Airdrop Claimed!
          </h2>
          <p className="text-green-600 dark:text-green-400 mb-4">
            You have successfully claimed your POW airdrop on all networks.
          </p>
          <div className="bg-background border border-green-200/30 dark:border-green-400/30 rounded-xl p-4">
            <p className="text-sm text-green-600 dark:text-green-400">
              Original airdrop amount:{" "}
              {(airdropData as any).originalTotal?.toFixed(6) ||
                airdropData.Total.toFixed(6)}{" "}
              POW
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="bg-card rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(30,174,219,0.1)] border border-border/50 hover:shadow-[0_8px_30px_-4px_rgba(30,174,219,0.2)] transition-shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Total Rewards</h2>
        <div className="flex flex-col gap-2">
          {airdropData.Voi > 0 && (
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">VOI Network</span>
              <span className="font-semibold">
                {airdropData.Voi.toFixed(6)} POW
              </span>
            </div>
          )}
          {airdropData.Algo > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Algorand Network</span>
              <span className="font-semibold">
                {airdropData.Algo.toFixed(6)} POW
              </span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-border/50">
            <span className="text-gray-600">Total Rewards</span>
            <span className="font-semibold">
              {airdropData.Total.toFixed(6)} POW
            </span>
          </div>
        </div>
      </div>

      {showClaimButtons && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {airdropData.Voi > 0 && (
            <div className="bg-card rounded-2xl p-8 shadow-[0_4px_20px_-4px_rgba(30,174,219,0.1)] border border-border/50 hover:shadow-[0_8px_30px_-4px_rgba(30,174,219,0.2)] transition-all hover:border-[#1EAEDB]/20 flex flex-col">
              <h2 className="text-2xl font-semibold mb-3">Voi Network</h2>
              <p className="text-3xl font-bold text-[#1EAEDB] mb-6">
                {airdropData.Voi.toFixed(6)} POW
              </p>
              <ClaimButton network="voi" amount={airdropData.Voi} />
            </div>
          )}
          {airdropData.Algo > 0 && (
            <div className="bg-card rounded-xl p-8 shadow-md border border-border flex flex-col">
              <h2 className="text-2xl font-semibold mb-3">Algorand Network</h2>
              <p className="text-3xl font-bold text-[#1EAEDB] mb-6">
                {airdropData.Algo.toFixed(6)} POW
              </p>
              <ClaimButton network="algo" amount={airdropData.Algo} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AccountAirdrop;
