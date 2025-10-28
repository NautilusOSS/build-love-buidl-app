import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useWallet } from "@txnlab/use-wallet-react";
import { APP_SPEC as VNSRegistrySpec } from "@/clients/VNSRegistryClient";
import { APP_SPEC as VNSPublicResolverSpec } from "@/clients/VNSPublicResolverClient";
import { CONTRACT } from "ulujs";
import { namehash, stringToUint8Array } from "@/utils/namehash";
import { stripTrailingZeroBytes } from "@/utils/string";
import IdentitySheet from "@/components/IdentitySheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Unlock,
  Coins,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Copy,
  ArrowLeft,
  Wallet,
  Plus,
  Search,
  Filter,
  Home,
  User,
  Loader2,
} from "lucide-react";
import { stakingContractService, FormattedStakingContract } from "@/services/stakingContractService";

export default function StakingContracts() {
  const { activeAccount, activeWallet, algodClient } = useWallet();
  const [showIdentitySheet, setShowIdentitySheet] = useState(false);
  const [enVOIName, setEnVOIName] = useState<string | null>(null);
  const [enVOIAvatar, setEnVOIAvatar] = useState<string>("");
  const navigate = useNavigate();
  
  // Helper function to get the best display name
  const getDisplayName = () => {
    if (enVOIName) return enVOIName;
    return `${activeAccount?.address.slice(0, 6)}...${activeAccount?.address.slice(-4)}`;
  };
  
  // Resolve enVOI name
  useEffect(() => {
    if (!algodClient || !activeAccount) {
      setEnVOIName(null);
      setEnVOIAvatar("");
      return;
    }
    
    const resolveEnVOIName = async () => {
      try {
        const resolverAppId = 797608;
        const registryAppId = 797607;
        
        const resolver = new CONTRACT(
          resolverAppId,
          algodClient,
          undefined,
          { ...VNSPublicResolverSpec.contract, events: [] },
          {
            addr: activeAccount.address,
            sk: new Uint8Array(),
          }
        );
        
        const registry = new CONTRACT(
          registryAppId,
          algodClient,
          undefined,
          { ...VNSRegistrySpec.contract, events: [] },
          {
            addr: activeAccount.address,
            sk: new Uint8Array(),
          }
        );
        
        const reverseAddressHash = await namehash(`${activeAccount.address}.addr.reverse`);
        const nameR = await resolver.name(reverseAddressHash);
        
        if (nameR.success) {
          const name = stripTrailingZeroBytes(nameR.returnValue);
          const nameHash = await namehash(name);
          const owner = await registry.ownerOf(nameHash);
          
          if (owner.success && owner.returnValue === activeAccount.address) {
            setEnVOIName(name);
            
            // Try to get avatar
            const avatarR = await resolver.text(nameHash, stringToUint8Array("avatar", 22));
            if (avatarR.success) {
              setEnVOIAvatar(stripTrailingZeroBytes(avatarR.returnValue));
            }
          } else {
            setEnVOIName(null);
            setEnVOIAvatar("");
          }
        } else {
          setEnVOIName(null);
          setEnVOIAvatar("");
        }
      } catch (error) {
        console.log("No enVOI name found for this address");
        setEnVOIName(null);
        setEnVOIAvatar("");
      }
    };
    
    resolveEnVOIName();
  }, [algodClient, activeAccount?.address]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [contracts, setContracts] = useState<FormattedStakingContract[]>([]);
  const [isLoadingContracts, setIsLoadingContracts] = useState(false);
  
  // Fetch staking contracts when component mounts or owner changes
  useEffect(() => {
    const fetchContracts = async () => {
      setIsLoadingContracts(true);
      
      // Only fetch if we have an active account
      if (!activeAccount?.address) {
        setContracts([]);
        setIsLoadingContracts(false);
        return;
      }

      try {
        // Use active account address in the API query
        const formattedContracts = await stakingContractService.getFormattedContractsForOwner(activeAccount.address);
        setContracts(formattedContracts);
      } catch (error) {
        console.error("Error fetching staking contracts:", error);
        // Keep contracts as empty array on error
        setContracts([]);
      } finally {
        setIsLoadingContracts(false);
      }
    };

    fetchContracts();
  }, [activeAccount?.address]);
  
  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.network.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.contractAddress.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || contract.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "vesting":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ready":
        return <CheckCircle className="w-4 h-4" />;
      case "vesting":
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
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
                onClick={() => navigate('/')}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to ExitLab
              </Button>
              <div className="hidden md:block h-6 w-px bg-gray-600"></div>
              <div className="flex items-center gap-2">
                <Unlock className="w-6 h-6 text-[#1EAEDB]" />
                <h1 className="text-2xl font-bold text-[#1EAEDB]">Staking Contracts</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {activeAccount ? (
                <div className="flex items-center gap-3 bg-black/20 rounded-lg px-3 py-2">
                  <Avatar className="w-8 h-8">
                    {enVOIAvatar && (
                      <AvatarImage
                        src={enVOIAvatar}
                        alt={enVOIName || "enVOI avatar"}
                      />
                    )}
                    <AvatarFallback className="bg-gradient-to-br from-teal-400 to-violet-400 text-sm">
                      {getDisplayName().slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-base font-medium text-white">
                    {getDisplayName()}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="neon-glow-teal h-7 px-3 text-sm"
                    onClick={() => setShowIdentitySheet(true)}
                  >
                    <User className="w-4 h-4 mr-1.5" />
                    Identity
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="neon-glow-teal h-7 px-3 text-sm"
                  onClick={() => setShowIdentitySheet(true)}
                >
                  <User className="w-4 h-4 mr-1.5" />
                  Identity
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-[#1EAEDB] to-[#00eeff] bg-clip-text text-transparent">
            Manage Your Staking Positions
          </h2>
          <p className="text-lg text-gray-300 mb-6">
            Monitor and manage your staking contracts from VOI incentivized testnet and grant funding. 
            Track vesting progress and prepare for fund recovery.
          </p>
          
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search contracts by name or network..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-900/50 border-gray-700 text-white"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("all")}
              >
                All ({contracts.length})
              </Button>
              <Button
                variant={filterStatus === "ready" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("ready")}
              >
                Ready ({contracts.filter(c => c.status === "ready").length})
              </Button>
              <Button
                variant={filterStatus === "vesting" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("vesting")}
              >
                Vesting ({contracts.filter(c => c.status === "vesting").length})
              </Button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoadingContracts && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#1EAEDB] animate-spin" />
            <span className="ml-3 text-lg text-gray-400">Loading staking contracts...</span>
          </div>
        )}

        {/* Contracts Grid */}
        {!isLoadingContracts && (
          <div className="grid gap-6">
            {filteredContracts.map((contract) => (
            <Card key={contract.id} className="bg-gray-900/50 border-gray-800 hover:border-[#1EAEDB]/50 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{contract.name}</CardTitle>
                    <CardDescription className="text-gray-400">
                      {contract.network} • Created {contract.createdAt}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(contract.status)}>
                    {getStatusIcon(contract.status)}
                    <span className="ml-2 capitalize">{contract.status}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div>
                    <div className="text-sm text-gray-400">Staked Amount</div>
                    <div className="font-semibold text-lg">{contract.stakedAmount}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Rewards Earned</div>
                    <div className="font-semibold text-lg text-green-400">{contract.rewards}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">APY</div>
                    <div className="font-semibold text-lg text-[#1EAEDB]">{contract.apy}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Lock Period</div>
                    <div className="font-semibold text-lg">{contract.lockPeriod}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <div className="text-sm text-gray-400 mb-2">Contract Address</div>
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-800 px-3 py-1 rounded text-sm font-mono">
                        {contract.contractAddress}
                      </code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(contract.contractAddress)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-2">Days Remaining</div>
                    <div className="text-2xl font-bold text-yellow-400">{contract.daysRemaining}</div>
                  </div>
                </div>
                
                {contract.status === "vesting" && (
                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Vesting Progress</span>
                      <span>{Math.round(((90 - contract.daysRemaining) / 90) * 100)}%</span>
                    </div>
                    <Progress 
                      value={((90 - contract.daysRemaining) / 90) * 100} 
                      className="h-3"
                    />
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(`https://explorer.voi.network/address/${contract.contractAddress}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Contract
                  </Button>
                  {contract.canWithdraw && (
                    <Button 
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => navigate('/recovery')}
                    >
                      <Coins className="w-4 h-4 mr-2" />
                      Withdraw Funds
                    </Button>
                  )}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Shield className="w-4 h-4 mr-2" />
                        Contract Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-900 border-gray-700">
                      <DialogHeader>
                        <DialogTitle>{contract.name}</DialogTitle>
                        <DialogDescription>
                          Detailed information about this staking contract
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-gray-400">Network</Label>
                            <div className="font-semibold">{contract.network}</div>
                          </div>
                          <div>
                            <Label className="text-gray-400">APY</Label>
                            <div className="font-semibold text-[#1EAEDB]">{contract.apy}</div>
                          </div>
                          <div>
                            <Label className="text-gray-400">Lock Period</Label>
                            <div className="font-semibold">{contract.lockPeriod}</div>
                          </div>
                          <div>
                            <Label className="text-gray-400">Status</Label>
                            <div className="font-semibold capitalize">{contract.status}</div>
                          </div>
                        </div>
                        <div>
                          <Label className="text-gray-400">Contract Address</Label>
                          <div className="font-mono text-sm bg-gray-800 p-2 rounded mt-1">
                            {contract.contractAddress}
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        )}

        {!isLoadingContracts && filteredContracts.length === 0 && (
          <div className="text-center py-12">
            <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No contracts found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? "Try adjusting your search terms" : "You don't have any staking contracts yet"}
            </p>
            <Button variant="outline" onClick={() => setSearchTerm("")}>
              Clear Search
            </Button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="text-center mt-12">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => navigate('/recovery')}
              className="bg-[#1EAEDB] hover:bg-[#00eeff] text-black font-semibold"
            >
              <Coins className="w-5 h-5 mr-2" />
              Go to Fund Recovery
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="border-[#1EAEDB] text-[#1EAEDB] hover:bg-[#1EAEDB] hover:text-black"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add New Contract
            </Button>
          </div>
        </div>
      </div>

      {/* Identity Sheet */}
      <IdentitySheet
        isOpen={showIdentitySheet}
        onOpenChange={setShowIdentitySheet}
      />
    </div>
  );
}
