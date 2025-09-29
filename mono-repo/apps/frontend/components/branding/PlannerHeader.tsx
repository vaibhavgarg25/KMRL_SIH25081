"use client";
import { Campaign } from "./types";
import { Sparkles } from "lucide-react";

export function PlannerHeader({
  title = "Branding Planner",
  campaigns = [],
  selectedId,
  onSelect,
  kpis,
}: {
  title?: string;
  campaigns: Campaign[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  kpis?: { label: string; value: string }[];
}) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">Tweak exposure math & allocation in real time</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedId ?? ""}
            onChange={(e) => onSelect?.(e.target.value)}
            className="h-10 rounded-md bg-background border border-border px-3 text-sm"
          >
            <option value="" disabled>
              Select campaign
            </option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!!kpis?.length && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          {kpis.map((k) => (
            <div key={k.label} className="p-4 rounded-md bg-surface border border-border text-center">
              <div className="text-xs text-muted-foreground">{k.label}</div>
              <div className="text-2xl font-semibold text-foreground">{k.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
