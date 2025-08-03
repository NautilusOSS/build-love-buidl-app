import React, { useMemo, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  X,
  Home,
  Menu,
  Wallet,
  Vote,
  Zap,
  Flame,
  ShoppingCart,
} from "lucide-react";
import WalletConnectButton from "./WalletConnectButton";
import { useWallet } from "@txnlab/use-wallet-react";
import { useFeatureFlags } from "@/constants/featureFlags";

const AppSidebar: React.FC = () => {
  const { activeAccount, activeWalletAddresses } = useWallet();
  const location = useLocation();
  const { toggleSidebar, setOpen, setOpenMobile, isMobile, openMobile } =
    useSidebar();
  const { isGovernanceEnabled, isWalletEnabled, isPowerUpEnabled, isStoreEnabled } =
    useFeatureFlags();

  const navItems = useMemo(() => {
    const items = [{ label: "Home", to: "/", icon: Home }];

    // Add governance navigation if enabled
    if (isGovernanceEnabled()) {
      items.push({ label: "Blap Blap Blap", to: "/governance", icon: Vote });
    }

    // Add wallet and power up navigation if user is connected and features are enabled
    if (activeAccount) {
      if (isWalletEnabled()) {
        items.push({
          label: "Wallet",
          to: `/wallet/${activeAccount.address}`,
          icon: Wallet,
        });
      }

      if (isPowerUpEnabled()) {
        items.push({
          label: "Power UP",
          to: `/blapuup/${activeAccount.address}`,
          icon: Zap,
        });
      }

      if (isStoreEnabled()) {
        items.push({
          label: "Store",
          to: "/store",
          icon: ShoppingCart,
        });
      }
    }

    return items;
  }, [activeAccount, isGovernanceEnabled, isWalletEnabled, isPowerUpEnabled, isStoreEnabled]);

  const handleCloseSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }
  };

  const handleNavItemClick = () => {
    // Close sidebar on mobile when navigating
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Add click-outside functionality for mobile
  useEffect(() => {
    if (!isMobile || !openMobile) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Check if click is outside the sidebar
      if (
        !target.closest('[data-sidebar="sidebar"]') &&
        !target.closest('[data-sidebar="trigger"]')
      ) {
        setOpenMobile(false);
      }
    };

    // Add event listener with a small delay to avoid immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMobile, openMobile, setOpenMobile]);

  // Add escape key functionality
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCloseSidebar();
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isMobile, setOpen, setOpenMobile]);

  return (
    <Sidebar 
      data-sidebar 
      className="bg-black border-r border-orange-500/30 shadow-2xl shadow-orange-500/10"
    >
      <SidebarContent className="bg-black">
        {/* Header - Compact bold orange style */}
        <div className="flex items-center justify-between p-3 border-b-2 border-orange-500 bg-gradient-to-r from-black via-gray-900 to-black">
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="font-black text-lg text-white tracking-tight">
                BLAPU
              </span>
              <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">
                Hub
              </span>
            </div>
            {isMobile && (
              <span className="text-[10px] text-orange-400 ml-2 font-bold bg-orange-500/20 px-2 py-0.5 rounded border border-orange-500/40">
                TAP
              </span>
            )}
          </div>
          <button
            onClick={handleCloseSidebar}
            className="px-3 py-2 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 rounded-lg transition-all duration-200 shadow-lg shadow-orange-500/50 hover:shadow-orange-500/70 flex items-center gap-2 group border-2 border-orange-400"
            aria-label="Close sidebar"
            title={isMobile ? "Close sidebar" : "Close sidebar (ESC)"}
          >
            <X className="h-4 w-4 text-white group-hover:scale-110 transition-transform" />
            <span className="text-white font-bold text-xs uppercase tracking-wide">Close</span>
          </button>
        </div>

        <SidebarGroup className="mt-3">
          <SidebarGroupContent className="mt-2">
            <SidebarMenu className="space-y-1">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.label} data-sidebar="menu-item">
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.to}
                    className={`px-3 py-2 text-xs font-bold rounded-md transition-all duration-200 group ${
                      location.pathname === item.to 
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-black shadow-lg shadow-orange-500/50 border-2 border-orange-400' 
                        : 'text-gray-300 hover:bg-gradient-to-r hover:from-orange-500/20 hover:to-orange-600/20 hover:text-white border border-transparent hover:border-orange-500/50'
                    }`}
                  >
                    <Link to={item.to} onClick={handleNavItemClick} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-sm flex items-center justify-center transition-all duration-200 ${
                        location.pathname === item.to 
                          ? 'bg-black/30' 
                          : 'bg-orange-500/20 group-hover:bg-orange-500/30'
                      }`}>
                        <item.icon className={`h-3 w-3 ${
                          location.pathname === item.to ? 'text-black' : 'text-current'
                        }`} />
                      </div>
                      <span className={`font-bold uppercase tracking-wide text-[11px] ${
                        location.pathname === item.to ? 'text-black font-black' : ''
                      }`}>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem data-sidebar="menu-item" className="mt-2">
                <SidebarMenuButton
                  onClick={handleCloseSidebar}
                  isActive={false}
                  className="px-3 py-2 text-xs font-bold text-gray-300 hover:bg-gradient-to-r hover:from-orange-500/20 hover:to-orange-600/20 hover:text-white rounded-md transition-all duration-200 border border-orange-500/30 hover:border-orange-500/60"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-sm bg-orange-500/20 flex items-center justify-center">
                      <X className="h-3 w-3" />
                    </div>
                    <span className="font-bold uppercase tracking-wide text-[11px]">Close</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {/* WalletConnect section - compact */}
        <div className="px-3 py-3 mt-3">
          <div className="bg-gradient-to-r from-gray-900 to-black rounded-md border border-orange-500/50 p-2 shadow-lg shadow-orange-500/20">
            <WalletConnectButton />
          </div>
        </div>

        {/* Footer - Compact shortcuts */}
        <div className="mt-auto p-3 border-t border-orange-500/30">
          <div className="text-[10px] text-gray-400 space-y-2">
            <div className="font-black text-orange-400 mb-2 tracking-widest uppercase">
              Keys
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gradient-to-br from-orange-500 to-orange-600 rounded-sm flex items-center justify-center shadow-lg shadow-orange-500/50">
                  <span className="text-white text-[8px] font-black">⌘B</span>
                </div>
                <span className="text-gray-300 font-bold uppercase tracking-wide text-[9px]">Toggle</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gradient-to-br from-orange-500 to-orange-600 rounded-sm flex items-center justify-center shadow-lg shadow-orange-500/50">
                  <span className="text-white text-[8px] font-black">ESC</span>
                </div>
                <span className="text-gray-300 font-bold uppercase tracking-wide text-[9px]">Close</span>
              </div>
            </div>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
