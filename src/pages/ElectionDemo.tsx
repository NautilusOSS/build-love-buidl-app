import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
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
  CheckCircle,
  XCircle,
  Vote,
  Award,
  Calendar,
  Home,
  ArrowLeft,
  Plus,
  Minus,
  Settings
} from "lucide-react";

// Mock election data
const mockElections = [
  {
    id: 1,
    title: "VOI Foundation Board Election",
    description: "Elect 5 members to the VOI Foundation Board for 2024-2025 term",
    status: "Active" as const,
    timeRemaining: "5d 12h 30m",
    candidates: [
      {
        id: 1,
        name: "atlas.voi",
        bio: "Long-time VOI contributor and validator. Focused on network security and scalability.",
        votes: 1250000,
        avatar: "/api/placeholder/40/40",
        endorsements: 45
      },
      {
        id: 2,
        name: "cosmos.voi",
        bio: "Cross-chain specialist with expertise in interoperability protocols.",
        votes: 980000,
        avatar: "/api/placeholder/40/40",
        endorsements: 32
      },
      {
        id: 3,
        name: "founder.voi",
        bio: "Core protocol developer and governance advocate.",
        votes: 2100000,
        avatar: "/api/placeholder/40/40",
        endorsements: 67
      },
      {
        id: 4,
        name: "dao.voi",
        bio: "Decentralized governance expert and community builder.",
        votes: 750000,
        avatar: "/api/placeholder/40/40",
        endorsements: 28
      },
      {
        id: 5,
        name: "tech.voi",
        bio: "Technical architect specializing in blockchain infrastructure.",
        votes: 890000,
        avatar: "/api/placeholder/40/40",
        endorsements: 41
      }
    ],
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
    candidates: [
      {
        id: 6,
        name: "dev.voi",
        bio: "Core developer with 5+ years blockchain experience",
        votes: 0,
        avatar: "/api/placeholder/40/40",
        endorsements: 23
      },
      {
        id: 7,
        name: "architect.voi",
        bio: "System architect specializing in distributed systems",
        votes: 0,
        avatar: "/api/placeholder/40/40",
        endorsements: 18
      },
      {
        id: 8,
        name: "security.voi",
        bio: "Security researcher and smart contract auditor",
        votes: 0,
        avatar: "/api/placeholder/40/40",
        endorsements: 31
      }
    ],
    totalVotes: 0,
    positions: 3,
    chains: ["VOI"]
  }
];

export default function ElectionDemo() {
  const [selectedElection, setSelectedElection] = useState(mockElections[0]);
  const [userVP, setUserVP] = useState(12000);
  const [hasVoted, setHasVoted] = useState(false);
  const [electionLockAmount, setElectionLockAmount] = useState([5000]);
  const [electionLockDuration, setElectionLockDuration] = useState("8w");
  const [electionVP, setElectionVP] = useState(0);
  const [isElectionEligible, setIsElectionEligible] = useState(false);
  const [electionLockDaysRemaining, setElectionLockDaysRemaining] = useState(0);

  // Election-specific duration multipliers (different from proposals)
  const electionDurationMultipliers = {
    "4w": 1.0,
    "8w": 1.5,
    "16w": 2.0,
    "32w": 2.5
  };

  const calculateElectionVP = () => {
    const baseVP = electionLockAmount[0];
    const multiplier = electionDurationMultipliers[electionLockDuration as keyof typeof electionDurationMultipliers];
    return Math.floor(baseVP * multiplier);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-teal-500/20 text-teal-400 border-teal-500/30";
      case "Upcoming": return "bg-violet-500/20 text-violet-400 border-violet-500/30";
      case "Completed": return "bg-gray-500/20 text-gray-400 border-gray-500/30";
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
                onClick={() => window.location.href = '/voting'}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Voting
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="glass-morphism-silver neon-glow-silver">
                <Shield className="w-4 h-4 mr-2" />
                Connected: shelly.voi
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="border-b border-gray-800/50 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gradient-primary mb-2">
              enChain Elections ✦ Democratic governance in action
            </h1>
            <p className="text-gray-400 text-lg">
              Participate in community elections and shape the future
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Election Cards */}
          <div className="lg:col-span-2 space-y-6">
            {mockElections.map((election) => (
              <Card 
                key={election.id} 
                className="glass-morphism hover:neon-glow-teal transition-all duration-300"
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
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {election.candidates.slice(0, 4).map((candidate) => (
                        <div key={candidate.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/30">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback>{candidate.name.split('.')[0].slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{candidate.name}</div>
                            <div className="text-xs text-gray-400">{candidate.votes.toLocaleString()} votes</div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {candidate.endorsements} endorsements
                          </Badge>
                        </div>
                      ))}
                    </div>
                    {election.candidates.length > 4 && (
                      <div className="text-center text-sm text-gray-400">
                        +{election.candidates.length - 4} more candidates
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Total Votes: {election.totalVotes.toLocaleString()}</span>
                      <span className="text-gray-400">Candidates: {election.candidates.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Voting Panel */}
          <div className="space-y-6">
            {/* Election Voting Power Signup */}
            <Card className="glass-morphism-violet neon-glow-violet">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Election Voting Power
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Lock tokens to participate in elections (separate from proposal voting)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Eligibility Status */}
                <div className="flex items-center gap-2">
                  {isElectionEligible ? (
                    <CheckCircle className="w-5 h-5 text-teal-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span className={isElectionEligible ? "text-teal-400" : "text-red-400"}>
                    {isElectionEligible 
                      ? `Eligible: active election lock ${electionLockDaysRemaining}d remaining`
                      : "Not eligible: lock tokens for election voting"
                    }
                  </span>
                </div>

                {/* Current Election VP */}
                {isElectionEligible && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Election Locked: ${electionLockAmount[0].toLocaleString()}</span>
                      <span>Multiplier: {electionDurationMultipliers[electionLockDuration as keyof typeof electionDurationMultipliers]}×</span>
                    </div>
                    <div className="text-lg font-semibold text-gradient">
                      Election VP: {calculateElectionVP().toLocaleString()}
                    </div>
                    <Progress value={(calculateElectionVP() / 100000) * 100} className="h-2" />
                  </div>
                )}

                {/* Election Lock Controls */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-gray-300">Election Lock Amount ($)</Label>
                    <Slider
                      value={electionLockAmount}
                      onValueChange={setElectionLockAmount}
                      max={100000}
                      min={1000}
                      step={500}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>$1,000</span>
                      <span>$100,000</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm text-gray-300">Election Lock Duration</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {Object.entries(electionDurationMultipliers).map(([duration, multiplier]) => (
                        <Button
                          key={duration}
                          variant={electionLockDuration === duration ? "default" : "outline"}
                          size="sm"
                          onClick={() => setElectionLockDuration(duration)}
                          className={electionLockDuration === duration ? "neon-glow-violet" : ""}
                        >
                          {duration} ({multiplier}×)
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1 neon-glow-violet">
                      <Lock className="w-4 h-4 mr-2" />
                      Lock for Elections
                    </Button>
                    <Button variant="outline" className="neon-glow-teal">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Election VP Info */}
                <div className="p-3 rounded-lg bg-gray-800/30 text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="w-4 h-4 text-violet-400" />
                    <span className="font-medium text-violet-400">Election VP Rules</span>
                  </div>
                  <ul className="text-gray-300 space-y-1 text-xs">
                    <li>• Election locks are separate from proposal locks</li>
                    <li>• Longer locks provide higher multipliers</li>
                    <li>• Minimum 4 weeks lock required for elections</li>
                    <li>• Election VP cannot be used for proposals</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Current Election Voting */}
            {selectedElection.status === "Active" && isElectionEligible && (
              <Card className="glass-morphism-silver">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Vote className="w-5 h-5" />
                    Cast Your Vote
                  </CardTitle>
                  <CardDescription>
                    Select up to {selectedElection.positions} candidates
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedElection.candidates.map((candidate) => (
                    <div key={candidate.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/30 hover:bg-gray-700/30 transition-colors">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>{candidate.name.split('.')[0].slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{candidate.name}</div>
                        <div className="text-xs text-gray-400">{candidate.votes.toLocaleString()} votes</div>
                      </div>
                      <Button size="sm" variant="outline" className="neon-glow-teal">
                        Vote
                      </Button>
                    </div>
                  ))}
                  
                  {!hasVoted && (
                    <Button className="w-full neon-glow-teal mt-4">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Submit Votes
                    </Button>
                  )}
                  
                  {hasVoted && (
                    <div className="text-center text-teal-400 text-sm">
                      ✓ Votes submitted successfully
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Not Eligible Message */}
            {selectedElection.status === "Active" && !isElectionEligible && (
              <Card className="glass-morphism-silver">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-400" />
                    Not Eligible to Vote
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-gray-300 space-y-2">
                    <p>You need to lock tokens for election voting to participate.</p>
                    <p className="text-sm text-gray-400">Use the Election Voting Power section above to get started.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Election Stats */}
            <Card className="glass-morphism">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Election Statistics
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
                    <span className="text-white">8</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Your Votes Cast</span>
                    <span className="text-white">3</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
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
                <div className="flex items-center gap-3 text-sm">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>CO</AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-gray-400">cosmos.voi</span> published campaign statement
                    <div className="text-gray-400 text-xs">6h ago</div>
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
