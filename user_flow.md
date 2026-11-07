# How Sintingale Works for a Normal User (ENS Optional)

*A plain-language walkthrough · Prepared with Claude · November 7, 2026*

Think of Sintingale as a **payment link service**, like a PayPal.me link or a Stripe checkout page, except the money is stablecoins (digital dollars) and the records are public and verifiable. ENS is just an optional "verified business name" upgrade.

## 1. If you're a customer (paying someone)

You don't need ENS, an account, or any special setup.

1. **You get a link** from a seller, like `sintingale.app/pay/abc123`.
2. **You open it.** You see who you're paying, what for, how much (for example "Pro Plan, 10 USDT"), and when the invoice expires.
3. **You connect your crypto wallet**, such as MetaMask.
4. **You tap Pay** and approve it in your wallet. This is the same kind of approval you'd give for any crypto payment.
5. **You see a success screen** with a receipt and a transaction link.
6. **The seller's app unlocks your access.**

**What you need:** a wallet and some test USDT. If the seller (or Sintingale) covers the network fee, you need nothing else. Without that, you'd also need a small amount of the network's fee token. This is the main friction point for ordinary users, which is why sponsored fees are on the stretch list.

**What you'll see on the checkout page:** if the seller has no ENS name, you'll see their wallet address shortened (like `0x12ab…89ef`) with a small label saying "not name-verified." If they do have one, you'll see `acme.eth` with a check mark, which makes it harder for scammers to impersonate them.

## 2. If you're a seller without ENS (the basic path)

1. **Connect your wallet.** That's your login.
2. **Create a product:** name, price, and one-time or recurring.
3. **Copy the checkout link** and share it anywhere: your website, email, a chat message.
4. **Get paid.** The money goes straight to your wallet. Sintingale never holds it.
5. **Watch your dashboard.** It lists paid invoices, pending ones, and ones that have expired.
6. **Unpaid invoices clean themselves up.** After the due date they disappear on their own.

**What's locked:** team members, revenue splits and agents. You'll see a friendly "Connect an ENS name to unlock teams" message instead.

## 3. If you're a seller with ENS (the optional upgrade)

Everything in section 2 still works, plus:

1. **Prove you own your name** (for example `acme.eth`) by connecting the wallet that holds it.
2. **Your checkout now shows `acme.eth` with a check mark.**
3. **Invite teammates.** You send a link that expires after a couple of days. Your teammate accepts, and you approve, which gives them a name like `alice.acme.eth`.
4. **Set shares for a project,** for example you 50%, Alice 30%, Bob 20%.
5. **When a customer pays that project,** the money is divided automatically. Alice and Bob each see their balance and tap Claim whenever they want.
6. **Optional: authorize a bot or assistant** with a limited permission, such as "can create invoices up to 25 USDT for the next 24 hours." When time runs out, its access ends by itself.

## 4. What happens behind the scenes (no action from users)

- The payment itself is recorded on **Whitechain**, which is the proof the money moved.
- The invoice, receipt and access records are stored on **Arkiv**, so they can be searched and checked without trusting Sintingale's own database.
- A small background service watches for payments and writes those records for you.

## 5. Quick comparison

|  | Customer | Seller without ENS | Seller with ENS |
| --- | --- | --- | --- |
| Needs a wallet | Yes | Yes | Yes |
| Needs ENS | No | No | Yes |
| Can pay | Yes | n/a | n/a |
| Create products and links | n/a | Yes | Yes |
| Receive payments | n/a | Yes | Yes |
| See invoices on a dashboard | n/a | Yes | Yes |
| Verified business name on checkout | n/a | No | Yes |
| Team members and revenue splits | n/a | No | Yes |
| Agent permissions | n/a | No | Yes |

## 6. What this means for your build

Make ENS a **feature flag**: the core app (pay, create, track) must work completely without it, and the ENS features appear only when a connected wallet owns a name. That also protects your demo, since a slow or unavailable ENS network can't break checkout.

Two things to keep honest in the demo:

- Users still need a crypto wallet. This isn't a card-payment experience.
- If a seller isn't ENS-verified, customers get less proof of who they're paying.
