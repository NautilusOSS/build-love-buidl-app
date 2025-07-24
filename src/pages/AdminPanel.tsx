import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  Settings, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Users,
  Activity
} from "lucide-react";
import { Link } from "react-router-dom";
import { useWallet } from "@txnlab/use-wallet-react";

// Mock data - replace with actual data from your governance contract
const mockPendingActions = [
  {
    id: "1",
    type: "finalize",
    proposalTitle: "Increase Treasury Allocation for Development",
    description: "Proposal succeeded, ready for finalization",
    timestamp: "2024-01-23T00:00:00Z"
  },
  {
    id: "2",
    type: "execute",
    proposalTitle: "Update Governance Parameters",
    description: "Proposal finalized, ready for execution",
    timestamp: "2024-01-22T00:00:00Z"
  }
];

const mockSystemStats = {
  totalProposals: 24,
  activeProposals: 3,
  pendingFinalization: 2,
  pendingExecution: 1,
  totalVoters: 156,
  averageParticipation: 78
};

const mockRecentActivity = [
  {
    id: "1",
    action: "Proposal Finalized",
    proposal: "Update Governance Parameters",
    timestamp: "2024-01-22T14:30:00Z"
  },
  {
    id: "2",
    action: "Proposal Executed",
    proposal: "Community Grant Program",
    timestamp: "2024-01-21T10:15:00Z"
  },
  {
    id: "3",
    action: "Proposal Created",
    proposal: "Add New Validator Node",
    timestamp: "2024-01-20T16:45:00Z"
  }
];

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const AdminPanel = () => {
  const { activeWallet } = useWallet();
  const [activeTab, setActiveTab] = useState("overview");

  // Mock admin check - in real app, check if user is admin
  const isAdmin = activeWallet?.addresses?.[0] === "0x1234567890abcdef1234567890abcdef12345678";

  if (!activeWallet) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
          <p className="text-muted-foreground mb-6">
            Connect your wallet to access the admin panel.
          </p>
          <Button asChild>
            <Link to="/governance">Go to Governance</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to access the admin panel. Only governance administrators can view this page.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground">
            Manage governance proposals and system settings
          </p>
        </div>
        <Button asChild>
          <Link to="/governance/proposals/create">
            Create Proposal
          </Link>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Proposals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockSystemStats.totalProposals}</div>
            <p className="text-xs text-muted-foreground">
              All time proposals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Finalization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{mockSystemStats.pendingFinalization}</div>
            <p className="text-xs text-muted-foreground">
              Ready for admin action
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Pending Execution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{mockSystemStats.pendingExecution}</div>
            <p className="text-xs text-muted-foreground">
              Ready to execute
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Voters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockSystemStats.totalVoters}</div>
            <p className="text-xs text-muted-foreground">
              {mockSystemStats.averageParticipation}% participation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="actions">Pending Actions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Admin Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockRecentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{activity.action}</div>
                        <div className="text-xs text-muted-foreground">{activity.proposal}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(activity.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Finalize All Pending
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Execute All Ready
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Update Parameters
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Activity className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Proposal</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockPendingActions.map((action) => (
                    <TableRow key={action.id}>
                      <TableCell>
                        <Badge variant={action.type === "finalize" ? "default" : "secondary"}>
                          {action.type === "finalize" ? "Finalize" : "Execute"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{action.proposalTitle}</TableCell>
                      <TableCell>{action.description}</TableCell>
                      <TableCell>{formatDate(action.timestamp)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm">
                            {action.type === "finalize" ? "Finalize" : "Execute"}
                          </Button>
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/governance/proposals/${action.id}`}>
                              View
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Governance Parameters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Voting Period (days)</label>
                    <div className="text-lg font-mono">7</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Quorum Threshold</label>
                    <div className="text-lg font-mono">1,000</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Execution Delay (hours)</label>
                    <div className="text-lg font-mono">24</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Minimum Proposal Power</label>
                    <div className="text-lg font-mono">100</div>
                  </div>
                </div>
                
                <div className="pt-4">
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Update Parameters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Contract Address</label>
                    <div className="text-sm font-mono text-muted-foreground">
                      0x1234567890abcdef1234567890abcdef12345678
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Network</label>
                    <div className="text-sm">Algorand Mainnet</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Token Address</label>
                    <div className="text-sm font-mono text-muted-foreground">
                      0xabcdef1234567890abcdef1234567890abcdef12
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Last Updated</label>
                    <div className="text-sm">{formatDate(new Date().toISOString())}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel; 