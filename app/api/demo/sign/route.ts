import { z } from "zod";
import { requireTeams } from "@/lib/features";
import { errorResponse, json, readJson, SintingaleError } from "@/lib/api";
import { requireSession } from "@/lib/auth/siwe";
import { DEMO_IDENTITIES, type DemoRole } from "@/lib/demo";
import { demoAccount } from "@/lib/demo-keys";
import { requireDemo } from "@/lib/demo-mode";

const body = z.object({ message: z.string().min(10).max(4_000) });

/**
 * Signs authorisation messages for a demo session's own identity. A demo user
 * can only ever produce signatures for the `.demo` wallet they are signed in as.
 */
export async function POST(request: Request) {
  try {
    await requireTeams();
    requireDemo();
    const session = await requireSession();
    if (!session.demo) throw new SintingaleError("FORBIDDEN", "Use your wallet to sign.");
    const role = (Object.keys(DEMO_IDENTITIES) as DemoRole[]).find(
      (r) => DEMO_IDENTITIES[r].address.toLowerCase() === session.address,
    );
    if (!role) throw new SintingaleError("FORBIDDEN", "Unknown demo identity.");
    const { message } = body.parse(await readJson(request));
    if (!/^Sintingale (authorization|invite acceptance)\n/.test(message)) {
      throw new SintingaleError("BAD_REQUEST", "Only Sintingale authorisation messages can be signed here.");
    }
    return json({ signature: await demoAccount(role).signMessage({ message }) });
  } catch (err) {
    return errorResponse(err);
  }
}
