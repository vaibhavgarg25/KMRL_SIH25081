"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Filter, Settings, Sparkles, Users } from "lucide-react";

export type TrainsetBranding = {
  trainID: string;
  trainname: string;
  brandingActive: boolean;
  brandCampaignID: string | number | null;
  exposureHoursAccrued: number; // hours
  exposureHoursTarget: number;  // hours
  exposureDailyQuota: number;   // hours/day
  healthScore: number;          // 0..100
};

type ColumnKey =
  | "trainname"
  | "trainID"
  | "brandingActive"
  | "brandCampaignID"
  | "exposureHoursAccrued"
  | "exposureHoursTarget"
  | "exposureDailyQuota"
  | "healthScore";

type Column = {
  key: ColumnKey;
  label: string;
  width?: string; // tailwind width class
  align?: "left" | "right" | "center";
  render?: (row: TrainsetBranding) => React.ReactNode;
  sortable?: boolean;
};

type Props = {
  items?: TrainsetBranding[];
  columns?: Column[];
  loading?: boolean;
  onSelect?: (trainID: string) => void;
  onBulk?: () => void;
};

const DEFAULT_COLUMNS: Column[] = [
  { key: "trainname", label: "Train", width: "w-56", sortable: true, render: (r) => (
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{r.trainname || `Train ${r.trainID}`}</span>
        <span className="text-xs text-muted-foreground">ID: {r.trainID}</span>
      </div>
    )
  },
  { key: "brandingActive", label: "Status", width: "w-28", sortable: true, render: (r) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        r.brandingActive
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
          : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
      }`}>
        {r.brandingActive ? "Branded" : "Not Branded"}
      </span>
    )
  },
  { key: "brandCampaignID", label: "Campaign", width: "w-32", sortable: true, render: (r) =>
      <span className="text-foreground">{r.brandCampaignID ?? "—"}</span>
  },
  { key: "exposureDailyQuota", label: "Daily Quota", width: "w-28", align: "right", sortable: true, render: (r) =>
      <span className="text-foreground">{Number(r.exposureDailyQuota ?? 0)}h</span>
  },
  { key: "exposureHoursAccrued", label: "Accrued", width: "w-24", align: "right", sortable: true, render: (r) =>
      <span className="text-foreground">{Math.round(Number(r.exposureHoursAccrued ?? 0))}h</span>
  },
  { key: "exposureHoursTarget", label: "Target", width: "w-24", align: "right", sortable: true, render: (r) =>
      <span className="text-foreground">{Math.round(Number(r.exposureHoursTarget ?? 0))}h</span>
  },
  { key: "healthScore", label: "Health", width: "w-24", align: "right", sortable: true, render: (r) => (
      <span className={`font-semibold ${
        (r.healthScore ?? 0) >= 80 ? "text-green-600 dark:text-green-400"
        : (r.healthScore ?? 0) >= 60 ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400"
      }`}>
        {Math.round(Number(r.healthScore ?? 0))}%
      </span>
    )
  },
];

export function TrainsetMatrix({
  items,
  columns,
  loading = false,
  onSelect,
  onBulk,
}: Props) {
  const cols = columns && columns.length ? columns : DEFAULT_COLUMNS;
  const rows: TrainsetBranding[] = Array.isArray(items) ? items : [];

  const [sortKey, setSortKey] = useState<ColumnKey>("trainname");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const needle = q.toLowerCase();
    return rows.filter((r) =>
      (r.trainname || "").toLowerCase().includes(needle) ||
      (r.trainID || "").toLowerCase().includes(needle) ||
      String(r.brandCampaignID ?? "").toLowerCase().includes(needle),
    );
  }, [rows, q]);

  const sorted = useMemo(() => {
    const data = [...filtered];
    const col = cols.find((c) => c.key === sortKey);
    if (!col || !col.sortable) return data;

    data.sort((a, b) => {
      const av = (a as any)[sortKey];
      const bv = (b as any)[sortKey];
      // normalize undefined/null
      const A = av ?? "";
      const B = bv ?? "";
      if (typeof A === "number" && typeof B === "number") {
        return sortDir === "asc" ? A - B : B - A;
      }
      return sortDir === "asc"
        ? String(A).localeCompare(String(B))
        : String(B).localeCompare(String(A));
    });

    return data;
  }, [filtered, cols, sortKey, sortDir]);

  return (
    <div className="glass-card p-0 overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary/15 flex items-center justify-center">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="text-sm text-muted-foreground">
            {rows.length} trainsets • {sorted.length} shown
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search trains, IDs, campaign…"
              className="h-9 w-56 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            type="button"
            onClick={onBulk}
            className="h-9 px-3 rounded-md border border-border text-foreground hover:bg-muted/50 inline-flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Bulk actions
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px]">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              {cols.map((c) => (
                <th
                  key={c.key}
                  className={`px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide select-none ${c.width ?? ""}`}
                >
                  <button
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={() => {
                      if (!c.sortable) return;
                      if (sortKey === c.key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                      else {
                        setSortKey(c.key);
                        setSortDir("asc");
                      }
                    }}
                  >
                    {c.label}
                    {c.sortable && sortKey === c.key && (
                      sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </th>
              ))}
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase w-20">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {cols.map((c) => (
                    <td key={c.key} className="px-4 py-3">
                      <div className="h-4 rounded bg-muted" />
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="h-8 w-16 rounded bg-muted" />
                  </td>
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={cols.length + 1} className="px-4 py-10 text-center">
                  <div className="mx-auto w-fit px-3 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs">
                    No trainsets match your filters
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Try clearing the search or adjusting constraints.
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr
                  key={row.trainID}
                  className="hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={() => onSelect?.(row.trainID)}
                >
                  {cols.map((c) => {
                    const content = c.render ? c.render(row) : (row as any)[c.key];
                    const align = c.align ?? "left";
                    return (
                      <td key={c.key} className={`px-4 py-3 text-sm ${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"}`}>
                        {content ?? "—"}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="h-8 px-2 rounded-md border border-border text-foreground hover:bg-muted/50 inline-flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect?.(row.trainID);
                      }}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TrainsetMatrix;
