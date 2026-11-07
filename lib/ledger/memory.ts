import { randomBytes } from "node:crypto";
import type { AttrsByType, EntityType } from "../schema";
import type { Ledger, QueryFilter, StoredEntity } from "./types";

const nowSec = () => Math.floor(Date.now() / 1000);

/**
 * In-process emulation of Arkiv's entity model: attribute filters, `$creator`
 * and expiry. Expired entities are dropped on read, exactly like a live Arkiv
 * query stops returning them.
 */
export class MemoryLedger implements Ledger {
  readonly backend = "memory" as const;
  private entities = new Map<string, StoredEntity>();
  private ready: Promise<void> = Promise.resolve();

  constructor(readonly writer: string) {}

  /** Reads and writes wait for async seeding (the demo org needs signatures). */
  whenReady(task: Promise<void>) {
    this.ready = task.catch((err) => console.error("[sintingale] demo seed failed", err));
  }

  async create<T extends EntityType>(type: T, attrs: AttrsByType[T], expiresAt: number): Promise<StoredEntity<T>> {
    await this.ready;
    const entity: StoredEntity<T> = {
      key: `0x${randomBytes(32).toString("hex")}`,
      type,
      attrs,
      creator: this.writer,
      createdAt: nowSec(),
      expiresAt,
    };
    this.entities.set(entity.key, entity as StoredEntity);
    return entity;
  }

  async get<T extends EntityType>(type: T, key: string): Promise<StoredEntity<T> | null> {
    await this.ready;
    const entity = this.entities.get(key.toLowerCase()) ?? this.entities.get(key);
    if (!entity || entity.type !== type) return null;
    if (entity.expiresAt <= nowSec()) {
      this.entities.delete(entity.key);
      return null;
    }
    return entity as StoredEntity<T>;
  }

  async query<T extends EntityType>(type: T, filter: QueryFilter<T> = {}): Promise<StoredEntity<T>[]> {
    await this.ready;
    const now = nowSec();
    const out: StoredEntity<T>[] = [];
    for (const entity of this.entities.values()) {
      if (entity.expiresAt <= now) {
        this.entities.delete(entity.key);
        continue;
      }
      if (entity.type !== type) continue;
      if (filter.creator && entity.creator.toLowerCase() !== filter.creator.toLowerCase()) continue;
      const attrs = entity.attrs as unknown as Record<string, unknown>;
      const eqOk = Object.entries(filter.eq ?? {}).every(
        ([k, v]) => String(attrs[k]).toLowerCase() === String(v).toLowerCase(),
      );
      if (!eqOk) continue;
      const gtOk = Object.entries(filter.gt ?? {}).every(([k, v]) => Number(attrs[k]) > Number(v));
      if (!gtOk) continue;
      out.push(entity as StoredEntity<T>);
    }
    out.sort((a, b) => b.createdAt - a.createdAt);
    return filter.limit ? out.slice(0, filter.limit) : out;
  }

  /** Test/seed helper: insert an entity with explicit timestamps. */
  seed<T extends EntityType>(type: T, attrs: AttrsByType[T], createdAt: number, expiresAt: number) {
    const entity: StoredEntity<T> = {
      key: `0x${randomBytes(32).toString("hex")}`,
      type,
      attrs,
      creator: this.writer,
      createdAt,
      expiresAt,
    };
    this.entities.set(entity.key, entity as StoredEntity);
    return entity;
  }
}
