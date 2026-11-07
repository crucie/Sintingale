import { z } from "zod";
import { requireTeams } from "@/lib/features";
import { errorResponse, json, readJson, SintingaleError } from "@/lib/api";
import { requireSession } from "@/lib/auth/siwe";
import { createGrant, listGrants, requireOwner } from "@/lib/orgs";
import { grantAttrsInput } from "@/lib/schema";

export async function GET(request: Request) {
  try {
    await requireTeams();
    const session = await requireSession();
    const orgId = new URL(request.url).searchParams.get("orgId");
    if (!orgId) throw new SintingaleError("BAD_REQUEST", "orgId is required.");
    await requireOwner(orgId, session.address);
    return json({ grants: await listGrants(orgId) });
  } catch (err) {
    return errorResponse(err);
  }
}

/** A grant is an expiring entity: when it expires, the agent's permission is gone. */
export async function POST(request: Request) {
  try {
    await requireTeams();
    const session = await requireSession();
    const { attrs, ttlHours } = z
      .object({ attrs: grantAttrsInput, ttlHours: z.number().min(0.05).max(24 * 30) })
      .parse(await readJson(request));
    return json({ grant: await createGrant(attrs, ttlHours, session.address) }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
