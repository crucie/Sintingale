"use client";

import { AlertTriangle, CheckCircle2, CircleSlash, ExternalLink, Printer, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { ErrorState } from "@/components/ui/EmptyState";
import { Logo } from "@/components/ui/Logo";
import { Skeleton } from "@/components/ui/Skeleton";
import { useVerify } from "@/lib/client/hooks";
import { cn, formatDate, formatUsdt, shortHash } from "@/lib/format";
import type { CheckStatus, VerifyResult } from "@/lib/types";
import { explorerTx } from "@/lib/whitechain";

const checkIcon: Record<CheckStatus, React.ReactNode> = {
  pass: <CheckCircle2 className="size-5 text-success" aria-hidden />,
  fail: <XCircle className="size-5 text-danger" aria-hidden />,
  skip: <CircleSlash className="size-5 text-fg-muted" aria-hidden />,
};

const verdicts: Record<VerifyResult["verdict"], { title: string; body: string; tone: string; icon: React.ReactNode }> = {
  verified: {
    title: "Verified",
    body: "The Arkiv receipt matches a Paid event on Whitechain.",
    tone: "border-success/30 bg-success-soft text-success",
    icon: <ShieldCheck className="size-6" aria-hidden />,
  },
  mismatch: {
    title: "Verification failed",
    body: "At least one check did not pass. Do not treat this receipt as proof of payment.",
    tone: "border-danger/30 bg-danger-soft text-danger",
    icon: <AlertTriangle className="size-6" aria-hidden />,
  },
};

function Detail({ label, value, copy, mono }: { label: string; value: string; copy?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-sm text-fg-muted">{label}</dt>
      <dd className={cn("flex min-w-0 items-center gap-1 text-right text-sm text-fg", mono && "font-mono text-xs")}>
        <span className="truncate" title={value}>
          {mono ? shortHash(value, 10, 8) : value}
        </span>
        {copy ? <CopyButton value={value} label={`Copy ${label}`} toastMessage={`${label} copied`} /> : null}
      </dd>
    </div>
  );
}

export function VerifyPanel({ receiptKey }: { receiptKey: string }) {
  const verify = useVerify(receiptKey);

  return (
    <div className="min-h-dvh bg-muted px-4 py-8 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <Link href="/" aria-label="Sintingale home">
            <Logo />
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => verify.refetch()} loading={verify.isFetching} icon={<RefreshCw className="size-4" />}>
              Re-verify
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} icon={<Printer className="size-4" />}>
              Print
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-bg shadow-xl shadow-black/5">
          {verify.isLoading ? (
            <div className="space-y-4 p-6">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-12 w-56" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : verify.error ? (
            <ErrorState message={verify.error.message} onRetry={() => verify.refetch()} />
          ) : verify.data ? (
            <Body data={verify.data} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Body({ data }: { data: VerifyResult }) {
  const { receipt, checks, verdict } = data;
  const v = verdicts[verdict];
  return (
    <>
      <div className="border-b border-border p-6">
        <p className="text-sm text-fg-muted">Receipt from {receipt.merchantName}</p>
        <p className="mt-2 font-display text-4xl font-bold tracking-tight tabular-nums text-fg">{formatUsdt(receipt.amount)}</p>
        <p className="mt-1 text-sm text-fg-muted">
          {receipt.description} · Paid {formatDate(receipt.paidAt)}
        </p>
      </div>

      <div className="p-6">
        <div className={cn("flex items-start gap-3 rounded-2xl border p-4", v.tone)}>
          {v.icon}
          <div>
            <p className="font-semibold">{v.title}</p>
            <p className="text-sm text-fg-muted">{v.body}</p>
          </div>
        </div>

        <h2 className="mt-6 text-xs font-medium uppercase tracking-wide text-fg-muted">Checks: Arkiv vs. Whitechain</h2>
        <ul className="mt-3 space-y-3">
          {checks.map((c) => (
            <li key={c.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
              {checkIcon[c.status]}
              <div className="min-w-0">
                <p className="text-sm font-medium text-fg">
                  {c.label}
                  <span className="sr-only">: {c.status}</span>
                </p>
                <p className="break-all text-xs text-fg-muted">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>

        <h2 className="mt-6 text-xs font-medium uppercase tracking-wide text-fg-muted">Details</h2>
        <dl className="mt-1 divide-y divide-border">
          <Detail label="Invoice" value={receipt.invoiceId} />
          <Detail label="Plan" value={receipt.planId} />
          <Detail label="Customer" value={receipt.customer} mono copy />
          <Detail label="Payer" value={receipt.payer} mono copy />
          <Detail label="Tx hash" value={receipt.txHash} mono copy />
          <Detail label="Receipt entity" value={receipt.key} mono copy />
          <Detail label="Written by" value={receipt.creator} mono copy />
        </dl>

        {receipt.txHash ? (
          <a
            href={explorerTx(receipt.txHash)}
            target="_blank"
            rel="noreferrer"
            className="mt-5 flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border text-sm font-medium text-fg hover:bg-muted print:hidden"
          >
            Open transaction on Whitechain explorer <ExternalLink className="size-4" aria-hidden />
          </a>
        ) : null}
      </div>
    </>
  );
}
