import "server-only";
import { randomBytes } from "node:crypto";
import type { Hex } from "viem";
import { SintingaleError } from "./api";
import { onchainEnabled, publicConfig, serverConfig } from "./config";
import { toBaseUnits } from "./format";
import { getLedger, relayerAddress, type StoredEntity } from "./ledger";
import { pollPaidEvents, verifyPaidTx } from "./relayer";
import {
  RECURRENCE_SECONDS,
  type InvoiceInput,
  type MerchantInput,
  type PlanInput,
  type ReceiptAttrs,
} from "./schema";
import type {
  AccessResult,
  CheckoutData,
  DashboardStats,
  InvoiceRow,
  MerchantDTO,
  PlanDTO,
  ReceiptDTO,
  VerifyCheck,
  VerifyResult,
} from "./types";
import { invoiceIdToBytes32 } from "./whitechain";

const DAY = 86400;
const nowSec = () => Math.floor(Date.now() / 1000);
const norm = (v: string | undefined) => (v ?? "").trim().toLowerCase();
const randomHex = (bytes: number) => `0x${randomBytes(bytes).toString("hex")}` as Hex;

/* ----------------------------------------------------------------------------
 * Merchants
 * ------------------------------------------------------------------------- */

export async function getMerchant(merchantId: string): Promise<MerchantDTO | null> {
  const [latest] = await getLedger().query("merchant", { eq: { merchantId }, limit: 1 });
  return latest ? { ...latest.attrs, key: latest.key, createdAt: latest.createdAt } : null;
}

export async function upsertMerchant(input: MerchantInput): Promise<MerchantDTO> {
  const entity = await getLedger().create(
    "merchant",
    {
      merchantId: input.merchantId,
      name: input.name,
      payout: input.payout,
      wallet: input.wallet || undefined,
      email: input.email || undefined,
    },
    nowSec() + 365 * DAY,
  );
  return { ...entity.attrs, key: entity.key, createdAt: entity.createdAt };
}

/* ----------------------------------------------------------------------------
 * Plans
 * ------------------------------------------------------------------------- */

const toPlan = (e: StoredEntity<"plan">): PlanDTO => ({ ...e.attrs, key: e.key, createdAt: e.createdAt });

export async function listPlans(merchantId: string): Promise<PlanDTO[]> {
  const rows = await getLedger().query("plan", { eq: { merchantId } });
  const seen = new Set<string>();
  return rows.filter((p) => !seen.has(p.attrs.planId) && seen.add(p.attrs.planId)).map(toPlan);
}

export async function getPlan(merchantId: string, planId: string): Promise<PlanDTO | null> {
  const [plan] = await getLedger().query("plan", { eq: { merchantId, planId }, limit: 1 });
  return plan ? toPlan(plan) : null;
}

export async function createPlan(input: PlanInput): Promise<PlanDTO> {
  if (await getPlan(input.merchantId, input.planId)) {
    throw new SintingaleError("CONFLICT", `A plan with id "${input.planId}" already exists.`);
  }
  const entity = await getLedger().create(
    "plan",
    {
      merchantId: input.merchantId,
      planId: input.planId,
      name: input.name,
      description: input.description,
      token: "USDT",
      recurrence: input.recurrence,
      amount: toBaseUnits(input.amount),
      intervalSec: RECURRENCE_SECONDS[input.recurrence],
    },
    nowSec() + 365 * DAY,
  );
  return toPlan(entity);
}

/* ----------------------------------------------------------------------------
 * Invoices
 * ------------------------------------------------------------------------- */

export function checkoutUrl(invoiceKey: string, origin?: string) {
  const base = publicConfig.appUrl || origin || "";
  return `${base}/pay/${invoiceKey}`;
}

export async function createInvoice(input: InvoiceInput, origin?: string) {
  const plan = await getPlan(input.merchantId, input.planId);
  if (!plan) throw new SintingaleError("NOT_FOUND", `Plan "${input.planId}" was not found.`);
  const amount = input.amount ? toBaseUnits(input.amount) : plan.amount;
  const dueAt = nowSec() + Math.round(input.dueInHours * 3600);
  const expiresAt = dueAt + serverConfig().invoiceGraceSec;
  const isEmail = input.customer?.includes("@");

  const entity = await getLedger().create(
    "invoice",
    {
      merchantId: input.merchantId,
      invoiceId: `inv_${randomBytes(3).toString("hex")}`,
      planId: plan.planId,
      customer: norm(input.customer),
      status: "pending",
      amount,
      dueAt,
      description: input.description || plan.name,
      email: isEmail ? norm(input.customer) : undefined,
    },
    expiresAt,
  );
  return {
    invoiceKey: entity.key,
    invoiceId: entity.attrs.invoiceId,
    checkoutUrl: checkoutUrl(entity.key, origin),
    expiresAt,
  };
}

function receiptToRow(r: StoredEntity<"receipt">, invoice?: StoredEntity<"invoice">): InvoiceRow {
  return {
    key: invoice?.key ?? null,
    invoiceId: r.attrs.invoiceId,
    merchantId: r.attrs.merchantId,
    planId: r.attrs.planId,
    customer: invoice?.attrs.customer || r.attrs.customer,
    amount: r.attrs.amount,
    description: r.attrs.description,
    status: "paid",
    dueAt: invoice?.attrs.dueAt ?? null,
    expiresAt: invoice?.expiresAt ?? null,
    createdAt: invoice?.createdAt ?? r.attrs.paidAt,
    paidAt: r.attrs.paidAt,
    txHash: r.attrs.txHash,
    receiptKey: r.key,
    payer: r.attrs.payer,
    simulated: r.attrs.simulated,
  };
}

function invoiceToRow(i: StoredEntity<"invoice">): InvoiceRow {
  return {
    key: i.key,
    invoiceId: i.attrs.invoiceId,
    merchantId: i.attrs.merchantId,
    planId: i.attrs.planId,
    customer: i.attrs.customer,
    amount: i.attrs.amount,
    description: i.attrs.description,
    status: "pending",
    dueAt: i.attrs.dueAt,
    expiresAt: i.expiresAt,
    createdAt: i.createdAt,
  };
}

const trustedReceipts = (merchantId: string) =>
  getLedger().query("receipt", { eq: { merchantId }, creator: relayerAddress() });

/**
 * Status is derived, never stored: a trusted receipt means Paid, a live
 * invoice without one means Pending, and an expired invoice simply stops
 * being returned.
 */
export async function listInvoiceRows(merchantId: string): Promise<InvoiceRow[]> {
  const [invoices, receipts] = await Promise.all([
    getLedger().query("invoice", { eq: { merchantId } }),
    trustedReceipts(merchantId),
  ]);
  const receiptByInvoice = new Map(receipts.map((r) => [r.attrs.invoiceId, r]));
  const rows: InvoiceRow[] = [];
  const covered = new Set<string>();
  for (const invoice of invoices) {
    const receipt = receiptByInvoice.get(invoice.attrs.invoiceId);
    rows.push(receipt ? receiptToRow(receipt, invoice) : invoiceToRow(invoice));
    covered.add(invoice.attrs.invoiceId);
  }
  for (const receipt of receipts) {
    if (!covered.has(receipt.attrs.invoiceId)) rows.push(receiptToRow(receipt));
  }
  return rows.sort((a, b) => (b.paidAt ?? b.createdAt) - (a.paidAt ?? a.createdAt));
}

async function receiptForInvoiceKey(invoiceKey: string) {
  const [receipt] = await getLedger().query("receipt", {
    eq: { invoiceKey },
    creator: relayerAddress(),
    limit: 1,
  });
  return receipt ?? null;
}

export async function resolveCheckout(invoiceKey: string): Promise<CheckoutData> {
  const ledger = getLedger();
  const invoice = await ledger.get("invoice", invoiceKey);
  const receipt = invoice
    ? (
        await ledger.query("receipt", {
          eq: { invoiceId: invoice.attrs.invoiceId },
          creator: relayerAddress(),
          limit: 1,
        })
      )[0]
    : await receiptForInvoiceKey(invoiceKey);

  if (!invoice && !receipt) {
    throw new SintingaleError("INVOICE_EXPIRED", "This invoice has expired or does not exist.");
  }
  const merchantId = invoice?.attrs.merchantId ?? receipt!.attrs.merchantId;
  const planId = invoice?.attrs.planId ?? receipt!.attrs.planId;
  const [merchant, plan] = await Promise.all([getMerchant(merchantId), getPlan(merchantId, planId)]);
  return {
    invoice: receipt ? receiptToRow(receipt, invoice ?? undefined) : invoiceToRow(invoice!),
    merchant: {
      merchantId,
      name: merchant?.name ?? merchantId,
      payout: merchant?.payout ?? "",
      wallet: merchant?.wallet ?? merchant?.payout,
    },
    plan,
  };
}

/* ----------------------------------------------------------------------------
 * Payments (relayer side)
 * ------------------------------------------------------------------------- */

async function writeReceiptAndEntitlement(
  invoice: StoredEntity<"invoice">,
  payment: { txHash: string; payer: string; simulated: boolean },
) {
  const ledger = getLedger();
  const paidAt = nowSec();
  const plan = await getPlan(invoice.attrs.merchantId, invoice.attrs.planId);
  const customer = invoice.attrs.customer && !invoice.attrs.customer.includes("@") ? invoice.attrs.customer : norm(payment.payer);

  const attrs: ReceiptAttrs = {
    invoiceId: invoice.attrs.invoiceId,
    invoiceKey: invoice.key,
    merchantId: invoice.attrs.merchantId,
    planId: invoice.attrs.planId,
    customer,
    payer: norm(payment.payer),
    txHash: payment.txHash.toLowerCase(),
    amount: invoice.attrs.amount,
    paidAt,
    description: invoice.attrs.description,
    simulated: payment.simulated,
  };
  const receipt = await ledger.create("receipt", attrs, paidAt + 180 * DAY);

  const periodEnd = paidAt + (plan?.intervalSec ?? RECURRENCE_SECONDS["one-time"]);
  await ledger.create(
    "entitlement",
    {
      merchantId: invoice.attrs.merchantId,
      planId: invoice.attrs.planId,
      customer,
      invoiceId: invoice.attrs.invoiceId,
      periodEnd,
    },
    periodEnd,
  );
  return receipt;
}

export async function recordPayment(input: {
  invoiceKey: string;
  txHash?: string;
  payer?: string;
  simulated?: boolean;
}) {
  const ledger = getLedger();
  const invoice = await ledger.get("invoice", input.invoiceKey);
  if (!invoice) {
    const existing = await receiptForInvoiceKey(input.invoiceKey);
    if (existing) return { receiptKey: existing.key, txHash: existing.attrs.txHash, alreadyRecorded: true };
    throw new SintingaleError("INVOICE_EXPIRED", "This invoice has expired.");
  }

  const [existing] = await ledger.query("receipt", {
    eq: { invoiceId: invoice.attrs.invoiceId },
    creator: relayerAddress(),
    limit: 1,
  });
  if (existing) return { receiptKey: existing.key, txHash: existing.attrs.txHash, alreadyRecorded: true };

  if (input.simulated || !onchainEnabled) {
    if (onchainEnabled) {
      throw new SintingaleError("BAD_REQUEST", "Simulated payments are disabled when on-chain mode is configured.");
    }
    const receipt = await writeReceiptAndEntitlement(invoice, {
      txHash: input.txHash ?? randomHex(32),
      payer: input.payer ?? randomHex(20),
      simulated: true,
    });
    return { receiptKey: receipt.key, txHash: receipt.attrs.txHash, alreadyRecorded: false };
  }

  if (!input.txHash) throw new SintingaleError("BAD_REQUEST", "txHash is required.");
  const [dupe] = await ledger.query("receipt", { eq: { txHash: input.txHash.toLowerCase() }, limit: 1 });
  if (dupe) return { receiptKey: dupe.key, txHash: dupe.attrs.txHash, alreadyRecorded: true };

  const merchant = await getMerchant(invoice.attrs.merchantId);
  let event;
  try {
    event = await verifyPaidTx(input.txHash as Hex, {
      invoiceId: invoice.attrs.invoiceId,
      amount: invoice.attrs.amount,
      merchant: merchant?.wallet ?? merchant?.payout,
    });
  } catch (err) {
    throw new SintingaleError("PAYMENT_NOT_VERIFIED", err instanceof Error ? err.message : "Could not verify payment.");
  }
  const receipt = await writeReceiptAndEntitlement(invoice, {
    txHash: event.txHash,
    payer: event.payer,
    simulated: false,
  });
  return { receiptKey: receipt.key, txHash: receipt.attrs.txHash, alreadyRecorded: false };
}

/** Cron-style relayer pass: scans new `Paid` logs and writes any receipts that are missing. */
export async function relayerTick() {
  const { events, fromBlock, toBlock } = await pollPaidEvents();
  if (events.length === 0) return { processed: 0, fromBlock: fromBlock.toString(), toBlock: toBlock.toString() };
  const invoices = await getLedger().query("invoice", {});
  const byHash = new Map(invoices.map((i) => [invoiceIdToBytes32(i.attrs.invoiceId).toLowerCase(), i]));
  let processed = 0;
  for (const event of events) {
    const invoice = byHash.get(event.invoiceIdHash.toLowerCase());
    if (!invoice) continue;
    const result = await recordPayment({ invoiceKey: invoice.key, txHash: event.txHash, payer: event.payer });
    if (!result.alreadyRecorded) processed++;
  }
  return { processed, fromBlock: fromBlock.toString(), toBlock: toBlock.toString() };
}

/* ----------------------------------------------------------------------------
 * Access and verification
 * ------------------------------------------------------------------------- */

export async function hasAccess(params: { merchantId: string; planId: string; customer: string }): Promise<AccessResult> {
  const now = nowSec();
  const customer = norm(params.customer);
  const relayer = relayerAddress();
  const [entitlement] = await getLedger().query("entitlement", {
    eq: { merchantId: params.merchantId, planId: params.planId, customer },
    gt: { periodEnd: now },
    creator: relayer,
    limit: 1,
  });
  return {
    active: Boolean(entitlement),
    periodEnd: entitlement?.attrs.periodEnd ?? null,
    entitlementKey: entitlement?.key ?? null,
    query: `type="entitlement" && merchantId="${params.merchantId}" && planId="${params.planId}" && customer="${customer}" && periodEnd > ${now} && $creator=${relayer}`,
  };
}

export async function getReceipt(receiptKey: string): Promise<ReceiptDTO> {
  const receipt = await getLedger().get("receipt", receiptKey);
  if (!receipt) throw new SintingaleError("NOT_FOUND", "Receipt not found. It may have expired.");
  const merchant = await getMerchant(receipt.attrs.merchantId);
  return {
    ...receipt.attrs,
    key: receipt.key,
    merchantName: merchant?.name ?? receipt.attrs.merchantId,
    creator: receipt.creator,
    expiresAt: receipt.expiresAt,
  };
}

export async function verifyReceipt(receiptKey: string): Promise<VerifyResult> {
  const receipt = await getReceipt(receiptKey);
  const relayer = relayerAddress();
  const checks: VerifyCheck[] = [];

  const trusted = receipt.creator.toLowerCase() === relayer.toLowerCase();
  checks.push({
    id: "creator",
    label: "Written by the Sintingale relayer",
    status: trusted ? "pass" : "fail",
    detail: trusted ? `$creator matches ${relayer}` : `$creator ${receipt.creator} is not the relayer`,
  });

  checks.push({
    id: "live",
    label: "Receipt entity is live on the ledger",
    status: "pass",
    detail: `Expires ${new Date(receipt.expiresAt * 1000).toUTCString()}`,
  });

  if (receipt.simulated) {
    checks.push({
      id: "onchain",
      label: "Matching Paid event on Whitechain",
      status: "skip",
      detail: "Simulated payment: no on-chain transaction to compare against.",
    });
  } else {
    const merchant = await getMerchant(receipt.merchantId);
    try {
      const event = await verifyPaidTx(receipt.txHash as Hex, {
        invoiceId: receipt.invoiceId,
        amount: receipt.amount,
        merchant: merchant?.wallet ?? merchant?.payout,
      });
      checks.push({
        id: "onchain",
        label: "Matching Paid event on Whitechain",
        status: "pass",
        detail: `Block ${event.blockNumber}, invoiceId and amount match`,
      });
      const payerOk = event.payer.toLowerCase() === receipt.payer.toLowerCase();
      checks.push({
        id: "payer",
        label: "Payer matches the receipt",
        status: payerOk ? "pass" : "fail",
        detail: payerOk ? event.payer : `Chain says ${event.payer}, receipt says ${receipt.payer}`,
      });
    } catch (err) {
      checks.push({
        id: "onchain",
        label: "Matching Paid event on Whitechain",
        status: "fail",
        detail: err instanceof Error ? err.message : "Could not load the transaction.",
      });
    }
  }

  const failed = checks.some((c) => c.status === "fail");
  return { receipt, checks, verdict: failed ? "mismatch" : receipt.simulated ? "simulated" : "verified" };
}

/* ----------------------------------------------------------------------------
 * Dashboard
 * ------------------------------------------------------------------------- */

export async function dashboardStats(merchantId: string): Promise<DashboardStats> {
  const now = nowSec();
  const since = now - 30 * DAY;
  const ledger = getLedger();
  const [receipts, invoices, entitlements] = await Promise.all([
    ledger.query("receipt", { eq: { merchantId }, gt: { paidAt: since }, creator: relayerAddress() }),
    ledger.query("invoice", { eq: { merchantId } }),
    ledger.query("entitlement", { eq: { merchantId }, gt: { periodEnd: now }, creator: relayerAddress() }),
  ]);
  const paidIds = new Set(receipts.map((r) => r.attrs.invoiceId));
  const pending = invoices.filter((i) => !paidIds.has(i.attrs.invoiceId));

  const series: DashboardStats["series"] = [];
  for (let d = 13; d >= 0; d--) {
    const start = now - (d + 1) * DAY;
    const end = now - d * DAY;
    const amount = receipts
      .filter((r) => r.attrs.paidAt > start && r.attrs.paidAt <= end)
      .reduce((sum, r) => sum + r.attrs.amount, 0);
    series.push({ day: new Date(end * 1000).toISOString().slice(5, 10), amount });
  }

  return {
    revenue30d: receipts.reduce((sum, r) => sum + r.attrs.amount, 0),
    paidCount30d: receipts.length,
    pendingCount: pending.length,
    pendingVolume: pending.reduce((sum, i) => sum + i.attrs.amount, 0),
    activeEntitlements: entitlements.length,
    series,
  };
}

export function systemInfo() {
  return { ledger: getLedger().backend, relayer: relayerAddress(), onchain: onchainEnabled };
}
