const STORAGE_KEY = "build-love-buidl-grants";

export type GrantLifecycleStatus = "pending" | "active" | "completed";

export interface StoredGrantClaim {
  txId: string;
  amountVoi: number;
  claimedAt: string;
}

export interface StoredGrant {
  id: number;
  recipientAddress: string;
  recipientLabel?: string;
  totalAmountVoi: number;
  lockupMonths: number;
  vestingMonths: number;
  createdAt: string;
  /** Start of funding (matches on-chain `funding` unix); used for cliff / vesting schedule. */
  fundingAt?: string;
  creationTxId?: string;
  claims?: StoredGrantClaim[];
}

export function loadGrants(): StoredGrant[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredGrant[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGrants(grants: StoredGrant[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(grants));
}

export function upsertGrant(grant: StoredGrant): void {
  const grants = loadGrants();
  const i = grants.findIndex((g) => g.id === grant.id);
  if (i >= 0) grants[i] = { ...grants[i], ...grant };
  else grants.unshift(grant);
  saveGrants(grants);
}

/** Drop a grant from the local dashboard index only (does not change on-chain apps). */
export function removeGrant(id: number): void {
  const grants = loadGrants().filter((g) => g.id !== id);
  saveGrants(grants);
}

export function getGrantById(id: number): StoredGrant | undefined {
  return loadGrants().find((g) => g.id === id);
}

const APPROX_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

/** Schedule anchor for local grant math: funding time when set, else save time. */
export function grantScheduleStartMs(grant: StoredGrant): number {
  if (grant.fundingAt) {
    const t = new Date(grant.fundingAt).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return new Date(grant.createdAt).getTime();
}

export function computeVestingSnapshot(grant: StoredGrant, nowMs = Date.now()) {
  const scheduleStart = grantScheduleStartMs(grant);
  const cliffEnd = scheduleStart + grant.lockupMonths * APPROX_MONTH_MS;
  const total = grant.totalAmountVoi;
  const vMonths = grant.vestingMonths;

  if (vMonths === 0) {
    if (nowMs < cliffEnd) {
      return {
        vested: 0,
        remaining: total,
        pctVested: 0,
        cliffEnd,
        vestingEnd: cliffEnd,
      };
    }
    return {
      vested: total,
      remaining: 0,
      pctVested: 100,
      cliffEnd,
      vestingEnd: cliffEnd,
    };
  }

  const vestingEnd = cliffEnd + vMonths * APPROX_MONTH_MS;
  if (nowMs >= vestingEnd) {
    return {
      vested: total,
      remaining: 0,
      pctVested: 100,
      cliffEnd,
      vestingEnd,
    };
  }
  if (nowMs < cliffEnd) {
    return {
      vested: 0,
      remaining: total,
      pctVested: 0,
      cliffEnd,
      vestingEnd,
    };
  }
  const t = (nowMs - cliffEnd) / (vestingEnd - cliffEnd);
  const vested = total * t;
  return {
    vested,
    remaining: total - vested,
    pctVested: t * 100,
    cliffEnd,
    vestingEnd,
  };
}

export function grantLifecycleStatus(
  grant: StoredGrant,
  nowMs = Date.now()
): GrantLifecycleStatus {
  const scheduleStart = grantScheduleStartMs(grant);
  const cliffEnd =
    scheduleStart + grant.lockupMonths * APPROX_MONTH_MS;
  const vMonths = grant.vestingMonths;
  const vestingEnd =
    vMonths === 0 ? cliffEnd : cliffEnd + vMonths * APPROX_MONTH_MS;

  if (vMonths === 0) {
    return nowMs < cliffEnd ? "pending" : "completed";
  }
  if (nowMs < cliffEnd) return "pending";
  if (nowMs >= vestingEnd) return "completed";
  return "active";
}

export function monthlyUnlockVoi(grant: StoredGrant): number {
  if (grant.vestingMonths <= 0) return 0;
  return grant.totalAmountVoi / grant.vestingMonths;
}
