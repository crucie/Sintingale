"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { publicConfig } from "@/lib/config";
import { createInvoice, hasAccess } from "@/lib/sintingale";
import type { AccessResult } from "@/lib/types";

const customerSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/, "Enter a valid wallet address");
const planSchema = z.enum(["pro", "team", "flash"]);

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
