"use client";
import { TrainsetBranding } from "./types";

export function TrainDetailDrawer({ open, onClose, data }: { open: boolean; onClose: () => void; data?: TrainsetBranding }) {
  if (!open || !data) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-card border-l border-border p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{data.trainname ?? data.trainID}</h3>
          <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">Close</button>
        </div>
        <div className="space-y-4 text-sm">
          <div className="p-4 rounded-md bg-surface border border-border">
            <div className="font-medium">Branding</div>
            <div>Active: {data.brandingActive ? "Yes" : "No"}</div>
            <div>Campaign: {data.brandCampaignID ?? "—"}</div>
          </div>
          <div className="p-4 rounded-md bg-surface border border-border">
            <div className="font-medium">Exposure</div>
            <div>Accrued: {data.exposureHoursAccrued ?? 0}h</div>
            <div>Target: {data.exposureHoursTarget ?? 0}h</div>
            <div>Daily Quota: {data.exposureDailyQuota ?? 0}h</div>
          </div>
          <div className="p-4 rounded-md bg-surface border border-border">
            <div className="font-medium">Health</div>
            <div>{data.healthScore ?? "—"}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
