"use client";

import { FileText, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn, formatDate, formatUsdt, shortHash } from "@/lib/format";
import type { InvoiceRow, InvoiceStatus } from "@/lib/types";
import { ExpiryCountdown } from "./ExpiryCountdown";
import { InvoiceActions } from "./InvoiceActions";
import { InvoiceCard } from "./InvoiceCard";
import { StatusBadge } from "./StatusBadge";

type Filter = "all" | InvoiceStatus;
const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "paid", label: "Paid" },
  { id: "pending", label: "Pending" },
  { id: "expired", label: "Expired" },
];

export function InvoiceTable({
  invoices,
  loading,
  error,
  onRetry,
  compact,
}: {
  invoices: InvoiceRow[] | undefined;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  compact?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, paid: 0, pending: 0, expired: 0 };
    for (const i of invoices ?? []) {
      c.all++;
      c[i.status]++;
    }
    return c;
  }, [invoices]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (invoices ?? []).filter(
      (i) =>
        (filter === "all" || i.status === filter) &&
        (!q || [i.invoiceId, i.customer, i.description, i.txHash ?? ""].some((v) => v.toLowerCase().includes(q))),
    );
  }, [invoices, filter, search]);

  const visible = compact ? rows.slice(0, 6) : rows;

  return (
    <div>
      {!compact ? (
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1" role="tablist" aria-label="Filter invoices">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm transition-colors",
                  filter === f.id
                    ? "border-brand bg-brand text-brand-fg"
                    : "border-border bg-bg text-fg-muted hover:text-fg",
                )}
              >
                {f.label}
                <span className={cn("text-xs tabular-nums", filter === f.id ? "text-white/80" : "text-fg-muted")}>
                  {counts[f.id]}
                </span>
              </button>
            ))}
          </div>
          <label className="relative block md:w-72">
            <span className="sr-only">Search invoices</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search id, customer, tx…"
              className="h-10 w-full rounded-xl border border-border bg-bg pl-9 pr-3 text-sm placeholder:text-fg-muted/70 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand-soft"
            />
          </label>
        </div>
      ) : null}

      {error ? (
        <ErrorState message={error.message} onRetry={onRetry} />
      ) : loading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={invoices?.length ? "No invoices match" : "No invoices yet"}
          description={
            invoices?.length
              ? "Try a different filter or search."
              : "Create an invoice to get a shareable checkout link."
          }
          action={
            <ButtonLink href="/dashboard/invoices/new" icon={<Plus className="size-4" aria-hidden />}>
              Create invoice
            </ButtonLink>
          }
        />
      ) : (
        <>
          <ul className="space-y-3 p-4 md:hidden">
            {visible.map((invoice) => (
              <InvoiceCard key={invoice.invoiceId} invoice={invoice} />
            ))}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                  <th className="px-5 py-3 font-medium">Invoice</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Expires / Paid</th>
                  <th className="px-5 py-3 font-medium">Tx</th>
                  <th className="w-12 px-3 py-3" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {visible.map((invoice) => (
                  <tr key={invoice.invoiceId} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-5 py-3">
                      <p className="font-mono text-xs text-fg">{invoice.invoiceId}</p>
                      <p className="text-xs text-fg-muted">{invoice.description}</p>
                    </td>
                    <td className="max-w-48 truncate px-5 py-3 text-fg" title={invoice.customer}>
                      {invoice.customer ? shortHash(invoice.customer, 8, 6) : <span className="text-fg-muted">Any</span>}
                    </td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums text-fg">{formatUsdt(invoice.amount)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="px-5 py-3 text-xs">
                      {invoice.status === "pending" ? (
                        <ExpiryCountdown expiresAt={invoice.expiresAt} />
                      ) : invoice.paidAt ? (
                        <span className="text-fg-muted">{formatDate(invoice.paidAt)}</span>
                      ) : (
                        <span className="text-fg-muted">{invoice.expiresAt ? formatDate(invoice.expiresAt) : "—"}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {invoice.txHash ? (
                        <span className="inline-flex items-center gap-0.5">
                          {invoice.receiptKey ? (
                            <Link
                              href={`/receipt/${invoice.receiptKey}`}
                              className="font-mono text-xs text-brand underline-offset-4 hover:underline"
                            >
                              {shortHash(invoice.txHash)}
                            </Link>
                          ) : (
                            <span className="font-mono text-xs">{shortHash(invoice.txHash)}</span>
                          )}
                          <CopyButton value={invoice.txHash} label="Copy tx hash" toastMessage="Tx hash copied" />
                        </span>
                      ) : (
                        <span className="text-fg-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <InvoiceActions invoice={invoice} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
