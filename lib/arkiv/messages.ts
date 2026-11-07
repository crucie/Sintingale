import { keccak256, toHex } from "viem";
import type { AttrsByType, AuthorizedType, InviteAcceptAttrs } from "../schema";

/** Deterministic JSON: object keys sorted at every level. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

const digest = (type: string, attrs: object) => keccak256(toHex(canonical({ type, ...attrs })));

function summary(type: AuthorizedType, a: Record<string, unknown>): string {
  switch (type) {
    case "org":
      return `Link ${a.ensName} to Sintingale, paying out to ${a.payout}`;
    case "project":
      return `Save project "${a.name}" (version ${a.version}, ${(a.shares as unknown[]).length} shares)`;
    case "member":
      return `Approve ${a.subname} as ${a.role} (${a.address})`;
    case "invite":
      return `Invite ${a.label} as ${a.role}${a.inviteeAddress ? ` for ${a.inviteeAddress}` : ""}`;
    case "grant":
      return `Allow agent ${a.agentName} to ${a.scope}, max ${a.maxAmount} per invoice`;
    case "revocation":
      return `Revoke ${a.targetType} ${a.targetId}`;
  }
}

type Unsigned<T> = Omit<T, "authSig">;

/** The text an org owner signs to authorise an entity. Readable in the wallet prompt. */
export function authMessage<T extends AuthorizedType>(type: T, attrs: Unsigned<AttrsByType[T]> | AttrsByType[T]): string {
  const { authSig: _ignored, ...rest } = attrs as Record<string, unknown>;
  void _ignored;
  return [
    "Sintingale authorization",
    "",
    summary(type, rest),
    `Org: ${rest.orgId}`,
    `Digest: ${digest(type, rest)}`,
  ].join("\n");
}

export function acceptMessage(attrs: Omit<InviteAcceptAttrs, "acceptSig"> | InviteAcceptAttrs): string {
  const { acceptSig: _ignored, ...rest } = attrs as Record<string, unknown>;
  void _ignored;
  return [
    "Sintingale invite acceptance",
    "",
    `Join ${rest.orgId} as ${rest.label}.${rest.orgId}`,
    `Digest: ${digest("inviteAccept", rest)}`,
  ].join("\n");
}

/** What an agent signs for each API call. The body is hashed so it cannot be swapped. */
export function agentRequestMessage(p: { method: string; path: string; timestamp: number; nonce: string; body: string }): string {
  return [
    "Sintingale agent request",
    `${p.method.toUpperCase()} ${p.path}`,
    `Timestamp: ${p.timestamp}`,
    `Nonce: ${p.nonce}`,
    `Body: ${keccak256(toHex(p.body))}`,
  ].join("\n");
}
