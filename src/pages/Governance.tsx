import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Users,
  Vote,
  TrendingUp,
  Clock,
  CheckCircle,
  BookOpen,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Search,
  Filter,
  Zap,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useWallet, NetworkId } from "@txnlab/use-wallet-react";
import { useState, useRef, useMemo, useEffect } from "react";
import WalletConnectModal from "@/components/WalletConnectModal";
import {
  PowGovernanceClient,
  APP_SPEC as PowGovernanceAppSpec,
} from "@/clients/PowGovernanceClient";
import algosdk from "algosdk";
import { CONTRACT } from "ulujs";
import { getGovernanceAppId } from "@/constants/appIds";
import { decodeProposal, Proposal } from "@/utils/command";
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
  0: "Govna Stuff (Governance)",
  1: "Treasury Shenanigans",
  2: "Number Go Up (Tokenomics)",
  3: "Science or Scam? (Experimental)",
  4: "Pacts with Other Degens (Partnerships)",
  5: "Protocol Wizardry",
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

  return {
    id: Buffer.from(proposal.proposalNode, "base64").toString("hex"),
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

// Mock data - replace with actual data from your governance contract
const mockStats = {
  totalProposals: 24,
  activeProposals: 3,
  totalVoters: 156,
  participationRate: 78,
};

// Mock data for different proposal states - shared with ProposalDetail
const mockProposals = {
  "1": {
    id: "1",
    title: "Increase Treasury Allocation for Development",
    description:
      "Proposal to increase the treasury allocation from 10% to 15% to fund additional development initiatives and community projects.",
    status: "active",
    category: "Treasury Shenanigans",
    author: "0x1234...5678",
    createdAt: "2024-01-15",
    totalVotes: 45,
    yesVotes: 32,
    noVotes: 13,
    votingEnds: "2024-01-23",
  },
  "2": {
    id: "2",
    title: "Update Governance Parameters",
    description:
      "Adjust voting period from 7 days to 5 days and quorum threshold from 1000 to 800 tokens.",
    status: "succeeded",
    category: "Govna Stuff (Governance)",
    author: "0x8765...4321",
    createdAt: "2024-01-10",
    totalVotes: 89,
    yesVotes: 67,
    noVotes: 22,
    votingEnds: "2024-01-17",
  },
  "3": {
    id: "3",
    title: "Add New Validator Node",
    description:
      "Proposal to onboard a new validator node to improve network decentralization and performance.",
    status: "pending",
    category: "Protocol Wizardry",
    author: "0x9876...5432",
    createdAt: "2024-01-12",
    totalVotes: 0,
    yesVotes: 0,
    noVotes: 0,
    currentPower: 1800,
    requiredPower: 1500,
    timeToActivate: "2 days 14 hours",
  },
  "4": {
    id: "4",
    title: "Community Grant Program Expansion",
    description:
      "Expand the community grant program to support more developer initiatives and educational content creation.",
    status: "defeated",
    category: "Pacts with Other Degens (Partnerships)",
    author: "0x5432...8765",
    createdAt: "2024-01-05",
    totalVotes: 67,
    yesVotes: 25,
    noVotes: 42,
    votingEnds: "2024-01-13",
  },
  "5": {
    id: "5",
    title: "Implement Cross-Chain Bridge",
    description:
      "Proposal to implement a cross-chain bridge to enable interoperability with other blockchain networks.",
    status: "active",
    category: "Protocol Wizardry",
    author: "0x1111...2222",
    createdAt: "2024-01-18",
    totalVotes: 23,
    yesVotes: 18,
    noVotes: 5,
    votingEnds: "2024-01-25",
  },
  "6": {
    id: "6",
    title: "Security Audit Funding",
    description:
      "Allocate funds for comprehensive security audits of smart contracts and infrastructure.",
    status: "pending",
    category: "Science or Scam? (Experimental)",
    author: "0x3333...4444",
    createdAt: "2024-01-20",
    totalVotes: 0,
    yesVotes: 0,
    noVotes: 0,
    currentPower: 1200,
    requiredPower: 1000,
    timeToActivate: "4 days 8 hours",
  },
  "7": {
    id: "7",
    title: "Fee Reduction Implementation",
    description:
      "Reduce transaction fees by 20% to improve user experience and increase adoption.",
    status: "executed",
    category: "Number Go Up (Tokenomics)",
    author: "0x4444...5555",
    createdAt: "2024-01-08",
    totalVotes: 123,
    yesVotes: 98,
    noVotes: 25,
    votingEnds: "2024-01-16",
  },
  "8": {
    id: "8",
    title: "DAO Treasury Diversification",
    description:
      "Diversify the DAO treasury holdings to reduce risk and improve yield.",
    status: "canceled",
    category: "Treasury Shenanigans",
    author: "0x5555...6666",
    createdAt: "2024-01-22",
    totalVotes: 0,
    yesVotes: 0,
    noVotes: 0,
  },
  "9": {
    id: "9",
    title: "Developer Documentation Portal",
    description:
      "Create a comprehensive developer documentation portal to improve developer experience.",
    status: "expired",
    category: "Pacts with Other Degens (Partnerships)",
    author: "0x6666...7777",
    createdAt: "2024-01-25",
    totalVotes: 0,
    yesVotes: 0,
    noVotes: 0,
    currentPower: 450,
    requiredPower: 1000,
    timeToActivate: "Expired",
    isExpired: true,
  },
  "10": {
    id: "10",
    title: "Governance Token Distribution",
    description:
      "Implement a new governance token distribution mechanism to improve decentralization.",
    status: "queued",
    category: "Govna Stuff (Governance)",
    author: "0x7777...8888",
    createdAt: "2024-01-28",
    totalVotes: 156,
    yesVotes: 134,
    noVotes: 22,
    votingEnds: "2024-02-05",
  },
};

const mockRecentProposals: UIProposal[] = Object.values(mockProposals);

const getStatusVariant = (status: string) => {
  switch (status) {
    case "pending":
      return "secondary";
    case "active":
      return "default";
    case "succeeded":
      return "default";
    case "defeated":
      return "destructive";
    case "executed":
      return "default";
    case "canceled":
      return "secondary";
    case "expired":
      return "secondary";
    default:
      return "secondary";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "pending":
      return "Pending";
    case "active":
      return "Active";
    case "succeeded":
      return "Succeeded";
    case "defeated":
      return "Defeated";
    case "executed":
      return "Executed";
    case "canceled":
      return "Canceled";
    case "expired":
      return "Expired";
    default:
      return "Unknown";
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case "Treasury Shenanigans":
      return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    case "Number Go Up (Tokenomics)":
      return "bg-purple-500/20 text-purple-300 border-purple-500/30";
    case "Protocol Wizardry":
      return "bg-green-500/20 text-green-300 border-green-500/30";
    case "Pacts with Other Degens (Partnerships)":
      return "bg-orange-500/20 text-orange-300 border-orange-500/30";
    case "Hype Machine (Marketing)":
      return "bg-pink-500/20 text-pink-300 border-pink-500/30";
    case "Govna Stuff (Governance)":
      return "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
    case "Science or Scam? (Experimental)":
      return "bg-red-500/20 text-red-300 border-red-500/30";
    case "Buildoors' Corner (Tooling)":
      return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
    case "Sprouting Ideas (New Stuff)":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    case "Do Tasks, Get Bags (Bounties)":
      return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
    default:
      return "bg-gray-500/20 text-gray-300 border-gray-500/30";
  }
};

const formatDate = (dateString: string) => {
  // Contract timestamps are stored in UTC seconds, converted to ISO string in frontend
  // This function formats them for display in the user's local timezone
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZoneName: "short", // Add timezone indicator
  });
};

function useMockMode() {
  const { search } = useLocation();
  return new URLSearchParams(search).get("mock") === "true";
}

const Governance = () => {
  const {
    activeWallet,
    activeAccount,
    activeNetwork,
    algodClient,
    signTransactions,
  } = useWallet();
  const mockMode = useMockMode();
  const [rejectingProposal, setRejectingProposal] = useState<string | null>(
    null
  );
  const [activatingProposal, setActivatingProposal] = useState<string | null>(
    null
  );
  const [votingProposal, setVotingProposal] = useState<string | null>(null);
  const [proposals, setProposals] = useState<UIProposal[]>([]);
  const [isLoadingProposals, setIsLoadingProposals] = useState(false);
  const [voteModalOpen, setVoteModalOpen] = useState(false);
  const [selectedVote, setSelectedVote] = useState<"yes" | "no" | null>(null);
  const [submittingVote, setSubmittingVote] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [userVotingPower, setUserVotingPower] = useState(500); // Mock voting power
  const [globalState, setGlobalState] = useState<GlobalState | null>(null);
  const [participationRate, setParticipationRate] = useState(0);
  const [userVotes, setUserVotes] = useState<Record<string, "yes" | "no">>({});

  // Network settings state
  const [networkSettings, setNetworkSettings] = useState<{
    [key in NetworkId]: boolean;
  }>({
    [NetworkId.LOCALNET]: true,
    [NetworkId.TESTNET]: false,
    [NetworkId.MAINNET]: false,
    [NetworkId.VOIMAIN]: false,
  } as { [key in NetworkId]: boolean });

  // Flag to indicate if active network is not enabled
  const [activeNetworkNotEnabled, setActiveNetworkNotEnabled] =
    useState<boolean>(false);

  const isNetworkEnabled = (networkId: NetworkId) => {
    return networkSettings[networkId] || false;
  };

  const getEnabledNetworks = () => {
    return Object.entries(networkSettings)
      .filter(([_, enabled]) => enabled)
      .map(([networkId]) => networkId as NetworkId);
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

  // Function to fetch user votes for all proposals
  const fetchUserVotes = async () => {
    if (!activeAccount || !activeNetwork || mockMode) {
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

      // Fetch user's voting power
      try {
        const getVoterR = await ci.get_voter(activeAccount.address);
        if (getVoterR.success && getVoterR.returnValue) {
          const voterData = getVoterR.returnValue;
          setUserVotingPower(Number(voterData[1]) / 1e6); // vote_power is at index 1
        }
      } catch (error) {
        console.error("Error fetching user voting power:", error);
      }

      const userVotesMap: Record<string, "yes" | "no"> = {};

      // Fetch votes for all proposals
      for (const proposal of proposals) {
        try {
          const getVoteR = await ci.get_vote(
            new Uint8Array(Buffer.from(proposal.id, "hex")),
            activeAccount.address
          );

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

  useEffect(() => {
    const fetchGlobalState = async () => {
      // Check if active network is enabled
      setActiveNetworkNotEnabled(!isNetworkEnabled(activeNetwork));

      if (!activeNetwork || !algod) return;

      // Get all enabled networks
      const enabledNetworks = getEnabledNetworks();
      console.log("Fetching proposals from enabled networks:", enabledNetworks);

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

        // Fetch proposals from all enabled networks
        for (const networkId of enabledNetworks) {
          try {
            // Create algod client for this network
            let networkAlgod;
            if (networkId === NetworkId.LOCALNET) {
              networkAlgod = new algosdk.Algodv2(
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "http://10.0.0.31",
                4001
              );
            } else if (networkId === NetworkId.TESTNET) {
              networkAlgod = new algosdk.Algodv2(
                "",
                "https://testnet-api.4160.nodely.dev",
                443
              );
            } else {
              // Skip networks without governance contracts
              continue;
            }

            // Create indexer for this network
            let networkIndexer;
            if (networkId === NetworkId.LOCALNET) {
              networkIndexer = new algosdk.Indexer(
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "http://10.0.0.31",
                8980
              );
            } else if (networkId === NetworkId.TESTNET) {
              networkIndexer = new algosdk.Indexer(
                "",
                "https://testnet-idx.4160.nodely.dev",
                443
              );
            }

            const governanceAppId = getGovernanceAppId(networkId);
            if (governanceAppId === 0) {
              console.log(
                `Skipping network ${networkId} - no governance app ID`
              );
              continue;
            }

            const client = new PowGovernanceClient(
              {
                id: governanceAppId,
                resolveBy: "id",
              },
              networkAlgod
            );

            const state = await client.getGlobalState();

            // Aggregate global state from all networks
            if (state.proposalCount) {
              totalProposals += state.proposalCount.asNumber();
            }
            if (state.activeProposalCount) {
              totalActiveProposals += state.activeProposalCount.asNumber();
            }
            if (state.totalVoterCount) {
              totalVoters += state.totalVoterCount.asNumber();
            }
            if (state.totalParticipatingVoters) {
              totalParticipatingVoters +=
                state.totalParticipatingVoters.asNumber();
            }

            // Set global state and participation rate based on aggregated data
            if (networkId === enabledNetworks[enabledNetworks.length - 1]) {
              aggregatedGlobalState = {
                proposalCount: { asNumber: () => totalProposals },
                activeProposalCount: { asNumber: () => totalActiveProposals },
                totalVoterCount: { asNumber: () => totalVoters },
                totalParticipatingVoters: {
                  asNumber: () => totalParticipatingVoters,
                },
              };
              setGlobalState(aggregatedGlobalState);
              const participationRate =
                totalVoters > 0
                  ? Number(
                      ((totalParticipatingVoters / totalVoters) * 100).toFixed(
                        2
                      )
                    )
                  : Number((33.33).toFixed(2));
              setParticipationRate(participationRate);
            }

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
              `Fetching proposals from ${networkId} with app ID ${governanceAppId}`
            );
            const evts = await ci.getEvents({});
            const proposalCreatedEvts: ProposalCreatedEvent[] = (
              evts?.find(
                (evt: { name: string }) => evt.name === "ProposalCreated"
              )?.events || []
            )?.map((evt: unknown[]) => ({
              txid: evt[0],
              round: evt[1],
              timestamp: evt[2],
              proposalNode: evt[3],
            }));

            const rawProposals = (
              await Promise.all(
                proposalCreatedEvts.map(async (evt) =>
                  ci.get_proposal(
                    new Uint8Array(Buffer.from(evt.proposalNode, "hex"))
                  )
                )
              )
            ).map((result: { returnValue: unknown }) =>
              decodeProposal(result.returnValue)
            );

            console.log(
              `Found ${rawProposals.length} proposals from ${networkId}`
            );

            // Convert to UI format and add network identifier
            const networkProposals = rawProposals.map((proposal) => {
              const uiProposal = convertProposalToUI(
                proposal,
                aggregatedGlobalState
              );
              return {
                ...uiProposal,
                network: networkId,
                networkName:
                  networkId === NetworkId.LOCALNET
                    ? "Localnet"
                    : networkId === NetworkId.TESTNET
                    ? "Algorand Testnet"
                    : networkId === NetworkId.MAINNET
                    ? "Algorand Mainnet"
                    : networkId === NetworkId.VOIMAIN
                    ? "Voi Mainnet"
                    : "Unknown",
              };
            });

            allProposals = [...allProposals, ...networkProposals];
          } catch (error) {
            console.error(`Error fetching proposals from ${networkId}:`, error);
          }
        }

        console.log(`Total proposals found: ${allProposals.length}`);

        // Sort proposals by creation date (latest first)
        const sortedProposals = allProposals.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA; // Latest first
        });

        setProposals(sortedProposals);
      } catch (err) {
        console.error("Failed to fetch global state", err);
        setGlobalState(null);
      }
    };
    if (mockMode) {
      setProposals(mockRecentProposals);
      setActiveNetworkNotEnabled(false);
    } else {
      fetchGlobalState();
    }
  }, [activeNetwork, algod, mockMode, indexer, networkSettings]);

  // Fetch user votes when proposals are loaded and user is connected
  useEffect(() => {
    if (proposals.length > 0 && activeAccount && !mockMode) {
      fetchUserVotes();
    }
  }, [proposals, activeAccount, mockMode]);

  console.log({ globalState });

  const handleWalletConnect = () => {
    // Optional: Add any additional logic when wallet connects
    console.log("Wallet connected successfully!");
  };

  const handleRejectProposal = async (proposalId: string) => {
    setRejectingProposal(proposalId);

    try {
      // Simulate transaction signing and confirmation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Here you would typically call your governance contract to reject the proposal
      console.log(`Rejecting proposal ${proposalId}`);

      // Update the proposal status to rejected
      setProposals((prevProposals) =>
        prevProposals.map((proposal) =>
          proposal.id === proposalId
            ? { ...proposal, status: "canceled" }
            : proposal
        )
      );

      // Optional: Show success message or update UI
    } catch (error) {
      console.error("Error rejecting proposal:", error);
      // Optional: Show error message
    } finally {
      setRejectingProposal(null);
    }
  };

  const handleActivateProposal = async (proposalId: string) => {
    if (!activeAccount || !activeNetwork) {
      toast({
        title: "Error",
        description: "Please connect your wallet to activate proposals",
        variant: "destructive",
      });
      return;
    }

    setActivatingProposal(proposalId);

    try {
      // Convert hex string back to Uint8Array for contract call
      const proposalNodeBytes = new Uint8Array(Buffer.from(proposalId, "hex"));

      const ci = new CONTRACT(
        getGovernanceAppId(activeNetwork),
        algod,
        indexer,
        makeABI(PowGovernanceAppSpec),
        { addr: activeAccount.address, sk: new Uint8Array() }
      );

      console.log("Activating proposal:", proposalId);
      console.log("proposalNodeBytes", proposalNodeBytes);

      const activateProposalR = await ci.activate_proposal(proposalNodeBytes);
      console.log("activateProposalR", activateProposalR);

      if (!activateProposalR.success) {
        throw new Error("Failed to activate proposal");
      }

      const stxns = await signTransactions(
        activateProposalR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );

      const { txId } = await algod.sendRawTransaction(stxns).do();
      console.log("Activation transaction ID:", txId);

      // Show success message
      toast({
        title: "Success",
        description: "Proposal activated successfully",
        variant: "default",
      });

      // Update the proposal status to active
      setProposals((prevProposals) =>
        prevProposals.map((proposal) =>
          proposal.id === proposalId
            ? {
                ...proposal,
                status: "active",
                votingEnds: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split("T")[0], // 7 days from now
              }
            : proposal
        )
      );
    } catch (error) {
      console.error("Error activating proposal:", error);
      toast({
        title: "Activation Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to activate proposal",
        variant: "destructive",
      });
    } finally {
      setActivatingProposal(null);
    }
  };

  const handleVoteClick = async (proposalId: string) => {
    setVotingProposal(proposalId);
    setVoteModalOpen(true);
    setSelectedVote(null);

    // Fetch user's existing vote for this proposal
    if (!activeAccount || !activeNetwork) {
      return;
    }

    try {
      if (mockMode) {
        // For mock mode, simulate no existing vote
        return;
      }

      const ci = new CONTRACT(
        getGovernanceAppId(activeNetwork),
        algod,
        indexer,
        makeABI(PowGovernanceAppSpec),
        { addr: activeAccount.address, sk: new Uint8Array() }
      );

      const getVoteR = await ci.get_vote(
        new Uint8Array(Buffer.from(proposalId, "hex")),
        activeAccount.address
      );

      if (getVoteR.success && getVoteR.returnValue !== undefined) {
        const voteValue = Number(getVoteR.returnValue);
        if (voteValue === 0) {
          setSelectedVote("no"); // Against
          setHasVoted(true);
          setUserVotes((prev) => ({ ...prev, [proposalId]: "no" }));
        } else if (voteValue === 1) {
          setSelectedVote("yes"); // For
          setHasVoted(true);
          setUserVotes((prev) => ({ ...prev, [proposalId]: "yes" }));
        } else {
          // If voteValue is 2 or undefined, user hasn't voted yet
          setHasVoted(false);
        }
      }
    } catch (error) {
      console.error("Error fetching user vote:", error);
      // Continue with modal open, user can still vote
    }
  };

  const handleSubmitVote = async () => {
    if (!selectedVote || !votingProposal) return;

    setSubmittingVote(true);

    try {
      // Simulate transaction signing and confirmation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Here you would typically call your governance contract to submit the vote
      console.log(`Voting ${selectedVote} on proposal ${votingProposal}`);

      const ci = new CONTRACT(
        getGovernanceAppId(activeNetwork),
        algod,
        indexer,
        makeABI(PowGovernanceAppSpec),
        { addr: activeAccount.address, sk: new Uint8Array() }
      );
      console.log({ ci });
      const castVoteR = await ci.cast_vote(
        new Uint8Array(Buffer.from(votingProposal, "hex")),
        selectedVote === "yes" ? 1 : 0
      );
      console.log({ castVoteR });
      if (!castVoteR.success) {
        throw new Error("Failed to cast vote");
      }

      const stxns = await signTransactions(
        castVoteR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );

      const { txId } = await algod.sendRawTransaction(stxns).do();
      console.log({ txId });

      // Update the proposal with the new vote
      setProposals((prevProposals) =>
        prevProposals.map((proposal) =>
          proposal.id === votingProposal
            ? {
                ...proposal,
                totalVotes: proposal.totalVotes + 1,
                yesVotes: proposal.yesVotes + (selectedVote === "yes" ? 1 : 0),
                noVotes: proposal.noVotes + (selectedVote === "no" ? 1 : 0),
              }
            : proposal
        )
      );

      // Set hasVoted to true since vote was successful
      setHasVoted(true);
      setUserVotes((prev) => ({ ...prev, [votingProposal]: selectedVote }));

      // Show success message
      toast({
        title: "Vote Submitted",
        description: `Successfully voted ${selectedVote} on proposal`,
        variant: "default",
      });

      // Close modal and reset state after a short delay to show the success state
      setTimeout(() => {
        setVoteModalOpen(false);
        setVotingProposal(null);
        setSelectedVote(null);
        setHasVoted(false);
      }, 2000);
    } catch (error) {
      console.error("Error submitting vote:", error);
      // Show error message
      toast({
        title: "Vote Failed",
        description:
          error instanceof Error ? error.message : "Failed to submit vote",
        variant: "destructive",
      });
    } finally {
      setSubmittingVote(false);
    }
  };

  const handleCloseVoteModal = () => {
    setVoteModalOpen(false);
    setVotingProposal(null);
    setSelectedVote(null);
    setSubmittingVote(false);
    setHasVoted(false);
  };

  // Filter proposals based on search and filters
  const filteredProposals = useMemo(() => {
    return proposals.filter((proposal) => {
      const matchesSearch =
        proposal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        proposal.description
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        proposal.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || proposal.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" || proposal.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [proposals, searchQuery, statusFilter, categoryFilter]);

  // Get unique categories for filter dropdown
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(proposals.map((p) => p.category))];
    return uniqueCategories.sort();
  }, [proposals]);

  return (
    <div className="space-y-8">
      {/* Hero Section with Governance Theme */}
      <div className="relative min-h-[40vh] sm:min-h-[50vh] flex items-center justify-center overflow-hidden w-full py-4 sm:py-6 md:py-8 pb-4 sm:pb-6 md:pb-8">
        {/* Animated Background */}
        <div className="absolute inset-0 w-full h-full">
          {/* Dark Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-slate-900 to-black"></div>

          {/* Animated Grid Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
              `,
                backgroundSize: "50px 50px",
                animation: "gridMove 20s linear infinite",
              }}
            ></div>
          </div>

          {/* Animated Particles */}
          <div className="absolute inset-0">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-gray-400/20 rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              ></div>
            ))}
          </div>

          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/5 to-black/30"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center px-2 sm:px-4 max-w-4xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white drop-shadow-2xl leading-tight">
              Govna's Room
            </h1>
            <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-full bg-gradient-to-r from-gray-700 to-gray-600 text-white shadow-lg backdrop-blur-sm border border-gray-500/30">
              <Vote className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base font-semibold">
                Bring Snacks
              </span>
            </div>
          </div>

          <p className="text-sm sm:text-base md:text-lg text-white/90 max-w-3xl mx-auto leading-relaxed drop-shadow-lg mb-4 sm:mb-6 px-2">
            Vote like your bags depend on it. Drop half-baked proposals, spam
            YES votes, and steer this flaming rocket ship straight into the
            moon. Governance isn’t just for nerds—it’s for absolute maniacs like
            you.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 px-2">
            {/*<Button
              asChild
              className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-bold bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-800 hover:to-gray-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 w-full sm:w-auto"
            >
              <Link to="/governance/proposals">View All Blapposal</Link>
            </Button>*/}
            {activeAccount && activeNetwork === NetworkId.LOCALNET ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  asChild
                  variant="outline"
                  className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-bold border-2 border-white/30 text-white hover:bg-white/10 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm w-full sm:w-auto"
                >
                  <Link to="/governance/proposals/create">
                    Create Blapposal
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-bold border-2 border-white/30 text-white hover:bg-white/10 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm w-full sm:w-auto"
                >
                  <Link to="/governance/demo">View All States</Link>
                </Button>
              </div>
            ) : (
              <WalletConnectModal onConnect={handleWalletConnect}>
                <Button
                  variant="outline"
                  className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-bold border-2 border-white/30 text-white hover:bg-white/10 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm w-full sm:w-auto"
                >
                  Connect Wallet
                </Button>
              </WalletConnectModal>
            )}
          </div>
        </div>
      </div>

      {/* Active Network Warning */}
      {activeNetworkNotEnabled && (
        <div className="container mx-auto px-4 py-4">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-yellow-400 mb-1">
                  Active Network Not Enabled
                </h3>
                <p className="text-xs text-yellow-300/80">
                  The currently selected network (
                  {activeNetwork === NetworkId.LOCALNET
                    ? "Localnet"
                    : activeNetwork === NetworkId.TESTNET
                    ? "Algorand Testnet"
                    : activeNetwork === NetworkId.MAINNET
                    ? "Algorand Mainnet"
                    : activeNetwork === NetworkId.VOIMAIN
                    ? "Voi Mainnet"
                    : "Unknown"}
                  ) is not enabled in your network settings. Blapposals are
                  being fetched from enabled networks only.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 space-y-8">
        {/* Quick Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-0 bg-gradient-to-br from-blue-900/60 to-blue-800/40 shadow-xl hover:scale-[1.03] hover:shadow-2xl transition-all duration-200 animate-fade-in rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                Total Blapposals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-300">
                {globalState?.proposalCount.asNumber()}
              </div>
              <p className="text-xs text-muted-foreground">
                All time proposals created
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-green-900/60 to-green-800/40 shadow-xl hover:scale-[1.03] hover:shadow-2xl transition-all duration-200 animate-fade-in rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-400" />
                Active Blapposals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-300">
                {mockMode
                  ? mockStats.activeProposals
                  : globalState?.activeProposalCount.asNumber()}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently open for voting
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-purple-900/60 to-purple-800/40 shadow-xl hover:scale-[1.03] hover:shadow-2xl transition-all duration-200 animate-fade-in rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Total Voters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-300">
                {mockMode
                  ? mockStats.totalVoters
                  : globalState?.totalVoterCount?.asNumber() || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Unique addresses voted
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-indigo-900/60 to-indigo-800/40 shadow-xl hover:scale-[1.03] hover:shadow-2xl transition-all duration-200 animate-fade-in rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-indigo-400" />
                Participation Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-300">
                {mockMode
                  ? mockStats.participationRate
                  : participationRate || 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">
                Average voter turnout
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Section Divider and Header for Recent Proposals */}
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <h2 className="text-2xl font-bold text-white tracking-tight animate-fade-in">
            Recent Blapposals
          </h2>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-white/20 to-transparent" />
        </div>

        {/* Search and Filter Section */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search proposals by title, description, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-2xl focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-2xl focus:ring-2 focus:ring-blue-500/50">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/10">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="succeeded">Succeeded</SelectItem>
                <SelectItem value="defeated">Defeated</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="executed">Executed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-2xl focus:ring-2 focus:ring-blue-500/50">
                <BookOpen className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/10">
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Results count */}
            <div className="flex items-center justify-center sm:justify-end flex-1">
              <span className="text-sm text-gray-400">
                {filteredProposals.length} of {proposals.length} blapposals
              </span>
            </div>
          </div>
        </div>

        {/* Recent Proposals - Reddit Style List */}
        <div className="space-y-2">
          {filteredProposals.filter((proposal) =>
            ["active", "succeeded", "pending", "canceled"].includes(
              proposal.status
            )
          ).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-500/20 rounded-full flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                No proposals found
              </h3>
              <p className="text-gray-400 mb-4">
                Try adjusting your search terms or filters to find what you're
                looking for.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setCategoryFilter("all");
                }}
                className="rounded-full"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            filteredProposals
              .filter((proposal) =>
                ["active", "succeeded", "pending", "canceled"].includes(
                  proposal.status
                )
              )
              .map((proposal) => {
                const votePercentage =
                  proposal.totalVotes > 0
                    ? (proposal.yesVotes / proposal.totalVotes) * 100
                    : 0;
                const sentimentScore = proposal.yesVotes - proposal.noVotes;

                return (
                  <div
                    key={proposal.id}
                    className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all duration-200 animate-fade-in"
                  >
                    <div className="flex gap-4">
                      {/* Vote Column - Reddit Style */}
                      <div className="flex flex-col items-center gap-1 min-w-[60px]">
                        {/* Upvote Button */}
                        <button
                          className={`p-2 rounded-lg transition-all duration-200 ${
                            userVotes[proposal.id] === "yes"
                              ? "text-green-400 bg-green-500/20"
                              : submittingVote && votingProposal === proposal.id
                              ? "text-gray-500 cursor-not-allowed"
                              : "text-gray-400 hover:text-green-400 hover:bg-green-500/10"
                          }`}
                          onClick={async () => {
                            if (
                              proposal.status === "active" &&
                              !userVotes[proposal.id]
                            ) {
                              setSelectedVote("yes");
                              setVotingProposal(proposal.id);
                              setSubmittingVote(true);

                              try {
                                const ci = new CONTRACT(
                                  getGovernanceAppId(activeNetwork),
                                  algod,
                                  indexer,
                                  makeABI(PowGovernanceAppSpec),
                                  {
                                    addr: activeAccount.address,
                                    sk: new Uint8Array(),
                                  }
                                );

                                const castVoteR = await ci.cast_vote(
                                  new Uint8Array(
                                    Buffer.from(proposal.id, "hex")
                                  ),
                                  1 // Yes vote
                                );

                                if (!castVoteR.success) {
                                  throw new Error("Failed to cast vote");
                                }

                                const stxns = await signTransactions(
                                  castVoteR.txns.map(
                                    (txn: string) =>
                                      new Uint8Array(Buffer.from(txn, "base64"))
                                  )
                                );

                                const { txId } = await algod
                                  .sendRawTransaction(stxns)
                                  .do();
                                console.log("Vote transaction ID:", txId);

                                // Update the proposal with the new vote
                                setProposals((prevProposals) =>
                                  prevProposals.map((p) =>
                                    p.id === proposal.id
                                      ? {
                                          ...p,
                                          totalVotes: p.totalVotes + 1,
                                          yesVotes: p.yesVotes + 1,
                                        }
                                      : p
                                  )
                                );

                                // Update user votes
                                setUserVotes((prev) => ({
                                  ...prev,
                                  [proposal.id]: "yes",
                                }));

                                toast({
                                  title: "Vote Submitted",
                                  description:
                                    "Successfully voted Yes on proposal",
                                  variant: "default",
                                });
                              } catch (error) {
                                console.error("Error submitting vote:", error);
                                toast({
                                  title: "Vote Failed",
                                  description:
                                    error instanceof Error
                                      ? error.message
                                      : "Failed to submit vote",
                                  variant: "destructive",
                                });
                              } finally {
                                setSubmittingVote(false);
                                setSelectedVote(null);
                                setVotingProposal(null);
                              }
                            }
                          }}
                          disabled={
                            proposal.status !== "active" ||
                            !!userVotes[proposal.id] ||
                            submittingVote
                          }
                        >
                          {submittingVote && votingProposal === proposal.id ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <ThumbsUp className="h-5 w-5" />
                          )}
                        </button>

                        {/* Sentiment Score */}
                        <div className="text-center">
                          <div
                            className={`text-lg font-bold ${
                              sentimentScore > 0
                                ? "text-green-400"
                                : sentimentScore < 0
                                ? "text-red-400"
                                : "text-gray-400"
                            }`}
                          >
                            {sentimentScore > 0 ? "+" : ""}
                            {sentimentScore}
                          </div>
                          <div className="text-xs text-gray-400">
                            {proposal.totalVotes} votes
                          </div>
                        </div>

                        {/* Downvote Button */}
                        <button
                          className={`p-2 rounded-lg transition-all duration-200 ${
                            userVotes[proposal.id] === "no"
                              ? "text-red-400 bg-red-500/20"
                              : submittingVote && votingProposal === proposal.id
                              ? "text-gray-500 cursor-not-allowed"
                              : "text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                          }`}
                          onClick={async () => {
                            if (
                              proposal.status === "active" &&
                              !userVotes[proposal.id]
                            ) {
                              setSelectedVote("no");
                              setVotingProposal(proposal.id);
                              setSubmittingVote(true);

                              try {
                                const ci = new CONTRACT(
                                  getGovernanceAppId(activeNetwork),
                                  algod,
                                  indexer,
                                  makeABI(PowGovernanceAppSpec),
                                  {
                                    addr: activeAccount.address,
                                    sk: new Uint8Array(),
                                  }
                                );

                                const castVoteR = await ci.cast_vote(
                                  new Uint8Array(
                                    Buffer.from(proposal.id, "hex")
                                  ),
                                  0 // No vote
                                );

                                if (!castVoteR.success) {
                                  throw new Error("Failed to cast vote");
                                }

                                const stxns = await signTransactions(
                                  castVoteR.txns.map(
                                    (txn: string) =>
                                      new Uint8Array(Buffer.from(txn, "base64"))
                                  )
                                );

                                const { txId } = await algod
                                  .sendRawTransaction(stxns)
                                  .do();
                                console.log("Vote transaction ID:", txId);

                                // Update the proposal with the new vote
                                setProposals((prevProposals) =>
                                  prevProposals.map((p) =>
                                    p.id === proposal.id
                                      ? {
                                          ...p,
                                          totalVotes: p.totalVotes + 1,
                                          noVotes: p.noVotes + 1,
                                        }
                                      : p
                                  )
                                );

                                // Update user votes
                                setUserVotes((prev) => ({
                                  ...prev,
                                  [proposal.id]: "no",
                                }));

                                toast({
                                  title: "Vote Submitted",
                                  description:
                                    "Successfully voted No on proposal",
                                  variant: "default",
                                });
                              } catch (error) {
                                console.error("Error submitting vote:", error);
                                toast({
                                  title: "Vote Failed",
                                  description:
                                    error instanceof Error
                                      ? error.message
                                      : "Failed to submit vote",
                                  variant: "destructive",
                                });
                              } finally {
                                setSubmittingVote(false);
                                setSelectedVote(null);
                                setVotingProposal(null);
                              }
                            }
                          }}
                          disabled={
                            proposal.status !== "active" ||
                            !!userVotes[proposal.id] ||
                            submittingVote
                          }
                        >
                          {submittingVote && votingProposal === proposal.id ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <ThumbsDown className="h-5 w-5" />
                          )}
                        </button>
                      </div>

                      {/* Content Column */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-white line-clamp-2 mb-2">
                              {proposal.title}
                            </h3>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant={getStatusVariant(proposal.status)}
                                className="text-xs px-2 py-1 rounded-full font-semibold"
                              >
                                {getStatusLabel(proposal.status)}
                              </Badge>
                              <Badge
                                className={`text-xs px-2 py-1 rounded-full font-semibold border ${getCategoryColor(
                                  proposal.category
                                )}`}
                              >
                                {proposal.category}
                              </Badge>
                              {proposal.networkName && (
                                <Badge
                                  variant="outline"
                                  className="text-xs px-2 py-1 rounded-full font-semibold border-blue-500/50 text-blue-400"
                                >
                                  {proposal.networkName}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-gray-300 line-clamp-3 mb-3">
                          {proposal.description}
                        </p>

                        {/* Meta Information */}
                        <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(proposal.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>
                              by {proposal.author.slice(0, 6)}...
                              {proposal.author.slice(-4)}
                            </span>
                          </div>
                          {activeAccount && proposal.status === "active" && (
                            <div className="flex items-center gap-1 text-gray-400">
                              <Zap className="h-3 w-3" />
                              <span>
                                {userVotingPower.toLocaleString()} power
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Status-specific content */}
                        {proposal.status === "active" && (
                          <div className="space-y-3 mb-3">
                            {/* Voting Progress */}
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs text-gray-400">
                                <span>Voting Progress</span>
                                <span>{votePercentage.toFixed(1)}% For</span>
                              </div>
                              <div className="relative">
                                <Progress
                                  value={votePercentage}
                                  className="h-2 bg-gray-700/50"
                                />
                                <div
                                  className="absolute inset-0 rounded-full bg-gradient-to-r from-green-500/20 to-green-600/20"
                                  style={{ width: `${votePercentage}%` }}
                                />
                              </div>
                            </div>

                            {/* Vote Breakdown */}
                            <div className="flex gap-4 text-sm">
                              <div className="flex items-center gap-1 text-green-400">
                                <ThumbsUp className="h-4 w-4" />
                                <span>{proposal.yesVotes} For</span>
                              </div>
                              <div className="flex items-center gap-1 text-red-400">
                                <ThumbsDown className="h-4 w-4" />
                                <span>{proposal.noVotes} Against</span>
                              </div>
                            </div>

                            {/* Time Remaining */}
                            {proposal.votingEnds && (
                              <div className="flex items-center gap-2 text-xs text-blue-400">
                                <Clock className="h-4 w-4" />
                                <span>
                                  Voting ends {formatDate(proposal.votingEnds)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {proposal.status === "pending" && (
                          <div className="space-y-3 mb-3">
                            {/* Activation Progress */}
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs text-gray-400">
                                <span>Activation Progress</span>
                                <span>
                                  {proposal.currentPower} /{" "}
                                  {proposal.requiredPower} power
                                </span>
                              </div>
                              <div className="relative">
                                <Progress
                                  value={
                                    (proposal.currentPower /
                                      proposal.requiredPower) *
                                    100
                                  }
                                  className="h-2 bg-gray-700/50"
                                />
                                <div
                                  className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500/20 to-yellow-500/20"
                                  style={{
                                    width: `${
                                      (proposal.currentPower /
                                        proposal.requiredPower) *
                                      100
                                    }%`,
                                  }}
                                />
                              </div>
                            </div>

                            {/* Activation Status */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-orange-400" />
                                <span className="text-sm text-orange-300">
                                  {proposal.isExpired
                                    ? "Expired"
                                    : proposal.currentPower >=
                                      proposal.requiredPower
                                    ? "Ready to Activate"
                                    : "Needs More Power"}
                                </span>
                              </div>
                              {!proposal.isExpired &&
                                proposal.timeToActivate && (
                                  <span className="text-xs text-blue-400">
                                    {proposal.timeToActivate} left
                                  </span>
                                )}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                          >
                            <Link to={`/governance/proposals/${proposal.id}`}>
                              View Details
                            </Link>
                          </Button>

                          {userVotes[proposal.id] &&
                            proposal.status === "active" && (
                              <div
                                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                                  userVotes[proposal.id] === "yes"
                                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                                }`}
                              >
                                {userVotes[proposal.id] === "yes" ? (
                                  <ThumbsUp className="h-3 w-3" />
                                ) : (
                                  <ThumbsDown className="h-3 w-3" />
                                )}
                                {userVotes[proposal.id] === "yes"
                                  ? "Voted For"
                                  : "Voted Against"}
                              </div>
                            )}

                          {proposal.status === "active" &&
                            !userVotes[proposal.id] && (
                              <Button
                                size="sm"
                                className="rounded-full"
                                onClick={() => handleVoteClick(proposal.id)}
                              >
                                <Vote className="h-4 w-4 mr-1" />
                                Vote
                              </Button>
                            )}

                          {proposal.status === "pending" &&
                            !proposal.isExpired && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full"
                                onClick={() =>
                                  handleActivateProposal(proposal.id)
                                }
                                disabled={activatingProposal === proposal.id}
                              >
                                {activatingProposal === proposal.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Activating...
                                  </>
                                ) : (
                                  "Activate"
                                )}
                              </Button>
                            )}

                          {proposal.status === "pending" &&
                            proposal.isExpired && (
                              <Button
                                variant="destructive"
                                size="sm"
                                className="rounded-full"
                                onClick={() =>
                                  handleRejectProposal(proposal.id)
                                }
                                disabled={rejectingProposal === proposal.id}
                              >
                                {rejectingProposal === proposal.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Rejecting...
                                  </>
                                ) : (
                                  "Reject"
                                )}
                              </Button>
                            )}

                          {proposal.status === "canceled" && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              className="opacity-50 cursor-not-allowed rounded-full"
                            >
                              Canceled
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* Voting Modal */}
      <Dialog open={voteModalOpen} onOpenChange={handleCloseVoteModal}>
        <DialogContent className="sm:max-w-md bg-gray-900/95 backdrop-blur-md border border-white/10 shadow-2xl !rounded-3xl sm:!rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Vote className="h-5 w-5" />
              {hasVoted ? "Your Vote" : "Cast Your Vote"}
            </DialogTitle>
            <DialogDescription>
              {votingProposal &&
                proposals.find((p) => p.id === votingProposal)?.title}
              {hasVoted && (
                <div
                  className={`mt-2 p-3 rounded-lg border ${
                    selectedVote === "yes"
                      ? "bg-green-500/10 border-green-500/20"
                      : "bg-red-500/10 border-red-500/20"
                  }`}
                >
                  <div
                    className={`flex items-center gap-2 ${
                      selectedVote === "yes" ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">
                      You voted {selectedVote === "yes" ? "Yes" : "No"} on this
                      proposal
                    </span>
                  </div>
                  <p
                    className={`text-xs mt-1 ${
                      selectedVote === "yes"
                        ? "text-green-400/70"
                        : "text-red-400/70"
                    }`}
                  >
                    Your vote has been recorded and cannot be changed
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Voting Power Display */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-blue-300">
                    Your Voting Power
                  </span>
                </div>
                <span className="text-lg font-bold text-blue-200">
                  {userVotingPower.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-blue-400/70 mt-1">
                This represents your influence on this proposal
              </p>
            </div>

            {/* Impact Preview */}
            {votingProposal &&
              (() => {
                const proposal = proposals.find((p) => p.id === votingProposal);
                if (!proposal || proposal.status !== "active") return null;
                const currentYes = proposal.yesVotes;
                const currentNo = proposal.noVotes;
                const currentTotal = proposal.totalVotes;
                const currentYesPct =
                  currentTotal > 0 ? (currentYes / currentTotal) * 100 : 0;
                const currentNoPct =
                  currentTotal > 0 ? (currentNo / currentTotal) * 100 : 0;
                let newYes = currentYes;
                let newNo = currentNo;
                let newTotal = currentTotal;
                if (selectedVote === "yes") {
                  newYes += 1;
                  newTotal += 1;
                } else if (selectedVote === "no") {
                  newNo += 1;
                  newTotal += 1;
                }
                const newYesPct = newTotal > 0 ? (newYes / newTotal) * 100 : 0;
                const newNoPct = newTotal > 0 ? (newNo / newTotal) * 100 : 0;
                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>Impact Preview</span>
                      <span className="rounded-full bg-gray-700/40 px-2 py-0.5 text-[10px] text-gray-300">
                        if you vote{" "}
                        {selectedVote === "yes"
                          ? "Yes"
                          : selectedVote === "no"
                          ? "No"
                          : ""}
                      </span>
                    </div>
                    <div className="relative">
                      {/* Current progress bar */}
                      <Progress
                        value={currentYesPct}
                        className="h-2 bg-gray-700/50"
                      />
                      {/* Preview progress bar overlays */}
                      {selectedVote && (
                        <div
                          className="absolute top-0 left-0 h-2 rounded-full bg-green-500/40 transition-all duration-300"
                          style={{
                            width: `${newYesPct}%`,
                            opacity: 0.7,
                            zIndex: 2,
                          }}
                        />
                      )}
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-green-400">
                        For: {currentYes} → <b>{newYes}</b> (
                        {currentYesPct.toFixed(1)}% →{" "}
                        <b>{newYesPct.toFixed(1)}%</b>)
                      </span>
                      <span className="text-red-400">
                        Against: {currentNo} → <b>{newNo}</b> (
                        {currentNoPct.toFixed(1)}% →{" "}
                        <b>{newNoPct.toFixed(1)}%</b>)
                      </span>
                    </div>
                  </div>
                );
              })()}

            <div className="text-sm text-muted-foreground">
              Select your vote for this proposal. This action cannot be undone.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={selectedVote === "yes" ? "default" : "outline"}
                className={`h-16 flex flex-col items-center justify-center gap-2 rounded-2xl ${
                  selectedVote === "yes"
                    ? hasVoted
                      ? "bg-green-600 hover:bg-green-700 text-white border-green-500"
                      : "bg-green-600 hover:bg-green-700"
                    : ""
                }`}
                onClick={() => setSelectedVote("yes")}
                disabled={submittingVote || hasVoted}
              >
                <ThumbsUp className="h-6 w-6" />
                <span className="font-semibold">
                  {hasVoted && selectedVote === "yes" ? "Voted" : "Vote Yes"}
                </span>
              </Button>

              <Button
                variant={selectedVote === "no" ? "default" : "outline"}
                className={`h-16 flex flex-col items-center justify-center gap-2 rounded-2xl ${
                  selectedVote === "no"
                    ? hasVoted
                      ? "bg-red-600 hover:bg-red-700 text-white border-red-500"
                      : "bg-red-600 hover:bg-red-700"
                    : ""
                }`}
                onClick={() => setSelectedVote("no")}
                disabled={submittingVote || hasVoted}
              >
                <ThumbsDown className="h-6 w-6" />
                <span className="font-semibold">
                  {hasVoted && selectedVote === "no" ? "Voted" : "Vote No"}
                </span>
              </Button>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleCloseVoteModal}
                disabled={submittingVote}
                className="flex-1 rounded-2xl"
              >
                {hasVoted ? "Close" : "Cancel"}
              </Button>
              {!hasVoted && (
                <Button
                  onClick={handleSubmitVote}
                  disabled={!selectedVote || submittingVote}
                  className="flex-1 rounded-2xl"
                >
                  {submittingVote ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Vote"
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Governance;
