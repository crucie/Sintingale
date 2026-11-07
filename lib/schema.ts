import { z } from "zod";

export const ENTITY_TYPES = [
  "merchant",
  "plan",
  "invoice",
  "receipt",
  "entitlement",
  "org",
  "project",
  "member",
  "invite",
  "inviteAccept",
  "payout",
  "grant",
  "revocation",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const RECURRENCES = ["one-time", "weekly", "monthly", "yearly", "five-minutes"] as const;
export type Recurrence = (typeof RECURRENCES)[number];

/** Billing period length in seconds; `one-time` grants a 30-day entitlement. */
export const RECURRENCE_SECONDS: Record<Recurrence, number> = {
  "one-time": 30 * 86400,
  weekly: 7 * 86400,
  monthly: 30 * 86400,
  yearly: 365 * 86400,
  "five-minutes": 5 * 60,
};

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  "one-time": "One-time",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
  "five-minutes": "Every 5 minutes",
};

export interface MerchantAttrs {
  merchantId: string;
  name: string;
  payout: string;
  /** Address that called `registerMerchant` on the PaymentRouter. Defaults to `payout`. */
  wallet?: string;
  email?: string;
  /** Optional ENS teams, revenue splits and agents. Off unless the merchant turns it on. */
  teamsEnabled?: boolean;
}

export interface PlanAttrs {
  merchantId: string;
  planId: string;
  name: string;
  description?: string;
  token: string;
  recurrence: Recurrence;
  amount: number;
  intervalSec: number;
}

export interface InvoiceAttrs {
  merchantId: string;
  invoiceId: string;
  planId: string;
  customer: string;
  status: "pending";
  amount: number;
  dueAt: number;
  description: string;
  email?: string;
  /** Set for project invoices; payment then settles through the ProjectSplitter. */
  orgId?: string;
  projectId?: string;
  /** ENS name of the agent that created the invoice, for auditability. */
  createdBy?: string;
  grantId?: string;
}

export interface ReceiptAttrs {
  invoiceId: string;
  invoiceKey: string;
  merchantId: string;
  planId: string;
  customer: string;
  payer: string;
  txHash: string;
  amount: number;
  paidAt: number;
  description: string;
  orgId?: string;
  projectId?: string;
  grantId?: string;
}

export interface EntitlementAttrs {
  merchantId: string;
  planId: string;
  customer: string;
  invoiceId: string;
  periodEnd: number;
}

/* ---------------------------------------------------------------------------
 * Organisations (ENS teams, splits and agents)
 *
 * Entities the org owner authorises carry `authSig`: an EIP-191 signature by the
 * owner's wallet over `authMessage(type, attrs)`. See lib/arkiv/trust.ts.
 * ------------------------------------------------------------------------- */

export const ROLES = ["admin", "member"] as const;
export type Role = (typeof ROLES)[number];

export const AGENT_SCOPES = ["invoice:create"] as const;
export type AgentScope = (typeof AGENT_SCOPES)[number];

export interface OrgAttrs {
  orgId: string;
  ensName: string;
  owner: string;
  payout: string;
  merchantId: string;
  verifyMethod: "addr" | "text";
  verifiedAt: number;
  authSig: string;
}

export interface ProjectShare {
  subname: string;
  account: string;
  bps: number;
  contribution: number;
  resolvedAt: number;
}

export interface ProjectAttrs {
  orgId: string;
  projectId: string;
  name: string;
  description: string;
  /** Splitter contract address, or "" before the first share table. */
  splitContract: string;
  onchainId: string;
  version: number;
  shares: ProjectShare[];
  updatedAt: number;
  authSig: string;
}

export interface MemberAttrs {
  orgId: string;
  subname: string;
  address: string;
  role: Role;
  kind: "person" | "agent";
  inviteId: string;
  joinedAt: number;
  authSig: string;
}

export interface InviteAttrs {
  orgId: string;
  inviteId: string;
  /** Lower-case address, or "" when anyone holding the link may accept. */
  inviteeAddress: string;
  label: string;
  role: Role;
  createdAt: number;
  authSig: string;
}

export interface InviteAcceptAttrs {
  orgId: string;
  inviteId: string;
  acceptor: string;
  label: string;
  acceptedAt: number;
  /** Signed by the invitee's wallet, not the owner's. */
  acceptSig: string;
}

export interface PayoutAttrs {
  orgId: string;
  projectId: string;
  invoiceId: string;
  account: string;
  subname: string;
  txHash: string;
  amount: number;
  shareBps: number;
  version: number;
  paidAt: number;
}

export interface GrantAttrs {
  orgId: string;
  grantId: string;
  agentName: string;
  agentAddress: string;
  scope: string;
  /** "" means any project in the org. */
  projectId: string;
  maxAmount: number;
  maxTotal: number;
  createdAt: number;
  authSig: string;
}

export interface RevocationAttrs {
  orgId: string;
  targetType: "grant" | "member";
  targetId: string;
  revokedAt: number;
  authSig: string;
}

export interface AttrsByType {
  merchant: MerchantAttrs;
  plan: PlanAttrs;
  invoice: InvoiceAttrs;
  receipt: ReceiptAttrs;
  entitlement: EntitlementAttrs;
  org: OrgAttrs;
  project: ProjectAttrs;
  member: MemberAttrs;
  invite: InviteAttrs;
  inviteAccept: InviteAcceptAttrs;
  payout: PayoutAttrs;
  grant: GrantAttrs;
  revocation: RevocationAttrs;
}

export type AuthorizedType = "org" | "project" | "member" | "invite" | "grant" | "revocation";

const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/, "Must be a 0x-prefixed 20-byte address");
const slug = z
  .string()
  .min(2)
  .max(40)
  .regex(/^[a-z0-9][a-z0-9_-]*$/, "Lowercase letters, numbers, dashes and underscores only");
const money = z
  .string()
  .regex(/^\d+(\.\d{1,6})?$/, "Enter an amount like 10 or 10.50")
  .refine((v) => Number(v) > 0, "Amount must be greater than zero")
  .refine((v) => Number(v) <= 1_000_000, "Amount is too large");

export const merchantInput = z.object({
  merchantId: slug,
  name: z.string().min(2).max(60),
  payout: address,
  wallet: address.optional().or(z.literal("")),
  email: z.email().optional().or(z.literal("")),
  teamsEnabled: z.boolean().optional(),
});

export const planInput = z.object({
  merchantId: slug,
  planId: slug,
  name: z.string().min(2).max(60),
  description: z.string().max(200).optional(),
  amount: money,
  recurrence: z.enum(RECURRENCES),
});

export const invoiceInput = z
  .object({
    merchantId: slug,
    planId: slug.optional(),
    orgId: z.string().min(3).max(120).optional(),
    projectId: slug.optional(),
    amount: money.optional(),
    currency: z.literal("USDT").default("USDT"),
    customer: z.union([address, z.email(), z.literal("")]).optional(),
    description: z.string().max(200).optional(),
    dueInHours: z.number().positive().max(24 * 90).default(24),
  })
  .refine((v) => v.planId || (v.projectId && v.orgId && v.amount), {
    message: "Give a planId, or an orgId, projectId and amount for a project invoice",
  });

export const notifyInput = z.object({
  invoiceKey: z.string().min(3).max(80),
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/).optional(),
  payer: address.optional(),
});

/* --------------------------------------------------------- org entities -- */

const sig = z.string().regex(/^0x[0-9a-fA-F]{130,}$/, "Missing wallet signature");
const lowerAddress = address.transform((v) => v.toLowerCase());
const ensName = z
  .string()
  .min(3)
  .max(120)
  .regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/, "Enter a full ENS name such as acme.eth")
  .transform((v) => v.toLowerCase());
const label = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9][a-z0-9-]*$/, "Labels use lowercase letters, numbers and dashes");
const id = z.string().min(4).max(64).regex(/^[a-z0-9_-]+$/);
const ts = z.number().int().positive();

export const orgAttrsInput = z.object({
  orgId: ensName,
  ensName,
  owner: lowerAddress,
  payout: lowerAddress,
  merchantId: slug,
  verifyMethod: z.enum(["addr", "text"]),
  verifiedAt: ts,
  authSig: sig,
});

export const projectShareInput = z.object({
  subname: ensName,
  account: lowerAddress,
  bps: z.number().int().min(1).max(10_000),
  contribution: z.number().positive().max(1_000_000),
  resolvedAt: ts,
});

export const projectAttrsInput = z.object({
  orgId: ensName,
  projectId: slug,
  name: z.string().min(2).max(60),
  description: z.string().max(240),
  splitContract: z.string().max(64),
  onchainId: z.string().regex(/^0x[0-9a-f]{64}$/),
  version: z.number().int().min(0),
  shares: z.array(projectShareInput).max(50),
  updatedAt: ts,
  authSig: sig,
});

export const inviteAttrsInput = z.object({
  orgId: ensName,
  inviteId: id,
  inviteeAddress: z.union([lowerAddress, z.literal("")]),
  label,
  role: z.enum(ROLES),
  createdAt: ts,
  authSig: sig,
});

export const inviteAcceptInput = z.object({
  orgId: ensName,
  inviteId: id,
  acceptor: lowerAddress,
  label,
  acceptedAt: ts,
  acceptSig: sig,
});

export const memberAttrsInput = z.object({
  orgId: ensName,
  subname: ensName,
  address: lowerAddress,
  role: z.enum(ROLES),
  kind: z.enum(["person", "agent"]),
  inviteId: z.string().max(64),
  joinedAt: ts,
  authSig: sig,
});

export const grantAttrsInput = z.object({
  orgId: ensName,
  grantId: id,
  agentName: ensName,
  agentAddress: lowerAddress,
  scope: z.string().regex(/^[a-z:]+(,[a-z:]+)*$/),
  projectId: z.union([slug, z.literal("")]),
  maxAmount: z.number().int().positive(),
  maxTotal: z.number().int().positive(),
  createdAt: ts,
  authSig: sig,
});

export const revocationAttrsInput = z.object({
  orgId: ensName,
  targetType: z.enum(["grant", "member"]),
  targetId: z.string().min(1).max(120),
  revokedAt: ts,
  authSig: sig,
});

export type MerchantInput = z.infer<typeof merchantInput>;
export type PlanInput = z.infer<typeof planInput>;
export type InvoiceInput = z.infer<typeof invoiceInput>;
