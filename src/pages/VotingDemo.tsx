import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import VotingToast from "@/components/VotingToast";
import CountdownTimer from "@/components/CountdownTimer";
import CrossChainStatus from "@/components/CrossChainStatus";
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
  BarChart3,
  Calendar,
  Hash,
  ExternalLink,
  Copy,
  AlertTriangle,
  Sparkles,
  ThumbsUp,
  ArrowLeft,
  Home,
  Map
} from "lucide-react";

export default function VotingDemo() {
  const [lockAmount, setLockAmount] = useState([5000]);
  const [lockDuration, setLockDuration] = useState("4w");
  const [userVP, setUserVP] = useState(12000);
  const [isEligible, setIsEligible] = useState(true);
  const [lockDaysRemaining, setLockDaysRemaining] = useState(21);
  const [showToast, setShowToast] = useState(false);
  const [toastVoteType, setToastVoteType] = useState<"for" | "against" | "abstain">("for");
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

  const handleVote = (voteType: "for" | "against" | "abstain") => {
    setToastVoteType(voteType);
    setShowToast(true);
  };

  const mockChains = [
    {
      name: "VOI",
      color: "bg-teal-500/20 text-teal-400 border-teal-500/30",
      votingPower: 8500,
      totalVP: 50000,
      lockedValue: 8500,
      multiplier: 1.2,
      status: "active" as const
    },
    {
      name: "ALGO",
      color: "bg-violet-500/20 text-violet-400 border-violet-500/30",
      votingPower: 2500,
      totalVP: 30000,
      lockedValue: 2500,
      multiplier: 1.0,
      status: "active" as const
    },
    {
      name: "EVM",
      color: "bg-gray-500/20 text-gray-400 border-gray-500/30",
      votingPower: 1000,
      totalVP: 25000,
      lockedValue: 1000,
      multiplier: 1.0,
      status: "pending" as const
    }
  ];

  const totalVP = mockChains.reduce((sum, chain) => sum + chain.votingPower, 0);
  const eligibleChains = mockChains.filter(chain => chain.status === "active").length;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation Header */}
      <div className="border-b border-gray-800/50 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => window.location.href = '/'}
                className="text-gray-400 hover:text-white"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
              <div className="hidden md:block h-6 w-px bg-gray-600"></div>
              <Button 
                variant="ghost" 
                onClick={() => window.location.href = '/roadmap'}
                className="hidden md:flex text-gray-400 hover:text-white"
              >
                <Map className="w-4 h-4 mr-2" />
                Roadmap
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="glass-morphism-silver neon-glow-silver">
                <Shield className="w-4 h-4 mr-2" />
                Connected: shelly.voi
              </Badge>
              <Button variant="outline" className="glass-morphism-violet neon-glow-violet">
                <Wallet className="w-4 h-4 mr-2" />
                Identity
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-gray-800/50 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gradient-primary mb-2">
              enChain Voting ✦ One voice, many chains.
            </h1>
            <p className="text-gray-400 text-lg">
              Stake-to-Vote governance across multiple chains
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="glass-morphism mb-8">
            <TabsTrigger value="overview" className="data-[state=active]:neon-glow-teal">
              <Sparkles className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="voting" className="data-[state=active]:neon-glow-violet">
              <ThumbsUp className="w-4 h-4 mr-2" />
              Voting
            </TabsTrigger>
            <TabsTrigger value="chains" className="data-[state=active]:neon-glow-silver">
              <Globe className="w-4 h-4 mr-2" />
              Chains
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Voting Power Summary */}
              <Card className="glass-morphism-violet neon-glow-violet">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Your Voting Power
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-teal-400" />
                    <span className="text-teal-400">
                      Eligible: active lock {lockDaysRemaining}d remaining
                    </span>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-gradient mb-2">
                      {totalVP.toLocaleString()}
                    </div>
                    <div className="text-gray-400">Total Voting Power</div>
                  </div>
                  <Progress value={(totalVP / 50000) * 100} className="h-3" />
                </CardContent>
              </Card>

              {/* Countdown Timer */}
              <CountdownTimer 
                endTime={new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()} 
              />
            </div>

            {/* Cross-Chain Status */}
            <CrossChainStatus 
              chains={mockChains}
              totalVP={totalVP}
              eligibleChains={eligibleChains}
            />

            {/* Recent Activity */}
            <Card className="glass-morphism">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>AT</AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-teal-400">atlas.voi</span> voted FOR on "Increase VOI Block Rewards"
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
                    <span className="text-gray-300">founder.voi</span> voted AGAINST on "Cross-Chain Bridge"
                    <div className="text-gray-400 text-xs">1h ago</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Voting Tab */}
          <TabsContent value="voting" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Proposal Card */}
              <div className="lg:col-span-2">
                <Card className="glass-morphism neon-glow-teal">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">Increase VOI Block Rewards by 15%</CardTitle>
                        <CardDescription className="text-gray-300 mb-4">
                          Proposal to increase block rewards from 10 VOI to 11.5 VOI per block to incentivize more validators.
                        </CardDescription>
                      </div>
                      <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30">
                        Open
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        2d 14h 32m
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="bg-teal-500/20 text-teal-400 border-teal-500/30">
                          VOI
                        </Badge>
                        <Badge variant="outline" className="bg-violet-500/20 text-violet-400 border-violet-500/30">
                          ALGO
                        </Badge>
                        <Badge variant="outline" className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                          EVM
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-400">For: 1,250,000</span>
                        <span className="text-red-400">Against: 890,000</span>
                        <span className="text-gray-400">Abstain: 150,000</span>
                      </div>
                      <Progress value={54.8} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Voting Controls */}
              <div className="space-y-6">
                {/* Lock Controls */}
                <Card className="glass-morphism-violet neon-glow-violet">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="w-5 h-5" />
                      Lock Value
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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

                    <div className="text-center">
                      <div className="text-lg font-semibold text-gradient">
                        VP: {calculateVP().toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-400">
                        {isEligible ? "You will be eligible to vote" : "Lock for 7+ days to become eligible"}
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
                  </CardContent>
                </Card>

                {/* Vote Buttons */}
                <Card className="glass-morphism-silver">
                  <CardHeader>
                    <CardTitle className="text-lg">Cast Your Vote</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button 
                      className="w-full neon-glow-teal"
                      onClick={() => handleVote("for")}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Vote For
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      onClick={() => handleVote("against")}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Vote Against
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleVote("abstain")}
                    >
                      <Minus className="w-4 h-4 mr-2" />
                      Abstain
                    </Button>
                    <div className="text-xs text-gray-400 text-center pt-2">
                      Changes to locks take effect immediately. Locks &lt; 7d are ineligible.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Chains Tab */}
          <TabsContent value="chains" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockChains.map((chain, index) => (
                <Card key={index} className="glass-morphism hover:neon-glow-teal transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${chain.color.split(' ')[0]}`}>
                        {chain.name.slice(0, 2)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{chain.name}</CardTitle>
                        <Badge variant="outline" className={chain.color}>
                          {chain.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Voting Power</span>
                        <span className="font-semibold">{chain.votingPower.toLocaleString()}</span>
                      </div>
                      <Progress value={(chain.votingPower / chain.totalVP) * 100} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Locked Value</span>
                        <span>${chain.lockedValue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Multiplier</span>
                        <span>{chain.multiplier}×</span>
                      </div>
                    </div>
                    <Button className="w-full neon-glow-teal">
                      <Settings className="w-4 h-4 mr-2" />
                      Manage
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Voting Toast */}
      <VotingToast 
        isVisible={showToast}
        voteType={toastVoteType}
        votingPower={totalVP}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
}
