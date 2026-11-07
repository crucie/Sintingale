export const TOTAL_BPS = 10_000;

export interface ShareInput {
  account: string;
  bps: number;
}

export type ShareError =
  | "EMPTY"
  | "TOO_MANY"
  | "ZERO_ADDRESS"
  | "INVALID_ADDRESS"
  | "ZERO_BPS"
  | "DUPLICATE_ACCOUNT"
  | "BPS_SUM";

/** Mirrors ProjectSplitter._setShares so the UI rejects exactly what the contract would. */
export function validateShares(shares: ShareInput[]): ShareError | null {
  if (shares.length === 0) return "EMPTY";
  if (shares.length > 50) return "TOO_MANY";
  const seen = new Set<string>();
  let total = 0;
  for (const s of shares) {
    if (!/^0x[0-9a-fA-F]{40}$/.test(s.account)) return "INVALID_ADDRESS";
    if (/^0x0{40}$/i.test(s.account)) return "ZERO_ADDRESS";
    if (!Number.isInteger(s.bps) || s.bps <= 0) return "ZERO_BPS";
    const key = s.account.toLowerCase();
    if (seen.has(key)) return "DUPLICATE_ACCOUNT";
    seen.add(key);
    total += s.bps;
  }
  return total === TOTAL_BPS ? null : "BPS_SUM";
}

/**
 * Turns contribution weights into basis points that sum to exactly 10,000,
 * using the largest-remainder method (ties go to the earlier row).
 */
export function contributionsToBps(contributions: number[]): number[] {
  const total = contributions.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0) return contributions.map(() => 0);
  const raw = contributions.map((c) => (Math.max(0, c) / total) * TOTAL_BPS);
  const bps = raw.map(Math.floor);
  let remaining = TOTAL_BPS - bps.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; remaining > 0; k = (k + 1) % order.length) {
    if (contributions[order[k].i] > 0) {
      bps[order[k].i] += 1;
      remaining -= 1;
    }
  }
  return bps;
}

export interface Credit {
  account: string;
  amount: number;
  bps: number;
}

/** Same integer math as ProjectSplitter.payProjectInvoice: floor per share, dust to the owner. */
export function computeCredits(amount: number, shares: ShareInput[], owner: string): Credit[] {
  const credits: Credit[] = [];
  let credited = 0;
  for (const s of shares) {
    const part = Math.floor((amount * s.bps) / TOTAL_BPS);
    if (part === 0) continue;
    credits.push({ account: s.account.toLowerCase(), amount: part, bps: s.bps });
    credited += part;
  }
  const dust = amount - credited;
  if (dust > 0) credits.push({ account: owner.toLowerCase(), amount: dust, bps: 0 });
  return credits;
}

export interface AddressSnapshot {
  subname: string;
  address: string;
}

export interface AddressDiff {
  subname: string;
  stored: string;
  current: string | null;
}

/** Members whose ENS name now resolves somewhere other than the address captured on-chain. */
export function diffAddresses(stored: AddressSnapshot[], current: Record<string, string | null>): AddressDiff[] {
  return stored
    .filter((s) => (current[s.subname] ?? null)?.toLowerCase() !== s.address.toLowerCase())
    .map((s) => ({ subname: s.subname, stored: s.address, current: current[s.subname] ?? null }));
}

export const formatBps = (bps: number) => `${(bps / 100).toFixed(2)}%`;
