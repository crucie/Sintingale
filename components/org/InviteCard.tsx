"use client";

import { CheckCircle2, Clock, Hourglass, UserCheck } from "lucide-react";
import type { ReactNode } from "react";
import { ExpiryCountdown } from "@/components/dashboard/ExpiryCountdown";
import { CopyButton } from "@/components/ui/CopyButton";
import { useNow, useOrigin } from "@/lib/client/hooks";
import { cn, shortHash } from "@/lib/format";
import type { InviteDTO } from "@/lib/types";

type Status = "pending" | "accepted" | "approved" | "expired";

const CHIP: Record<Status, { label: string; className: string; Icon: typeof Clock }> = {
  pending: { label: "Pending", className: "bg-warning-soft text-warning", Icon: Clock },
  accepted: { label: "Accepted, needs approval", className: "bg-brand-soft text-brand", Icon: UserCheck },
  approved: { label: "Approved", className: "bg-success-soft text-success", Icon: CheckCircle2 },
  expired: { label: "Expired", className: "bg-muted text-fg-muted", Icon: Hourglass },
};

export function InviteStatusChip({ status }: { status: Status }) {
  const { label, className, Icon } = CHIP[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", className)}>
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}

export function InviteCard({ invite, actions }: { invite: InviteDTO; actions?: ReactNode }) {
  const now = useNow();
  const origin = useOrigin();
  const expired = invite.status === "pending" && now !== null && invite.expiresAt * 1000 <= now;
  const status: Status = expired ? "expired" : invite.status;
  const link = origin ? `${origin}/invite/${invite.key}` : "";

  return (
    <li className="rounded-2xl border border-border bg-bg p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display font-semibold text-fg">{invite.subname}</p>
          <p className="text-xs text-fg-muted">
            {invite.role} · {invite.inviteeAddress ? `for ${shortHash(invite.inviteeAddress)}` : "anyone with the link"}
            {invite.acceptor ? ` · accepted by ${shortHash(invite.acceptor)}` : ""}
          </p>
        </div>
        <InviteStatusChip status={status} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        {status === "pending" ? (
          <span className="inline-flex items-center gap-1 text-fg-muted">
            Expires in <ExpiryCountdown expiresAt={invite.expiresAt} />
          </span>
        ) : (
          <span />
        )}
        {status === "pending" && link ? <CopyButton value={link} label="Copy invite link" toastMessage="Invite link copied" showLabel /> : null}
      </div>
      {actions ? <div className="mt-3 border-t border-border pt-3">{actions}</div> : null}
    </li>
  );
}
