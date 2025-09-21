import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
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
  CheckCircle,
  XCircle,
  Vote,
  Award,
  Calendar,
  Home,
  ArrowLeft,
  Plus,
  Minus,
  Settings,
  BarChart3,
  MessageSquare,
  Wallet,
  RefreshCw,
} from "lucide-react";
import {
  ElectionConfig,
  ElectionStatus,
  ElectionCandidate,
} from "@/types/elections";
import {
  PowGovernanceClient,
  APP_SPEC as PowGovernanceAppSpec,
} from "../clients/PowGovernanceClient";
import { loadElections, getElectionStats } from "@/utils/electionConfig";
import { useWallet, NetworkId } from "@txnlab/use-wallet-react";
import { castElectionVote } from "@/utils/command";
import { getGovernanceAppId } from "@/constants/appIds";
import { toast } from "@/components/ui/use-toast";
import algosdk from "algosdk";
import { CONTRACT } from "ulujs";
import { namehash } from "@/utils/namehash";
import { useElectionInfo } from "@/hooks/useElectionInfo";
import {
  ElectionInfoService,
  CandidateEndorsement,
} from "@/services/electionInfoService";

export default function ElectionDemo() {
  const navigate = useNavigate();
  const [elections, setElections] = useState<ElectionConfig[]>([]);
  const [selectedElection, setSelectedElection] =
    useState<ElectionConfig | null>(null);
  const [electionStats, setElectionStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userVP, setUserVP] = useState(12000);
  const [electionLockAmount, setElectionLockAmount] = useState([5000]);
  const [electionLockDuration, setElectionLockDuration] = useState("8w");
  const [electionVP, setElectionVP] = useState(0);
  const [isElectionEligible, setIsElectionEligible] = useState(false);
  const [electionLockDaysRemaining, setElectionLockDaysRemaining] = useState(0);
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [voteError, setVoteError] = useState("");
  const [voteSuccess, setVoteSuccess] = useState("");
  const [candidateEndorsements, setCandidateEndorsements] = useState<
    Map<number, bigint>
  >(new Map());
  const [isLoadingEndorsements, setIsLoadingEndorsements] = useState(false);
  const [endorsementError, setEndorsementError] = useState<string | null>(null);

  const { activeAccount, activeNetwork, algodClient, signTransactions } =
    useWallet();
  const electionDetailsRef = useRef<HTMLDivElement>(null);

  // Use election info hook for real-time data
  const {
    electionInfo,
    isLoading: isElectionInfoLoading,
    error: electionInfoError,
    refetch: refetchElectionInfo,
    isElectionActive,
    timeRemaining: realTimeRemaining,
    electionStatus: realElectionStatus,
  } = useElectionInfo(selectedElection);

  // Load elections configuration on component mount
  const loadElectionData = async () => {
    try {
      setLoading(true);
      const [electionsData, stats] = await Promise.all([
        loadElections(),
        getElectionStats(),
      ]);

      setElections(electionsData.elections);
      setElectionStats(stats);

      // Set first active election as default, or first election if no active ones
      const activeElection = electionsData.elections.find(
        (e) => e.status === ElectionStatus.ACTIVE
      );
      setSelectedElection(activeElection || electionsData.elections[0] || null);

      setError(null);
    } catch (err) {
      console.error("Error loading election data:", err);
      setError("Failed to load election data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadElectionData();
  }, []);

  // Election-specific duration multipliers (different from proposals)
  const electionDurationMultipliers = {
    "4w": 1.0,
    "8w": 1.5,
    "16w": 2.0,
    "32w": 2.5,
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

  // Initialize ElectionInfoService
  const electionInfoService = useMemo(() => {
    if (!algod || !activeAccount?.address) return null;
    return new ElectionInfoService(algod, activeAccount.address);
  }, [algod, activeAccount?.address]);

  // Fetch candidate endorsements when selected election changes
  useEffect(() => {
    if (selectedElection && electionInfoService && activeNetwork) {
      fetchCandidateEndorsements();
    }
  }, [selectedElection, electionInfoService, activeNetwork, electionInfo]);

  const calculateElectionVP = () => {
    const baseVP = electionLockAmount[0];
    const multiplier =
      electionDurationMultipliers[
        electionLockDuration as keyof typeof electionDurationMultipliers
      ];
    return Math.floor(baseVP * multiplier);
  };

  // Fetch candidate endorsements for the selected election
  const fetchCandidateEndorsements = async () => {
    if (!selectedElection || !electionInfoService || !activeNetwork) {
      return;
    }

    setIsLoadingEndorsements(true);
    setEndorsementError(null);

    try {
      const endorsementsMap = new Map<number, bigint>();

      // Use proposal hash for fetching endorsements
      const electionNode = selectedElection.proposalHash;

      console.log("Election node:", electionNode);

      // Fetch endorsements for each candidate
      const endorsementPromises = selectedElection.candidates.map(
        async (candidate) => {
          try {
            // Convert candidate name to node hash
            console.log("Candidate name:", candidate.name);
            const candidateNodeBytes = await namehash(candidate.name);
            // Convert Uint8Array to hex string
            const candidateNode = Array.from(candidateNodeBytes)
              .map((byte) => byte.toString(16).padStart(2, "0"))
              .join("");
            const endorsementCount =
              await electionInfoService.getCandidateEndorsement(
                electionNode,
                candidateNode,
                activeNetwork
              );
            endorsementsMap.set(candidate.id, endorsementCount);
          } catch (error) {
            console.error(
              `Error fetching endorsement for candidate ${candidate.name}:`,
              error
            );
            endorsementsMap.set(candidate.id, BigInt(0));
          }
        }
      );

      await Promise.all(endorsementPromises);
      setCandidateEndorsements(endorsementsMap);
    } catch (error) {
      console.error("Error fetching candidate endorsements:", error);
      setEndorsementError(
        error instanceof Error
          ? error.message
          : "Failed to fetch candidate endorsements"
      );
    } finally {
      setIsLoadingEndorsements(false);
    }
  };

  console.log("Candidate endorsements:", candidateEndorsements);

  const scrollToElectionDetails = () => {
    if (electionDetailsRef.current) {
      electionDetailsRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const handleElectionClick = (election: ElectionConfig) => {
    setSelectedElection(election);
    setSelectedCandidates([]);
    setHasVoted(false);
    setVoteError("");
    setVoteSuccess("");

    // Scroll to election details after a short delay to ensure the component has rendered
    setTimeout(() => {
      scrollToElectionDetails();
    }, 100);
  };

  const handleCandidateSelect = (candidateId: number) => {
    if (hasVoted) return;

    setSelectedCandidates((prev) => {
      if (prev.includes(candidateId)) {
        return prev.filter((id) => id !== candidateId);
      } else if (prev.length < 5) {
        return [...prev, candidateId];
      }
      return prev;
    });
  };

  const handleElectionVote = async () => {
    if (!activeAccount || !activeNetwork) {
      toast({
        title: "Error",
        description: "Please connect your wallet to vote",
        variant: "destructive",
      });
      return;
    }

    if (selectedCandidates.length !== 5) {
      toast({
        title: "Error",
        description: "Please select exactly 5 candidates",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsVoting(true);
      setVoteError("");
      setVoteSuccess("");

      const appId = getGovernanceAppId(activeNetwork);

      // Convert proposal hash to bytes
      const proposalHashBytes = new Uint8Array(
        selectedElection!.proposalHash.length / 2
      );
      for (let i = 0; i < selectedElection!.proposalHash.length; i += 2) {
        proposalHashBytes[i / 2] = parseInt(
          selectedElection!.proposalHash.substr(i, 2),
          16
        );
      }

      const castElectionVoteParams = {
        appId: appId,
        proposalHash: selectedElection!.proposalHash,
        candidateIds: selectedCandidates,
        addr: activeAccount.address,
        sk: new Uint8Array(),
        debug: true,
      };

      console.log("Casting election vote with params:", castElectionVoteParams);

      const ci = new CONTRACT(
        appId,
        algod,
        undefined,
        { ...PowGovernanceAppSpec.contract, events: [] },
        { addr: activeAccount.address, sk: new Uint8Array() }
      );

      console.log({
        proposalHash: selectedElection!.proposalHash,
        proposalHashBytes,
        selectedCandidates,
      });

      // Convert candidate IDs to candidate names
      const candidateNames = selectedCandidates
        .map((candidateId) => {
          const candidate = selectedElection!.candidates.find(
            (c) => c.id === candidateId
          );
          return candidate ? candidate.name : "";
        })
        .filter((name) => name !== "");

      console.log({ candidateNames });

      const result = await ci.endorse_candidates(
        proposalHashBytes,
        await namehash(candidateNames[0]),
        await namehash(candidateNames[1]),
        await namehash(candidateNames[2]),
        await namehash(candidateNames[3]),
        await namehash(candidateNames[4])
      );

      if (!result.success) {
        setVoteError(result.error || "Failed to cast election vote");
        toast({
          title: "Error",
          description: result.error || "Failed to cast election vote",
          variant: "destructive",
        });
        return;
      }

      const stxns = await signTransactions(
        result.txns.map(
          (txn: string) =>
            new Uint8Array(
              atob(txn)
                .split("")
                .map((char) => char.charCodeAt(0))
            )
        )
      );

      const { txId } = await algod.sendRawTransaction(stxns).do();

      console.log("Transaction ID:", txId);

      await algosdk.waitForConfirmation(algod, txId, 4);

      console.log("Transaction confirmed");

      await fetchCandidateEndorsements();

      await refetchElectionInfo();

      setHasVoted(true);
      setVoteSuccess("Election vote submitted successfully!");

      toast({
        title: "Success",
        description: "Your election vote has been submitted successfully",
      });
    } catch (error) {
      console.error("Error casting election vote:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to cast election vote";
      setVoteError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-teal-500/20 text-teal-400 border-teal-500/30";
      case "Upcoming":
        return "bg-violet-500/20 text-violet-400 border-violet-500/30";
      case "Completed":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getChainChipColor = (chain: string) => {
    switch (chain) {
      case "VOI":
        return "bg-teal-500/20 text-teal-400 border-teal-500/30";
      case "ALGO":
        return "bg-violet-500/20 text-violet-400 border-violet-500/30";
      case "EVM":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      case "COSMOS":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading elections...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={loadElectionData} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Show no elections state
  if (elections.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">No elections available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation Header */}
      <div className="border-b border-gray-800/50 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="text-gray-400 hover:text-white"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
              <div className="hidden md:block h-6 w-px bg-gray-600"></div>
              <Button
                variant="ghost"
                onClick={() => navigate("/voting")}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Voting
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <Badge
                variant="outline"
                className="glass-morphism-silver neon-glow-silver"
              >
                <Shield className="w-4 h-4 mr-2" />
                Connected: shelly.voi
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="border-b border-gray-800/50 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gradient-primary mb-2">
              enChain Elections ✦ Democratic governance in action
            </h1>
            <p className="text-gray-400 text-lg">
              Participate in community elections and shape the future
            </p>
            {electionStats && (
              <div className="mt-4 flex justify-center gap-6 text-sm text-gray-300">
                <span>{electionStats.totalElections} Total Elections</span>
                <span>{electionStats.activeElections} Active</span>
                <span>{electionStats.upcomingElections} Upcoming</span>
                <span>{electionStats.totalCandidates} Candidates</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Election Cards */}
          <div className="lg:col-span-2 space-y-6">
            {elections.map((election) => (
              <Card
                key={election.id}
                className="glass-morphism hover:neon-glow-teal transition-all duration-300 cursor-pointer"
                onClick={() => handleElectionClick(election)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">
                        {election.title}
                      </CardTitle>
                      <CardDescription className="text-gray-300 mb-4">
                        {election.description}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(election.status)}>
                      {election.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {selectedElection?.id === election.id &&
                      realTimeRemaining !== "Unknown"
                        ? realTimeRemaining
                        : election.timeRemaining}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {election.positions} positions
                    </div>
                    <div className="flex gap-2">
                      {election.chains.map((chain) => (
                        <Badge
                          key={chain}
                          variant="outline"
                          className={getChainChipColor(chain)}
                        >
                          {chain}
                        </Badge>
                      ))}
                    </div>
                    {selectedElection?.id === election.id &&
                      isElectionInfoLoading && (
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Loading...</span>
                        </div>
                      )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {election.candidates.slice(0, 4).map((candidate) => (
                        <div
                          key={candidate.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/30"
                        >
                          <Avatar className="w-10 h-10">
                            <AvatarFallback>
                              {candidate.name
                                .split(".")[0]
                                .slice(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {candidate.name}
                            </div>
                            {/*<div className="text-xs text-gray-400">
                              {candidate?.votes?.toLocaleString()} votes
                            </div>*/}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {isLoadingEndorsements ? (
                              <div className="flex items-center gap-1">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                Loading...
                              </div>
                            ) : (
                              `${Number(
                                candidateEndorsements.get(candidate.id) ||
                                  candidate.endorsements
                              )} endorsements`
                            )}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    {election.candidates.length > 4 && (
                      <div className="text-center text-sm text-gray-400">
                        +{election.candidates.length - 4} more candidates
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">
                        Total Votes: {election.totalVotes.toLocaleString()}
                      </span>
                      <span className="text-gray-400">
                        Candidates: {election.candidates.length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Election Voting Power, Statistics, and Activity */}
          <div className="space-y-6">
            <Card className="glass-morphism-violet neon-glow-violet">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Election Voting Power
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Lock tokens to participate in elections (separate from
                  proposal voting)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Eligibility Status */}
                <div className="flex items-center gap-2">
                  {isElectionEligible ? (
                    <CheckCircle className="w-5 h-5 text-teal-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span
                    className={
                      isElectionEligible ? "text-teal-400" : "text-red-400"
                    }
                  >
                    {isElectionEligible
                      ? `Eligible: active election lock ${electionLockDaysRemaining}d remaining`
                      : "Not eligible: lock tokens for election voting"}
                  </span>
                </div>

                {/* Current Election VP */}
                {isElectionEligible && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>
                        Election Locked: $
                        {electionLockAmount[0].toLocaleString()}
                      </span>
                      <span>
                        Multiplier:{" "}
                        {
                          electionDurationMultipliers[
                            electionLockDuration as keyof typeof electionDurationMultipliers
                          ]
                        }
                        ×
                      </span>
                    </div>
                    <div className="text-lg font-semibold text-gradient">
                      Election VP: {calculateElectionVP().toLocaleString()}
                    </div>
                    <Progress
                      value={(calculateElectionVP() / 100000) * 100}
                      className="h-2"
                    />
                  </div>
                )}

                {/* Election Lock Controls */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-gray-300">
                      Election Lock Amount ($)
                    </Label>
                    <Slider
                      value={electionLockAmount}
                      onValueChange={setElectionLockAmount}
                      max={100000}
                      min={1000}
                      step={500}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>$1,000</span>
                      <span>$100,000</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm text-gray-300">
                      Election Lock Duration
                    </Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {Object.entries(electionDurationMultipliers).map(
                        ([duration, multiplier]) => (
                          <Button
                            key={duration}
                            variant={
                              electionLockDuration === duration
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() => setElectionLockDuration(duration)}
                            className={
                              electionLockDuration === duration
                                ? "neon-glow-violet"
                                : ""
                            }
                          >
                            {duration} ({multiplier}×)
                          </Button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1 neon-glow-violet">
                      <Lock className="w-4 h-4 mr-2" />
                      Lock for Elections
                    </Button>
                    <Button variant="outline" className="neon-glow-teal">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Election VP Info */}
                <div className="p-3 rounded-lg bg-gray-800/30 text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="w-4 h-4 text-violet-400" />
                    <span className="font-medium text-violet-400">
                      Election VP Rules
                    </span>
                  </div>
                  <ul className="text-gray-300 space-y-1 text-xs">
                    <li>• Election locks are separate from proposal locks</li>
                    <li>• Longer locks provide higher multipliers</li>
                    <li>• Minimum 4 weeks lock required for elections</li>
                    <li>• Election VP cannot be used for proposals</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Election Stats */}
            <Card className="glass-morphism">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Election Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total Elections</span>
                    <span className="text-white">
                      {electionStats?.totalElections || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Active Elections</span>
                    <span className="text-teal-400">
                      {electionStats?.activeElections || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Upcoming Elections</span>
                    <span className="text-violet-400">
                      {electionStats?.upcomingElections || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Completed Elections</span>
                    <span className="text-gray-400">
                      {electionStats?.completedElections || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total Candidates</span>
                    <span className="text-white">
                      {electionStats?.totalCandidates || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total Votes Cast</span>
                    <span className="text-white">
                      {electionStats?.totalVotesCast?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Most Popular Chain</span>
                    <span className="text-teal-400">
                      {electionStats?.mostPopularChain || "VOI"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
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
                    <span className="text-teal-400">atlas.voi</span> received 45
                    new endorsements
                    <div className="text-gray-400 text-xs">2h ago</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>FO</AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-violet-400">founder.voi</span> gained
                    1,200 votes
                    <div className="text-gray-400 text-xs">4h ago</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>CO</AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-gray-400">cosmos.voi</span> published
                    campaign statement
                    <div className="text-gray-400 text-xs">6h ago</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Selected Election Details */}
          {selectedElection && (
            <div ref={electionDetailsRef} className="lg:col-span-2 space-y-6">
              <Card className="glass-morphism-silver">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl mb-2">
                        {electionInfo?.electionTitle || selectedElection.title}
                      </CardTitle>
                      <CardDescription className="text-gray-300 text-lg">
                        {electionInfo?.electionDescription ||
                          selectedElection.description}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={getStatusColor(
                          realElectionStatus !== "Unknown"
                            ? realElectionStatus
                            : selectedElection.status
                        )}
                      >
                        {realElectionStatus !== "Unknown"
                          ? realElectionStatus
                          : selectedElection.status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={refetchElectionInfo}
                        disabled={isElectionInfoLoading}
                        className="neon-glow-teal"
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${
                            isElectionInfoLoading ? "animate-spin" : ""
                          }`}
                        />
                      </Button>
                    </div>
                  </div>

                  {/* Election Metadata */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-teal-400" />
                      <div>
                        <div className="text-sm text-gray-400">
                          Time Remaining
                        </div>
                        <div className="font-semibold">
                          {realTimeRemaining !== "Unknown"
                            ? realTimeRemaining
                            : selectedElection.timeRemaining}
                        </div>
                        {isElectionInfoLoading && (
                          <div className="text-xs text-gray-500">
                            Updating...
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-violet-400" />
                      <div>
                        <div className="text-sm text-gray-400">Positions</div>
                        <div className="font-semibold">
                          {selectedElection.positions}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-5 h-5 text-blue-400" />
                      <div>
                        <div className="text-sm text-gray-400">Total Votes</div>
                        <div className="font-semibold">
                          {selectedElection.totalVotes.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Election Info Error Display */}
                  {electionInfoError && (
                    <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                      <div className="flex items-center gap-2 text-red-400">
                        <XCircle className="w-4 h-4" />
                        <span className="text-sm">
                          Failed to fetch real-time election data:{" "}
                          {electionInfoError}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Election Info Success Display */}
                  {electionInfo && !electionInfoError && (
                    <div className="mt-4 p-4 bg-teal-500/20 border border-teal-500/30 rounded-lg">
                      <div className="flex items-center gap-2 text-teal-400">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm">
                          Real-time election data loaded successfully
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Endorsement Error Display */}
                  {endorsementError && (
                    <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                      <div className="flex items-center gap-2 text-red-400">
                        <XCircle className="w-4 h-4" />
                        <span className="text-sm">
                          Failed to fetch candidate endorsements:{" "}
                          {endorsementError}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Chains */}
                  <div className="flex items-center gap-2 mt-4">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-400 mr-2">
                      Supported Chains:
                    </span>
                    {selectedElection.chains.map((chain) => (
                      <Badge
                        key={chain}
                        variant="outline"
                        className={getChainChipColor(chain)}
                      >
                        {chain}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
              </Card>

              {/* Candidates Section */}
              <Card className="glass-morphism">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Candidates ({selectedElection.candidates.length})
                      </CardTitle>
                      <CardDescription>
                        Select exactly 5 candidates to vote
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchCandidateEndorsements}
                      disabled={isLoadingEndorsements}
                      className="neon-glow-teal"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${
                          isLoadingEndorsements ? "animate-spin" : ""
                        }`}
                      />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedElection.candidates.map((candidate) => (
                      <Card
                        key={candidate.id}
                        className={`glass-morphism transition-all duration-300 ${
                          hasVoted
                            ? "opacity-50 cursor-not-allowed"
                            : selectedCandidates.length === 5 &&
                              !selectedCandidates.includes(candidate.id)
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer"
                        } ${
                          selectedCandidates.includes(candidate.id)
                            ? "neon-glow-teal border-teal-500/50"
                            : selectedCandidates.length < 5
                            ? "hover:neon-glow-teal"
                            : ""
                        }`}
                        onClick={() => handleCandidateSelect(candidate.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <Avatar className="w-12 h-12">
                              <AvatarFallback>
                                {candidate.name
                                  .split(".")[0]
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">
                                  {candidate.name}
                                </h3>
                                {selectedCandidates.includes(candidate.id) && (
                                  <CheckCircle className="w-4 h-4 text-teal-400" />
                                )}
                              </div>
                              <p className="text-sm text-gray-300 mb-3 line-clamp-2">
                                {candidate.bio}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-gray-400">
                                <div className="flex items-center gap-1">
                                  <Vote className="w-3 h-3" />
                                  {candidate.votes?.toLocaleString()} votes
                                </div>
                                <div className="flex items-center gap-1">
                                  <Star className="w-3 h-3" />
                                  {isLoadingEndorsements ? (
                                    <div className="flex items-center gap-1">
                                      <RefreshCw className="w-3 h-3 animate-spin" />
                                      Loading...
                                    </div>
                                  ) : (
                                    `${Number(
                                      candidateEndorsements.get(candidate.id) ||
                                        candidate.endorsements
                                    )} endorsements`
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Campaign Statement */}
                          {candidate.campaignStatement && (
                            <div className="mt-4 p-3 bg-gray-800/30 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <MessageSquare className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-300">
                                  Campaign Statement
                                </span>
                              </div>
                              <p className="text-sm text-gray-300">
                                {candidate.campaignStatement}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Voting Actions */}
              {(realElectionStatus === "Active" ||
                selectedElection.status === "Active") && (
                <Card className="glass-morphism-silver">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Vote className="w-5 h-5" />
                      Cast Your Vote
                    </CardTitle>
                    <CardDescription>
                      {selectedCandidates.length > 0
                        ? `Selected ${selectedCandidates.length}/5 candidates`
                        : "Select exactly 5 candidates to vote"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Selection Progress */}
                    <div className="p-4 bg-gray-800/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-300">
                          Selection Progress
                        </div>
                        <div className="text-sm font-medium text-gray-300">
                          {selectedCandidates.length}/5 candidates selected
                        </div>
                      </div>
                      <Progress
                        value={(selectedCandidates.length / 5) * 100}
                        className="h-2 mb-3"
                      />

                      {selectedCandidates.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm text-gray-300">
                            Selected Candidates:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {selectedCandidates.map((candidateId) => {
                              const candidate =
                                selectedElection.candidates.find(
                                  (c) => c.id === candidateId
                                );
                              return candidate ? (
                                <Badge
                                  key={candidateId}
                                  variant="outline"
                                  className="neon-glow-teal"
                                >
                                  {candidate.name}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}

                      {selectedCandidates.length < 5 && (
                        <div className="text-sm text-gray-400 mt-2">
                          {selectedCandidates.length === 0
                            ? "Click on candidate cards to select them"
                            : `Select ${
                                5 - selectedCandidates.length
                              } more candidate${
                                5 - selectedCandidates.length > 1 ? "s" : ""
                              }`}
                        </div>
                      )}
                    </div>

                    {/* Error Message */}
                    {voteError && (
                      <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                        <div className="flex items-center gap-2 text-red-400">
                          <XCircle className="w-4 h-4" />
                          <span className="text-sm">{voteError}</span>
                        </div>
                      </div>
                    )}

                    {/* Success Message */}
                    {voteSuccess && (
                      <div className="p-4 bg-teal-500/20 border border-teal-500/30 rounded-lg">
                        <div className="flex items-center gap-2 text-teal-400">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">{voteSuccess}</span>
                        </div>
                      </div>
                    )}

                    {!hasVoted ? (
                      <Button
                        className="w-full neon-glow-teal"
                        onClick={handleElectionVote}
                        disabled={
                          selectedCandidates.length !== 5 ||
                          isVoting ||
                          !activeAccount
                        }
                      >
                        {isVoting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Submitting Vote...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Submit Vote ({selectedCandidates.length}/5)
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="text-center py-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/30">
                          <CheckCircle className="w-4 h-4" />
                          Vote submitted successfully
                        </div>
                      </div>
                    )}

                    {/* Wallet Connection Warning */}
                    {!activeAccount && (
                      <div className="p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                        <div className="flex items-center gap-2 text-yellow-400">
                          <Wallet className="w-4 h-4" />
                          <span className="text-sm">
                            Please connect your wallet to vote
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
