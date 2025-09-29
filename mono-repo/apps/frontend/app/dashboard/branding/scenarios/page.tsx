"use client";
import { useEffect, useState } from "react";
import ScenarioBuilder, { type BrandingScenario } from "@/components/branding/ScenarioBuilder";

export default function BrandingScenariosPage() {
  const [scenarios, setScenarios] = useState<BrandingScenario[] | undefined>(undefined);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    // fetch or seed
    const seed: BrandingScenario[] = [ { id: crypto.randomUUID(), name: "Base Plan" } ];
    setScenarios(seed);
    setActiveId(seed[0].id);
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <ScenarioBuilder
        scenarios={scenarios}
        activeId={activeId ?? undefined}
        onChange={(next, active) => {
          setScenarios(next);
          setActiveId(active);
        }}
      />
    </div>
  );
}
