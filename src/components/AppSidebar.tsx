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
  Gift,
  X,
  Home,
  HeartHandshake,
  Menu,
  Wallet,
  TrendingUp,
} from "lucide-react";
import WalletConnectButton from "./WalletConnectButton";
import { useWallet } from "@txnlab/use-wallet-react";

const baseNavItems = [
  { label: "Home", to: "/airdrop", icon: Home },
  { label: "About", to: "/about", icon: HeartHandshake },
  { label: "Trading", to: "/trading", icon: TrendingUp },
];

const AppSidebar: React.FC = () => {
  const { activeAccount, activeWalletAddresses } = useWallet();
  const location = useLocation();
  const { toggleSidebar, setOpen, setOpenMobile, isMobile, openMobile } =
    useSidebar();

  const navItems = useMemo(
    () => [
      ...baseNavItems,
      ...(activeAccount
        ? [
            {
              label: "Airdrop",
              to: `/airdrop/${activeWalletAddresses.join(",")}`,
              icon: Gift,
            },
            {
              label: "Wallet",
              to: `/wallet/${activeAccount.address}`,
              icon: Wallet,
            },
          ]
        : []),
    ],
    [activeAccount]
  );

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
    <Sidebar data-sidebar>
      <SidebarContent>
        {/* Header with close button */}
        <div className="flex items-center justify-between p-4 border-b border-[#0088ff33]">
          <div className="flex items-center gap-2">
            <Menu className="h-5 w-5 text-[#1EAEDB]" />
            <span className="font-semibold text-[#1EAEDB]">POW App</span>
            {isMobile && (
              <span className="text-xs text-[#1EAEDB] opacity-60">
                (Tap outside to close)
              </span>
            )}
          </div>
          <button
            onClick={handleCloseSidebar}
            className="p-2 rounded-md hover:bg-[#0088ff22] hover:scale-110 transition-all duration-200 group"
            aria-label="Close sidebar"
            title={isMobile ? "Close sidebar" : "Close sidebar (ESC)"}
          >
            <X className="h-4 w-4 text-[#1EAEDB] group-hover:text-[#00eeff]" />
          </button>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.label} data-sidebar="menu-item">
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.to}
                  >
                    <Link to={item.to} onClick={handleNavItemClick}>
                      <item.icon className="mr-2" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem data-sidebar="menu-item">
                <SidebarMenuButton
                  onClick={handleCloseSidebar}
                  isActive={false}
                  className="border-0"
                >
                  <X className="mr-2" />
                  <span>Close Sidebar</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {/* Add WalletConnect button after nav */}
        <WalletConnectButton />

        {/* Footer with helpful information */}
        <div className="mt-auto p-4 border-t border-[#0088ff33]">
          <div className="text-xs text-[#1EAEDB] opacity-70 space-y-1">
            <div className="flex items-center justify-between">
              <span>Keyboard shortcuts:</span>
            </div>
            <div className="text-[10px] space-y-1">
              <div>
                •{" "}
                <kbd className="px-1 py-0.5 bg-[#0088ff22] rounded text-[8px]">
                  ⌘
                </kbd>{" "}
                +{" "}
                <kbd className="px-1 py-0.5 bg-[#0088ff22] rounded text-[8px]">
                  B
                </kbd>{" "}
                Toggle sidebar
              </div>
              <div>
                •{" "}
                <kbd className="px-1 py-0.5 bg-[#0088ff22] rounded text-[8px]">
                  ESC
                </kbd>{" "}
                Close sidebar
              </div>
            </div>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
