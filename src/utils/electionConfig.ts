import { 
  ElectionConfiguration, 
  ElectionConfig, 
  ElectionStatus, 
  ElectionFilter, 
  ElectionSort,
  ElectionStats,
  ElectionValidationResult,
  ElectionConfigLoader,
  ProposalHashInfo,
  ProposalHashValidator
} from '@/types/elections';

/**
 * Election configuration loader and utilities
 */
export class ElectionConfigService implements ElectionConfigLoader {
  private config: ElectionConfiguration | null = null;
  private configPath: string;

  constructor(configPath: string = '/src/config/elections.json') {
    this.configPath = configPath;
  }

  /**
   * Load elections configuration from JSON file
   */
  async loadElections(): Promise<ElectionConfiguration> {
    try {
      if (this.config) {
        return this.config;
      }

      const response = await fetch(this.configPath);
      if (!response.ok) {
        throw new Error(`Failed to load elections config: ${response.statusText}`);
      }

      this.config = await response.json();
      return this.config;
    } catch (error) {
      console.error('Error loading elections configuration:', error);
      throw new Error('Failed to load elections configuration');
    }
  }

  /**
   * Get election by ID
   */
  async getElectionById(id: number): Promise<ElectionConfig | null> {
    const config = await this.loadElections();
    return config.elections.find(election => election.id === id) || null;
  }

  /**
   * Get elections by status
   */
  async getElectionsByStatus(status: ElectionStatus): Promise<ElectionConfig[]> {
    const config = await this.loadElections();
    return config.elections.filter(election => election.status === status);
  }

  /**
   * Get active elections
   */
  async getActiveElections(): Promise<ElectionConfig[]> {
    return this.getElectionsByStatus(ElectionStatus.ACTIVE);
  }

  /**
   * Get upcoming elections
   */
  async getUpcomingElections(): Promise<ElectionConfig[]> {
    return this.getElectionsByStatus(ElectionStatus.UPCOMING);
  }

  /**
   * Get completed elections
   */
  async getCompletedElections(): Promise<ElectionConfig[]> {
    return this.getElectionsByStatus(ElectionStatus.COMPLETED);
  }

  /**
   * Filter elections based on criteria
   */
  async filterElections(filter: ElectionFilter): Promise<ElectionConfig[]> {
    const config = await this.loadElections();
    let filtered = config.elections;

    if (filter.status) {
      filtered = filtered.filter(election => election.status === filter.status);
    }

    if (filter.chain) {
      filtered = filtered.filter(election => election.chains.includes(filter.chain!));
    }

    if (filter.minPositions) {
      filtered = filtered.filter(election => election.positions >= filter.minPositions!);
    }

    if (filter.maxPositions) {
      filtered = filtered.filter(election => election.positions <= filter.maxPositions!);
    }

    return filtered;
  }

  /**
   * Sort elections based on criteria
   */
  sortElections(elections: ElectionConfig[], sort: ElectionSort): ElectionConfig[] {
    return [...elections].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sort.field) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'totalVotes':
          aValue = a.totalVotes;
          bValue = b.totalVotes;
          break;
        case 'createdAtTimestamp':
          aValue = a.createdAtTimestamp;
          bValue = b.createdAtTimestamp;
          break;
        case 'electionEndTimestamp':
          aValue = a.electionEndTimestamp;
          bValue = b.electionEndTimestamp;
          break;
        default:
          return 0;
      }

      if (sort.direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }

  /**
   * Get election statistics
   */
  async getElectionStats(): Promise<ElectionStats> {
    const config = await this.loadElections();
    const elections = config.elections;

    const activeElections = elections.filter(e => e.status === ElectionStatus.ACTIVE).length;
    const upcomingElections = elections.filter(e => e.status === ElectionStatus.UPCOMING).length;
    const completedElections = elections.filter(e => e.status === ElectionStatus.COMPLETED).length;
    
    const totalCandidates = elections.reduce((sum, e) => sum + e.candidates.length, 0);
    const totalVotesCast = elections.reduce((sum, e) => sum + e.totalVotes, 0);
    
    const chainCounts = elections.reduce((counts, e) => {
      e.chains.forEach(chain => {
        counts[chain] = (counts[chain] || 0) + 1;
      });
      return counts;
    }, {} as Record<string, number>);
    
    const mostPopularChain = Object.entries(chainCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'VOI';

    return {
      totalElections: elections.length,
      activeElections,
      upcomingElections,
      completedElections,
      totalCandidates,
      totalVotesCast,
      averageParticipationRate: 0, // Would need voting data to calculate
      mostPopularChain
    };
  }

  /**
   * Validate election configuration
   */
  validateElection(election: ElectionConfig): ElectionValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!election.title || election.title.trim().length === 0) {
      errors.push('Election title is required');
    }

    if (!election.description || election.description.trim().length === 0) {
      errors.push('Election description is required');
    }

    if (!election.proposalHash || election.proposalHash.trim().length === 0) {
      errors.push('Proposal hash is required');
    }

    if (!election.electionNode || election.electionNode.trim().length === 0) {
      errors.push('Election node is required');
    }

    if (election.positions <= 0) {
      errors.push('Number of positions must be greater than 0');
    }

    if (election.candidates.length === 0) {
      errors.push('At least one candidate is required');
    }

    if (election.candidates.length < election.positions) {
      warnings.push('Number of candidates is less than available positions');
    }

    // Timestamp validation
    if (election.electionStartTimestamp >= election.electionEndTimestamp) {
      errors.push('Election start time must be before end time');
    }

    if (election.createdAtTimestamp > election.electionStartTimestamp) {
      warnings.push('Election creation time is after start time');
    }

    // Candidate validation
    const candidateIds = new Set();
    election.candidates.forEach((candidate, index) => {
      if (candidateIds.has(candidate.id)) {
        errors.push(`Duplicate candidate ID ${candidate.id} at index ${index}`);
      }
      candidateIds.add(candidate.id);

      if (!candidate.name || candidate.name.trim().length === 0) {
        errors.push(`Candidate at index ${index} is missing name`);
      }

      if (!candidate.address || candidate.address.trim().length === 0) {
        errors.push(`Candidate at index ${index} is missing address`);
      }

      if (candidate.votes < 0) {
        errors.push(`Candidate at index ${index} has negative votes`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Refresh configuration from source
   */
  async refreshConfig(): Promise<void> {
    this.config = null;
    await this.loadElections();
  }
}

/**
 * Proposal hash utilities
 */
export class ProposalHashService implements ProposalHashValidator {
  /**
   * Validate proposal hash format
   */
  validateHash(hash: string): boolean {
    // Check if it's a valid hex string (64 characters for 32 bytes)
    const hexRegex = /^0x[0-9a-fA-F]{64}$/;
    return hexRegex.test(hash);
  }

  /**
   * Generate proposal hash from election data
   */
  generateHash(electionData: Partial<ElectionConfig>): string {
    const data = {
      title: electionData.title || '',
      description: electionData.description || '',
      electionNode: electionData.electionNode || '',
      createdAtTimestamp: electionData.createdAtTimestamp || Date.now(),
      proposer: electionData.proposalHash || ''
    };

    // Simple hash generation (in production, use proper cryptographic hash)
    const dataString = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Convert to hex string and pad to 64 characters
    const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
    return `0x${hexHash.repeat(8)}`;
  }

  /**
   * Get proposal hash information
   */
  getHashInfo(hash: string): ProposalHashInfo | null {
    if (!this.validateHash(hash)) {
      return null;
    }

    // In a real implementation, this would query the blockchain
    // For now, return mock data
    return {
      hash,
      electionId: 0, // Would be determined from blockchain query
      electionNode: '', // Would be determined from blockchain query
      createdAt: 0, // Would be determined from blockchain query
      proposer: '', // Would be determined from blockchain query
      isValid: true
    };
  }
}

// Export singleton instances
export const electionConfigService = new ElectionConfigService();
export const proposalHashService = new ProposalHashService();

// Export utility functions
export const loadElections = () => electionConfigService.loadElections();
export const getElectionById = (id: number) => electionConfigService.getElectionById(id);
export const getActiveElections = () => electionConfigService.getActiveElections();
export const getUpcomingElections = () => electionConfigService.getUpcomingElections();
export const getCompletedElections = () => electionConfigService.getCompletedElections();
export const filterElections = (filter: ElectionFilter) => electionConfigService.filterElections(filter);
export const getElectionStats = () => electionConfigService.getElectionStats();
export const validateElection = (election: ElectionConfig) => electionConfigService.validateElection(election);
export const validateProposalHash = (hash: string) => proposalHashService.validateHash(hash);
export const generateProposalHash = (electionData: Partial<ElectionConfig>) => proposalHashService.generateHash(electionData);
