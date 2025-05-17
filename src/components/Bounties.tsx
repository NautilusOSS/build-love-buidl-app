
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift } from "lucide-react";

const Bounties: React.FC = () => (
  <Card className="mb-6 glass-morphism">
    <CardHeader className="flex flex-row items-center gap-3">
      <Gift className="text-[#8B5CF6]" />
      <CardTitle>Bounties</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-white/90 text-base">
        {/* Mock/placeholder bounties */}
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>🟣 Open: Implement dark mode toggle <span className="ml-2 text-[#1EAEDB]">$75</span></li>
          <li>🟡 In Review: Add leaderboard stats <span className="ml-2 text-[#9b87f5]">$100</span></li>
          <li className="opacity-65">🟢 Completed: Wallet integration <span className="ml-2 text-[#33C3F0]">$200</span></li>
        </ul>
      </div>
    </CardContent>
  </Card>
);

export default Bounties;
