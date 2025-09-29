"use client";
import { ReactNode } from "react";

export function PlannerDashboard({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4">{left}</div>
      <div className="lg:col-span-8">{right}</div>
    </div>
  );
}
