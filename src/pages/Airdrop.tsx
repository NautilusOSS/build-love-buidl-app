import React, { useState, useEffect } from "react";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useParams } from "react-router-dom";
import { useWallet } from "@txnlab/use-wallet-react";
import algosdk from "algosdk";

// Define the type for airdrop data
interface AirdropEntry {
  Address: string;
  Voi: number;
  Algo: number;
  Total: number;
}

const Airdrop: React.FC = () => {
  const { activeNetwork, activeAccount, algodClient, signTransactions } =
    useWallet();
  const [airdropData, setAirdropData] = useState<AirdropEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipientsData, setRecipientsData] = useState<AirdropEntry[]>([]);
  const [addressInput, setAddressInput] = useState("");
  const { recipients } = useParams<{ recipients: string }>();
  const recipientAddresses = recipients?.split(",");
  const { toast } = useToast();
  const [isClaimLoading, setIsClaimLoading] = useState<{
    voi: boolean;
    algo: boolean;
  }>({
    voi: false,
    algo: false,
  });

  const breadCrumb = [
    {
      to: "/",
      label: "[POW]",
      // First [POW] always links home
    },
    ...(recipientAddresses
      ? [
          {
            to: "/airdrop",
            label: "Airdrop",
          },
          {
            label:
              recipientAddresses.length > 1
                ? `Recipients (${recipientAddresses.length})`
                : `${recipientAddresses[0].slice(
                    0,
                    5
                  )}...${recipientAddresses[0].slice(-5)}`,
            isCurrentPage: true,
          },
        ]
      : [
          {
            label: "Airdrop",
            isCurrentPage: true,
          },
        ]),
  ];

  // Add network checking functions
  const isVoiNetwork = () => activeNetwork.toLowerCase().includes("voimain");
  const isAlgoNetwork = () => activeNetwork.toLowerCase().includes("mainnet");

  const isAddressInWallet = (address: string) => {
    return activeAccount?.address?.toLowerCase() === address.toLowerCase();
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
    if (!activeAccount) {
      toast({
        variant: "destructive",
        description: "Please connect your wallet first",
        duration: 3000,
      });
      return;
    }

    setIsClaimLoading(prev => ({ ...prev, [network]: true }));
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
      setIsClaimLoading(prev => ({ ...prev, [network]: false }));
    }
  };

  return (
    <PageLayout breadcrumb={breadCrumb}>
      <div className="container mx-auto px-4 py-8 max-w-[1400px]">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">POW Airdrop</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto text-left">
            Welcome to the POW token airdrop. POW is the governance token for Pact Protocol, 
            enabling community participation in protocol governance. Eligible participants 
            can claim their tokens on both the Voi and Algorand networks. Check your 
            allocation below to get started.
          </p>
        </div>

        <div className="min-h-[50vh] flex items-center justify-center flex-col gap-6">
          {isLoading && (
            <div className="text-center p-8">
              <div className="animate-spin h-8 w-8 border-4 border-[#8B5CF6] border-t-transparent rounded-full mx-auto mb-4"></div>
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
                <div className="bg-card rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(139,92,246,0.1)] border border-border/50 hover:shadow-[0_8px_30px_-4px_rgba(139,92,246,0.2)] transition-shadow mb-12">
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
                        <div className="bg-card rounded-2xl p-8 shadow-[0_4px_20px_-4px_rgba(139,92,246,0.1)] border border-border/50 hover:shadow-[0_8px_30px_-4px_rgba(139,92,246,0.2)] transition-all hover:border-[#8B5CF6]/20 flex flex-col">
                          <h2 className="text-2xl font-semibold mb-3">
                            Voi Network
                          </h2>
                          <p className="text-3xl font-bold text-[#8B5CF6] mb-6">
                            {recipient.Voi.toFixed(6)} POW
                          </p>
                          <Button
                            className="mt-auto text-lg px-6 py-3 rounded-xl shadow-lg font-bold bg-[#8B5CF6] hover:bg-[#9b87f5] text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isLoading || isClaimLoading.voi || !isAddressInWallet(recipient.Address) || !isVoiNetwork()}
                            onClick={() => handleClaim('voi', recipient.Voi, recipient.Address)}
                            title={!isAddressInWallet(recipient.Address) ? "Please connect the recipient wallet" : ""}
                          >
                            {isClaimLoading.voi 
                              ? "Claiming..."
                              : !isAddressInWallet(recipient.Address)
                              ? "Connect Wallet"
                              : !isVoiNetwork()
                              ? "Switch to VOI Network"
                              : "Claim POW"}
                          </Button>
                        </div>
                      )}
                      {recipient.Algo > 0 && (
                        <div className="bg-card rounded-xl p-8 shadow-md border border-border flex flex-col">
                          <h2 className="text-2xl font-semibold mb-3">
                            Algorand Network
                          </h2>
                          <p className="text-3xl font-bold text-[#8B5CF6] mb-6">
                            {recipient.Algo.toFixed(6)} POW
                          </p>
                          <Button
                            className="mt-auto text-lg px-6 py-3 rounded-xl shadow-lg font-bold bg-[#8B5CF6] hover:bg-[#9b87f5] text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isLoading || isClaimLoading.algo || !isAddressInWallet(recipient.Address) || !isAlgoNetwork()}
                            onClick={() => handleClaim('algo', recipient.Algo, recipient.Address)}
                            title={!isAddressInWallet(recipient.Address) ? "Please connect the recipient wallet" : ""}
                          >
                            {isClaimLoading.algo 
                              ? "Claiming..."
                              : !isAddressInWallet(recipient.Address)
                              ? "Connect Wallet"
                              : !isAlgoNetwork()
                              ? "Switch to Algorand Network"
                              : "Claim POW"}
                          </Button>
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
            <div className="bg-card rounded-2xl p-8 shadow-[0_4px_20px_-4px_rgba(139,92,246,0.1)] border border-border/50 hover:shadow-[0_8px_30px_-4px_rgba(139,92,246,0.2)] transition-all hover:border-[#8B5CF6]/20 max-w-md w-full">
              <h2 className="text-2xl font-semibold mb-4 text-center">
                Check Your Airdrop
              </h2>
              <p className="text-center mb-6 text-gray-600">
                Enter your wallet address to check your eligible airdrop rewards
              </p>
              <div className="space-y-4">
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="Enter wallet address"
                  className="w-full px-6 py-3 border-2 border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-[#8B5CF6] text-lg text-gray-900 placeholder:text-gray-400"
                />
                <Button
                  className="text-lg px-8 py-4 rounded-xl shadow-lg font-bold bg-[#8B5CF6] hover:bg-[#9b87f5] text-white transition w-full"
                  onClick={() => {
                    if (addressInput) {
                      window.location.href = `/airdrop/${addressInput}`;
                    }
                  }}
                  disabled={!addressInput}
                >
                  Check Airdrop
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default Airdrop;
