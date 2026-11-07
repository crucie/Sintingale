import { errorResponse, json } from "@/lib/api";
import { requireTeams } from "@/lib/features";
import { getInvite } from "@/lib/orgs";

export async function GET(_request: Request, ctx: RouteContext<"/api/invites/[key]">) {
  try {
    await requireTeams();
    const { key } = await ctx.params;
    return json(await getInvite(key));
  } catch (err) {
    return errorResponse(err);
  }
}
