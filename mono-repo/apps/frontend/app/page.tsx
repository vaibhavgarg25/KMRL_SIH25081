"use client"

import Link from "next/link"
import { ArrowRight, Train, Activity, Users, BarChart3, Play } from "lucide-react"
import LightRays from "@/components/background/LightRays"
import { Navigation } from "@/components/Navigation"
import SplitText from "../components/SplitText"

const handleAnimationComplete = () => {
  console.log("All letters have animated!")
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background light rays (toned down) */}
      <div className="fixed inset-0 pointer-events-none">
        <LightRays
          raysOrigin="top-center"
          raysColor="#008080"
          raysSpeed={1.0}
          lightSpread={0.75}
          rayLength={1.2}
          followMouse={true}
          mouseInfluence={0.06}
          noiseAmount={0.02}
          distortion={0.01}
          fadeDistance={0.7}
          saturation={0.7}
        />
      </div>

      <Navigation />

      <main className="relative z-10">
        {/* HERO - reduced left/right padding so content sits closer to edges */}
        <section className="min-h-screen flex items-center px-2 md:px-4 lg:px-24 relative overflow-visible">
          <div className="w-full"> {/* removed max-w centering so content can come closer to edges */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-8 items-center">
              {/* Left: Content */}
              <div className="space-y-10 z-20">
                <div className="space-y-4">
                  {/* H1 forced to single line */}
                  <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[0.9] whitespace-nowrap">
                    <SplitText
                      text="KOCHI METRO RAIL"
                      className="bg-gradient-to-r from-teal-400 to-white bg-clip-text inline-block"
                      delay={80}
                      duration={0.55}
                      ease="power3.out"
                      splitType="chars"
                      from={{ opacity: 0, y: 30 }}
                      to={{ opacity: 1, y: 0 }}
                      threshold={0.1}
                      rootMargin="-100px"
                      textAlign="left"
                      onLetterAnimationComplete={handleAnimationComplete}
                    />
                  </h1>

                  {/* Tagline */}
                  <p className="text-sm md:text-base lg:text-lg text-muted-foreground leading-relaxed max-w-xl text-pretty font-light">
                    Powering Kochi's Metro with smarter operations — monitor fleets, optimize schedules, and ensure
                    seamless urban transit.
                  </p>
                </div>

                {/* CTA */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/dashboard" legacyBehavior>
                    <a className="relative inline-flex h-12 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50">
                      {/* optional conic border ring; remove if too flashy */}
                      <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)] opacity-60" />
                      <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-4 py-1 text-sm font-medium text-white backdrop-blur-3xl">
                        Dashboard
                        <ArrowRight className="w-4 h-4 ml-3" />
                      </span>
                    </a>
                  </Link>

<Link href="/features" legacyBehavior>
  <a
    className="not-prose inline-flex h-12 items-center justify-center rounded-full px-5 text-sm font-medium
               border border-[var(--card-border)] bg-white text-[var(--fg)] shadow-sm
               hover:bg-neutral-50 transition
               focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:ring-offset-2
               dark:bg-transparent dark:hover:bg-neutral-800"
  >
    Learn more
  </a>
</Link>




                </div>
              </div>

              {/* Right: Train Image (no rounded box, smaller, nudged left) */}
              <div className="flex items-center justify-end pointer-events-none">
                <div className="relative w-full max-w-[980px]">
                  {/* very subtle ambient glow behind the train (low opacity & blur) */}
                  <div className="absolute inset-0 w-[420px] h-[420px] rounded-full bg-gradient-to-r from-teal-400/6 via-cyan-400/5 to-blue-400/5 blur-3xl -right-8 -top-6 pointer-events-none" />

                  <div className="train-container relative z-10 -translate-x-6 lg:-translate-x-12">
                    <img
                      src="/assets/train.png?height=1200&width=700"
                      alt="Modern Metro Train"
                      className="w-[280px] sm:w-[420px] md:w-[520px] lg:w-[640px] xl:w-[720px] max-w-none h-auto object-contain bg-transparent"
                      style={{ backgroundColor: "transparent" }}
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg?height=400&width=600"
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES / WHY CHOOSE - tightened padding */}
        <section className="section-padding px-4 lg:px-6 bg-gradient-to-b from-muted/20 to-muted/40 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-teal/5 to-transparent pointer-events-none"></div>
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-balance">Why Choose Our Platform?</h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto text-pretty leading-relaxed">
                Comprehensive fleet management with real-time monitoring and intelligent automation
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="feature-card glass-card p-8 rounded-2xl group">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-teal/20 to-brand-teal/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Train className="w-7 h-7 text-brand-teal" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-balance">Fleet Operations</h3>
                <p className="text-muted-foreground text-base leading-relaxed">
                  Monitor trains in real time with comprehensive tracking and control systems.
                </p>
              </div>

              <div className="feature-card glass-card p-8 rounded-2xl group">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-teal/20 to-brand-teal/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Activity className="w-7 h-7 text-brand-teal" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-balance">Predictive Maintenance</h3>
                <p className="text-muted-foreground text-base leading-relaxed">
                  Reduce downtime with smart alerts and predictive maintenance scheduling.
                </p>
              </div>

              <div className="feature-card glass-card p-8 rounded-2xl group">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-teal/20 to-brand-teal/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-7 h-7 text-brand-teal" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-balance">Staff Scheduling</h3>
                <p className="text-muted-foreground text-base leading-relaxed">
                  Assign cleaning and inspection teams seamlessly with automated workflows.
                </p>
              </div>

              <div className="feature-card glass-card p-8 rounded-2xl group">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-teal/20 to-brand-teal/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="w-7 h-7 text-brand-teal" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-balance">Smart Analytics</h3>
                <p className="text-muted-foreground text-base leading-relaxed">
                  Track performance, efficiency, and compliance with advanced analytics.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* optional extra section */}
        <section className="px-4 lg:px-6 py-16">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between bg-card p-6 md:p-8 rounded-2xl gap-6">
              <div>
                <h3 className="text-xl md:text-2xl font-bold">Ready to streamline your fleet?</h3>
                <p className="text-muted-foreground">Sign up for a demo or explore the dashboard to see live telemetry.</p>
              </div>

              <div className="flex gap-3">
                <Link href="https://youtu.be/s0kYmnge1xA" legacyBehavior>
                  <a className="inline-flex items-center gap-2 rounded-full bg-teal-400 px-4 py-2 text-sm font-semibold text-black">
                    Request demo
                    <Play className="w-4 h-4" />
                  </a>
                </Link>

                <Link href="/dashboard" legacyBehavior>
                  <a className="inline-flex items-center gap-2 rounded-full border border-muted px-4 py-2 text-sm">
                    Open dashboard
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
