import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AppSidebar from "@/components/AppSidebar";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import Home from "./pages/Home";
import Bounties from "./pages/Bounties";
import {
  NetworkId,
  WalletId,
  WalletManager,
  WalletProvider,
} from "@txnlab/use-wallet-react";
//import Wallet from "./pages/Wallet";
import Airdrop from "./pages/Airdrop";

const queryClient = new QueryClient();

const App = () => {
  let walletConnectProjectId: string | null;
  if (!walletConnectProjectId) {
    walletConnectProjectId = "cd7fe0125d88d239da79fa286e6de2a8";
  }
  const walletManager = new WalletManager({
    wallets: [
      WalletId.PERA,
      WalletId.DEFLY,
      WalletId.KIBISIS,
      {
        id: WalletId.LUTE,
        options: { siteName: "Nautilus" },
      },
      {
        id: WalletId.BIATEC,
        options: {
          projectId: walletConnectProjectId,
          metadata: {
            name: "Nautilus",
            url: "https://nautilus.sh",
            description: "Nautilus NFT Marketplace",
            icons: ["https://nautilus.sh/favicon.ico"],
          },
          themeMode: "light",
        },
      },
      {
        id: WalletId.WALLETCONNECT,
        options: {
          projectId: walletConnectProjectId,
          metadata: {
            name: "Nautilus",
            url: "https://nautilus.sh",
            description: "Nautilus NFT Marketplace",
            icons: ["https://nautilus.sh/favicon.ico"],
          },
          themeMode: "light",
        },
      },
      //WalletId.PERA,
    ],
    // algod: {
    //   baseServer: ALGO_SERVER,
    //   port: "",
    //   token: "",
    // },
    network: NetworkId.VOIMAIN,
  });
  return (
    <WalletProvider manager={walletManager}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SidebarProvider>
              <div className="min-h-screen flex w-full">
                <AppSidebar />
                <SidebarInset className="flex-1 flex flex-col max-h-screen">
                  <SidebarTrigger />
                  {/* Make main content scrollable and fill all available vertical space */}
                  <div className="flex-1 overflow-auto">
                    <Routes>
                      <Route path="/" element={<Airdrop />} />
                      {/* <Route path="/home" element={<Home />} /> */}
                      {/*<Route path="/bounties" element={<Bounties />} />*/}
                      {/*<Route path="/wallet/:address" element={<Wallet />} />*/}
                      <Route path="/airdrop" element={<Airdrop />} />
                      <Route
                        path="/airdrop/:recipients"
                        element={<Airdrop />}
                      />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </div>
                </SidebarInset>
              </div>
            </SidebarProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </WalletProvider>
  );
};

export default App;
