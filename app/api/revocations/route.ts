import { z } from "zod";
import { requireTeams } from "@/lib/features";
import { errorResponse, json, readJson } from "@/lib/api";
import { requireSession } from "@/lib/auth/siwe";
import { revoke } from "@/lib/orgs";
import { revocationAttrsInput } from "@/lib/schema";

/** Revoking writes a signed `revocation` entity that grant and member checks honour. */
export async function POST(request: Request) {
  try {
    await requireTeams();
    const session = await requireSession();
    const { attrs } = z.object({ attrs: revocationAttrsInput }).parse(await readJson(request));
    const entity = await revoke(attrs, session.address);
    return json({ revocation: { ...entity.attrs, key: entity.key } }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
