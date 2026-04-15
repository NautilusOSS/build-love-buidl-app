import type { GrantLifecycleStatus } from "@/lib/grantStorage";

/** Minimal global-state shape for vesting math (Algokit `IntegerState`). */
export type AirdropGlobalVestingFields = {
  funding?: { asBigInt(): bigint };
  total?: { asBigInt(): bigint };
  lockupDelay?: { asBigInt(): bigint };
  vestingDelay?: { asBigInt(): bigint };
  distributionCount?: { asBigInt(): bigint };
  distributionSeconds?: { asBigInt(): bigint };
};

const SEC_PER_DAY = 86400n;
const APPROX_MONTH_SEC = 30n * SEC_PER_DAY;

function intBi(x: AirdropGlobalVestingFields[keyof AirdropGlobalVestingFields]): bigint {
  return x ? x.asBigInt() : 0n;
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
 * Vested / remaining from airdrop globals: schedule starts at `funding` (unix seconds),
 * cliff = funding + lockup_delay, vesting window = distribution_count × distribution_seconds
 * when both are set, otherwise `vesting_delay` seconds. Linear accrual over the vesting window.
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

  const lockupSec = intBi(g.lockupDelay);
  const dc = intBi(g.distributionCount);
  const ds = intBi(g.distributionSeconds);
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

/** Approximate months (30-day) for labels that still read "months" in the UI. */
export function formatApproxMonthsFromSeconds(sec: bigint): string {
  if (sec === 0n) return "0";
  const mo = (Number(sec) / Number(APPROX_MONTH_SEC)).toFixed(1).replace(/\.0$/, "");
  return `${mo} months (approx.)`;
}
