import React, { useState, useEffect } from "react";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { useWallet } from "@txnlab/use-wallet-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import ReactConfetti from "react-confetti";
import { CONTRACT, abi } from "ulujs";
import BigNumber from "bignumber.js";

// Define the type for airdrop data
interface AirdropEntry {
  Address: string;
  Voi: number;
  Algo: number;
  Total: number;
  approvals?: ApprovalData[];
}

interface ApprovalData {
  spender: string;
  amount: string;
  round: number;
  timestamp: number;
}

const Airdrop: React.FC = () => {
  const {
    activeNetwork,
    activeAccount,
    algodClient,
    signTransactions,
    activeWalletAddresses,
  } = useWallet();
  const [airdropData, setAirdropData] = useState<AirdropEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipientsData, setRecipientsData] = useState<AirdropEntry[]>([]);
  const [addressInput, setAddressInput] = useState("");
  const { recipients } = useParams<{ recipients: string }>();
  const recipientAddresses = recipients?.split(",");
  const { toast } = useToast();
  const [isClaimLoading, setIsClaimLoading] = useState<{
    [key: string]: { voi: boolean; algo: boolean };
  }>({});
  const [isAirdropOpen, setIsAirdropOpen] = useState(false);
  const [timeUntilOpen, setTimeUntilOpen] = useState<string>("");
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
  const [claimProgress, setClaimProgress] = useState({
    totalClaimed: 0,
    totalEligible: 0,
    percentageClaimed: 0,
  });
  const [pageLoading, setPageLoading] = useState(true);
  const [approvals, setApprovals] = useState<ApprovalData[]>([]);
  const [recipientApprovals, setRecipientApprovals] = useState<{
    [address: string]: {
      approvals: ApprovalData[];
      isLoading: boolean;
      error: string | null;
    };
  }>({});

  const AIRDROP_START_TIME = new Date("2025-05-28T00:00:00Z").getTime();
  const AIRDROP_END_TIME = new Date("2026-05-28T00:00:00Z").getTime(); // Adjust this timestamp

  // Add network checking functions
  const isVoiNetwork = () => activeNetwork.toLowerCase().includes("voimain");
  const isAlgoNetwork = () => activeNetwork.toLowerCase().includes("mainnet");

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
          "https://nautilusoss.github.io/airdrop/data/001-pxd.json"
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
      const timeUntilStart = AIRDROP_START_TIME - now;
      const timeUntilEnd = AIRDROP_END_TIME - now;

      if (timeUntilStart > 0) {
        // Airdrop hasn't started
        const countdown = formatCountdown(timeUntilStart);
        setTimeUntilOpen(countdown);
        setIsAirdropOpen(false);
      } else if (timeUntilEnd > 0) {
        // Airdrop is active
        const countdown = formatCountdown(timeUntilEnd);
        setTimeUntilOpen(countdown);
        setIsAirdropOpen(true);
        fetchClaimProgress();
      } else {
        // Airdrop has ended
        setTimeUntilOpen("");
        setIsAirdropOpen(false);
      }
    };

    const formatCountdown = (timeLeft: number) => {
      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    };

    const timer = setInterval(updateCountdown, 1000);
    updateCountdown();

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
    try {
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

      const accInfo = await algodClient
        .accountInformation(recipientAddress)
        .do();
      const balance = accInfo.amount;
      const minBalance = accInfo["min-balance"];
      const requiredBalance = minBalance + 0.01 * 10 ** 6;
      const availableBalance = balance - minBalance;

      if (availableBalance < requiredBalance) {
        toast({
          variant: "destructive",
          description: (
            <div>
              <p>Insufficient balance</p>
              <p>
                Please send at least {requiredBalance / 10 ** 6} ALGO to the
                address before claiming.
              </p>
              <p>
                The minimum balance is {minBalance / 10 ** 6} ALGO to keep the
                account active.
              </p>
              <p>
                Need VOI?{" "}
                <a
                  href="https://faucet.voirewards.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#FF69B4" }}
                >
                  Get VOI
                </a>
              </p>
            </div>
          ),
          duration: 3000,
        });
        return;
      }
    } catch (error) {
      console.error("Error in claim operation:", error);
      toast({
        variant: "destructive",
        description: "Failed to claim PXD",
        duration: 3000,
      });
    }
    setIsClaimLoading((prev) => ({
      ...prev,
      [recipientAddress]: {
        ...prev[recipientAddress],
        [network]: true,
      },
    }));
    try {
      const ctcInfo = 419714;
      const ci = new CONTRACT(ctcInfo, algodClient, undefined, abi.arc200, {
        addr: recipientAddress,
        sk: new Uint8Array(),
      });
      const amountBI = BigInt(
        new BigNumber(amount).multipliedBy(10 ** 8).toFixed()
      );
      const transferFromR = await ci.arc200_transferFrom(
        "NXPRBWKSBICV7P3YDK5CAQVQEJEJ7A7B33QRDBOVQWIOCU2TM4ZWQUFQ5Q",
        recipientAddress,
        amountBI
      );
      if (!transferFromR.success) {
        console.log({ transferFromR });
        throw new Error("Failed to transfer from");
      }

      // Convert base64 strings to Uint8Arrays using browser APIs
      const txnUint8Arrays = transferFromR.txns.map((txn: string) => {
        const binaryString = atob(txn);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
      });

      // Sign the transactions
      const signedTxns = await signTransactions(txnUint8Arrays);

      // Send the signed transactions
      const { txId } = await algodClient.sendRawTransaction(signedTxns).do();

      console.log({ txId });

      // Reset approval data for the recipient after successful claim
      setRecipientApprovals((prev) => ({
        ...prev,
        [recipientAddress]: {
          ...prev[recipientAddress],
          approvals:
            prev[recipientAddress]?.approvals.map((approval) => ({
              ...approval,
              amount: "0",
            })) || [],
        },
      }));

      // Refetch claim progress after successful claim
      await fetchClaimProgress();

      // After successful claim, show confetti
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 10000); // Hide confetti after 10 seconds

      toast({
        description: `Successfully claimed ${amount} PXD on ${network} network`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Claim error:", error);
      toast({
        variant: "destructive",
        description:
          error instanceof Error ? error.message : "Failed to claim PXD",
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
    className,
  }: {
    network: "voi" | "algo";
    amount: number;
    address: string;
    className?: string;
  }) => (
    <Button
      className={className}
      disabled={
        isLoading ||
        (isClaimLoading[address]?.[network] ?? false) ||
        !isAddressInWallet(address) ||
        !isAirdropOpen ||
        (network === "voi" ? !isVoiNetwork() : !isAlgoNetwork())
      }
      onClick={() => handleClaim(network, amount, address)}
      title={
        !isAirdropOpen
          ? `Airdrop opens in ${timeUntilOpen}`
          : !isAddressInWallet(address)
          ? "Please connect the recipient wallet"
          : ""
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
        : "Claim PXD"}
    </Button>
  );

  const validateAddress = (address: string) => {
    // Basic Algorand address validation
    const isValid = /^[A-Z2-7]{58}$/i.test(address);
    setIsAddressValid(isValid);
    return isValid;
  };

  const handleEligibilityCheck = async () => {
    if (!validateAddress(addressInput)) return;

    setIsChecking(true);
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
            ? `You are eligible for ${matchingEntry.Total} PXD`
            : "This address is not eligible for the PXD airdrop",
        });
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

  // Update the countdown timer section
  const CountdownBox = ({ value, label }: { value: string; label: string }) => (
    <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-[#FF69B4]/20 shadow-[0_0_15px_rgba(255,105,180,0.1)] hover:shadow-[0_0_20px_rgba(255,105,180,0.2)] transition-all">
      <div className="text-4xl md:text-6xl font-bold text-[#FF69B4] animate-pulse">
        {value}
      </div>
      <div className="text-sm text-gray-400 uppercase tracking-wider">
        {label}
      </div>
    </div>
  );

  const navigate = useNavigate();

  // Add new function to fetch claim progress
  const fetchClaimProgress = async () => {
    try {
      // TODO: Replace with actual API call
      // Mock data for now
      const ci = new CONTRACT(419714, algodClient, undefined, abi.arc200, {
        addr: "NXPRBWKSBICV7P3YDK5CAQVQEJEJ7A7B33QRDBOVQWIOCU2TM4ZWQUFQ5Q",
        sk: new Uint8Array(),
      });
      const balanceR = await ci.arc200_balanceOf(
        "NXPRBWKSBICV7P3YDK5CAQVQEJEJ7A7B33QRDBOVQWIOCU2TM4ZWQUFQ5Q"
      );
      if (!balanceR.success) {
        throw new Error("Failed to fetch balance");
      }
      const balance = Math.floor(Number(balanceR.returnValue) / 10 ** 8);
      const claimed = 10000000 - balance;
      const progress = {
        totalClaimed: claimed,
        totalEligible: 10000000,
        percentageClaimed: (claimed / 10000000) * 100,
      };
      setClaimProgress(progress);
    } catch (error) {
      console.error("Error fetching claim progress:", error);
    }
  };

  useEffect(() => {
    // Simulate initial page load
    setTimeout(() => setPageLoading(false), 1000);
  }, []);

  useEffect(() => {
    const fetchApprovals = async () => {
      try {
        const response = await fetch(
          "https://voi-mainnet-mimirapi.nftnavigator.xyz/arc200/approvals?contractId=419714&owner=NXPRBWKSBICV7P3YDK5CAQVQEJEJ7A7B33QRDBOVQWIOCU2TM4ZWQUFQ5Q&limit=1"
        );

        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const data = await response.json();
        setApprovals(data.approvals);
      } catch (err) {
        console.error("Error in fetch operation:", err);
      }
    };

    fetchApprovals();
  }, []);

  // Add new function to fetch approvals for a specific address
  const fetchApprovalsForAddress = async (address: string) => {
    if (recipientApprovals[address]?.approvals.length > 0) return; // Already fetched

    setRecipientApprovals((prev) => ({
      ...prev,
      [address]: {
        approvals: [],
        isLoading: true,
        error: null,
      },
    }));

    try {
      const response = await fetch(
        `https://voi-mainnet-mimirapi.nftnavigator.xyz/arc200/approvals?contractId=${419714}&owner=${"NXPRBWKSBICV7P3YDK5CAQVQEJEJ7A7B33QRDBOVQWIOCU2TM4ZWQUFQ5Q"}&spender=${address}&limit=1`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch approvals");
      }

      const data = await response.json();

      setRecipientApprovals((prev) => ({
        ...prev,
        [address]: {
          approvals: data.approvals || [],
          isLoading: false,
          error: null,
        },
      }));
    } catch (err) {
      setRecipientApprovals((prev) => ({
        ...prev,
        [address]: {
          approvals: [],
          isLoading: false,
          error:
            err instanceof Error ? err.message : "Failed to fetch approvals",
        },
      }));
    }
  };

  // Update the recipient card rendering to include approvals
  const RecipientCard = ({ recipient }: { recipient: AirdropEntry }) => {
    const approvalData = recipientApprovals[recipient.Address];

    // Parse approval amount from string to number, handling decimals correctly
    const getApprovalAmount = (approval: ApprovalData) => {
      // Convert from base units (assuming 8 decimal places for PXD token)
      return Number(BigInt(approval.amount)) / Math.pow(10, 8);
    };

    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            fetchApprovalsForAddress(recipient.Address);
          }
        },
        { threshold: 0.1 }
      );

      const element = document.getElementById(`recipient-${recipient.Address}`);
      if (element) {
        observer.observe(element);
      }

      return () => observer.disconnect();
    }, [recipient.Address]);

    return (
      <div
        id={`recipient-${recipient.Address}`}
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

        <div className="mt-8">
          <div>
            {approvalData?.isLoading ? (
              <div className="flex items-center justify-center py-8 md:max-w-[50%]">
                <div className="animate-spin h-8 w-8 border-4 border-[#FF69B4] border-t-transparent rounded-full" />
              </div>
            ) : approvalData?.error ? (
              <div className="text-red-500 p-4 rounded-xl bg-black/20 border border-red-500/20 md:max-w-[50%]">
                {approvalData.error}
              </div>
            ) : approvalData?.approvals.length > 0 ? (
              <div className="space-y-4 md:max-w-[50%]">
                {approvalData.approvals.map((approval, index) => {
                  const approvalAmount = getApprovalAmount(approval);
                  return approvalAmount > 0 ? (
                    <div
                      key={index}
                      className="relative bg-black/30 rounded-2xl p-8 border border-border/50 transition-all duration-300"
                    >
                      <div className="absolute inset-0 rounded-2xl shadow-[0_4px_20px_-4px_rgba(255,105,180,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(255,105,180,0.2)] hover:border hover:border-[#FF69B4]/20 pointer-events-none transition-all duration-300" />
                      <h2 className="text-2xl font-semibold mb-3">
                        Voi Network
                      </h2>
                      <p className="text-3xl font-bold text-[#FF69B4] mb-6">
                        {approvalAmount.toFixed(6)} PXD
                      </p>
                      <ClaimButton
                        network="voi"
                        amount={approvalAmount}
                        address={recipient.Address}
                        className="mt-auto text-lg px-6 py-3 rounded-xl font-bold bg-[#FF69B4] hover:bg-[#FF8AC7] text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  ) : (
                    <div
                      key={index}
                      className="bg-black/30 rounded-2xl p-8 border border-border/50 text-center"
                    >
                      <h2 className="text-2xl font-semibold mb-3 text-gray-400">
                        Already Claimed
                      </h2>
                      <p className="text-gray-500">
                        You have already claimed your PXD tokens for this
                        address
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-400 text-center py-8 bg-black/20 rounded-xl border border-border/50">
                No approvals found for this address
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <PageLayout>
      <div
        className={cn(
          "transition-opacity duration-500",
          pageLoading ? "opacity-0" : "opacity-100"
        )}
      >
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
        <div className="min-h-screen bg-gradient-to-b from-transparent via-pink-950/30 to-transparent">
          <div className="container mx-auto px-4 py-12 max-w-[1400px]">
            <div className="text-center mb-16">
              <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-[#FF69B4] to-[#FF8AC7] bg-clip-text text-transparent">
                PXD Airdrop
              </h1>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Welcome to the PXD token airdrop. PXD is the rewards token for
                Nautilus NFT Marketplace. Eligible participants can claim their
                tokens on Voi Network. Check your allocation below to get
                started.
              </p>
            </div>

            <div className="bg-black/50 backdrop-blur-sm rounded-3xl border border-[#FF69B4]/20 p-8 mb-16 shadow-xl">
              {!isAirdropOpen ? (
                <div className="w-full max-w-6xl mb-12 text-center">
                  <h2 className="text-2xl font-semibold mb-4">
                    Airdrop Opens In
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 max-w-2xl mx-auto px-2 md:px-0">
                    {timeUntilOpen.split(" ").map((unit, index) => (
                      <div
                        key={index}
                        className="bg-black/30 rounded-xl p-2 md:p-4 shadow-[0_4px_20px_-4px_rgba(255,105,180,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(255,105,180,0.2)] transition-all"
                      >
                        <div className="text-2xl sm:text-4xl md:text-6xl font-bold bg-gradient-to-r from-[#FF69B4] to-[#FF8AC7] bg-clip-text text-transparent animate-pulse mb-1 md:mb-2">
                          {unit.replace(/[a-zA-Z]/g, "")}
                        </div>
                        <div className="text-[10px] sm:text-xs md:text-sm text-gray-400 uppercase tracking-wider font-medium">
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
              ) : (
                timeUntilOpen && (
                  <div className="w-full max-w-6xl mb-12 text-center">
                    <h2 className="text-2xl font-semibold mb-4">
                      Airdrop Ends In
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 max-w-2xl mx-auto px-2 md:px-0">
                      {timeUntilOpen.split(" ").map((unit, index) => (
                        <div
                          key={index}
                          className="bg-black/30 rounded-xl p-2 md:p-4 shadow-[0_4px_20px_-4px_rgba(255,105,180,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(255,105,180,0.2)] transition-all"
                        >
                          <div className="text-2xl sm:text-4xl md:text-6xl font-bold bg-gradient-to-r from-[#FF69B4] to-[#FF8AC7] bg-clip-text text-transparent animate-pulse mb-1 md:mb-2">
                            {unit.replace(/[a-zA-Z]/g, "")}
                          </div>
                          <div className="text-[10px] sm:text-xs md:text-sm text-gray-400 uppercase tracking-wider font-medium">
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
                )
              )}

              {isAirdropOpen && (
                <div className="w-full max-w-6xl mb-12 text-center">
                  <h2 className="text-2xl font-semibold mb-4">
                    Airdrop Progress
                  </h2>
                  <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-[#FF69B4]/20">
                    <div className="mb-4">
                      <div className="h-4 w-full bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#FF69B4] transition-all duration-1000"
                          style={{
                            width: `${claimProgress.percentageClaimed}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="text-center p-2 sm:p-0">
                        <p className="text-xs sm:text-sm text-gray-400">
                          Total Eligible
                        </p>
                        <p className="text-lg sm:text-xl font-bold text-[#FF69B4]">
                          {claimProgress.totalEligible.toLocaleString()} PXD
                        </p>
                      </div>
                      <div className="text-center p-2 sm:p-0">
                        <p className="text-xs sm:text-sm text-gray-400">
                          Total Claimed
                        </p>
                        <p className="text-lg sm:text-xl font-bold text-[#FF69B4]">
                          {claimProgress.totalClaimed.toLocaleString()} PXD
                        </p>
                      </div>
                      <div className="text-center p-2 sm:p-0">
                        <p className="text-xs sm:text-sm text-gray-400">
                          Progress
                        </p>
                        <p className="text-lg sm:text-xl font-bold text-[#FF69B4]">
                          {claimProgress.percentageClaimed.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="max-w-xl mx-auto bg-black/50 backdrop-blur-md rounded-3xl border border-[#FF69B4]/20 p-8 shadow-2xl hover:shadow-[0_8px_30px_-4px_rgba(255,105,180,0.2)] transition-all">
              <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-[#FF69B4] to-[#FF8AC7] bg-clip-text text-transparent">
                Check Your Eligibility
              </h2>
              <p className="text-gray-300 mb-4">
                See if you qualify for the PXD token airdrop
              </p>
              <Button
                className="px-6 py-3 rounded-full shadow font-bold bg-[#FF69B4] hover:bg-[#FF8AC7] text-white transition"
                onClick={() => {
                  navigate("/airdrop");
                  const element = document.getElementById("wallet-address");
                  element?.scrollIntoView({ behavior: "smooth" });
                  element?.focus();
                }}
              >
                Check Now
              </Button>
            </div>

            <div className="min-h-[50vh] flex items-center justify-center flex-col gap-6">
              {isLoading && (
                <div className="text-center p-8">
                  <div className="animate-spin h-8 w-8 border-4 border-[#FF69B4] border-t-transparent rounded-full mx-auto mb-4"></div>
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
                  <div className="w-full max-w-6xl mb-8 mt-16">
                    <h1 className="text-3xl font-bold mb-6">Summary</h1>
                    <div className="bg-black/30 rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(255,105,180,0.1)] border border-border/50 hover:shadow-[0_8px_30px_-4px_rgba(255,105,180,0.2)] transition-shadow mb-12">
                      <h2 className="text-xl font-semibold mb-4">
                        Total Rewards
                      </h2>
                      <div className="flex flex-col gap-2">
                        {recipientsData.reduce(
                          (sum, recipient) => sum + recipient.Voi,
                          0
                        ) > 0 && (
                          <div className="flex justify-between mb-2">
                            <span className="text-gray-400">VOI Network</span>
                            <span className="font-semibold">
                              {recipientsData
                                .reduce(
                                  (sum, recipient) => sum + recipient.Voi,
                                  0
                                )
                                .toFixed(6)}{" "}
                              PXD
                            </span>
                          </div>
                        )}
                        {recipientsData.reduce(
                          (sum, recipient) => sum + recipient.Algo,
                          0
                        ) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">
                              Algorand Network
                            </span>
                            <span className="font-semibold">
                              {recipientsData
                                .reduce(
                                  (sum, recipient) => sum + recipient.Algo,
                                  0
                                )
                                .toFixed(6)}{" "}
                              PXD
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-border/50">
                          <span className="text-gray-400">Total Rewards</span>
                          <span className="font-semibold">
                            {recipientsData
                              .reduce(
                                (sum, recipient) => sum + recipient.Total,
                                0
                              )
                              .toFixed(6)}{" "}
                            PXD
                          </span>
                        </div>
                      </div>
                    </div>
                    {recipientsData.map((recipient) => (
                      <RecipientCard
                        key={recipient.Address}
                        recipient={recipient}
                      />
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
                <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 shadow-[0_4px_20px_-4px_rgba(255,105,180,0.1)] border border-[#FF69B4]/20 max-w-xl w-full mx-auto my-0">
                  <h2 className="text-3xl font-bold mb-2 text-center">
                    Check Your Airdrop
                  </h2>
                  <p className="text-gray-300 text-center mb-6">
                    Enter your wallet address to check your eligibility
                  </p>

                  <div className="space-y-6">
                    <div className="relative">
                      <Label
                        htmlFor="wallet-address"
                        className={cn(
                          "absolute left-3 transition-all duration-200 z-10",
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
                            "px-6 py-4 h-14 text-lg rounded-full bg-black/50 border-[#FF69B4]/20 text-white placeholder-gray-400",
                            "focus:border-[#FF69B4] focus:ring-[#FF69B4]",
                            !isAddressValid &&
                              addressInput &&
                              "border-red-500 focus:ring-red-500"
                          )}
                        />
                        <Button
                          className={cn(
                            "h-12 text-base font-bold bg-[#FF69B4] hover:bg-[#FF8AC7] disabled:opacity-50 rounded-full px-6",
                            "sm:absolute sm:right-1 sm:top-1"
                          )}
                          onClick={handleEligibilityCheck}
                          disabled={
                            !addressInput || !isAddressValid || isChecking
                          }
                        >
                          {isChecking ? (
                            <div className="flex items-center gap-2">
                              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                              <span>Checking</span>
                            </div>
                          ) : (
                            "Check Eligibility"
                          )}
                        </Button>
                      </div>
                      {!isAddressValid && addressInput && (
                        <p className="text-red-500 text-sm mt-1">
                          Please enter a valid wallet address
                        </p>
                      )}
                    </div>

                    {eligibilityStatus.message && (
                      <div
                        className={cn(
                          "p-6 rounded-2xl text-center shadow-[0_4px_20px_-4px_rgba(255,105,180,0.1)] border transition-all duration-500",
                          "animate-in fade-in duration-500",
                          eligibilityStatus.isEligible
                            ? "bg-black/30 backdrop-blur-sm border-[#FF69B4]/20 hover:shadow-[0_8px_30px_-4px_rgba(255,105,180,0.2)]"
                            : "bg-black/30 backdrop-blur-sm border-border/50"
                        )}
                      >
                        {eligibilityStatus.isEligible ? (
                          <div className="animate-in slide-in-from-bottom duration-500 delay-200">
                            <h3 className="text-2xl font-bold text-[#FF69B4] mb-2">
                              Congratulations!
                            </h3>
                            <p className="text-gray-300 mb-4">
                              {eligibilityStatus.message}
                            </p>
                            <Button
                              className="w-full text-lg px-6 py-3 rounded-xl shadow-lg font-bold bg-[#FF69B4] hover:bg-[#FF8AC7] text-white transition"
                              onClick={() =>
                                (window.location.href = `/airdrop/${addressInput}`)
                              }
                            >
                              Claim Your PXD Tokens
                            </Button>
                          </div>
                        ) : (
                          <div className="animate-in slide-in-from-bottom duration-500 delay-200">
                            <h3 className="text-2xl font-bold text-gray-700 mb-2">
                              Not Eligible
                            </h3>
                            <p className="text-gray-300">
                              {eligibilityStatus.message}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {pageLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="animate-spin h-12 w-12 border-4 border-[#FF69B4] border-t-transparent rounded-full" />
        </div>
      )}
    </PageLayout>
  );
};

export default Airdrop;
