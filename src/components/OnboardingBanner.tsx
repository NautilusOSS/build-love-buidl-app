
import React from "react";
import { MessageCircleHeart } from "lucide-react";
import { Link } from "react-router-dom";

const OnboardingBanner = () => (
  <div className="w-full max-w-xl mx-auto mb-8">
    <div className="rounded-2xl glass-morphism flex items-center gap-3 py-3 px-6 animate-fade-in border-l-4 border-[#1EAEDB]/70 shadow-md bg-[#1A1F2Cf0]">
      <MessageCircleHeart size={28} className="text-[#D946EF] animate-bounce" />
      <Link
        to="/bounties"
        className="text-lg text-white font-semibold tracking-tight underline underline-offset-2 decoration-[#1EAEDB]/70 hover:text-[#1EAEDB] focus-visible:ring-2 focus-visible:ring-[#1EAEDB] rounded transition-colors"
        tabIndex={0}
      >
        Your first 100 BUIDL are within reach <span role="img" aria-label="eyes">👀</span>
      </Link>
    </div>
  </div>
);
export default OnboardingBanner;
