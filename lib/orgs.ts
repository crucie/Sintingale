import "server-only";
import { SintingaleError } from "./api";
import { acceptorOf, filterValid, isRelayerEntity, isValidOrg, signerOf } from "./arkiv/trust";
import { projectIdToBytes32 } from "./chain/splitter";
import { publicConfig, serverConfig, splitterEnabled } from "./config";
import { verifyControl } from "./ens/ownership";
import { getProfile, resolveName } from "./ens/resolve";
import { isSubnameOf, subnameInstructions } from "./ens/subnames";
import { getLedger, relayerAddress, type StoredEntity } from "./ledger";
import { readClaimable } from "./relayer";
import type {
  GrantAttrs,
  InviteAcceptAttrs,
  InviteAttrs,
  MemberAttrs,
  OrgAttrs,
  ProjectAttrs,
  RevocationAttrs,
} from "./schema";
import { diffAddresses, validateShares } from "./splits";
import type {
  ClaimableDTO,
  GrantDTO,
  InviteDTO,
  MemberDTO,
  OrgDTO,
  PayoutDTO,
  ProjectDTO,
} from "./types";

const DAY = 86400;
const LONG = 365 * DAY;
const nowSec = () => Math.floor(Date.now() / 1000);
const lc = (v: string) => v.toLowerCase();

/* ------------------------------------------------------------------ orgs -- */

const toOrg = async (o: StoredEntity<"org">): Promise<OrgDTO> => {
  const profile = await getProfile(o.attrs.ensName);
  return {
    ...o.attrs,
    key: o.key,
    avatar: profile.avatar,
    resolvedAddress: profile.address,
    payoutMatches: profile.address === lc(o.attrs.payout),
  };
};

async function latestValidOrg(rows: StoredEntity<"org">[]): Promise<StoredEntity<"org"> | null> {
  const relayer = relayerAddress();
  for (const row of rows) if (await isValidOrg(row, relayer)) return row;
  return null;
}

export async function getOrgEntity(orgId: string): Promise<StoredEntity<"org"> | null> {
  return latestValidOrg(await getLedger().query("org", { eq: { orgId: lc(orgId) } }));
}

export async function requireOrgEntity(orgId: string) {
  const org = await getOrgEntity(orgId);
  if (!org) throw new SintingaleError("NOT_FOUND", "Organisation not found.");
  return org;
}

export async function getOrg(orgId: string): Promise<OrgDTO | null> {
  const org = await getOrgEntity(orgId);
  return org ? toOrg(org) : null;
}

/** The org a wallet owns, if any. A wallet without one gets the basic (non-team) experience. */
export async function getOrgForOwner(owner: string): Promise<OrgDTO | null> {
  const org = await latestValidOrg(await getLedger().query("org", { eq: { owner: lc(owner) } }));
  return org ? toOrg(org) : null;
}

export async function getOrgForMerchant(merchantId: string): Promise<StoredEntity<"org"> | null> {
  return latestValidOrg(await getLedger().query("org", { eq: { merchantId } }));
}

/** Only an owner holding a session for that wallet may act for the org. */
export async function requireOwner(orgId: string, sessionAddress: string) {
  const org = await requireOrgEntity(orgId);
  if (lc(org.attrs.owner) !== lc(sessionAddress)) {
    throw new SintingaleError("FORBIDDEN", "Only the org owner can do this.");
  }
  return org;
}

async function assertSignedBy(type: Parameters<typeof signerOf>[0], attrs: never, owner: string) {
  const signer = await signerOf(type, attrs);
  if (signer !== lc(owner)) throw new SintingaleError("UNAUTHORIZED", "The authorisation was not signed by the org owner.");
}

export async function createOrg(attrs: OrgAttrs, sessionAddress: string): Promise<OrgDTO> {
  if (lc(attrs.owner) !== lc(sessionAddress)) {
    throw new SintingaleError("FORBIDDEN", "Sign in with the wallet that controls this name.");
  }
  const control = await verifyControl(attrs.ensName, attrs.owner, { fresh: true });
  if (!control.ok) {
    throw new SintingaleError(
      "ENS_NOT_VERIFIED",
      control.reason === "NOT_RESOLVED"
        ? `${attrs.ensName} has no address record on Sepolia.`
        : `Your wallet does not control ${attrs.ensName}. Its address points to ${control.resolvedAddress ?? "nothing"}.`,
    );
  }
  if (control.method !== attrs.verifyMethod) throw new SintingaleError("BAD_REQUEST", "Verification method changed, re-check the name.");
  if (!control.resolvedAddress || control.resolvedAddress !== lc(attrs.payout)) {
    throw new SintingaleError("BAD_REQUEST", "Payout must be the address the name currently resolves to.");
  }
  if (attrs.merchantId !== publicConfig.merchantId) throw new SintingaleError("BAD_REQUEST", "Unknown merchant.");
  await assertSignedBy("org", attrs as never, attrs.owner);

  const existing = await getOrgEntity(attrs.orgId);
  if (existing && lc(existing.attrs.owner) !== lc(attrs.owner)) {
    const stillControls = await verifyControl(existing.attrs.ensName, existing.attrs.owner);
    if (stillControls.ok) throw new SintingaleError("CONFLICT", "This name is already linked by its current controller.");
  }
  const entity = await getLedger().create("org", attrs, nowSec() + LONG);
  return toOrg(entity);
}

/* -------------------------------------------------------------- projects -- */

async function projectRows(org: StoredEntity<"org">, projectId?: string) {
  const rows = await getLedger().query("project", { eq: projectId ? { orgId: org.attrs.orgId, projectId } : { orgId: org.attrs.orgId } });
  return filterValid("project", rows, org, relayerAddress());
}

const toProject = (p: StoredEntity<"project">): ProjectDTO => ({ ...p.attrs, key: p.key, createdAt: p.createdAt });

/** Projects are versioned: every share change writes a new entity, the highest version wins. */
function latestVersions(rows: StoredEntity<"project">[]) {
  const best = new Map<string, StoredEntity<"project">>();
  for (const r of rows) {
    const cur = best.get(r.attrs.projectId);
    if (!cur || r.attrs.version > cur.attrs.version) best.set(r.attrs.projectId, r);
  }
  return [...best.values()];
}

export async function listProjects(orgId: string): Promise<ProjectDTO[]> {
  const org = await requireOrgEntity(orgId);
  return latestVersions(await projectRows(org)).map(toProject).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getProjectEntity(orgId: string, projectId: string) {
  const org = await requireOrgEntity(orgId);
  const [latest] = latestVersions(await projectRows(org, projectId));
  return { org, project: latest ?? null };
}

export async function getProject(orgId: string, projectId: string): Promise<ProjectDTO | null> {
  const { project } = await getProjectEntity(orgId, projectId);
  return project ? toProject(project) : null;
}

export async function saveProject(attrs: ProjectAttrs, sessionAddress: string): Promise<ProjectDTO> {
  const org = await requireOwner(attrs.orgId, sessionAddress);
  await assertSignedBy("project", attrs as never, org.attrs.owner);
  if (attrs.onchainId !== projectIdToBytes32(attrs.orgId, attrs.projectId)) {
    throw new SintingaleError("BAD_REQUEST", "onchainId does not match the project.");
  }
  const { project: current } = await getProjectEntity(attrs.orgId, attrs.projectId);
  const expectedVersion = current ? current.attrs.version + 1 : attrs.shares.length ? 1 : 0;
  if (attrs.version !== expectedVersion) {
    throw new SintingaleError("CONFLICT", `Expected version ${expectedVersion}; reload the project and try again.`);
  }
  if (attrs.shares.length) {
    const err = validateShares(attrs.shares.map((s) => ({ account: s.account, bps: s.bps })));
    if (err) throw new SintingaleError("BAD_REQUEST", `Invalid share table (${err}). Shares must total exactly 100%.`);
    if (!splitterEnabled) throw new SintingaleError("NOT_CONFIGURED", "Set NEXT_PUBLIC_SPLITTER_ADDRESS to use project splits.");
    if (lc(attrs.splitContract) !== lc(publicConfig.splitter!)) {
      throw new SintingaleError("BAD_REQUEST", "splitContract does not match the configured splitter.");
    }
    for (const s of attrs.shares) {
      if (s.subname !== org.attrs.ensName && !isSubnameOf(s.subname, org.attrs.ensName)) {
        throw new SintingaleError("BAD_REQUEST", `${s.subname} is not part of ${org.attrs.ensName}.`);
      }
    }
  }
  const entity = await getLedger().create("project", attrs, nowSec() + LONG);
  return toProject(entity);
}

/** Re-resolves every name in the share table and reports any that moved since the snapshot. */
export async function proposeShares(orgId: string, rows: Array<{ subname: string; contribution: number }>) {
  const resolved = await Promise.all(rows.map(async (r) => ({ ...r, address: await resolveName(r.subname) })));
  return { rows: resolved, resolvedAt: nowSec() };
}

export async function resyncProject(orgId: string, projectId: string) {
  const project = await getProject(orgId, projectId);
  if (!project) throw new SintingaleError("NOT_FOUND", "Project not found.");
  const current: Record<string, string | null> = {};
  await Promise.all(project.shares.map(async (s) => (current[s.subname] = await resolveName(s.subname))));
  return { diffs: diffAddresses(project.shares.map((s) => ({ subname: s.subname, address: s.account })), current), current };
}

/* --------------------------------------------------------------- members -- */

async function revocations(org: StoredEntity<"org">) {
  const rows = await getLedger().query("revocation", { eq: { orgId: org.attrs.orgId } });
  const valid = await filterValid("revocation", rows, org, relayerAddress());
  const latest = new Map<string, number>();
  for (const r of valid) latest.set(`${r.attrs.targetType}:${r.attrs.targetId}`, Math.max(latest.get(`${r.attrs.targetType}:${r.attrs.targetId}`) ?? 0, r.attrs.revokedAt));
  return latest;
}

export async function listMembers(orgId: string): Promise<MemberDTO[]> {
  const org = await requireOrgEntity(orgId);
  const [rows, revoked] = await Promise.all([
    getLedger().query("member", { eq: { orgId: org.attrs.orgId } }).then((r) => filterValid("member", r, org, relayerAddress())),
    revocations(org),
  ]);
  const latest = new Map<string, StoredEntity<"member">>();
  for (const r of rows) {
    const cur = latest.get(r.attrs.subname);
    if (!cur || r.attrs.joinedAt > cur.attrs.joinedAt) latest.set(r.attrs.subname, r);
  }
  const members = [...latest.values()].filter((m) => (revoked.get(`member:${m.attrs.subname}`) ?? 0) < m.attrs.joinedAt);
  return Promise.all(
    members.map(async (m) => {
      const current = await resolveName(m.attrs.subname);
      return { ...m.attrs, key: m.key, currentAddress: current, addressMatches: current === lc(m.attrs.address) };
    }),
  );
}

export async function approveMember(attrs: MemberAttrs, sessionAddress: string): Promise<MemberDTO> {
  const org = await requireOwner(attrs.orgId, sessionAddress);
  await assertSignedBy("member", attrs as never, org.attrs.owner);
  if (!isSubnameOf(attrs.subname, org.attrs.ensName)) {
    throw new SintingaleError("BAD_REQUEST", `${attrs.subname} is not a subname of ${org.attrs.ensName}.`);
  }
  const resolved = await resolveName(attrs.subname);
  if (resolved !== lc(attrs.address)) {
    throw new SintingaleError(
      "ENS_NOT_VERIFIED",
      resolved
        ? `${attrs.subname} resolves to ${resolved}, not ${attrs.address}. Update its address record first.`
        : `${attrs.subname} does not resolve yet. Create it in the ENS app, then try again.`,
    );
  }
  if (attrs.kind === "person" && attrs.inviteId) {
    const accepted = await findAcceptance(org, attrs.inviteId);
    if (!accepted || lc(accepted.attrs.acceptor) !== lc(attrs.address)) {
      throw new SintingaleError("BAD_REQUEST", "The invite has not been accepted by this address.");
    }
  }
  const entity = await getLedger().create("member", attrs, nowSec() + LONG);
  const current = await resolveName(attrs.subname);
  return { ...entity.attrs, key: entity.key, currentAddress: current, addressMatches: true };
}

export async function revoke(attrs: RevocationAttrs, sessionAddress: string) {
  const org = await requireOwner(attrs.orgId, sessionAddress);
  await assertSignedBy("revocation", attrs as never, org.attrs.owner);
  return getLedger().create("revocation", attrs, nowSec() + LONG);
}

/* --------------------------------------------------------------- invites -- */

async function findAcceptance(org: StoredEntity<"org">, inviteId: string) {
  const rows = await getLedger().query("inviteAccept", { eq: { orgId: org.attrs.orgId, inviteId } });
  for (const r of rows) {
    if (!isRelayerEntity(r, relayerAddress())) continue;
    if ((await acceptorOf(r.attrs)) === lc(r.attrs.acceptor)) return r;
  }
  return null;
}

async function inviteStatus(org: StoredEntity<"org">, invite: StoredEntity<"invite">): Promise<InviteDTO> {
  const [acceptance, members] = await Promise.all([findAcceptance(org, invite.attrs.inviteId), listMembers(org.attrs.orgId)]);
  const member = members.find((m) => m.inviteId === invite.attrs.inviteId);
  return {
    ...invite.attrs,
    key: invite.key,
    expiresAt: invite.expiresAt,
    status: member ? "approved" : acceptance ? "accepted" : "pending",
    acceptor: acceptance?.attrs.acceptor ?? null,
    subname: `${invite.attrs.label}.${org.attrs.ensName}`,
    instructions: acceptance ? subnameInstructions(invite.attrs.label, org.attrs.ensName, acceptance.attrs.acceptor) : null,
  };
}

export async function createInvite(attrs: InviteAttrs, sessionAddress: string) {
  const org = await requireOwner(attrs.orgId, sessionAddress);
  await assertSignedBy("invite", attrs as never, org.attrs.owner);
  const taken = (await listMembers(org.attrs.orgId)).some((m) => m.subname === `${attrs.label}.${org.attrs.ensName}`);
  if (taken) throw new SintingaleError("CONFLICT", `${attrs.label}.${org.attrs.ensName} is already a member.`);
  const entity = await getLedger().create("invite", attrs, attrs.createdAt + serverConfig().inviteTtlSec);
  return inviteStatus(org, entity);
}

export async function listInvites(orgId: string): Promise<InviteDTO[]> {
  const org = await requireOrgEntity(orgId);
  const rows = await filterValid("invite", await getLedger().query("invite", { eq: { orgId: org.attrs.orgId } }), org, relayerAddress());
  return Promise.all(rows.map((r) => inviteStatus(org, r)));
}

/** Public view for the invitee. Expired invites are simply gone from the ledger. */
export async function getInvite(key: string) {
  const invite = await getLedger().get("invite", key);
  if (!invite) throw new SintingaleError("INVITE_EXPIRED", "This invite has expired.");
  const org = await requireOrgEntity(invite.attrs.orgId);
  if (!(await filterValid("invite", [invite], org, relayerAddress())).length) {
    throw new SintingaleError("NOT_FOUND", "This invite is not valid.");
  }
  return { invite: await inviteStatus(org, invite), org: await toOrg(org) };
}

export async function acceptInvite(key: string, attrs: InviteAcceptAttrs, sessionAddress: string) {
  const { invite } = await getInvite(key);
  if (invite.status !== "pending") throw new SintingaleError("CONFLICT", "This invite was already accepted.");
  if (lc(attrs.acceptor) !== lc(sessionAddress)) throw new SintingaleError("FORBIDDEN", "Sign in with the wallet that is accepting.");
  if (invite.inviteeAddress && invite.inviteeAddress !== lc(attrs.acceptor)) {
    throw new SintingaleError("FORBIDDEN", "This invite was issued to a different wallet.");
  }
  if (attrs.inviteId !== invite.inviteId || attrs.orgId !== invite.orgId || attrs.label !== invite.label) {
    throw new SintingaleError("BAD_REQUEST", "Acceptance does not match the invite.");
  }
  if ((await acceptorOf(attrs)) !== lc(attrs.acceptor)) throw new SintingaleError("UNAUTHORIZED", "Invalid acceptance signature.");
  await getLedger().create("inviteAccept", attrs, nowSec() + 7 * DAY);
  return getInvite(key);
}

/* ---------------------------------------------------------------- grants -- */

export async function createGrant(attrs: GrantAttrs, ttlHours: number, sessionAddress: string): Promise<GrantDTO> {
  const org = await requireOwner(attrs.orgId, sessionAddress);
  await assertSignedBy("grant", attrs as never, org.attrs.owner);
  if (!isSubnameOf(attrs.agentName, org.attrs.ensName)) {
    throw new SintingaleError("BAD_REQUEST", `${attrs.agentName} is not a subname of ${org.attrs.ensName}.`);
  }
  const resolved = await resolveName(attrs.agentName);
  if (resolved !== lc(attrs.agentAddress)) {
    throw new SintingaleError("AGENT_NAME_MISMATCH", `${attrs.agentName} resolves to ${resolved ?? "nothing"}, not ${attrs.agentAddress}.`);
  }
  if (attrs.maxTotal < attrs.maxAmount) throw new SintingaleError("BAD_REQUEST", "The total cap must be at least the per-invoice cap.");
  const entity = await getLedger().create("grant", attrs, nowSec() + Math.round(ttlHours * 3600));
  return { ...entity.attrs, key: entity.key, expiresAt: entity.expiresAt, revoked: false, used: 0 };
}

/**
 * Sum of invoice amounts the agent has created under this grant: live invoices,
 * plus paid ones whose invoice entity has already expired (counted via receipts).
 */
export async function grantUsage(orgId: string, grantId: string): Promise<number> {
  const [invoices, receipts] = await Promise.all([
    getLedger().query("invoice", { eq: { orgId, grantId } }),
    getLedger().query("receipt", { eq: { orgId, grantId }, creator: relayerAddress() }),
  ]);
  const live = new Set(invoices.map((r) => r.attrs.invoiceId));
  return (
    invoices.reduce((s, r) => s + r.attrs.amount, 0) +
    receipts.filter((r) => !live.has(r.attrs.invoiceId)).reduce((s, r) => s + r.attrs.amount, 0)
  );
}

export async function listGrants(orgId: string): Promise<GrantDTO[]> {
  const org = await requireOrgEntity(orgId);
  const [rows, revoked] = await Promise.all([
    getLedger().query("grant", { eq: { orgId: org.attrs.orgId } }).then((r) => filterValid("grant", r, org, relayerAddress())),
    revocations(org),
  ]);
  return Promise.all(
    rows.map(async (g) => ({
      ...g.attrs,
      key: g.key,
      expiresAt: g.expiresAt,
      revoked: revoked.has(`grant:${g.attrs.grantId}`),
      used: await grantUsage(org.attrs.orgId, g.attrs.grantId),
    })),
  );
}

/* --------------------------------------------------------------- payouts -- */

const toPayout = (p: StoredEntity<"payout">): PayoutDTO => ({ ...p.attrs, key: p.key });

export async function listPayouts(orgId: string, projectId?: string): Promise<PayoutDTO[]> {
  const rows = await getLedger().query("payout", {
    eq: projectId ? { orgId: lc(orgId), projectId } : { orgId: lc(orgId) },
    creator: relayerAddress(),
  });
  return rows.map(toPayout).sort((a, b) => b.paidAt - a.paidAt);
}

/** Claimable balances for a wallet across every project that ever credited it. */
export async function claimableFor(account: string): Promise<ClaimableDTO[]> {
  const me = lc(account);
  const relayer = relayerAddress();
  const payouts = await getLedger().query("payout", { eq: { account: me }, creator: relayer });
  const groups = new Map<string, { orgId: string; projectId: string; credited: number; payouts: PayoutDTO[] }>();
  for (const p of payouts) {
    const k = `${p.attrs.orgId}:${p.attrs.projectId}`;
    const g = groups.get(k) ?? { orgId: p.attrs.orgId, projectId: p.attrs.projectId, credited: 0, payouts: [] };
    g.credited += p.attrs.amount;
    g.payouts.push(toPayout(p));
    groups.set(k, g);
  }
  const out: ClaimableDTO[] = [];
  for (const g of groups.values()) {
    const project = await getProject(g.orgId, g.projectId).catch(() => null);
    const onchainId = project?.onchainId ?? projectIdToBytes32(g.orgId, g.projectId);
    const claimable = Number(await readClaimable(onchainId, me).catch(() => 0n));
    const claimed = Math.max(0, g.credited - claimable);
    out.push({
      orgId: g.orgId,
      projectId: g.projectId,
      projectName: project?.name ?? g.projectId,
      onchainId,
      credited: g.credited,
      claimed,
      claimable,
      payouts: g.payouts.sort((a, b) => b.paidAt - a.paidAt),
    });
  }
  return out;
}

