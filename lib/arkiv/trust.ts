import { recoverMessageAddress, type Hex } from "viem";
import type { AttrsByType, AuthorizedType, InviteAcceptAttrs } from "../schema";
import type { StoredEntity } from "../ledger/types";
import { acceptMessage, authMessage } from "./messages";

const lc = (v: string) => v.toLowerCase();
const sigCache = new Map<string, string>();

async function recover(message: string, signature: string): Promise<string | null> {
  const cacheKey = `${signature}:${message}`;
  const hit = sigCache.get(cacheKey);
  if (hit) return hit;
  try {
    const addr = lc(await recoverMessageAddress({ message, signature: signature as Hex }));
    if (sigCache.size > 5_000) sigCache.clear();
    sigCache.set(cacheKey, addr);
    return addr;
  } catch {
    return null;
  }
}

export async function signerOf<T extends AuthorizedType>(type: T, attrs: AttrsByType[T]): Promise<string | null> {
  const sig = (attrs as { authSig?: string }).authSig;
  if (!sig) return null;
  return recover(authMessage(type, attrs), sig);
}

export async function acceptorOf(attrs: InviteAcceptAttrs): Promise<string | null> {
  return recover(acceptMessage(attrs), attrs.acceptSig);
}

/** Receipts, entitlements, payouts and claims are only believed if the relayer wrote them. */
export const isRelayerEntity = (entity: StoredEntity, relayer: string) => lc(entity.creator) === lc(relayer);

/**
 * The org entity is the root of trust for a team. It is accepted when the relayer
 * wrote it (it only does so after checking ENS control) and the recorded owner
 * signed it.
 */
export async function isValidOrg(org: StoredEntity<"org">, relayer: string): Promise<boolean> {
  if (!isRelayerEntity(org, relayer)) return false;
  return (await signerOf("org", org.attrs)) === lc(org.attrs.owner);
}

/**
 * Shared helper for every org-scoped read that drives access control.
 * Valid when the org owner wrote the entity directly (`$creator` is the owner),
 * or when the relayer wrote it carrying the owner's signature over its attributes.
 */
export async function isValidOrgEntity<T extends AuthorizedType>(
  type: T,
  entity: StoredEntity<T>,
  org: StoredEntity<"org">,
  relayer: string,
): Promise<boolean> {
  const owner = lc(org.attrs.owner);
  if ((entity.attrs as { orgId?: string }).orgId !== org.attrs.orgId) return false;
  if (lc(entity.creator) === owner) return true;
  if (!isRelayerEntity(entity, relayer)) return false;
  return (await signerOf(type, entity.attrs)) === owner;
}

/** Filters a list down to entities that pass {@link isValidOrgEntity}. */
export async function filterValid<T extends AuthorizedType>(
  type: T,
  entities: StoredEntity<T>[],
  org: StoredEntity<"org">,
  relayer: string,
): Promise<StoredEntity<T>[]> {
  const checks = await Promise.all(entities.map((e) => isValidOrgEntity(type, e, org, relayer)));
  return entities.filter((_, i) => checks[i]);
}
