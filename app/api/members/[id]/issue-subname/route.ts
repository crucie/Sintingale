import { z } from "zod";
import { requireTeams } from "@/lib/features";
import { errorResponse, json, readJson, SintingaleError } from "@/lib/api";
import { requireSession } from "@/lib/auth/siwe";
import { isDemoName } from "@/lib/demo";
import { requireDemo } from "@/lib/demo-mode";
import { demoIssue } from "@/lib/ens/demo-registry";
import { invalidateEns } from "@/lib/ens/resolve";
import { isValidLabel, subnameInstructions, subnameOf } from "@/lib/ens/subnames";
import { requireOwner } from "@/lib/orgs";

const body = z.object({ orgId: z.string().min(3), address: z.string().regex(/^0x[0-9a-fA-F]{40}$/) });

/**
 * Returns the exact subname to create in the ENS app for this member (`id` is the
 * label). The owner's own wallet does the ENS write; Sintingale never holds the
 * name. For `.demo` orgs it issues the name in the local demo registry instead.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/members/[id]/issue-subname">) {
  try {
    await requireTeams();
    const session = await requireSession();
    const { id: label } = await ctx.params;
    const { orgId, address } = body.parse(await readJson(request));
    if (!isValidLabel(label)) throw new SintingaleError("BAD_REQUEST", "Invalid subname label.");
    const org = await requireOwner(orgId, session.address);
    const instructions = subnameInstructions(label, org.attrs.ensName, address.toLowerCase());
    if (isDemoName(org.attrs.ensName)) {
      requireDemo();
      demoIssue(subnameOf(label, org.attrs.ensName), address);
      invalidateEns(subnameOf(label, org.attrs.ensName));
      return json({ instructions, issued: true });
    }
    return json({ instructions, issued: false });
  } catch (err) {
    return errorResponse(err);
  }
}
