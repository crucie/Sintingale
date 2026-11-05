import type { AttrsByType, EntityType } from "../schema";

/** A ledger entity as Sintingale sees it, independent of the backing store. */
export interface StoredEntity<T extends EntityType = EntityType> {
  key: string;
  type: T;
  attrs: AttrsByType[T];
  creator: string;
  createdAt: number;
  /** Unix seconds after which the ledger stops returning the entity. */
  expiresAt: number;
}

export interface QueryFilter<T extends EntityType> {
  /** Equality filters on indexed attributes. */
  eq?: Partial<Record<keyof AttrsByType[T], string | number>>;
  /** Strict greater-than filters on numeric attributes. */
  gt?: Partial<Record<keyof AttrsByType[T], number>>;
  /** Equivalent of Arkiv's `$creator` filter. */
  creator?: string;
  limit?: number;
}

export interface Ledger {
  readonly backend: "memory" | "arkiv";
  readonly writer: string;
  create<T extends EntityType>(type: T, attrs: AttrsByType[T], expiresAt: number): Promise<StoredEntity<T>>;
  get<T extends EntityType>(type: T, key: string): Promise<StoredEntity<T> | null>;
  query<T extends EntityType>(type: T, filter?: QueryFilter<T>): Promise<StoredEntity<T>[]>;
}
