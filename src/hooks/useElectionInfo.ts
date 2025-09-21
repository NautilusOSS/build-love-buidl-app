import { useState, useEffect, useCallback } from "react";
import { useWallet, NetworkId } from "@txnlab/use-wallet-react";
import algosdk from "algosdk";
import {
  ElectionInfoService,
  ElectionInfo,
} from "@/services/electionInfoService";
import { ElectionConfig } from "@/types/elections";

export interface UseElectionInfoReturn {
  electionInfo: ElectionInfo | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isElectionActive: boolean;
  timeRemaining: string;
  electionStatus: string;
}

export const useElectionInfo = (
  election: ElectionConfig | null
): UseElectionInfoReturn => {
  const [electionInfo, setElectionInfo] = useState<ElectionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [service, setService] = useState<ElectionInfoService | null>(null);

  const { activeNetwork, algodClient, activeAccount } = useWallet();

  // Initialize service when network changes
  useEffect(() => {
    if (activeNetwork && algodClient) {
      const algod =
        activeNetwork === NetworkId.LOCALNET
          ? new algosdk.Algodv2(
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              "http://10.0.0.31",
              4001
            )
          : algodClient;

      setService(new ElectionInfoService(algod, activeAccount?.address));
    }
  }, [activeNetwork, algodClient, activeAccount?.address]);

  const fetchElectionInfo = useCallback(async () => {
    if (!election || !service || !activeNetwork) {
      setElectionInfo(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("Fetching election info for proposalHash:", election.proposalHash);
      
      // Use the proposalHash directly from the election config
      const electionInfo = await service.fetchElectionInfo(
        election.proposalHash,
        activeNetwork
      );

      console.log("Found election info:", electionInfo);

      setElectionInfo(electionInfo);
    } catch (err) {
      console.error("Error fetching election info:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch election info"
      );
      // Don't set electionInfo to null on error, keep existing data
    } finally {
      setIsLoading(false);
    }
  }, [election, service, activeNetwork]);

  // Fetch election info when election or service changes
  useEffect(() => {
    fetchElectionInfo();
  }, [fetchElectionInfo]);

  // Calculate derived values
  const isElectionActive = electionInfo
    ? service?.isElectionActive(electionInfo) ?? false
    : false;
  const timeRemaining = electionInfo
    ? service?.getTimeRemaining(electionInfo) ?? "Unknown"
    : "Unknown";
  const electionStatus = electionInfo
    ? service?.getElectionStatusString(electionInfo) ?? "Unknown"
    : "Unknown";

  return {
    electionInfo,
    isLoading,
    error,
    refetch: fetchElectionInfo,
    isElectionActive,
    timeRemaining,
    electionStatus,
  };
};
