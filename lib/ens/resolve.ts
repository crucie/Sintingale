import "server-only";
import { getAddress } from "viem";
import { normalize } from "viem/ens";
import { isDemoName } from "../demo";
import { sepoliaClient } from "./client";
import { demoResolve } from "./demo-registry";

const TTL_MS = 5 * 60_000;
const TIMEOUT_MS = 5_000;
const cache = new Map<string, { at: number; value: unknown }>();

/** Every ENS call is cached and time-boxed so a slow Sepolia RPC never freezes checkout. */
async function cached<T>(key: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as T;
  try {
    const value = await Promise.race([
      fn(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("ENS lookup timed out")), TIMEOUT_MS)),
    ]);
    cache.set(key, { at: Date.now(), value });
    return value;
  } catch (err) {
    console.warn(`[sintingale] ENS ${key} failed:`, err instanceof Error ? err.message : err);
    return fallback;
  }
}

export const invalidateEns = (name: string) => {
  for (const k of cache.keys()) if (k.includes(name.toLowerCase())) cache.delete(k);
};

export function normalizeName(name: string): string | null {
  try {
    return normalize(name.trim());
  } catch {
    return null;
  }
}

export async function resolveName(name: string): Promise<string | null> {
  const n = normalizeName(name);
  if (!n) return null;
  if (isDemoName(n)) return demoResolve(n);
  const addr = await cached(`addr:${n}`, () => sepoliaClient.getEnsAddress({ name: n }), null);
  return addr ? addr.toLowerCase() : null;
}

export async function reverseLookup(address: string): Promise<string | null> {
  return cached(`name:${address.toLowerCase()}`, () => sepoliaClient.getEnsName({ address: getAddress(address) }), null);
}

export async function getAvatar(name: string): Promise<string | null> {
  const n = normalizeName(name);
  if (!n || isDemoName(n)) return null;
  return cached(`avatar:${n}`, () => sepoliaClient.getEnsAvatar({ name: n }), null);
}

export async function getTextRecord(name: string, key: string): Promise<string | null> {
  const n = normalizeName(name);
  if (!n || isDemoName(n)) return null;
  return cached(`text:${key}:${n}`, () => sepoliaClient.getEnsText({ name: n, key }), null);
}

export interface EnsProfile {
  name: string;
  address: string | null;
  avatar: string | null;
  demo: boolean;
}

export async function getProfile(name: string): Promise<EnsProfile> {
  const [address, avatar] = await Promise.all([resolveName(name), getAvatar(name)]);
  return { name: name.toLowerCase(), address, avatar, demo: isDemoName(name) };
}
