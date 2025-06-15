import React, { useState, useEffect, useRef } from "react";
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

// Define the type for airdrop data
interface AirdropEntry {
  Address: string;
  Voi: number;
  Algo: number;
  Total: number;
}

// DropdownPortal: renders children in a portal at the document body
const DropdownPortal: React.FC<{
  anchorRef: React.RefObject<HTMLElement>;
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

  const AIRDROP_START_TIME = new Date("2025-06-23T00:00:00Z").getTime(); // Adjust this timestamp
  const AIRDROP_END_TIME = new Date("2025-09-23T00:00:00Z").getTime(); // Adjust this timestamp

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
        const response = await fetch(
          "https://nautilusoss.github.io/airdrop/data/000-pow.json"
        );
        console.log("Fetch response received:", response.ok); // Debug log
        if (!response.ok) {
          throw new Error("Failed to fetch airdrop data");
        }
        const data = await response.json();
        console.log("Data parsed successfully"); // Debug log
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

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const timeLeft = AIRDROP_START_TIME - now;
      const timeLeftUntilEnd = AIRDROP_END_TIME - now;

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
  }, []);

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

    setIsClaimLoading((prev) => ({
      ...prev,
      [recipientAddress]: {
        ...prev[recipientAddress],
        [network]: true,
      },
    }));
    try {
      // TODO: Implement actual claim logic here
      console.log(
        `Claiming ${amount} POW on ${network} network for ${recipientAddress}`
      );
      // TODO: Implement actual claim logic here
      const params = await algodClient.getTransactionParams().do();
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: recipientAddress,
        amount: 0,
        to: recipientAddress,
        suggestedParams: params,
      });
      const signedTxn = await signTransactions([txn]);
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
        videoUrl="https://nautilusoss.github.io/airdrop/data/000-pow.mp4"
        title="POW App!"
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
      <div className="relative min-h-[60vh] flex items-center justify-center overflow-hidden w-full py-16 md:py-16 md:pt-24 pb-32 md:pb-32">
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
              src="https://nautilusoss.github.io/airdrop/data/000-pow.mp4"
              type="video/mp4"
            />
            Your browser does not support the video tag.
          </video>

          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-center gap-4 mb-6">
            <h1 className="text-5xl md:text-7xl font-bold text-white drop-shadow-2xl">
              POW Airdrop
            </h1>
            <Button
              onClick={() => setIsVideoModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#1EAEDB] hover:bg-[#31BFEC] text-white transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm"
              title="Watch Introduction Video"
            >
              <Play className="w-6 h-6" />
              <span className="hidden sm:inline text-lg font-semibold">
                Watch Video
              </span>
            </Button>
          </div>

          <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed drop-shadow-lg mb-8">
            Welcome to the POW token airdrop. POW is the governance token for
            Pact Protocol, enabling community participation in protocol
            governance. Eligible participants can claim their tokens on both the
            Voi and Algorand networks.
          </p>

          {/* Countdown in Hero Section */}
          {!isAirdropOpen && timeUntilEnd !== "Ended" && (
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-white drop-shadow-lg">
                Airdrop Opens In
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 max-w-2xl mx-auto px-2 md:px-0">
                {timeUntilOpen.split(" ").map((unit, index) => (
                  <div
                    key={index}
                    className="bg-white/10 backdrop-blur-sm rounded-xl p-2 md:p-4 border border-white/20 shadow-lg hover:shadow-xl transition-all"
                  >
                    <div className="text-2xl sm:text-4xl md:text-5xl font-bold text-white animate-pulse mb-1 md:mb-2">
                      {unit.replace(/[a-zA-Z]/g, "")}
                    </div>
                    <div className="text-[10px] sm:text-xs md:text-sm text-white/80 uppercase tracking-wider font-medium">
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
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-white drop-shadow-lg">
                Airdrop Ends In
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 max-w-2xl mx-auto px-2 md:px-0">
                {timeUntilEnd.split(" ").map((unit, index) => (
                  <div
                    key={index}
                    className="bg-white/10 backdrop-blur-sm rounded-xl p-2 md:p-4 border border-white/20 shadow-lg hover:shadow-xl transition-all"
                  >
                    <div className="text-2xl sm:text-4xl md:text-5xl font-bold text-white animate-pulse mb-1 md:mb-2">
                      {unit.replace(/[a-zA-Z]/g, "")}
                    </div>
                    <div className="text-[10px] sm:text-xs md:text-sm text-white/80 uppercase tracking-wider font-medium">
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
            <div className="mb-8">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 max-w-2xl mx-auto">
                <div className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
                  Airdrop Has Ended
                </div>
              </div>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              className="px-8 py-4 text-xl font-bold bg-[#1EAEDB] hover:bg-[#31BFEC] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
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
              className="px-8 py-4 text-xl font-bold border-2 border-white text-white hover:bg-white hover:text-black rounded-full shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm"
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
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/70 rounded-full mt-2 animate-pulse"></div>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {recipient.Voi > 0 && (
                        <div className="bg-card rounded-2xl p-8 shadow-[0_4px_20px_-4px_rgba(30,174,219,0.1)] border border-border/50 hover:shadow-[0_8px_30px_-4px_rgba(30,174,219,0.2)] transition-all hover:border-[#1EAEDB]/20 flex flex-col">
                          <h2 className="text-2xl font-semibold mb-3">
                            Voi Network
                          </h2>
                          <p className="text-3xl font-bold text-[#1EAEDB] mb-6">
                            {recipient.Voi.toFixed(6)} POW
                          </p>
                          <ClaimButton
                            network="voi"
                            amount={recipient.Voi}
                            address={recipient.Address}
                          />
                        </div>
                      )}
                      {recipient.Algo > 0 && (
                        <div className="bg-card rounded-xl p-8 shadow-md border border-border flex flex-col">
                          <h2 className="text-2xl font-semibold mb-3">
                            Algorand Network
                          </h2>
                          <p className="text-3xl font-bold text-[#1EAEDB] mb-6">
                            {recipient.Algo.toFixed(6)} POW
                          </p>
                          <ClaimButton
                            network="algo"
                            amount={recipient.Algo}
                            address={recipient.Address}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : recipientAddresses ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center max-w-md w-full">
              <p className="text-yellow-700">
                No airdrop found for the provided addresses
              </p>
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
                              setEnvoiNameInput(e.target.value);
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
                              setAlgoNameInput(e.target.value);
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
                        {addressInput.slice(0, 6)}...{addressInput.slice(-4)}
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
    </PageLayout>
  );
};

export default Airdrop;
