import { errorResponse, json, requireMerchantAuth } from "@/lib/api";
import { publicConfig } from "@/lib/config";
import { dashboardStats, systemInfo } from "@/lib/sintingale";

export async function GET(request: Request) {
  try {
    requireMerchantAuth(request);
    const merchantId = new URL(request.url).searchParams.get("merchantId") ?? publicConfig.merchantId;
    return json({ stats: await dashboardStats(merchantId), system: systemInfo() });
  } catch (err) {
    return errorResponse(err);
  }
}
