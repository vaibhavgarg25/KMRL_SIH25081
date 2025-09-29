// app/dashboard/branding/overview/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  PlannerHeader,
  KpiSummary,
  CampaignSelector,
  ExposureForecast,
  RiskPanel,
  ValidationBanner,
  OnboardingTips,
  BudgetWidget,
  PlannerDashboard,
  type Campaign,
  type TrainsetBranding,
  type AllocationResult,
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

export default function BrandingOverviewPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [branding, setBranding] = useState<TrainsetBranding[]>([]);
  const [allocation, setAllocation] = useState<AllocationResult | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"clean" | "dirty" | "error">("clean");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/api/train/getTrains`, { cache: "no-store" });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        if (!mounted) return;
        const trains: any[] = Array.isArray(data) ? data : data?.data || [];
        const mapped = trains.map(mapTrainToBranding);
        setBranding(mapped);

        // Minimal campaigns rollup (derive from existing campaign IDs on trains)
        const byCampaign: Record<string, number> = {};
        mapped.forEach((t) => {
          const id = t.brandCampaignID || "default";
          byCampaign[id] = (byCampaign[id] || 0) + 1;
        });
        const camps: Campaign[] = Object.keys(byCampaign).map((id, i) => ({
          id,
          name: id === "default" ? "General Branding" : `Campaign ${id}`,
          startDate: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
          endDate: new Date(Date.now() + 21 * 24 * 3600 * 1000).toISOString(),
          exposureTargetHours: 1000 + i * 250,
          exposureDailyQuota: 8,
        }));
        setCampaigns(camps);
        setSelectedCampaignId(camps[0]?.id ?? null);
        setStatus("clean");
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load branding data");
        setStatus("error");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const { kpis, risks, computedAllocation }: {
    kpis: { label: string; value: string; hint?: string }[];
    risks: { kind: "over" | "under" | "conflict"; text: string }[];
    computedAllocation: AllocationResult;
  } = useMemo(() => {
    const ts = branding;
    const total = ts.length;
    const active = ts.filter((t) => t.brandingActive);
    const brandedPct = total ? Math.round((active.length / total) * 100) : 0;

    const totalAccrued = ts.reduce((s, t) => s + (t.exposureHoursAccrued ?? 0), 0);
    const totalTarget = ts.reduce((s, t) => s + (t.exposureHoursTarget ?? 0), 0);
    const progressPct = totalTarget > 0 ? Math.min(100, Math.round((totalAccrued / totalTarget) * 100)) : 0;

    const dailyQuotas = active.map((t) => t.exposureDailyQuota ?? 0);
    const avgDaily = dailyQuotas.length ? Math.round(dailyQuotas.reduce((a, b) => a + b, 0) / dailyQuotas.length) : 0;

    const kpiItems = [
      { label: "Exposure progress", value: `${progressPct}%`, hint: `${totalAccrued}h / ${totalTarget}h` },
      { label: "Trains branded", value: `${brandedPct}%`, hint: `${active.length} / ${total}` },
      { label: "Avg daily exposure", value: `${avgDaily}h`, hint: "active trainsets" },
    ];

    const r: { kind: "over" | "under" | "conflict"; text: string }[] = [];
    active.forEach((t) => {
      const accrued = t.exposureHoursAccrued ?? 0;
      const target = t.exposureHoursTarget ?? 0;
      const quota = t.exposureDailyQuota ?? 0;
      if (target > 0 && accrued > target) r.push({ kind: "over", text: `${t.trainname ?? t.trainID} over target` });
      if (quota === 0) r.push({ kind: "conflict", text: `${t.trainname ?? t.trainID} has 0 daily quota` });
      if ((t.healthScore ?? 100) < 60) r.push({ kind: "under", text: `${t.trainname ?? t.trainID} low health` });
    });

    const totalForecastHours = active.reduce((s, t) => s + (t.exposureDailyQuota ?? 0), 0) * 7;
    const expectedPacing = totalTarget > 0 ? Math.min(100, Math.round(((totalAccrued + totalForecastHours) / totalTarget) * 100)) : 0;

    return {
      kpis: kpiItems,
      risks: r,
      computedAllocation: {
        trainsets: ts,
        totalForecastHours,
        expectedPacing,
      },
    };
  }, [branding]);

  const handleCampaignSelect = useCallback((id: string) => {
    setSelectedCampaignId(id);
  }, []);

  const handlePublish = useCallback(async () => {
    try {
      setStatus("dirty");
      // Stub: hook up to your backend publish endpoint if available
      await new Promise((r) => setTimeout(r, 600));
      setStatus("clean");
    } catch (e) {
      setStatus("error");
    }
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="glass-card p-6 animate-pulse h-28" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-4">
            <div className="glass-card p-6 h-40 animate-pulse" />
            <div className="glass-card p-6 h-40 animate-pulse" />
          </div>
          <div className="lg:col-span-8 space-y-4">
            <div className="glass-card p-6 h-40 animate-pulse" />
            <div className="glass-card p-6 h-40 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="glass-card p-6">
          <div className="text-lg font-semibold text-foreground mb-2">Branding Overview</div>
          <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <PlannerHeader
        title="Branding Planner — Overview"
        campaigns={campaigns}
        selectedId={selectedCampaignId ?? undefined}
        onSelect={handleCampaignSelect}
        kpis={kpis}
      />

      <PlannerDashboard
        left={
          <div className="space-y-6">
            <CampaignSelector
              campaigns={campaigns}
              value={selectedCampaignId ?? undefined}
              onChange={handleCampaignSelect}
            />
            <BudgetWidget />
            <OnboardingTips />
          </div>
        }
        right={
          <div className="space-y-6">
            <KpiSummary items={kpis} />
            <ExposureForecast result={computedAllocation} />
            <RiskPanel items={risks} />
            <ValidationBanner status={status} onPublish={handlePublish} />
          </div>
        }
      />
    </div>
  );
}
