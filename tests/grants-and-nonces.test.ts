import { describe, expect, it } from "vitest";
import { checkGrantCaps, grantCoversScope } from "@/lib/auth/grant-rules";
import { NonceStore } from "@/lib/auth/nonce";

const grant = { scope: "invoice:create", projectId: "", maxAmount: 25_000_000, maxTotal: 100_000_000, used: 0 };

describe("grant caps", () => {
  it("allows invoices within the per-invoice and total caps", () => {
    expect(checkGrantCaps(grant, 25_000_000)).toEqual({ ok: true });
    expect(checkGrantCaps({ ...grant, used: 75_000_000 }, 25_000_000)).toEqual({ ok: true });
  });
  it("rejects an invoice over the per-invoice cap", () => {
    expect(checkGrantCaps(grant, 25_000_001).ok).toBe(false);
  });
  it("rejects an invoice that would exceed the cumulative cap", () => {
    const verdict = checkGrantCaps({ ...grant, used: 80_000_000 }, 25_000_000);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toMatch(/20\.00 USDT left/);
  });
});

describe("grant scope", () => {
  it("requires the action to be in scope", () => {
    expect(grantCoversScope(grant, "invoice:create")).toBe(true);
    expect(grantCoversScope(grant, "invoice:refund")).toBe(false);
  });
  it("restricts project-scoped grants to that project", () => {
    const scoped = { ...grant, projectId: "launch" };
    expect(grantCoversScope(scoped, "invoice:create", "launch")).toBe(true);
    expect(grantCoversScope(scoped, "invoice:create", "website")).toBe(false);
  });
});

describe("NonceStore", () => {
  it("accepts a fresh nonce exactly once", () => {
    const store = new NonceStore("secret", 300);
    const nonce = store.issue();
    expect(nonce).toMatch(/^[0-9a-z]{40}$/);
    expect(store.consume(nonce)).toBe(true);
    expect(store.consume(nonce)).toBe(false);
  });
  it("rejects expired, tampered and foreign nonces", () => {
    const store = new NonceStore("secret", 60);
    const now = Date.now();
    const nonce = store.issue(now);
    expect(store.consume(nonce, now + 61_000)).toBe(false);
    const tampered = `${nonce.slice(0, 5)}${nonce[5] === "a" ? "b" : "a"}${nonce.slice(6)}`;
    expect(store.consume(tampered, now)).toBe(false);
    expect(new NonceStore("other-secret", 60).consume(store.issue(now), now)).toBe(false);
  });
});
