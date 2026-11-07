"use client";

import { ExternalLink, Link2, MoreHorizontal, Receipt } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { InvoiceRow } from "@/lib/types";
import { explorerTx } from "@/lib/whitechain";

export function InvoiceActions({ invoice }: { invoice: InvoiceRow }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const item = "flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-fg hover:bg-muted";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`Actions for ${invoice.invoiceId}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid size-11 place-items-center rounded-xl text-fg-muted hover:bg-muted hover:text-fg"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-border bg-bg p-1 shadow-xl">
          {invoice.key && invoice.status !== "expired" ? (
            <button
              className={item}
              onClick={async () => {
                await navigator.clipboard.writeText(`${window.location.origin}/pay/${invoice.key}`);
                toast.success("Checkout link copied");
                setOpen(false);
              }}
            >
              <Link2 className="size-4" aria-hidden /> Copy checkout link
            </button>
          ) : null}
          {invoice.key && invoice.status === "pending" ? (
            <Link href={`/pay/${invoice.key}`} target="_blank" className={item}>
              <ExternalLink className="size-4" aria-hidden /> Open checkout
            </Link>
          ) : null}
          {invoice.receiptKey ? (
            <Link href={`/receipt/${invoice.receiptKey}`} className={item}>
              <Receipt className="size-4" aria-hidden /> View receipt
            </Link>
          ) : null}
          {invoice.txHash ? (
            <a href={explorerTx(invoice.txHash)} target="_blank" rel="noreferrer" className={item}>
              <ExternalLink className="size-4" aria-hidden /> View on explorer
            </a>
          ) : null}
          {invoice.status === "expired" ? (
            <p className="px-3 py-2 text-xs text-fg-muted">This invoice expired on Arkiv and can no longer be paid.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
