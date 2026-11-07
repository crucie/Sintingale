import { z } from "zod";
import { requireTeams } from "@/lib/features";
import { errorResponse, json, readJson, SintingaleError } from "@/lib/api";
import { requireSession } from "@/lib/auth/siwe";
import { isValidLabel, subnameInstructions } from "@/lib/ens/subnames";
import { requireOwner } from "@/lib/orgs";

const body = z.object({ orgId: z.string().min(3), address: z.string().regex(/^0x[0-9a-fA-F]{40}$/) });

/**
 * Returns the exact subname to create in the ENS app for this member (`id` is the
 * label). The owner's own wallet does the ENS write; Sintingale never holds the name.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/members/[id]/issue-subname">) {
  try {
    await requireTeams();
    const session = await requireSession();
    const { id: label } = await ctx.params;
    const { orgId, address } = body.parse(await readJson(request));
    if (!isValidLabel(label)) throw new SintingaleError("BAD_REQUEST", "Invalid subname label.");
    const org = await requireOwner(orgId, session.address);
    return json({ instructions: subnameInstructions(label, org.attrs.ensName, address.toLowerCase()), issued: false });
  } catch (err) {
    return errorResponse(err);
  }
}
