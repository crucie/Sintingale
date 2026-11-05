import { randomBytes } from "node:crypto";
import { publicConfig, serverConfig } from "../config";
import { DEMO_CUSTOMERS } from "../demo";
import { RECURRENCE_SECONDS, type PlanAttrs } from "../schema";
import type { MemoryLedger } from "./memory";

const DAY = 86400;
const hex = (bytes: number) => `0x${randomBytes(bytes).toString("hex")}`;

/** Populates the in-memory ledger so the dashboard has something to show on first boot. */
export function seedDemoData(ledger: MemoryLedger) {
  const now = Math.floor(Date.now() / 1000);
  const merchantId = publicConfig.merchantId;
  const grace = serverConfig().invoiceGraceSec;

  ledger.seed(
    "merchant",
    {
      merchantId,
      name: "Acme Analytics",
      payout: "0x1f2e3d4c5b6a79880716253443526170aa9bb8c7",
      email: "billing@acme.dev",
    },
    now - 30 * DAY,
    now + 365 * DAY,
  );

  const plans: PlanAttrs[] = [
    {
      merchantId,
      planId: "starter",
      name: "Starter",
      description: "Lifetime access to the core dashboard",
      token: "USDT",
      recurrence: "one-time",
      amount: 5_000_000,
      intervalSec: RECURRENCE_SECONDS["one-time"],
    },
    {
      merchantId,
      planId: "pro",
      name: "Pro Plan",
      description: "Unlimited projects and API access",
      token: "USDT",
      recurrence: "monthly",
      amount: 10_000_000,
      intervalSec: RECURRENCE_SECONDS.monthly,
    },
    {
      merchantId,
      planId: "team",
      name: "Team",
      description: "Up to 10 seats, SSO and audit log",
      token: "USDT",
      recurrence: "monthly",
      amount: 49_000_000,
      intervalSec: RECURRENCE_SECONDS.monthly,
    },
    {
      merchantId,
      planId: "flash",
      name: "Flash Pass",
      description: "Short-lived pass to demo entitlement expiry",
      token: "USDT",
      recurrence: "demo-5m",
      amount: 1_000_000,
      intervalSec: RECURRENCE_SECONDS["demo-5m"],
    },
  ];
  for (const plan of plans) ledger.seed("plan", plan, now - 20 * DAY, now + 365 * DAY);

  const customers = [
    "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    DEMO_CUSTOMERS.withTeam,
    "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db",
    "0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB",
    DEMO_CUSTOMERS.withPro,
  ];

  const paid: Array<[string, number, number]> = [
    ["pro", 0, 9],
    ["team", 1, 6],
    ["pro", 2, 3],
    ["starter", 3, 1.5],
    ["pro", 4, 0.2],
  ];
  paid.forEach(([planId, ci, daysAgo]) => {
    const plan = plans.find((p) => p.planId === planId)!;
    const paidAt = Math.floor(now - daysAgo * DAY);
    const invoiceId = `inv_${randomBytes(3).toString("hex")}`;
    const customer = customers[ci].toLowerCase();
    ledger.seed(
      "receipt",
      {
        invoiceId,
        invoiceKey: hex(32),
        merchantId,
        planId,
        customer,
        payer: customer,
        txHash: hex(32),
        amount: plan.amount,
        paidAt,
        description: `${plan.name}${plan.recurrence === "one-time" ? "" : `, ${plan.recurrence}`}`,
        simulated: true,
      },
      paidAt,
      now + 180 * DAY,
    );
    const periodEnd = paidAt + plan.intervalSec;
    if (periodEnd > now) {
      ledger.seed("entitlement", { merchantId, planId, customer, invoiceId, periodEnd }, paidAt, periodEnd);
    }
  });

  const pending: Array<[string, string, number]> = [
    ["pro", DEMO_CUSTOMERS.noAccess, 23 * 3600],
    ["team", "ops@northwind.io", 3 * DAY],
    ["flash", "", 150],
  ];
  pending.forEach(([planId, customer, dueIn]) => {
    const plan = plans.find((p) => p.planId === planId)!;
    const dueAt = now + dueIn;
    ledger.seed(
      "invoice",
      {
        merchantId,
        invoiceId: `inv_${randomBytes(3).toString("hex")}`,
        planId,
        customer: customer.toLowerCase(),
        status: "pending",
        amount: plan.amount,
        dueAt,
        description: plan.name,
      },
      now - 600,
      dueAt + grace,
    );
  });
}
