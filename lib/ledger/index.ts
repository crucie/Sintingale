import "server-only";
import { privateKeyToAccount } from "viem/accounts";
import { SintingaleError } from "../api";
import { missingConfig, serverConfig } from "../config";
import { ArkivLedger } from "./arkiv";
import type { Ledger } from "./types";

export type { Ledger, StoredEntity, QueryFilter } from "./types";

const globalForLedger = globalThis as unknown as { __sintingaleLedger?: Ledger };

/** Refuses to serve until every required variable is set, so a misconfigured deployment fails loudly. */
export function requireConfigured() {
  const missing = missingConfig();
  if (missing.length) {
    throw new SintingaleError("NOT_CONFIGURED", `Sintingale is not configured. Missing: ${missing.join(", ")}.`);
  }
}

/** Address whose entities are trusted (`$creator` filter on receipts and entitlements): the Arkiv writer key. */
export function relayerAddress(): string {
  requireConfigured();
  return privateKeyToAccount(serverConfig().arkivPrivateKey!).address;
}

export function getLedger(): Ledger {
  if (globalForLedger.__sintingaleLedger) return globalForLedger.__sintingaleLedger;
  requireConfigured();
  const cfg = serverConfig();
  const ledger = new ArkivLedger(cfg.arkivPrivateKey!, cfg.arkivAccessKey);
  globalForLedger.__sintingaleLedger = ledger;
  return ledger;
}
