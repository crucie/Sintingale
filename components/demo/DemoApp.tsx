"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, BarChart3, Code2, Lock, LockOpen, Search, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useConnection } from "wagmi";
import { checkAccessAction, loadStoreAction, startCheckoutAction } from "@/app/demo/actions";
import { ExpiryCountdown } from "@/components/dashboard/ExpiryCountdown";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { publicConfig } from "@/lib/config";
import { cn, formatUsdt, shortHash } from "@/lib/format";
import { RECURRENCE_LABEL } from "@/lib/schema";

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

export function DemoApp() {
  const { address } = useConnection();
  const [input, setInput] = useState("");
  const [checked, setChecked] = useState<string | null>(null);
  const [selectedPlanId, setPlanId] = useState("");
  const store = useQuery({ queryKey: ["example-store"], queryFn: () => loadStoreAction() });
  const plans = store.data?.plans ?? [];
  const planId = selectedPlanId || plans[0]?.planId || "";
  const plan = plans.find((p) => p.planId === planId);
  // Until another wallet is checked by hand, the connected wallet is the visitor.
  const customer = checked ?? address ?? null;

  const access = useQuery({
    queryKey: ["demo-access", customer, planId],
    queryFn: () => checkAccessAction(customer!, planId),
    enabled: Boolean(customer && planId),
    refetchInterval: 5_000,
  });

  const buy = useMutation({
    mutationFn: () => startCheckoutAction(customer!, planId),
    onSuccess: ({ checkoutUrl }) => {
      window.location.href = checkoutUrl;
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not start checkout"),
  });

  const check = (value: string) => {
    if (!isAddress(value)) {
      toast.error("Enter a valid 0x wallet address");
      return;
    }
    setInput(value);
    setChecked(value);
  };

  const active = access.data?.active ?? false;

  return (
    <div className="min-h-dvh bg-muted">
      <header className="border-b border-border bg-bg">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <span className="font-display text-lg font-bold text-fg">{store.data?.merchantName ?? "Example SaaS"}</span>
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">example app</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/dashboard" className="hidden text-sm text-fg-muted hover:text-fg sm:block">
              Merchant dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <section className="rounded-3xl border border-border bg-bg p-5 sm:p-6">
          <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Who is visiting?</h1>
          <p className="mt-1 text-sm text-fg-muted">
            This page plays the merchant&apos;s backend. It asks Sintingale one question: does this wallet hold a live entitlement for the
            plan? Plans come from the merchant&apos;s catalogue on Arkiv.
          </p>
          <form
            className="mt-5 grid gap-4 md:grid-cols-[1fr_260px_auto] md:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              check(input.trim());
            }}
          >
            <Field label="Customer wallet" htmlFor="demo-customer">
              <Input
                id="demo-customer"
                className="font-mono"
                placeholder={address ?? "0x…"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoComplete="off"
              />
            </Field>
            <Field label="Plan" htmlFor="demo-plan">
              <Select id="demo-plan" value={planId} onChange={(e) => setPlanId(e.target.value)} disabled={!plans.length}>
                {plans.length ? (
                  plans.map((p) => (
                    <option key={p.planId} value={p.planId}>
                      {p.name} · {formatUsdt(p.amount)} / {RECURRENCE_LABEL[p.recurrence].toLowerCase()}
                    </option>
                  ))
                ) : (
                  <option value="">{store.isLoading ? "Loading plans…" : "No plans yet"}</option>
                )}
              </Select>
            </Field>
            <Button type="submit" icon={<Search className="size-4" />} loading={access.isFetching && !access.data} disabled={!plans.length}>
              hasAccess()
            </Button>
          </form>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            {address ? (
              <button onClick={() => check(address)} className="rounded-full border border-border px-3 py-1.5 font-mono hover:border-brand hover:text-brand">
                Use my wallet {shortHash(address)}
              </button>
            ) : (
              <>
                <span className="text-fg-muted">Connect the wallet you pay with:</span>
                <ConnectButton size="sm" />
              </>
            )}
            {!store.isLoading && !plans.length ? (
              <span className="text-fg-muted">
                The merchant has no plans yet. Add one in <Link href="/dashboard/products" className="text-brand hover:underline">Products</Link>.
              </span>
            ) : null}
          </div>
        </section>

        {customer && access.data ? (
          <section
            className={cn(
              "flex flex-col gap-3 rounded-3xl border p-5 sm:flex-row sm:items-center sm:justify-between",
              active ? "border-success/30 bg-success-soft" : "border-border bg-bg",
            )}
            aria-live="polite"
          >
            <div className="flex items-center gap-3">
              {active ? <LockOpen className="size-6 text-success" aria-hidden /> : <Lock className="size-6 text-fg-muted" aria-hidden />}
              <div>
                <p className="font-semibold text-fg">{active ? "Access granted" : "No active entitlement"}</p>
                <p className="text-sm text-fg-muted">
                  {active ? (
                    <span className="inline-flex flex-wrap items-center gap-1">
                      Entitlement lapses on its own in <ExpiryCountdown expiresAt={access.data.periodEnd} />
                    </span>
                  ) : (
                    "Pay once and the entitlement appears; when the period ends it simply expires."
                  )}
                </p>
              </div>
            </div>
            {!active ? (
              <Button onClick={() => buy.mutate()} loading={buy.isPending} icon={<ArrowRight className="size-4" />}>
                Buy {plan?.name ?? "plan"} · {plan ? formatUsdt(plan.amount) : ""}
              </Button>
            ) : null}
          </section>
        ) : null}

        <section className="relative overflow-hidden rounded-3xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-fg">Pro analytics</h2>
          <div className={cn("transition-all duration-500", !active && "pointer-events-none select-none blur-md")} aria-hidden={!active}>
            <SampleAnalytics />
          </div>
          {!active ? (
            <div className="absolute inset-0 grid place-items-center bg-bg/40 p-6 text-center">
              <div className="max-w-xs">
                <Lock className="mx-auto size-8 text-brand" aria-hidden />
                <p className="mt-2 font-display text-lg font-semibold text-fg">Locked behind a single query</p>
                <p className="mt-1 text-sm text-fg-muted">Check a wallet above to see Sintingale decide.</p>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl bg-[#1d1410] p-5 text-[#ffd9cc] sm:p-6">
          <p className="flex items-center gap-2 text-sm font-medium text-white">
            <Code2 className="size-4" aria-hidden /> What the backend runs
          </p>
          <pre className="mt-3 overflow-x-auto font-mono text-xs leading-relaxed">{`const active = await sintingale.hasAccess({
  merchantId: "${publicConfig.merchantId}",
  planId: "${planId}",
  customer: "${customer ?? "0x…"}",
});`}</pre>
          {access.data ? (
            <>
              <p className="mt-4 text-xs text-white/60">Ledger query</p>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs text-white/80">{access.data.query}</pre>
            </>
          ) : null}
        </section>

        <p className="flex items-center justify-center gap-2 pb-4 text-xs text-fg-muted">
          Billing by <Logo className="text-sm" />
        </p>
      </main>
    </div>
  );
}
