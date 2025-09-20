import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Wallet,
  RefreshCw,
  Lock,
  TrendingUp,
  Shield,
  Users,
  Settings,
  ChevronRight,
  Copy,
  ExternalLink,
  Zap,
  Star,
  Globe,
  Check,
  LogOut,
} from "lucide-react";
import { useWallet, NetworkId, WalletId } from "@txnlab/use-wallet-react";
import { APP_SPEC as VNSRegistrySpec } from "@/clients/VNSRegistryClient";
import { APP_SPEC as VNSPublicResolverSpec } from "@/clients/VNSPublicResolverClient";
import { CONTRACT, abi } from "ulujs";
import algosdk from "algosdk";
import { namehash, stringToUint8Array } from "@/utils/namehash";
import { stripTrailingZeroBytes } from "@/utils/string";
import {
  createFundedAccount,
  isLocalnetAvailable,
  getLocalnetConfig,
} from "@/utils/localnet";
import { SimpleFaucet } from "@/services/simple-faucet";

interface IdentitySheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Profile {
  displayName: string;
  avatar: string;
}

export default function IdentitySheet({
  isOpen,
  onOpenChange,
}: IdentitySheetProps) {
  const {
    activeAccount,
    algodClient,
    activeWallet,
    activeWalletAccounts,
    wallets,
    activeNetwork,
    setActiveNetwork,
  } = useWallet();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [networkBalance, setNetworkBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [creatingLocalnetAccount, setCreatingLocalnetAccount] = useState(false);

  const [delegateInput, setDelegateInput] = useState("");
  const [selectedDelegate, setSelectedDelegate] = useState("");

  const mockAssets = [
    // {
    //   token: "VOI",
    //   amount: 12500,
    //   usdValue: 12500,
    //   haircut: 0.95,
    //   netVP: 11875,
    //   network: "VOI",
    // },
    // {
    //   token: "aVOI",
    //   amount: 12500,
    //   usdValue: 12500,
    //   haircut: 0.95,
    //   netVP: 11875,
    //   network: "Algorand",
    // },
    // {
    //   token: "ALGO",
    //   amount: 8500,
    //   usdValue: 1700,
    //   haircut: 0.90,
    //   netVP: 1530,
    //   network: "Algorand"
    // },
    // {
    //   token: "ETH",
    //   amount: 2.5,
    //   usdValue: 6250,
    //   haircut: 0.85,
    //   netVP: 5312,
    //   network: "Ethereum"
    // }
  ];

  const totalVP = mockAssets.reduce((sum, asset) => sum + asset.netVP, 0);
  const totalValue = mockAssets.reduce((sum, asset) => sum + asset.usdValue, 0);

  const mockDelegates = [
    // { name: "atlas.voi", assignedVP: 5000 },
    // { name: "cosmos.voi", assignedVP: 3000 },
    // { name: "founder.voi", assignedVP: 0 },
  ];

  // Wallet connection configuration
  const networks = [
    { id: NetworkId.MAINNET, name: "Algorand Mainnet" },
    { id: "testnet" as any, name: "Algorand Testnet" },
    { id: NetworkId.VOIMAIN, name: "Voi Mainnet" },
    { id: "voitest" as any, name: "Voi Testnet" },
    { id: "localnet" as any, name: "Localnet" },
  ];

  const networkWallets = {
    [NetworkId.MAINNET]: [
      { id: WalletId.PERA, name: "Pera" },
      { id: WalletId.DEFLY, name: "Defly" },
      { id: WalletId.KIBISIS, name: "Kibisis" },
      { id: WalletId.LUTE, name: "Lute" },
      { id: WalletId.BIATEC, name: "Biatec" },
      { id: WalletId.WALLETCONNECT, name: "WalletConnect" },
    ],
    ["testnet" as any]: [
      { id: WalletId.KIBISIS, name: "Kibisis" },
      { id: WalletId.LUTE, name: "Lute" },
    ],
    [NetworkId.VOIMAIN]: [
      { id: WalletId.KIBISIS, name: "Kibisis" },
      { id: WalletId.LUTE, name: "Lute" },
      { id: WalletId.BIATEC, name: "Biatec" },
      { id: WalletId.WALLETCONNECT, name: "WalletConnect" },
    ],
    ["voitest" as any]: [
      { id: WalletId.KIBISIS, name: "Kibisis" },
      { id: WalletId.LUTE, name: "Lute" },
    ],
    ["localnet" as any]: [],
  };

  // Filter wallets based on active network
  const availableWallets = wallets.filter((wallet) =>
    networkWallets[activeNetwork as NetworkId].some(
      (networkWallet) => networkWallet.id === wallet.id
    )
  );

  // Handle wallet connection
  const handleWalletConnect = async (wallet: any) => {
    setConnecting(wallet.id);
    try {
      await wallet.connect();
    } catch (error) {
      console.error("Wallet connection failed:", error);
    } finally {
      setConnecting(null);
    }
  };

  // Handle wallet disconnection
  const handleDisconnect = async () => {
    if (activeWallet) {
      try {
        await activeWallet.disconnect();
        setProfile(null);
        setNetworkBalance(0);
      } catch (error) {
        console.error("Wallet disconnection failed:", error);
      }
    }
  };

  // Handle localnet account creation and funding
  const handleCreateLocalnetAccount = async () => {
    if (activeNetwork !== "localnet") return;
    if (!activeWallet) return;
    const acc = algosdk.generateAccount();
    const { addr, sk } = acc;
    const mn = algosdk.secretKeyToMnemonic(sk);
    localStorage.setItem("@txnlab/use-wallet:v3_mnemonic", mn);
    const faucet = new SimpleFaucet(
      new algosdk.Algodv2(
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "http://10.0.0.31",
        4001
      ),
      "addict desk pulp able velvet detail kiwi task desk agent curve idle apart opera spoil people sea intact bulk depend tennis carbon force ability near"
    );
    await faucet.fundAccount(addr, 2e6);

    console.log({ activeWallet });

    /*
    setCreatingLocalnetAccount(true);
    try {
      // Check if localnet is available
      const isAvailable = await isLocalnetAvailable();
      if (!isAvailable) {
        alert(
          "Localnet is not available. Please make sure your local Algorand node is running on localhost:4001"
        );
        return;
      }

      // Get configuration info
      const config = getLocalnetConfig();
      console.log("Localnet config:", config);

      // Create and fund account using utility
      const { account, funding } = await createFundedAccount(1000000); // 1 ALGO

      console.log("Created localnet account:", account.address);
      console.log("Mnemonic:", account.mnemonic);

      if (funding.success) {
        alert(
          `Localnet account created and funded!\nAddress: ${account.address}\nMnemonic: ${account.mnemonic}\nFunding TX: ${funding.transactionId}\n\nAccount is ready for testing!`
        );
      } else {
        alert(
          `Localnet account created!\nAddress: ${account.address}\nMnemonic: ${account.mnemonic}\n\nNote: Automatic funding failed: ${funding.error}\nYou may need to fund this account manually in your localnet setup.`
        );
      }
    } catch (error) {
      console.error("Failed to create localnet account:", error);
      alert(
        "Failed to create localnet account. Please check your localnet setup."
      );
    } finally {
      setCreatingLocalnetAccount(false);
    }
      */
    setCreatingLocalnetAccount(false);
  };

  const fetchNetworkBalance = async () => {
    if (!activeAccount || !algodClient) return;

    setBalanceLoading(true);
    try {
      const accountInfo = await algodClient
        .accountInformation(activeAccount.address)
        .do();
      const balanceMicro = accountInfo.amount || 0;
      const minBalance = accountInfo["min-balance"] || 0;
      const availableBalance = Math.max(0, balanceMicro - (minBalance + 1e5));
      setNetworkBalance(availableBalance / 1e6);
    } catch (error) {
      console.error("Failed to fetch network balance:", error);
      setNetworkBalance(0);
    } finally {
      setBalanceLoading(false);
    }
  };

  useEffect(() => {
    if (!algodClient) return;
    if (!activeAccount) return;
    try {
      (async () => {
        setProfile({
          displayName:
            `${activeAccount.address.slice(0, 5)}...` +
            activeAccount.address.slice(-3),
          avatar: "",
        });
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
        const reverseAddressHash = await namehash(
          `${activeAccount.address}.addr.reverse`
        );
        console.log({ reverseAddressHash });
        const nameR = await resolver.name(reverseAddressHash);
        console.log({ nameR });
        if (!nameR.success) {
          throw new Error("Failed to get name");
        }
        const name = stripTrailingZeroBytes(nameR.returnValue);
        const nameHash = await namehash(name);
        const owner = await registry.ownerOf(nameHash);
        if (!owner.success) {
          throw new Error("Failed to get owner");
        }
        const ownerAddress = owner.returnValue;
        if (ownerAddress !== activeAccount.address) {
          throw new Error("You are not the owner of this name");
        }
        let avatar = "";
        const avatarR = await resolver.text(
          nameHash,
          stringToUint8Array("avatar", 22)
        );
        if (avatarR.success) {
          avatar = stripTrailingZeroBytes(avatarR.returnValue);
        }
        setProfile({ displayName: name, avatar });
      })();

      // Fetch network balance
      fetchNetworkBalance();
    } catch (error) {
      console.error(error);
    }
  }, [activeAccount, algodClient]);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[400px] sm:w-[540px] glass-morphism-silver"
      >
        <SheetHeader>
          <SheetTitle className="text-gradient-primary text-xl">
            Identity & Collateral
          </SheetTitle>
          <SheetDescription>
            Manage your enVOI identity, assets, and delegation settings
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Connected enVOI */}
          {activeAccount ? (
            <Card className="glass-morphism-violet">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="w-5 h-5" />
                  Connected enVOI
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    {profile?.avatar && (
                      <AvatarImage
                        src={profile.avatar}
                        alt={profile.displayName || "Profile avatar"}
                      />
                    )}
                    <AvatarFallback className="bg-teal-500/20 text-teal-400">
                      {profile?.displayName
                        ? profile.displayName.slice(0, 2).toUpperCase()
                        : "SH"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-semibold text-lg">
                      {profile?.displayName ||
                        `${activeAccount.address.slice(0, 6)}...` +
                          activeAccount.address.slice(-4)}
                    </div>
                    <div className="text-sm text-gray-400">
                      Primary Identity
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="neon-glow-teal"
                    onClick={() => setShowAccountModal(true)}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Switch
                  </Button>
                </div>
                <div className="text-xs text-gray-400">
                  Your voting power is bound to this enVOI name across all
                  chains
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass-morphism-violet">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wallet className="w-5 h-5" />
                  Connect Wallet
                </CardTitle>
                <CardDescription>
                  Connect your wallet to access identity features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Network Selection */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-300">
                    Select Network
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {networks.map((network) => (
                      <Button
                        key={network.id}
                        variant={
                          activeNetwork === network.id ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setActiveNetwork(network.id)}
                        className={
                          activeNetwork === network.id
                            ? "neon-glow-teal"
                            : "border-gray-600 hover:border-teal-400"
                        }
                      >
                        {network.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Available Wallets */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-300">
                    Available Wallets
                  </Label>
                  <div className="space-y-2">
                    {availableWallets.map((wallet) => (
                      <Button
                        key={wallet.id}
                        variant="outline"
                        className="w-full justify-start border-gray-600 hover:border-teal-400 hover:bg-teal-500/10"
                        onClick={() => handleWalletConnect(wallet)}
                        disabled={connecting === wallet.id}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-400 to-violet-400 flex items-center justify-center text-xs font-bold">
                            {wallet.metadata.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span>{wallet.metadata.name}</span>
                          {connecting === wallet.id && (
                            <div className="ml-auto">
                              <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                {availableWallets.length === 0 && (
                  <div className="text-center py-4 text-gray-400">
                    <Wallet className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      No wallets available for{" "}
                      {networks.find((n) => n.id === activeNetwork)?.name}
                    </p>
                  </div>
                )}

                {/* Localnet Account Creation */}
                {activeNetwork === "localnet" && (
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-300">
                      Development Account
                    </Label>
                    <Button
                      variant="outline"
                      className="w-full border-green-400/50 text-green-400 hover:bg-green-400/10 hover:border-green-400"
                      onClick={handleCreateLocalnetAccount}
                      disabled={creatingLocalnetAccount}
                    >
                      {creatingLocalnetAccount ? (
                        <>
                          <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin mr-2" />
                          Creating Account...
                        </>
                      ) : (
                        <>
                          <Wallet className="w-4 h-4 mr-2" />
                          Create & Fund Account
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-gray-400 text-center">
                      Automatically creates a new account for localnet testing
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Network Balance */}
          {activeAccount && (
            <Card className="glass-morphism">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wallet className="w-5 h-5" />
                  Network Balance
                </CardTitle>
                <CardDescription>
                  Native token balance on current network
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-violet-400 flex items-center justify-center text-xs font-bold">
                      {activeAccount.address.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold">
                        {balanceLoading
                          ? "Loading..."
                          : `${networkBalance.toFixed(4)}`}
                      </div>
                      <div className="text-sm text-gray-400">Native tokens</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant="outline"
                      className="text-teal-400 border-teal-400/30"
                    >
                      {activeAccount.address.slice(0, 6)}...
                      {activeAccount.address.slice(-4)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Disconnect Button */}
          {activeAccount && (
            <Card className="glass-morphism">
              <CardContent className="pt-6">
                <Button
                  variant="outline"
                  className="w-full border-red-400/50 text-red-400 hover:bg-red-400/10 hover:border-red-400"
                  onClick={handleDisconnect}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Disconnect Wallet
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Assets */}
          {mockAssets.length > 0 && (
            <Card className="glass-morphism">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wallet className="w-5 h-5" />
                  Locked Assets
                </CardTitle>
                <CardDescription>
                  Assets contributing to your voting power
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockAssets.map((asset, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-violet-400 flex items-center justify-center text-xs font-bold">
                        {asset.token.slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{asset.token}</span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              asset.network === "VOI"
                                ? "text-teal-400 border-teal-400/30"
                                : asset.network === "Algorand"
                                ? "text-blue-400 border-blue-400/30"
                                : "text-purple-400 border-purple-400/30"
                            }`}
                          >
                            {asset.network}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-400">
                          {asset.amount.toLocaleString()} tokens
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        ${asset.usdValue.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-400">
                        VP: {asset.netVP.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t border-gray-800">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Value</span>
                    <span className="text-lg font-bold text-gradient">
                      ${totalValue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total VP</span>
                    <span className="text-lg font-bold text-gradient">
                      {totalVP.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Delegation */}
          {/*<Card className="glass-morphism-silver">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5" />
                Delegation
              </CardTitle>
              <CardDescription>
                Your voting power follows your delegate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-gray-300">Delegate to</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="delegate.voi"
                    value={delegateInput}
                    onChange={(e) => setDelegateInput(e.target.value)}
                    className="flex-1"
                  />
                  <Button className="neon-glow-violet">Assign</Button>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Enter an enVOI name to delegate your voting power
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold text-gray-300">
                  Current Delegates
                </div>
                {mockDelegates.map((delegate, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {delegate.name
                            .split(".")[0]
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">{delegate.name}</div>
                        <div className="text-sm text-gray-400">
                          {delegate.assignedVP > 0
                            ? `${delegate.assignedVP.toLocaleString()} VP assigned`
                            : "No VP assigned"}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {delegate.assignedVP > 0 && (
                        <Button variant="outline" size="sm">
                          <Copy className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        variant={
                          delegate.assignedVP > 0 ? "default" : "outline"
                        }
                        size="sm"
                        className={
                          delegate.assignedVP > 0 ? "neon-glow-teal" : ""
                        }
                      >
                        {delegate.assignedVP > 0 ? "Manage" : "Assign"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>*/}

          {/* Lock Management */}
          {/*<Card className="glass-morphism">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="w-5 h-5" />
                Lock Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">
                    Current Lock Duration
                  </span>
                  <Badge
                    variant="outline"
                    className="text-teal-400 border-teal-400/30"
                  >
                    21 days remaining
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Multiplier</span>
                  <Badge
                    variant="outline"
                    className="text-violet-400 border-violet-400/30"
                  >
                    1.2×
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">
                    Unlock Available
                  </span>
                  <span className="text-sm text-gray-400">In 3d 12h</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1 neon-glow-teal">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Extend Lock
                </Button>
                <Button variant="outline" className="neon-glow-violet">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>*/}

          {/* Quick Actions */}
          {/*<Card className="glass-morphism-violet">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Globe className="w-4 h-4 mr-3" />
                View Cross-Chain Status
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Star className="w-4 h-4 mr-3" />
                Join Guild
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Zap className="w-4 h-4 mr-3" />
                Voting History
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Button>
            </CardContent>
          </Card>*/}
        </div>
      </SheetContent>

      {/* Account Selection Modal */}
      <Dialog open={showAccountModal} onOpenChange={setShowAccountModal}>
        <DialogContent className="glass-morphism-silver max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gradient-primary">
              Switch Account
            </DialogTitle>
            <DialogDescription>
              Select a different account from your connected wallet
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {activeWalletAccounts && activeWalletAccounts.length > 0 ? (
              <>
                <div className="space-y-2">
                  <Input
                    placeholder="Search addresses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-black/20 border-gray-800"
                  />
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {activeWalletAccounts
                    .filter((account) =>
                      account.address
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                    )
                    .map((account) => (
                      <div
                        key={account.address}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          account.address === activeAccount?.address
                            ? "bg-teal-500/20 border-teal-400/50"
                            : "bg-black/20 border-gray-800 hover:bg-gray-800/30"
                        }`}
                        onClick={() => {
                          if (activeWallet) {
                            activeWallet.setActiveAccount(account.address);
                            setShowAccountModal(false);
                            setSearchQuery("");
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-gradient-to-br from-teal-400 to-violet-400 text-xs">
                              {account.address.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">
                              {account.address.slice(0, 6)}...
                              {account.address.slice(-4)}
                            </div>
                            <div className="text-xs text-gray-400">
                              {account.name || "Account"}
                            </div>
                          </div>
                        </div>
                        {account.address === activeAccount?.address && (
                          <Check className="w-4 h-4 text-teal-400" />
                        )}
                      </div>
                    ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No accounts available</p>
                <p className="text-sm">Connect a wallet to see accounts</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
