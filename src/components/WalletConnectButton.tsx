import React, { useState, useEffect, useMemo } from "react";
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
import { useNavigate, useLocation } from "react-router-dom";
import { useSidebar } from "./ui/sidebar";
import algosdk from "algosdk";
import { SimpleFaucet } from "@/service/simple-faucet";

// Constants
const NETWORKS = [
  { id: NetworkId.MAINNET, name: "Algorand" },
  //{ id: NetworkId.TESTNET, name: "Algorand Testnet" },
  //{ id: NetworkId.VOIMAIN, name: "Voi" },
  //{ id: NetworkId.LOCALNET, name: "Localnet" },
] as const;

const NETWORK_WALLETS = {
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
  [NetworkId.LOCALNET]: [{ id: WalletId.MNEMONIC, name: "Mnemonic" }],
} as const;

// Types
interface Wallet {
  id: string;
  metadata: { name: string };
  connect: () => Promise<any[]>;
  disconnect: () => void;
  setActiveAccount: (address: string) => void;
}

// Custom hooks
const useWalletConnection = () => {
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { activeWallet, activeNetwork } = useWallet();

  const isWalletPage = location.pathname.startsWith("/wallet/");

  const handleWalletConnect = async (wallet: Wallet) => {
    setConnecting(wallet.id);
    setError(null);
    
    if (wallet.id === activeWallet?.id) {
      activeWallet?.disconnect();
      setConnecting(null);
      return;
    }

    const connectionTimeout = setTimeout(() => {
      setConnecting(null);
      setError("Connection timeout. Please try again.");
    }, 10000); // Increased timeout to 10 seconds

    try {
      if (![NetworkId.LOCALNET].includes(activeNetwork as NetworkId)) {
        toggleSidebar();
      } else {
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
          "game list violin lens desert jealous earth prefer bless ski dentist lesson harbor avoid oyster skate episode digital pelican sound clay heavy digital about warm"
        );
        await faucet.fundAccount(addr, 2e6);
      }
      
      const [activeAccount] = await wallet.connect();
      clearTimeout(connectionTimeout);
      setConnecting(null);

      if (isWalletPage && activeAccount) {
        navigate(`/wallet/${activeAccount.address}`);
      }
    } catch (error) {
      clearTimeout(connectionTimeout);
      setConnecting(null);
      
      // Handle specific Pera wallet errors
      let errorMessage = "Wallet connection failed";
      if (error instanceof Error) {
        if (error.message.includes("Ve.from is not a function")) {
          errorMessage = "Pera wallet is temporarily unavailable. Please try another wallet.";
        } else if (error.message.includes("PeraWalletConnectError")) {
          errorMessage = "Pera wallet connection failed. Please try another wallet.";
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      console.error("Wallet connection failed:", error);
    }
  };

  return { connecting, error, handleWalletConnect, isWalletPage };
};

const useAccountSelection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { activeWallet, activeAccount } = useWallet();

  const isWalletPage = location.pathname.startsWith("/wallet/");

  const handleAccountChange = (address: string) => {
    activeWallet?.setActiveAccount(address);
    if (isWalletPage && address) {
      navigate(`/wallet/${address}`);
    }
  };

  return { searchQuery, setSearchQuery, handleAccountChange };
};

const WalletConnectButton: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const { connecting, error, handleWalletConnect, isWalletPage } = useWalletConnection();
  const { searchQuery, setSearchQuery, handleAccountChange } = useAccountSelection();
  
  const {
    activeAccount,
    wallets,
    activeWallet,
    activeWalletAccounts,
    activeNetwork,
    setActiveNetwork,
    algodClient,
  } = useWallet();

  // Memoize filtered wallets to prevent unnecessary re-computations
  const availableWallets = useMemo(() => 
    wallets.filter((wallet) =>
      NETWORK_WALLETS[activeNetwork as NetworkId].some(
        (networkWallet) => networkWallet.id === wallet.id
      )
    ), [wallets, activeNetwork]
  );

  // Memoize loading state
  const isLoadingWallets = useMemo(() => wallets.length === 0, [wallets.length]);

  // Memoize filtered accounts for search
  const filteredAccounts = useMemo(() => 
    activeWalletAccounts?.filter((account) =>
      account.address.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [], [activeWalletAccounts, searchQuery]
  );

  const handleConnect = () => {
    // This function is no longer needed since wallets show automatically when not connected
  };

  return (
    <div className="mb-2 mt-6 px-3 flex flex-col items-start">
      <Button
        variant="secondary"
        className="w-full flex items-center gap-2 border border-[#1eaedb] shadow-glow text-white bg-[#0a4d62] hover:bg-[#0d6179] focus:ring-2 focus:ring-[#1eaedb] focus:ring-offset-2 transition rounded-xl py-2"
        onClick={handleConnect}
        aria-label={activeAccount ? "Disconnect wallet" : "Connect wallet"}
        disabled={isLoadingWallets}
      >
        <Wallet className="mr-1 h-4 w-4" />
        {isLoadingWallets ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-xs">Loading...</span>
          </>
        ) : activeAccount ? (
          <span className="text-xs">
            {activeAccount.address.slice(0, 5)}...{activeAccount.address.slice(-4)}
          </span>
        ) : (
          <span className="text-xs">Connect Wallet</span>
        )}
      </Button>
      
      <div className="flex items-center justify-between w-full mt-1">
        <span className="text-[10px] text-[#1eaedb] select-none">
          {isLoadingWallets
            ? "Initializing..."
            : activeAccount
            ? `${NETWORKS.find((n) => n.id === activeNetwork)?.name || activeNetwork}`
            : "No wallet connected"}
        </span>
        
        {/* Error Display - Compact */}
        {error && (
          <span className="text-[10px] text-red-400 ml-2">{error}</span>
        )}
      </div>
      

      
      <div className="mt-1 w-full">
        {/* Network Selector */}
        <Select
          value={activeNetwork}
          onValueChange={(networkId) => {
            activeWallet?.disconnect();
            setActiveNetwork(networkId as NetworkId);
          }}
          disabled={isLoadingWallets}
        >
          <SelectTrigger className="w-full bg-[#0a4d62] border-[#1eaedb] text-[#1eaedb] rounded-lg relative h-8 text-xs disabled:opacity-50">
            <SelectValue placeholder={isLoadingWallets ? "Loading..." : "Network"} />
          </SelectTrigger>
          <SelectContent className="bg-[#0a4d62] border-[#1eaedb] z-[9999] rounded-lg relative">
            {NETWORKS.map((network) => (
              <SelectItem
                key={network.id}
                value={network.id}
                className="text-[#1eaedb] hover:bg-[#0d6179] focus:bg-[#0d6179] text-xs"
              >
                {network.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Wallets List - Compact */}
        <div className="mt-1">
          {isLoadingWallets ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-3 w-3 animate-spin text-[#1eaedb]" />
              <span className="ml-1 text-[10px] text-[#1eaedb]">Loading wallets...</span>
            </div>
          ) : availableWallets.length === 0 ? (
            <div className="text-center py-2">
              <p className="text-[10px] text-gray-400">No wallets available</p>
            </div>
          ) : (
            <div className="space-y-1">
              {availableWallets.map((wallet) => (
                <div key={wallet.id}>
                  <Button
                    onClick={() => handleWalletConnect(wallet)}
                    disabled={!!connecting}
                    className="w-full flex justify-between items-center rounded-lg bg-[#0a4d62] border-[#1eaedb] text-[#1eaedb] hover:bg-[#0d6179] disabled:opacity-50 disabled:cursor-not-allowed h-7 text-xs"
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-[10px]">{wallet.metadata.name}</span>
                      {wallet.id === activeWallet?.id && (
                        <span className="text-[8px] text-[#1eaedb] bg-[#1eaedb]/20 px-1 rounded">
                          Active
                        </span>
                      )}
                      {connecting === wallet.id && (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                    </div>
                    {wallet.id === activeWallet?.id && <Power className="h-3 w-3" />}
                  </Button>
                  
                  {/* Account Selector - Compact */}
                  {wallet.id === activeWallet?.id && activeWalletAccounts && (
                    <div className="ml-3 mt-1">
                      <Select
                        value={activeAccount?.address}
                        onValueChange={handleAccountChange}
                      >
                        <SelectTrigger className="w-full bg-[#0a4d62] border-[#1eaedb] text-[#1eaedb] rounded-lg relative h-6 text-[10px]">
                          <SelectValue placeholder="Account" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0a4d62] border-[#1eaedb] z-[9999] backdrop-blur-none rounded-lg relative">
                          <input
                            className="flex w-full rounded-lg h-6 px-2 py-1 mb-1 bg-[#0d6179] text-[#1eaedb] border border-[#1eaedb] focus:outline-none focus:ring-1 focus:ring-[#1eaedb] text-[10px]"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                          {filteredAccounts.map((account) => (
                            <SelectItem
                              key={account.address}
                              value={account.address}
                              className="text-[#1eaedb] hover:bg-[#0d6179] focus:bg-[#0d6179] text-[10px]"
                            >
                              {account.address.slice(0, 4)}...{account.address.slice(-3)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default WalletConnectButton;
