"use client";

import { AlertTriangle, ArrowUpRight, Bot, FolderKanban, Link2, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/AppShell";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { useGrants, useMembers, useProjects } from "@/lib/client/org";
import { publicConfig } from "@/lib/config";
import { formatDate } from "@/lib/format";
import type { OrgDTO } from "@/lib/types";
import { EnsBadge } from "./EnsBadge";
import { SessionGate } from "./OrgGate";

const METHOD: Record<OrgDTO["verifyMethod"], string> = {
  addr: "The name's ETH address is your wallet",
  text: "The name's sintingale.owner text record names your wallet",
};

function Overview({ org }: { org: OrgDTO }) {
  const members = useMembers(org.orgId);
  const projects = useProjects(org.orgId);
  const grants = useGrants(org.orgId);
  const activeGrants = grants.data?.filter((g) => !g.revoked).length;

  const tiles = [
    { href: "/dashboard/team", icon: Users, label: "Team members", value: members.data?.filter((m) => m.kind === "person").length },
    { href: "/dashboard/projects", icon: FolderKanban, label: "Projects", value: projects.data?.length },
    { href: "/dashboard/agents", icon: Bot, label: "Active agent grants", value: activeGrants },
  ];

  return (
    <>
      <PageHeader title="Organisation" description="Your ENS name is your billing organisation." />
      {!org.payoutMatches ? (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger-soft p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
          <div className="text-sm">
            <p className="font-medium text-fg">{org.ensName} no longer resolves to your recorded payout.</p>
            <p className="text-fg-muted">
              It resolves to {org.resolvedAddress ?? "nothing"}. Checkout blocks project payments until the name points back to{" "}
              {org.payout} or you link it again.
            </p>
          </div>
        </div>
      ) : null}

      <Card className="p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <EnsBadge name={org.ensName} address={org.resolvedAddress} avatar={org.avatar} verified={org.payoutMatches} size="lg" />
          <ButtonLink
            href={`${publicConfig.sepolia.ensAppUrl}/${org.ensName}`}
            target="_blank"
            variant="outline"
            icon={<ArrowUpRight className="size-4" aria-hidden />}
          >
            Open in ENS app
          </ButtonLink>
        </div>
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-fg-muted">Verified by</dt>
            <dd className="mt-0.5 text-fg">{METHOD[org.verifyMethod]}</dd>
          </div>
          <div>
            <dt className="text-fg-muted">Linked</dt>
            <dd className="mt-0.5 text-fg">{formatDate(org.verifiedAt)}</dd>
          </div>
          <div>
            <dt className="text-fg-muted">Payout (where the name resolves)</dt>
            <dd className="mt-0.5 flex items-center gap-1 font-mono text-xs text-fg">
              {org.payout}
              <CopyButton value={org.payout} label="Copy payout address" />
            </dd>
          </div>
          <div>
            <dt className="text-fg-muted">Owner wallet</dt>
            <dd className="mt-0.5 flex items-center gap-1 font-mono text-xs text-fg">
              {org.owner}
              <CopyButton value={org.owner} label="Copy owner address" />
            </dd>
          </div>
        </dl>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="group rounded-2xl border border-border bg-surface p-5 hover:border-brand/40">
            <div className="flex items-center justify-between">
              <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand">
                <t.icon className="size-4" aria-hidden />
              </span>
              <ArrowUpRight className="size-4 text-fg-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
            </div>
            <p className="mt-3 font-display text-2xl font-semibold text-fg tabular-nums">{t.value ?? "—"}</p>
            <p className="text-sm text-fg-muted">{t.label}</p>
          </Link>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader
          title={<span className="inline-flex items-center gap-2"><Link2 className="size-4 text-brand" /> Optional: reverse verification</span>}
          description="Point your name back at this org so anyone can check the link both ways."
        />
        <div className="space-y-2 p-5 text-sm text-fg-muted">
          <p>
            In the ENS app, add a text record <code className="font-mono text-fg">sintingale.org</code> with this value:
          </p>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2">
            <code className="min-w-0 flex-1 truncate font-mono text-xs text-fg">{org.key}</code>
            <CopyButton value={org.key} label="Copy org key" />
          </div>
        </div>
      </Card>
    </>
  );
}

export function OrgOverview() {
  return (
    <SessionGate description="Sign in to see or link your organisation.">
      {(session) =>
        session.org ? (
          <Overview org={session.org} />
        ) : (
          <>
            <PageHeader title="Organisation" description="Link an ENS name to turn it into your billing organisation." />
            <Card className="p-6">
              <p className="text-sm text-fg-muted">
                Signed in as <span className="font-mono text-fg">{session.address}</span>. No ENS name is linked to this wallet yet.
              </p>
              <ButtonLink href="/dashboard/org/connect" className="mt-4" icon={<Sparkles className="size-4" aria-hidden />}>
                Link an ENS name
              </ButtonLink>
            </Card>
          </>
        )
      }
    </SessionGate>
  );
}
