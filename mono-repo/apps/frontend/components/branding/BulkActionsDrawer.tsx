"use client";
import { TrainsetBranding } from "./types";

export function BulkActionsDrawer({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (action: { setActive?: boolean; setCampaignID?: string; setDailyQuota?: number }) => void;
}) {
  if (!open) return null;

  let activeVal: boolean | undefined;
  let campaignVal = "";
  let quotaVal: number | undefined;

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-0 top-0 h-full w-full max-w-md bg-card border-r border-border p-6 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Bulk Actions</h3>

        <div className="space-y-3 text-sm">
          <label className="flex items-center justify-between p-3 rounded-md bg-surface border border-border">
            <span>Set Branding Active</span>
            <select
              defaultValue=""
              onChange={(e) => (activeVal = e.target.value === "true")}
              className="h-9 px-2 rounded-md bg-background border border-border"
            >
              <option value="">—</option>
              <option value="true">Enable</option>
              <option value="false">Disable</option>
            </select>
          </label>

          <label className="flex items-center justify-between p-3 rounded-md bg-surface border border-border">
            <span>Assign Campaign ID</span>
            <input
              placeholder="e.g. CMP-2025-04"
              onChange={(e) => (campaignVal = e.target.value)}
              className="h-9 w-40 px-2 rounded-md bg-background border border-border"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-md bg-surface border border-border">
            <span>Set Daily Quota (hrs)</span>
            <input
              type="number"
              onChange={(e) => (quotaVal = Number(e.target.value))}
              className="h-9 w-24 px-2 rounded-md bg-background border border-border"
            />
          </label>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            className="flex-1 h-11 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => onApply({ setActive: activeVal, setCampaignID: campaignVal || undefined, setDailyQuota: quotaVal })}
          >
            Apply
          </button>
          <button className="h-11 px-3 rounded-md border border-border hover:bg-muted/50" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
