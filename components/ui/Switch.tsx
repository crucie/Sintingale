"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/format";

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  loading,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  loading?: boolean;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled || loading}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60",
        checked ? "bg-brand" : "bg-border",
      )}
    >
      <span
        className={cn(
          "grid size-6 place-items-center rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      >
        {loading ? <Loader2 className="size-3.5 animate-spin text-fg-muted" aria-hidden /> : null}
      </span>
    </button>
  );
}
