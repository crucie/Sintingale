import { connection } from "next/server";
import { errorResponse, json } from "@/lib/api";
import { issueNonce } from "@/lib/auth/siwe";

export async function GET() {
  await connection();
  try {
    return json({ nonce: issueNonce() });
  } catch (err) {
    return errorResponse(err);
  }
}
