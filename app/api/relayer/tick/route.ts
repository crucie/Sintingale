import { connection } from "next/server";
import { errorResponse, SintingaleError, json } from "@/lib/api";
import { onchainEnabled } from "@/lib/config";
import { relayerTick, systemInfo } from "@/lib/sintingale";

/**
 * Scheduled relayer pass (e.g. a Vercel cron). Protect it with CRON_SECRET in
 * production; the checkout's /api/payments/notify call covers the fast path.
 */
export async function GET(request: Request) {
  await connection();
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) throw new SintingaleError("NOT_CONFIGURED", "Set CRON_SECRET to enable the relayer backstop.");
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      throw new SintingaleError("UNAUTHORIZED", "Invalid cron secret.");
    }
    if (!onchainEnabled) {
      return json({ ok: true, skipped: "On-chain mode is not configured.", system: systemInfo() });
    }
    return json({ ok: true, ...(await relayerTick()), system: systemInfo() });
  } catch (err) {
    return errorResponse(err);
  }
}
