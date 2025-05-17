
import React from "react";
import { Button } from "@/components/ui/button";

const Home: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1A1F2C] via-[#131522] to-[#0c0c13]">
      <Button className="text-lg px-8 py-4 rounded-2xl shadow-lg font-bold bg-[#8B5CF6] hover:bg-[#9b87f5] text-white transition">
        Submit a Bounty
      </Button>
    </div>
  );
};

export default Home;
