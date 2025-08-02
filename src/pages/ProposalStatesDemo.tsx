import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink } from "lucide-react";

// Proposal states demonstration
const proposalStates = [
  {
    id: "1",
    title: "Active Proposal",
    description: "Currently open for voting",
    status: "active",
    statusDescription: "Voting is live and users can cast their votes",
    features: ["Vote button available", "Real-time vote tracking", "Progress bars", "Vote history"],
    link: "/governance/proposals/1",
  },
  {
    id: "2",
    title: "Succeeded Proposal",
    description: "Voting passed, ready for execution",
    status: "succeeded",
    statusDescription: "Proposal passed voting and can be executed by admin",
    features: ["Execute button available", "Vote results displayed", "Timeline shows success", "Ready for admin action"],
    link: "/governance/proposals/2",
  },
  {
    id: "3",
    title: "Pending Proposal",
    description: "Waiting for activation",
    status: "pending",
    statusDescription: "Proposal needs support to reach activation threshold",
    features: ["Support button available", "Activation progress", "Threshold tracking", "Can be activated"],
    link: "/governance/proposals/3",
  },
  {
    id: "4",
    title: "Defeated Proposal",
    description: "Voting failed",
    status: "defeated",
    statusDescription: "Proposal did not receive enough votes to pass",
    features: ["Vote results displayed", "Failure reason", "Timeline shows defeat", "No further actions"],
    link: "/governance/proposals/4",
  },
  {
    id: "5",
    title: "Active Proposal (Different)",
    description: "Another active proposal with different data",
    status: "active",
    statusDescription: "Shows how different active proposals look",
    features: ["Different vote counts", "Different progress", "Same voting functionality", "Unique vote history"],
    link: "/governance/proposals/5",
  },
  {
    id: "6",
    title: "Pending Proposal (Near Threshold)",
    description: "Close to activation threshold",
    status: "pending",
    statusDescription: "Almost enough support to activate",
    features: ["High activation power", "Close to threshold", "Support simulation", "Near activation"],
    link: "/governance/proposals/6",
  },
  {
    id: "7",
    title: "Executed Proposal",
    description: "Successfully executed",
    status: "executed",
    statusDescription: "Proposal has been executed on-chain",
    features: ["Execution timestamp", "Final status", "Complete timeline", "Historical record"],
    link: "/governance/proposals/7",
  },
  {
    id: "8",
    title: "Canceled Proposal",
    description: "Manually canceled",
    status: "canceled",
    statusDescription: "Proposal was canceled by creator or admin",
    features: ["Canceled status", "No voting occurred", "Timeline shows cancellation", "Cannot be reactivated"],
    link: "/governance/proposals/8",
  },
  {
    id: "9",
    title: "Expired Proposal",
    description: "Failed to activate",
    status: "expired",
    statusDescription: "Proposal expired without reaching activation threshold",
    features: ["Expired status", "Low activation power", "Timeline shows expiration", "Cannot be reactivated"],
    link: "/governance/proposals/9",
  },
  {
    id: "10",
    title: "Queued Proposal",
    description: "Waiting for execution delay",
    status: "queued",
    statusDescription: "Proposal succeeded and is queued for execution",
    features: ["Queued status", "Execution delay", "Ready for admin", "Safety period"],
    link: "/governance/proposals/10",
  },
];

const getStatusVariant = (status: string) => {
  switch (status) {
    case "pending":
      return "secondary";
    case "active":
      return "default";
    case "succeeded":
      return "default";
    case "defeated":
      return "destructive";
    case "executed":
      return "default";
    case "canceled":
      return "secondary";
    case "expired":
      return "secondary";
    case "queued":
      return "default";
    default:
      return "secondary";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "pending":
      return "Pending";
    case "active":
      return "Active";
    case "succeeded":
      return "Succeeded";
    case "defeated":
      return "Defeated";
    case "executed":
      return "Executed";
    case "canceled":
      return "Canceled";
    case "expired":
      return "Expired";
    case "queued":
      return "Queued";
    default:
      return "Unknown";
  }
};

const ProposalStatesDemo = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-purple-950 to-indigo-950">
      {/* Hero Section */}
      <div className="relative min-h-[40vh] flex items-center justify-center overflow-hidden w-full py-16">
        <div className="absolute inset-0 w-full h-full">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900"></div>
          <div className="absolute inset-0 opacity-20">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
              `,
                backgroundSize: "50px 50px",
                animation: "gridMove 20s linear infinite",
              }}
            ></div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60"></div>
        </div>
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white drop-shadow-2xl leading-tight mb-4">
            Proposal States Demo
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto leading-relaxed drop-shadow-lg mb-6">
            Explore all the different proposal states and their unique features. Each proposal demonstrates different aspects of the governance system.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Button asChild variant="outline" className="px-6 py-3 text-lg font-bold border-2 border-white text-white hover:bg-white hover:text-black rounded-full">
              <Link to="/governance">
                <ArrowRight className="h-5 w-5 mr-2" />
                Back to Governance
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Proposal States Grid */}
      <div className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {proposalStates.map((proposal) => (
            <Card key={proposal.id} className="bg-white/5 border border-white/10 shadow-lg rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between mb-3">
                  <Badge variant={getStatusVariant(proposal.status)} className="text-sm px-3 py-1 rounded-full">
                    {getStatusLabel(proposal.status)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">#{proposal.id}</span>
                </div>
                <CardTitle className="text-lg text-white leading-tight">
                  {proposal.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {proposal.description}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                  <p className="text-sm text-blue-300 font-medium mb-1">Status Description</p>
                  <p className="text-xs text-blue-400/70">
                    {proposal.statusDescription}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm text-white font-medium">Key Features:</p>
                  <ul className="space-y-1">
                    {proposal.features.map((feature, index) => (
                      <li key={index} className="text-xs text-muted-foreground flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button asChild className="w-full rounded-xl">
                  <Link to={proposal.link}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Proposal
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Instructions */}
        <Card className="mt-12 bg-white/5 border border-white/10 shadow-lg rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white text-xl">How to Use This Demo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-white font-semibold mb-2">For Developers:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Test different proposal states without real data</li>
                  <li>• Verify UI behavior for each status</li>
                  <li>• Check responsive design across devices</li>
                  <li>• Validate voting and activation flows</li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">For Users:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Understand different proposal stages</li>
                  <li>• Learn what actions are available</li>
                  <li>• See how voting works in practice</li>
                  <li>• Explore the governance interface</li>
                </ul>
              </div>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
              <p className="text-sm text-yellow-300 font-medium mb-1">💡 Tip</p>
              <p className="text-xs text-yellow-400/70">
                You can also access these proposals directly via URL: <code className="bg-black/20 px-2 py-1 rounded">/governance/proposals/1</code> through <code className="bg-black/20 px-2 py-1 rounded">/governance/proposals/10</code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProposalStatesDemo; 