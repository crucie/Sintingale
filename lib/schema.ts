import { z } from "zod";

export const ENTITY_TYPES = ["merchant", "plan", "invoice", "receipt", "entitlement"] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const RECURRENCES = ["one-time", "weekly", "monthly", "yearly", "demo-5m"] as const;
export type Recurrence = (typeof RECURRENCES)[number];

/** Billing period length in seconds; `one-time` grants a 30-day entitlement. */
export const RECURRENCE_SECONDS: Record<Recurrence, number> = {
  "one-time": 30 * 86400,
  weekly: 7 * 86400,
  monthly: 30 * 86400,
  yearly: 365 * 86400,
  "demo-5m": 5 * 60,
};

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  "one-time": "One-time",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
  "demo-5m": "Every 5 min (demo)",
};

export interface MerchantAttrs {
  merchantId: string;
  name: string;
  payout: string;
  /** Address that called `registerMerchant` on the PaymentRouter. Defaults to `payout`. */
  wallet?: string;
  email?: string;
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
  simulated: boolean;
}

export interface EntitlementAttrs {
  merchantId: string;
  planId: string;
  customer: string;
  invoiceId: string;
  periodEnd: number;
}

export interface AttrsByType {
  merchant: MerchantAttrs;
  plan: PlanAttrs;
  invoice: InvoiceAttrs;
  receipt: ReceiptAttrs;
  entitlement: EntitlementAttrs;
}

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
  .refine((v) => Number(v) <= 1_000_000, "Amount is too large for the demo");

export const merchantInput = z.object({
  merchantId: slug,
  name: z.string().min(2).max(60),
  payout: address,
  wallet: address.optional().or(z.literal("")),
  email: z.email().optional().or(z.literal("")),
});

export const planInput = z.object({
  merchantId: slug,
  planId: slug,
  name: z.string().min(2).max(60),
  description: z.string().max(200).optional(),
  amount: money,
  recurrence: z.enum(RECURRENCES),
});

export const invoiceInput = z.object({
  merchantId: slug,
  planId: slug,
  amount: money.optional(),
  currency: z.literal("USDT").default("USDT"),
  customer: z.union([address, z.email(), z.literal("")]).optional(),
  description: z.string().max(200).optional(),
  dueInHours: z.number().positive().max(24 * 90).default(24),
});

export const notifyInput = z.object({
  invoiceKey: z.string().min(3).max(80),
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/).optional(),
  payer: address.optional(),
  simulated: z.boolean().optional(),
});

export type MerchantInput = z.infer<typeof merchantInput>;
export type PlanInput = z.infer<typeof planInput>;
export type InvoiceInput = z.infer<typeof invoiceInput>;
