"use client";
export function SensitivityHeatmap() {
  return (
    <div className="glass-card p-6">
      <div className="text-sm font-semibold mb-3">Sensitivity (weights → outcome)</div>
      <div className="h-48 rounded-md bg-surface border border-border grid place-items-center text-muted-foreground">
        Heatmap goes here
      </div>
    </div>
  );
}
