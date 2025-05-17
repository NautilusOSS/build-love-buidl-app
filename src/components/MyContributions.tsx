
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award } from "lucide-react";

const MyContributions: React.FC = () => (
  <Card className="mb-6 glass-morphism">
    <CardHeader className="flex flex-row items-center gap-3">
      <Award className="text-[#9b87f5]" />
      <CardTitle>My Contributions</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-white/90 text-base">
        {/* Replace this with real data if available */}
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Merged 3 Pull Requests</li>
          <li>Fixed 5 issues</li>
          <li>Participated in 2 bounties</li>
        </ul>
      </div>
    </CardContent>
  </Card>
);

export default MyContributions;
