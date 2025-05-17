
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

const WalletConnectButton: React.FC = () => {
  const [connected, setConnected] = useState(false);

  // Dummy user address placeholder
  const demoAccount = "0x4B...aC9";

  const handleConnect = () => {
    // Here you would integrate with a wallet provider (e.g. MetaMask, WalletConnect, etc.)
    // For now, we just simulate connect/disconnect
    setConnected(!connected);
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
        {connected ? `Connected: ${demoAccount}` : "Connect Wallet"}
      </Button>
      <span className="text-xs mt-1 text-[#9b87f5] select-none">
        {connected
          ? "Wallet connected"
          : "No wallet connected"}
      </span>
    </div>
  );
};

export default WalletConnectButton;
