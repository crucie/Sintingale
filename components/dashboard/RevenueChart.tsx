import { formatUsdt } from "@/lib/format";

export function RevenueChart({ series }: { series: Array<{ day: string; amount: number }> }) {
  const max = Math.max(1, ...series.map((s) => s.amount));
  return (
    <div className="px-5 pb-5 pt-4">
      <div className="flex h-40 items-end gap-1.5" role="img" aria-label="Revenue over the last 14 days">
        {series.map((s) => (
          <div key={s.day} className="group relative flex h-full flex-1 flex-col justify-end">
            <div
              className="w-full rounded-md bg-brand/85 transition-colors group-hover:bg-brand"
              style={{ height: `${Math.max(3, (s.amount / max) * 100)}%`, opacity: s.amount ? 1 : 0.2 }}
            />
            <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-fg px-2 py-1 text-[11px] text-bg group-hover:block">
              {s.day}: {formatUsdt(s.amount)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-fg-muted">
        <span>{series[0]?.day}</span>
        <span>{series.at(-1)?.day}</span>
      </div>
    </div>
  );
}
