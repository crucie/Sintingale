import { errorResponse, json, rateLimit, readJson } from "@/lib/api";
import { recordPayment } from "@/lib/sintingale";
import { notifyInput } from "@/lib/schema";

/** The checkout posts its txHash here so the relayer can confirm immediately instead of waiting for a poll. */
export async function POST(request: Request) {
  try {
    rateLimit(request, "notify", 30);
    const input = notifyInput.parse(await readJson(request));
    return json(await recordPayment(input));
  } catch (err) {
    return errorResponse(err);
  }
}
