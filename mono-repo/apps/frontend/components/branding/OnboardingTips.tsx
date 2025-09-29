"use client";
export function OnboardingTips() {
  return (
    <div className="glass-card p-6 text-sm space-y-2">
      <div className="font-semibold text-foreground">Tips</div>
      <ul className="list-disc pl-5 text-muted-foreground space-y-1">
        <li>Toggle <strong>BrandingActive</strong> on high-health trainsets first.</li>
        <li>Use <strong>Daily Quota</strong> to pace aggressively on weekends.</li>
        <li>Compare strategies in <strong>Scenarios</strong> before publishing.</li>
      </ul>
    </div>
  );
}
