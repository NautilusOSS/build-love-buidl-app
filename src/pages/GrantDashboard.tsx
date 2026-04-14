import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight, Gift, LayoutGrid, Plus } from "lucide-react";
import {
  loadGrants,
  type StoredGrant,
  grantLifecycleStatus,
} from "@/lib/grantStorage";

function statusBadgeClass(s: ReturnType<typeof grantLifecycleStatus>) {
  switch (s) {
    case "completed":
      return "border-emerald-900/50 bg-emerald-950/35 text-emerald-400";
    case "pending":
      return "border-amber-900/45 bg-amber-950/25 text-amber-400";
    default:
      return "border-sky-800/50 bg-sky-950/35 text-sky-300";
  }
}

const GrantDashboard = () => {
  const navigate = useNavigate();
  const [grants, setGrants] = useState<StoredGrant[]>([]);

  useEffect(() => {
    setGrants(loadGrants());
  }, []);

  const refresh = () => setGrants(loadGrants());

  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  return (
    <div className="grant-shell">
      <div className="grant-shell-header">
        <div className="container mx-auto px-6 py-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <p className="grant-title-sub mb-2">Compensation</p>
            <h1 className="grant-title text-3xl sm:text-4xl flex items-center gap-3">
              <LayoutGrid className="w-9 h-9 text-sky-400 shrink-0 stroke-[1.5]" />
              Grant Dashboard
            </h1>
            <p className="text-slate-500 mt-3 text-sm max-w-lg leading-relaxed">
              Track compensation grants and vesting schedules. Sharp, local
              index — same browser session as Grant Pay.
            </p>
          </div>
          <Button asChild className="grant-btn-primary shrink-0 px-5">
            <Link to="/grant-pay">
              <Plus className="w-4 h-4 mr-2 stroke-[2]" />
              New grant
            </Link>
          </Button>
        </div>
        <div className="grant-hairline" />
      </div>

      <div className="container mx-auto px-6 py-10 max-w-5xl">
        <Card className="grant-panel border shadow-none">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-semibold tracking-tight text-slate-100">
              Your grants
            </CardTitle>
            <CardDescription className="text-slate-500 text-sm">
              Open a row for full detail. IDs match on-chain application IDs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {grants.length === 0 ? (
              <div className="text-center py-16 px-4 border border-dashed border-sky-950/60 rounded-sm bg-[#050a14]/50">
                <Gift className="w-11 h-11 mx-auto text-slate-600 mb-4 stroke-[1.25]" />
                <p className="text-slate-500 mb-8 text-sm max-w-md mx-auto leading-relaxed">
                  No grants yet. Create one from Grant Pay — it will appear here
                  automatically.
                </p>
                <Button asChild className="grant-btn-primary px-6">
                  <Link to="/grant-pay">Go to Grant Pay</Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800/90 hover:bg-transparent">
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Grant ID
                    </TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Recipient
                    </TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 text-right">
                      Amount (VOI)
                    </TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Status
                    </TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Created
                    </TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grants.map((g) => {
                    const st = grantLifecycleStatus(g);
                    const label =
                      g.recipientLabel ||
                      `${g.recipientAddress.slice(0, 6)}…${g.recipientAddress.slice(-4)}`;
                    return (
                      <TableRow
                        key={g.id}
                        className="grant-table-row cursor-pointer border-slate-800/80"
                        onClick={() => navigate(`/grant/${g.id}`)}
                      >
                        <TableCell className="font-mono text-sm text-sky-400 tabular-nums">
                          {g.id}
                        </TableCell>
                        <TableCell className="text-slate-200">{label}</TableCell>
                        <TableCell className="text-right tabular-nums text-slate-300">
                          {g.totalAmountVoi.toLocaleString(undefined, {
                            maximumFractionDigits: 6,
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`rounded-sm capitalize font-medium ${statusBadgeClass(st)}`}
                          >
                            {st}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm tabular-nums">
                          {new Date(g.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <ArrowRight className="w-4 h-4 text-slate-600" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GrantDashboard;
