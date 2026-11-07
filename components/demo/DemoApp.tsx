"use client";

import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, BarChart3, Code2, Lock, LockOpen, Search, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useConnection } from "wagmi";
import { checkAccessAction, loadStoreAction, startCheckoutAction } from "@/app/demo/actions";
import { ExpiryCountdown } from "@/components/dashboard/ExpiryCountdown";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { publicConfig } from "@/lib/config";
import { cn, formatUsdt, shortHash } from "@/lib/format";
import { RECURRENCE_LABEL } from "@/lib/schema";
import type { AccessResult, PlanDTO } from "@/lib/types";

const isAddress = (v: string) => /^0x[0-9a-fA-F]{40}$/.test(v);

/** Placeholder content of the example SaaS product that sits behind the paywall. */
function SampleAnalytics() {
  const bars = [42, 68, 51, 80, 63, 92, 74, 88, 70, 96, 84, 100];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[
        { icon: Users, label: "Active users", value: "18,204" },
        { icon: Activity, label: "Events / min", value: "3,912" },
        { icon: BarChart3, label: "Conversion", value: "4.8%" },
      ].map((s) => (
        <div key={s.label} className="rounded-2xl border border-border bg-bg p-4">
          <s.icon className="size-4 text-brand" aria-hidden />
          <p className="mt-2 text-xs text-fg-muted">{s.label}</p>
          <p className="font-display text-2xl font-semibold text-fg">{s.value}</p>
        </div>
      ))}
      <div className="rounded-2xl border border-border bg-bg p-4 md:col-span-3">
        <p className="text-sm font-medium text-fg">Weekly retention cohort</p>
        <div className="mt-4 flex h-36 items-end gap-2">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 rounded-t-md bg-brand/80" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  access,
  checking,
  onBuy,
  buying,
  canBuy,
}: {
  plan: PlanDTO;
  access: AccessResult | undefined;
  checking: boolean;
  onBuy: () => void;
  buying: boolean;
  canBuy: boolean;
}) {
  const active = access?.active ?? false;
  return (
    <div className={cn("flex flex-col rounded-2xl border bg-bg p-5", active ? "border-success/40" : "border-border")}>
      <p className="font-display text-lg font-semibold text-fg">{plan.name}</p>
      {plan.description ? <p className="mt-1 text-sm text-fg-muted">{plan.description}</p> : null}
      <p className="mt-4 font-display text-3xl font-bold tabular-nums text-fg">
        {formatUsdt(plan.amount, { symbol: false })} <span className="text-base font-medium text-fg-muted">USDT</span>
      </p>
      <p className="text-xs text-fg-muted">{RECURRENCE_LABEL[plan.recurrence]}</p>
      <div className="mt-5 flex-1" />
      {active && access?.periodEnd ? (
        <p className="flex flex-wrap items-center gap-1 rounded-xl bg-success-soft px-3 py-2 text-sm text-success">
          <LockOpen className="size-4" aria-hidden /> Active · renews by paying again in <ExpiryCountdown expiresAt={access.periodEnd} />
        </p>
      ) : (
        <Button onClick={onBuy} loading={buying} disabled={!canBuy || checking} icon={<ArrowRight className="size-4" />} className="w-full">
          {canBuy ? `${plan.recurrence === "one-time" ? "Buy" : "Subscribe"} with USDT` : "Connect wallet to subscribe"}
        </Button>
      )}
    </div>
  );
}

export function DemoApp() {
  const { address, isConnected } = useConnection();
  const store = useQuery({ queryKey: ["example-store"], queryFn: () => loadStoreAction() });
  const plans = store.data?.plans ?? [];
  const merchantName = store.data?.merchantName ?? "Example SaaS";
  const [override, setOverride] = useState("");
  const [checked, setChecked] = useState<string | null>(null);
  // The visitor is the connected wallet, unless a developer checks another address below.
  const customer = checked ?? address ?? null;

  const accessQueries = useQueries({
    queries: plans.map((p) => ({
      queryKey: ["example-access", customer, p.planId],
      queryFn: () => checkAccessAction(customer!, p.planId),
      enabled: Boolean(customer),
      refetchInterval: 5_000,
    })),
  });
  const accessByPlan = new Map(plans.map((p, i) => [p.planId, accessQueries[i]?.data]));
  const activePlan = plans.find((p) => accessByPlan.get(p.planId)?.active);
  const firstAccess = activePlan ? accessByPlan.get(activePlan.planId) : plans[0] ? accessByPlan.get(plans[0].planId) : undefined;

  const buy = useMutation({
    mutationFn: (planId: string) => startCheckoutAction(customer!, planId),
    onSuccess: ({ checkoutUrl }) => {
      window.location.href = checkoutUrl;
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not start checkout"),
  });

  return (
    <div className="min-h-dvh bg-muted">
      <header className="border-b border-border bg-bg">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <span className="font-display text-lg font-bold text-fg">{merchantName}</span>
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">example app</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ConnectButton size="sm" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <section className="rounded-3xl border border-border bg-bg p-5 sm:p-6">
          <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
            {activePlan ? `You're on ${activePlan.name}` : "Choose a plan to unlock Pro analytics"}
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            {!isConnected && !checked
              ? "Connect your wallet first. Your wallet is your account: no sign-up, no password."
              : activePlan
                ? "Your payment is confirmed. The content below is unlocked for this wallet."
                : "Pay once in USDT on Whitechain. Access unlocks within seconds and ends by itself when the period is over."}
          </p>
          {!isConnected && !checked ? (
            <div className="mt-4">
              <ConnectButton />
            </div>
          ) : null}

          {store.isLoading ? (
            <p className="mt-6 text-sm text-fg-muted">Loading plans…</p>
          ) : !plans.length ? (
            <p className="mt-6 rounded-xl border border-border p-4 text-sm text-fg-muted">
              This store has no plans yet. If you run it, add one in{" "}
              <Link href="/dashboard/products" className="text-brand hover:underline">
                Dashboard → Products
              </Link>
              .
            </p>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {plans.map((p, i) => (
                <PlanCard
                  key={p.planId}
                  plan={p}
                  access={accessByPlan.get(p.planId)}
                  checking={accessQueries[i]?.isLoading ?? false}
                  onBuy={() => buy.mutate(p.planId)}
                  buying={buy.isPending && buy.variables === p.planId}
                  canBuy={Boolean(customer)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-fg">Pro analytics</h2>
          <div className={cn("transition-all duration-500", !activePlan && "pointer-events-none select-none blur-md")} aria-hidden={!activePlan}>
            <SampleAnalytics />
          </div>
          {!activePlan ? (
            <div className="absolute inset-0 grid place-items-center bg-bg/40 p-6 text-center">
              <div className="max-w-xs">
                <Lock className="mx-auto size-8 text-brand" aria-hidden />
                <p className="mt-2 font-display text-lg font-semibold text-fg">Unlocks after payment</p>
                <p className="mt-1 text-sm text-fg-muted">Pick a plan above. This page checks your access every few seconds.</p>
              </div>
            </div>
          ) : null}
        </section>

        <details className="group rounded-3xl bg-[#1d1410] p-5 text-[#ffd9cc] sm:p-6">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-white">
            <Code2 className="size-4" aria-hidden /> How this page works (for developers)
          </summary>
          <p className="mt-3 text-xs text-white/70">
            This app plays a merchant&apos;s SaaS backend. To decide what to show, it asks Sintingale one question for each plan:
            does this wallet hold a live entitlement? That is a single query against Arkiv.
          </p>
          <pre className="mt-3 overflow-x-auto font-mono text-xs leading-relaxed">{`const active = await sintingale.hasAccess({
  merchantId: "${publicConfig.merchantId}",
  planId: "${activePlan?.planId ?? plans[0]?.planId ?? "pro"}",
  customer: "${customer ?? "0x…"}",
});`}</pre>
          {firstAccess ? (
            <>
              <p className="mt-4 text-xs text-white/60">Arkiv query</p>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs text-white/80">{firstAccess.query}</pre>
            </>
          ) : null}
          <form
            className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              const v = override.trim();
              if (!isAddress(v)) return toast.error("Enter a valid 0x wallet address");
              setChecked(v);
            }}
          >
            <Field label="Check another wallet" htmlFor="demo-customer" className="flex-1 text-white">
              <Input
                id="demo-customer"
                className="font-mono"
                placeholder={address ?? "0x…"}
                value={override}
                onChange={(e) => setOverride(e.target.value)}
                autoComplete="off"
              />
            </Field>
            <Button type="submit" variant="secondary" icon={<Search className="size-4" />}>
              Check
            </Button>
            {checked ? (
              <Button type="button" variant="ghost" className="text-white" onClick={() => setChecked(null)}>
                Back to {address ? shortHash(address) : "my wallet"}
              </Button>
            ) : null}
          </form>
        </details>

        <p className="flex items-center justify-center gap-2 pb-4 text-xs text-fg-muted">
          Billing by <Logo className="text-sm" />
        </p>
      </main>
    </div>
  );
}
