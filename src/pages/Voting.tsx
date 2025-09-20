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
import ProposalDetail from "@/components/ProposalDetail";
import IdentitySheet from "@/components/IdentitySheet";
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
  Home,
  Map,
  Vote,
  Award
} from "lucide-react";

// Mock data
const mockProposals = [
  {
    id: 1,
    title: "Increase VOI Block Rewards by 15%",
    description: "Proposal to increase block rewards from 10 VOI to 11.5 VOI per block to incentivize more validators.",
    status: "Open" as const,
    timeRemaining: "2d 14h 32m",
    votesFor: 1250000,
    votesAgainst: 890000,
    votesAbstain: 150000,
    chains: ["VOI", "ALGO", "EVM"],
    enfsRef: "enfs://proposal/voi-block-rewards-2024"
  },
  {
    id: 2,
    title: "Implement Cross-Chain Governance Bridge",
    description: "Enable seamless governance participation across VOI, Algorand, and EVM chains.",
    status: "Passed" as const,
    timeRemaining: "Ended",
    votesFor: 2100000,
    votesAgainst: 450000,
    votesAbstain: 200000,
    chains: ["VOI", "ALGO", "EVM", "COSMOS"],
    enfsRef: "enfs://proposal/cross-chain-bridge-2024"
  },
  {
    id: 3,
    title: "Reduce Transaction Fees by 25%",
    description: "Lower transaction fees to improve accessibility and adoption of the VOI network.",
    status: "Closed" as const,
    timeRemaining: "Ended",
    votesFor: 1800000,
    votesAgainst: 1200000,
    votesAbstain: 300000,
    chains: ["VOI"],
    enfsRef: "enfs://proposal/fee-reduction-2024"
  }
];

const mockDelegates = [
  {
    name: "atlas.voi",
    bio: "Long-time VOI contributor and validator. Focused on network security and scalability.",
    reliability: 98,
    assignedVP: 0,
    avatar: "/api/placeholder/40/40"
  },
  {
    name: "cosmos.voi",
    bio: "Cross-chain specialist with expertise in interoperability protocols.",
    reliability: 95,
    assignedVP: 0,
    avatar: "/api/placeholder/40/40"
  },
  {
    name: "founder.voi",
    bio: "Core protocol developer and governance advocate.",
    reliability: 99,
    assignedVP: 0,
    avatar: "/api/placeholder/40/40"
  }
];

const mockGuilds = [
  {
    name: "founder.voi",
    type: "Core Development",
    members: 45,
    activeProposals: 3,
    description: "Core protocol development and maintenance"
  },
  {
    name: "dao.voi",
    type: "Governance",
    members: 128,
    activeProposals: 7,
    description: "Decentralized governance and community management"
  }
];

const mockElections = [
  {
    id: 1,
    title: "VOI Foundation Board Election",
    description: "Elect 5 members to the VOI Foundation Board for 2024-2025 term",
    status: "Active" as const,
    timeRemaining: "5d 12h 30m",
    candidates: 8,
    totalVotes: 5970000,
    positions: 5,
    chains: ["VOI", "ALGO", "EVM"]
  },
  {
    id: 2,
    title: "Technical Committee Election",
    description: "Select 3 technical committee members for protocol development oversight",
    status: "Upcoming" as const,
    timeRemaining: "Starts in 2d 8h",
    candidates: 5,
    totalVotes: 0,
    positions: 3,
    chains: ["VOI"]
  }
];

export default function Voting() {
  const [selectedProposal, setSelectedProposal] = useState(mockProposals[0]);
  const [showProposalDetail, setShowProposalDetail] = useState(false);
  const [showIdentitySheet, setShowIdentitySheet] = useState(false);
  const [lockAmount, setLockAmount] = useState([5000]);
  const [lockDuration, setLockDuration] = useState("4w");
  const [userVP, setUserVP] = useState(12000);
  const [isEligible, setIsEligible] = useState(true);
  const [lockDaysRemaining, setLockDaysRemaining] = useState(21);

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
              <Button 
                variant="outline" 
                className="glass-morphism-violet neon-glow-violet"
                onClick={() => setShowIdentitySheet(true)}
              >
                <Wallet className="w-4 h-4 mr-2" />
                Identity
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
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
        <Tabs defaultValue="proposals" className="w-full">
          <TabsList className="glass-morphism mb-8">
            <TabsTrigger value="proposals" className="data-[state=active]:neon-glow-teal">
              <Globe className="w-4 h-4 mr-2" />
              Proposals
            </TabsTrigger>
            <TabsTrigger value="elections" className="data-[state=active]:neon-glow-violet">
              <Vote className="w-4 h-4 mr-2" />
              Elections
            </TabsTrigger>
            <TabsTrigger value="delegates" className="data-[state=active]:neon-glow-violet">
              <Users className="w-4 h-4 mr-2" />
              Delegates
            </TabsTrigger>
            <TabsTrigger value="guilds" className="data-[state=active]:neon-glow-silver">
              <Star className="w-4 h-4 mr-2" />
              Guilds
            </TabsTrigger>
            <TabsTrigger value="vaults" className="data-[state=active]:neon-glow-teal">
              <Shield className="w-4 h-4 mr-2" />
              Vaults
            </TabsTrigger>
          </TabsList>

          {/* Proposals Tab */}
          <TabsContent value="proposals" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Proposal Cards */}
              <div className="lg:col-span-2 space-y-4">
                {mockProposals.map((proposal) => (
                  <Card 
                    key={proposal.id} 
                    className="glass-morphism hover:neon-glow-teal transition-all duration-300 cursor-pointer"
                    onClick={() => {
                      setSelectedProposal(proposal);
                      setShowProposalDetail(true);
                    }}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl mb-2">{proposal.title}</CardTitle>
                          <CardDescription className="text-gray-300 mb-4">
                            {proposal.description}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(proposal.status)}>
                          {proposal.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {proposal.timeRemaining}
                        </div>
                        <div className="flex gap-2">
                          {proposal.chains.map((chain) => (
                            <Badge key={chain} variant="outline" className={getChainChipColor(chain)}>
                              {chain}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-green-400">For: {proposal.votesFor.toLocaleString()}</span>
                          <span className="text-red-400">Against: {proposal.votesAgainst.toLocaleString()}</span>
                          <span className="text-gray-400">Abstain: {proposal.votesAbstain.toLocaleString()}</span>
                        </div>
                        <Progress 
                          value={(proposal.votesFor / (proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain)) * 100} 
                          className="h-2"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Voting Power Panel */}
              <div className="space-y-6">
                <Card className="glass-morphism-violet neon-glow-violet">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      Voting Power
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

                      <div className="flex gap-2">
                        <Button className="flex-1 neon-glow-teal">
                          <Lock className="w-4 h-4 mr-2" />
                          Lock
                        </Button>
                        <Button variant="outline" className="neon-glow-violet">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Vote Buttons */}
                {selectedProposal.status === "Open" && (
                  <Card className="glass-morphism-silver">
                    <CardHeader>
                      <CardTitle className="text-lg">Cast Vote</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button className="w-full neon-glow-teal">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        For
                      </Button>
                      <Button variant="destructive" className="w-full">
                        <XCircle className="w-4 h-4 mr-2" />
                        Against
                      </Button>
                      <Button variant="outline" className="w-full">
                        <Minus className="w-4 h-4 mr-2" />
                        Abstain
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Activity Feed */}
                <Card className="glass-morphism">
                  <CardHeader>
                    <CardTitle className="text-lg">Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>AT</AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="text-teal-400">atlas.voi</span> increased lock by $1,200
                        <div className="text-gray-400 text-xs">3m ago</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>CO</AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="text-violet-400">cosmos.voi</span> voted FOR on proposal #2
                        <div className="text-gray-400 text-xs">1h ago</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Elections Tab */}
          <TabsContent value="elections" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Election Cards */}
              <div className="lg:col-span-2 space-y-4">
                {mockElections.map((election) => (
                  <Card 
                    key={election.id} 
                    className="glass-morphism hover:neon-glow-violet transition-all duration-300 cursor-pointer"
                    onClick={() => window.location.href = '/election-demo'}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl mb-2">{election.title}</CardTitle>
                          <CardDescription className="text-gray-300 mb-4">
                            {election.description}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(election.status)}>
                          {election.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {election.timeRemaining}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {election.positions} positions
                        </div>
                        <div className="flex gap-2">
                          {election.chains.map((chain) => (
                            <Badge key={chain} variant="outline" className={getChainChipColor(chain)}>
                              {chain}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Candidates: {election.candidates}</span>
                          <span className="text-gray-400">Total Votes: {election.totalVotes.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <Button className="neon-glow-violet">
                            <Vote className="w-4 h-4 mr-2" />
                            View Election
                          </Button>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Election Info Panel */}
              <div className="space-y-6">
                <Card className="glass-morphism-violet neon-glow-violet">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5" />
                      Election Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Active Elections</span>
                        <span className="text-teal-400">1</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Upcoming Elections</span>
                        <span className="text-violet-400">1</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Total Candidates</span>
                        <span className="text-white">13</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Your Votes Cast</span>
                        <span className="text-white">3</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-morphism-silver">
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full neon-glow-violet">
                      <Vote className="w-4 h-4 mr-2" />
                      Vote in Active Election
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Award className="w-4 h-4 mr-2" />
                      View Results
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Users className="w-4 h-4 mr-2" />
                      Candidate Profiles
                    </Button>
                  </CardContent>
                </Card>

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
                        <span className="text-teal-400">atlas.voi</span> received 45 new endorsements
                        <div className="text-gray-400 text-xs">2h ago</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>FO</AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="text-violet-400">founder.voi</span> gained 1,200 votes
                        <div className="text-gray-400 text-xs">4h ago</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Delegates Tab */}
          <TabsContent value="delegates" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockDelegates.map((delegate) => (
                <Card key={delegate.name} className="glass-morphism hover:neon-glow-violet transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback>{delegate.name.split('.')[0].slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{delegate.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-green-400 border-green-400/30">
                            {delegate.reliability}% reliable
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-300 text-sm">{delegate.bio}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Assigned VP: {delegate.assignedVP.toLocaleString()}</span>
                      <Button size="sm" className="neon-glow-violet">
                        Assign
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Guilds Tab */}
          <TabsContent value="guilds" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mockGuilds.map((guild) => (
                <Card key={guild.name} className="glass-morphism hover:neon-glow-silver transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="text-xl">{guild.name}</CardTitle>
                    <CardDescription className="text-gray-300">{guild.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Members: {guild.members}</span>
                      <span className="text-gray-400">Active Proposals: {guild.activeProposals}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1 neon-glow-silver">
                        Join
                      </Button>
                      <Button variant="outline">
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Vaults Tab */}
          <TabsContent value="vaults" className="space-y-6">
            <div className="space-y-4">
              {mockProposals.filter(p => p.status !== "Open").map((proposal) => (
                <Card key={proposal.id} className="glass-morphism">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl mb-2">{proposal.title}</CardTitle>
                        <CardDescription className="text-gray-300 mb-4">
                          {proposal.description}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(proposal.status)}>
                        {proposal.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-400">For: {proposal.votesFor.toLocaleString()}</span>
                        <span className="text-red-400">Against: {proposal.votesAgainst.toLocaleString()}</span>
                        <span className="text-gray-400">Abstain: {proposal.votesAbstain.toLocaleString()}</span>
                      </div>
                      <Progress 
                        value={(proposal.votesFor / (proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain)) * 100} 
                        className="h-3"
                      />
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <LinkIcon className="w-4 h-4" />
                        <span>{proposal.enfsRef}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Proposal Detail Modal */}
      {showProposalDetail && (
        <ProposalDetail 
          proposal={selectedProposal} 
          onBack={() => setShowProposalDetail(false)} 
        />
      )}

      {/* Identity Sheet */}
      <IdentitySheet 
        isOpen={showIdentitySheet} 
        onOpenChange={setShowIdentitySheet} 
      />
    </div>
  );
}
