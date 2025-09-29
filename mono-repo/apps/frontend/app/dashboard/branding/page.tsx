// app/dashboard/branding/page.tsx
import Link from "next/link"
import { BarChart3, Layers, SlidersHorizontal, Sparkles } from "lucide-react"

export default function BrandingHubPage() {
  return (
    <div className="space-y-6">
      {/* Intro / Status row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-md bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Get Started</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Tune <span className="font-medium">BrandingActive</span>,{" "}
            <span className="font-medium">BrandCampaignID</span>,{" "}
            <span className="font-medium">ExposureHours*</span> parameters and preview their effect on fleet selection.
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            *ExposureHoursAccrued • ExposureHoursTarget • ExposureDailyQuota
          </p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">Today’s Snapshot</h3>
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl font-bold text-foreground">12</div>
              <div className="text-xs text-muted-foreground">Active Campaigns</div>
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">8</div>
              <div className="text-xs text-muted-foreground">Branded Trainsets</div>
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">74%</div>
              <div className="text-xs text-muted-foreground">Avg Target Attainment</div>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-md bg-green-500/15 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Recommended Next</h3>
          </div>
          <ul className="text-sm list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Set campaign-specific daily quotas per depot window.</li>
            <li>Enable BrandingActive on high-availability sets first.</li>
            <li>Use Scenarios to stress-test aggressive targets.</li>
          </ul>
        </div>
      </section>

      {/* Section cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overview */}
        <Link href="/dashboard/branding/overview" className="group">
          <article className="glass-card p-6 h-full hover:bg-muted/40 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-md bg-blue-500/15 flex items-center justify-center">
                <Layers className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Overview</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Fleet & campaign rollup — see branded sets, target vs. accrued exposure, and quick alerts
              (under/over-shoot, expiring campaigns).
            </p>
            <div className="mt-4 text-xs text-primary group-hover:underline">Open Overview →</div>
          </article>
        </Link>

        {/* Allocation */}
        <Link href="/dashboard/branding/allocation" className="group">
          <article className="glass-card p-6 h-full hover:bg-muted/40 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-md bg-purple-500/15 flex items-center justify-center">
                <SlidersHorizontal className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Allocation</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Interact with the math: toggle <em>BrandingActive</em>, assign <em>BrandCampaignID</em>, and tweak
              <em> ExposureDailyQuota</em> / <em>Target</em> with live impact on coverage.
            </p>
            <div className="mt-4 text-xs text-primary group-hover:underline">Open Allocation →</div>
          </article>
        </Link>

        {/* Scenarios */}
        <Link href="/dashboard/branding/scenarios" className="group">
          <article className="glass-card p-6 h-full hover:bg-muted/40 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-md bg-amber-500/15 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Scenarios</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Sandbox “crazy math” — simulate what-if strategies (aggressive weekly quotas, burst campaigns, blackout
              windows) and compare outcomes.
            </p>
            <div className="mt-4 text-xs text-primary group-hover:underline">Open Scenarios →</div>
          </article>
        </Link>
      </section>
    </div>
  )
}
