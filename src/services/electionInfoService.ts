import { ElectionConfig, ElectionCandidate } from "@/types/elections";
import { getGovernanceAppId } from "@/constants/appIds";
import { NetworkId } from "@txnlab/use-wallet-react";
import algosdk from "algosdk";
import { CONTRACT } from "ulujs";
import { APP_SPEC as PowGovernanceAppSpec, Endorsement } from "@/clients/PowGovernanceClient";

export interface ElectionInfo {
  electionIndex: number;
  electionStatus: number;
  proposer: string;
  electionTitle: string;
  electionDescription: string;
  electionNode: string;
  createdAtTimestamp: number;
  electionStartTimestamp: number;
  electionEndTimestamp: number;
  endorsementCount: number;
  endorsementVotes: number;
  endorsementTimestamp: number;
  candidates?: ElectionCandidate[];
  totalVotes?: number;
  quorumThreshold?: number;
}

export interface CandidateEndorsement {
  endorsementNode: Uint8Array;
  endorsementElectionNode: Uint8Array;
  endorsementCandidateNode: Uint8Array;
  endorsementCount: bigint;
  endorsementVotes: bigint;
  endorsementTimestamp: bigint;
}

/**
 * Convert Uint8Array to hex string (browser-compatible alternative to Buffer.toString('hex'))
 */
function uint8ArrayToHex(uint8Array: Uint8Array): string {
  return Array.from(uint8Array)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Convert Uint8Array to string (browser-compatible alternative to Buffer.toString())
 */
function uint8ArrayToString(bytes: Uint8Array): string {
  let str = "";
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return str;
}

/**
 * Strip trailing zero bytes from string
 */
function stripTrailingZeroBytes(input: string): string {
  return input.replace(/\0+$/, "");
}

export class ElectionInfoService {
  private algod: algosdk.Algodv2;
  private senderAddress: string | null = null;

  constructor(algod: algosdk.Algodv2, senderAddress?: string) {
    this.algod = algod;
    this.senderAddress = senderAddress || null;
  }

  /**
   * Create a CONTRACT instance for the given network
   */
  private createContract(network: NetworkId): CONTRACT {
    const appId = getGovernanceAppId(network);
    const sender = this.senderAddress || algosdk.getApplicationAddress(appId);

    const contract = new CONTRACT(
      appId,
      this.algod,
      undefined,
      { ...PowGovernanceAppSpec.contract, events: [] },
      { addr: sender, sk: new Uint8Array() }
    );

    // Enable raw bytes to get proper return values
    contract.setEnableRawBytes(true);

    return contract;
  }

  /**
   * Fetch election information from the blockchain
   */
  async fetchElectionInfo(
    electionNode: string,
    network: NetworkId
  ): Promise<ElectionInfo | null> {
    try {
      const contract = this.createContract(network);

      // Convert election node string to bytes
      const electionNodeBytes = new Uint8Array(electionNode.length / 2);
      for (let i = 0; i < electionNode.length; i += 2) {
        electionNodeBytes[i / 2] = parseInt(electionNode.substr(i, 2), 16);
      }

      // Call get_election method using CONTRACT
      const result = await contract.get_election(electionNodeBytes);

      console.log("Election result:", result);

      if (!result.success) {
        console.warn(
          "No election data returned for node:",
          electionNode,
          result.error
        );
        return null;
      }

      if (!result.returnValue) {
        console.warn(
          "Election data result is undefined for node:",
          electionNode
        );
        return null;
      }

      const electionData = result.returnValue;

      // Decode the election data following the commands.ts pattern
      const title = stripTrailingZeroBytes(uint8ArrayToString(electionData[3]));
      const description = stripTrailingZeroBytes(
        uint8ArrayToString(electionData[4])
      );
      const node = uint8ArrayToHex(electionData[5]);

      return {
        electionIndex: Number(electionData[0]),
        electionStatus: Number(electionData[1]),
        proposer: electionData[2],
        electionTitle: title,
        electionDescription: description,
        electionNode: node,
        createdAtTimestamp: Number(electionData[6]),
        electionStartTimestamp: Number(electionData[7]),
        electionEndTimestamp: Number(electionData[8]),
        endorsementCount: Number(electionData[9]),
        endorsementVotes: Number(electionData[10]),
        endorsementTimestamp: Number(electionData[11]),
      };
    } catch (error) {
      console.error("Error fetching election info:", error);
      throw new Error(
        `Failed to fetch election info: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get election node hash from title and description
   */
  async getElectionNode(
    title: string,
    description: string,
    network: NetworkId
  ): Promise<string | null> {
    try {
      const contract = this.createContract(network);

      // Convert strings to bytes
      const titleBytes = new TextEncoder().encode(title);
      const descriptionBytes = new TextEncoder().encode(description);

      // Pad to required lengths
      const paddedTitle = new Uint8Array(64);
      const paddedDescription = new Uint8Array(512);

      paddedTitle.set(titleBytes.slice(0, 64));
      paddedDescription.set(descriptionBytes.slice(0, 512));

      const result = await contract.get_election_node(
        paddedTitle,
        paddedDescription
      );

      if (!result.success) {
        console.warn(
          "No election node returned for title:",
          title,
          result.error
        );
        return null;
      }

      if (!result.returnValue) {
        console.warn("Election node result is undefined for title:", title);
        return null;
      }

      return uint8ArrayToHex(result.returnValue);
    } catch (error) {
      console.error("Error getting election node:", error);
      throw new Error(
        `Failed to get election node: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get candidate endorsement information
   */
  async getCandidateEndorsement(
    electionNode: string,
    candidateNode: string,
    network: NetworkId
  ): Promise<CandidateEndorsement | null> {
    try {
      const contract = this.createContract(network);

      // Convert strings to bytes
      const electionNodeBytes = new Uint8Array(electionNode.length / 2);
      const candidateNodeBytes = new Uint8Array(candidateNode.length / 2);

      for (let i = 0; i < electionNode.length; i += 2) {
        electionNodeBytes[i / 2] = parseInt(electionNode.substr(i, 2), 16);
      }

      for (let i = 0; i < candidateNode.length; i += 2) {
        candidateNodeBytes[i / 2] = parseInt(candidateNode.substr(i, 2), 16);
      }

      const result = await contract.get_candidate_endorsement(
        electionNodeBytes,
        candidateNodeBytes
      );

      console.log("Candidate endorsement result:", result);

      if (!result.success) {
        console.warn("Failed to get candidate endorsement:", result.error);
        return null;
      }

      if (result.returnValue === undefined || result.returnValue === null) {
        console.warn("Candidate endorsement result is undefined");
        return null;
      }

      // The result.returnValue is an array that needs to be converted to Endorsement struct
      return Endorsement(result.returnValue as [Uint8Array, Uint8Array, Uint8Array, bigint, bigint, bigint]);

    } catch (error) {
      console.error("Error getting candidate endorsement:", error);
      return null;
    }
  }

  /**
   * Check if election is currently active
   */
  isElectionActive(electionInfo: ElectionInfo): boolean {
    const now = Math.floor(Date.now() / 1000);
    return (
      electionInfo.electionStatus === 1 && // Active status
      electionInfo.electionStartTimestamp <= now &&
      electionInfo.electionEndTimestamp > now
    );
  }

  /**
   * Get election status string
   */
  getElectionStatusString(electionInfo: ElectionInfo): string {
    const now = Math.floor(Date.now() / 1000);

    if (electionInfo.electionStatus === 0) return "Upcoming";
    if (electionInfo.electionStatus === 1) {
      if (electionInfo.electionStartTimestamp > now) return "Upcoming";
      if (electionInfo.electionEndTimestamp <= now) return "Completed";
      return "Active";
    }
    if (electionInfo.electionStatus === 2) return "Completed";
    if (electionInfo.electionStatus === 3) return "Cancelled";

    return "Unknown";
  }

  /**
   * Get time remaining until election ends
   */
  getTimeRemaining(electionInfo: ElectionInfo): string {
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = electionInfo.electionEndTimestamp - now;

    if (timeLeft <= 0) return "Ended";

    const days = timeLeft / (24 * 60 * 60);
    const hours = (days % 1) * 24;
    const minutes = (hours % 1) * 60;

    if (days >= 1) {
      return `${Math.floor(days)}d ${Math.floor(hours)}h ${Math.floor(
        minutes
      )}m`;
    } else if (hours >= 1) {
      return `${Math.floor(hours)}h ${Math.floor(minutes)}m`;
    } else {
      return `${Math.floor(minutes)}m`;
    }
  }
}

// Export singleton instance factory
export const createElectionInfoService = (
  algod: algosdk.Algodv2,
  senderAddress?: string
) => new ElectionInfoService(algod, senderAddress);
