"use client";
import { Campaign } from "./types";

export function CampaignSelector({
  campaigns,
  value,
  onChange,
}: {
  campaigns: Campaign[];
  value?: string | null;
  onChange?: (id: string) => void;
}) {
  const selected = campaigns.find((c) => c.id === value);
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Campaign</h3>
        <select
          value={value ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
          className="h-10 rounded-md bg-background border border-border px-3 text-sm"
        >
          <option value="" disabled>
            Select…
          </option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {selected ? (
        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
          <div>
            <div className="font-medium text-foreground">Start</div>
            <div>{new Date(selected.startDate).toLocaleDateString()}</div>
          </div>
          <div>
            <div className="font-medium text-foreground">End</div>
            <div>{new Date(selected.endDate).toLocaleDateString()}</div>
          </div>
          <div>
            <div className="font-medium text-foreground">Budget</div>
            <div>₹ {selected.budget?.toLocaleString() ?? "—"}</div>
          </div>
          <div>
            <div className="font-medium text-foreground">Target (hrs)</div>
            <div>{selected.exposureTargetHours ?? "—"}</div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">Pick a campaign to view details.</div>
      )}
    </div>
  );
}
