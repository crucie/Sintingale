import { keccak256, toHex, type Hex } from "viem";

/** On-chain project id: derived from the org and project slug so it is stable and collision-free. */
export const projectIdToBytes32 = (orgId: string, projectId: string): Hex => keccak256(toHex(`${orgId}:${projectId}`));

const shareTuple = {
  type: "tuple[]",
  components: [
    { name: "account", type: "address" },
    { name: "bps", type: "uint16" },
  ],
} as const;

export const splitterAbi = [
  {
    type: "function",
    name: "createProject",
    stateMutability: "nonpayable",
    inputs: [{ name: "projectId", type: "bytes32" }, { name: "shares", ...shareTuple }],
    outputs: [],
  },
  {
    type: "function",
    name: "updateShares",
    stateMutability: "nonpayable",
    inputs: [{ name: "projectId", type: "bytes32" }, { name: "shares", ...shareTuple }],
    outputs: [],
  },
  {
    type: "function",
    name: "payProjectInvoice",
    stateMutability: "nonpayable",
    inputs: [
      { name: "projectId", type: "bytes32" },
      { name: "invoiceId", type: "bytes32" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [
      { name: "projectId", type: "bytes32" },
      { name: "token", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "claimable",
    stateMutability: "view",
    inputs: [
      { name: "projectId", type: "bytes32" },
      { name: "account", type: "address" },
      { name: "token", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "projects",
    stateMutability: "view",
    inputs: [{ name: "projectId", type: "bytes32" }],
    outputs: [
      { name: "owner", type: "address" },
      { name: "version", type: "uint64" },
    ],
  },
  {
    type: "function",
    name: "getShares",
    stateMutability: "view",
    inputs: [{ name: "projectId", type: "bytes32" }],
    outputs: [{ name: "", ...shareTuple }],
  },
  {
    type: "event",
    name: "Credited",
    inputs: [
      { name: "projectId", type: "bytes32", indexed: true },
      { name: "invoiceId", type: "bytes32", indexed: true },
      { name: "token", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "version", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "AccountCredited",
    inputs: [
      { name: "projectId", type: "bytes32", indexed: true },
      { name: "invoiceId", type: "bytes32", indexed: true },
      { name: "account", type: "address", indexed: true },
      { name: "token", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "bps", type: "uint16", indexed: false },
      { name: "version", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Claimed",
    inputs: [
      { name: "projectId", type: "bytes32", indexed: true },
      { name: "account", type: "address", indexed: true },
      { name: "token", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;
