"use client";
export function PresetLibrary({ presets = [] as { id: string; name: string }[], onLoad }: { presets?: { id: string; name: string }[]; onLoad?: (id: string) => void }) {
  return (
    <div className="glass-card p-6">
      <div className="text-sm font-semibold mb-3">Presets</div>
      {!presets.length ? (
        <div className="text-sm text-muted-foreground">No presets yet.</div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {presets.map((p) => (
            <button key={p.id} onClick={() => onLoad?.(p.id)} className="px-3 py-2 rounded-md bg-surface border border-border text-left hover:bg-muted/40">
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
