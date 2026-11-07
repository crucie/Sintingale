# How we use Arkiv

Arkiv is Sintingale's only database: there is no other store and no fallback. Every Arkiv feature we use
maps to something a merchant, a customer or a SaaS backend can see. The full entity list is in
[`schema.md`](./schema.md).

## Each feature, and what users see

| Arkiv feature | Where | What the user sees |
|---|---|---|
| **Attribute queries** (`eq` on `merchantId`, `planId`, `customer`; `gt` on `periodEnd`) | `hasAccess()` in [`lib/sintingale.ts`](../lib/sintingale.ts), `GET /api/access` | The `/demo` SaaS page unlocks right after payment, and locks again later. The access check is one query: no join, no cache, no cron. |
| **Expiration** on `entitlement` (`expiresAt = periodEnd`) | Relayer, after a verified payment | Access ends by itself when the billing period ends. A plan billed every 5 minutes shows this live. |
| **Expiration** on `invoice` (`dueAt + 120 s`) | Invoice creation | An unpaid checkout link stops working at its due time, and the checkout page shows "expired". Nothing has to clean it up. |
| **Expiration** on `invite` (48 h) and `grant` (owner picks 3 min to 30 days) | Teams & agents | Invite links die on schedule. An agent's "create invoices up to 25 USDT for 24 h" permission ends exactly when its grant expires. |
| **`$creator` filter** (`.createdBy(writer)`) | Every read of `receipt`, `entitlement`, `payout`, `claim` | The receipt page's first check, "Written by the Sintingale relayer", reads `$creator`. A forged receipt written by anyone else never counts as paid and never unlocks access. |
| **Entity keys** (`$key`) | Checkout and receipt URLs | `/pay/<invoiceKey>` and `/receipt/<receiptKey>` are Arkiv entity keys. A customer can share the receipt link, and anyone can look the entity up on the Arkiv explorer. |
| **Append-only versions** (new entity per change, newest wins) | `merchant`, `project` share tables | A share-table change only affects later payments, and each `payout` keeps the `version` it was credited under. Members can see which split paid them. |
| **Signed attributes** (`authSig`, checked on read) | `org`, `project`, `member`, `invite`, `grant`, `revocation` | Team pages only show members and grants the ENS owner actually signed, even though one server key writes them. |

## Do the filters, edit rights and expiry fit the app?

- **What we filter on.** These are the fields a billing system looks things up by: merchant, plan, customer, invoice id,
  tx hash, and "period still running" (`periodEnd > now`). Each indexed attribute in
  [`lib/ledger/arkiv.ts`](../lib/ledger/arkiv.ts) is backed by at least one query in the code. Everything else
  sits in the non-indexed `data` attribute, a `bytes` column holding the full record as JSON.
- **Who can edit.** Only the writer key creates entities, and nothing is updated in place, so a receipt
  can't be altered after it is written. Every receipt is cross-checked against the `Paid` event on Whitechain,
  both by the relayer before writing and by the public receipt page after.
- **When things expire.** Each expiry is a business rule, not a storage setting:
  - an invoice is valid until its due date;
  - access lasts for the billing period;
  - a receipt is kept for 180 days (long enough to cover refunds and accounting);
  - merchant profiles and plans last 180 days, Rabdi's longest lifetime, and are re-written whenever they change.

## What doesn't fit yet

- **One writer.** `$owner` is Sintingale's key, not the merchant's. The next step is merchants writing their own
  `plan` and `invoice` entities from their wallet, with the relayer writing only receipts and entitlements.
- **Expired invoices vanish.** That's right for checkout, but the dashboard still wants to show "Expired". We remember
  pending invoices in the browser's localStorage and mark the ones that disappear
  ([`lib/client/hooks.ts`](../lib/client/hooks.ts)).
- **Client-side sorting.** We fetch a page of up to 100 entities and sort by `createdAt` from the JSON `data` attribute.
  That's fine at hackathon scale, but should move to `orderBy` on an indexed attribute.
