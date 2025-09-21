import { useState, useEffect, useMemo } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ProposalDetail from "@/components/ProposalDetail";
import IdentitySheet from "@/components/IdentitySheet";
import { 
  ElectionConfig, 
  ElectionStatus
} from "@/types/elections";
import { 
  loadElections,
  getElectionStats
} from "@/utils/electionConfig";
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
  Home,
  Map,
  Vote,
  Award,
} from "lucide-react";
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
  decodeProposal,
  Proposal,
  getVoter,
  lockPower,
  castVote,
  VOTE_YES,
  VOTE_NO,
} from "@/utils/command";
import { toast } from "@/components/ui/use-toast";

// Proposal status mapping
const PROPOSAL_STATUS = {
  0: "pending",
  1: "active",
  2: "canceled",
  3: "defeated",
  4: "succeeded",
  5: "queued",
  6: "expired",
  7: "executed",
} as const;

// Proposal categories
const PROPOSAL_CATEGORIES = {
  0: "General",
  1: "Treasury",
  2: "Protocol Parameters",
  3: "Security",
  4: "Community",
  5: "Technical",
} as const;

// UI-friendly proposal interface
interface UIProposal {
  id: string;
  title: string;
  description: string;
  status: string;
  category: string;
  author: string;
  createdAt: string;
  totalVotes: number;
  yesVotes: number;
  noVotes: number;
  votingEnds?: string;
  currentPower?: number;
  requiredPower?: number;
  timeToActivate?: string;
  isExpired?: boolean;
  network?: NetworkId;
  networkName?: string;
}

// Global state interface
export interface GlobalState {
  proposalCount?: { asNumber(): number };
  activeProposalCount?: { asNumber(): number };
  totalVoterCount?: { asNumber(): number };
  totalParticipatingVoters?: { asNumber(): number };
}

// Voter info interface (matching PowerUp)
interface VoterInfo {
  voterAddress: string;
  votePower: bigint;
  voteTimestamp: bigint;
  proposalsParticipated: bigint;
  lastParticipationTimestamp: bigint;
  lastProposalNode: string;
}

// Helper function to convert contract proposal to UI format
const convertProposalToUI = (
  proposal: Proposal,
  aggregatedGlobalState?: GlobalState
): UIProposal => {
  const status =
    PROPOSAL_STATUS[
      Number(proposal.proposalStatus) as keyof typeof PROPOSAL_STATUS
    ] || "unknown";
  const category =
    PROPOSAL_CATEGORIES[
      Number(proposal.proposalCategoryId) as keyof typeof PROPOSAL_CATEGORIES
    ] || "General";

  // Contract timestamps are in UTC seconds, convert to milliseconds and create ISO string
  const createdAt = new Date(
    Number(proposal.createdAtTimestamp) * 1000
  ).toISOString();
  const votingEnds = proposal.votingEndTimestamp
    ? new Date(Number(proposal.votingEndTimestamp) * 1000).toISOString()
    : undefined;

  const totalVotes = Number(proposal.proposalTotalVotes);
  const yesVotes = Number(proposal.proposalYesVotes);
  const noVotes = totalVotes - yesVotes;

  const currentPower = Number(proposal.proposalTotalPower);
  // Use aggregated global state for required power calculation if available
  const requiredPower = aggregatedGlobalState?.totalVoterCount
    ? aggregatedGlobalState.totalVoterCount.asNumber()
    : Number(proposal.proposalActivationPower);

  // Calculate if proposal is expired (pending proposals that didn't reach activation power)
  const isExpired =
    status === "pending" &&
    Number(proposal.votingStartTimestamp) > 0 &&
    Date.now() > Number(proposal.votingStartTimestamp) * 1000;

  // Calculate time to activate for pending proposals
  let timeToActivate: string | undefined;
  if (status === "pending" && !isExpired) {
    const activationDeadline = Number(proposal.votingStartTimestamp) * 1000;
    const timeLeft = activationDeadline - Date.now();
    if (timeLeft > 0) {
      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      timeToActivate = `${days} days ${hours} hours`;
    } else {
      timeToActivate = "Expired";
    }
  }

  // Convert base64 to hex without using Buffer
  const base64ToHex = (base64: string) => {
    const binaryString = atob(base64);
    let hex = "";
    for (let i = 0; i < binaryString.length; i++) {
      const hexChar = binaryString.charCodeAt(i).toString(16).padStart(2, "0");
      hex += hexChar;
    }
    return hex;
  };

  return {
    id: base64ToHex(proposal.proposalNode),
    title: proposal.proposalTitle,
    description: proposal.proposalDescription,
    status,
    category,
    author: proposal.proposer,
    createdAt,
    totalVotes,
    yesVotes,
    noVotes,
    votingEnds,
    currentPower,
    requiredPower,
    timeToActivate,
    isExpired,
  };
};

interface ProposalCreatedEvent {
  txid: string;
  round: number;
  timestamp: number;
  proposalNode: string;
}

const makeABI = (spec: { contract: { methods: unknown } }) => {
  return {
    name: "",
    description: "",
    methods: spec.contract.methods,
    events: [
      // ProposalCreated(byte[32])
      {
        name: "ProposalCreated",
        args: [
          {
            name: "proposal_node",
            type: "byte[32]",
          },
        ],
      },
    ],
  };
};

// Mock data
const mockProposals = [
  {
    id: 1,
    title: "Increase VOI Block Rewards by 15%",
    description:
      "Proposal to increase block rewards from 10 VOI to 11.5 VOI per block to incentivize more validators.",
    status: "Open" as const,
    timeRemaining: "2d 14h 32m",
    votesFor: 1250000,
    votesAgainst: 890000,
    votesAbstain: 150000,
    chains: ["VOI", "ALGO", "EVM"],
    enfsRef: "enfs://proposal/voi-block-rewards-2024",
  },
  {
    id: 2,
    title: "Implement Cross-Chain Governance Bridge",
    description:
      "Enable seamless governance participation across VOI, Algorand, and EVM chains.",
    status: "Passed" as const,
    timeRemaining: "Ended",
    votesFor: 2100000,
    votesAgainst: 450000,
    votesAbstain: 200000,
    chains: ["VOI", "ALGO", "EVM", "COSMOS"],
    enfsRef: "enfs://proposal/cross-chain-bridge-2024",
  },
  {
    id: 3,
    title: "Reduce Transaction Fees by 25%",
    description:
      "Lower transaction fees to improve accessibility and adoption of the VOI network.",
    status: "Closed" as const,
    timeRemaining: "Ended",
    votesFor: 1800000,
    votesAgainst: 1200000,
    votesAbstain: 300000,
    chains: ["VOI"],
    enfsRef: "enfs://proposal/fee-reduction-2024",
  },
];

const mockDelegates = [
  {
    name: "atlas.voi",
    bio: "Long-time VOI contributor and validator. Focused on network security and scalability.",
    reliability: 98,
    assignedVP: 0,
    avatar: "/api/placeholder/40/40",
  },
  {
    name: "cosmos.voi",
    bio: "Cross-chain specialist with expertise in interoperability protocols.",
    reliability: 95,
    assignedVP: 0,
    avatar: "/api/placeholder/40/40",
  },
  {
    name: "founder.voi",
    bio: "Core protocol developer and governance advocate.",
    reliability: 99,
    assignedVP: 0,
    avatar: "/api/placeholder/40/40",
  },
];

const mockGuilds = [
  {
    name: "founder.voi",
    type: "Core Development",
    members: 45,
    activeProposals: 3,
    description: "Core protocol development and maintenance",
  },
  {
    name: "dao.voi",
    type: "Governance",
    members: 128,
    activeProposals: 7,
    description: "Decentralized governance and community management",
  },
];

// Elections will be loaded from configuration

export default function Voting() {
  const navigate = useNavigate();
  const {
    activeWallet,
    activeAccount,
    activeNetwork,
    algodClient,
    signTransactions,
  } = useWallet();

  // Election state management
  const [elections, setElections] = useState<ElectionConfig[]>([]);
  const [electionStats, setElectionStats] = useState<any>(null);
  const [electionsLoading, setElectionsLoading] = useState(true);

  // Load elections configuration
  useEffect(() => {
    const loadElectionData = async () => {
      try {
        const [electionsData, stats] = await Promise.all([
          loadElections(),
          getElectionStats()
        ]);
        
        setElections(electionsData.elections);
        setElectionStats(stats);
      } catch (err) {
        console.error('Error loading election data:', err);
      } finally {
        setElectionsLoading(false);
      }
    };

    loadElectionData();
  }, []);

  const [selectedProposal, setSelectedProposal] = useState<UIProposal | null>(
    null
  );
  const [showProposalDetail, setShowProposalDetail] = useState(false);
  const [showIdentitySheet, setShowIdentitySheet] = useState(false);
  const [lockAmount, setLockAmount] = useState([1000]);
  const [lockDuration, setLockDuration] = useState("4w");

  // Onchain data states
  const [proposals, setProposals] = useState<UIProposal[]>([]);
  const [isLoadingProposals, setIsLoadingProposals] = useState(false);
  const [isLoadingVoterData, setIsLoadingVoterData] = useState(false);
  const [globalState, setGlobalState] = useState<GlobalState | null>(null);
  const [voterInfo, setVoterInfo] = useState<VoterInfo | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, "yes" | "no">>({});

  // Mint tokens state
  const [mintAmount, setMintAmount] = useState(10000);
  const [isMinting, setIsMinting] = useState(false);
  const [userBalance, setUserBalance] = useState(1000);

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

  // Function to fetch user votes for all proposals
  const fetchUserVotes = async () => {
    if (!activeAccount || !activeNetwork) {
      return;
    }

    try {
      const ci = new CONTRACT(
        getGovernanceAppId(activeNetwork),
        algod,
        indexer,
        makeABI(PowGovernanceAppSpec),
        { addr: activeAccount.address, sk: new Uint8Array() }
      );

      const userVotesMap: Record<string, "yes" | "no"> = {};

      // Fetch votes for all proposals
      for (const proposal of proposals) {
        try {
          // Convert hex string to Uint8Array without using Buffer
          const hexString = proposal.id;
          const bytes = new Uint8Array(hexString.length / 2);
          for (let i = 0; i < hexString.length; i += 2) {
            bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
          }

          const getVoteR = await ci.get_vote(bytes, activeAccount.address);

          if (getVoteR.success && getVoteR.returnValue !== undefined) {
            const voteValue = Number(getVoteR.returnValue);
            if (voteValue === 0) {
              userVotesMap[proposal.id] = "no";
            } else if (voteValue === 1) {
              userVotesMap[proposal.id] = "yes";
            }
          }
        } catch (error) {
          console.error(
            `Error fetching vote for proposal ${proposal.id}:`,
            error
          );
        }
      }

      setUserVotes(userVotesMap);
    } catch (error) {
      console.error("Error fetching user votes:", error);
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
  }, [selectedProposal]);

  useEffect(() => {
    const fetchProposals = async () => {
      console.log("=== VOTING PAGE DEBUG ===");
      console.log("fetchProposals called with:", {
        activeNetwork,
        algod: !!algod,
      });
      console.log("activeWallet:", activeWallet);
      console.log("activeAccount:", activeAccount);

      if (!activeNetwork || !algod) {
        console.log("Missing activeNetwork or algod, skipping fetch");
        return;
      }

      setIsLoadingProposals(true);

      try {
        let allProposals: UIProposal[] = [];
        let aggregatedGlobalState: GlobalState = {
          proposalCount: { asNumber: () => 0 },
          activeProposalCount: { asNumber: () => 0 },
          totalVoterCount: { asNumber: () => 0 },
          totalParticipatingVoters: { asNumber: () => 0 },
        };

        let totalProposals = 0;
        let totalActiveProposals = 0;
        let totalVoters = 0;
        let totalParticipatingVoters = 0;

        // Create algod client for this network
        let networkAlgod;
        if (activeNetwork === NetworkId.LOCALNET) {
          networkAlgod = new algosdk.Algodv2(
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "http://10.0.0.31",
            4001
          );
          console.log("Using LOCALNET algod client");
        } else if (activeNetwork === NetworkId.TESTNET) {
          networkAlgod = new algosdk.Algodv2(
            "",
            "https://testnet-api.4160.nodely.dev",
            443
          );
          console.log("Using TESTNET algod client");
        } else {
          // Skip networks without governance contracts
          console.log(
            `Skipping network ${activeNetwork} - no governance contract configured`
          );
          setIsLoadingProposals(false);
          return;
        }

        // Create indexer for this network
        let networkIndexer;
        if (activeNetwork === NetworkId.LOCALNET) {
          networkIndexer = new algosdk.Indexer(
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "http://10.0.0.31",
            8980
          );
          console.log("Using LOCALNET indexer");
        } else if (activeNetwork === NetworkId.TESTNET) {
          networkIndexer = new algosdk.Indexer(
            "",
            "https://testnet-idx.4160.nodely.dev",
            443
          );
          console.log("Using TESTNET indexer");
        }

        const governanceAppId = getGovernanceAppId(activeNetwork);
        console.log(
          `Governance App ID for ${activeNetwork}: ${governanceAppId}`
        );

        if (governanceAppId === 0) {
          console.log(
            `Skipping network ${activeNetwork} - no governance app ID`
          );
          setIsLoadingProposals(false);
          return;
        }

        // Test network connectivity
        try {
          const status = await networkAlgod.status().do();
          console.log("Network status:", status);
        } catch (error) {
          console.error("Network connectivity test failed:", error);
        }

        const client = new PowGovernanceClient(
          {
            id: governanceAppId,
            resolveBy: "id",
            sender: {
              addr: algosdk.getApplicationAddress(governanceAppId),
              signer: algosdk.makeEmptyTransactionSigner(),
            },
          },
          networkAlgod
        );

        let state;
        try {
          state = await client.getGlobalState();
          console.log("Global state fetched:", state);
        } catch (error) {
          console.error("Error fetching global state:", error);
          // Continue without global state
          state = {};
        }

        // Aggregate global state
        console.log("Global state properties:", {
          proposalCount: state.proposalCount?.asNumber(),
          activeProposalCount: state.activeProposalCount?.asNumber(),
          totalVoterCount: state.totalVoterCount?.asNumber(),
          totalParticipatingVoters: state.totalParticipatingVoters?.asNumber(),
        });

        if (state.proposalCount) {
          totalProposals += Number(state.proposalCount.asNumber());
        }
        if (state.activeProposalCount) {
          totalActiveProposals += Number(state.activeProposalCount.asNumber());
        }
        if (state.totalVoterCount) {
          totalVoters += Number(state.totalVoterCount.asNumber());
        }
        if (state.totalParticipatingVoters) {
          totalParticipatingVoters += Number(
            state.totalParticipatingVoters.asNumber()
          );
        }

        aggregatedGlobalState = {
          proposalCount: { asNumber: () => totalProposals },
          activeProposalCount: { asNumber: () => totalActiveProposals },
          totalVoterCount: { asNumber: () => totalVoters },
          totalParticipatingVoters: {
            asNumber: () => totalParticipatingVoters,
          },
        };
        setGlobalState(aggregatedGlobalState);

        const ci = new CONTRACT(
          governanceAppId,
          networkAlgod,
          networkIndexer,
          makeABI(PowGovernanceAppSpec),
          {
            addr: algosdk.getApplicationAddress(governanceAppId),
            sk: new Uint8Array(),
          }
        );

        console.log(
          `Fetching proposals from ${activeNetwork} with app ID ${governanceAppId}`
        );
        let evts;
        try {
          evts = await ci.getEvents({});
          console.log("Raw events from contract:", evts);
        } catch (error) {
          console.error("Error fetching events from contract:", error);
          evts = [];
        }

        const proposalCreatedEvts: ProposalCreatedEvent[] = (
          evts?.find((evt: { name: string }) => evt.name === "ProposalCreated")
            ?.events || []
        )?.map((evt: unknown[]) => ({
          txid: evt[0],
          round: evt[1],
          timestamp: evt[2],
          proposalNode: evt[3],
        }));

        console.log(
          `Found ${proposalCreatedEvts.length} ProposalCreated events`
        );

        let rawProposals = [];
        try {
          rawProposals = (
            await Promise.all(
              proposalCreatedEvts.map(async (evt) => {
                // Convert hex string to Uint8Array without using Buffer
                const hexString = evt.proposalNode;
                const bytes = new Uint8Array(hexString.length / 2);
                for (let i = 0; i < hexString.length; i += 2) {
                  bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
                }
                return ci.get_proposal(bytes);
              })
            )
          ).map((result: { returnValue: unknown }) =>
            decodeProposal(result.returnValue)
          );
        } catch (error) {
          console.error("Error fetching individual proposals:", error);
          rawProposals = [];
        }

        console.log(
          `Found ${rawProposals.length} proposals from ${activeNetwork}`
        );

        if (rawProposals.length === 0) {
          console.log("No raw proposals found, this might be the issue");
        }

        // Convert to UI format and add network identifier
        const networkProposals = rawProposals.map((proposal) => {
          const uiProposal = convertProposalToUI(
            proposal,
            aggregatedGlobalState
          );
          return {
            ...uiProposal,
            network: activeNetwork,
            networkName:
              activeNetwork === NetworkId.LOCALNET
                ? "Localnet"
                : activeNetwork === NetworkId.TESTNET
                ? "Algorand Testnet"
                : activeNetwork === NetworkId.MAINNET
                ? "Algorand Mainnet"
                : activeNetwork === NetworkId.VOIMAIN
                ? "Voi Mainnet"
                : "Unknown",
          };
        });

        allProposals = [...allProposals, ...networkProposals];

        console.log(`Total proposals found: ${allProposals.length}`);

        // Remove duplicate proposals by ID and sort by creation date (most recent first)
        const uniqueProposals = allProposals.reduce((acc, proposal) => {
          if (!acc.find((p) => p.id === proposal.id)) {
            acc.push(proposal);
          }
          return acc;
        }, [] as UIProposal[]);

        // Sort by creation date (most recent first)
        uniqueProposals.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        console.log(
          `Unique proposals after deduplication: ${uniqueProposals.length}`
        );

        // If no proposals found, use mock data as fallback
        if (uniqueProposals.length === 0) {
          console.log(
            "No proposals found onchain, using mock data as fallback"
          );
          const mockUIProposals: UIProposal[] = mockProposals.map(
            (proposal) => ({
              id: proposal.id.toString(),
              title: proposal.title,
              description: proposal.description,
              status: proposal.status.toLowerCase(),
              category: "General",
              author: "Unknown",
              createdAt: new Date().toISOString(),
              totalVotes:
                proposal.votesFor +
                proposal.votesAgainst +
                proposal.votesAbstain,
              yesVotes: proposal.votesFor,
              noVotes: proposal.votesAgainst,
              votingEnds:
                proposal.timeRemaining === "Ended"
                  ? undefined
                  : new Date(
                      Date.now() + 7 * 24 * 60 * 60 * 1000
                    ).toISOString(),
              network: activeNetwork,
              networkName:
                activeNetwork === NetworkId.LOCALNET
                  ? "Localnet"
                  : activeNetwork === NetworkId.TESTNET
                  ? "Algorand Testnet"
                  : activeNetwork === NetworkId.MAINNET
                  ? "Algorand Mainnet"
                  : activeNetwork === NetworkId.VOIMAIN
                  ? "Voi Mainnet"
                  : "Unknown",
            })
          );
          setProposals(mockUIProposals);
          if (mockUIProposals.length > 0 && !selectedProposal) {
            setSelectedProposal(mockUIProposals[0]);
          }
        } else {
          setProposals(uniqueProposals);
          // Set the first proposal as selected if none is selected
          if (uniqueProposals.length > 0 && !selectedProposal) {
            setSelectedProposal(uniqueProposals[0]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch proposals", err);
        console.log("Using mock data as fallback due to error");
        const mockUIProposals: UIProposal[] = mockProposals.map((proposal) => ({
          id: proposal.id.toString(),
          title: proposal.title,
          description: proposal.description,
          status: proposal.status.toLowerCase(),
          category: "General",
          author: "Unknown",
          createdAt: new Date().toISOString(),
          totalVotes:
            proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain,
          yesVotes: proposal.votesFor,
          noVotes: proposal.votesAgainst,
          votingEnds:
            proposal.timeRemaining === "Ended"
              ? undefined
              : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          network: activeNetwork,
          networkName:
            activeNetwork === NetworkId.LOCALNET
              ? "Localnet"
              : activeNetwork === NetworkId.TESTNET
              ? "Algorand Testnet"
              : activeNetwork === NetworkId.MAINNET
              ? "Algorand Mainnet"
              : activeNetwork === NetworkId.VOIMAIN
              ? "Voi Mainnet"
              : "Unknown",
        }));
        setProposals(mockUIProposals);
        if (mockUIProposals.length > 0 && !selectedProposal) {
          setSelectedProposal(mockUIProposals[0]);
        }
        setGlobalState(null);
      } finally {
        setIsLoadingProposals(false);
      }
    };

    fetchProposals();
    console.log("=== END VOTING PAGE DEBUG ===");
  }, [activeNetwork, algod, indexer]);

  // Fetch user votes when proposals are loaded and user is connected
  useEffect(() => {
    if (proposals.length > 0 && activeAccount) {
      fetchUserVotes();
    }
  }, [proposals, activeAccount]);

  // Handle cast vote function (following mint/lock pattern)
  const handleCastVote = async (vote: "yes" | "no") => {
    if (!activeAccount || !activeNetwork || !selectedProposal) {
      toast({
        title: "Error",
        description: "Please connect your wallet and select a proposal",
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

      // Convert hex string to base64 for the proposal node
      const hexString = selectedProposal.id;
      const bytes = new Uint8Array(hexString.length / 2);
      for (let i = 0; i < hexString.length; i += 2) {
        bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
      }

      // Convert Uint8Array to base64
      const proposalNode = btoa(String.fromCharCode(...bytes));

      const appId = getGovernanceAppId(activeNetwork);
      const castVoteParams = {
        appId: appId,
        proposalNode: proposalNode,
        support: vote === "yes" ? VOTE_YES : VOTE_NO,
        addr: activeAccount.address,
        sk: new Uint8Array(),
        debug: true,
      };

      const ci = new CONTRACT(
        appId,
        algod,
        undefined,
        { ...PowGovernanceAppSpec.contract, events: [] },
        { addr: activeAccount.address, sk: new Uint8Array() }
      );

        const castVoteR = await ci.cast_vote(
          new Uint8Array(atob(proposalNode).split("").map((char) => char.charCodeAt(0))),
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
          selectedProposal.title
        }"`
      );

      // Update local user votes state
      setUserVotes((prev) => ({
        ...prev,
        [selectedProposal.id]: vote,
      }));

      // Refresh voter data
      await fetchVoterData();

      toast({
        title: "Success",
        description: `Successfully voted ${
          vote === "yes" ? "For" : "Against"
        } on "${selectedProposal.title}"`,
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-teal-500/20 text-teal-400 border-teal-500/30";
      case "Passed":
        return "bg-violet-500/20 text-violet-400 border-violet-500/30";
      case "Closed":
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
      case "Localnet":
        return "bg-teal-500/20 text-teal-400 border-teal-500/30";
      case "Algorand Testnet":
        return "bg-violet-500/20 text-violet-400 border-violet-500/30";
      case "Algorand Mainnet":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      case "Voi Mainnet":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  // Convert UIProposal to ProposalDetail format
  const convertToProposalDetailFormat = (proposal: UIProposal) => {
    return {
      id: parseInt(proposal.id.slice(0, 8), 16), // Convert hex to number
      title: proposal.title,
      description: proposal.description,
      status:
        proposal.status === "active"
          ? ("Open" as const)
          : proposal.status === "succeeded"
          ? ("Passed" as const)
          : ("Closed" as const),
      timeRemaining: proposal.votingEnds
        ? new Date(proposal.votingEnds).toLocaleDateString()
        : proposal.timeToActivate || "N/A",
      votesFor: proposal.yesVotes,
      votesAgainst: proposal.noVotes,
      votesAbstain: 0, // Not tracked in onchain data
      chains: proposal.networkName ? [proposal.networkName] : [],
      enfsRef: `enfs://proposal/${proposal.id}`,
      fullDescription: proposal.description,
      proposer: proposal.author,
      createdAt: proposal.createdAt,
      votingEnds: proposal.votingEnds,
    };
  };

  console.log({
    activeAccount,
    activeWallet,
    activeNetwork,
  });

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
                onClick={() => navigate("/roadmap")}
                className="hidden md:flex text-gray-400 hover:text-white"
              >
                <Map className="w-4 h-4 mr-2" />
                Roadmap
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
              <Button
                variant="outline"
                className="glass-morphism-violet neon-glow-violet"
                onClick={() => setShowIdentitySheet(true)}
              >
                <Wallet className="w-4 h-4 mr-2" />
                Identity
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="border-b border-gray-800/50 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gradient-primary mb-2">
              enChain Voting ✦ One voice, many chains.
            </h1>
            <p className="text-gray-400 text-lg">
              Stake-to-Vote governance across multiple chains
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="proposals" className="w-full">
          <TabsList className="glass-morphism mb-8">
            <TabsTrigger
              value="proposals"
              className="data-[state=active]:neon-glow-teal"
            >
              <Globe className="w-4 h-4 mr-2" />
              Proposals
            </TabsTrigger>
            <TabsTrigger
              value="elections"
              className="data-[state=active]:neon-glow-violet"
            >
              <Vote className="w-4 h-4 mr-2" />
              Elections
            </TabsTrigger>
            <TabsTrigger
              value="delegates"
              className="data-[state=active]:neon-glow-violet"
            >
              <Users className="w-4 h-4 mr-2" />
              Delegates
            </TabsTrigger>
            <TabsTrigger
              value="guilds"
              className="data-[state=active]:neon-glow-silver"
            >
              <Star className="w-4 h-4 mr-2" />
              Guilds
            </TabsTrigger>
            <TabsTrigger
              value="vaults"
              className="data-[state=active]:neon-glow-teal"
            >
              <Shield className="w-4 h-4 mr-2" />
              Vaults
            </TabsTrigger>
          </TabsList>

          {/* Proposals Tab */}
          <TabsContent value="proposals" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Proposal Cards */}
              <div className="lg:col-span-2 space-y-4">
                {isLoadingProposals ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-gray-400">Loading proposals...</div>
                  </div>
                ) : proposals.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-gray-400">No proposals found</div>
                  </div>
                ) : (
                  proposals.map((proposal) => (
                    <Card
                      key={proposal.id}
                      className="glass-morphism hover:neon-glow-teal transition-all duration-300 cursor-pointer"
                      onClick={() => {
                        setSelectedProposal(proposal);
                        setShowProposalDetail(true);
                      }}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-xl mb-2">
                              {proposal.title}
                            </CardTitle>
                            <CardDescription className="text-gray-300 mb-4">
                              {proposal.description}
                            </CardDescription>
                          </div>
                          <Badge className={getStatusColor(proposal.status)}>
                            {proposal.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {proposal.votingEnds
                              ? new Date(
                                  proposal.votingEnds
                                ).toLocaleDateString()
                              : proposal.timeToActivate || "N/A"}
                          </div>
                          <div className="flex gap-2">
                            {proposal.networkName && (
                              <Badge
                                variant="outline"
                                className={getChainChipColor(
                                  proposal.networkName
                                )}
                              >
                                {proposal.networkName}
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className="bg-blue-500/20 text-blue-400 border-blue-500/30"
                            >
                              {proposal.category}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-green-400">
                              For: {proposal.yesVotes.toLocaleString()}
                            </span>
                            <span className="text-red-400">
                              Against: {proposal.noVotes.toLocaleString()}
                            </span>
                            <span className="text-gray-400">
                              Total: {proposal.totalVotes.toLocaleString()}
                            </span>
                          </div>
                          {proposal.totalVotes > 0 && (
                            <Progress
                              value={
                                (proposal.yesVotes / proposal.totalVotes) * 100
                              }
                              className="h-2"
                            />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Voting Power Panel */}
              <div className="space-y-6">
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

                      <div className="flex gap-2">
                        <Button
                          className="flex-1 neon-glow-teal"
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
                        <Button variant="outline" className="neon-glow-violet">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
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
                {selectedProposal && selectedProposal.status === "active" && (
                  <Card className="glass-morphism-silver">
                    <CardHeader>
                      <CardTitle className="text-lg">Cast Vote</CardTitle>
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

                      {userVotes[selectedProposal.id] ? (
                        <div className="text-center py-4">
                          <div
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                              userVotes[selectedProposal.id] === "yes"
                                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                : "bg-red-500/20 text-red-400 border border-red-500/30"
                            }`}
                          >
                            {userVotes[selectedProposal.id] === "yes" ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            You voted{" "}
                            {userVotes[selectedProposal.id] === "yes"
                              ? "For"
                              : "Against"}
                          </div>
                        </div>
                      ) : (
                        <>
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
                                For
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
                                Against
                              </>
                            )}
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Activity Feed */}
                <Card className="glass-morphism">
                  <CardHeader>
                    <CardTitle className="text-lg">Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>AT</AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="text-teal-400">atlas.voi</span>{" "}
                        increased lock by 1,200
                        <div className="text-gray-400 text-xs">3m ago</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>CO</AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="text-violet-400">cosmos.voi</span>{" "}
                        voted FOR on proposal #2
                        <div className="text-gray-400 text-xs">1h ago</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Elections Tab */}
          <TabsContent value="elections" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Election Cards */}
              <div className="lg:col-span-2 space-y-4">
                {electionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
                    <span className="ml-2 text-gray-400">Loading elections...</span>
                  </div>
                ) : elections.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No elections available</p>
                  </div>
                ) : (
                  elections.map((election) => (
                  <Card
                    key={election.id}
                    className="glass-morphism hover:neon-glow-violet transition-all duration-300 cursor-pointer"
                    onClick={() => navigate("/election-demo")}
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
                          {election.timeRemaining}
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
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">
                            Candidates: {election.candidates.length}
                          </span>
                          <span className="text-gray-400">
                            Total Votes: {election.totalVotes.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <Button className="neon-glow-violet">
                            <Vote className="w-4 h-4 mr-2" />
                            View Election
                          </Button>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  ))
                )}
              </div>

              {/* Election Info Panel */}
              <div className="space-y-6">
                <Card className="glass-morphism-violet neon-glow-violet">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5" />
                      Election Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Active Elections</span>
                        <span className="text-teal-400">1</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">
                          Upcoming Elections
                        </span>
                        <span className="text-violet-400">1</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Total Candidates</span>
                        <span className="text-white">13</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Your Votes Cast</span>
                        <span className="text-white">3</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-morphism-silver">
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full neon-glow-violet">
                      <Vote className="w-4 h-4 mr-2" />
                      Vote in Active Election
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Award className="w-4 h-4 mr-2" />
                      View Results
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Users className="w-4 h-4 mr-2" />
                      Candidate Profiles
                    </Button>
                  </CardContent>
                </Card>

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
                        <span className="text-teal-400">atlas.voi</span>{" "}
                        received 45 new endorsements
                        <div className="text-gray-400 text-xs">2h ago</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>FO</AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="text-violet-400">founder.voi</span>{" "}
                        gained 1,200 votes
                        <div className="text-gray-400 text-xs">4h ago</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Delegates Tab */}
          <TabsContent value="delegates" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockDelegates.map((delegate) => (
                <Card
                  key={delegate.name}
                  className="glass-morphism hover:neon-glow-violet transition-all duration-300"
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback>
                          {delegate.name
                            .split(".")[0]
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">
                          {delegate.name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-green-400 border-green-400/30"
                          >
                            {delegate.reliability}% reliable
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-300 text-sm">{delegate.bio}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">
                        Assigned VP: {delegate.assignedVP.toLocaleString()}
                      </span>
                      <Button size="sm" className="neon-glow-violet">
                        Assign
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Guilds Tab */}
          <TabsContent value="guilds" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mockGuilds.map((guild) => (
                <Card
                  key={guild.name}
                  className="glass-morphism hover:neon-glow-silver transition-all duration-300"
                >
                  <CardHeader>
                    <CardTitle className="text-xl">{guild.name}</CardTitle>
                    <CardDescription className="text-gray-300">
                      {guild.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">
                        Members: {guild.members}
                      </span>
                      <span className="text-gray-400">
                        Active Proposals: {guild.activeProposals}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1 neon-glow-silver">Join</Button>
                      <Button variant="outline">View</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Vaults Tab */}
          <TabsContent value="vaults" className="space-y-6">
            <div className="space-y-4">
              {mockProposals
                .filter((p) => p.status !== "Open")
                .map((proposal) => (
                  <Card key={proposal.id} className="glass-morphism">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl mb-2">
                            {proposal.title}
                          </CardTitle>
                          <CardDescription className="text-gray-300 mb-4">
                            {proposal.description}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(proposal.status)}>
                          {proposal.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-green-400">
                            For: {proposal.votesFor.toLocaleString()}
                          </span>
                          <span className="text-red-400">
                            Against: {proposal.votesAgainst.toLocaleString()}
                          </span>
                          <span className="text-gray-400">
                            Abstain: {proposal.votesAbstain.toLocaleString()}
                          </span>
                        </div>
                        <Progress
                          value={
                            (proposal.votesFor /
                              (proposal.votesFor +
                                proposal.votesAgainst +
                                proposal.votesAbstain)) *
                            100
                          }
                          className="h-3"
                        />
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <LinkIcon className="w-4 h-4" />
                          <span>{proposal.enfsRef}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Proposal Detail Modal */}
      {showProposalDetail && selectedProposal && (
        <ProposalDetail
          proposal={convertToProposalDetailFormat(selectedProposal)}
          onBack={() => setShowProposalDetail(false)}
        />
      )}

      {/* Identity Sheet */}
      <IdentitySheet
        isOpen={showIdentitySheet}
        onOpenChange={setShowIdentitySheet}
      />
    </div>
  );
}
