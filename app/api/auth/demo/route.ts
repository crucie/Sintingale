import { cookies } from "next/headers";
import { requireTeams } from "@/lib/features";
import { z } from "zod";
import { errorResponse, json, readJson } from "@/lib/api";
import { encodeSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/siwe";
import { DEMO_IDENTITIES } from "@/lib/demo";
import { requireDemo } from "@/lib/demo-mode";
import { getOrgForOwner } from "@/lib/orgs";

const body = z.object({ role: z.enum(["owner", "alice", "bob", "carol"]) });

/** Local-ledger only: sign in as one of the seeded `.demo` identities without a wallet. */
export async function POST(request: Request) {
  try {
    await requireTeams();
    requireDemo();
    const { role } = body.parse(await readJson(request));
    const address = DEMO_IDENTITIES[role].address.toLowerCase();
    (await cookies()).set(SESSION_COOKIE, encodeSession({ address, demo: true }), sessionCookieOptions);
    return json({ address, demo: true, org: await getOrgForOwner(address) });
  } catch (err) {
    return errorResponse(err);
  }
}
