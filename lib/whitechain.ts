import { defineChain, keccak256, toHex, type Hex } from "viem";
import { publicConfig } from "./config";

export const whitechain = defineChain({
  id: publicConfig.whitechain.chainId,
  name: "Whitechain Sepolia",
  nativeCurrency: { name: "WhiteBIT Token", symbol: "WBT", decimals: 18 },
  rpcUrls: { default: { http: [publicConfig.whitechain.rpcUrl] } },
  blockExplorers: { default: { name: "Whitechain Explorer", url: publicConfig.whitechain.explorerUrl } },
  testnet: true,
});

export const explorerTx = (hash: string) => `${publicConfig.whitechain.explorerUrl}/tx/${hash}`;
export const explorerAddress = (addr: string) => `${publicConfig.whitechain.explorerUrl}/address/${addr}`;

/** The contract keys invoices by bytes32; Sintingale derives it from the human-readable invoiceId. */
export const invoiceIdToBytes32 = (invoiceId: string): Hex => keccak256(toHex(invoiceId));

export const paymentRouterAbi = [
  {
    type: "event",
    name: "MerchantRegistered",
    inputs: [
      { name: "merchant", type: "address", indexed: true },
      { name: "payout", type: "address", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Paid",
    inputs: [
      { name: "invoiceId", type: "bytes32", indexed: true },
      { name: "merchant", type: "address", indexed: true },
      { name: "payer", type: "address", indexed: true },
      { name: "token", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "function",
    name: "registerMerchant",
    stateMutability: "nonpayable",
    inputs: [{ name: "payout", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "payInvoice",
    stateMutability: "nonpayable",
    inputs: [
      { name: "invoiceId", type: "bytes32" },
      { name: "merchant", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "payoutOf",
    stateMutability: "view",
    inputs: [{ name: "merchant", type: "address" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "paid",
    stateMutability: "view",
    inputs: [{ name: "invoiceId", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const erc20Abi = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
