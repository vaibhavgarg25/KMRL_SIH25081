"use client";

import { useEffect, useMemo, useState } from "react";
import { Shield } from "lucide-react";

export type ConstraintSettings = {
  minHealth: number;        // % threshold (0–100)
  maxDailyExposure: number; // hours/day
  blackoutDates: string[];  // ISO date strings
};

const DEFAULT_CONSTRAINTS: ConstraintSettings = {
  minHealth: 70,
  maxDailyExposure: 12,
  blackoutDates: [],
};

type Props = {
  settings?: Partial<ConstraintSettings>;
  onChange?: (settings: ConstraintSettings) => void;
};

export function ConstraintEditor({ settings, onChange }: Props) {
  const merged: ConstraintSettings = useMemo(() => {
    const s = settings ?? {};
    return {
      minHealth: s.minHealth ?? DEFAULT_CONSTRAINTS.minHealth,
      maxDailyExposure: s.maxDailyExposure ?? DEFAULT_CONSTRAINTS.maxDailyExposure,
      blackoutDates: s.blackoutDates ?? DEFAULT_CONSTRAINTS.blackoutDates,
    };
  }, [settings]);

  const [local, setLocal] = useState<ConstraintSettings>(merged);

  // sync local when parent updates
  useEffect(() => {
    setLocal(merged);
  }, [merged]);

  // notify parent
  useEffect(() => {
    onChange?.(local);
  }, [local, onChange]);

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-md bg-primary/15 flex items-center justify-center">
          <Shield className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Constraints</h3>
      </div>

      {/* Minimum Health */}
      <LabeledSlider
        label="Minimum Health"
        value={local.minHealth}
        min={0}
        max={100}
        step={1}
        suffix="%"
        onChange={(v) => setLocal((prev) => ({ ...prev, minHealth: v }))}
      />

      {/* Max Daily Exposure */}
      <LabeledSlider
        label="Max Daily Exposure"
        value={local.maxDailyExposure}
        min={1}
        max={24}
        step={1}
        suffix="h"
        onChange={(v) => setLocal((prev) => ({ ...prev, maxDailyExposure: v }))}
      />

      {/* Blackout Dates */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-foreground">Blackout Dates</div>
        <input
          type="date"
          className="w-full h-10 rounded-md border border-border bg-background text-foreground px-2"
          onChange={(e) => {
            if (!e.target.value) return;
            setLocal((prev) => ({
              ...prev,
              blackoutDates: [...prev.blackoutDates, e.target.value],
            }));
          }}
        />
        {local.blackoutDates.length > 0 && (
          <ul className="text-xs text-muted-foreground space-y-1">
            {local.blackoutDates.map((d, idx) => (
              <li key={idx} className="flex items-center justify-between">
                {d}
                <button
                  type="button"
                  className="text-rose-500 hover:underline"
                  onClick={() =>
                    setLocal((prev) => ({
                      ...prev,
                      blackoutDates: prev.blackoutDates.filter((x) => x !== d),
                    }))
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LabeledSlider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-medium">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
        aria-label={label}
      />
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{min}</span>
        <span>
          {max}
          {suffix}
        </span>
      </div>
    </div>
  );
}

export default ConstraintEditor;
