import { describe, expect, it } from "vitest";
import { computeCredits, contributionsToBps, diffAddresses, validateShares } from "@/lib/splits";

const A = "0x00000000000000000000000000000000000000a1";
const B = "0x00000000000000000000000000000000000000b2";
const C = "0x00000000000000000000000000000000000000c3";

describe("validateShares", () => {
  it("accepts a table that sums to exactly 10,000 bps", () => {
    expect(validateShares([{ account: A, bps: 5000 }, { account: B, bps: 3000 }, { account: C, bps: 2000 }])).toBeNull();
  });
  it("rejects a bad sum, duplicates, zero address, zero bps and an empty table", () => {
    expect(validateShares([{ account: A, bps: 5000 }, { account: B, bps: 4999 }])).toBe("BPS_SUM");
    expect(validateShares([{ account: A, bps: 5000 }, { account: A.toUpperCase().replace("0X", "0x"), bps: 5000 }])).toBe("DUPLICATE_ACCOUNT");
    expect(validateShares([{ account: `0x${"0".repeat(40)}`, bps: 10_000 }])).toBe("ZERO_ADDRESS");
    expect(validateShares([{ account: A, bps: 0 }, { account: B, bps: 10_000 }])).toBe("ZERO_BPS");
    expect(validateShares([])).toBe("EMPTY");
  });
});

describe("contributionsToBps", () => {
  it("maps contributions proportionally", () => {
    expect(contributionsToBps([5, 3, 2])).toEqual([5000, 3000, 2000]);
  });
  it("always sums to exactly 10,000 even when shares do not divide evenly", () => {
    const bps = contributionsToBps([1, 1, 1]);
    expect(bps.reduce((a, b) => a + b, 0)).toBe(10_000);
    expect(bps).toEqual([3334, 3333, 3333]);
    for (const input of [[7, 13], [1, 2, 3, 4, 5, 6, 7], [0.3, 0.3, 0.4], [99, 1]]) {
      expect(contributionsToBps(input).reduce((a, b) => a + b, 0)).toBe(10_000);
    }
  });
  it("gives nothing to zero contributions", () => {
    expect(contributionsToBps([0, 4, 0, 1])).toEqual([0, 8000, 0, 2000]);
  });
});

describe("computeCredits (mirrors ProjectSplitter)", () => {
  it("splits round numbers exactly", () => {
    const credits = computeCredits(10_000_000, [{ account: A, bps: 5000 }, { account: B, bps: 3000 }, { account: C, bps: 2000 }], A);
    expect(credits.map((c) => c.amount)).toEqual([5_000_000, 3_000_000, 2_000_000]);
  });
  it("credits rounding dust to the owner so credits sum to the amount", () => {
    const credits = computeCredits(100, [{ account: A, bps: 3333 }, { account: B, bps: 3333 }, { account: C, bps: 3334 }], A);
    expect(credits.reduce((s, c) => s + c.amount, 0)).toBe(100);
    expect(credits.at(-1)).toEqual({ account: A, amount: 1, bps: 0 });
  });
});

describe("diffAddresses", () => {
  it("reports names whose current resolution differs from the on-chain snapshot", () => {
    const diffs = diffAddresses(
      [
        { subname: "alice.acme.eth", address: A },
        { subname: "bob.acme.eth", address: B },
        { subname: "carol.acme.eth", address: C },
      ],
      { "alice.acme.eth": A.toUpperCase().replace("0X", "0x"), "bob.acme.eth": C, "carol.acme.eth": null },
    );
    expect(diffs).toEqual([
      { subname: "bob.acme.eth", stored: B, current: C },
      { subname: "carol.acme.eth", stored: C, current: null },
    ]);
  });
});
