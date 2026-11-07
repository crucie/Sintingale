# Arkiv friction log

SDK `@arkiv-network/sdk` 1.0.1 on Rabdi (chain `7794095`), Node 20.20, Next.js 16, viem 2.x.

> Items 1–5 are things we hit while building. **TODO (team):** add any breakage you saw yourselves
> under "When something broke", with versions and repro steps.

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

Template for each item:

- **Expected:**
- **What happened:** (error text, tx hash, entity key)
- **How to reproduce:** (command, SDK version, network)
