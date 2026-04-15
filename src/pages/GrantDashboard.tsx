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
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight, Gift, LayoutGrid, Plus, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  loadGrants,
  removeGrant,
  type StoredGrant,
  grantLifecycleStatus,
  grantScheduleStartMs,
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
  const [pendingRemove, setPendingRemove] = useState<StoredGrant | null>(null);

  useEffect(() => {
    setGrants(loadGrants());
  }, []);

  const refresh = () => setGrants(loadGrants());

  const confirmRemove = () => {
    if (!pendingRemove) return;
    removeGrant(pendingRemove.id);
    refresh();
    toast({
      description: `Removed grant #${pendingRemove.id} from this device.`,
      duration: 4000,
    });
    setPendingRemove(null);
  };

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
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 text-right w-[7rem]">
                      Actions
                    </TableHead>
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
                          {new Date(
                            grantScheduleStartMs(g),
                          ).toLocaleDateString()}
                        </TableCell>
                        <TableCell
                          className="text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-sm text-slate-500 hover:text-rose-400 hover:bg-rose-950/40"
                              aria-label={`Remove grant ${g.id} from dashboard`}
                              onClick={() => setPendingRemove(g)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <span className="inline-flex h-8 w-8 items-center justify-center pointer-events-none">
                              <ArrowRight className="w-4 h-4 text-slate-600" />
                            </span>
                          </div>
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

      <AlertDialog
        open={pendingRemove !== null}
        onOpenChange={(open) => !open && setPendingRemove(null)}
      >
        <AlertDialogContent className="grant-panel border-slate-800 bg-slate-950 text-slate-100 sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">
              Remove from dashboard?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400 text-sm leading-relaxed">
              This only deletes the saved entry on this device. The on-chain
              application is unchanged. You can still open grant{" "}
              <span className="font-mono text-slate-300">
                #{pendingRemove?.id}
              </span>{" "}
              by ID if you need it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="grant-btn-outline border-slate-700 bg-transparent">
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              className="grant-btn-danger"
              onClick={confirmRemove}
            >
              Remove
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GrantDashboard;
