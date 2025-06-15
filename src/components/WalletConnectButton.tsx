import React, { useState, useEffect } from "react";
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
import { useNavigate } from "react-router-dom";
import { useSidebar } from "./ui/sidebar";

const WalletConnectButton: React.FC = () => {
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();
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
    { id: NetworkId.VOIMAIN, name: "Voi" },
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
    [NetworkId.VOIMAIN]: [
      { id: WalletId.KIBISIS, name: "Kibisis" },
      { id: WalletId.LUTE, name: "Lute" },
      { id: WalletId.BIATEC, name: "Biatec" },
      { id: WalletId.WALLETCONNECT, name: "WalletConnect" },
    ],
  };

  // Filter wallets based on active network
  const availableWallets = wallets.filter((wallet) =>
    networkWallets[activeNetwork as NetworkId].some(
      (networkWallet) => networkWallet.id === wallet.id
    )
  );

  // Function to handle wallet connection with requirement check
  const handleWalletConnect = async (wallet: any) => {
    // Proceed with normal wallet connection
    setConnecting(wallet.id);
    if (wallet.id === activeWallet?.id) {
      activeWallet?.disconnect();
      setConnecting(null);
      return;
    }

    // Set a 30-second timeout for wallet connection
    const connectionTimeout = setTimeout(() => {
      setConnecting(null);
    }, 5000);

    try {
      toggleSidebar();
      const [activeAccount] = await wallet.connect();
      clearTimeout(connectionTimeout);
      setConnecting(null);
      navigate(`/airdrop/${activeAccount.address}`);
    } catch (error) {
      clearTimeout(connectionTimeout);
      setConnecting(null);
      console.error("Wallet connection failed:", error);
    }
  };

  const handleConnect = () => {
    // This function is no longer needed since wallets show automatically when not connected
  };

  return (
    <div className="mb-3 mt-10 px-4 flex flex-col items-start">
      <Button
        variant="secondary"
        className="w-full flex items-center gap-2 border border-[#1eaedb] shadow-glow text-white bg-[#0a4d62] hover:bg-[#0d6179] focus:ring-2 focus:ring-[#1eaedb] focus:ring-offset-2 transition rounded-xl"
        onClick={handleConnect}
        aria-label={activeAccount ? "Disconnect wallet" : "Connect wallet"}
      >
        <Wallet className="mr-2" />
        {activeAccount
          ? `Connected: ${activeAccount.address.slice(
              0,
              5
            )}...${activeAccount.address.slice(-4)}`
          : "Connect Wallet"}
      </Button>
      <span className="text-xs mt-1 text-[#1eaedb] select-none">
        {activeAccount
          ? `Wallet connected to ${
              networks.find((n) => n.id === activeNetwork)?.name ||
              activeNetwork
            }`
          : "No wallet connected"}
      </span>
      <div className="mt-2 w-full">
        {/* Network Selector moved above wallets */}
        <Select
          value={activeNetwork}
          onValueChange={(networkId) => {
            activeWallet?.disconnect();
            setActiveNetwork(networkId as NetworkId);
          }}
        >
          <SelectTrigger className="w-full bg-[#0a4d62] border-[#1eaedb] text-[#1eaedb] rounded-xl relative">
            <SelectValue placeholder="Select network" />
          </SelectTrigger>
          <SelectContent className="bg-[#0a4d62] border-[#1eaedb] z-[9999] rounded-xl relative">
            {networks.map((network) => (
              <SelectItem
                key={network.id}
                value={network.id}
                className="text-[#1eaedb] hover:bg-[#0d6179] focus:bg-[#0d6179]"
              >
                {network.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Add margin below network selector */}
        <div className="mt-2">
          {availableWallets.map((wallet) => (
            <div key={wallet.id}>
              <Button
                onClick={() => handleWalletConnect(wallet)}
                disabled={!!connecting}
                className="w-full flex justify-between items-center rounded-xl"
              >
                <div className="flex items-center gap-2">
                  {wallet.metadata.name}
                  {wallet.id === activeWallet?.id && (
                    <span className="text-xs text-[#1eaedb] select-none">
                      Active
                    </span>
                  )}
                  {connecting === wallet.id && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {wallet.id === activeWallet?.id && <Power />}
                </div>
              </Button>
              {wallet.id === activeWallet?.id && activeWalletAccounts && (
                <div className="ml-4 mt-2 space-y-2">
                  <Select
                    value={activeAccount?.address}
                    onValueChange={(address) => {
                      activeWallet?.setActiveAccount(address);
                    }}
                  >
                    <SelectTrigger className="w-full bg-[#0a4d62] border-[#1eaedb] text-[#1eaedb] rounded-xl relative">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a4d62] border-[#1eaedb] z-[9999] backdrop-blur-none rounded-xl relative">
                      <input
                        className="flex w-full rounded-xl h-8 px-2 py-1 mb-2 bg-[#0d6179] text-[#1eaedb] border border-[#1eaedb] focus:outline-none focus:ring-2 focus:ring-[#1eaedb]"
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
                            className="text-[#1eaedb] hover:bg-[#0d6179] focus:bg-[#0d6179]"
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
    </div>
  );
};

export default WalletConnectButton;
