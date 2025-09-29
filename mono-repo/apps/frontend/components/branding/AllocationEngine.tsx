"use client";
import { useState } from "react";

export function AllocationEngine({ onRun }: { onRun?: () => Promise<void> | void }) {
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    try {
      await onRun?.();
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">Allocation Engine</div>
          <div className="text-xs text-muted-foreground">Greedy / annealing / GA (plug your backend)</div>
        </div>
        <button
          onClick={run}
          disabled={running}
          className="h-10 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {running ? "Running…" : "Run Allocation"}
        </button>
      </div>
      {running && (
        <div className="mt-4 h-2 rounded bg-muted/50 overflow-hidden">
          <div className="h-full w-2/3 bg-primary animate-pulse" />
        </div>
      )}
    </div>
  );
}
