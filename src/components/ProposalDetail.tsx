import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Clock, 
  Users, 
  TrendingUp, 
  Lock, 
  Star, 
  ChevronRight,
  Zap,
  Shield,
  Globe,
  Link as LinkIcon,
  CheckCircle,
  XCircle,
  Minus,
  Plus,
  Settings,
  Wallet,
  ArrowLeft,
  ExternalLink,
  BarChart3,
  Calendar,
  Hash
} from "lucide-react";

interface ProposalDetailProps {
  proposal: {
    id: number;
    title: string;
    description: string;
    status: "Open" | "Passed" | "Closed";
    timeRemaining: string;
    votesFor: number;
    votesAgainst: number;
    votesAbstain: number;
    chains: string[];
    enfsRef: string;
    fullDescription?: string;
    proposer?: string;
    createdAt?: string;
    votingEnds?: string;
  };
  onBack: () => void;
}

export default function ProposalDetail({ proposal, onBack }: ProposalDetailProps) {
  const [lockAmount, setLockAmount] = useState([5000]);
  const [lockDuration, setLockDuration] = useState("4w");
  const [userVP, setUserVP] = useState(12000);
  const [isEligible, setIsEligible] = useState(true);
  const [lockDaysRemaining, setLockDaysRemaining] = useState(21);
  const [showLockDialog, setShowLockDialog] = useState(false);

  const durationMultipliers = {
    "1w": 1.0,
    "4w": 1.2,
    "12w": 1.5
  };

  const calculateVP = () => {
    const baseVP = lockAmount[0];
    const multiplier = durationMultipliers[lockDuration as keyof typeof durationMultipliers];
    return Math.floor(baseVP * multiplier);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open": return "bg-teal-500/20 text-teal-400 border-teal-500/30";
      case "Passed": return "bg-violet-500/20 text-violet-400 border-violet-500/30";
      case "Closed": return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getChainChipColor = (chain: string) => {
    switch (chain) {
      case "VOI": return "bg-teal-500/20 text-teal-400 border-teal-500/30";
      case "ALGO": return "bg-violet-500/20 text-violet-400 border-violet-500/30";
      case "EVM": return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      case "COSMOS": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;
  const forPercentage = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (proposal.votesAgainst / totalVotes) * 100 : 0;
  const abstainPercentage = totalVotes > 0 ? (proposal.votesAbstain / totalVotes) * 100 : 0;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" onClick={onBack} className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Proposals
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gradient-primary mb-2">
                {proposal.title}
              </h1>
              <div className="flex items-center gap-4 text-gray-400">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Created: {proposal.createdAt || "Dec 15, 2024"}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {proposal.timeRemaining}
                </div>
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Proposal #{proposal.id}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge className={getStatusColor(proposal.status)}>
                {proposal.status}
              </Badge>
              <Button variant="outline" className="glass-morphism-violet neon-glow-violet">
                <ExternalLink className="w-4 h-4 mr-2" />
                View on enfs://
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Card */}
            <Card className="glass-morphism neon-glow-teal">
              <CardHeader>
                <CardTitle className="text-2xl mb-4">{proposal.title}</CardTitle>
                <CardDescription className="text-gray-300 text-lg leading-relaxed">
                  {proposal.fullDescription || proposal.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    {proposal.chains.map((chain) => (
                      <Badge key={chain} variant="outline" className={getChainChipColor(chain)}>
                        {chain}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <LinkIcon className="w-4 h-4" />
                    <span>{proposal.enfsRef}</span>
                  </div>
                </div>
                {proposal.proposer && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">Proposed by:</span>
                    <span className="text-teal-400">{proposal.proposer}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Voting Results */}
            <Card className="glass-morphism-silver">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Voting Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Results Bars */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-400 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        For
                      </span>
                      <span className="text-gray-300">
                        {proposal.votesFor.toLocaleString()} ({forPercentage.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress value={forPercentage} className="h-3" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-red-400 flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        Against
                      </span>
                      <span className="text-gray-300">
                        {proposal.votesAgainst.toLocaleString()} ({againstPercentage.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress value={againstPercentage} className="h-3" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400 flex items-center gap-2">
                        <Minus className="w-4 h-4" />
                        Abstain
                      </span>
                      <span className="text-gray-300">
                        {proposal.votesAbstain.toLocaleString()} ({abstainPercentage.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress value={abstainPercentage} className="h-3" />
                  </div>
                </div>

                {/* Total Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-800">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gradient">{totalVotes.toLocaleString()}</div>
                    <div className="text-sm text-gray-400">Total Votes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-teal-400">{forPercentage.toFixed(1)}%</div>
                    <div className="text-sm text-gray-400">For</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-violet-400">{proposal.chains.length}</div>
                    <div className="text-sm text-gray-400">Chains</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cross-Chain Breakdown */}
            <Card className="glass-morphism">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Cross-Chain Tally
                </CardTitle>
                <CardDescription>
                  Your VP is tallied across chains, bound to your enVOI name
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {proposal.chains.map((chain) => (
                    <div key={chain} className="text-center p-4 rounded-lg bg-black/20 border border-gray-800">
                      <div className="text-lg font-semibold text-gradient">{chain}</div>
                      <div className="text-sm text-gray-400">Chain Votes</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {Math.floor(Math.random() * 1000000).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Voting Power Panel */}
            <Card className="glass-morphism-violet neon-glow-violet">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Your Voting Power
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Eligibility Status */}
                <div className="flex items-center gap-2">
                  {isEligible ? (
                    <CheckCircle className="w-5 h-5 text-teal-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span className={isEligible ? "text-teal-400" : "text-red-400"}>
                    {isEligible 
                      ? `Eligible: active lock ${lockDaysRemaining}d remaining`
                      : "Not eligible: lock at least 7d to vote"
                    }
                  </span>
                </div>

                {/* VP Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Locked: ${lockAmount[0].toLocaleString()}</span>
                    <span>Multiplier: {durationMultipliers[lockDuration as keyof typeof durationMultipliers]}×</span>
                  </div>
                  <div className="text-lg font-semibold text-gradient">
                    VP: {calculateVP().toLocaleString()}
                  </div>
                  <Progress value={(calculateVP() / 50000) * 100} className="h-2" />
                </div>

                {/* Lock Controls */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-gray-300">Lock Amount ($)</Label>
                    <Slider
                      value={lockAmount}
                      onValueChange={setLockAmount}
                      max={50000}
                      min={100}
                      step={100}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>$100</span>
                      <span>$50,000</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm text-gray-300">Duration</Label>
                    <div className="flex gap-2 mt-2">
                      {Object.entries(durationMultipliers).map(([duration, multiplier]) => (
                        <Button
                          key={duration}
                          variant={lockDuration === duration ? "default" : "outline"}
                          size="sm"
                          onClick={() => setLockDuration(duration)}
                          className={lockDuration === duration ? "neon-glow-teal" : ""}
                        >
                          {duration} ({multiplier}×)
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Dialog open={showLockDialog} onOpenChange={setShowLockDialog}>
                    <DialogTrigger asChild>
                      <Button className="w-full neon-glow-teal">
                        <Lock className="w-4 h-4 mr-2" />
                        Lock Value
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-morphism">
                      <DialogHeader>
                        <DialogTitle>Confirm Lock</DialogTitle>
                        <DialogDescription>
                          This will lock ${lockAmount[0].toLocaleString()} for {lockDuration} with a {durationMultipliers[lockDuration as keyof typeof durationMultipliers]}× multiplier.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gradient">
                            VP: {calculateVP().toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-400">
                            {isEligible ? "You will be eligible to vote" : "Lock for 7+ days to become eligible"}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            className="flex-1 neon-glow-teal"
                            onClick={() => setShowLockDialog(false)}
                          >
                            Confirm Lock
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setShowLockDialog(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Vote Buttons */}
            {proposal.status === "Open" && (
              <Card className="glass-morphism-silver">
                <CardHeader>
                  <CardTitle className="text-lg">Cast Your Vote</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full neon-glow-teal">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Vote For
                  </Button>
                  <Button variant="destructive" className="w-full">
                    <XCircle className="w-4 h-4 mr-2" />
                    Vote Against
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Minus className="w-4 h-4 mr-2" />
                    Abstain
                  </Button>
                  <div className="text-xs text-gray-400 text-center pt-2">
                    Changes to locks take effect immediately. Locks &lt; 7d are ineligible.
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Activity Feed */}
            <Card className="glass-morphism">
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>AT</AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-teal-400">atlas.voi</span> voted FOR
                    <div className="text-gray-400 text-xs">2m ago</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>CO</AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-violet-400">cosmos.voi</span> increased lock by $2,100
                    <div className="text-gray-400 text-xs">15m ago</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>FO</AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-gray-300">founder.voi</span> voted AGAINST
                    <div className="text-gray-400 text-xs">1h ago</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
