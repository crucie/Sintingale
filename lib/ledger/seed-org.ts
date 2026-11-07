import "server-only";
import { randomBytes } from "node:crypto";
import { authMessage } from "../arkiv/messages";
import { projectIdToBytes32 } from "../chain/splitter";
import { publicConfig, serverConfig, splitterEnabled } from "../config";
import { DEMO_IDENTITIES, DEMO_ORG_NAME } from "../demo";
import { demoAccount } from "../demo-keys";
import type { AttrsByType, AuthorizedType, ProjectShare } from "../schema";
import { computeCredits, contributionsToBps } from "../splits";
import type { MemoryLedger } from "./memory";

const DAY = 86400;
const LONG = 365 * DAY;
const hex = (n: number) => `0x${randomBytes(n).toString("hex")}`;
const lc = (v: string) => v.toLowerCase();

const owner = demoAccount("owner");

async function signed<T extends AuthorizedType>(type: T, attrs: Omit<AttrsByType[T], "authSig">): Promise<AttrsByType[T]> {
  const authSig = await owner.signMessage({ message: authMessage(type, attrs as AttrsByType[T]) });
  return { ...attrs, authSig } as AttrsByType[T];
}

/** Seeds `acme.demo` so teams, splits and agents can be explored without a Sepolia name. */
export async function seedDemoOrg(ledger: MemoryLedger) {
  const now = Math.floor(Date.now() / 1000);
  const orgId = DEMO_ORG_NAME;
  const ownerAddr = lc(DEMO_IDENTITIES.owner.address);
  const alice = lc(DEMO_IDENTITIES.alice.address);
  const bob = lc(DEMO_IDENTITIES.bob.address);

  ledger.seed(
    "org",
    await signed("org", {
      orgId,
      ensName: orgId,
      owner: ownerAddr,
      payout: ownerAddr,
      merchantId: publicConfig.merchantId,
      verifyMethod: "demo",
      verifiedAt: now - 10 * DAY,
    }),
    now - 10 * DAY,
    now + LONG,
  );

  const people: Array<[string, string, "admin" | "member", "person" | "agent"]> = [
    [DEMO_IDENTITIES.alice.name, alice, "admin", "person"],
    [DEMO_IDENTITIES.bob.name, bob, "member", "person"],
    [DEMO_IDENTITIES.agent.name, lc(DEMO_IDENTITIES.agent.address), "member", "agent"],
  ];
  for (const [subname, address, role, kind] of people) {
    ledger.seed(
      "member",
      await signed("member", { orgId, subname, address, role, kind, inviteId: "", joinedAt: now - 9 * DAY }),
      now - 9 * DAY,
      now + LONG,
    );
  }

  const splitContract = splitterEnabled ? lc(publicConfig.splitter!) : "simulated";
  const projects: Array<{ id: string; name: string; description: string; rows: Array<[string, string, number]> }> = [
    {
      id: "launch",
      name: "Launch",
      description: "Product launch: design, build and go-to-market",
      rows: [
        [orgId, ownerAddr, 5],
        [DEMO_IDENTITIES.alice.name, alice, 3],
        [DEMO_IDENTITIES.bob.name, bob, 2],
      ],
    },
    {
      id: "website",
      name: "Website",
      description: "Marketing site and docs",
      rows: [
        [orgId, ownerAddr, 3],
        [DEMO_IDENTITIES.bob.name, bob, 2],
      ],
    },
  ];
  const shareTables = new Map<string, ProjectShare[]>();
  for (const p of projects) {
    const bps = contributionsToBps(p.rows.map((r) => r[2]));
    const shares = p.rows.map(([subname, account, contribution], i) => ({
      subname,
      account,
      bps: bps[i],
      contribution,
      resolvedAt: now - 8 * DAY,
    }));
    shareTables.set(p.id, shares);
    ledger.seed(
      "project",
      await signed("project", {
        orgId,
        projectId: p.id,
        name: p.name,
        description: p.description,
        splitContract,
        onchainId: projectIdToBytes32(orgId, p.id),
        version: 1,
        shares,
        updatedAt: now - 8 * DAY,
      }),
      now - 8 * DAY,
      now + LONG,
    );
  }

  ledger.seed(
    "invite",
    await signed("invite", {
      orgId,
      inviteId: "inv-carol01",
      inviteeAddress: lc(DEMO_IDENTITIES.carol.address),
      label: "carol",
      role: "member",
      createdAt: now - 3600,
    }),
    now - 3600,
    now - 3600 + serverConfig().inviteTtlSec,
  );

  ledger.seed(
    "grant",
    await signed("grant", {
      orgId,
      grantId: "grant-bot-01",
      agentName: DEMO_IDENTITIES.agent.name,
      agentAddress: lc(DEMO_IDENTITIES.agent.address),
      scope: "invoice:create",
      projectId: "",
      maxAmount: 25_000_000,
      maxTotal: 100_000_000,
      createdAt: now - 600,
    }),
    now - 600,
    now + DAY,
  );

  if (splitterEnabled) return;

  // Paid project invoices with relayer receipts and payouts (simulated settlement).
  const paid: Array<[string, number, number]> = [
    ["launch", 10_000_000, 1],
    ["launch", 25_000_000, 3],
    ["website", 40_000_000, 5],
  ];
  for (const [projectId, amount, daysAgo] of paid) {
    const paidAt = now - daysAgo * DAY;
    const invoiceId = `inv_${randomBytes(3).toString("hex")}`;
    const txHash = hex(32);
    const customer = hex(20);
    const project = projects.find((p) => p.id === projectId)!;
    ledger.seed(
      "receipt",
      {
        invoiceId,
        invoiceKey: hex(32),
        merchantId: publicConfig.merchantId,
        planId: "",
        customer,
        payer: customer,
        txHash,
        amount,
        paidAt,
        description: `${project.name} milestone`,
        simulated: true,
        orgId,
        projectId,
      },
      paidAt,
      now + 180 * DAY,
    );
    const shares = shareTables.get(projectId)!;
    for (const c of computeCredits(amount, shares, ownerAddr)) {
      ledger.seed(
        "payout",
        {
          orgId,
          projectId,
          invoiceId,
          account: c.account,
          subname: shares.find((s) => s.account === c.account)?.subname ?? orgId,
          txHash,
          amount: c.amount,
          shareBps: c.bps,
          version: 1,
          paidAt,
          simulated: true,
        },
        paidAt,
        now + 180 * DAY,
      );
    }
  }

  ledger.seed(
    "invoice",
    {
      merchantId: publicConfig.merchantId,
      invoiceId: `inv_${randomBytes(3).toString("hex")}`,
      planId: "",
      customer: "",
      status: "pending",
      amount: 10_000_000,
      dueAt: now + 2 * DAY,
      description: "Launch: phase 2",
      orgId,
      projectId: "launch",
    },
    now - 1800,
    now + 2 * DAY + serverConfig().invoiceGraceSec,
  );
}
