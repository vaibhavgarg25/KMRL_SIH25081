"use client";
import { Constraints } from "./types";

export function PlannerForm({
  defaults,
  onChange,
  onGenerate,
  onReset,
  busy,
}: {
  defaults?: Constraints;
  onChange?: (next: Constraints) => void;
  onGenerate?: () => void;
  onReset?: () => void;
  busy?: boolean;
}) {
  return (
    <div className="glass-card p-6 space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Configuration</h2>

      <div className="space-y-3">
        <label className="block text-sm">
          <span className="text-foreground">Min Health (%)</span>
          <input
            type="number"
            defaultValue={defaults?.minHealth ?? 70}
            onChange={(e) => onChange?.({ ...defaults, minHealth: Number(e.target.value) })}
            className="w-full h-11 mt-1 px-3 rounded-md bg-background border border-border"
          />
        </label>

        <label className="block text-sm">
          <span className="text-foreground">Max Daily Quota (hrs)</span>
          <input
            type="number"
            defaultValue={defaults?.maxDailyQuota ?? 6}
            onChange={(e) => onChange?.({ ...defaults, maxDailyQuota: Number(e.target.value) })}
            className="w-full h-11 mt-1 px-3 rounded-md bg-background border border-border"
          />
        </label>

        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            defaultChecked={!!defaults?.depotFairness}
            onChange={(e) => onChange?.({ ...defaults, depotFairness: e.target.checked })}
          />
          <span className="text-foreground">Depot fairness</span>
        </label>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={onGenerate}
          disabled={busy}
          className="flex-1 h-11 rounded-md bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {busy ? "Generating…" : "Generate Allocation"}
        </button>
        <button
          onClick={onReset}
          className="h-11 px-3 rounded-md bg-red-600 text-white hover:bg-red-700"
          title="Reset"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
