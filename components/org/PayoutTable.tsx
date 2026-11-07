import { ExternalLink, FlaskConical, Receipt } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatUsdt, shortHash } from "@/lib/format";
import { formatBps } from "@/lib/splits";
import type { PayoutDTO } from "@/lib/types";
import { explorerTx } from "@/lib/whitechain";

function TxLink({ p }: { p: PayoutDTO }) {
  if (p.simulated) {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-xs text-fg-muted" title="Simulated settlement">
        <FlaskConical className="size-3.5" aria-hidden /> {shortHash(p.txHash)}
      </span>
    );
  }
  return (
    <a href={explorerTx(p.txHash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-brand hover:underline">
      {shortHash(p.txHash)} <ExternalLink className="size-3" aria-hidden />
    </a>
  );
}

const share = (p: PayoutDTO) => (p.shareBps ? formatBps(p.shareBps) : "dust");

export function PayoutTable({ payouts, showProject }: { payouts: PayoutDTO[]; showProject?: boolean }) {
  if (!payouts.length) {
    return <EmptyState icon={Receipt} title="No payouts yet" description="When a customer pays a project invoice, each share shows up here." />;
  }
  return (
    <>
      <ul className="space-y-3 p-4 md:hidden">
        {payouts.map((p) => (
          <li key={p.key} className="rounded-2xl border border-border bg-bg p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-fg">{p.subname}</p>
                <p className="text-xs text-fg-muted">
                  {formatDate(p.paidAt)} · {showProject ? `${p.projectId} · ` : ""}
                  {p.invoiceId}
                </p>
              </div>
              <p className="font-display font-semibold tabular-nums text-fg">{formatUsdt(p.amount)}</p>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-fg-muted">
              <span>Share {share(p)} · v{p.version}</span>
              <TxLink p={p} />
            </div>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Invoice</th>
              <th className="px-5 py-3 font-medium">Member</th>
              <th className="px-5 py-3 text-right font-medium">Share</th>
              <th className="px-5 py-3 text-right font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Tx</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.key} className="border-b border-border last:border-0">
                <td className="px-5 py-3 text-xs text-fg-muted">{formatDate(p.paidAt)}</td>
                <td className="px-5 py-3 font-mono text-xs text-fg">
                  {showProject ? <span className="mr-1 font-sans text-fg-muted">{p.projectId}</span> : null}
                  {p.invoiceId}
                </td>
                <td className="max-w-56 truncate px-5 py-3 text-fg" title={p.account}>
                  {p.subname}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-fg-muted">
                  {share(p)} <span className="text-xs">v{p.version}</span>
                </td>
                <td className="px-5 py-3 text-right font-medium tabular-nums text-fg">{formatUsdt(p.amount)}</td>
                <td className="px-5 py-3">
                  <TxLink p={p} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
