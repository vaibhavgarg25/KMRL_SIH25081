"use client";
import { AllocationResult } from "./types";

export function ExposureForecast({ result }: { result?: AllocationResult }) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Exposure Forecast</h3>
        <span className="text-xs text-muted-foreground">Deterministic (placeholder)</span>
      </div>
      <div className="h-40 rounded-md bg-surface border border-border grid place-items-center text-muted-foreground">
        Chart goes here
      </div>
      <div className="mt-3 text-sm text-muted-foreground">
        Total forecast hours: <span className="font-semibold text-foreground">{result?.totalForecastHours ?? 0}h</span>
      </div>
    </div>
  );
}
