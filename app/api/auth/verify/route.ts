import { cookies } from "next/headers";
import { z } from "zod";
import { errorResponse, json, rateLimit, readJson } from "@/lib/api";
import { encodeSession, SESSION_COOKIE, sessionCookieOptions, verifySiwe } from "@/lib/auth/siwe";
import { getOrgForOwner } from "@/lib/orgs";

const body = z.object({ message: z.string().min(20).max(2_000), signature: z.string().regex(/^0x[0-9a-fA-F]+$/) });

/** Sign-In with Ethereum: verifies the signed message and sets an HTTP-only session cookie. */
export async function POST(request: Request) {
  try {
    rateLimit(request, "siwe", 20);
    const { message, signature } = body.parse(await readJson(request));
    const address = await verifySiwe(message, signature, request.headers.get("host") ?? "");
    (await cookies()).set(SESSION_COOKIE, encodeSession({ address, demo: false }), sessionCookieOptions);
    return json({ address, demo: false, org: await getOrgForOwner(address) });
  } catch (err) {
    return errorResponse(err);
  }
}
