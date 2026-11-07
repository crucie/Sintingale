import type { Address } from "viem";

const isAddress = (v: string | undefined): v is Address => !!v && /^0x[0-9a-fA-F]{40}$/.test(v);
const address = (v: string | undefined) => (isAddress(v) ? v : undefined);

export const publicConfig = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "",
  merchantId: process.env.NEXT_PUBLIC_DEMO_MERCHANT_ID || "m_demo",
  whitechain: {
    chainId: Number(process.env.NEXT_PUBLIC_WHITECHAIN_CHAIN_ID || 1874),
    rpcUrl: process.env.NEXT_PUBLIC_WHITECHAIN_RPC_URL || "https://rpc.testnet.whitechain.io",
    explorerUrl: process.env.NEXT_PUBLIC_WHITECHAIN_EXPLORER_URL || "https://explorer.testnet.whitechain.io",
  },
  sepolia: {
    chainId: Number(process.env.NEXT_PUBLIC_SEPOLIA_CHAIN_ID || 11155111),
    rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
    ensAppUrl: process.env.NEXT_PUBLIC_ENS_APP_URL || "https://sepolia.app.ens.domains",
    parentNameHint: process.env.NEXT_PUBLIC_ENS_PARENT_NAME_HINT || "",
  },
  paymentRouter: address(process.env.NEXT_PUBLIC_PAYMENT_ROUTER_ADDRESS),
  splitter: address(process.env.NEXT_PUBLIC_SPLITTER_ADDRESS),
  usdt: {
    address: address(process.env.NEXT_PUBLIC_USDT_ADDRESS),
    decimals: Number(process.env.NEXT_PUBLIC_USDT_DECIMALS || 6),
    symbol: "USDT",
  },
} as const;

/** On-chain mode needs both contract addresses; otherwise checkout runs a labelled simulation. */
export const onchainEnabled = Boolean(publicConfig.paymentRouter && publicConfig.usdt.address);

/** Project invoices settle through the ProjectSplitter when it is configured. */
export const splitterEnabled = Boolean(publicConfig.splitter && publicConfig.usdt.address);

/** Server-only configuration. Never import this from a client component. */
export function serverConfig() {
  return {
    relayerPrivateKey: (process.env.RELAYER_PRIVATE_KEY || undefined) as `0x${string}` | undefined,
    relayerAddress: address(process.env.RELAYER_ADDRESS),
    arkivPrivateKey: (process.env.ARKIV_PRIVATE_KEY || process.env.RELAYER_PRIVATE_KEY || undefined) as `0x${string}` | undefined,
    arkivEnabled: process.env.ARKIV_ENABLED === "true",
    arkivAccessKey: process.env.ARKIV_ACCESS_KEY || "",
    apiKey: process.env.SINTINGALE_API_KEY || "sn_test_demo_key",
    invoiceGraceSec: Number(process.env.INVOICE_GRACE_SEC || 120),
    confirmations: Number(process.env.RELAYER_CONFIRMATIONS || 1),
    splitterAllowedToken: address(process.env.SPLITTER_ALLOWED_TOKEN) ?? address(process.env.NEXT_PUBLIC_USDT_ADDRESS),
    sessionSecret: process.env.SESSION_SECRET || "sintingale-dev-session-secret-change-me",
    siweDomain: process.env.SIWE_DOMAIN || "",
    nonceTtlSec: Number(process.env.NONCE_TTL_SECONDS || 300),
    inviteTtlSec: Number(process.env.INVITE_TTL_SECONDS || 48 * 3600),
    demoIdentities: process.env.DEMO_IDENTITIES !== "false",
  };
}
