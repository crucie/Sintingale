"use client";

import { CheckCircle2, ExternalLink, FilePlus2, Plus } from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CheckoutPreview } from "@/components/checkout/CheckoutPreview";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCreateInvoice, useMerchant, usePlans } from "@/lib/client/hooks";
import { publicConfig } from "@/lib/config";
import { formatDate, formatUsdt, toBaseUnits } from "@/lib/format";
import { RECURRENCE_LABEL } from "@/lib/schema";

const DUE_OPTIONS = [
  { hours: 2 / 60, label: "2 minutes (expiry demo)" },
  { hours: 1, label: "1 hour" },
  { hours: 24, label: "24 hours" },
  { hours: 72, label: "3 days" },
  { hours: 168, label: "7 days" },
];

export function CreateInvoiceForm({ initialPlanId }: { initialPlanId?: string }) {
  const plans = usePlans();
  const merchant = useMerchant();
  const create = useCreateInvoice();

  const [planId, setPlanId] = useState(initialPlanId ?? "");
  const [amount, setAmount] = useState("");
  const [customer, setCustomer] = useState("");
  const [description, setDescription] = useState("");
  const [dueInHours, setDueInHours] = useState(24);
  const [result, setResult] = useState<{ checkoutUrl: string; invoiceId: string; expiresAt: number } | null>(null);

  const selected = plans.data?.find((p) => p.planId === (planId || plans.data?.[0]?.planId));
  const previewAmount = amount && Number(amount) > 0 ? toBaseUnits(amount) : (selected?.amount ?? 0);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    try {
      const res = await create.mutateAsync({
        merchantId: publicConfig.merchantId,
        planId: selected.planId,
        amount: amount || undefined,
        customer: customer.trim() || undefined,
        description: description.trim() || undefined,
        dueInHours,
      });
      setResult(res);
      toast.success(`Invoice ${res.invoiceId} written to the ledger`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create invoice");
    }
  }

  if (plans.isLoading) return <Skeleton className="h-96 w-full" />;
  if (!plans.data?.length) {
    return (
      <Card>
        <EmptyState
          icon={FilePlus2}
          title="Create a product first"
          description="Invoices are issued against a product or price."
          action={
            <ButtonLink href="/dashboard/products" icon={<Plus className="size-4" aria-hidden />}>
              New product
            </ButtonLink>
          }
        />
      </Card>
    );
  }

  if (result) {
    return (
      <Card className="mx-auto max-w-xl p-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
        <h2 className="mt-3 font-display text-xl font-semibold">Invoice {result.invoiceId} is live</h2>
        <p className="mt-1 text-sm text-fg-muted">
          The invoice entity expires on Arkiv at {formatDate(result.expiresAt)} unless it is paid.
        </p>
        <div className="mx-auto mt-6 w-fit rounded-2xl border border-border bg-white p-4">
          <QRCodeSVG value={result.checkoutUrl} size={168} fgColor="#1d1410" />
        </div>
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2 text-left">
          <p className="min-w-0 flex-1 truncate font-mono text-xs text-fg">{result.checkoutUrl}</p>
          <CopyButton value={result.checkoutUrl} label="Copy link" toastMessage="Checkout link copied" showLabel />
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <ButtonLink href={result.checkoutUrl} target="_blank" icon={<ExternalLink className="size-4" aria-hidden />}>
            Open checkout
          </ButtonLink>
          <Button variant="outline" onClick={() => setResult(null)}>
            Create another
          </Button>
          <ButtonLink href="/dashboard/invoices" variant="ghost">
            Back to invoices
          </ButtonLink>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 pb-24 md:grid-cols-[1fr_minmax(280px,380px)] md:pb-0">
      <Card className="p-5">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Product" htmlFor="plan" className="md:col-span-2">
            <Select id="plan" value={selected?.planId ?? ""} onChange={(e) => setPlanId(e.target.value)}>
              {plans.data.map((p) => (
                <option key={p.planId} value={p.planId}>
                  {p.name} · {formatUsdt(p.amount)} · {RECURRENCE_LABEL[p.recurrence]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Custom amount" htmlFor="amount" hint="Leave empty to use the product price.">
            <Input
              id="amount"
              inputMode="decimal"
              placeholder={selected ? formatUsdt(selected.amount, { symbol: false }) : "10.00"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="Due in" htmlFor="due" hint="The invoice expires shortly after it is due.">
            <Select id="due" value={dueInHours} onChange={(e) => setDueInHours(Number(e.target.value))}>
              {DUE_OPTIONS.map((o) => (
                <option key={o.label} value={o.hours}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Customer (optional)"
            htmlFor="customer"
            hint="Wallet address or email. Leave empty to let anyone pay."
            className="md:col-span-2"
          >
            <Input
              id="customer"
              placeholder="0x… or name@company.com"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              autoComplete="off"
            />
          </Field>
          <Field label="Description (optional)" htmlFor="description" className="md:col-span-2">
            <Textarea
              id="description"
              placeholder={selected?.name}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
            />
          </Field>
        </div>
        <div className="fixed inset-x-0 bottom-16 z-10 border-t border-border bg-bg/95 p-4 backdrop-blur md:static md:mt-6 md:border-0 md:bg-transparent md:p-0">
          <Button type="submit" className="w-full md:w-auto" loading={create.isPending} icon={<FilePlus2 className="size-4" />}>
            Create invoice
          </Button>
        </div>
      </Card>
      <div className="hidden md:block">
        <div className="sticky top-24">
          <CheckoutPreview
            merchantName={merchant.data?.name ?? ""}
            product={selected?.name ?? ""}
            description={description || selected?.description}
            amount={previewAmount}
            cadence={selected ? RECURRENCE_LABEL[selected.recurrence] : undefined}
          />
          <p className="mt-3 text-xs text-fg-muted">
            Need a new price?{" "}
            <Link href="/dashboard/products" className="text-brand underline-offset-4 hover:underline">
              Create a product
            </Link>
          </p>
        </div>
      </div>
    </form>
  );
}
