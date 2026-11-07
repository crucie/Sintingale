import { formatUsdt } from "../format";

interface GrantLike {
  scope: string;
  projectId: string;
  maxAmount: number;
  maxTotal: number;
  used: number;
}

export function grantCoversScope(grant: GrantLike, action: string, projectId?: string): boolean {
  const scopes = grant.scope.split(",").map((s) => s.trim());
  if (!scopes.includes(action)) return false;
  return !grant.projectId || grant.projectId === projectId;
}

/** Per-invoice cap and cumulative cap over the grant's lifetime. */
export function checkGrantCaps(grant: GrantLike, amount: number): { ok: true } | { ok: false; reason: string } {
  if (amount > grant.maxAmount) {
    return { ok: false, reason: `${formatUsdt(amount)} is over the per-invoice cap of ${formatUsdt(grant.maxAmount)}.` };
  }
  if (grant.used + amount > grant.maxTotal) {
    const left = Math.max(0, grant.maxTotal - grant.used);
    return { ok: false, reason: `Only ${formatUsdt(left)} left of the grant's ${formatUsdt(grant.maxTotal)} total cap.` };
  }
  return { ok: true };
}
