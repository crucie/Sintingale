import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
        <Icon className="size-6" aria-hidden />
      </div>
      <div>
        <p className="font-display font-semibold text-fg">{title}</p>
        {description ? <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <p className="text-sm text-danger">{message}</p>
      {onRetry ? (
        <button onClick={onRetry} className="text-sm font-medium text-brand underline-offset-4 hover:underline">
          Try again
        </button>
      ) : null}
    </div>
  );
}
