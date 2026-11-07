# Wallets and test funds

Nothing here is needed for demo mode (in-memory ledger, simulated payments). Fund wallets only for live testnet mode.

| Wallet | Network | Needs | Why | Where |
|---|---|---|---|---|
| **Deployer** (`DEPLOYER_PRIVATE_KEY`) | Whitechain Sepolia | ~0.1 WBT | Deploy PaymentRouter and ProjectSplitter | [faucet.testnet.whitechain.io](https://faucet.testnet.whitechain.io) (0.5 WBT / 24 h, GitHub login) |
| **Relayer / Arkiv writer** (`ARKIV_PRIVATE_KEY`) | Arkiv Rabdi | tGLM | Writes every ledger entity; its address is the trusted `$creator` | [hub.arkiv.network/faucet](https://hub.arkiv.network/faucet), plus an access key at [hub.arkiv.network/access-keys](https://hub.arkiv.network/access-keys) |
| **Merchant / org owner** | Whitechain Sepolia | ~0.05 WBT | Register on PaymentRouter; `createProject` / `updateShares` on the splitter | Whitechain faucet |
| **Merchant / org owner** | Ethereum Sepolia | ~0.05 Sepolia ETH | Register an ENS name, set records, create subnames in the ENS app | Any Sepolia faucet |
| **Customer** | Whitechain Sepolia | ~0.02 WBT + USDT | `approve` + `payInvoice` / `payProjectInvoice` | WBT from the faucet; the configured test USDT (`NEXT_PUBLIC_USDT_ADDRESS`) |
| **Team members** | Whitechain Sepolia | ~0.01 WBT | `claim()` their share from the splitter | Whitechain faucet |
| **Agent** (`AGENT_PRIVATE_KEY`) | none | nothing | Only signs messages; never sends transactions | — |

Tips:

- One wallet can play merchant, org owner and team-member roles while rehearsing; use a second browser profile for the customer.
- The Whitechain faucet allows one claim per GitHub account per 24 hours. Claim early.
- Customers need the configured test USDT (see `.env.example`). `DEPLOY_MOCK_USDT=true` deploys MockUSDT for local experiments only.
