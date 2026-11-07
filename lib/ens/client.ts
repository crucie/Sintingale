import "server-only";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { publicConfig } from "../config";

/** Ethereum Sepolia, used for ENS reads only. Payments never touch this chain. */
export const sepoliaClient = createPublicClient({
  chain: sepolia,
  transport: http(publicConfig.sepolia.rpcUrl, { timeout: 6_000, retryCount: 1 }),
});
