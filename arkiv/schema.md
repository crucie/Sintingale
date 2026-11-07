# Arkiv schema

Sintingale writes every billing record to Arkiv's **Rabdi** testnet (chain `7794095`) with
`@arkiv-network/sdk` 1.0.1. Code: [`lib/ledger/arkiv.ts`](../lib/ledger/arkiv.ts).

## How an entity is laid out

Each entity type is a named schema, `defineSchema("sintingale.<type>", …)`, so every entity carries the
tag attribute `arkiv.schema = "sintingale.<type>"`. Each entity has:

- **Indexed attributes**: the fields we filter on. They are `str` for ids and addresses, `u64` for amounts and timestamps.
- **A `data` attribute**: the full record as UTF-8 JSON (`{ attrs, createdAt, expiresAt }`), so the UI can render a
  row from one read. It is a `bytes` column, because a `str` value is capped at 128 bytes.

Entities are never updated in place. A change, such as a merchant editing their profile or a project changing
its share table, writes a new entity, and reads take the newest one. Old versions expire on their own.

## Who owns and who writes

| Who | Address | Writes |
|---|---|---|
| Sintingale writer (`ARKIV_PRIVATE_KEY`) | [`0xf9277DD2A25085F868796073A9BF8c0d37F6bb06`](https://rabdi.explorer.arkiv.network/address/0xf9277DD2A25085F868796073A9BF8c0d37F6bb06) | Every entity below. It is both `$creator` and `$owner`. |

The writer address is also the **trust anchor**:

- **Receipts, entitlements, payouts and claims** are only believed when `$creator` is the writer.
  Every read adds `.createdBy(writer)`. Anyone can write an entity tagged `sintingale.receipt` to Arkiv, but it
  never unlocks access.
- **Receipts and entitlements** are only written by the relayer after it reads a matching `Paid` event on
  Whitechain (see [`lib/relayer.ts`](../lib/relayer.ts)).
- **Org-scoped entities** (`org`, `project`, `member`, `invite`, `grant`, `revocation`) also carry
  `authSig`. This is an EIP-191 signature by the org owner's wallet over the attributes. It is checked on every
  read ([`lib/arkiv/trust.ts`](../lib/arkiv/trust.ts)), so the writer cannot invent a team member or a
  grant on its own. `inviteAccept` is signed by the invitee instead.

No private keys or secrets go into entities. Customers are identified by wallet address. Two plain-text
emails can also land in entities: the merchant's billing email, and an invoice's customer email when the
merchant bills by email. The demo only uses test addresses. Hashing these is on the limitations list.

## Entities

### Core billing (used in the main flow)

| Type | Indexed attributes we query | Queried by | Expires |
|---|---|---|---|
| `merchant` | `merchantId`, `payout` | Dashboard, checkout header, relayer merchant check | 180 days after each version |
| `plan` | `merchantId`, `planId`, `token`, `recurrence`, `amount`, `intervalSec` | Products page, `/demo`, invoice creation | 180 days |
| `invoice` | `merchantId`, `invoiceId`, `planId`, `customer`, `status`, `orgId`, `projectId`, `createdBy`, `grantId`, `amount`, `dueAt` | Checkout page (by `$key`), invoices list, relayer backstop | `dueAt + INVOICE_GRACE_SEC` (default 120 s). An unpaid invoice disappears by itself. |
| `receipt` | `invoiceId`, `invoiceKey`, `merchantId`, `customer`, `txHash`, `planId`, `orgId`, `projectId`, `grantId`, `amount`, `paidAt` | Public receipt page, "Paid" status, revenue chart, duplicate-payment check | `paidAt + 180 days` |
| `entitlement` | `merchantId`, `planId`, `customer`, `invoiceId`, `periodEnd` | `hasAccess()` / `GET /api/access`, `/demo` paywall, "active entitlements" stat | `periodEnd`, the end of the billing period. Access ends when the entity expires. |

Billing periods are 30 days for one-time plans, 7 for weekly, 30 for monthly, 365 for yearly and 5 minutes
for plans billed every 5 minutes.

**The 180-day cap.** Rabdi rejects any lifetime longer than about 182 days (7,884,000 blocks). The ledger caps
every lifetime at 180 days ([`lib/ledger/arkiv.ts`](../lib/ledger/arkiv.ts)), so anything the app asks to keep
longer gets 180 days on Arkiv:

- **Merchants, plans and team records** are re-written whenever they change, and otherwise need a refresh
  within 180 days.
- **A yearly plan's entitlement** currently ends at 180 days. That is a known limitation.

### Teams, splits and agents (optional "Teams & ENS" feature)

| Type | Indexed attributes we query | Queried by | Expires |
|---|---|---|---|
| `org` | `orgId`, `ensName`, `owner`, `payout`, `merchantId`, `verifiedAt` | Org overview, checkout's verified-name badge | 180 days |
| `project` | `orgId`, `projectId`, `splitContract`, `version` | Projects page, project invoices | 180 days per version |
| `member` | `orgId`, `subname`, `address`, `role`, `kind`, `joinedAt` | Team page, share editor | 180 days |
| `invite` | `orgId`, `inviteId`, `inviteeAddress`, `role`, `createdAt` | Invite landing page, pending invites | `createdAt + INVITE_TTL_SECONDS` (default 48 h) |
| `inviteAccept` | `orgId`, `inviteId`, `acceptor`, `acceptedAt` | Owner's approval queue | 7 days |
| `grant` | `orgId`, `grantId`, `agentName`, `agentAddress`, `projectId`, `maxAmount`, `maxTotal`, `createdAt` | Agent invoice creation (scope and cap checks) | Chosen by the owner, from 3 minutes to 30 days. The agent's permission ends when it expires. |
| `revocation` | `orgId`, `targetType`, `targetId`, `revokedAt` | Grant and member checks | 180 days |
| `payout` | `orgId`, `projectId`, `invoiceId`, `account`, `subname`, `txHash`, `amount`, `shareBps`, `version`, `paidAt` | Member earnings, payout table | 180 days |
| `claim` | `orgId`, `projectId`, `account`, `txHash`, `amount`, `claimedAt` | Simulated-mode claim history | 180 days |

## Queries you can run

[`scripts/arkiv-query.mjs`](../scripts/arkiv-query.mjs) runs a query straight against Rabdi and prints the
raw `arkiv_query` string, so you can also send it over JSON-RPC.

```bash
# Is this wallet on the Pro plan right now? This is the query behind hasAccess().
node scripts/arkiv-query.mjs entitlement merchantId=m_sintingale planId=pro customer=0xCUSTOMER "periodEnd>now" --creator 0xf9277DD2A25085F868796073A9BF8c0d37F6bb06
# → arkiv.schema = str('sintingale.entitlement') AND merchantId = str('m_sintingale') AND planId = str('pro')
#   AND customer = str('0x…') AND periodEnd > u64(<now>) AND $creator = addr(0xf9277DD2A25085F868796073A9BF8c0d37F6bb06)

# Every trusted receipt for the merchant
node scripts/arkiv-query.mjs receipt merchantId=m_sintingale --creator 0xf9277DD2A25085F868796073A9BF8c0d37F6bb06

# Open invoices (expired ones are already gone)
node scripts/arkiv-query.mjs invoice merchantId=m_sintingale
```

Customer addresses are stored lower-case.
