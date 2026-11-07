# Whitechain feedback

## What worked

- Deploying and verifying took minutes. `PaymentRouter` and `ProjectSplitter` deployed with viem, and
  `forge verify-contract --verifier blockscout` verified both on the first attempt, including the constructor
  arguments.
- The [Whitechain Sepolia network page](https://docs.whitechain.io/learn/network/testnet) has everything in one table:
  chain ID, RPC, explorer, faucet, block time and the actual rate limits (50 req/s, burst 500).
- It really is plain EVM. viem, wagmi and Foundry needed only a chain ID and RPC URL, and our contracts needed no changes.
- The Foundry guide's note that the Blockscout verifier URL must end in `/api/` is the kind of detail that
  saves a failed verification.
- The explorer's API (`/api/v2/...`) let us inspect the USDT proxy and its implementation ABI from a script.

## Where we got stuck

- **Which USDT?** The prize requires `0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7` (Tether USD). The docs'
  [token list](https://docs.whitechain.io/build/block-explorer/token-list) lists USDT at
  `0xaa7962d073935D387e8d442DA1D7149C81388f46`, which reports itself as `USDT.e`. The `0xcedf…` address appears
  nowhere in the docs. Our first deploy script pointed at the token-list address and would have settled in the
  wrong token.
- **Getting test USDT.** The faucet only gives WBT (0.5 per day, GitHub account at least 30 days old). We couldn't find a
  documented way to get the required test USDT. A short "how to get test USDT for the hackathon" line next to the
  faucet would have saved us the most time of anything this weekend.
- **Which RPC is official?** The docs say no third-party endpoint serves chain 1874 yet. The prize page offers a free
  Ankr RPC. We stayed on `rpc.testnet.whitechain.io`.

## What the docs were missing

- A "get test USDT" page: the address that counts for the hackathon, how to get some, and whether it
  is the same as the token-list entry.
- Whether the `0xcedf…` token is the canonical test USDT long term, and whether its implementation will be verified
  on the explorer. It is a proxy to `TetherTokenV2`. We read its ABI to confirm `transferFrom` returns `bool`
  before relying on it.
- Any limit on `eth_getLogs` block ranges. The RPC page lists `eth_getLogs` as supported but gives no range cap, so we
  page in 1,000-block chunks to be safe.
