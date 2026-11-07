import { errorResponse, json } from "@/lib/api";
import { requireTeams } from "@/lib/features";
import { requireSession } from "@/lib/auth/siwe";
import { claimableFor } from "@/lib/orgs";

/** Claimable balances for the signed-in wallet across every project that credited it. */
export async function GET() {
  try {
    await requireTeams();
    const session = await requireSession();
    return json({ address: session.address, balances: await claimableFor(session.address) });
  } catch (err) {
    return errorResponse(err);
  }
}
