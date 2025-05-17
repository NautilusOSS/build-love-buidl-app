
import React from "react";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";

const breadCrumb = [
  {
    to: "/home",
    label: "[BUIDL]",
    // First [BUIDL] always links home
  },
  {
    label: "Home",
    isCurrentPage: true,
  },
];

const Home: React.FC = () => {
  return (
    <PageLayout breadcrumb={breadCrumb}>
      <div className="min-h-[50vh] flex items-center justify-center">
        <Button className="text-lg px-8 py-4 rounded-2xl shadow-lg font-bold bg-[#8B5CF6] hover:bg-[#9b87f5] text-white transition">
          Submit a Bounty
        </Button>
      </div>
    </PageLayout>
  );
};

export default Home;
