# Reach

> Lines marked **TODO** need numbers or commitments only the team can give. Fill them in before submitting.

## Who is it for, and would they use it?

Small software businesses that want to get paid in stablecoins without building billing:

- **Indie SaaS and API products** selling to crypto-native users. They need a paywall check (`hasAccess()`) more
  than they need a payment button.
- **Remote studios and contractors** billing clients abroad. They need an invoice link with a due date and a receipt
  the client can verify.
- **AI agents** that create invoices on a team's behalf, within a capped, time-limited grant.

They would use it because the integration is small. A SaaS backend adds the SDK and one access check:

```ts
import { Sintingale } from "@/lib/sdk";
const gp = new Sintingale({ baseUrl: process.env.SINTINGALE_URL!, apiKey: process.env.SINTINGALE_API_KEY! });
if (!(await gp.hasAccess({ merchantId: "m_demo", planId: "pro", customer: wallet }))) redirectToCheckout();
```

They can also skip our API and run the same Arkiv query themselves ([`why-arkiv.md`](./why-arkiv.md)).

**TODO:** people we showed it to at ETHGlobal Mumbai and what they said, for example "3 builders tried checkout, 1
wants it for their API".

## Can they try it today?

- **Hosted demo:** [sintingale.vercel.app](https://sintingale.vercel.app), with no login. `/demo` is a paywalled
  sample app, `/dashboard` is the merchant view, `/pay/<key>` is the customer checkout.
- **Locally, with no setup:** `npm install && npm run dev` runs everything in demo mode (in-memory ledger,
  simulated payments).
- **On testnet:** set the variables in the README to write to Arkiv Rabdi and settle real test USDT on Whitechain
  Sepolia.
- **Live on Rabdi now:** the `m_demo` merchant and its 4 plans, written by
  [`0xf927…bb06`](https://rabdi.explorer.arkiv.network/address/0xf9277DD2A25085F868796073A9BF8c0d37F6bb06).
  **TODO after the payment run:** receipts, entitlements and distinct payer wallets. Count them with
  `node scripts/arkiv-query.mjs receipt merchantId=m_demo --creator 0xf9277DD2A25085F868796073A9BF8c0d37F6bb06 --limit 100`.

## Will we keep building it after Mumbai?

**TODO (team):** a concrete next step and a date. Candidates from our limitations list:

- merchants writing their own entities from their wallet;
- gasless checkout;
- recurring pulls with `permit`;
- refunds.
