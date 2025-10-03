"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import type { Trainset } from "@/lib/mock-data";
import type { Station } from "@/lib/stations";

// lazy-load react-leaflet on client
const MapContainer = dynamic(
  async () => (await import("react-leaflet")).MapContainer,
  { ssr: false }
);
const TileLayer = dynamic(async () => (await import("react-leaflet")).TileLayer, { ssr: false });
const Polyline = dynamic(async () => (await import("react-leaflet")).Polyline, { ssr: false });
const Marker = dynamic(async () => (await import("react-leaflet")).Marker, { ssr: false });
const Tooltip = dynamic(async () => (await import("react-leaflet")).Tooltip, { ssr: false });
const CircleMarker = dynamic(
  async () => (await import("react-leaflet")).CircleMarker,
  { ssr: false }
);

type Props = {
  stations: Station[];
  trainsets: Trainset[];
  height?: number | string;
};

const statusColor: Record<string, string> = {
  in_service: "#22c55e",
  under_maintenance: "#ef4444",
  standby: "#f59e0b",
};

export default function BayNetworkMap({ stations, trainsets, height = 520 }: Props) {
  // Make a polyline from ordered stations (skip NaN coords)
  const linePath = useMemo(
    () =>
      stations
        .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
        .map((s) => [s.lat, s.lng]) as [number, number][],
    [stations]
  );

  // crude “bounds” target
  const center: [number, number] =
    (linePath.length && (linePath[Math.floor(linePath.length / 2)] as [number, number])) ||
    ([9.97, 76.30] as [number, number]);

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-card" style={{ height }}>
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          // OpenStreetMap – change to any tiles you like
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {/* Metro line */}
        {linePath.length > 1 && (
          <Polyline positions={linePath} weight={5} opacity={0.85} color="#0ea5e9" />
        )}

        {/* Stations */}
        {stations
          .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
          .map((s) => (
            <Marker key={s.id} position={[s.lat, s.lng]}>
              <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent>
                <div className="text-[10px] font-medium">{s.name}</div>
              </Tooltip>
            </Marker>
          ))}

        {/* Live train markers (use stabling bay if you miss GPS) */}
        {trainsets.map((t) => {
          const lat = (t as any).lat ?? (t as any).gpsLat ?? (t as any).geo?.lat ?? null;
          const lng = (t as any).lng ?? (t as any).gpsLng ?? (t as any).geo?.lng ?? null;

          // when you don’t yet have GPS, skip marker
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

          const statusKey = String(t.operations?.operationalStatus || "").toLowerCase();
          const color = statusColor[statusKey] ?? "#94a3b8";

          return (
            <CircleMarker
              key={t.trainID}
              center={[lat as number, lng as number]}
              radius={8}
              pathOptions={{ color, weight: 3 }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                <div className="text-xs">
                  <div className="font-semibold">{t.trainname}</div>
                  <div>Status: {t.operations?.operationalStatus ?? "—"}</div>
                  {t.stabling?.bayPositionID ? <div>Bay: {t.stabling.bayPositionID}</div> : null}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
