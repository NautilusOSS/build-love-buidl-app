// Election configuration types
export interface ElectionCandidate {
  id: number;
  name: string;
  bio: string;
  votes: number;
  avatar: string;
  endorsements: number;
  address: string;
  campaignStatement: string;
}

export interface ElectionConfig {
  id: number;
  title: string;
  description: string;
  status: "Active" | "Upcoming" | "Completed" | "Cancelled";
  timeRemaining: string;
  positions: number;
  chains: string[];
  proposalHash: string;
  electionNode: string;
  createdAtTimestamp: number;
  electionStartTimestamp: number;
  electionEndTimestamp: number;
  candidates: ElectionCandidate[];
  totalVotes: number;
  quorumThreshold: number;
  minVotingPower: number;
  votingPowerMultiplier: number;
}

export interface ElectionMetadata {
  version: string;
  lastUpdated: string;
  description: string;
  network: string;
  governanceContract: string;
}

export interface ElectionConfiguration {
  elections: ElectionConfig[];
  metadata: ElectionMetadata;
}

// Election status enum for type safety
export enum ElectionStatus {
  ACTIVE = "Active",
  UPCOMING = "Upcoming", 
  COMPLETED = "Completed",
  CANCELLED = "Cancelled"
}

// Chain types for elections
export enum ElectionChain {
  VOI = "VOI",
  ALGO = "ALGO", 
  EVM = "EVM",
  COSMOS = "COSMOS"
}

// Election utility types
export interface ElectionFilter {
  status?: ElectionStatus;
  chain?: ElectionChain;
  minPositions?: number;
  maxPositions?: number;
}

export interface ElectionSort {
  field: "title" | "totalVotes" | "createdAtTimestamp" | "electionEndTimestamp";
  direction: "asc" | "desc";
}

// Election voting types
export interface ElectionVote {
  electionId: number;
  candidateIds: number[];
  voterAddress: string;
  votingPower: number;
  timestamp: number;
  transactionHash?: string;
}

export interface ElectionResult {
  electionId: number;
  winners: ElectionCandidate[];
  totalVotesCast: number;
  participationRate: number;
  quorumMet: boolean;
  finalizedAt: number;
}

// Configuration loading types
export interface ElectionConfigLoader {
  loadElections(): Promise<ElectionConfiguration>;
  getElectionById(id: number): Promise<ElectionConfig | null>;
  getElectionsByStatus(status: ElectionStatus): Promise<ElectionConfig[]>;
  getActiveElections(): Promise<ElectionConfig[]>;
  getUpcomingElections(): Promise<ElectionConfig[]>;
  getCompletedElections(): Promise<ElectionConfig[]>;
  filterElections(filter: ElectionFilter): Promise<ElectionConfig[]>;
  sortElections(elections: ElectionConfig[], sort: ElectionSort): ElectionConfig[];
}

// Election validation types
export interface ElectionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ElectionValidationRule {
  name: string;
  validate(election: ElectionConfig): boolean;
  errorMessage: string;
}

// Election statistics types
export interface ElectionStats {
  totalElections: number;
  activeElections: number;
  upcomingElections: number;
  completedElections: number;
  totalCandidates: number;
  totalVotesCast: number;
  averageParticipationRate: number;
  mostPopularChain: string;
}

// Election proposal hash utilities
export interface ProposalHashInfo {
  hash: string;
  electionId: number;
  electionNode: string;
  createdAt: number;
  proposer: string;
  isValid: boolean;
}

export interface ProposalHashValidator {
  validateHash(hash: string): boolean;
  generateHash(electionData: Partial<ElectionConfig>): string;
  getHashInfo(hash: string): ProposalHashInfo | null;
}
