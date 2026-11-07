"use client";

import { AlertTriangle, ExternalLink, FilePlus2, PieChart, RefreshCw } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { InvoiceTable } from "@/components/dashboard/InvoiceTable";
import { PageHeader } from "@/components/layout/AppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCreateInvoice, useInvoices } from "@/lib/client/hooks";
import { usePayouts, useProject, useResync } from "@/lib/client/org";
import { publicConfig } from "@/lib/config";
import { shortHash } from "@/lib/format";
import { formatBps } from "@/lib/splits";
import type { OrgDTO, ProjectDTO } from "@/lib/types";
import { explorerAddress } from "@/lib/whitechain";
import { OrgGate } from "./OrgGate";
import { PayoutTable } from "./PayoutTable";

function ProjectInvoiceForm({ org, project }: { org: OrgDTO; project: ProjectDTO }) {
  const create = useCreateInvoice();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [due, setDue] = useState(24);
  const [link, setLink] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const res = await create.mutateAsync({
        merchantId: publicConfig.merchantId,
        orgId: org.orgId,
        projectId: project.projectId,
        amount,
        description: description || undefined,
        dueInHours: due,
      });
      setLink(res.checkoutUrl);
      toast.success(`Invoice ${res.invoiceId} created for ${project.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create invoice");
    }
  }

  if (!project.shares.length) {
    return <p className="p-5 text-sm text-fg-muted">Set the share table before invoicing this project.</p>;
  }

  return (
    <div className="p-5">
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-[140px_1fr_160px_auto] md:items-end">
        <Field label="Amount (USDT)" htmlFor="pi-amount">
          <Input id="pi-amount" required inputMode="decimal" placeholder="10.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Description" htmlFor="pi-desc">
          <Input id="pi-desc" placeholder={`${project.name} milestone`} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} />
        </Field>
        <Field label="Due in" htmlFor="pi-due">
          <Select id="pi-due" value={due} onChange={(e) => setDue(Number(e.target.value))}>
            <option value={1}>1 hour</option>
            <option value={24}>24 hours</option>
            <option value={168}>7 days</option>
          </Select>
        </Field>
        <Button type="submit" loading={create.isPending} icon={<FilePlus2 className="size-4" />}>
          Create
        </Button>
      </form>
      {link ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2">
          <p className="min-w-0 flex-1 truncate font-mono text-xs text-fg">{link}</p>
          <CopyButton value={link} label="Copy checkout link" toastMessage="Checkout link copied" showLabel />
          <ButtonLink href={link} target="_blank" size="sm" variant="ghost" icon={<ExternalLink className="size-4" aria-hidden />}>
            Open
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}

function Detail({ org, projectId }: { org: OrgDTO; projectId: string }) {
  const project = useProject(org.orgId, projectId);
  const payouts = usePayouts(org.orgId, projectId);
  const invoices = useInvoices();
  const [checkSync, setCheckSync] = useState(false);
  const resync = useResync(org.orgId, projectId, checkSync);

  if (project.isLoading) return <Skeleton className="h-96 w-full" />;
  const p = project.data;
  if (!p) return <Card className="p-6 text-sm text-fg-muted">Project not found.</Card>;
  const projectInvoices = invoices.data?.filter((i) => i.projectId === p.projectId) ?? [];
  const diffs = resync.data?.diffs ?? [];

  return (
    <>
      <PageHeader
        title={p.name}
        description={p.description || "Revenue is split by contribution on every payment."}
        action={
          <ButtonLink href={`/dashboard/projects/${p.projectId}/shares`} icon={<PieChart className="size-4" aria-hidden />}>
            {p.shares.length ? "Edit shares" : "Set shares"}
          </ButtonLink>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader
            title="Share table"
            description={p.shares.length ? `Version ${p.version}. Changes only apply to later payments.` : "No shares yet."}
            action={
              p.shares.length ? (
                <Button size="sm" variant="outline" loading={resync.isFetching} onClick={() => (checkSync ? resync.refetch() : setCheckSync(true))} icon={<RefreshCw className="size-4" />}>
                  Re-sync addresses
                </Button>
              ) : undefined
            }
          />
          {!p.shares.length ? (
            <EmptyState
              icon={PieChart}
              title="Who contributed?"
              description="Add members and their contribution. Shares are derived from it and always total 100%."
              action={<ButtonLink href={`/dashboard/projects/${p.projectId}/shares`}>Set shares</ButtonLink>}
            />
          ) : (
            <>
              {checkSync && resync.data ? (
                diffs.length ? (
                  <div role="alert" className="mx-5 mt-4 rounded-xl border border-warning/40 bg-warning-soft p-3 text-sm">
                    <p className="flex items-center gap-1.5 font-medium text-fg">
                      <AlertTriangle className="size-4 text-warning" aria-hidden /> {diffs.length} name(s) now resolve elsewhere
                    </p>
                    <p className="mt-1 text-fg-muted">Save the share table again to point the splitter at the current addresses.</p>
                  </div>
                ) : (
                  <p className="mx-5 mt-4 rounded-xl bg-success-soft p-3 text-sm text-success">All names still resolve to the addresses on file.</p>
                )
              ) : null}
              <ul className="divide-y divide-border">
                {p.shares.map((s) => {
                  const diff = diffs.find((d) => d.subname === s.subname);
                  return (
                    <li key={s.subname} className="flex items-center justify-between gap-4 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-fg">{s.subname}</p>
                        <p className="text-xs text-fg-muted">
                          {s.contribution} pts · paid to <span className="font-mono">{shortHash(s.account)}</span>
                        </p>
                        {diff ? (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-warning">
                            <AlertTriangle className="size-3.5" aria-hidden /> Now resolves to {diff.current ? shortHash(diff.current) : "nothing"}
                          </p>
                        ) : null}
                      </div>
                      <p className="font-display text-lg font-semibold tabular-nums text-fg">{formatBps(s.bps)}</p>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card>

        <Card className="h-fit p-5 text-sm">
          <p className="font-medium text-fg">Settlement</p>
          {p.splitContract.startsWith("0x") ? (
            <a href={explorerAddress(p.splitContract)} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-brand hover:underline">
              ProjectSplitter {shortHash(p.splitContract)} <ExternalLink className="size-3" aria-hidden />
            </a>
          ) : (
            <p className="mt-1 text-fg-muted">Not set up yet</p>
          )}
          <p className="mt-3 text-xs text-fg-muted">
            Payments credit each member&apos;s claimable balance; nobody is paid inside the customer&apos;s transaction. Rounding dust goes to the owner.
          </p>
          <p className="mt-3 break-all font-mono text-[11px] text-fg-muted">id {p.onchainId}</p>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Invoice this project" description="The payment is split automatically by the current share table." />
        <ProjectInvoiceForm org={org} project={p} />
      </Card>

      <Card className="mt-6">
        <CardHeader title="Payouts" description="Written by the relayer for every credited share." />
        {payouts.isLoading ? <Skeleton className="m-5 h-24" /> : <PayoutTable payouts={payouts.data ?? []} />}
      </Card>

      <Card className="mt-6">
        <CardHeader title="Project invoices" />
        <InvoiceTable invoices={projectInvoices} loading={invoices.isLoading} error={invoices.error} compact />
      </Card>
    </>
  );
}

export function ProjectDetail({ projectId }: { projectId: string }) {
  return <OrgGate>{({ org }) => <Detail org={org} projectId={projectId} />}</OrgGate>;
}
