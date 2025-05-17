
import React from "react";
import { LoaderPinwheel } from "lucide-react";

interface ProgressBarProps {
  progress: number; // [0, 100]
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  return (
    <div className="w-full max-w-sm mx-auto my-6">
      <div className="flex justify-between items-end mb-2">
        <span className="text-xs font-bold text-[#9b87f5] tracking-wide">Progress to next BUIDL distribution</span>
        <span className="text-xs font-bold text-[#1EAEDB]">{progress}%</span>
      </div>
      <div className="relative bg-gradient-to-br from-[#2a2842] via-[#221F26] to-[#3b3662] rounded-2xl shadow-inner h-5 overflow-hidden glass-morphism">
        <div
          className="absolute left-0 top-0 h-full transition-all duration-700 ease-out rounded-2xl"
          style={{
            width: `${progress}%`,
            background:
              "linear-gradient(90deg, #9b87f5 0%, #1EAEDB 56%, #D946EF 100%)",
            boxShadow: "0 0 20px #9b87f5aa",
          }}
        />
        {progress < 100 && (
          <LoaderPinwheel
            size={19}
            className="absolute right-1 top-1/2 -translate-y-1/2 animate-spin"
            color="#9b87f5"
          />
        )}
      </div>
    </div>
  );
};

export default ProgressBar;
