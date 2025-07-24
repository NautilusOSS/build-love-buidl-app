import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Users, Vote, TrendingUp, Clock, CheckCircle, Plus, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { useWallet } from "@txnlab/use-wallet-react";

// Mock data - replace with actual data from your governance contract
const mockUserProfile = {
  address: "0x1234567890abcdef1234567890abcdef12345678",
  votingPower: 1500,
  participationRate: 85,
  totalVotes: 12,
  proposalsCreated: 3,
  lastVote: "2024-01-15T14:30:00Z"
};

const mockMyProposals = [
  {
    id: "1",
    title: "Increase Treasury Allocation for Development",
    status: "active",
    createdAt: "2024-01-15",
    totalVotes: 45,
    yesVotes: 32,
    noVotes: 13
  },
  {
    id: "2",
    title: "Update Governance Parameters",
    status: "succeeded",
    createdAt: "2024-01-10",
    totalVotes: 89,
    yesVotes: 67,
    noVotes: 22
  },
  {
    id: "3",
    title: "Add New Validator Node",
    status: "pending",
    createdAt: "2024-01-12",
    totalVotes: 0,
    yesVotes: 0,
    noVotes: 0
  }
];

const mockMyVotes = [
  {
    id: "1",
    proposalTitle: "Increase Treasury Allocation for Development",
    vote: true,
    votingPower: 500,
    timestamp: "2024-01-16T10:30:00Z"
  },
  {
    id: "2",
    proposalTitle: "Update Governance Parameters",
    vote: true,
    votingPower: 500,
    timestamp: "2024-01-11T14:20:00Z"
  },
  {
    id: "3",
    proposalTitle: "Implement Fee Reduction",
    vote: false,
    votingPower: 500,
    timestamp: "2024-01-09T16:45:00Z"
  }
];

const mockRecentActivity = [
  {
    id: "1",
    type: "vote",
    description: "Voted for proposal #1",
    timestamp: "2024-01-16T10:30:00Z"
  },
  {
    id: "2",
    type: "proposal",
    description: "Created proposal #3",
    timestamp: "2024-01-12T14:20:00Z"
  },
  {
    id: "3",
    type: "vote",
    description: "Voted against proposal #4",
    timestamp: "2024-01-09T16:45:00Z"
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
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const formatAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const Dashboard = () => {
  const { activeWallet } = useWallet();
  const [activeTab, setActiveTab] = useState("overview");

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
          Dashboard
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed drop-shadow-lg mb-4 px-2">
          Your governance activity and voting history
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 px-2">
          <Button
            asChild
            variant="outline"
            className="px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 text-sm sm:text-base md:text-lg font-bold border-2 border-white text-white hover:bg-white hover:text-black rounded-full shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm w-full sm:w-auto"
          >
            <Link to="/governance/proposals">
              <Plus className="h-4 w-4 mr-2" />
              Create Proposal
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );

  if (!activeWallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-purple-950 to-indigo-950">
        {HeroSection}
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-muted-foreground mb-6 text-white/80">
              Connect your wallet to view your governance dashboard and voting history.
            </p>
            <Button asChild variant="outline" className="rounded-full border-2 border-white text-white hover:bg-white hover:text-black">
              <Link to="/governance">Go to Governance</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-purple-950 to-indigo-950">
      {HeroSection}
      <div className="container mx-auto px-4 pb-16 space-y-8">
        {/* Section Divider and Header */}
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <h2 className="text-2xl font-bold text-white tracking-tight animate-fade-in">Overview</h2>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-white/20 to-transparent" />
        </div>

        {/* User Profile Card */}
        <Card className="bg-white/5 border border-white/10 shadow-lg rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {mockUserProfile.address.slice(2, 4).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              Profile Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground text-white/70">Address</div>
                <div className="font-mono text-sm text-white">{formatAddress(mockUserProfile.address)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground text-white/70">Voting Power</div>
                <div className="font-bold text-white">{mockUserProfile.votingPower.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground text-white/70">Participation Rate</div>
                <div className="flex items-center gap-2">
                  <Progress value={mockUserProfile.participationRate} className="flex-1 h-2" />
                  <span className="text-sm font-medium text-white">{mockUserProfile.participationRate}%</span>
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground text-white/70">Total Votes</div>
                <div className="font-bold text-white">{mockUserProfile.totalVotes}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white/5 border border-white/10 shadow-lg rounded-3xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-white">
                <Vote className="h-4 w-4" />
                Active Proposals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-300">3</div>
              <p className="text-xs text-muted-foreground text-white/70">
                Currently open for voting
              </p>
              <Button asChild variant="outline" size="sm" className="mt-2 rounded-full border-2 border-white text-white hover:bg-white hover:text-black">
                <Link to="/governance/proposals">View All</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border border-white/10 shadow-lg rounded-3xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-white">
                <Clock className="h-4 w-4" />
                Pending Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-300">1</div>
              <p className="text-xs text-muted-foreground text-white/70">
                Proposals to activate
              </p>
              <Button asChild variant="outline" size="sm" className="mt-2 rounded-full border-2 border-white text-white hover:bg-white hover:text-black">
                <Link to="/governance/proposals">View All</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border border-white/10 shadow-lg rounded-3xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-white">
                <Activity className="h-4 w-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-300">12</div>
              <p className="text-xs text-muted-foreground text-white/70">
                Actions this month
              </p>
              <Button asChild variant="outline" size="sm" className="mt-2 rounded-full border-2 border-white text-white hover:bg-white hover:text-black">
                <Link to="/governance/proposals">View All</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-white/10 border-white/10 rounded-2xl">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="proposals">My Proposals</TabsTrigger>
            <TabsTrigger value="votes">My Votes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card className="bg-white/5 border border-white/10 shadow-lg rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-white">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockRecentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div className="flex-1">
                          <div className="text-sm text-white">{activity.description}</div>
                          <div className="text-xs text-muted-foreground text-white/70">
                            {formatDate(activity.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Voting Statistics */}
              <Card className="bg-white/5 border border-white/10 shadow-lg rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-white">Voting Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/80">Proposals Voted On</span>
                      <span className="font-medium text-white">{mockUserProfile.totalVotes}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/80">Proposals Created</span>
                      <span className="font-medium text-white">{mockUserProfile.proposalsCreated}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/80">Last Vote</span>
                      <span className="font-medium text-white">{formatDate(mockUserProfile.lastVote)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="proposals" className="space-y-4">
            <Card className="bg-white/5 border border-white/10 shadow-lg rounded-3xl">
              <CardHeader>
                <CardTitle className="text-white">My Proposals</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Votes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockMyProposals.map((proposal) => (
                      <TableRow key={proposal.id}>
                        <TableCell className="font-medium text-white">{proposal.title}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(proposal.status)}>
                            {getStatusLabel(proposal.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white/80">{formatDate(proposal.createdAt)}</TableCell>
                        <TableCell className="text-white/80">{proposal.totalVotes}</TableCell>
                        <TableCell>
                          <Button asChild variant="outline" size="sm" className="rounded-full border-2 border-white text-white hover:bg-white hover:text-black">
                            <Link to={`/governance/proposals/${proposal.id}`}>
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="votes" className="space-y-4">
            <Card className="bg-white/5 border border-white/10 shadow-lg rounded-3xl">
              <CardHeader>
                <CardTitle className="text-white">My Votes</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proposal</TableHead>
                      <TableHead>Vote</TableHead>
                      <TableHead>Voting Power</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockMyVotes.map((vote) => (
                      <TableRow key={vote.id}>
                        <TableCell className="font-medium text-white">{vote.proposalTitle}</TableCell>
                        <TableCell>
                          <Badge variant={vote.vote ? "default" : "destructive"}>
                            {vote.vote ? "For" : "Against"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white/80">{vote.votingPower.toLocaleString()}</TableCell>
                        <TableCell className="text-white/80">{formatDate(vote.timestamp)}</TableCell>
                        <TableCell>
                          <Button asChild variant="outline" size="sm" className="rounded-full border-2 border-white text-white hover:bg-white hover:text-black">
                            <Link to={`/governance/proposals/${vote.id}`}>
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard; 