import React, { useState, useEffect } from "react";
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

// Define the type for airdrop data
interface AirdropEntry {
  Address: string;
  Voi: number;
  Algo: number;
  Total: number;
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

  const AIRDROP_START_TIME = new Date("2025-06-23T00:00:00Z").getTime(); // Adjust this timestamp
  const AIRDROP_END_TIME = new Date("2025-09-23T00:00:00Z").getTime(); // Adjust this timestamp

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
        !isAddressInWallet(address)
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
            ? `You are eligible for ${matchingEntry.Total} POW`
            : "This address is not eligible for the POW airdrop",
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
      <div className="container mx-auto px-4 py-8 max-w-[1400px]">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">POW Airdrop</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto text-left">
            Welcome to the POW token airdrop. POW is the governance token for
            Pact Protocol, enabling community participation in protocol
            governance. Eligible participants can claim their tokens on both the
            Voi and Algorand networks. Check your allocation below to get
            started.
          </p>
        </div>

        {/* Airdrop countdown - shows either opens or ends */}
        {!isAirdropOpen && timeUntilEnd !== "Ended" && (
          <div className="w-full max-w-6xl mb-12 text-center">
            <h2 className="text-2xl font-semibold mb-4">Airdrop Opens In</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 max-w-2xl mx-auto px-2 md:px-0">
              {timeUntilOpen.split(" ").map((unit, index) => (
                <div
                  key={index}
                  className="bg-card rounded-xl p-2 md:p-4 shadow-[0_4px_20px_-4px_rgba(30,174,219,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(30,174,219,0.2)] transition-all"
                >
                  <div className="text-2xl sm:text-4xl md:text-6xl font-bold bg-gradient-to-r from-[#1EAEDB] to-[#31BFEC] bg-clip-text text-transparent animate-pulse mb-1 md:mb-2">
                    {unit.replace(/[a-zA-Z]/g, "")}
                  </div>
                  <div className="text-[10px] sm:text-xs md:text-sm text-gray-600 uppercase tracking-wider font-medium">
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
          <div className="w-full max-w-6xl mb-12 text-center">
            <h2 className="text-2xl font-semibold mb-4">Airdrop Ends In</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 max-w-2xl mx-auto px-2 md:px-0">
              {timeUntilEnd.split(" ").map((unit, index) => (
                <div
                  key={index}
                  className="bg-card rounded-xl p-2 md:p-4 shadow-[0_4px_20px_-4px_rgba(30,174,219,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(30,174,219,0.2)] transition-all"
                >
                  <div className="text-2xl sm:text-4xl md:text-6xl font-bold bg-gradient-to-r from-[#1EAEDB] to-[#31BFEC] bg-clip-text text-transparent animate-pulse mb-1 md:mb-2">
                    {unit.replace(/[a-zA-Z]/g, "")}
                  </div>
                  <div className="text-[10px] sm:text-xs md:text-sm text-gray-600 uppercase tracking-wider font-medium">
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
          <div className="w-full max-w-6xl mb-12 text-center">
            <div className="bg-card/30 backdrop-blur-sm border border-[#1EAEDB]/20 rounded-xl p-6 max-w-2xl mx-auto">
              <div className="text-2xl font-bold text-[#1EAEDB]">
                Airdrop Has Ended
              </div>
            </div>
          </div>
        )}

        {/* Add new CTA section */}
        {recipientAddresses && (
          <div className="w-full mx-auto mb-8 text-center my-0">
            <div className="bg-gradient-to-r from-[#1EAEDB]/10 to-[#31BFEC]/10 rounded-xl p-6 border border-[#1EAEDB]/20">
              <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-[#1EAEDB] to-[#31BFEC] bg-clip-text text-transparent">
                Check Your Eligibility
              </h2>
              <p className="text-gray-600 mb-4">
                See if you qualify for the POW token airdrop
              </p>
              <Button
                className="px-6 py-3 rounded-full shadow font-bold bg-[#1EAEDB] hover:bg-[#31BFEC] text-white transition"
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
          </div>
        )}

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
            <div className="bg-card/30 backdrop-blur-sm rounded-2xl p-8 shadow-[0_4px_20px_-4px_rgba(30,174,219,0.1)] border border-[#1EAEDB]/20 max-w-xl w-full mx-auto my-0">
              <h2 className="text-3xl font-bold mb-2 text-center">
                Check Your Airdrop
              </h2>
              <p className="text-gray-600 text-center mb-6">
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
                        "px-6 py-4 h-14 text-lg rounded-full",
                        "sm:pr-[180px]",
                        !isAddressValid &&
                          addressInput &&
                          "border-red-500 focus:ring-red-500"
                      )}
                    />
                    <Button
                      className={cn(
                        "h-12 text-base font-bold bg-[#1EAEDB] hover:bg-[#31BFEC] disabled:opacity-50 rounded-full px-6",
                        "sm:absolute sm:right-1 sm:top-1"
                      )}
                      onClick={handleEligibilityCheck}
                      disabled={!addressInput || !isAddressValid || isChecking}
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
                      "p-6 rounded-2xl text-center shadow-[0_4px_20px_-4px_rgba(30,174,219,0.1)] border transition-all duration-500",
                      "animate-in fade-in duration-500",
                      eligibilityStatus.isEligible
                        ? "bg-card/30 backdrop-blur-sm border-[#1EAEDB]/20 hover:shadow-[0_8px_30px_-4px_rgba(30,174,219,0.2)]"
                        : "bg-card/30 backdrop-blur-sm border-border/50"
                    )}
                  >
                    {eligibilityStatus.isEligible ? (
                      <div className="animate-in slide-in-from-bottom duration-500 delay-200">
                        <h3 className="text-2xl font-bold text-[#1EAEDB] mb-2">
                          Congratulations!
                        </h3>
                        <p className="text-gray-600 mb-4">
                          {eligibilityStatus.message}
                        </p>
                        <Button
                          className="w-full text-lg px-6 py-3 rounded-xl shadow-lg font-bold bg-[#1EAEDB] hover:bg-[#31BFEC] text-white transition"
                          onClick={() =>
                            (window.location.href = `/airdrop/${addressInput}`)
                          }
                        >
                          Claim Your POW Tokens
                        </Button>
                      </div>
                    ) : (
                      <div className="animate-in slide-in-from-bottom duration-500 delay-200">
                        <h3 className="text-2xl font-bold text-gray-700 mb-2">
                          Not Eligible
                        </h3>
                        <p className="text-gray-600">
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
    </PageLayout>
  );
};

export default Airdrop;
