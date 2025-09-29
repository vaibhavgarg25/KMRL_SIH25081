"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PlannerHeader,
  PlannerDashboard,
  TrainsetMatrix,
  OptimizationPanel,
  ConstraintEditor,
  PolicyEditor,
  BulkActionsDrawer,
  TrainDetailDrawer,
  type TrainsetBranding,
} from "@/components/branding";

const API_BASE = process.env.NEXT_PUBLIC_CLIENT_URL || "http://localhost:8000";

function mapTrainToBranding(train: any): TrainsetBranding {
  return {
    trainID: String(train.trainID || train.id || ""),
    trainname: train.trainname || `Train-${train.trainID || train.id || ""}`,
    brandingActive: Boolean(train.branding?.brandingActive ?? false),
    brandCampaignID: train.branding?.brandCampaignID ?? null,
    exposureHoursAccrued: Number(train.branding?.exposureHoursAccrued ?? 0),
    exposureHoursTarget: Number(train.branding?.exposureHoursTarget ?? 0),
    exposureDailyQuota: Number(train.branding?.exposureDailyQuota ?? 0),
    healthScore: Number(train.operations?.healthScore ?? 100),
  };
}

export default function BrandingAllocationPage() {
  const [trainsets, setTrainsets] = useState<TrainsetBranding[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [openBulk, setOpenBulk] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/train/getTrains`, { cache: "no-store" });
        const data = await res.json();
        if (!mounted) return;
        const trains: any[] = Array.isArray(data) ? data : data?.data || [];
        setTrainsets(trains.map(mapTrainToBranding));
      } catch {
        // soft-fail to empty list
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const headerKpis = useMemo(() => {
    const active = trainsets.filter((t) => t.brandingActive).length;
    const total = trainsets.length || 1;
    const brandedPct = Math.round((active / total) * 100);
    return [
      { label: "Branded", value: `${brandedPct}%`, hint: `${active}/${total}` },
      {
        label: "Avg Daily Quota",
        value: `${Math.round(trainsets.reduce((s, t) => s + (t.exposureDailyQuota ?? 0), 0) / (total || 1))}h`,
      },
    ];
  }, [trainsets]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <PlannerHeader title="Branding — Allocation" campaigns={[]} kpis={headerKpis} />
      <PlannerDashboard
        left={
          <div className="space-y-6">
            <OptimizationPanel />
            <ConstraintEditor />
            <PolicyEditor />
          </div>
        }
        right={
          <div className="space-y-6">
            <TrainsetMatrix
              items={trainsets}
              onSelect={(id) => setSelected(id)}
              onBulk={() => setOpenBulk(true)}
            />
          </div>
        }
      />

      <TrainDetailDrawer
        open={!!selected}
        train={trainsets.find((t) => t.trainID === selected)}
        onClose={() => setSelected(null)}
        onChange={(updated) =>
          setTrainsets((prev) => prev.map((t) => (t.trainID === updated.trainID ? updated : t)))
        }
      />

      <BulkActionsDrawer
        open={openBulk}
        onClose={() => setOpenBulk(false)}
        onApply={(changes) =>
          setTrainsets((prev) =>
            prev.map((t) => ({
              ...t,
              brandingActive: changes.brandingActive ?? t.brandingActive,
              brandCampaignID: changes.brandCampaignID ?? t.brandCampaignID,
              exposureDailyQuota:
                typeof changes.exposureDailyQuota === "number" ? changes.exposureDailyQuota : t.exposureDailyQuota,
            }))
          )
        }
      />
    </div>
  );
}

