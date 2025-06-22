import React, { useState, useEffect } from "react";
import { AirdropEntry, AirdropIndexEntry } from "@/types/airdrop";
import { TARGET_AIRDROP_ID } from "./AccountAirdrop";

interface AirdropAmountProps {
  address: string;
  onDataLoaded?: (data: AirdropEntry | null) => void;
  showNetworks?: boolean;
}

const AirdropAmount: React.FC<AirdropAmountProps> = ({
  address,
  onDataLoaded,
  showNetworks = false,
}) => {
  const [airdropData, setAirdropData] = useState<AirdropEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAirdropData = async () => {
      if (!address) return;

      setIsLoading(true);
      setError(null);
      try {
        // First, fetch the index.json to get available airdrops
        const indexResponse = await fetch(
          "https://nautilusoss.github.io/airdrop/index.json"
        );
        if (!indexResponse.ok) {
          throw new Error("Failed to fetch airdrop index");
        }
        const indexData = await indexResponse.json();

        // Find the POW airdrop (id: "003-wop")
        const powAirdrop = indexData.find(
          (airdrop: AirdropIndexEntry) => airdrop.id === TARGET_AIRDROP_ID
        );
        if (!powAirdrop) {
          throw new Error("POW airdrop not found in index");
        }

        // Now fetch the specific airdrop data
        const response = await fetch(
          `https://nautilusoss.github.io/airdrop/data/${powAirdrop.id}.json`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch airdrop data");
        }
        const data = await response.json();

        // Find the specific address in the airdrop data
        const matchingEntry = data.find(
          (entry: AirdropEntry) =>
            entry.Address.toLowerCase() === address.toLowerCase()
        );

        setAirdropData(matchingEntry || null);
        onDataLoaded?.(matchingEntry || null);
      } catch (err) {
        console.error("Error fetching airdrop data:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
        onDataLoaded?.(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAirdropData();
  }, [address, onDataLoaded]);

  if (isLoading) {
    return (
      <div className="text-center p-4">
        <div className="animate-spin h-6 w-6 border-4 border-[#1EAEDB] border-t-transparent rounded-full mx-auto mb-2"></div>
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4">
        <p className="text-sm text-red-500">Error loading data</p>
      </div>
    );
  }

  if (!airdropData) {
    return (
      <div className="text-center p-4">
        <p className="text-sm text-gray-500">No airdrop found</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      {showNetworks ? (
        <div className="space-y-2">
          {airdropData.Voi > 0 && (
            <div className="text-sm">
              <span className="text-gray-600">VOI: </span>
              <span className="font-semibold text-[#1EAEDB]">
                {airdropData.Voi.toFixed(6)} POW
              </span>
            </div>
          )}
          {airdropData.Algo > 0 && (
            <div className="text-sm">
              <span className="text-gray-600">Algorand: </span>
              <span className="font-semibold text-[#1EAEDB]">
                {airdropData.Algo.toFixed(6)} POW
              </span>
            </div>
          )}
          <div className="text-lg font-bold text-[#1EAEDB] border-t border-gray-200 pt-2">
            {airdropData.Total.toFixed(6)} POW
          </div>
        </div>
      ) : (
        <div className="text-2xl font-bold text-[#1EAEDB]">
          {airdropData.Total.toFixed(6)} POW
        </div>
      )}
    </div>
  );
};

export default AirdropAmount;
