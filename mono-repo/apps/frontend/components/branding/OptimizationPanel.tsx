"use client";

import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

export type OptimizationSettings = {
  algorithm: "greedy" | "annealing" | "ga";
  weights: {
    visibilityWeight: number;   // 0..1
    healthPenalty: number;      // 0..1
    diversityBonus: number;     // 0..1
  };
  params: {
    iterations: number;         // >= 1
    temperature: number;        // 0..10 (if annealing)
    population: number;         // GA only
  };
};

const DEFAULT_SETTINGS: OptimizationSettings = {
  algorithm: "greedy",
  weights: {
    visibilityWeight: 0.6,
    healthPenalty: 0.2,
    diversityBonus: 0.2,
  },
  params: {
    iterations: 200,
    temperature: 3,
    population: 30,
  },
};

type Props = {
  /** Optional external value. If omitted, the panel manages its own state safely. */
  settings?: Partial<OptimizationSettings>;
  /** Notified whenever local state changes. */
  onChange?: (settings: OptimizationSettings) => void;
};

export function OptimizationPanel({ settings, onChange }: Props) {
  // Merge provided settings with defaults safely
  const merged: OptimizationSettings = useMemo(() => {
    const s = settings ?? {};
    return {
      algorithm: s.algorithm ?? DEFAULT_SETTINGS.algorithm,
      weights: {
        visibilityWeight:
          s.weights?.visibilityWeight ?? DEFAULT_SETTINGS.weights.visibilityWeight,
        healthPenalty:
          s.weights?.healthPenalty ?? DEFAULT_SETTINGS.weights.healthPenalty,
        diversityBonus:
          s.weights?.diversityBonus ?? DEFAULT_SETTINGS.weights.diversityBonus,
      },
      params: {
        iterations: s.params?.iterations ?? DEFAULT_SETTINGS.params.iterations,
        temperature: s.params?.temperature ?? DEFAULT_SETTINGS.params.temperature,
        population: s.params?.population ?? DEFAULT_SETTINGS.params.population,
      },
    };
  }, [settings]);

  // Local state (so the panel works even with no props)
  const [local, setLocal] = useState<OptimizationSettings>(merged);

  // Keep local in sync if parent changes settings
  useEffect(() => {
    setLocal(merged);
  }, [merged]);

  // Notify parent (if provided)
  useEffect(() => {
    onChange?.(local);
  }, [local, onChange]);

  const setWeight = (k: keyof OptimizationSettings["weights"], v: number) =>
    setLocal((prev) => ({
      ...prev,
      weights: { ...prev.weights, [k]: clamp01(v) },
    }));

  const setParam = (k: keyof OptimizationSettings["params"], v: number) =>
    setLocal((prev) => ({
      ...prev,
      params: { ...prev.params, [k]: v },
    }));

  const setAlgo = (algo: OptimizationSettings["algorithm"]) =>
    setLocal((prev) => ({ ...prev, algorithm: algo }));

  const weightRows: Array<{
    key: keyof OptimizationSettings["weights"];
    label: string;
    hint?: string;
  }> = [
    { key: "visibilityWeight", label: "Visibility weight", hint: "More exposure bias" },
    { key: "healthPenalty", label: "Health penalty", hint: "Avoid low-health trains" },
    { key: "diversityBonus", label: "Diversity bonus", hint: "Spread across depots/routes" },
  ];

  return (
    <div className="glass-card p-6 space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-md bg-primary/15 flex items-center justify-center">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Optimization Model</h3>
      </div>

      {/* Algorithm */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-foreground">Algorithm</div>
        <div className="grid grid-cols-3 gap-2">
          {(["greedy", "annealing", "ga"] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAlgo(a)}
              className={`h-9 rounded-md border text-sm ${
                local.algorithm === a
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "bg-surface text-foreground border-border hover:bg-muted/50"
              }`}
              title={algoHint(a)}
            >
              {labelAlgo(a)}
            </button>
          ))}
        </div>
      </div>

      {/* Weights */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-foreground">Weights</div>
        <div className="space-y-3">
          {weightRows.map((row) => {
            const val = local.weights[row.key] ?? 0; // safe
            return (
              <div key={row.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="text-foreground font-medium">{(val * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={val}
                  onChange={(e) => setWeight(row.key, Number(e.target.value))}
                  className="w-full accent-primary"
                  aria-label={row.label}
                />
                {row.hint && <div className="text-[11px] text-muted-foreground">{row.hint}</div>}
              </div>
            );
          })}
        </div>
        <div className="text-[11px] text-muted-foreground">
          Tip: keep total near 1.0; the engine normalizes if needed.
        </div>
      </div>

      {/* Parameters */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-foreground">Parameters</div>

        {/* Iterations */}
        <LabeledNumber
          label="Iterations"
          value={local.params.iterations}
          min={50}
          max={5000}
          step={50}
          onChange={(v) => setParam("iterations", v)}
        />

        {/* Temperature (annealing only) */}
        {local.algorithm === "annealing" && (
          <LabeledNumber
            label="Temperature"
            value={local.params.temperature}
            min={0}
            max={10}
            step={0.5}
            onChange={(v) => setParam("temperature", v)}
          />
        )}

        {/* Population (GA only) */}
        {local.algorithm === "ga" && (
          <LabeledNumber
            label="Population"
            value={local.params.population}
            min={10}
            max={200}
            step={5}
            onChange={(v) => setParam("population", v)}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- helpers & tiny subcomponent ---------- */

function clamp01(x: number) {
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function labelAlgo(a: OptimizationSettings["algorithm"]) {
  switch (a) {
    case "greedy":
      return "Greedy";
    case "annealing":
      return "Annealing";
    case "ga":
      return "Genetic";
  }
}

function algoHint(a: OptimizationSettings["algorithm"]) {
  switch (a) {
    case "greedy":
      return "Fast, decent results";
    case "annealing":
      return "Escapes local optima";
    case "ga":
      return "Explore/discover diverse sets";
  }
}

function LabeledNumber({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-medium">{value}</span>
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
        <span>{max}</span>
      </div>
    </div>
  );
}

export default OptimizationPanel;
