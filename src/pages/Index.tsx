
import React, { useState } from "react";
import OnboardingBanner from "@/components/OnboardingBanner";
import ProgressBar from "@/components/ProgressBar";
import BuidlButton from "@/components/BuidlButton";
import ConfettiPop from "@/components/ConfettiPop";
import MentorTooltip from "@/components/MentorTooltip";
import DashboardStats from "@/components/DashboardStats";
import MyContributions from "@/components/MyContributions";
import PayoutForecast from "@/components/PayoutForecast";
import WeeklySummary from "@/components/WeeklySummary";
import Bounties from "@/components/Bounties";

const Index = () => {
  const [progress, setProgress] = useState(42); // demo static
  const [confetti, setConfetti] = useState<null | string>(null);

  const handlePayout = () => {
    setProgress(Math.min(100, progress + 18));
    // choose a badge randomly
    const badges = ["💡 Innovator", "🐛 Bug Smasher", "🚀 BUIDL Hero", "🎉 Community Star"];
    setConfetti(badges[Math.floor(Math.random() * badges.length)]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1F2C] via-[#131522] to-[#0c0c13] flex flex-col items-center justify-center pt-12 relative">
      <OnboardingBanner />
      <div className="max-w-6xl w-full flex flex-col items-center justify-center px-2">
        <DashboardStats />
        <div className="max-w-2xl w-full flex flex-col items-center justify-center">
          {/* Responsive dashboard layout */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Left Column (3 stacked cards) */}
            <div className="flex flex-col gap-6 lg:col-span-2">
              <MyContributions />
              <PayoutForecast />
              <WeeklySummary />
            </div>
            {/* Right Column (Bounties) */}
            <div className="flex flex-col gap-6">
              <Bounties />
            </div>
          </div>
          {/* Removed Lovable BUIDL Demo card */}
        </div>
      </div>
      {confetti && <ConfettiPop badge={confetti} onDone={() => setConfetti(null)} />}
    </div>
  );
};

export default Index;
