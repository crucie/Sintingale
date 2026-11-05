import type { MerchantAttrs, PlanAttrs } from "./schema";

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
}

export interface CheckoutData {
  invoice: InvoiceRow;
  merchant: Pick<MerchantDTO, "merchantId" | "name" | "payout" | "wallet">;
  plan: PlanDTO | null;
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
