import { errorResponse, json } from "@/lib/api";
import { resolveCheckout } from "@/lib/sintingale";

export async function GET(_request: Request, ctx: RouteContext<"/api/invoices/[key]">) {
  try {
    const { key } = await ctx.params;
    return json(await resolveCheckout(key));
  } catch (err) {
    return errorResponse(err);
  }
}
