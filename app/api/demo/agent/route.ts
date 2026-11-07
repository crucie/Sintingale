import { randomBytes } from "node:crypto";
import { requireTeams } from "@/lib/features";
import { z } from "zod";
import { errorResponse, json, readJson, SintingaleError } from "@/lib/api";
import { agentRequestMessage } from "@/lib/arkiv/messages";
import { AGENT_HEADERS } from "@/lib/auth/agent";
import { publicConfig } from "@/lib/config";
import { DEMO_ORG_NAME } from "@/lib/demo";
import { demoAccount } from "@/lib/demo-keys";
import { requireDemo } from "@/lib/demo-mode";

const body = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,6})?$/),
  projectId: z.string().min(2),
  impersonate: z.boolean().optional(),
});

/**
 * Demo harness: signs a real agent request as billing-bot.acme.demo and sends it
 * through POST /api/invoices, so the verification middleware runs unchanged.
 * `impersonate` signs with a different key to show AGENT_NAME_MISMATCH.
 */
export async function POST(request: Request) {
  try {
    await requireTeams();
    requireDemo();
    const { amount, projectId, impersonate } = body.parse(await readJson(request));
    const signer = demoAccount(impersonate ? "carol" : "agent");
    const payload = JSON.stringify({
      merchantId: publicConfig.merchantId,
      orgId: DEMO_ORG_NAME,
      projectId,
      amount,
      description: `Agent invoice for ${projectId}`,
      dueInHours: 24,
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = randomBytes(12).toString("hex");
    const url = new URL("/api/invoices", request.url);
    const signature = await signer.signMessage({
      message: agentRequestMessage({ method: "POST", path: url.pathname, timestamp, nonce, body: payload }),
    });
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [AGENT_HEADERS.name]: "billing-bot.acme.demo",
        [AGENT_HEADERS.signature]: signature,
        [AGENT_HEADERS.timestamp]: String(timestamp),
        [AGENT_HEADERS.nonce]: nonce,
      },
      body: payload,
    });
    const result = await res.json();
    if (!res.ok) throw new SintingaleError(result?.error?.code ?? "INTERNAL", result?.error?.message ?? "Agent request failed");
    return json(result, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
