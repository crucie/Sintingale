import { errorResponse, json, readJson, requireMerchantAuth } from "@/lib/api";
import { publicConfig } from "@/lib/config";
import { createInvoice, listInvoiceRows } from "@/lib/sintingale";
import { invoiceInput } from "@/lib/schema";

export async function GET(request: Request) {
  try {
    requireMerchantAuth(request);
    const params = new URL(request.url).searchParams;
    const merchantId = params.get("merchantId") ?? publicConfig.merchantId;
    const status = params.get("status");
    const rows = await listInvoiceRows(merchantId);
    return json({ invoices: status ? rows.filter((r) => r.status === status) : rows });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    requireMerchantAuth(request);
    const input = invoiceInput.parse(await readJson(request));
    const result = await createInvoice(input, new URL(request.url).origin);
    return json(result, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
