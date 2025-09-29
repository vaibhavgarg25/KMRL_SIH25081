"use client";
import { useMemo, useState } from "react";

export function BudgetWidget() {
  const [budget, setBudget] = useState(10_00_000); // ₹
  const [hours, setHours] = useState(1500);
  const cpm = useMemo(() => (hours ? (budget / hours).toFixed(2) : "—"), [budget, hours]);

  return (
    <div className="glass-card p-6 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Budget / Benefit</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          <span>Budget (₹)</span>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full h-10 mt-1 px-3 rounded-md bg-background border border-border"
          />
        </label>
        <label className="text-sm">
          <span>Exposure Hours</span>
          <input
            type="number"
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="w-full h-10 mt-1 px-3 rounded-md bg-background border border-border"
          />
        </label>
      </div>
      <div className="text-sm text-muted-foreground">
        Estimated Cost / Hour: <span className="font-semibold text-foreground">₹ {cpm}</span>
      </div>
    </div>
  );
}
