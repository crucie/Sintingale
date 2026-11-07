import { z } from "zod";
import { requireTeams } from "@/lib/features";
import { errorResponse, json, readJson, SintingaleError } from "@/lib/api";
import { requireSession } from "@/lib/auth/siwe";
import { createOrg, getOrg, getOrgForOwner } from "@/lib/orgs";
import { orgAttrsInput } from "@/lib/schema";

/** `?orgId=acme.eth` for a public org profile, or the signed-in wallet's own org. */
export async function GET(request: Request) {
  try {
    await requireTeams();
    const orgId = new URL(request.url).searchParams.get("orgId");
    if (orgId) {
      const org = await getOrg(orgId);
      if (!org) throw new SintingaleError("NOT_FOUND", "Organisation not found.");
      return json({ org });
    }
    const session = await requireSession();
    return json({ org: await getOrgForOwner(session.address) });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Verifies ENS control for the signed-in wallet and writes the org entity. */
export async function POST(request: Request) {
  try {
    await requireTeams();
    const session = await requireSession();
    const { attrs } = z.object({ attrs: orgAttrsInput }).parse(await readJson(request));
    return json({ org: await createOrg(attrs, session.address) }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
