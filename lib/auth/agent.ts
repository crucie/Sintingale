import "server-only";
import { recoverMessageAddress, type Hex } from "viem";
import { SintingaleError } from "../api";
import { agentRequestMessage } from "../arkiv/messages";
import { resolveName } from "../ens/resolve";
import { isSubnameOf } from "../ens/subnames";
import { listGrants, requireOrgEntity } from "../orgs";
import type { GrantDTO } from "../types";
import { checkGrantCaps, grantCoversScope } from "./grant-rules";

export const AGENT_HEADERS = {
  name: "x-sintingale-agent",
  signature: "x-sintingale-signature",
  timestamp: "x-sintingale-timestamp",
  nonce: "x-sintingale-nonce",
} as const;

const MAX_SKEW_SEC = 300;
const seen = globalThis as unknown as { __sintingaleAgentSigs?: Map<string, number> };
const usedSignatures = () => (seen.__sintingaleAgentSigs ??= new Map());

export const isAgentRequest = (request: Request) => request.headers.has(AGENT_HEADERS.name);

export interface VerifiedAgent {
  agentName: string;
  agentAddress: string;
  grant: GrantDTO;
}

/**
 * Verifies an agent-signed request for `action` inside `orgId`:
 * signature → ENS name resolves to the signer and is a subname of the org →
 * an unexpired, unrevoked, owner-authorised grant whose scope and caps allow it.
 */
export async function verifyAgentRequest(
  request: Request,
  rawBody: string,
  ctx: { orgId: string; action: string; projectId?: string; amount: number },
): Promise<VerifiedAgent> {
  const agentName = request.headers.get(AGENT_HEADERS.name)?.toLowerCase() ?? "";
  const signature = request.headers.get(AGENT_HEADERS.signature) ?? "";
  const timestamp = Number(request.headers.get(AGENT_HEADERS.timestamp));
  const nonce = request.headers.get(AGENT_HEADERS.nonce) ?? "";
  if (!agentName || !signature || !Number.isFinite(timestamp) || !/^[A-Za-z0-9_-]{8,64}$/.test(nonce)) {
    throw new SintingaleError("AGENT_SIGNATURE_INVALID", "Agent requests need name, signature, timestamp and nonce headers.");
  }
  if (Math.abs(Date.now() / 1000 - timestamp) > MAX_SKEW_SEC) {
    throw new SintingaleError("AGENT_SIGNATURE_INVALID", "Agent request timestamp is too old or in the future.");
  }

  const url = new URL(request.url);
  const message = agentRequestMessage({ method: request.method, path: url.pathname, timestamp, nonce, body: rawBody });
  const signer = await recoverMessageAddress({ message, signature: signature as Hex })
    .then((a) => a.toLowerCase())
    .catch(() => null);
  if (!signer) throw new SintingaleError("AGENT_SIGNATURE_INVALID", "Could not recover the agent signature.");

  const sigs = usedSignatures();
  const now = Date.now() / 1000;
  for (const [s, t] of sigs) if (t < now - MAX_SKEW_SEC) sigs.delete(s);
  if (sigs.has(signature)) throw new SintingaleError("REPLAYED", "This signed request was already used.");

  const org = await requireOrgEntity(ctx.orgId);
  if (!isSubnameOf(agentName, org.attrs.ensName)) {
    throw new SintingaleError("AGENT_NOT_IN_ORG", `${agentName} is not a subname of ${org.attrs.ensName}.`);
  }
  const resolved = await resolveName(agentName);
  if (resolved !== signer) {
    throw new SintingaleError("AGENT_NAME_MISMATCH", `${agentName} resolves to ${resolved ?? "nothing"}, but the request was signed by ${signer}.`);
  }

  const grants = (await listGrants(org.attrs.orgId)).filter((g) => g.agentName === agentName);
  if (grants.length === 0) throw new SintingaleError("GRANT_EXPIRED", `${agentName} has no active grant.`);
  const live = grants.filter((g) => !g.revoked);
  if (live.length === 0) throw new SintingaleError("GRANT_REVOKED", `${agentName}'s grant was revoked.`);
  if (live.some((g) => g.agentAddress !== signer) && !live.some((g) => g.agentAddress === signer)) {
    throw new SintingaleError("AGENT_NAME_MISMATCH", "The grant was issued to a different address for this name.");
  }

  const scoped = live.filter((g) => g.agentAddress === signer && grantCoversScope(g, ctx.action, ctx.projectId));
  if (scoped.length === 0) throw new SintingaleError("SCOPE_DENIED", `No grant lets ${agentName} ${ctx.action}${ctx.projectId ? ` on ${ctx.projectId}` : ""}.`);

  let lastCapError: string | null = null;
  for (const grant of scoped) {
    const verdict = checkGrantCaps(grant, ctx.amount);
    if (verdict.ok) {
      sigs.set(signature, timestamp);
      return { agentName, agentAddress: signer, grant };
    }
    lastCapError = verdict.reason;
  }
  throw new SintingaleError("CAP_EXCEEDED", lastCapError ?? "Over the grant's spending cap.");
}
