"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/format";

export function CopyButton({
  value,
  label = "Copy",
  toastMessage = "Copied to clipboard",
  className,
  showLabel = false,
}: {
  value: string;
  label?: string;
  toastMessage?: string;
  className?: string;
  showLabel?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        toast.success(toastMessage);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={cn(
        "inline-flex min-h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg px-2 text-fg-muted transition-colors hover:bg-muted hover:text-fg",
        className,
      )}
    >
      {copied ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {showLabel ? <span className="text-sm">{copied ? "Copied" : label}</span> : null}
    </button>
  );
}
