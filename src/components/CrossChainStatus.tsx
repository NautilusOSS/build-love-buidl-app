import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Globe, Zap, Shield, TrendingUp } from "lucide-react";

interface ChainData {
  name: string;
  color: string;
  votingPower: number;
  totalVP: number;
  lockedValue: number;
  multiplier: number;
  status: "active" | "inactive" | "pending";
}

interface CrossChainStatusProps {
  chains: ChainData[];
  totalVP: number;
  eligibleChains: number;
}

export default function CrossChainStatus({ chains, totalVP, eligibleChains }: CrossChainStatusProps) {
  const getChainColor = (chain: string) => {
    switch (chain) {
      case "VOI": return "bg-teal-500/20 text-teal-400 border-teal-500/30";
      case "ALGO": return "bg-violet-500/20 text-violet-400 border-violet-500/30";
      case "EVM": return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      case "COSMOS": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "inactive": return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      case "pending": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <Card className="glass-morphism-violet neon-glow-violet">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Cross-Chain Status
        </CardTitle>
        <CardDescription>
          Your voting power across multiple chains
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-black/20 border border-gray-800">
            <div className="text-2xl font-bold text-gradient">{totalVP.toLocaleString()}</div>
            <div className="text-sm text-gray-400">Total VP</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-black/20 border border-gray-800">
            <div className="text-2xl font-bold text-teal-400">{eligibleChains}</div>
            <div className="text-sm text-gray-400">Active Chains</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-black/20 border border-gray-800">
            <div className="text-2xl font-bold text-violet-400">{chains.length}</div>
            <div className="text-sm text-gray-400">Total Chains</div>
          </div>
        </div>

        {/* Chain Breakdown */}
        <div className="space-y-4">
          {chains.map((chain, index) => (
            <div key={index} className="p-4 rounded-lg bg-black/20 border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getChainColor(chain.name).split(' ')[0]}`}>
                    {chain.name.slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-semibold">{chain.name}</div>
                    <div className="text-sm text-gray-400">
                      ${chain.lockedValue.toLocaleString()} locked
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(chain.status)}>
                    {chain.status}
                  </Badge>
                  <Badge variant="outline" className={getChainColor(chain.name)}>
                    {chain.multiplier}×
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Voting Power</span>
                  <span className="font-semibold">{chain.votingPower.toLocaleString()}</span>
                </div>
                <Progress 
                  value={(chain.votingPower / chain.totalVP) * 100} 
                  className="h-2"
                />
                <div className="text-xs text-gray-400">
                  {((chain.votingPower / chain.totalVP) * 100).toFixed(1)}% of chain total
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Status Legend */}
        <div className="pt-4 border-t border-gray-800">
          <div className="text-sm font-semibold text-gray-300 mb-2">Status Legend</div>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="text-gray-400">Active - Eligible to vote</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
              <span className="text-gray-400">Pending - Lock processing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              <span className="text-gray-400">Inactive - No locks</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
