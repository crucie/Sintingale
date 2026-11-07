# Arkiv friction log

SDK `@arkiv-network/sdk` 1.0.1 on Rabdi (chain `7794095`), Node 20.20, Next.js 16, viem 2.x.

> The improvements below come from building. "When something broke" lists the two errors from our first live
> writes, each with the exact error text and a one-line repro.

## What should you improve today?

1. **Docs disagree on which testnet is current.**
   - The [Rabdi page](https://docs.arkiv.network/networks/rabdi/) says Rabdi is current.
   - The [Braga page](https://docs.arkiv.network/networks/braga/) still says "Tiramisu is the current public testnet".
   - The [Devcon Mumbai blog post](https://arkiv.network/blog/arkiv-web3-database-tour-road-to-devcon-mumbai) asks for
     wallet addresses "on Tiramisu (our testnet)".

   We had to cross-check three pages to be sure we were writing to the network that counts.

2. **The SDK README on GitHub teaches an API that no longer works on Rabdi.**
   [`arkiv-sdk-js`](https://github.com/Arkiv-Network/arkiv-sdk-js) uses `tiramisu` and v0.6-style
   `.ownedBy()`, `hasNextPage()`, `next()` and `for await` paging. The
   [migration notes](https://docs.arkiv.network/networks/older-networks/) say cursors are gone on Rabdi. The first
   thing you copy from the repo should match the current network.

3. **Typed queries are hard to compose dynamically.** `select().from(schema).where(...)` is great when the filter
   is written by hand. We build filters from a generic `{ eq, gt }` object and had to cast the builder through
   `unknown` to call `.where()`, `.createdBy()` and `.limit()` conditionally
   ([`lib/ledger/arkiv.ts`](../lib/ledger/arkiv.ts), `run()`). An untyped builder, or a typed
   `where(expressions[])` that accepts an empty array, would remove the casts.

4. **There is no way to see that something expired.** Self-expiring invoices are the best part of Arkiv for us.
   But a merchant dashboard wants to list "Expired: never paid", and an expired entity is simply gone from
   queries. We remember pending invoices in localStorage to fake it. A short-lived tombstone, an "expired since
   block N" query, or an expiry event a watcher can subscribe to would fix this.

5. **Ordering by our own timestamp.** We keep `createdAt` in a JSON attribute and sort a page of 100 entities on the client.
   A pointer from the query docs to the right pattern would have helped: index a `u64` and use `orderBy`, or use
   `$createdAt`.

What worked well:

- The public-RPC warning tells you exactly where to get an access key.
- `ExpirationTime.fromSeconds()` is obvious.
- `toString()` on a query builder prints the exact `arkiv_query` text, which made our judge-facing query script
  ([`scripts/arkiv-query.mjs`](../scripts/arkiv-query.mjs)) trivial.

## When something broke

Both of these surfaced only on the first real write to Rabdi. The in-memory ledger we had developed against (since
removed: Sintingale now runs on Arkiv only), and TypeScript, accepted the same calls.

### 1. A `str` attribute silently caps at 128 bytes

- **Expected:** `str()` to hold a JSON string of a few hundred bytes. The schema docs describe `str` as "a string",
  and nothing in the types hints at a size limit.
- **What happened:** the first `createEntity` threw
  `InvalidValueError: Invalid str value "{"attrs":{"merchantId":"m_demo",…": 239 UTF-8 bytes exceeds the 128-byte
  limit on a str. Store the long form in a bytes column and keep a short, queryable key here.` The message itself is
  excellent and told us the fix: we moved the record into a `bytes()` column.
- **How to reproduce:** SDK 1.0.1, Rabdi. Run
  `createEntity(defineSchema("t", { data: str() }), { data: str("x".repeat(129)) })`.
- **Suggestion:** state the 128-byte limit wherever `str` is introduced. A typed hint would be even better, or a
  `text()` column that maps to `bytes` with UTF-8 encode and decode built in. Storing a JSON document is the most
  common thing a new user tries.

### 2. A one-year expiry is rejected

- **Expected:** `ExpirationTime.fromSeconds(365 * 86400)` to work. Merchant profiles and plans are long-lived records.
- **What happened:** `InvalidExpiryError: Invalid expiry: a lifetime of 15768000 blocks is longer than the chain's
  maximum lifetime of 7884000 blocks (about 182 days). Use ExpirationTime.max() for the longest lifetime allowed.`
  We now cap every lifetime at 180 days ([`lib/ledger/arkiv.ts`](../lib/ledger/arkiv.ts)). That means a yearly plan's
  entitlement ends early, and long-lived records need a refresh job.
- **How to reproduce:** SDK 1.0.1, Rabdi. Run `createEntity(schema, values, { expiration: ExpirationTime.fromSeconds(31536000) })`.
- **Suggestions:**
  - Put the maximum lifetime on the Rabdi network page, next to block time.
  - Export it as a constant (seconds and blocks), so apps can clamp before sending.
  - Document an "extend" or "renew" pattern for records that should outlive the cap.
