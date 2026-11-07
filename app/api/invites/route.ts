import { z } from "zod";
import { requireTeams } from "@/lib/features";
import { errorResponse, json, readJson, SintingaleError } from "@/lib/api";
import { requireSession } from "@/lib/auth/siwe";
import { createInvite, listInvites, requireOwner } from "@/lib/orgs";
import { inviteAttrsInput } from "@/lib/schema";

export async function GET(request: Request) {
  try {
    await requireTeams();
    const session = await requireSession();
    const orgId = new URL(request.url).searchParams.get("orgId");
    if (!orgId) throw new SintingaleError("BAD_REQUEST", "orgId is required.");
    await requireOwner(orgId, session.address);
    return json({ invites: await listInvites(orgId) });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Writes an invite entity that expires on its own (48 h by default). */
export async function POST(request: Request) {
  try {
    await requireTeams();
    const session = await requireSession();
    const { attrs } = z.object({ attrs: inviteAttrsInput }).parse(await readJson(request));
    const invite = await createInvite(attrs, session.address);
    return json({ invite, link: `${new URL(request.url).origin}/invite/${invite.key}` }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
