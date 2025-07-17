import React, { useState, useEffect } from "react";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallet } from "@txnlab/use-wallet-react";
import { useToast } from "@/components/ui/use-toast";
import {
  ArrowDownUp,
  ArrowUpDown,
  Coins,
  Wallet,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import algosdk from "algosdk";
import { CONTRACT, abi } from "ulujs";
import BigNumber from "bignumber.js";

const pALGO: React.FC = () => {
  const { activeAccount, activeNetwork, algodClient, signTransactions } =
    useWallet();
  const { toast } = useToast();

  // State for minting interface
  const [algoAmount, setAlgoAmount] = useState<string>("");
  const [palgoAmount, setPalgoAmount] = useState<string>("");
  const [isMinting, setIsMinting] = useState<boolean>(false);
  const [isRedeeming, setIsRedeeming] = useState<boolean>(false);
  const [algoBalance, setAlgoBalance] = useState<number>(0);
  const [palgoBalance, setPalgoBalance] = useState<number>(0);
  const [exchangeRate, setExchangeRate] = useState<number>(1.0); // 1 ALGO = 1 pALGO (1:1 ratio)
  const [slippage, setSlippage] = useState<number>(0.5); // 0.5%
  const [direction, setDirection] = useState<"mint" | "redeem">("mint");
  const [loading, setLoading] = useState<boolean>(true);

  // pALGO contract configuration
  const CONTRACT_CONFIG = {
    voi: {
      wnt200: 40263883, // wraps network token as arc200
      saw200: 40263898, // unwraps arc200 as asa
    },
    algorand: {
      wnt200: 0, // TODO: Add Algorand contract IDs
      saw200: 0, // TODO: Add Algorand contract IDs
    }
  };

  // Get contract IDs based on active network
  const getContractIds = () => {
    if (activeNetwork?.toLowerCase().includes('voi')) {
      return CONTRACT_CONFIG.voi;
    }
    return CONTRACT_CONFIG.algorand;
  };

  const { wnt200: WNT200_CONTRACT_ID, saw200: SAW200_CONTRACT_ID } = getContractIds();

  useEffect(() => {
    if (activeAccount && algodClient) {
      fetchBalances();
      fetchExchangeRate();
    }
  }, [activeAccount, algodClient]);

  const fetchBalances = async () => {
    if (!activeAccount || !algodClient) return;

    try {
      setLoading(true);

      // Fetch ALGO balance
      const accountInfo = await algodClient
        .accountInformation(activeAccount.address)
        .do();
      const algoBalanceMicro = accountInfo.amount || 0;
      setAlgoBalance(algoBalanceMicro / 1e6);

      // Fetch pALGO balance (ARC200 token)
      try {
        const palgoContract = new CONTRACT(
          WNT200_CONTRACT_ID,
          algodClient,
          undefined,
          abi.nt200,
          {
            addr: activeAccount.address,
            sk: new Uint8Array(),
          }
        );

        const balanceResult = await palgoContract.arc200_balanceOf(
          activeAccount.address
        );
        if (balanceResult.success) {
          setPalgoBalance(Number(balanceResult.returnValue) / 1e6);
        } else {
          setPalgoBalance(0);
        }
      } catch (error) {
        console.log("User not opted into pALGO token");
        setPalgoBalance(0);
      }
    } catch (error) {
      console.error("Error fetching balances:", error);
      toast({
        variant: "destructive",
        description: "Failed to fetch balances",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchExchangeRate = async () => {
    // pALGO maintains a 1:1 ratio with ALGO
    setExchangeRate(1.0);
  };

  const calculateOutputAmount = (inputAmount: string, isMinting: boolean) => {
    if (!inputAmount || parseFloat(inputAmount) <= 0) return "0";

    const input = parseFloat(inputAmount);
    let output: number;

    if (isMinting) {
      // Minting: ALGO → pALGO
      output = input * exchangeRate;
    } else {
      // Redeeming: pALGO → ALGO
      output = input / exchangeRate;
    }

    // Apply slippage
    const slippageMultiplier = 1 - slippage / 100;
    return (output * slippageMultiplier).toFixed(6);
  };

  const handleInputChange = (value: string, isAlgoInput: boolean) => {
    if (isAlgoInput) {
      setAlgoAmount(value);
      if (direction === "mint") {
        setPalgoAmount(calculateOutputAmount(value, true));
      } else {
        setAlgoAmount(calculateOutputAmount(value, false));
      }
    } else {
      setPalgoAmount(value);
      if (direction === "mint") {
        setAlgoAmount(calculateOutputAmount(value, false));
      } else {
        setPalgoAmount(calculateOutputAmount(value, true));
      }
    }
  };

  const handleMint = async () => {
    if (!activeAccount || !algodClient) {
      toast({
        variant: "destructive",
        description: "Please connect your wallet first",
        duration: 3000,
      });
      return;
    }

    if (!algoAmount || parseFloat(algoAmount) <= 0) {
      toast({
        variant: "destructive",
        description: "Please enter a valid amount",
        duration: 3000,
      });
      return;
    }

    if (parseFloat(algoAmount) > algoBalance) {
      toast({
        variant: "destructive",
        description: "Insufficient ALGO balance",
        duration: 3000,
      });
      return;
    }

    setIsMinting(true);
    try {
      // Convert amount to microAlgos
      const amountMicroAlgos = new BigNumber(algoAmount)
        .multipliedBy(1e6)
        .toFixed(0);

      // Create contract instance
      const palgoContract = new CONTRACT(
        WNT200_CONTRACT_ID,
        algodClient,
        undefined,
        abi.custom,
        {
          addr: activeAccount.address,
          sk: new Uint8Array(),
        }
      );

      // Build mint transaction
      const builder = {
        token: new CONTRACT(
          WNT200_CONTRACT_ID,
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

      // Mint transaction
      const txnO = (await builder.token.mint(BigInt(amountMicroAlgos))).obj;
      buildN.push({
        ...txnO,
        note: new TextEncoder().encode(`Mint pALGO: ${algoAmount} ALGO`),
      });

      palgoContract.setPaymentAmount(1e5);
      palgoContract.setFee(3000);
      palgoContract.setBeaconId(WNT200_CONTRACT_ID);
      palgoContract.setBeaconSelector("fb6eb573");
      palgoContract.setEnableGroupResourceSharing(true);
      palgoContract.setExtraTxns(buildN);

      const customR = await palgoContract.custom();
      if (!customR.success) {
        throw new Error(customR.error);
      }

      const stxns = await signTransactions(
        customR.txns.map((txn: string) => base64ToUint8Array(txn))
      );

            const { txId } = await algodClient.sendRawTransaction(stxns).do();
      
      toast({
        description: (
          <div className="flex flex-col gap-2">
            <span>Successfully minted {palgoAmount} pALGO</span>
            <a
              href={`https://allo.info/tx/${txId}`}
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

      // Reset form and refresh balances
      setAlgoAmount("");
      setPalgoAmount("");
      await fetchBalances();
    } catch (error) {
      console.error("Mint error:", error);
      toast({
        variant: "destructive",
        description:
          error instanceof Error ? error.message : "Failed to mint pALGO",
        duration: 3000,
      });
    } finally {
      setIsMinting(false);
    }
  };

  const handleRedeem = async () => {
    if (!activeAccount || !algodClient) {
      toast({
        variant: "destructive",
        description: "Please connect your wallet first",
        duration: 3000,
      });
      return;
    }

    if (!palgoAmount || parseFloat(palgoAmount) <= 0) {
      toast({
        variant: "destructive",
        description: "Please enter a valid amount",
        duration: 3000,
      });
      return;
    }

    if (parseFloat(palgoAmount) > palgoBalance) {
      toast({
        variant: "destructive",
        description: "Insufficient pALGO balance",
        duration: 3000,
      });
      return;
    }

    setIsRedeeming(true);
    try {
      // Convert amount to micro units
      const amountMicro = new BigNumber(palgoAmount)
        .multipliedBy(1e6)
        .toFixed(0);

      // Create contract instance
      const palgoContract = new CONTRACT(
        SAW200_CONTRACT_ID,
        algodClient,
        undefined,
        abi.custom,
        {
          addr: activeAccount.address,
          sk: new Uint8Array(),
        }
      );

      // Build redeem transaction
      const builder = {
        token: new CONTRACT(
          SAW200_CONTRACT_ID,
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

      // Redeem transaction
      const txnO = (await builder.token.redeem(BigInt(amountMicro))).obj;
      buildN.push({
        ...txnO,
        note: new TextEncoder().encode(`Redeem pALGO: ${palgoAmount} pALGO`),
      });

      palgoContract.setPaymentAmount(1e5);
      palgoContract.setFee(3000);
      palgoContract.setBeaconId(SAW200_CONTRACT_ID);
      palgoContract.setBeaconSelector("fb6eb573");
      palgoContract.setEnableGroupResourceSharing(true);
      palgoContract.setExtraTxns(buildN);

      const customR = await palgoContract.custom();
      if (!customR.success) {
        throw new Error(customR.error);
      }

      const stxns = await signTransactions(
        customR.txns.map((txn: string) => base64ToUint8Array(txn))
      );

      const { txId } = await algodClient.sendRawTransaction(stxns).do();

      toast({
        description: (
          <div className="flex flex-col gap-2">
            <span>Successfully redeemed {algoAmount} ALGO</span>
            <a
              href={`https://allo.info/tx/${txId}`}
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

      // Reset form and refresh balances
      setAlgoAmount("");
      setPalgoAmount("");
      await fetchBalances();
    } catch (error) {
      console.error("Redeem error:", error);
      toast({
        variant: "destructive",
        description:
          error instanceof Error ? error.message : "Failed to redeem ALGO",
        duration: 3000,
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  const base64ToUint8Array = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const toggleDirection = () => {
    setDirection(direction === "mint" ? "redeem" : "mint");
    setAlgoAmount("");
    setPalgoAmount("");
  };

  return (
    <PageLayout>
      <div className="w-full max-w-4xl px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            <span className="text-[#1EAEDB]">pALGO</span> Token
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Mint pALGO by depositing ALGO and contribute to POW rewards, or
            redeem pALGO back to ALGO.
          </p>
        </div>



        {/* Minting Interface */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">
              {direction === "mint" ? "Mint pALGO" : "Redeem ALGO"}
            </h2>
            <Button
              onClick={toggleDirection}
              variant="outline"
              className="border-[#1EAEDB] text-[#1EAEDB] hover:bg-[#1EAEDB] hover:text-white"
            >
              <ArrowDownUp className="w-4 h-4 mr-2" />
              {direction === "mint" ? "Switch to Redeem" : "Switch to Mint"}
            </Button>
          </div>

          {/* Input Fields */}
          <div className="space-y-6">
            {/* First Input */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-300">
                  {direction === "mint" ? "You Pay" : "You Receive"}
                </label>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Wallet className="w-4 h-4" />
                  <span>
                    Balance:{" "}
                    {direction === "mint"
                      ? algoBalance.toFixed(4)
                      : palgoBalance.toFixed(4)}{" "}
                    {direction === "mint" ? "ALGO" : "pALGO"}
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={direction === "mint" ? algoAmount : palgoAmount}
                  onChange={(e) =>
                    handleInputChange(e.target.value, direction === "mint")
                  }
                  className="flex-1 bg-transparent border-0 text-white text-lg font-semibold placeholder:text-gray-500"
                />
                <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                  <Coins className="w-5 h-5 text-[#1EAEDB]" />
                  <span className="text-white font-semibold">
                    {direction === "mint" ? "ALGO" : "pALGO"}
                  </span>
                </div>
              </div>
            </div>

            {/* Direction Arrow */}
            <div className="flex justify-center">
              <div className="w-10 h-10 bg-[#1EAEDB] rounded-full flex items-center justify-center">
                <ArrowUpDown className="w-5 h-5 text-white" />
              </div>
            </div>

            {/* Second Input */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-300">
                  {direction === "mint" ? "You Receive" : "You Pay"}
                </label>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Wallet className="w-4 h-4" />
                  <span>
                    Balance:{" "}
                    {direction === "mint"
                      ? palgoBalance.toFixed(4)
                      : algoBalance.toFixed(4)}{" "}
                    {direction === "mint" ? "pALGO" : "ALGO"}
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={direction === "mint" ? palgoAmount : algoAmount}
                  onChange={(e) =>
                    handleInputChange(e.target.value, direction !== "mint")
                  }
                  className="flex-1 bg-transparent border-0 text-white text-lg font-semibold placeholder:text-gray-500"
                />
                <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                  <Coins className="w-5 h-5 text-[#1EAEDB]" />
                  <span className="text-white font-semibold">
                    {direction === "mint" ? "pALGO" : "ALGO"}
                  </span>
                </div>
              </div>
            </div>

            {/* Transaction Button */}
            <Button
              onClick={direction === "mint" ? handleMint : handleRedeem}
              disabled={
                loading ||
                (direction === "mint" ? isMinting : isRedeeming) ||
                !activeAccount ||
                !algoAmount ||
                !palgoAmount ||
                parseFloat(direction === "mint" ? algoAmount : palgoAmount) <=
                  0 ||
                parseFloat(direction === "mint" ? algoAmount : palgoAmount) >
                  (direction === "mint" ? algoBalance : palgoBalance)
              }
              className="w-full h-12 text-lg font-bold bg-[#1EAEDB] hover:bg-[#42c6f5] text-white rounded-xl transition-all duration-300"
            >
              {loading ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : direction === "mint" ? (
                isMinting ? (
                  "Minting..."
                ) : (
                  "Mint pALGO"
                )
              ) : isRedeeming ? (
                "Redeeming..."
              ) : (
                "Redeem ALGO"
              )}
            </Button>

            {/* Warning/Info Messages */}
            {!activeAccount && (
              <div className="flex items-center gap-2 text-yellow-400 bg-yellow-400/10 rounded-lg p-3">
                <AlertCircle className="w-5 h-5" />
                <span>
                  Please connect your wallet to start minting or redeeming
                </span>
              </div>
            )}

            {activeAccount &&
              parseFloat(direction === "mint" ? algoAmount : palgoAmount) >
                (direction === "mint" ? algoBalance : palgoBalance) && (
                <div className="flex items-center gap-2 text-red-400 bg-red-400/10 rounded-lg p-3">
                  <AlertCircle className="w-5 h-5" />
                  <span>Insufficient balance</span>
                </div>
              )}

            {activeAccount &&
              algoAmount &&
              palgoAmount &&
              parseFloat(direction === "mint" ? algoAmount : palgoAmount) <=
                (direction === "mint" ? algoBalance : palgoBalance) && (
                <div className="flex items-center gap-2 text-green-400 bg-green-400/10 rounded-lg p-3">
                  <CheckCircle className="w-5 h-5" />
                  <span>Transaction ready</span>
                </div>
              )}
          </div>
        </div>

        {/* pALGO Benefits */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            pALGO Benefits
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-xl font-semibold text-[#1EAEDB] mb-3">
                Pool Together
              </h4>
              <p className="text-gray-300 mb-4">
                Join thousands of users pooling their ALGO together to maximize
                yield and contribute to the POW ecosystem.
              </p>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-[#1EAEDB] mb-3">
                Stable Value
              </h4>
              <p className="text-gray-300 mb-4">
                Maintain stable value with 1:1 ALGO backing while earning
                through staking and DeFi strategies.
              </p>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-[#1EAEDB] mb-3">
                Flexible Redemption
              </h4>
              <p className="text-gray-300 mb-4">
                Redeem your pALGO back to ALGO anytime.
              </p>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-[#1EAEDB] mb-3">
                Community Driven
              </h4>
              <p className="text-gray-300 mb-4">
                Participate in a growing community of active users.
              </p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            How pALGO Works
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#1EAEDB] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">
                Deposit ALGO
              </h4>
              <p className="text-gray-300">
                Deposit your ALGO into the pALGO protocol to start earning yield
                through staking and DeFi strategies.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#1EAEDB] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">
                Contribute to POW
              </h4>
              <p className="text-gray-300">
                Your deposited ALGO contributes to the POW ecosystem, generating
                rewards through staking and DeFi strategies.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#1EAEDB] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">
                Redeem Anytime
              </h4>
              <p className="text-gray-300">
                Convert your pALGO back to ALGO at any time, including all
                accumulated POW rewards and yield.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default pALGO;
