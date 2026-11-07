import { errorResponse, json, readJson, requireMerchantAuth } from "@/lib/api";
import { setupMerchant } from "@/lib/sintingale";
import { merchantInput } from "@/lib/schema";

export async function POST(request: Request) {
  try {
    requireMerchantAuth(request);
    const input = merchantInput.parse(await readJson(request));
    return json(await setupMerchant(input), 201);
  } catch (err) {
    return errorResponse(err);
  }
}
