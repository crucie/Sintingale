import { ShieldCheck, Wallet } from "lucide-react";
import { formatUsdt } from "@/lib/format";

export function CheckoutPreview({
  merchantName,
  product,
  description,
  amount,
  cadence,
}: {
  merchantName: string;
  product: string;
  description?: string;
  amount: number;
  cadence?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/60 p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-fg-muted">Live checkout preview</p>
      <div className="rounded-2xl border border-border bg-bg p-5 shadow-sm">
        <p className="text-sm text-fg-muted">{merchantName || "Your company"}</p>
        <p className="mt-1 font-display text-lg font-semibold text-fg">{product || "Product name"}</p>
        {description ? <p className="mt-0.5 text-sm text-fg-muted">{description}</p> : null}
        <p className="mt-5 font-display text-4xl font-bold tracking-tight tabular-nums text-fg">
          {formatUsdt(amount, { symbol: false })}
          <span className="ml-1.5 text-base font-medium text-fg-muted">USDT</span>
        </p>
        {cadence ? <p className="mt-1 text-sm text-fg-muted">{cadence}</p> : null}
        <div className="mt-5 flex h-11 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-medium text-brand-fg">
          <Wallet className="size-4" aria-hidden /> Connect wallet to pay
        </div>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-fg-muted">
          <ShieldCheck className="size-3.5" aria-hidden /> Settled on Whitechain · Receipt on Arkiv
        </p>
      </div>
    </div>
  );
}
