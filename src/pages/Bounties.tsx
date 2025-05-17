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
import { supabase } from "@/integrations/supabase/client"; // Added for anon key

// GitHub project/board constants for NautilusOSS Board 2
const GITHUB_OWNER = "NautilusOSS";
const GITHUB_PROJECT_NUMBER = 2;
const GITHUB_REPO = "bounties"; // Try 'bounties' repo; adjust if needed

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

// Types for bounties
interface BountyItem {
  id: number | string;
  title: string;
  reward?: string;
  tags?: string[];
  url?: string;
  status: "open" | "closed" | string;
}

const Bounties: React.FC = () => {
  const [search, setSearch] = useState("");
  const [bounties, setBounties] = useState<BountyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch open issues with "bounty" label as bounties
  useEffect(() => {
    async function fetchBountyIssues() {
      setLoading(true);
      setError(null);
      try {
        // Fetch issues from the repo, labels=bounty, state=open (assuming GitHub Issues are used as bounties)
        const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues?labels=bounty&state=open&per_page=30`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`GitHub API error: ${res.status}`);
        }
        const data = await res.json();
        // Map GitHub issues to BountyItem format
        const mapped = (data as any[]).map((issue) => ({
          id: issue.id,
          title: issue.title,
          reward: (issue.labels.find((l: any) => l.name.startsWith("$"))?.name) || "$???",
          tags: issue.labels
            .filter((l: any) => l.name !== "bounty" && !l.name.startsWith("$"))
            .map((l: any) => l.name),
          url: issue.html_url,
          status: issue.state,
        }));
        setBounties(mapped);
      } catch (err: any) {
        setError("Failed to fetch bounties from GitHub. Try again later.");
        setBounties([]);
      } finally {
        setLoading(false);
      }
    }
    fetchBountyIssues();
  }, []);

  // Sync bounties from GitHub (Edge function)
  const handleSyncBounties = useCallback(async () => {
    toast({ title: "Syncing bounties…", description: "Fetching data from GitHub project board." });
    try {
      const anonKey = (supabase as any)._anonKey as string; // supabase-js exposes anon key here
      const res = await fetch(
        "https://yeyhgvpnhhqrkolypxdw.functions.supabase.co/sync-github-bounties",
        {
          method: "POST",
          headers: {
            "apikey": anonKey,
            "Authorization": `Bearer ${anonKey}`,
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
      <div className="w-full max-w-4xl mx-auto pt-2">
        <div className="flex flex-col sm:flex-row gap-4 items-start mb-6">
          <div className="flex-1 w-full">
            <h1 className="text-white font-extrabold text-3xl mb-2 drop-shadow-sm">
              Open Bounties
            </h1>
            <p className="mb-1 text-white/80 font-medium">
              Find and claim unassigned bounties.
            </p>
          </div>
          <div className="flex flex-row w-full sm:w-72 items-center relative gap-2">
            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
            <Input
              className="pl-10 bg-[#23263a] border border-[#393952] text-white rounded-full shadow focus:ring-2 focus:ring-[#8B5CF6]/60"
              placeholder="Search bounties..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="bounties-search"
            />
            <button
              onClick={handleSyncBounties}
              className="bg-[#8B5CF6] hover:bg-[#A78BFA] text-white font-semibold px-4 py-2 rounded-full shadow transition focus:outline-none ml-2"
              title="Import bounties from GitHub"
            >
              Sync Bounties
            </button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-3xl shadow-2xl glass-morphism border-0 p-2 min-h-[120px]">
          {loading ? (
            <div className="w-full flex justify-center items-center py-8">
              <span className="text-white/80">Loading bounties...</span>
            </div>
          ) : error ? (
            <div className="w-full flex justify-center items-center py-8">
              <span className="text-red-400">{error}</span>
            </div>
          ) : (
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
                      <TableCell className="font-bold text-white px-6 py-4 rounded-l-2xl">
                        {bounty.title}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <span className="text-[#1EAEDB] font-semibold bg-[#213147]/60 rounded-lg px-3 py-1">
                          {bounty.reward}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex gap-1 flex-wrap">
                          {(bounty.tags || []).map((tag) => (
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
                        <a
                          href={bounty.url}
                          className="px-5 py-1.5 rounded-full font-bold bg-gradient-to-r from-[#8B5CF6] via-[#9b87f5] to-[#1EAEDB] hover:brightness-110 text-white shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed"
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View on GitHub"
                        >
                          View
                        </a>
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
