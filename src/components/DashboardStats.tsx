
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Banknote, Users, Coins, Database } from "lucide-react";

const stats = [
  {
    label: "Total BUIDL Distributed",
    value: "73,800",
    icon: Coins,
    color: "text-[#9b87f5]",
    sub: "BUIDL",
  },
  {
    label: "Contributors",
    value: "214",
    icon: Users,
    color: "text-[#1EAEDB]",
    sub: "",
  },
  {
    label: "bVOI Supply",
    value: "1,500,000",
    icon: Database,
    color: "text-[#8B5CF6]",
    sub: "bVOI",
  },
  {
    label: "Treasury Status",
    value: "$432,000",
    icon: Banknote,
    color: "text-[#33C3F0]",
    sub: "USD",
  },
];

const DashboardStats: React.FC = () => (
  <Card className="w-full rounded-2xl glass-morphism border-white/10 bg-[#1A1F2Ccc] shadow-lg mb-8 p-0">
    <div className="grid grid-cols-1 lg:grid-cols-4">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className={
            // Remove border on last item; right border for all except last
            [
              "flex items-center gap-4 px-6 py-7",
              "bg-transparent",
              // Add right border except for last column
              i !== stats.length - 1 ? "border-r border-white/10" : "",
            ].join(" ")
          }
        >
          <div 
            className={`rounded-xl p-3 bg-[#232534e8] shadow-md ${stat.color} flex items-center justify-center`}
          >
            <stat.icon className={`w-7 h-7 ${stat.color}`} />
          </div>
          <div>
            <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">{stat.label}</div>
            <div className="text-white text-2xl font-extrabold leading-tight flex items-end gap-1">
              {stat.value}
              {stat.sub && <span className="text-sm font-semibold ml-1 text-[#9b87f5]">{stat.sub}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  </Card>
);

export default DashboardStats;
