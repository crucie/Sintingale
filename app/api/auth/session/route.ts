import { cookies } from "next/headers";
import { errorResponse, json } from "@/lib/api";
import { getSession, SESSION_COOKIE } from "@/lib/auth/siwe";
import { demoAvailable } from "@/lib/demo-mode";
import { getOrgForOwner } from "@/lib/orgs";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return json({ session: null, demoAvailable: demoAvailable() });
    return json({
      session: { address: session.address, demo: session.demo, org: await getOrgForOwner(session.address) },
      demoAvailable: demoAvailable(),
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE() {
  (await cookies()).delete(SESSION_COOKIE);
  return json({ ok: true });
}
