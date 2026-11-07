"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Hourglass, UserCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ExpiryCountdown } from "@/components/dashboard/ExpiryCountdown";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/EmptyState";
import { Logo } from "@/components/ui/Logo";
import { Skeleton } from "@/components/ui/Skeleton";
import { api, ApiError } from "@/lib/client/hooks";
import { orgActions, useSession, useSigner, useTeamsEnabled } from "@/lib/client/org";
import { shortHash } from "@/lib/format";
import type { InviteDTO, OrgDTO } from "@/lib/types";
import { EnsBadge } from "./EnsBadge";
import { InviteStatusChip } from "./InviteCard";
import { SignInCard } from "./SignInCard";
import { TeamsDisabled } from "./TeamsDisabled";

export function InviteLanding({ inviteKey }: { inviteKey: string }) {
  const qc = useQueryClient();
  const session = useSession();
  const sign = useSigner();
  const [busy, setBusy] = useState(false);
  const teams = useTeamsEnabled();
  const invite = useQuery({
    queryKey: ["invite", inviteKey],
    queryFn: () => api<{ invite: InviteDTO; org: OrgDTO }>(`/api/invites/${inviteKey}`),
    retry: false,
    refetchInterval: 10_000,
    enabled: teams === true,
  });

  const me = session.data?.session;
  const data = invite.data;

  async function accept() {
    if (!data || !me) return;
    setBusy(true);
    try {
      await orgActions.acceptInvite(sign, inviteKey, {
        orgId: data.invite.orgId,
        inviteId: data.invite.inviteId,
        acceptor: me.address,
        label: data.invite.label,
        acceptedAt: Math.floor(Date.now() / 1000),
      });
      toast.success("Accepted. The owner will issue your subname.");
      qc.invalidateQueries({ queryKey: ["invite", inviteKey] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message.split("\n")[0] : "Could not accept");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-muted px-4 py-10">
      <div className="mx-auto max-w-lg">
        <Link href="/" className="mb-6 inline-block" aria-label="Sintingale home">
          <Logo />
        </Link>
        <div className="rounded-3xl border border-border bg-bg p-6 shadow-xl shadow-black/5">
          {teams === false ? (
            <TeamsDisabled publicView />
          ) : invite.isLoading || teams === undefined ? (
            <Skeleton className="h-48 w-full" />
          ) : invite.error ? (
            invite.error instanceof ApiError && invite.error.code === "INVITE_EXPIRED" ? (
              <div className="py-8 text-center">
                <Hourglass className="mx-auto size-10 text-fg-muted" aria-hidden />
                <h1 className="mt-3 font-display text-xl font-semibold text-fg">This invite has expired.</h1>
                <p className="mt-1 text-sm text-fg-muted">Invites are expiring records. Ask the org owner for a new link.</p>
              </div>
            ) : (
              <ErrorState message={invite.error.message} onRetry={() => invite.refetch()} />
            )
          ) : data ? (
            <>
              <p className="text-sm text-fg-muted">You&apos;re invited to join</p>
              <div className="mt-2">
                <EnsBadge name={data.org.ensName} address={data.org.resolvedAddress} avatar={data.org.avatar} verified={data.org.payoutMatches} demo={data.org.demo} size="lg" />
              </div>
              <div className="mt-6 rounded-2xl bg-muted/70 p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-fg-muted">Your name</span>
                  <span className="font-display font-semibold text-fg">{data.invite.subname}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-fg-muted">Role</span>
                  <span className="text-fg">{data.invite.role}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-fg-muted">Status</span>
                  <InviteStatusChip status={data.invite.status} />
                </div>
                {data.invite.status === "pending" ? (
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-fg-muted">Expires in</span>
                    <ExpiryCountdown expiresAt={data.invite.expiresAt} />
                  </div>
                ) : null}
              </div>

              {data.invite.status === "approved" ? (
                <p className="mt-6 flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="size-4" aria-hidden /> You&apos;re in. See your share on{" "}
                  <Link href="/me/earnings" className="underline">
                    your earnings page
                  </Link>
                  .
                </p>
              ) : data.invite.status === "accepted" ? (
                <p className="mt-6 flex items-center gap-2 text-sm text-fg-muted">
                  <UserCheck className="size-4 text-brand" aria-hidden /> Accepted by {shortHash(data.invite.acceptor ?? "")}. Waiting for the owner to
                  issue {data.invite.subname}.
                </p>
              ) : !me ? (
                <div className="mt-6">
                  <SignInCard title="Sign in to accept" description="Your share will be paid to this wallet." />
                </div>
              ) : data.invite.inviteeAddress && data.invite.inviteeAddress !== me.address ? (
                <p role="alert" className="mt-6 rounded-xl bg-warning-soft p-3 text-sm text-fg">
                  This invite is for {shortHash(data.invite.inviteeAddress)}. You&apos;re signed in as {shortHash(me.address)}.
                </p>
              ) : (
                <div className="mt-6 space-y-3">
                  <p className="text-sm text-fg-muted">
                    Accepting signs a message with <span className="font-mono text-xs">{shortHash(me.address)}</span>. Your subname will resolve to
                    this wallet, and your share is paid there.
                  </p>
                  <Button className="w-full" size="lg" loading={busy} onClick={accept} icon={<UserCheck className="size-4" />}>
                    Accept invite
                  </Button>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
