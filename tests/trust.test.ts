import { describe, expect, it } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { authMessage } from "@/lib/arkiv/messages";
import { isRelayerEntity, isValidOrg, isValidOrgEntity } from "@/lib/arkiv/trust";
import type { StoredEntity } from "@/lib/ledger/types";
import type { AttrsByType, AuthorizedType } from "@/lib/schema";

const owner = privateKeyToAccount(generatePrivateKey());
const attacker = privateKeyToAccount(generatePrivateKey());
const relayer = privateKeyToAccount(generatePrivateKey()).address.toLowerCase();
const lc = (v: string) => v.toLowerCase();

async function entity<T extends AuthorizedType>(
  type: T,
  attrs: Omit<AttrsByType[T], "authSig">,
  { signer = owner, creator = relayer }: { signer?: typeof owner; creator?: string } = {},
): Promise<StoredEntity<T>> {
  const authSig = await signer.signMessage({ message: authMessage(type, attrs as AttrsByType[T]) });
  return { key: "0x01", type, attrs: { ...attrs, authSig } as AttrsByType[T], creator, createdAt: 1, expiresAt: 9e9 };
}

const orgAttrs = {
  orgId: "acme.eth",
  ensName: "acme.eth",
  owner: lc(owner.address),
  payout: lc(owner.address),
  merchantId: "m_sintingale",
  verifyMethod: "addr" as const,
  verifiedAt: 1,
};

const memberAttrs = {
  orgId: "acme.eth",
  subname: "alice.acme.eth",
  address: lc(attacker.address),
  role: "member" as const,
  kind: "person" as const,
  inviteId: "",
  joinedAt: 2,
};

describe("isValidOrg", () => {
  it("accepts a relayer-written org signed by its owner", async () => {
    expect(await isValidOrg(await entity("org", orgAttrs), relayer)).toBe(true);
  });
  it("rejects an org written by anyone but the relayer", async () => {
    expect(await isValidOrg(await entity("org", orgAttrs, { creator: lc(attacker.address) }), relayer)).toBe(false);
  });
  it("rejects an org whose signature is not the recorded owner's", async () => {
    expect(await isValidOrg(await entity("org", orgAttrs, { signer: attacker }), relayer)).toBe(false);
  });
});

describe("isValidOrgEntity", () => {
  it("accepts owner-signed entities written by the relayer", async () => {
    const org = await entity("org", orgAttrs);
    expect(await isValidOrgEntity("member", await entity("member", memberAttrs), org, relayer)).toBe(true);
  });
  it("accepts entities the owner wrote directly ($creator is the owner)", async () => {
    const org = await entity("org", orgAttrs);
    const direct = await entity("member", memberAttrs, { signer: attacker, creator: lc(owner.address) });
    expect(await isValidOrgEntity("member", direct, org, relayer)).toBe(true);
  });
  it("ignores look-alike entities created by another wallet", async () => {
    const org = await entity("org", orgAttrs);
    const fake = await entity("member", memberAttrs, { creator: lc(attacker.address) });
    expect(await isValidOrgEntity("member", fake, org, relayer)).toBe(false);
  });
  it("rejects relayer-written entities that a non-owner signed", async () => {
    const org = await entity("org", orgAttrs);
    expect(await isValidOrgEntity("member", await entity("member", memberAttrs, { signer: attacker }), org, relayer)).toBe(false);
  });
  it("rejects entities whose attributes were changed after signing", async () => {
    const org = await entity("org", orgAttrs);
    const signed = await entity("member", memberAttrs);
    signed.attrs = { ...signed.attrs, role: "admin" };
    expect(await isValidOrgEntity("member", signed, org, relayer)).toBe(false);
  });
  it("rejects entities belonging to another org", async () => {
    const org = await entity("org", orgAttrs);
    const other = await entity("member", { ...memberAttrs, orgId: "other.eth" });
    expect(await isValidOrgEntity("member", other, org, relayer)).toBe(false);
  });
});

describe("isRelayerEntity", () => {
  it("only trusts the configured relayer as $creator", () => {
    const base = { key: "0x", type: "payout" as const, attrs: {} as AttrsByType["payout"], createdAt: 0, expiresAt: 0 };
    expect(isRelayerEntity({ ...base, creator: relayer.toUpperCase().replace("0X", "0x") }, relayer)).toBe(true);
    expect(isRelayerEntity({ ...base, creator: lc(attacker.address) }, relayer)).toBe(false);
  });
});
