"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2, Save, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useConfig, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import type { Hex } from "viem";
import { PageHeader } from "@/components/layout/AppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { NetworkGuard } from "@/components/wallet/NetworkGuard";
import { splitterAbi } from "@/lib/chain/splitter";
import { api } from "@/lib/client/hooks";
import { orgActions, useMembers, useProject, useSigner } from "@/lib/client/org";
import { publicConfig, splitterEnabled } from "@/lib/config";
import { cn, shortHash } from "@/lib/format";
import { contributionsToBps, formatBps, validateShares } from "@/lib/splits";
import type { OrgDTO, ProjectDTO } from "@/lib/types";
import { explorerTx, whitechain } from "@/lib/whitechain";
import { OrgGate } from "./OrgGate";

interface Row {
  subname: string;
  expected: string | null;
  contribution: number;
  include: boolean;
}

interface Resolved {
  subname: string;
  contribution: number;
  address: string | null;
}

type Phase = "edit" | "resolving" | "confirm" | "chain" | "signing";

const nowSec = () => Math.floor(Date.now() / 1000);

function Editor({ org, project }: { org: OrgDTO; project: ProjectDTO }) {
  const router = useRouter();
  const qc = useQueryClient();
  const sign = useSigner();
  const members = useMembers(org.orgId);
  const config = useConfig();
  const write = useWriteContract();

  const initial = useMemo<Row[]>(() => {
    const existing = new Map(project.shares.map((s) => [s.subname, s.contribution]));
    const base: Row[] = [{ subname: org.ensName, expected: org.payout, contribution: existing.get(org.ensName) ?? 0, include: existing.has(org.ensName) || !project.shares.length }];
    for (const m of members.data ?? []) {
      if (m.kind !== "person") continue;
      base.push({ subname: m.subname, expected: m.address, contribution: existing.get(m.subname) ?? 0, include: existing.has(m.subname) });
    }
    return base;
  }, [members.data, org, project.shares]);

  const [edits, setEdits] = useState<Record<string, Partial<Row>>>({});
  const rows = initial.map((r) => ({ ...r, ...edits[r.subname] }));
  const active = rows.filter((r) => r.include && r.contribution > 0);
  const bps = contributionsToBps(active.map((r) => r.contribution));
  const total = bps.reduce((a, b) => a + b, 0);

  const [phase, setPhase] = useState<Phase>("edit");
  const [resolved, setResolved] = useState<{ rows: Resolved[]; resolvedAt: number } | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const update = (subname: string, patch: Partial<Row>) => setEdits((e) => ({ ...e, [subname]: { ...e[subname], ...patch } }));

  async function resolve() {
    setPhase("resolving");
    try {
      const res = await api<{ rows: Resolved[]; resolvedAt: number }>(`/api/projects/${project.projectId}/shares`, {
        method: "PUT",
        body: JSON.stringify({ orgId: org.orgId, rows: active.map((r) => ({ subname: r.subname, contribution: r.contribution })) }),
      });
      setResolved(res);
      setPhase("confirm");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not resolve names");
      setPhase("edit");
    }
  }

  const resolvedBps = resolved ? contributionsToBps(resolved.rows.map((r) => r.contribution)) : [];
  const shares = resolved
    ? resolved.rows.map((r, i) => ({ subname: r.subname, account: (r.address ?? "").toLowerCase(), bps: resolvedBps[i], contribution: r.contribution, resolvedAt: resolved.resolvedAt }))
    : [];
  const shareError = resolved ? validateShares(shares.map((s) => ({ account: s.account, bps: s.bps }))) : null;
  const unresolved = resolved?.rows.filter((r) => !r.address) ?? [];

  async function save() {
    if (!resolved || shareError) return;
    try {
      const version = project.version + 1;
      if (!splitterEnabled) throw new Error("The ProjectSplitter is not configured on this deployment.");
      setPhase("chain");
      const hash = await write.mutateAsync({
        address: publicConfig.splitter!,
        abi: splitterAbi,
        functionName: project.splitContract.startsWith("0x") ? "updateShares" : "createProject",
        args: [project.onchainId as Hex, shares.map((s) => ({ account: s.account as Hex, bps: s.bps }))],
        chainId: whitechain.id,
      });
      setTxHash(hash);
      const receipt = await waitForTransactionReceipt(config, { hash, chainId: whitechain.id });
      if (receipt.status !== "success") throw new Error("The share update reverted on Whitechain.");
      const splitContract = publicConfig.splitter!.toLowerCase();
      setPhase("signing");
      await orgActions.saveShares(sign, {
        orgId: org.orgId,
        projectId: project.projectId,
        name: project.name,
        description: project.description,
        splitContract,
        onchainId: project.onchainId,
        version,
        shares,
        updatedAt: nowSec(),
      });
      toast.success(`Shares saved as version ${version}. They apply to future payments only.`);
      qc.invalidateQueries({ queryKey: ["project"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      router.push(`/dashboard/projects/${project.projectId}`);
    } catch (e) {
      toast.error(e instanceof Error ? (e as { shortMessage?: string }).shortMessage ?? e.message.split("\n")[0] : "Could not save shares");
      setPhase("confirm");
    }
  }

  if (members.isLoading) return <Skeleton className="h-72 w-full" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Contributions" description="Each member's share is their contribution divided by the total, rounded to basis points that sum to exactly 100%." />
        <div className="divide-y divide-border">
          {rows.map((r) => {
            const idx = active.findIndex((a) => a.subname === r.subname);
            return (
              <div key={r.subname} className={cn("grid items-center gap-3 px-5 py-3 sm:grid-cols-[auto_1fr_140px_90px]", !r.include && "opacity-60")}>
                <input
                  type="checkbox"
                  aria-label={`Include ${r.subname}`}
                  checked={r.include}
                  onChange={(e) => update(r.subname, { include: e.target.checked })}
                  className="size-5 accent-[var(--brand)]"
                  disabled={phase !== "edit"}
                />
                <div className="min-w-0">
                  <p className="truncate font-medium text-fg">{r.subname}</p>
                  <p className="font-mono text-xs text-fg-muted">{r.expected ? shortHash(r.expected, 8, 6) : "no address"}</p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <span className="sr-only">Contribution for {r.subname}</span>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    value={r.contribution || ""}
                    onChange={(e) => update(r.subname, { contribution: Math.max(0, Number(e.target.value) || 0), include: true })}
                    disabled={phase !== "edit"}
                    placeholder="0"
                    className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-right tabular-nums focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand-soft"
                  />
                  <span className="text-xs text-fg-muted">pts</span>
                </label>
                <p className="text-right font-display font-semibold tabular-nums text-fg">{idx >= 0 ? formatBps(bps[idx]) : "—"}</p>
              </div>
            );
          })}
        </div>
        <div className="flex flex-col gap-3 border-t border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className={cn("text-sm font-medium", total === 10_000 ? "text-success" : "text-warning")}>
            Total {formatBps(total)} {total === 10_000 ? "✓" : "(must be exactly 100.00%)"}
          </p>
          {phase === "edit" || phase === "resolving" ? (
            <Button onClick={resolve} loading={phase === "resolving"} disabled={total !== 10_000} icon={<Search className="size-4" />}>
              Resolve names and review
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setPhase("edit")} disabled={phase !== "confirm"}>
              Edit contributions
            </Button>
          )}
        </div>
      </Card>

      {resolved ? (
        <Card>
          <CardHeader title="Confirm addresses" description="The splitter pays addresses, not names. These are captured now; re-sync later if a member's wallet changes." />
          <ul className="divide-y divide-border">
            {resolved.rows.map((r, i) => {
              const expected = rows.find((x) => x.subname === r.subname)?.expected?.toLowerCase();
              const changed = r.address && expected && r.address !== expected;
              return (
                <li key={r.subname} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-fg">{r.subname}</p>
                    <p className="text-xs text-fg-muted">
                      Share is paid to the address currently resolved for {r.subname}:{" "}
                      <span className="font-mono">{r.address ?? "does not resolve"}</span>
                    </p>
                    {changed ? (
                      <p className="mt-1 flex items-center gap-1 text-xs text-warning">
                        <AlertTriangle className="size-3.5" aria-hidden /> Differs from the address recorded at approval ({shortHash(expected)}).
                      </p>
                    ) : null}
                  </div>
                  <p className="font-display font-semibold tabular-nums text-fg">{formatBps(resolvedBps[i])}</p>
                </li>
              );
            })}
          </ul>
          <div className="space-y-3 border-t border-border p-5">
            {unresolved.length ? (
              <p role="alert" className="flex items-center gap-2 text-sm text-danger">
                <AlertTriangle className="size-4" aria-hidden /> {unresolved.map((u) => u.subname).join(", ")} does not resolve. Fix it in the ENS app first.
              </p>
            ) : shareError ? (
              <p role="alert" className="text-sm text-danger">Share table is invalid ({shareError}).</p>
            ) : null}
            <p className="text-sm text-fg-muted">
              {splitterEnabled
                ? `Saving sends ${project.splitContract.startsWith("0x") ? "updateShares" : "createProject"} to the ProjectSplitter on ${whitechain.name}, then you sign version ${project.version + 1}. Past payouts are never recalculated.`
                : "Project splits are unavailable: NEXT_PUBLIC_SPLITTER_ADDRESS is not configured."}
            </p>
            {txHash ? (
              <a href={explorerTx(txHash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-brand hover:underline">
                {phase === "chain" ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <CheckCircle2 className="size-3" aria-hidden />} {shortHash(txHash, 10, 8)}
              </a>
            ) : null}
            <NetworkGuard action="Share tables">
              <SaveButton phase={phase} disabled={Boolean(!splitterEnabled || unresolved.length || shareError)} onClick={save} />
            </NetworkGuard>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function SaveButton({ phase, disabled, onClick }: { phase: Phase; disabled: boolean; onClick: () => void }) {
  return (
    <Button onClick={onClick} disabled={disabled} loading={phase === "chain" || phase === "signing"} icon={<Save className="size-4" />}>
      {phase === "chain" ? "Confirm on Whitechain…" : phase === "signing" ? "Sign the new version…" : "Save share table"}
    </Button>
  );
}

function Loader({ org, projectId }: { org: OrgDTO; projectId: string }) {
  const project = useProject(org.orgId, projectId);
  if (project.isLoading) return <Skeleton className="h-72 w-full" />;
  if (!project.data) return <Card className="p-6 text-sm text-fg-muted">Project not found.</Card>;
  return (
    <>
      <PageHeader
        title={`Shares: ${project.data.name}`}
        description="Contribution decides the share of every future payment to this project."
        action={<ButtonLink href={`/dashboard/projects/${projectId}`} variant="outline">Back to project</ButtonLink>}
      />
      <Editor org={org} project={project.data} />
    </>
  );
}

export function ShareEditorPage({ projectId }: { projectId: string }) {
  return <OrgGate>{({ org }) => <Loader org={org} projectId={projectId} />}</OrgGate>;
}
