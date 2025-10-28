export interface StakingContractAccount {
  contractId: number;
  contractAddress: string;
  creator: string;
  createRound: number;
  lastSyncRound: number;
  global_funder: string;
  global_funding: string | null;
  global_owner: string;
  global_period: number;
  global_total: string;
  global_period_seconds: number;
  global_lockup_delay: number;
  global_vesting_delay: number;
  global_period_limit: number;
  global_delegate: string;
  global_deployer: string;
  global_parent_id: number;
  global_messenger_id: number;
  global_initial: string;
  global_deadline: number;
  global_distribution_count: number;
  global_distribution_seconds: number;
  part_vote_k: string;
  part_sel_k: string;
  part_vote_fst: number;
  part_vote_lst: number;
  part_vote_kd: number;
  part_sp_key: string;
  deleted: number;
}

export interface StakingContractsResponse {
  "current-round": number;
  accounts: StakingContractAccount[];
  "next-token"?: number;
}

export interface FormattedStakingContract {
  id: string;
  contractId: number;
  name: string;
  network: string;
  contractAddress: string;
  stakedAmount: string;
  vestingPeriod: string;
  daysRemaining: number;
  status: "vesting" | "ready";
  canWithdraw: boolean;
  rewards: string;
  apy: string;
  lockPeriod: string;
  createdAt: string;
  deadline: number;
  total: string;
  period: number;
}

/**
 * Service to fetch consulting money stream contract information from Nautilus SCS API
 */
export class StakingContractService {
  private baseUrl: string;

  constructor(baseUrl: string = "https://mainnet-idx.nautilus.sh/v1/scs") {
    this.baseUrl = baseUrl;
  }

  /**
   * Fetch all staking contracts for a given owner address
   */
  async fetchContractsForOwner(ownerAddress: string): Promise<StakingContractAccount[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/accounts?owner=${ownerAddress}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch contracts: ${response.statusText}`);
      }

      const data: StakingContractsResponse = await response.json();
      return data.accounts;
    } catch (error) {
      console.error("Error fetching staking contracts:", error);
      throw error;
    }
  }

  /**
   * Format a raw account to the component's contract structure
   */
  formatContract(account: StakingContractAccount): FormattedStakingContract {
    const now = Date.now();
    const deadline = account.global_deadline * 1000; // Convert to milliseconds
    const daysRemaining = Math.max(0, Math.floor((deadline - now) / (1000 * 60 * 60 * 24)));
    
    // Determine status based on deadline
    const canWithdraw = daysRemaining === 0 && deadline > 0;
    const status: "vesting" | "ready" = canWithdraw ? "ready" : "vesting";
    
    // Calculate vesting period in days
    const vestingDays = Math.floor(
      account.global_distribution_seconds * account.global_distribution_count / (60 * 60 * 24)
    );
    
    const vestingPeriod = vestingDays > 0 ? `${vestingDays} days` : "N/A";
    
    // Format staked amount (assuming it's in micro-algos like VOI)
    const totalAmount = parseFloat(account.global_total);
    const stakedAmount = totalAmount > 0 
      ? `${(totalAmount / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} VOI`
      : "0 VOI";
    
    // Format initial amount
    const initialAmount = parseFloat(account.global_initial);
    const rewards = initialAmount > 0
      ? `${(initialAmount / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} VOI`
      : "0 VOI";
    
    // Create date from createRound or current date
    const createdAt = new Date().toISOString().split('T')[0];
    
    // Extract lock period
    const lockDays = Math.floor(account.global_lockup_delay / (60 * 60 * 24));
    const lockPeriod = lockDays > 0 ? `${lockDays} days` : "N/A";
    
    // Estimate APY based on period and total (simplified)
    const apy = account.global_period_seconds > 0 && vestingDays > 0
      ? `${((account.global_distribution_count * 100) / vestingDays).toFixed(2)}%`
      : "N/A";

    return {
      id: `contract-${account.contractId}`,
      contractId: account.contractId,
      name: `Staking Contract #${account.contractId}`,
      network: "VOI Mainnet",
      contractAddress: account.contractAddress,
      stakedAmount,
      vestingPeriod,
      daysRemaining,
      status,
      canWithdraw,
      rewards,
      apy,
      lockPeriod,
      createdAt,
      deadline: account.global_deadline,
      total: account.global_total,
      period: account.global_period,
    };
  }

  /**
   * Fetch and format all contracts for an owner
   */
  async getFormattedContractsForOwner(ownerAddress: string): Promise<FormattedStakingContract[]> {
    const accounts = await this.fetchContractsForOwner(ownerAddress);
    return accounts.map(account => this.formatContract(account));
  }
}

// Export singleton instance
export const stakingContractService = new StakingContractService();
