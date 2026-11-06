# Sintingale

Stripe-alternative billing for SaaS. **Money moves on Whitechain. State lives on Arkiv. Access is a query.**

Merchants create products and checkout links, customers pay USDT on Whitechain, and every invoice,
receipt and entitlement is an attribute-indexed, self-expiring entity on Arkiv. A SaaS backend checks
access with a single query. See [`ref_doc.md`](./ref_doc.md) for the full project spec.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no environment variables the app runs in **demo mode**:

- **Ledger:** an in-process emulation of Arkiv entities (attributes, `$creator`, expiry), seeded with a
  demo merchant, four plans, paid receipts and pending invoices.
- **Payments:** checkout runs the same approve → pay → receipt state machine, clearly labelled as
  simulated, and the relayer still writes a receipt and entitlement.

## Going on-chain

1. Deploy `contracts/src/MockUSDT.sol` (or use an official testnet USDT) and
   `contracts/src/PaymentRouter.sol` to Whitechain Sepolia (chain `1874`), e.g. with Foundry:
   ```bash
   forge create contracts/src/MockUSDT.sol:MockUSDT --rpc-url $RPC --private-key $PK --broadcast
   forge create contracts/src/PaymentRouter.sol:PaymentRouter --rpc-url $RPC --private-key $PK --broadcast
   ```
2. Set `NEXT_PUBLIC_PAYMENT_ROUTER_ADDRESS` and `NEXT_PUBLIC_USDT_ADDRESS` (see `.env.example`).
   Checkout switches to real `approve` + `payInvoice` calls through the injected wallet.
3. In **Dashboard → Settings**, connect the merchant wallet and register the payout address on the router.
4. Set `ARKIV_ENABLED=true`, `ARKIV_ACCESS_KEY` and a funded `ARKIV_PRIVATE_KEY` to write entities to the
   Arkiv Rabdi testnet instead of memory. The same key is the trusted `$creator` for receipts.

The relayer runs inside the app: the checkout posts its tx hash to `/api/payments/notify`, which reads the
`Paid` event, checks invoice id, amount, token and merchant against the Arkiv invoice, and only then writes
the receipt and entitlement. `/api/relayer/tick` is a cron-friendly backstop that pages `eth_getLogs` in
1,000-block chunks.

> Verify the Whitechain RPC and explorer URLs against current docs before deploying; the defaults are
> placeholders.

## Routes

| Route | Purpose |
|---|---|
| `/` | Landing page (GSAP + ScrollTrigger) |
| `/dashboard` | Revenue, paid/pending counts, active entitlements, recent activity |
| `/dashboard/products` | Create and list plans, with a live checkout preview |
| `/dashboard/invoices` | Paid / pending / expired invoices (table on `md+`, cards on mobile) |
| `/dashboard/invoices/new` | Create an invoice, get a link and QR code |
| `/dashboard/settings` | Merchant profile, payout, API key, network info |
| `/pay/[invoiceKey]` | Mobile-first customer checkout |
| `/receipt/[receiptKey]` | Public receipt with Arkiv vs. Whitechain verification |
| `/demo` | Paywalled sample SaaS app using `hasAccess()` |

## API

| Method | Route | Auth |
|---|---|---|
| `GET/POST` | `/api/merchants` | Dashboard (same-origin) or API key |
| `GET/POST` | `/api/plans` | Dashboard or API key |
| `GET/POST` | `/api/invoices` | Dashboard or API key |
| `GET` | `/api/invoices/:key` | Public |
| `POST` | `/api/payments/notify` | Public, rate-limited |
| `GET` | `/api/access?merchantId=&planId=&customer=` | API key (`x-api-key`) |
| `GET` | `/api/verify/:receiptKey` | Public, rate-limited |
| `GET` | `/api/stats` | Dashboard or API key |
| `GET` | `/api/relayer/tick` | `CRON_SECRET` bearer, if set |

Errors use `{ "error": { "code": "INVOICE_EXPIRED", "message": "…" } }`.

```ts
import { Sintingale } from "@/lib/sdk";

const gp = new Sintingale({ baseUrl: "https://sintingale.app", apiKey: process.env.SINTINGALE_API_KEY! });
const active = await gp.hasAccess({ merchantId: "m_demo", planId: "pro", customer: "0x…" });
```

## Known limitations

- The in-memory ledger lives in one server process; use Arkiv mode for multi-instance hosting.
- Merchant routes use same-origin checks rather than wallet-signature auth.
- Sponsored (gasless) payments, recurring `charge()` subscriptions and World ID are not implemented.
- The Arkiv ↔ Whitechain link is application-level; the relayer is a single trusted writer.
