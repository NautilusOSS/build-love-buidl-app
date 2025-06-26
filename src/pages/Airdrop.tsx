import React, { useState, useEffect, useRef, act, useMemo } from "react";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { useWallet } from "@txnlab/use-wallet-react";
import algosdk from "algosdk";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import ReactConfetti from "react-confetti";
import { ExternalLink, Play } from "lucide-react";
import VideoModal from "@/components/VideoModal";
import ReactDOM from "react-dom";
import { CONTRACT, abi } from "ulujs";
import BigNumber from "bignumber.js";
import AccountAirdrop from "@/components/AccountAirdrop";
import { AirdropEntry, AirdropIndexEntry } from "@/types/airdrop";
import { TARGET_AIRDROP_ID } from "@/components/AccountAirdrop";
import { Swap } from "@vestigefi/widgets";

// Function to calculate APR based on 24h volume, liquidity, fee bps, and POW price
const calculateAPR = (
  volume24h: number,
  liquidity: number,
  feeBps: number,
  powPrice: number = 1
): number => {
  if (liquidity === 0) return 0;

  // Convert fee from basis points to decimal (e.g., 100 bps = 0.01)
  const feeRate = feeBps / 10000;

  // Calculate daily fee revenue in POW
  const dailyFeeRevenuePOW = volume24h * feeRate;

  // Convert fee revenue from POW to USD
  const dailyFeeRevenueUSD = dailyFeeRevenuePOW * powPrice;

  // Calculate annual fee revenue (assuming 365 days)
  const annualFeeRevenue = dailyFeeRevenueUSD * 365;

  // Calculate APR as (annual revenue / liquidity) * 100
  const apr = (annualFeeRevenue / liquidity) * 100;

  return apr > 1000 ? 0 : apr;
};

// Function to extract fee bps from fee string
const extractFeeBps = (feeString: string): number => {
  // Handle percentage format like "1%" or "0.3%"
  const match = feeString.match(/(\d+(?:\.\d+)?)%/);
  if (match) {
    const percentage = parseFloat(match[1]);
    return percentage * 100; // Convert to basis points
  }
  return 0;
};

// Constants
const POW_ASSET_ID = 2994233666;

// Utility function to convert date to UTC time
export const convertToUTCTime = (dateString: string): Date => {
  // Create a date object from the date string at midnight UTC
  const date = new Date(dateString + "T00:00:00Z");

  // Add 20 hours to the UTC time
  date.setUTCHours(date.getUTCHours() + 3);

  return date;
};

// Utility function to convert base64 to Uint8Array (browser-compatible)
const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// DropdownPortal: renders children in a portal at the document body
const DropdownPortal: React.FC<{
  anchorRef: React.RefObject<HTMLElement> | React.MutableRefObject<HTMLElement>;
  children: React.ReactNode;
}> = ({ anchorRef, children }) => {
  const [style, setStyle] = React.useState<React.CSSProperties>({});

  React.useLayoutEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setStyle({
        position: "absolute",
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        zIndex: 9999,
      });
    }
  }, [anchorRef.current]);

  return ReactDOM.createPortal(
    <div style={style}>{children}</div>,
    document.body
  );
};

const Airdrop: React.FC = () => {
  const {
    activeNetwork,
    activeAccount,
    algodClient,
    signTransactions,
    activeWalletAddresses,
    wallets,
  } = useWallet();
  const [airdropData, setAirdropData] = useState<AirdropEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipientsData, setRecipientsData] = useState<AirdropEntry[]>([]);
  const [addressInput, setAddressInput] = useState("");
  const [envoiNameInput, setEnvoiNameInput] = useState("");
  const [algoNameInput, setAlgoNameInput] = useState("");
  const [isResolvingEnvoi, setIsResolvingEnvoi] = useState(false);
  const [isResolvingAlgo, setIsResolvingAlgo] = useState(false);
  const [searchResults, setSearchResults] = useState<
    Array<{
      name: string;
      address: string;
      avatar?: string;
      metadata?: { avatar?: string };
    }>
  >([]);
  const [algoSearchResults, setAlgoSearchResults] = useState<
    Array<{
      name: string;
      address: string;
      avatar?: string;
      metadata?: { avatar?: string };
    }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAlgoSearching, setIsAlgoSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAlgoDropdown, setShowAlgoDropdown] = useState(false);
  const { recipients } = useParams<{ recipients: string }>();
  const recipientAddresses = recipients?.split(",");
  const { toast } = useToast();
  const [isClaimLoading, setIsClaimLoading] = useState<{
    [key: string]: { voi: boolean; algo: boolean };
  }>({});
  const [isAirdropOpen, setIsAirdropOpen] = useState(false);
  const [timeUntilOpen, setTimeUntilOpen] = useState<string>("");
  const [timeUntilEnd, setTimeUntilEnd] = useState<string>("");
  const [isAddressValid, setIsAddressValid] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [eligibilityStatus, setEligibilityStatus] = useState<{
    isEligible?: boolean;
    amount?: number;
    message?: string;
  }>({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [selectedAlgoAvatar, setSelectedAlgoAvatar] = useState<string | null>(
    null
  );
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolvedAlgoAddress, setResolvedAlgoAddress] = useState<string | null>(
    null
  );
  const envoiInputRef = useRef<HTMLInputElement>(null);
  const algoInputRef = useRef<HTMLInputElement>(null);
  const [isWalletChecking, setIsWalletChecking] = useState(false);
  const [isAddressChecking, setIsAddressChecking] = useState(false);
  const [isEnvoiChecking, setIsEnvoiChecking] = useState(false);
  const [isAlgoChecking, setIsAlgoChecking] = useState(false);
  const [lastChecker, setLastChecker] = useState<
    "wallet" | "address" | "envoi" | "algo" | null
  >(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [airdropIndexData, setAirdropIndexData] = useState<AirdropIndexEntry[]>(
    []
  );
  const [currentAirdropInfo, setCurrentAirdropInfo] =
    useState<AirdropIndexEntry | null>(null);
  const [progressData, setProgressData] = useState<{
    voi: {
      claimed: number;
      remaining: number;
      total: number;
      percentage: number;
    };
    algo: {
      claimed: number;
      remaining: number;
      total: number;
      percentage: number;
    };
    overall: {
      claimed: number;
      remaining: number;
      total: number;
      percentage: number;
    };
  }>({
    voi: { claimed: 0, remaining: 0, total: 0, percentage: 0 },
    algo: { claimed: 0, remaining: 0, total: 0, percentage: 0 },
    overall: { claimed: 0, remaining: 0, total: 0, percentage: 0 },
  });
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // Trading section state
  const [tradingData, setTradingData] = useState<any[]>([]);
  const [isLoadingTrading, setIsLoadingTrading] = useState(false);
  const [tradingError, setTradingError] = useState<string | null>(null);
  const [voiPrice, setVoiPrice] = useState<string>("0");
  const [powTradingPairs, setPowTradingPairs] = useState<any[]>([]);

  // Vestige Labs API state for Algorand pools
  const [vestigePools, setVestigePools] = useState<any[]>([]);
  const [isLoadingVestige, setIsLoadingVestige] = useState(false);
  const [vestigeError, setVestigeError] = useState<string | null>(null);
  const [powVestigePools, setPowVestigePools] = useState<any[]>([]);

  // State for POW USD price from Vestige Labs
  const [powUsdPrice, setPowUsdPrice] = useState<number | null>(null);
  const [isLoadingPowPrice, setIsLoadingPowPrice] = useState(false);

  // Check for missing localStorage keys and show video modal
  useEffect(() => {
    const checkLocalStorageKeys = () => {
      const requiredKeys = ["theme", "currentSlippage", "degenMode"];
      const missingKeys = requiredKeys.filter(
        (key) => !localStorage.getItem(key)
      );

      // Show video modal if any required keys are missing
      if (missingKeys.length > 0) {
        setIsVideoModalOpen(true);
      }
    };

    checkLocalStorageKeys();
  }, []);

  // const breadCrumb = [
  //   {
  //     to: "/",
  //     label: "[POW]",
  //     // First [POW] always links home
  //   },
  //   ...(recipientAddresses
  //     ? [
  //         {
  //           to: "/airdrop",
  //           label: "Airdrop",
  //         },
  //         {
  //           label:
  //             recipientAddresses.length > 1
  //               ? `Recipients (${recipientAddresses.length})`
  //               : `${recipientAddresses[0].slice(
  //                   0,
  //                   5
  //                 )}...${recipientAddresses[0].slice(-5)}`,
  //           isCurrentPage: true,
  //         },
  //       ]
  //     : [
  //         {
  //           label: "Airdrop",
  //           isCurrentPage: true,
  //         },
  //       ]),
  // ];

  // Add network checking functions
  const isVoiNetwork = () => activeNetwork.toLowerCase().includes("voi");
  const isAlgoNetwork = () =>
    activeNetwork.toLowerCase().includes("mainnet") ||
    activeNetwork.toLowerCase().includes("algo");

  const isAddressInWallet = (address: string) => {
    return activeWalletAddresses?.includes(address);
  };

  useEffect(() => {
    // Reset airdrop data when recipients change
    setAirdropData([]);
    setRecipientsData([]);

    const fetchAirdropData = async () => {
      console.log("Starting fetch operation"); // Debug log
      setIsLoading(true);
      setError(null);
      try {
        // First, fetch the index.json to get available airdrops
        const indexResponse = await fetch(
          "https://nautilusoss.github.io/airdrop/index.json"
        );
        console.log("Index fetch response received:", indexResponse.ok); // Debug log
        if (!indexResponse.ok) {
          throw new Error("Failed to fetch airdrop index");
        }
        const indexData = await indexResponse.json();
        console.log("Index data parsed successfully"); // Debug log
        setAirdropIndexData(indexData);

        // Find the POW airdrop (id: "000-pow")
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
        console.log("Airdrop data fetch response received:", response.ok); // Debug log
        if (!response.ok) {
          throw new Error("Failed to fetch airdrop data");
        }
        const data = await response.json();
        console.log("Airdrop data parsed successfully"); // Debug log
        setAirdropData(data);

        // Find recipient data if addresses are provided
        if (recipientAddresses) {
          const foundRecipients = recipientAddresses
            .map((address) =>
              data.find(
                (entry: AirdropEntry) =>
                  entry.Address.toLowerCase() === address.toLowerCase()
              )
            )
            .filter((entry): entry is AirdropEntry => entry !== undefined);
          setRecipientsData(foundRecipients);
        }
      } catch (err) {
        console.error("Error in fetch operation:", err); // Debug log
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        console.log("Setting isLoading to false"); // Debug log
        setIsLoading(false);
      }
    };

    fetchAirdropData();
  }, [recipients]); // Changed dependency to recipients instead of recipientAddresses

  // Fetch progress data when airdrop data is loaded
  useEffect(() => {
    if (currentAirdropInfo && airdropData.length > 0 && algodClient) {
      fetchProgressData();
    }
  }, [currentAirdropInfo, airdropData, algodClient]);

  console.log("currentAirdropInfo", currentAirdropInfo);

  useEffect(() => {
    const updateCountdown = () => {
      if (!currentAirdropInfo) return;

      const now = new Date().getTime();
      //const startTime = convertToUTCTime(currentAirdropInfo.start_date).getTime();
      const startTime = convertToUTCTime("2025-06-24").getTime();
      const endTime =
        startTime + parseInt(currentAirdropInfo.period) * 24 * 60 * 60 * 1000; // Convert period to milliseconds

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

      // Calculate time until end
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
    updateCountdown(); // Initial call

    return () => clearInterval(timer);
  }, [currentAirdropInfo]); // Add currentAirdropInfo as dependency

  // Add window resize handler
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        // Use Clipboard API if available and in secure context
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand("copy");
        } finally {
          textArea.remove();
        }
      }
      toast({
        description: "Address copied to clipboard",
        duration: 2000,
      });
    } catch (err) {
      console.error("Failed to copy text: ", err);
      toast({
        variant: "destructive",
        description: "Failed to copy address",
        duration: 2000,
      });
    }
  };

  const handleClaim = async (
    network: "voi" | "algo",
    amount: number,
    recipientAddress: string
  ) => {
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
    const amountBI = BigInt(
      new BigNumber(amount).multipliedBy(10 ** 6).toFixed(0)
    );
    setIsClaimLoading((prev) => ({
      ...prev,
      [recipientAddress]: {
        ...prev[recipientAddress],
        [network]: true,
      },
    }));
    try {
      console.log("currentAirdropInfo", currentAirdropInfo.token_ids);
      const tokenId =
        currentAirdropInfo.token_ids[network === "algo" ? "Algorand" : "Voi"];
      const assetId =
        currentAirdropInfo.asset_ids[network === "algo" ? "Algorand" : "Voi"];
      console.log("tokenId", tokenId);
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
      console.log("arc200_allowance", arc200_allowance);
      if (arc200_allowance < amountBI) {
        toast({
          variant: "default",
          description: "Airdrop already claimed",
          duration: 3000,
        });
        return;
      }
      // check
      // TODO: Implement actual claim logic here
      console.log(
        `Claiming ${amount} POW on ${network} network for ${recipientAddress}`
      );
      // ------------------------------------------------------------
      // TODO: Implement actual claim logic here
      // ------------------------------------------------------------
      //const ci = new CONTRACT
      //here
      if (currentAirdropInfo.type === "asset_id_and_token_id") {
        // set beacon if algorand

        const ci = new CONTRACT(tokenId, algodClient, undefined, abi.custom, {
          addr: activeAccount.address,
          sk: new Uint8Array(),
        });
        const builder = {
          token: new CONTRACT(
            tokenId,
            algodClient,
            undefined,
            abi.nt200,
            {
              addr: activeAccount.address,
              sk: new Uint8Array(),
            },
            true,
            false,
            true
          ),
        };
        const buildN = [];
        // balance of airdrop account
        // transferFrom airdrop account to recipient
        {
          const balanceAirdrop = await ciToken.arc200_balanceOf(
            currentAirdropInfo.airdrop_address
          );
          console.log("balanceAirdrop", balanceAirdrop);
          const balanceRecipient = await ciToken.arc200_balanceOf(
            activeAccount.address
          );
          console.log("balanceRecipient", balanceRecipient);

          const owner = currentAirdropInfo.airdrop_address;
          const spender = activeAccount.address;
          console.log({
            arc200_transferFrom: { owner, spender, amount: amountBI },
          });
          const txnO = (
            await builder.token.arc200_transferFrom(owner, spender, amountBI)
          ).obj;
          const optin = {
            // extra args
            xaid: Number(assetId),
            snd: activeAccount.address,
            arcv: activeAccount.address,
            // asset holdings
            foreignAssets: [assetId],
            accounts: [
              currentAirdropInfo.airdrop_address,
              algosdk.getApplicationAddress(tokenId),
            ],
          };
          buildN.push({
            ...txnO,
            ...optin,
          });
        }
        // withdraw
        {
          const txnO = (await builder.token.withdraw(amountBI)).obj;
          buildN.push(txnO);
        }
        console.log("buildN", buildN);
        ci.setPaymentAmount(1e5);
        ci.setFee(3000);
        ci.setBeaconId(tokenId);
        ci.setBeaconSelector("fb6eb573"); // touch()uint64
        ci.setEnableGroupResourceSharing(true);
        ci.setExtraTxns(buildN);
        const customR = await ci.custom();
        console.log("customR", customR);
        if (!customR.success) {
          throw new Error(customR.error);
        }
        const stxns = await signTransactions(
          customR.txns.map((txn: string) => base64ToUint8Array(txn))
        );
        console.log("stxns", stxns);
        const { txId } = await algodClient.sendRawTransaction(stxns).do();
        console.log("txId", txId);
      } else {
        throw new Error("Token ID airdrop not implemented yet");
      }
      // ------------------------------------------------------------
      toast({
        description: `Successfully claimed ${amount} POW on ${network} network`,
        duration: 3000,
      });
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
        [recipientAddress]: {
          ...prev[recipientAddress],
          [network]: false,
        },
      }));
    }
  };

  const ClaimButton = ({
    network,
    amount,
    address,
  }: {
    network: "voi" | "algo";
    amount: number;
    address: string;
  }) => (
    <Button
      className="mt-auto text-lg px-6 py-3 rounded-xl shadow-lg font-bold bg-[#1EAEDB] hover:bg-[#31BFEC] text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={
        isLoading ||
        (isClaimLoading[address]?.[network] ?? false) ||
        !isAddressInWallet(address) ||
        !isAirdropOpen ||
        (network === "voi" ? !isVoiNetwork() : !isAlgoNetwork())
      }
      onClick={() => handleClaim(network, amount, address)}
      title={
        !isAddressInWallet(address) ? "Please connect the recipient wallet" : ""
      }
    >
      {isClaimLoading[address]?.[network]
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

  const validateAddress = (address: string) => {
    // Basic Algorand address validation
    const isValid = /^[A-Z2-7]{58}$/i.test(address);
    setIsAddressValid(isValid);
    return isValid;
  };

  const resolveEnvoiName = async (name: string): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://api.envoi.sh/api/search?pattern=${encodeURIComponent(name)}`
      );
      if (response.ok) {
        const data = await response.json();
        console.log("Envoi data:", data);
        // Search returns an array, find exact match
        const exactMatch = data.results.find((item: any) =>
          item.name.toLowerCase().includes(name.toLowerCase())
        );
        return exactMatch?.address || null;
      }
      return null;
    } catch (error) {
      console.error("Error resolving enVoi name:", error);
      return null;
    }
  };

  const resolveAlgoName = async (name: string): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://api.nf.domains/nfd/v2/search?name=${encodeURIComponent(name)}`
      );
      if (response.ok) {
        const data = await response.json();
        console.log("NFD data:", data);
        // Search returns an array, find exact match
        const exactMatch = data.nfds.find(
          (item: any) => item.name.toLowerCase() === name.toLowerCase()
        );
        return exactMatch?.owner || null;
      }
      return null;
    } catch (error) {
      console.error("Error resolving Algorand NFD name:", error);
      return null;
    }
  };

  const searchEnvoiNames = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.envoi.sh/api/search?pattern=${encodeURIComponent(query)}`
      );
      if (response.ok) {
        const data = await response.json();
        const results = data.results.slice(0, 10); // Limit to 10 results

        // If there's exactly one result, auto-select it
        if (results.length === 1) {
          setEnvoiNameInput(results[0].name);
          setSelectedAvatar(results[0].metadata.avatar || null);
          setSearchResults([]);
          setShowDropdown(false);
        } else {
          setSearchResults(results);
          setShowDropdown(results.length > 0);
        }
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error("Error searching enVoi names:", error);
      setSearchResults([]);
      setShowDropdown(false);
    } finally {
      setIsSearching(false);
    }
  };

  const searchAlgoNames = async (query: string) => {
    if (!query || query.length < 2) {
      setAlgoSearchResults([]);
      setShowAlgoDropdown(false);
      return;
    }

    setIsAlgoSearching(true);
    try {
      const response = await fetch(
        `https://api.nf.domains/nfd/v2/search?name=${encodeURIComponent(query)}`
      );
      if (response.ok) {
        const data = await response.json();
        const results = data.nfds.slice(0, 10).map((item: any) => ({
          name: item.name,
          address: item.owner,
          avatar:
            item.properties?.userDefined?.avatar ||
            item.properties?.verified?.avatar ||
            null,
          metadata: {
            avatar:
              item.properties?.userDefined?.avatar ||
              item.properties?.verified?.avatar ||
              null,
          },
        }));

        // If there's exactly one result, auto-select it
        if (results.length === 1) {
          setAlgoNameInput(results[0].name);
          setSelectedAlgoAvatar(results[0].metadata.avatar || null);
          setAlgoSearchResults([]);
          setShowAlgoDropdown(false);
        } else {
          setAlgoSearchResults(results);
          setShowAlgoDropdown(results.length > 0);
        }
      } else {
        setAlgoSearchResults([]);
        setShowAlgoDropdown(false);
      }
    } catch (error) {
      console.error("Error searching Algorand NFD names:", error);
      setAlgoSearchResults([]);
      setShowAlgoDropdown(false);
    } finally {
      setIsAlgoSearching(false);
    }
  };

  const handleNameSelect = (name: string, avatar?: string) => {
    setEnvoiNameInput(name);
    setSelectedAvatar(avatar || null);
    setShowDropdown(false);
    setSearchResults([]);
  };

  const handleAlgoNameSelect = (name: string, avatar?: string) => {
    setAlgoNameInput(name);
    setSelectedAlgoAvatar(avatar || null);
    setShowAlgoDropdown(false);
    setAlgoSearchResults([]);
  };

  // Debounced search effects
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isVoiNetwork()) {
        searchEnvoiNames(envoiNameInput);
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [envoiNameInput, activeNetwork]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isAlgoNetwork()) {
        searchAlgoNames(algoNameInput);
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [algoNameInput, activeNetwork]);

  const handleEligibilityCheck = async () => {
    let addressToCheck = addressInput;

    // If enVoi name is provided, resolve it to an address
    if (envoiNameInput && !addressInput) {
      setIsResolvingEnvoi(true);
      try {
        const resolvedAddress = await resolveEnvoiName(envoiNameInput);
        console.log("Resolved address:", resolvedAddress);
        if (!resolvedAddress) {
          setEligibilityStatus({
            isEligible: false,
            message: "Invalid enVoi name or name not found",
          });
          return;
        }
        addressToCheck = resolvedAddress;
      } finally {
        setIsResolvingEnvoi(false);
      }
    }

    if (!validateAddress(addressToCheck)) return;

    setIsChecking(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Check both the resolved address and the name.address format
      const matchingEntry = airdropData.find(
        (entry) =>
          entry.Address.toLowerCase() === addressToCheck.toLowerCase() ||
          entry.Address.toLowerCase() ===
            `${envoiNameInput}.address`.toLowerCase()
      );

      setTimeout(() => {
        setEligibilityStatus({
          isEligible: !!matchingEntry,
          amount: matchingEntry?.Total || 0,
          message: matchingEntry
            ? `You are eligible for ${matchingEntry.Total} POW`
            : "This address is not eligible for the POW airdrop",
        });
        setIsResultModalOpen(true);
      }, 3000);

      // Trigger confetti if eligible
      if (matchingEntry) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 10000);
      }
    } catch (error) {
      setEligibilityStatus({
        isEligible: false,
        message: "Error checking eligibility",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleWalletEligibilityCheck = async () => {
    if (!activeAccount) {
      setIsWalletModalOpen(true);
      return;
    }
    setLastChecker("wallet");
    setIsWalletChecking(true);
    setResolvedAddress(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const matchingEntry = airdropData.find(
        (entry) =>
          entry.Address.toLowerCase() === activeAccount.address.toLowerCase()
      );
      setTimeout(() => {
        setEligibilityStatus({
          isEligible: !!matchingEntry,
          amount: matchingEntry?.Total || 0,
          message: matchingEntry
            ? `You are eligible for ${matchingEntry.Total} POW`
            : "This address is not eligible for the POW airdrop",
        });
        setIsResultModalOpen(true);
      }, 3000);
      if (matchingEntry) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 10000);
      }
    } catch (error) {
      setEligibilityStatus({
        isEligible: false,
        message: "Error checking eligibility",
      });
    } finally {
      setIsWalletChecking(false);
    }
  };

  const handleAddressEligibilityCheck = async () => {
    if (!validateAddress(addressInput)) return;
    setLastChecker("address");
    setResolvedAddress(null);
    setIsAddressChecking(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const matchingEntry = airdropData.find(
        (entry) => entry.Address.toLowerCase() === addressInput.toLowerCase()
      );
      setTimeout(() => {
        setEligibilityStatus({
          isEligible: !!matchingEntry,
          amount: matchingEntry?.Total || 0,
          message: matchingEntry
            ? `You are eligible for ${matchingEntry.Total} POW`
            : "This address is not eligible for the POW airdrop",
        });
        setIsResultModalOpen(true);
      }, 3000);
      if (matchingEntry) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 10000);
      }
    } catch (error) {
      setEligibilityStatus({
        isEligible: false,
        message: "Error checking eligibility",
      });
    } finally {
      setIsAddressChecking(false);
    }
  };

  const handleEnvoiEligibilityCheck = async () => {
    if (!envoiNameInput) return;
    setLastChecker("envoi");
    setIsEnvoiChecking(true);
    setIsResolvingEnvoi(true);
    try {
      const resolvedAddress = await resolveEnvoiName(envoiNameInput);
      if (!resolvedAddress) {
        setEligibilityStatus({
          isEligible: false,
          message: "Invalid enVoi name or name not found",
        });
        return;
      }
      setResolvedAddress(resolvedAddress);
      setIsChecking(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const matchingEntry = airdropData.find(
        (entry) =>
          entry.Address.toLowerCase() === resolvedAddress.toLowerCase() ||
          entry.Address.toLowerCase() ===
            `${envoiNameInput}.address`.toLowerCase()
      );
      setTimeout(() => {
        setEligibilityStatus({
          isEligible: !!matchingEntry,
          amount: matchingEntry?.Total || 0,
          message: matchingEntry
            ? `You are eligible for ${matchingEntry.Total} POW`
            : "This address is not eligible for the POW airdrop",
        });
        setIsResultModalOpen(true);
      }, 3000);
      if (matchingEntry) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 10000);
      }
    } catch (error) {
      setEligibilityStatus({
        isEligible: false,
        message: "Error checking eligibility",
      });
    } finally {
      setIsEnvoiChecking(false);
      setIsResolvingEnvoi(false);
      setIsChecking(false);
    }
  };

  const handleAlgoEligibilityCheck = async () => {
    if (!algoNameInput) return;
    setLastChecker("algo");
    setIsAlgoChecking(true);
    setIsResolvingAlgo(true);
    try {
      const resolvedAddress = await resolveAlgoName(algoNameInput);
      if (!resolvedAddress) {
        setEligibilityStatus({
          isEligible: false,
          message: "Invalid algo name or name not found",
        });
        return;
      }
      setResolvedAlgoAddress(resolvedAddress);
      setIsChecking(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const matchingEntry = airdropData.find(
        (entry) =>
          entry.Address.toLowerCase() === resolvedAddress.toLowerCase() ||
          entry.Address.toLowerCase() ===
            `${algoNameInput}.address`.toLowerCase()
      );
      setTimeout(() => {
        setEligibilityStatus({
          isEligible: !!matchingEntry,
          amount: matchingEntry?.Total || 0,
          message: matchingEntry
            ? `You are eligible for ${matchingEntry.Total} POW`
            : "This address is not eligible for the POW airdrop",
        });
        setIsResultModalOpen(true);
      }, 3000);
      if (matchingEntry) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 10000);
      }
    } catch (error) {
      setEligibilityStatus({
        isEligible: false,
        message: "Error checking eligibility",
      });
    } finally {
      setIsAlgoChecking(false);
      setIsResolvingAlgo(false);
      setIsChecking(false);
    }
  };

  // Update the countdown timer section
  const CountdownBox = ({ value, label }: { value: string; label: string }) => (
    <div className="bg-card/30 backdrop-blur-sm rounded-xl p-4 border border-[#1EAEDB]/20 shadow-[0_0_15px_rgba(30,174,219,0.1)] hover:shadow-[0_0_20px_rgba(30,174,219,0.2)] transition-all">
      <div className="text-4xl md:text-6xl font-bold text-[#1EAEDB] animate-pulse">
        {value}
      </div>
      <div className="text-sm text-gray-400 uppercase tracking-wider">
        {label}
      </div>
    </div>
  );

  const navigate = useNavigate();

  const handleVideoModalAction = () => {
    // Mark that the user has seen the welcome video
    localStorage.setItem("hasSeenWelcomeVideo", "true");

    // Try to enable localStorage and cookies
    try {
      // Set default values for required localStorage keys
      if (!localStorage.getItem("theme")) {
        localStorage.setItem("theme", "dark");
      }
      if (!localStorage.getItem("currentSlippage")) {
        localStorage.setItem("currentSlippage", "0.5");
      }
      if (!localStorage.getItem("degenMode")) {
        localStorage.setItem("degenMode", "false");
      }

      setIsVideoModalOpen(false);
    } catch (error) {
      console.error("Failed to set localStorage:", error);
      // Still close the modal even if there's an error
      setIsVideoModalOpen(false);
    }
  };

  const handleVideoModalClose = () => {
    // Mark that the user has seen the welcome video even if they close it
    localStorage.setItem("hasSeenWelcomeVideo", "true");

    // Set default values for required localStorage keys if they're missing
    try {
      if (!localStorage.getItem("theme")) {
        localStorage.setItem("theme", "dark");
      }
      if (!localStorage.getItem("currentSlippage")) {
        localStorage.setItem("currentSlippage", "0.5");
      }
      if (!localStorage.getItem("degenMode")) {
        localStorage.setItem("degenMode", "false");
      }
    } catch (error) {
      console.error("Failed to set localStorage on close:", error);
    }

    setIsVideoModalOpen(false);
  };

  // Add video autoplay effect
  useEffect(() => {
    if (videoRef) {
      videoRef.play().catch((error) => {
        console.log("Background video autoplay failed:", error);
      });
    }
  }, [videoRef]);

  // Function to fetch progress data from both networks
  const fetchProgressData = async () => {
    if (!currentAirdropInfo) return;

    setIsLoadingProgress(true);
    try {
      const voiTokenId = currentAirdropInfo.token_ids.Voi;
      const algoTokenId = currentAirdropInfo.token_ids.Algorand;
      const airdropAddress = currentAirdropInfo.airdrop_address;

      // Create contract instances for both networks
      const voiContract = new CONTRACT(
        voiTokenId,
        new algosdk.Algodv2("", "https://mainnet-api.voi.nodely.dev", 443),
        undefined,
        abi.nt200,
        {
          addr: airdropAddress,
          sk: new Uint8Array(),
        }
      );

      const algoContract = new CONTRACT(
        algoTokenId,
        new algosdk.Algodv2("", "https://mainnet-api.4160.nodely.dev", 443),
        undefined,
        abi.nt200,
        {
          addr: airdropAddress,
          sk: new Uint8Array(),
        }
      );

      console.log("airdropAddress", airdropAddress);

      // Fetch balances for both networks
      const [voiBalanceResult, algoBalanceResult] = await Promise.all([
        voiContract
          .arc200_balanceOf(airdropAddress)
          .catch(() => ({ success: false, returnValue: BigInt(0) })),
        algoContract
          .arc200_balanceOf(airdropAddress)
          .catch(() => ({ success: false, returnValue: BigInt(0) })),
      ]);

      console.log("voiBalanceResult", voiBalanceResult);
      console.log("algoBalanceResult", algoBalanceResult);

      // Calculate totals from airdrop data
      const voiTotal = airdropData.reduce((sum, entry) => sum + entry.Voi, 0);
      const algoTotal = 50_000_000 - voiTotal; // airdropData.reduce((sum, entry) => sum + entry.Algo, 0);
      const overallTotal = voiTotal + algoTotal; // Fix: should be sum of both networks

      // Get remaining balances (airdrop account still holds these)
      const voiRemaining = voiBalanceResult.success
        ? Number(voiBalanceResult.returnValue) / Math.pow(10, 6)
        : voiTotal * 0.7; // Dummy: assume 30% claimed for testing

      const algoRemaining = algoBalanceResult.success
        ? Number(algoBalanceResult.returnValue) / Math.pow(10, 6)
        : algoTotal * 0.8; // Dummy: assume 20% claimed for testing

      // Calculate claimed amounts
      const voiClaimed = Math.max(0, voiTotal - voiRemaining);
      const algoClaimed = Math.max(0, algoTotal - algoRemaining);
      const overallClaimed = voiClaimed + algoClaimed;
      const overallRemaining = voiRemaining + algoRemaining;

      // Calculate percentages
      const voiPercentage = voiTotal > 0 ? (voiClaimed / voiTotal) * 100 : 0;
      const algoPercentage =
        algoTotal > 0 ? (algoClaimed / algoTotal) * 100 : 0;
      const overallPercentage =
        overallTotal > 0 ? (overallClaimed / overallTotal) * 100 : 0;

      console.log("Progress calculation:", {
        voiTotal,
        algoTotal,
        overallTotal,
        voiRemaining,
        algoRemaining,
        voiClaimed,
        algoClaimed,
        overallClaimed,
        voiPercentage,
        algoPercentage,
        overallPercentage,
      });

      setProgressData({
        voi: {
          claimed: voiClaimed,
          remaining: voiRemaining,
          total: voiTotal,
          percentage: voiPercentage,
        },
        algo: {
          claimed: algoClaimed,
          remaining: algoRemaining,
          total: algoTotal,
          percentage: algoPercentage,
        },
        overall: {
          claimed: overallClaimed,
          remaining: overallRemaining,
          total: overallTotal,
          percentage: overallPercentage,
        },
      });

      setLastRefreshTime(new Date());
    } catch (error) {
      console.error("Error fetching progress data:", error);
    } finally {
      setIsLoadingProgress(false);
    }
  };

  // Manual refresh function
  const handleManualRefresh = () => {
    fetchProgressData();
  };

  // Enhanced refresh function with notifications
  const handleTradingDataRefresh = async () => {
    try {
      await Promise.all([
        fetchTradingData(),
        fetchPactPowPools(),
        fetchPowUsdPrice(),
        fetchPactTopTVLData(),
      ]);

      toast({
        description: "Trading data refreshed successfully",
        duration: 2000,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Failed to refresh trading data",
        duration: 3000,
      });
    }
  };

  // Function to fetch trading data from CoinGecko API
  const fetchTradingData = async () => {
    setIsLoadingTrading(true);
    setTradingError(null);
    try {
      const response = await fetch(
        "https://mainnet-idx.nautilus.sh/integrations/coingecko/tickers"
      );
      if (!response.ok) {
        throw new Error("Failed to fetch trading data");
      }
      const data = await response.json();

      // Filter for POW trading pairs
      const powPairs = data.filter(
        (ticker: any) =>
          ticker.base_currency === "POW" || ticker.target_currency === "POW"
      );

      // Get VOI price (assuming VOI is the base currency with ID "0")
      const voiTicker = data.find(
        (ticker: any) =>
          ticker.base_currency_id === "0" && ticker.target_currency === "VOI"
      );

      if (voiTicker) {
        setVoiPrice(voiTicker.last_price);
      }

      setPowTradingPairs(powPairs);
      setTradingData(data);
    } catch (error) {
      console.error("Error fetching trading data:", error);
      setTradingError(
        error instanceof Error ? error.message : "Failed to fetch trading data"
      );
    } finally {
      setIsLoadingTrading(false);
    }
  };

  // Replace the Vestige Labs fetch with Pact API fetch for POW pools
  const fetchPactPowPools = async () => {
    setIsLoadingVestige(true);
    setVestigeError(null);
    try {
      // Try the internal pools endpoint first
      const response = await fetch(
        "https://api.pact.fi/api/internal/pools_details/all?secondary_asset__on_chain_id=2994233666"
      );
      const allPools = await response.json();

      // Try to get price data from a different endpoint if available
      try {
        const priceResponse = await fetch(
          "https://api.pact.fi/api/v1/pools/?secondary_asset__on_chain_id=2994233666"
        );
        const priceData = await priceResponse.json();

        console.log("priceData", priceData);

        // Merge price data with pool data if available
        if (priceData.results && priceData.results.length > 0) {
          const priceMap = new Map();
          priceData.results.forEach((pool: any) => {
            if (pool.id && pool.price && pool.is_verified) {
              priceMap.set(pool.id, pool.price);
            }
          });

          // Add price data to the original pools
          allPools.forEach((pool: any) => {
            if (priceMap.has(pool.id)) {
              pool.price = priceMap.get(pool.id);
            }
          });
        }
      } catch (priceError) {
        console.log("Could not fetch price data:", priceError);
      }

      const powPools = allPools;
      setPowVestigePools(powPools);
      setVestigePools(allPools);
    } catch (error) {
      console.error("Error fetching Pact POW pools:", error);
      setVestigeError(
        error instanceof Error
          ? error.message
          : "Failed to fetch Pact POW pools"
      );
    } finally {
      setIsLoadingVestige(false);
    }
  };

  // Replace fetchVestigeData with fetchPactPowPools in useEffect
  useEffect(() => {
    fetchTradingData();
    fetchPactPowPools();
    fetchPowUsdPrice();
    fetchPactTopTVLData();
  }, []);

  // Function to get VOI price from trading data
  const getVoiPrice = () => {
    if (!tradingData || tradingData.length === 0) return 0;

    // Find VOI price from pool_id 395553
    const voiTicker = tradingData.find(
      (ticker: any) => ticker.pool_id === "395553"
    );

    return voiTicker ? parseFloat(voiTicker.last_price) : 0;
  };

  // Function to calculate volume-weighted POW price from largest pools
  const calculateVolumeWeightedPowPrice = () => {
    if (!powVestigePools || powVestigePools.length === 0) return null;

    // Sort pools by TVL (largest first) and take top pools
    const sortedPools = powVestigePools
      .sort((a, b) => Number(b.tvl_usd || 0) - Number(a.tvl_usd || 0))
      .slice(0, 3); // Take top 3 largest pools

    let totalVolume = 0;
    let weightedPriceSum = 0;

    sortedPools.forEach((pool) => {
      // Get POW price for this pool (POW/ALGO ratio)
      const powPrice =
        Number(pool.assets[1].price) / Number(pool.assets[0].price);
      const volume24h = Number(pool.volume_24h_usd || 0);
      const tvl = Number(pool.tvl_usd || 0);

      // Use TVL as weight if volume is low, otherwise use volume
      const weight = volume24h > 0 ? volume24h : tvl;

      if (weight > 0) {
        weightedPriceSum += powPrice * weight;
        totalVolume += weight;
      }
    });

    if (totalVolume === 0) return null;

    return weightedPriceSum / totalVolume;
  };

  // Get volume-weighted POW price
  const volumeWeightedPowPrice = calculateVolumeWeightedPowPrice();
  const currentVoiPrice = getVoiPrice();

  // Function to get POW price in USD from Vestige Labs
  const fetchPowUsdPrice = async () => {
    setIsLoadingPowPrice(true);
    try {
      const response = await fetch(
        "https://api.vestigelabs.org/assets/price?asset_ids=2994233666&network_id=0&denominating_asset_id=31566704"
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setPowUsdPrice(data[0].price);
        }
      }
    } catch (error) {
      console.error("Error fetching POW USD price:", error);
    } finally {
      setIsLoadingPowPrice(false);
    }
  };

  // Function to fetch top TVL data from Pact.fi
  const fetchPactTopTVLData = async () => {
    setIsLoadingPactTopTVL(true);
    try {
      const response = await fetch(
        "https://api.pact.fi/api/internal/pools_details?details=&offset=0&ordering=-tvl_usd&limit=100"
      );
      if (response.ok) {
        const data = await response.json();
        console.log("Pact.fi API response:", data);
        console.log("Pact.fi results count:", data.results?.length || 0);

        if (data.results && data.results.length > 0) {
          // Log first few pools for debugging
          data.results.slice(0, 3).forEach((pool, index) => {
            console.log(`Pool ${index + 1}:`, {
              id: pool.id,
              tvl_usd: pool.tvl_usd,
              is_deprecated: pool.is_deprecated,
              assets_count: pool.assets?.length || 0,
              assets: pool.assets?.map((a) => ({
                on_chain_id: a.on_chain_id,
                unit_name: a.unit_name,
                name: a.name,
              })),
            });
          });
        }

        setPactTopTVLData(data.results || []);
      } else {
        console.error(
          "Pact.fi API response not ok:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error fetching Pact.fi top TVL data:", error);
    } finally {
      setIsLoadingPactTopTVL(false);
    }
  };

  // Function to normalize trading pairs from different sources - now handled by useMemo below

  // State for sorting
  const [sortColumn, setSortColumn] = useState<string>("volume24h");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // State for pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // State for search
  const [searchQuery, setSearchQuery] = useState<string>("");

  // State for favorites
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  // State for Pact.fi top TVL data
  const [pactTopTVLData, setPactTopTVLData] = useState<any[]>([]);
  const [isLoadingPactTopTVL, setIsLoadingPactTopTVL] = useState(false);

  // State for modal
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [selectedPair, setSelectedPair] = useState<any>(null);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);

  // Get normalized pairs using useMemo to prevent constant recalculations
  const normalizedPairs = useMemo(() => {
    const normalizedPairs = [];

    // Normalize VOI pairs from trading data
    if (powTradingPairs && powTradingPairs.length > 0) {
      powTradingPairs.forEach((pair) => {
        const feeBps = extractFeeBps("1%"); // VOI pairs have 1% fee
        const volume24hPOW = parseFloat(pair.base_volume || "0");
        const liquidity = parseFloat(pair.liquidity_in_usd || "0");

        // Convert POW volume to USD using POW price
        const powPrice = parseFloat(pair.last_price);
        const volume24hUSD = volume24hPOW * 0.0049;

        const apr = calculateAPR(volume24hUSD, liquidity, feeBps);

        normalizedPairs.push({
          id: pair.pair_id,
          pair: `${pair.base_currency}/${pair.target_currency}`,
          baseCurrency: pair.base_currency,
          targetCurrency: pair.target_currency,
          baseCurrencyId: pair.base_currency_id,
          targetCurrencyId: pair.target_currency_id,
          price: powPrice,
          volume24h: volume24hUSD,
          liquidity: liquidity,
          lastUpdated: pair.update_datetime,
          network: "Voi",
          fee: "1%",
          feeBps: feeBps,
          apr: apr,
          baseIcon: `https://asset-verification.nautilus.sh/icons/${pair.base_currency_id}.png`,
          targetIcon: `https://asset-verification.nautilus.sh/icons/${pair.target_currency_id}.png`,
          source: "voi",
        });
      });
    }

    // Normalize Pact pairs from Vestige Labs data
    if (powVestigePools && powVestigePools.length > 0) {
      console.log("Processing Pact pools:", powVestigePools.length);
      powVestigePools.forEach((pool) => {
        try {
          console.log(`Pool ${pool.id} assets:`, pool.assets);

          // Look for POW asset (ID: 2994233666) - try both string and number comparison
          const powAsset = pool.assets.find(
            (a) =>
              a.on_chain_id === 2994233666 ||
              a.on_chain_id === "2994233666" ||
              a.asset_id === 2994233666 ||
              a.asset_id === "2994233666"
          );

          // Look for any other asset that's not POW
          const pairedAsset = pool.assets.find(
            (a) =>
              (a.on_chain_id !== 2994233666 &&
                a.on_chain_id !== "2994233666") ||
              (a.asset_id !== 2994233666 && a.asset_id !== "2994233666")
          );

          console.log(
            `Pool ${pool.id}: POW asset found:`,
            !!powAsset,
            "Paired asset found:",
            !!pairedAsset
          );

          if (powAsset && pairedAsset) {
            // Calculate POW price relative to the paired asset
            let price = 1; // Default fallback

            // Try different price calculation methods
            if (pool.assets && pool.assets.length >= 2) {
              if (pool.assets[0].price && pool.assets[1].price) {
                price =
                  Number(pool.assets[1].price) / Number(pool.assets[0].price);
              }
            } else if (powAsset.price && pairedAsset.price) {
              price = Number(powAsset.price) / Number(pairedAsset.price);
            }

            console.log(
              `Pact pool ${pool.id}: POW/${
                pairedAsset.unit_name ||
                pairedAsset.on_chain_id ||
                pairedAsset.asset_id
              }, price: ${price}`
            );

            const feeBps = pool.fee_bps || 0;
            const apr = calculateAPR(
              parseFloat(pool.volume_24h_usd || "0"),
              parseFloat(pool.tvl_usd || "0"),
              feeBps
            );

            normalizedPairs.push({
              id: `pact-${pool.id}`,
              pair: `POW/${
                pairedAsset.unit_name ||
                pairedAsset.on_chain_id ||
                pairedAsset.asset_id
              }`,
              baseCurrency: "POW",
              targetCurrency:
                pairedAsset.unit_name ||
                pairedAsset.on_chain_id ||
                pairedAsset.asset_id,
              baseCurrencyId: "2994233666",
              targetCurrencyId: pairedAsset.on_chain_id || pairedAsset.asset_id,
              price: price,
              volume24h: parseFloat(pool.volume_24h_usd || "0"),
              liquidity: parseFloat(pool.tvl_usd || "0"),
              lastUpdated:
                pool.last_updated ||
                pool.updated_at ||
                new Date().toISOString(),
              network: "Algorand",
              fee: `${(pool.fee_bps / 10000) * 100}%`,
              feeBps: feeBps,
              apr: apr,
              baseIcon: `https://assets.pact.fi/currencies/MainNet/2994233666.image`,
              targetIcon: `https://assets.pact.fi/currencies/MainNet/${
                pairedAsset.on_chain_id || pairedAsset.asset_id
              }.image`,
              source: "pact",
            });
          } else {
            console.log(
              `Pool ${pool.id} skipped: POW asset or paired asset not found`
            );
          }
        } catch (error) {
          console.error("Error processing Pact pool:", pool, error);
        }
      });
    }

    console.log("Normalized pairs total:", normalizedPairs.length);
    console.log(
      "VOI pairs:",
      normalizedPairs.filter((p) => p.source === "voi").length
    );
    console.log(
      "Pact pairs:",
      normalizedPairs.filter((p) => p.source === "pact").length
    );

    // Sort by the selected column and direction
    return normalizedPairs.sort((a, b) => {
      let aValue: any = a[sortColumn as keyof typeof a];
      let bValue: any = b[sortColumn as keyof typeof b];

      // Handle different data types
      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      } else if (typeof aValue === "number") {
        // Numbers are already comparable
      } else {
        // For dates or other types, convert to string
        aValue = String(aValue);
        bValue = String(bValue);
      }

      if (aValue < bValue) {
        return sortDirection === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [powTradingPairs, powVestigePools, sortColumn, sortDirection]); // Include sort parameters in dependencies

  // Filter pairs based on search query and favorites
  const filteredPairs = useMemo(() => {
    let filtered = normalizedPairs;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (pair) =>
          pair.pair.toLowerCase().includes(query) ||
          pair.baseCurrency.toLowerCase().includes(query) ||
          pair.targetCurrency.toLowerCase().includes(query) ||
          pair.network.toLowerCase().includes(query)
      );
    }

    // Filter by favorites
    if (showFavoritesOnly) {
      filtered = filtered.filter((pair) => favorites.includes(pair.id));
    }

    return filtered;
  }, [normalizedPairs, searchQuery, showFavoritesOnly, favorites]);

  // Handle column sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to desc for most columns, asc for pair name
      setSortColumn(column);
      setSortDirection(column === "pair" ? "asc" : "desc");
    }
  };

  // Helper function to get sort indicator
  const getSortIndicator = (column: string) => {
    if (sortColumn !== column) return null;
    return sortDirection === "asc" ? "↑" : "↓";
  };

  // Reset to first page when sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortColumn, sortDirection]);

  // Pagination logic with filtered results
  const totalPages = Math.ceil(filteredPairs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageItems = filteredPairs.slice(startIndex, endIndex);

  // Reset to first page when search or sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortColumn, sortDirection, searchQuery]);

  // Handle row click to open modal
  const handleRowClick = (pair: any) => {
    setSelectedPair(pair);
    setIsPairModalOpen(true);
  };

  // 1. Add useEffect to sync favorites with localStorage
  useEffect(() => {
    // Load favorites from localStorage on mount
    const stored = localStorage.getItem("powFavorites");
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch {}
    }
  }, []);

  useEffect(() => {
    // Save favorites to localStorage whenever they change
    localStorage.setItem("powFavorites", JSON.stringify(favorites));
  }, [favorites]);

  // 2. Add toggleFavorite function
  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  // Get top 50 pairs by TVL (all pairs, not just POW)
  const top50PairsByTVL = useMemo(() => {
    const allPairs = [];

    // Add Voi pairs (all pairs, not just POW)
    if (tradingData && tradingData.length > 0) {
      tradingData.forEach((pair) => {
        const liquidity = parseFloat(pair.liquidity_in_usd || "0");

        // Only add if TVL > 0
        if (liquidity > 0) {
          allPairs.push({
            id: `voi-${pair.pool_id}`,
            pair: `${pair.base_currency}/${pair.target_currency}`,
            baseCurrency: pair.base_currency,
            targetCurrency: pair.target_currency,
            baseCurrencyId: pair.base_currency_id,
            targetCurrencyId: pair.target_currency_id,
            liquidity: liquidity,
            network: "Voi",
            fee: "1%",
            baseIcon: `https://asset-verification.nautilus.sh/icons/${pair.base_currency_id}.png`,
            targetIcon: `https://asset-verification.nautilus.sh/icons/${pair.target_currency_id}.png`,
            source: "voi",
            isPowPair:
              pair.base_currency === "POW" || pair.target_currency === "POW",
          });
        }
      });
    }

    console.log("pactTopTVLData", pactTopTVLData);

    // Add Pact.fi pools data (top 75 TVL from Algorand)
    if (pactTopTVLData && pactTopTVLData.length > 0) {
      pactTopTVLData.forEach((pool) => {
        try {
          const tvl = parseFloat(pool.tvl_usd || "0");
          if (
            !pool.is_deprecated &&
            Array.isArray(pool.assets) &&
            pool.assets.length >= 2 &&
            tvl > 0
          ) {
            const asset1 = pool.assets[0];
            const asset2 = pool.assets[1];
            allPairs.push({
              id: `pact-${pool.on_chain_id}`,
              pair: `${asset1.unit_name || asset1.name || asset1.on_chain_id}/${
                asset2.unit_name || asset2.name || asset2.on_chain_id
              }`,
              baseCurrency:
                asset1.unit_name || asset1.name || asset1.on_chain_id,
              targetCurrency:
                asset2.unit_name || asset2.name || asset2.on_chain_id,
              baseCurrencyId: asset1.on_chain_id,
              targetCurrencyId: asset2.on_chain_id,
              liquidity: tvl,
              network: "Algorand",
              fee: `${(pool.fee_bps / 10000) * 100}%`,
              baseIcon: `https://assets.pact.fi/currencies/MainNet/${asset1.on_chain_id}.image`,
              targetIcon: `https://assets.pact.fi/currencies/MainNet/${asset2.on_chain_id}.image`,
              source: "pact",
              isPowPair:
                String(asset1.on_chain_id) === "2994233666" ||
                String(asset2.on_chain_id) === "2994233666",
            });
          }
        } catch (error) {
          console.error(
            "Error processing Pact.fi pool for TVL table:",
            pool,
            error
          );
        }
      });
    }

    // Sort by TVL and take top 10
    const result = allPairs
      .sort((a, b) => b.liquidity - a.liquidity)
      .slice(0, 100);

    console.log("Top 100 TVL result:", {
      totalPairs: result.length,
      voiPairs: result.filter((p) => p.source === "voi").length,
      pactPairs: result.filter((p) => p.source === "pact").length,
      topPools: result.slice(0, 5).map((p) => ({
        id: p.id,
        pair: p.pair,
        source: p.source,
        tvl: p.liquidity,
      })),
    });

    return result;
  }, [tradingData, pactTopTVLData]);

  // CSV Export functionality
  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;

    // Get headers from the first object
    const headers = Object.keys(data[0]);

    // Create CSV content
    const csvContent = [
      headers.join(","), // Header row
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            // Handle values that need quotes (contain commas, quotes, or newlines)
            if (
              typeof value === "string" &&
              (value.includes(",") ||
                value.includes('"') ||
                value.includes("\n"))
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(",")
      ),
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPOWPairsToCSV = () => {
    const csvData = filteredPairs.map((pair) => ({
      "Trading Pair": pair.pair,
      Price: pair.price.toFixed(6),
      "24h Volume": `$${pair.volume24h.toLocaleString()}`,
      Liquidity: `$${pair.liquidity.toLocaleString()}`,
      APR: `${pair.apr.toFixed(2)}%`,
      Network: pair.network,
      Fee: pair.fee,
      "Last Updated": new Date(pair.lastUpdated).toLocaleString(),
      "Is POW Pair": pair.isPowPair ? "Yes" : "No",
    }));
    exportToCSV(csvData, "pow-trading-pairs");
  };

  const exportTop50ToCSV = () => {
    const csvData = top50PairsByTVL.map((pair, index) => {
      // Determine application_id and application_address based on source
      let applicationId = "";
      let applicationAddress = "";

      if (pair.source === "voi") {
        console.log("pair", pair);
        // For Voi pairs, use pair_id as application_id
        applicationId = pair.id.replace("voi-", "");
        // Derive application address from application ID
        try {
          applicationAddress = algosdk.getApplicationAddress(
            parseInt(applicationId)
          );
        } catch (error) {
          console.error(
            "Error deriving application address for Voi pair:",
            error
          );
          applicationAddress = "N/A";
        }
      } else if (pair.source === "pact") {
        // For Pact.fi pools, use pool.id as application_id
        applicationId = pair.id.replace("pact-", "");
        // Derive application address from application ID
        try {
          applicationAddress = algosdk.getApplicationAddress(
            parseInt(applicationId)
          );
        } catch (error) {
          console.error(
            "Error deriving application address for Pact pool:",
            error
          );
          applicationAddress = "N/A";
        }
      }

      return {
        Rank: index + 1,
        "Trading Pair": pair.pair,
        TVL: `$${pair.liquidity.toLocaleString()}`,
        Network: pair.network,
        Fee: pair.fee,
        "Is POW Pair": pair.isPowPair ? "Yes" : "No",
        "Application ID": applicationId,
        "Application Address": applicationAddress,
      };
    });
    exportToCSV(csvData, "top-50-tvl-pairs");
  };

  // Network exclude lists
  const networkExcludeLists = {
    algorand: ["319473667"],
    voi: [],
  };

  // Helper function to check if address is excluded
  const isAddressExcluded = (address: string, network: "algorand" | "voi") => {
    return networkExcludeLists[network].includes(address);
  };

  return (
    <PageLayout>
      {showConfetti && (
        <ReactConfetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.5}
          style={{ position: "fixed", top: 0, left: 0, zIndex: 9999 }}
        />
      )}

      <VideoModal
        open={isVideoModalOpen}
        onClose={handleVideoModalClose}
        videoUrl={`https://nautilusoss.github.io/airdrop/data/${
          currentAirdropInfo?.id || TARGET_AIRDROP_ID
        }.mp4`}
        title={
          currentAirdropInfo ? `${currentAirdropInfo.name} App!` : "POW App!"
        }
        description="To get started with your wallet and enjoy all features, please ensure cookies and local storage are enabled in your browser. This helps us save your preferences and provide a better experience."
        actionText="Get Started"
        onAction={handleVideoModalAction}
      />

      {/* Wallet Connect Modal */}
      {isWalletModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Connect Wallet
                </h2>
                <button
                  onClick={() => setIsWalletModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-3">
                {wallets.map((wallet) => (
                  <button
                    key={wallet.id}
                    onClick={async () => {
                      try {
                        await wallet.connect();
                        setIsWalletModalOpen(false);
                        // After successful connection, automatically check eligibility
                        if (activeAccount) {
                          handleWalletEligibilityCheck();
                        }
                      } catch (error) {
                        console.error("Wallet connection failed:", error);
                        toast({
                          variant: "destructive",
                          description:
                            "Failed to connect wallet. Please try again.",
                          duration: 3000,
                        });
                      }
                    }}
                    className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                      {wallet.metadata.icon ? (
                        <img
                          src={wallet.metadata.icon}
                          alt={wallet.metadata.name}
                          className="w-8 h-8"
                        />
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-8 h-8 text-gray-600"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {wallet.metadata.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Connect your wallet
                      </p>
                    </div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5 text-gray-400"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.25 4.5l7.5 7.5-7.5 7.5"
                      />
                    </svg>
                  </button>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500 text-center">
                  By connecting your wallet, you agree to our terms of service
                  and privacy policy.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section with Background Video */}
      <div className="relative min-h-[60vh] flex items-center justify-center overflow-hidden w-full py-8 md:py-16 md:pt-24 pb-16 md:pb-32">
        {/* Background Video */}
        <div className="absolute inset-0 w-full h-full">
          <video
            ref={setVideoRef}
            className="absolute top-0 left-0 w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            style={{ filter: "brightness(0.3) contrast(1.2)" }}
          >
            <source
              src={`https://nautilusoss.github.io/airdrop/data/${
                currentAirdropInfo?.id || TARGET_AIRDROP_ID
              }.mp4`}
              type="video/mp4"
            />
            Your browser does not support the video tag.
          </video>

          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold text-white drop-shadow-2xl">
              {currentAirdropInfo ? currentAirdropInfo.name : "POW Airdrop"}
            </h1>
            <Button
              onClick={() => setIsVideoModalOpen(true)}
              className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-[#1EAEDB] hover:bg-[#31BFEC] text-white transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm text-sm sm:text-base"
              title="Watch Introduction Video"
            >
              <Play className="w-4 h-4 sm:w-6 sm:h-6" />
              <span className="hidden sm:inline text-lg font-semibold">
                Watch Video
              </span>
            </Button>
          </div>

          <p className="text-lg sm:text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed drop-shadow-lg mb-6 sm:mb-8 px-2">
            {currentAirdropInfo
              ? currentAirdropInfo.description
              : "Welcome to the POW token airdrop. POW is the governance token for Pact Protocol, enabling community participation in protocol governance. Eligible participants can claim their tokens on both the Voi and Algorand networks."}
          </p>

          {/* Countdown in Hero Section */}
          {!isAirdropOpen && timeUntilEnd !== "Ended" && (
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-4 text-white drop-shadow-lg">
                Airdrop Opens In
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 max-w-2xl mx-auto px-2 md:px-0">
                {timeUntilOpen.split(" ").map((unit, index) => (
                  <div
                    key={index}
                    className="bg-white/10 backdrop-blur-sm rounded-xl p-2 md:p-4 border border-white/20 shadow-lg hover:shadow-xl transition-all"
                  >
                    <div className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold text-white animate-pulse mb-1 md:mb-2">
                      {unit.replace(/[a-zA-Z]/g, "")}
                    </div>
                    <div className="text-[8px] sm:text-[10px] md:text-xs lg:text-sm text-white/80 uppercase tracking-wider font-medium">
                      {unit.slice(-1) === "d"
                        ? "Days"
                        : unit.slice(-1) === "h"
                        ? "Hours"
                        : unit.slice(-1) === "m"
                        ? "Minutes"
                        : "Seconds"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isAirdropOpen && timeUntilEnd !== "Ended" && (
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-4 text-white drop-shadow-lg">
                Airdrop Ends In
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 max-w-2xl mx-auto px-2 md:px-0">
                {timeUntilEnd.split(" ").map((unit, index) => (
                  <div
                    key={index}
                    className="bg-white/10 backdrop-blur-sm rounded-xl p-2 md:p-4 border border-white/20 shadow-lg hover:shadow-xl transition-all"
                  >
                    <div className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold text-white animate-pulse mb-1 md:mb-2">
                      {unit.replace(/[a-zA-Z]/g, "")}
                    </div>
                    <div className="text-[8px] sm:text-[10px] md:text-xs lg:text-sm text-white/80 uppercase tracking-wider font-medium">
                      {unit.slice(-1) === "d"
                        ? "Days"
                        : unit.slice(-1) === "h"
                        ? "Hours"
                        : unit.slice(-1) === "m"
                        ? "Minutes"
                        : "Seconds"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {timeUntilEnd === "Ended" && (
            <div className="mb-6 sm:mb-8">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 sm:p-6 max-w-2xl mx-auto">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
                  Airdrop Has Ended
                </div>
              </div>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-2">
            <Button
              className="px-6 sm:px-8 py-3 sm:py-4 text-lg sm:text-xl font-bold bg-[#1EAEDB] hover:bg-[#31BFEC] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 w-full sm:w-auto"
              onClick={() => {
                const element = document.getElementById("wallet-address");
                element?.scrollIntoView({ behavior: "smooth" });
                element?.focus();
                navigate("/airdrop");
              }}
            >
              Check Your Eligibility
            </Button>
            <Button
              variant="outline"
              className="px-6 sm:px-8 py-3 sm:py-4 text-lg sm:text-xl font-bold border-2 border-white text-white hover:bg-white hover:text-black rounded-full shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm w-full sm:w-auto"
              onClick={() => {
                window.open(
                  "https://medium.com/@pact.fi/all-you-need-to-know-power-token-pow-the-governance-token-of-pact-dab8aa0503de",
                  "_blank"
                );
              }}
            >
              Learn More
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              className="px-6 sm:px-8 py-3 sm:py-4 text-lg sm:text-xl font-bold border-2 border-white text-white hover:bg-white hover:text-black rounded-full shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm w-full sm:w-auto"
              onClick={() => {
                const tradingSection = document.querySelector(
                  '[data-section="trading"]'
                );
                tradingSection?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              View Trading
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4 ml-2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
                />
              </svg>
            </Button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/70 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Progress Bar Section */}
      <div className="bg-gradient-to-b from-gray-900 to-gray-800 py-8 md:py-12 lg:py-16 w-full">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6 md:mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">
              Airdrop Progress
            </h2>
            <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto mb-4 px-2">
              Track the progress of the POW token distribution across both
              networks
            </p>

            {/* Refresh Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Button
                onClick={handleManualRefresh}
                disabled={isLoadingProgress}
                className="px-4 py-2 text-sm font-semibold bg-[#1EAEDB] hover:bg-[#31BFEC] text-white rounded-lg transition-all duration-200 flex items-center gap-2 w-full sm:w-auto"
              >
                {isLoadingProgress ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                      />
                    </svg>
                    Refresh Now
                  </>
                )}
              </Button>

              {lastRefreshTime && (
                <div className="text-sm text-gray-400">
                  Last updated: {lastRefreshTime.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Overall Progress */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 md:p-8 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] mb-6 md:mb-8">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  Overall Progress
                </h3>
                <span className="text-xl sm:text-2xl font-bold text-[#1EAEDB]">
                  {isAirdropOpen
                    ? "Active"
                    : timeUntilOpen
                    ? "Pending"
                    : "Ended"}
                </span>
              </div>

              <div className="relative">
                <div className="w-full bg-white/20 rounded-full h-3 sm:h-4 mb-2">
                  <div
                    className="bg-gradient-to-r from-[#1EAEDB] to-[#31BFEC] h-3 sm:h-4 rounded-full transition-all duration-1000 ease-out shadow-lg"
                    style={{
                      width:
                        timeUntilEnd === "Ended"
                          ? "100%"
                          : `${progressData.overall.percentage}%`,
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs sm:text-sm text-gray-300">
                  <span>Start</span>
                  <span>{progressData.overall.percentage.toFixed(1)}%</span>
                  <span>End</span>
                </div>
              </div>

              {/* Status Indicators */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 sm:mt-6">
                <div className="text-center">
                  <div
                    className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full mx-auto mb-1 sm:mb-2 ${
                      isAirdropOpen ? "bg-green-400" : "bg-gray-400"
                    }`}
                  ></div>
                  <span className="text-xs sm:text-sm text-gray-300">
                    Started
                  </span>
                </div>
                <div className="text-center">
                  <div
                    className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full mx-auto mb-1 sm:mb-2 ${
                      isAirdropOpen ? "bg-[#1EAEDB]" : "bg-gray-400"
                    }`}
                  ></div>
                  <span className="text-xs sm:text-sm text-gray-300">
                    Active
                  </span>
                </div>
                <div className="text-center">
                  <div
                    className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full mx-auto mb-1 sm:mb-2 ${
                      timeUntilEnd === "Ended" ? "bg-red-400" : "bg-gray-400"
                    }`}
                  ></div>
                  <span className="text-xs sm:text-sm text-gray-300">
                    Ended
                  </span>
                </div>
              </div>
            </div>

            {/* Network Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Voi Network Progress */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-4 h-4 sm:w-5 sm:h-5 text-white"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
                      />
                    </svg>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Voi Network
                  </h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs sm:text-sm mb-1">
                      <span className="text-gray-300">Claimed</span>
                      <span className="text-white font-semibold">
                        {isLoadingProgress
                          ? "..."
                          : `${progressData.voi.percentage.toFixed(1)}%`}
                      </span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: isLoadingProgress
                            ? "0%"
                            : `${progressData.voi.percentage}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs sm:text-sm mb-1">
                      <span className="text-gray-300">Remaining</span>
                      <span className="text-white font-semibold">
                        {isLoadingProgress
                          ? "..."
                          : `${(100 - progressData.voi.percentage).toFixed(
                              1
                            )}%`}
                      </span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-gray-400 to-gray-500 h-2 rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: isLoadingProgress
                            ? "100%"
                            : `${100 - progressData.voi.percentage}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/20">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-gray-300">Status</span>
                    <span className="text-green-400 font-semibold">Active</span>
                  </div>
                </div>
              </div>

              {/* Algorand Network Progress */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-[#1EAEDB] to-[#31BFEC] rounded-lg flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-4 h-4 sm:w-5 sm:h-5 text-white"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
                      />
                    </svg>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Algorand Network
                  </h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs sm:text-sm mb-1">
                      <span className="text-gray-300">Claimed</span>
                      <span className="text-white font-semibold">
                        {isLoadingProgress
                          ? "..."
                          : `${progressData.algo.percentage.toFixed(1)}%`}
                      </span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-[#1EAEDB] to-[#31BFEC] h-2 rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: isLoadingProgress
                            ? "0%"
                            : `${progressData.algo.percentage}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs sm:text-sm mb-1">
                      <span className="text-gray-300">Remaining</span>
                      <span className="text-white font-semibold">
                        {isLoadingProgress
                          ? "..."
                          : `${(100 - progressData.algo.percentage).toFixed(
                              1
                            )}%`}
                      </span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-gray-400 to-gray-500 h-2 rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: isLoadingProgress
                            ? "100%"
                            : `${100 - progressData.algo.percentage}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/20">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-gray-300">Status</span>
                    <span className="text-green-400 font-semibold">Active</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="mt-6 md:mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20 text-center">
                <div className="text-lg sm:text-2xl font-bold text-[#1EAEDB] mb-1">
                  {isLoadingProgress
                    ? "..."
                    : airdropData.length.toLocaleString()}
                </div>
                <div className="text-xs sm:text-sm text-gray-300">
                  Total Eligible
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20 text-center">
                <div className="text-lg sm:text-2xl font-bold text-green-400 mb-1">
                  {isLoadingProgress
                    ? "..."
                    : Math.round(progressData.overall.claimed).toLocaleString()}
                </div>
                <div className="text-xs sm:text-sm text-gray-300">
                  POW Claimed
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20 text-center">
                <div className="text-lg sm:text-2xl font-bold text-yellow-400 mb-1">
                  {isLoadingProgress
                    ? "..."
                    : Math.round(
                        progressData.overall.remaining
                      ).toLocaleString()}
                </div>
                <div className="text-xs sm:text-sm text-gray-300">
                  POW Remaining
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20 text-center">
                <div className="text-lg sm:text-2xl font-bold text-[#1EAEDB] mb-1">
                  {isLoadingProgress
                    ? "..."
                    : Math.round(progressData.overall.total).toLocaleString()}
                </div>
                <div className="text-xs sm:text-sm text-gray-300">
                  Total POW
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Launch Humble and Pact Section */}
      <div className="bg-gradient-to-b from-gray-900 to-gray-800 py-12 md:py-16 w-full">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Launch Applications
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Launch applications on Voi and Algorand networks and start using
              your tokens.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {/* Humble Card */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_48px_rgba(0,0,0,0.4)] transition-all duration-300 hover:transform hover:-translate-y-1">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-8 h-8 text-white"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Humble</h3>
                <p className="text-gray-300 mb-4 text-sm">
                  Decentralized exchange on Voi with advanced features with
                  competitive liquidity provision incentives to earn VOI.
                </p>
                <Button
                  onClick={() => window.open("https://voi.humble.sh", "_blank")}
                  className="w-full text-base px-4 py-2 rounded-lg shadow-lg font-semibold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transition-all duration-300"
                >
                  Launch Humble
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>

            {/* Pact Card */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_48px_rgba(0,0,0,0.4)] transition-all duration-300 hover:transform hover:-translate-y-1">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#1EAEDB] to-[#31BFEC] rounded-xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-8 h-8 text-white"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Pact</h3>
                <p className="text-gray-300 mb-4 text-sm">
                  Decentralized exchange on Algorand with farming, consensus
                  ready liquidity pools, multi-tier swap fees, smart routing.
                </p>
                <Button
                  onClick={() => window.open("https://app.pact.fi", "_blank")}
                  className="w-full text-base px-4 py-2 rounded-lg shadow-lg font-semibold bg-gradient-to-r from-[#1EAEDB] to-[#31BFEC] hover:from-[#31BFEC] hover:to-[#1EAEDB] text-white transition-all duration-300"
                >
                  Launch Pact
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>

            {/* Vestige Card */}
            {/*<div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_48px_rgba(0,0,0,0.4)] transition-all duration-300 hover:transform hover:-translate-y-1">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-8 h-8 text-white"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Vestige</h3>
                <p className="text-gray-300 mb-4 text-sm">
                  Get the best rates across all Algorand DEXs with intelligent
                  route optimization when swapping on Algorand.
                </p>
                <Button
                  onClick={() => window.open("https://vestige.fi", "_blank")}
                  className="w-full text-base px-4 py-2 rounded-lg shadow-lg font-semibold bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white transition-all duration-300"
                >
                  Launch Vestige
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>*/}

            {/* Aramid Finance Card */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_48px_rgba(0,0,0,0.4)] transition-all duration-300 hover:transform hover:-translate-y-1">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-8 h-8 text-white"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 18.75a1.5 1.5 0 0 1-3 0V5.25a1.5 1.5 0 0 1 3 0v13.5Zm6-13.5a1.5 1.5 0 0 1 3 0v13.5a1.5 1.5 0 0 1-3 0V5.25Z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Aramid Finance
                </h3>
                <p className="text-gray-300 mb-4 text-sm">
                  Bridge assets securely between Voi, Algorand, and Ethereum
                  networks with secure cross-chain transfers and low transaction
                  fees.
                </p>
                <Button
                  onClick={() =>
                    window.open("https://app.aramid.finance", "_blank")
                  }
                  className="w-full text-base px-4 py-2 rounded-lg shadow-lg font-semibold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white transition-all duration-300"
                >
                  Launch Aramid
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trading Section */}
      <div
        className="bg-gradient-to-b from-gray-800 to-gray-900 py-8 md:py-12 lg:py-16 w-full"
        data-section="trading"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-6 md:mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">
              POW Trading
            </h2>
            <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto px-2">
              Track POW token prices, trading volume, and market activity across
              different exchanges
            </p>
          </div>

          {isLoadingTrading ? (
            <div className="text-center py-8 md:py-12">
              <div className="animate-spin h-6 w-6 sm:h-8 sm:w-8 border-4 border-[#1EAEDB] border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-300">Loading trading data...</p>
            </div>
          ) : tradingError ? (
            <div className="text-center py-8 md:py-12">
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 sm:p-6 max-w-md mx-auto">
                <p className="text-red-400">Error: {tradingError}</p>
                <Button
                  onClick={fetchTradingData}
                  className="mt-4 px-4 py-2 bg-[#1EAEDB] hover:bg-[#31BFEC] text-white rounded-lg"
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto">
              {/* Market Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 md:mb-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-lg font-bold text-white">
                        Voi Pairs
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-300">
                        Voi network pairs
                      </p>
                    </div>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-blue-400">
                    {powTradingPairs.length}
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-lg font-bold text-white">
                        Algorand Pools
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-300">
                        Vestige Labs pools
                      </p>
                    </div>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-orange-400">
                    {isLoadingVestige ? "..." : powVestigePools.length}
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-lg font-bold text-white">
                        POW Pairs
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-300">
                        All POW trading pairs
                      </p>
                    </div>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-purple-400">
                    {powVestigePools.length + powTradingPairs.length}
                  </div>
                </div>
              </div>

              {/* Quick Stats Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-300">
                        Total Volume 24h
                      </p>
                      <p className="text-base sm:text-xl font-bold text-white">
                        $
                        {normalizedPairs
                          .reduce((sum, pair) => sum + pair.volume24h, 0)
                          .toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-300">
                        Total Liquidity
                      </p>
                      <p className="text-base sm:text-xl font-bold text-white">
                        $
                        {normalizedPairs
                          .reduce((sum, pair) => sum + pair.liquidity, 0)
                          .toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-300">
                        Avg APR
                      </p>
                      <p className="text-base sm:text-xl font-bold text-white">
                        {(
                          normalizedPairs.reduce(
                            (sum, pair) => sum + pair.apr,
                            0
                          ) / normalizedPairs.length
                        ).toFixed(2)}
                        %
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#1EAEDB] to-[#31BFEC] rounded-lg flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-300">
                        Active Pairs
                      </p>
                      <p className="text-base sm:text-xl font-bold text-white">
                        {normalizedPairs.length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Normalized Trading Pairs Table */}
              {normalizedPairs.length > 0 && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] mb-6 md:mb-8">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-4 sm:mb-6 gap-4">
                    <h3 className="text-lg sm:text-xl font-bold text-white">
                      All POW Trading Pairs ({filteredPairs.length} total)
                    </h3>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full lg:w-auto">
                      {/* Search Input */}
                      <div className="relative w-full sm:w-auto">
                        <input
                          type="text"
                          placeholder="Search by symbol, pair, network..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full sm:w-64 px-4 py-2 pl-10 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1EAEDB] focus:border-transparent text-sm"
                        />
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                          />
                        </svg>
                      </div>
                      <div className="text-xs sm:text-sm text-gray-300 text-center sm:text-left">
                        Voi:{" "}
                        {filteredPairs.filter((p) => p.source === "voi").length}{" "}
                        | Pact:{" "}
                        {
                          filteredPairs.filter((p) => p.source === "pact")
                            .length
                        }
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          variant="outline"
                          onClick={() =>
                            setShowFavoritesOnly(!showFavoritesOnly)
                          }
                          className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 ${
                            showFavoritesOnly
                              ? "bg-[#1EAEDB]/20 text-[#1EAEDB] border-[#1EAEDB]/30"
                              : "bg-white/10 hover:bg-white/20 text-white border-white/20"
                          }`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill={showFavoritesOnly ? "currentColor" : "none"}
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-3 h-3 sm:w-4 sm:h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                            />
                          </svg>
                          {showFavoritesOnly ? "Show All" : "Favorites"}
                        </Button>
                        <Button
                          onClick={handleTradingDataRefresh}
                          className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold bg-[#1EAEDB] hover:bg-[#31BFEC] text-white rounded-lg transition-all duration-200 flex items-center gap-2"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-3 h-3 sm:w-4 sm:h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                            />
                          </svg>
                          Refresh
                        </Button>
                        <Button
                          onClick={exportPOWPairsToCSV}
                          className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-3 h-3 sm:w-4 sm:h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                            />
                          </svg>
                          Export CSV
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/20">
                          <th
                            className="text-left py-3 px-4 text-white font-semibold cursor-pointer hover:bg-white/5 transition-colors"
                            onClick={() => handleSort("pair")}
                          >
                            <div className="flex items-center gap-2">
                              Trading Pair
                              {getSortIndicator("pair")}
                            </div>
                          </th>
                          <th
                            className="text-right py-3 px-4 text-white font-semibold cursor-pointer hover:bg-white/5 transition-colors"
                            onClick={() => handleSort("price")}
                          >
                            <div className="flex items-center justify-end gap-2">
                              Price
                              {getSortIndicator("price")}
                            </div>
                          </th>
                          <th
                            className="hidden md:table-cell text-right py-3 px-4 text-white font-semibold cursor-pointer hover:bg-white/5 transition-colors"
                            onClick={() => handleSort("volume24h")}
                          >
                            <div className="flex items-center justify-end gap-2">
                              24h Volume
                              {getSortIndicator("volume24h")}
                            </div>
                          </th>
                          <th
                            className="hidden lg:table-cell text-right py-3 px-4 text-white font-semibold cursor-pointer hover:bg-white/5 transition-colors"
                            onClick={() => handleSort("liquidity")}
                          >
                            <div className="flex items-center justify-end gap-2">
                              Liquidity
                              {getSortIndicator("liquidity")}
                            </div>
                          </th>
                          <th
                            className="hidden sm:table-cell text-right py-3 px-4 text-white font-semibold cursor-pointer hover:bg-white/5 transition-colors"
                            onClick={() => handleSort("apr")}
                          >
                            <div className="flex items-center justify-end gap-2">
                              APR
                              {getSortIndicator("apr")}
                            </div>
                          </th>
                          <th
                            className="hidden md:table-cell text-right py-3 px-4 text-white font-semibold cursor-pointer hover:bg-white/5 transition-colors"
                            onClick={() => handleSort("network")}
                          >
                            <div className="flex items-center justify-end gap-2">
                              Network
                              {getSortIndicator("network")}
                            </div>
                          </th>
                          <th
                            className="hidden lg:table-cell text-right py-3 px-4 text-white font-semibold cursor-pointer hover:bg-white/5 transition-colors"
                            onClick={() => handleSort("lastUpdated")}
                          >
                            <div className="flex items-center justify-end gap-2">
                              Last Updated
                              {getSortIndicator("lastUpdated")}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentPageItems.map((pair, index) => (
                          <tr
                            key={pair.id}
                            className="border-b border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
                            onClick={() => handleRowClick(pair)}
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFavorite(pair.id);
                                    }}
                                    aria-label={
                                      favorites.includes(pair.id)
                                        ? "Remove from favorites"
                                        : "Add to favorites"
                                    }
                                    className="focus:outline-none flex-shrink-0"
                                    tabIndex={0}
                                  >
                                    {favorites.includes(pair.id) ? (
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="#FFD700"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="#FFD700"
                                        className="w-5 h-5 mr-1"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M12 17.25l-6.16 3.73 1.64-7.03L2 9.24l7.19-.61L12 2.5l2.81 6.13 7.19.61-5.48 4.71 1.64 7.03z"
                                        />
                                      </svg>
                                    ) : (
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="#FFD700"
                                        className="w-5 h-5 mr-1"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M12 17.25l-6.16 3.73 1.64-7.03L2 9.24l7.19-.61L12 2.5l2.81 6.13 7.19.61-5.48 4.71 1.64 7.03z"
                                        />
                                      </svg>
                                    )}
                                  </button>
                                  <div className="flex items-center flex-shrink-0">
                                    <img
                                      src={pair.baseIcon}
                                      alt={pair.baseCurrency}
                                      className="w-8 h-8 rounded-full border-2 border-white/20 shadow-sm bg-white"
                                      onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                      }}
                                    />
                                    <img
                                      src={pair.targetIcon}
                                      alt={pair.targetCurrency}
                                      className="w-8 h-8 rounded-full border-2 border-white/20 shadow-sm -ml-2 bg-white"
                                      onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                      }}
                                    />
                                  </div>
                                </div>
                                <span className="text-white font-medium">
                                  {pair.pair}
                                </span>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#1EAEDB]/20 text-[#1EAEDB] border border-[#1EAEDB]/30">
                                  {pair.fee}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <div className="text-white font-semibold flex items-center justify-end gap-2">
                                {pair.price.toFixed(6)}
                                {/* Removed hardcoded price change - no 24h change data available */}
                              </div>
                              <div className="text-sm text-gray-400">
                                {(1 / pair.price).toFixed(6)}{" "}
                                {pair.baseCurrency}
                              </div>
                            </td>
                            <td className="hidden md:table-cell py-4 px-4 text-right">
                              <div className="text-white font-semibold">
                                ${pair.volume24h.toLocaleString()}
                              </div>
                            </td>
                            <td className="hidden lg:table-cell py-4 px-4 text-right">
                              <div className="text-white font-semibold">
                                ${pair.liquidity.toLocaleString()}
                              </div>
                            </td>
                            <td className="hidden sm:table-cell py-4 px-4 text-right">
                              <div className="text-white font-semibold">
                                {pair.apr.toFixed(2)}%
                              </div>
                            </td>
                            <td className="hidden md:table-cell py-4 px-4 text-right">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                  pair.network === "Voi"
                                    ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                    : "bg-[#1EAEDB]/20 text-[#1EAEDB] border-[#1EAEDB]/30"
                                }`}
                              >
                                {pair.network}
                              </span>
                            </td>
                            <td className="hidden lg:table-cell py-4 px-4 text-right">
                              <div className="text-sm text-gray-400">
                                {new Date(pair.lastUpdated).toLocaleString()}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Loading Skeleton for Trading Table */}
              {isLoadingTrading && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] mb-8">
                  <div className="animate-pulse">
                    <div className="h-8 bg-white/10 rounded mb-6 w-1/3"></div>
                    <div className="space-y-4">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between py-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white/10 rounded-full"></div>
                            <div className="w-24 h-4 bg-white/10 rounded"></div>
                          </div>
                          <div className="w-20 h-4 bg-white/10 rounded"></div>
                          <div className="w-24 h-4 bg-white/10 rounded"></div>
                          <div className="w-20 h-4 bg-white/10 rounded"></div>
                          <div className="w-16 h-4 bg-white/10 rounded"></div>
                          <div className="w-20 h-4 bg-white/10 rounded"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-6 border-t border-white/20 gap-4">
                  <div className="text-sm text-gray-300 text-center sm:text-left">
                    Showing {startIndex + 1} to{" "}
                    {Math.min(endIndex, filteredPairs.length)} of{" "}
                    {filteredPairs.length} pairs
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="hidden sm:inline">Previous</span>
                      <span className="sm:hidden">←</span>
                    </Button>

                    <div className="flex items-center gap-1">
                      {/* Show limited page numbers on mobile */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((page) => {
                          if (totalPages <= 7) return true;
                          if (page === 1 || page === totalPages) return true;
                          if (
                            page >= currentPage - 1 &&
                            page <= currentPage + 1
                          )
                            return true;
                          return false;
                        })
                        .map((page, index, array) => {
                          // Add ellipsis if there's a gap
                          const prevPage = array[index - 1];
                          const showEllipsis = prevPage && page - prevPage > 1;

                          return (
                            <div key={page} className="flex items-center">
                              {showEllipsis && (
                                <span className="px-2 text-gray-400">...</span>
                              )}
                              <Button
                                onClick={() => setCurrentPage(page)}
                                className={`px-2 sm:px-3 py-1 text-sm rounded-lg transition-colors ${
                                  currentPage === page
                                    ? "bg-[#1EAEDB] text-white"
                                    : "bg-white/10 hover:bg-white/20 text-white"
                                }`}
                              >
                                {page}
                              </Button>
                            </div>
                          );
                        })}
                    </div>

                    <Button
                      onClick={() =>
                        setCurrentPage(Math.min(totalPages, currentPage + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <span className="sm:hidden">→</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Spacing after POW pair table */}
              <div className="h-12 md:h-16"></div>

              {/* POW Trading Pairs Table - Removed */}
              {/* Voi Network POW Trading Pairs table has been removed */}

              {/* Vestige Labs Algorand Pools - Removed */}
              {/* Algorand POW Pools (Pact) table has been removed */}

              {/* Overview Stats for Top 50 Table */}
              {top50PairsByTVL.length > 0 && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] mb-6">
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-4">
                    Top 100 Overview
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#1EAEDB] to-[#31BFEC] rounded-lg flex items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm text-gray-300">
                            Total TVL
                          </p>
                          <p className="text-base sm:text-xl font-bold text-white">
                            $
                            {top50PairsByTVL
                              .reduce((sum, pair) => sum + pair.liquidity, 0)
                              .toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#1EAEDB] to-[#31BFEC] rounded-lg flex items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm text-gray-300">
                            POW Pairs
                          </p>
                          <p className="text-base sm:text-xl font-bold text-white">
                            {top50PairsByTVL.filter((p) => p.isPowPair).length}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#1EAEDB] to-[#31BFEC] rounded-lg flex items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm text-gray-300">
                            Voi Pairs
                          </p>
                          <p className="text-base sm:text-xl font-bold text-white">
                            {
                              top50PairsByTVL.filter((p) => p.network === "Voi")
                                .length
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#1EAEDB] to-[#31BFEC] rounded-lg flex items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm text-gray-300">
                            Pact Pairs
                          </p>
                          <p className="text-base sm:text-xl font-bold text-white">
                            {50 -
                              top50PairsByTVL.filter((p) => p.network === "Voi")
                                .length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Top 100 Trading Pairs by TVL */}
              {top50PairsByTVL.length > 0 && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] mb-6 md:mb-8">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-4 sm:mb-6 gap-4">
                    <h3 className="text-lg sm:text-xl font-bold text-white">
                      Top 100 Trading Pairs by TVL
                    </h3>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <div className="text-sm text-gray-300">
                        Showing highest liquidity pairs across all networks
                        (including non-POW pairs)
                      </div>
                      <Button
                        onClick={exportTop50ToCSV}
                        className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-3 h-3 sm:w-4 sm:h-4"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                          />
                        </svg>
                        Export CSV
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/20">
                          <th className="text-left py-3 px-4 text-white font-semibold">
                            <div className="flex items-center gap-2">Rank</div>
                          </th>
                          <th className="text-left py-3 px-4 text-white font-semibold">
                            <div className="flex items-center gap-2">
                              Trading Pair
                            </div>
                          </th>
                          <th className="text-right py-3 px-4 text-white font-semibold">
                            <div className="flex items-center justify-end gap-2">
                              TVL
                            </div>
                          </th>
                          <th className="text-right py-3 px-4 text-white font-semibold">
                            <div className="flex items-center justify-end gap-2">
                              Network
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {top50PairsByTVL.map((pair, index) => (
                          <tr
                            key={`tvl-${pair.id}`}
                            className={`border-b border-white/10 hover:bg-white/5 transition-colors cursor-pointer ${
                              pair.isPowPair ? "bg-[#1EAEDB]/5" : ""
                            }`}
                            onClick={() => handleRowClick(pair)}
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                    pair.isPowPair
                                      ? "bg-gradient-to-br from-[#1EAEDB] to-[#31BFEC]"
                                      : "bg-gradient-to-br from-gray-600 to-gray-700"
                                  }`}
                                >
                                  {index + 1}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFavorite(pair.id);
                                    }}
                                    aria-label={
                                      favorites.includes(pair.id)
                                        ? "Remove from favorites"
                                        : "Add to favorites"
                                    }
                                    className="focus:outline-none flex-shrink-0"
                                    tabIndex={0}
                                  >
                                    {favorites.includes(pair.id) ? (
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="#FFD700"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="#FFD700"
                                        className="w-5 h-5 mr-1"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M12 17.25l-6.16 3.73 1.64-7.03L2 9.24l7.19-.61L12 2.5l2.81 6.13 7.19.61-5.48 4.71 1.64 7.03z"
                                        />
                                      </svg>
                                    ) : (
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="#FFD700"
                                        className="w-5 h-5 mr-1"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M12 17.25l-6.16 3.73 1.64-7.03L2 9.24l7.19-.61L12 2.5l2.81 6.13 7.19.61-5.48 4.71 1.64 7.03z"
                                        />
                                      </svg>
                                    )}
                                  </button>
                                  <div className="flex items-center flex-shrink-0">
                                    <img
                                      src={pair.baseIcon}
                                      alt={pair.baseCurrency}
                                      className="w-8 h-8 rounded-full border-2 border-white/20 shadow-sm bg-white"
                                      onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                      }}
                                    />
                                    <img
                                      src={pair.targetIcon}
                                      alt={pair.targetCurrency}
                                      className="w-8 h-8 rounded-full border-2 border-white/20 shadow-sm -ml-2 bg-white"
                                      onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                      }}
                                    />
                                  </div>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-white font-medium">
                                    {pair.pair}
                                  </span>
                                  {pair.isPowPair && (
                                    <span className="text-xs text-[#1EAEDB] font-medium">
                                      POW Pair
                                    </span>
                                  )}
                                </div>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#1EAEDB]/20 text-[#1EAEDB] border border-[#1EAEDB]/30">
                                  {pair.fee}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <div className="text-white font-semibold">
                                ${pair.liquidity.toLocaleString()}
                              </div>
                              <div className="text-sm text-gray-400">
                                {(
                                  (pair.liquidity /
                                    top50PairsByTVL.reduce(
                                      (sum, p) => sum + p.liquidity,
                                      0
                                    )) *
                                  100
                                ).toFixed(1)}
                                % of total
                              </div>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                  pair.network === "Voi"
                                    ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                    : "bg-[#1EAEDB]/20 text-[#1EAEDB] border-[#1EAEDB]/30"
                                }`}
                              >
                                {pair.network}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Loading state for Vestige Labs */}
              {isLoadingVestige && (
                <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                  <div className="text-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-[#1EAEDB] border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-300">
                      Loading Algorand pool data from Vestige Labs...
                    </p>
                  </div>
                </div>
              )}

              {/* Error state for Vestige Labs */}
              {vestigeError && (
                <div className="mt-8 bg-red-500/20 border border-red-500/30 rounded-xl p-6">
                  <div className="text-center">
                    <p className="text-red-400 mb-4">
                      Error loading Vestige Labs data: {vestigeError}
                    </p>
                    <Button
                      onClick={fetchPactPowPools}
                      className="px-4 py-2 bg-[#1EAEDB] hover:bg-[#31BFEC] text-white rounded-lg"
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-[1400px]">
        <div className="min-h-[50vh] flex items-center justify-center flex-col gap-6">
          {isLoading && (
            <div className="text-center p-8">
              <div className="animate-spin h-8 w-8 border-4 border-[#1EAEDB] border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-lg">Loading airdrop data...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md w-full">
              <p className="text-red-600">Error: {error}</p>
            </div>
          )}

          {recipientsData.length > 0 ? (
            <>
              <div className="w-full max-w-6xl mb-8">
                <h1 className="text-3xl font-bold mb-6">Summary</h1>
                <div className="bg-card rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(30,174,219,0.1)] border border-border/50 hover:shadow-[0_8px_30px_-4px_rgba(30,174,219,0.2)] transition-shadow mb-12">
                  <h2 className="text-xl font-semibold mb-4">Total Rewards</h2>
                  <div className="flex flex-col gap-2">
                    {recipientsData.reduce(
                      (sum, recipient) => sum + recipient.Voi,
                      0
                    ) > 0 && (
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600">VOI Network</span>
                        <span className="font-semibold">
                          {recipientsData
                            .reduce((sum, recipient) => sum + recipient.Voi, 0)
                            .toFixed(6)}{" "}
                          POW
                        </span>
                      </div>
                    )}
                    {recipientsData.reduce(
                      (sum, recipient) => sum + recipient.Algo,
                      0
                    ) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Algorand Network</span>
                        <span className="font-semibold">
                          {recipientsData
                            .reduce((sum, recipient) => sum + recipient.Algo, 0)
                            .toFixed(6)}{" "}
                          POW
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-border/50">
                      <span className="text-gray-600">Total Rewards</span>
                      <span className="font-semibold">
                        {recipientsData
                          .reduce((sum, recipient) => sum + recipient.Total, 0)
                          .toFixed(6)}{" "}
                        POW
                      </span>
                    </div>
                  </div>
                </div>
                {recipientsData.map((recipient, index) => (
                  <div
                    key={recipient.Address}
                    className="w-full max-w-3xl mb-24"
                  >
                    <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
                      Airdrop for {recipient.Address.slice(0, 5)}...
                      {recipient.Address.slice(-5)}
                      <button
                        onClick={() => copyToClipboard(recipient.Address)}
                        className="p-2 rounded-lg transition-colors"
                        title="Copy address"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-5 h-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
                          />
                        </svg>
                      </button>
                    </h1>
                    <AccountAirdrop
                      address={recipient.Address}
                      showClaimButtons={true}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : recipientAddresses ? (
            <div className="w-full max-w-6xl mx-auto">
              <h1 className="text-3xl font-bold mb-6">Airdrop Details</h1>
              {recipientAddresses.map((address, index) => (
                <div key={address} className="w-full max-w-3xl mb-24">
                  <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
                    Airdrop for {address.slice(0, 5)}...{address.slice(-5)}
                    <button
                      onClick={() => copyToClipboard(address)}
                      className="p-2 rounded-lg transition-colors"
                      title="Copy address"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
                        />
                      </svg>
                    </button>
                  </h1>
                  <AccountAirdrop address={address} showClaimButtons={true} />
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full max-w-4xl mx-auto">
              {/* Header Section */}
              <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-[#1EAEDB] to-[#31BFEC] bg-clip-text text-transparent">
                  Check Your Airdrop
                </h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Enter your wallet address or connect your wallet to check your
                  eligibility for the POW token airdrop
                </p>
              </div>

              {/* Eligibility Check Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                {/* Wallet Connect Card */}
                <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-[#1EAEDB]/20 hover:shadow-[0_12px_48px_rgba(30,174,219,0.15)] transition-all duration-300">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#1EAEDB] to-[#31BFEC] rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-8 h-8 text-white"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3"
                        />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Connect Wallet</h3>
                    <p className="text-gray-600 mb-6">
                      Quick and secure way to check eligibility with your
                      connected wallet
                    </p>
                  </div>

                  <Button
                    className="w-full text-lg px-6 py-4 rounded-xl shadow-lg font-bold bg-gradient-to-r from-[#1EAEDB] to-[#31BFEC] hover:from-[#31BFEC] hover:to-[#1EAEDB] text-white transition-all duration-300 transform hover:-translate-y-1"
                    onClick={handleWalletEligibilityCheck}
                    disabled={isWalletChecking}
                  >
                    {isWalletChecking ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                        <span>Checking...</span>
                      </div>
                    ) : activeAccount ? (
                      <div className="flex items-center gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-5 h-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3"
                          />
                        </svg>
                        Check Connected Wallet
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-5 h-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3"
                          />
                        </svg>
                        Connect Wallet & Check
                      </div>
                    )}
                  </Button>

                  {activeAccount && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-700 text-center mb-2">
                        Connected: {activeAccount.address.slice(0, 6)}...
                        {activeAccount.address.slice(-4)}
                      </p>
                      <Button
                        onClick={() => {
                          // Disconnect the active wallet
                          if (activeAccount) {
                            // Find the wallet that's currently connected and disconnect it
                            const connectedWallet = wallets.find((wallet) =>
                              wallet.accounts?.some(
                                (account) =>
                                  account.address === activeAccount.address
                              )
                            );
                            if (connectedWallet) {
                              connectedWallet.disconnect();
                            }
                          }
                        }}
                        className="w-full text-sm px-3 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
                      >
                        Disconnect Wallet
                      </Button>
                    </div>
                  )}
                </div>

                {/* Manual Address Card */}
                <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-[#1EAEDB]/20 hover:shadow-[0_12px_48px_rgba(30,174,219,0.15)] transition-all duration-300">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-600 to-gray-700 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-8 h-8 text-white"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
                        />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Enter Address</h3>
                    <p className="text-gray-600 mb-6">
                      Manually enter any wallet address to check eligibility
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="relative">
                      <Label
                        htmlFor="wallet-address"
                        className={cn(
                          "absolute left-3 transition-all duration-200 z-10 text-sm",
                          addressInput ? "opacity-0" : "top-4"
                        )}
                      >
                        Enter wallet address
                      </Label>
                      <div className="relative flex flex-col sm:flex-row gap-2 sm:gap-0">
                        <Input
                          id="wallet-address"
                          type="text"
                          placeholder=""
                          value={addressInput}
                          onChange={(e) => {
                            setAddressInput(e.target.value);
                            validateAddress(e.target.value);
                          }}
                          className={cn(
                            "px-6 py-4 h-14 text-lg rounded-xl",
                            "sm:pr-[140px]",
                            !isAddressValid &&
                              addressInput &&
                              "border-red-500 focus:ring-red-500"
                          )}
                        />
                        <Button
                          className={cn(
                            "h-12 text-base font-bold bg-[#1EAEDB] hover:bg-[#31BFEC] disabled:opacity-50 rounded-xl px-4",
                            "sm:absolute sm:right-1 sm:top-1"
                          )}
                          onClick={handleAddressEligibilityCheck}
                          disabled={
                            !addressInput ||
                            !isAddressValid ||
                            isAddressChecking ||
                            isResolvingEnvoi ||
                            isResolvingAlgo
                          }
                        >
                          {isAddressChecking ||
                          isResolvingEnvoi ||
                          isResolvingAlgo ? (
                            <div className="flex items-center gap-2">
                              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                              <span>
                                {isResolvingEnvoi || isResolvingAlgo
                                  ? "Resolving..."
                                  : "Checking"}
                              </span>
                            </div>
                          ) : (
                            "Check"
                          )}
                        </Button>
                      </div>
                      {!isAddressValid && addressInput && (
                        <p className="text-red-500 text-sm mt-1">
                          Please enter a valid wallet address
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Name Resolution Section */}
              <div className="bg-card/30 backdrop-blur-sm rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-[#1EAEDB]/20">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">Name Resolution</h3>
                  <p className="text-gray-600">
                    Check eligibility using human-readable names
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* enVoi Name Input - Only show for Voi network */}
                  {activeNetwork.toLowerCase().includes("voi") && (
                    <div className="relative">
                      {/*<div className="text-center mb-4">
                        <span className="text-gray-500 text-sm font-medium">
                          enVoi Names (.voi)/
                        </span>
                      </div>*/}
                      <Label
                        htmlFor="envoi-name"
                        className={cn(
                          "absolute left-3 transition-all duration-200 z-10 text-sm",
                          envoiNameInput ? "opacity-0" : "top-4"
                        )}
                      >
                        Enter .voi name
                      </Label>
                      <div className="relative flex flex-col sm:flex-row gap-2 sm:gap-0">
                        <div className="relative flex-1">
                          {selectedAvatar && (
                            <div className="absolute left-2 top-1/2 transform -translate-y-1/2 z-20">
                              <img
                                src={selectedAvatar}
                                alt="Avatar"
                                className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
                                onError={(e) => {
                                  // Show fallback avatar when image fails to load
                                  const fallback =
                                    e.currentTarget.parentElement?.querySelector(
                                      ".fallback-avatar"
                                    );
                                  if (fallback) {
                                    fallback.classList.remove("hidden");
                                  }
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                              <div className="fallback-avatar hidden w-12 h-12 rounded-full border-2 border-white shadow-sm bg-gradient-to-br from-[#1EAEDB] to-[#31BFEC] flex items-center justify-center text-white font-bold text-sm">
                                {envoiNameInput.charAt(0).toUpperCase()}
                              </div>
                            </div>
                          )}
                          {!selectedAvatar && envoiNameInput && (
                            <div className="absolute left-2 top-1/2 transform -translate-y-1/2 z-20">
                              <div className="w-12 h-12 rounded-full border-2 border-white shadow-sm bg-gradient-to-br from-[#1EAEDB] to-[#31BFEC] flex items-center justify-center text-white font-bold text-sm">
                                {envoiNameInput.charAt(0).toUpperCase()}
                              </div>
                            </div>
                          )}
                          <Input
                            id="envoi-name"
                            type="text"
                            placeholder=""
                            value={envoiNameInput}
                            onChange={(e) => {
                              setEnvoiNameInput(e.target.value.toLowerCase());
                              if (!e.target.value) {
                                setSelectedAvatar(null);
                              }
                            }}
                            onFocus={() => {
                              if (searchResults.length > 0) {
                                setShowDropdown(true);
                              }
                            }}
                            onBlur={() => {
                              // Delay hiding dropdown to allow for clicks
                              setTimeout(() => setShowDropdown(false), 200);
                            }}
                            ref={envoiInputRef}
                            className={cn(
                              "px-6 py-4 h-14 text-lg rounded-xl sm:pr-[140px]",
                              envoiNameInput && "bg-white text-gray-900",
                              (selectedAvatar || envoiNameInput) && "pl-16"
                            )}
                          />
                        </div>
                        <Button
                          className={cn(
                            "h-12 text-base font-bold bg-[#1EAEDB] hover:bg-[#31BFEC] disabled:opacity-50 rounded-xl px-4",
                            "sm:absolute sm:right-1 sm:top-1"
                          )}
                          onClick={handleEnvoiEligibilityCheck}
                          disabled={
                            !envoiNameInput ||
                            isEnvoiChecking ||
                            isResolvingEnvoi
                          }
                        >
                          {isEnvoiChecking || isResolvingEnvoi ? (
                            <div className="flex items-center gap-2">
                              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                              <span>
                                {isResolvingEnvoi ? "Resolving..." : "Checking"}
                              </span>
                            </div>
                          ) : (
                            "Check"
                          )}
                        </Button>
                      </div>

                      {/* Search Results Dropdown */}
                      {showDropdown && (
                        <DropdownPortal anchorRef={envoiInputRef}>
                          <div className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {isSearching ? (
                              <div className="p-4 text-center text-gray-500">
                                <div className="animate-spin h-4 w-4 border-2 border-[#1EAEDB] border-t-transparent rounded-full mx-auto mb-2"></div>
                                Searching...
                              </div>
                            ) : searchResults.length > 0 ? (
                              <div>
                                {searchResults.map((result, index) => (
                                  <button
                                    key={index}
                                    onClick={() =>
                                      handleNameSelect(
                                        result.name,
                                        result.avatar
                                      )
                                    }
                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors flex items-center gap-3"
                                  >
                                    {result.metadata?.avatar && (
                                      <img
                                        src={
                                          result.metadata?.avatar ||
                                          result.avatar
                                        }
                                        alt={`${result.name} avatar`}
                                        className="w-12 h-12 rounded-full flex-shrink-0"
                                        onError={(e) => {
                                          // Show fallback avatar when image fails to load
                                          const fallback =
                                            e.currentTarget.parentElement?.querySelector(
                                              ".fallback-avatar"
                                            );
                                          if (fallback) {
                                            fallback.classList.remove("hidden");
                                          }
                                          e.currentTarget.style.display =
                                            "none";
                                        }}
                                      />
                                    )}
                                    {!result.avatar &&
                                      !result.metadata?.avatar && (
                                        <div className="w-12 h-12 rounded-full flex-shrink-0 bg-gradient-to-br from-[#1EAEDB] to-[#31BFEC] flex items-center justify-center text-white font-bold text-sm">
                                          {result.name.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-gray-900">
                                        {result.name}
                                      </div>
                                      <div className="text-sm text-gray-500 truncate">
                                        {result.address}
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            ) : envoiNameInput.length >= 2 ? (
                              <div className="p-4 text-center text-gray-500">
                                No enVoi names found
                              </div>
                            ) : null}
                          </div>
                        </DropdownPortal>
                      )}
                    </div>
                  )}

                  {/* algo Name Input - Only show for algo network */}
                  {isAlgoNetwork() && (
                    <div className="relative">
                      {/*<div className="text-center mb-4">
                        <span className="text-gray-500 text-sm font-medium">
                          Algorand NFDs (.algo)
                        </span>
                      </div>*/}
                      <Label
                        htmlFor="algo-name"
                        className={cn(
                          "absolute left-3 transition-all duration-200 z-10 text-sm",
                          algoNameInput ? "opacity-0" : "top-4"
                        )}
                      >
                        Enter .algo name
                      </Label>
                      <div className="relative flex flex-col sm:flex-row gap-2 sm:gap-0">
                        <div className="relative flex-1">
                          {selectedAlgoAvatar && (
                            <div className="absolute left-2 top-1/2 transform -translate-y-1/2 z-20">
                              <img
                                src={selectedAlgoAvatar}
                                alt="Avatar"
                                className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
                                onError={(e) => {
                                  // Show fallback avatar when image fails to load
                                  const fallback =
                                    e.currentTarget.parentElement?.querySelector(
                                      ".fallback-avatar"
                                    );
                                  if (fallback) {
                                    fallback.classList.remove("hidden");
                                  }
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                              <div className="fallback-avatar hidden w-12 h-12 rounded-full border-2 border-white shadow-sm bg-gradient-to-br from-[#1EAEDB] to-[#31BFEC] flex items-center justify-center text-white font-bold text-sm">
                                {algoNameInput.charAt(0).toUpperCase()}
                              </div>
                            </div>
                          )}
                          {!selectedAlgoAvatar && algoNameInput && (
                            <div className="absolute left-2 top-1/2 transform -translate-y-1/2 z-20">
                              <div className="w-12 h-12 rounded-full border-2 border-white shadow-sm bg-gradient-to-br from-[#1EAEDB] to-[#31BFEC] flex items-center justify-center text-white font-bold text-sm">
                                {algoNameInput.charAt(0).toUpperCase()}
                              </div>
                            </div>
                          )}
                          <Input
                            id="algo-name"
                            type="text"
                            placeholder=""
                            value={algoNameInput}
                            onChange={(e) => {
                              setAlgoNameInput(e.target.value.toLowerCase());
                              if (!e.target.value) {
                                setSelectedAlgoAvatar(null);
                              }
                            }}
                            onFocus={() => {
                              if (algoSearchResults.length > 0) {
                                setShowAlgoDropdown(true);
                              }
                            }}
                            onBlur={() => {
                              // Delay hiding dropdown to allow for clicks
                              setTimeout(() => setShowAlgoDropdown(false), 200);
                            }}
                            ref={algoInputRef}
                            className={cn(
                              "px-6 py-4 h-14 text-lg rounded-xl sm:pr-[140px]",
                              algoNameInput && "bg-white text-gray-900",
                              (selectedAlgoAvatar || algoNameInput) && "pl-16"
                            )}
                          />
                        </div>
                        <Button
                          className={cn(
                            "h-12 text-base font-bold bg-[#1EAEDB] hover:bg-[#31BFEC] disabled:opacity-50 rounded-xl px-4",
                            "sm:absolute sm:right-1 sm:top-1"
                          )}
                          onClick={handleAlgoEligibilityCheck}
                          disabled={
                            !algoNameInput || isAlgoChecking || isResolvingAlgo
                          }
                        >
                          {isAlgoChecking || isResolvingAlgo ? (
                            <div className="flex items-center gap-2">
                              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                              <span>
                                {isResolvingAlgo ? "Resolving..." : "Checking"}
                              </span>
                            </div>
                          ) : (
                            "Check"
                          )}
                        </Button>
                      </div>

                      {/* Search Results Dropdown */}
                      {showAlgoDropdown && (
                        <DropdownPortal anchorRef={algoInputRef}>
                          <div className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {isAlgoSearching ? (
                              <div className="p-4 text-center text-gray-500">
                                <div className="animate-spin h-4 w-4 border-2 border-[#1EAEDB] border-t-transparent rounded-full mx-auto mb-2"></div>
                                Searching...
                              </div>
                            ) : algoSearchResults.length > 0 ? (
                              <div>
                                {algoSearchResults.map((result, index) => (
                                  <button
                                    key={index}
                                    onClick={() =>
                                      handleAlgoNameSelect(
                                        result.name,
                                        result.avatar
                                      )
                                    }
                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors flex items-center gap-3"
                                  >
                                    {result.metadata?.avatar && (
                                      <img
                                        src={
                                          result.metadata?.avatar ||
                                          result.avatar
                                        }
                                        alt={`${result.name} avatar`}
                                        className="w-12 h-12 rounded-full flex-shrink-0"
                                        onError={(e) => {
                                          // Show fallback avatar when image fails to load
                                          const fallback =
                                            e.currentTarget.parentElement?.querySelector(
                                              ".fallback-avatar"
                                            );
                                          if (fallback) {
                                            fallback.classList.remove("hidden");
                                          }
                                          e.currentTarget.style.display =
                                            "none";
                                        }}
                                      />
                                    )}
                                    {!result.avatar &&
                                      !result.metadata?.avatar && (
                                        <div className="w-12 h-12 rounded-full flex-shrink-0 bg-gradient-to-br from-[#1EAEDB] to-[#31BFEC] flex items-center justify-center text-white font-bold text-sm">
                                          {result.name.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-gray-900">
                                        {result.name}
                                      </div>
                                      <div className="text-sm text-gray-500 truncate">
                                        {result.address}
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            ) : algoNameInput.length >= 2 ? (
                              <div className="p-4 text-center text-gray-500">
                                No algo names found
                              </div>
                            ) : null}
                          </div>
                        </DropdownPortal>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Eligibility Status */}
              {!isChecking &&
              !isResolvingEnvoi &&
              !isResolvingAlgo &&
              eligibilityStatus.message ? (
                <div
                  className={cn(
                    "mt-8 p-8 rounded-2xl text-center shadow-[0_8px_32px_rgba(0,0,0,0.1)] border transition-all duration-500",
                    "animate-in fade-in duration-500",
                    eligibilityStatus.isEligible
                      ? "bg-card/50 backdrop-blur-sm border-[#1EAEDB]/20 hover:shadow-[0_12px_48px_rgba(30,174,219,0.15)]"
                      : "bg-card/50 backdrop-blur-sm border-border/50"
                  )}
                >
                  {eligibilityStatus.isEligible ? (
                    <div className="animate-in slide-in-from-bottom duration-500 delay-200">
                      <h3 className="text-3xl font-bold text-[#1EAEDB] mb-4">
                        🎉 You're Eligible for POW!
                      </h3>

                      {/* Display the identifier that was used */}
                      <div className="mb-4 p-3 bg-[#1EAEDB]/40 rounded-lg border border-[#1EAEDB]/30">
                        <p className="text-sm text-[#1EAEDB] font-medium mb-1">
                          Checked for:
                        </p>
                        {lastChecker === "wallet" && activeAccount && (
                          <p className="text-lg font-semibold text-white tracking-wider">
                            {activeAccount.address.slice(0, 6)}...
                            {activeAccount.address.slice(-4)}
                          </p>
                        )}
                        {lastChecker === "envoi" && envoiNameInput && (
                          <p className="text-lg font-semibold text-white tracking-wider">
                            {envoiNameInput}
                          </p>
                        )}
                        {lastChecker === "algo" && algoNameInput && (
                          <p className="text-lg font-semibold text-white tracking-wider">
                            {algoNameInput}
                          </p>
                        )}
                        {lastChecker === "address" && addressInput && (
                          <p className="text-lg font-semibold text-white tracking-wider">
                            {addressInput.slice(0, 6)}...
                            {addressInput.slice(-4)}
                          </p>
                        )}
                      </div>

                      <p className="text-xl text-gray-600 mb-4">
                        {eligibilityStatus.message}
                      </p>
                      <p className="text-lg text-gray-500 mb-6">
                        POW is the governance token for Pact Protocol. You can
                        use it to participate in protocol decisions, stake for
                        rewards, and access exclusive features across the
                        ecosystem.
                      </p>
                      <Button
                        className="text-xl px-8 py-4 rounded-xl shadow-lg font-bold bg-gradient-to-r from-[#1EAEDB] to-[#31BFEC] hover:from-[#31BFEC] hover:to-[#1EAEDB] text-white transition-all duration-300 transform hover:-translate-y-1"
                        onClick={() => {
                          // Determine the correct address based on which method was used
                          let claimAddress = addressInput;

                          // If wallet was used, use the active account address
                          if (activeAccount && eligibilityStatus.isEligible) {
                            const walletEntry = airdropData.find(
                              (entry) =>
                                entry.Address.toLowerCase() ===
                                activeAccount.address.toLowerCase()
                            );
                            if (walletEntry) {
                              claimAddress = activeAccount.address;
                            }
                          }

                          // If enVoi was used, use the stored resolved address
                          if (
                            resolvedAddress &&
                            envoiNameInput &&
                            !addressInput
                          ) {
                            claimAddress = resolvedAddress;
                          }

                          // If Algorand NFD was used, use the stored resolved address
                          if (
                            resolvedAlgoAddress &&
                            algoNameInput &&
                            !addressInput &&
                            !envoiNameInput
                          ) {
                            claimAddress = resolvedAlgoAddress;
                          }

                          // Navigate to the claim page with the correct address
                          window.location.href = `/airdrop/${claimAddress}`;
                        }}
                      >
                        Claim Your POW Tokens
                      </Button>
                    </div>
                  ) : (
                    <div className="animate-in slide-in-from-bottom duration-500 delay-200">
                      <h3 className="text-3xl font-bold text-gray-700 mb-4">
                        Not Eligible
                      </h3>
                      <p className="text-xl text-gray-600">
                        {eligibilityStatus.message}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="mt-8 bg-card/50 backdrop-blur-sm border-none border-[#1EAEDB]/20 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.1)]"
                  style={{ height: 220 }}
                  aria-hidden="true"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {isResultModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#181A20] rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-8 py-12 relative animate-in fade-in duration-300 border border-[#1EAEDB]/20 dark:border-[#1EAEDB]/40">
            <button
              className="absolute top-4 right-4 p-2 rounded-full z-[9999] hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              onClick={() => setIsResultModalOpen(false)}
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6 text-gray-700 dark:text-gray-200"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <div
              className={cn(
                "rounded-2xl text-center shadow-[0_8px_32px_rgba(0,0,0,0.1)] border transition-all duration-500",
                eligibilityStatus.isEligible
                  ? "bg-card/50 backdrop-blur-sm border-[#1EAEDB]/20 dark:border-[#1EAEDB]/40 hover:shadow-[0_12px_48px_rgba(30,174,219,0.15)]"
                  : "bg-card/50 backdrop-blur-sm border-border/50 dark:border-border/70"
              )}
            >
              {eligibilityStatus.isEligible ? (
                <div className="animate-in slide-in-from-bottom duration-500 delay-200 py-5">
                  <h3 className="text-3xl font-bold text-[#1EAEDB] dark:text-[#31BFEC] mb-4">
                    🎉 You're Eligible for POW!
                  </h3>
                  <div className="mb-4 p-3 bg-[#1EAEDB]/40 dark:bg-[#1EAEDB]/20 rounded-lg border border-[#1EAEDB]/30 dark:border-[#1EAEDB]/40">
                    <p className="text-sm text-[#1EAEDB] dark:text-[#31BFEC] font-medium mb-1">
                      Checked for:
                    </p>
                    {lastChecker === "wallet" && activeAccount && (
                      <p className="text-lg font-semibold text-white tracking-wider">
                        {activeAccount.address.slice(0, 6)}...
                        {activeAccount.address.slice(-4)}
                      </p>
                    )}
                    {lastChecker === "envoi" && envoiNameInput && (
                      <p className="text-lg font-semibold text-white tracking-wider">
                        {envoiNameInput}
                      </p>
                    )}
                    {lastChecker === "algo" && algoNameInput && (
                      <p className="text-lg font-semibold text-white tracking-wider">
                        {algoNameInput}
                      </p>
                    )}
                    {lastChecker === "address" && addressInput && (
                      <p className="text-lg font-semibold text-white tracking-wider">
                        {addressInput.slice(0, 6)}...
                        {addressInput.slice(-4)}
                      </p>
                    )}
                  </div>
                  <p className="text-xl text-gray-600 dark:text-gray-200 mb-4">
                    {eligibilityStatus.message}
                  </p>
                  <p className="text-lg text-gray-500 dark:text-gray-300 mb-6">
                    POW is the governance token for Pact Protocol. You can use
                    it to participate in protocol decisions, stake for rewards,
                    and access exclusive features across the ecosystem.
                  </p>
                  <Button
                    className="text-xl px-8 py-4 rounded-xl shadow-lg font-bold bg-gradient-to-r from-[#1EAEDB] to-[#31BFEC] hover:from-[#31BFEC] hover:to-[#1EAEDB] text-white transition-all duration-300 transform hover:-translate-y-1"
                    onClick={() => {
                      let claimAddress = addressInput;
                      if (activeAccount && eligibilityStatus.isEligible) {
                        const walletEntry = airdropData.find(
                          (entry) =>
                            entry.Address.toLowerCase() ===
                            activeAccount.address.toLowerCase()
                        );
                        if (walletEntry) {
                          claimAddress = activeAccount.address;
                        }
                      }
                      if (resolvedAddress && envoiNameInput && !addressInput) {
                        claimAddress = resolvedAddress;
                      }
                      if (
                        resolvedAlgoAddress &&
                        algoNameInput &&
                        !addressInput &&
                        !envoiNameInput
                      ) {
                        claimAddress = resolvedAlgoAddress;
                      }
                      window.location.href = `/airdrop/${claimAddress}`;
                    }}
                  >
                    Claim Your POW Tokens
                  </Button>
                </div>
              ) : (
                <div className="animate-in slide-in-from-bottom duration-500 delay-200">
                  <h3 className="text-3xl font-bold text-gray-700 dark:text-gray-100 mb-4">
                    Not Eligible
                  </h3>
                  <p className="text-xl text-gray-600 dark:text-gray-200">
                    {eligibilityStatus.message}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trading Pair Details Modal */}
      {isPairModalOpen && selectedPair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative animate-in fade-in duration-300 border border-[#1EAEDB]/20 shadow-[0_8px_32px_rgba(30,174,219,0.1)]">
            <button
              className="absolute top-4 right-4 p-2 rounded-full z-[9999] hover:bg-white/10 transition-colors"
              onClick={() => setIsPairModalOpen(false)}
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6 text-gray-300"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="p-4 sm:p-8">
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="flex items-center flex-shrink-0">
                  <img
                    src={selectedPair.baseIcon}
                    alt={selectedPair.baseCurrency}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-[#1EAEDB]/30 shadow-sm"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <img
                    src={selectedPair.targetIcon}
                    alt={selectedPair.targetCurrency}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-[#1EAEDB]/30 shadow-sm -ml-2"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    {selectedPair.pair}
                  </h2>
                  <p className="text-sm sm:text-base text-gray-300">
                    {selectedPair.network} Network
                  </p>
                </div>
              </div>

              {/* Show different content based on network */}
              {selectedPair.source === "voi" ? (
                // Voi Network - Show pair info and Humble button
                <div className="space-y-6">
                  {/* Price Information */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <h3 className="text-lg font-semibold text-white mb-3">
                      Price Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Current Price</span>
                        <span className="font-semibold text-white">
                          {selectedPair.price.toFixed(6)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Inverse Price</span>
                        <span className="font-semibold text-white">
                          {(1 / selectedPair.price).toFixed(6)}{" "}
                          {selectedPair.baseCurrency}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Trading Fee</span>
                        <span className="font-semibold text-[#1EAEDB]">
                          {selectedPair.fee}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Market Data */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <h3 className="text-lg font-semibold text-white mb-3">
                      Market Data
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-300">24h Volume</span>
                        <span className="font-semibold text-white">
                          ${selectedPair.volume24h.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Liquidity</span>
                        <span className="font-semibold text-white">
                          ${selectedPair.liquidity.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">APR</span>
                        <span className="font-semibold text-green-400">
                          {selectedPair.apr.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Asset Details */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <h3 className="text-lg font-semibold text-white mb-3">
                      Asset Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-300 mb-2">
                          Base Asset ({selectedPair.baseCurrency})
                        </h4>
                        <div className="text-sm text-gray-400">
                          ID: {selectedPair.baseCurrencyId}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-300 mb-2">
                          Target Asset ({selectedPair.targetCurrency})
                        </h4>
                        <div className="text-sm text-gray-400">
                          ID: {selectedPair.targetCurrencyId}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/20">
                    <div className="text-sm text-gray-400 text-center sm:text-left">
                      Last updated:{" "}
                      {new Date(selectedPair.lastUpdated).toLocaleString()}
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setIsPairModalOpen(false)}
                        className="px-6 py-2 border-white/20 text-white hover:bg-white/10"
                      >
                        Close
                      </Button>
                      <Button
                        onClick={() => {
                          // Open Humble with the specific pool
                          const poolId =
                            selectedPair.pool_id || selectedPair.id || "395553";
                          const platformUrl = `https://voi.humble.sh/#/swap?poolId=${poolId}`;
                          window.open(platformUrl, "_blank");
                        }}
                        className="px-6 py-2 bg-[#1EAEDB] hover:bg-[#31BFEC] text-white transition-all duration-300 flex items-center gap-2"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-5 h-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
                          />
                        </svg>
                        Swap on Humble
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                // Pact Network - Show swap widget
                <div className="space-y-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/20 flex justify-center">
                    <div
                      className="swap-widget-container"
                      style={
                        {
                          "--vestige-primary": "#1EAEDB",
                          "--vestige-secondary": "#31BFEC",
                          "--vestige-background": "rgba(255, 255, 255, 0.1)",
                          "--vestige-surface": "rgba(255, 255, 255, 0.05)",
                          "--vestige-text": "#ffffff",
                          "--vestige-text-secondary":
                            "rgba(255, 255, 255, 0.7)",
                          "--vestige-border": "rgba(255, 255, 255, 0.2)",
                          "--vestige-accent": "#1EAEDB",
                          "--vestige-success": "#10B981",
                          "--vestige-error": "#EF4444",
                          "--vestige-warning": "#F59E0B",
                        } as React.CSSProperties
                      }
                    >
                      <Swap
                        assetIn={
                          Number(selectedPair.baseCurrencyId) === 2994233666
                            ? Number(selectedPair.targetCurrencyId)
                            : Number(selectedPair.baseCurrencyId)
                        }
                        assetOut={2994233666}
                        className="rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Close button for Pact pairs */}
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => setIsPairModalOpen(false)}
                      className="px-6 py-2 border-white/20 text-white hover:bg-white/10"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default Airdrop;
