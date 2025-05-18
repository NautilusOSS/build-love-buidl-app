import React, { useState } from "react";
import PageLayout from "@/components/PageLayout";
import ProgressBar from "@/components/ProgressBar";
import BuidlButton from "@/components/BuidlButton";
import ConfettiPop from "@/components/ConfettiPop";
import MentorTooltip from "@/components/MentorTooltip";
import DashboardStats from "@/components/DashboardStats";
import WeeklySummary from "@/components/WeeklySummary";
import { Buffer } from "buffer";

window.Buffer = Buffer;

const breadCrumb = [
  {
    to: "/bounties",
    label: "[BUIDL]",
  },
  {
    label: "Dashboard",
    isCurrentPage: true,
  },
];

const Index = () => {
  const [progress, setProgress] = useState(42); // demo static
  const [confetti, setConfetti] = useState<null | string>(null);

  const handlePayout = () => {
    setProgress(Math.min(100, progress + 18));
    // choose a badge randomly
    const badges = [
      "💡 Innovator",
      "🐛 Bug Smasher",
      "🚀 BUIDL Hero",
      "🎉 Community Star",
    ];
    setConfetti(badges[Math.floor(Math.random() * badges.length)]);
  };

  return (
    <PageLayout breadcrumb={breadCrumb}>
      <DashboardStats />
      <div className="max-w-2xl w-full flex flex-col items-center justify-center"></div>
      {confetti && (
        <ConfettiPop badge={confetti} onDone={() => setConfetti(null)} />
      )}
    </PageLayout>
  );
};

export default Index;
