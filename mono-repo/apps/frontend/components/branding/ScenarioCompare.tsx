"use client";
import { Scenario } from "./types";

export function ScenarioCompare({ scenarios }: { scenarios: Scenario[] }) {
  if (!scenarios.length) {
    return <div className="glass-card p-6 text-sm text-muted-foreground">Create scenarios to compare outcomes.</div>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {scenarios.map((s) => (
        <div key={s.id} className="glass-card p-6">
          <div className="text-sm font-semibold">{s.name}</div>
          <div className="mt-2 text-xs text-muted-foreground space-y-1">
            <div>Visibility: {Math.round(s.weights.visibilityWeight * 100)}%</div>
            <div>Health penalty: {Math.round(s.weights.healthPenalty * 100)}%</div>
            <div>Diversity bonus: {Math.round(s.weights.diversityBonus * 100)}%</div>
            <div>Min health: {s.constraints.minHealth ?? 70}%</div>
          </div>
        </div>
      ))}
    </div>
  );
}
