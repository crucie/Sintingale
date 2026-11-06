import { errorResponse, SintingaleError, json, readJson, requireMerchantAuth } from "@/lib/api";
import { publicConfig } from "@/lib/config";
import { getMerchant, upsertMerchant } from "@/lib/sintingale";
import { merchantInput } from "@/lib/schema";

export async function GET(request: Request) {
  try {
    const merchantId = new URL(request.url).searchParams.get("merchantId") ?? publicConfig.merchantId;
    const merchant = await getMerchant(merchantId);
    if (!merchant) throw new SintingaleError("NOT_FOUND", "Merchant not found.");
    return json({ merchant });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    requireMerchantAuth(request);
    const input = merchantInput.parse(await readJson(request));
    const merchant = await upsertMerchant(input);
    return json({ merchant }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
