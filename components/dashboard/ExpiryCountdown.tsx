"use client";

import { Timer } from "lucide-react";
import { useNow } from "@/lib/client/hooks";
import { cn, formatCountdown } from "@/lib/format";

export function ExpiryCountdown({ expiresAt, className }: { expiresAt: number | null; className?: string }) {
  const now = useNow();
  if (!expiresAt) return <span className="text-fg-muted">—</span>;
  if (now === null) return <span className={cn("tabular-nums text-fg-muted", className)}>…</span>;
  const ms = expiresAt * 1000 - now;
  const urgent = ms > 0 && ms < 5 * 60_000;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 tabular-nums",
        ms <= 0 ? "text-fg-muted" : urgent ? "font-medium text-warning" : "text-fg-muted",
        className,
      )}
      title={new Date(expiresAt * 1000).toLocaleString()}
    >
      <Timer className="size-3.5 shrink-0" aria-hidden />
      {ms <= 0 ? "Expired" : formatCountdown(ms)}
    </span>
  );
}
