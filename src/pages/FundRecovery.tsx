import { useState } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useWallet } from "@txnlab/use-wallet-react";
import { APP_SPEC as VNSRegistrySpec } from "@/clients/VNSRegistryClient";
import { APP_SPEC as VNSPublicResolverSpec } from "@/clients/VNSPublicResolverClient";
import { CONTRACT } from "ulujs";
import { namehash, stringToUint8Array } from "@/utils/namehash";
import { stripTrailingZeroBytes } from "@/utils/string";
import IdentitySheet from "@/components/IdentitySheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Coins,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Copy,
  ArrowLeft,
  Wallet,
  Download,
  RefreshCw,
  ArrowRight,
  DollarSign,
  Home,
  User,
} from "lucide-react";

export default function FundRecovery() {
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
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  
  const [recoverableContracts] = useState([
    {
      id: "contract-2", 
      name: "VOI Grant Funding Pool",
      network: "VOI Testnet",
      stakedAmount: "25,000 VOI",
      rewards: "1,200 VOI",
      totalRecoverable: "26,200 VOI",
      contractAddress: "0xabcd...efgh",
      gasEstimate: "0.001 VOI",
      status: "ready",
    },
    {
      id: "contract-4",
      name: "VOI Development Grant",
      network: "VOI Testnet",
      stakedAmount: "100,000 VOI",
      rewards: "4,500 VOI",
      totalRecoverable: "104,500 VOI",
      contractAddress: "0x1111...2222",
      gasEstimate: "0.01 VOI",
      status: "ready",
    },
  ]);

  const totalRecoverable = recoverableContracts.reduce((sum, contract) => {
    const amount = parseFloat(contract.totalRecoverable.replace(/[^\d.]/g, ''));
    return sum + amount;
  }, 0);

  const handleWithdraw = async (contractId: string) => {
    setIsProcessing(true);
    setSelectedContract(contractId);
    
    // Simulate withdrawal process
    setTimeout(() => {
      setIsProcessing(false);
      setSelectedContract(null);
      // In a real app, you would handle the actual withdrawal transaction here
    }, 3000);
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
                <Coins className="w-6 h-6 text-[#1EAEDB]" />
                <h1 className="text-2xl font-bold text-[#1EAEDB]">Fund Recovery</h1>
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
            Recover Your Vested Funds
          </h2>
          <p className="text-lg text-gray-300 mb-6">
            Withdraw your fully vested staking rewards and principal from completed VOI incentivized testnet and grant funding contracts. 
            All funds are ready for immediate recovery.
          </p>
          
          {/* Recovery Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">
                  {recoverableContracts.length}
                </div>
                <div className="text-gray-400">Ready for Recovery</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-[#1EAEDB] mb-2">
                  {totalRecoverable.toLocaleString()}
                </div>
                <div className="text-gray-400">Total Recoverable</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-yellow-400 mb-2">
                  {recoverableContracts.reduce((sum, c) => sum + parseFloat(c.gasEstimate.replace(/[^\d.]/g, '')), 0).toFixed(3)}
                </div>
                <div className="text-gray-400">Estimated Gas</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recovery Instructions */}
        <Card className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border-green-500/30 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              Recovery Process
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <div className="font-semibold">Select Contract</div>
                  <div className="text-sm text-gray-400">Choose the contract to recover funds from</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <div className="font-semibold">Review Details</div>
                  <div className="text-sm text-gray-400">Verify amounts and gas estimates</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <div className="font-semibold">Execute Recovery</div>
                  <div className="text-sm text-gray-400">Confirm transaction and receive funds</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recoverable Contracts */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#1EAEDB]" />
            Ready for Recovery
          </h3>
          
          <div className="grid gap-6">
            {recoverableContracts.map((contract) => (
              <Card key={contract.id} className="bg-gray-900/50 border-gray-800 hover:border-green-500/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">{contract.name}</CardTitle>
                      <CardDescription className="text-gray-400">
                        {contract.network} • {contract.contractAddress}
                      </CardDescription>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Ready
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                      <div className="text-sm text-gray-400 mb-2">Staked Principal</div>
                      <div className="text-2xl font-bold">{contract.stakedAmount}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 mb-2">Rewards Earned</div>
                      <div className="text-2xl font-bold text-green-400">{contract.rewards}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 mb-2">Total Recoverable</div>
                      <div className="text-2xl font-bold text-[#1EAEDB]">{contract.totalRecoverable}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <div className="text-sm text-gray-400 mb-2">Contract Address</div>
                      <div className="flex items-center gap-2">
                        <code className="bg-gray-800 px-3 py-1 rounded text-sm font-mono flex-1">
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
                      <div className="text-sm text-gray-400 mb-2">Estimated Gas Fee</div>
                      <div className="text-lg font-semibold text-yellow-400">{contract.gasEstimate}</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(`https://explorer.voi.network/address/${contract.contractAddress}`, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Contract
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          disabled={isProcessing && selectedContract === contract.id}
                        >
                          {isProcessing && selectedContract === contract.id ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Coins className="w-4 h-4 mr-2" />
                              Recover Funds
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-gray-900 border-gray-700">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirm Fund Recovery</AlertDialogTitle>
                          <AlertDialogDescription>
                            You are about to recover <strong>{contract.totalRecoverable}</strong> from {contract.name}.
                            This action will withdraw both your staked principal and earned rewards.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-4">
                          <div className="bg-gray-800 p-4 rounded-lg">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-gray-400">Principal</div>
                                <div className="font-semibold">{contract.stakedAmount}</div>
                              </div>
                              <div>
                                <div className="text-gray-400">Rewards</div>
                                <div className="font-semibold text-green-400">{contract.rewards}</div>
                              </div>
                              <div>
                                <div className="text-gray-400">Gas Fee</div>
                                <div className="font-semibold text-yellow-400">{contract.gasEstimate}</div>
                              </div>
                              <div>
                                <div className="text-gray-400">Total Received</div>
                                <div className="font-semibold text-[#1EAEDB]">{contract.totalRecoverable}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleWithdraw(contract.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Confirm Recovery
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Bulk Recovery */}
        {recoverableContracts.length > 1 && (
          <Card className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-500/30 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-400">
                <Download className="w-5 h-5" />
                Bulk Recovery
              </CardTitle>
              <CardDescription>
                Recover funds from all available contracts in a single transaction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-400">Total Contracts</div>
                  <div className="text-xl font-bold">{recoverableContracts.length}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Total Amount</div>
                  <div className="text-xl font-bold text-[#1EAEDB]">
                    {totalRecoverable.toLocaleString()} Tokens
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Estimated Gas</div>
                  <div className="text-xl font-bold text-yellow-400">
                    {recoverableContracts.reduce((sum, c) => sum + parseFloat(c.gasEstimate.replace(/[^\d.]/g, '')), 0).toFixed(3)} Tokens
                  </div>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        Processing Bulk Recovery...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5 mr-2" />
                        Recover All Funds
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-gray-900 border-gray-700">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Bulk Recovery</AlertDialogTitle>
                    <AlertDialogDescription>
                      You are about to recover funds from all {recoverableContracts.length} contracts.
                      This will execute multiple transactions to recover all your vested funds.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-4">
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <div className="text-sm text-gray-400 mb-2">Contracts to Process:</div>
                      {recoverableContracts.map((contract) => (
                        <div key={contract.id} className="flex justify-between text-sm py-1">
                          <span>{contract.name}</span>
                          <span className="text-[#1EAEDB]">{contract.totalRecoverable}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => {
                        setIsProcessing(true);
                        setTimeout(() => setIsProcessing(false), 5000);
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Start Bulk Recovery
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="text-center">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => navigate('/staking')}
              className="bg-[#1EAEDB] hover:bg-[#00eeff] text-black font-semibold"
            >
              <Shield className="w-5 h-5 mr-2" />
              View All Contracts
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => navigate('/')}
              className="border-[#1EAEDB] text-[#1EAEDB] hover:bg-[#1EAEDB] hover:text-black"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to ExitLab
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
