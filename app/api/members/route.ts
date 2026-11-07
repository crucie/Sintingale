import { z } from "zod";
import { requireTeams } from "@/lib/features";
import { errorResponse, json, readJson, SintingaleError } from "@/lib/api";
import { requireSession } from "@/lib/auth/siwe";
import { approveMember, listMembers } from "@/lib/orgs";
import { memberAttrsInput } from "@/lib/schema";

export async function GET(request: Request) {
  try {
    await requireTeams();
    const orgId = new URL(request.url).searchParams.get("orgId");
    if (!orgId) throw new SintingaleError("BAD_REQUEST", "orgId is required.");
    return json({ members: await listMembers(orgId) });
  } catch (err) {
    return errorResponse(err);
  }
}

/** "Check & approve": the subname must already resolve to the member's wallet. */
export async function POST(request: Request) {
  try {
    await requireTeams();
    const session = await requireSession();
    const { attrs } = z.object({ attrs: memberAttrsInput }).parse(await readJson(request));
    return json({ member: await approveMember(attrs, session.address) }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
