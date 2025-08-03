import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AppSidebar from "@/components/AppSidebar";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import {
  NetworkId,
  WalletId,
  WalletManager,
  WalletProvider,
} from "@txnlab/use-wallet-react";
import Home from "./pages/Home";
import Governance from "./pages/Governance";
import ProposalsList from "./pages/ProposalsList";
import ProposalDetail from "./pages/ProposalDetail";
import CreateProposal from "./pages/CreateProposal";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import ProposalStatesDemo from "./pages/ProposalStatesDemo";
import PowerUp from "./pages/PowerUp";
import Store from "./pages/Store";
import Wallet from "./pages/Wallet";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  GovernanceGuard,
  GovernanceProposalsGuard,
  GovernanceDashboardGuard,
  GovernanceAdminGuard,
  GovernanceDemoGuard,
  WalletGuard,
  PowerUpGuard,
  StoreGuard,
} from "@/components/FeatureFlagGuard";

const queryClient = new QueryClient();

const App = () => {
  let walletConnectProjectId: string | null;
  if (!walletConnectProjectId) {
    walletConnectProjectId = "cd7fe0125d88d239da79fa286e6de2a8";
  }

  // Create a BreadcrumbContent component to use useLocation
  const BreadcrumbContent = () => {
    const location = useLocation();
    const pathSegments = location.pathname.split("/").filter(Boolean);

    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="text-[#ff6600] font-bold tracking-tight font-8bit uppercase">
              BLAPU
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
        options: { siteName: "Blapu App" },
      },
      {
        id: WalletId.BIATEC,
        options: {
          projectId: walletConnectProjectId,
          metadata: {
            name: "Blapu App",
            url: "https://blapu.biz",
            description: "Blapu ($BLAPU) Token App",
            icons: ["/favicon.svg"],
          },
          themeMode: "light",
        },
      },
      {
        id: WalletId.WALLETCONNECT,
        options: {
          projectId: walletConnectProjectId,
          metadata: {
            name: "Blapu App",
            url: "https://blapu.biz",
            description: "Blapu ($BLAPU) Token App",
            icons: ["/favicon.svg"],
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
                      <Route path="/" element={<Home />} />
                      {/* Governance Routes */}
                      <Route
                        path="/governance"
                        element={
                          <GovernanceGuard>
                            <Governance />
                          </GovernanceGuard>
                        }
                      />
                      <Route
                        path="/governance/proposals"
                        element={
                          <GovernanceProposalsGuard>
                            <ProposalsList />
                          </GovernanceProposalsGuard>
                        }
                      />
                      <Route
                        path="/governance/proposals/create"
                        element={
                          <GovernanceProposalsGuard>
                            <CreateProposal />
                          </GovernanceProposalsGuard>
                        }
                      />
                      <Route
                        path="/governance/proposals/:id"
                        element={
                          <GovernanceProposalsGuard>
                            <ProposalDetail />
                          </GovernanceProposalsGuard>
                        }
                      />
                      <Route
                        path="/governance/dashboard"
                        element={
                          <GovernanceDashboardGuard>
                            <Dashboard />
                          </GovernanceDashboardGuard>
                        }
                      />
                      <Route
                        path="/governance/admin"
                        element={
                          <GovernanceAdminGuard>
                            <AdminPanel />
                          </GovernanceAdminGuard>
                        }
                      />
                      <Route
                        path="/governance/demo"
                        element={
                          <GovernanceDemoGuard>
                            <ProposalStatesDemo />
                          </GovernanceDemoGuard>
                        }
                      />

                      <Route
                        path="/wallet/:address"
                        element={
                          <WalletGuard>
                            <Wallet />
                          </WalletGuard>
                        }
                      />

                      {/* Blapu UP Routes */}
                      <Route
                        path="/blapuup"
                        element={
                          <PowerUpGuard>
                            <PowerUp />
                          </PowerUpGuard>
                        }
                      />
                      <Route
                        path="/blapuup/:address"
                        element={
                          <PowerUpGuard>
                            <PowerUp />
                          </PowerUpGuard>
                        }
                      />

                      {/* Store Routes */}
                      <Route
                        path="/store"
                        element={
                          <StoreGuard>
                            <Store />
                          </StoreGuard>
                        }
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
