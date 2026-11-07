import "server-only";
import { keccak256, toHex, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { DemoRole } from "./demo";

/** Deterministic, publicly known keys. They only ever sign `.demo` identities on the local ledger. */
export const demoKey = (role: DemoRole): Hex => keccak256(toHex(`sintingale-demo:${role}`));
export const demoAccount = (role: DemoRole) => privateKeyToAccount(demoKey(role));
