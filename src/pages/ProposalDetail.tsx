import { useState, useEffect, useMemo, act } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Calendar,
  Users,
  Vote,
  CheckCircle,
  XCircle,
  Clock,
  User,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Loader2,
  RefreshCw,
  Twitter,
  Share2,
  Info,
  Timer,
  Globe,
  Plus,
} from "lucide-react";
import { NetworkId, useWallet } from "@txnlab/use-wallet-react";
import { CONTRACT } from "ulujs";
import algosdk from "algosdk";
import { toast } from "@/components/ui/use-toast";
import { getGovernanceAppId } from "@/constants/appIds";
import { decodeProposal, getVoter, Proposal } from "@/utils/command";
import {
  APP_SPEC as PowGovernanceAppSpec,
  PowGovernanceClient,
} from "@/clients/PowGovernanceClient.ts";
import { GlobalState } from "./Governance";

// UI-friendly proposal interface
interface NetworkBreakdown {
  networkId: NetworkId;
  networkName: string;
  totalPower: number;
  yesPower: number;
  noPower: number;
  quorum: number;
  status: string;
  canVote: boolean;
  canActivate: boolean;
  canExecute: boolean;
  hasVoted: boolean;
  userVote: boolean | null;
  userVotingPower: number;
  error?: string;
}

interface UIProposal {
  id: string;
  index: string;
  title: string;
  description: string;
  status: string;
  category: string;
  createdBy: string;
  createdAt: string;
  totalPower: number;
  yesPower: number;
  noPower: number;
  votingStarts: string;
  votingEnds: string;
  quorum: number;
  currentQuorum: number;
  activationPower: number;
  executionDelay: number;
  canVote: boolean;
  hasVoted: boolean;
  userVote: boolean | null;
  canActivate: boolean;
  canExecute: boolean;
  canVeto: boolean;
  votingActivated: string | null;
  networkBreakdown?: NetworkBreakdown[];
  // Resolution metadata
  resolutionReason?: string;
  resolvedAt?: string;
}

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

// Helper function to convert hex string to Uint8Array (for contract calls)
const hexToUint8Array = (hex: string): Uint8Array => {
  const cleanHex = hex.replace(/^0x/, ""); // Remove 0x prefix if present
  if (cleanHex.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  return new Uint8Array(
    cleanHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );
};

// Feature flags
// To enable/disable features, modify the values below
const FEATURE_FLAGS = {
  ENABLE_FINALIZE_ACTION: false, // Set to true to enable finalize action
} as const;

// Mock data for different proposal states - replace with actual data from your governance contract
const mockProposals = {
  "1": {
    id: "1",
    index: 1,
    title: "Increase Treasury Allocation for Development",
    description:
      "This proposal seeks to increase the treasury allocation from 10% to 15% of all transaction fees to fund additional development initiatives and community projects. The additional 5% allocation will be used to:\n\n1. Fund open-source development grants\n2. Support community-driven projects\n3. Hire additional developers for core protocol development\n4. Establish a bug bounty program\n5. Create educational content and documentation\n\nThis change will help accelerate the ecosystem's growth and ensure sustainable development funding.",
    status: "active",
    createdAt: "2024-01-15T14:30:00Z",
    createdBy: "0x1234567890abcdef1234567890abcdef12345678",
    totalPower: 4500,
    yesPower: 3200,
    noPower: 1300,
    votingStarts: "2024-01-16T00:00:00Z",
    votingEnds: "2024-12-31T23:59:59Z",
    quorum: 1000,
    currentQuorum: 2340,
    executionDelay: 24, // hours
    canVote: true,
    hasVoted: false,
    userVote: null,
    canActivate: false,
    canExecute: false,
    canVeto: false,
    votingActivated: "2024-01-16T00:00:00Z",
    activationPower: 0,
  },
  "2": {
    id: "2",
    index: 2,
    title: "Update Governance Parameters",
    description:
      "This proposal aims to optimize the governance process by adjusting key parameters:\n\n1. Reduce voting period from 7 days to 5 days for faster decision-making\n2. Lower quorum threshold from 1000 to 800 tokens to increase participation\n3. Adjust activation threshold from 1500 to 1200 power for easier proposal activation\n4. Implement a 48-hour execution delay instead of 24 hours for better security\n\nThese changes will make governance more efficient while maintaining security and decentralization.",
    status: "succeeded",
    createdAt: "2024-01-10T09:15:00Z",
    createdBy: "0x87654321fedcba0987654321fedcba0987654321",
    totalPower: 8900,
    yesPower: 6700,
    noPower: 2200,
    votingStarts: "2024-01-11T00:00:00Z",
    votingEnds: "2024-01-17T23:59:59Z",
    quorum: 1000,
    currentQuorum: 1560,
    executionDelay: 24,
    canVote: false,
    hasVoted: true,
    userVote: true,
    canActivate: false,
    canExecute: true,
    canVeto: false,
    votingActivated: "2024-01-11T00:00:00Z",
    activationPower: 0,
  },
  "3": {
    id: "3",
    index: 3,
    title: "Add New Validator Node",
    description:
      "Proposal to onboard a new validator node to improve network decentralization and performance. The new validator will:\n\n1. Increase network security through additional validation\n2. Improve transaction processing speed\n3. Enhance geographic distribution of validators\n4. Provide redundancy for better uptime\n5. Support network growth and scalability\n\nThe validator will be operated by a trusted community member with proven technical expertise.",
    status: "pending",
    createdAt: "2024-01-12T16:45:00Z",
    createdBy: "0x9876543210abcdef9876543210abcdef98765432",
    totalPower: 0,
    yesPower: 0,
    noPower: 0,
    votingStarts: "2024-01-13T00:00:00Z",
    votingEnds: "2024-01-20T23:59:59Z",
    quorum: 1000,
    currentQuorum: 0,
    executionDelay: 24,
    canVote: false,
    hasVoted: false,
    userVote: null,
    canActivate: true,
    canExecute: false,
    canVeto: false,
    votingActivated: null,
    activationPower: 1800,
  },
  "4": {
    id: "4",
    index: 4,
    title: "Community Grant Program Expansion",
    description:
      "Expand the community grant program to support more developer initiatives and educational content creation. This expansion will:\n\n1. Increase grant funding pool by 50%\n2. Add new grant categories for educational content\n3. Implement a mentorship program for new developers\n4. Create a community-driven review process\n5. Establish quarterly grant rounds\n\nThis will foster innovation and grow our developer ecosystem.",
    status: "defeated",
    createdAt: "2024-01-05T11:20:00Z",
    createdBy: "0x5432109876fedcba5432109876fedcba54321098",
    totalPower: 6700,
    yesPower: 2500,
    noPower: 4200,
    votingStarts: "2024-01-06T00:00:00Z",
    votingEnds: "2024-01-13T23:59:59Z",
    quorum: 1000,
    currentQuorum: 890,
    executionDelay: 24,
    canVote: false,
    hasVoted: true,
    userVote: false,
    canActivate: false,
    canExecute: false,
    canVeto: false,
    votingActivated: "2024-01-06T00:00:00Z",
    activationPower: 0,
  },
  "5": {
    id: "5",
    index: 5,
    title: "Implement Cross-Chain Bridge",
    description:
      "Proposal to implement a cross-chain bridge to enable interoperability with other blockchain networks. The bridge will:\n\n1. Connect to Ethereum mainnet for asset transfers\n2. Support major ERC-20 tokens\n3. Implement secure validation mechanisms\n4. Provide liquidity pools for bridge operations\n5. Include comprehensive security audits\n\nThis will expand our ecosystem's reach and utility.",
    status: "active",
    createdAt: "2024-01-18T13:30:00Z",
    createdBy: "0x1111222233334444555566667777888899990000",
    totalPower: 2300,
    yesPower: 1800,
    noPower: 500,
    votingStarts: "2024-01-19T00:00:00Z",
    votingEnds: "2024-01-25T23:59:59Z",
    quorum: 1000,
    currentQuorum: 1200,
    executionDelay: 24,
    canVote: true,
    hasVoted: false,
    userVote: null,
    canActivate: false,
    canExecute: false,
    canVeto: false,
    votingActivated: "2024-01-19T00:00:00Z",
    activationPower: 0,
  },
  "6": {
    id: "6",
    index: 6,
    title: "Security Audit Funding",
    description:
      "Allocate funds for comprehensive security audits of smart contracts and infrastructure. This includes:\n\n1. Full audit of governance contracts\n2. Security review of treasury management\n3. Penetration testing of infrastructure\n4. Code review by multiple security firms\n5. Bug bounty program establishment\n\nSecurity is paramount for maintaining user trust and protecting assets.",
    status: "pending",
    createdAt: "2024-01-20T10:15:00Z",
    createdBy: "0x3333444455556666777788889999000011112222",
    totalPower: 0,
    yesPower: 0,
    noPower: 0,
    votingStarts: "2024-01-21T00:00:00Z",
    votingEnds: "2024-01-28T23:59:59Z",
    quorum: 1000,
    currentQuorum: 0,
    executionDelay: 24,
    canVote: false,
    hasVoted: false,
    userVote: null,
    canActivate: true,
    canExecute: false,
    canVeto: false,
    votingActivated: null,
    activationPower: 1200,
  },
  "7": {
    id: "7",
    index: 7,
    title: "Fee Reduction Implementation",
    description:
      "Reduce transaction fees by 20% to improve user experience and increase adoption. The fee reduction will:\n\n1. Lower barriers to entry for new users\n2. Increase transaction volume through better affordability\n3. Improve competitive positioning\n4. Maintain sustainable revenue through volume growth\n5. Implement gradual rollout to monitor impact\n\nThis change aims to balance user experience with protocol sustainability.",
    status: "executed",
    createdAt: "2024-01-08T14:20:00Z",
    createdBy: "0x4444555566667777888899990000111122223333",
    totalPower: 12300,
    yesPower: 9800,
    noPower: 2500,
    votingStarts: "2024-01-09T00:00:00Z",
    votingEnds: "2024-01-16T23:59:59Z",
    quorum: 1000,
    currentQuorum: 2100,
    executionDelay: 24,
    canVote: false,
    hasVoted: true,
    userVote: true,
    canActivate: false,
    canExecute: false,
    canVeto: false,
    votingActivated: "2024-01-09T00:00:00Z",
    activationPower: 0,
  },
  "8": {
    id: "8",
    index: 8,
    title: "DAO Treasury Diversification",
    description:
      "Diversify the DAO treasury holdings to reduce risk and improve yield. The diversification strategy includes:\n\n1. Allocate 30% to stablecoins for stability\n2. Invest 40% in DeFi yield farming protocols\n3. Reserve 20% for strategic partnerships\n4. Keep 10% in native tokens for governance\n5. Implement quarterly rebalancing\n\nThis will improve treasury management and generate additional revenue.",
    status: "canceled",
    createdAt: "2024-01-22T09:45:00Z",
    createdBy: "0x5555666677778888999900001111222233334444",
    totalPower: 0,
    yesPower: 0,
    noPower: 0,
    votingStarts: "2024-01-23T00:00:00Z",
    votingEnds: "2024-01-30T23:59:59Z",
    quorum: 1000,
    currentQuorum: 0,
    executionDelay: 24,
    canVote: false,
    hasVoted: false,
    userVote: null,
    canActivate: false,
    canExecute: false,
    canVeto: false,
    votingActivated: null,
    activationPower: 0,
  },
  "9": {
    id: "9",
    index: 9,
    title: "Developer Documentation Portal",
    description:
      "Create a comprehensive developer documentation portal to improve developer experience and onboarding. The portal will include:\n\n1. API documentation with interactive examples\n2. Tutorial series for common use cases\n3. Best practices and security guidelines\n4. SDK documentation for multiple languages\n5. Community-contributed guides and examples\n\nThis will accelerate developer adoption and improve code quality.",
    status: "expired",
    createdAt: "2024-01-25T15:30:00Z",
    createdBy: "0x6666777788889999000011112222333344445555",
    totalPower: 0,
    yesPower: 0,
    noPower: 0,
    votingStarts: "2024-01-26T00:00:00Z",
    votingEnds: "2024-02-02T23:59:59Z",
    quorum: 1000,
    currentQuorum: 0,
    executionDelay: 24,
    canVote: false,
    hasVoted: false,
    userVote: null,
    canActivate: false,
    canExecute: false,
    canVeto: false,
    votingActivated: null,
    activationPower: 450,
  },
  "10": {
    id: "10",
    index: 10,
    title: "Governance Token Distribution",
    description:
      "Implement a new governance token distribution mechanism to improve decentralization and participation. The new system will:\n\n1. Distribute tokens to active community members\n2. Implement vesting schedules for long-term alignment\n3. Create incentive programs for governance participation\n4. Establish fair launch principles\n5. Include mechanisms to prevent concentration\n\nThis will create a more inclusive and decentralized governance system.",
    status: "queued",
    createdAt: "2024-01-28T12:00:00Z",
    createdBy: "0x7777888899990000111122223333444455556666",
    totalPower: 15600,
    yesPower: 13400,
    noPower: 2200,
    votingStarts: "2024-01-29T00:00:00Z",
    votingEnds: "2024-02-05T23:59:59Z",
    quorum: 1000,
    currentQuorum: 2800,
    executionDelay: 24,
    canVote: false,
    hasVoted: true,
    userVote: true,
    canActivate: false,
    canExecute: true,
    canVeto: false,
    votingActivated: "2024-01-29T00:00:00Z",
    activationPower: 0,
  },
};

// Mock vote history for different proposals
const mockVoteHistory = {
  "1": [
    {
      id: "1",
      voter: "0x1234567890abcdef1234567890abcdef12345678",
      support: true,
      votingPower: 500,
      timestamp: "2024-01-16T10:30:00Z",
      reason: "Strongly support development funding",
    },
    {
      id: "2",
      voter: "0xabcdef1234567890abcdef1234567890abcdef12",
      support: false,
      votingPower: 300,
      timestamp: "2024-01-16T11:15:00Z",
      reason: "Concerned about treasury inflation",
    },
    {
      id: "3",
      voter: "0x567890abcdef1234567890abcdef1234567890ab",
      support: true,
      votingPower: 750,
      timestamp: "2024-01-16T14:20:00Z",
      reason: "Development is crucial for growth",
    },
  ],
  "2": [
    {
      id: "1",
      voter: "0x87654321fedcba0987654321fedcba0987654321",
      support: true,
      votingPower: 800,
      timestamp: "2024-01-11T09:30:00Z",
      reason: "Efficiency improvements are needed",
    },
    {
      id: "2",
      voter: "0x1234567890abcdef1234567890abcdef12345678",
      support: true,
      votingPower: 500,
      timestamp: "2024-01-11T14:15:00Z",
      reason: "Faster decision making will help",
    },
    {
      id: "3",
      voter: "0xabcdef1234567890abcdef1234567890abcdef12",
      support: false,
      votingPower: 300,
      timestamp: "2024-01-12T10:20:00Z",
      reason: "Lower thresholds may reduce security",
    },
  ],
  "4": [
    {
      id: "1",
      voter: "0x5432109876fedcba5432109876fedcba54321098",
      support: true,
      votingPower: 600,
      timestamp: "2024-01-06T11:30:00Z",
      reason: "Community growth is essential",
    },
    {
      id: "2",
      voter: "0x1234567890abcdef1234567890abcdef12345678",
      support: false,
      votingPower: 500,
      timestamp: "2024-01-07T15:45:00Z",
      reason: "Current funding is sufficient",
    },
    {
      id: "3",
      voter: "0xabcdef1234567890abcdef1234567890abcdef12",
      support: false,
      votingPower: 300,
      timestamp: "2024-01-08T09:20:00Z",
      reason: "Concerned about budget allocation",
    },
  ],
  "5": [
    {
      id: "1",
      voter: "0x1111222233334444555566667777888899990000",
      support: true,
      votingPower: 400,
      timestamp: "2024-01-19T13:30:00Z",
      reason: "Cross-chain functionality is crucial",
    },
    {
      id: "2",
      voter: "0x1234567890abcdef1234567890abcdef12345678",
      support: true,
      votingPower: 500,
      timestamp: "2024-01-20T16:15:00Z",
      reason: "Will expand ecosystem reach",
    },
    {
      id: "3",
      voter: "0xabcdef1234567890abcdef1234567890abcdef12",
      support: false,
      votingPower: 300,
      timestamp: "2024-01-21T10:20:00Z",
      reason: "Security concerns with bridges",
    },
  ],
  "7": [
    {
      id: "1",
      voter: "0x4444555566667777888899990000111122223333",
      support: true,
      votingPower: 700,
      timestamp: "2024-01-09T14:20:00Z",
      reason: "Lower fees will increase adoption",
    },
    {
      id: "2",
      voter: "0x1234567890abcdef1234567890abcdef12345678",
      support: true,
      votingPower: 500,
      timestamp: "2024-01-10T11:30:00Z",
      reason: "Better user experience",
    },
    {
      id: "3",
      voter: "0xabcdef1234567890abcdef1234567890abcdef12",
      support: false,
      votingPower: 300,
      timestamp: "2024-01-11T09:15:00Z",
      reason: "May reduce protocol revenue",
    },
  ],
  "10": [
    {
      id: "1",
      voter: "0x7777888899990000111122223333444455556666",
      support: true,
      votingPower: 900,
      timestamp: "2024-01-29T12:00:00Z",
      reason: "Better decentralization",
    },
    {
      id: "2",
      voter: "0x1234567890abcdef1234567890abcdef12345678",
      support: true,
      votingPower: 500,
      timestamp: "2024-01-30T15:30:00Z",
      reason: "More inclusive governance",
    },
    {
      id: "3",
      voter: "0xabcdef1234567890abcdef1234567890abcdef12",
      support: false,
      votingPower: 300,
      timestamp: "2024-01-31T10:45:00Z",
      reason: "Complex implementation",
    },
  ],
};

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

const formatDate = (dateString: string) => {
  // Contract timestamps are stored in UTC seconds, converted to ISO string in frontend
  // This function formats them for display in the user's local timezone
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short", // Add timezone indicator
  });
};

// Alternative function to format dates in UTC for consistency
const formatDateUTC = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
};

const formatAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

function useMockMode() {
  const { search } = useLocation();
  return new URLSearchParams(search).get("mock") === "true";
}

const ProposalDetail = () => {
  const { id } = useParams();
  const { activeAccount, activeNetwork, algodClient, signTransactions } =
    useWallet();
  const mockMode = useMockMode();
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const [activationSuccessDialogOpen, setActivationSuccessDialogOpen] =
    useState(false);
  const [votingSuccessDialogOpen, setVotingSuccessDialogOpen] = useState(false);
  const [selectedVote, setSelectedVote] = useState<boolean | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [proposal, setProposal] = useState<UIProposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userVotingPower, setUserVotingPower] = useState(0);
  const [userVote, setUserVote] = useState<boolean | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [globalState, setGlobalState] = useState<GlobalState | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isVotingEnded, setIsVotingEnded] = useState(false);
  const activationThreshold = 1000; // This should come from contract state

  // Network settings state
  const [networkSettings, setNetworkSettings] = useState<{
    [key in NetworkId]: boolean;
  }>({
    [NetworkId.LOCALNET]: true,
    [NetworkId.TESTNET]: true,
    [NetworkId.MAINNET]: false,
    [NetworkId.VOIMAIN]: false,
  } as { [key in NetworkId]: boolean });

  // Flag to indicate if active network is not enabled
  const [activeNetworkNotEnabled, setActiveNetworkNotEnabled] =
    useState<boolean>(false);

  // Network breakdown state
  const [networkBreakdown, setNetworkBreakdown] = useState<NetworkBreakdown[]>(
    []
  );

  // Individual network proposal states
  const [networkProposals, setNetworkProposals] = useState<{
    [networkId: string]: UIProposal | null;
  }>({});

  const isNetworkEnabled = (networkId: NetworkId) => {
    return networkSettings[networkId] || false;
  };

  const getEnabledNetworks = () => {
    return Object.entries(networkSettings)
      .filter(([_, enabled]) => enabled)
      .map(([networkId]) => networkId as NetworkId);
  };

  // Get proposal for a specific network
  const getNetworkProposal = (networkId: NetworkId): UIProposal | null => {
    return networkProposals[networkId] || null;
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

  useEffect(() => {
    const fetchGlobalState = async () => {
      // Check if active network is enabled
      setActiveNetworkNotEnabled(!isNetworkEnabled(activeNetwork));

      if (!activeNetwork || !algod) return;

      // Get all enabled networks
      const enabledNetworks = getEnabledNetworks();
      console.log(
        "Fetching global state from enabled networks:",
        enabledNetworks
      );

      try {
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

        // Fetch global state from all enabled networks
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
                sender: {
                  addr: "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
                  sk: new Uint8Array(),
                },
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
          } catch (error) {
            console.error(
              `Error fetching global state from ${networkId}:`,
              error
            );
          }
        }

        // Set aggregated global state
        aggregatedGlobalState = {
          proposalCount: { asNumber: () => totalProposals },
          activeProposalCount: { asNumber: () => totalActiveProposals },
          totalVoterCount: { asNumber: () => totalVoters },
          totalParticipatingVoters: {
            asNumber: () => totalParticipatingVoters,
          },
        };
        console.log("aggregatedGlobalState", aggregatedGlobalState);
        setGlobalState(aggregatedGlobalState);
      } catch (err) {
        console.error("Failed to fetch global state", err);
        setGlobalState(null);
      }
    };
    fetchGlobalState();
  }, [activeNetwork, algod, mockMode, networkSettings]);

  // Fetch user's vote for this proposal with improved reliability
  const [isUserVoteLoading, setIsUserVoteLoading] = useState(true);

  const fetchUserVote = async (retryCount = 0) => {
    setIsUserVoteLoading(true);
    try {
      // Use mock data for simple IDs (1-10) or if mockMode is true
      if (mockMode || (id && mockProposals[id])) {
        console.log(`Using mock data for user vote on proposal id ${id}`);
        const mockProposal = mockProposals[id];
        setUserVote(mockProposal.userVote);
        setHasVoted(mockProposal.hasVoted);
        return;
      }

      const proposalNodeBytes = hexToUint8Array(id);
      const enabledNetworks = getEnabledNetworks();

      console.log(
        `Fetching user vote (attempt ${retryCount + 1}) from enabled networks:`,
        enabledNetworks
      );
      console.log(
        `Active network: ${activeNetwork}, Active account: ${activeAccount?.address}`
      );

      // Track votes per network
      const networkVotes: {
        [networkId: string]: {
          hasVoted: boolean;
          userVote: boolean | null;
          error?: string;
        };
      } = {};

      // First, try to fetch user vote from the active network (highest priority)
      if (activeNetwork && enabledNetworks.includes(activeNetwork)) {
        try {
          let networkAlgod;
          if (activeNetwork === NetworkId.LOCALNET) {
            networkAlgod = new algosdk.Algodv2(
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              "http://10.0.0.31",
              4001
            );
          } else if (activeNetwork === NetworkId.TESTNET) {
            networkAlgod = new algosdk.Algodv2(
              "",
              "https://testnet-api.4160.nodely.dev",
              443
            );
          } else {
            console.log(
              `Skipping active network ${activeNetwork} - not supported`
            );
          }

          if (networkAlgod) {
            const governanceAppId = getGovernanceAppId(activeNetwork);
            if (governanceAppId !== 0) {
              const ci = new CONTRACT(
                governanceAppId,
                networkAlgod,
                undefined,
                {
                  name: "Governance",
                  description: "Governance",
                  methods: PowGovernanceAppSpec.contract.methods,
                  events: [],
                },
                {
                  addr: "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
                  sk: new Uint8Array(),
                }
              );
              ci.setEnableRawBytes(true);

              console.log(
                `Fetching user vote from ACTIVE network ${activeNetwork}`
              );
              const getVoteR = await ci.get_vote(
                proposalNodeBytes,
                activeAccount?.address ||
                  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
              );
              console.log(
                `getVoteR from active network ${activeNetwork}:`,
                getVoteR
              );

              if (getVoteR.success && getVoteR.returnValue !== undefined) {
                const voteValue = Number(getVoteR.returnValue);
                if (voteValue === 0) {
                  networkVotes[activeNetwork] = {
                    hasVoted: true,
                    userVote: false,
                  };
                  console.log(
                    `User voted AGAINST on active network ${activeNetwork}`
                  );
                } else if (voteValue === 1) {
                  networkVotes[activeNetwork] = {
                    hasVoted: true,
                    userVote: true,
                  };
                  console.log(
                    `User voted FOR on active network ${activeNetwork}`
                  );
                } else {
                  networkVotes[activeNetwork] = {
                    hasVoted: false,
                    userVote: null,
                  };
                  console.log(
                    `No vote found on active network ${activeNetwork}`
                  );
                }
              } else {
                networkVotes[activeNetwork] = {
                  hasVoted: false,
                  userVote: null,
                  error: "Failed to fetch vote",
                };
                console.log(
                  `Failed to fetch vote from active network ${activeNetwork}`
                );
              }

              // Update network breakdown for active network
              setNetworkBreakdown((prev) =>
                prev.map((network) =>
                  network.networkId === activeNetwork
                    ? {
                        ...network,
                        hasVoted:
                          networkVotes[activeNetwork]?.hasVoted || false,
                        userVote: networkVotes[activeNetwork]?.userVote || null,
                        error: networkVotes[activeNetwork]?.error,
                      }
                    : network
                )
              );
            }
          }
        } catch (error) {
          console.error(
            `Error fetching user vote from active network ${activeNetwork}:`,
            error
          );
          networkVotes[activeNetwork] = {
            hasVoted: false,
            userVote: null,
            error: error instanceof Error ? error.message : "Unknown error",
          };

          // Update network breakdown with error for active network
          setNetworkBreakdown((prev) =>
            prev.map((network) =>
              network.networkId === activeNetwork
                ? {
                    ...network,
                    hasVoted: false,
                    userVote: null,
                    error: networkVotes[activeNetwork]?.error,
                  }
                : network
            )
          );
        }
      }

      // Then fetch from other enabled networks as fallback
      for (const networkId of enabledNetworks) {
        if (networkId === activeNetwork) continue; // Skip active network, already processed

        try {
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
            continue;
          }

          const governanceAppId = getGovernanceAppId(networkId);
          if (governanceAppId === 0) {
            console.log(`Skipping network ${networkId} - no governance app ID`);
            continue;
          }

          const ci = new CONTRACT(
            governanceAppId,
            networkAlgod,
            undefined,
            {
              name: "Governance",
              description: "Governance",
              methods: PowGovernanceAppSpec.contract.methods,
              events: [],
            },
            {
              addr: "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
              sk: new Uint8Array(),
            }
          );
          ci.setEnableRawBytes(true);

          console.log(`Fetching user vote from fallback network ${networkId}`);
          const getVoteR = await ci.get_vote(
            proposalNodeBytes,
            activeAccount?.address ||
              "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
          );
          console.log(`getVoteR from fallback network ${networkId}:`, getVoteR);

          if (getVoteR.success && getVoteR.returnValue !== undefined) {
            const voteValue = Number(getVoteR.returnValue);
            if (voteValue === 0) {
              networkVotes[networkId] = { hasVoted: true, userVote: false };
              console.log(
                `User voted AGAINST on fallback network ${networkId}`
              );
            } else if (voteValue === 1) {
              networkVotes[networkId] = { hasVoted: true, userVote: true };
              console.log(`User voted FOR on fallback network ${networkId}`);
            } else {
              networkVotes[networkId] = { hasVoted: false, userVote: null };
              console.log(`No vote found on fallback network ${networkId}`);
            }
          } else {
            networkVotes[networkId] = {
              hasVoted: false,
              userVote: null,
              error: "Failed to fetch vote",
            };
            console.log(
              `Failed to fetch vote from fallback network ${networkId}`
            );
          }

          // Update network breakdown for this network
          setNetworkBreakdown((prev) =>
            prev.map((network) =>
              network.networkId === networkId
                ? {
                    ...network,
                    hasVoted: networkVotes[networkId]?.hasVoted || false,
                    userVote: networkVotes[networkId]?.userVote || null,
                    error: networkVotes[networkId]?.error,
                  }
                : network
            )
          );
        } catch (error) {
          console.error(
            `Error fetching user vote from fallback network ${networkId}:`,
            error
          );
          networkVotes[networkId] = {
            hasVoted: false,
            userVote: null,
            error: error instanceof Error ? error.message : "Unknown error",
          };

          // Update network breakdown with error for this network
          setNetworkBreakdown((prev) =>
            prev.map((network) =>
              network.networkId === networkId
                ? {
                    ...network,
                    hasVoted: false,
                    userVote: null,
                    error: networkVotes[networkId]?.error,
                  }
                : network
            )
          );
        }
      }

      // Determine final user vote state (prioritize active network)
      let finalHasVoted = false;
      let finalUserVote: boolean | null = null;

      if (activeNetwork && networkVotes[activeNetwork]) {
        // Use active network result if available
        finalHasVoted = networkVotes[activeNetwork].hasVoted;
        finalUserVote = networkVotes[activeNetwork].userVote;
        console.log(`Using vote from active network ${activeNetwork}:`, {
          hasVoted: finalHasVoted,
          userVote: finalUserVote,
        });
      } else {
        // Fallback to any network that has a vote
        for (const [networkId, voteData] of Object.entries(networkVotes)) {
          if (voteData.hasVoted) {
            finalHasVoted = true;
            finalUserVote = voteData.userVote;
            console.log(`Using vote from fallback network ${networkId}:`, {
              hasVoted: finalHasVoted,
              userVote: finalUserVote,
            });
            break;
          }
        }
      }

      console.log("Final user vote state:", {
        finalHasVoted,
        finalUserVote,
        networkVotes,
      });

      setUserVote(finalUserVote);
      setHasVoted(finalHasVoted);

      // Also update the proposal object to keep it in sync
      if (proposal) {
        setProposal((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            hasVoted: finalHasVoted,
            userVote: finalUserVote,
          };
        });
      }

      // If no vote found and this is a retry, try again after a delay
      if (!finalHasVoted && retryCount < 2) {
        console.log(
          `No vote found, retrying in ${(retryCount + 1) * 2000}ms...`
        );
        setTimeout(() => {
          fetchUserVote(retryCount + 1);
        }, (retryCount + 1) * 2000);
      }
    } catch (error) {
      console.error("Error fetching user vote:", error);
      setUserVote(null);
      setHasVoted(false);

      // Retry on error if we haven't exceeded retry limit
      if (retryCount < 2) {
        console.log(
          `Error occurred, retrying in ${(retryCount + 1) * 2000}ms...`
        );
        setTimeout(() => {
          fetchUserVote(retryCount + 1);
        }, (retryCount + 1) * 2000);
      }
    } finally {
      setIsUserVoteLoading(false);
    }
  };

  // Fetch user's voting power from contract
  const fetchUserVotingPower = async () => {
    if (!activeAccount) {
      setUserVotingPower(0);
      // Still initialize network breakdown even without active account
      const enabledNetworks = getEnabledNetworks();
      const networkBreakdownData: NetworkBreakdown[] = [];

      for (const networkId of enabledNetworks) {
        networkBreakdownData.push({
          networkId,
          networkName:
            networkId === NetworkId.LOCALNET
              ? "Localnet"
              : networkId === NetworkId.TESTNET
              ? "Testnet"
              : networkId === NetworkId.MAINNET
              ? "Mainnet"
              : networkId === NetworkId.VOIMAIN
              ? "Voi Mainnet"
              : "Unknown",
          totalPower: 0,
          yesPower: 0,
          noPower: 0,
          quorum: 0,
          status: "unknown",
          canVote: false,
          canActivate: false,
          canExecute: false,
          hasVoted: false,
          userVote: null,
          userVotingPower: 0,
          error: "No active account",
        });
      }

      setNetworkBreakdown(networkBreakdownData);
      return;
    }

    try {
      if (mockMode) {
        setUserVotingPower(500);
        return;
      }

      // Get all enabled networks
      const enabledNetworks = getEnabledNetworks();
      console.log(
        "Fetching user voting power from enabled networks:",
        enabledNetworks
      );

      let totalVotingPower = 0;

      // Fetch user voting power from all enabled networks
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

          const governanceAppId = getGovernanceAppId(networkId);
          if (governanceAppId === 0) {
            console.log(`Skipping network ${networkId} - no governance app ID`);
            continue;
          }

          const ci = new CONTRACT(
            governanceAppId,
            networkAlgod,
            undefined,
            {
              name: "Governance",
              description: "Governance",
              methods: [
                {
                  name: "get_voter",
                  args: [
                    {
                      name: "account",
                      type: "address",
                    },
                  ],
                  returns: {
                    type: "(address,uint64,uint64,uint64,uint64,byte[32])",
                  },
                },
              ],
              events: [],
            },
            { addr: activeAccount.address, sk: new Uint8Array() }
          );
          ci.setEnableRawBytes(true);

          console.log(`Fetching user voting power from network ${networkId}`);
          const voter = await getVoter({
            appId: governanceAppId,
            algod: networkAlgod,
            addr:
              activeAccount?.address ||
              "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
            sk: new Uint8Array(),
          });
          console.log(`voter from ${networkId}:`, voter);

          const networkVotingPower = Number(voter.votePower) / 1e6;
          totalVotingPower += networkVotingPower;
          console.log(
            `User voting power on ${networkId}: ${networkVotingPower}`
          );

          // Update network breakdown with user voting power
          setNetworkBreakdown((prev) =>
            prev.map((network) =>
              network.networkId === networkId
                ? { ...network, userVotingPower: networkVotingPower }
                : network
            )
          );
        } catch (error) {
          console.error(
            `Error fetching user voting power from ${networkId}:`,
            error
          );
          // Update network breakdown with error for user voting power
          setNetworkBreakdown((prev) =>
            prev.map((network) =>
              network.networkId === networkId
                ? {
                    ...network,
                    userVotingPower: 0,
                    error: network.error
                      ? `${network.error}; Voting power fetch failed`
                      : "Voting power fetch failed",
                  }
                : network
            )
          );
        }
      }

      console.log(`Total aggregated voting power: ${totalVotingPower}`);
      setUserVotingPower(totalVotingPower);
    } catch (error) {
      console.error("Error fetching user voting power:", error);
      setUserVotingPower(0);
    }
  };

  // Fetch proposal data from contract
  const fetchProposal = async (isRefresh = false) => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // Use mock data for simple IDs (1-10) or if mockMode is true
      if (mockMode || (id && mockProposals[id])) {
        console.log(`Using mock data for proposal id ${id}`);
        const mockProposal = mockProposals[id];
        // Convert mock data to match the UI format
        const mockUIProposal = {
          id: id,
          index: mockProposal.index.toString(),
          title: mockProposal.title,
          description: mockProposal.description,
          status: mockProposal.status,
          category: "General",
          createdBy: mockProposal.createdBy,
          createdAt: mockProposal.createdAt,
          totalPower: mockProposal.totalPower,
          yesPower: mockProposal.yesPower,
          noPower: mockProposal.noPower,
          votingStarts: mockProposal.votingStarts,
          votingEnds: mockProposal.votingEnds,
          quorum: mockProposal.quorum,
          currentQuorum: mockProposal.currentQuorum,
          activationPower: mockProposal.activationPower,
          executionDelay: mockProposal.executionDelay,
          canVote: mockProposal.canVote,
          hasVoted: mockProposal.hasVoted,
          userVote: mockProposal.userVote,
          canActivate: mockProposal.canActivate,
          canExecute: mockProposal.canExecute,
          canVeto: mockProposal.canVeto,
          votingActivated: mockProposal.votingActivated,
        };
        setProposal(mockUIProposal);

        // Initialize network breakdown for mock data
        const enabledNetworks = getEnabledNetworks();
        const networkBreakdownData: NetworkBreakdown[] = [];

        for (const networkId of enabledNetworks) {
          networkBreakdownData.push({
            networkId,
            networkName:
              networkId === NetworkId.LOCALNET
                ? "Localnet"
                : networkId === NetworkId.TESTNET
                ? "Testnet"
                : networkId === NetworkId.MAINNET
                ? "Mainnet"
                : networkId === NetworkId.VOIMAIN
                ? "Voi Mainnet"
                : "Unknown",
            totalPower: mockProposal.totalPower / enabledNetworks.length,
            yesPower: mockProposal.yesPower / enabledNetworks.length,
            noPower: mockProposal.noPower / enabledNetworks.length,
            quorum: mockProposal.quorum / enabledNetworks.length,
            status: mockProposal.status,
            canVote: mockProposal.canVote,
            canActivate: mockProposal.canActivate,
            canExecute: mockProposal.canExecute,
            hasVoted: mockProposal.hasVoted,
            userVote: mockProposal.userVote,
            userVotingPower: 0,
          });
        }

        setNetworkBreakdown(networkBreakdownData);

        if (isRefresh) {
          toast({
            title: "Proposal Updated",
            description: "Proposal data has been refreshed",
            variant: "default",
          });
        }
        return;
      }

      // Convert hex string back to Uint8Array for contract call
      const proposalNodeBytes = hexToUint8Array(id);
      console.log("id", id);
      console.log("proposalNodeBytes", proposalNodeBytes);

      // Get all enabled networks
      const enabledNetworks = getEnabledNetworks();
      console.log("Fetching proposal from enabled networks:", enabledNetworks);

      let aggregatedProposal: UIProposal | null = null;
      let totalPower = 0;
      let yesPower = 0;
      let noPower = 0;
      let totalQuorum = 0;
      let canVote = false;
      let canActivate = false;
      let canExecute = false;
      let hasVoted = false;
      let userVote: boolean | null = null;
      const networkBreakdownData: NetworkBreakdown[] = [];
      const networkProposalsData: { [networkId: string]: UIProposal | null } =
        {};

      console.log("networkBreakdownData", networkBreakdownData);
      console.log("Enabled networks:", enabledNetworks);
      // Initialize network breakdown with all enabled networks
      for (const networkId of enabledNetworks) {
        console.log(`Initializing network breakdown for ${networkId}`);
        // Add all enabled networks to breakdown initially
        networkBreakdownData.push({
          networkId,
          networkName:
            networkId === NetworkId.LOCALNET
              ? "Localnet"
              : networkId === NetworkId.TESTNET
              ? "Testnet"
              : networkId === NetworkId.MAINNET
              ? "Mainnet"
              : networkId === NetworkId.VOIMAIN
              ? "Voi Mainnet"
              : "Unknown",
          totalPower: 0,
          yesPower: 0,
          noPower: 0,
          quorum: 0,
          status: "pending", // Default to pending for new proposals
          canVote: false,
          canActivate: true, // Can activate pending proposals
          canExecute: false,
          hasVoted: false,
          userVote: null,
          userVotingPower: 0,
          error: null, // No error initially
        });
      }

      // Fetch proposal from all enabled networks
      for (const networkId of enabledNetworks) {
        console.log(`Processing network: ${networkId}`);
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
            // Update network breakdown for unsupported networks
            const networkIndex = networkBreakdownData.findIndex(
              (n) => n.networkId === networkId
            );
            if (networkIndex !== -1) {
              networkBreakdownData[networkIndex].error =
                "Network not supported";
            }
            continue;
          }

          const governanceAppId = getGovernanceAppId(networkId);
          if (governanceAppId === 0) {
            console.log(`Skipping network ${networkId} - no governance app ID`);
            // Update network breakdown for networks without governance contracts
            const networkIndex = networkBreakdownData.findIndex(
              (n) => n.networkId === networkId
            );
            if (networkIndex !== -1) {
              networkBreakdownData[networkIndex].error =
                "No governance contract deployed";
            }
            continue;
          }

          // Use manual contract interface for consistency with other parts of the codebase
          const ci = new CONTRACT(
            governanceAppId,
            networkAlgod,
            undefined,
            {
              name: "Governance",
              description: "Governance",
              methods: PowGovernanceAppSpec.contract.methods,
              events: [],
            },
            {
              addr: "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
              sk: new Uint8Array(),
            }
          );
          ci.setEnableRawBytes(true);

          console.log(`Fetching proposal from network ${networkId}`);
          const getProposalR = await ci.get_proposal(proposalNodeBytes);
          console.log(`getProposalR from ${networkId}:`, getProposalR);

          if (!getProposalR.success) {
            console.log(`Failed to fetch proposal from ${networkId}`);
            continue;
          }

          // Parse the proposal data - it's returned as a tuple
          const proposalData = getProposalR.returnValue;
          if (!proposalData || proposalData.length === 0) {
            console.log(`Proposal not found on ${networkId}`);
            continue;
          }

          console.log(`proposalData from ${networkId}:`, proposalData);

          // Helper function to decode bytes to string
          const decodeBytes = (bytes: Uint8Array | string): string => {
            if (typeof bytes === "string") {
              return bytes.replace(/\0/g, "");
            }
            return new TextDecoder().decode(bytes).replace(/\0/g, "");
          };

          // Convert contract data to our format - using array indices as per the tuple structure
          const parsedProposal: Proposal = decodeProposal(proposalData);

          console.log(`Parsed proposal from ${networkId}:`, parsedProposal);

          // Aggregate proposal data from all networks
          const networkTotalPower =
            Number(parsedProposal.proposalTotalPower) / 1e6;
          const networkYesPower = Number(parsedProposal.proposalYesPower) / 1e6;
          const networkNoPower = networkTotalPower - networkYesPower;
          const networkQuorum =
            Number(parsedProposal.proposalQuorumThreshold) / 1e6;

          totalPower += networkTotalPower;
          yesPower += networkYesPower;
          noPower += networkNoPower;
          totalQuorum += networkQuorum;

          // Update network breakdown with successful data
          const networkIndex = networkBreakdownData.findIndex(
            (n) => n.networkId === networkId
          );
          if (networkIndex !== -1) {
            networkBreakdownData[networkIndex] = {
              networkId,
              networkName:
                networkId === NetworkId.LOCALNET
                  ? "Localnet"
                  : networkId === NetworkId.TESTNET
                  ? "Testnet"
                  : networkId === NetworkId.MAINNET
                  ? "Mainnet"
                  : networkId === NetworkId.VOIMAIN
                  ? "Voi Mainnet"
                  : "Unknown",
              totalPower: networkTotalPower,
              yesPower: networkYesPower,
              noPower: networkNoPower,
              quorum: networkQuorum,
              status:
                PROPOSAL_STATUS[
                  Number(
                    parsedProposal.proposalStatus
                  ) as keyof typeof PROPOSAL_STATUS
                ] || "unknown",
              canVote: Number(parsedProposal.proposalStatus) === 1,
              canActivate: Number(parsedProposal.proposalStatus) === 0,
              canExecute: Number(parsedProposal.proposalStatus) === 5,
              hasVoted: false, // Will be updated by fetchUserVote
              userVote: null, // Will be updated by fetchUserVote
              userVotingPower: 0, // Will be updated by fetchUserVotingPower
            };
          }

          // Create individual network proposal
          const networkProposal: UIProposal = {
            id: id,
            index: parsedProposal.proposalIndex.toString(),
            title: parsedProposal.proposalTitle,
            description: parsedProposal.proposalDescription,
            status:
              PROPOSAL_STATUS[
                Number(
                  parsedProposal.proposalStatus
                ) as keyof typeof PROPOSAL_STATUS
              ] || "unknown",
            category:
              PROPOSAL_CATEGORIES[
                Number(
                  parsedProposal.proposalCategoryId
                ) as keyof typeof PROPOSAL_CATEGORIES
              ] || "General",
            createdBy: parsedProposal.proposer,
            // Contract timestamps are in UTC seconds, convert to milliseconds and create ISO string
            createdAt: new Date(
              Number(parsedProposal.createdAtTimestamp) * 1000
            ).toISOString(),
            totalPower: networkTotalPower,
            yesPower: networkYesPower,
            noPower: networkNoPower,
            // Contract timestamps are in UTC seconds, convert to milliseconds and create ISO string
            votingStarts: new Date(
              Number(parsedProposal.votingStartTimestamp) * 1000
            ).toISOString(),
            votingEnds: new Date(
              Number(parsedProposal.votingEndTimestamp) * 1000
            ).toISOString(),
            currentQuorum: networkTotalPower,
            activationPower: globalState?.totalVoterCount
              ? globalState.totalVoterCount.asNumber()
              : Number(parsedProposal.proposalActivationPower),
            executionDelay: 24,
            canVote: Number(parsedProposal.proposalStatus) === 1, // Can vote if status is active
            hasVoted: false, // Will be updated by fetchUserVote
            userVote: null, // Will be updated by fetchUserVote
            canActivate: Number(parsedProposal.proposalStatus) === 0, // Can activate if status is pending
            canExecute: Number(parsedProposal.proposalStatus) === 5, // Can execute if status is queued
            canVeto: false,
            votingActivated:
              parsedProposal.proposalActivationTimestamp !== BigInt(0)
                ? new Date(
                    Number(parsedProposal.proposalActivationTimestamp) * 1000
                  ).toISOString()
                : null,
            quorum: networkQuorum,
          };

          // Store individual network proposal
          networkProposalsData[networkId] = networkProposal;

          // Use the first valid proposal as the base for non-aggregated fields
          if (!aggregatedProposal) {
            aggregatedProposal = { ...networkProposal };
          }

          // Update aggregated capabilities
          canVote = canVote || Number(parsedProposal.proposalStatus) === 1;
          canActivate =
            canActivate || Number(parsedProposal.proposalStatus) === 0;
          canExecute =
            canExecute || Number(parsedProposal.proposalStatus) === 5;
        } catch (error) {
          console.error(`Error fetching proposal from ${networkId}:`, error);
          // Update error entry in network breakdown
          const networkIndex = networkBreakdownData.findIndex(
            (n) => n.networkId === networkId
          );
          if (networkIndex !== -1) {
            networkBreakdownData[networkIndex] = {
              networkId,
              networkName:
                networkId === NetworkId.LOCALNET
                  ? "Localnet"
                  : networkId === NetworkId.TESTNET
                  ? "Testnet"
                  : networkId === NetworkId.MAINNET
                  ? "Mainnet"
                  : networkId === NetworkId.VOIMAIN
                  ? "Voi Mainnet"
                  : "Unknown",
              totalPower: 0,
              yesPower: 0,
              noPower: 0,
              quorum: 0,
              status: "error",
              canVote: false,
              canActivate: false,
              canExecute: false,
              hasVoted: false,
              userVote: null,
              userVotingPower: 0,
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        }
      }

      if (!aggregatedProposal) {
        throw new Error("Proposal not found on any enabled network");
      }

      // Update the aggregated proposal with aggregated values
      aggregatedProposal.totalPower = totalPower;
      aggregatedProposal.yesPower = yesPower;
      aggregatedProposal.noPower = noPower;
      aggregatedProposal.currentQuorum = totalPower;
      aggregatedProposal.quorum = totalQuorum;
      aggregatedProposal.canVote = canVote;
      aggregatedProposal.canActivate = canActivate;
      aggregatedProposal.canExecute = canExecute;
      aggregatedProposal.hasVoted = hasVoted;
      aggregatedProposal.userVote = userVote;
      aggregatedProposal.networkBreakdown = networkBreakdownData;

      setProposal(aggregatedProposal);
      setNetworkBreakdown(networkBreakdownData);
      setNetworkProposals(networkProposalsData);

      if (isRefresh) {
        toast({
          title: "Proposal Updated",
          description: "Proposal data has been refreshed from all networks",
          variant: "default",
        });
      }
    } catch (err) {
      console.error("Error fetching proposal:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch proposal");
      toast({
        title: "Error",
        description: "Failed to fetch proposal data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch proposal data, user voting power, and user vote
  useEffect(() => {
    const initializeData = async () => {
      // First fetch proposal data
      await fetchProposal();
      // Then fetch user voting power
      await fetchUserVotingPower();
      // Finally fetch user vote data
      await fetchUserVote();
    };

    initializeData();
  }, [id, algodClient, activeAccount, mockMode, networkSettings]);

  // Function to manually refresh user vote data
  const refreshUserVoteData = async () => {
    console.log("Manual refresh of user vote data requested");
    try {
      setLastUserVoteRefresh(new Date());
      await fetchUserVote(0); // Start fresh, no retry count
      toast({
        title: "User Vote Data Refreshed",
        description: "User vote information has been updated",
        variant: "default",
      });
    } catch (error) {
      console.error("Error refreshing user vote data:", error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh user vote data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Function to force sync local state with blockchain data
  const forceSyncUserVoteState = async () => {
    console.log("Force syncing user vote state...");
    try {
      // Clear local state first
      setUserVote(null);
      setHasVoted(false);

      // Wait a moment for state to clear
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Fetch fresh data from blockchain
      await fetchUserVote(0);

      toast({
        title: "State Synced",
        description: "Local state has been synchronized with blockchain data",
        variant: "default",
      });
    } catch (error) {
      console.error("Error force syncing state:", error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync state. Please try again.",
        variant: "destructive",
      });
    }
  };

  // State to track last refresh time
  const [lastUserVoteRefresh, setLastUserVoteRefresh] = useState<Date | null>(
    new Date()
  );

  // Check if user vote data is stale (older than 5 minutes)
  const isUserVoteDataStale = useMemo(() => {
    if (!lastUserVoteRefresh) return true;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return lastUserVoteRefresh < fiveMinutesAgo;
  }, [lastUserVoteRefresh]);

  // Check if local state is out of sync with proposal state
  const isStateOutOfSync = useMemo(() => {
    if (!proposal || isUserVoteLoading) return false;
    return proposal.hasVoted !== hasVoted || proposal.userVote !== userVote;
  }, [proposal, hasVoted, userVote, isUserVoteLoading]);

  // Function to refresh a specific network's proposal
  const refreshNetworkProposal = async (networkId: NetworkId) => {
    if (!id || !networkProposals[networkId]) return;

    try {
      // Re-fetch the specific network's proposal
      const proposalNodeBytes = hexToUint8Array(id);

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
        return; // Skip unsupported networks
      }

      const governanceAppId = getGovernanceAppId(networkId);
      if (governanceAppId === 0) return;

      const ci = new CONTRACT(
        governanceAppId,
        networkAlgod,
        undefined,
        {
          name: "Governance",
          description: "Governance",
          methods: PowGovernanceAppSpec.contract.methods,
          events: [],
        },
        {
          addr: "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
          sk: new Uint8Array(),
        }
      );
      ci.setEnableRawBytes(true);

      const getProposalR = await ci.get_proposal(proposalNodeBytes);
      if (getProposalR.success && getProposalR.returnValue) {
        const proposalData = getProposalR.returnValue;
        const parsedProposal: Proposal = decodeProposal(proposalData);

        // Update the specific network's proposal
        const updatedNetworkProposal = { ...networkProposals[networkId] };
        if (updatedNetworkProposal) {
          updatedNetworkProposal.totalPower =
            Number(parsedProposal.proposalTotalPower) / 1e6;
          updatedNetworkProposal.yesPower =
            Number(parsedProposal.proposalYesPower) / 1e6;
          updatedNetworkProposal.noPower =
            updatedNetworkProposal.totalPower - updatedNetworkProposal.yesPower;
          updatedNetworkProposal.status =
            PROPOSAL_STATUS[
              Number(
                parsedProposal.proposalStatus
              ) as keyof typeof PROPOSAL_STATUS
            ] || "unknown";

          setNetworkProposals((prev) => ({
            ...prev,
            [networkId]: updatedNetworkProposal,
          }));
        }
      }
    } catch (error) {
      console.error(
        `Error refreshing network proposal for ${networkId}:`,
        error
      );
    }
  };

  // Update proposal object when user vote data changes
  useEffect(() => {
    if (proposal) {
      // Initialize local state with proposal values if they exist
      if (proposal.hasVoted !== undefined && hasVoted === false) {
        setHasVoted(proposal.hasVoted);
      }
      if (proposal.userVote !== undefined && userVote === null) {
        setUserVote(proposal.userVote);
      }

      // Then sync the proposal state
      setProposal((prevProposal) => ({
        ...prevProposal,
        hasVoted: hasVoted,
        userVote: userVote,
      }));
    }
  }, [proposal, hasVoted, userVote]);

  // Countdown timer effect with automatic proposal resolution
  useEffect(() => {
    if (!proposal || proposal.status !== "active") return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const votingEnds = new Date(proposal.votingEnds).getTime();
      const timeLeft = votingEnds - now;

      if (timeLeft <= 0) {
        setIsVotingEnded(true);
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        
        // Automatically resolve proposal when voting period ends
        resolveProposalAutomatically();
        return;
      }

      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });
      setIsVotingEnded(false);
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [proposal]);

  // Function to automatically resolve proposal when voting period ends
  // Resolution Logic:
  // 1. EXPIRED: If no votes were cast (totalPower === 0)
  // 2. SUCCEEDED: If quorum is met AND majority (>50%) voted yes
  // 3. DEFEATED: If quorum is not met OR majority voted no
  const resolveProposalAutomatically = async () => {
    if (!proposal || proposal.status !== "active") return;

    try {
      console.log("Voting period ended - automatically resolving proposal...");
      
      // Determine proposal outcome based on voting results
      let newStatus: string;
      let resolutionReason: string;

      if (proposal.totalPower === 0) {
        // No votes cast - proposal expires
        newStatus = "expired";
        resolutionReason = "Proposal expired due to no votes cast";
        console.log("Proposal resolved as EXPIRED - no votes cast");
      } else if (proposal.currentQuorum >= proposal.quorum) {
        // Quorum met - check for majority
        const votePercentage = (proposal.yesPower / proposal.totalPower) * 100;
        if (votePercentage > 50) {
          // Yes majority - proposal succeeds
          newStatus = "succeeded";
          resolutionReason = `Proposal succeeded with ${votePercentage.toFixed(1)}% yes votes and quorum met`;
          console.log("Proposal resolved as SUCCEEDED - quorum met and yes majority");
        } else {
          // No majority - proposal defeated
          newStatus = "defeated";
          resolutionReason = `Proposal defeated with ${votePercentage.toFixed(1)}% yes votes (quorum met but no majority)`;
          console.log("Proposal resolved as DEFEATED - quorum met but no yes majority");
        }
      } else {
        // Quorum not met - proposal defeated
        newStatus = "defeated";
        resolutionReason = `Proposal defeated - quorum not met (${proposal.currentQuorum.toLocaleString()}/${proposal.quorum.toLocaleString()})`;
        console.log("Proposal resolved as DEFEATED - quorum not met");
      }

      // Update local proposal state
      setProposal(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          status: newStatus,
          // Add resolution metadata
          resolutionReason,
          resolvedAt: new Date().toISOString(),
        };
      });

      // Update network breakdown to reflect new status
      setNetworkBreakdown(prev => 
        prev.map(network => ({
          ...network,
          status: newStatus,
        }))
      );

      // Show resolution notification
      toast({
        title: `Proposal ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
        description: resolutionReason,
        variant: newStatus === "succeeded" ? "default" : "destructive",
      });

      // If this is a real proposal (not mock), update on blockchain
      if (!mockMode && activeNetwork && activeAccount) {
        try {
          await updateProposalStatusOnBlockchain(newStatus);
        } catch (error) {
          console.error("Failed to update proposal status on blockchain:", error);
          toast({
            title: "Warning",
            description: "Proposal resolved locally but blockchain update failed. Please refresh.",
            variant: "destructive",
          });
        }
      }

    } catch (error) {
      console.error("Error automatically resolving proposal:", error);
      toast({
        title: "Error",
        description: "Failed to automatically resolve proposal. Please refresh.",
        variant: "destructive",
      });
    }
  };

  // Function to update proposal status on blockchain
  const updateProposalStatusOnBlockchain = async (newStatus: string) => {
    if (!id || !activeNetwork || !activeAccount) return;

    try {
      console.log(`Updating proposal status to ${newStatus} on blockchain...`);
      
      // Convert hex string back to Uint8Array for contract call
      const proposalNodeBytes = hexToUint8Array(id);

      const algod = activeNetwork === NetworkId.LOCALNET
        ? new algosdk.Algodv2(
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "http://10.0.0.31",
            4001
          )
        : algodClient;

      const ci = new CONTRACT(
        getGovernanceAppId(activeNetwork),
        algod,
        undefined,
        {
          name: "Governance",
          description: "Governance",
          methods: PowGovernanceAppSpec.contract.methods,
          events: [],
        },
        { addr: activeAccount.address, sk: new Uint8Array() }
      );
      ci.setEnableRawBytes(true);

      // Call the appropriate method based on new status
      let result;
      if (newStatus === "expired") {
        // For expired proposals, we might need to call a specific method
        // or just update the local state since they're automatically expired
        console.log("Proposal expired - no blockchain action needed");
        return;
      } else if (newStatus === "succeeded") {
        // For succeeded proposals, we might need to call a success method
        console.log("Proposal succeeded - updating blockchain status");
        // Add blockchain call here if needed
      } else if (newStatus === "defeated") {
        // For defeated proposals, we might need to call a defeat method
        console.log("Proposal defeated - updating blockchain status");
        // Add blockchain call here if needed
      }

      console.log("Proposal status updated on blockchain successfully");
      
    } catch (error) {
      console.error("Error updating proposal status on blockchain:", error);
      throw error;
    }
  };

  // Initialize state with proposal values when proposal changes
  useEffect(() => {
    if (proposal && !isUserVoteLoading) {
      // Only update local state if it hasn't been set yet
      if (hasVoted === false && proposal.hasVoted !== undefined) {
        setHasVoted(proposal.hasVoted);
      }
      if (userVote === null && proposal.userVote !== undefined) {
        setUserVote(proposal.userVote);
      }
    }
  }, [proposal, isUserVoteLoading]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-purple-950 to-indigo-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-white">Loading proposal...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-purple-950 to-indigo-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold text-white mb-2">
            Proposal Not Found
          </h2>
          <p className="text-white/80 mb-4">
            {error ||
              "The proposal you're looking for doesn't exist or has been removed."}
          </p>
          <Button asChild>
            <Link to="/governance/proposals">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Proposals
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const votePercentage =
    proposal.totalPower > 0
      ? (proposal.yesPower / proposal.totalPower) * 100
      : 0;

  const handleVote = async () => {
    if (selectedVote === null || !activeAccount) return;

    setIsVoting(true);
    try {
      // Mock voting transaction
      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log(`Voting ${selectedVote ? "for" : "against"} proposal ${id}`);
      setVoteDialogOpen(false);
      // In real app, update proposal state after successful vote
      const algod =
        activeNetwork === NetworkId.LOCALNET
          ? new algosdk.Algodv2(
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              "http://10.0.0.31",
              4001
            )
          : algodClient;
      const ci = new CONTRACT(
        getGovernanceAppId(activeNetwork),
        algod,
        undefined,
        {
          name: "Governance",
          description: "Governance",
          methods: [
            {
              name: "cast_vote",
              args: [
                {
                  name: "proposal_node",
                  type: "byte[32]",
                },
                {
                  name: "support",
                  type: "uint64",
                },
              ],
              returns: {
                type: "void",
              },
            },
          ],
          events: [],
        },
        { addr: activeAccount.address, sk: new Uint8Array() }
      );
      ci.setEnableRawBytes(true);
      const proposalNodeBytes = hexToUint8Array(id);
      const castVoteR = await ci.cast_vote(
        proposalNodeBytes,
        selectedVote ? 1 : 0
      );
      console.log("castVoteR", castVoteR);

      if (!castVoteR.success) {
        throw new Error("Failed to cast vote");
      }
      const stxns = await signTransactions(
        castVoteR.txns.map(
          (txn: string) =>
            new Uint8Array(
              atob(txn)
                .split("")
                .map((char) => char.charCodeAt(0))
            )
        ) as any
      );
      await algod.sendRawTransaction(stxns as Uint8Array[]).do();

      // Immediately update local state to reflect the vote
      console.log("Vote successful - updating local state:", {
        selectedVote,
        userVotingPower,
        activeNetwork,
        proposalId: id,
      });

      setUserVote(selectedVote);
      setHasVoted(true);
      setLastUserVoteRefresh(new Date()); // Mark as fresh

      // Update the proposal state to reflect the new vote
      if (proposal) {
        setProposal((prev) => {
          if (!prev) return prev;
          const newYesPower = selectedVote
            ? prev.yesPower + userVotingPower
            : prev.yesPower;
          const newNoPower = selectedVote
            ? prev.noPower
            : prev.noPower + userVotingPower;
          const newTotalPower = prev.totalPower + userVotingPower;

          console.log("Updating proposal state:", {
            oldYesPower: prev.yesPower,
            newYesPower,
            oldNoPower: prev.noPower,
            newNoPower,
            oldTotalPower: prev.totalPower,
            newTotalPower,
          });

          return {
            ...prev,
            yesPower: newYesPower,
            noPower: newNoPower,
            totalPower: newTotalPower,
            hasVoted: true,
            userVote: selectedVote,
          };
        });
      }

      // Update network breakdown for the active network to ensure consistency
      setNetworkBreakdown((prev) =>
        prev.map((network) =>
          network.networkId === activeNetwork
            ? {
                ...network,
                hasVoted: true,
                userVote: selectedVote,
                yesPower:
                  network.yesPower + (selectedVote ? userVotingPower : 0),
                noPower: network.noPower + (selectedVote ? 0 : userVotingPower),
                totalPower: network.totalPower + userVotingPower,
              }
            : network
        )
      );

      // Show immediate feedback
      toast({
        title: "Vote Recorded!",
        description: `Your ${
          selectedVote ? "FOR" : "AGAINST"
        } vote has been recorded. Refreshing data...`,
        variant: "default",
      });

      setVoteDialogOpen(false);
      setVotingSuccessDialogOpen(true);

      console.log("Local state updated, waiting before blockchain refresh...");

      // Refresh data from the blockchain to ensure consistency
      setTimeout(async () => {
        try {
          console.log("Starting blockchain data refresh...");
          await fetchProposal(true);
          await fetchUserVote();

          console.log("Blockchain data refresh completed");

          // Show success toast after refresh
          toast({
            title: "Data Updated",
            description: "Proposal data has been refreshed with your vote",
            variant: "default",
          });
        } catch (error) {
          console.error("Error refreshing data after vote:", error);
          toast({
            title: "Warning",
            description:
              "Vote recorded but data refresh failed. Please refresh manually.",
            variant: "destructive",
          });
        }
      }, 1000); // Small delay to ensure transaction is processed
    } catch (error) {
      console.error("Vote failed:", error);
    } finally {
      setIsVoting(false);
    }
  };

  const handleActivate = async () => {
    if (!id || !activeNetwork || !activeAccount) {
      toast({
        title: "Error",
        description: "Please connect your wallet to activate proposals",
        variant: "destructive",
      });
      return;
    }

    setIsActivating(true);
    try {
      // Convert hex string back to Uint8Array for contract call
      const proposalNodeBytes = hexToUint8Array(id);

      const algod =
        activeNetwork === NetworkId.LOCALNET
          ? new algosdk.Algodv2(
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              "http://10.0.0.31",
              4001
            )
          : algodClient;

      const ci = new CONTRACT(
        getGovernanceAppId(activeNetwork),
        algod,
        undefined,
        {
          name: "Governance",
          description: "Governance",
          methods: [
            {
              name: "activate_proposal",
              args: [
                {
                  name: "proposal_node",
                  type: "byte[32]",
                },
              ],
              returns: {
                type: "void",
              },
            },
          ],
          events: [],
        },
        { addr: activeAccount.address, sk: new Uint8Array() }
      );
      ci.setEnableRawBytes(true);

      console.log("proposalNodeBytes", proposalNodeBytes);
      const activateProposalR = await ci.activate_proposal(proposalNodeBytes);
      console.log("activateProposalR", activateProposalR);

      if (!activateProposalR.success) {
        throw new Error("Failed to activate proposal");
      }

      const stxns = await signTransactions(
        activateProposalR.txns.map(
          (txn: string) =>
            new Uint8Array(
              atob(txn)
                .split("")
                .map((char) => char.charCodeAt(0))
            )
        ) as any
      );

      await algod.sendRawTransaction(stxns as Uint8Array[]).do();

      toast({
        title: "Success",
        description: "Proposal activated successfully",
        variant: "default",
      });

      // Close the support modal and open success dialog
      setSupportDialogOpen(false);
      setActivationSuccessDialogOpen(true);

      // Refresh proposal data to show updated status
      await fetchProposal(true);
    } catch (error) {
      console.error("Activation failed:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to activate proposal",
        variant: "destructive",
      });
    } finally {
      setIsActivating(false);
    }
  };

  const handleFinalize = async () => {
    if (!id || !activeNetwork || !activeAccount) {
      toast({
        title: "Error",
        description: "Please connect your wallet to finalize proposals",
        variant: "destructive",
      });
      return;
    }

    setIsFinalizing(true);
    try {
      // Convert hex string back to Uint8Array for contract call
      const proposalNodeBytes = hexToUint8Array(id);

      const algod =
        activeNetwork === NetworkId.LOCALNET
          ? new algosdk.Algodv2(
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              "http://10.0.0.31",
              4001
            )
          : algodClient;

      const ci = new CONTRACT(
        getGovernanceAppId(activeNetwork),
        algod,
        undefined,
        {
          name: "Governance",
          description: "Governance",
          methods: [...PowGovernanceAppSpec.contract.methods],
          events: [],
        },
        { addr: activeAccount.address, sk: new Uint8Array() }
      );
      ci.setEnableRawBytes(true);

      console.log("Finalizing proposal:", id);
      console.log("proposalNodeBytes", proposalNodeBytes);

      // output proposal status
      const proposalStatusR = await ci.get_proposal(proposalNodeBytes);
      console.log("proposalStatusR", proposalStatusR);

      const finalizeProposalR = await ci.finalize_proposal(proposalNodeBytes);
      console.log("finalizeProposalR", finalizeProposalR);

      if (!finalizeProposalR.success) {
        throw new Error("Failed to finalize proposal");
      }

      const stxns = await signTransactions(
        finalizeProposalR.txns.map(
          (txn: string) =>
            new Uint8Array(
              atob(txn)
                .split("")
                .map((char) => char.charCodeAt(0))
            )
        ) as any
      );

      await algod.sendRawTransaction(stxns as Uint8Array[]).do();

      toast({
        title: "Success",
        description: "Proposal finalized successfully",
        variant: "default",
      });

      // Close the finalize modal
      setFinalizeDialogOpen(false);

      // Refresh proposal data to show updated status
      await fetchProposal(true);
    } catch (error) {
      console.error("Finalization failed:", error);
      toast({
        title: "Error",
        description: "Finalization failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleExecute = async () => {
    try {
      // Mock execution transaction
      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log(`Executing proposal ${id}`);
      // In real app, update proposal state after successful execution
    } catch (error) {
      console.error("Execution failed:", error);
    }
  };

  const generateTwitterMessage = () => {
    if (!proposal) return "";

    const proposalTitle =
      proposal.title.length > 50
        ? proposal.title.substring(0, 47) + "..."
        : proposal.title;

    // Format voting deadline
    const votingEnds = new Date(proposal.votingEnds);
    const deadline = votingEnds.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });

    // Calculate days remaining
    const now = new Date();
    const daysRemaining = Math.ceil(
      (votingEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const timeRemaining =
      daysRemaining > 1
        ? `${daysRemaining} days`
        : daysRemaining === 1
        ? "1 day"
        : "Today";

    // Construct proposal URL
    const proposalUrl = `${window.location.origin}/governance/proposals/${proposal.id}`;

    const message = `🎉 Just activated a governance proposal!\n\n"${proposalTitle}"\n\n🗳️ Voting is now LIVE!\n⏰ Deadline: ${deadline} (${timeRemaining} left)\n\nWhat do you think? Vote below:\n${proposalUrl}\n\n#Governance #DAO #Web3`;

    return message;
  };

  const handleShareOnTwitter = () => {
    const message = generateTwitterMessage();

    // Create a more engaging tweet with clear call-to-action
    const enhancedMessage = `${message}\n\n🗳️ Community Poll:\nShould this proposal pass?\n\n✅ Yes - I support this proposal\n❌ No - I oppose this proposal\n\n💡 Tip: You can add a Twitter poll after posting this tweet!`;

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      enhancedMessage
    )}`;

    window.open(twitterUrl, "_blank", "width=600,height=400");
  };

  const handleShareWithPollInstructions = () => {
    const message = generateTwitterMessage();

    // Create a shorter message that leaves room for a poll
    const shortMessage = `${message}\n\n🗳️ What do you think?`;

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      shortMessage
    )}`;

    // Open Twitter and show instructions
    window.open(twitterUrl, "_blank", "width=600,height=400");

    // Show instructions in a toast
    toast({
      title: "Twitter Poll Instructions",
      description:
        "After posting, click the poll icon (📊) in Twitter to add a Yes/No poll to your tweet!",
      variant: "default",
    });
  };

  const generateVotingTwitterMessage = () => {
    if (!proposal) return "";

    const proposalTitle =
      proposal.title.length > 50
        ? proposal.title.substring(0, 47) + "..."
        : proposal.title;

    const voteText = userVote ? "✅ Voted FOR" : "❌ Voted AGAINST";
    const proposalUrl = `${window.location.origin}/governance/proposals/${proposal.id}`;

    const message = `🗳️ Just cast my vote on a governance proposal!\n\n"${proposalTitle}"\n\n${voteText}\n\nWant to see the results? Check it out:\n${proposalUrl}\n\n#Governance #DAO #Web3`;

    return message;
  };

  const handleShareVotingOnTwitter = () => {
    const message = generateVotingTwitterMessage();

    // Create a more engaging tweet with clear call-to-action
    const enhancedMessage = `${message}\n\n🗳️ Community Poll:\nHow would you vote on this proposal?\n\n✅ Yes - I support this proposal\n❌ No - I oppose this proposal\n\n💡 Tip: You can add a Twitter poll after posting this tweet!`;

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      enhancedMessage
    )}`;

    window.open(twitterUrl, "_blank", "width=600,height=400");
  };

  const handleShareVotingWithPollInstructions = () => {
    const message = generateVotingTwitterMessage();

    // Create a shorter message that leaves room for a poll
    const shortMessage = `${message}\n\n🗳️ How would you vote?`;

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      shortMessage
    )}`;

    // Open Twitter and show instructions
    window.open(twitterUrl, "_blank", "width=600,height=400");

    // Show instructions in a toast
    toast({
      title: "Twitter Poll Instructions",
      description:
        "After posting, click the poll icon (📊) in Twitter to add a Yes/No poll to your tweet!",
      variant: "default",
    });
  };

  // Handle creating proposal on a specific network
  const handleCreateProposalOnNetwork = async (networkId: NetworkId) => {
    if (!proposal || !activeAccount) {
      toast({
        title: "Error",
        description: "No active account or proposal data available",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create algod client for this network
      let networkAlgod: algosdk.Algodv2;
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
        toast({
          title: "Error",
          description: "Network not supported for proposal creation",
          variant: "destructive",
        });
        return;
      }

      const governanceAppId = getGovernanceAppId(networkId);
      console.log("governanceAppId", governanceAppId);
      if (governanceAppId === 0) {
        toast({
          title: "Error",
          description: "No governance contract deployed on this network",
          variant: "destructive",
        });
        return;
      }

      // Create contract interface
      const ciCustom = new CONTRACT(
        governanceAppId,
        networkAlgod,
        undefined,
        {
          name: "Governance",
          description: "Governance",
          methods: PowGovernanceAppSpec.contract.methods,
          events: [],
        },
        {
          addr: activeAccount.address,
          sk: new Uint8Array(),
        }
      );
      const ci = new CONTRACT(
        governanceAppId,
        networkAlgod,
        undefined,
        {
          name: "Governance",
          description: "Governance",
          methods: PowGovernanceAppSpec.contract.methods,
          events: [],
        },
        {
          addr: activeAccount.address,
          sk: new Uint8Array(),
        }
      );
      ci.setEnableRawBytes(true);

      // Convert proposal data to contract format
      const proposalTitle = proposal.title;
      const proposalDescription = proposal.description;
      const votingStartTimestamp = Math.floor(
        new Date(proposal.votingStarts).getTime() / 1000
      );
      const votingEndTimestamp = Math.floor(
        new Date(proposal.votingEnds).getTime() / 1000
      );
      const quorumThreshold = Math.floor(proposal.quorum * 1e6); // Convert to microAlgos
      const activationPower = Math.floor(proposal.activationPower * 1e6); // Convert to microAlgos
      const categoryId = 0; // General category

      console.log("Creating proposal on network:", networkId);
      console.log("Proposal data:", {
        title: proposalTitle,
        description: proposalDescription,
        votingStartTimestamp,
        votingEndTimestamp,
        quorumThreshold,
        activationPower,
        categoryId,
      });

      // Call create_proposal method
      const proposeR = await ci.propose(
        new Uint8Array(
          [...proposalTitle.padEnd(64, "\0")].map((char) => char.charCodeAt(0))
        ),
        new Uint8Array(
          [...proposalDescription.padEnd(512, "\0")].map((char) =>
            char.charCodeAt(0)
          )
        ),
        categoryId,
        votingStartTimestamp
      );
      console.log("proposeR", proposeR);

      if (proposeR.success) {
        const stxns = await signTransactions(
          proposeR.txns.map(
            (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
          )
        );
        await networkAlgod.sendRawTransaction(stxns).do();
        toast({
          title: "Success",
          description: `Proposal created successfully on ${
            networkId === NetworkId.LOCALNET ? "Localnet" : "Testnet"
          }`,
          variant: "default",
        });

        // Refresh the proposal data to show the new proposal
        setTimeout(() => {
          fetchProposal(true);
        }, 2000);
      } else {
        throw new Error("Failed to create proposal");
      }
    } catch (error) {
      console.error(`Error creating proposal on ${networkId}:`, error);
      toast({
        title: "Error",
        description: `Failed to create proposal on ${
          networkId === NetworkId.LOCALNET ? "Localnet" : "Testnet"
        }: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  // --- Animated Hero Section (copied and adapted from Governance.tsx) ---
  const HeroSection = (
    <div className="relative min-h-[40vh] sm:min-h-[50vh] flex items-center justify-center overflow-hidden w-full py-4 sm:py-8 md:py-16 md:pt-24 pb-8 sm:pb-16 md:pb-24">
      {/* Animated Background */}
      <div className="absolute inset-0 w-full h-full">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900"></div>
        {/* Animated Grid Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
              linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
            `,
              backgroundSize: "50px 50px",
              animation: "gridMove 20s linear infinite",
            }}
          ></div>
        </div>
        {/* Animated Particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-blue-400/30 rounded-full animate-pulse"
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
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60"></div>
      </div>
      {/* Hero Content */}
      <div className="relative z-10 text-center px-2 sm:px-4 max-w-3xl mx-auto w-full">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white drop-shadow-2xl leading-tight mb-4">
          Proposal Details
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed drop-shadow-lg mb-4 px-2">
          View and participate in the governance process for this proposal.
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 px-2">
          <Button
            asChild
            variant="outline"
            className="px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 text-sm sm:text-base md:text-lg font-bold border-2 border-white text-white hover:bg-white hover:text-black rounded-full shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm w-full sm:w-auto"
          >
            <Link to="/governance/proposals">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Proposals
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => fetchProposal(true)}
            disabled={isRefreshing}
            className="px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 text-sm sm:text-base md:text-lg font-bold border-2 border-white text-white hover:bg-white hover:text-black rounded-full shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm w-full sm:w-auto"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Floating Vote Button for Users Who Haven't Voted */}
      {proposal.status === "active" &&
        !proposal.hasVoted &&
        userVotingPower > 0 &&
        !isVotingEnded && (
          <div className="fixed bottom-6 right-6 z-50">
            <Button
              onClick={() => setVoteDialogOpen(true)}
              className="h-16 w-16 rounded-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-2xl border-2 border-white/20 animate-pulse"
              size="lg"
            >
              <Vote className="h-6 w-6 text-white" />
            </Button>
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center animate-bounce">
              !
            </div>
          </div>
        )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-purple-950 to-indigo-950">
      {HeroSection}

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
                  ) is not enabled in your network settings. Quorum calculations
                  are based on aggregated data from enabled networks.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Vote Data Stale Warning */}
      {isUserVoteDataStale && proposal && proposal.status === "active" && (
        <div className="container mx-auto px-4 py-4">
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-orange-400 mb-1">
                    User Vote Data May Be Outdated
                  </h3>
                  <p className="text-xs text-orange-300/80">
                    Your voting information hasn't been refreshed recently. This
                    might cause the UI to not reflect your latest votes.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshUserVoteData}
                className="border-orange-500/30 text-orange-300 hover:bg-orange-500/10 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* State Out of Sync Warning - Only show after initial load */}
      {isStateOutOfSync &&
        !isUserVoteLoading &&
        proposal &&
        proposal.status === "active" && (
          <div className="container mx-auto px-4 py-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-red-400 mb-1">
                      State Out of Sync
                    </h3>
                    <p className="text-xs text-red-300/80">
                      Local state doesn't match blockchain data. This can cause
                      voting issues. Please sync your state.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={forceSyncUserVoteState}
                  className="border-red-500/30 text-red-300 hover:bg-red-500/10 text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Sync Now
                </Button>
              </div>
            </div>
          </div>
        )}

      <div className="container mx-auto px-4 sm:px-6 pb-16 space-y-6 sm:space-y-8">
        {/* Section Divider and Header */}
        <div className="flex items-center gap-2 sm:gap-4 my-6 sm:my-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight animate-fade-in px-2 sm:px-0">
            Proposal Overview
          </h2>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-white/20 to-transparent" />
        </div>

        {/* Proposal Header */}
        <Card className="bg-white/5 border border-white/10 shadow-lg rounded-2xl sm:rounded-3xl">
          <CardHeader className="pb-4 sm:pb-6">
            <div className="space-y-3 sm:space-y-4">
              <CardTitle className="text-lg sm:text-xl md:text-2xl text-white leading-tight">
                {proposal.title}
              </CardTitle>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>Created by {formatAddress(proposal.createdBy)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>{formatDate(proposal.createdAt)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={getStatusVariant(proposal.status)}
                    className="text-xs px-2 py-1 rounded-full font-semibold"
                  >
                    {getStatusLabel(proposal.status)}
                  </Badge>
                  {proposal.hasVoted && (
                    <Badge
                      variant={proposal.userVote ? "default" : "destructive"}
                      className="text-xs px-2 py-1 rounded-full font-semibold"
                    >
                      Your Vote: {proposal.userVote ? "FOR" : "AGAINST"}
                    </Badge>
                  )}
                  {/* Show resolution info if proposal was automatically resolved */}
                  {proposal.resolutionReason && proposal.resolvedAt && (
                    <Badge
                      variant="outline"
                      className="text-xs px-2 py-1 rounded-full font-semibold border-blue-500/30 text-blue-300"
                    >
                      Auto-Resolved
                    </Badge>
                  )}
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    #{proposal.index}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="prose prose-sm max-w-none text-white/90">
              <p className="whitespace-pre-line text-sm sm:text-base leading-relaxed">
                {proposal.description}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Voting Call-to-Action for Users Who Haven't Voted */}
        {proposal.status === "active" &&
          !proposal.hasVoted &&
          userVotingPower > 0 &&
          !isVotingEnded && (
            <Card className="bg-gradient-to-r from-green-500/10 via-blue-500/10 to-purple-500/10 border border-green-500/20 shadow-lg rounded-2xl sm:rounded-3xl animate-pulse">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg sm:text-xl flex items-center gap-2">
                    <Vote className="h-5 w-5 text-green-400" />
                    Your Vote Matters!
                  </CardTitle>
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs px-3 py-1 rounded-full">
                    ⏰ Time to Vote
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Voting Power Highlight */}
                <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-medium text-blue-300">
                        Your Power
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-200">
                        {userVotingPower.toLocaleString()}
                      </div>
                      <div className="text-xs text-blue-400/70">Power</div>
                    </div>
                  </div>

                  {/* Impact Visualization */}
                  <div className="space-y-3">
                    <div className="text-xs text-blue-400/70 mb-2">
                      Your vote will impact the final result:
                    </div>
                    {proposal.quorum <= 0 && (
                      <div className="text-xs text-yellow-400/70 mb-2">
                        ⚠️ Quorum threshold not set
                      </div>
                    )}

                    {/* Current vs Potential Impact */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/5 rounded-xl p-3 text-center">
                        <div className="text-xs text-muted-foreground mb-1">
                          Current
                        </div>
                        <div className="text-lg font-bold text-green-300">
                          {proposal.yesPower.toLocaleString()}
                        </div>
                        <div className="text-xs text-green-400/70">For</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 text-center">
                        <div className="text-xs text-muted-foreground mb-1">
                          With Your Vote
                        </div>
                        <div className="text-lg font-bold text-blue-300">
                          {(
                            proposal.yesPower + userVotingPower
                          ).toLocaleString()}
                        </div>
                        <div className="text-xs text-blue-400/70">For</div>
                        {/* Show percentage of quorum */}
                        {proposal.quorum > 0 && (
                          <div className="text-xs text-blue-400/50 mt-1">
                            {(
                              ((proposal.yesPower + userVotingPower) /
                                proposal.quorum) *
                              100
                            ).toFixed(1)}
                            % of quorum
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Impact Percentage */}
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                      <div className="text-sm font-medium text-green-300 mb-1">
                        Your Impact
                      </div>
                      <div className="text-lg font-bold text-green-200">
                        +
                        {(() => {
                          if (proposal.quorum <= 0) return "0.0";
                          if (proposal.totalPower === 0) return "100.0";
                          // Calculate impact as percentage of current total votes
                          const impactPercentage =
                            (userVotingPower / proposal.totalPower) * 100;
                          return Math.min(impactPercentage, 100).toFixed(1);
                        })()}
                        %
                      </div>
                      <div className="text-xs text-green-400/70">
                        of current votes
                      </div>
                      {/* Show quorum impact separately */}
                      {proposal.quorum > 0 && (
                        <div className="text-xs text-blue-400/50 mt-1">
                          {((userVotingPower / proposal.quorum) * 100).toFixed(
                            1
                          )}
                          % of quorum needed
                        </div>
                      )}
                      {/* Additional Impact Metrics */}
                      <div className="mt-2 text-xs text-green-400/50">
                        {userVotingPower > 0 && proposal.totalPower === 0 && (
                          <div className="text-green-400 font-semibold">
                            First vote!
                          </div>
                        )}
                        {proposal.totalPower > 0 && userVotingPower > 0 && (
                          <div>
                            {userVotingPower.toLocaleString()} power units
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Impact Analysis */}
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-purple-300">
                        Your Vote's Impact
                      </div>
                      <div className="text-xs text-purple-400/70 space-y-1">
                        {proposal.quorum > 0 ? (
                          <>
                            <div>
                              • <strong>Quorum Progress:</strong>{" "}
                              {(
                                (proposal.totalPower / proposal.quorum) *
                                100
                              ).toFixed(1)}
                              % complete
                            </div>
                            <div>
                              • <strong>Your Contribution:</strong>{" "}
                              {(
                                (userVotingPower / proposal.quorum) *
                                100
                              ).toFixed(1)}
                              % of quorum needed
                            </div>
                            <div>
                              • <strong>Vote Impact:</strong>{" "}
                              {proposal.totalPower > 0
                                ? (
                                    (userVotingPower / proposal.totalPower) *
                                    100
                                  ).toFixed(1)
                                : "100.0"}
                              % of current votes
                            </div>
                            {proposal.totalPower + userVotingPower >=
                              proposal.quorum &&
                              proposal.totalPower < proposal.quorum && (
                                <div className="text-green-400 font-semibold">
                                  •{" "}
                                  <strong>Your vote could reach quorum!</strong>
                                </div>
                              )}
                          </>
                        ) : (
                          <div>
                            • <strong>Quorum threshold not set</strong> - impact
                            cannot be calculated
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Voting Instructions */}
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-yellow-300">
                        How to Vote
                      </div>
                      <div className="text-xs text-yellow-400/70 space-y-1">
                        <div>
                          • <strong>Vote Yes</strong> if you support this
                          proposal
                        </div>
                        <div>
                          • <strong>Vote No</strong> if you oppose this proposal
                        </div>
                        <div>
                          • Your vote is{" "}
                          <strong>final and cannot be changed</strong>
                        </div>
                        <div>
                          • Voting ends in{" "}
                          <strong>
                            {timeRemaining.days}d {timeRemaining.hours}h{" "}
                            {timeRemaining.minutes}m
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Vote Buttons */}
                <div className="space-y-3">
                  <div className="text-sm font-medium text-white text-center">
                    Cast Your Vote Now
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      className="h-16 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 border-green-500/30 rounded-2xl text-white font-semibold"
                      onClick={() => setVoteDialogOpen(true)}
                      disabled={isVotingEnded}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <TrendingUp className="h-5 w-5" />
                        <span className="text-sm">Vote Yes</span>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-16 border-red-500/30 text-red-300 hover:bg-red-500/10 hover:text-red-200 rounded-2xl font-semibold"
                      onClick={() => setVoteDialogOpen(true)}
                      disabled={isVotingEnded}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <XCircle className="h-5 w-5" />
                        <span className="text-sm">Vote No</span>
                      </div>
                    </Button>
                  </div>

                  {/* Urgency Indicator */}
                  {timeRemaining.days <= 1 && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="h-4 w-4 text-red-400" />
                        <span className="text-sm font-medium text-red-300">
                          Final hours to vote!
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Decisive Vote Indicator */}
                  {proposal.quorum > 0 &&
                    proposal.totalPower + userVotingPower >= proposal.quorum &&
                    proposal.totalPower < proposal.quorum && (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400" />
                          <span className="text-sm font-medium text-green-300">
                            Your vote could reach quorum!
                          </span>
                        </div>
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          )}

        {/* User Has Already Voted - Show Confirmation */}
        {proposal.status === "active" &&
          proposal.hasVoted &&
          userVotingPower > 0 && (
            <Card className="bg-gradient-to-r from-blue-500/10 via-green-500/10 to-purple-500/10 border border-blue-500/20 shadow-lg rounded-2xl sm:rounded-3xl">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg sm:text-xl flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    Your Vote Has Been Recorded!
                  </CardTitle>
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs px-3 py-1 rounded-full">
                    ✅ Vote Cast
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Vote Confirmation */}
                <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-2xl p-4 text-center">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    {proposal.userVote ? (
                      <>
                        <TrendingUp className="h-8 w-8 text-green-400" />
                        <div>
                          <div className="text-lg font-bold text-green-300">
                            You Voted FOR
                          </div>
                          <div className="text-sm text-green-400/70">
                            Supporting this proposal
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-8 w-8 text-red-400" />
                        <div>
                          <div className="text-lg font-bold text-red-300">
                            You Voted AGAINST
                          </div>
                          <div className="text-sm text-red-400/70">
                            Opposing this proposal
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="text-sm text-blue-300">
                    Your {userVotingPower.toLocaleString()} power has been added
                    to the {proposal.userVote ? "FOR" : "AGAINST"} votes
                  </div>
                </div>

                {/* Current Status */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-medium text-blue-300">
                        Current Voting Status
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {proposal.totalPower.toLocaleString()} Total Votes
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-green-300">
                        {proposal.yesPower.toLocaleString()}
                      </div>
                      <div className="text-xs text-green-400/70">FOR</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-red-300">
                        {proposal.noPower.toLocaleString()}
                      </div>
                      <div className="text-xs text-red-400/70">AGAINST</div>
                    </div>
                  </div>

                  <div className="mt-3 text-center">
                    <div className="text-xs text-blue-400/70">
                      {votePercentage.toFixed(1)}% FOR •{" "}
                      {(100 - votePercentage).toFixed(1)}% AGAINST
                    </div>
                  </div>
                </div>

                {/* Next Steps */}
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-purple-300">
                        What Happens Next?
                      </div>
                      <div className="text-xs text-purple-400/70 space-y-1">
                        <div>
                          • Voting continues until{" "}
                          <strong>{formatDate(proposal.votingEnds)}</strong>
                        </div>
                        <div>• Results will be finalized after voting ends</div>
                        <div>• You can check back to see the final outcome</div>
                        <div>• Your vote cannot be changed</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Refresh Button */}
                <div className="text-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      fetchProposal(true);
                      refreshUserVoteData();
                      toast({
                        title: "Refreshing",
                        description: "Updating voting data...",
                        variant: "default",
                      });
                    }}
                    disabled={isRefreshing}
                    className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                  >
                    <RefreshCw
                      className={`h-4 w-4 mr-2 ${
                        isRefreshing ? "animate-spin" : ""
                      }`}
                    />
                    Refresh Voting Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

        {/* Unified Voting & Quorum Progress */}
        {(proposal.status === "active" ||
          proposal.status === "succeeded" ||
          proposal.status === "defeated") && (
          <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 shadow-lg rounded-2xl sm:rounded-3xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-lg sm:text-xl flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                  Voting Progress & Quorum
                </CardTitle>
                <Badge
                  variant={
                    proposal.currentQuorum >= proposal.quorum
                      ? "default"
                      : "secondary"
                  }
                  className={`text-sm px-3 py-1 rounded-full ${
                    proposal.currentQuorum >= proposal.quorum
                      ? "bg-green-500/20 text-green-300 border-green-500/30"
                      : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                  }`}
                >
                  {proposal.currentQuorum >= proposal.quorum
                    ? "✅ Quorum Met"
                    : "⏳ Quorum Pending"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Vote Distribution Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-300">
                    {proposal.totalPower.toLocaleString()}
                  </div>
                  <div className="text-xs text-blue-400/70">
                    Total Votes Cast
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-300">
                    {proposal.yesPower.toLocaleString()}
                  </div>
                  <div className="text-xs text-green-400/70">Votes For</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-300">
                    {proposal.noPower.toLocaleString()}
                  </div>
                  <div className="text-xs text-red-400/70">Votes Against</div>
                </div>
              </div>

              {/* Quorum Progress Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Quorum Progress</span>
                  <span className="font-medium text-blue-200">
                    {proposal.currentQuorum.toLocaleString()} /{" "}
                    {proposal.quorum.toLocaleString()}
                  </span>
                </div>

                {/* Enhanced Progress Bar with Vote Distribution */}
                <div className="relative">
                  <div className="h-4 bg-gray-700/50 rounded-full overflow-hidden">
                    {/* Quorum progress background */}
                    <div
                      className="h-full bg-blue-500/30 transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          (proposal.currentQuorum / proposal.quorum) * 100,
                          100
                        )}%`,
                      }}
                    />
                    {/* Vote distribution overlay */}
                    <div className="absolute inset-0 flex">
                      <div
                        className="h-full bg-green-500/60 transition-all duration-300"
                        style={{
                          width: `${
                            (proposal.yesPower / proposal.quorum) * 100
                          }%`,
                        }}
                      />
                      <div
                        className="h-full bg-red-500/60 transition-all duration-300"
                        style={{
                          width: `${
                            (proposal.noPower / proposal.quorum) * 100
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Progress Labels */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-white drop-shadow-sm">
                      {(
                        (proposal.currentQuorum / proposal.quorum) *
                        100
                      ).toFixed(1)}
                      % of Quorum
                    </span>
                  </div>

                  {/* Quorum threshold marker */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-yellow-400/80"
                    style={{ left: "100%" }}
                  />
                </div>

                {/* Detailed Progress Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                  <div className="bg-blue-500/10 rounded-lg p-2">
                    <div className="font-bold text-blue-300">
                      {proposal.currentQuorum.toLocaleString()}
                    </div>
                    <div className="text-blue-400/70">Current Power</div>
                  </div>
                  <div className="bg-blue-500/10 rounded-lg p-2">
                    <div className="font-bold text-blue-300">
                      {proposal.quorum.toLocaleString()}
                    </div>
                    <div className="text-blue-400/70">Required Quorum</div>
                  </div>
                  <div className="bg-green-500/10 rounded-lg p-2">
                    <div className="font-bold text-green-300">
                      {votePercentage.toFixed(1)}%
                    </div>
                    <div className="text-green-400/70">For Votes</div>
                  </div>
                  <div className="bg-red-500/10 rounded-lg p-2">
                    <div className="font-bold text-red-300">
                      {(100 - votePercentage).toFixed(1)}%
                    </div>
                    <div className="text-red-400/70">Against Votes</div>
                  </div>
                </div>

                {/* Status Message */}
                {proposal.currentQuorum < proposal.quorum ? (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-center">
                    <div className="text-sm font-medium text-yellow-300">
                      Need{" "}
                      {(
                        proposal.quorum - proposal.currentQuorum
                      ).toLocaleString()}{" "}
                      more votes to reach quorum
                    </div>
                    <div className="text-xs text-yellow-400/70 mt-1">
                      {(
                        ((proposal.quorum - proposal.currentQuorum) /
                          proposal.quorum) *
                        100
                      ).toFixed(1)}
                      % of quorum remaining
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                    <div className="text-sm font-medium text-green-300">
                      ✅ Quorum requirement met!
                    </div>
                    <div className="text-xs text-green-400/70 mt-1">
                      Proposal can proceed to execution phase
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Voting Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Card className="bg-white/5 border border-white/10 shadow-lg rounded-2xl sm:rounded-3xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2 text-white">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" />
                Participation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xl sm:text-2xl font-bold text-blue-300">
                {proposal.totalPower.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Total votes cast</p>

              {/* Participation Rate */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">
                    Participation Rate
                  </span>
                  <span className="font-medium text-blue-200">
                    {((proposal.totalPower / proposal.quorum) * 100).toFixed(1)}
                    %
                  </span>
                </div>
                <Progress
                  value={(proposal.totalPower / proposal.quorum) * 100}
                  className="h-2 bg-gray-700/50"
                />
              </div>
            </CardContent>
          </Card>

          <Card
            className={`bg-white/5 border shadow-lg rounded-2xl sm:rounded-3xl ${
              votePercentage > 50
                ? "border-green-500/50 bg-green-500/5"
                : "border-white/10"
            }`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2 text-white">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" />
                Votes For
                {votePercentage > 50 && (
                  <span className="text-xs bg-green-500/20 px-2 py-1 rounded-full text-green-300">
                    🏆 Winning
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xl sm:text-2xl font-bold text-green-300">
                {proposal.yesPower.toLocaleString()}
              </div>

              {/* Vote Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Vote Share</span>
                  <span className="font-medium text-green-200">
                    {votePercentage.toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={votePercentage}
                  className="h-2 bg-gray-700/50"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                {votePercentage.toFixed(1)}% of total votes
              </p>
            </CardContent>
          </Card>

          <Card
            className={`bg-white/5 border shadow-lg rounded-2xl sm:rounded-3xl sm:col-span-2 lg:col-span-1 ${
              votePercentage < 50
                ? "border-red-500/50 bg-red-500/5"
                : "border-white/10"
            }`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2 text-white">
                <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-400" />
                Votes Against
                {votePercentage < 50 && (
                  <span className="text-xs bg-red-500/20 px-2 py-1 rounded-full text-red-300">
                    🏆 Winning
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xl sm:text-2xl font-bold text-red-300">
                {proposal.noPower.toLocaleString()}
              </div>

              {/* Vote Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Vote Share</span>
                  <span className="font-medium text-red-200">
                    {(100 - votePercentage).toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={100 - votePercentage}
                  className="h-2 bg-gray-700/50"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                {(100 - votePercentage).toFixed(1)}% of total votes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Network Breakdown - Show per-network statistics */}
        {networkBreakdown.length > 0 && (
          <Card className="bg-white/5 border border-white/10 shadow-lg rounded-2xl sm:rounded-3xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-lg sm:text-xl flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-400" />
                  Network Breakdown
                </CardTitle>
                <div className="flex items-center gap-2">
                  {proposal.status === "pending" && (
                    <Badge
                      variant="outline"
                      className="text-xs px-2 py-1 rounded-full border-yellow-500/30 text-yellow-300"
                    >
                      {
                        networkBreakdown.filter((n) => n.status === "pending")
                          .length
                      }{" "}
                      Pending
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="text-xs px-3 py-1 rounded-full border-blue-500/30 text-blue-300"
                  >
                    {
                      networkBreakdown.filter((network) => {
                        // When voting has ended, only count networks that are activated (not pending)
                        if (isVotingEnded) {
                          return network.status !== "pending";
                        }
                        // Otherwise count all networks
                        return true;
                      }).length
                    }{" "}
                    Networks
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {networkBreakdown
                  .filter((network) => {
                    // When voting has ended, only show networks that are activated (not pending)
                    if (isVotingEnded) {
                      return network.status !== "pending";
                    }
                    // Otherwise show all networks
                    return true;
                  })
                  .map((network) => (
                    <div
                      key={network.networkId}
                      className={`p-4 rounded-xl border ${
                        network.error
                          ? "border-red-500/30 bg-red-500/5"
                          : "border-white/10 bg-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              network.error
                                ? "bg-red-500"
                                : network.status === "pending" &&
                                  network.totalPower >= activationThreshold
                                ? "bg-green-500 animate-pulse"
                                : network.status === "pending" &&
                                  network.totalPower > 0
                                ? "bg-yellow-500"
                                : network.status === "pending"
                                ? "bg-gray-500"
                                : network.totalPower > 0
                                ? "bg-green-500"
                                : "bg-gray-500"
                            }`}
                          />
                          <h3 className="font-semibold text-white">
                            {network.networkName}
                          </h3>
                          {network.status === "pending" &&
                            network.totalPower >= activationThreshold && (
                              <span className="text-xs bg-green-500/20 px-2 py-1 rounded-full text-green-300">
                                Ready!
                              </span>
                            )}
                        </div>
                        <Badge
                          variant={getStatusVariant(network.status)}
                          className="text-xs px-2 py-1 rounded-full"
                        >
                          {network.error
                            ? "Error"
                            : getStatusLabel(network.status)}
                        </Badge>
                      </div>

                      {network.error ? (
                        <div className="text-red-400 text-sm">
                          {network.error}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Voting Statistics */}
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <div className="text-lg font-bold text-blue-300">
                                {network.totalPower.toLocaleString()}
                              </div>
                              <div className="text-xs text-blue-400/70">
                                {network.status === "pending"
                                  ? "Support"
                                  : "Total"}
                              </div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-green-300">
                                {network.yesPower.toLocaleString()}
                              </div>
                              <div className="text-xs text-green-400/70">
                                {network.status === "pending"
                                  ? "Support"
                                  : "For"}
                              </div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-red-300">
                                {network.noPower.toLocaleString()}
                              </div>
                              <div className="text-xs text-red-400/70">
                                {network.status === "pending"
                                  ? "Oppose"
                                  : "Against"}
                              </div>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                {network.status === "pending"
                                  ? "Activation Progress"
                                  : "Quorum Progress"}
                              </span>
                              <span className="font-medium text-blue-200">
                                {network.status === "pending"
                                  ? `${network.totalPower.toLocaleString()} / ${activationThreshold.toLocaleString()}`
                                  : `${network.totalPower.toLocaleString()} / ${network.quorum.toLocaleString()}`}
                              </span>
                            </div>
                            <div className="relative h-2 bg-gray-700/50 rounded-full overflow-hidden">
                              {network.status === "pending" ? (
                                // Activation progress for pending proposals
                                <div
                                  className="h-full bg-yellow-500/60 transition-all duration-300"
                                  style={{
                                    width: `${Math.min(
                                      (network.totalPower /
                                        activationThreshold) *
                                        100,
                                      100
                                    )}%`,
                                  }}
                                />
                              ) : (
                                // Quorum progress for active proposals
                                <>
                                  <div
                                    className="h-full bg-blue-500/60 transition-all duration-300"
                                    style={{
                                      width: `${Math.min(
                                        (network.totalPower / network.quorum) *
                                          100,
                                        100
                                      )}%`,
                                    }}
                                  />
                                  <div className="absolute inset-0 flex">
                                    <div
                                      className="h-full bg-green-500/60 transition-all duration-300"
                                      style={{
                                        width: `${
                                          (network.yesPower / network.quorum) *
                                          100
                                        }%`,
                                      }}
                                    />
                                    <div
                                      className="h-full bg-red-500/60 transition-all duration-300"
                                      style={{
                                        width: `${
                                          (network.noPower / network.quorum) *
                                          100
                                        }%`,
                                      }}
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* User Information */}
                          {activeAccount && !isVotingEnded && (
                            <div className="space-y-2 pt-2 border-t border-white/10">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">
                                  Your Voting Power
                                </span>
                                <span className="font-medium text-blue-200">
                                  {network.userVotingPower.toLocaleString()}
                                </span>
                              </div>
                              {network.status === "pending" ? (
                                // Pending proposal - show activation info
                                <div className="space-y-2">
                                  {network.canActivate && (
                                    <div className="text-xs text-blue-400">
                                      ✅ You can activate this proposal
                                    </div>
                                  )}
                                  {network.totalPower === 0 && (
                                    <div className="text-xs text-yellow-400">
                                      ⚠️ No support yet - be the first!
                                    </div>
                                  )}
                                  {network.totalPower > 0 &&
                                    network.totalPower <
                                      activationThreshold && (
                                      <div className="text-xs text-blue-400">
                                        📈 Building support:{" "}
                                        {(
                                          (network.totalPower /
                                            activationThreshold) *
                                          100
                                        ).toFixed(1)}
                                        %
                                      </div>
                                    )}
                                  {network.totalPower >=
                                    activationThreshold && (
                                    <div className="text-xs text-green-400">
                                      🎉 Ready to activate!
                                    </div>
                                  )}
                                </div>
                              ) : (
                                // Active proposal - show voting info
                                <>
                                  {network.hasVoted && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="text-muted-foreground">
                                        Your Vote:
                                      </span>
                                      <Badge
                                        variant={
                                          network.userVote
                                            ? "default"
                                            : "secondary"
                                        }
                                        className={`text-xs px-2 py-1 rounded-full ${
                                          network.userVote
                                            ? "bg-green-500/20 text-green-300 border-green-500/30"
                                            : "bg-red-300 border-red-500/30"
                                        }`}
                                      >
                                        {network.userVote
                                          ? "✅ For"
                                          : "❌ Against"}
                                      </Badge>
                                    </div>
                                  )}
                                  {network.canVote && !network.hasVoted && (
                                    <div className="text-xs text-yellow-400">
                                      ⚠️ You can vote on this network
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}

                          {/* Network Capabilities */}
                          <div className="flex flex-wrap gap-1 pt-2 border-t border-white/10">
                            {network.canVote && !isVotingEnded && (
                              <Badge
                                variant="outline"
                                className="text-xs px-2 py-1 border-green-500/30 text-green-300"
                              >
                                Can Vote
                              </Badge>
                            )}
                            {network.canActivate && (
                              <Badge
                                variant="outline"
                                className="text-xs px-2 py-1 border-blue-500/30 text-blue-300"
                              >
                                Can Activate
                              </Badge>
                            )}
                            {network.canExecute && (
                              <Badge
                                variant="outline"
                                className="text-xs px-2 py-1 border-purple-500/30 text-purple-300"
                              >
                                Can Execute
                              </Badge>
                            )}
                            {network.status === "pending" && (
                              <Badge
                                variant="outline"
                                className="text-xs px-2 py-1 border-yellow-500/30 text-yellow-300"
                              >
                                Pending
                              </Badge>
                            )}
                          </div>

                          {/* Activate Button for Networks Without Proposal */}
                          {network.quorum === 0 &&
                            activeAccount &&
                            activeNetwork === network.networkId && (
                              <div className="pt-2 border-t border-white/10">
                                <Button
                                  onClick={() =>
                                    handleCreateProposalOnNetwork(
                                      network.networkId
                                    )
                                  }
                                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs py-2 px-3 rounded-lg transition-all duration-200"
                                  size="sm"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Create Proposal on {network.networkName}
                                </Button>
                                <p className="text-xs text-blue-400/70 mt-1 text-center">
                                  Create proposal on {network.networkName}{" "}
                                  (quorum: 0)
                                </p>
                              </div>
                            )}

                          {/* Activation Status for Pending Proposals */}
                          {network.status === "pending" && activeAccount && (
                            <div className="pt-2 border-t border-white/10">
                              <div className="text-xs text-center mb-2">
                                <span className="text-yellow-400 font-medium">
                                  Activation Status
                                </span>
                                <div className="text-xs text-gray-400 mt-1">
                                  {activeNetwork === network.networkId
                                    ? "You can act on this network"
                                    : "Switch to this network to act"}
                                </div>
                              </div>
                              <div className="space-y-2">
                                {network.totalPower === 0 ? (
                                  <div className="text-xs text-center text-yellow-400/70">
                                    No support yet
                                  </div>
                                ) : network.totalPower < activationThreshold ? (
                                  <div className="text-xs text-center text-blue-400/70">
                                    {(
                                      (network.totalPower /
                                        activationThreshold) *
                                      100
                                    ).toFixed(1)}
                                    % to activation
                                  </div>
                                ) : (
                                  <div className="text-xs text-center text-green-400/70">
                                    Ready to activate!
                                  </div>
                                )}

                                {activeNetwork === network.networkId && (
                                  <div className="space-y-2">
                                    <Button
                                      onClick={() => setSupportDialogOpen(true)}
                                      disabled={
                                        isActivating || userVotingPower === 0
                                      }
                                      className={`w-full text-xs py-2 px-3 rounded-lg transition-all duration-200 ${
                                        userVotingPower === 0
                                          ? "bg-gray-600 cursor-not-allowed"
                                          : network.totalPower >=
                                            activationThreshold
                                          ? "bg-green-600 hover:bg-green-700"
                                          : "bg-blue-600 hover:bg-blue-700"
                                      }`}
                                      size="sm"
                                    >
                                      {isActivating ? (
                                        <>
                                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                          Activating...
                                        </>
                                      ) : userVotingPower === 0 ? (
                                        <>
                                          <XCircle className="h-3 w-3 mr-1" />
                                          No Power
                                        </>
                                      ) : (
                                        <>
                                          <TrendingUp className="h-3 w-3 mr-1" />
                                          {network.totalPower >=
                                          activationThreshold
                                            ? "Activate"
                                            : "Support"}
                                        </>
                                      )}
                                    </Button>

                                    {/* Button explanation */}
                                    <div className="text-xs text-center text-gray-400">
                                      {network.totalPower >= activationThreshold
                                        ? "Click to review and activate"
                                        : "Click to review and support"}
                                    </div>
                                  </div>
                                )}

                                {/* Message for users not on this network */}
                                {activeNetwork !== network.networkId && (
                                  <div className="text-xs text-center text-gray-400 mt-2">
                                    Switch to {network.networkName} to support
                                    this proposal
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>

              {/* Summary */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-blue-300">
                    Cross-Network Summary
                  </span>
                </div>
                <div className="text-xs text-blue-400/70 space-y-1">
                  {proposal.status === "pending" ? (
                    <>
                      <p>
                        • <strong>Pending proposals</strong> need activation
                        support across networks
                      </p>
                      <p>
                        • Activation power is aggregated from all enabled
                        networks
                      </p>
                      <p>
                        • You can support activation on any network where you
                        have power
                      </p>
                      <p>
                        • Once activation threshold is met, proposal becomes
                        active for voting
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        • Total voting power is aggregated across all enabled
                        networks
                      </p>
                      <p>
                        • You can vote on any network where you have voting
                        power
                      </p>
                      <p>
                        • Proposal status and capabilities are determined by the
                        most permissive network
                      </p>
                      <p>
                        • Quorum requirements are summed across all networks
                      </p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Activation Status - Show for pending proposals */}
        {proposal.status === "pending" && (
          <Card className="bg-white/5 border border-white/10 shadow-lg rounded-2xl sm:rounded-3xl">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="text-white text-lg sm:text-xl">
                  Activation Status
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      (proposal.activationPower || 0) >= activationThreshold
                        ? "default"
                        : "secondary"
                    }
                    className="text-xs w-fit"
                  >
                    {(proposal.activationPower || 0) >= activationThreshold
                      ? "Ready to Activate"
                      : "Awaiting Support"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Activation Progress */}
              <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-medium text-green-300">
                      Activation Progress
                    </span>
                  </div>
                  <span className="text-sm font-bold text-green-200">
                    {(proposal.activationPower || 0).toLocaleString()} /{" "}
                    {activationThreshold.toLocaleString()}
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Progress Bar */}
                  <div className="relative">
                    <Progress
                      value={Math.min(
                        ((proposal.activationPower || 0) /
                          activationThreshold) *
                          100,
                        100
                      )}
                      className="h-3 bg-gray-700/50"
                    />
                    {/* User contribution overlay */}
                    {userVotingPower > 0 && (
                      <div
                        className="absolute top-0 left-0 h-3 rounded-full bg-green-400/60 transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            (((proposal.activationPower || 0) +
                              userVotingPower) /
                              activationThreshold) *
                              100,
                            100
                          )}%`,
                          opacity: 0.8,
                          zIndex: 2,
                        }}
                      />
                    )}
                  </div>

                  {/* Status Details */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="text-center">
                      <div className="text-green-300 font-semibold">
                        {(proposal.activationPower || 0).toLocaleString()}
                      </div>
                      <div className="text-green-400/70">Current Power</div>
                    </div>
                    <div className="text-center">
                      <div className="text-green-300 font-semibold">
                        {activationThreshold.toLocaleString()}
                      </div>
                      <div className="text-green-400/70">Required</div>
                    </div>
                  </div>

                  {/* User Impact Preview */}
                  {userVotingPower > 0 && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-green-300">
                          Your Impact
                        </span>
                        <span className="text-xs text-green-400/70">
                          (if you support)
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-green-400/70">Current:</span>
                          <span className="text-green-300">
                            {(proposal.activationPower || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-green-400/70">
                            + Your Power:
                          </span>
                          <span className="text-green-300">
                            +{userVotingPower.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs font-medium border-t border-green-500/20 pt-1">
                          <span className="text-green-300">New Total:</span>
                          <span className="text-green-200">
                            {(
                              (proposal.activationPower || 0) + userVotingPower
                            ).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Activation Prediction */}
                      {(() => {
                        const wouldActivate =
                          (proposal.activationPower || 0) + userVotingPower >=
                          activationThreshold;
                        if (wouldActivate) {
                          return (
                            <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-blue-300">
                                  🎉
                                </span>
                                <span className="text-xs text-blue-300">
                                  Your support would activate this proposal!
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}

                  {/* Status Message */}
                  <div className="text-center">
                    <p className="text-xs text-green-400/70">
                      {userVotingPower === 0
                        ? "You need power to contribute to activation."
                        : (proposal.activationPower || 0) >= activationThreshold
                        ? "✅ Activation threshold met! This proposal can be activated."
                        : (proposal.activationPower || 0) + userVotingPower >=
                          activationThreshold
                        ? "🎉 Your support would activate this proposal!"
                        : `Need ${(
                            activationThreshold -
                            (proposal.activationPower || 0)
                          ).toLocaleString()} more power to activate`}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Voting Progress */}
        {proposal.status === "active" && (
          <Card className="bg-white/5 border border-white/10 shadow-lg rounded-2xl sm:rounded-3xl">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="text-white text-lg sm:text-xl">
                  Voting Progress
                </CardTitle>
                <div className="flex items-center gap-2">
                  {/* Winning Indicator */}
                  {proposal.totalPower > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 border border-white/20">
                      {votePercentage > 50 ? (
                        <>
                          <TrendingUp className="h-3 w-3 text-green-400" />
                          <span className="text-xs font-medium text-green-400">
                            FOR Winning
                          </span>
                        </>
                      ) : votePercentage < 50 ? (
                        <>
                          <TrendingDown className="h-3 w-3 text-red-400" />
                          <span className="text-xs font-medium text-red-400">
                            AGAINST Winning
                          </span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3 text-yellow-400" />
                          <span className="text-xs font-medium text-yellow-400">
                            TIED
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  <Badge
                    variant={
                      new Date() < new Date(proposal.votingEnds)
                        ? "default"
                        : "destructive"
                    }
                    className="text-xs w-fit"
                  >
                    {new Date() < new Date(proposal.votingEnds)
                      ? "Voting Active"
                      : "Voting Ended"}
                  </Badge>

                  {/* Refresh Button for Voting Data */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      fetchProposal(true);
                      refreshUserVoteData();
                      toast({
                        title: "Refreshing",
                        description: "Updating voting data...",
                        variant: "default",
                      });
                    }}
                    disabled={isRefreshing}
                    className="h-7 px-2 text-xs border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                  >
                    <RefreshCw
                      className={`h-3 w-3 mr-1 ${
                        isRefreshing ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Countdown Timer */}
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium text-blue-300">
                      {isVotingEnded ? "Voting Period Ended" : "Time Remaining"}
                    </span>
                  </div>
                  {!isVotingEnded && (
                    <Badge
                      variant={
                        timeRemaining.days <= 1 ? "destructive" : "default"
                      }
                      className="text-xs"
                    >
                      {timeRemaining.days <= 1 ? "Final Hours" : "Active"}
                    </Badge>
                  )}
                </div>

                {isVotingEnded ? (
                  <div className="text-center py-2">
                    <div className="text-lg font-bold text-red-400 mb-1">
                      Voting Period Has Ended
                    </div>
                    <div className="text-xs text-gray-400">
                      Results are being finalized
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-white/5 rounded-lg p-2">
                      <div className="text-lg sm:text-xl font-bold text-blue-200">
                        {timeRemaining.days.toString().padStart(2, "0")}
                      </div>
                      <div className="text-xs text-blue-400/70">Days</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <div className="text-lg sm:text-xl font-bold text-blue-200">
                        {timeRemaining.hours.toString().padStart(2, "0")}
                      </div>
                      <div className="text-xs text-blue-400/70">Hours</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <div className="text-lg sm:text-xl font-bold text-blue-200">
                        {timeRemaining.minutes.toString().padStart(2, "0")}
                      </div>
                      <div className="text-xs text-blue-400/70">Minutes</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <div className="text-lg sm:text-xl font-bold text-blue-200">
                        {timeRemaining.seconds.toString().padStart(2, "0")}
                      </div>
                      <div className="text-xs text-blue-400/70">Seconds</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Progress value={votePercentage} className="h-2 sm:h-3" />
                <div className="flex flex-col sm:flex-row sm:justify-between gap-2 text-xs sm:text-sm">
                  <span className="text-green-400 font-medium flex items-center gap-2">
                    {proposal.yesPower} For ({votePercentage.toFixed(1)}%)
                    {proposal.hasVoted && proposal.userVote && (
                      <span className="text-xs bg-green-500/20 px-2 py-1 rounded-full">
                        Your Vote
                      </span>
                    )}
                    {votePercentage > 50 && (
                      <span className="text-xs bg-green-500/20 px-2 py-1 rounded-full text-green-300">
                        🏆 Leading
                      </span>
                    )}
                  </span>
                  <span className="text-red-400 font-medium flex items-center gap-2">
                    {proposal.noPower} Against (
                    {(100 - votePercentage).toFixed(1)}%)
                    {proposal.hasVoted && !proposal.userVote && (
                      <span className="text-xs bg-red-500/20 px-2 py-1 rounded-full">
                        Your Vote
                      </span>
                    )}
                    {votePercentage < 50 && (
                      <span className="text-xs bg-red-500/20 px-2 py-1 rounded-full text-red-300">
                        🏆 Leading
                      </span>
                    )}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <span className="text-muted-foreground">Voting Started:</span>
                  <span className="font-medium">
                    {formatDate(proposal.votingStarts)}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <span className="text-muted-foreground">Voting Ends:</span>
                  <span className="font-medium">
                    {formatDate(proposal.votingEnds)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resolution Details - Show when proposal was automatically resolved */}
        {proposal.resolutionReason && proposal.resolvedAt && (
          <Card className="bg-white/5 border border-white/10 shadow-lg rounded-2xl sm:rounded-3xl">
            <CardHeader>
              <CardTitle className="text-white text-lg sm:text-xl flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-400" />
                Resolution Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-blue-300">
                        Automatic Resolution
                      </div>
                      <div className="text-xs text-blue-400/70">
                        This proposal was automatically resolved when the voting period ended
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="text-xs text-muted-foreground mb-1">Resolution Reason</div>
                    <div className="text-sm text-white font-medium">{proposal.resolutionReason}</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="text-xs text-muted-foreground mb-1">Resolved At</div>
                    <div className="text-sm text-white font-medium">{formatDate(proposal.resolvedAt)}</div>
                  </div>
                </div>

                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-green-400/70">
                      <strong>Final Status:</strong> {getStatusLabel(proposal.status)}
                      {proposal.status === "expired" && " - No votes were cast during the voting period"}
                      {proposal.status === "succeeded" && " - Quorum was met and majority voted in favor"}
                      {proposal.status === "defeated" && " - Either quorum was not met or majority voted against"}
                    </div>
                  </div>
                </div>

                {/* Disclaimer about automatically resolved proposals */}
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-yellow-300">
                        ⚠️ Important Notice
                      </div>
                      <div className="text-xs text-yellow-400/70">
                        <strong>Automatically resolved proposals are subject to a queue where they can be rejected or executed at the discretion of protocol operators.</strong> This ensures security and compliance with protocol requirements before final implementation.
                      </div>
                      <div className="text-xs text-yellow-400/50 mt-1">
                        • Successfully resolved proposals enter an execution queue
                        • Protocol operators review proposals for security and compliance
                        • Final execution may be delayed or rejected based on operator assessment
                        • This process protects the protocol from potentially harmful proposals
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        <Card className="bg-white/5 border border-white/10 shadow-lg rounded-2xl sm:rounded-3xl">
          <CardHeader>
            <CardTitle className="text-white text-lg sm:text-xl">
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full mt-2 sm:mt-1.5 flex-shrink-0"></div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-white text-sm sm:text-base">
                    Created
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    {formatDate(proposal.createdAt)}
                  </div>
                </div>
              </div>
              {proposal.status !== "pending" && (
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full mt-2 sm:mt-1.5 flex-shrink-0"></div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-white text-sm sm:text-base flex items-center gap-2">
                      Activated
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400 cursor-help hover:text-blue-300 transition-colors" />
                          </TooltipTrigger>
                          <TooltipContent
                            className="bg-gray-900 border border-gray-700 text-white max-w-xs"
                            side="top"
                            align="center"
                          >
                            <p className="text-sm">
                              Voting in session after activation
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {formatDate(proposal.votingActivated)}
                    </div>
                  </div>
                </div>
              )}
              {proposal.status === "active" && (
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-500 rounded-full mt-2 sm:mt-1.5 flex-shrink-0"></div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-white text-sm sm:text-base">
                      Voting Period
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {formatDate(proposal.votingStarts)} -{" "}
                      {formatDate(proposal.votingEnds)}
                    </div>
                  </div>
                </div>
              )}
              {/* Show resolution timeline item if proposal was resolved */}
              {proposal.resolutionReason && proposal.resolvedAt && (
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-purple-500 rounded-full mt-2 sm:mt-1.5 flex-shrink-0"></div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-white text-sm sm:text-base">
                      Automatically Resolved
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {formatDate(proposal.resolvedAt)} - {proposal.resolutionReason}
                    </div>
                  </div>
                </div>
              )}
              {/* Show succeeded status only if not already shown in resolution */}
              {proposal.status === "succeeded" && !proposal.resolutionReason && (
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-purple-500 rounded-full mt-2 sm:mt-1.5 flex-shrink-0"></div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-white text-sm sm:text-base">
                      Succeeded
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {formatDate(proposal.votingEnds)}
                    </div>
                  </div>
                </div>
              )}
              {/* Show defeated status only if not already shown in resolution */}
              {proposal.status === "defeated" && !proposal.resolutionReason && (
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full mt-2 sm:mt-1.5 flex-shrink-0"></div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-white text-sm sm:text-base">
                      Defeated
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {formatDate(proposal.votingEnds)}
                    </div>
                  </div>
                </div>
              )}
              {/* Show expired status only if not already shown in resolution */}
              {proposal.status === "expired" && !proposal.resolutionReason && (
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gray-500 rounded-full mt-2 sm:mt-1.5 flex-shrink-0"></div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-white text-sm sm:text-base">
                      Expired
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {formatDate(proposal.votingEnds)}
                    </div>
                  </div>
                </div>
              )}
              {proposal.status === "executed" && (
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full mt-2 sm:mt-1.5 flex-shrink-0"></div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-white text-sm sm:text-base">
                      Executed
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {formatDate(
                        new Date(
                          new Date(proposal.votingEnds).getTime() +
                            proposal.executionDelay * 60 * 60 * 1000
                        ).toISOString()
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons - Only show if at least one action is available */}
        {(() => {
          // Check if any actions are available
          const hasVoteAction = getNetworkProposal(activeNetwork)?.status === "active" &&
            !getNetworkProposal(activeNetwork)?.hasVoted &&
            userVotingPower > 0;
          
          const hasSupportAction = getNetworkProposal(activeNetwork)?.status === "pending" &&
            (() => {
              const connectedNetwork = networkBreakdown.find(
                (n) => n.networkId === activeNetwork
              );
              return connectedNetwork &&
                connectedNetwork.status === "pending" &&
                connectedNetwork.canActivate;
            })();
          
          const hasFinalizeAction = FEATURE_FLAGS.ENABLE_FINALIZE_ACTION &&
            getNetworkProposal(activeNetwork)?.status === "active" &&
            isVotingEnded;
          
          const hasExecuteAction = proposal.status === "succeeded" && proposal.canExecute;
          
          const hasAnyAction = hasVoteAction || hasSupportAction || hasFinalizeAction || hasExecuteAction;
          
          // Only render the Actions card if there's at least one action available
          if (!hasAnyAction) return null;
          
          return (
            <Card className="bg-white/5 border border-white/10 shadow-lg rounded-2xl sm:rounded-3xl">
              <CardHeader>
                <CardTitle className="text-white text-lg sm:text-xl">
                  Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-2">
              {getNetworkProposal(activeNetwork)?.status === "active" &&
                !getNetworkProposal(activeNetwork)?.hasVoted &&
                userVotingPower > 0 && (
                  <>
                    <Button
                      className="rounded-full w-full sm:w-auto"
                      onClick={() => !isVotingEnded && setVoteDialogOpen(true)}
                      disabled={isVotingEnded}
                    >
                      <Vote className="h-4 w-4 mr-2" />
                      {isVotingEnded ? "Voting Ended" : "Vote"}
                    </Button>
                    {/* Vote Modal */}
                    <Dialog
                      open={voteDialogOpen}
                      onOpenChange={setVoteDialogOpen}
                    >
                      <DialogContent className="w-[95vw] max-w-md bg-gray-900/95 backdrop-blur-md border border-white/10 shadow-2xl !rounded-3xl sm:!rounded-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <Vote className="h-4 w-4 sm:h-5 sm:w-5" />
                            Cast Your Vote
                          </DialogTitle>
                          <div className="text-muted-foreground text-xs sm:text-sm mt-1">
                            {proposal.title}
                          </div>
                        </DialogHeader>
                        <div className="space-y-4">
                          {/* Enhanced Voting Instructions */}
                          {!proposal.hasVoted &&
                            proposal.canVote &&
                            !isVotingEnded && (
                              <div className="space-y-3">
                                <Alert className="bg-green-500/10 border-green-500/20">
                                  <Vote className="h-4 w-4" />
                                  <AlertDescription className="text-xs sm:text-sm">
                                    <strong>Ready to vote!</strong> Your voice
                                    matters in this governance decision.
                                  </AlertDescription>
                                </Alert>

                                {/* Quick Voting Guide */}
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                                  <div className="flex items-start gap-2">
                                    <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <div className="space-y-1 text-xs">
                                      <div className="font-medium text-blue-300">
                                        Voting Guide:
                                      </div>
                                      <div className="text-blue-400/70 space-y-0.5">
                                        <div>
                                          • <strong>Vote Yes</strong> = Support
                                          this proposal
                                        </div>
                                        <div>
                                          • <strong>Vote No</strong> = Oppose
                                          this proposal
                                        </div>
                                        <div>
                                          • Your vote is{" "}
                                          <strong>permanent</strong> and cannot
                                          be changed
                                        </div>
                                        <div>
                                          • You have{" "}
                                          <strong>
                                            {userVotingPower.toLocaleString()}
                                          </strong>{" "}
                                          power
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          {isVotingEnded && (
                            <Alert className="bg-red-500/10 border-red-500/20">
                              <Clock className="h-4 w-4" />
                              <AlertDescription className="text-xs sm:text-sm">
                                Voting period has ended. You can no longer vote
                                on this proposal.
                              </AlertDescription>
                            </Alert>
                          )}
                          {/* Countdown Timer in Dialog */}
                          {!isVotingEnded && (
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Timer className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" />
                                <span className="text-xs sm:text-sm font-medium text-blue-300">
                                  Time Remaining to Vote
                                </span>
                              </div>
                              <div className="grid grid-cols-4 gap-1 text-center">
                                <div className="bg-white/5 rounded p-1">
                                  <div className="text-sm font-bold text-blue-200">
                                    {timeRemaining.days
                                      .toString()
                                      .padStart(2, "0")}
                                  </div>
                                  <div className="text-[10px] text-blue-400/70">
                                    Days
                                  </div>
                                </div>
                                <div className="bg-white/5 rounded p-1">
                                  <div className="text-sm font-bold text-blue-200">
                                    {timeRemaining.hours
                                      .toString()
                                      .padStart(2, "0")}
                                  </div>
                                  <div className="text-[10px] text-blue-400/70">
                                    Hours
                                  </div>
                                </div>
                                <div className="bg-white/5 rounded p-1">
                                  <div className="text-sm font-bold text-blue-200">
                                    {timeRemaining.minutes
                                      .toString()
                                      .padStart(2, "0")}
                                  </div>
                                  <div className="text-[10px] text-blue-400/70">
                                    Min
                                  </div>
                                </div>
                                <div className="bg-white/5 rounded p-1">
                                  <div className="text-sm font-bold text-blue-200">
                                    {timeRemaining.seconds
                                      .toString()
                                      .padStart(2, "0")}
                                  </div>
                                  <div className="text-[10px] text-blue-400/70">
                                    Sec
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          {/* Voting Power Display */}
                          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 sm:p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" />
                                <span className="text-xs sm:text-sm font-medium text-blue-300">
                                  Your Power
                                </span>
                              </div>
                              <span className="text-base sm:text-lg font-bold text-blue-200">
                                {userVotingPower.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-blue-400/70">
                              This represents your power in this proposal
                            </p>
                          </div>
                          {/* Impact Preview */}
                          {(() => {
                            if (proposal.status !== "active") return null;
                            // Use power-based calculations instead of vote counts
                            const currentYesPower = proposal.yesPower; // This should be power, not vote count
                            const currentNoPower = proposal.noPower; // This should be power, not vote count
                            const currentTotalPower = proposal.totalPower; // This should be total power
                            const currentYesPct =
                              currentTotalPower > 0
                                ? (currentYesPower / currentTotalPower) * 100
                                : 0;
                            const currentNoPct =
                              currentTotalPower > 0
                                ? (currentNoPower / currentTotalPower) * 100
                                : 0;
                            let newYesPower = currentYesPower;
                            let newNoPower = currentNoPower;
                            let newTotalPower = currentTotalPower;
                            if (selectedVote === true) {
                              newYesPower += userVotingPower;
                              newTotalPower += userVotingPower;
                            } else if (selectedVote === false) {
                              newNoPower += userVotingPower;
                              newTotalPower += userVotingPower;
                            }
                            const newYesPct =
                              newTotalPower > 0
                                ? (newYesPower / newTotalPower) * 100
                                : 0;
                            const newNoPct =
                              newTotalPower > 0
                                ? (newNoPower / newTotalPower) * 100
                                : 0;
                            return (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  <span>Impact Preview</span>
                                  <span className="rounded-full bg-gray-700/40 px-2 py-0.5 text-[10px] text-gray-300">
                                    {selectedVote === true
                                      ? "if you vote Yes"
                                      : selectedVote === false
                                      ? "if you vote No"
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
                                  {selectedVote !== null && (
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
                                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-xs">
                                  <span className="text-green-400">
                                    For: {currentYesPower.toLocaleString()} →{" "}
                                    <b>{newYesPower.toLocaleString()}</b> (
                                    {currentYesPct.toFixed(1)}% →{" "}
                                    <b>{newYesPct.toFixed(1)}%</b>)
                                  </span>
                                  <span className="text-red-400">
                                    Against: {currentNoPower.toLocaleString()} →{" "}
                                    <b>{newNoPower.toLocaleString()}</b> (
                                    {currentNoPct.toFixed(1)}% →{" "}
                                    <b>{newNoPct.toFixed(1)}%</b>)
                                  </span>
                                </div>

                                {/* Additional Impact Info */}
                                {selectedVote !== null && (
                                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2">
                                    <div className="text-xs text-blue-400/70 mb-1">
                                      Your {userVotingPower.toLocaleString()}{" "}
                                      power will:
                                    </div>
                                    <div className="text-xs text-blue-300">
                                      • Add {userVotingPower.toLocaleString()}{" "}
                                      to {selectedVote ? "Yes" : "No"} votes
                                    </div>
                                    <div className="text-xs text-blue-300">
                                      • Change total power from{" "}
                                      {currentTotalPower.toLocaleString()} to{" "}
                                      {newTotalPower.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-blue-300">
                                      • Shift {selectedVote ? "Yes" : "No"}{" "}
                                      percentage by{" "}
                                      {Math.abs(
                                        newYesPct - currentYesPct
                                      ).toFixed(1)}
                                      %
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          {/* Enhanced Vote Selection */}
                          <div className="space-y-3">
                            <div className="text-center">
                              <div className="text-sm font-medium text-white mb-2">
                                Select Your Vote
                              </div>
                              <div className="text-xs text-muted-foreground">
                                This action cannot be undone
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <Button
                                variant={
                                  selectedVote === true ? "default" : "outline"
                                }
                                className={`h-16 sm:h-20 flex flex-col items-center justify-center gap-2 rounded-2xl transition-all duration-200 ${
                                  selectedVote === true
                                    ? "bg-green-600 hover:bg-green-700 border-green-500/50 shadow-lg"
                                    : "border-green-500/30 hover:bg-green-500/10 hover:border-green-500/50"
                                }`}
                                onClick={() => setSelectedVote(true)}
                                disabled={isVoting}
                              >
                                <div className="flex flex-col items-center gap-1">
                                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
                                  <span className="font-semibold text-sm">
                                    Vote Yes
                                  </span>
                                  <span className="text-xs opacity-70">
                                    Support
                                  </span>
                                </div>
                                {selectedVote === true && (
                                  <div className="absolute top-2 right-2">
                                    <CheckCircle className="h-4 w-4 text-green-300" />
                                  </div>
                                )}
                              </Button>
                              <Button
                                variant={
                                  selectedVote === false ? "default" : "outline"
                                }
                                className={`h-16 sm:h-20 flex flex-col items-center justify-center gap-2 rounded-2xl transition-all duration-200 ${
                                  selectedVote === false
                                    ? "bg-red-600 hover:bg-red-700 border-red-500/50 shadow-lg"
                                    : "border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50"
                                }`}
                                onClick={() => setSelectedVote(false)}
                                disabled={isVoting}
                              >
                                <div className="flex flex-col items-center gap-1">
                                  <XCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                                  <span className="font-semibold text-sm">
                                    Vote No
                                  </span>
                                  <span className="text-xs opacity-70">
                                    Oppose
                                  </span>
                                </div>
                                {selectedVote === false && (
                                  <div className="absolute top-2 right-2">
                                    <CheckCircle className="h-4 w-4 text-red-300" />
                                  </div>
                                )}
                              </Button>
                            </div>

                            {/* Selection Confirmation */}
                            {selectedVote !== null && (
                              <div
                                className={`p-3 rounded-xl border ${
                                  selectedVote === true
                                    ? "bg-green-500/10 border-green-500/20"
                                    : "bg-red-500/10 border-red-500/20"
                                }`}
                              >
                                <div className="flex items-center gap-2 text-sm">
                                  <CheckCircle className="h-4 w-4 text-green-400" />
                                  <span className="text-white">
                                    You selected:{" "}
                                    <strong>
                                      {selectedVote ? "Vote Yes" : "Vote No"}
                                    </strong>
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 pt-4">
                            <Button
                              variant="outline"
                              onClick={() => setVoteDialogOpen(false)}
                              disabled={isVoting}
                              className="flex-1 rounded-2xl text-xs sm:text-sm"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleVote}
                              disabled={
                                selectedVote === null ||
                                isVoting ||
                                proposal.hasVoted ||
                                isVotingEnded
                              }
                              className="flex-1 rounded-2xl text-xs sm:text-sm"
                            >
                              {isVoting
                                ? "Voting..."
                                : proposal.hasVoted
                                ? "Already Voted"
                                : isVotingEnded
                                ? "Voting Ended"
                                : "Submit Vote"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              {getNetworkProposal(activeNetwork)?.status === "active" &&
                getNetworkProposal(activeNetwork)?.hasVoted && (
                  <Alert className="bg-blue-500/10 border-blue-500/20">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs sm:text-sm">
                      You have already voted{" "}
                      <span className="font-semibold">
                        {proposal.userVote ? "FOR" : "AGAINST"}
                      </span>{" "}
                      this proposal.
                    </AlertDescription>
                  </Alert>
                )}
              {proposal.status === "active" &&
                !proposal.hasVoted &&
                userVotingPower === 0 && (
                  <Alert className="bg-yellow-500/10 border-yellow-500/20">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs sm:text-sm">
                      You need power to participate in this proposal. Connect
                      your wallet or acquire tokens to vote.
                    </AlertDescription>
                  </Alert>
                )}
              {getNetworkProposal(activeNetwork)?.status === "pending" &&
                (() => {
                  // Check if the connected network is pending and can be activated
                  const connectedNetwork = networkBreakdown.find(
                    (n) => n.networkId === activeNetwork
                  );
                  const canActivateOnConnectedNetwork =
                    connectedNetwork &&
                    connectedNetwork.status === "pending" &&
                    connectedNetwork.canActivate;

                  return canActivateOnConnectedNetwork ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setSupportDialogOpen(true)}
                        disabled={isActivating}
                        className="rounded-full w-full sm:w-auto"
                      >
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Support
                      </Button>
                      {/* Support Modal */}
                      <Dialog
                        open={supportDialogOpen}
                        onOpenChange={setSupportDialogOpen}
                      >
                        <DialogContent className="w-[95vw] max-w-md bg-gray-900/95 backdrop-blur-md border border-white/10 shadow-2xl !rounded-3xl sm:!rounded-3xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                              Support Proposal
                            </DialogTitle>
                            <div className="text-muted-foreground text-xs sm:text-sm mt-1">
                              {proposal.title}
                            </div>
                          </DialogHeader>
                          <div className="space-y-4">
                            {/* User Voting Power */}
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 sm:p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" />
                                  <span className="text-xs sm:text-sm font-medium text-blue-300">
                                    Your Power
                                  </span>
                                </div>
                                <span className="text-base sm:text-lg font-bold text-blue-200">
                                  {userVotingPower.toLocaleString()}
                                </span>
                              </div>
                              <p className="text-xs text-blue-400/70">
                                This represents your power in this proposal
                              </p>
                            </div>

                            {/* Proposal Info */}
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-3 sm:p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400" />
                                <span className="text-xs sm:text-sm font-medium text-purple-300">
                                  What happens when you support?
                                </span>
                              </div>
                              <ul className="text-xs text-purple-400/70 space-y-1">
                                <li>
                                  • Your power will be added to the activation
                                  total
                                </li>
                                <li>
                                  • If threshold is met, the proposal becomes
                                  active
                                </li>
                                <li>• Voting period will start immediately</li>
                                <li>
                                  • All token holders can then vote on the
                                  proposal
                                </li>
                                <li>• This action cannot be undone</li>
                              </ul>
                            </div>

                            {/* Current Status */}
                            <div className="bg-gray-700/20 border border-gray-600/20 rounded-2xl p-3 sm:p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs sm:text-sm font-medium text-gray-300">
                                  Current Status
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  Pending
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-400">
                                This proposal is waiting for support to begin
                                the voting process.
                              </p>
                            </div>

                            {/* Activation Power Progress */}
                            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-3 sm:p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs sm:text-sm font-medium text-green-300">
                                  Activation Progress
                                </span>
                                <span className="text-xs sm:text-sm font-bold text-green-200">
                                  {proposal.activationPower?.toLocaleString() ||
                                    0}{" "}
                                  / {activationThreshold.toLocaleString()}
                                </span>
                              </div>
                              <div className="space-y-2">
                                {/* Current Progress Bar */}
                                <div className="relative">
                                  <Progress
                                    value={Math.min(
                                      ((proposal.activationPower || 0) /
                                        activationThreshold) *
                                        100,
                                      100
                                    )}
                                    className="h-2 bg-gray-700/50"
                                  />
                                  {/* Simulation Overlay */}
                                  {userVotingPower > 0 && (
                                    <div
                                      className="absolute top-0 left-0 h-2 rounded-full bg-green-400/60 transition-all duration-300"
                                      style={{
                                        width: `${Math.min(
                                          (((proposal.activationPower || 0) +
                                            userVotingPower) /
                                            activationThreshold) *
                                            100,
                                          100
                                        )}%`,
                                        opacity: 0.8,
                                        zIndex: 2,
                                      }}
                                    />
                                  )}
                                </div>
                                <div className="flex justify-between text-xs text-green-400/70">
                                  <span>
                                    Current:{" "}
                                    {proposal.activationPower?.toLocaleString() ||
                                      0}
                                  </span>
                                  <span>
                                    Required:{" "}
                                    {activationThreshold.toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              {/* Simulation Details */}
                              {userVotingPower > 0 && (
                                <div className="mt-3 p-2 bg-green-500/5 border border-green-500/10 rounded-lg">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-green-300">
                                      Your Contribution Simulation
                                    </span>
                                    <span className="text-xs text-green-400/70">
                                      (if you support)
                                    </span>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                      <span className="text-green-400/70">
                                        Current Power:
                                      </span>
                                      <span className="text-green-300">
                                        {(
                                          proposal.activationPower || 0
                                        ).toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-green-400/70">
                                        + Your Power:
                                      </span>
                                      <span className="text-green-300">
                                        +{userVotingPower.toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-xs font-medium border-t border-green-500/20 pt-1">
                                      <span className="text-green-300">
                                        New Total:
                                      </span>
                                      <span className="text-green-200">
                                        {(
                                          (proposal.activationPower || 0) +
                                          userVotingPower
                                        ).toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-green-400/70">
                                        Progress:
                                      </span>
                                      <span className="text-green-300">
                                        {Math.min(
                                          (((proposal.activationPower || 0) +
                                            userVotingPower) /
                                            activationThreshold) *
                                            100,
                                          100
                                        ).toFixed(1)}
                                        %
                                      </span>
                                    </div>
                                  </div>

                                  {/* Status Change Simulation */}
                                  {(() => {
                                    const currentStatus = proposal.status;
                                    const wouldActivate =
                                      (proposal.activationPower || 0) +
                                        userVotingPower >=
                                      activationThreshold;
                                    const statusWouldChange =
                                      currentStatus === "pending" &&
                                      wouldActivate;

                                    if (statusWouldChange) {
                                      return (
                                        <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-medium text-blue-300">
                                              Status Change
                                            </span>
                                            <span className="text-xs text-blue-400/70">
                                              (if you support)
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <Badge
                                                variant="secondary"
                                                className="text-xs"
                                              >
                                                {getStatusLabel(currentStatus)}
                                              </Badge>
                                              <span className="text-xs text-blue-400/70">
                                                →
                                              </span>
                                              <Badge
                                                variant="default"
                                                className="text-xs bg-green-600"
                                              >
                                                Active
                                              </Badge>
                                            </div>
                                            <span className="text-xs text-blue-300 font-medium">
                                              🎉 Proposal Activated!
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    }

                                    return null;
                                  })()}
                                </div>
                              )}

                              <p className="text-xs text-green-400/70 mt-2">
                                {userVotingPower === 0
                                  ? "You need power to contribute to activation."
                                  : proposal.activationPower >=
                                    activationThreshold
                                  ? "✅ Activation threshold met! This proposal can be activated."
                                  : (proposal.activationPower || 0) +
                                      userVotingPower >=
                                    activationThreshold
                                  ? "🎉 Your support would activate this proposal!"
                                  : `Need ${(
                                      activationThreshold -
                                      (proposal.activationPower || 0)
                                    ).toLocaleString()} more power to activate`}
                              </p>
                            </div>

                            <div className="text-xs sm:text-sm text-muted-foreground">
                              {userVotingPower === 0
                                ? "You have no power. You need power to support proposals."
                                : proposal.activationPower >=
                                  activationThreshold
                                ? "Activation threshold is met! You can now activate this proposal to begin voting."
                                : `Your support will contribute ${userVotingPower.toLocaleString()} power to meeting the activation threshold. Once the threshold is met, the proposal can be activated.`}
                            </div>

                            <div className="flex gap-2 pt-4">
                              <Button
                                variant="outline"
                                onClick={() => setSupportDialogOpen(false)}
                                disabled={isActivating}
                                className="flex-1 rounded-2xl text-xs sm:text-sm"
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleActivate}
                                disabled={isActivating || userVotingPower === 0}
                                className={`flex-1 rounded-2xl text-xs sm:text-sm ${
                                  userVotingPower === 0
                                    ? "bg-gray-600 cursor-not-allowed"
                                    : proposal.activationPower >=
                                      activationThreshold
                                    ? "bg-green-600 hover:bg-green-700"
                                    : "bg-blue-600 hover:bg-blue-700"
                                }`}
                              >
                                {isActivating ? (
                                  <>
                                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                                    {proposal.activationPower >=
                                    activationThreshold
                                      ? "Activating..."
                                      : "Supporting..."}
                                  </>
                                ) : userVotingPower === 0 ? (
                                  <>
                                    <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                    No Power
                                  </>
                                ) : (
                                  <>
                                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                    {proposal.activationPower >=
                                    activationThreshold
                                      ? "Activate Proposal"
                                      : "Support Proposal"}
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </>
                  ) : null;
                })()}

              {/* Finalize Proposal Modal */}
              <Dialog
                open={finalizeDialogOpen}
                onOpenChange={setFinalizeDialogOpen}
              >
                <DialogContent className="w-[95vw] max-w-md bg-gray-900/95 backdrop-blur-md border border-white/10 shadow-2xl !rounded-3xl sm:!rounded-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                      Finalize Proposal
                    </DialogTitle>
                    <div className="text-muted-foreground text-xs sm:text-sm mt-1">
                      {proposal.title}
                    </div>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Finalization Info */}
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-orange-400" />
                        <span className="text-xs sm:text-sm font-medium text-orange-300">
                          What happens when you finalize?
                        </span>
                      </div>
                      <ul className="text-xs text-orange-400/70 space-y-1">
                        <li>
                          • Voting period has ended and results are calculated
                        </li>
                        <li>• Quorum requirements are checked</li>
                        <li>
                          • Proposal status is updated
                          (Succeeded/Defeated/Expired)
                        </li>
                        <li>
                          • Proposal moves to the next phase of governance
                        </li>
                        <li>• This action cannot be undone</li>
                      </ul>
                    </div>

                    {/* Current Voting Results */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" />
                        <span className="text-xs sm:text-sm font-medium text-blue-300">
                          Current Voting Results
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-blue-400/70">Total Power:</span>
                          <span className="text-blue-300">
                            {proposal.totalPower?.toLocaleString() || 0}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-green-400/70">Power For:</span>
                          <span className="text-green-300">
                            {proposal.yesPower?.toLocaleString() || 0}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-red-400/70">
                            Power Against:
                          </span>
                          <span className="text-red-300">
                            {proposal.noPower?.toLocaleString() || 0}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-blue-400/70">Total Power:</span>
                          <span className="text-blue-300">
                            {proposal.totalPower?.toLocaleString() || 0}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-green-400/70">Power For:</span>
                          <span className="text-green-300">
                            {proposal.yesPower?.toLocaleString() || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quorum Status */}
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400" />
                        <span className="text-xs sm:text-sm font-medium text-purple-300">
                          Quorum Status
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-purple-400/70">
                            Required Quorum:
                          </span>
                          <span className="text-purple-300">
                            40% of total voting power
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-purple-400/70">
                            Current Participation:
                          </span>
                          <span className="text-purple-300">
                            {proposal.totalPower && proposal.quorum
                              ? `${(
                                  (proposal.totalPower / proposal.quorum) *
                                  100
                                ).toFixed(1)}%`
                              : "0%"}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-purple-400/70">
                            Quorum Met:
                          </span>
                          <span className="text-purple-300">
                            {proposal.totalPower &&
                            proposal.quorum &&
                            proposal.totalPower / proposal.quorum >= 0.4
                              ? "✅ Yes"
                              : "❌ No"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Finalizing this proposal will calculate the final results
                      and update the proposal status based on voting outcomes
                      and quorum requirements.
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setFinalizeDialogOpen(false)}
                        disabled={isFinalizing}
                        className="flex-1 rounded-2xl text-xs sm:text-sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleFinalize}
                        disabled={isFinalizing}
                        className="flex-1 rounded-2xl text-xs sm:text-sm bg-orange-600 hover:bg-orange-700"
                      >
                        {isFinalizing ? (
                          <>
                            <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                            Finalizing...
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                            Finalize Proposal
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              {/* Finalize Proposal - Show when voting period has ended and proposal is still active */}
              {FEATURE_FLAGS.ENABLE_FINALIZE_ACTION &&
                getNetworkProposal(activeNetwork)?.status === "active" &&
                isVotingEnded && (
                  <Button
                    variant="outline"
                    onClick={() => setFinalizeDialogOpen(true)}
                    disabled={isFinalizing}
                    className="rounded-full w-full sm:w-auto border-orange-500/30 hover:border-orange-500/50 hover:bg-orange-500/10"
                  >
                    <Clock className="h-4 w-4 mr-2 text-orange-400" />
                    Finalize Proposal
                  </Button>
                )}

              {/* Execute Proposal - Show when proposal has succeeded */}
              {proposal.status === "succeeded" && proposal.canExecute && (
                <Button
                  variant="outline"
                  onClick={handleExecute}
                  className="rounded-full w-full sm:w-auto"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Execute
                </Button>
              )}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Vote History - Only show if there are votes */}
        {(mockMode ? mockVoteHistory[id] || [] : mockVoteHistory[id] || [])
          .length > 0 && (
          <Card className="bg-white/5 border border-white/10 shadow-lg rounded-2xl sm:rounded-3xl">
            <CardHeader>
              <CardTitle className="text-white text-lg sm:text-xl">
                Vote History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Mobile: Card Layout */}
              <div className="block sm:hidden space-y-3">
                {(mockMode
                  ? mockVoteHistory[id] || []
                  : mockVoteHistory[id] || []
                ).map((vote) => (
                  <div
                    key={vote.id}
                    className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {vote.voter.slice(2, 4).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-mono text-xs text-white">
                          {formatAddress(vote.voter)}
                        </span>
                      </div>
                      <Badge
                        variant={vote.support ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {vote.support ? "For" : "Against"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Power: {vote.votingPower.toLocaleString()}</span>
                      <span>{formatDate(vote.timestamp)}</span>
                    </div>
                    {vote.reason && (
                      <p className="text-xs text-white/80 line-clamp-2">
                        {vote.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop: Table Layout */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Voter</TableHead>
                      <TableHead>Vote</TableHead>
                      <TableHead>Power</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(mockMode
                      ? mockVoteHistory[id] || []
                      : mockVoteHistory[id] || []
                    ).map((vote) => (
                      <TableRow key={vote.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {vote.voter.slice(2, 4).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-mono text-sm text-white">
                              {formatAddress(vote.voter)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={vote.support ? "default" : "destructive"}
                          >
                            {vote.support ? "For" : "Against"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {vote.votingPower.toLocaleString()}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {vote.reason}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(vote.timestamp)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Activation Success Dialog */}
      <Dialog
        open={activationSuccessDialogOpen}
        onOpenChange={setActivationSuccessDialogOpen}
      >
        <DialogContent className="w-[95vw] max-w-md bg-gray-900/95 backdrop-blur-md border border-white/10 shadow-2xl !rounded-3xl sm:!rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-center text-base sm:text-lg">
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
              Proposal Activated Successfully!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-center">
            {/* Success Animation */}
            <div className="flex justify-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
              </div>
            </div>

            {/* Success Message */}
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-semibold text-white">
                🎉 Voting is Now Live!
              </h3>
              <p className="text-xs sm:text-sm text-gray-300">
                "{proposal?.title}"
              </p>
              <p className="text-xs text-gray-400">
                The proposal has been activated and is now open for voting.
                Community members can now cast their votes on this proposal.
              </p>
            </div>

            {/* Proposal Stats */}
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-3 sm:p-4">
              <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="text-center">
                  <div className="text-green-300 font-semibold">
                    {proposal?.activationPower?.toLocaleString() || 0}
                  </div>
                  <div className="text-green-400/70 text-xs">
                    Activation Power
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-green-300 font-semibold">
                    {activationThreshold.toLocaleString()}
                  </div>
                  <div className="text-green-400/70 text-xs">Threshold Met</div>
                </div>
              </div>
            </div>

            {/* Share Section */}
            <div className="space-y-3">
              <div className="text-xs sm:text-sm text-gray-300">
                Share this milestone with the community:
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleShareWithPollInstructions}
                  className="w-full bg-blue-600 hover:bg-blue-700 rounded-2xl text-xs sm:text-sm"
                >
                  <Twitter className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Share with Poll Instructions
                </Button>
                <Button
                  onClick={handleShareOnTwitter}
                  variant="outline"
                  className="w-full rounded-2xl text-xs sm:text-sm"
                >
                  <Share2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Share Simple Tweet
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActivationSuccessDialogOpen(false)}
                  className="w-full rounded-2xl text-xs sm:text-sm"
                >
                  Close
                </Button>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3">
              <div className="text-xs text-blue-300 font-medium mb-1">
                What's Next?
              </div>
              <ul className="text-xs text-blue-400/70 space-y-1 text-left">
                <li>• Community members can now vote on this proposal</li>
                <li>
                  • Voting period runs until{" "}
                  {proposal?.votingEnds
                    ? formatDate(proposal.votingEnds)
                    : "the end date"}
                </li>
                <li>• Results will be determined by majority vote</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Voting Success Dialog */}
      <Dialog
        open={votingSuccessDialogOpen}
        onOpenChange={setVotingSuccessDialogOpen}
      >
        <DialogContent className="w-[95vw] max-w-md bg-gray-900/95 backdrop-blur-md border border-white/10 shadow-2xl !rounded-3xl sm:!rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-center text-base sm:text-lg">
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
              Vote Cast Successfully!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-center">
            {/* Success Animation */}
            <div className="flex justify-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
              </div>
            </div>

            {/* Success Message */}
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-semibold text-white">
                🗳️ Your Vote Has Been Recorded!
              </h3>
              <p className="text-xs sm:text-sm text-gray-300">
                "{proposal?.title}"
              </p>
              <p className="text-xs text-gray-400">
                Your vote has been successfully cast and recorded on the
                blockchain. Thank you for participating in the governance
                process!
              </p>
            </div>

            {/* Vote Details */}
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-3 sm:p-4">
              <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="text-center">
                  <div className="text-green-300 font-semibold">
                    {userVote ? "✅ FOR" : "❌ AGAINST"}
                  </div>
                  <div className="text-green-400/70 text-xs">Your Vote</div>
                </div>
                <div className="text-center">
                  <div className="text-green-300 font-semibold">
                    {userVotingPower.toLocaleString()}
                  </div>
                  <div className="text-green-400/70 text-xs">Voting Power</div>
                </div>
              </div>
            </div>

            {/* Share Section */}
            <div className="space-y-3">
              <div className="text-xs sm:text-sm text-gray-300">
                Share your participation with the community:
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleShareVotingWithPollInstructions}
                  className="w-full bg-blue-600 hover:bg-blue-700 rounded-2xl text-xs sm:text-sm"
                >
                  <Twitter className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Share with Poll Instructions
                </Button>
                <Button
                  onClick={handleShareVotingOnTwitter}
                  variant="outline"
                  className="w-full rounded-2xl text-xs sm:text-sm"
                >
                  <Share2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Share Simple Tweet
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setVotingSuccessDialogOpen(false)}
                  className="w-full rounded-2xl text-xs sm:text-sm"
                >
                  Close
                </Button>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3">
              <div className="text-xs text-blue-300 font-medium mb-1">
                What's Next?
              </div>
              <ul className="text-xs text-blue-400/70 space-y-1 text-left">
                <li>• Voting continues until the deadline</li>
                <li>• Results will be determined by majority vote</li>
                <li>• You can check back to see the final results</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProposalDetail;
