# Why Arkiv

## If we swapped Arkiv for Postgres, what would users lose?

**SaaS backends would have to trust our API instead of checking for themselves.**
A merchant's backend asks one question: "is this wallet paid up for this plan right now?" On Arkiv,
that is a public query any backend can run without Sintingale's server:

```bash
node scripts/arkiv-query.mjs entitlement merchantId=m_demo planId=pro customer=0xCUSTOMER "periodEnd>now" --creator 0xWRITER
```

With Postgres, the only way to get that answer is to call us and believe what comes back. If Sintingale is down, rate
limited or shut down, the merchant's paywall breaks.

**Customers would lose the ability to verify their receipt.**
A receipt on Arkiv is a public entity with a known `$creator`, and it names the Whitechain transaction that paid
for it. The receipt page checks both against each other, and anyone can redo that check without us. A row in
our database is only as believable as our database.

**Expiry would be a cron job we promise to run.**
An unpaid invoice, an access period, a 48-hour invite and an agent's 24-hour spending permission all end
because the entity expires on Arkiv. With Postgres each of these needs a job that deletes or flags rows, and
every read has to remember to filter out stale ones. If that job fails, people keep access they shouldn't have.

**Merchants would be locked in.**
Plans, invoices and receipts sit on a public network under a documented schema ([`schema.md`](./schema.md)).
A merchant who leaves Sintingale, or a second app such as an accounting export or an alternative checkout,
can read the same records without an export.

## What we kept off Arkiv, and why

| Kept off Arkiv | Where it lives instead | Why |
|---|---|---|
| The money | Whitechain Sepolia, USDT through `PaymentRouter` | Settlement needs a token transfer and an event anyone can check. Arkiv stores the record of it, not the value. |
| Private keys, API keys, session secrets | Server environment variables | Never belongs on a public ledger. |
| Sign-in nonces and sessions | Stateless HMAC tokens in cookies | They live for 5 minutes, are private to one browser, and nothing else needs to read them. |
| ENS ownership | ENS on Ethereum Sepolia, re-resolved at checkout | ENS is the source of truth. Keeping a copy would let it go stale, so checkout re-reads it and blocks payment on a mismatch. |
| The "expired" label on old invoices | The merchant's browser (localStorage) | Arkiv correctly stops returning expired invoices. The label is a dashboard convenience, not shared state. |
| Demo mode data | In-process memory ledger with the same interface | So the app runs with zero setup. Arkiv mode uses identical queries. |
