import { z } from "zod";
import { requireTeams } from "@/lib/features";
import { errorResponse, json, readJson, SintingaleError } from "@/lib/api";
import { requireSession } from "@/lib/auth/siwe";
import { listProjects, saveProject } from "@/lib/orgs";
import { projectAttrsInput } from "@/lib/schema";

export async function GET(request: Request) {
  try {
    await requireTeams();
    const orgId = new URL(request.url).searchParams.get("orgId");
    if (!orgId) throw new SintingaleError("BAD_REQUEST", "orgId is required.");
    return json({ projects: await listProjects(orgId) });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Creates a project (version 0, no shares yet). Shares are set through /api/projects/:id/shares. */
export async function POST(request: Request) {
  try {
    await requireTeams();
    const session = await requireSession();
    const { attrs } = z.object({ attrs: projectAttrsInput }).parse(await readJson(request));
    if (attrs.version !== 0 || attrs.shares.length) {
      throw new SintingaleError("BAD_REQUEST", "Create the project first, then set its shares.");
    }
    return json({ project: await saveProject(attrs, session.address) }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
