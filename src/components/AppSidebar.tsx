import React, { useMemo } from "react";
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
  LayoutDashboard,
  Award,
  Wallet,
  Gavel,
  Banknote,
  X,
  Gift,
} from "lucide-react";
import WalletConnectButton from "./WalletConnectButton";
import { useWallet } from "@txnlab/use-wallet-react";
import { cn } from "@/lib/utils";

const baseNavItems = [
  //{ label: "Home", to: "/home", icon: LayoutDashboard },
  //{ label: "Dashboard", to: "/", icon: LayoutDashboard },
  //{ label: "Bounties", to: "/bounties", icon: Award },
  //{ label: "bVOI", to: "/bvoi", icon: Wallet },
  //{ label: "Governance", to: "/governance", icon: Gavel },
  //{ label: "Treasury", to: "/treasury", icon: Banknote },
];

const AppSidebar: React.FC = () => {
  const { activeAccount, activeWalletAddresses } = useWallet();
  const location = useLocation();
  const { toggleSidebar } = useSidebar();

  const navItems = useMemo(
    () => [
      ...baseNavItems,
      ...(activeAccount
        ? [
            // {
            //   label: "Wallet",
            //   to: `/wallet/${activeAccount.address}`,
            //   icon: Wallet,
            // },
            {
              label: "Airdrop",
              to: `/airdrop/${activeWalletAddresses.join(",")}`,
              icon: Gift,
            },
          ]
        : [
            {
              label: "Airdrop",
              to: "/airdrop",
              icon: Gift,
            },
          ]),
    ],
    [activeAccount]
  );

  return (
    <Sidebar>
      <SidebarContent className="bg-card/30 backdrop-blur-sm border-r border-[#FF69B4]/20">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[#FF69B4] font-semibold">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.to}
                    className={cn(
                      "transition-all duration-200 hover:bg-[#FF69B4]/20 hover:text-[#FF69B4]",
                      location.pathname === item.to && "bg-[#FF69B4]/20 text-[#FF69B4]"
                    )}
                  >
                    <Link to={item.to}>
                      <item.icon className="mr-2" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={toggleSidebar}
                  isActive={false}
                  className="border-0 hover:bg-[#FF69B4]/20 hover:text-[#FF69B4] transition-all duration-200"
                >
                  <X className="mr-2" />
                  <span>Close</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {/* Add WalletConnect button after nav */}
        <WalletConnectButton />
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
