import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Wallet, Power } from "lucide-react";
import { useWallet } from "@txnlab/use-wallet-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const WalletConnectButton: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [showWallets, setShowWallets] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { activeAccount, wallets, activeWallet, activeWalletAccounts } =
    useWallet();

  const handleConnect = () => {
    setShowWallets(!showWallets);
  };

  return (
    <div className="mb-3 mt-10 px-4 flex flex-col items-start">
      <Button
        variant="secondary"
        className="w-full flex items-center gap-2 border border-[#613db7] shadow-glow text-white bg-[#2e2642] hover:bg-[#3b3060] focus:ring-2 focus:ring-[#a188fa] focus:ring-offset-2 transition"
        onClick={handleConnect}
        aria-label={connected ? "Disconnect wallet" : "Connect wallet"}
      >
        <Wallet className="mr-2" />
        {activeAccount
          ? `Connected: ${activeAccount.address.slice(
              0,
              5
            )}...${activeAccount.address.slice(-4)}`
          : "Connect Wallet"}
      </Button>
      <span className="text-xs mt-1 text-[#9b87f5] select-none">
        {activeAccount ? "Wallet connected" : "No wallet connected"}
      </span>
      {showWallets && (
        <div className="mt-2 w-full">
          {wallets.map((wallet) => (
            <div key={wallet.id}>
              <Button
                onClick={async () => {
                  setConnecting(wallet.id);
                  if (wallet.id === activeWallet?.id) {
                    activeWallet?.disconnect();
                    setConnecting(null);
                    return;
                  }
                  await wallet.connect().then(() => {
                    setConnecting(null);
                  });
                }}
                disabled={!!connecting}
                className="w-full flex justify-between items-center"
              >
                <div className="flex items-center gap-2">
                  {wallet.metadata.name}
                  {wallet.id === activeWallet?.id && (
                    <span className="text-xs text-[#9b87f5] select-none">
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
                <div className="ml-4 mt-2">
                  <Select
                    value={activeAccount?.address}
                    onValueChange={(address) => {
                      activeWallet?.setActiveAccount(address);
                    }}
                  >
                    <SelectTrigger className="w-full bg-[#2e2642] border-[#613db7] text-[#9b87f5]">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2e2642] border-[#613db7] z-50 backdrop-blur-none">
                      <input
                        className="flex w-full rounded-sm h-8 px-2 py-1 mb-2 bg-[#3b3060] text-[#9b87f5] border border-[#613db7] focus:outline-none focus:ring-2 focus:ring-[#a188fa]"
                        placeholder="Search addresses..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                      {activeWalletAccounts
                        .filter((account) => 
                          account.address.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((account) => (
                          <SelectItem
                            key={account.address}
                            value={account.address}
                            className="text-[#9b87f5] hover:bg-[#3b3060] focus:bg-[#3b3060]"
                          >
                            {account.address.slice(0, 5)}...{account.address.slice(-4)}
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
  );
};

export default WalletConnectButton;
