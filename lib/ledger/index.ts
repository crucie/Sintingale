import "server-only";
import { privateKeyToAccount } from "viem/accounts";
import { serverConfig } from "../config";
import { ArkivLedger } from "./arkiv";
import { MemoryLedger } from "./memory";
import { seedDemoData } from "./seed";
import { seedDemoOrg } from "./seed-org";
import type { Ledger } from "./types";

export type { Ledger, StoredEntity, QueryFilter } from "./types";

const DEMO_RELAYER = "0x6a7e9f3c2b1d4e5f60718293a4b5c6d7e8f90a1b";

const globalForLedger = globalThis as unknown as { __sintingaleLedger?: Ledger };

/** Address whose entities are trusted (`$creator` filter on receipts and entitlements). */
export function relayerAddress(): string {
  const cfg = serverConfig();
  // On Arkiv the trusted $creator is whichever key actually writes the entities.
  if (cfg.arkivEnabled && cfg.arkivPrivateKey) return privateKeyToAccount(cfg.arkivPrivateKey).address;
  if (cfg.relayerAddress) return cfg.relayerAddress;
  if (cfg.relayerPrivateKey) return privateKeyToAccount(cfg.relayerPrivateKey).address;
  return DEMO_RELAYER;
}

export function getLedger(): Ledger {
  if (globalForLedger.__sintingaleLedger) return globalForLedger.__sintingaleLedger;
  const cfg = serverConfig();
  let ledger: Ledger;
  if (cfg.arkivEnabled && cfg.arkivPrivateKey) {
    ledger = new ArkivLedger(cfg.arkivPrivateKey, cfg.arkivAccessKey);
  } else {
    const memory = new MemoryLedger(relayerAddress());
    seedDemoData(memory);
    if (cfg.demoIdentities) memory.whenReady(seedDemoOrg(memory));
    ledger = memory;
  }
  globalForLedger.__sintingaleLedger = ledger;
  return ledger;
}
