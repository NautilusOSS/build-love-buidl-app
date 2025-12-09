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
  NetworkConfigBuilder,
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
import ExitLab from "./pages/ExitLab";
import StakingContracts from "./pages/StakingContracts";
import FundRecovery from "./pages/FundRecovery";
import GrantPay from "./pages/GrantPay";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

// Add other AVM-compatible networks
const networks = new NetworkConfigBuilder()
  .addNetwork("voi-mainnet", {
    algod: {
      token: "",
      baseServer: "https://mainnet-api.voi.nodely.dev",
      port: "",
    },
    isTestnet: false,
    genesisHash: "r20fSQI8gWe/kFZziNonSPCXLwcQmH/nxROvnnueWOk=",
    genesisId: "voimain-v1.0",
    caipChainId: "algorand:r20fSQI8gWe_kFZziNonSPCXLwcQmH_n",
  })
  .build();

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
              EXITLAB
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
      // WalletId.PERA,
      // WalletId.DEFLY,
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
            name: "ExitLab",
            url: "https://exitlab.xyz",
            description: "Staking Contract Exit & Fund Recovery Lab",
            icons: ["https://exitlab.xyz/favicon.ico"],
          },
          themeMode: "light",
        },
      },
      {
        id: WalletId.WALLETCONNECT,
        options: {
          projectId: walletConnectProjectId,
          metadata: {
            name: "ExitLab",
            url: "https://exitlab.xyz",
            description: "Staking Contract Exit & Fund Recovery Lab",
            icons: ["https://exitlab.xyz/favicon.ico"],
          },
          themeMode: "light",
        },
      },
      // {
      //   id: WalletId.MNEMONIC,
      //   options: {
      //     persistToStorage: true,
      //   },
      // },
    ],
    defaultNetwork: "voi-mainnet",
    networks,
  });
  // Component to conditionally render sidebar based on route
  const AppLayout = () => {
    const location = useLocation();
    const isExitLabPage = location.pathname === "/";
    const isStakingPage = location.pathname.startsWith("/staking");
    const isRecoveryPage = location.pathname.startsWith("/recovery");
    const isWalletPage = location.pathname.startsWith("/wallet");
    const isGrantPayPage = location.pathname.startsWith("/grant-pay");

    if (
      isExitLabPage ||
      isStakingPage ||
      isRecoveryPage ||
      isWalletPage ||
      isGrantPayPage
    ) {
      // Full-screen layout for ExitLab pages (no sidebar)
      return (
        <div className="min-h-screen w-full">
          <Routes>
            <Route path="/" element={<GrantPay />} />
          </Routes>
        </div>
      );
    }

    // Sidebar layout for other pages
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full mobile-app-container">
          <AppSidebar />
          <SidebarInset className="flex-1 flex flex-col max-h-screen overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#0088ff33] flex-shrink-0">
              <SidebarTrigger />
              <div className="text-sm text-gray-500">Wallet Management</div>
            </div>
            <div className="flex-1 overflow-auto p-4">
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
