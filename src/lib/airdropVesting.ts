import type { GrantLifecycleStatus } from "@/lib/grantStorage";

/** Minimal global-state shape for vesting math (Algokit `IntegerState`). */
export type AirdropGlobalVestingFields = {
  funding?: { asBigInt(): bigint };
  total?: { asBigInt(): bigint };
  lockupDelay?: { asBigInt(): bigint };
  /** Seconds per period; with factory grants, cliff = `lockup_delay` (count) × `period_seconds`. */
  periodSeconds?: { asBigInt(): bigint };
  vestingDelay?: { asBigInt(): bigint };
  distributionCount?: { asBigInt(): bigint };
  distributionSeconds?: { asBigInt(): bigint };
};

const SEC_PER_DAY = 86400n;
const APPROX_MONTH_SEC = 30n * SEC_PER_DAY;

function intBi(x: AirdropGlobalVestingFields[keyof AirdropGlobalVestingFields]): bigint {
  return x ? x.asBigInt() : 0n;
}

/**
 * `lockup_delay` may be either total seconds (large) or a period count (small) × step.
 * When count < step and count ≤ 60, treat as count × `period_seconds` (else `distribution_seconds`).
 */
function lockupDelayToTotalSeconds(
  lockupRaw: bigint,
  periodSeconds: bigint,
  distributionSeconds: bigint
): bigint {
  const step =
    periodSeconds > 0n
      ? periodSeconds
      : distributionSeconds > 0n
        ? distributionSeconds
        : 0n;
  const maxPlausiblePeriodCount = 60n;
  if (
    step > 0n &&
    lockupRaw > 0n &&
    lockupRaw < step &&
    lockupRaw <= maxPlausiblePeriodCount
  ) {
    return lockupRaw * step;
  }
  return lockupRaw;
}

export type AirdropVestingSnapshot =
  | {
      ok: true;
      vested: number;
      remaining: number;
      pctVested: number;
      cliffEnd: number;
      vestingEnd: number;
      fundingMs: number;
      totalVoi: number;
      /** True when post-cliff amount vests in one lump (no vesting window). */
      lumpSumPostCliff: boolean;
      lockupSec: bigint;
      vestingDurationSec: bigint;
      distributionCount: bigint;
      distributionSeconds: bigint;
    }
  | { ok: false };

/**
 * Vested / remaining from airdrop globals: schedule starts at `funding` (unix seconds).
 *
 * **Cliff:** `cliffEnd = funding + lockup_seconds`. The `lockup_delay` global may store either
 * **total seconds** (large) or a **period count** (small); when count &lt; `period_seconds` and
 * ≤ 60 we interpret **count × period_seconds** (else **distribution_seconds**), matching
 * factory **lockup × period_seconds**.
 *
 * **Vesting window:** `distribution_count × distribution_seconds` when both are set,
 * otherwise `vesting_delay`. Linear accrual over the vesting window.
 */
export function computeAirdropVestingSnapshot(
  g: AirdropGlobalVestingFields,
  nowMs: number
): AirdropVestingSnapshot {
  const fundingSec = intBi(g.funding);
  const totalMicro = intBi(g.total);
  if (fundingSec === 0n || totalMicro === 0n) {
    return { ok: false };
  }

  const dc = intBi(g.distributionCount);
  const ds = intBi(g.distributionSeconds);
  const ps = intBi(g.periodSeconds);
  const lockupSec = lockupDelayToTotalSeconds(intBi(g.lockupDelay), ps, ds);
  const vd = intBi(g.vestingDelay);
  const distWindow = dc > 0n && ds > 0n ? dc * ds : 0n;
  const vestingDurationSec = distWindow > 0n ? distWindow : vd;

  const totalVoi = Number(totalMicro) / 1e6;
  const fundedMs = Number(fundingSec) * 1000;
  const cliffEnd = fundedMs + Number(lockupSec) * 1000;
  const lumpSumPostCliff = vestingDurationSec === 0n;

  if (lumpSumPostCliff) {
    const vestingEnd = cliffEnd;
    if (nowMs < cliffEnd) {
      return {
        ok: true,
        vested: 0,
        remaining: totalVoi,
        pctVested: 0,
        cliffEnd,
        vestingEnd,
        fundingMs: fundedMs,
        totalVoi,
        lumpSumPostCliff: true,
        lockupSec,
        vestingDurationSec: 0n,
        distributionCount: dc,
        distributionSeconds: ds,
      };
    }
    return {
      ok: true,
      vested: totalVoi,
      remaining: 0,
      pctVested: 100,
      cliffEnd,
      vestingEnd,
      fundingMs: fundedMs,
      totalVoi,
      lumpSumPostCliff: true,
      lockupSec,
      vestingDurationSec: 0n,
      distributionCount: dc,
      distributionSeconds: ds,
    };
  }

  const vestingEnd = cliffEnd + Number(vestingDurationSec) * 1000;

  if (nowMs >= vestingEnd) {
    return {
      ok: true,
      vested: totalVoi,
      remaining: 0,
      pctVested: 100,
      cliffEnd,
      vestingEnd,
      fundingMs: fundedMs,
      totalVoi,
      lumpSumPostCliff: false,
      lockupSec,
      vestingDurationSec,
      distributionCount: dc,
      distributionSeconds: ds,
    };
  }
  if (nowMs < cliffEnd) {
    return {
      ok: true,
      vested: 0,
      remaining: totalVoi,
      pctVested: 0,
      cliffEnd,
      vestingEnd,
      fundingMs: fundedMs,
      totalVoi,
      lumpSumPostCliff: false,
      lockupSec,
      vestingDurationSec,
      distributionCount: dc,
      distributionSeconds: ds,
    };
  }

  const t = (nowMs - cliffEnd) / (vestingEnd - cliffEnd);
  const vested = totalVoi * t;
  return {
    ok: true,
    vested,
    remaining: totalVoi - vested,
    pctVested: t * 100,
    cliffEnd,
    vestingEnd,
    fundingMs: fundedMs,
    totalVoi,
    lumpSumPostCliff: false,
    lockupSec,
    vestingDurationSec,
    distributionCount: dc,
    distributionSeconds: ds,
  };
}

/**
 * Seconds per month slice emitted by CompensationFactory → Airdrop `template` call
 * (TEAL literal `2630000`, ~30.38 days).
 */
export const FACTORY_MONTH_SECONDS = 2_630_000;

export type FactoryPreviewMilestoneState = "available" | "upcoming";

export type FactoryPreviewMilestone = {
  id: string;
  label: string;
  dateMs: number;
  amountVoi: number;
  state: FactoryPreviewMilestoneState;
};

/**
 * Project per-distribution claim times for a grant created via `CompensationFactory.create`,
 * matching {@link computeAirdropVestingSnapshot} / grant detail milestones when globals use
 * factory defaults (monthly slices, `distribution_seconds` = {@link FACTORY_MONTH_SECONDS}).
 */
export function projectFactoryClaimMilestones(params: {
  fundingUnix: number;
  lockupMonths: number;
  vestingMonths: number;
  totalVoi: number;
  nowMs: number;
}): FactoryPreviewMilestone[] {
  const { fundingUnix, lockupMonths, vestingMonths, totalVoi, nowMs } = params;
  const fundedMs = fundingUnix * 1000;
  const monthSec = FACTORY_MONTH_SECONDS;
  const lockupSec = lockupMonths * monthSec;
  const cliffEnd = fundedMs + lockupSec * 1000;
  const n = vestingMonths;

  if (n <= 0) {
    const state: FactoryPreviewMilestoneState =
      nowMs >= cliffEnd ? "available" : "upcoming";
    return [
      {
        id: "full",
        label: "Full unlock (after cliff)",
        dateMs: cliffEnd,
        amountVoi: totalVoi,
        state,
      },
    ];
  }

  const stepMs = monthSec * 1000;
  const per = totalVoi / n;
  const out: FactoryPreviewMilestone[] = [];
  for (let i = 1; i <= n; i++) {
    const dateMs = cliffEnd + i * stepMs;
    const state: FactoryPreviewMilestoneState =
      nowMs >= dateMs ? "available" : "upcoming";
    out.push({
      id: `dist-${i}`,
      label: `Distribution ${i}/${n}`,
      dateMs,
      amountVoi: per,
      state,
    });
  }
  return out;
}

export function airdropLifecycleFromSnapshot(
  cliffEnd: number,
  vestingEnd: number,
  nowMs: number,
  lumpSumPostCliff: boolean
): GrantLifecycleStatus {
  if (lumpSumPostCliff) {
    return nowMs < cliffEnd ? "pending" : "completed";
  }
  if (nowMs < cliffEnd) return "pending";
  if (nowMs >= vestingEnd) return "completed";
  return "active";
}

/** Human-readable duration from seconds (chain-native). */
export function formatDurationSeconds(sec: bigint): string {
  if (sec === 0n) return "0";
  const days = sec / SEC_PER_DAY;
  if (days > 0n) {
    return `${days} day${days === 1n ? "" : "s"}`;
  }
  return `${sec} s`;
}

/**
 * Approximate calendar months (30-day) for durations that are not factory-aligned.
 * Prefer {@link formatLockupDelayDetail} for `lockup_delay` globals from Grant Pay / factory.
 */
export function formatApproxMonthsFromSeconds(sec: bigint): string {
  if (sec === 0n) return "0";
  const mo = Number(sec) / Number(APPROX_MONTH_SEC);
  if (mo > 0 && mo < 0.05) {
    return "<0.1 month (calendar approx.)";
  }
  const rounded = mo.toFixed(1).replace(/\.0$/, "");
  const n = parseFloat(rounded);
  const unit = n === 1 ? "month" : "months";
  return `${rounded} ${unit} (calendar approx.)`;
}

const FMS_BI = BigInt(FACTORY_MONTH_SECONDS);

/**
 * Display for `lockup_delay` (seconds): factory grants use whole multiples of
 * {@link FACTORY_MONTH_SECONDS} (~30.38 days). Avoids misleading “30 days” for one factory month.
 */
export function formatLockupDelayDetail(lockupSec: bigint): {
  summary: string;
  detail?: string;
} {
  if (lockupSec === 0n) return { summary: "" };
  if (lockupSec % FMS_BI === 0n) {
    const n = lockupSec / FMS_BI;
    const days = (Number(lockupSec) / 86400).toFixed(2);
    return {
      summary: `${n} mo lockup`,
      detail: `≈ ${days} calendar days · ${lockupSec.toString()} s on-chain`,
    };
  }
  return {
    summary: `${formatDurationSeconds(lockupSec)} · ${formatApproxMonthsFromSeconds(lockupSec)}`,
  };
}

/**
 * When `lockup_delay` divides evenly by `period_seconds` (or, if unset, `distribution_seconds`),
 * show the product: lockup periods × seconds per period = lockup_delay.
 */
export function formatLockupTimesPeriodSeconds(
  lockupSec: bigint,
  periodSeconds?: bigint,
  distributionSeconds?: bigint
): string | null {
  if (lockupSec === 0n) return null;
  const step =
    periodSeconds !== undefined && periodSeconds > 0n
      ? periodSeconds
      : distributionSeconds !== undefined && distributionSeconds > 0n
        ? distributionSeconds
        : undefined;
  if (step === undefined || lockupSec % step !== 0n) return null;
  const periods = lockupSec / step;
  const label =
    periodSeconds !== undefined && periodSeconds > 0n
      ? "period_seconds"
      : "distribution_seconds";
  return `${periods} × ${step.toString()} s (${label}) = ${lockupSec.toString()} s lockup_delay`;
}
