import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Calendar, Users, Vote, Search, Filter, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useWallet } from "@txnlab/use-wallet-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, ThumbsUp, ThumbsDown, Zap } from "lucide-react";

// Mock data - replace with actual data from your governance contract
const mockProposals = [
  {
    id: "1",
    title: "Increase Treasury Allocation for Development",
    description: "Proposal to increase the treasury allocation from 10% to 15% to fund additional development initiatives and community projects.",
    status: "active",
    category: "Treasury",
    author: "0x1234...5678",
    createdAt: "2024-01-15",
    totalVotes: 45,
    yesVotes: 32,
    noVotes: 13,
    votingEnds: "2024-01-23"
  },
  {
    id: "2",
    title: "Update Governance Parameters",
    description: "Adjust voting period from 7 days to 5 days and quorum threshold from 1000 to 800 tokens.",
    status: "succeeded",
    category: "Governance",
    author: "0x8765...4321",
    createdAt: "2024-01-10",
    totalVotes: 89,
    yesVotes: 67,
    noVotes: 22,
    votingEnds: "2024-01-17"
  },
  {
    id: "3",
    title: "Add New Validator Node",
    description: "Proposal to onboard a new validator node to improve network decentralization and performance.",
    status: "pending",
    category: "Infrastructure",
    author: "0x9876...5432",
    createdAt: "2024-01-12",
    totalVotes: 0,
    yesVotes: 0,
    noVotes: 0,
    votingEnds: null
  },
  {
    id: "4",
    title: "Implement Fee Reduction",
    description: "Reduce transaction fees by 20% to improve user experience and increase adoption.",
    status: "defeated",
    category: "Development",
    author: "0x1111...2222",
    createdAt: "2024-01-08",
    totalVotes: 67,
    yesVotes: 25,
    noVotes: 42,
    votingEnds: "2024-01-15"
  },
  {
    id: "5",
    title: "Community Grant Program",
    description: "Establish a community grant program to fund innovative projects and initiatives.",
    status: "executed",
    category: "Community",
    author: "0x5432...8765",
    createdAt: "2024-01-05",
    totalVotes: 123,
    yesVotes: 98,
    noVotes: 25,
    votingEnds: "2024-01-12"
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

const getCategoryColor = (category: string) => {
  switch (category) {
    case "Treasury": return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    case "Governance": return "bg-purple-500/20 text-purple-300 border-purple-500/30";
    case "Infrastructure": return "bg-green-500/20 text-green-300 border-green-500/30";
    case "Community": return "bg-orange-500/20 text-orange-300 border-orange-500/30";
    case "Development": return "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
    case "Security": return "bg-red-500/20 text-red-300 border-red-500/30";
    default: return "bg-gray-500/20 text-gray-300 border-gray-500/30";
  }
};

const ProposalsList = () => {
  const { activeWallet } = useWallet();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [proposals, setProposals] = useState(mockProposals);
  const [voteModalOpen, setVoteModalOpen] = useState(false);
  const [votingProposal, setVotingProposal] = useState<string | null>(null);
  const [selectedVote, setSelectedVote] = useState<'yes' | 'no' | null>(null);
  const [submittingVote, setSubmittingVote] = useState(false);
  const userVotingPower = 500; // Mock voting power

  // Get unique categories for filter dropdown
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(proposals.map(p => p.category))];
    return uniqueCategories.sort();
  }, [proposals]);

  // Filter and sort proposals
  const filteredProposals = useMemo(() => {
    return proposals
      .filter(proposal => {
        const matchesSearch = proposal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             proposal.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             proposal.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || proposal.status === statusFilter;
        const matchesCategory = categoryFilter === "all" || proposal.category === categoryFilter;
        return matchesSearch && matchesStatus && matchesCategory;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "newest":
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case "oldest":
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case "most-votes":
            return b.totalVotes - a.totalVotes;
          case "least-votes":
            return a.totalVotes - b.totalVotes;
          default:
            return 0;
        }
      });
  }, [searchQuery, statusFilter, categoryFilter, sortBy, proposals]);

  const handleVoteClick = (proposalId: string) => {
    setVotingProposal(proposalId);
    setVoteModalOpen(true);
    setSelectedVote(null);
  };

  const handleSubmitVote = async () => {
    if (!selectedVote || !votingProposal) return;
    setSubmittingVote(true);
    try {
      // Simulate transaction signing and confirmation
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Update the proposal with the new vote
      setProposals(prevProposals =>
        prevProposals.map(proposal =>
          proposal.id === votingProposal
            ? {
                ...proposal,
                totalVotes: proposal.totalVotes + 1,
                yesVotes: proposal.yesVotes + (selectedVote === 'yes' ? 1 : 0),
                noVotes: proposal.noVotes + (selectedVote === 'no' ? 1 : 0)
              }
            : proposal
        )
      );
      setVoteModalOpen(false);
      setVotingProposal(null);
      setSelectedVote(null);
    } catch (error) {
      // Optionally handle error
    } finally {
      setSubmittingVote(false);
    }
  };

  const handleCloseVoteModal = () => {
    setVoteModalOpen(false);
    setVotingProposal(null);
    setSelectedVote(null);
    setSubmittingVote(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-purple-950 to-indigo-950">
      {/* Hero Section */}
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
            All Proposals
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed drop-shadow-lg mb-4 px-2">
            Browse and participate in governance proposals.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 px-2">
            {activeWallet && (
              <Button
                asChild
                variant="outline"
                className="px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 text-sm sm:text-base md:text-lg font-bold border-2 border-white text-white hover:bg-white hover:text-black rounded-full shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm w-full sm:w-auto"
              >
                <Link to="/governance/proposals/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Proposal
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Section Divider and Header */}
      <div className="container mx-auto px-4 pb-8">
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <h2 className="text-2xl font-bold text-white tracking-tight animate-fade-in">All Proposals</h2>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-white/20 to-transparent" />
        </div>

        {/* Filters & Search */}
        <Card className="bg-white/5 border border-white/10 shadow-lg rounded-3xl mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search proposals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/10 border-white/10 text-white placeholder:text-gray-400 rounded-2xl focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white/10 border-white/10 text-white rounded-2xl focus:ring-2 focus:ring-blue-500/50">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="succeeded">Succeeded</SelectItem>
                  <SelectItem value="defeated">Defeated</SelectItem>
                  <SelectItem value="executed">Executed</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="bg-white/10 border-white/10 text-white rounded-2xl focus:ring-2 focus:ring-blue-500/50">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-white/10 border-white/10 text-white rounded-2xl focus:ring-2 focus:ring-blue-500/50">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="most-votes">Most Votes</SelectItem>
                  <SelectItem value="least-votes">Least Votes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="text-sm text-gray-400 mb-4">
          Showing {filteredProposals.length} of {mockProposals.length} proposals
        </div>

        {/* Proposals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProposals.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-500/20 rounded-full flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No proposals found</h3>
              <p className="text-gray-400 mb-4">
                Try adjusting your search terms or filters to find what you're looking for.
              </p>
              {activeWallet && (
                <Button asChild variant="outline" className="rounded-full">
                  <Link to="/governance/proposals/create">
                    <Plus className="h-4 w-4 mr-2" />
                    Create the First Proposal
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            filteredProposals.map((proposal) => {
              const votePercentage = proposal.totalVotes > 0 
                ? (proposal.yesVotes / proposal.totalVotes) * 100 
                : 0;
              return (
                <Card key={proposal.id} className="bg-white/5 border border-white/10 shadow-lg hover:scale-[1.02] hover:shadow-2xl transition-all duration-200 animate-fade-in flex flex-col rounded-3xl">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2 h-12">
                      <CardTitle className="text-lg line-clamp-2 text-white flex-1">
                        {proposal.title}
                      </CardTitle>
                      <Badge variant={getStatusVariant(proposal.status)} className="ml-2 text-xs px-2 py-1 rounded-full font-semibold">
                        {getStatusLabel(proposal.status)}
                      </Badge>
                    </div>
                    {/* Category Badge */}
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={`text-xs px-2 py-1 rounded-full font-semibold border ${getCategoryColor(proposal.category)}`}>
                        {proposal.category}
                      </Badge>
                      <span className="text-xs text-gray-400">by {proposal.author}</span>
                    </div>
                    <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-2" />
                    <p className="text-muted-foreground line-clamp-2 mb-2">
                      {proposal.description}
                    </p>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Created {formatDate(proposal.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{proposal.totalVotes} votes</span>
                      </div>
                    </div>
                    {proposal.status === "active" && (
                      <div className="space-y-3 mb-4">
                        {/* Voting Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>Voting Progress</span>
                            <span>{proposal.totalVotes} total votes</span>
                          </div>
                          <div className="relative">
                            <Progress 
                              value={votePercentage} 
                              className="h-3 bg-gray-700/50" 
                            />
                            <div 
                              className="absolute inset-0 rounded-full bg-gradient-to-r from-green-500/20 to-green-600/20"
                              style={{ width: `${votePercentage}%` }}
                            />
                          </div>
                        </div>
                        {/* Vote Breakdown */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-green-400 font-medium">For</span>
                              <span className="text-sm font-bold text-green-300">{proposal.yesVotes}</span>
                            </div>
                            <div className="text-xs text-green-400/70">
                              {votePercentage.toFixed(1)}% of votes
                            </div>
                          </div>
                          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-red-400 font-medium">Against</span>
                              <span className="text-sm font-bold text-red-300">{proposal.noVotes}</span>
                            </div>
                            <div className="text-xs text-red-400/70">
                              {proposal.totalVotes > 0 ? ((proposal.noVotes / proposal.totalVotes) * 100).toFixed(1) : 0}% of votes
                            </div>
                          </div>
                        </div>
                        {/* Time Remaining */}
                        {proposal.votingEnds && (
                          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-blue-400" />
                                <span className="text-xs text-blue-400 font-medium">Voting Ends</span>
                              </div>
                              <span className="text-sm font-bold text-blue-300">
                                {formatDate(proposal.votingEnds)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2 mt-auto">
                      <Button asChild variant="outline" size="sm" className="rounded-full">
                        <Link to={`/governance/proposals/${proposal.id}`}>
                          View Details
                        </Link>
                      </Button>
                      {proposal.status === "active" && (
                        <Button size="sm" className="rounded-full" onClick={() => handleVoteClick(proposal.id)}>
                          <Vote className="h-4 w-4 mr-1" />
                          Vote
                        </Button>
                      )}
                      {proposal.status === "pending" && (
                        <Button asChild variant="outline" size="sm" className="rounded-full">
                          <Link to={`/governance/proposals/${proposal.id}`}>
                            Activate
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Voting Modal */}
      <Dialog open={voteModalOpen} onOpenChange={handleCloseVoteModal}>
        <DialogContent className="sm:max-w-md bg-gray-900/95 backdrop-blur-md border border-white/10 shadow-2xl !rounded-3xl sm:!rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Vote className="h-5 w-5" />
              Cast Your Vote
            </DialogTitle>
            <DialogDescription>
              {votingProposal && proposals.find(p => p.id === votingProposal)?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Voting Power Display */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-blue-300">Your Voting Power</span>
                </div>
                <span className="text-lg font-bold text-blue-200">{userVotingPower.toLocaleString()}</span>
              </div>
              <p className="text-xs text-blue-400/70 mt-1">
                This represents your influence on this proposal
              </p>
            </div>
            {/* Impact Preview */}
            {votingProposal && (() => {
              const proposal = proposals.find(p => p.id === votingProposal);
              if (!proposal || proposal.status !== "active") return null;
              const currentYes = proposal.yesVotes;
              const currentNo = proposal.noVotes;
              const currentTotal = proposal.totalVotes;
              const currentYesPct = currentTotal > 0 ? (currentYes / currentTotal) * 100 : 0;
              const currentNoPct = currentTotal > 0 ? (currentNo / currentTotal) * 100 : 0;
              let newYes = currentYes;
              let newNo = currentNo;
              let newTotal = currentTotal;
              if (selectedVote === 'yes') {
                newYes += 1;
                newTotal += 1;
              } else if (selectedVote === 'no') {
                newNo += 1;
                newTotal += 1;
              }
              const newYesPct = newTotal > 0 ? (newYes / newTotal) * 100 : 0;
              const newNoPct = newTotal > 0 ? (newNo / newTotal) * 100 : 0;
              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>Impact Preview</span>
                    <span className="rounded-full bg-gray-700/40 px-2 py-0.5 text-[10px] text-gray-300">if you vote {selectedVote === 'yes' ? 'Yes' : selectedVote === 'no' ? 'No' : ''}</span>
                  </div>
                  <div className="relative">
                    {/* Current progress bar */}
                    <Progress value={currentYesPct} className="h-2 bg-gray-700/50" />
                    {/* Preview progress bar overlays */}
                    {selectedVote && (
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
                variant={selectedVote === 'yes' ? 'default' : 'outline'}
                className={`h-16 flex flex-col items-center justify-center gap-2 rounded-2xl ${
                  selectedVote === 'yes' ? 'bg-green-600 hover:bg-green-700' : ''
                }`}
                onClick={() => setSelectedVote('yes')}
                disabled={submittingVote}
              >
                <ThumbsUp className="h-6 w-6" />
                <span className="font-semibold">Vote Yes</span>
              </Button>
              <Button
                variant={selectedVote === 'no' ? 'default' : 'outline'}
                className={`h-16 flex flex-col items-center justify-center gap-2 rounded-2xl ${
                  selectedVote === 'no' ? 'bg-red-600 hover:bg-red-700' : ''
                }`}
                onClick={() => setSelectedVote('no')}
                disabled={submittingVote}
              >
                <ThumbsDown className="h-6 w-6" />
                <span className="font-semibold">Vote No</span>
              </Button>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleCloseVoteModal}
                disabled={submittingVote}
                className="flex-1 rounded-2xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitVote}
                disabled={!selectedVote || submittingVote}
                className="flex-1 rounded-2xl"
              >
                {submittingVote ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Vote'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProposalsList; 