import { errorResponse, json, SintingaleError } from "@/lib/api";
import { requireTeams } from "@/lib/features";
import { getProject, resyncProject } from "@/lib/orgs";

/** Project detail. `?resync=1` re-resolves every member name and reports address changes. */
export async function GET(request: Request, ctx: RouteContext<"/api/projects/[id]">) {
  try {
    await requireTeams();
    const { id } = await ctx.params;
    const params = new URL(request.url).searchParams;
    const orgId = params.get("orgId");
    if (!orgId) throw new SintingaleError("BAD_REQUEST", "orgId is required.");
    const project = await getProject(orgId, id);
    if (!project) throw new SintingaleError("NOT_FOUND", "Project not found.");
    const resync = params.get("resync") ? await resyncProject(orgId, id) : null;
    return json({ project, resync });
  } catch (err) {
    return errorResponse(err);
  }
}
