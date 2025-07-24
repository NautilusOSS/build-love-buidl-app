import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  Vote, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User,
  TrendingUp,
  TrendingDown,
  AlertCircle
} from "lucide-react";
import { useWallet } from "@txnlab/use-wallet-react";

// Mock data - replace with actual data from your governance contract
const mockProposal = {
  id: "1",
  title: "Increase Treasury Allocation for Development",
  description: "This proposal seeks to increase the treasury allocation from 10% to 15% of all transaction fees to fund additional development initiatives and community projects. The additional 5% allocation will be used to:\n\n1. Fund open-source development grants\n2. Support community-driven projects\n3. Hire additional developers for core protocol development\n4. Establish a bug bounty program\n5. Create educational content and documentation\n\nThis change will help accelerate the ecosystem's growth and ensure sustainable development funding.",
  status: "active",
  createdAt: "2024-01-15T14:30:00Z",
  createdBy: "0x1234567890abcdef1234567890abcdef12345678",
  totalVotes: 45,
  yesVotes: 32,
  noVotes: 13,
  votingStarts: "2024-01-16T00:00:00Z",
  votingEnds: "2024-01-23T00:00:00Z",
  quorum: 1000,
  currentQuorum: 2340,
  executionDelay: 24, // hours
  canVote: true,
  hasVoted: false,
  userVote: null,
  canActivate: false,
  canExecute: false,
  canVeto: false
};

const mockVoteHistory = [
  {
    id: "1",
    voter: "0x1234567890abcdef1234567890abcdef12345678",
    support: true,
    votingPower: 500,
    timestamp: "2024-01-16T10:30:00Z",
    reason: "Strongly support development funding"
  },
  {
    id: "2",
    voter: "0xabcdef1234567890abcdef1234567890abcdef12",
    support: false,
    votingPower: 300,
    timestamp: "2024-01-16T11:15:00Z",
    reason: "Concerned about treasury inflation"
  },
  {
    id: "3",
    voter: "0x567890abcdef1234567890abcdef1234567890ab",
    support: true,
    votingPower: 750,
    timestamp: "2024-01-16T14:20:00Z",
    reason: "Development is crucial for growth"
  }
];

const getStatusVariant = (status: string) => {
  switch (status) {
    case "pending": return "secondary";
    case "active": return "default";
    case "succeeded": return "default";
    case "defeated": return "destructive";
    case "executed": return "default";
    case "canceled": return "secondary";
    case "expired": return "secondary";
    default: return "secondary";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "pending": return "Pending";
    case "active": return "Active";
    case "succeeded": return "Succeeded";
    case "defeated": return "Defeated";
    case "executed": return "Executed";
    case "canceled": return "Canceled";
    case "expired": return "Expired";
    default: return "Unknown";
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const ProposalDetail = () => {
  const { id } = useParams();
  const { activeWallet } = useWallet();
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [selectedVote, setSelectedVote] = useState<boolean | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const userVotingPower = 500; // Mock voting power

  // Mock proposal data - in real app, fetch by ID
  const proposal = mockProposal;
  
  const votePercentage = proposal.totalVotes > 0 
    ? (proposal.yesVotes / proposal.totalVotes) * 100 
    : 0;

  const handleVote = async () => {
    if (selectedVote === null) return;
    
    setIsVoting(true);
    try {
      // Mock voting transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(`Voting ${selectedVote ? 'for' : 'against'} proposal ${id}`);
      setVoteDialogOpen(false);
      // In real app, update proposal state after successful vote
    } catch (error) {
      console.error('Vote failed:', error);
    } finally {
      setIsVoting(false);
    }
  };

  const handleActivate = async () => {
    try {
      // Mock activation transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(`Activating proposal ${id}`);
      // In real app, update proposal state after successful activation
    } catch (error) {
      console.error('Activation failed:', error);
    }
  };

  const handleExecute = async () => {
    try {
      // Mock execution transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(`Executing proposal ${id}`);
      // In real app, update proposal state after successful execution
    } catch (error) {
      console.error('Execution failed:', error);
    }
  };

  // --- Animated Hero Section (copied and adapted from Governance.tsx) ---
  const HeroSection = (
    <div className="relative min-h-[40vh] sm:min-h-[50vh] flex items-center justify-center overflow-hidden w-full py-4 sm:py-8 md:py-16 md:pt-24 pb-8 sm:pb-16 md:pb-24">
      {/* Animated Background */}
      <div className="absolute inset-0 w-full h-full">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900"></div>
        {/* Animated Grid Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            animation: 'gridMove 20s linear infinite'
          }}></div>
        </div>
        {/* Animated Particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-blue-400/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            ></div>
          ))}
        </div>
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60"></div>
      </div>
      {/* Hero Content */}
      <div className="relative z-10 text-center px-2 sm:px-4 max-w-3xl mx-auto w-full">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white drop-shadow-2xl leading-tight mb-4">
          Proposal Details
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed drop-shadow-lg mb-4 px-2">
          View and participate in the governance process for this proposal.
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 px-2">
          <Button
            asChild
            variant="outline"
            className="px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 text-sm sm:text-base md:text-lg font-bold border-2 border-white text-white hover:bg-white hover:text-black rounded-full shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm w-full sm:w-auto"
          >
            <Link to="/governance/proposals">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Proposals
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-purple-950 to-indigo-950">
      {HeroSection}
      <div className="container mx-auto px-4 pb-16 space-y-8">
        {/* Section Divider and Header */}
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <h2 className="text-2xl font-bold text-white tracking-tight animate-fade-in">Proposal Overview</h2>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-white/20 to-transparent" />
        </div>

        {/* Proposal Header */}
        <Card className="bg-white/5 border border-white/10 shadow-lg rounded-3xl">
          <CardHeader>
            <div className="space-y-2">
              <CardTitle className="text-2xl text-white">{proposal.title}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>Created by {formatAddress(proposal.createdBy)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(proposal.createdAt)}</span>
                </div>
                <Badge variant={getStatusVariant(proposal.status)} className="ml-2 text-xs px-2 py-1 rounded-full font-semibold">
                  {getStatusLabel(proposal.status)}
                </Badge>
                <span className="text-sm text-muted-foreground">#{proposal.id}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-white/90">
              <p className="whitespace-pre-line">{proposal.description}</p>
            </div>
          </CardContent>
        </Card>

        {/* Voting Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white/5 border border-white/10 shadow-lg rounded-3xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-white">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                Total Votes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-300">{proposal.totalVotes}</div>
              <p className="text-xs text-muted-foreground">
                {proposal.currentQuorum} / {proposal.quorum} quorum met
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border border-white/10 shadow-lg rounded-3xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-white">
                <CheckCircle className="h-4 w-4 text-green-400" />
                Votes For
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-300">{proposal.yesVotes}</div>
              <p className="text-xs text-muted-foreground">
                {votePercentage.toFixed(1)}% of total votes
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border border-white/10 shadow-lg rounded-3xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-white">
                <XCircle className="h-4 w-4 text-red-400" />
                Votes Against
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-300">{proposal.noVotes}</div>
              <p className="text-xs text-muted-foreground">
                {(100 - votePercentage).toFixed(1)}% of total votes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Voting Progress */}
        {proposal.status === "active" && (
          <Card className="bg-white/5 border border-white/10 shadow-lg rounded-3xl">
            <CardHeader>
              <CardTitle className="text-white">Voting Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Progress value={votePercentage} className="h-3" />
                <div className="flex justify-between text-sm">
                  <span className="text-green-400 font-medium">
                    {proposal.yesVotes} For ({votePercentage.toFixed(1)}%)
                  </span>
                  <span className="text-red-400 font-medium">
                    {proposal.noVotes} Against ({(100 - votePercentage).toFixed(1)}%)
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Voting Started:</span>
                  <span>{formatDate(proposal.votingStarts)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Voting Ends:</span>
                  <span>{formatDate(proposal.votingEnds)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        <Card className="bg-white/5 border border-white/10 shadow-lg rounded-3xl">
          <CardHeader>
            <CardTitle className="text-white">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <div className="font-medium text-white">Created</div>
                  <div className="text-sm text-muted-foreground">{formatDate(proposal.createdAt)}</div>
                </div>
              </div>
              {proposal.status !== "pending" && (
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <div>
                    <div className="font-medium text-white">Activated</div>
                    <div className="text-sm text-muted-foreground">{formatDate(proposal.votingStarts)}</div>
                  </div>
                </div>
              )}
              {proposal.status === "active" && (
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div>
                    <div className="font-medium text-white">Voting Period</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(proposal.votingStarts)} - {formatDate(proposal.votingEnds)}
                    </div>
                  </div>
                </div>
              )}
              {proposal.status === "succeeded" && (
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <div>
                    <div className="font-medium text-white">Succeeded</div>
                    <div className="text-sm text-muted-foreground">{formatDate(proposal.votingEnds)}</div>
                  </div>
                </div>
              )}
              {proposal.status === "executed" && (
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <div className="font-medium text-white">Executed</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(new Date(new Date(proposal.votingEnds).getTime() + proposal.executionDelay * 60 * 60 * 1000).toISOString())}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card className="bg-white/5 border border-white/10 shadow-lg rounded-3xl">
          <CardHeader>
            <CardTitle className="text-white">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {proposal.status === "active" && proposal.canVote && !proposal.hasVoted && (
                <>
                  <Button className="rounded-full" onClick={() => setVoteDialogOpen(true)}>
                    <Vote className="h-4 w-4 mr-2" />
                    Vote
                  </Button>
                  {/* Vote Modal */}
                  <Dialog open={voteDialogOpen} onOpenChange={setVoteDialogOpen}>
                    <DialogContent className="sm:max-w-md bg-gray-900/95 backdrop-blur-md border border-white/10 shadow-2xl !rounded-3xl sm:!rounded-3xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Vote className="h-5 w-5" />
                          Cast Your Vote
                        </DialogTitle>
                        <div className="text-muted-foreground text-sm mt-1">{proposal.title}</div>
                      </DialogHeader>
                      <div className="space-y-4">
                        {/* Voting Power Display */}
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-blue-400" />
                              <span className="text-sm font-medium text-blue-300">Your Voting Power</span>
                            </div>
                            <span className="text-lg font-bold text-blue-200">{userVotingPower.toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-blue-400/70 mt-1">
                            This represents your influence on this proposal
                          </p>
                        </div>
                        {/* Impact Preview */}
                        {(() => {
                          if (proposal.status !== "active") return null;
                          const currentYes = proposal.yesVotes;
                          const currentNo = proposal.noVotes;
                          const currentTotal = proposal.totalVotes;
                          const currentYesPct = currentTotal > 0 ? (currentYes / currentTotal) * 100 : 0;
                          const currentNoPct = currentTotal > 0 ? (currentNo / currentTotal) * 100 : 0;
                          let newYes = currentYes;
                          let newNo = currentNo;
                          let newTotal = currentTotal;
                          if (selectedVote === true) {
                            newYes += 1;
                            newTotal += 1;
                          } else if (selectedVote === false) {
                            newNo += 1;
                            newTotal += 1;
                          }
                          const newYesPct = newTotal > 0 ? (newYes / newTotal) * 100 : 0;
                          const newNoPct = newTotal > 0 ? (newNo / newTotal) * 100 : 0;
                          return (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span>Impact Preview</span>
                                <span className="rounded-full bg-gray-700/40 px-2 py-0.5 text-[10px] text-gray-300">
                                  {selectedVote === true ? 'if you vote Yes' : selectedVote === false ? 'if you vote No' : ''}
                                </span>
                              </div>
                              <div className="relative">
                                {/* Current progress bar */}
                                <Progress value={currentYesPct} className="h-2 bg-gray-700/50" />
                                {/* Preview progress bar overlays */}
                                {selectedVote !== null && (
                                  <div className="absolute top-0 left-0 h-2 rounded-full bg-green-500/40 transition-all duration-300" style={{ width: `${newYesPct}%`, opacity: 0.7, zIndex: 2 }} />
                                )}
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-green-400">
                                  For: {currentYes} → <b>{newYes}</b> ({currentYesPct.toFixed(1)}% → <b>{newYesPct.toFixed(1)}%</b>)
                                </span>
                                <span className="text-red-400">
                                  Against: {currentNo} → <b>{newNo}</b> ({currentNoPct.toFixed(1)}% → <b>{newNoPct.toFixed(1)}%</b>)
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                        <div className="text-sm text-muted-foreground">
                          Select your vote for this proposal. This action cannot be undone.
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            variant={selectedVote === true ? 'default' : 'outline'}
                            className={`h-16 flex flex-col items-center justify-center gap-2 rounded-2xl ${selectedVote === true ? 'bg-green-600 hover:bg-green-700' : ''}`}
                            onClick={() => setSelectedVote(true)}
                            disabled={isVoting}
                          >
                            <TrendingUp className="h-6 w-6" />
                            <span className="font-semibold">Vote Yes</span>
                          </Button>
                          <Button
                            variant={selectedVote === false ? 'default' : 'outline'}
                            className={`h-16 flex flex-col items-center justify-center gap-2 rounded-2xl ${selectedVote === false ? 'bg-red-600 hover:bg-red-700' : ''}`}
                            onClick={() => setSelectedVote(false)}
                            disabled={isVoting}
                          >
                            <XCircle className="h-6 w-6" />
                            <span className="font-semibold">Vote No</span>
                          </Button>
                        </div>
                        <div className="flex gap-2 pt-4">
                          <Button
                            variant="outline"
                            onClick={() => setVoteDialogOpen(false)}
                            disabled={isVoting}
                            className="flex-1 rounded-2xl"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleVote}
                            disabled={selectedVote === null || isVoting}
                            className="flex-1 rounded-2xl"
                          >
                            {isVoting ? 'Voting...' : 'Submit Vote'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
              {proposal.status === "pending" && proposal.canActivate && (
                <Button variant="outline" onClick={handleActivate} className="rounded-full">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Activate
                </Button>
              )}
              {proposal.status === "succeeded" && proposal.canExecute && (
                <Button variant="outline" onClick={handleExecute} className="rounded-full">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Execute
                </Button>
              )}
              {proposal.hasVoted && (
                <Alert className="bg-yellow-500/10 border-yellow-500/20">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You have already voted {proposal.userVote ? 'for' : 'against'} this proposal.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vote History */}
        <Card className="bg-white/5 border border-white/10 shadow-lg rounded-3xl">
          <CardHeader>
            <CardTitle className="text-white">Vote History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Voter</TableHead>
                  <TableHead>Vote</TableHead>
                  <TableHead>Voting Power</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockVoteHistory.map((vote) => (
                  <TableRow key={vote.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {vote.voter.slice(2, 4).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-mono text-sm text-white">{formatAddress(vote.voter)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={vote.support ? "default" : "destructive"}>
                        {vote.support ? "For" : "Against"}
                      </Badge>
                    </TableCell>
                    <TableCell>{vote.votingPower.toLocaleString()}</TableCell>
                    <TableCell className="max-w-xs truncate">{vote.reason}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(vote.timestamp)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProposalDetail; 