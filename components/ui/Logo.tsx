import { cn } from "@/lib/format";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <path
        d="M20.6 10.4c-1.1-1.2-2.7-1.9-4.6-1.9-2.8 0-4.8 1.5-4.8 3.6 0 4.9 9.8 3 9.8 8 0 2.2-2.1 3.9-5 3.9-2.2 0-4-.8-5.3-2.3"
        fill="none"
        stroke="var(--logo-ink, #fff)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display text-lg font-bold tracking-tight", className)}>
      <LogoMark
        className={inverted ? "text-white [--logo-ink:#f44d1a]" : "text-brand"}
      />
      Sintingale
    </span>
  );
}
