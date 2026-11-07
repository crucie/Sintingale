// Queries Sintingale entities straight from Arkiv (Rabdi testnet), with no app server involved.
//
//   node scripts/arkiv-query.mjs <type> [attr=value ...] [attr>number ...] [--creator 0x…] [--limit n]
//
//   # Every receipt for the demo merchant, trusted only if the Sintingale writer created it
//   node scripts/arkiv-query.mjs receipt merchantId=m_demo --creator 0xf9277DD2A25085F868796073A9BF8c0d37F6bb06
//   # Active entitlements: exactly the query behind /api/access and hasAccess()
//   node scripts/arkiv-query.mjs entitlement merchantId=m_demo planId=pro periodEnd>now --creator 0xf9277DD2A25085F868796073A9BF8c0d37F6bb06
//
// Types: merchant plan invoice receipt entitlement org project member invite inviteAccept
// payout grant revocation claim. `now` is replaced with the current unix time.
// ARKIV_ACCESS_KEY is optional; without it the public, rate-limited RPC is used.
import { createPublicClient } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { and, eq, gt } from "@arkiv-network/sdk/query";
import { bytes, defineSchema, str, u64 } from "@arkiv-network/sdk/schema";
import { hexToString, http } from "viem";

const args = process.argv.slice(2);
const type = args.shift();
if (!type || type.startsWith("-")) {
  console.error("Usage: node scripts/arkiv-query.mjs <type> [attr=value] [attr>number] [--creator 0x…] [--limit n]");
  process.exit(1);
}

let creator;
let limit = 20;
const columns = { data: bytes() };
const filters = [];
const now = Math.floor(Date.now() / 1000);
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--creator") creator = args[++i];
  else if (arg === "--limit") limit = Number(args[++i]);
  else if (arg.includes(">")) {
    const [name, raw] = arg.split(">");
    columns[name] = u64().indexed();
    filters.push(gt(name, u64(BigInt(raw === "now" ? now : raw))));
  } else if (arg.includes("=")) {
    const [name, ...rest] = arg.split("=");
    const value = rest.join("=");
    columns[name] = str().indexed();
    filters.push(eq(name, str(value)));
  } else throw new Error(`Cannot parse filter "${arg}"`);
}

const schema = defineSchema(`sintingale.${type}`, columns);
const client = createPublicClient({ chain: rabdi({ accessKey: process.env.ARKIV_ACCESS_KEY ?? "" }), transport: http() });

let query = client.select({ $key: true, $creator: true, $owner: true, $expiresAt: true, data: true }).from(schema);
if (filters.length === 1) query = query.where(filters[0]);
if (filters.length > 1) query = query.where(and(...filters));
if (creator) query = query.createdBy(creator);

console.log(`arkiv_query: ${query.toString()}\n`);
const { entities } = await query.limit(Math.min(100, limit)).fetch();
for (const row of entities) {
  const { attrs, expiresAt } = JSON.parse(row.data?.value ? hexToString(row.data.value) : "{}");
  console.log(
    JSON.stringify(
      { key: row.$key, creator: row.$creator, owner: row.$owner, expiresAt: expiresAt ? new Date(expiresAt * 1000).toISOString() : undefined, attrs },
      null,
      2,
    ),
  );
}
console.log(`\n${entities.length} ${type} entit${entities.length === 1 ? "y" : "ies"}`);
