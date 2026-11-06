import { formatUsdt, shortHash } from "@/lib/format";
import type { InvoiceRow } from "@/lib/types";
import { ExpiryCountdown } from "./ExpiryCountdown";
import { InvoiceActions } from "./InvoiceActions";
import { StatusBadge } from "./StatusBadge";

export function InvoiceCard({ invoice }: { invoice: InvoiceRow }) {
  return (
    <li className="rounded-2xl border border-border bg-bg p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold tabular-nums text-fg">{formatUsdt(invoice.amount)}</p>
          <p className="text-sm text-fg-muted">{invoice.description}</p>
        </div>
        <StatusBadge status={invoice.status} />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3 text-sm">
        <div className="min-w-0 space-y-1">
          <p className="truncate font-mono text-xs text-fg-muted">{invoice.invoiceId}</p>
          <p className="truncate text-fg">{invoice.customer ? shortHash(invoice.customer, 8, 6) : "Any customer"}</p>
          {invoice.status === "pending" ? <ExpiryCountdown expiresAt={invoice.expiresAt} className="text-xs" /> : null}
        </div>
        <InvoiceActions invoice={invoice} />
      </div>
    </li>
  );
}
