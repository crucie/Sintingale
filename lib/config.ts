import type { Address } from "viem";

const isAddress = (v: string | undefined): v is Address => !!v && /^0x[0-9a-fA-F]{40}$/.test(v);

export const publicConfig = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
  merchantId: process.env.NEXT_PUBLIC_DEMO_MERCHANT_ID ?? "m_demo",
  whitechain: {
    chainId: Number(process.env.NEXT_PUBLIC_WHITECHAIN_CHAIN_ID ?? 1874),
    rpcUrl: process.env.NEXT_PUBLIC_WHITECHAIN_RPC_URL ?? "https://rpc.ankr.com/whitechain_testnet",
    explorerUrl: process.env.NEXT_PUBLIC_WHITECHAIN_EXPLORER_URL ?? "https://testnet.whitechain.io",
  },
  paymentRouter: isAddress(process.env.NEXT_PUBLIC_PAYMENT_ROUTER_ADDRESS)
    ? process.env.NEXT_PUBLIC_PAYMENT_ROUTER_ADDRESS
    : undefined,
  usdt: {
    address: isAddress(process.env.NEXT_PUBLIC_USDT_ADDRESS) ? process.env.NEXT_PUBLIC_USDT_ADDRESS : undefined,
    decimals: Number(process.env.NEXT_PUBLIC_USDT_DECIMALS ?? 6),
    symbol: "USDT",
  },
} as const;

/** On-chain mode needs both contract addresses; otherwise checkout runs a labelled simulation. */
export const onchainEnabled = Boolean(publicConfig.paymentRouter && publicConfig.usdt.address);

/** Server-only configuration. Never import this from a client component. */
export function serverConfig() {
  return {
    relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY as `0x${string}` | undefined,
    relayerAddress: isAddress(process.env.RELAYER_ADDRESS) ? process.env.RELAYER_ADDRESS : undefined,
    arkivPrivateKey: (process.env.ARKIV_PRIVATE_KEY ?? process.env.RELAYER_PRIVATE_KEY) as `0x${string}` | undefined,
    arkivEnabled: process.env.ARKIV_ENABLED === "true",
    arkivAccessKey: process.env.ARKIV_ACCESS_KEY ?? "",
    apiKey: process.env.SINTINGALE_API_KEY ?? "sn_test_demo_key",
    invoiceGraceSec: Number(process.env.INVOICE_GRACE_SEC ?? 120),
    confirmations: Number(process.env.RELAYER_CONFIRMATIONS ?? 1),
  };
}
