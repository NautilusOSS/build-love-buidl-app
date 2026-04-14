import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useWallet } from "@txnlab/use-wallet-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  type AirdropVestingSnapshot,
} from "@/lib/airdropVesting";
import {
  computeVestingSnapshot,
  getGrantById,
  grantLifecycleStatus,
  monthlyUnlockVoi,
  type StoredGrant,
} from "@/lib/grantStorage";
import { cn } from "@/lib/utils";
import {
  matchCouncilCompensationNote,
  parseCouncilCompensationNote,
} from "@/lib/councilCompensationNote";
import { AirdropClient } from "@/clients/AirdropClient";
import IdentitySheet from "@/components/IdentitySheet";
import algosdk from "algosdk";

const EXPLORER_APP = (appId: number) =>
  `https://voiager.xyz/application/${appId}/`;

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
        txId: claims[0]?.txId,
      },
    ];
  }

  const out: Milestone[] = [];
  for (let i = 1; i <= v; i++) {
    const dateMs =
      cliffEnd + (i * (vestingEnd - cliffEnd)) / v;
    const amountVoi = total / v;

    const matchedClaim = claims.find(
      (c) =>
        Math.abs(c.amountVoi - amountVoi) < Math.max(1e-6, total * 1e-9) ||
        Math.abs(new Date(c.claimedAt).getTime() - dateMs) < 3 * 86400000
    );

    let state: MilestoneState = "upcoming";
    if (matchedClaim) state = "claimed";
    else if (nowMs >= dateMs) state = "available";
    else state = "upcoming";

    out.push({
      id: `m-${i}`,
      label: `Vesting ${i}/${v}`,
      dateMs,
      amountVoi,
      state,
      txId: matchedClaim?.txId,
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
        txId: claims[0]?.txId,
      },
    ];
  }

  const dc = g.distributionCount?.asBigInt() ?? 0n;
  const ds = g.distributionSeconds?.asBigInt() ?? 0n;

  if (dc > 0n && ds > 0n) {
    const n = Number(dc);
    const stepMs = Number(ds) * 1000;
    const per = total / n;
    const out: Milestone[] = [];
    for (let i = 1; i <= n; i++) {
      const dateMs = cliffEnd + i * stepMs;
      const matchedClaim = claims.find(
        (c) =>
          Math.abs(c.amountVoi - per) < Math.max(1e-6, total * 1e-9) ||
          Math.abs(new Date(c.claimedAt).getTime() - dateMs) < 3 * 86400000
      );
      let state: MilestoneState = "upcoming";
      if (matchedClaim) state = "claimed";
      else if (nowMs >= dateMs) state = "available";
      else state = "upcoming";
      out.push({
        id: `dist-${i}`,
        label: `Distribution ${i}/${n}`,
        dateMs,
        amountVoi: per,
        state,
        txId: matchedClaim?.txId,
      });
    }
    return out;
  }

  const span = Math.max(vestingEnd - cliffEnd, 1);
  const monthMs = 30 * 24 * 60 * 60 * 1000;
  const steps = Math.min(24, Math.max(1, Math.ceil(span / monthMs)));
  const out: Milestone[] = [];
  for (let i = 1; i <= steps; i++) {
    const dateMs = cliffEnd + (i * span) / steps;
    const amountVoi = total / steps;
    const matchedClaim = claims.find(
      (c) =>
        Math.abs(c.amountVoi - amountVoi) < Math.max(1e-6, total * 1e-9) ||
        Math.abs(new Date(c.claimedAt).getTime() - dateMs) < 5 * 86400000
    );
    let state: MilestoneState = "upcoming";
    if (matchedClaim) state = "claimed";
    else if (nowMs >= dateMs) state = "available";
    else state = "upcoming";
    out.push({
      id: `lin-${i}`,
      label: `Vesting ${i}/${steps} (linear)`,
      dateMs,
      amountVoi,
      state,
      txId: matchedClaim?.txId,
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

const GrantDetail = () => {
  const { grantId } = useParams<{ grantId: string }>();
  const { activeAccount, algodClient } = useWallet();
  const [showIdentitySheet, setShowIdentitySheet] = useState(false);
  const numericId = grantId ? parseInt(grantId, 10) : NaN;

  const grant = useMemo(() => {
    if (Number.isNaN(numericId)) return undefined;
    return getGrantById(numericId);
  }, [numericId]);

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
  }, [algodClient, numericId]);

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
    if (grant) return new Date(grant.createdAt).getTime();
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
    if (grant) return new Date(grant.createdAt).toLocaleString();
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

  const copyId = () => {
    if (Number.isNaN(numericId)) return;
    navigator.clipboard.writeText(String(numericId));
    toast({ description: "Grant ID copied", duration: 2000 });
  };

  const onClaim = () => {
    toast({
      title: "Claim",
      description:
        "On-chain claim transactions are not wired in this build. Use your wallet with the grant application when the contract supports it.",
      duration: 5000,
    });
  };

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
                  After a{" "}
                  <strong className="text-slate-100 font-medium tabular-nums">
                    {formatCouncilMonths(councilCompensationParsed.cliffMonths)}
                  </strong>{" "}
                  cliff, vesting runs for{" "}
                </>
              ) : (
                <>Vesting runs for </>
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
                <div>
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-500">
                    Cliff period
                  </p>
                  <p className="text-xs sm:text-sm text-slate-100 tabular-nums">
                    {councilCompensationParsed.cliffMonths > 0
                      ? `${formatCouncilMonths(
                          councilCompensationParsed.cliffMonths,
                        )} before vesting`
                      : "None"}
                  </p>
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
              label: chainVestingSnap.ok ? "Schedule start" : "Created",
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
                    <TableCell className="text-slate-500 text-sm">Address</TableCell>
                    <TableCell className="font-mono text-sm break-all">
                      {grant?.recipientAddress ??
                        (chainGlobal
                          ? encodeGlobalAddress(chainGlobal.owner)
                          : "—")}
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
                      Cliff period
                    </TableCell>
                    <TableCell>
                      {chainVestingSnap.ok ? (
                        `${formatDurationSeconds(chainVestingSnap.lockupSec)} · ${formatApproxMonthsFromSeconds(chainVestingSnap.lockupSec)}`
                      ) : grant ? (
                        `${grant.lockupMonths} months`
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

        {/* On-chain application state (Airdrop contract) */}
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
                    <div className="flex-1 min-w-0 pt-0.5">
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
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 pb-12">
          {showClaim && isConnectedRecipient && (
            <Button className="grant-btn-primary px-6" onClick={onClaim}>
              Claim available tokens
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
        </div>
      </div>

      <IdentitySheet
        isOpen={showIdentitySheet}
        onOpenChange={setShowIdentitySheet}
      />
    </div>
  );
};

export default GrantDetail;
