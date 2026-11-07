"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { rateLimit } from "@/lib/api";
import { publicConfig } from "@/lib/config";
import { createInvoice, getMerchant, hasAccess, listPlans } from "@/lib/sintingale";
import type { AccessResult, PlanDTO } from "@/lib/types";

const customerSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/, "Enter a valid wallet address");
const planSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]{1,39}$/, "Unknown plan");

/** The example app's catalogue: the merchant's live plans on Arkiv. */
export async function loadStoreAction(): Promise<{ merchantName: string | null; plans: PlanDTO[] }> {
  const [merchant, plans] = await Promise.all([getMerchant(publicConfig.merchantId), listPlans(publicConfig.merchantId)]);
  return { merchantName: merchant?.name ?? null, plans };
}

/** Runs on the "SaaS backend": one ledger query decides whether the page unlocks. */
export async function checkAccessAction(customer: string, planId: string): Promise<AccessResult> {
  return hasAccess({
    merchantId: publicConfig.merchantId,
    planId: planSchema.parse(planId),
    customer: customerSchema.parse(customer),
  });
}

export async function startCheckoutAction(customer: string, planId: string): Promise<{ checkoutUrl: string }> {
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  rateLimit(new Request(origin, { headers: new Headers(h) }), "example-checkout", 10);
  const { checkoutUrl } = await createInvoice(
    {
      merchantId: publicConfig.merchantId,
      planId: planSchema.parse(planId),
      customer: customerSchema.parse(customer),
      currency: "USDT",
      dueInHours: 1,
    },
    origin,
  );
  return { checkoutUrl };
}
