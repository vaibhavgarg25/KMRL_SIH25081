// hooks/useLiveTrains.ts
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type LiveTrain = {
  trainID: string;
  trainname: string;
  status: "in_service" | "standby" | "under_maintenance" | "out_of_service";
  lat?: number;
  lng?: number;
  // Optional helpers for UI/tooltip:
  speedKPH?: number;
  lastUpdate?: string;         // ISO string
  nextStationId?: string;
  etaToNextMin?: number;
  bayPositionID?: number | null;

  // Interpolation fallback (if no lat/lng):
  currentStationId?: string;
  nextStationIdFallback?: string; // or nextStationId
  progress01?: number;            // 0..1 along segment
};

type Options = {
  pollMs?: number; // default 5000
};

export function useLiveTrains({ pollMs = 5000 }: Options = {}) {
  const [data, setData] = useState<LiveTrain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (!cancelled) setLoading(true);
        const res = await fetch("/api/live-trains", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setData(Array.isArray(json) ? json : []);
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to fetch live trains");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    timer.current = window.setInterval(load, pollMs) as unknown as number;

    return () => {
      cancelled = true;
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [pollMs]);

  return { data, loading, error };
}
