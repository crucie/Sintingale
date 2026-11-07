"use client";

import { useQueryClient } from "@tanstack/react-query";
import { FolderKanban, FolderPlus, PieChart } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { orgActions, useProjects, useSigner } from "@/lib/client/org";
import { formatBps } from "@/lib/splits";
import type { OrgDTO } from "@/lib/types";
import { OrgGate } from "./OrgGate";

const slugify = (v: string) =>
  v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

function CreateProject({ org }: { org: OrgDTO }) {
  const qc = useQueryClient();
  const sign = useSigner();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await orgActions.createProject(sign, org.orgId, { projectId: slugify(name), name, description });
      toast.success(`${name} created. Now set its shares.`);
      setName("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["projects"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message.split("\n")[0] : "Could not create project");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title="New project" description="Each project has its own contribution-based share table." />
      <form onSubmit={submit} className="grid gap-4 p-5 md:grid-cols-[1fr_1.4fr_auto] md:items-end">
        <Field label="Name" htmlFor="p-name" hint={name ? `id: ${slugify(name)}` : undefined}>
          <Input id="p-name" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="Launch" />
        </Field>
        <Field label="Description" htmlFor="p-desc">
          <Textarea id="p-desc" className="min-h-11" rows={1} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={240} placeholder="What the team is delivering" />
        </Field>
        <Button type="submit" loading={busy} icon={<FolderPlus className="size-4" />}>
          Create
        </Button>
      </form>
    </Card>
  );
}

function Projects({ org }: { org: OrgDTO }) {
  const projects = useProjects(org.orgId);
  return (
    <>
      <PageHeader title="Projects" description="When a customer pays a project invoice, the payment is split by each member's contribution." />
      <div className="space-y-6">
        <CreateProject org={org} />
        {projects.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : !projects.data?.length ? (
          <Card>
            <EmptyState icon={FolderKanban} title="No projects yet" description="Create one above, then add members and their contributions." />
          </Card>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.data.map((p) => (
              <li key={p.key}>
                <Link href={`/dashboard/projects/${p.projectId}`} className="flex h-full flex-col rounded-2xl border border-border bg-surface p-5 hover:border-brand/40">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-display font-semibold text-fg">{p.name}</p>
                      <p className="font-mono text-xs text-fg-muted">{p.projectId}</p>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-1 text-xs text-fg-muted">v{p.version}</span>
                  </div>
                  {p.description ? <p className="mt-2 line-clamp-2 text-sm text-fg-muted">{p.description}</p> : null}
                  <div className="mt-auto pt-4">
                    {p.shares.length ? (
                      <>
                        <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                          {p.shares.map((s, i) => (
                            <div key={s.subname} className="h-full" style={{ width: `${s.bps / 100}%`, background: `color-mix(in oklab, var(--brand) ${100 - i * 25}%, white)` }} />
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-fg-muted">
                          {p.shares.map((s) => `${s.subname.split(".")[0]} ${formatBps(s.bps)}`).join(" · ")}
                        </p>
                      </>
                    ) : (
                      <p className="inline-flex items-center gap-1 text-xs text-warning">
                        <PieChart className="size-3.5" aria-hidden /> No shares yet
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export function ProjectsView() {
  return <OrgGate>{({ org }) => <Projects org={org} />}</OrgGate>;
}
