import { Check, Circle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/format";

export type StepState = "idle" | "active" | "done" | "error" | "skipped";

export interface Step {
  id: string;
  label: string;
  detail?: string;
  state: StepState;
}

const iconFor = (state: StepState) => {
  switch (state) {
    case "active":
      return <Loader2 className="size-3.5 animate-spin" aria-hidden />;
    case "done":
      return <Check className="size-3.5" aria-hidden />;
    case "error":
      return <X className="size-3.5" aria-hidden />;
    default:
      return <Circle className="size-2" aria-hidden />;
  }
};

export function TxStatus({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-3" aria-label="Payment progress">
      {steps.map((step) => (
        <li key={step.id} className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border",
              step.state === "done" && "border-success bg-success text-white",
              step.state === "active" && "border-brand bg-brand-soft text-brand",
              step.state === "error" && "border-danger bg-danger text-white",
              (step.state === "idle" || step.state === "skipped") && "border-border text-fg-muted",
            )}
          >
            {iconFor(step.state)}
          </span>
          <div className="min-w-0">
            <p
              className={cn(
                "text-sm",
                step.state === "idle" || step.state === "skipped" ? "text-fg-muted" : "font-medium text-fg",
                step.state === "skipped" && "line-through",
              )}
            >
              {step.label}
              <span className="sr-only">: {step.state}</span>
            </p>
            {step.detail ? <p className="break-all text-xs text-fg-muted">{step.detail}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
