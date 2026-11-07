import "server-only";
import { DEMO_IDENTITIES, isDemoName } from "../demo";

const store = globalThis as unknown as { __sintingaleDemoEns?: Map<string, string> };

function registry(): Map<string, string> {
  if (!store.__sintingaleDemoEns) {
    store.__sintingaleDemoEns = new Map(
      Object.entries(DEMO_IDENTITIES)
        .filter(([role]) => role !== "carol")
        .map(([, id]) => [id.name, id.address.toLowerCase()]),
    );
  }
  return store.__sintingaleDemoEns;
}

/** Local stand-in for ENS so `.demo` names resolve without a Sepolia name. */
export const demoResolve = (name: string): string | null => registry().get(name.toLowerCase()) ?? null;

export function demoIssue(name: string, address: string) {
  if (!isDemoName(name)) throw new Error("Only .demo names can be issued locally");
  registry().set(name.toLowerCase(), address.toLowerCase());
}

export const demoRemove = (name: string) => registry().delete(name.toLowerCase());
