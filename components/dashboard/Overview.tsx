"use client";

import { ArrowUpRight, BadgeCheck, CircleDollarSign, Clock, FilePlus2, FlaskConical, KeyRound, PackagePlus, Receipt } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/AppShell";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useInvoices, useMerchant, useStats } from "@/lib/client/hooks";
import { formatUsdt } from "@/lib/format";
import { InvoiceTable } from "./InvoiceTable";
import { RevenueChart } from "./RevenueChart";
import { StatCard } from "./StatCard";

export function Overview() {
  const stats = useStats();
  const invoices = useInvoices();
  const merchant = useMerchant();
  const s = stats.data?.stats;

  return (
    <>
      <PageHeader
        title={merchant.data ? `Hi, ${merchant.data.name}` : "Overview"}
        description="Every number here is a live query against the billing ledger. No private database."
        action={
          <div className="flex gap-2">
            <ButtonLink href="/dashboard/products" variant="outline" icon={<PackagePlus className="size-4" aria-hidden />}>
              <span className="hidden sm:inline">New product</span>
              <span className="sm:hidden">Product</span>
            </ButtonLink>
            <ButtonLink href="/dashboard/invoices/new" icon={<FilePlus2 className="size-4" aria-hidden />}>
              <span className="hidden sm:inline">Create invoice</span>
              <span className="sm:hidden">Invoice</span>
            </ButtonLink>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CircleDollarSign}
          label="Revenue, 30 days"
          value={s ? formatUsdt(s.revenue30d) : "—"}
          hint="Sum of relayer-signed receipts"
          loading={stats.isLoading}
        />
        <StatCard
          icon={Receipt}
          label="Paid invoices, 30 days"
          value={s?.paidCount30d ?? "—"}
          hint='type="receipt" && paidAt > now-30d'
          loading={stats.isLoading}
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={s?.pendingCount ?? "—"}
          hint={s ? `${formatUsdt(s.pendingVolume)} awaiting payment` : undefined}
          loading={stats.isLoading}
        />
        <StatCard
          icon={BadgeCheck}
          label="Active entitlements"
          value={s?.activeEntitlements ?? "—"}
          hint="Customers with access right now"
          loading={stats.isLoading}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Revenue" description="Last 14 days, USDT" />
          {s ? <RevenueChart series={s.series} /> : <Skeleton className="m-5 h-40" />}
        </Card>
        <Card>
          <CardHeader title="Next steps" />
          <ul className="divide-y divide-border">
            {[
              { href: "/dashboard/invoices/new", icon: FilePlus2, title: "Share a checkout link", body: "Create an invoice and send the link or QR." },
              { href: "/demo", icon: FlaskConical, title: "Try the paywalled demo", body: "See hasAccess() unlock a page after payment." },
              { href: "/dashboard/settings", icon: KeyRound, title: "Grab your API key", body: "Call /api/access from your backend." },
            ].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="group flex items-start gap-3 px-5 py-4 hover:bg-muted/60">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                    <item.icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-fg">{item.title}</span>
                    <span className="block text-xs text-fg-muted">{item.body}</span>
                  </span>
                  <ArrowUpRight className="size-4 text-fg-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Recent activity"
          description="Polled every few seconds from the ledger"
          action={
            <Link href="/dashboard/invoices" className="text-sm font-medium text-brand underline-offset-4 hover:underline">
              View all
            </Link>
          }
        />
        <InvoiceTable
          invoices={invoices.data}
          loading={invoices.isLoading}
          error={invoices.error}
          onRetry={() => invoices.refetch()}
          compact
        />
      </Card>
    </>
  );
}
