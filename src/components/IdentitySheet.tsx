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
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useWallet, NetworkId, WalletId } from "@txnlab/use-wallet-react";
import { APP_SPEC as VNSRegistrySpec } from "@/clients/VNSRegistryClient";
import { APP_SPEC as VNSPublicResolverSpec } from "@/clients/VNSPublicResolverClient";
import { CONTRACT, abi } from "ulujs";
import algosdk from "algosdk";
import { namehash, stringToUint8Array } from "@/utils/namehash";
import { stripTrailingZeroBytes } from "@/utils/string";
import { SimpleFaucet } from "@/services/simple-faucet";
import { useToast } from "@/hooks/use-toast";

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

  const { toast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [networkBalance, setNetworkBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [creatingLocalnetAccount, setCreatingLocalnetAccount] = useState(false);

  const [delegateInput, setDelegateInput] = useState("");
  const [selectedDelegate, setSelectedDelegate] = useState("");
  const [devAccountDetails, setDevAccountDetails] = useState<{
    address: string;
    mnemonic: string;
    txId?: string;
  } | null>(null);
  const [faucetBalance, setFaucetBalance] = useState<number | null>(null);

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
        setDevAccountDetails(null);
      } catch (error) {
        console.error("Wallet disconnection failed:", error);
      }
    }
  };

  // Copy text to clipboard with fallback
  const copyToClipboard = async (text: string, label: string) => {
    try {
      // Check if we have clipboard access
      if (!navigator.clipboard) {
        console.warn("Clipboard API not available, using fallback");
        throw new Error("Clipboard API not available");
      }

      // Check secure context
      if (!window.isSecureContext) {
        console.warn("Not a secure context, using fallback");
        throw new Error("Not a secure context");
      }

      // Try clipboard API
      await navigator.clipboard.writeText(text);
      console.log("Successfully copied to clipboard");
      
      toast({
        title: "Copied to Clipboard",
        description: `${label} has been copied to your clipboard`,
      });
    } catch (error) {
      console.error("Clipboard API failed:", error);
      
      // Try fallback method with simpler approach
      try {
        console.log("Attempting fallback copy method");
        const textArea = document.createElement("textarea");
        textArea.value = text;
        
        // Position it off-screen
        textArea.style.position = "absolute";
        textArea.style.left = "-9999px";
        textArea.style.top = "-9999px";
        textArea.style.opacity = "0";
        textArea.style.pointerEvents = "none";
        
        document.body.appendChild(textArea);
        
        // Focus and select
        textArea.focus({ preventScroll: true });
        textArea.select();
        textArea.setSelectionRange(0, text.length);
        
        const successful = document.execCommand("copy");
        
        document.body.removeChild(textArea);
        
        if (successful) {
          console.log("Successfully copied using fallback method");
          toast({
            title: "Copied to Clipboard",
            description: `${label} has been copied to your clipboard`,
          });
        } else {
          throw new Error("execCommand returned false");
        }
      } catch (fallbackError) {
        console.error("All copy methods failed:", fallbackError);
        // Show the text so user can copy manually
        toast({
          title: "Copy Not Supported",
          description: `Text: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
          variant: "default",
          duration: 5000,
        });
      }
    }
  };

  // Clear dev account details
  const clearDevAccountDetails = () => {
    setDevAccountDetails(null);
    toast({
      title: "Dev Account Details Cleared",
      description: "Account details have been cleared from the interface",
    });
  };

  // Check if localnet is available using SimpleFaucet
  const checkLocalnetStatus = async () => {
    try {
      // Create a test SimpleFaucet instance to check connectivity
      const testFaucet = new SimpleFaucet(
        new algosdk.Algodv2(
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "http://10.0.0.31",
          4001
        ),
        import.meta.env.VITE_GENESIS_MNEMONIC
      );

      // Try to get faucet balance as a connectivity test
      const balance = await testFaucet.getBalance();
      setFaucetBalance(balance);

      toast({
        title: "Localnet Available",
        description: `Local Algorand node is running. Faucet balance: ${algosdk.microalgosToAlgos(
          balance
        )} ALGO`,
      });
    } catch (error) {
      setFaucetBalance(null);
      toast({
        title: "Localnet Unavailable",
        description: "Local Algorand node is not running or accessible",
        variant: "destructive",
      });
    }
  };

  // Get faucet balance
  const getFaucetBalance = async () => {
    try {
      const faucet = new SimpleFaucet(
        new algosdk.Algodv2(
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "http://10.0.0.31",
          4001
        ),
        import.meta.env.VITE_GENESIS_MNEMONIC ||
          "addict desk pulp able velvet detail kiwi task desk agent curve idle apart opera spoil people sea intact bulk depend tennis carbon force ability near"
      );

      const balance = await faucet.getBalance();
      setFaucetBalance(balance);

      toast({
        title: "Faucet Balance Updated",
        description: `Current faucet balance: ${algosdk.microalgosToAlgos(
          balance
        )} ALGO`,
      });
    } catch (error) {
      console.error("Failed to get faucet balance:", error);
      toast({
        title: "Failed to Get Balance",
        description: "Unable to retrieve faucet balance",
        variant: "destructive",
      });
    }
  };

  // Handle localnet account creation and funding using SimpleFaucet
  const handleCreateLocalnetAccount = async () => {
    if (activeNetwork !== "localnet") {
      toast({
        title: "Invalid Network",
        description: "Dev account creation is only available on localnet",
        variant: "destructive",
      });
      return;
    }

    setCreatingLocalnetAccount(true);

    try {
      // Show progress toast
      toast({
        title: "Creating Dev Account",
        description: "Generating new account and funding it...",
      });

      // Generate new account
      const acc = algosdk.generateAccount();
      const { addr, sk } = acc;
      const mn = algosdk.secretKeyToMnemonic(sk);

      // Store the mnemonic in localStorage for wallet connection
      localStorage.setItem("@txnlab/use-wallet:v3_mnemonic", mn);

      // Create SimpleFaucet instance with localnet configuration
      const faucet = new SimpleFaucet(
        new algosdk.Algodv2(
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "http://10.0.0.31",
          4001
        ),
        import.meta.env.VITE_GENESIS_MNEMONIC ||
          "addict desk pulp able velvet detail kiwi task desk agent curve idle apart opera spoil people sea intact bulk depend tennis carbon force ability near"
      );

      // Fund the account
      const fundingResult = await faucet.fundAccount(addr, 2e6); // 2 ALGO

      await new Promise((resolve) => setTimeout(resolve, 3000));

      const wallet = wallets.find((w) => w.id === WalletId.MNEMONIC);

      if (!wallet) {
        throw new Error("Failed to find wallet");
      }

      const [activeAccount] = await wallet.connect();
      if (!activeAccount) {
        throw new Error("Failed to connect wallet");
      }

      console.log("Created localnet account:", addr);
      console.log("Mnemonic:", mn);
      console.log("Funding result:", fundingResult);

      // Store account details for display
      setDevAccountDetails({
        address: addr,
        mnemonic: mn,
        txId: fundingResult.txId,
      });

      if (fundingResult.success) {
        toast({
          title: "Dev Account Created Successfully",
          description: `Account: ${addr.slice(0, 8)}...${addr.slice(-4)}`,
        });

        toast({
          title: "Funding Successful",
          description: fundingResult.message,
        });

        // Refresh the wallet connection to pick up the new account
        if (activeWallet) {
          try {
            await activeWallet.connect();
            toast({
              title: "Wallet Reconnected",
              description: "New dev account is now active",
            });
          } catch (error) {
            console.error("Failed to reconnect wallet:", error);
            toast({
              title: "Reconnection Failed",
              description:
                "Please manually reconnect your wallet to use the new account",
              variant: "destructive",
            });
          }
        }
      } else {
        toast({
          title: "Account Created (Funding Failed)",
          description: `Account: ${addr.slice(0, 8)}...${addr.slice(-4)}`,
          variant: "destructive",
        });

        toast({
          title: "Funding Failed",
          description: fundingResult.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to create localnet account:", error);
      toast({
        title: "Account Creation Failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setCreatingLocalnetAccount(false);
    }
  };

  const fetchNetworkBalance = async () => {
    if (!activeAccount || !algodClient) return;

    setBalanceLoading(true);
    try {
      if (activeNetwork === "localnet") {
        const algodClient = new algosdk.Algodv2(
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "http://10.0.0.31",
          4001
        );
        const accountInfo = await algodClient
          .accountInformation(activeAccount.address)
          .do();
        const balanceMicro = accountInfo.amount || 0;
        const minBalance = accountInfo["min-balance"] || 0;
        const availableBalance = Math.max(0, balanceMicro - (minBalance + 1e5));
        setNetworkBalance(availableBalance / 1e6);
      } else {
        const accountInfo = await algodClient
          .accountInformation(activeAccount.address)
          .do();
        const balanceMicro = accountInfo.amount || 0;
        const minBalance = accountInfo["min-balance"] || 0;
        const availableBalance = Math.max(0, balanceMicro - (minBalance + 1e5));
        setNetworkBalance(availableBalance / 1e6);
      }
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

  // Check faucet balance when on localnet
  useEffect(() => {
    if (activeNetwork === "localnet") {
      getFaucetBalance();
    }
  }, [activeNetwork]);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[400px] sm:w-[540px] glass-morphism-silver h-full flex flex-col"
      >
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="text-gradient-primary text-xl">
            Identity & Collateral
          </SheetTitle>
          <SheetDescription>
            Manage your enVOI identity, assets, and delegation settings
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden mt-6 space-y-6">
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

                {/* Available Wallets - Hide for localnet */}
                {activeNetwork !== "localnet" && (
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-300">
                      Available Wallets
                    </Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto wallet-options-container">
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
                )}

                {activeNetwork !== "localnet" &&
                  availableWallets.length === 0 && (
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
                    <div className="text-center py-4 text-gray-400">
                      <Wallet className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm mb-2">Localnet Development Mode</p>
                      <p className="text-xs text-gray-500">
                        Wallets are not needed for localnet. Use the dev account
                        creator below.
                      </p>
                    </div>

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

                {/* Dev Account Details - Only show on localnet */}
                {activeNetwork === "localnet" && devAccountDetails && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-gray-300">
                        Latest Dev Account
                      </Label>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={checkLocalnetStatus}
                          className="h-6 px-2 text-xs"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Status
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={getFaucetBalance}
                          className="h-6 px-2 text-xs"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Balance
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearDevAccountDetails}
                          className="h-6 px-2 text-xs text-red-400 hover:text-red-300"
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/20 border border-gray-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Address:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono">
                            {devAccountDetails.address.slice(0, 8)}...
                            {devAccountDetails.address.slice(-4)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(
                                devAccountDetails.address,
                                "Address"
                              )
                            }
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Mnemonic:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono">
                            {devAccountDetails.mnemonic
                              .split(" ")
                              .slice(0, 3)
                              .join(" ")}
                            ...
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(
                                devAccountDetails.mnemonic,
                                "Mnemonic"
                              )
                            }
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      {devAccountDetails.txId && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">
                            Funding TX:
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono">
                              {devAccountDetails.txId.slice(0, 8)}...
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                copyToClipboard(
                                  devAccountDetails.txId!,
                                  "Transaction ID"
                                )
                              }
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                      {faucetBalance !== null && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">
                            Faucet Balance:
                          </span>
                          <span className="text-sm font-mono text-green-400">
                            {algosdk.microalgosToAlgos(faucetBalance)} ALGO
                          </span>
                        </div>
                      )}
                    </div>
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
