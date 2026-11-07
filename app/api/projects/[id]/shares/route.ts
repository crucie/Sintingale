import { z } from "zod";
import { requireTeams } from "@/lib/features";
import { errorResponse, json, readJson, SintingaleError } from "@/lib/api";
import { requireSession } from "@/lib/auth/siwe";
import { proposeShares, requireOwner, saveProject } from "@/lib/orgs";
import { projectAttrsInput } from "@/lib/schema";

const proposal = z.object({
  orgId: z.string().min(3),
  rows: z
    .array(z.object({ subname: z.string().min(3).max(120), contribution: z.number().positive().max(1_000_000) }))
    .min(1)
    .max(50),
});

/** Resolves every member name on Sepolia and returns the proposed table for the owner to confirm. */
export async function PUT(request: Request, ctx: RouteContext<"/api/projects/[id]/shares">) {
  try {
    await requireTeams();
    const session = await requireSession();
    await ctx.params;
    const { orgId, rows } = proposal.parse(await readJson(request));
    await requireOwner(orgId, session.address);
    return json(await proposeShares(orgId, rows));
  } catch (err) {
    return errorResponse(err);
  }
}

/** Saves a signed new version of the share table (after the on-chain createProject/updateShares). */
export async function POST(request: Request, ctx: RouteContext<"/api/projects/[id]/shares">) {
  try {
    await requireTeams();
    const session = await requireSession();
    const { id } = await ctx.params;
    const { attrs } = z.object({ attrs: projectAttrsInput }).parse(await readJson(request));
    if (attrs.projectId !== id) throw new SintingaleError("BAD_REQUEST", "Project id mismatch.");
    if (!attrs.shares.length) throw new SintingaleError("BAD_REQUEST", "Add at least one share.");
    return json({ project: await saveProject(attrs, session.address) }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
