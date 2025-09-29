"use client";

export function KpiSummary({
  items,
}: {
  items: { label: string; value: string; hint?: string }[];
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {items.map((k) => (
        <div key={k.label} className="glass-card p-4 text-center">
          <div className="text-xs text-muted-foreground">{k.label}</div>
          <div className="text-2xl font-semibold text-foreground">{k.value}</div>
          {k.hint && <div className="text-[11px] text-muted-foreground mt-1">{k.hint}</div>}
        </div>
      ))}
    </div>
  );
}
