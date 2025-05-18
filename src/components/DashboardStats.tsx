import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Banknote, Users, Coins, Database } from "lucide-react";
import algosdk from "algosdk";

// Add interface for API response
interface Transfer {
  amount: string;
  sender: string;
  receiver: string;
  timestamp: number;
}

interface Balance {
  address: string;
  balance: string;
}

// Add new interface for price data
interface PriceData {
  poolId: string;
  contractId: number;
  symbolA: string;
  symbolB: string;
  price: number;
}

const DashboardStats: React.FC = () => {
  const [transferData, setTransferData] = useState<Transfer[]>([]);
  const [bvoiSupply, setBvoiSupply] = useState<number>(0);
  const [treasuryBalance, setTreasuryBalance] = useState<number>(0);
  const [aUSDCVoiPrice, setaUSDCVoiPrice] = useState<number>(0);
  const [buidlPrice, setBuidlPrice] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch transfers
        const transferResponse = await fetch(
          "https://voi-mainnet-mimirapi.nftnavigator.xyz/arc200/transfers?contractId=419744&from=742YB2CM53GGSHFQXAWXXVG2ZECZA2Y65JU5TM43RQMPDAICGVOYNXHFNE"
        );
        const transferData = await transferResponse.json();
        setTransferData(transferData.transfers);

        // Fetch bVOI balances
        const bvoiResponse = await fetch(
          "https://voi-mainnet-mimirapi.nftnavigator.xyz/arc200/balances?contractId=8471125"
        );
        const bvoiData = await bvoiResponse.json();
        const totalSupply = bvoiData.balances
          .filter(
            (balance: any) =>
              balance.accountId !== algosdk.getApplicationAddress(8471125) &&
              balance.accountId !==
                "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ"
          )
          .reduce((sum: number, balance: Balance) => {
            return sum + parseFloat(balance.balance) / 1e6;
          }, 0);
        setBvoiSupply(totalSupply);

        // Fetch treasury balance
        const treasuryResponse = await fetch(
          "https://voi-mainnet-mimirapi.nftnavigator.xyz/arc200/balances?contractId=419744&accountId=JDXFR5SD4LG7PDZXIA7Q5GNSEBDHV5EG4T77DWD5E6FKWPWEOILC4OU2DU"
        );
        const treasuryData = await treasuryResponse.json();
        const treasury = treasuryData.balances[0]?.balance
          ? parseFloat(treasuryData.balances[0].balance) / 1e8
          : 0;
        setTreasuryBalance(treasury);

        // Add price fetch
        const priceResponse = await fetch(
          "https://mainnet-idx.nautilus.sh/nft-indexer/v1/dex/prices"
        );
        const priceData = await priceResponse.json();
        const aUSDCVoiPool = priceData.prices.find(
          (pool: PriceData) => pool.contractId === 395553
        );
        if (aUSDCVoiPool) {
          setaUSDCVoiPrice(aUSDCVoiPool.price);
        }
        const buidlPool = priceData.prices.find(
          (pool: PriceData) => pool.contractId === 8364792
        );
        if (buidlPool) {
          setBuidlPrice(1 / buidlPool.price);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  // Calculate total amount from transfers
  const totalDistributed = transferData.reduce((sum, transfer) => {
    return sum + parseFloat(transfer.amount) / 1e8;
  }, 0);

  // Calculate unique contributors (receivers)
  const uniqueContributors = new Set(
    transferData.map((transfer) => transfer.receiver)
  ).size;

  // Update stats with dynamic data
  const stats = [
    {
      label: "Total BUIDL Distributed",
      value: totalDistributed.toLocaleString(),
      icon: Coins,
      color: "text-[#9b87f5]",
      sub: "BUIDL",
    },
    {
      label: "Contributors",
      value: uniqueContributors,
      icon: Users,
      color: "text-[#33C3F0]",
      sub: "Users",
    },
    {
      label: "bVOI Supply",
      value: bvoiSupply.toLocaleString(),
      icon: Database,
      color: "text-[#8B5CF6]",
      sub: "bVOI",
    },
    {
      label: "Treasury Status",
      value: `${(treasuryBalance * aUSDCVoiPrice).toLocaleString()}`,
      icon: Banknote,
      color: "text-[#33C3F0]",
      sub: "USD",
    },
  ];

  const cellBorderRounding = [
    // [top-left, top-right, bottom-left, bottom-right]
    "rounded-tl-2xl", // top-left cell
    "rounded-tr-2xl", // top-right cell
    "rounded-bl-2xl", // bottom-left cell
    "rounded-br-2xl", // bottom-right cell
  ];

  return (
    <Card className="w-full rounded-2xl glass-morphism border-white/10 bg-[#1A1F2Ccc] shadow-lg mb-8 p-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
        {stats.slice(0, 4).map((stat, idx) => (
          <div
            key={stat.label}
            className={[
              "flex items-center gap-4 px-6 py-7 bg-transparent",
              // Add the right border for col 1 on sm+ only
              idx % 2 === 0 ? "sm:border-r sm:border-white/10" : "",
              // Add the bottom border for the first row on sm+ only
              idx < 2 ? "sm:border-b sm:border-white/10" : "",
              // Add outer border radius per cell
              cellBorderRounding[idx],
            ].join(" ")}
          >
            <div
              className={`rounded-xl p-3 bg-[#232534e8] shadow-md ${stat.color} flex items-center justify-center`}
            >
              <stat.icon className={`w-7 h-7 ${stat.color}`} />
            </div>
            <div>
              <div className="text-white/90 text-xs font-semibold uppercase tracking-wider mb-1">
                {stat.label}
              </div>
              <div className="text-white text-2xl font-extrabold leading-tight flex items-end gap-1">
                {stat.value}
                {stat.sub && (
                  <span className="text-sm font-semibold ml-1 text-[#9b87f5]">
                    {stat.sub}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default DashboardStats;
