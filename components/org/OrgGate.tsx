"use client";

import { Lock, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSession, useTeamsEnabled } from "@/lib/client/org";
import type { OrgDTO, SessionDTO } from "@/lib/types";
import { SignInCard } from "./SignInCard";
import { TeamsDisabled } from "./TeamsDisabled";

/**
 * Teams, splits and agents need a signed-in wallet that owns a linked ENS org.
 * Everyone else keeps the basic dashboard and sees how to unlock teams.
 */
export function OrgGate({ children }: { children: (ctx: { session: SessionDTO; org: OrgDTO }) => ReactNode }) {
  return (
    <SessionGate description="Sign in to manage your team, projects and splits.">
      {(session) => (session.org ? children({ session, org: session.org }) : <LockedTeams />)}
    </SessionGate>
  );
}

export function SessionGate({ children, description }: { children: (session: SessionDTO) => ReactNode; description?: string }) {
  const teams = useTeamsEnabled();
  const { data, isLoading } = useSession();
  if (teams === undefined || isLoading) return <Skeleton className="h-64 w-full" />;
  if (!teams) return <TeamsDisabled />;
  if (!data?.session) return <SignInCard description={description} />;
  return <>{children(data.session)}</>;
}

export function LockedTeams() {
  return (
    <Card className="mx-auto max-w-xl p-6 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-fg-muted">
        <Lock className="size-6" aria-hidden />
      </div>
      <h2 className="mt-4 font-display text-xl font-semibold text-fg">Connect an ENS name to unlock teams</h2>
      <p className="mt-2 text-sm text-fg-muted">
        Products, checkout links and payments work without ENS. Link a name like <strong>acme.eth</strong> to add teammates as
        subnames, split project revenue by contribution and authorise agents.
      </p>
      <ButtonLink href="/dashboard/org/connect" className="mt-5" icon={<Sparkles className="size-4" aria-hidden />}>
        Link an ENS name
      </ButtonLink>
    </Card>
  );
}
