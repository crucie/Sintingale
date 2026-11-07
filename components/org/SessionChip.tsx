"use client";

import { FlaskConical, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useSession, useSignIn } from "@/lib/client/org";
import { shortHash } from "@/lib/format";

export function SessionChip() {
  const { data } = useSession();
  const { signOut } = useSignIn();
  const session = data?.session;
  if (!session) return null;
  const label = session.org?.ensName ?? shortHash(session.address);
  return (
    <span className="hidden items-center gap-1 rounded-full border border-border bg-bg py-1 pl-3 pr-1 text-xs sm:inline-flex">
      {session.demo ? <FlaskConical className="size-3.5 text-brand" aria-hidden /> : <UserRound className="size-3.5 text-fg-muted" aria-hidden />}
      <Link href={session.org ? "/dashboard/org" : "/me/earnings"} className="max-w-36 truncate font-medium text-fg" title={session.address}>
        {label}
      </Link>
      {session.demo ? <span className="text-fg-muted">demo</span> : null}
      <button
        onClick={() => signOut.mutate()}
        className="ml-1 grid size-7 place-items-center rounded-full text-fg-muted hover:bg-muted hover:text-fg"
        aria-label="Sign out"
        title="Sign out"
      >
        <LogOut className="size-3.5" aria-hidden />
      </button>
    </span>
  );
}
