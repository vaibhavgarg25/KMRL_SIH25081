"use client";
import { TrainsetBranding } from "./types";

export function TrainCard({ t, onToggle }: { t: TrainsetBranding; onToggle?: (v: boolean) => void }) {
  return (
    <div className="p-4 rounded-lg bg-surface border border-border">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{t.trainname ?? t.trainID}</div>
        <label className="text-xs inline-flex items-center gap-2">
          <input type="checkbox" checked={t.brandingActive} onChange={(e) => onToggle?.(e.target.checked)} />
          Active
        </label>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        Campaign: <span className="text-foreground">{t.brandCampaignID ?? "—"}</span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-xs text-muted-foreground">Accrued</div>
          <div className="text-sm font-semibold">{t.exposureHoursAccrued ?? 0}h</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Target</div>
          <div className="text-sm font-semibold">{t.exposureHoursTarget ?? 0}h</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Daily</div>
          <div className="text-sm font-semibold">{t.exposureDailyQuota ?? 0}h</div>
        </div>
      </div>
    </div>
  );
}
