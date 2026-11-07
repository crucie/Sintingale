"use client";

import { PackagePlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CheckoutPreview } from "@/components/checkout/CheckoutPreview";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useCreatePlan, useMerchant } from "@/lib/client/hooks";
import { publicConfig } from "@/lib/config";
import { toBaseUnits } from "@/lib/format";
import { RECURRENCE_LABEL, RECURRENCES, type Recurrence } from "@/lib/schema";

const slugify = (v: string) =>
  v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

export function PlanForm() {
  const merchant = useMerchant();
  const create = useCreatePlan();
  const [name, setName] = useState("");
  const [planId, setPlanId] = useState("");
  const [planIdTouched, setPlanIdTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("monthly");

  const effectivePlanId = planIdTouched ? planId : slugify(name);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const { plan } = await create.mutateAsync({
        merchantId: publicConfig.merchantId,
        planId: effectivePlanId,
        name,
        description: description || undefined,
        amount,
        recurrence,
      });
      toast.success(`${plan.name} saved. Create a checkout link for it from Invoices.`);
      setName("");
      setPlanId("");
      setPlanIdTouched(false);
      setDescription("");
      setAmount("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create product");
    }
  }

  return (
    <Card>
      <CardHeader title="New product" description="Set a name and price. Customers see exactly this at checkout." />
      <form onSubmit={onSubmit} className="grid gap-6 p-5 md:grid-cols-[1fr_minmax(260px,340px)]">
        <div className="grid content-start gap-5 sm:grid-cols-2">
          <Field label="Name" htmlFor="plan-name" className="sm:col-span-2">
            <Input
              id="plan-name"
              required
              minLength={2}
              placeholder="Pro Plan"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Price (USDT)" htmlFor="plan-amount">
            <Input
              id="plan-amount"
              required
              inputMode="decimal"
              placeholder="10.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="Billing" htmlFor="plan-recurrence" hint="Recurring plans grant access for one period per payment.">
            <Select
              id="plan-recurrence"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as Recurrence)}
            >
              {RECURRENCES.map((r) => (
                <option key={r} value={r}>
                  {RECURRENCE_LABEL[r]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Description" htmlFor="plan-description" className="sm:col-span-2">
            <Textarea
              id="plan-description"
              placeholder="What the customer gets"
              value={description}
              maxLength={200}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <details className="group sm:col-span-2">
            <summary className="cursor-pointer text-sm text-fg-muted hover:text-fg">
              Developer setting: plan ID <span className="font-mono text-xs text-fg">{effectivePlanId || "…"}</span>
            </summary>
            <Field label="Plan ID" htmlFor="plan-id" hint="Made from the name. Your backend checks access with it, e.g. hasAccess({ planId })." className="mt-3">
              <Input
                id="plan-id"
                required
                placeholder="pro"
                className="font-mono"
                value={effectivePlanId}
                onChange={(e) => {
                  setPlanIdTouched(true);
                  setPlanId(slugify(e.target.value));
                }}
              />
            </Field>
          </details>
          <div className="sm:col-span-2">
            <Button type="submit" loading={create.isPending} className="w-full sm:w-auto" icon={<PackagePlus className="size-4" />}>
              Save product
            </Button>
          </div>
        </div>
        <div className="hidden md:block">
          <CheckoutPreview
            merchantName={merchant.data?.name ?? ""}
            product={name}
            description={description}
            amount={amount && Number(amount) > 0 ? toBaseUnits(amount) : 0}
            cadence={RECURRENCE_LABEL[recurrence]}
          />
        </div>
      </form>
    </Card>
  );
}
