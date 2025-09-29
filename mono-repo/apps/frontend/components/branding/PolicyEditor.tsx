"use client";
import { Constraints } from "./types";

export function PolicyEditor({
  blackoutDates = [],
  onAddDate,
  onRemoveDate,
}: {
  blackoutDates?: string[];
  onAddDate?: (iso: string) => void;
  onRemoveDate?: (iso: string) => void;
}) {
  return (
    <div className="glass-card p-6 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Policy & Blackouts</h3>
      <div className="flex items-center gap-2">
        <input
          type="date"
          className="h-10 px-3 rounded-md bg-background border border-border"
          onChange={(e) => e.target.value && onAddDate?.(e.target.value)}
        />
        <span className="text-xs text-muted-foreground">Add blackout date</span>
      </div>
      {!!blackoutDates.length && (
        <div className="flex flex-wrap gap-2">
          {blackoutDates.map((d) => (
            <span key={d} className="px-2 py-1 rounded-full bg-surface border border-border text-xs">
              {new Date(d).toLocaleDateString()}
              <button className="ml-2 text-muted-foreground hover:text-foreground" onClick={() => onRemoveDate?.(d)}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
