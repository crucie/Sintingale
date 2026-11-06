import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/format";
import type { InvoiceStatus } from "@/lib/types";

const styles: Record<InvoiceStatus, { label: string; className: string; Icon: typeof Clock }> = {
  paid: { label: "Paid", className: "bg-success-soft text-success", Icon: CheckCircle2 },
  pending: { label: "Pending", className: "bg-warning-soft text-warning", Icon: Clock },
  expired: { label: "Expired", className: "bg-muted text-fg-muted", Icon: XCircle },
};

export function StatusBadge({ status, className }: { status: InvoiceStatus; className?: string }) {
  const { label, className: tone, Icon } = styles[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        tone,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}
