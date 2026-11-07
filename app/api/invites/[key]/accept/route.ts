import { z } from "zod";
import { requireTeams } from "@/lib/features";
import { errorResponse, json, rateLimit, readJson } from "@/lib/api";
import { requireSession } from "@/lib/auth/siwe";
import { acceptInvite } from "@/lib/orgs";
import { inviteAcceptInput } from "@/lib/schema";

/** The invitee signs an acceptance; the owner then issues the subname and approves. */
export async function POST(request: Request, ctx: RouteContext<"/api/invites/[key]/accept">) {
  try {
    await requireTeams();
    rateLimit(request, "invite-accept", 20);
    const session = await requireSession();
    const { key } = await ctx.params;
    const { attrs } = z.object({ attrs: inviteAcceptInput }).parse(await readJson(request));
    return json(await acceptInvite(key, attrs, session.address));
  } catch (err) {
    return errorResponse(err);
  }
}
