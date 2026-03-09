"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

interface FitBoundsComponentProps {
  points: [number, number][];
}

export default function FitBoundsComponent({ points }: FitBoundsComponentProps) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0 || !map) return;

    try {
      // Create bounds from all points
      const bounds = L.latLngBounds(points);
      
      // Fit map to bounds with padding
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 15,
      });
    } catch (error) {
      console.error("Error fitting bounds:", error);
    }
  }, [points, map]);

  return null;
}