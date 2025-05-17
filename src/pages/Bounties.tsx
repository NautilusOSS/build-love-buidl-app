
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
              className="pl-10 bg-[#23263a] border border-[#393952] text-white"
              placeholder="Search bounties..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="bounties-search"
            />
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg shadow">
          <Table className="min-w-full glass-morphism">
            <TableHeader>
              <TableRow>
                <TableHead className="w-2/5 text-white/90">Title</TableHead>
                <TableHead className="w-1/6 text-white/90">Reward</TableHead>
                <TableHead className="w-1/4 text-white/90">Tags</TableHead>
                <TableHead className="w-1/6 text-white/90"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-400 py-6">
                    No bounties found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((bounty) => (
                  <TableRow key={bounty.id}>
                    <TableCell className="font-bold text-white">{bounty.title}</TableCell>
                    <TableCell>
                      <span className="text-[#1EAEDB] font-semibold">{bounty.reward}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {bounty.tags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-[#2b2e44] text-[#9b87f5] font-semibold px-2 py-0.5 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        className="px-4 py-1.5 rounded-md font-bold bg-[#8B5CF6] hover:bg-[#9b87f5] text-white shadow transition"
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
