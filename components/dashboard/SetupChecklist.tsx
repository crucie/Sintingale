"use client";

import { ArrowRight, Check } from "lucide-react";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { usePayoutStatus } from "@/lib/client/chain";
import { ApiError, useInvoices, useMerchant, usePlans } from "@/lib/client/hooks";
import { cn } from "@/lib/format";
import { merchantWalletOf, PayoutRegistration } from "./PayoutRegistration";

interface SetupStep {
  id: string;
  title: string;
  body: string;
  done: boolean;
  action?: ReactNode;
}

/** The five things a new merchant has to do before money arrives, derived from live data. */
export function useSetupSteps() {
  const merchant = useMerchant();
  const plans = usePlans();
  const invoices = useInvoices();
  const payout = usePayoutStatus(merchant.data ? merchantWalletOf(merchant.data) : null);

  const loading =
    merchant.isLoading ||
    plans.isLoading ||
    invoices.isLoading ||
    (Boolean(merchant.data) && payout.registered === undefined && payout.isLoading);
  const hasMerchant = Boolean(merchant.data);
  const missingMerchant = merchant.error instanceof ApiError && merchant.error.status === 404;

  const steps: SetupStep[] = [
    {
      id: "profile",
      title: "Create your business profile",
      body: "Your business name and the address that receives payments.",
      done: hasMerchant,
      action: (
        <ButtonLink href="/dashboard/settings" size="sm" icon={<ArrowRight className="size-4" aria-hidden />}>
          Set up profile
        </ButtonLink>
      ),
    },
    {
      id: "payout",
      title: "Register your payout on Whitechain",
      body: "A one-time wallet signature so USDT payments can reach you.",
      done: payout.registered === true && payout.payout?.toLowerCase() === merchant.data?.payout.toLowerCase(),
      action: merchant.data ? <PayoutRegistration merchant={merchant.data} className="mt-1" /> : undefined,
    },
    {
      id: "product",
      title: "Add a product",
      body: "A price customers can pay: one-time or recurring.",
      done: (plans.data?.length ?? 0) > 0,
      action: (
        <ButtonLink href="/dashboard/products" size="sm" icon={<ArrowRight className="size-4" aria-hidden />}>
          Add a product
        </ButtonLink>
      ),
    },
    {
      id: "link",
      title: "Share a checkout link",
      body: "Create an invoice and send the link or QR code to your customer.",
      done: (invoices.data?.length ?? 0) > 0,
      action: (
        <ButtonLink href="/dashboard/invoices/new" size="sm" icon={<ArrowRight className="size-4" aria-hidden />}>
          Create a checkout link
        </ButtonLink>
      ),
    },
    {
      id: "paid",
      title: "Get your first payment",
      body: "Open the checkout link with a customer wallet that holds test USDT and a little WBT for gas.",
      done: invoices.data?.some((i) => i.status === "paid") ?? false,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  return { steps, loading, missingMerchant, doneCount, complete: !loading && doneCount === steps.length };
}

export function SetupChecklist({ setup }: { setup: ReturnType<typeof useSetupSteps> }) {
  const { steps, doneCount } = setup;
  const nextId = steps.find((s) => !s.done)?.id;

  return (
    <Card className="mb-6 overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-fg">Get ready to accept payments</h2>
          <p className="text-sm text-fg-muted">
            {doneCount} of {steps.length} done. Finish these once and customers can pay you in USDT.
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted sm:w-48" aria-hidden>
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
        </div>
      </div>
      <ol className="divide-y divide-border">
        {steps.map((step, i) => {
          const isNext = step.id === nextId;
          return (
            <li key={step.id} className={cn("flex gap-4 px-5 py-4", isNext && "bg-brand-soft/40")}>
              <span
                className={cn(
                  "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                  step.done ? "border-success bg-success text-white" : isNext ? "border-brand text-brand" : "border-border text-fg-muted",
                )}
                aria-hidden
              >
                {step.done ? <Check className="size-4" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-medium", step.done ? "text-fg-muted line-through" : "text-fg")}>{step.title}</p>
                {!step.done ? <p className="mt-0.5 text-xs text-fg-muted">{step.body}</p> : null}
                {isNext && step.action ? <div className="mt-3">{step.action}</div> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
