"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ban, Bot, CheckCircle2, KeyRound, Play, ShieldAlert, XCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ExpiryCountdown } from "@/components/dashboard/ExpiryCountdown";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { api, ApiError, useNow } from "@/lib/client/hooks";
import { orgActions, randomId, useGrants, useMembers, useProjects, useSigner } from "@/lib/client/org";
import { cn, formatUsdt, shortHash, toBaseUnits } from "@/lib/format";
import type { GrantDTO, OrgDTO } from "@/lib/types";
import { OrgGate } from "./OrgGate";

const nowSec = () => Math.floor(Date.now() / 1000);

function RegisterAgent({ org }: { org: OrgDTO }) {
  const qc = useQueryClient();
  const sign = useSigner();
  const [label, setLabel] = useState("billing-bot");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { instructions, issued } = await orgActions.issueSubname(org.orgId, label, address);
      if (!issued) {
        toast.message(`Create ${instructions.name} in the ENS app pointing to ${shortHash(address)}, then register again.`);
      }
      await orgActions.approveMember(sign, {
        orgId: org.orgId,
        subname: instructions.name,
        address: address.toLowerCase(),
        role: "member",
        kind: "agent",
        inviteId: "",
        joinedAt: nowSec(),
      });
      toast.success(`${instructions.name} registered as an agent`);
      qc.invalidateQueries({ queryKey: ["members"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message.split("\n")[0] : "Could not register agent");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 p-5 md:grid-cols-[1fr_1.3fr_auto] md:items-end">
      <Field label="Agent subname" htmlFor="ag-label" hint={`${label || "label"}.${org.ensName}`}>
        <Input id="ag-label" required value={label} onChange={(e) => setLabel(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
      </Field>
      <Field label="Agent wallet" htmlFor="ag-addr" hint="The key the agent signs requests with.">
        <Input id="ag-addr" required className="font-mono" placeholder="0x…" value={address} onChange={(e) => setAddress(e.target.value.trim())} />
      </Field>
      <Button type="submit" loading={busy} icon={<Bot className="size-4" />}>
        Register agent
      </Button>
    </form>
  );
}

function CreateGrant({ org }: { org: OrgDTO }) {
  const qc = useQueryClient();
  const sign = useSigner();
  const members = useMembers(org.orgId);
  const projects = useProjects(org.orgId);
  const agents = members.data?.filter((m) => m.kind === "agent") ?? [];
  const [agent, setAgent] = useState("");
  const [projectId, setProjectId] = useState("");
  const [maxAmount, setMaxAmount] = useState("25");
  const [maxTotal, setMaxTotal] = useState("100");
  const [hours, setHours] = useState(1);
  const [busy, setBusy] = useState(false);
  const selected = agents.find((a) => a.subname === (agent || agents[0]?.subname));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      await orgActions.createGrant(
        sign,
        {
          orgId: org.orgId,
          grantId: randomId("grant"),
          agentName: selected.subname,
          agentAddress: selected.address,
          scope: "invoice:create",
          projectId,
          maxAmount: toBaseUnits(maxAmount),
          maxTotal: toBaseUnits(maxTotal),
          createdAt: nowSec(),
        },
        hours,
      );
      toast.success(`Grant for ${selected.subname} expires in ${hours}h on its own`);
      qc.invalidateQueries({ queryKey: ["grants"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message.split("\n")[0] : "Could not create grant");
    } finally {
      setBusy(false);
    }
  }

  if (members.isLoading) return <Skeleton className="m-5 h-24" />;
  if (!agents.length) return <p className="p-5 text-sm text-fg-muted">Register an agent first.</p>;

  return (
    <form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Agent" htmlFor="g-agent">
        <Select id="g-agent" value={selected?.subname ?? ""} onChange={(e) => setAgent(e.target.value)}>
          {agents.map((a) => (
            <option key={a.subname} value={a.subname}>
              {a.subname}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Scope" htmlFor="g-scope">
        <Select id="g-scope" value="invoice:create" disabled>
          <option value="invoice:create">Create invoices</option>
        </Select>
      </Field>
      <Field label="Project" htmlFor="g-project">
        <Select id="g-project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">Any project</option>
          {projects.data?.map((p) => (
            <option key={p.projectId} value={p.projectId}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Max per invoice (USDT)" htmlFor="g-max">
        <Input id="g-max" inputMode="decimal" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} />
      </Field>
      <Field label="Max total (USDT)" htmlFor="g-total">
        <Input id="g-total" inputMode="decimal" value={maxTotal} onChange={(e) => setMaxTotal(e.target.value)} />
      </Field>
      <Field label="Expires after" htmlFor="g-ttl" hint="The grant entity expires; access ends with no cleanup.">
        <Select id="g-ttl" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
          <option value={0.05}>3 minutes (demo)</option>
          <option value={1}>1 hour</option>
          <option value={24}>24 hours</option>
          <option value={168}>7 days</option>
        </Select>
      </Field>
      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="submit" loading={busy} icon={<KeyRound className="size-4" />}>
          Sign and create grant
        </Button>
      </div>
    </form>
  );
}

function GrantRow({ org, grant }: { org: OrgDTO; grant: GrantDTO }) {
  const qc = useQueryClient();
  const sign = useSigner();
  const now = useNow();
  const expired = now !== null && grant.expiresAt * 1000 <= now;
  const pct = Math.min(100, (grant.used / grant.maxTotal) * 100);
  const revoke = useMutation({
    mutationFn: () => orgActions.revoke(sign, { orgId: org.orgId, targetType: "grant", targetId: grant.grantId, revokedAt: nowSec() }),
    onSuccess: () => {
      toast.success("Grant revoked");
      qc.invalidateQueries({ queryKey: ["grants"] });
    },
    onError: (e) => toast.error(e.message.split("\n")[0]),
  });
  const state = grant.revoked ? "Revoked" : expired ? "Expired" : "Active";

  return (
    <li className="py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-medium text-fg">
            <Bot className="size-4 text-brand" aria-hidden /> {grant.agentName}
          </p>
          <p className="text-xs text-fg-muted">
            {grant.scope} · {grant.projectId || "any project"} · max {formatUsdt(grant.maxAmount)} per invoice
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
            state === "Active" ? "bg-success-soft text-success" : "bg-muted text-fg-muted",
          )}
        >
          {state === "Active" ? <CheckCircle2 className="size-3.5" aria-hidden /> : <Ban className="size-3.5" aria-hidden />}
          {state}
        </span>
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-xs text-fg-muted">
          <span>
            {formatUsdt(grant.used)} of {formatUsdt(grant.maxTotal)} used
          </span>
          {state === "Active" ? (
            <span className="inline-flex items-center gap-1">
              Expires in <ExpiryCountdown expiresAt={grant.expiresAt} />
            </span>
          ) : null}
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
        </div>
      </div>
      {state === "Active" ? (
        <Button size="sm" variant="ghost" className="mt-2" loading={revoke.isPending} onClick={() => revoke.mutate()} icon={<Ban className="size-4" />}>
          Revoke
        </Button>
      ) : null}
    </li>
  );
}

function DemoRunner({ org }: { org: OrgDTO }) {
  const qc = useQueryClient();
  const projects = useProjects(org.orgId);
  const [amount, setAmount] = useState("10");
  const [projectId, setProjectId] = useState("launch");
  const [log, setLog] = useState<Array<{ ok: boolean; text: string }>>([]);
  const run = useMutation({
    mutationFn: (impersonate: boolean) =>
      api<{ invoiceId: string; createdBy: string }>("/api/demo/agent", { method: "POST", body: JSON.stringify({ amount, projectId, impersonate }) }),
    onSuccess: (r) => {
      setLog((l) => [{ ok: true, text: `201 · ${r.createdBy} created ${r.invoiceId} for ${amount} USDT` }, ...l].slice(0, 6));
      qc.invalidateQueries({ queryKey: ["grants"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e) => setLog((l) => [{ ok: false, text: `403 · ${e instanceof ApiError ? e.code : "ERROR"}: ${e.message}` }, ...l].slice(0, 6)),
  });

  return (
    <div className="space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <Field label="Amount (USDT)" htmlFor="d-amt">
          <Input id="d-amt" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Project" htmlFor="d-proj">
          <Select id="d-proj" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects.data?.map((p) => (
              <option key={p.projectId} value={p.projectId}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button loading={run.isPending && run.variables === false} onClick={() => run.mutate(false)} icon={<Play className="size-4" />}>
          Send as billing-bot.acme.demo
        </Button>
        <Button variant="outline" loading={run.isPending && run.variables === true} onClick={() => run.mutate(true)} icon={<ShieldAlert className="size-4" />}>
          Send with a different key
        </Button>
      </div>
      {log.length ? (
        <ul className="space-y-1.5 rounded-xl bg-[#1d1410] p-3 font-mono text-xs">
          {log.map((l, i) => (
            <li key={i} className={cn("flex gap-2", l.ok ? "text-[#9be7b0]" : "text-[#ffb4a1]")}>
              {l.ok ? <CheckCircle2 className="size-3.5 shrink-0" aria-hidden /> : <XCircle className="size-3.5 shrink-0" aria-hidden />}
              {l.text}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-fg-muted">Try 10, then 30 (over the per-invoice cap), then keep going until the total cap is hit.</p>
      )}
    </div>
  );
}

function Agents({ org }: { org: OrgDTO }) {
  const grants = useGrants(org.orgId);
  return (
    <>
      <PageHeader
        title="Agents"
        description="Agents are subnames with an expiring, capped grant. When the grant entity expires, so does the permission."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Grants" description="Live countdowns; every request is checked against these." />
          {grants.isLoading ? (
            <Skeleton className="m-5 h-32" />
          ) : !grants.data?.length ? (
            <EmptyState icon={KeyRound} title="No grants" description="Create one to let an agent invoice on your behalf." />
          ) : (
            <ul className="divide-y divide-border px-5">
              {grants.data.map((g) => (
                <GrantRow key={g.key} org={org} grant={g} />
              ))}
            </ul>
          )}
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="New grant" />
            <CreateGrant org={org} />
          </Card>
          <Card>
            <CardHeader title="Register an agent" description="An agent is identified by a subname that resolves to its signing key." />
            <RegisterAgent org={org} />
          </Card>
        </div>
      </div>
      {org.demo ? (
        <Card className="mt-6">
          <CardHeader title="Try it: signed agent requests" description="Each click signs a real request and sends it through POST /api/invoices." />
          <DemoRunner org={org} />
        </Card>
      ) : null}
      <Card className="mt-6 p-5 text-sm text-fg-muted">
        <p className="font-medium text-fg">Calling the API as an agent</p>
        <p className="mt-1">
          Send <code className="font-mono text-xs">POST /api/invoices</code> with headers <code className="font-mono text-xs">x-sintingale-agent</code>,{" "}
          <code className="font-mono text-xs">x-sintingale-timestamp</code>, <code className="font-mono text-xs">x-sintingale-nonce</code> and{" "}
          <code className="font-mono text-xs">x-sintingale-signature</code> (an EIP-191 signature over method, path, timestamp, nonce and the body hash). See{" "}
          <code className="font-mono text-xs">scripts/agent-request.ts</code>.
        </p>
      </Card>
    </>
  );
}

export function AgentsView() {
  return <OrgGate>{({ org }) => <Agents org={org} />}</OrgGate>;
}
