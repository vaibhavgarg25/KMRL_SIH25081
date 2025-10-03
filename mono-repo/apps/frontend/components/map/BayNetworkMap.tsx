"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Trainset } from "@/lib/mock-data";
import type { Station } from "@/lib/stations";

// ── lazy-load react-leaflet on client only
const MapContainer = dynamic(async () => (await import("react-leaflet")).MapContainer, { ssr: false });
const TileLayer     = dynamic(async () => (await import("react-leaflet")).TileLayer,     { ssr: false });
const Polyline      = dynamic(async () => (await import("react-leaflet")).Polyline,      { ssr: false });
const CircleMarker  = dynamic(async () => (await import("react-leaflet")).CircleMarker,  { ssr: false });
const Tooltip       = dynamic(async () => (await import("react-leaflet")).Tooltip,       { ssr: false });
// useMap is a hook, so import it directly where needed (see FitTo component)

type Props = {
  stations: Station[];
  trainsets: Trainset[];
  height?: number | string;
};

const STATUS_COLOR: Record<string, string> = {
  in_service: "#22c55e",        // green
  standby: "#f59e0b",           // amber
  under_maintenance: "#ef4444", // red
};

function useThemeTile() {
  // switches tiles when the app theme changes
  const [isDark, setDark] = useState<boolean>(() =>
    typeof window !== "undefined" ? document.documentElement.classList.contains("dark") : false
  );

  useEffect(() => {
    const obs = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains("dark"));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  return isDark
    ? {
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attribution: '&copy; OpenStreetMap & CARTO',
      }
    : {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: "&copy; OpenStreetMap contributors",
      };
}

// Fit map bounds to all points smoothly
function FitTo({ points }: { points: [number, number][] }) {
  // Import useMap directly here to avoid dynamic import issues
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useMap } = require("react-leaflet");
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const latLngs = points.map(([lat, lng]) => [lat, lng]);
    // @ts-ignore
    map.fitBounds(latLngs, { padding: [28, 28] });
  }, [points, map]);
  return null;
}

export default function BayNetworkMap({ stations, trainsets, height = 520 }: Props) {
  // ── ordered metro line path
  const linePath = useMemo(
    () =>
      stations
        .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
        .map((s) => [s.lat, s.lng]) as [number, number][],
    [stations]
  );

  // ── quick BayPositionID → station lookup
  const stationById = useMemo(() => {
    const m: Record<string, { lat: number; lng: number; name: string }> = {};
    stations.forEach((s) => (m[s.id] = { lat: s.lat, lng: s.lng, name: s.name }));
    return m;
  }, [stations]);

  // ── train points (prefer GPS, else fall back to bay/station)
  const trainPoints = useMemo(() => {
    return trainsets
      .map((t) => {
        const gpsLat = (t as any).lat ?? (t as any).gpsLat ?? (t as any).geo?.lat ?? null;
        const gpsLng = (t as any).lng ?? (t as any).gpsLng ?? (t as any).geo?.lng ?? null;

        let lat: number | null = Number.isFinite(gpsLat) ? (gpsLat as number) : null;
        let lng: number | null = Number.isFinite(gpsLng) ? (gpsLng as number) : null;

        if ((lat === null || lng === null) && t.stabling?.bayPositionID) {
          const s = stationById[t.stabling.bayPositionID];
          if (s && Number.isFinite(s.lat) && Number.isFinite(s.lng)) {
            lat = s.lat;
            lng = s.lng;
          }
        }
        if (lat === null || lng === null) return null;

        const statusKey = String(t.operations?.operationalStatus || "").toLowerCase();
        return {
          id: t.trainID,
          name: t.trainname,
          lat: lat as number,
          lng: lng as number,
          bay: t.stabling?.bayPositionID,
          color: STATUS_COLOR[statusKey] ?? "#94a3b8",
          status: t.operations?.operationalStatus ?? "—",
        };
      })
      .filter(Boolean) as Array<{
        id: string | number;
        name: string;
        lat: number;
        lng: number;
        bay?: string | number | null;
        color: string;
        status: string;
      }>;
  }, [trainsets, stationById]);

  // ── all points to fit (stations + trains)
  const fitPoints = useMemo<[number, number][]>(() => {
    return [
      ...linePath,
      ...trainPoints.map((p) => [p.lat, p.lng] as [number, number]),
    ];
  }, [linePath, trainPoints]);

  const tile = useThemeTile();

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-card relative" style={{ height }}>
      <MapContainer center={linePath[0] || [9.97, 76.30]} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer url={tile.url} attribution={tile.attribution} />

        {/* Metro line */}
        {linePath.length > 1 && (
          <Polyline positions={linePath} weight={5} opacity={0.9} color="#0ea5e9" />
        )}

        {/* Stations as small dots with labels */}
        {stations
          .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
          .map((s) => (
            <CircleMarker
              key={s.id}
              center={[s.lat, s.lng]}
              radius={4}
              pathOptions={{ color: "#2563eb", weight: 2, fillOpacity: 0.9 }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={1} permanent>
                <div className="text-[10px] font-medium">{s.name}</div>
              </Tooltip>
            </CircleMarker>
          ))}

        {/* Trains */}
        {trainPoints.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={8}
            pathOptions={{ color: p.color, weight: 3 }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={1}>
              <div className="text-xs">
                <div className="font-semibold">{p.name}</div>
                <div>Status: {p.status}</div>
                {p.bay ? <div>Bay: {String(p.bay)}</div> : null}
                <div>Lat: {p.lat.toFixed(4)}, Lng: {p.lng.toFixed(4)}</div>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* auto-fit bounds */}
        <FitTo points={fitPoints} />
      </MapContainer>

      {/* Legend (theme aware) */}
      <div className="absolute right-3 top-3 rounded-lg bg-white/90 dark:bg-black/70 backdrop-blur p-2 shadow">
        <div className="text-xs font-semibold mb-1">Legend</div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-3 h-3 rounded-full inline-block" style={{ background: STATUS_COLOR.in_service }} />
          In Service
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-3 h-3 rounded-full inline-block" style={{ background: STATUS_COLOR.standby }} />
          Standby
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-3 h-3 rounded-full inline-block" style={{ background: STATUS_COLOR.under_maintenance }} />
          Maintenance
        </div>
      </div>
    </div>
  );
}
