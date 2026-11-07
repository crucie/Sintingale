import { errorResponse, requireMerchantAuth } from "@/lib/api";
import { publicConfig } from "@/lib/config";
import { fromBaseUnits } from "@/lib/format";
import { listInvoiceRows } from "@/lib/sintingale";
import { explorerTx } from "@/lib/whitechain";

const HEADER = [
  "paid_at_utc",
  "invoice_id",
  "description",
  "plan_id",
  "customer",
  "payer",
  "amount",
  "currency",
  "network",
  "tx_hash",
  "tx_url",
  "arkiv_receipt_key",
  "simulated",
];

const cell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Paid invoices as CSV for the merchant's accountant: one row per trusted Arkiv receipt. */
export async function GET(request: Request) {
  try {
    requireMerchantAuth(request);
    const merchantId = new URL(request.url).searchParams.get("merchantId") ?? publicConfig.merchantId;
    const paid = (await listInvoiceRows(merchantId)).filter((r) => r.status === "paid");
    const lines = paid.map((r) =>
      [
        r.paidAt ? new Date(r.paidAt * 1000).toISOString() : "",
        r.invoiceId,
        r.description,
        r.planId,
        r.customer,
        r.payer,
        fromBaseUnits(r.amount).toFixed(publicConfig.usdt.decimals),
        "USDT",
        `Whitechain Sepolia (${publicConfig.whitechain.chainId})`,
        r.txHash,
        r.txHash && !r.simulated ? explorerTx(r.txHash) : "",
        r.receiptKey,
        r.simulated ? "yes" : "no",
      ]
        .map(cell)
        .join(","),
    );
    const date = new Date().toISOString().slice(0, 10);
    return new Response([HEADER.join(","), ...lines].join("\r\n") + "\r\n", {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="sintingale-${merchantId}-receipts-${date}.csv"`,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
