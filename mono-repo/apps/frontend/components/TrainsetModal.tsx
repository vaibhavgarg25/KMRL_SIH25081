// components/TrainsetModal.tsx
"use client";

import {
  X,
  Sparkles,
  Calendar,
  Wrench,
  Gauge,
  MapPin,
  Briefcase,
  Layers,
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import type { Trainset } from "@/lib/mock-data";
import { daysUntil } from "@/lib/utils";
import { FaShieldAlt } from "react-icons/fa";

interface TrainsetModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainset: Trainset;
}

export function TrainsetModal({
  isOpen,
  onClose,
  trainset,
}: TrainsetModalProps) {
  // --- Hooks ---
  const [isMounted, setIsMounted] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const rawRef = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // --- Derived values (hooks must be called every render!) ---
  const safe = (v: any, fallback = "—") =>
    v !== undefined && v !== null && v !== "" ? v : fallback;
  const jobCardStatus = (trainset as any).jobCardStatus ?? {};
  const cleaningStatus = trainset.cleaning ?? {};
  const brandingStatus = trainset.branding ?? {};
  const maintenanceHistory = (trainset as any).maintenance_history ?? [];

  const formatDateIndian = (dateStr?: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-IN").format(d);
  };

  const daysUntilSafe = (d: any) => {
    try {
      const val = daysUntil(d);
      return typeof val === "number" ? val : Number.POSITIVE_INFINITY;
    } catch {
      const dt = d ? new Date(d) : null;
      if (!dt || isNaN(dt.getTime())) return Number.POSITIVE_INFINITY;
      return Math.floor((dt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    }
  };

  const expiryBadge = (dateStr?: string) => {
    if (!dateStr)
      return {
        text: "No date",
        cls: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
      };
    const days = daysUntilSafe(dateStr);
    if (days <= 0)
      return {
        text: "Expired",
        cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      };
    if (days <= 7)
      return {
        text: `${days}d`,
        cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      };
    if (days <= 30)
      return {
        text: `${days}d`,
        cls: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      };
    return {
      text: `${days}d`,
      cls: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    };
  };

  // -----------------------
  // UPDATED HEALTH FORMULA
  // -----------------------
  const computeRawHealth = (t: any) => {
    const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
    const safeNum = (v: any, def = 0) =>
      typeof v === "number" && !Number.isNaN(v) ? v : def;

    // Inputs
    const fitnessFlags = [
      t.fitness?.rollingStockFitnessStatus,
      t.fitness?.signallingFitnessStatus,
      t.fitness?.telecomFitnessStatus,
    ];

    const expiryDaysArr = [
      t.fitness?.rollingStockFitnessExpiryDate,
      t.fitness?.signallingFitnessExpiryDate,
      t.fitness?.telecomFitnessExpiryDate,
    ]
      .filter(Boolean)
      .map((d: any) => daysUntilSafe(d));
    const soonestDays = expiryDaysArr.length
      ? Math.min(...expiryDaysArr)
      : Number.POSITIVE_INFINITY;

    const openJobs = safeNum(t.jobCardStatus?.openJobCards, 0);
    const mileageKM = Math.max(
      0,
      Math.min(safeNum(t.mileage?.totalMileageKM, 0), 1_000_000),
    );
    const brakeWear = safeNum(t.mileage?.brakepadWearPercent, NaN);
    const hvacWear = safeNum(t.mileage?.hvacWearPercent, NaN);
    const opsScore = Math.max(0, Math.min(100, safeNum(t.operations?.score, 70)));
    const cleaningPenalty = t.cleaning?.cleaningRequired ? 5 : 0; // light nudge
    const brandingBoost = t.branding?.brandingActive ? 2 : 0; // tiny nudge

    // Sub-scores (0..100)
    const fitnessStatusScore = (() => {
      const populated = fitnessFlags.filter(
        (f) => f !== undefined && f !== null,
      ) as boolean[];
      if (!populated.length) return 50;
      const good = populated.filter(Boolean).length;
      return (good / populated.length) * 100;
    })();

    // 0 when expired, linear up to 100 at ≥180d remaining
    const certificateTimeScore = (() => {
      if (!Number.isFinite(soonestDays)) return 50;
      if (soonestDays <= 0) return 0;
      return Math.min(100, clamp01(soonestDays / 180) * 100);
    })();

    // Smooth decay after ~250k km
    const mileageScore =
      100 * (1 / (1 + Math.pow(mileageKM / 250_000, 1.4)));

    // 100 = no wear; missing → neutral 70
    const wearScore = (() => {
      const vals = [brakeWear, hvacWear].filter((x) =>
        Number.isFinite(x),
      ) as number[];
      if (!vals.length) return 70;
      const avgWear = vals.reduce((a, b) => a + b, 0) / vals.length;
      return clamp01(1 - avgWear / 100) * 100;
    })();

    // -8 points per open job (0..100)
    const jobsBurdenScore = Math.max(0, 100 - 8 * Math.max(0, openJobs));

    // Weights sum to 1.0
    const W = {
      fitnessFlags: 0.25,
      certTime: 0.20,
      wear: 0.20,
      ops: 0.15,
      mileage: 0.15,
      jobs: 0.05,
    };

    let raw =
      W.fitnessFlags * fitnessStatusScore +
      W.certTime * certificateTimeScore +
      W.wear * wearScore +
      W.ops * opsScore +
      W.mileage * mileageScore +
      W.jobs * jobsBurdenScore;

    // Small adjustments
    raw = raw - cleaningPenalty + brandingBoost;

    return Math.round(Math.max(0, Math.min(100, raw)));
  };

  // identity mapping (show 0–100 as-is)
  const mapToDisplayHealth = (raw: number) => Math.round(raw);
  const getHealthScore = (t: any) => mapToDisplayHealth(computeRawHealth(t));

  const rawHealth = useMemo(
    () => computeRawHealth(trainset as any),
    [trainset]
  );
  const healthScore = useMemo(
    () => getHealthScore(trainset as any),
    [trainset]
  );

  const recommendationReason = useMemo(() => {
    const openJobs = (trainset as any).jobCardStatus?.openJobCards ?? 0;
    const totalMileage = (trainset as any).mileage?.totalMileageKM ?? 0;
    const soon = [
      trainset.fitness?.rollingStockFitnessExpiryDate,
      trainset.fitness?.signallingFitnessExpiryDate,
      trainset.fitness?.telecomFitnessExpiryDate,
    ]
      .filter(Boolean)
      .map((d: any) => daysUntilSafe(d))
      .reduce((a, b) => Math.min(a, b), Number.POSITIVE_INFINITY);

    if (soon <= 0) return `Fitness expired — ground until recertified`;
    if (openJobs > 5) return `${openJobs} open jobs — prioritize maintenance`;
    if (totalMileage > 250000)
      return `High mileage (${Math.round(totalMileage)} km) — inspect`;
    return `${openJobs} open jobs • ${Math.round(totalMileage).toLocaleString()} km`;
  }, [trainset]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const copyRawJSON = async () => {
    try {
      const txt = JSON.stringify(trainset, null, 2);
      await navigator.clipboard.writeText(txt);
      if (!showRaw) setShowRaw(true);
    } catch (err) {
      console.error("copy raw failed", err);
    }
  };

  // --- Only return null after all hooks have run ---
  if (!isMounted || !isOpen) return null;

  // --- Render ---
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <div className="w-1 h-12 bg-gradient-to-b from-teal-500 to-teal-600 rounded-full" />
                <div className="min-w-0">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {safe(trainset.id, "")}
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium ml-2">
                      — {safe(trainset.trainname, "")}
                    </span>
                  </h2>

                  <div className="mt-2 flex items-center text-sm text-gray-600 dark:text-gray-400 gap-2">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">
                      {safe(trainset.stabling_position, "Location unknown")}
                    </span>
                    <span className="mx-2">•</span>
                    <span>
                      {safe(trainset.availability_confidence, "0")}%
                      availability
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                {safe(trainset.status, "Unknown")}
              </span>
              <button
                onClick={() => copyToClipboard(safe(trainset.id, ""))}
                className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                Copy ID
              </button>
              <button
                onClick={onClose}
                aria-label="Close modal"
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Fitness certificates */}
              <section className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Fitness Certificates
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Validity & expiry tracking
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyRawJSON}
                      className="px-3 py-1 text-sm bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors"
                    >
                      Copy raw JSON
                    </button>
                    <button
                      onClick={() => setShowRaw((s) => !s)}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      {showRaw ? "Hide raw" : "Show raw"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      key: "rollingStock",
                      title: "Rolling Stock",
                      status: trainset.fitness?.rollingStockFitnessStatus,
                      expiry: trainset.fitness?.rollingStockFitnessExpiryDate,
                    },
                    {
                      key: "signalling",
                      title: "Signalling",
                      status: trainset.fitness?.signallingFitnessStatus,
                      expiry: trainset.fitness?.signallingFitnessExpiryDate,
                    },
                    {
                      key: "telecom",
                      title: "Telecom",
                      status: trainset.fitness?.telecomFitnessStatus,
                      expiry: trainset.fitness?.telecomFitnessExpiryDate,
                    },
                  ].map((c) => (
                    <div
                      key={c.key}
                      className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-gray-100 dark:bg-gray-700">
                            <FaShieldAlt className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {c.title}
                          </div>
                        </div>

                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${expiryBadge(c.expiry).cls}`}
                        >
                          {expiryBadge(c.expiry).text}
                        </span>
                      </div>

                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Expires: {formatDateIndian(c.expiry)}
                      </div>

                      <div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            c.status
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {c.status ? "✓ Valid" : "✗ Invalid"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Health */}
              <section className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      📊 Health Score
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Combined (fitness, mileage, wear, ops, jobs, cleaning &
                      branding)
                    </p>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div>
                        <strong>Raw:</strong> {rawHealth}/100
                      </div>
                      <div>
                        <strong>Score:</strong> {healthScore}%
                      </div>
                      <div className="min-w-[160px]">
                        <strong>Reason:</strong> {recommendationReason}
                      </div>
                    </div>
                  </div>

                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <svg viewBox="0 0 36 36" className="w-20 h-20">
                      <path
                        d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="text-gray-200 dark:text-gray-700"
                      />
                      <path
                        d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray={`${((rawHealth / 100) * 100).toFixed(2)}, 100`}
                        strokeLinecap="round"
                        transform="rotate(-90 18 18)"
                        className="text-teal-600 dark:text-teal-400"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {healthScore}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Score
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden mb-3">
                    <div
                      role="progressbar"
                      aria-valuenow={healthScore}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      style={{
                        width: `${healthScore}%`,
                        height: "100%",
                        transition: "width 600ms ease",
                      }}
                      className="bg-gradient-to-r from-teal-500 to-teal-600"
                    />
                  </div>

                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <div>
                      Availability:{" "}
                      <strong>{trainset.availability_confidence ?? 0}%</strong>
                    </div>
                    <div>
                      Open Jobs:{" "}
                      <strong>{jobCardStatus.openJobCards ?? 0}</strong>
                    </div>
                  </div>
                </div>
              </section>

              {/* Mileage / Wear / Cleaning & Branding */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Mileage */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      Mileage
                    </div>
                    <Gauge className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="text-gray-600 dark:text-gray-400">
                      Total:{" "}
                      <strong className="text-gray-900 dark:text-gray-100">
                        {(
                          trainset.mileage?.totalMileageKM ?? 0
                        ).toLocaleString()}{" "}
                        km
                      </strong>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Since service:{" "}
                      <strong className="text-gray-900 dark:text-gray-100">
                        {(
                          trainset.mileage?.mileageSinceLastServiceKM ?? 0
                        ).toLocaleString()}{" "}
                        km
                      </strong>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Balance variance:{" "}
                      <strong className="text-gray-900 dark:text-gray-100">
                        {trainset.mileage?.mileageBalanceVariance ?? 0}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Wear */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      Wear
                    </div>
                    <Wrench className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="text-gray-600 dark:text-gray-400">
                      Brake pad wear:{" "}
                      <strong className="text-gray-900 dark:text-gray-100">
                        {trainset.mileage?.brakepadWearPercent ?? 0}%
                      </strong>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      HVAC wear:{" "}
                      <strong className="text-gray-900 dark:text-gray-100">
                        {trainset.mileage?.hvacWearPercent ?? 0}%
                      </strong>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Avg wear:{" "}
                      <strong className="text-gray-900 dark:text-gray-100">
                        {(
                          ((trainset.mileage?.brakepadWearPercent ?? 0) +
                            (trainset.mileage?.hvacWearPercent ?? 0)) /
                          ((trainset.mileage?.brakepadWearPercent ?? 0) ||
                          (trainset.mileage?.hvacWearPercent ?? 0)
                            ? 2
                            : 1)
                        ).toFixed(1)}
                        %
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Cleaning & Branding */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      Cleaning & Branding
                    </div>
                    <Sparkles className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="text-gray-600 dark:text-gray-400">
                      Last cleaned:{" "}
                      <strong className="text-gray-900 dark:text-gray-100">
                        {formatDateIndian(cleaningStatus.lastCleanedDate)}
                      </strong>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Cleaning required:{" "}
                      <strong className="text-gray-900 dark:text-gray-100">
                        {cleaningStatus.cleaningRequired ? "Yes" : "No"}
                      </strong>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Branding active:{" "}
                      <strong className="text-gray-900 dark:text-gray-100">
                        {brandingStatus.brandingActive ? "Yes" : "No"}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Job cards + Maintenance history */}
              <section className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Job Cards
                  </h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Last updated:{" "}
                    {formatDateIndian(jobCardStatus.lastJobCardUpdate)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="p-4 rounded-md border border-gray-200 dark:border-gray-700 text-center bg-white dark:bg-gray-800">
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Open
                    </div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {jobCardStatus.openJobCards ?? 0}
                    </div>
                  </div>
                  <div className="p-4 rounded-md border border-gray-200 dark:border-gray-700 text-center bg-white dark:bg-gray-800">
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Pending
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {jobCardStatus.pendingJobCards ?? 0}
                    </div>
                  </div>
                  <div className="p-4 rounded-md border border-gray-200 dark:border-gray-700 text-center bg-white dark:bg-gray-800">
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Closed
                    </div>
                    <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                      {jobCardStatus.closedJobCards ?? 0}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Maintenance history ({maintenanceHistory.length})
                  </h4>
                  {maintenanceHistory.length === 0 ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      No maintenance history available.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {maintenanceHistory
                        .slice(0, 12)
                        .map((h: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                          >
                            <div className="text-sm text-gray-600 dark:text-gray-400 w-28 flex-shrink-0">
                              {formatDateIndian(h.date)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 dark:text-gray-100">
                                {h.title ?? h.type ?? "Maintenance"}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                {h.note ?? h.result ?? h.summary ?? ""}
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500 flex-shrink-0">
                              {h.performedBy ?? ""}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Raw JSON */}
              {showRaw && (
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Raw JSON
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={copyRawJSON}
                        className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => setShowRaw(false)}
                        className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                  <pre
                    ref={rawRef}
                    className="text-xs dark:text-white max-h-60 overflow-auto bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700"
                  >
                    {JSON.stringify(trainset, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Aside column */}
            <aside className="space-y-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
                  <Briefcase className="w-4 h-4" /> Operations
                </h4>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Last maintenance:{" "}
                  {formatDateIndian(maintenanceHistory[0]?.date)}
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Status
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {safe(trainset.operations?.operationalStatus)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Reason
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {safe(trainset.operations?.reasonForStatus)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Ops score
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {safe((trainset.operations as any)?.score, "—")}
                    </div>
                  </div>

                  <button className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Schedule Maintenance
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
                  <Layers className="w-4 h-4" /> Stabling
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="text-gray-600 dark:text-gray-400">
                    Bay:{" "}
                    <strong className="text-gray-900 dark:text-gray-100">
                      {safe(trainset.stabling?.bayPositionID)}
                    </strong>
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Seq:{" "}
                    <strong className="text-gray-900 dark:text-gray-100">
                      {safe(trainset.stabling?.stablingSequenceOrder)}
                    </strong>
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Shunting moves:{" "}
                    <strong className="text-gray-900 dark:text-gray-100">
                      {safe(trainset.stabling?.shuntingMovesRequired)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
                  <Gauge className="w-4 h-4" /> Quick metrics
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="text-gray-600 dark:text-gray-400">
                    Branding active:{" "}
                    <strong className="text-gray-900 dark:text-gray-100">
                      {brandingStatus.brandingActive ? "Yes" : "No"}
                    </strong>
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Cleaning slot:{" "}
                    <strong className="text-gray-900 dark:text-gray-100">
                      {cleaningStatus.cleaningSlotStatus ?? "—"}
                    </strong>
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Cleaning crew:{" "}
                    <strong className="text-gray-900 dark:text-gray-100">
                      {cleaningStatus.cleaningCrewAssigned ?? "—"}
                    </strong>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default TrainsetModal;
