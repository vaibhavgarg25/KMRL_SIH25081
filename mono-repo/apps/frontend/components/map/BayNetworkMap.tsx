"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Trainset } from "@/lib/mock-data";
import type { Station } from "@/lib/stations";

// Import Leaflet CSS - CRITICAL for map to render
import "leaflet/dist/leaflet.css";

// ── lazy-load react-leaflet on client only
const MapContainer = dynamic(async () => (await import("react-leaflet")).MapContainer, { ssr: false });
const TileLayer     = dynamic(async () => (await import("react-leaflet")).TileLayer,     { ssr: false });
const Polyline      = dynamic(async () => (await import("react-leaflet")).Polyline,      { ssr: false });
const CircleMarker  = dynamic(async () => (await import("react-leaflet")).CircleMarker,  { ssr: false });
const Tooltip       = dynamic(async () => (await import("react-leaflet")).Tooltip,       { ssr: false });
const FitBoundsComponent = dynamic(() => import("./FitBoundsComponent"), { ssr: false });

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
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> & <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
      }
    : {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      };
}

export default function BayNetworkMap({ stations, trainsets, height = 520 }: Props) {
  const [isClient, setIsClient] = useState(false);

  // Ensure component only renders on client
  useEffect(() => {
    setIsClient(true);
  }, []);

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

  // ── fallback center
  const center = useMemo<[number, number]>(() => {
    if (linePath.length > 0) return linePath[0];
    if (trainPoints.length > 0) return [trainPoints[0].lat, trainPoints[0].lng];
    return [9.97, 76.30]; // Kochi center
  }, [linePath, trainPoints]);

  // Don't render until client-side
  if (!isClient) {
    return (
      <div 
        className="rounded-xl overflow-hidden border border-border bg-card w-full"
        style={{ height: typeof height === "number" ? `${height}px` : height }}
      >
        <div className="w-full h-full flex items-center justify-center text-muted">
          Loading map...
        </div>
      </div>
    );
  }

  return (
    <div 
      className="rounded-xl overflow-hidden border border-border bg-card relative w-full"
      style={{ height: typeof height === "number" ? `${height}px` : height }}
    >
      <MapContainer 
        center={center} 
        zoom={12} 
        style={{ 
          height: "100%", 
          width: "100%",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
        }}
        scrollWheelZoom
        attributionControl={true}
      >
        <TileLayer 
          url={tile.url} 
          attribution={tile.attribution}
          maxZoom={tile.maxZoom}
        />

        {/* Metro line */}
        {linePath.length > 1 && (
          <Polyline 
            positions={linePath} 
            weight={5} 
            opacity={0.9} 
            color="#0ea5e9"
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Stations as small dots with labels */}
        {stations
          .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
          .map((s) => (
            <CircleMarker
              key={s.id}
              center={[s.lat, s.lng]}
              radius={4}
              pathOptions={{ 
                color: "#2563eb", 
                weight: 2, 
                fillOpacity: 0.9,
                fill: true,
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={1} permanent>
                <div className="text-[10px] font-medium whitespace-nowrap">{s.name}</div>
              </Tooltip>
            </CircleMarker>
          ))}

        {/* Trains */}
        {trainPoints.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={8}
            pathOptions={{ 
              color: p.color, 
              weight: 3,
              fill: true,
              fillColor: p.color,
              fillOpacity: 0.8,
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1}>
              <div className="text-xs">
                <div className="font-semibold">{p.name}</div>
                <div>Status: {p.status}</div>
                {p.bay ? <div>Bay: {String(p.bay)}</div> : null}
                <div className="text-[9px]">Lat: {p.lat.toFixed(4)}</div>
                <div className="text-[9px]">Lng: {p.lng.toFixed(4)}</div>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* auto-fit bounds */}
        {fitPoints.length > 0 && <FitBoundsComponent points={fitPoints} />}
      </MapContainer>

      {/* Legend (theme aware) */}
      <div className="absolute right-3 top-3 rounded-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-3 shadow-lg z-[1000]">
        <div className="text-xs font-semibold mb-2 text-slate-900 dark:text-white">Legend</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
            <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ background: STATUS_COLOR.in_service }} />
            <span>In Service</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
            <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ background: STATUS_COLOR.standby }} />
            <span>Standby</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
            <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ background: STATUS_COLOR.under_maintenance }} />
            <span>Maintenance</span>
          </div>
        </div>
      </div>
    </div>
  );
}