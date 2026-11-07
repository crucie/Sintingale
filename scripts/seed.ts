// Seeds a real organisation against a running Sintingale deployment (testnets):
// turns on Teams & ENS, links the ENS name and creates a project.
//
//   OWNER_PRIVATE_KEY=0x…        wallet that controls ENS_NAME on Sepolia
//   ENS_NAME=acme.eth            its ETH address (or sintingale.owner text) must be that wallet
//   BASE_URL=http://localhost:3000
//   npm run seed
import { privateKeyToAccount } from "viem/accounts";
import { createSiweMessage } from "viem/siwe";
import { authMessage } from "../lib/arkiv/messages";
import { projectIdToBytes32 } from "../lib/chain/splitter";
import type { AttrsByType, AuthorizedType } from "../lib/schema";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const ensName = (process.env.ENS_NAME ?? "").toLowerCase();
if (!process.env.OWNER_PRIVATE_KEY || !ensName) throw new Error("Set OWNER_PRIVATE_KEY and ENS_NAME");
const owner = privateKeyToAccount(process.env.OWNER_PRIVATE_KEY as `0x${string}`);
const me = owner.address.toLowerCase();
const now = () => Math.floor(Date.now() / 1000);

let cookie = "";
async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { "content-type": "application/json", origin: base, cookie, ...init.headers },
  });
  const set = res.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  const body = await res.json();
  if (!res.ok) throw new Error(`${path}: ${body?.error?.code} ${body?.error?.message}`);
  return body as T;
}

async function signed<T extends AuthorizedType>(type: T, attrs: Omit<AttrsByType[T], "authSig">) {
  const authSig = await owner.signMessage({ message: authMessage(type, attrs as AttrsByType[T]) });
  return { ...attrs, authSig };
}

console.log(`Seeding ${ensName} as ${me} on ${base}`);

const { nonce } = await call<{ nonce: string }>("/api/auth/nonce");
const message = createSiweMessage({
  domain: new URL(base).host,
  address: owner.address,
  statement: "Sign in to Sintingale (seed script).",
  uri: base,
  version: "1",
  chainId: 1874,
  nonce,
  issuedAt: new Date(),
  expirationTime: new Date(Date.now() + 5 * 60_000),
});
await call("/api/auth/verify", { method: "POST", body: JSON.stringify({ message, signature: await owner.signMessage({ message }) }) });
console.log("✓ signed in");

const { merchant } = await call<{ merchant: { merchantId: string; name: string; payout: string; wallet?: string; email?: string } }>("/api/merchants");
await call("/api/merchants", {
  method: "POST",
  body: JSON.stringify({ ...merchant, wallet: merchant.wallet ?? "", email: merchant.email ?? "", teamsEnabled: true }),
});
console.log("✓ Teams & ENS enabled");

const check = await call<{ ok: boolean; method: "addr" | "text"; resolvedAddress: string }>(
  `/api/ens/check?name=${ensName}&address=${me}`,
);
if (!check.ok) throw new Error(`${me} does not control ${ensName} (resolves to ${check.resolvedAddress})`);
await call("/api/orgs", {
  method: "POST",
  body: JSON.stringify({
    attrs: await signed("org", {
      orgId: ensName,
      ensName,
      owner: me,
      payout: check.resolvedAddress,
      merchantId: merchant.merchantId,
      verifyMethod: check.method,
      verifiedAt: now(),
    }),
  }),
});
console.log(`✓ org ${ensName} linked`);

const projectId = "launch";
const onchainId = projectIdToBytes32(ensName, projectId);
await call("/api/projects", {
  method: "POST",
  body: JSON.stringify({
    attrs: await signed("project", {
      orgId: ensName,
      projectId,
      name: "Launch",
      description: "Seeded by scripts/seed.ts",
      splitContract: "",
      onchainId,
      version: 0,
      shares: [],
      updatedAt: now(),
    }),
  }),
});
console.log("✓ project Launch created");

console.log("Next: set the share table from Dashboard → Projects. Saving it sends createProject to the ProjectSplitter from your wallet.");
