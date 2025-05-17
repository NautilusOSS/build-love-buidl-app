
import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { toast } from "@/components/ui/use-toast";
import { supabase, SUPABASE_ANON_KEY } from "@/integrations/supabase/client";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

// Types for bounties (matches table)
interface BountyItem {
  id: string;
  title: string;
  reward?: string | null;
  tags?: string[] | null;
  url?: string | null;
  status: string;
}

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
  const [bounties, setBounties] = useState<BountyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch bounties from Supabase
  useEffect(() => {
    async function fetchSupabaseBounties() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("bounties")
        .select("id, title, reward, tags, url, status")
        .order("created_at", { ascending: false });
      if (error) {
        setError("Failed to fetch bounties from Supabase. Try again later.");
        setBounties([]);
      } else {
        setBounties(data || []);
      }
      setLoading(false);
    }
    fetchSupabaseBounties();
  }, []);

  // Sync bounties from GitHub (Edge function)
  const handleSyncBounties = useCallback(async () => {
    toast({ title: "Syncing bounties…", description: "Fetching data from GitHub project board." });
    try {
      const res = await fetch(
        "https://yeyhgvpnhhqrkolypxdw.functions.supabase.co/sync-github-bounties",
        {
          method: "POST",
          headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        toast({
          title: "Bounties Synchronized!",
          description: `Imported or updated ${data.inserted} bounties from GitHub.`,
        });
        // Optionally refetch bounties:
        window.location.reload();
      } else {
        toast({
          title: "Sync failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Network error",
        description: e.message,
        variant: "destructive",
      });
    }
  }, []);

  // Filter bounties by search input in title/tags
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return bounties;
    return bounties.filter((bounty) =>
      bounty.title.toLowerCase().includes(term) ||
      (bounty.tags || []).some((tag) => tag.toLowerCase().includes(term))
    );
  }, [search, bounties]);

  return (
    <PageLayout breadcrumb={breadcrumb}>
      {/* Add spacing after breadcrumbs */}
      <div className="mt-4" />
      {/* Make table container full width */}
      <div className="w-full pt-2">
        {/* Responsive controls: stack vertically on mobile */}
        <div className="flex flex-col sm:flex-row gap-4 items-start mb-6">
          <div className="flex-1 w-full">
            <h1 className="text-white font-extrabold text-2xl sm:text-3xl mb-2 drop-shadow-sm">
              Open Bounties
            </h1>
            <p className="mb-1 text-white/80 font-medium text-base sm:text-base">
              Find and claim unassigned bounties.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row w-full sm:w-72 items-stretch sm:items-center relative gap-2">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
              <Input
                className="pl-10 bg-[#23263a] border border-[#393952] text-white rounded-full shadow focus:ring-2 focus:ring-[#8B5CF6]/60 text-sm sm:text-base"
                placeholder="Search bounties..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="bounties-search"
              />
            </div>
            <button
              onClick={handleSyncBounties}
              className="bg-[#8B5CF6] hover:bg-[#A78BFA] text-white font-semibold px-4 py-2 rounded-full shadow transition focus:outline-none sm:ml-2 w-full sm:w-auto text-sm sm:text-base"
              title="Import bounties from GitHub"
            >
              Sync Bounties
            </button>
          </div>
        </div>
        {/* Responsive table container, horizontally scrollable on mobile */}
        <div className="w-full overflow-x-auto rounded-3xl shadow-2xl glass-morphism border-0 p-2 min-h-[120px]">
          {loading ? (
            <div className="w-full flex justify-center items-center py-8">
              <span className="text-white/80">Loading bounties...</span>
            </div>
          ) : error ? (
            <div className="w-full flex justify-center items-center py-8">
              <span className="text-red-400">{error}</span>
            </div>
          ) : (
            // Table is horizontally scrollable (see outer div above)
            <Table className="min-w-[540px] sm:min-w-full w-full text-sm">
              <TableHeader>
                <TableRow className="bg-[#212540]/80 rounded-2xl [th]:first:rounded-l-2xl [th]:last:rounded-r-2xl">
                  <TableHead className="w-2/5 text-white/90 text-base px-3 py-3 sm:px-6 sm:py-4 rounded-l-2xl">Title</TableHead>
                  <TableHead className="w-1/6 text-white/90 text-base px-3 py-3 sm:px-6 sm:py-4">
                    <div className="flex items-center gap-1">
                      Reward
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={0} className="ml-1 cursor-pointer align-middle text-[#9b87f5] hover:text-[#8B5CF6] focus:outline-none">
                            <Info size={17} aria-label="Reward info" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent
                          side="right"
                          sideOffset={20}
                          className="text-sm max-w-xs font-normal rounded-2xl border-2 border-[#1A1F2C] bg-[#23263a]/95 shadow-lg"
                        >
                          $ rewards amounts are approximate at time of posting.<br />
                          Rewards are in fixed amount of <span className="font-semibold text-[#1EAEDB]">BUIDL</span>.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TableHead>
                  <TableHead className="w-1/4 text-white/90 text-base px-3 py-3 sm:px-6 sm:py-4">Tags</TableHead>
                  <TableHead className="w-1/6 text-white/90 px-3 py-3 sm:px-6 sm:py-4 rounded-r-2xl"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-400 py-8 text-base sm:text-lg">
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
                      <TableCell className="font-bold text-white px-3 py-3 sm:px-6 sm:py-4 rounded-l-2xl text-sm sm:text-base">
                        {bounty.title}
                      </TableCell>
                      <TableCell className="px-3 py-3 sm:px-6 sm:py-4">
                        <span className="text-[#1EAEDB] font-semibold bg-[#213147]/60 rounded-lg px-2.5 py-1 sm:px-3 sm:py-1 text-xs sm:text-base whitespace-nowrap">
                          {bounty.reward ?? "$???"}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-3 sm:px-6 sm:py-4">
                        <div className="flex gap-1 flex-wrap">
                          {(bounty.tags || []).map((tag) => (
                            <span
                              key={tag}
                              className="bg-[#2b2e44]/70 text-[#9b87f5] font-semibold px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-md text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-3 sm:px-6 sm:py-4 rounded-r-2xl">
                        {bounty.url ? (
                          <a
                            href={bounty.url}
                            className="px-4 sm:px-5 py-1 sm:py-1.5 rounded-full font-bold bg-gradient-to-r from-[#8B5CF6] via-[#9b87f5] to-[#1EAEDB] hover:brightness-110 text-white shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed text-xs sm:text-base"
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View on GitHub"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-white/40 text-xs sm:text-base">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default Bounties;
