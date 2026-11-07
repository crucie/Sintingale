import { z } from "zod";
import { requireTeams } from "@/lib/features";
import { errorResponse, json, readJson } from "@/lib/api";
import { requireSession } from "@/lib/auth/siwe";
import { recordSimulatedClaim } from "@/lib/orgs";

const body = z.object({ orgId: z.string().min(3), projectId: z.string().min(2) });

/** Simulated mode only. With the splitter deployed, members call claim() from their own wallet. */
export async function POST(request: Request) {
  try {
    await requireTeams();
    const session = await requireSession();
    const { orgId, projectId } = body.parse(await readJson(request));
    return json(await recordSimulatedClaim(session.address, orgId, projectId));
  } catch (err) {
    return errorResponse(err);
  }
}
