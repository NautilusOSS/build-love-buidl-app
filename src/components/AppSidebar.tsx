
import React from "react";
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
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  Award, 
  Wallet, 
  Gavel, 
  Banknote 
} from "lucide-react";
import WalletConnectButton from "./WalletConnectButton";

const navItems = [
  { label: "Home", to: "/home", icon: LayoutDashboard },
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Bounties", to: "/bounties", icon: Award },
  { label: "bVOI", to: "/bvoi", icon: Wallet },
  { label: "Governance", to: "/governance", icon: Gavel },
  { label: "Treasury", to: "/treasury", icon: Banknote },
];

const AppSidebar: React.FC = () => {
  const location = useLocation();
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.to}>
                    <Link to={item.to}>
                      <item.icon className="mr-2" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
