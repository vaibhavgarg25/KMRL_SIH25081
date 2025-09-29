"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Copy, Trash2, Check, Edit3 } from "lucide-react";

export type BrandingScenario = {
  id: string;
  name: string;
  description?: string;
  // knobs you might tweak per scenario (extend as needed)
  visibilityWeight?: number;
  healthPenaltyWeight?: number;
  diversityBonusWeight?: number;
  pacingAggressiveness?: number;
};

type Props = {
  scenarios?: BrandingScenario[];
  activeId?: string | null;
  onChange?: (next: BrandingScenario[], activeId: string) => void;
};

const mkScenario = (seed?: Partial<BrandingScenario>): BrandingScenario => ({
  id: seed?.id ?? crypto.randomUUID(),
  name: seed?.name ?? "New Scenario",
  description: seed?.description ?? "",
  visibilityWeight: seed?.visibilityWeight ?? 0.5,
  healthPenaltyWeight: seed?.healthPenaltyWeight ?? 0.3,
  diversityBonusWeight: seed?.diversityBonusWeight ?? 0.2,
  pacingAggressiveness: seed?.pacingAggressiveness ?? 0.5,
});

export default function ScenarioBuilder({
  scenarios,
  activeId,
  onChange,
}: Props) {
  // Normalize inputs
  const initialList = useMemo<BrandingScenario[]>(
    () => (Array.isArray(scenarios) && scenarios.length ? scenarios : [mkScenario({ name: "Base Plan" })]),
    [scenarios]
  );

  const [list, setList] = useState<BrandingScenario[]>(initialList);
  const [active, setActive] = useState<string>(
    activeId && initialList.some(s => s.id === activeId) ? activeId : initialList[0].id
  );
  const current = useMemo(() => list.find(s => s.id === active), [list, active]);

  // propagate up when list/active changes
  useEffect(() => {
    onChange?.(list, active);
  }, [list, active, onChange]);

  const select = (id: string) => {
    if (!list.some(s => s.id === id)) return;
    setActive(id);
  };

  const add = () => {
    const s = mkScenario();
    setList(prev => [...prev, s]);
    setActive(s.id);
  };

  const duplicate = (id: string) => {
    const src = list.find(s => s.id === id);
    if (!src) return;
    const copy = mkScenario({
      ...src,
      id: undefined,
      name: `${src.name} (copy)`,
    });
    setList(prev => [...prev, copy]);
    setActive(copy.id);
  };

  const remove = (id: string) => {
    if (list.length <= 1) return; // keep at least one
    const next = list.filter(s => s.id !== id);
    setList(next);
    if (active === id) setActive(next[0]?.id ?? mkScenario().id);
  };

  const rename = (id: string, name: string) => {
    setList(prev => prev.map(s => (s.id === id ? { ...s, name: name.trim() || s.name } : s)));
  };

  const updateKnob = <K extends keyof BrandingScenario>(key: K, val: BrandingScenario[K]) => {
    setList(prev => prev.map(s => (s.id === active ? { ...s, [key]: val } : s)));
  };

  return (
    <div className="glass-card p-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="font-semibold text-foreground">Scenarios</div>
        <div className="flex items-center gap-2">
          <button onClick={add} className="h-8 px-3 rounded-md border border-border hover:bg-muted/50 inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> New
          </button>
          <button
            onClick={() => current && duplicate(current.id)}
            className="h-8 px-3 rounded-md border border-border hover:bg-muted/50 inline-flex items-center gap-2"
            disabled={!current}
          >
            <Copy className="w-4 h-4" /> Duplicate
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12">
        {/* Left list */}
        <div className="md:col-span-5 lg:col-span-4 border-r border-border">
          <ul className="max-h-96 overflow-auto divide-y divide-border">
            {list.map(s => {
              const isActive = s.id === active;
              return (
                <li
                  key={s.id}
                  className={`px-4 py-3 cursor-pointer hover:bg-muted/40 ${isActive ? "bg-primary/5" : ""}`}
                  onClick={() => select(s.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="truncate">
                      <div className="text-sm font-medium text-foreground truncate">{s.name ?? "Untitled"}</div>
                      {s.description ? (
                        <div className="text-xs text-muted-foreground truncate">{s.description}</div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted/50"
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = prompt("Rename scenario", s.name || "Scenario");
                          if (next !== null) rename(s.id, next);
                        }}
                        title="Rename"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted/50 disabled:opacity-40"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (list.length <= 1) return;
                          if (confirm(`Delete "${s.name || "Scenario"}"?`)) remove(s.id);
                        }}
                        title="Delete"
                        disabled={list.length <= 1}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Right editor */}
        <div className="md:col-span-7 lg:col-span-8 p-4">
          {!current ? (
            <div className="text-sm text-muted-foreground">No scenario selected.</div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Name</label>
                <input
                  className="mt-1 w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
                  value={current.name ?? ""}
                  onChange={(e) => rename(current.id, e.target.value)}
                  placeholder="Scenario name"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <textarea
                  className="mt-1 w-full rounded-md border border-border bg-background p-3 text-sm"
                  value={current.description ?? ""}
                  onChange={(e) => updateKnob("description", e.target.value)}
                  placeholder="Short notes about this scenario"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Knob
                  label="Visibility Weight"
                  value={current.visibilityWeight ?? 0}
                  onChange={(v) => updateKnob("visibilityWeight", v)}
                />
                <Knob
                  label="Health Penalty"
                  value={current.healthPenaltyWeight ?? 0}
                  onChange={(v) => updateKnob("healthPenaltyWeight", v)}
                />
                <Knob
                  label="Diversity Bonus"
                  value={current.diversityBonusWeight ?? 0}
                  onChange={(v) => updateKnob("diversityBonusWeight", v)}
                />
                <Knob
                  label="Pacing Aggressiveness"
                  value={current.pacingAggressiveness ?? 0}
                  onChange={(v) => updateKnob("pacingAggressiveness", v)}
                />
              </div>

              <div className="flex items-center justify-end">
                <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="w-3.5 h-3.5" />
                  Autosaved
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Knob({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const v = Number.isFinite(value) ? value : 0;
  return (
    <div className="p-3 rounded-md border border-border">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="text-xs text-foreground font-semibold">{(v * 100).toFixed(0)}%</div>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={v}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
