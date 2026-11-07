import { createPublicClient, createWalletClient, ExpirationTime } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { and, eq, gt, type Expression } from "@arkiv-network/sdk/query";
import { bytes, defineSchema, key as keyValue, str, u64, type AnyColumn, type Schema } from "@arkiv-network/sdk/schema";
import { hexToString, http, stringToHex, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { AttrsByType, EntityType } from "../schema";
import type { Ledger, QueryFilter, StoredEntity } from "./types";

/**
 * Indexed columns per entity type, chosen from the query patterns in the
 * Sintingale data model. Everything else is kept in the JSON `data` column.
 */
const INDEXES: Record<EntityType, { str: string[]; num: string[] }> = {
  merchant: { str: ["merchantId", "payout"], num: [] },
  plan: { str: ["merchantId", "planId", "token", "recurrence"], num: ["amount", "intervalSec"] },
  invoice: {
    str: ["merchantId", "invoiceId", "planId", "customer", "status", "orgId", "projectId", "createdBy", "grantId"],
    num: ["amount", "dueAt"],
  },
  receipt: {
    str: ["invoiceId", "invoiceKey", "merchantId", "customer", "txHash", "planId", "orgId", "projectId", "grantId"],
    num: ["amount", "paidAt"],
  },
  entitlement: { str: ["merchantId", "planId", "customer", "invoiceId"], num: ["periodEnd"] },
  org: { str: ["orgId", "ensName", "owner", "payout", "merchantId"], num: ["verifiedAt"] },
  project: { str: ["orgId", "projectId", "splitContract"], num: ["version"] },
  member: { str: ["orgId", "subname", "address", "role", "kind"], num: ["joinedAt"] },
  invite: { str: ["orgId", "inviteId", "inviteeAddress", "role"], num: ["createdAt"] },
  inviteAccept: { str: ["orgId", "inviteId", "acceptor"], num: ["acceptedAt"] },
  payout: {
    str: ["orgId", "projectId", "invoiceId", "account", "subname", "txHash"],
    num: ["amount", "shareBps", "version", "paidAt"],
  },
  grant: { str: ["orgId", "grantId", "agentName", "agentAddress", "projectId"], num: ["maxAmount", "maxTotal", "createdAt"] },
  revocation: { str: ["orgId", "targetType", "targetId"], num: ["revokedAt"] },
  claim: { str: ["orgId", "projectId", "account", "txHash"], num: ["amount", "claimedAt"] },
};

const schemas = Object.fromEntries(
  (Object.keys(INDEXES) as EntityType[]).map((type) => {
    // `str` values are capped at 128 bytes, so the full record is stored as UTF-8 JSON in a bytes column.
    const cols: Record<string, AnyColumn> = { data: bytes() };
    for (const name of INDEXES[type].str) cols[name] = str().indexed();
    for (const name of INDEXES[type].num) cols[name] = u64().indexed();
    return [type, defineSchema(`sintingale.${type}`, cols)];
  }),
) as Record<EntityType, Schema>;

interface DataColumn {
  attrs: unknown;
  createdAt: number;
  expiresAt: number;
}

type Row = { $key?: Hex; $creator?: Hex; data?: { value: Hex } };

const nowSec = () => Math.floor(Date.now() / 1000);

/** Rabdi rejects lifetimes above ~182 days (7,884,000 blocks of 2 s); stay safely under it. */
const MAX_TTL_SEC = 180 * 86400;

export class ArkivLedger implements Ledger {
  readonly backend = "arkiv" as const;
  readonly writer: string;
  private publicClient;
  private walletClient;

  constructor(privateKey: Hex, accessKey: string) {
    const chain = rabdi({ accessKey });
    const account = privateKeyToAccount(privateKey);
    this.writer = account.address;
    this.publicClient = createPublicClient({ chain, transport: http() });
    this.walletClient = createWalletClient({ chain, transport: http(), account });
  }

  async create<T extends EntityType>(type: T, attrs: AttrsByType[T], requestedExpiresAt: number): Promise<StoredEntity<T>> {
    const createdAt = nowSec();
    const expiresAt = createdAt + Math.min(MAX_TTL_SEC, Math.max(60, requestedExpiresAt - createdAt));
    const record = attrs as unknown as Record<string, unknown>;
    const values: Record<string, unknown> = {
      data: bytes(stringToHex(JSON.stringify({ attrs, createdAt, expiresAt } satisfies DataColumn))),
    };
    for (const name of INDEXES[type].str) values[name] = str(String(record[name] ?? ""));
    for (const name of INDEXES[type].num) values[name] = u64(BigInt(Math.max(0, Math.floor(Number(record[name] ?? 0)))));

    const { entityKey } = await this.walletClient.createEntity(schemas[type], values as never, {
      expiration: ExpirationTime.fromSeconds(expiresAt - createdAt),
    });
    return { key: entityKey, type, attrs, creator: this.writer, createdAt, expiresAt };
  }

  async get<T extends EntityType>(type: T, entityKey: string): Promise<StoredEntity<T> | null> {
    const rows = await this.run(type, [eq("$key", keyValue(entityKey as Hex))], undefined, 1);
    return rows[0] ?? null;
  }

  async query<T extends EntityType>(type: T, filter: QueryFilter<T> = {}): Promise<StoredEntity<T>[]> {
    const nodes = [
      ...Object.entries(filter.eq ?? {}).map(([k, v]) =>
        typeof v === "number" ? eq(k, u64(BigInt(v))) : eq(k, str(String(v))),
      ),
      ...Object.entries(filter.gt ?? {}).map(([k, v]) => gt(k, u64(BigInt(Math.floor(Number(v)))))),
    ];
    return this.run(type, nodes, filter.creator, filter.limit ?? 100);
  }

  private async run<T extends EntityType>(
    type: T,
    nodes: Expression[],
    creator: string | undefined,
    limit: number,
  ): Promise<StoredEntity<T>[]> {
    let builder = this.publicClient
      .select({ $key: true, $creator: true, data: true })
      .from(schemas[type]) as unknown as {
      where: (e: unknown) => typeof builder;
      createdBy: (c: Hex) => typeof builder;
      limit: (n: number) => typeof builder;
      fetch: () => Promise<{ entities: Row[] }>;
    };
    if (nodes.length === 1) builder = builder.where(nodes[0]);
    if (nodes.length > 1) builder = builder.where(and(...(nodes as [Expression, Expression, ...Expression[]])));
    if (creator) builder = builder.createdBy(creator as Hex);
    // Fetch a full page and sort newest-first before applying the caller's limit,
    // so "latest version" lookups with limit 1 cannot return an older entity.
    const result = await builder.limit(100).fetch();

    const now = nowSec();
    return result.entities
      .map((row) => {
        const parsed = JSON.parse(row.data?.value ? hexToString(row.data.value) : "{}") as DataColumn;
        return {
          key: row.$key ?? "",
          type,
          attrs: parsed.attrs as AttrsByType[T],
          creator: row.$creator ?? "",
          createdAt: parsed.createdAt,
          expiresAt: parsed.expiresAt,
        };
      })
      .filter((e) => e.expiresAt > now)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }
}
