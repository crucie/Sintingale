// Sends a signed agent request to POST /api/invoices.
//
//   AGENT_PRIVATE_KEY=0x… AGENT_NAME=billing-bot.acme.eth ORG_ID=acme.eth \
//   PROJECT_ID=launch AMOUNT=10 BASE_URL=http://localhost:3000 npm run agent
//
// The agent's ENS name must resolve (on Sepolia) to AGENT_PRIVATE_KEY's address,
// and the org owner must have issued it an unexpired grant.
import { randomBytes } from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";
import { agentRequestMessage } from "../lib/arkiv/messages";

const env = (k: string, fallback?: string) => {
  const v = process.env[k] ?? fallback;
  if (!v) throw new Error(`Set ${k}`);
  return v;
};

const account = privateKeyToAccount(env("AGENT_PRIVATE_KEY") as `0x${string}`);
const base = env("BASE_URL", "http://localhost:3000");
const body = JSON.stringify({
  merchantId: env("MERCHANT_ID", "m_demo"),
  orgId: env("ORG_ID"),
  projectId: env("PROJECT_ID"),
  amount: env("AMOUNT", "10"),
  description: process.env.DESCRIPTION ?? "Invoice created by an agent",
  dueInHours: 24,
});

const timestamp = Math.floor(Date.now() / 1000);
const nonce = randomBytes(12).toString("hex");
const signature = await account.signMessage({
  message: agentRequestMessage({ method: "POST", path: "/api/invoices", timestamp, nonce, body }),
});

const res = await fetch(`${base}/api/invoices`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-sintingale-agent": env("AGENT_NAME"),
    "x-sintingale-timestamp": String(timestamp),
    "x-sintingale-nonce": nonce,
    "x-sintingale-signature": signature,
  },
  body,
});
console.log(res.status, JSON.stringify(await res.json(), null, 2));
