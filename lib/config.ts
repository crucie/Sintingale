import type { Address } from "viem";

const isAddress = (v: string | undefined): v is Address => !!v && /^0x[0-9a-fA-F]{40}$/.test(v);
const address = (v: string | undefined) => (isAddress(v) ? v : undefined);

export const publicConfig = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "",
  merchantId: process.env.NEXT_PUBLIC_MERCHANT_ID || "m_sintingale",
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

/** Checkout needs the PaymentRouter and the USDT token; without them payments are refused, never simulated. */
export const onchainEnabled = Boolean(publicConfig.paymentRouter && publicConfig.usdt.address);

/** Project invoices settle through the ProjectSplitter; without it they cannot be created. */
export const splitterEnabled = Boolean(publicConfig.splitter && publicConfig.usdt.address);

/** Accepts a pasted key with or without `0x`, quotes or surrounding whitespace. */
function privateKey(raw: string | undefined): `0x${string}` | undefined {
  const v = (raw ?? "").trim().replace(/^["']|["']$/g, "").trim();
  if (!v) return undefined;
  return (v.startsWith("0x") ? v : `0x${v}`) as `0x${string}`;
}

/** Server-only configuration. Never import this from a client component. */
export function serverConfig() {
  return {
    arkivPrivateKey: privateKey(process.env.ARKIV_PRIVATE_KEY),
    arkivAccessKey: process.env.ARKIV_ACCESS_KEY || "",
    apiKey: process.env.SINTINGALE_API_KEY || "",
    invoiceGraceSec: Number(process.env.INVOICE_GRACE_SEC || 120),
    confirmations: Number(process.env.RELAYER_CONFIRMATIONS || 1),
    splitterAllowedToken: address(process.env.SPLITTER_ALLOWED_TOKEN) ?? address(process.env.NEXT_PUBLIC_USDT_ADDRESS),
    sessionSecret: process.env.SESSION_SECRET || "",
    siweDomain: process.env.SIWE_DOMAIN || "",
    nonceTtlSec: Number(process.env.NONCE_TTL_SECONDS || 300),
    inviteTtlSec: Number(process.env.INVITE_TTL_SECONDS || 48 * 3600),
  };
}

/** Names of required variables that are missing or malformed. Empty means the deployment can serve traffic. */
export function missingConfig(): string[] {
  const cfg = serverConfig();
  const missing: string[] = [];
  if (!/^0x[0-9a-fA-F]{64}$/.test(cfg.arkivPrivateKey ?? "")) missing.push("ARKIV_PRIVATE_KEY");
  if (!cfg.arkivAccessKey) missing.push("ARKIV_ACCESS_KEY");
  if (cfg.apiKey.length < 16) missing.push("SINTINGALE_API_KEY (16+ characters)");
  if (cfg.sessionSecret.length < 32) missing.push("SESSION_SECRET (32+ characters)");
  if (!publicConfig.paymentRouter) missing.push("NEXT_PUBLIC_PAYMENT_ROUTER_ADDRESS");
  if (!publicConfig.usdt.address) missing.push("NEXT_PUBLIC_USDT_ADDRESS");
  if (!publicConfig.appUrl) missing.push("NEXT_PUBLIC_APP_URL");
  return missing;
}
