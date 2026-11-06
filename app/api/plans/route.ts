import { errorResponse, json, readJson, requireMerchantAuth } from "@/lib/api";
import { publicConfig } from "@/lib/config";
import { createPlan, listPlans } from "@/lib/sintingale";
import { planInput } from "@/lib/schema";

export async function GET(request: Request) {
  try {
    const merchantId = new URL(request.url).searchParams.get("merchantId") ?? publicConfig.merchantId;
    return json({ plans: await listPlans(merchantId) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    requireMerchantAuth(request);
    const input = planInput.parse(await readJson(request));
    return json({ plan: await createPlan(input) }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
