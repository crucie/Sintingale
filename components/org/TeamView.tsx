"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowUpRight, Bot, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { orgActions, useInvites, useMembers, useSigner } from "@/lib/client/org";
import { shortHash } from "@/lib/format";
import type { InviteDTO, MemberDTO, OrgDTO } from "@/lib/types";
import { EnsBadge } from "./EnsBadge";
import { InviteCard } from "./InviteCard";
import { OrgGate } from "./OrgGate";

function Approval({ org, invite }: { org: OrgDTO; invite: InviteDTO }) {
  const qc = useQueryClient();
  const sign = useSigner();
  const [busy, setBusy] = useState<"issue" | "approve" | null>(null);
  const ins = invite.instructions!;

  async function issueDemo() {
    setBusy("issue");
    try {
      await orgActions.issueSubname(org.orgId, invite.label, invite.acceptor!);
      toast.success(`${ins.name} issued in the demo registry`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not issue subname");
    } finally {
      setBusy(null);
    }
  }

  async function approve() {
    setBusy("approve");
    try {
      await orgActions.approveMember(sign, {
        orgId: org.orgId,
        subname: ins.name,
        address: invite.acceptor!,
        role: invite.role,
        kind: "person",
        inviteId: invite.inviteId,
        joinedAt: Math.floor(Date.now() / 1000),
      });
      toast.success(`${ins.name} joined ${org.ensName}`);
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["invites"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message.split("\n")[0] : "Approval failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="font-medium text-fg">Issue {ins.name}</p>
      <ol className="list-decimal space-y-1 pl-4 text-fg-muted">
        {ins.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        {ins.demo ? (
          <Button size="sm" variant="outline" loading={busy === "issue"} onClick={issueDemo}>
            Issue demo subname
          </Button>
        ) : (
          <ButtonLink href={ins.ensAppUrl!} target="_blank" size="sm" variant="outline" icon={<ArrowUpRight className="size-4" aria-hidden />}>
            Open ENS app (Sepolia)
          </ButtonLink>
        )}
        <Button size="sm" loading={busy === "approve"} onClick={approve} icon={<ShieldCheck className="size-4" />}>
          Check & approve
        </Button>
      </div>
    </div>
  );
}

function MemberRow({ org, member }: { org: OrgDTO; member: MemberDTO }) {
  const qc = useQueryClient();
  const sign = useSigner();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm(`Remove ${member.subname}? Their future shares stop; past payouts stay claimable.`)) return;
    setBusy(true);
    try {
      await orgActions.revoke(sign, {
        orgId: org.orgId,
        targetType: "member",
        targetId: member.subname,
        revokedAt: Math.floor(Date.now() / 1000),
      });
      toast.success(`${member.subname} removed. Remove the subname in the ENS app too.`);
      qc.invalidateQueries({ queryKey: ["members"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message.split("\n")[0] : "Could not remove member");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <EnsBadge name={member.subname} address={member.currentAddress} verified={member.addressMatches} demo={member.demo} />
        <p className="mt-1 pl-11 text-xs text-fg-muted">
          {member.kind === "agent" ? (
            <span className="inline-flex items-center gap-1">
              <Bot className="size-3.5" aria-hidden /> agent
            </span>
          ) : (
            member.role
          )}{" "}
          · paid to <span className="font-mono">{shortHash(member.address)}</span>
        </p>
        {!member.addressMatches ? (
          <p className="mt-1 flex items-center gap-1 pl-11 text-xs text-warning">
            <AlertTriangle className="size-3.5" aria-hidden />
            Now resolves to {member.currentAddress ? shortHash(member.currentAddress) : "nothing"}. Re-sync project shares.
          </p>
        ) : null}
      </div>
      <Button variant="ghost" size="sm" loading={busy} onClick={remove} icon={<Trash2 className="size-4" />} className="self-start sm:self-auto">
        Remove
      </Button>
    </li>
  );
}

function Team({ org }: { org: OrgDTO }) {
  const members = useMembers(org.orgId);
  const invites = useInvites(org.orgId);
  const pendingApproval = invites.data?.filter((i) => i.status === "accepted") ?? [];
  const open = invites.data?.filter((i) => i.status === "pending") ?? [];

  return (
    <>
      <PageHeader
        title="Team"
        description={`Teammates hold subnames of ${org.ensName}. Their shares are paid to the address their name resolves to.`}
        action={
          <ButtonLink href="/dashboard/team/invite" icon={<UserPlus className="size-4" aria-hidden />}>
            Invite teammate
          </ButtonLink>
        }
      />

      {pendingApproval.length ? (
        <Card className="mb-6">
          <CardHeader title="Waiting for your approval" description="They accepted. Issue the subname, then approve." />
          <ul className="space-y-3 p-4">
            {pendingApproval.map((i) => (
              <InviteCard key={i.key} invite={i} actions={<Approval org={org} invite={i} />} />
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader title="Members" description={members.data ? `${members.data.length} subnames` : "Loading…"} />
          {members.isLoading ? (
            <Skeleton className="m-5 h-40" />
          ) : !members.data?.length ? (
            <EmptyState icon={Users} title="No members yet" description="Invite a teammate to give them a subname and a share." />
          ) : (
            <ul className="divide-y divide-border px-5">
              {members.data.map((m) => (
                <MemberRow key={m.key} org={org} member={m} />
              ))}
            </ul>
          )}
        </Card>
        <Card className="h-fit">
          <CardHeader title="Open invites" description="Invites expire on their own after 48 hours." />
          {invites.isLoading ? (
            <Skeleton className="m-5 h-24" />
          ) : !open.length ? (
            <p className="p-5 text-sm text-fg-muted">No open invites.</p>
          ) : (
            <ul className="space-y-3 p-4">
              {open.map((i) => (
                <InviteCard key={i.key} invite={i} />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

export function TeamView() {
  return <OrgGate>{({ org }) => <Team org={org} />}</OrgGate>;
}
