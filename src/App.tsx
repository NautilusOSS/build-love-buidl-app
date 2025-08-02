import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Wallet from "./pages/Wallet";
import AppSidebar from "@/components/AppSidebar";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import Home from "./pages/Home";
import {
  NetworkId,
  WalletId,
  WalletManager,
  WalletProvider,
} from "@txnlab/use-wallet-react";
//import Wallet from "./pages/Wallet";
import Airdrop from "./pages/Airdrop";
import About from "./pages/About";
import PALGO from "./pages/pALGO";
import Trading from "./pages/Trading";
import Governance from "./pages/Governance";
import ProposalsList from "./pages/ProposalsList";
import ProposalDetail from "./pages/ProposalDetail";
import CreateProposal from "./pages/CreateProposal";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import ProposalStatesDemo from "./pages/ProposalStatesDemo";
import PowerUp from "./pages/PowerUp";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

const queryClient = new QueryClient();

const App = () => {
  let walletConnectProjectId: string | null;
  if (!walletConnectProjectId) {
    walletConnectProjectId = "e7b04c22de006e0fc7cef5a00cb7fac9";
  }

  // Create a BreadcrumbContent component to use useLocation
  const BreadcrumbContent = () => {
    const location = useLocation();
    const pathSegments = location.pathname.split("/").filter(Boolean);

    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="text-[#1EAEDB] font-bold tracking-tight">
              POW
            </BreadcrumbPage>
          </BreadcrumbItem>
          {pathSegments.map((segment, index) => (
            <BreadcrumbItem key={index}>
              <BreadcrumbPage className="capitalize">{segment}</BreadcrumbPage>
            </BreadcrumbItem>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    );
  };

  const walletManager = new WalletManager({
    wallets: [
      WalletId.PERA,
      WalletId.DEFLY,
      WalletId.KIBISIS,
      {
        id: WalletId.LUTE,
        options: { siteName: "POW App" },
      },
      {
        id: WalletId.BIATEC,
        options: {
          projectId: walletConnectProjectId,
          metadata: {
            name: "POW App",
            url: "https://powapp.xyz",
            description: "Power ($POW) Airdrop App",
            icons: ["https://powapp.xyz/favicon.ico"],
          },
          themeMode: "light",
        },
      },
      {
        id: WalletId.WALLETCONNECT,
        options: {
          projectId: walletConnectProjectId,
          metadata: {
            name: "POW App",
            url: "https://powapp.xyz",
            description: "Power ($POW) Airdrop App",
            icons: ["https://powapp.xyz/favicon.ico"],
          },
          themeMode: "light",
        },
      },
      {
        id: WalletId.MNEMONIC,
        options: {
          persistToStorage: true,
        },
      },
    ],
    network: NetworkId.MAINNET,
  });
  return (
    <WalletProvider manager={walletManager}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SidebarProvider>
              <div className="min-h-screen flex w-full mobile-app-container">
                <AppSidebar />
                <SidebarInset className="flex-1 flex flex-col max-h-screen">
                  <SidebarTrigger />
                  {/* Make main content scrollable and fill all available vertical space */}
                  <div className="flex-1 overflow-auto">
                    <Routes>
                      <Route path="/" element={<Airdrop />} />
                      {/* <Route path="/home" element={<Home />} /> */}
                      <Route path="/wallet/:address" element={<Wallet />} />
                      <Route path="/airdrop" element={<Airdrop />} />
                      <Route
                        path="/airdrop/:recipients"
                        element={<Airdrop />}
                      />
                      <Route path="/about" element={<About />} />
                      <Route path="/palgo" element={<PALGO />} />
                      <Route path="/trading" element={<Trading />} />

                      {/* Governance Routes */}
                      <Route path="/governance" element={<Governance />} />
                      <Route
                        path="/governance/proposals"
                        element={<ProposalsList />}
                      />
                      <Route
                        path="/governance/proposals/create"
                        element={<CreateProposal />}
                      />
                      <Route
                        path="/governance/proposals/:id"
                        element={<ProposalDetail />}
                      />
                      <Route
                        path="/governance/dashboard"
                        element={<Dashboard />}
                      />
                      <Route
                        path="/governance/admin"
                        element={<AdminPanel />}
                      />
                      <Route
                        path="/governance/demo"
                        element={<ProposalStatesDemo />}
                      />

                      {/* Power UP Routes */}
                      <Route path="/powerup" element={<PowerUp />} />
                      <Route path="/powerup/:address" element={<PowerUp />} />

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
