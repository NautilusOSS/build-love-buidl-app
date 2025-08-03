import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Wallet, Power } from "lucide-react";
import { useWallet, NetworkId, WalletId } from "@txnlab/use-wallet-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface WalletConnectModalProps {
  children: React.ReactNode;
  onConnect?: () => void;
}

const WalletConnectModal: React.FC<WalletConnectModalProps> = ({
  children,
  onConnect,
}) => {
  const [open, setOpen] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const {
    activeAccount,
    wallets,
    activeWallet,
    activeWalletAccounts,
    activeNetwork,
    setActiveNetwork,
  } = useWallet();

  // Add networks array
  const networks = [
    { id: NetworkId.MAINNET, name: "Algorand" },
    { id: NetworkId.TESTNET, name: "Algorand Testnet" },
    { id: NetworkId.VOIMAIN, name: "Voi" },
    { id: NetworkId.LOCALNET, name: "Localnet" },
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
    [NetworkId.TESTNET]: [
      { id: WalletId.KIBISIS, name: "Kibisis" },
      { id: WalletId.LUTE, name: "Lute" },
    ],
    [NetworkId.VOIMAIN]: [
      { id: WalletId.KIBISIS, name: "Kibisis" },
      { id: WalletId.LUTE, name: "Lute" },
      { id: WalletId.BIATEC, name: "Biatec" },
      { id: WalletId.WALLETCONNECT, name: "WalletConnect" },
    ],
    [NetworkId.LOCALNET]: [WalletId.MNEMONIC],
  };

  // Filter wallets based on active network
  const availableWallets = wallets.filter((wallet) =>
    networkWallets[activeNetwork as NetworkId].some(
      (networkWallet) => networkWallet.id === wallet.id
    )
  );

  // Function to handle wallet connection
  const handleWalletConnect = async (wallet: any) => {
    setConnecting(wallet.id);

    // Set a 5-second timeout for wallet connection
    const connectionTimeout = setTimeout(() => {
      setConnecting(null);
    }, 5000);

    try {
      const [activeAccount] = await wallet.connect();
      clearTimeout(connectionTimeout);
      setConnecting(null);
      setOpen(false);

      // Call the onConnect callback if provided
      if (onConnect) {
        onConnect();
      }
    } catch (error) {
      clearTimeout(connectionTimeout);
      setConnecting(null);
      
      // Handle specific Pera wallet errors
      if (error instanceof Error) {
        if (error.message.includes("Ve.from is not a function")) {
          console.error("Pera wallet is temporarily unavailable:", error);
        } else if (error.message.includes("PeraWalletConnectError")) {
          console.error("Pera wallet connection failed:", error);
        } else {
          console.error("Wallet connection failed:", error);
        }
      } else {
        console.error("Wallet connection failed:", error);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl border-2 border-gray-200/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Connect Wallet
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Network Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Network</label>
            <Select
              value={activeNetwork}
              onValueChange={(networkId) => {
                activeWallet?.disconnect();
                setActiveNetwork(networkId as NetworkId);
              }}
            >
              <SelectTrigger className="w-full rounded-xl">
                <SelectValue placeholder="Select network" />
              </SelectTrigger>
              <SelectContent>
                {networks.map((network) => (
                  <SelectItem key={network.id} value={network.id}>
                    {network.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Available Wallets */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Available Wallets</label>
            <div className="space-y-2">
              {availableWallets.map((wallet) => (
                <div key={wallet.id}>
                  <Button
                    onClick={() => handleWalletConnect(wallet)}
                    disabled={!!connecting}
                    variant="outline"
                    className="w-full flex justify-between items-center rounded-xl"
                  >
                    <div className="flex items-center gap-2">
                      {wallet.metadata.name}
                      {wallet.id === activeWallet?.id && (
                        <span className="text-xs text-green-600">Active</span>
                      )}
                      {connecting === wallet.id && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {wallet.id === activeWallet?.id && (
                        <Power className="h-4 w-4" />
                      )}
                    </div>
                  </Button>

                  {/* Account Selector for connected wallet */}
                  {wallet.id === activeWallet?.id && activeWalletAccounts && (
                    <div className="ml-4 mt-2 space-y-2">
                      <Select
                        value={activeAccount?.address}
                        onValueChange={(address) => {
                          activeWallet?.setActiveAccount(address);
                        }}
                      >
                        <SelectTrigger className="w-full rounded-xl">
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          <input
                            className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mb-2"
                            placeholder="Search addresses..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                          {activeWalletAccounts
                            .filter((account) =>
                              account.address
                                .toLowerCase()
                                .includes(searchQuery.toLowerCase())
                            )
                            .map((account) => (
                              <SelectItem
                                key={account.address}
                                value={account.address}
                              >
                                {account.address.slice(0, 5)}...
                                {account.address.slice(-4)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Connection Status */}
          {activeAccount && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-sm text-green-800">
                Connected: {activeAccount.address.slice(0, 5)}...
                {activeAccount.address.slice(-4)}
              </p>
              <p className="text-xs text-green-600 mt-1">
                Network:{" "}
                {networks.find((n) => n.id === activeNetwork)?.name ||
                  activeNetwork}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WalletConnectModal;
