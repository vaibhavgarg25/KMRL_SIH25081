"use client";

import React, { useEffect, useState, Suspense } from "react";
import { KpiTile } from "@/components/KpiTile";
import { RecommendationCard } from "@/components/RecommendationCard";
import { BayView } from "@/components/BayView";
import CircularProgress from "@/components/CircularProgress";
import { fetchTrainsets, type Trainset } from "@/lib/mock-data";
import { daysUntil } from "@/lib/utils";
// use absolute alias to match rest of file
import { Sidebar, SidebarBody, SidebarLink } from "@/components/Sidebar";

import { IconBrandTabler } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
// import all lucide icons you use
import { BarChart3Icon, Calendar, Train, History, Settings, Upload } from "lucide-react";
import { useRouter } from "next/navigation";

export function SidebarDemo() {
  const links = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: (
        <IconBrandTabler className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Train",
      href: "/dashboard/trainsets",
      icon: (
        <Train className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Planner",
      href: "/dashboard/planner",
      icon: (
        <Calendar className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Simulation",
      href: "/dashboard/simulation",
      icon: (
        <BarChart3Icon className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "History",
      href: "/dashboard/history",
      icon: (
        <History className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Settings",
      href: "/dashboard/settings",
      icon: (
        <Settings className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Upload",
      href: "/dashboard/csv-template",
      icon: (
        <Upload className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
  ];
  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn(
        "flex h-screen w-full bg-[var(--bg)] text-[var(--fg)]",
        "h-[60vh]" // for your use case, use `h-screen` instead of `h-[60vh]`
      )}
    >
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          
        </SidebarBody>
      </Sidebar>
      <Dashboard />
    </div>
  );
}
export const Logo = () => {
  return (
    <a
      href="#"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black"
    >
      <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium whitespace-pre text-black dark:text-white"
      >
        Kochi Metro Rail
      </motion.span>
    </a>
  );
};
export const LogoIcon = () => {
  return (
    <a
      href="#"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black"
    >
      <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white" />
    </a>
  );
};



export default function Dashboard() {
  const router = useRouter();
  const [trainsets, setTrainsets] = useState<Trainset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload popup state
  const [showUploadsPopup, setShowUploadsPopup] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchTrainsets();
        if (!mounted) return;
        setTrainsets(data || []);
        setError(null);
      } catch (e) {
        console.error(e);
        setError("Failed to load trainsets");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Show the uploads popup once after loading — simulates "show after login / first visit"
  useEffect(() => {
  if (loading) return;
  setShowUploadsPopup(true); // show after each sign-in/session load
}, [loading]);


  // helper to accept string | Date
  const daysUntilSafe = (d?: string | Date | null) => {
    if (!d) return Infinity;
    if (typeof d === "string") return daysUntil(d);
    if (d instanceof Date) return daysUntil(d.toISOString());
    return daysUntil(String(d));
  };

  if (loading) {
    return (
      <div className="min-h-screen app-gradient p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-6 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen app-gradient p-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-rose-600">Error</h3>
          <p className="text-muted">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-teal-600 text-white rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // -------------------------
  // Health score calculation
  // -------------------------
  function computeRawHealth(trainset: any): number {
    const safeNum = (v: any, cap = 100) =>
      typeof v === "number" && !Number.isNaN(v)
        ? Math.max(0, Math.min(v, cap))
        : 0;

    // fitness (boolean -> percent)
    const fitnessFlags = [
      trainset.fitness?.rollingStockFitnessStatus,
      trainset.fitness?.signallingFitnessStatus,
      trainset.fitness?.telecomFitnessStatus,
    ];
    const fitnessPopulated = fitnessFlags.filter(
      (f) => f !== undefined && f !== null
    ).length;
    const fitnessTrue = fitnessFlags.filter((f) => f === true).length;
    const fitnessPercent = fitnessPopulated
      ? (fitnessTrue / fitnessPopulated) * 100
      : 50;

    // expiry penalty
    const expiryDates = [
      trainset.fitness?.rollingStockFitnessExpiryDate,
      trainset.fitness?.signallingFitnessExpiryDate,
      trainset.fitness?.telecomFitnessExpiryDate,
    ].filter(Boolean);
    const minExpiryDays = expiryDates.length
      ? Math.min(...expiryDates.map((d: any) => daysUntilSafe(d)))
      : Infinity;
    let expiryPenalty = 0;
    if (minExpiryDays <= 0) expiryPenalty = 40;
    else if (minExpiryDays <= 7) expiryPenalty = 20;
    else if (minExpiryDays <= 30) expiryPenalty = 10;

    // jobs penalty
    const openJobs = trainset.jobCardStatus?.openJobCards ?? 0;
    const jobPenalty = Math.min(openJobs * 3, 30);

    // mileage score (decay)
    const mileage = safeNum(trainset.mileage?.totalMileageKM ?? 0, 1_000_000);
    const mileageScore = 100 * (1 / (1 + Math.pow(mileage / 180000, 1.2)));

    // wear score
    const brake = safeNum(trainset.mileage?.brakepadWearPercent ?? 0, 100);
    const hvac = safeNum(trainset.mileage?.hvacWearPercent ?? 0, 100);
    const wearScore =
      brake || hvac ? Math.max(0, 100 - (brake + hvac) / 2) : 70;

    // other signals
    const cleaningPenalty = trainset.cleaning?.cleaningRequired ? 10 : 0;
    const brandingBoost = trainset.branding?.brandingActive ? 4 : 0;
    const opScore = safeNum(trainset.operations?.score ?? 70, 100);

    const raw =
      0.28 * fitnessPercent +
      0.22 * mileageScore +
      0.2 * wearScore +
      0.2 * opScore +
      0.1 * 100 -
      expiryPenalty -
      jobPenalty -
      cleaningPenalty +
      brandingBoost;

    return Math.round(Math.max(0, Math.min(100, raw)));
  }

  function mapToDisplayHealth(raw: number): number {
    // shift 0..100 → 70..90
    return Math.round(70 + (raw / 100) * 20);
  }

  function getHealthScore(trainset: any): number {
    return mapToDisplayHealth(computeRawHealth(trainset));
  }

  function getRecommendationReason(trainset: Trainset): string {
    const openJobs = trainset.jobCardStatus?.openJobCards ?? 0;
    const totalMileage = trainset.mileage?.totalMileageKM ?? 0;
    const soon = [
      trainset.fitness?.rollingStockFitnessExpiryDate,
      trainset.fitness?.signallingFitnessExpiryDate,
      trainset.fitness?.telecomFitnessExpiryDate,
    ]
      .filter(Boolean)
      .map((d: any) => daysUntilSafe(d))
      .reduce((a, b) => Math.min(a, b), Infinity);

    if (soon <= 0) return `Fitness expired — ground until recertified`;
    if (openJobs > 5) return `${openJobs} open jobs — prioritize maintenance`;
    if (totalMileage > 250000)
      return `High mileage (${Math.round(totalMileage)} km) — inspect`;

    return `${openJobs} open jobs • ${Math.round(
      totalMileage
    ).toLocaleString()} km`;
  }

  const totalTrainsets = trainsets.length;
  const inServiceTrains = trainsets.filter(
    (t) =>
      t.operations?.operationalStatus?.toLowerCase() === "in_service" ||
      (t as any).status === "Active"
  ).length;
  const maintenanceTrainsets = trainsets.filter(
    (t) =>
      t.operations?.operationalStatus?.toLowerCase() === "under_maintenance" ||
      (t as any).status === "Maintenance"
  ).length;
  const standbyTrainsets = trainsets.filter(
    (t) =>
      t.operations?.operationalStatus?.toLowerCase() === "standby" ||
      (t as any).status === "Standby"
  ).length;

  const availabilityRate =
    totalTrainsets > 0
      ? Math.round((inServiceTrains / totalTrainsets) * 100)
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

  const fitnessExpiringSoon = trainsets.filter((t) => {
    if (!t.fitness?.rollingStockFitnessExpiryDate) return false;
    const d = daysUntilSafe(t.fitness.rollingStockFitnessExpiryDate as any);
    return d <= 30 && d > 0;
  }).length;

  const topTrains = trainsets
    .map((t) => ({
      t,
      raw: computeRawHealth(t),
      health: getHealthScore(t),
      reason: getRecommendationReason(t),
    }))
    .sort((a, b) => b.raw - a.raw)
    .slice(0, 13);

  const topRecommendations = topTrains
    .slice(0, 3)
    .map((x) => ({
      trainset: x.t,
      reason: x.reason,
      confidence: x.health,
    }));

  // Upload popup handlers
  const closeUploadsPopup = () => {
    setShowUploadsPopup(false);
    if (dontShowAgain) {
      try {
        window.localStorage.setItem("dashboard_seen_uploads_popup_v1", "1");
      } catch {
        // ignore storage error
      }
    }
  };

  const goToUploads = () => {
    try {
      window.localStorage.setItem("dashboard_seen_uploads_popup_v1", "1");
    } catch {}
    router.push("/dashboard/csv-template");
  };

return (
  <>
    {/* Uploads popup — simple, theme-aligned */}
{showUploadsPopup && (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 6 }}
    transition={{ duration: 0.18, ease: "easeOut" }}
    className="fixed right-6 bottom-6 z-50 w-[22rem] max-w-[90vw]"
    role="dialog"
    aria-modal="true"
    aria-label="Uploads helper"
  >
    <div className="rounded-xl border border-border bg-[var(--bg)] shadow-md">
      <div className="flex items-start gap-3 p-4">
        {/* Neutral icon chip */}
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
          📤
        </div>

        <div className="flex-1">
          <h4 className="font-semibold text-text">Start here: Uploads</h4>
          <p className="mt-0.5 text-sm leading-snug text-muted">
            Upload CSVs/templates to improve recommendations.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={closeUploadsPopup}
              className="px-3 py-1.5 text-sm rounded-md border border-border text-text hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              Close
            </button>
            <button
              onClick={goToUploads}
              className="cta-primary px-3 py-1.5 text-sm rounded-md"
            >
              Go to Uploads
            </button>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
)}



    {/* KPI Row */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
  <KpiTile
    title="Fleet Availability"
    value={`${availabilityRate}%`}
    subtitle={`${inServiceTrains}/${totalTrainsets} in service`}
    progress={availabilityRate}
    sparklineData={[10, 20, 34, 28, 52, 46]}
    trend={availabilityRate >= 85 ? "up" : availabilityRate >= 75 ? "neutral" : "down"}
    action={<button className="cta-primary px-3 py-1 text-sm">Manage</button>}
  />
  <KpiTile
    title="Average Mileage"
    value={`${avgMileage.toLocaleString()}`}
    subtitle="km per trainset"
    sparklineData={[180000, 185000, 182000, 188000, 187655]}
    trend={avgMileage < 200000 ? "up" : avgMileage < 350000 ? "neutral" : "down"}
  />
  <KpiTile
    title="In Maintenance"
    value={maintenanceTrainsets}
    subtitle={`${totalTrainsets > 0 ? Math.round((maintenanceTrainsets / totalTrainsets) * 100) : 0}% of fleet`}
    progress={Math.min(100, (maintenanceTrainsets / Math.max(1, totalTrainsets)) * 100)}
    trend="down"
  />
  <KpiTile
    title="Open Job Cards"
    value={totalOpenJobs}
    subtitle={`${fitnessExpiringSoon} fitness expiring`}
    sparklineData={[0, 3, 6, 8, 5, 12]}
    trend={totalOpenJobs > 10 ? "up" : "neutral"}
  />
</div>


      {/* Main */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Trains */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-semibold text-text">
            Recommended for Commissioning
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {topTrains.map((item, idx) => (
              <div
                key={item.t.trainID || idx}
                className="glass-card p-4 flex flex-col items-center"
              >
                <CircularProgress value={item.health} size={72} thickness={8} />

                <div className="mt-3 text-center w-full">
                  <div className="font-semibold text-text">
                    {item.t.trainname}
                  </div>
                  <div className="text-xs text-muted">
                    Train {item.t.trainID} • Bay{" "}
                    {item.t.stabling?.bayPositionID ??
                      (item.t as any).stabling_position ??
                      "N/A"}
                  </div>
                  <div className="mt-2 text-sm text-muted">{item.reason}</div>
                </div>
              </div>
            ))}
          </div>

          
        </div>

        {/* Right Column */}
        <div className="space-y-6">

          <div className="glass-card p-4">
            <div className="font-medium">Fleet Distribution</div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-sm text-muted">In Service</div>
                <div className="font-semibold text-teal-600 text-xl">
                  {inServiceTrains}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted">Maintenance</div>
                <div className="font-semibold text-rose-500 text-xl">
                  {maintenanceTrainsets}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted">Standby</div>
                <div className="font-semibold text-muted text-xl">
                  {standbyTrainsets}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="font-medium text-text">Bay View</div>
              <div className="text-xs text-muted">Live</div>
            </div>
            <BayView trainsets={trainsets} layout="2x8" />
          </div>

        </div>
      </div>
    </>
  );
}
