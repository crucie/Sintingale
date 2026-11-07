import { Bot, FolderKanban } from "lucide-react";
import type { InvoiceRow } from "@/lib/types";

/** Project and agent provenance for an invoice row. Renders nothing for plain invoices. */
export function InvoiceTags({ invoice }: { invoice: InvoiceRow }) {
  if (!invoice.projectId && !invoice.createdBy) return null;
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {invoice.projectId ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-fg-muted">
          <FolderKanban className="size-3" aria-hidden /> {invoice.projectId}
        </span>
      ) : null}
      {invoice.createdBy ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] text-brand" title={`Created by agent ${invoice.createdBy}`}>
          <Bot className="size-3" aria-hidden /> {invoice.createdBy}
        </span>
      ) : null}
    </span>
  );
}
