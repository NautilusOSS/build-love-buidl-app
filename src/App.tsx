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
import Home from "./pages/Home";
import {
  NetworkId,
  WalletId,
  WalletManager,
  WalletProvider,
} from "@txnlab/use-wallet-react";
//import Wallet from "./pages/Wallet";
import Airdrop from "./pages/Airdrop";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { ThemeProvider } from "./components/ThemeProvider";
import { Buffer } from "buffer";

window.Buffer = Buffer;

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
            <BreadcrumbPage className="text-[#FF69B4] font-bold tracking-tight">
              PXD
            </BreadcrumbPage>
          </BreadcrumbItem>
          {pathSegments.map((segment, index) => (
            <BreadcrumbItem key={index}>
              <BreadcrumbPage className="capitalize text-pink-600">
                {segment}
              </BreadcrumbPage>
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
        options: { siteName: "Pixel Dust" },
      },
      {
        id: WalletId.BIATEC,
        options: {
          projectId: walletConnectProjectId,
          metadata: {
            name: "Pixel Dust",
            url: "https://pixeldust.sh",
            description: "Pixel Dust NFT Marketplace",
            icons: ["https://pixeldust.sh/favicon.ico"],
          },
          themeMode: "light",
        },
      },
      {
        id: WalletId.WALLETCONNECT,
        options: {
          projectId: walletConnectProjectId,
          metadata: {
            name: "Pixel Dust",
            url: "https://pixeldust.sh",
            description: "Pixel Dust NFT Marketplace",
            icons: ["https://pixeldust.sh/favicon.ico"],
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
    <ThemeProvider>
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
    </ThemeProvider>
  );
};

export default App;
