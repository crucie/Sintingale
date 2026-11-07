import { errorResponse, json, rateLimit, requireMerchantAuth, SintingaleError } from "@/lib/api";
import { isAgentRequest, verifyAgentRequest } from "@/lib/auth/agent";
import { getSession } from "@/lib/auth/siwe";
import { publicConfig } from "@/lib/config";
import { requireTeams } from "@/lib/features";
import { toBaseUnits } from "@/lib/format";
import { requireOwner } from "@/lib/orgs";
import { invoiceInput } from "@/lib/schema";
import { createInvoice, listInvoiceRows } from "@/lib/sintingale";

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

/**
 * Three callers: the dashboard (same-origin), a SaaS backend (API key), or an
 * agent (ENS-named, signed request checked against an expiring grant).
 */
export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 16_384) throw new SintingaleError("BAD_REQUEST", "Payload too large.");
    let body: unknown;
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      throw new SintingaleError("BAD_REQUEST", "Body must be valid JSON.");
    }
    const input = invoiceInput.parse(body);
    const origin = new URL(request.url).origin;

    if (isAgentRequest(request) || input.projectId) await requireTeams(input.merchantId);

    if (isAgentRequest(request)) {
      rateLimit(request, "agent", 60);
      if (!input.orgId) throw new SintingaleError("BAD_REQUEST", "Agent invoices must name an orgId.");
      const amount = input.amount ? toBaseUnits(input.amount) : NaN;
      if (!Number.isFinite(amount)) throw new SintingaleError("BAD_REQUEST", "Agent invoices must state an amount.");
      const agent = await verifyAgentRequest(request, raw, {
        orgId: input.orgId,
        action: "invoice:create",
        projectId: input.projectId,
        amount,
      });
      const result = await createInvoice(input, origin, { createdBy: agent.agentName, grantId: agent.grant.grantId });
      return json({ ...result, createdBy: agent.agentName, grantId: agent.grant.grantId }, 201);
    }

    requireMerchantAuth(request);
    if (input.projectId) {
      const session = await getSession();
      if (!session) throw new SintingaleError("UNAUTHORIZED", "Sign in as the org owner to invoice a project.");
      await requireOwner(input.orgId!, session.address);
    }
    return json(await createInvoice(input, origin), 201);
  } catch (err) {
    return errorResponse(err);
  }
}
