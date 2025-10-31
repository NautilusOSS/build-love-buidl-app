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
  vestingDays: number; // Total vesting days for progress calculation
  daysRemaining: number;
  vestedDate: string; // ISO date string when contract will be fully vested
  status: "locked" | "vesting" | "ready"; // locked = in lockup period, vesting = currently vesting, ready = fully vested
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
    const now = Date.now() / 1000; // Current time in seconds
    
    // Calculate lockup and distribution durations
    const lockupDuration = account.global_period_seconds * account.global_lockup_delay;
    const distributionDuration = account.global_distribution_count * account.global_period * account.global_distribution_seconds;
    
    // Calculate full vesting time in seconds:
    // Formula: global_deadline + (global_period_seconds * global_lockup_delay) + (global_distribution_count * global_period * global_distribution_seconds)
    // If global_deadline is >= 1000000000, it's likely a Unix timestamp
    // Otherwise, it might be an offset or relative time
    const fullVestingTimeSeconds = 
      account.global_deadline + lockupDuration + distributionDuration;
    
    // Calculate lockup end time (when lockup period ends and vesting begins)
    const lockupEndTimeSeconds = account.global_deadline + lockupDuration;
    
    // Calculate days remaining until fully vested
    const secondsRemaining = Math.max(0, fullVestingTimeSeconds - now);
    const daysRemaining = Math.ceil(secondsRemaining / (60 * 60 * 24)); // Use ceil to show at least 1 day if any time remains
    
    // Calculate vested date (when contract will be fully vested)
    // Only format as date if it's a valid timestamp (> epoch), otherwise use "N/A"
    const vestedDate = fullVestingTimeSeconds > 1000000000 
      ? new Date(fullVestingTimeSeconds * 1000).toISOString().split('T')[0]
      : "N/A";
    
    // Determine status based on contract lifecycle
    // Locked: still in lockup period (now < lockupEndTime)
    // Vesting: lockup ended, currently in vesting period
    // Ready: fully vested (can withdraw)
    let status: "locked" | "vesting" | "ready";
    const canWithdraw = secondsRemaining < 3600; // Less than 1 hour remaining
    
    if (canWithdraw) {
      status = "ready";
    } else if (now < lockupEndTimeSeconds && lockupEndTimeSeconds > 1000000000) {
      status = "locked";
    } else {
      status = "vesting";
    }
    
    // Calculate vesting period in days (total duration from start to full vest)
    const totalVestingDurationSeconds = 
      (account.global_period_seconds * account.global_lockup_delay) + 
      (account.global_distribution_count * account.global_period * account.global_distribution_seconds);
    const vestingDays = Math.floor(totalVestingDurationSeconds / (60 * 60 * 24));
    
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
      vestingDays, // Total vesting days for progress calculation
      daysRemaining,
      vestedDate, // Date when contract will be fully vested
      status,
      canWithdraw,
      rewards,
      apy,
      lockPeriod,
      createdAt,
      deadline: fullVestingTimeSeconds, // Full vesting time in seconds
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
