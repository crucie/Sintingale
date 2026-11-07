import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { recoverMessageAddress, type Hex } from "viem";
import { parseSiweMessage, validateSiweMessage } from "viem/siwe";
import { SintingaleError } from "../api";
import { serverConfig } from "../config";
import { NonceStore } from "./nonce";

export const SESSION_COOKIE = "sn_session";
const SESSION_TTL_SEC = 12 * 3600;

const globalStore = globalThis as unknown as { __sintingaleNonces?: NonceStore };
const nonces = () =>
  (globalStore.__sintingaleNonces ??= new NonceStore(serverConfig().sessionSecret, serverConfig().nonceTtlSec));

export const issueNonce = () => nonces().issue();

export interface Session {
  address: string;
  /** Demo identities are only available on the local ledger. */
  demo: boolean;
  exp: number;
}

const sign = (payload: string) => createHmac("sha256", serverConfig().sessionSecret).update(payload).digest("base64url");

export function encodeSession(s: Omit<Session, "exp">): string {
  const payload = Buffer.from(
    JSON.stringify({ ...s, address: s.address.toLowerCase(), exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SEC }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string | undefined): Session | null {
  if (!token) return null;
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    return s.exp > Date.now() / 1000 ? s : null;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SEC,
};

export async function getSession(): Promise<Session | null> {
  return decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new SintingaleError("UNAUTHORIZED", "Sign in with your wallet first.");
  return session;
}

/** EIP-4361 verification: domain, nonce (single use), expiry and signature. */
export async function verifySiwe(message: string, signature: string, host: string): Promise<string> {
  const parsed = parseSiweMessage(message);
  const domain = serverConfig().siweDomain || host;
  if (!parsed.address || !parsed.nonce) throw new SintingaleError("BAD_REQUEST", "Malformed sign-in message.");
  if (!validateSiweMessage({ message: parsed, domain })) {
    throw new SintingaleError("UNAUTHORIZED", "Sign-in message is expired or for another domain.");
  }
  const signer = await recoverMessageAddress({ message, signature: signature as Hex }).catch(() => null);
  if (!signer || signer.toLowerCase() !== parsed.address.toLowerCase()) {
    throw new SintingaleError("UNAUTHORIZED", "Signature does not match the sign-in address.");
  }
  if (!nonces().consume(parsed.nonce)) {
    throw new SintingaleError("UNAUTHORIZED", "This sign-in request was already used or has expired.");
  }
  return signer.toLowerCase();
}
