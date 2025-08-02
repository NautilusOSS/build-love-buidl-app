import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Zap,
  Lock,
  Unlock,
  TrendingUp,
  Clock,
  Users,
  Award,
  Info,
  AlertTriangle,
  CheckCircle,
  Timer,
  AlertCircle,
} from "lucide-react";
import { useWallet } from "@txnlab/use-wallet-react";
import { useParams } from "react-router-dom";
import { NetworkId } from "@txnlab/use-wallet-react";
import {
  PowGovernanceClient,
  APP_SPEC as PowGovernanceAppSpec,
} from "@/clients/PowGovernanceClient";
import { ATokenClient } from "@/clients/ATokenClient";
import algosdk from "algosdk";
import { getATokenAppId, getGovernanceAppId } from "@/constants/appIds";
import { getVoter, lockPower } from "@/utils/command";
import PageLayout from "@/components/PageLayout";
import { abi, CONTRACT } from "ulujs";

// Lockup tier configuration
const LOCKUP_TIERS = [
  {
    id: 0,
    name: "Quick Power",
    duration: 7, // days
    durationSeconds: 604800, // 7 days in seconds
    bonus: 0, // 0% bonus
    multiplier: 1.0,
    color: "bg-green-500",
    description: "Instant 1000 voting power for 1 week (requires 1000 tokens)",
    isQuickPower: true,
    quickPowerAmount: 1000,
    requiredTokens: 1000,
  },
  {
    id: 1,
    name: "Tier 1 - Base",
    duration: 7, // days
    durationSeconds: 604800, // 7 days in seconds
    bonus: 0, // 0% bonus
    multiplier: 1.0,
    color: "bg-gray-500",
    description: "Minimum lockup period",
  },
  {
    id: 2,
    name: "Tier 2 - Bronze",
    duration: 28, // days
    durationSeconds: 2419200, // 28 days in seconds
    bonus: 10, // 10% bonus
    multiplier: 1.1,
    color: "bg-amber-600",
    description: "10% additional voting power",
  },
  {
    id: 3,
    name: "Tier 3 - Silver",
    duration: 84, // days
    durationSeconds: 7257600, // 84 days in seconds
    bonus: 25, // 25% bonus
    multiplier: 1.25,
    color: "bg-gray-400",
    description: "25% additional voting power",
  },
  {
    id: 4,
    name: "Tier 4 - Gold",
    duration: 182, // days
    durationSeconds: 15724800, // 182 days in seconds
    bonus: 50, // 50% bonus
    multiplier: 1.5,
    color: "bg-yellow-500",
    description: "50% additional voting power",
  },
  {
    id: 5,
    name: "Tier 5 - Diamond",
    duration: 364, // days
    durationSeconds: 31449600, // 364 days in seconds
    bonus: 100, // 100% bonus
    multiplier: 2.0,
    color: "bg-blue-500",
    description: "100% additional voting power",
  },
];

interface PowerLock {
  powerSourceId: bigint;
  powerSourceAmount: bigint;
  powerSourceUnlockTimestamp: bigint;
  powerSourceOwner: string;
  powerGranted: bigint;
  lockupDuration: bigint;
  lockupBonusMultiplier: bigint;
}

interface VoterInfo {
  voterAddress: string;
  votePower: bigint;
  voteTimestamp: bigint;
  proposalsParticipated: bigint;
  lastParticipationTimestamp: bigint;
  lastProposalNode: string;
}

const PowerUp: React.FC = () => {
  const { address } = useParams<{ address: string }>();
  const {
    activeAccount,
    activeWalletAddresses,
    activeNetwork,
    algodClient,
    signTransactions,
  } = useWallet();
  const [currentNetwork, setCurrentNetwork] = useState<NetworkId>(
    NetworkId.MAINNET
  );
  const [isLoading, setIsLoading] = useState(true);
  const [voterInfo, setVoterInfo] = useState<VoterInfo | null>(null);
  const [availableTokens, setAvailableTokens] = useState<number>(0);
  const [powerLocks, setPowerLocks] = useState<PowerLock[]>([]);
  const [selectedTier, setSelectedTier] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [lockAmount, setLockAmount] = useState<string>("");
  const [isLocking, setIsLocking] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isQuickPowerActivating, setIsQuickPowerActivating] = useState(false);
  const [showQuickPowerModal, setShowQuickPowerModal] = useState(false);
  const [showPowerGlow, setShowPowerGlow] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const algod =
    activeNetwork === NetworkId.LOCALNET
      ? new algosdk.Algodv2(
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "http://10.0.0.31",
          4001
        )
      : algodClient;

  // Calculate unlock date based on selected tier
  const calculateUnlockDate = () => {
    const selectedTierInfo = LOCKUP_TIERS.find(
      (tier) => tier.id === selectedTier
    );
    if (!selectedTierInfo) return new Date();

    const unlockDate = new Date(
      Date.now() + selectedTierInfo.duration * 24 * 60 * 60 * 1000
    );
    return unlockDate;
  };

  const getUnlockTimestamp = () => {
    return Math.floor(calculateUnlockDate().getTime() / 1000);
  };

  useEffect(() => {
    if (address && activeAccount) {
      fetchVoterData();
      fetchAvailableTokens();
      fetchPowerLocks();
    }
  }, [address, activeAccount, currentNetwork]);

  // Reset glow effect when component mounts or address changes
  useEffect(() => {
    setShowPowerGlow(false);
  }, [address]);

  const fetchVoterData = async () => {
    if (!address || !activeAccount) return;
    try {
      setIsLoading(true);
      const voter = await getVoter({
        appId: getGovernanceAppId(activeNetwork),
        addr: address,
        algod,
      });
      setVoterInfo(voter);
    } catch (error) {
      console.error("Error fetching voter data:", error);
      setError("Failed to fetch voter data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableTokens = async () => {
    try {
      const tokenAppId = getATokenAppId(activeNetwork);
      const ci = new CONTRACT(tokenAppId, algod, undefined, abi.nt200, {
        addr: address,
        sk: new Uint8Array(),
      });
      const arc200_balanceOfR = await ci.arc200_balanceOf(address);
      console.log({ arc200_balanceOfR });
      setAvailableTokens(Number(arc200_balanceOfR.returnValue) / 1e6);
    } catch (error) {
      console.error("Error fetching token balance:", error);
      setAvailableTokens(0);
    }
  };

  const fetchPowerLocks = async () => {
    try {
      // This would need to be implemented based on your specific contract structure
      // For now, we'll use a placeholder
      setPowerLocks([]);
    } catch (error) {
      console.error("Error fetching power locks:", error);
      setPowerLocks([]);
    }
  };

  const calculatePowerGain = () => {
    if (selectedTier === undefined || selectedTier === null) return 0;

    const tier = LOCKUP_TIERS.find((t) => t.id === selectedTier);
    if (!tier) return 0;

    // Handle quick power
    if (tier.isQuickPower) {
      return tier.quickPowerAmount || 1000;
    }

    // Handle regular token locking
    if (!lockAmount) return 0;

    const amount = parseFloat(lockAmount);
    // Base power is 1:1 with tokens, plus bonus multiplier
    const basePower = amount;
    const bonusPower = basePower * (tier.bonus / 100);
    return basePower + bonusPower;
  };

  const handleLockTokens = async () => {
    if (selectedTier === undefined || selectedTier === null) {
      setError("Please select a tier");
      return;
    }

    const tier = LOCKUP_TIERS.find((t) => t.id === selectedTier);
    if (!tier) {
      setError("Invalid tier selected");
      return;
    }

    // Handle quick power activation
    if (tier.isQuickPower) {
      if (availableTokens < 1000) {
        setError("Insufficient tokens. Quick Power requires 1,000 tokens.");
        return;
      }
      setShowQuickPowerModal(true);
      return;
    }

    // Handle regular token locking
    if (!lockAmount) {
      setError("Please enter an amount to lock");
      return;
    }

    const amount = parseFloat(lockAmount);
    if (amount <= 0 || amount > availableTokens) {
      setError("Invalid amount");
      return;
    }

    try {
      setIsLocking(true);
      setError("");
      setSuccess("");

      const lockPowerParams = {
        appId: getGovernanceAppId(activeNetwork),
        powerSourceId: getATokenAppId(activeNetwork),
        powerSourceAmount: amount * 1e6,
        powerUnlockTimestamp: BigInt(
          Math.floor(Number(new Date().getTime() / 1000) + 60 * 60 * 24 * 30)
        ),
        beaconId: getATokenAppId(activeNetwork),
        algod,
        addr: address,
        sk: new Uint8Array(),
        debug: true,
      };
      const lockPowerR = await lockPower(lockPowerParams);

      if (!lockPowerR.success) {
        setError(lockPowerR.error);
        return;
      }

      const stxns = await signTransactions(
        lockPowerR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );

      await algod.sendRawTransaction(stxns).do();

      setSuccess(
        "Tokens locked successfully! Your voting power has increased."
      );
      setLockAmount("");

      // Refresh data
      await fetchVoterData();
      await fetchAvailableTokens();
      await fetchPowerLocks();

      // Switch to overview tab after successful operation
      setActiveTab("overview");

      // Trigger power glow effect
      setShowPowerGlow(true);
      setTimeout(() => setShowPowerGlow(false), 3000); // Glow for 3 seconds
    } catch (error) {
      console.error("Error locking tokens:", error);
      setError("Failed to lock tokens. Please try again.");
    } finally {
      setIsLocking(false);
    }
  };

  const handleQuickPowerActivation = async () => {
    try {
      setIsQuickPowerActivating(true);
      setError("");
      setSuccess("");
      setShowQuickPowerModal(false);

      // Quick Power locks 1000 tokens for 7 days
      const lockPowerParams = {
        appId: getGovernanceAppId(activeNetwork),
        powerSourceId: getATokenAppId(activeNetwork),
        powerSourceAmount: 1000 * 1e6, // 1000 tokens in micro units
        powerUnlockTimestamp: BigInt(
          Math.floor(Number(new Date().getTime() / 1000) + 7 * 24 * 60 * 60) // 7 days
        ),
        beaconId: getATokenAppId(activeNetwork),
        algod,
        addr: address,
        sk: new Uint8Array(),
        debug: true,
      };

      const lockPowerR = await lockPower(lockPowerParams);

      if (!lockPowerR.success) {
        setError(lockPowerR.error);
        return;
      }

      const stxns = await signTransactions(
        lockPowerR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );

      await algod.sendRawTransaction(stxns).do();

      const selectedTierInfo = LOCKUP_TIERS.find(
        (tier) => tier.id === selectedTier
      );
      setSuccess(
        `Quick Power activated! You now have ${
          selectedTierInfo?.quickPowerAmount || 1000
        } voting power for 1 week.`
      );

      // Refresh data
      await fetchVoterData();
      await fetchAvailableTokens();
      await fetchPowerLocks();

      // Switch to overview tab after successful operation
      setActiveTab("overview");

      // Trigger power glow effect
      setShowPowerGlow(true);
      setTimeout(() => setShowPowerGlow(false), 3000); // Glow for 3 seconds
    } catch (error) {
      console.error("Error activating quick power:", error);
      setError("Failed to activate quick power. Please try again.");
    } finally {
      setIsQuickPowerActivating(false);
    }
  };

  const handleUnlockTokens = async (powerLock: PowerLock) => {
    try {
      setIsUnlocking(true);
      setError("");
      setSuccess("");

      const governanceClient = new PowGovernanceClient({
        resolveBy: "id",
        id: currentNetwork === NetworkId.MAINNET ? 40153155 : 3080081069,
      });

      await governanceClient.unlockPower({
        power_source_id: powerLock.powerSourceId,
        power_unlock_timestamp: powerLock.powerSourceUnlockTimestamp,
      });

      setSuccess("Tokens unlocked successfully!");

      // Refresh data
      await fetchVoterData();
      await fetchAvailableTokens();
      await fetchPowerLocks();

      // Switch to overview tab after successful operation
      setActiveTab("overview");

      // Trigger power glow effect
      setShowPowerGlow(true);
      setTimeout(() => setShowPowerGlow(false), 3000); // Glow for 3 seconds
    } catch (error) {
      console.error("Error unlocking tokens:", error);
      setError("Failed to unlock tokens. Please try again.");
    } finally {
      setIsUnlocking(false);
    }
  };

  const canUnlock = (powerLock: PowerLock) => {
    const now = Math.floor(Date.now() / 1000);
    return powerLock.powerSourceUnlockTimestamp <= BigInt(now);
  };

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  const formatTimeRemaining = (timestamp: bigint) => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = Number(timestamp) - now;

    if (remaining <= 0) return "Ready to unlock";

    const days = Math.floor(remaining / (24 * 60 * 60));
    const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60));

    return `${days}d ${hours}h remaining`;
  };

  const getTierInfo = (bonusMultiplier: bigint) => {
    const bonus = Number(bonusMultiplier) / 100; // Convert from basis points
    return LOCKUP_TIERS.find((tier) => tier.bonus === bonus) || LOCKUP_TIERS[0];
  };

  const handleTierSelection = (tierId: number) => {
    setSelectedTier(tierId);
    setActiveTab("lock");
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="w-full max-w-6xl px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1EAEDB]"></div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="w-full max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1EAEDB] flex items-center gap-2">
              <Zap className="h-8 w-8" />
              Power UP
            </h1>
            <p className="text-gray-300 mt-2">
              Lock your tokens to increase your voting power and earn bonus
              multipliers
            </p>
          </div>
          <Badge variant="outline" className="text-[#1EAEDB] border-[#1EAEDB]">
            {currentNetwork === NetworkId.MAINNET
              ? "VOI Network"
              : "ALGO Network"}
          </Badge>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <Alert
            variant="destructive"
            className="mb-6 bg-red-500/10 border-red-500/20 text-red-200"
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 bg-green-500/10 border-green-500/20 text-green-200">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3 bg-white/5 border border-white/10 rounded-2xl">
            <TabsTrigger value="overview" className="rounded-xl">
              Overview
            </TabsTrigger>
            <TabsTrigger value="lock" className="rounded-xl">
              Lock Tokens
            </TabsTrigger>
            <TabsTrigger value="locks" className="rounded-xl">
              My Locks
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Current Voting Power */}
              <Card
                className={`bg-white/5 border border-white/10 shadow-lg hover:scale-[1.02] hover:shadow-2xl transition-all duration-200 rounded-3xl ${
                  showPowerGlow
                    ? "animate-pulse ring-4 ring-blue-400/50 ring-opacity-75 shadow-2xl shadow-blue-400/25"
                    : ""
                }`}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white">
                    Current Voting Power
                  </CardTitle>
                  <TrendingUp
                    className={`h-4 w-4 text-blue-400 transition-all duration-300 ${
                      showPowerGlow ? "animate-bounce" : ""
                    }`}
                  />
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold text-blue-300 transition-all duration-300 ${
                      showPowerGlow ? "text-blue-200 scale-105" : ""
                    }`}
                  >
                    {voterInfo
                      ? (Number(voterInfo.votePower) / 1e6).toLocaleString()
                      : "0"}
                  </div>
                  <p className="text-xs text-white/70">
                    Total voting power from locked tokens
                  </p>
                </CardContent>
              </Card>

              {/* Available Tokens */}
              <Card
                className={`bg-white/5 border border-white/10 shadow-lg hover:scale-[1.02] hover:shadow-2xl transition-all duration-200 rounded-3xl ${
                  showPowerGlow
                    ? "ring-2 ring-green-400/30 shadow-lg shadow-green-400/10"
                    : ""
                }`}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white">
                    Available Tokens
                  </CardTitle>
                  <Lock
                    className={`h-4 w-4 text-green-400 transition-all duration-300 ${
                      showPowerGlow ? "animate-pulse" : ""
                    }`}
                  />
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold text-green-300 transition-all duration-300 ${
                      showPowerGlow ? "text-green-200" : ""
                    }`}
                  >
                    {availableTokens.toLocaleString()}
                  </div>
                  <p className="text-xs text-white/70">
                    Tokens available for locking
                  </p>
                </CardContent>
              </Card>

              {/* Participation */}
              <Card className="bg-white/5 border border-white/10 shadow-lg hover:scale-[1.02] hover:shadow-2xl transition-all duration-200 rounded-3xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white">
                    Proposals Participated
                  </CardTitle>
                  <Users className="h-4 w-4 text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-300">
                    {voterInfo ? Number(voterInfo.proposalsParticipated) : "0"}
                  </div>
                  <p className="text-xs text-white/70">
                    Total proposals voted on
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Lockup Tiers */}
            <Card className="bg-white/5 border border-white/10 shadow-lg rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Award className="h-5 w-5 text-[#1EAEDB]" />
                  Lockup Tiers & Bonuses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {LOCKUP_TIERS.map((tier) => (
                    <div
                      key={tier.id}
                      className={`group relative p-6 rounded-2xl border-2 backdrop-blur-sm cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-2xl ${
                        tier.isQuickPower
                          ? selectedTier === tier.id
                            ? "border-green-500 bg-green-500/10 shadow-lg ring-2 ring-green-500/30"
                            : "border-green-500/50 bg-green-500/5 hover:border-green-500 hover:bg-green-500/10"
                          : selectedTier === tier.id
                          ? "border-[#1EAEDB] bg-[#1EAEDB]/10 shadow-lg ring-2 ring-[#1EAEDB]/30"
                          : "border-white/20 hover:border-[#1EAEDB]/50 hover:bg-[#1EAEDB]/5"
                      }`}
                      onClick={() => handleTierSelection(tier.id)}
                    >
                      {/* Glow effect on hover */}
                      <div
                        className={`absolute inset-0 rounded-2xl transition-opacity duration-300 ${
                          tier.isQuickPower
                            ? selectedTier === tier.id
                              ? "bg-gradient-to-r from-green-500/20 to-green-600/20 opacity-100"
                              : "bg-gradient-to-r from-green-500/10 to-green-600/10 opacity-0 group-hover:opacity-100"
                            : selectedTier === tier.id
                            ? "bg-gradient-to-r from-[#1EAEDB]/20 to-[#31BFEC]/20 opacity-100"
                            : "bg-gradient-to-r from-[#1EAEDB]/10 to-[#31BFEC]/10 opacity-0 group-hover:opacity-100"
                        }`}
                      ></div>

                      {/* Content */}
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-4 h-4 rounded-full ${tier.color} shadow-lg transition-transform duration-300 group-hover:scale-125`}
                            ></div>
                            <h3 className="font-bold text-white text-lg transition-colors duration-300 group-hover:text-[#1EAEDB]">
                              {tier.name}
                            </h3>
                          </div>
                          {selectedTier === tier.id && (
                            <div
                              className={`flex items-center gap-1 text-white px-2 py-1 rounded-full text-xs font-semibold animate-pulse ${
                                tier.isQuickPower
                                  ? "bg-green-500"
                                  : "bg-[#1EAEDB]"
                              }`}
                            >
                              <CheckCircle className="w-3 h-3" />
                              Selected
                            </div>
                          )}
                        </div>

                        <div className="space-y-3 text-sm">
                          {tier.isQuickPower ? (
                            <>
                              <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                                <span className="text-white/80">
                                  Voting Power
                                </span>
                                <span className="font-semibold text-green-400">
                                  {tier.quickPowerAmount}
                                </span>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                                <span className="text-white/80">Duration</span>
                                <span className="font-semibold text-green-400">
                                  {tier.duration} days
                                </span>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                                <span className="text-white/80">
                                  Token Required
                                </span>
                                <span className="font-semibold text-green-400">
                                  None
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:border-[#1EAEDB]/30 transition-colors">
                                <span className="text-white/80">Duration</span>
                                <span className="font-semibold text-[#1EAEDB]">
                                  {tier.duration} days
                                </span>
                              </div>

                              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:border-[#1EAEDB]/30 transition-colors">
                                <span className="text-white/80">Bonus</span>
                                <span className="font-semibold text-green-400">
                                  +{tier.bonus}%
                                </span>
                              </div>

                              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:border-[#1EAEDB]/30 transition-colors">
                                <span className="text-white/80">
                                  Multiplier
                                </span>
                                <span className="font-semibold text-purple-400">
                                  {tier.multiplier}x
                                </span>
                              </div>
                            </>
                          )}

                          <div
                            className={`mt-4 p-3 rounded-lg border ${
                              tier.isQuickPower
                                ? "bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-500/20"
                                : "bg-gradient-to-r from-[#1EAEDB]/10 to-[#31BFEC]/10 border-[#1EAEDB]/20"
                            }`}
                          >
                            <p className="text-white/90 text-xs leading-relaxed">
                              {tier.description}
                            </p>
                          </div>
                        </div>

                        {/* Hover indicator */}
                        <div
                          className={`absolute top-2 right-2 w-2 h-2 rounded-full transition-all duration-300 ${
                            tier.isQuickPower
                              ? selectedTier === tier.id
                                ? "bg-green-500 scale-100"
                                : "bg-green-500/30 scale-0 group-hover:scale-100"
                              : selectedTier === tier.id
                              ? "bg-[#1EAEDB] scale-100"
                              : "bg-white/30 scale-0 group-hover:scale-100"
                          }`}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lock Tokens Tab */}
          <TabsContent value="lock" className="space-y-6">
            <Card className="bg-white/5 border border-white/10 shadow-lg rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Lock className="h-5 w-5 text-[#1EAEDB]" />
                  Lock Tokens for Power
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Tier Selection */}
                <div className="space-y-2">
                  <Label htmlFor="tier" className="text-white">
                    Select Lockup Tier
                  </Label>
                  <Select
                    value={selectedTier.toString()}
                    onValueChange={(value) => setSelectedTier(parseInt(value))}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-2xl">
                      <SelectValue placeholder="Select a tier" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/10">
                      {LOCKUP_TIERS.map((tier) => (
                        <SelectItem key={tier.id} value={tier.id.toString()}>
                          {tier.name} - {tier.duration} days (+{tier.bonus}%
                          bonus)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quick Power Section */}
                {LOCKUP_TIERS.find((tier) => tier.id === selectedTier)
                  ?.isQuickPower && (
                  <Card className="bg-green-500/10 border-green-500/20 rounded-2xl">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Zap className="h-5 w-5 text-green-400" />
                        <h4 className="font-semibold text-green-300">
                          Quick Power Activation
                        </h4>
                      </div>
                      <div className="space-y-3 text-sm text-white/80">
                        <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                          <span>Voting Power Granted:</span>
                          <span className="font-semibold text-green-400">
                            1,000
                          </span>
                        </div>
                        <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                          <span>Duration:</span>
                          <span className="font-semibold text-green-400">
                            7 days
                          </span>
                        </div>
                        <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                          <span>Token Requirement:</span>
                          <span className="font-semibold text-green-400">
                            1,000 tokens
                          </span>
                        </div>
                        <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                          <span>Available Tokens:</span>
                          <span
                            className={`font-semibold ${
                              availableTokens >= 1000
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {availableTokens.toLocaleString()}
                          </span>
                        </div>
                        {availableTokens < 1000 && (
                          <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                            <p className="text-red-300 text-xs">
                              Insufficient tokens. You need at least 1,000
                              tokens to activate Quick Power.
                            </p>
                          </div>
                        )}
                        <div className="mt-4 p-3 bg-gradient-to-r from-green-500/10 to-green-600/10 rounded-lg border border-green-500/20">
                          <p className="text-white/90 text-xs leading-relaxed">
                            Quick Power provides instant voting power by locking
                            1,000 tokens for 7 days. Perfect for new users or
                            temporary participation in governance.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Regular Token Locking Section */}
                {!LOCKUP_TIERS.find((tier) => tier.id === selectedTier)
                  ?.isQuickPower && (
                  <>
                    {/* Amount Input */}
                    <div className="space-y-2">
                      <Label htmlFor="amount" className="text-white">
                        Amount to Lock
                      </Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="Enter amount"
                        value={lockAmount}
                        onChange={(e) => setLockAmount(e.target.value)}
                        max={availableTokens}
                        min="0"
                        step="0.000001"
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-2xl"
                      />
                      <p className="text-sm text-white/70">
                        Available: {availableTokens.toLocaleString()} tokens
                      </p>
                    </div>

                    {/* Calculated Unlock Date */}
                    <div className="space-y-2">
                      <Label className="text-white">Unlock Date</Label>
                      <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                        <p className="text-sm font-medium text-white">
                          {calculateUnlockDate().toLocaleDateString()} at{" "}
                          {calculateUnlockDate().toLocaleTimeString()}
                        </p>
                        <p className="text-xs text-white/60 mt-1">
                          Based on{" "}
                          {
                            LOCKUP_TIERS.find(
                              (tier) => tier.id === selectedTier
                            )?.duration
                          }{" "}
                          day lockup period
                        </p>
                      </div>
                    </div>

                    {/* Power Preview */}
                    {lockAmount && selectedTier && (
                      <Card className="bg-blue-500/10 border-blue-500/20 rounded-2xl">
                        <CardContent className="pt-6">
                          <h4 className="font-semibold text-blue-300 mb-2">
                            Power Preview
                          </h4>
                          <div className="space-y-2 text-sm text-white/80">
                            <div className="flex justify-between">
                              <span>Tokens to lock:</span>
                              <span>
                                {parseFloat(lockAmount).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Base power:</span>
                              <span>
                                {parseFloat(lockAmount).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Bonus power:</span>
                              <span>
                                +{calculatePowerGain() - parseFloat(lockAmount)}
                              </span>
                            </div>
                            <Separator className="bg-white/20" />
                            <div className="flex justify-between font-semibold text-blue-300">
                              <span>Total voting power:</span>
                              <span>
                                {calculatePowerGain().toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}

                {/* Action Button */}
                <Button
                  onClick={handleLockTokens}
                  disabled={
                    isLocking ||
                    isQuickPowerActivating ||
                    (LOCKUP_TIERS.find((tier) => tier.id === selectedTier)
                      ?.isQuickPower &&
                      availableTokens < 1000) ||
                    (!LOCKUP_TIERS.find((tier) => tier.id === selectedTier)
                      ?.isQuickPower &&
                      (!lockAmount || parseFloat(lockAmount) > availableTokens))
                  }
                  className={`w-full rounded-2xl font-semibold ${
                    LOCKUP_TIERS.find((tier) => tier.id === selectedTier)
                      ?.isQuickPower
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-[#1EAEDB] hover:bg-[#31BFEC] text-white"
                  }`}
                >
                  {isLocking || isQuickPowerActivating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {LOCKUP_TIERS.find((tier) => tier.id === selectedTier)
                        ?.isQuickPower
                        ? "Activating Quick Power..."
                        : "Locking Tokens..."}
                    </>
                  ) : (
                    <>
                      {LOCKUP_TIERS.find((tier) => tier.id === selectedTier)
                        ?.isQuickPower ? (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Activate Quick Power
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          Lock Tokens
                        </>
                      )}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Locks Tab */}
          <TabsContent value="locks" className="space-y-6">
            <Card className="bg-white/5 border border-white/10 shadow-lg rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Timer className="h-5 w-5 text-[#1EAEDB]" />
                  My Active Locks
                </CardTitle>
              </CardHeader>
              <CardContent>
                {powerLocks.length === 0 ? (
                  <div className="text-center py-8 text-white/60">
                    <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No active locks found</p>
                    <p className="text-sm">Lock some tokens to see them here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {powerLocks.map((lock, index) => {
                      const tier = getTierInfo(lock.lockupBonusMultiplier);
                      const canUnlockNow = canUnlock(lock);

                      return (
                        <Card
                          key={index}
                          className="bg-white/5 border border-white/10 shadow-lg rounded-2xl border-l-4 border-l-[#1EAEDB]"
                        >
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-3 h-3 rounded-full ${tier.color}`}
                                ></div>
                                <span className="font-semibold text-white">
                                  {tier.name}
                                </span>
                              </div>
                              <Badge
                                variant={canUnlockNow ? "default" : "secondary"}
                                className={
                                  canUnlockNow
                                    ? "bg-green-500/20 text-green-300 border-green-500/30"
                                    : "bg-gray-500/20 text-gray-300 border-gray-500/30"
                                }
                              >
                                {canUnlockNow ? "Ready to Unlock" : "Locked"}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-white/60">Locked Amount</p>
                                <p className="font-semibold text-white">
                                  {(
                                    Number(lock.powerSourceAmount) / 1e6
                                  ).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-white/60">Voting Power</p>
                                <p className="font-semibold text-white">
                                  {(
                                    Number(lock.powerGranted) / 1e6
                                  ).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-white/60">Unlock Date</p>
                                <p className="font-semibold text-white">
                                  {formatDate(lock.powerSourceUnlockTimestamp)}
                                </p>
                              </div>
                              <div>
                                <p className="text-white/60">Time Remaining</p>
                                <p className="font-semibold text-white">
                                  {formatTimeRemaining(
                                    lock.powerSourceUnlockTimestamp
                                  )}
                                </p>
                              </div>
                            </div>

                            {canUnlockNow && (
                              <div className="mt-4 pt-4 border-t border-white/20">
                                <Button
                                  onClick={() => handleUnlockTokens(lock)}
                                  disabled={isUnlocking}
                                  variant="outline"
                                  className="w-full border-[#1EAEDB] text-[#1EAEDB] hover:bg-[#1EAEDB] hover:text-white rounded-2xl"
                                >
                                  {isUnlocking ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1EAEDB] mr-2"></div>
                                      Unlocking...
                                    </>
                                  ) : (
                                    <>
                                      <Unlock className="h-4 w-4 mr-2" />
                                      Unlock Tokens
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Power Confirmation Modal */}
        <Dialog
          open={showQuickPowerModal}
          onOpenChange={setShowQuickPowerModal}
        >
          <DialogContent className="bg-gray-900 border border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-400">
                <Zap className="h-5 w-5" />
                Confirm Quick Power Activation
              </DialogTitle>
              <DialogDescription className="text-gray-300">
                You are about to activate Quick Power. This will lock 1,000
                tokens for 7 days and grant you 1,000 voting power.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Quick Power Details */}
              <Card className="bg-green-500/10 border-green-500/20">
                <CardContent className="pt-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-white/80">
                        Voting Power Granted:
                      </span>
                      <span className="font-semibold text-green-400">
                        1,000
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-white/80">Duration:</span>
                      <span className="font-semibold text-green-400">
                        7 days
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-white/80">Token Requirement:</span>
                      <span className="font-semibold text-green-400">
                        1,000 tokens
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-white/80">Expires:</span>
                      <span className="font-semibold text-green-400">
                        {new Date(
                          Date.now() + 7 * 24 * 60 * 60 * 1000
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Warning */}
              <Alert className="bg-yellow-500/10 border-yellow-500/20 text-yellow-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Quick Power will lock 1,000 tokens for 7 days. After 7 days,
                  your tokens will be unlocked and voting power will expire.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowQuickPowerModal(false)}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleQuickPowerActivation}
                disabled={isQuickPowerActivating}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isQuickPowerActivating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Activating...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Activate Quick Power
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
};

export default PowerUp;
