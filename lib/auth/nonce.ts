import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const mac = (secret: string, data: string) => createHmac("sha256", secret).update(data).digest("hex").slice(0, 16);

/**
 * Stateless nonces (alphanumeric, as SIWE requires): random part, expiry and an
 * HMAC, so any server instance can check them. A used-nonce set rejects replays.
 */
export class NonceStore {
  private used = new Map<string, number>();

  constructor(
    private readonly secret: string,
    private readonly ttlSec: number,
  ) {}

  issue(nowMs = Date.now()): string {
    const rand = randomBytes(8).toString("hex");
    const exp = Math.floor(nowMs / 1000 + this.ttlSec).toString(36).padStart(8, "0");
    return `${rand}${exp}${mac(this.secret, rand + exp)}`;
  }

  /** Returns true exactly once per valid, unexpired nonce. */
  consume(nonce: string, nowMs = Date.now()): boolean {
    if (!/^[0-9a-z]{40}$/.test(nonce)) return false;
    const body = nonce.slice(0, 24);
    const expected = Buffer.from(mac(this.secret, body));
    const given = Buffer.from(nonce.slice(24));
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
    const exp = parseInt(nonce.slice(16, 24), 36);
    const now = Math.floor(nowMs / 1000);
    if (exp < now) return false;
    for (const [n, e] of this.used) if (e < now) this.used.delete(n);
    if (this.used.has(nonce)) return false;
    this.used.set(nonce, exp);
    return true;
  }
}
