
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

const PayoutForecast: React.FC = () => (
  <Card className="mb-6 glass-morphism">
    <CardHeader className="flex flex-row items-center gap-3">
      <DollarSign className="text-[#33C3F0]" />
      <CardTitle>Payout Forecast</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-white/90 text-base">
        {/* Mock/placeholder values */}
        <div className="flex flex-col gap-1">
          <span>Estimated next payout: <span className="font-bold text-[#9b87f5]">$350</span></span>
          <span>Distribution date: <span className="font-bold text-[#1EAEDB]">28 May 2025</span></span>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default PayoutForecast;
