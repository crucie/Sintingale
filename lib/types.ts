import type {
  GrantAttrs,
  InviteAttrs,
  MemberAttrs,
  MerchantAttrs,
  OrgAttrs,
  PayoutAttrs,
  PlanAttrs,
  ProjectAttrs,
} from "./schema";

export interface OrgDTO extends OrgAttrs {
  key: string;
  avatar: string | null;
  /** Live resolution of the ENS name right now. */
  resolvedAddress: string | null;
  payoutMatches: boolean;
  demo: boolean;
}

export interface ProjectDTO extends ProjectAttrs {
  key: string;
  createdAt: number;
}

export interface MemberDTO extends MemberAttrs {
  key: string;
  currentAddress: string | null;
  addressMatches: boolean;
  demo: boolean;
}

export interface SubnameInstructionsDTO {
  name: string;
  parent: string;
  address: string;
  ensAppUrl: string | null;
  demo: boolean;
  steps: string[];
}

export interface InviteDTO extends InviteAttrs {
  key: string;
  expiresAt: number;
  status: "pending" | "accepted" | "approved";
  acceptor: string | null;
  subname: string;
  instructions: SubnameInstructionsDTO | null;
}

export interface GrantDTO extends GrantAttrs {
  key: string;
  expiresAt: number;
  revoked: boolean;
  used: number;
}

export interface PayoutDTO extends PayoutAttrs {
  key: string;
}

export interface ClaimableDTO {
  orgId: string;
  projectId: string;
  projectName: string;
  onchainId: string;
  credited: number;
  claimed: number;
  claimable: number;
  source: "chain" | "ledger";
  payouts: PayoutDTO[];
}

export interface SessionDTO {
  address: string;
  demo: boolean;
  org: OrgDTO | null;
}

export interface MerchantIdentity {
  /** Verified ENS name, or null when the seller has not linked one. */
  ensName: string | null;
  avatar: string | null;
  resolvedAddress: string | null;
  payout: string;
  verified: boolean;
  demo: boolean;
  mismatch: boolean;
}

export type InvoiceStatus = "paid" | "pending" | "expired";

export interface MerchantDTO extends MerchantAttrs {
  key: string;
  createdAt: number;
}

export interface PlanDTO extends PlanAttrs {
  key: string;
  createdAt: number;
}

export interface InvoiceRow {
  /** Arkiv key of the invoice entity; null once the invoice entity itself has expired. */
  key: string | null;
  invoiceId: string;
  merchantId: string;
  planId: string;
  customer: string;
  amount: number;
  description: string;
  status: InvoiceStatus;
  dueAt: number | null;
  expiresAt: number | null;
  createdAt: number;
  paidAt?: number;
  txHash?: string;
  receiptKey?: string;
  payer?: string;
  simulated?: boolean;
  orgId?: string;
  projectId?: string;
  createdBy?: string;
}

export interface CheckoutData {
  invoice: InvoiceRow;
  merchant: Pick<MerchantDTO, "merchantId" | "name" | "payout" | "wallet">;
  plan: PlanDTO | null;
  identity: MerchantIdentity;
  project: { name: string; onchainId: string; splitContract: string; shares: ProjectAttrs["shares"] } | null;
}

export interface ReceiptDTO {
  key: string;
  invoiceId: string;
  invoiceKey: string;
  merchantId: string;
  merchantName: string;
  planId: string;
  customer: string;
  payer: string;
  txHash: string;
  amount: number;
  paidAt: number;
  description: string;
  simulated: boolean;
  creator: string;
  expiresAt: number;
}

export type CheckStatus = "pass" | "fail" | "skip";

export interface VerifyCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface VerifyResult {
  receipt: ReceiptDTO;
  checks: VerifyCheck[];
  verdict: "verified" | "simulated" | "mismatch";
}

export interface DashboardStats {
  revenue30d: number;
  paidCount30d: number;
  pendingCount: number;
  pendingVolume: number;
  activeEntitlements: number;
  series: Array<{ day: string; amount: number }>;
}

export interface AccessResult {
  active: boolean;
  periodEnd: number | null;
  entitlementKey: string | null;
  query: string;
}

export interface SystemInfo {
  ledger: "memory" | "arkiv";
  relayer: string;
  onchain: boolean;
}
