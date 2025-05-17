
import React from "react";

interface MentorTooltipProps {
  tip: string;
  children: React.ReactNode;
}

const MentorTooltip: React.FC<MentorTooltipProps> = ({ tip, children }) => (
  <div className="relative inline-block group">
    {children}
    <div
      className="pointer-events-none absolute left-1/2 bottom-full -translate-x-1/2 mb-2 
      opacity-0 group-hover:opacity-100 transition duration-200 z-20
      bg-[#221F26] text-white rounded-lg py-2 px-3 text-sm shadow-md
      border border-[#9b87f5]/30 animate-fade-in"
      style={{ minWidth: "220px", maxWidth: "270px", fontWeight: 500, whiteSpace: "normal" }}
    >
      {tip}
      <span className="block text-xs text-[#1EAEDB] mt-1 italic">(I’ll walk you through!)</span>
    </div>
  </div>
);

export default MentorTooltip;
