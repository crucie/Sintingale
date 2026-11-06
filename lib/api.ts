import "server-only";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { serverConfig } from "./config";

export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "INVOICE_EXPIRED"
  | "ALREADY_PAID"
  | "CONFLICT"
  | "PAYMENT_NOT_VERIFIED"
  | "RATE_LIMITED"
  | "NOT_CONFIGURED"
  | "INTERNAL";

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INVOICE_EXPIRED: 410,
  ALREADY_PAID: 409,
  CONFLICT: 409,
  PAYMENT_NOT_VERIFIED: 422,
  RATE_LIMITED: 429,
  NOT_CONFIGURED: 503,
  INTERNAL: 500,
};

export class SintingaleError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export const json = <T>(data: T, status = 200) => Response.json(data, { status });

export function errorResponse(err: unknown): Response {
  unstable_rethrow(err);
  if (err instanceof SintingaleError) {
    return Response.json({ error: { code: err.code, message: err.message } }, { status: STATUS[err.code] });
  }
  if (err instanceof ZodError) {
    const issue = err.issues[0];
    const message = issue ? `${issue.path.join(".") || "body"}: ${issue.message}` : "Invalid request";
    return Response.json({ error: { code: "BAD_REQUEST", message } }, { status: 400 });
  }
  console.error("[sintingale] unhandled error", err);
  return Response.json({ error: { code: "INTERNAL", message: "Something went wrong." } }, { status: 500 });
}

export async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > 16_384) throw new SintingaleError("BAD_REQUEST", "Payload too large.");
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new SintingaleError("BAD_REQUEST", "Body must be valid JSON.");
  }
}

export function requireApiKey(request: Request) {
  const url = new URL(request.url);
  const provided =
    request.headers.get("x-api-key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    url.searchParams.get("apiKey");
  if (provided !== serverConfig().apiKey) {
    throw new SintingaleError("UNAUTHORIZED", "Missing or invalid API key.");
  }
}

/**
 * Merchant routes accept either the API key (server-to-server) or a same-origin
 * browser request from the dashboard. Wallet-signature auth is a roadmap item.
 */
export function requireMerchantAuth(request: Request) {
  if (request.headers.get("x-api-key") || request.headers.get("authorization")) return requireApiKey(request);
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  const site = request.headers.get("sec-fetch-site");
  if (site === "same-origin" || (origin && host && new URL(origin).host === host)) return;
  throw new SintingaleError("UNAUTHORIZED", "Use the dashboard or pass an API key.");
}

const buckets = new Map<string, number[]>();

/** Sliding-window limiter for public endpoints. Per-process, which is enough for a single relayer. */
export function rateLimit(request: Request, scope: string, max = 20, windowMs = 60_000) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const id = `${scope}:${ip}`;
  const now = Date.now();
  const hits = (buckets.get(id) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) throw new SintingaleError("RATE_LIMITED", "Too many requests, slow down.");
  hits.push(now);
  buckets.set(id, hits);
}
