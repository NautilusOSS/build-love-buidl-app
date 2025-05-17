
import React from "react";
import { Gift } from "lucide-react";

type BuidlButtonProps = {
  onPayout: () => void;
};

const BuidlButton: React.FC<BuidlButtonProps> = ({ onPayout }) => {
  return (
    <button
      onClick={onPayout}
      className="relative px-7 py-3 text-lg font-semibold rounded-xl transition 
      bg-[#1A1F2C] text-white overflow-hidden shadow-xl z-10
      before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-r before:from-[#8B5CF6]/60 before:to-[#1EAEDB]/60 before:opacity-0 before:transition before:duration-300 hover:before:opacity-100
      after:absolute after:inset-0 after:rounded-xl after:ring-2 after:ring-[#9b87f5]/70 after:ring-offset-2 after:opacity-0 hover:after:opacity-60
      "
      style={{ boxShadow: "0 0 16px #9b87f588, 0 4px 32px #1EAEDB44" }}
    >
      <span className="relative flex items-center gap-2 z-10">
        <Gift size={22} className="text-[#9b87f5]" /> Submit Bounty
      </span>
    </button>
  );
};

export default BuidlButton;
