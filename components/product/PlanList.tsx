"use client";

import { FilePlus2, Package, Repeat } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { usePlans } from "@/lib/client/hooks";
import { formatUsdt } from "@/lib/format";
import { RECURRENCE_LABEL } from "@/lib/schema";

export function PlanList() {
  const plans = usePlans();
  return (
    <Card>
      <CardHeader
        title="Products"
        description={plans.data ? `${plans.data.length} plan entities` : "Loading from the ledger…"}
      />
      {plans.error ? (
        <ErrorState message={plans.error.message} onRetry={() => plans.refetch()} />
      ) : plans.isLoading ? (
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : !plans.data?.length ? (
        <EmptyState icon={Package} title="No products yet" description="Create your first price above." />
      ) : (
        <ul className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {plans.data.map((plan) => (
            <li key={plan.key} className="flex flex-col rounded-2xl border border-border bg-bg p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-display font-semibold text-fg">{plan.name}</p>
                  <p className="font-mono text-xs text-fg-muted">{plan.planId}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-fg-muted">
                  <Repeat className="size-3" aria-hidden />
                  {RECURRENCE_LABEL[plan.recurrence]}
                </span>
              </div>
              {plan.description ? <p className="mt-2 line-clamp-2 text-sm text-fg-muted">{plan.description}</p> : null}
              <div className="mt-auto flex items-end justify-between gap-2 pt-4">
                <p className="font-display text-xl font-bold tabular-nums text-fg">{formatUsdt(plan.amount)}</p>
                <ButtonLink
                  href={`/dashboard/invoices/new?plan=${plan.planId}`}
                  size="sm"
                  variant="outline"
                  icon={<FilePlus2 className="size-4" aria-hidden />}
                >
                  Invoice
                </ButtonLink>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
