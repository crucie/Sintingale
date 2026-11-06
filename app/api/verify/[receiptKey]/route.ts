import { errorResponse, json, rateLimit } from "@/lib/api";
import { verifyReceipt } from "@/lib/sintingale";

export async function GET(request: Request, ctx: RouteContext<"/api/verify/[receiptKey]">) {
  try {
    rateLimit(request, "verify", 60);
    const { receiptKey } = await ctx.params;
    return json(await verifyReceipt(receiptKey));
  } catch (err) {
    return errorResponse(err);
  }
}
