import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShoppingCart,
  Crown,
  Zap,
  Shield,
  Star,
  Gift,
  Coins,
  Lock,
  Unlock,
  CheckCircle,
  AlertTriangle,
  Info,
  Sparkles,
  Trophy,
  Rocket,
  Palette,
  Music,
  Video,
  Gamepad2,
  Heart,
  Search,
  X,
  PiggyBank,
  Image,
  Globe,
  AtSign,
  MessageSquare,
} from "lucide-react";
import { useWallet } from "@txnlab/use-wallet-react";
import { NetworkId } from "@txnlab/use-wallet-react";
import {
  getATokenAppId,
  getAasaAppId,
  getAasaV2AppId,
  getAasaV2AssetId,
} from "@/constants/appIds";
import PageLayout from "@/components/PageLayout";
import algosdk from "algosdk";
import { abi, CONTRACT } from "ulujs";
import BigNumber from "bignumber.js";

// Store item interface
interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number; // in BLAPU tokens
  category: "feature" | "cosmetic" | "premium" | "utility";
  icon: React.ReactNode;
  rarity: "common" | "rare" | "epic" | "legendary";
  isOwned: boolean;
  isAvailable: boolean;
  hasMessage?: boolean; // Whether this item requires a message input
  requirements?: {
    minTokens: number;
    minHoldingTime?: number; // in days
  };
}

// User upgrades interface
interface UserUpgrades {
  feature: string[];
  cosmetic: string[];
  premium: string[];
  utility: string[];
}

const Store: React.FC = () => {
  const { activeAccount, activeNetwork, algodClient, signTransactions } =
    useWallet();
  const [userBalance, setUserBalance] = useState<number>(0);
  const [userUpgrades, setUserUpgrades] = useState<UserUpgrades>({
    feature: [],
    cosmetic: [],
    premium: [],
    utility: [],
  });
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [purchaseMessage, setPurchaseMessage] = useState<string>("");

  // Store items configuration
  const storeItems: StoreItem[] = [
    // Feature Upgrades
    {
      id: "dark-mode",
      name: "Light Mode",
      description: "Unlock the sleek dark theme for the entire app",
      price: 100,
      category: "feature",
      icon: <Palette className="h-6 w-6" />,
      rarity: "common",
      isOwned: false,
      isAvailable: true,
      requirements: { minTokens: 50 },
    },
    {
      id: "priority-support",
      name: "Priority Support",
      description: "Get faster response times from our support team",
      price: 2000,
      category: "premium",
      icon: <Shield className="h-6 w-6" />,
      rarity: "legendary",
      isOwned: false,
      isAvailable: true,
      requirements: { minTokens: 500 },
    },

    // Premium Upgrades
    {
      id: "governance",
      name: "Governance",
      description: "Enable Blapu Governance",
      price: 15000,
      category: "utility",
      icon: <Trophy className="h-6 w-6" />,
      rarity: "legendary",
      isOwned: false,
      isAvailable: true,
      requirements: { minTokens: 5000 },
    },
    {
      id: "tip-jar",
      name: "Tip Jar",
      description: "Support the BLAPU project with a generous tip",
      price: 500,
      category: "utility",
      icon: <PiggyBank className="h-6 w-6" />,
      rarity: "rare",
      isOwned: false,
      isAvailable: true,
      hasMessage: true,
      requirements: { minTokens: 100 },
    },
    {
      id: "dork-v2-nft",
      name: "Dork V2 NFT",
      description: "Exclusive Dork V2 NFT - Limited edition collectible",
      price: 5000,
      category: "cosmetic",
      icon: <Image className="h-6 w-6" />,
      rarity: "epic",
      isOwned: false,
      isAvailable: true,
      requirements: { minTokens: 1000 },
    },
    {
      id: "voi-network",
      name: "Voi Network",
      description:
        "Access to Voi Network features and cross-chain capabilities",
      price: 10000,
      category: "utility",
      icon: <Globe className="h-6 w-6" />,
      rarity: "legendary",
      isOwned: false,
      isAvailable: true,
      requirements: { minTokens: 5000 },
    },
    {
      id: "blapu-voi-premium",
      name: "BLAPU.voi",
      description: "Exclusive premium .voi domain name for BLAPU ecosystem",
      price: 8000,
      category: "premium",
      icon: <AtSign className="h-6 w-6" />,
      rarity: "epic",
      isOwned: false,
      isAvailable: true,
      requirements: { minTokens: 3000 },
    },
    {
      id: "custom-request",
      name: "Custom Request",
      description: "Submit a custom feature request for the BLAPU ecosystem",
      price: 5000,
      category: "utility",
      icon: <MessageSquare className="h-6 w-6" />,
      rarity: "rare",
      isOwned: false,
      isAvailable: true,
      hasMessage: true,
      requirements: { minTokens: 2000 },
    },
    {
      id: "send-message",
      name: "Send Message",
      description: "Send a message to the BLAPU team",
      price: 1,
      category: "utility",
      icon: <MessageSquare className="h-6 w-6" />,
      rarity: "common",
      isOwned: false,
      isAvailable: true,
      hasMessage: true,
      requirements: { minTokens: 1 },
    },
    {
      id: "custom-domain",
      name: "Custom Domain",
      description: "Get a custom domain name for BLAPU HUB",
      price: 500,
      category: "premium",
      icon: <Globe className="h-6 w-6" />,
      rarity: "rare",
      isOwned: false,
      isAvailable: true,
      hasMessage: true,
      requirements: { minTokens: 100 },
    },
  ];

  // Helper function to get algod client
  const algod = (networkId: NetworkId) => {
    const algodAPI = (networkId: NetworkId) => {
      switch (networkId) {
        case "mainnet":
          return "https://mainnet-api.algonode.cloud";
        case "testnet":
          return "https://testnet-api.algonode.cloud";
        default:
          return "https://testnet-api.algonode.cloud";
      }
    };

    const algodPort = (networkId: NetworkId) => {
      switch (networkId) {
        case "mainnet":
          return 443;
        case "testnet":
          return 443;
        default:
          return 443;
      }
    };

    return new algosdk.Algodv2("", algodAPI(networkId), algodPort(networkId));
  };

  // Swap ASA to ARC200 function
  const transferASAToARC200 = async (
    algodClient: algosdk.Algodv2,
    account: any,
    fromBucketId: string,
    toBucketId: string,
    amount: bigint
  ) => {
    // Get asset ID and token contract ID based on network
    const assetId = getAasaAppId(activeNetwork);
    const tokenContractId = getATokenAppId(activeNetwork);

    // Create ARC200 contract instance
    const ci = new CONTRACT(
      tokenContractId,
      algodClient,
      undefined,
      abi.custom,
      {
        addr: account.address,
        sk: new Uint8Array(),
      }
    );
    const builder = {
      token: new CONTRACT(
        tokenContractId,
        algodClient,
        undefined,
        abi.nt200,
        {
          addr: account.address,
          sk: new Uint8Array(),
        },
        true,
        false,
        true
      ),
    };

    // Build transaction group
    let customR;
    for (const p of [0, 28500]) {
      const buildN = [];
      {
        const decimals = 0;
        const atomic = BigInt(
          new BigNumber(amount)
            .multipliedBy(new BigNumber(10).pow(decimals))
            .toFixed(0)
        );
        const txnO = (await builder.token.deposit(atomic)).obj;
        const i = {
          ...txnO,
          note: new TextEncoder().encode("ASA to ARC200 transfer"),
          payment: p,
          // extra args
          xaid: Number(assetId),
          aamt: atomic,
          // asset holdings
          foreignAssets: [assetId],
          accounts: [
            "SDSKGUS5AEIQATOLCSNC4PUK5GK6G6JRWMKUJY5GQRWMNXUTWURVUIQV3U",
            algosdk.getApplicationAddress(tokenContractId),
          ],
        };
        buildN.push(i);
      }
      {
        const decimals = 0;
        const standard = BigInt(
          new BigNumber(amount)
            .multipliedBy(new BigNumber(10).pow(decimals))
            .toFixed(0)
        );
        const txnO = (
          await builder.token.arc200_transfer(
            "RCCTCTZR3S2HNQ5C4ABWJCZZAW5XHEJJSTNCTK7U2OEJ7T2433ONEHG654",
            amount
          )
        ).obj;
        const i = {
          ...txnO,
          note: new TextEncoder().encode(
            `transfer ${standard} ARC200 for ${selectedItem.name} Message: ${purchaseMessage}`
          ),
        };
        buildN.push(i);
      }
      ci.setFee(4000);
      ci.setBeaconId(tokenContractId);
      ci.setBeaconSelector("fb6eb573"); // touch()uint64
      ci.setEnableGroupResourceSharing(true);
      ci.setExtraTxns(buildN);
      customR = await ci.custom();
      console.log("customR", customR);
      if (customR.success) {
        break;
      }
    }
    if (!customR.success) {
      throw new Error("Failed to deposit ASA to ARC200");
    }
    const stxns = await signTransactions(
      customR.txns.map(
        (txn: string) =>
          new Uint8Array(
            atob(txn)
              .split("")
              .map((char) => char.charCodeAt(0))
          )
      )
    );
    const { txId } = await algodClient.sendRawTransaction(stxns).do();
    await algosdk.waitForConfirmation(algodClient, txId, 4);
    return txId;
  };

  // Fetch user balance
  const fetchUserBalance = async () => {
    if (!activeAccount?.address) return;

    try {
      const assetId = 401752010;

      const accountInfo = await algodClient
        .accountInformation(activeAccount.address)
        .do();
      console.log("accountInfo", accountInfo);
      console.log("assetId", assetId);
      const assetHolding = accountInfo.assets?.find(
        (asset: any) => asset["asset-id"] === assetId
      );
      if (!assetHolding) {
        setUserBalance(0);
        return;
      }
      console.log("assetHolding", assetHolding);
      const decimals = 0;
      setUserBalance(
        Number(assetHolding?.amount) /
          new BigNumber(10).pow(decimals).toNumber()
      );
    } catch (error) {
      setUserBalance(0);
      console.error("Error fetching user balance:", error);
    }
  };

  // Fetch user upgrades (this would typically come from a backend)
  const fetchUserUpgrades = async () => {
    // Simulate fetching user upgrades
    // In a real implementation, this would come from a database
    const mockUpgrades: UserUpgrades = {
      feature: [],
      cosmetic: [],
      premium: [],
      utility: [],
    };
    setUserUpgrades(mockUpgrades);
  };

  // Check if user can afford an item
  const canAfford = (item: StoreItem) => {
    return userBalance >= item.price;
  };

  // Check if user meets requirements
  const meetsRequirements = (item: StoreItem) => {
    if (!item.requirements) return true;

    if (
      item.requirements.minTokens &&
      userBalance < item.requirements.minTokens
    ) {
      return false;
    }

    return true;
  };

  // Get rarity color
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common":
        return "bg-gray-500";
      case "rare":
        return "bg-blue-500";
      case "epic":
        return "bg-purple-500";
      case "legendary":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  // Filter store items based on search and category
  const filteredItems = storeItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.rarity.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Handle purchase
  const handlePurchase = async (item: StoreItem) => {
    if (!activeAccount?.address || !signTransactions) {
      alert("Please connect your wallet first");
      return;
    }

    if (!canAfford(item)) {
      alert("Insufficient BLAPU tokens");
      return;
    }

    if (!meetsRequirements(item)) {
      alert("You do not meet the requirements for this item");
      return;
    }

    setSelectedItem(item);
    setPurchaseMessage(""); // Reset message when opening modal
    setIsPurchaseDialogOpen(true);
  };

  // Confirm purchase
  const confirmPurchase = async () => {
    if (!selectedItem || !activeAccount?.address || !signTransactions) return;

    setIsLoading(true);
    setPurchaseStatus("processing");

    try {
      // Convert price to micro units (6 decimals)
      const decimals = 0; // TODO fetch
      const amount = BigInt(selectedItem.price);

      // Perform ASA to ARC200 swap for payment
      const algodClient = algod(activeNetwork);
      console.log(
        "Executing ASA to ARC200 swap for purchase:",
        selectedItem.name
      );

      // Execute the swap
      const txId = await transferASAToARC200(
        algodClient,
        activeAccount,
        "algo-asa", // from ASA
        "algo-arc200", // to ARC200
        amount
      );

      console.log("Purchase transaction completed:", txId);

      // Update user upgrades
      setUserUpgrades((prev) => ({
        ...prev,
        [selectedItem.category]: [
          ...prev[selectedItem.category as keyof UserUpgrades],
          selectedItem.id,
        ],
      }));

      // Update balance
      setUserBalance((prev) => prev - selectedItem.price);

      setPurchaseStatus("success");
      setTimeout(() => {
        setIsPurchaseDialogOpen(false);
        setPurchaseStatus("idle");
        setSelectedItem(null);
      }, 1500);
    } catch (error) {
      console.error("Purchase error:", error);
      setPurchaseStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeAccount?.address) {
      fetchUserBalance();
      fetchUserUpgrades();
    }
  }, [activeAccount?.address]);

  return (
    <PageLayout>
      <div className="min-h-screen py-8 px-8 bg-gray-900 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 opacity-10 pointer-events-none z-0">
          <div className="absolute top-20 left-10 w-4 h-4 bg-yellow-400 animate-pulse rounded-full"></div>
          <div className="absolute top-40 right-20 w-2 h-2 bg-purple-400 animate-bounce rounded-full"></div>
          <div className="absolute bottom-40 left-1/4 w-3 h-3 bg-blue-400 animate-ping rounded-full"></div>
        </div>

        {/* Header */}
        <div className="text-center mb-8 relative z-10">
          <div className="flex items-center justify-center mb-4">
            <ShoppingCart className="h-8 w-8 text-yellow-400 mr-3" />
            <h1 className="text-4xl font-mono text-gray-100 tracking-wider">
              BLAPU STORE
            </h1>
          </div>
          <p className="text-lg text-gray-300 font-mono">
            Upgrade your app experience with exclusive features and cosmetics
          </p>
        </div>

        {/* User Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border border-gray-600 bg-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 font-mono">
                    BLAPU Balance
                  </p>
                  <p className="text-2xl font-bold text-gray-100 font-mono">
                    {userBalance.toLocaleString()}
                  </p>
                </div>
                <Coins className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-600 bg-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 font-mono">Owned Items</p>
                  <p className="text-2xl font-bold text-gray-100 font-mono">
                    {Object.values(userUpgrades).flat().length}
                  </p>
                </div>
                <Gift className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-600 bg-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 font-mono">Store Level</p>
                  <p className="text-2xl font-bold text-gray-100 font-mono">
                    {Math.floor(Object.values(userUpgrades).flat().length / 5) +
                      1}
                  </p>
                </div>
                <Star className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="mt-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search items by name, description, category, or rarity..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-400 font-mono"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                onClick={() => setSelectedCategory("all")}
                className="font-mono bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600"
              >
                All
              </Button>
              <Button
                variant={selectedCategory === "feature" ? "default" : "outline"}
                onClick={() => setSelectedCategory("feature")}
                className="font-mono bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600"
              >
                Features
              </Button>
              <Button
                variant={
                  selectedCategory === "cosmetic" ? "default" : "outline"
                }
                onClick={() => setSelectedCategory("cosmetic")}
                className="font-mono bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600"
              >
                Cosmetics
              </Button>
              <Button
                variant={selectedCategory === "premium" ? "default" : "outline"}
                onClick={() => setSelectedCategory("premium")}
                className="font-mono bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600"
              >
                Premium
              </Button>
              <Button
                variant={selectedCategory === "utility" ? "default" : "outline"}
                onClick={() => setSelectedCategory("utility")}
                className="font-mono bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600"
              >
                Utility
              </Button>
            </div>
          </div>
          {searchQuery && (
            <div className="mt-2 text-sm text-gray-400 font-mono">
              Found {filteredItems.length} item
              {filteredItems.length !== 1 ? "s" : ""} matching "{searchQuery}"
            </div>
          )}
        </div>

        {/* All Store Items */}
        <div className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => {
              const isOwned = userUpgrades[item.category].includes(item.id);
              const canBuy =
                canAfford(item) && meetsRequirements(item) && !isOwned;

              return (
                <Card
                  key={item.id}
                  className={`border transition-all duration-300 relative ${
                    isOwned
                      ? "border-green-500 bg-green-900/20"
                      : canBuy
                      ? "border-gray-600 bg-gray-800 hover:bg-gray-700 hover:border-gray-500"
                      : "border-gray-700 bg-gray-800/50 opacity-60"
                  }`}
                  style={{ pointerEvents: "auto" }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {item.icon}
                        <CardTitle className="text-lg text-gray-100 font-mono">
                          {item.name}
                        </CardTitle>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <Badge
                          className={`${getRarityColor(
                            item.rarity
                          )} text-white font-mono text-xs`}
                        >
                          {item.rarity.toUpperCase()}
                        </Badge>
                        <Badge className="bg-gray-600 text-white font-mono text-xs">
                          {item.category.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-300 font-mono">
                      {item.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Coins className="h-4 w-4 text-yellow-400" />
                        <span className="text-sm font-mono text-gray-200">
                          {item.price.toLocaleString()} BLAPU
                        </span>
                      </div>
                      {item.requirements && (
                        <div className="text-xs text-gray-400 font-mono">
                          Min: {item.requirements.minTokens} BLAPU
                        </div>
                      )}
                    </div>

                    {isOwned ? (
                      <div className="flex items-center space-x-2 text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-mono">OWNED</span>
                      </div>
                    ) : (
                      <Button
                        onClick={() => handlePurchase(item)}
                        disabled={!canBuy}
                        className={`w-full font-mono relative z-10 ${
                          canBuy
                            ? "bg-yellow-600 hover:bg-yellow-700 text-white cursor-pointer"
                            : "bg-gray-600 text-gray-400 cursor-not-allowed"
                        }`}
                        style={{ pointerEvents: canBuy ? "auto" : "none" }}
                      >
                        {canBuy ? "PURCHASE" : "INSUFFICIENT FUNDS"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Purchase Dialog */}
        <Dialog
          open={isPurchaseDialogOpen}
          onOpenChange={setIsPurchaseDialogOpen}
        >
          <DialogContent className="bg-gray-800 border border-gray-600">
            <DialogHeader>
              <DialogTitle className="text-xl text-gray-100 font-mono">
                Confirm Purchase
              </DialogTitle>
              <DialogDescription className="text-gray-300 font-mono">
                Are you sure you want to purchase this item?
              </DialogDescription>
            </DialogHeader>

            {selectedItem && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 bg-gray-700 border border-gray-600 rounded-lg">
                  {selectedItem.icon}
                  <div>
                    <h3 className="font-bold text-gray-100 font-mono">
                      {selectedItem.name}
                    </h3>
                    <p className="text-sm text-gray-300 font-mono">
                      {selectedItem.description}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-700 border border-gray-600 rounded-lg">
                  <span className="text-gray-300 font-mono">Price:</span>
                  <div className="flex items-center space-x-2">
                    <Coins className="h-4 w-4 text-yellow-400" />
                    <span className="font-bold text-gray-100 font-mono">
                      {selectedItem.price.toLocaleString()} BLAPU
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-700 border border-gray-600 rounded-lg">
                  <span className="text-gray-300 font-mono">Your Balance:</span>
                  <span className="font-bold text-gray-100 font-mono">
                    {userBalance.toLocaleString()} BLAPU
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-700 border border-gray-600 rounded-lg">
                  <span className="text-gray-300 font-mono">
                    Remaining After Purchase:
                  </span>
                  <span className="font-bold text-gray-100 font-mono">
                    {(userBalance - selectedItem.price).toLocaleString()} BLAPU
                  </span>
                </div>

                {selectedItem.hasMessage && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="purchase-message"
                      className="text-gray-300 font-mono"
                    >
                      Message (Optional):
                    </Label>
                    <Textarea
                      id="purchase-message"
                      placeholder={
                        selectedItem.id === "custom-request"
                          ? "Describe your custom feature request..."
                          : selectedItem.id === "tip-jar"
                          ? "Add a message with your tip..."
                          : "Add a message..."
                      }
                      value={purchaseMessage}
                      onChange={(e) => setPurchaseMessage(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 font-mono"
                      rows={3}
                    />
                  </div>
                )}
              </div>
            )}

            {purchaseStatus === "success" && (
              <Alert className="border-green-500 bg-green-900/20">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-300 font-mono">
                  Purchase successful! Your upgrade has been applied.
                </AlertDescription>
              </Alert>
            )}

            {purchaseStatus === "error" && (
              <Alert className="border-red-500 bg-red-900/20">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300 font-mono">
                  Purchase failed. Please try again.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsPurchaseDialogOpen(false)}
                disabled={isLoading}
                className="font-mono border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmPurchase}
                disabled={isLoading}
                className="font-mono bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                {isLoading ? "Processing..." : "Confirm Purchase"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
};

export default Store;
