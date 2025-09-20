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
// import Airdrop from "./pages/Airdrop"; // Removed airdrop page
// import About from "./pages/About"; // Removed about page
// import PALGO from "./pages/pALGO"; // Removed palgo page
// import Trading from "./pages/Trading"; // Removed trading page
import Voting from "./pages/Voting";
import VotingDemo from "./pages/VotingDemo";
import ElectionDemo from "./pages/ElectionDemo";
import Roadmap from "./pages/Roadmap";
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
      WalletId.MNEMONIC,
    ],
    network: NetworkId.MAINNET,
  });
  // Component to conditionally render sidebar based on route
  const AppLayout = () => {
    const location = useLocation();
    const isVotingPage = location.pathname.startsWith("/voting");
    const isElectionPage = location.pathname.startsWith("/election");
    const isRoadmapPage = location.pathname === "/roadmap";

    if (
      isVotingPage ||
      isElectionPage ||
      isRoadmapPage ||
      location.pathname === "/"
    ) {
      // Full-screen layout for voting pages and home (no sidebar)
      return (
        <div className="min-h-screen w-full">
          <Routes>
            <Route path="/" element={<Voting />} />
            <Route path="/voting" element={<Voting />} />
            <Route path="/voting-demo" element={<VotingDemo />} />
            <Route path="/election-demo" element={<ElectionDemo />} />
            <Route path="/roadmap" element={<Roadmap />} />
          </Routes>
        </div>
      );
    }

    // Sidebar layout for other pages
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full mobile-app-container">
          <AppSidebar />
          <SidebarInset className="flex-1 flex flex-col max-h-screen">
            <SidebarTrigger />
            <div className="flex-1 overflow-auto">
              <Routes>
                <Route path="/wallet/:address" element={<Wallet />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  };

  return (
    <WalletProvider manager={walletManager}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppLayout />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </WalletProvider>
  );
};

export default App;
