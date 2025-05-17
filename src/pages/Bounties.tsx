
import React, { useState, useMemo } from "react";
import PageLayout from "@/components/PageLayout";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";

// Demo/mock unassigned bounties data
const MOCK_BOUNTIES = [
  {
    id: 1,
    title: "Add dark mode support",
    reward: "$75",
    tags: ["frontend", "UI"],
    status: "open",
  },
  {
    id: 2,
    title: "Improve responsive layout",
    reward: "$60",
    tags: ["frontend", "responsive"],
    status: "open",
  },
  {
    id: 3,
    title: "Create landing page animation",
    reward: "$80",
    tags: ["animation", "react"],
    status: "open",
  },
  {
    id: 4,
    title: "Setup Jest tests",
    reward: "$120",
    tags: ["testing", "jest"],
    status: "open",
  },
  {
    id: 5,
    title: "Refactor sidebar navigation",
    reward: "$95",
    tags: ["refactor", "navigation"],
    status: "open",
  },
];

// Bounties page definition
const breadcrumb = [
  {
    to: "/home",
    label: "[BUIDL]",
  },
  {
    label: "Bounties",
    isCurrentPage: true,
  },
];

const Bounties: React.FC = () => {
  const [search, setSearch] = useState("");

  // Filter bounties by search input in title/tags
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return MOCK_BOUNTIES;
    return MOCK_BOUNTIES.filter((bounty) =>
      bounty.title.toLowerCase().includes(term) ||
      bounty.tags.some((tag) => tag.toLowerCase().includes(term))
    );
  }, [search]);

  return (
    <PageLayout breadcrumb={breadcrumb}>
      <div className="w-full max-w-4xl mx-auto pt-2">
        <div className="flex flex-col sm:flex-row gap-4 items-start mb-6">
          <div className="flex-1 w-full">
            <h1 className="text-white font-extrabold text-3xl mb-2 drop-shadow-sm">
              Open Bounties
            </h1>
            <p className="text-muted-foreground mb-1">
              Find and claim unassigned bounties.
            </p>
          </div>
          <div className="flex w-full sm:w-72 items-center relative">
            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
            <Input
              className="pl-10 bg-[#23263a] border border-[#393952] text-white rounded-full shadow focus:ring-2 focus:ring-[#8B5CF6]/60"
              placeholder="Search bounties..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="bounties-search"
            />
          </div>
        </div>
        <div className="overflow-x-auto rounded-3xl shadow-2xl glass-morphism border-0 p-2">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow className="bg-[#212540]/80 rounded-2xl [th]:first:rounded-l-2xl [th]:last:rounded-r-2xl">
                <TableHead className="w-2/5 text-white/90 text-base px-6 py-4 rounded-l-2xl">Title</TableHead>
                <TableHead className="w-1/6 text-white/90 text-base px-6 py-4">Reward</TableHead>
                <TableHead className="w-1/4 text-white/90 text-base px-6 py-4">Tags</TableHead>
                <TableHead className="w-1/6 text-white/90 px-6 py-4 rounded-r-2xl"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-400 py-8 text-lg">
                    No bounties found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((bounty) => (
                  <TableRow
                    key={bounty.id}
                    className="bg-[#22263a]/60 hover:bg-[#2e3156]/80 transition rounded-2xl border-b border-white/10 last:border-b-0"
                    style={{ boxShadow: "0 2px 16px 0 rgba(139,92,246,0.04)" }}
                  >
                    <TableCell className="font-bold text-white px-6 py-4 rounded-l-2xl">{bounty.title}</TableCell>
                    <TableCell className="px-6 py-4">
                      <span className="text-[#1EAEDB] font-semibold bg-[#213147]/60 rounded-lg px-3 py-1">{bounty.reward}</span>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {bounty.tags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-[#2b2e44]/70 text-[#9b87f5] font-semibold px-2.5 py-0.5 rounded-md text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 rounded-r-2xl">
                      <button
                        className="px-5 py-1.5 rounded-full font-bold bg-gradient-to-r from-[#8B5CF6] via-[#9b87f5] to-[#1EAEDB] hover:brightness-110 text-white shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled // Demo only, so button does nothing
                        title="Claim bounty coming soon"
                      >
                        Claim
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </PageLayout>
  );
};

export default Bounties;
