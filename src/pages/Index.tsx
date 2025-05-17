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
          {/* ... keep existing code (glass-morphism card, etc.) the same ... */}
          <div className="glass-morphism rounded-3xl p-10 md:p-14 mb-8 shadow-2xl bg-[#221F26cc]">
            <div className="text-gradient-primary font-extrabold text-3xl mb-4 drop-shadow-lg">Lovable BUIDL Demo</div>
            <div className="mb-6 text-white text-lg font-medium opacity-85 max-w-xl">
              {"You've locked 1.2 bVOI for 12 weeks. That’s worth "}
              <span className="text-[#1EAEDB] font-bold">4x</span>
              {" voting power!"}
            </div>
            <ProgressBar progress={progress} />
            <div className="mt-7 mb-2">
              <MentorTooltip tip="Locking for longer = more voting power. Want to earn faster? Try extending your lock.">
                <span className="bg-[#222333]/60 px-3 py-1 rounded-xl text-sm text-white font-semibold cursor-help border border-white/10 hover:shadow-[0_0_12px_#9b87f588] transition-shadow">
                  Voting Power Help
                </span>
              </MentorTooltip>
            </div>
            <BuidlButton onPayout={handlePayout} />
            <div className="mt-6 text-[#9b87f5] text-base font-medium animate-fade-in">
              {"BUIDL progress resets on distribution day."}
            </div>
          </div>
        </div>
      </div>
      {confetti && <ConfettiPop badge={confetti} onDone={() => setConfetti(null)} />}
    </div>
  );
};

export default Index;
