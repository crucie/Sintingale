import "server-only";
import { SintingaleError } from "./api";
import { serverConfig } from "./config";
import { getLedger } from "./ledger";

/** Demo identities exist only on the in-memory ledger, never against Arkiv or real ENS. */
export const demoAvailable = () => getLedger().backend === "memory" && serverConfig().demoIdentities;

export function requireDemo() {
  if (!demoAvailable()) throw new SintingaleError("FORBIDDEN", "Demo identities are disabled on this deployment.");
}
