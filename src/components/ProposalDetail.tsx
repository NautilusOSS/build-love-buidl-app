import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useWallet, NetworkId } from "@txnlab/use-wallet-react";
import {
  PowGovernanceClient,
  APP_SPEC as PowGovernanceAppSpec,
} from "@/clients/PowGovernanceClient";
import algosdk from "algosdk";
import { abi, CONTRACT } from "ulujs";
import { APP_SPEC as ATokenAppSpec } from "@/clients/ATokenClient";
import { getATokenAppId, getGovernanceAppId } from "@/constants/appIds";
import {
  getVoter,
  lockPower,
  VOTE_YES,
  VOTE_NO,
} from "@/utils/command";
import { toast } from "@/components/ui/use-toast";
import { 
  Clock, 
  Users, 
  TrendingUp, 
  Lock, 
  Star, 
  ChevronRight,
  Zap,
  Shield,
  Globe,
  Link as LinkIcon,
  CheckCircle,
  XCircle,
  Minus,
  Plus,
  Settings,
  Wallet,
  ArrowLeft,
  ExternalLink,
  BarChart3,
  Calendar,
  Hash
} from "lucide-react";

// Voter info interface (matching PowerUp)
interface VoterInfo {
  voterAddress: string;
  votePower: bigint;
  voteTimestamp: bigint;
  proposalsParticipated: bigint;
  lastParticipationTimestamp: bigint;
  lastProposalNode: string;
}

interface ProposalDetailProps {
  proposal: {
    id: number;
    title: string;
    description: string;
    status: "Open" | "Passed" | "Closed";
    timeRemaining: string;
    votesFor: number;
    votesAgainst: number;
    votesAbstain: number;
    chains: string[];
    enfsRef: string;
    fullDescription?: string;
    proposer?: string;
    createdAt?: string;
    votingEnds?: string;
  };
  onBack: () => void;
}

export default function ProposalDetail({ proposal, onBack }: ProposalDetailProps) {
  const {
    activeWallet,
    activeAccount,
    activeNetwork,
    algodClient,
    signTransactions,
  } = useWallet();

  // Voting power state
  const [lockAmount, setLockAmount] = useState([1000]);
  const [lockDuration, setLockDuration] = useState("4w");
  const [showLockDialog, setShowLockDialog] = useState(false);
  
  // Onchain data states
  const [isLoadingVoterData, setIsLoadingVoterData] = useState(false);
  const [voterInfo, setVoterInfo] = useState<VoterInfo | null>(null);
  const [userBalance, setUserBalance] = useState(1000);

  // Mint tokens state
  const [mintAmount, setMintAmount] = useState(10000);
  const [isMinting, setIsMinting] = useState(false);

  // Lock tokens state
  const [isLocking, setIsLocking] = useState(false);
  const [lockError, setLockError] = useState("");
  const [lockSuccess, setLockSuccess] = useState("");

  // Voting state
  const [isVoting, setIsVoting] = useState(false);
  const [voteError, setVoteError] = useState("");
  const [voteSuccess, setVoteSuccess] = useState("");

  const durationMultipliers = {
    "1w": 1.0,
    "4w": 1.2,
    "6w": 1.35,
    "12w": 1.5,
  };

  const algod = useMemo(() => {
    if (activeNetwork === NetworkId.LOCALNET) {
      return new algosdk.Algodv2(
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "http://10.0.0.31",
        4001
      );
    }
    return algodClient;
  }, [algodClient, activeNetwork]);

  // Function to fetch voter data (matching PowerUp approach)
  const fetchVoterData = async () => {
    if (!activeAccount || !activeNetwork) {
      return;
    }

    try {
      setIsLoadingVoterData(true);
      const voter = await getVoter({
        appId: getGovernanceAppId(activeNetwork),
        addr: activeAccount.address,
        algod,
      });
      setVoterInfo(voter);
    } catch (error) {
      console.error("Error fetching voter data:", error);
      setVoterInfo(null);
      toast({
        title: "Error",
        description: "Failed to fetch voting power data",
        variant: "destructive",
      });
    } finally {
      setIsLoadingVoterData(false);
    }
  };

  const fetchUserBalance = async () => {
    if (!activeAccount || !activeNetwork) {
      return;
    }
    const contractId = getATokenAppId(activeNetwork);
    const ci = new CONTRACT(contractId, algod, undefined, abi.nt200, {
      addr: activeAccount.address,
      sk: new Uint8Array(),
    });
    const balanceR = await ci.arc200_balanceOf(activeAccount.address);
    const balance = Number(balanceR.returnValue) / 1e6;
    setUserBalance(balance);
  };

  // Handle lock tokens function (based on PowerUp component)
  const handleLockTokens = async () => {
    if (!activeAccount || !activeNetwork) {
      setLockError("Please connect your wallet");
      return;
    }

    if (!lockAmount || lockAmount[0] <= 0) {
      setLockError("Please enter a valid amount to lock");
      return;
    }

    const amount = lockAmount[0];
    if (amount > userBalance) {
      setLockError(
        "Insufficient tokens. You don't have enough tokens to lock."
      );
      return;
    }

    try {
      setIsLocking(true);
      setLockError("");
      setLockSuccess("");

      // Calculate unlock timestamp based on duration
      const durationDays =
        lockDuration === "1w"
          ? 7
          : lockDuration === "4w"
          ? 28
          : lockDuration === "6w"
          ? 42
          : 84;
      const unlockTimestamp = BigInt(
        Math.floor(Date.now() / 1000) + durationDays * 24 * 60 * 60
      );

      const lockPowerParams = {
        appId: getGovernanceAppId(activeNetwork),
        powerSourceId: getATokenAppId(activeNetwork),
        powerSourceAmount: amount * 1e6,
        powerUnlockTimestamp: unlockTimestamp,
        beaconId: getATokenAppId(activeNetwork),
        algod,
        addr: activeAccount.address,
        sk: new Uint8Array(),
        debug: true,
      };

      const lockPowerR = await lockPower(lockPowerParams);

      if (!lockPowerR.success) {
        setLockError(lockPowerR.error || "Failed to lock tokens");
        return;
      }

      const stxns = await signTransactions(
        lockPowerR.txns.map(
          (txn: string) =>
            new Uint8Array(
              atob(txn)
                .split("")
                .map((char) => char.charCodeAt(0))
            )
        )
      );

      await algod.sendRawTransaction(stxns).do();

      setLockSuccess(
        `Successfully locked ${amount.toLocaleString()} tokens for ${lockDuration}! Your voting power has increased.`
      );

      // Reset lock amount
      setLockAmount([1000]);

      // Refresh data
      await fetchVoterData();
      await fetchUserBalance();

      toast({
        title: "Success",
        description: `Successfully locked ${amount.toLocaleString()} tokens for ${lockDuration}`,
      });
    } catch (error) {
      console.error("Error locking tokens:", error);
      setLockError("Failed to lock tokens. Please try again.");
      toast({
        title: "Error",
        description: "Failed to lock tokens. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLocking(false);
    }
  };

  // Mint tokens function for Localnet
  const mintTokens = async (amount: number) => {
    if (!activeAccount || !algod || activeNetwork !== NetworkId.LOCALNET) {
      toast({
        title: "Error",
        description: "Minting is only available on Localnet",
        variant: "destructive",
      });
      return;
    }

    setIsMinting(true);
    try {
      let algod: algosdk.Algodv2;
      let token: string;

      if (activeNetwork === NetworkId.LOCALNET) {
        // For localnet ARC200, use local configuration
        token =
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        const server = "http://10.0.0.31";
        const port = 4001;
        algod = new algosdk.Algodv2(token, server, port);
      } else {
        algod = algodClient;
      }

      console.log("Created algod client for network:", activeNetwork);

      const contractId = getATokenAppId(activeNetwork);
      const ci = new CONTRACT(
        contractId,
        algod,
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
      const mintTxn = await ci.mint(BigInt(amount * 1e6));

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

      const { txId } = await algod.sendRawTransaction(mintSigned).do();

      await algosdk.waitForConfirmation(algod, txId, 4);

      await fetchUserBalance();

      toast({
        title: "Success",
        description: `Successfully minted ${amount.toLocaleString()} VOI tokens`,
      });
    } catch (error) {
      console.error("Error minting tokens:", error);
      toast({
        title: "Error",
        description: "Failed to mint tokens. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsMinting(false);
    }
  };

  // Handle cast vote function
  const handleCastVote = async (vote: "yes" | "no") => {
    if (!activeAccount || !activeNetwork) {
      toast({
        title: "Error",
        description: "Please connect your wallet",
        variant: "destructive",
      });
      return;
    }

    if (!voterInfo || Number(voterInfo.votePower) <= 0) {
      toast({
        title: "Error",
        description: "You need voting power to vote. Lock some tokens first.",
        variant: "destructive",
      });
      return;
    }

    setIsVoting(true);
    try {
      setVoteError("");
      setVoteSuccess("");

      // Convert proposal ID to base64 for the proposal node
      const proposalIdHex = proposal.id.toString(16).padStart(64, '0');
      const bytes = new Uint8Array(proposalIdHex.length / 2);
      for (let i = 0; i < proposalIdHex.length; i += 2) {
        bytes[i / 2] = parseInt(proposalIdHex.substr(i, 2), 16);
      }

      // Convert Uint8Array to base64
      const proposalNode = btoa(String.fromCharCode(...bytes));

      const appId = getGovernanceAppId(activeNetwork);
      const ci = new CONTRACT(
        appId,
        algod,
        undefined,
        { ...PowGovernanceAppSpec.contract, events: [] },
        { addr: activeAccount.address, sk: new Uint8Array() }
      );

      const castVoteR = await ci.cast_vote(
        new Uint8Array(
          atob(proposalNode)
            .split("")
            .map((char) => char.charCodeAt(0))
        ),
        vote === "yes" ? VOTE_YES : VOTE_NO
      );

      console.log({ castVoteR });

      if (!castVoteR.success) {
        setVoteError(castVoteR.error || "Failed to cast vote");
        toast({
          title: "Error",
          description: castVoteR.error || "Failed to cast vote",
          variant: "destructive",
        });
        return;
      }

      // Sign and submit the vote transaction
      const stxns = await signTransactions(
        castVoteR.txns.map(
          (txn: string) =>
            new Uint8Array(
              atob(txn)
                .split("")
                .map((char) => char.charCodeAt(0))
            )
        )
      );

      await algod.sendRawTransaction(stxns).do();

      setVoteSuccess(
        `Successfully voted ${vote === "yes" ? "For" : "Against"} on "${
          proposal.title
        }"`
      );

      // Refresh voter data
      await fetchVoterData();

      toast({
        title: "Success",
        description: `Successfully voted ${
          vote === "yes" ? "For" : "Against"
        } on "${proposal.title}"`,
      });
    } catch (error) {
      console.error("Error casting vote:", error);
      setVoteError("Failed to cast vote. Please try again.");
      toast({
        title: "Error",
        description: "Failed to cast vote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
    }
  };

  // Load data when component mounts or account changes
  useEffect(() => {
    if (activeAccount) {
      fetchUserBalance();
      fetchVoterData();
    }
  }, [activeAccount, activeNetwork]);

  // Adjust lock amount if it exceeds user balance
  useEffect(() => {
    if (lockAmount[0] > userBalance && userBalance > 0) {
      setLockAmount([Math.max(userBalance, 100)]);
    }
  }, [userBalance, lockAmount]);

  // Clear error/success messages when user changes lock settings
  useEffect(() => {
    setLockError("");
    setLockSuccess("");
  }, [lockAmount, lockDuration]);

  // Clear vote error/success messages when user changes proposals
  useEffect(() => {
    setVoteError("");
    setVoteSuccess("");
  }, [proposal.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open": return "bg-teal-500/20 text-teal-400 border-teal-500/30";
      case "Passed": return "bg-violet-500/20 text-violet-400 border-violet-500/30";
      case "Closed": return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getChainChipColor = (chain: string) => {
    switch (chain) {
      case "VOI": return "bg-teal-500/20 text-teal-400 border-teal-500/30";
      case "ALGO": return "bg-violet-500/20 text-violet-400 border-violet-500/30";
      case "EVM": return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      case "COSMOS": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;
  const forPercentage = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (proposal.votesAgainst / totalVotes) * 100 : 0;
  const abstainPercentage = totalVotes > 0 ? (proposal.votesAbstain / totalVotes) * 100 : 0;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" onClick={onBack} className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Proposals
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gradient-primary mb-2">
                {proposal.title}
              </h1>
              <div className="flex items-center gap-4 text-gray-400">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Created: {proposal.createdAt || "Dec 15, 2024"}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {proposal.timeRemaining}
                </div>
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Proposal #{proposal.id}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge className={getStatusColor(proposal.status)}>
                {proposal.status}
              </Badge>
              <Button variant="outline" className="glass-morphism-violet neon-glow-violet">
                <ExternalLink className="w-4 h-4 mr-2" />
                View on enfs://
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Card */}
            <Card className="glass-morphism neon-glow-teal">
              <CardHeader>
                <CardTitle className="text-2xl mb-4">{proposal.title}</CardTitle>
                <CardDescription className="text-gray-300 text-lg leading-relaxed">
                  {proposal.fullDescription || proposal.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    {proposal.chains.map((chain) => (
                      <Badge key={chain} variant="outline" className={getChainChipColor(chain)}>
                        {chain}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <LinkIcon className="w-4 h-4" />
                    <span>{proposal.enfsRef}</span>
                  </div>
                </div>
                {proposal.proposer && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">Proposed by:</span>
                    <span className="text-teal-400">{proposal.proposer}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Voting Results */}
            <Card className="glass-morphism-silver">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Voting Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Results Bars */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-400 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        For
                      </span>
                      <span className="text-gray-300">
                        {proposal.votesFor.toLocaleString()} ({forPercentage.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress value={forPercentage} className="h-3" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-red-400 flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        Against
                      </span>
                      <span className="text-gray-300">
                        {proposal.votesAgainst.toLocaleString()} ({againstPercentage.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress value={againstPercentage} className="h-3" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400 flex items-center gap-2">
                        <Minus className="w-4 h-4" />
                        Abstain
                      </span>
                      <span className="text-gray-300">
                        {proposal.votesAbstain.toLocaleString()} ({abstainPercentage.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress value={abstainPercentage} className="h-3" />
                  </div>
                </div>

                {/* Total Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-800">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gradient">{totalVotes.toLocaleString()}</div>
                    <div className="text-sm text-gray-400">Total Votes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-teal-400">{forPercentage.toFixed(1)}%</div>
                    <div className="text-sm text-gray-400">For</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-violet-400">{proposal.chains.length}</div>
                    <div className="text-sm text-gray-400">Chains</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cross-Chain Breakdown */}
            <Card className="glass-morphism">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Cross-Chain Tally
                </CardTitle>
                <CardDescription>
                  Your VP is tallied across chains, bound to your enVOI name
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {proposal.chains.map((chain) => (
                    <div key={chain} className="text-center p-4 rounded-lg bg-black/20 border border-gray-800">
                      <div className="text-lg font-semibold text-gradient">{chain}</div>
                      <div className="text-sm text-gray-400">Chain Votes</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {Math.floor(Math.random() * 1000000).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Voting Power Panel */}
            <Card className="glass-morphism-violet neon-glow-violet">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Voting Power
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Error and Success Messages */}
                {lockError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-center gap-2 text-red-300 text-sm">
                      <XCircle className="w-4 h-4" />
                      {lockError}
                    </div>
                  </div>
                )}

                {lockSuccess && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center gap-2 text-green-300 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      {lockSuccess}
                    </div>
                  </div>
                )}

                {/* Eligibility Status */}
                <div className="flex items-center gap-2">
                  {voterInfo && Number(voterInfo.votePower) > 0 ? (
                    <CheckCircle className="w-5 h-5 text-teal-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span
                    className={
                      voterInfo && Number(voterInfo.votePower) > 0
                        ? "text-teal-400"
                        : "text-red-400"
                    }
                  >
                    {voterInfo && Number(voterInfo.votePower) > 0
                      ? `Eligible: ${(
                          Number(voterInfo.votePower) / 1e6
                        ).toLocaleString()} VP`
                      : "Not eligible: lock tokens to vote"}
                  </span>
                </div>

                {/* VP Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>
                      Current VP:{" "}
                      {isLoadingVoterData
                        ? "Loading..."
                        : voterInfo
                        ? (
                            Number(voterInfo.votePower) / 1e6
                          ).toLocaleString()
                        : "0"}
                    </span>
                    <span>
                      Multiplier:{" "}
                      {
                        durationMultipliers[
                          lockDuration as keyof typeof durationMultipliers
                        ]
                      }
                      ×
                    </span>
                  </div>
                  <div className="text-lg font-semibold text-gradient">
                    VP:{" "}
                    {isLoadingVoterData
                      ? "Loading..."
                      : voterInfo
                      ? (Number(voterInfo.votePower) / 1e6).toLocaleString()
                      : "0"}
                  </div>
                  <Progress
                    value={
                      isLoadingVoterData
                        ? 0
                        : voterInfo
                        ? (Number(voterInfo.votePower) / 1e6 / 50000) * 100
                        : 0
                    }
                    className="h-2"
                  />
                </div>

                {/* Lock Controls */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-gray-300">
                      Lock Amount
                    </Label>
                    <Slider
                      value={lockAmount}
                      onValueChange={setLockAmount}
                      max={Math.max(userBalance, 100)}
                      min={100}
                      step={100}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>100</span>
                      <span>
                        {Math.max(userBalance, 100).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm text-gray-300">
                      Duration
                    </Label>
                    <div className="flex gap-2 mt-2">
                      {Object.entries(durationMultipliers).map(
                        ([duration, multiplier]) => (
                        <Button
                          key={duration}
                            variant={
                              lockDuration === duration
                                ? "default"
                                : "outline"
                            }
                          size="sm"
                          onClick={() => setLockDuration(duration)}
                            className={
                              lockDuration === duration
                                ? "neon-glow-teal"
                                : ""
                            }
                        >
                          {duration} ({multiplier}×)
                        </Button>
                        )
                      )}
                    </div>
                  </div>

                  <Button
                    className="w-full neon-glow-teal"
                    onClick={handleLockTokens}
                    disabled={
                      isLocking ||
                      !activeAccount ||
                      lockAmount[0] <= 0 ||
                      lockAmount[0] > userBalance
                    }
                  >
                    {isLocking ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Locking...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Lock
                      </>
                    )}
                      </Button>
                </div>
              </CardContent>
            </Card>

            {/* Mint Tokens - Only for Localnet */}
            {activeNetwork === NetworkId.LOCALNET && (
              <Card className="glass-morphism-teal neon-glow-teal">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Mint Tokens
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Mint test tokens for Localnet testing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Current Balance</span>
                      <span className="text-teal-400">
                        {userBalance.toLocaleString()} VOI
                      </span>
                          </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Mint Amount</span>
                      <span className="text-white">
                        {mintAmount.toLocaleString()} VOI
                      </span>
                          </div>
                        </div>

                  <div className="space-y-3">
                    <Label className="text-sm text-gray-300">
                      Amount to Mint
                    </Label>
                        <div className="flex gap-2">
                          <Button 
                        variant={
                          mintAmount === 1000 ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setMintAmount(1000)}
                        className={`flex-1 ${
                          mintAmount === 1000 ? "neon-glow-teal" : ""
                        }`}
                      >
                        1K VOI
                      </Button>
                      <Button
                        variant={
                          mintAmount === 10000 ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setMintAmount(10000)}
                        className={`flex-1 ${
                          mintAmount === 10000 ? "neon-glow-teal" : ""
                        }`}
                      >
                        10K VOI
                          </Button>
                          <Button 
                        variant={
                          mintAmount === 100000 ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setMintAmount(100000)}
                        className={`flex-1 ${
                          mintAmount === 100000 ? "neon-glow-teal" : ""
                        }`}
                      >
                        100K VOI
                          </Button>
                        </div>
                      </div>

                  <Button
                    className="w-full neon-glow-teal"
                    onClick={() => mintTokens(mintAmount)}
                    disabled={isMinting}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {isMinting ? "Minting..." : "Mint Tokens"}
                  </Button>
              </CardContent>
            </Card>
            )}

            {/* Vote Buttons */}
            {proposal.status === "Open" && (
              <Card className="glass-morphism-silver">
                <CardHeader>
                  <CardTitle className="text-lg">Cast Your Vote</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Error and Success Messages */}
                  {voteError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="flex items-center gap-2 text-red-300 text-sm">
                        <XCircle className="w-4 h-4" />
                        {voteError}
                      </div>
                    </div>
                  )}

                  {voteSuccess && (
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <div className="flex items-center gap-2 text-green-300 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        {voteSuccess}
                      </div>
                    </div>
                  )}

                  <Button 
                    className="w-full neon-glow-teal"
                    onClick={() => handleCastVote("yes")}
                    disabled={
                      isVoting ||
                      !voterInfo ||
                      Number(voterInfo.votePower) <= 0
                    }
                  >
                    {isVoting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Voting...
                      </>
                    ) : (
                      <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Vote For
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => handleCastVote("no")}
                    disabled={
                      isVoting ||
                      !voterInfo ||
                      Number(voterInfo.votePower) <= 0
                    }
                  >
                    {isVoting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Voting...
                      </>
                    ) : (
                      <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Vote Against
                      </>
                    )}
                  </Button>
                  <div className="text-xs text-gray-400 text-center pt-2">
                    Changes to locks take effect immediately. Locks &lt; 7d are ineligible.
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Activity Feed */}
            <Card className="glass-morphism">
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>AT</AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-teal-400">atlas.voi</span> voted FOR
                    <div className="text-gray-400 text-xs">2m ago</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>CO</AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-violet-400">cosmos.voi</span> increased lock by $2,100
                    <div className="text-gray-400 text-xs">15m ago</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>FO</AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-gray-300">founder.voi</span> voted AGAINST
                    <div className="text-gray-400 text-xs">1h ago</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
