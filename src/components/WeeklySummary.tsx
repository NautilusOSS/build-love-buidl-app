
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

const WeeklySummary: React.FC = () => (
  <Card className="mb-6 glass-morphism">
    <CardHeader className="flex flex-row items-center gap-3">
      <CalendarDays className="text-[#1EAEDB]" />
      <CardTitle>Weekly Summary</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-white/90 text-base">
        {/* Mock/placeholder summary */}
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>3 PRs merged</li>
          <li>+120 community votes received</li>
          <li>Resolved 2 high-priority bugs</li>
        </ul>
      </div>
    </CardContent>
  </Card>
);

export default WeeklySummary;
