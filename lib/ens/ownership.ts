import "server-only";
import { isDemoName } from "../demo";
import { getTextRecord, invalidateEns, normalizeName, resolveName } from "./resolve";

/** Text record a name manager sets to vouch for a wallet that is not the name's address. */
export const OWNER_TEXT_KEY = "sintingale.owner";
export const ORG_TEXT_KEY = "sintingale.org";

export interface ControlCheck {
  ok: boolean;
  method: "addr" | "text" | "demo" | null;
  name: string;
  resolvedAddress: string | null;
  textRecord: string | null;
  reason?: "INVALID_NAME" | "NOT_RESOLVED" | "NOT_CONTROLLED";
}

/**
 * Verifies the wallet controls the name's records, which only the name's manager
 * can edit. ENSv2 on Sepolia no longer exposes a single registry owner, so we
 * accept either: the name's ETH address is the wallet, or the `sintingale.owner`
 * text record names the wallet.
 */
export async function verifyControl(rawName: string, wallet: string, opts: { fresh?: boolean } = {}): Promise<ControlCheck> {
  const name = normalizeName(rawName);
  const w = wallet.toLowerCase();
  if (!name || !name.includes(".")) {
    return { ok: false, method: null, name: rawName, resolvedAddress: null, textRecord: null, reason: "INVALID_NAME" };
  }
  if (opts.fresh) invalidateEns(name);
  const [resolvedAddress, textRecord] = await Promise.all([resolveName(name), getTextRecord(name, OWNER_TEXT_KEY)]);

  if (resolvedAddress === w) {
    return { ok: true, method: isDemoName(name) ? "demo" : "addr", name, resolvedAddress, textRecord };
  }
  if (textRecord && textRecord.trim().toLowerCase() === w) {
    return { ok: true, method: "text", name, resolvedAddress, textRecord };
  }
  return {
    ok: false,
    method: null,
    name,
    resolvedAddress,
    textRecord,
    reason: resolvedAddress || textRecord ? "NOT_CONTROLLED" : "NOT_RESOLVED",
  };
}
