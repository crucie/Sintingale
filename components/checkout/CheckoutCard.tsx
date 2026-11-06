"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FlaskConical,
  Hourglass,
  Lock,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useConnection } from "wagmi";
import { ExpiryCountdown } from "@/components/dashboard/ExpiryCountdown";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { LogoMark } from "@/components/ui/Logo";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { NetworkGuard } from "@/components/wallet/NetworkGuard";
import { ApiError, useCheckout, useNow } from "@/lib/client/hooks";
import { onchainEnabled } from "@/lib/config";
import { formatDate, formatUsdt, shortHash } from "@/lib/format";
import { RECURRENCE_LABEL } from "@/lib/schema";
import { explorerTx } from "@/lib/whitechain";
import { usePayment } from "./PayButton";
import { TxStatus } from "./TxStatus";

function Shell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg md:items-center md:justify-center md:bg-muted md:px-4 md:py-10">
      <div className="flex w-full flex-1 flex-col md:max-w-[480px] md:flex-none">
        <div className="flex flex-1 flex-col bg-bg md:rounded-3xl md:border md:border-border md:shadow-xl md:shadow-black/5">
          <div className="flex-1 px-5 pb-6 pt-6 sm:px-7">{children}</div>
          {footer ? (
            <div className="sticky bottom-0 border-t border-border bg-bg/95 px-5 py-4 backdrop-blur pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-7 md:static md:rounded-b-3xl md:bg-transparent">
              {footer}
            </div>
          ) : null}
        </div>
        <p className="flex items-center justify-center gap-1.5 py-4 text-xs text-fg-muted">
          <LogoMark className="size-4 text-brand" /> Powered by{" "}
          <Link href="/" className="font-medium text-fg hover:text-brand">
            Sintingale
          </Link>
        </p>
      </div>
    </div>
  );
}

function StateBlock({ icon, tone, title, children }: { icon: ReactNode; tone: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <div className={`grid size-14 place-items-center rounded-2xl ${tone}`}>{icon}</div>
      <h1 className="mt-4 font-display text-xl font-semibold text-fg">{title}</h1>
      {children ? <div className="mt-2 text-sm text-fg-muted">{children}</div> : null}
    </div>
  );
}

export function CheckoutCard({ invoiceKey }: { invoiceKey: string }) {
  const router = useRouter();
  const checkout = useCheckout(invoiceKey);
  const now = useNow();
  const { isConnected, address } = useConnection();
  const payment = usePayment(checkout.data, invoiceKey);

  if (checkout.isLoading) {
    return (
      <Shell footer={<Skeleton className="h-12 w-full rounded-xl" />}>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-3 h-7 w-48" />
        <Skeleton className="mt-8 h-12 w-40" />
        <Skeleton className="mt-8 h-24 w-full" />
      </Shell>
    );
  }

  if (checkout.error) {
    const expired = checkout.error instanceof ApiError && checkout.error.code === "INVOICE_EXPIRED";
    return (
      <Shell>
        {expired ? (
          <StateBlock icon={<Hourglass className="size-7" />} tone="bg-muted text-fg-muted" title="This invoice has expired.">
            The invoice entity reached its expiry on the ledger and can no longer be paid. Ask the merchant for a new link.
          </StateBlock>
        ) : (
          <StateBlock icon={<AlertCircle className="size-7" />} tone="bg-danger-soft text-danger" title="Couldn't load this invoice">
            <p>{checkout.error.message}</p>
            <Button variant="outline" className="mt-4" onClick={() => checkout.refetch()} icon={<RotateCcw className="size-4" />}>
              Retry
            </Button>
          </StateBlock>
        )}
      </Shell>
    );
  }

  const data = checkout.data!;
  const { invoice, merchant, plan } = data;
  const isExpiredLocally = invoice.status === "pending" && now !== null && invoice.expiresAt !== null && invoice.expiresAt * 1000 <= now;
  const result = payment.result ?? (invoice.status === "paid" && invoice.txHash && invoice.receiptKey
    ? { txHash: invoice.txHash, receiptKey: invoice.receiptKey, simulated: Boolean(invoice.simulated) }
    : null);
  const isPaid = payment.phase === "success" || invoice.status === "paid";
  const lockedCustomer = invoice.customer && invoice.customer.startsWith("0x") ? invoice.customer : null;
  const busy = payment.phase === "awaiting-wallet" || payment.phase === "confirming";

  const header = (
    <>
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-brand font-display text-lg font-bold text-brand-fg">
          {merchant.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-fg">{merchant.name}</p>
          <p className="font-mono text-xs text-fg-muted">{invoice.invoiceId}</p>
        </div>
      </div>
      <div className="mt-6">
        {plan && plan.name !== invoice.description ? <p className="text-sm text-fg-muted">{plan.name}</p> : null}
        <h1 className="mt-0.5 font-display text-lg font-semibold text-fg">{invoice.description}</h1>
        <p className="mt-4 font-display text-5xl font-bold tracking-tight tabular-nums text-fg">
          {formatUsdt(invoice.amount, { symbol: false })}
          <span className="ml-2 text-lg font-medium text-fg-muted">USDT</span>
        </p>
        {plan ? <p className="mt-1 text-sm text-fg-muted">{RECURRENCE_LABEL[plan.recurrence]} · access until the period ends</p> : null}
      </div>
    </>
  );

  if (isPaid && result) {
    return (
      <Shell
        footer={
          <div className="flex flex-col gap-2">
            <ButtonLink href={`/receipt/${result.receiptKey}`} className="w-full" size="lg" icon={<Receipt className="size-4" />}>
              View receipt
            </ButtonLink>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
            >
              Return to {merchant.name}
            </Button>
          </div>
        }
      >
        {header}
        <div className="mt-6 rounded-2xl border border-success/30 bg-success-soft p-4">
          <p className="flex items-center gap-2 font-medium text-success">
            <CheckCircle2 className="size-5" aria-hidden /> Payment complete
          </p>
          <p className="mt-1 text-sm text-fg-muted">
            {invoice.paidAt ? `Paid ${formatDate(invoice.paidAt)}. ` : ""}Your receipt and access entitlement are on the ledger.
          </p>
        </div>
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-fg-muted">Transaction</dt>
            <dd className="flex items-center gap-1 font-mono text-xs">
              {shortHash(result.txHash, 10, 8)}
              <CopyButton value={result.txHash} label="Copy tx hash" toastMessage="Tx hash copied" />
            </dd>
          </div>
          {result.simulated ? (
            <p className="flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-xs text-fg-muted">
              <FlaskConical className="size-3.5 shrink-0" aria-hidden /> Simulated payment: no funds moved on Whitechain.
            </p>
          ) : (
            <a
              href={explorerTx(result.txHash)}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border text-sm font-medium text-fg hover:bg-muted"
            >
              View on Whitechain explorer <ExternalLink className="size-4" aria-hidden />
            </a>
          )}
        </dl>
        {payment.phase === "success" ? (
          <div className="mt-6">
            <TxStatus steps={payment.steps} />
          </div>
        ) : null}
      </Shell>
    );
  }

  if (isExpiredLocally) {
    return (
      <Shell>
        {header}
        <StateBlock icon={<Hourglass className="size-7" />} tone="bg-muted text-fg-muted" title="This invoice has expired.">
          It can no longer be paid. Ask {merchant.name} for a new checkout link.
        </StateBlock>
      </Shell>
    );
  }

  const needsWallet = onchainEnabled && !isConnected;

  const footer =
    payment.phase === "error" ? (
      <Button size="lg" className="w-full" onClick={payment.reset} icon={<RotateCcw className="size-4" />}>
        Try again
      </Button>
    ) : needsWallet ? (
      <ConnectButton size="lg" className="w-full" />
    ) : (
      <NetworkGuard>
        <Button
          size="lg"
          className="w-full"
          loading={busy}
          onClick={payment.pay}
          icon={onchainEnabled ? <Wallet className="size-4" /> : <FlaskConical className="size-4" />}
        >
          {busy
            ? payment.phase === "awaiting-wallet"
              ? "Confirm in wallet…"
              : "Confirming…"
            : `Pay ${formatUsdt(invoice.amount)}${onchainEnabled ? "" : " (simulated)"}`}
        </Button>
      </NetworkGuard>
    );

  return (
    <Shell footer={footer}>
      {header}

      <div className="mt-6 space-y-3 rounded-2xl bg-muted/70 p-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-fg-muted">
            <Clock className="size-4" aria-hidden /> Expires in
          </span>
          <ExpiryCountdown expiresAt={invoice.expiresAt} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-fg-muted">Network</span>
          <span className="text-fg">Whitechain · USDT</span>
        </div>
        {lockedCustomer ? (
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-fg-muted">
              <Lock className="size-3.5" aria-hidden /> Billed to
            </span>
            <span className="font-mono text-xs text-fg">{shortHash(lockedCustomer, 8, 6)}</span>
          </div>
        ) : null}
      </div>

      {lockedCustomer && address && address.toLowerCase() !== lockedCustomer ? (
        <p className="mt-3 rounded-xl border border-warning/40 bg-warning-soft px-3 py-2 text-xs text-fg">
          You are connected as {shortHash(address)}. Access will be granted to the billed address {shortHash(lockedCustomer)}.
        </p>
      ) : null}

      {!onchainEnabled ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-border px-3 py-2 text-xs text-fg-muted">
          <FlaskConical className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
          Demo mode: contracts are not configured, so payment is simulated end to end. The receipt and entitlement are still written to the ledger.
        </p>
      ) : null}

      {payment.phase !== "ready" ? (
        <div className="mt-6">
          <TxStatus steps={payment.steps} />
        </div>
      ) : null}

      {payment.error ? (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {payment.error}
        </p>
      ) : null}

      <p className="mt-6 flex items-center gap-1.5 text-xs text-fg-muted">
        <ShieldCheck className="size-4 shrink-0 text-success" aria-hidden />
        Non-custodial: funds go straight to {shortHash(merchant.payout || "0x")} in the same transaction.
      </p>
    </Shell>
  );
}
