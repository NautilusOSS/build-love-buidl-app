import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useWallet } from "@txnlab/use-wallet-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import {
  ArrowLeft,
  Ban,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  Coins,
  Copy,
  ExternalLink,
  Gift,
  Loader2,
  Timer,
  User,
  Wallet,
} from "lucide-react";
import {
  computeAirdropVestingSnapshot,
  airdropLifecycleFromSnapshot,
  formatApproxMonthsFromSeconds,
  formatDurationSeconds,
  formatLockupDelayDetail,
  formatLockupTimesPeriodSeconds,
  type AirdropVestingSnapshot,
} from "@/lib/airdropVesting";
import {
  computeVestingSnapshot,
  getGrantById,
  grantLifecycleStatus,
  grantScheduleStartMs,
  monthlyUnlockVoi,
  upsertGrant,
  type StoredGrant,
  type StoredGrantClaim,
} from "@/lib/grantStorage";
import { cn } from "@/lib/utils";
import {
  matchCouncilCompensationNote,
  parseCouncilCompensationNote,
} from "@/lib/councilCompensationNote";
import { AirdropClient, APP_SPEC } from "@/clients/AirdropClient";
import IdentitySheet from "@/components/IdentitySheet";
import NotFound from "@/pages/NotFound";
import algosdk from "algosdk";
import { CONTRACT } from "ulujs";

const EXPLORER_APP = (appId: number) =>
  `https://voiager.xyz/application/${appId}/`;

/** CONTRACT simulate+sign bundle for non-readonly methods (withdraw / abort_funding). */
type ContractSimSignResult = {
  success: boolean;
  error?: string;
  txns?: string[];
};

const ON_CHAIN_STATE_PAGE_SIZE = 20;

/** Voi mainnet indexer (same host as Grant Pay). */
const VOI_MAINNET_INDEXER = {
  server: "https://mainnet-idx.voi.nodely.dev",
  port: 443,
} as const;

function formatCouncilStartDateLong(iso: string): string {
  const parts = iso.split("-").map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return iso;
  const [y, mo, d] = parts;
  const dt = new Date(y, mo - 1, d);
  return dt.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatCouncilMonths(n: number): string {
  return `${n} ${n === 1 ? "month" : "months"}`;
}

/** On-chain / chart timestamps for grant schedule. */
function formatScheduleDateTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Council note `Start: YYYY-MM-DD` + whole months → end date for cliff (calendar months, local). */
function addCalendarMonthsToIsoDate(isoYmd: string, months: number): string {
  const parts = isoYmd.split("-").map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return isoYmd;
  const [y, mo, d] = parts;
  const dt = new Date(y, mo - 1, d);
  dt.setMonth(dt.getMonth() + months);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Human-readable compensation amount; template uses "X" when unset. */
function formatCouncilAmountHeading(display: string): string {
  const t = display.trim();
  if (t === "X" || t === "") return "Amount not specified";
  const num = parseFloat(t.replace(/,/g, ""));
  if (!Number.isNaN(num)) {
    return `${num.toLocaleString(undefined, { maximumFractionDigits: 6 })} VOI`;
  }
  return `${t} VOI`;
}

function compareIndexerTxnOrder(a: any, b: any): number {
  const ar = Number(a.confirmedRound ?? a["confirmed-round"] ?? 0);
  const br = Number(b.confirmedRound ?? b["confirmed-round"] ?? 0);
  if (ar !== br) return ar - br;
  const ai = Number(a.intraRoundOffset ?? a["intra-round-offset"] ?? 0);
  const bi = Number(b.intraRoundOffset ?? b["intra-round-offset"] ?? 0);
  return ai - bi;
}

function indexerNoteToUtf8(note: unknown): string {
  if (note == null) return "";
  if (note instanceof Uint8Array) {
    if (note.length === 0) return "";
    return new TextDecoder("utf-8", { fatal: false }).decode(note);
  }
  if (Array.isArray(note)) {
    const u8 = new Uint8Array(note as number[]);
    if (u8.length === 0) return "";
    return new TextDecoder("utf-8", { fatal: false }).decode(u8);
  }
  if (typeof note === "string") {
    if (note === "") return "";
    try {
      const bin = atob(note);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i) & 0xff;
      }
      return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    } catch {
      return note;
    }
  }
  return "";
}

function txnIdFromIndexerTxn(txn: any): string | null {
  const idRaw = txn.id ?? txn["id"];
  if (typeof idRaw === "string") return idRaw;
  if (idRaw != null) return String(idRaw);
  return null;
}

/** Prefer a txn whose note parses as council compensation (same round or later). */
function pickBestIndexerNoteFromSortedTxns(sorted: any[]): {
  note: string;
  txId: string | null;
} {
  const rows = sorted.map((txn) => ({
    note: indexerNoteToUtf8(txn.note ?? txn["note"]),
    txId: txnIdFromIndexerTxn(txn),
  }));
  for (const row of rows) {
    if (parseCouncilCompensationNote(row.note)) return row;
  }
  for (const row of rows) {
    if (matchCouncilCompensationNote(row.note)) return row;
  }
  for (const row of rows) {
    if (row.note.trim()) return row;
  }
  return rows[0] ?? { note: "", txId: null };
}

async function fetchAccountTransactionsPaginated(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- algosdk Indexer fluent API
  indexer: any,
  appAddr: string
): Promise<any[]> {
  const merged: any[] = [];
  let nextToken: string | undefined;
  for (let page = 0; page < 20; page++) {
    const req = indexer.lookupAccountTransactions(appAddr).limit(1000);
    if (nextToken) req.nextToken(nextToken);
    const pageRes = await req.do();
    const batch = pageRes.transactions ?? [];
    if (batch.length) merged.push(...batch);
    nextToken = pageRes.nextToken;
    if (!nextToken) break;
  }
  return merged;
}

async function fetchFirstAppTransactionNote(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- algosdk Indexer fluent API
  indexer: any,
  appId: number
): Promise<{ note: string; txId: string | null }> {
  const appAddr = String(algosdk.getApplicationAddress(appId));
  const appRes = await indexer.lookupApplications(appId).do();
  const createdRound = appRes.application?.createdAtRound;
  if (createdRound === undefined) {
    throw new Error("Application not found in indexer.");
  }
  const r = Number(createdRound);

  const res = await indexer
    .lookupAccountTransactions(appAddr)
    .minRound(r)
    .maxRound(r)
    .limit(1000)
    .do();
  let txns: any[] = res.transactions ?? [];
  /** False once we already loaded full account history (avoid double fetch). */
  let onlyCreationRound = true;

  if (txns.length === 0) {
    txns = await fetchAccountTransactionsPaginated(indexer, appAddr);
    onlyCreationRound = false;
  }

  if (txns.length === 0) {
    return { note: "", txId: null };
  }

  let sorted = [...txns].sort(compareIndexerTxnOrder);
  let pick = pickBestIndexerNoteFromSortedTxns(sorted);

  if (!parseCouncilCompensationNote(pick.note) && onlyCreationRound) {
    txns = await fetchAccountTransactionsPaginated(indexer, appAddr);
    if (txns.length > 0) {
      sorted = [...txns].sort(compareIndexerTxnOrder);
      pick = pickBestIndexerNoteFromSortedTxns(sorted);
    }
  }

  return pick;
}

const microVoi = (micro: bigint) =>
  `${(Number(micro) / 1e6).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })} VOI`;

function formatUnixSeconds(n: bigint): string {
  const sec = Number(n);
  if (sec === 0) return "—";
  return new Date(sec * 1000).toLocaleString();
}

type AirdropGlobal = Awaited<ReturnType<AirdropClient["getGlobalState"]>>;

function formatAirdropTotalVoi(g: AirdropGlobal): string {
  const t = g.total;
  return t ? microVoi(t.asBigInt()) : "—";
}

/** Global bytes state is raw pubkey bytes; decode with algosdk for display. */
function encodeGlobalAddress(
  b:
    | AirdropGlobal["owner"]
    | AirdropGlobal["funder"]
    | AirdropGlobal["delegate"]
    | AirdropGlobal["deployer"]
    | AirdropGlobal["upgrader"]
): string {
  const a = globalAddressOrNull(b);
  return a ?? "—";
}

/** Same decoding as display; `null` when unset or invalid (for comparisons). */
function globalAddressOrNull(
  b:
    | AirdropGlobal["owner"]
    | AirdropGlobal["funder"]
    | AirdropGlobal["delegate"]
    | AirdropGlobal["deployer"]
    | AirdropGlobal["upgrader"]
    | undefined
): string | null {
  if (!b) return null;
  const raw = b.asByteArray();
  if (raw.length !== 32) return null;
  if (raw.every((x) => x === 0)) return null;
  try {
    return algosdk.encodeAddress(raw);
  } catch {
    return null;
  }
}

function airdropGlobalTableRows(g: AirdropGlobal): { label: string; value: string }[] {
  const micro = (u: AirdropGlobal["total"]) =>
    u ? microVoi(u.asBigInt()) : "—";
  const uintStr = (u: AirdropGlobal["period"]) =>
    u ? u.asBigInt().toString() : "—";
  const ts = (u: AirdropGlobal["deadline"]) =>
    u ? formatUnixSeconds(u.asBigInt()) : "—";
  const boolish = (u: AirdropGlobal["stakeable"]) =>
    u === undefined ? "—" : u.asBigInt() === 0n ? "No" : "Yes";

  return [
    { label: "Owner address", value: encodeGlobalAddress(g.owner) },
    { label: "Funder address", value: encodeGlobalAddress(g.funder) },
    { label: "Deployer address", value: encodeGlobalAddress(g.deployer) },
    { label: "Delegate address", value: encodeGlobalAddress(g.delegate) },
    { label: "Upgrader address", value: encodeGlobalAddress(g.upgrader) },
    { label: "Parent application", value: uintStr(g.parentId) },
    { label: "Total", value: micro(g.total) },
    { label: "Initial", value: micro(g.initial) },
    { label: "Funded at", value: ts(g.funding) },
    { label: "Deadline", value: ts(g.deadline) },
    { label: "Period", value: uintStr(g.period) },
    { label: "Period (seconds)", value: uintStr(g.periodSeconds) },
    { label: "Distribution count", value: uintStr(g.distributionCount) },
    { label: "Distribution (seconds)", value: uintStr(g.distributionSeconds) },
    { label: "Period limit", value: uintStr(g.periodLimit) },
    { label: "Lockup delay", value: uintStr(g.lockupDelay) },
    { label: "Vesting delay", value: uintStr(g.vestingDelay) },
    { label: "Stakeable", value: boolish(g.stakeable) },
    { label: "Updatable", value: boolish(g.updatable) },
    { label: "Messenger ID", value: uintStr(g.messengerId) },
    { label: "Contract version", value: uintStr(g.contractVersion) },
    { label: "Deployment version", value: uintStr(g.deploymentVersion) },
  ];
}

type MilestoneState = "claimed" | "available" | "upcoming";

interface Milestone {
  id: string;
  label: string;
  dateMs: number;
  amountVoi: number;
  state: MilestoneState;
  txId?: string;
}

/** Claim applied to a row; `showTx` false = covered by same withdrawal as a later slice (no link). */
type MilestoneClaimSlot =
  | undefined
  | { claim: StoredGrantClaim; showTx: boolean };

function amountCloseForGrant(a: number, b: number, totalVoi: number): boolean {
  return Math.abs(a - b) < Math.max(1e-6, totalVoi * 1e-9);
}

/**
 * Assigns each stored claim to at most one milestone. Exact per-slice matches (FIFO) first;
 * bulk amounts fill k consecutive unlocked rows: earlier rows are claimed without tx link,
 * the k-th row carries the transaction link.
 */
function assignClaimsFifo(
  milestoneRows: Array<{ dateMs: number; amountVoi: number }>,
  claims: StoredGrantClaim[],
  nowMs: number,
  totalVoi: number
): MilestoneClaimSlot[] {
  const n = milestoneRows.length;
  const byDate = Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => milestoneRows[a].dateMs - milestoneRows[b].dateMs
  );
  const claimEntries = claims
    .map((c, i) => ({ c, i }))
    .sort(
      (a, b) =>
        new Date(a.c.claimedAt).getTime() - new Date(b.c.claimedAt).getTime()
    );
  const usedClaim = new Set<number>();
  const assigned: MilestoneClaimSlot[] = Array(n).fill(undefined);

  for (const mi of byDate) {
    const m = milestoneRows[mi];
    if (nowMs < m.dateMs) continue;
    for (const { c, i } of claimEntries) {
      if (usedClaim.has(i)) continue;
      if (amountCloseForGrant(c.amountVoi, m.amountVoi, totalVoi)) {
        assigned[mi] = { claim: c, showTx: true };
        usedClaim.add(i);
        break;
      }
    }
  }

  for (const { c, i } of claimEntries) {
    if (usedClaim.has(i)) continue;

    const per = milestoneRows[0]?.amountVoi ?? 0;
    if (!(per > 0)) continue;

    const eligible = byDate.filter((mi) => {
      const m = milestoneRows[mi];
      return nowMs >= m.dateMs && !assigned[mi];
    });

    if (eligible.length === 0) continue;

    const k = Math.max(
      1,
      Math.min(
        eligible.length,
        Math.round(c.amountVoi / per)
      )
    );

    for (let j = 0; j < k - 1; j++) {
      assigned[eligible[j]] = { claim: c, showTx: false };
    }
    assigned[eligible[k - 1]] = { claim: c, showTx: true };
    usedClaim.add(i);
  }

  return assigned;
}

function milestoneStateFromMatch(
  dateMs: number,
  nowMs: number,
  slot: MilestoneClaimSlot
): MilestoneState {
  if (nowMs < dateMs) return "upcoming";
  if (slot) return "claimed";
  return "available";
}

function buildMilestones(grant: StoredGrant, nowMs: number): Milestone[] {
  const snap = computeVestingSnapshot(grant, nowMs);
  const { cliffEnd, vestingEnd } = snap;
  const total = grant.totalAmountVoi;
  const v = grant.vestingMonths;
  const claims = grant.claims ?? [];

  if (v === 0) {
    const claimed = claims.some(
      (c) => Math.abs(c.amountVoi - total) < 1e-9
    );
    let state: MilestoneState = "upcoming";
    if (claimed) state = "claimed";
    else if (nowMs >= cliffEnd) state = "available";
    else if (nowMs < cliffEnd) state = "upcoming";

    return [
      {
        id: "full",
        label: "Full unlock (after cliff)",
        dateMs: cliffEnd,
        amountVoi: total,
        state,
        txId: claims.find((c) => Math.abs(c.amountVoi - total) < 1e-9)?.txId,
      },
    ];
  }

  const rows = Array.from({ length: v }, (_, j) => {
    const i = j + 1;
    return {
      dateMs: cliffEnd + (i * (vestingEnd - cliffEnd)) / v,
      amountVoi: total / v,
    };
  });
  const assigned = assignClaimsFifo(rows, claims, nowMs, total);

  const out: Milestone[] = [];
  for (let j = 0; j < v; j++) {
    const i = j + 1;
    const { dateMs, amountVoi } = rows[j];
    const slot = assigned[j];
    const state = milestoneStateFromMatch(dateMs, nowMs, slot);
    out.push({
      id: `m-${i}`,
      label: `Vesting ${i}/${v}`,
      dateMs,
      amountVoi,
      state,
      txId: slot?.showTx ? slot.claim.txId : undefined,
    });
  }
  return out;
}

function buildMilestonesFromAirdrop(
  g: AirdropGlobal,
  snap: Extract<AirdropVestingSnapshot, { ok: true }>,
  grant: StoredGrant | undefined,
  nowMs: number
): Milestone[] {
  const claims = grant?.claims ?? [];
  const total = snap.totalVoi;
  const { cliffEnd, vestingEnd } = snap;

  if (snap.lumpSumPostCliff) {
    const claimed = claims.some(
      (c) => Math.abs(c.amountVoi - total) < 1e-9
    );
    let state: MilestoneState = "upcoming";
    if (claimed) state = "claimed";
    else if (nowMs >= cliffEnd) state = "available";
    else state = "upcoming";

    return [
      {
        id: "full",
        label: "Full unlock (after cliff)",
        dateMs: cliffEnd,
        amountVoi: total,
        state,
        txId: claims.find((c) => Math.abs(c.amountVoi - total) < 1e-9)?.txId,
      },
    ];
  }

  const dc = g.distributionCount?.asBigInt() ?? 0n;
  const ds = g.distributionSeconds?.asBigInt() ?? 0n;

  if (dc > 0n && ds > 0n) {
    const n = Number(dc);
    const stepMs = Number(ds) * 1000;
    const per = total / n;
    const rows = Array.from({ length: n }, (_, j) => {
      const i = j + 1;
      return {
        dateMs: cliffEnd + i * stepMs,
        amountVoi: per,
      };
    });
    const assigned = assignClaimsFifo(rows, claims, nowMs, total);
    const out: Milestone[] = [];
    for (let j = 0; j < n; j++) {
      const i = j + 1;
      const { dateMs, amountVoi } = rows[j];
      const slot = assigned[j];
      const state = milestoneStateFromMatch(dateMs, nowMs, slot);
      out.push({
        id: `dist-${i}`,
        label: `Distribution ${i}/${n}`,
        dateMs,
        amountVoi,
        state,
        txId: slot?.showTx ? slot.claim.txId : undefined,
      });
    }
    return out;
  }

  const span = Math.max(vestingEnd - cliffEnd, 1);
  const monthMs = 30 * 24 * 60 * 60 * 1000;
  const steps = Math.min(24, Math.max(1, Math.ceil(span / monthMs)));
  const linRows = Array.from({ length: steps }, (_, j) => {
    const i = j + 1;
    return {
      dateMs: cliffEnd + (i * span) / steps,
      amountVoi: total / steps,
    };
  });
  const linAssigned = assignClaimsFifo(linRows, claims, nowMs, total);
  const out: Milestone[] = [];
  for (let j = 0; j < steps; j++) {
    const i = j + 1;
    const { dateMs, amountVoi } = linRows[j];
    const slot = linAssigned[j];
    const state = milestoneStateFromMatch(dateMs, nowMs, slot);
    out.push({
      id: `lin-${i}`,
      label: `Vesting ${i}/${steps} (linear)`,
      dateMs,
      amountVoi,
      state,
      txId: slot?.showTx ? slot.claim.txId : undefined,
    });
  }
  return out;
}

function VestingChart({
  scheduleStartMs,
  cliffEnd,
  vestingEnd,
}: {
  scheduleStartMs: number;
  cliffEnd: number;
  vestingEnd: number;
}) {
  const w = 400;
  const h = 200;
  const pad = 28;
  const totalT = Math.max(vestingEnd - scheduleStartMs, 1);
  const cliffX =
    pad + ((cliffEnd - scheduleStartMs) / totalT) * (w - 2 * pad);
  const topY = pad;
  const botY = h - pad;

  const lockedPoly = `${pad},${topY} ${Math.min(cliffX, w - pad)},${topY} ${w - pad},${botY}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-48 text-sky-400"
      preserveAspectRatio="xMidYMid meet"
    >
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line
          key={t}
          x1={pad}
          y1={topY + t * (botY - topY)}
          x2={w - pad}
          y2={topY + t * (botY - topY)}
          stroke="#1e293b"
          strokeWidth="0.5"
          strokeDasharray="4 4"
        />
      ))}
      <polygon
        points={`${pad},${botY} ${lockedPoly} ${w - pad},${botY}`}
        fill="url(#vestGrad)"
        opacity={0.35}
      />
      <polyline
        points={lockedPoly}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        className="transition-all duration-700"
      />
      <defs>
        <linearGradient id="vestGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <text x={pad} y={h - 8} fill="#64748b" fontSize="10">
        Start
      </text>
      <text
        x={cliffX - 20}
        y={h - 8}
        fill="#64748b"
        fontSize="10"
      >
        Cliff ends
      </text>
      <text x={w - pad - 36} y={h - 8} fill="#64748b" fontSize="10">
        End
      </text>
      <text x={pad} y={16} fill="#64748b" fontSize="10">
        Locked
      </text>
      <text x={w - 52} y={botY - 4} fill="#64748b" fontSize="10">
        Unlocked
      </text>
    </svg>
  );
}

/** VOI → micro-VOI for `withdraw(uint64)` amount arg (ABI uint64). */
function voiToWithdrawMicro(voi: number): bigint {
  if (!Number.isFinite(voi) || voi <= 0) return 0n;
  return BigInt(Math.round(voi * 1_000_000));
}

/**
 * Approximate VOI still claimable from vesting snapshot vs. sum of locally recorded claims.
 * On-chain `withdraw` enforces the real cap.
 */
function claimableVoiFromSnapshot(
  snap: Extract<AirdropVestingSnapshot, { ok: true }>,
  claimedVoiSum: number,
  nowMs: number
): number {
  if (snap.lumpSumPostCliff) {
    if (nowMs < snap.cliffEnd) return 0;
    return Math.max(0, snap.totalVoi - claimedVoiSum);
  }
  return Math.max(0, snap.vested - claimedVoiSum);
}

function isGrantDetailDebugEnabled(searchParams: URLSearchParams): boolean {
  if (!searchParams.has("debug")) return false;
  const v = searchParams.get("debug");
  if (v === null || v === "") return true;
  const lower = v.trim().toLowerCase();
  if (lower === "0" || lower === "false" || lower === "no") return false;
  return true;
}

/**
 * Heuristic: algod/indexer errors that mean the app id is not on-chain (deleted / closed).
 * Avoid treating generic network failures as “missing app”.
 */
function errorMessageImpliesMissingApplication(msg: string): boolean {
  const t = msg.toLowerCase();
  if (t.includes("failed to fetch")) return false;
  if (t.includes("network request failed")) return false;
  if (t.includes("timeout")) return false;
  return (
    t.includes("application not found in indexer") ||
    t.includes("application does not exist") ||
    t.includes("unknown application") ||
    /\b404\b/.test(t) ||
    (t.includes("does not exist") && t.includes("application"))
  );
}

const GrantDetail = () => {
  const { grantId } = useParams<{ grantId: string }>();
  const [searchParams] = useSearchParams();
  const showOnChainDebugCard = useMemo(
    () => isGrantDetailDebugEnabled(searchParams),
    [searchParams]
  );
  const { activeAccount, algodClient, signTransactions } = useWallet();
  const [showIdentitySheet, setShowIdentitySheet] = useState(false);
  const numericId = grantId ? parseInt(grantId, 10) : NaN;
  const grantApplicationAddress = useMemo(() => {
    if (Number.isNaN(numericId)) return null;
    return String(algosdk.getApplicationAddress(numericId));
  }, [numericId]);

  const [grantReloadTick, setGrantReloadTick] = useState(0);
  const grant = useMemo(() => {
    if (Number.isNaN(numericId)) return undefined;
    return getGrantById(numericId);
  }, [numericId, grantReloadTick]);

  const nowMs = Date.now();

  const [chainRows, setChainRows] = useState<
    { label: string; value: string }[] | null
  >(null);
  /** Raw global state for vesting math (same fetch as on-chain table). */
  const [chainGlobal, setChainGlobal] = useState<AirdropGlobal | null>(null);
  /** Formatted Total from `total` global (micro-VOI); null until fetch settles or skipped. */
  const [chainTotalDisplay, setChainTotalDisplay] = useState<string | null>(null);
  const [chainLoading, setChainLoading] = useState(true);
  const [chainError, setChainError] = useState<string | null>(null);
  const [chainStatePage, setChainStatePage] = useState(0);
  /** On-chain globals table is collapsed by default; user expands when needed. */
  const [showChainStateTable, setShowChainStateTable] = useState(false);
  const [chainRefreshTick, setChainRefreshTick] = useState(0);
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [revokeSubmitting, setRevokeSubmitting] = useState(false);
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false);

  useEffect(() => {
    setChainStatePage(0);
    setShowChainStateTable(false);
  }, [numericId]);

  useEffect(() => {
    if (!algodClient || Number.isNaN(numericId)) {
      setChainLoading(false);
      setChainRows(null);
      setChainGlobal(null);
      setChainTotalDisplay(null);
      setChainError(null);
      return;
    }
    let cancelled = false;
    setChainLoading(true);
    setChainError(null);
    setChainTotalDisplay(null);
    setChainGlobal(null);
    const client = new AirdropClient(
      { resolveBy: "id", id: numericId },
      algodClient
    );
    client
      .getGlobalState()
      .then((g) => {
        if (cancelled) return;
        setChainRows(airdropGlobalTableRows(g));
        setChainGlobal(g);
        setChainTotalDisplay(formatAirdropTotalVoi(g));
        setChainLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setChainRows(null);
        setChainGlobal(null);
        setChainTotalDisplay(null);
        setChainError(
          err instanceof Error ? err.message : "Failed to load on-chain state"
        );
        setChainLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [algodClient, numericId, chainRefreshTick]);

  useEffect(() => {
    if (!chainRows?.length) return;
    const maxPage = Math.ceil(chainRows.length / ON_CHAIN_STATE_PAGE_SIZE) - 1;
    setChainStatePage((p) => Math.min(p, Math.max(0, maxPage)));
  }, [chainRows]);

  const [firstTxnNote, setFirstTxnNote] = useState<string | null>(null);
  const [firstTxnId, setFirstTxnId] = useState<string | null>(null);
  const [firstTxnLoading, setFirstTxnLoading] = useState(true);
  const [firstTxnError, setFirstTxnError] = useState<string | null>(null);

  useEffect(() => {
    if (Number.isNaN(numericId)) {
      setFirstTxnLoading(false);
      setFirstTxnNote(null);
      setFirstTxnId(null);
      setFirstTxnError(null);
      return;
    }
    let cancelled = false;
    setFirstTxnLoading(true);
    setFirstTxnError(null);
    setFirstTxnNote(null);
    setFirstTxnId(null);
    const indexer = new algosdk.Indexer(
      "",
      VOI_MAINNET_INDEXER.server,
      VOI_MAINNET_INDEXER.port
    );
    fetchFirstAppTransactionNote(indexer, numericId)
      .then(({ note, txId }) => {
        if (cancelled) return;
        setFirstTxnNote(note);
        setFirstTxnId(txId);
        setFirstTxnLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setFirstTxnError(
          err instanceof Error ? err.message : "Failed to load first account transaction note"
        );
        setFirstTxnLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [numericId]);

  const councilCompensationParsed = useMemo(() => {
    if (!firstTxnNote) return null;
    return parseCouncilCompensationNote(firstTxnNote);
  }, [firstTxnNote]);

  const councilCompensationUnparsed = useMemo(() => {
    if (!firstTxnNote || councilCompensationParsed) return false;
    return matchCouncilCompensationNote(firstTxnNote);
  }, [firstTxnNote, councilCompensationParsed]);

  /** App id has no current on-chain application (e.g. deleted after revoke/close). */
  const grantApplicationMissing = useMemo(() => {
    if (Number.isNaN(numericId)) return false;

    const chainStatesAppExists =
      Boolean(algodClient) &&
      !chainLoading &&
      chainError === null &&
      chainGlobal !== null;

    if (chainStatesAppExists) return false;

    const chainSaysMissing =
      Boolean(algodClient) &&
      !chainLoading &&
      chainError !== null &&
      errorMessageImpliesMissingApplication(chainError);

    if (chainSaysMissing) return true;

    const indexerSaysMissing =
      !firstTxnLoading &&
      firstTxnError !== null &&
      errorMessageImpliesMissingApplication(firstTxnError);

    if (!algodClient) {
      return indexerSaysMissing;
    }

    if (chainLoading) return false;

    const chainFailedForOtherReason =
      chainError !== null &&
      !errorMessageImpliesMissingApplication(chainError);

    if (chainFailedForOtherReason) return false;

    return indexerSaysMissing;
  }, [
    numericId,
    algodClient,
    chainLoading,
    chainError,
    chainGlobal,
    firstTxnLoading,
    firstTxnError,
  ]);

  const chainStatePageCount = useMemo(() => {
    if (!chainRows?.length) return 1;
    return Math.max(1, Math.ceil(chainRows.length / ON_CHAIN_STATE_PAGE_SIZE));
  }, [chainRows]);

  const chainRowsPage = useMemo(() => {
    if (!chainRows?.length) return [];
    const start = chainStatePage * ON_CHAIN_STATE_PAGE_SIZE;
    return chainRows.slice(start, start + ON_CHAIN_STATE_PAGE_SIZE);
  }, [chainRows, chainStatePage]);

  const chainVestingSnap = useMemo(
    () =>
      chainGlobal
        ? computeAirdropVestingSnapshot(chainGlobal, nowMs)
        : ({ ok: false as const }),
    [chainGlobal, nowMs]
  );

  const snapshot = useMemo(() => {
    if (chainVestingSnap.ok) {
      return {
        vested: chainVestingSnap.vested,
        remaining: chainVestingSnap.remaining,
        pctVested: chainVestingSnap.pctVested,
        cliffEnd: chainVestingSnap.cliffEnd,
        vestingEnd: chainVestingSnap.vestingEnd,
      };
    }
    if (grant) return computeVestingSnapshot(grant, nowMs);
    return null;
  }, [chainVestingSnap, grant, nowMs]);

  const chartScheduleStartMs = useMemo(() => {
    if (chainVestingSnap.ok) return chainVestingSnap.fundingMs;
    if (grant) return grantScheduleStartMs(grant);
    return null;
  }, [chainVestingSnap, grant]);

  const lifecycle = useMemo(() => {
    if (chainVestingSnap.ok) {
      return airdropLifecycleFromSnapshot(
        chainVestingSnap.cliffEnd,
        chainVestingSnap.vestingEnd,
        nowMs,
        chainVestingSnap.lumpSumPostCliff
      );
    }
    if (grant) return grantLifecycleStatus(grant, nowMs);
    return "pending" as const;
  }, [chainVestingSnap, grant, nowMs]);

  const milestones = useMemo(() => {
    if (chainVestingSnap.ok && chainGlobal) {
      return buildMilestonesFromAirdrop(
        chainGlobal,
        chainVestingSnap,
        grant,
        nowMs
      );
    }
    if (grant) return buildMilestones(grant, nowMs);
    return [];
  }, [chainVestingSnap, chainGlobal, grant, nowMs]);

  const createdSummaryDisplay = useMemo(() => {
    if (chainVestingSnap.ok) {
      return new Date(chainVestingSnap.fundingMs).toLocaleString();
    }
    if (grant) {
      return new Date(grantScheduleStartMs(grant)).toLocaleString();
    }
    return "—";
  }, [chainVestingSnap, grant]);

  /** Prefer contract `total` global (micro-VOI); fallback to stored grant when chain unavailable. */
  const totalAmountSummary = useMemo(() => {
    const fromLocal = grant
      ? `${grant.totalAmountVoi.toLocaleString(undefined, { maximumFractionDigits: 6 })} VOI`
      : "—";
    if (!algodClient || Number.isNaN(numericId)) {
      return fromLocal;
    }
    if (chainLoading) {
      return "—";
    }
    if (chainError) {
      return fromLocal;
    }
    if (chainTotalDisplay !== null) {
      return chainTotalDisplay;
    }
    return fromLocal;
  }, [
    algodClient,
    numericId,
    chainLoading,
    chainError,
    chainTotalDisplay,
    grant,
  ]);

  const pctVested = snapshot
    ? Math.min(100, Math.max(0, snapshot.pctVested))
    : 0;

  const badgeClass =
    lifecycle === "completed"
      ? "border-emerald-900/50 bg-emerald-950/35 text-emerald-400"
      : lifecycle === "pending"
        ? "border-amber-900/45 bg-amber-950/25 text-amber-400"
        : "border-sky-800/50 bg-sky-950/40 text-sky-300";

  const displayName = grant
    ? grant.recipientLabel ||
    `${grant.recipientAddress.slice(0, 8)}…${grant.recipientAddress.slice(-6)}`
    : councilCompensationParsed?.displayName?.trim() || "Unknown recipient";

  const showClaim =
    lifecycle === "active" && (grant !== undefined || chainVestingSnap.ok);

  /** Beneficiary for claims: on-chain owner when available, else stored grant recipient. */
  const claimRecipientAddress = useMemo(() => {
    const owner = globalAddressOrNull(chainGlobal?.owner);
    if (owner) return owner;
    return grant?.recipientAddress ?? null;
  }, [chainGlobal, grant]);

  const isConnectedRecipient = Boolean(
    activeAccount &&
    claimRecipientAddress &&
    activeAccount.address === claimRecipientAddress
  );

  const funderAddress = useMemo(
    () => globalAddressOrNull(chainGlobal?.funder),
    [chainGlobal]
  );
  const isConnectedFunder = Boolean(
    activeAccount &&
      funderAddress &&
      activeAccount.address === funderAddress
  );
  const showRevokePayment =
    !chainLoading &&
    chainGlobal !== null &&
    chainError === null &&
    isConnectedFunder;

  const copyId = () => {
    if (Number.isNaN(numericId)) return;
    navigator.clipboard.writeText(String(numericId));
    toast({ description: "Grant ID copied", duration: 2000 });
  };

  const onClaim = useCallback(async () => {
    if (!signTransactions) {
      toast({
        variant: "destructive",
        description: "This wallet cannot sign transactions.",
      });
      return;
    }
    if (!algodClient || !activeAccount || Number.isNaN(numericId)) {
      toast({
        variant: "destructive",
        description: "Connect your wallet and open a valid grant.",
      });
      return;
    }
    if (!chainVestingSnap.ok) {
      toast({
        variant: "destructive",
        description: "On-chain vesting data not loaded yet.",
      });
      return;
    }

    const claimedSoFar =
      grant?.claims?.reduce((s, c) => s + c.amountVoi, 0) ?? 0;
    const claimableVoi = claimableVoiFromSnapshot(
      chainVestingSnap,
      claimedSoFar,
      Date.now()
    );
    const amountMicro = voiToWithdrawMicro(claimableVoi);
    if (amountMicro <= 0n) {
      toast({
        description: "Nothing available to claim right now.",
        duration: 4000,
      });
      return;
    }

    setClaimSubmitting(true);
    try {
      const grantContractSpec = {
        ...APP_SPEC.contract,
        events: [],
      };

      const ci = new CONTRACT(
        numericId,
        algodClient,
        undefined,
        grantContractSpec,
        {
          addr: activeAccount.address,
          sk: new Uint8Array(),
        }
      );
      ci.setFee(8000);

      const contractAppAddress = algosdk.getApplicationAddress(numericId);
      const contractAccountInfo = await algodClient
        .accountInformation(contractAppAddress)
        .do();
      const contractBalanceMicro = BigInt(contractAccountInfo.amount);
      console.log("contractBalanceMicro", contractBalanceMicro);

      let result = await ci.withdraw(0);
      console.log("result", result);
      const maxWithdraw = contractBalanceMicro - BigInt(result.returnValue) - BigInt(1e5);
      console.log("maxWithdraw", maxWithdraw);
      result = await ci.withdraw(maxWithdraw);
      if (!result.success) {
        const err =
          typeof result.error === "string"
            ? result.error
            : "Withdraw simulation failed";
        throw new Error(err);
      }
      const txns = result.txns;
      if (!txns?.length) {
        throw new Error("No transactions returned for withdraw");
      }

      const signed = await signTransactions(
        txns.map(
          (txn: string) =>
            new Uint8Array(
              atob(txn)
                .split("")
                .map((char) => char.charCodeAt(0))
            )
        )
      );

      const sendRes = await algodClient.sendRawTransaction(signed).do();
      await algosdk.waitForConfirmation(algodClient, sendRes.txid, 4);

      if (grant) {
        upsertGrant({
          ...grant,
          claims: [
            ...(grant.claims ?? []),
            {
              txId: sendRes.txid,
              amountVoi: claimableVoi,
              claimedAt: new Date().toISOString(),
            },
          ],
        });
        setGrantReloadTick((t) => t + 1);
      }

      setChainRefreshTick((t) => t + 1);

      toast({
        title: "Claim submitted",
        description: (
          <span>
            Withdrew{" "}
            {claimableVoi.toLocaleString(undefined, {
              maximumFractionDigits: 6,
            })}{" "}
            VOI.{" "}
            <a
              href={`https://voiager.xyz/transaction/${sendRes.txid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 underline"
            >
              View transaction
            </a>
          </span>
        ),
        duration: 8000,
      });
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Withdraw transaction failed";
      toast({
        variant: "destructive",
        description: msg.slice(0, 220),
        duration: 6000,
      });
    } finally {
      setClaimSubmitting(false);
    }
  }, [
    algodClient,
    activeAccount,
    numericId,
    chainVestingSnap,
    grant,
    signTransactions,
  ]);

  const onRevokePayment = useCallback(async () => {
    if (!signTransactions) {
      toast({
        variant: "destructive",
        description: "This wallet cannot sign transactions.",
      });
      return;
    }
    if (!algodClient || !activeAccount || Number.isNaN(numericId)) {
      toast({
        variant: "destructive",
        description: "Connect your wallet and open a valid grant.",
      });
      return;
    }
    const funder = globalAddressOrNull(chainGlobal?.funder);
    if (!funder || activeAccount.address !== funder) {
      toast({
        variant: "destructive",
        description: "Only the on-chain funder can revoke payment.",
      });
      return;
    }

    setRevokeConfirmOpen(false);
    setRevokeSubmitting(true);
    try {
      const grantContractSpec = {
        ...APP_SPEC.contract,
        events: [],
      };
      const ci = new CONTRACT(
        numericId,
        algodClient,
        undefined,
        grantContractSpec,
        {
          addr: activeAccount.address,
          sk: new Uint8Array(),
        }
      );
      ci.setFee(8000);
      ci.setOnComplete(5);

      const result = await (
        ci as unknown as {
          abort_funding: () => Promise<ContractSimSignResult>;
        }
      ).abort_funding();
      if (!result.success) {
        const err =
          typeof result.error === "string"
            ? result.error
            : "abort_funding simulation failed";
        throw new Error(err);
      }
      const txns = result.txns;
      if (!txns?.length) {
        throw new Error("No transactions returned for abort_funding");
      }

      const signed = await signTransactions(
        txns.map(
          (txn: string) =>
            new Uint8Array(
              atob(txn)
                .split("")
                .map((char) => char.charCodeAt(0))
            )
        )
      );

      const sendRes = await algodClient.sendRawTransaction(signed).do();
      await algosdk.waitForConfirmation(algodClient, sendRes.txid, 4);

      setChainRefreshTick((t) => t + 1);

      toast({
        title: "Payment revoked",
        description: (
          <span>
            Abort funding submitted.{" "}
            <a
              href={`https://voiager.xyz/transaction/${sendRes.txid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 underline"
            >
              View transaction
            </a>
          </span>
        ),
        duration: 8000,
      });
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "abort_funding transaction failed";
      toast({
        variant: "destructive",
        description: msg.slice(0, 220),
        duration: 6000,
      });
    } finally {
      setRevokeSubmitting(false);
    }
  }, [algodClient, activeAccount, numericId, chainGlobal, signTransactions]);

  if (Number.isNaN(numericId)) {
    return (
      <div className="grant-shell flex items-center justify-center p-6">
        <Card className="grant-panel max-w-md">
          <CardContent className="pt-8 text-center space-y-4">
            <p className="text-slate-500 text-sm">Invalid grant ID in URL.</p>
            <Button asChild className="grant-btn-outline">
              <Link to="/">Back to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (grantApplicationMissing) {
    return (
      <NotFound
        quiet
        heading="Grant not found"
        subheading="This application is no longer on the network. It may have been closed or deleted (for example, after funding was revoked)."
      />
    );
  }

  return (
    <div className="grant-shell">
      <div className="grant-shell-header">
        <div className="container mx-auto px-6 py-6">
          <Link
            to="/"
            className="grant-link inline-flex items-center gap-2 text-sm mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div>
              <p className="grant-title-sub mb-1">Application</p>
              <h1 className="grant-title text-3xl sm:text-4xl">
                {councilCompensationParsed ? (
                  <span className="flex flex-col gap-1 sm:gap-0 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-3">
                    <span>Council Compensation</span>
                    <span className="text-lg sm:text-2xl font-mono font-medium text-slate-400 tracking-tight">
                      Ref {councilCompensationParsed.vfPrefix}
                    </span>
                  </span>
                ) : (
                  <>Grant #{numericId}</>
                )}
              </h1>
              <p className="text-slate-400 mt-3 text-base flex items-center gap-2 flex-wrap">
                <Gift className="w-5 h-5 text-sky-400 shrink-0 stroke-[1.5]" />
                <span className="text-slate-200">{displayName}</span>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 shrink-0 lg:pt-1">
              <Button
                type="button"
                variant="outline"
                className="grant-btn-outline justify-center sm:justify-start"
                onClick={() => setShowIdentitySheet(true)}
              >
                <Wallet className="w-4 h-4 mr-2 shrink-0" />
                {activeAccount ? (
                  <span className="font-mono tabular-nums">
                    {activeAccount.address.slice(0, 4)}…
                    {activeAccount.address.slice(-4)}
                  </span>
                ) : (
                  "Connect wallet"
                )}
              </Button>
              <Badge
                variant="outline"
                className={cn(
                  "rounded-sm capitalize text-xs font-semibold px-3 py-1 tracking-wide justify-center sm:justify-start",
                  badgeClass
                )}
              >
                {lifecycle}
              </Badge>
            </div>
          </div>
        </div>
        <div className="grant-hairline" />
      </div>

      <div className="container mx-auto px-6 py-8 max-w-6xl space-y-8">
        {/* Council compensation (top of page when note parses) */}
        {!firstTxnLoading && !firstTxnError && councilCompensationParsed && (
          <div className="rounded-sm border border-sky-900/50 bg-gradient-to-b from-sky-950/35 to-[#050a14]/90 p-4 sm:p-6 space-y-4 sm:space-y-5">
            <div className="flex min-w-0 items-center justify-between gap-x-2 sm:gap-x-3">
              {/* font-size/leading on h2 collapsed so UA heading line-box doesn’t misalign flex row */}
              <h2 className="m-0 min-w-0 shrink text-[0] leading-none">
                <Badge
                  variant="outline"
                  className="inline-flex items-center justify-center rounded-sm text-[8px] sm:text-[9px] font-semibold uppercase tracking-[0.12em] border-sky-700/55 text-sky-300/95 bg-sky-950/40 py-0.5 px-1.5 sm:px-2 leading-none"
                >
                  Council compensation
                </Badge>
              </h2>
              <span
                className="inline-flex shrink-0 items-center text-[9px] sm:text-[10px] leading-none text-slate-500 font-mono text-right max-w-[min(100vw-4rem,14rem)] truncate tabular-nums"
                title={councilCompensationParsed.vfPrefix}
              >
                Ref {councilCompensationParsed.vfPrefix}
              </span>
            </div>

            <div className="flex items-start gap-2.5 sm:gap-3">
              <User
                className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400/90 shrink-0 mt-0.5"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
                  Recipient
                </p>
                <p className="text-base sm:text-lg font-semibold text-slate-50 tracking-tight">
                  {councilCompensationParsed.displayName}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 sm:gap-3">
              <Coins
                className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400/85 shrink-0 mt-0.5"
                aria-hidden
              />
              <div>
                <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
                  Total compensation
                </p>
                <p className="text-lg sm:text-xl font-semibold tabular-nums text-sky-100">
                  {formatCouncilAmountHeading(
                    councilCompensationParsed.amountDisplay,
                  )}
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed border-l-2 border-sky-800/55 pl-3 sm:pl-4 ml-0 sm:ml-1">
              {councilCompensationParsed.cliffMonths > 0 ? (
                <>
                  The{" "}
                  <strong className="text-slate-100 font-medium tabular-nums">
                    cliff
                  </strong>{" "}
                  is{" "}
                  <strong className="text-slate-100 font-medium tabular-nums">
                    {formatCouncilMonths(councilCompensationParsed.cliffMonths)}
                  </strong>{" "}
                  from schedule start with{" "}
                  <strong className="text-slate-100 font-medium">
                    no vesting during that window
                  </strong>
                  . After the cliff, vesting runs for{" "}
                </>
              ) : (
                <>Vesting runs for{" "}
                </>
              )}
              <strong className="text-slate-100 font-medium tabular-nums">
                {formatCouncilMonths(councilCompensationParsed.durationMonths)}
              </strong>
              . The schedule starts on{" "}
              <strong className="text-slate-100 font-medium">
                {formatCouncilStartDateLong(
                  councilCompensationParsed.startDate,
                )}
              </strong>
              .
            </p>

            <div className="grid sm:grid-cols-2 gap-2 sm:gap-3">
              <div className="flex gap-2.5 sm:gap-3 rounded-sm bg-slate-950/50 border border-slate-800/60 p-2.5 sm:p-3">
                <Timer
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 shrink-0 mt-0.5"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-500">
                    Cliff period
                  </p>
                  <p className="text-xs sm:text-sm text-slate-100 tabular-nums">
                    {councilCompensationParsed.cliffMonths > 0
                      ? `${formatCouncilMonths(
                        councilCompensationParsed.cliffMonths,
                      )} lockup before any vesting`
                      : "None — vesting may begin at schedule start"}
                  </p>
                  {councilCompensationParsed.cliffMonths > 0 ? (
                    <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1.5 leading-snug">
                      Approx. cliff ends{" "}
                      <span className="text-slate-400">
                        {formatCouncilStartDateLong(
                          addCalendarMonthsToIsoDate(
                            councilCompensationParsed.startDate,
                            councilCompensationParsed.cliffMonths,
                          ),
                        )}
                      </span>
                    </p>
                  ) : (
                    <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1.5 leading-snug">
                      No separate cliff — cliff end matches schedule start.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2.5 sm:gap-3 rounded-sm bg-slate-950/50 border border-slate-800/60 p-2.5 sm:p-3">
                <Calendar
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 shrink-0 mt-0.5"
                  aria-hidden
                />
                <div>
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-500">
                    Vesting length
                  </p>
                  <p className="text-xs sm:text-sm text-slate-100 tabular-nums">
                    {formatCouncilMonths(
                      councilCompensationParsed.durationMonths,
                    )}{" "}
                    total
                  </p>
                </div>
              </div>
            </div>

            {firstTxnId && (
              <p className="text-[10px] sm:text-xs text-slate-500 font-normal pt-2 border-t border-slate-800/50 leading-relaxed">
                <a
                  href={`https://voiager.xyz/transaction/${firstTxnId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-500/90 hover:text-sky-400 inline-flex items-center gap-1"
                >
                  View on Explorer
                  <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                </a>
              </p>
            )}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            {
              label: "Total amount",
              value: totalAmountSummary,
            },
            {
              label: "Vested",
              value: snapshot
                ? `${snapshot.vested.toLocaleString(undefined, { maximumFractionDigits: 6 })} VOI`
                : "—",
            },
            {
              label: "Remaining",
              value: snapshot
                ? `${snapshot.remaining.toLocaleString(undefined, { maximumFractionDigits: 6 })} VOI`
                : "—",
            },
            {
              label: "Schedule start",
              value: createdSummaryDisplay,
            },
          ].map((c) => (
            <Card
              key={c.label}
              className="grant-panel border transition-colors hover:border-sky-950/70"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {c.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-slate-100 tabular-nums tracking-tight">
                  {c.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Grant details table */}
          <Card className="grant-panel">
            <CardHeader>
              <CardTitle className="text-base font-semibold tracking-tight text-slate-100">
                Grant details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow className="grant-table-row border-slate-800/80">
                    <TableCell className="text-slate-500 text-sm w-[40%]">
                      Application ID
                    </TableCell>
                    <TableCell className="font-mono text-sm text-sky-400">
                      {numericId}
                    </TableCell>
                  </TableRow>
                  <TableRow className="grant-table-row border-slate-800/80">
                    <TableCell className="text-slate-500 text-sm">Recipient</TableCell>
                    <TableCell>
                      {grant?.recipientLabel ||
                        (chainGlobal
                          ? encodeGlobalAddress(chainGlobal.owner)
                          : "—")}
                    </TableCell>
                  </TableRow>
                  <TableRow className="grant-table-row border-slate-800/80">
                    <TableCell className="text-slate-500 text-sm">
                      Application address
                    </TableCell>
                    <TableCell className="font-mono text-sm break-all">
                      {grantApplicationAddress ?? "—"}
                    </TableCell>
                  </TableRow>
                  <TableRow className="grant-table-row border-slate-800/80 align-top">
                    <TableCell className="text-slate-500 text-sm">
                      Schedule start (funding)
                    </TableCell>
                    <TableCell className="text-sm text-slate-200">
                      {chainVestingSnap.ok ? (
                        <span className="tabular-nums">
                          {formatScheduleDateTime(chainVestingSnap.fundingMs)}
                        </span>
                      ) : grant ? (
                        <span className="space-y-1 block">
                          <span className="tabular-nums">
                            {formatScheduleDateTime(
                              grantScheduleStartMs(grant),
                            )}
                          </span>
                          <span className="block text-xs text-slate-500 font-normal">
                            From saved grant (approximate schedule)
                          </span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow className="grant-table-row border-slate-800/80 align-top">
                    <TableCell className="text-slate-500 text-sm">
                      Cliff period (lockup)
                    </TableCell>
                    <TableCell>
                      {chainVestingSnap.ok ? (
                        <div className="space-y-2 text-sm">
                          <p className="text-slate-100">
                            {chainVestingSnap.lockupSec === 0n ? (
                              "No lockup — cliff ends when funding is recorded on-chain."
                            ) : (
                              (() => {
                                const lock = formatLockupDelayDetail(
                                  chainVestingSnap.lockupSec,
                                );
                                return (
                                  <>
                                    <span className="font-medium">
                                      {lock.summary}
                                    </span>
                                    {lock.detail ? (
                                      <span className="block text-xs text-slate-500 font-normal mt-1.5 leading-snug">
                                        {lock.detail}
                                      </span>
                                    ) : null}
                                  </>
                                );
                              })()
                            )}
                          </p>
                          {chainGlobal &&
                            chainVestingSnap.lockupSec !== 0n &&
                            (() => {
                              const line = formatLockupTimesPeriodSeconds(
                                chainVestingSnap.lockupSec,
                                chainGlobal.periodSeconds?.asBigInt(),
                                chainGlobal.distributionSeconds?.asBigInt(),
                              );
                              return line ? (
                                <p className="text-[11px] text-slate-500 font-mono leading-snug mt-1.5 break-all">
                                  {line}
                                </p>
                              ) : null;
                            })()}
                          <p className="text-xs text-slate-500 leading-relaxed">
                            On-chain, cliff length is the{" "}
                            <span className="text-slate-400">lockup_delay</span> global
                            (seconds). For factory schedules it is{" "}
                            <span className="text-slate-400">
                              lockup periods × period_seconds
                            </span>{" "}
                            (same step as vesting slices when aligned). During the cliff,{" "}
                            <span className="text-slate-400">no amount vests</span>; after
                            it ends, the vesting row below applies.
                          </p>
                          <div className="text-xs pt-2 border-t border-slate-800/70 space-y-1">
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5 items-baseline">
                              <span className="text-slate-500 shrink-0">
                                Cliff ends
                              </span>
                              <span className="text-slate-100 font-medium tabular-nums">
                                {formatScheduleDateTime(
                                  chainVestingSnap.cliffEnd,
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : grant ? (
                        <div className="space-y-2 text-sm">
                          <p className="text-slate-100 tabular-nums">
                            {grant.lockupMonths > 0 ? (
                              <>
                                {grant.lockupMonths}{" "}
                                {grant.lockupMonths === 1 ? "month" : "months"}{" "}
                                <span className="text-slate-500 font-normal">
                                  (approx., from saved grant)
                                </span>
                              </>
                            ) : (
                              "No lockup — cliff ends at schedule start."
                            )}
                          </p>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            During the cliff, nothing vests. After it ends,
                            vesting follows the duration in this grant.
                          </p>
                          {snapshot ? (
                            <div className="text-xs pt-2 border-t border-slate-800/70">
                              <div className="flex flex-wrap gap-x-2 gap-y-0.5 items-baseline">
                                <span className="text-slate-500 shrink-0">
                                  Cliff ends (approx.)
                                </span>
                                <span className="text-slate-100 font-medium tabular-nums">
                                  {formatScheduleDateTime(snapshot.cliffEnd)}
                                </span>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : councilCompensationParsed ? (
                        <div className="space-y-2 text-sm">
                          <p className="text-slate-100">
                            {councilCompensationParsed.cliffMonths > 0 ? (
                              <>
                                {formatCouncilMonths(
                                  councilCompensationParsed.cliffMonths,
                                )}{" "}
                                lockup
                                <span className="text-slate-500 font-normal">
                                  {" "}
                                  (from council note; connect wallet for
                                  on-chain lockup)
                                </span>
                              </>
                            ) : (
                              "No cliff in note — vesting may begin at schedule start."
                            )}
                          </p>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            The cliff is the period after funding when no amount
                            vests until the cliff ends.
                          </p>
                          {councilCompensationParsed.cliffMonths > 0 ? (
                            <div className="text-xs pt-2 border-t border-slate-800/70">
                              <div className="flex flex-wrap gap-x-2 gap-y-0.5 items-baseline">
                                <span className="text-slate-500 shrink-0">
                                  Approx. cliff ends
                                </span>
                                <span className="text-slate-100 font-medium">
                                  {formatCouncilStartDateLong(
                                    addCalendarMonthsToIsoDate(
                                      councilCompensationParsed.startDate,
                                      councilCompensationParsed.cliffMonths,
                                    ),
                                  )}
                                </span>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow className="grant-table-row border-slate-800/80">
                    <TableCell className="text-slate-500 text-sm">
                      Vesting period
                    </TableCell>
                    <TableCell>
                      {chainVestingSnap.ok ? (
                        <span className="space-y-1 block">
                          <span>
                            {chainVestingSnap.lumpSumPostCliff
                              ? "None (lump sum after cliff)"
                              : chainVestingSnap.vestingDurationSec > 0n
                                ? `${formatDurationSeconds(chainVestingSnap.vestingDurationSec)} · ${formatApproxMonthsFromSeconds(chainVestingSnap.vestingDurationSec)}`
                                : "—"}
                          </span>
                          {chainVestingSnap.distributionCount > 0n &&
                            chainVestingSnap.distributionSeconds > 0n && (
                              <span className="block text-xs text-slate-500">
                                {chainVestingSnap.distributionCount.toString()}{" "}
                                distributions ×{" "}
                                {formatDurationSeconds(
                                  chainVestingSnap.distributionSeconds
                                )}{" "}
                                each
                              </span>
                            )}
                        </span>
                      ) : grant ? (
                        `${grant.vestingMonths} months`
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow className="grant-table-row border-slate-800/80">
                    <TableCell className="text-slate-500 text-sm">
                      {chainVestingSnap.ok &&
                        chainVestingSnap.distributionCount > 0n
                        ? "Per distribution"
                        : "Monthly unlock"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {chainVestingSnap.ok ? (
                        chainVestingSnap.lumpSumPostCliff ? (
                          "Lump sum after cliff"
                        ) : chainVestingSnap.distributionCount > 0n ? (
                          `${(
                            chainVestingSnap.totalVoi /
                            Number(chainVestingSnap.distributionCount)
                          ).toLocaleString(undefined, {
                            maximumFractionDigits: 6,
                          })} VOI`
                        ) : chainVestingSnap.vestingDurationSec > 0n ? (
                          `${(
                            (chainVestingSnap.totalVoi * 30 * 24 * 3600) /
                            Number(chainVestingSnap.vestingDurationSec)
                          ).toLocaleString(undefined, {
                            maximumFractionDigits: 6,
                          })} VOI / mo (linear, approx.)`
                        ) : (
                          "—"
                        )
                      ) : grant && grant.vestingMonths > 0 ? (
                        `${monthlyUnlockVoi(grant).toLocaleString(undefined, { maximumFractionDigits: 6 })} VOI`
                      ) : grant && grant.vestingMonths === 0 ? (
                        "Lump sum after cliff"
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Vesting progress */}
          <Card className="grant-panel">
            <CardHeader>
              <CardTitle className="text-base font-semibold tracking-tight text-slate-100">
                Vesting progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {snapshot && chartScheduleStartMs !== null ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                      <span>Vested</span>
                      <span className="text-sky-400 tabular-nums normal-case tracking-normal">
                        {pctVested.toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={pctVested}
                      className="h-2 rounded-sm bg-slate-900 [&>div]:rounded-sm [&>div]:bg-gradient-to-r [&>div]:from-sky-600 [&>div]:to-sky-400 transition-all duration-700"
                    />
                  </div>
                  <div className="rounded-sm border border-sky-950/50 bg-[#050a14]/80 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-3">
                      Locked vs time
                    </p>
                    <VestingChart
                      scheduleStartMs={chartScheduleStartMs}
                      cliffEnd={snapshot.cliffEnd}
                      vestingEnd={snapshot.vestingEnd}
                    />
                  </div>
                </>
              ) : (
                <p className="text-slate-500 text-sm">No schedule data.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* On-chain application state — only with ?debug (see isGrantDetailDebugEnabled) */}
        {showOnChainDebugCard && (
          <Card className="grant-panel">
            <CardHeader>
              <CardTitle className="text-base font-semibold tracking-tight text-slate-100">
                On-chain state
              </CardTitle>
              <p className="text-xs text-slate-500 font-normal mt-1">
                Live global state from the grant application contract. Owner, funder, and
                delegate are Algorand addresses; micro-VOI amounts are shown as VOI.
              </p>
            </CardHeader>
            <CardContent>
              {!algodClient && (
                <p className="text-sm text-slate-500">
                  Connect to a network to load on-chain data.
                </p>
              )}
              {algodClient && chainLoading && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  Loading application state…
                </div>
              )}
              {algodClient && !chainLoading && chainError && (
                <p className="text-sm text-amber-200/90 leading-relaxed">
                  Could not read this application&apos;s globals: {chainError}
                </p>
              )}
              {algodClient && !chainLoading && !chainError && chainRows && (
                <div className="space-y-3">
                  {!showChainStateTable ? (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-sm border border-slate-800/70 bg-slate-950/40 px-3 py-3">
                      <p className="text-sm text-slate-400">
                        {chainRows.length} global key
                        {chainRows.length === 1 ? "" : "s"} loaded. Table hidden by
                        default.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="grant-btn-outline shrink-0"
                        onClick={() => setShowChainStateTable(true)}
                        aria-expanded={false}
                      >
                        <ChevronDown className="w-3.5 h-3.5 mr-2" />
                        Show on-chain table
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-slate-200 h-8 text-xs"
                          onClick={() => setShowChainStateTable(false)}
                          aria-expanded
                        >
                          <ChevronUp className="w-3.5 h-3.5 mr-1" />
                          Hide table
                        </Button>
                      </div>
                      <Table>
                        <TableBody>
                          {chainRowsPage.map((row) => (
                            <TableRow
                              key={row.label}
                              className="grant-table-row border-slate-800/80"
                            >
                              <TableCell className="text-slate-500 text-sm w-[40%]">
                                {row.label}
                              </TableCell>
                              <TableCell className="font-mono text-sm text-slate-200 break-all">
                                {row.value}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {chainRows.length > ON_CHAIN_STATE_PAGE_SIZE && (
                        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="grant-btn-outline h-8 text-xs shrink-0"
                            disabled={chainStatePage <= 0}
                            onClick={() =>
                              setChainStatePage((p) => Math.max(0, p - 1))
                            }
                          >
                            <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                            Previous
                          </Button>
                          <span className="text-xs text-slate-500 tabular-nums text-center min-w-0">
                            Page {chainStatePage + 1} of {chainStatePageCount}
                            <span className="text-slate-600">
                              {" "}
                              ({chainRows.length} keys)
                            </span>
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="grant-btn-outline h-8 text-xs shrink-0"
                            disabled={chainStatePage >= chainStatePageCount - 1}
                            onClick={() =>
                              setChainStatePage((p) =>
                                Math.min(chainStatePageCount - 1, p + 1)
                              )
                            }
                          >
                            Next
                            <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* First txn note (hidden when council compensation parsed successfully) */}
        {(firstTxnLoading ||
          firstTxnError ||
          !councilCompensationParsed) && (
            <Card className="grant-panel">
              <CardHeader>
                <CardTitle className="text-base font-semibold tracking-tight text-slate-100">
                  First account transaction note
                </CardTitle>
                <p className="text-xs text-slate-500 font-normal mt-1">
                  Uses <code className="text-slate-400">getApplicationAddress(appId)</code>{" "}
                  and the indexer account transaction list; note is from the chronologically
                  first match (prefer creation round). UTF-8 decoded.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {firstTxnLoading && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    Loading first account transaction…
                  </div>
                )}
                {!firstTxnLoading && firstTxnError && (
                  <p className="text-sm text-amber-200/90 leading-relaxed">{firstTxnError}</p>
                )}
                {!firstTxnLoading && !firstTxnError && firstTxnNote !== null && firstTxnNote === "" && (
                  <p className="text-sm text-slate-500">No note on this transaction.</p>
                )}
                {!firstTxnLoading &&
                  !firstTxnError &&
                  councilCompensationUnparsed && (
                    <p className="text-xs text-amber-200/90">
                      This note looks like Council Compensation but the structured lines
                      could not be parsed. See raw text below.
                    </p>
                  )}
                {!firstTxnLoading && !firstTxnError && firstTxnNote && (
                  <div>
                    <p className="text-sm text-slate-200 whitespace-pre-wrap break-words">
                      {firstTxnNote}
                    </p>
                  </div>
                )}
                {!firstTxnLoading && !firstTxnError && firstTxnId && (
                  <a
                    href={`https://voiager.xyz/transaction/${firstTxnId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-500 hover:text-sky-400 inline-flex items-center gap-1"
                  >
                    Open transaction
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </CardContent>
            </Card>
          )}

        {/* Claim history timeline */}
        {milestones.length > 0 && (
          <Card className="grant-panel">
            <CardHeader>
              <CardTitle className="text-base font-semibold tracking-tight text-slate-100">
                Claim history
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pl-8 space-y-0">
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-sky-950/80" />
                {milestones.map((m) => (
                  <div
                    key={m.id}
                    className="relative pb-10 last:pb-2 flex gap-4"
                  >
                    <div className="absolute left-0 top-1.5">
                      {m.state === "claimed" && (
                        <div className="w-6 h-6 rounded-sm bg-slate-700 border border-slate-600 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-slate-200" />
                        </div>
                      )}
                      {m.state === "available" && (
                        <div className="w-6 h-6 rounded-sm bg-emerald-950/50 border border-emerald-500/60 flex items-center justify-center animate-pulse shadow-[0_0_14px_rgba(16,185,129,0.35)]">
                          <Circle className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                        </div>
                      )}
                      {m.state === "upcoming" && (
                        <div className="w-6 h-6 rounded-sm bg-slate-900/80 border border-slate-700/60 opacity-50" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5 pl-11">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-medium text-slate-200">{m.label}</span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-500">
                          {m.state}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 tabular-nums">
                        {new Date(m.dateMs).toLocaleString()}
                      </p>
                      <p className="text-sky-400 tabular-nums mt-1">
                        {m.amountVoi.toLocaleString(undefined, {
                          maximumFractionDigits: 6,
                        })}{" "}
                        VOI
                      </p>
                      {m.txId && (
                        <a
                          href={`https://voiager.xyz/transaction/${m.txId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-slate-500 hover:text-sky-400 mt-1 inline-flex items-center gap-1"
                        >
                          {m.txId.slice(0, 10)}…
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 pb-12 sm:items-center">
          {showClaim && isConnectedRecipient && (
            <Button
              className="grant-btn-primary px-6"
              disabled={claimSubmitting}
              onClick={() => void onClaim()}
            >
              {claimSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Claiming…
                </>
              ) : (
                "Claim available tokens"
              )}
            </Button>
          )}
          <Button className="grant-btn-outline px-5" onClick={copyId}>
            <Copy className="w-4 h-4 mr-2" />
            Copy grant ID
          </Button>
          <Button className="grant-btn-outline px-5" asChild>
            <a
              href={EXPLORER_APP(numericId)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View on explorer
            </a>
          </Button>
          {showRevokePayment && (
            <Button
              type="button"
              className="grant-btn-danger px-5"
              disabled={revokeSubmitting || claimSubmitting}
              onClick={() => setRevokeConfirmOpen(true)}
            >
              {revokeSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Revoking…
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4 mr-2" />
                  Revoke payment
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <IdentitySheet
        isOpen={showIdentitySheet}
        onOpenChange={setShowIdentitySheet}
      />

      <AlertDialog
        open={revokeConfirmOpen}
        onOpenChange={(open) => {
          if (!open && revokeSubmitting) return;
          setRevokeConfirmOpen(open);
        }}
      >
        <AlertDialogContent className="grant-panel border-slate-800 bg-slate-950 text-slate-100 sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">
              Revoke payment?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400 text-sm leading-relaxed">
              This will call{" "}
              <code className="text-sky-400/95 font-mono text-xs">abort_funding</code>{" "}
              on the grant application. On-chain rules apply; remaining escrow may be
              returned to the funder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel
              className="grant-btn-outline mt-0 border-slate-700 text-slate-200 hover:bg-slate-900"
              disabled={revokeSubmitting}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              className="grant-btn-danger px-5"
              disabled={revokeSubmitting}
              onClick={() => void onRevokePayment()}
            >
              {revokeSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Revoking…
                </>
              ) : (
                "Confirm revoke"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GrantDetail;
