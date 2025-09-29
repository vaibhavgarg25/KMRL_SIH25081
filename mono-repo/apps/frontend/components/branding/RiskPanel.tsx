"use client";
export function RiskPanel({ items = [] as { kind: "over" | "under" | "conflict"; text: string }[] }) {
  if (!items.length) return <div className="glass-card p-6 text-sm text-muted-foreground">No risks detected.</div>;
  return (
    <div className="glass-card p-6 space-y-2">
      <div className="text-sm font-semibold">Risks</div>
      {items.map((r, i) => (
        <div key={i} className="text-sm">
          <span
            className={`px-2 py-0.5 mr-2 rounded-full text-xs ${
              r.kind === "over"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                : r.kind === "under"
                ? "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400"
                : "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
            }`}
          >
            {r.kind}
          </span>
          {r.text}
        </div>
      ))}
    </div>
  );
}
