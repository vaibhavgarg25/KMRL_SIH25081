"use client"

import { useMemo, useState } from "react"
import { ChevronUp, ChevronDown, Eye } from "lucide-react"
import type { Trainset } from "@/lib/mock-data"
import { daysUntil, sortByKey } from "@/lib/utils"

// react-icons for lively table
import { FaTools, FaShieldAlt } from "react-icons/fa"
import { FiTruck, FiActivity } from "react-icons/fi"

/* ---------------------------
   Health calculation (shared)
   --------------------------- */

function daysUntilSafe(d: string | Date) {
  try {
    return daysUntil(d as any)
  } catch {
    return Number.POSITIVE_INFINITY
  }
}

/** NEW: 0–100 health model (no forced 70–90 band) */
function computeRawHealth(trainset: any): number {
  const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
  const safeNum = (v: any, def = 0) => (typeof v === "number" && !Number.isNaN(v) ? v : def)

  // Inputs
  const fitnessFlags = [
    trainset.fitness?.rollingStockFitnessStatus,
    trainset.fitness?.signallingFitnessStatus,
    trainset.fitness?.telecomFitnessStatus,
  ]

  const expiryDaysArr = [
    trainset.fitness?.rollingStockFitnessExpiryDate,
    trainset.fitness?.signallingFitnessExpiryDate,
    trainset.fitness?.telecomFitnessExpiryDate,
  ]
    .filter(Boolean)
    .map((d: any) => daysUntilSafe(d))
  const soonestDays = expiryDaysArr.length ? Math.min(...expiryDaysArr) : Number.POSITIVE_INFINITY

  const openJobs = safeNum(trainset.jobCardStatus?.openJobCards, 0)
  const mileageKM = Math.max(0, Math.min(safeNum(trainset.mileage?.totalMileageKM, 0), 1_000_000))
  const brakeWear = safeNum(trainset.mileage?.brakepadWearPercent, NaN)
  const hvacWear = safeNum(trainset.mileage?.hvacWearPercent, NaN)
  const opsScore = Math.max(0, Math.min(100, safeNum(trainset.operations?.score, 70)))
  const cleaningPenalty = trainset.cleaning?.cleaningRequired ? 5 : 0 // lighter nudge
  const brandingBoost = trainset.branding?.brandingActive ? 2 : 0     // tiny nudge

  // Sub-scores (0..100)
  const fitnessStatusScore = (() => {
    const populated = fitnessFlags.filter((f) => f !== undefined && f !== null) as boolean[]
    if (!populated.length) return 50
    const good = populated.filter(Boolean).length
    return (good / populated.length) * 100
  })()

  const certificateTimeScore = (() => {
    if (!Number.isFinite(soonestDays)) return 50
    if (soonestDays <= 0) return 0
    return Math.min(100, clamp01(soonestDays / 180) * 100) // ≥180d => 100
  })()

  const mileageScore = 100 * (1 / (1 + Math.pow(mileageKM / 250_000, 1.4))) // smooth decay after ~250k

  const wearScore = (() => {
    const vals = [brakeWear, hvacWear].filter((x) => Number.isFinite(x)) as number[]
    if (!vals.length) return 70 // neutral when missing
    const avgWear = vals.reduce((a, b) => a + b, 0) / vals.length
    return clamp01(1 - avgWear / 100) * 100 // 100 = no wear
  })()

  const jobsBurdenScore = Math.max(0, 100 - 8 * Math.max(0, openJobs)) // -8 per job (0..100)

  // Weights sum to 1.0 (meaningful balance)
  const W = {
    fitnessFlags: 0.25,
    certTime: 0.20,
    wear: 0.20,
    ops: 0.15,
    mileage: 0.15,
    jobs: 0.05,
  }

  let raw =
    W.fitnessFlags * fitnessStatusScore +
    W.certTime * certificateTimeScore +
    W.wear * wearScore +
    W.ops * opsScore +
    W.mileage * mileageScore +
    W.jobs * jobsBurdenScore

  // Minor adjustments
  raw = raw - cleaningPenalty + brandingBoost

  // Clamp and round
  return Math.round(Math.max(0, Math.min(100, raw)))
}

/** NEW: identity mapping (display the true 0–100 score) */
function mapToDisplayHealth(raw: number): number {
  return Math.round(raw)
}

function getHealthScore(trainset: any): number {
  return mapToDisplayHealth(computeRawHealth(trainset))
}

function getRecommendationReason(trainset: Trainset): string {
  const openJobs = trainset.jobCardStatus?.openJobCards ?? 0
  const totalMileage = trainset.mileage?.totalMileageKM ?? 0
  const soon = [
    trainset.fitness?.rollingStockFitnessExpiryDate,
    trainset.fitness?.signallingFitnessExpiryDate,
    trainset.fitness?.telecomFitnessExpiryDate,
  ]
    .filter(Boolean)
    .map((d: any) => daysUntilSafe(d))
    .reduce((a, b) => Math.min(a, b), Number.POSITIVE_INFINITY)

  if (soon <= 0) return `⚠️ Fitness expired — ground until recertified`
  if (openJobs > 5) return `🛠 ${openJobs} open jobs — prioritize maintenance`
  if (totalMileage > 250000) return `🔍 High mileage (${Math.round(totalMileage)} km) — inspect`

  return `ℹ️ ${openJobs} open jobs • ${Math.round(totalMileage).toLocaleString()} km`
}

/* ---------------------------
   Column definitions
   --------------------------- */

type SortKey = keyof Trainset | "fitnessExpiry" | "openJobs" | "health_score" | "reason"
type SortDirection = "asc" | "desc"

const COLUMNS: { key: SortKey; label: string; visible: boolean; width?: string }[] = [
  { key: "id", label: "ID", visible: true, width: "w-24" },
  { key: "trainname", label: "Train Name", visible: true, width: "w-48" },
  { key: "status", label: "Status", visible: true, width: "w-32" },
  { key: "health_score", label: "Health", visible: true, width: "w-24" },
  { key: "openJobs", label: "Jobs", visible: true, width: "w-20" },
  { key: "mileage", label: "Mileage", visible: true, width: "w-32" },
  { key: "stabling_position", label: "Bay", visible: true, width: "w-24" },
  { key: "reason", label: "Reason", visible: true, width: "flex-1" },
]

/* ---------------------------
   Component
   --------------------------- */

export function CompactTable({
  data,
  onRowClick,
}: { data: (Trainset & { health_score?: number })[]; onRowClick?: (t: Trainset) => void }) {
  const [sortKey, setSortKey] = useState<SortKey>("id")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [visibleColumns] = useState(
    COLUMNS.reduce((acc, col) => ({ ...acc, [col.key]: col.visible }), {} as Record<SortKey, boolean>),
  )

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const enriched = useMemo(() => {
    return data.map((t) => ({
      ...t,
      health_score: t.health_score ?? getHealthScore(t),
      reason: getRecommendationReason(t),
    }))
  }, [data])

  const sorted = useMemo(() => {
    let copy = [...enriched]
    if (sortKey === "openJobs") {
      copy.sort((a, b) => {
        const aj = a.jobCardStatus?.openJobCards || 0
        const bj = b.jobCardStatus?.openJobCards || 0
        return sortDirection === "asc" ? aj - bj : bj - aj
      })
    } else if (sortKey === "health_score") {
      copy.sort((a, b) =>
        sortDirection === "asc"
          ? (a.health_score ?? 0) - (b.health_score ?? 0)
          : (b.health_score ?? 0) - (a.health_score ?? 0),
      )
    } else if (sortKey === "reason") {
      copy.sort((a, b) =>
        sortDirection === "asc"
          ? (a.reason || "").localeCompare(b.reason || "")
          : (b.reason || "").localeCompare(a.reason || ""),
      )
    } else {
      copy = sortByKey(copy, sortKey as keyof Trainset, sortDirection)
    }
    return copy
  }, [enriched, sortKey, sortDirection])

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return sorted.slice(start, start + itemsPerPage)
  }, [sorted, currentPage])

  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage))

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
    else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">No trainset data available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          {/* Header: use neutral/background so it sits on layout */}
          <thead>
            <tr className="border-b border-border bg-background">
              {COLUMNS.map(
                (col) =>
                  visibleColumns[col.key] && (
                    <th
                      key={String(col.key)}
                      onClick={() => toggleSort(col.key)}
                      className={`px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide select-none cursor-pointer hover:bg-muted/50 transition-colors ${col.width || ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{col.label}</span>
                        {sortKey === col.key && (
                          <div className="text-foreground">
                            {sortDirection === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </div>
                        )}
                      </div>
                    </th>
                  ),
              )}
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase w-16">
                Actions
              </th>
            </tr>
          </thead>

          {/* Body: removed the separate white/dark block background so table blends with layout */}
          <tbody className="divide-y divide-border bg-background">
            {paginated.map((row) => {
              const health = row.health_score ?? 0
              const openJobs = row.jobCardStatus?.openJobCards ?? 0
              const mileage = row.mileage?.totalMileageKM ?? 0
              const currentStatus = row.operations?.operationalStatus || row.status || "Unknown"

              return (
                <tr
                  key={row.trainID}
                  onClick={() => onRowClick?.(row)}
                  className="hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  {/* ID */}
                  {visibleColumns.id && (
                    <td className="px-6 py-4 text-sm font-medium text-foreground w-24">
                      {row.trainID}
                    </td>
                  )}

                  {/* Train name (fixed) */}
                  {visibleColumns.trainname && (
                    <td className="px-6 py-4 text-sm text-foreground w-48 truncate">
                      {row.trainname || `Train ${row.trainID}`}
                    </td>
                  )}

                  {/* Status — colored icon + colored pill */}
                  {visibleColumns.status && (
                    <td className="px-6 py-4 text-sm w-32">
                      <div className="inline-flex items-center gap-2">
                        <FiActivity
                          className={`w-4 h-4 ${
                            currentStatus.toLowerCase().includes("service") || currentStatus.toLowerCase().includes("active")
                              ? "text-green-600 dark:text-green-400"
                              : currentStatus.toLowerCase().includes("maintenance")
                                ? "text-yellow-600 dark:text-yellow-400"
                                : currentStatus.toLowerCase().includes("standby")
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-red-600 dark:text-red-400"
                          }`}
                        />
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            currentStatus.toLowerCase().includes("service") || currentStatus.toLowerCase().includes("active")
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : currentStatus.toLowerCase().includes("maintenance")
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                : currentStatus.toLowerCase().includes("standby")
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {currentStatus}
                        </span>
                      </div>
                    </td>
                  )}

                  {/* Health — colored shield and % */}
                  {visibleColumns.health_score && (
                    <td className="px-6 py-4 text-sm w-24">
                      <div className="inline-flex items-center gap-2">
                        <FaShieldAlt
                          className={
                            health >= 80
                              ? "text-green-600 dark:text-green-400"
                              : health >= 60
                                ? "text-yellow-600 dark:text-yellow-400"
                                : "text-red-600 dark:text-red-400"
                          }
                        />
                        <span
                          className={`font-semibold ${
                            health >= 80
                              ? "text-green-600 dark:text-green-400"
                              : health >= 60
                                ? "text-yellow-600 dark:text-yellow-400"
                                : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {health}%
                        </span>
                      </div>
                    </td>
                  )}

                  {/* Jobs — colored */}
                  {visibleColumns.openJobs && (
                    <td className="px-6 py-4 text-sm w-20">
                      <div className="inline-flex items-center gap-2">
                        <FaTools
                          className={`w-4 h-4 ${
                            openJobs === 0
                              ? "text-green-600 dark:text-green-400"
                              : openJobs <= 3
                                ? "text-yellow-600 dark:text-yellow-400"
                                : "text-red-600 dark:text-red-400"
                          }`}
                        />
                        <span
                          className={`font-semibold ${
                            openJobs === 0
                              ? "text-green-600 dark:text-green-400"
                              : openJobs <= 3
                                ? "text-yellow-600 dark:text-yellow-400"
                                : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {openJobs}
                        </span>
                      </div>
                    </td>
                  )}

                  {/* Mileage — keep blue icon */}
                  {visibleColumns.mileage && (
                    <td className="px-6 py-4 text-sm text-muted-foreground w-32">
                      <div className="inline-flex items-center gap-2">
                        <FiTruck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-medium text-foreground">{mileage.toLocaleString()} km</span>
                      </div>
                    </td>
                  )}

                  {/* Bay */}
                  {visibleColumns.stabling_position && (
                    <td className="px-6 py-4 text-sm text-muted-foreground w-24">
                      {row.stabling?.bayPositionID ?? row.stabling_position ?? "N/A"}
                    </td>
                  )}

                  {/* Reason */}
                  {visibleColumns.reason && (
                    <td className="px-6 py-4 text-sm text-foreground flex-1">
                      <div className="truncate max-w-xs" title={row.reason}>
                        {row.reason}
                      </div>
                    </td>
                  )}

                  {/* Actions */}
                  <td className="px-6 py-4 w-16">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onRowClick?.(row)
                      }}
                      className="p-2 rounded-md hover:bg-muted/50 transition-colors"
                      title="View details"
                    >
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination: keep neutral background so it sits on layout */}
      <div className="px-6 py-3 border-t border-border flex items-center justify-between bg-background">
        <div className="text-sm text-muted-foreground">
          Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, sorted.length)} of {sorted.length} results
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 border border-border rounded-md text-sm bg-card text-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1 border border-border rounded-md text-sm bg-card text-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
