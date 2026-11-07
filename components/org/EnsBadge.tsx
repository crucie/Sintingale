import { BadgeCheck, ShieldAlert } from "lucide-react";
import { cn, shortHash } from "@/lib/format";

/** Name + avatar + verified check; falls back to a short address marked "not name-verified". */
export function EnsBadge({
  name,
  address,
  avatar,
  verified,
  size = "md",
  className,
}: {
  name: string | null;
  address: string | null;
  avatar?: string | null;
  verified: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = size === "lg" ? "size-12 text-lg" : size === "sm" ? "size-6 text-[10px]" : "size-9 text-sm";
  const text = size === "lg" ? "text-xl" : size === "sm" ? "text-sm" : "text-base";

  if (!name) {
    return (
      <span className={cn("inline-flex items-center gap-2", className)}>
        <span className={cn("grid place-items-center rounded-full bg-muted font-mono text-fg-muted", dims)}>0x</span>
        <span className="min-w-0">
          <span className={cn("block font-mono font-medium text-fg", text)} title={address ?? undefined}>
            {address ? shortHash(address) : "Unknown"}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
            <ShieldAlert className="size-3.5" aria-hidden /> Not name-verified
          </span>
        </span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)} title={address ? `Resolves to ${address}` : undefined}>
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className={cn("shrink-0 rounded-full object-cover", dims)} />
      ) : (
        <span className={cn("grid shrink-0 place-items-center rounded-full bg-brand font-display font-bold text-brand-fg", dims)}>
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="min-w-0">
        <span className={cn("flex items-center gap-1 font-display font-semibold text-fg", text)}>
          <span className="truncate">{name}</span>
          {verified ? <BadgeCheck className="size-4 shrink-0 text-success" aria-label="ENS verified" /> : null}
        </span>
        {verified ? (
          <span className="text-xs text-success">ENS verified</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-warning">
            <ShieldAlert className="size-3.5" aria-hidden /> Not verified
          </span>
        )}
      </span>
    </span>
  );
}
