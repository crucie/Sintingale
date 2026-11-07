import { errorResponse, json, SintingaleError } from "@/lib/api";
import { requireTeams } from "@/lib/features";
import { listPayouts } from "@/lib/orgs";

/** Relayer-written payout history for a project. Payouts from any other writer are ignored. */
export async function GET(request: Request, ctx: RouteContext<"/api/projects/[id]/payouts">) {
  try {
    await requireTeams();
    const { id } = await ctx.params;
    const orgId = new URL(request.url).searchParams.get("orgId");
    if (!orgId) throw new SintingaleError("BAD_REQUEST", "orgId is required.");
    return json({ payouts: await listPayouts(orgId, id) });
  } catch (err) {
    return errorResponse(err);
  }
}
