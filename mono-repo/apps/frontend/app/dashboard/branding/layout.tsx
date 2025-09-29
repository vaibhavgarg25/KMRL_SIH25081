// app/dashboard/branding/layout.tsx
import type { ReactNode } from "react"

export const metadata = {
  title: "Branding Planner | Kochi Metro Rail",
}

export default function BrandingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Branding Planner</h1>
              <p className="text-sm text-muted-foreground">
                Configure campaigns, tweak exposure math, and simulate outcomes.
              </p>
            </div>
            {/* Breadcrumb (kept minimal; auto-hides on small screens) */}
            <nav className="hidden md:block text-sm text-muted-foreground">
              <ol className="inline-flex items-center gap-2">
                <li>
                  <a href="/dashboard" className="hover:text-foreground transition-colors">
                    Dashboard
                  </a>
                </li>
                <li className="opacity-50">/</li>
                <li className="text-foreground">Branding</li>
              </ol>
            </nav>
          </div>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  )
}
