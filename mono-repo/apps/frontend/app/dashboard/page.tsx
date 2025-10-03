"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { cn, daysUntil } from "@/lib/utils";
import { fetchTrainsets, type Trainset } from "@/lib/mock-data";
import { KOCHI_STATIONS } from "@/lib/stations";

import BayNetworkMap from "@/components/map/BayNetworkMap";
import CircularProgress from "@/components/CircularProgress";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";

/* ------------------ helpers ------------------ */
const daysUntilSafe = (d?: string | Date | null) => {
  if (!d) return Infinity;
  if (typeof d === "string") return daysUntil(d);
  if (d instanceof Date) return daysUntil(d.toISOString());
  return daysUntil(String(d));
};

function computeRawHealth(trainset: any): number {
  const safeNum = (v: any, def = 0) =>
    typeof v === "number" && !Number.isNaN(v) ? v : def;

  const jobs = safeNum(trainset.jobCardStatus?.openJobCards, 0);
  const mileage = safeNum(trainset.mileage?.totalMileageKM, 0);
  const ops = Math.max(0, Math.min(100, safeNum(trainset.operations?.score, 70)));
  const cleaningPenalty = trainset.cleaning?.cleaningRequired ? 5 : 0;
  const brandingBoost = trainset.branding?.brandingActive ? 2 : 0;

  let raw = 50 + ops * 0.4;
  raw -= Math.min(30, jobs * 2.2);
  raw -= Math.min(25, mileage / 12000);
  raw -= cleaningPenalty;
  raw += brandingBoost;

  return Math.round(Math.max(0, Math.min(100, raw)));
}

/* ------------------ page ------------------ */
export default function Dashboard() {
  const router = useRouter();
  const [trainsets, setTrainsets] = useState<Trainset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchTrainsets();
        if (!mounted) return;
        setTrainsets(data || []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /* -------- derived metrics -------- */
  const totalTrainsets = trainsets.length;

  const inService = trainsets.filter(
    (t) =>
      t.operations?.operationalStatus?.toLowerCase() === "in_service" ||
      (t as any).status === "Active"
  );
  const maintenance = trainsets.filter(
    (t) =>
      t.operations?.operationalStatus?.toLowerCase() === "under_maintenance" ||
      (t as any).status === "Maintenance"
  );
  const standby = trainsets.filter(
    (t) =>
      t.operations?.operationalStatus?.toLowerCase() === "standby" ||
      (t as any).status === "Standby"
  );

  const availabilityRate = totalTrainsets
    ? Math.round((inService.length / totalTrainsets) * 100)
    : 0;

  const avgMileage =
    totalTrainsets > 0
      ? Math.round(
          trainsets.reduce(
            (s, t) => s + (t.mileage?.mileageSinceLastServiceKM || 0),
            0
          ) / totalTrainsets
        )
      : 0;

  const totalOpenJobs = trainsets.reduce(
    (s, t) => s + (t.jobCardStatus?.openJobCards || 0),
    0
  );

  const roster = useMemo(
    () =>
      trainsets
        .map((t) => ({
          train: t,
          health: computeRawHealth(t),
          status: (t.operations?.operationalStatus || "").toLowerCase(),
        }))
        .sort((a, b) => b.health - a.health),
    [trainsets]
  );

  const fleetStatuses = [
    { label: "In Service", value: inService.length, color: "#22c55e" },
    { label: "Standby", value: standby.length, color: "#f59e0b" },
    { label: "Maintenance", value: maintenance.length, color: "#ef4444" },
  ];

  const jobCardBuckets = [
    {
      label: "0–2",
      value: trainsets.filter(
        (t) => (t.jobCardStatus?.openJobCards ?? 0) <= 2
      ).length,
      color: "#22c55e",
    },
    {
      label: "3–5",
      value: trainsets.filter((t) => {
        const n = t.jobCardStatus?.openJobCards ?? 0;
        return n >= 3 && n <= 5;
      }).length,
      color: "#f59e0b",
    },
    {
      label: "6+",
      value: trainsets.filter(
        (t) => (t.jobCardStatus?.openJobCards ?? 0) >= 6
      ).length,
      color: "#ef4444",
    },
  ];

  const fitnessBuckets = [
    {
      label: "≤7d",
      value: trainsets.filter(
        (t) =>
          daysUntilSafe(
            t.fitness?.rollingStockFitnessExpiryDate as any
          ) <= 7
      ).length,
      color: "#ef4444",
    },
    {
      label: "8–30d",
      value: trainsets.filter((t) => {
        const d = daysUntilSafe(
          t.fitness?.rollingStockFitnessExpiryDate as any
        );
        return d > 7 && d <= 30;
      }).length,
      color: "#f59e0b",
    },
    {
      label: ">30d",
      value: trainsets.filter(
        (t) =>
          daysUntilSafe(
            t.fitness?.rollingStockFitnessExpiryDate as any
          ) > 30
      ).length,
      color: "#22c55e",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      {/* ─────────────── Hero Row ─────────────── */}
      <section className="mx-auto max-w-7xl px-6 py-6 grid grid-cols-12 gap-6">
        {/* Map */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="col-span-12 lg:col-span-7 glass-card overflow-hidden"
        >
          <div className="p-4 border-b border-border flex justify-between">
            <h2 className="font-semibold text-lg">Metro Line View</h2>
            <span className="text-xs text-muted">Live train positions</span>
          </div>
          <BayNetworkMap
            stations={KOCHI_STATIONS}
            trainsets={trainsets}
            height={480}
          />
          <div className="flex gap-4 p-3 border-t border-border text-xs">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-emerald-500" /> In Service
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-amber-500" /> Standby
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-rose-500" /> Maintenance
            </span>
          </div>
        </motion.div>

        {/* Fleet Pulse */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="col-span-12 lg:col-span-5 glass-card p-6 flex flex-col items-center justify-center"
        >
          <div className="text-lg font-semibold mb-6">Fleet Pulse</div>

          <div className="relative w-64 h-64">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(#22c55e ${
                  availabilityRate * 3.6
                }deg, var(--muted) 0)`,
                mask: "radial-gradient(circle at center, transparent 60%, black 61%)",
                WebkitMask:
                  "radial-gradient(circle at center, transparent 60%, black 61%)",
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-5xl font-bold">{availabilityRate}%</div>
              <div className="text-sm opacity-70">Availability</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 w-full text-center text-sm">
            <div className="rounded-lg border border-border p-2">
              <div className="text-emerald-500 font-semibold">
                {inService.length}
              </div>
              <div className="opacity-70">In Service</div>
            </div>
            <div className="rounded-lg border border-border p-2">
              <div className="text-amber-500 font-semibold">{standby.length}</div>
              <div className="opacity-70">Standby</div>
            </div>
            <div className="rounded-lg border border-border p-2">
              <div className="text-rose-500 font-semibold">
                {maintenance.length}
              </div>
              <div className="opacity-70">Maintenance</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 w-full text-sm">
            <div className="rounded-lg border border-border p-3">
              <div className="opacity-70 mb-1">Avg mileage / train</div>
              <div className="text-xl font-semibold">
                {avgMileage.toLocaleString()} km
              </div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="opacity-70 mb-1">Open job cards</div>
              <div className="text-xl font-semibold">{totalOpenJobs}</div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─────────────── Insights Row ─────────────── */}
      <section className="mx-auto max-w-7xl px-6 pb-2 grid grid-cols-12 gap-6">
        {[
          { title: "Fleet Statuses", data: fleetStatuses },
          { title: "Job Cards (buckets)", data: jobCardBuckets },
          { title: "Fitness Expiry", data: fitnessBuckets },
        ].map((chart, idx) => (
          <div key={idx} className="col-span-12 md:col-span-4 glass-card p-4">
            <div className="font-semibold mb-2">{chart.title}</div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart.data} margin={{ bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="value"
                    radius={[6, 6, 0, 0]}
                    fillOpacity={0.85}
                  >
                    {chart.data.map((entry, i) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={entry.color}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </section>

      {/* ─────────────── Roster ─────────────── */}
      <section className="mx-auto max-w-7xl px-6 py-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Train Roster Overview</h2>
            <button
              onClick={() => router.push("/dashboard/trainsets")}
              className="px-3 py-1.5 rounded-md border border-border hover:bg-muted/40 text-sm"
            >
              View Full List
            </button>
          </div>

          {/* Summaries */}
          <div className="grid grid-cols-3 gap-6 text-center mb-6">
            <div>
              <div className="text-emerald-500 text-2xl font-bold">
                {roster.filter((r) => r.health >= 80).length}
              </div>
              <div className="opacity-70 text-sm">Excellent (80–100)</div>
            </div>
            <div>
              <div className="text-amber-500 text-2xl font-bold">
                {roster.filter((r) => r.health >= 50 && r.health < 80).length}
              </div>
              <div className="opacity-70 text-sm">Moderate (50–79)</div>
            </div>
            <div>
              <div className="text-rose-500 text-2xl font-bold">
                {roster.filter((r) => r.health < 50).length}
              </div>
              <div className="opacity-70 text-sm">Needs Attention</div>
            </div>
          </div>

          {/* Top trains */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {roster.slice(0, 6).map(({ train, health, status }) => (
              <motion.div
                key={train.trainID}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="p-4 rounded-lg border border-border flex items-center justify-between hover:bg-muted/40"
              >
                <div className="min-w-0 pr-3">
                  <div className="font-medium truncate">{train.trainname}</div>
                  <div className="text-xs opacity-70 truncate">
                    ID {train.trainID} • Bay{" "}
                    {train.stabling?.bayPositionID ?? "—"}
                  </div>
                  <div
                    className={cn(
                      "mt-1 text-xs px-2 py-0.5 rounded w-fit",
                      status === "in_service" &&
                        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                      status === "standby" &&
                        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                      status === "under_maintenance" &&
                        "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                    )}
                  >
                    {status ? status.replace("_", " ") : "unknown"}
                  </div>
                </div>
                <CircularProgress value={health} size={56} thickness={6} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
