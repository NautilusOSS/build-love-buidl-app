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
} from "@/clients/PowGovernanceClient";
import { loadElections, getElectionStats } from "@/utils/electionConfig";
import { useWallet, NetworkId } from "@txnlab/use-wallet-react";
import { castElectionVote } from "@/utils/command";
import { getGovernanceAppId, getATokenAppId } from "@/constants/appIds";
import { toast } from "@/components/ui/use-toast";
import algosdk from "algosdk";
import { CONTRACT, abi } from "ulujs";
import { namehash } from "@/utils/namehash";
import { useElectionInfo } from "@/hooks/useElectionInfo";
import {
  ElectionInfoService,
  CandidateEndorsement,
} from "@/services/electionInfoService";
import { lockPower, getVoter } from "@/utils/command";
import { APP_SPEC as ATokenAppSpec } from "@/clients/ATokenClient";

// Voter info interface (matching PowerUp)
interface VoterInfo {
  voterAddress: string;
  votePower: bigint;
  voteTimestamp: bigint;
  proposalsParticipated: bigint;
  lastParticipationTimestamp: bigint;
}

// Minimum VP requirement for elections
const MINIMUM_VP_FOR_ELECTIONS = 50000; // 50k VP

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
  const [countdownTime, setCountdownTime] = useState<string>("");
  const [leaderboardSortBy, setLeaderboardSortBy] = useState<
    "endorsements" | "votes"
  >("endorsements");
  const [showAllCandidates, setShowAllCandidates] = useState(false);

  // Vote Power state (from Voting page)
  const [voterInfo, setVoterInfo] = useState<VoterInfo | null>(null);
  const [isLoadingVoterData, setIsLoadingVoterData] = useState(false);
  const [userBalance, setUserBalance] = useState(1000);
  const [lockAmount, setLockAmount] = useState([1000]);
  const [lockDuration, setLockDuration] = useState("4w");
  const [isLocking, setIsLocking] = useState(false);
  const [lockError, setLockError] = useState("");
  const [lockSuccess, setLockSuccess] = useState("");

  // Mint tokens state
  const [mintAmount, setMintAmount] = useState(10000);
  const [isMinting, setIsMinting] = useState(false);

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

  // Countdown timer effect
  useEffect(() => {
    if (!electionInfo || !isElectionActive) {
      setCountdownTime("");
      return;
    }

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const timeLeft = electionInfo.electionEndTimestamp - now;

      if (timeLeft <= 0) {
        setCountdownTime("Ended");
        return;
      }

      const days = Math.floor(timeLeft / (24 * 60 * 60));
      const hours = Math.floor((timeLeft % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((timeLeft % (60 * 60)) / 60);
      const seconds = timeLeft % 60;

      if (days > 0) {
        setCountdownTime(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      } else if (hours > 0) {
        setCountdownTime(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setCountdownTime(`${minutes}m ${seconds}s`);
      } else {
        setCountdownTime(`${seconds}s`);
      }
    };

    // Update immediately
    updateCountdown();

    // Set up interval to update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [electionInfo, isElectionActive]);

  // Election-specific duration multipliers (different from proposals)
  const electionDurationMultipliers = {
    "4w": 1.0,
    "8w": 1.5,
    "16w": 2.0,
    "32w": 2.5,
  };

  // Duration multipliers for Vote Power (same as Voting page)
  const durationMultipliers = {
    "1w": 1.0,
    "4w": 1.2,
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

  const indexer = useMemo(() => {
    switch (activeNetwork) {
      case NetworkId.LOCALNET:
        return new algosdk.Indexer(
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "http://10.0.0.31",
          8980
        );
      case NetworkId.TESTNET:
        return new algosdk.Indexer(
          "",
          "https://testnet-idx.4160.nodely.dev",
          443
        );
    }
    return undefined;
  }, [activeNetwork]);

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

  // Fetch voter data and user balance when account changes
  useEffect(() => {
    if (activeAccount && activeNetwork) {
      fetchVoterData();
      fetchUserBalance();
    }
  }, [activeAccount, activeNetwork]);

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
            const endorsementData =
              await electionInfoService.getCandidateEndorsement(
                electionNode,
                candidateNode,
                activeNetwork
              );
            const endorsementCount =
              endorsementData?.endorsementCount || BigInt(0);
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

  // Vote Power functions (from Voting page)
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

  const fetchUserBalance = async (): Promise<number> => {
    if (!activeAccount || !activeNetwork) {
      return 0;
    }

    try {
      const contractId = getATokenAppId(activeNetwork);
      const ci = new CONTRACT(contractId, algod, undefined, abi.nt200, {
        addr: activeAccount.address,
        sk: new Uint8Array(),
      });
      const balanceR = await ci.arc200_balanceOf(activeAccount.address);
      const balance = Number(balanceR.returnValue) / 1e6;
      setUserBalance(balance);
      return balance;
    } catch (error) {
      console.error("Error fetching user balance:", error);
      setUserBalance(0);
      return 0;
    }
  };

  console.log("User balance:", userBalance);

  const handleLockTokens = async () => {
    if (!activeAccount || !activeNetwork) {
      toast({
        title: "Error",
        description: "Please connect your wallet",
        variant: "destructive",
      });
      return;
    }

    const amount = lockAmount[0];
    if (amount <= 0 || amount > userBalance) {
      toast({
        title: "Error",
        description: "Invalid lock amount",
        variant: "destructive",
      });
      return;
    }

    setIsLocking(true);
    setLockError("");
    setLockSuccess("");

    try {
      const durationDays =
        lockDuration === "1w" ? 7 : lockDuration === "4w" ? 28 : 84;
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

  const handleElectionLockTokens = async () => {
    if (!activeAccount || !activeNetwork) {
      toast({
        title: "Error",
        description: "Please connect your wallet",
        variant: "destructive",
      });
      return;
    }

    const amount = electionLockAmount[0];
    if (amount <= 0 || amount > userBalance) {
      toast({
        title: "Error",
        description: "Invalid election lock amount",
        variant: "destructive",
      });
      return;
    }

    setIsLocking(true);
    setLockError("");
    setLockSuccess("");

    try {
      // Convert duration string to seconds
      const durationToSeconds = (duration: string): number => {
        switch (duration) {
          case "4w":
            return 4 * 7 * 24 * 60 * 60; // 4 weeks
          case "8w":
            return 8 * 7 * 24 * 60 * 60; // 8 weeks
          case "16w":
            return 16 * 7 * 24 * 60 * 60; // 16 weeks
          case "32w":
            return 32 * 7 * 24 * 60 * 60; // 32 weeks
          default:
            return 4 * 7 * 24 * 60 * 60; // default to 4 weeks
        }
      };

      const now = Math.floor(Date.now() / 1000); // Current timestamp in seconds
      const unlockTimestamp = now + durationToSeconds(electionLockDuration);

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

      console.log("Lock power params:", lockPowerParams);
      const lockPowerR = await lockPower(lockPowerParams);

      if (!lockPowerR.success) {
        setLockError(lockPowerR.error || "Failed to lock tokens for elections");
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
        `Successfully locked ${amount.toLocaleString()} tokens for elections for ${electionLockDuration}! Your election voting power has increased.`
      );

      // Reset election lock amount
      setElectionLockAmount([5000]);

      // Refresh data
      await fetchVoterData();
      await fetchUserBalance();

      toast({
        title: "Success",
        description: `Successfully locked ${amount.toLocaleString()} tokens for elections for ${electionLockDuration}`,
      });
    } catch (error) {
      console.error("Error locking tokens for elections:", error);
      setLockError("Failed to lock tokens for elections. Please try again.");
      toast({
        title: "Error",
        description: "Failed to lock tokens for elections. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLocking(false);
    }
  };

  const mintTokens = async (amount: number) => {
    if (!activeAccount || !algod) {
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

      ci.setFee(15000);
      ci.setPaymentAmount(195800);
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

      {/* Election Cards and Voting Power - Side by Side */}
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
                      {selectedElection?.id === election.id && countdownTime
                        ? countdownTime
                        : selectedElection?.id === election.id &&
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
                        Total Votes:{" "}
                        {selectedElection?.id === election.id &&
                        electionInfo?.endorsementVotes
                          ? electionInfo.endorsementVotes.toLocaleString()
                          : election.totalVotes.toLocaleString()}
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

          {/* Election Voting Power */}
          <div className="space-y-6">
            <Card className="glass-morphism-violet neon-glow-violet">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Election Voting Power
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Lock tokens to participate in elections
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Eligibility Status */}
                <div className="flex items-center gap-2">
                  {voterInfo &&
                  Number(voterInfo.votePower) >=
                    MINIMUM_VP_FOR_ELECTIONS * 1e6 ? (
                    <CheckCircle className="w-5 h-5 text-teal-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span
                    className={
                      voterInfo &&
                      Number(voterInfo.votePower) >=
                        MINIMUM_VP_FOR_ELECTIONS * 1e6
                        ? "text-teal-400"
                        : "text-red-400"
                    }
                  >
                    {voterInfo &&
                    Number(voterInfo.votePower) >=
                      MINIMUM_VP_FOR_ELECTIONS * 1e6
                      ? `Eligible: ${(
                          Number(voterInfo.votePower) / 1e6
                        ).toLocaleString()} VP`
                      : voterInfo && Number(voterInfo.votePower) > 0
                      ? `Not eligible: ${(
                          Number(voterInfo.votePower) / 1e6
                        ).toLocaleString()} VP (need ${MINIMUM_VP_FOR_ELECTIONS.toLocaleString()}+ VP)`
                      : "Not eligible: lock tokens to vote"}
                  </span>
                </div>

                {/* Current Election VP */}
                {isElectionEligible && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>
                        Election Locked:{" "}
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

                {/* Election Lock Controls */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-gray-300">
                      Election Lock Amount
                    </Label>
                    <Slider
                      value={electionLockAmount}
                      onValueChange={setElectionLockAmount}
                      max={Math.max(userBalance, 1000)}
                      min={1000}
                      step={500}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>1,000</span>
                      <span>
                        {Math.max(userBalance, 1000).toLocaleString()}
                      </span>
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

                  <Button
                    className="w-full neon-glow-violet"
                    onClick={handleElectionLockTokens}
                    disabled={
                      isLocking ||
                      !activeAccount ||
                      electionLockAmount[0] <= 0 ||
                      electionLockAmount[0] > userBalance
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
                        Lock for Elections
                      </>
                    )}
                  </Button>
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
                    <li>
                      • Minimum {MINIMUM_VP_FOR_ELECTIONS.toLocaleString()} VP
                      required to vote
                    </li>
                    <li>• Longer locks provide higher multipliers</li>
                    <li>• Minimum 4 weeks lock required for elections</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
            {/* Mint Tokens - Only for Localnet and Mainnet */}
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
                      variant={mintAmount === 1000 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMintAmount(1000)}
                      className={`flex-1 ${
                        mintAmount === 1000 ? "neon-glow-teal" : ""
                      }`}
                    >
                      1K VOI
                    </Button>
                    <Button
                      variant={mintAmount === 10000 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMintAmount(10000)}
                      className={`flex-1 ${
                        mintAmount === 10000 ? "neon-glow-teal" : ""
                      }`}
                    >
                      10K VOI
                    </Button>
                    <Button
                      variant={mintAmount === 100000 ? "default" : "outline"}
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
                      {electionInfo?.endorsementVotes?.toLocaleString() ||
                        electionStats?.totalVotesCast?.toLocaleString() ||
                        0}
                    </span>
                  </div>
                  {electionInfo?.endorsementCount !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Total Endorsements</span>
                      <span className="text-violet-400">
                        {electionInfo.endorsementCount.toLocaleString()}
                      </span>
                    </div>
                  )}
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
        </div>
      </div>

      {/* Selected Election Details */}
      {selectedElection && (
        <div className="container mx-auto px-6 py-8">
          <div ref={electionDetailsRef} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Election Details */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="glass-morphism-silver">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-2xl mb-2">
                          {electionInfo?.electionTitle ||
                            selectedElection.title}
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
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-teal-400" />
                        <div>
                          <div className="text-sm text-gray-400">
                            Time Remaining
                          </div>
                          <div className="font-semibold text-teal-400">
                            {countdownTime || realTimeRemaining !== "Unknown"
                              ? countdownTime || realTimeRemaining
                              : selectedElection.timeRemaining}
                          </div>
                          {isElectionInfoLoading && !countdownTime && (
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
                          <div className="text-sm text-gray-400">
                            Total Votes
                          </div>
                          <div className="font-semibold">
                            {electionInfo?.endorsementVotes
                              ? electionInfo.endorsementVotes.toLocaleString()
                              : selectedElection.totalVotes.toLocaleString()}
                          </div>
                          {isElectionInfoLoading && (
                            <div className="text-xs text-gray-500">
                              Updating...
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Star className="w-5 h-5 text-yellow-400" />
                        <div>
                          <div className="text-sm text-gray-400">
                            Endorsements
                          </div>
                          <div className="font-semibold">
                            {electionInfo?.endorsementCount !== undefined
                              ? electionInfo.endorsementCount.toLocaleString()
                              : "N/A"}
                          </div>
                          {isElectionInfoLoading && (
                            <div className="text-xs text-gray-500">
                              Updating...
                            </div>
                          )}
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
                                  {selectedCandidates.includes(
                                    candidate.id
                                  ) && (
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
                                        candidateEndorsements.get(
                                          candidate.id
                                        ) || candidate.endorsements
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
                            !activeAccount ||
                            !voterInfo ||
                            Number(voterInfo.votePower) <
                              MINIMUM_VP_FOR_ELECTIONS * 1e6
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

                      {/* VP Requirement Warning */}
                      {activeAccount &&
                        voterInfo &&
                        Number(voterInfo.votePower) <
                          MINIMUM_VP_FOR_ELECTIONS * 1e6 && (
                          <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                            <div className="flex items-center gap-2 text-red-400">
                              <XCircle className="w-4 h-4" />
                              <span className="text-sm">
                                Minimum{" "}
                                {MINIMUM_VP_FOR_ELECTIONS.toLocaleString()} VP
                                required to vote in elections. Current VP:{" "}
                                {(
                                  Number(voterInfo.votePower) / 1e6
                                ).toLocaleString()}
                              </span>
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

              {/* Leaderboard */}
              <div className="space-y-6">
                <Card className="glass-morphism-violet">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5" />
                      Leaderboard
                    </CardTitle>
                    <CardDescription>
                      Candidates ranked by {leaderboardSortBy}
                    </CardDescription>
                    <div className="flex gap-1 mt-3">
                      <Button
                        variant={
                          leaderboardSortBy === "endorsements"
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => setLeaderboardSortBy("endorsements")}
                        className={
                          leaderboardSortBy === "endorsements"
                            ? "neon-glow-violet"
                            : ""
                        }
                      >
                        Endorsements
                      </Button>
                      <Button
                        variant={
                          leaderboardSortBy === "votes" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setLeaderboardSortBy("votes")}
                        className={
                          leaderboardSortBy === "votes"
                            ? "neon-glow-violet"
                            : ""
                        }
                      >
                        Votes
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedElection.candidates
                      .map((candidate) => ({
                        ...candidate,
                        endorsementCount: Number(
                          candidateEndorsements.get(candidate.id) ||
                            candidate.endorsements
                        ),
                      }))
                      .sort((a, b) => {
                        if (leaderboardSortBy === "endorsements") {
                          return b.endorsementCount - a.endorsementCount;
                        } else {
                          return (b.votes || 0) - (a.votes || 0);
                        }
                      })
                      .slice(
                        0,
                        showAllCandidates
                          ? selectedElection.candidates.length
                          : selectedElection.positions
                      )
                      .map((candidate, index) => (
                        <div
                          key={candidate.id}
                          className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                            index === 0
                              ? "bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30"
                              : index === 1
                              ? "bg-gradient-to-r from-gray-400/20 to-gray-500/20 border border-gray-400/30"
                              : index === 2
                              ? "bg-gradient-to-r from-orange-500/20 to-orange-600/20 border border-orange-500/30"
                              : "bg-gray-800/30"
                          }`}
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-700 text-sm font-bold">
                            {index === 0
                              ? "🥇"
                              : index === 1
                              ? "🥈"
                              : index === 2
                              ? "🥉"
                              : index + 1}
                          </div>
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
                            <div className="text-xs text-gray-400">
                              {leaderboardSortBy === "endorsements"
                                ? `${candidate.endorsementCount.toLocaleString()} endorsements`
                                : `${(
                                    candidate.votes || 0
                                  ).toLocaleString()} votes`}
                            </div>
                          </div>
                          {leaderboardSortBy === "endorsements" ? (
                            <Star className="w-4 h-4 text-yellow-400" />
                          ) : (
                            <Vote className="w-4 h-4 text-blue-400" />
                          )}
                        </div>
                      ))}

                    {/* View More Button */}
                    {!showAllCandidates &&
                      selectedElection.candidates.length >
                        selectedElection.positions && (
                        <div className="pt-3 border-t border-gray-700/50">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAllCandidates(true)}
                            className="w-full neon-glow-violet"
                          >
                            View More (
                            {selectedElection.candidates.length -
                              selectedElection.positions}{" "}
                            more)
                          </Button>
                        </div>
                      )}

                    {/* View Less Button */}
                    {showAllCandidates &&
                      selectedElection.candidates.length >
                        selectedElection.positions && (
                        <div className="pt-3 border-t border-gray-700/50">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAllCandidates(false)}
                            className="w-full neon-glow-violet"
                          >
                            View Less
                          </Button>
                        </div>
                      )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
