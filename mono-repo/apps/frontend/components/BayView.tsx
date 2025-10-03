"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Trainset } from "@/lib/mock-data";
import { fetchTrainsets } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

// Card for each bay
function BayCard({
  bay,
  train,
}: {
  bay: number | string;
  train?: Trainset | null;
}) {
  const status =
    train?.operations?.operationalStatus ??
    (train as any)?.status ??
    "unknown";

  const statusColor =
    status === "in_service" || status === "Active"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      : status === "standby" || status === "Standby"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      : status === "under_maintenance" || status === "Maintenance"
      ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
      : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";

  return (
    <div className="rounded-lg border border-border p-3 flex flex-col gap-2 bg-surface">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted">Bay</div>
        <div className="text-sm font-semibold text-foreground">
          {String(bay)}
        </div>
      </div>

      {train ? (
        <>
          <div className="text-sm font-medium text-foreground">
            {train.trainname}
          </div>
          <div
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs w-fit",
              statusColor
            )}
          >
            {String(status).replace("_", " ")}
          </div>
          <div className="text-xs text-muted mt-1">
            {(train.mileage?.totalMileageKM ?? 0).toLocaleString()} km • Jobs:{" "}
            {train.jobCardStatus?.openJobCards ?? 0}
          </div>
        </>
      ) : (
        <div className="text-sm text-muted italic">Empty</div>
      )}
    </div>
  );
}

type Props = {
  trainsets?: Trainset[];
  layout?: "2x8" | "4x4" | number;
  bayField?: "stabling_position" | "stabling.bayPositionID";
};

export default function BayView({
  trainsets,
  layout = "2x8",
  bayField = "stabling.bayPositionID",
}: Props) {
  const [data, setData] = useState<Trainset[] | null>(trainsets ?? null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(!trainsets);

  // fetch fallback if no props provided
  useEffect(() => {
    if (trainsets) return;
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/trains", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!mounted) return;
        setData(json);
        setErr(null);
      } catch {
        try {
          const mocks = await fetchTrainsets();
          if (!mounted) return;
          setData(mocks);
          setErr(null);
        } catch (e: any) {
          if (!mounted) return;
          setErr(e?.message || "Failed to load trains");
          setData([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [trainsets]);

  const bayMap = useMemo(() => {
    const map = new Map<string | number, Trainset>();
    (data ?? []).forEach((t) => {
      const bay =
        bayField === "stabling_position"
          ? (t as any)?.stabling_position
          : t.stabling?.bayPositionID ?? (t as any)?.stabling_position;

      if (bay !== undefined && bay !== null && bay !== "") {
        map.set(bay, t);
      }
    });
    return map;
  }, [data, bayField]);

  const bayList = useMemo(() => {
    let total =
      layout === "2x8"
        ? 16
        : layout === "4x4"
        ? 16
        : typeof layout === "number"
        ? layout
        : 16;

    const maxBay =
      Array.from(bayMap.keys()).reduce<number>(
        (m, k) => (typeof k === "number" ? Math.max(m, k) : m),
        0
      ) || 0;
    total = Math.max(total, maxBay || total);

    return Array.from({ length: total }, (_, i) => i + 1);
  }, [layout, bayMap]);

  const cols = layout === "2x8" ? 8 : layout === "4x4" ? 4 : 8;

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-lg border border-border bg-muted/30 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (err) {
    return (
      <div className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">
        {err}
      </div>
    );
  }

  return (
    <div
      className={cn("grid gap-2", `grid-cols-2 sm:grid-cols-4 lg:grid-cols-${cols}`)}
    >
      {bayList.map((bay) => (
        <BayCard key={bay} bay={bay} train={bayMap.get(bay) ?? null} />
      ))}
    </div>
  );
}
