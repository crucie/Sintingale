import { errorResponse, SintingaleError, json, requireApiKey } from "@/lib/api";
import { hasAccess } from "@/lib/sintingale";

export async function GET(request: Request) {
  try {
    requireApiKey(request);
    const params = new URL(request.url).searchParams;
    const merchantId = params.get("merchantId");
    const planId = params.get("planId");
    const customer = params.get("customer");
    if (!merchantId || !planId || !customer) {
      throw new SintingaleError("BAD_REQUEST", "merchantId, planId and customer are required.");
    }
    return json(await hasAccess({ merchantId, planId, customer }));
  } catch (err) {
    return errorResponse(err);
  }
}
