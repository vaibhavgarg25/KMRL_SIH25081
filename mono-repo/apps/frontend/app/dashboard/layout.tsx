"use client"

import { useState, useEffect } from "react"
import type { ReactNode } from "react"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { Header } from "@/components/Header"
import { Sidebar, SidebarBody, SidebarLink } from "@/components/Sidebar"
import { IconBrandTabler } from "@tabler/icons-react"
import { BarChart3 as BarChart3Icon, Calendar, Train, History, Upload, Home } from "lucide-react"

// Logo component
const Logo = ({ open }: { open: boolean }) => (
  <a
    href="/"
    className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black"
  >
    <Home className="h-6 w-6 text-black dark:text-white flex-shrink-0" />
    {open && (
      <span className="font-medium text-black dark:text-white truncate">
        Kochi Metro Rail
      </span>
    )}
  </a>
)

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      setOpen(!mobile)
    }
    checkScreenSize()
    window.addEventListener("resize", checkScreenSize)
    return () => window.removeEventListener("resize", checkScreenSize)
  }, [])

  // UPDATED: replace "Planner" with a grouped "Branding Planner" section
  const links = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <IconBrandTabler className="h-5 w-5 text-black dark:text-white" />,
    },
    {
      label: "Train",
      href: "/dashboard/trainsets",
      icon: <Train className="h-5 w-5 text-black dark:text-white" />,
    },
    {
      label: "Branding Planner",
      icon: <Calendar className="h-5 w-5 text-black dark:text-white" />,
      children: [
        { label: "Branding", href: "/dashboard/branding" },
        { label: "Overview", href: "/dashboard/branding/overview" },
        { label: "Allocation", href: "/dashboard/branding/allocation" },
        { label: "Scenarios", href: "/dashboard/branding/scenarios" },
      ],
    },
    {
      label: "Simulation",
      href: "/dashboard/simulation",
      icon: <BarChart3Icon className="h-5 w-5 text-black dark:text-white" />,
    },
    {
      label: "History",
      href: "/dashboard/history",
      icon: <History className="h-5 w-5 text-black dark:text-white" />,
    },
    {
      label: "Upload",
      href: "/dashboard/csv-template",
      icon: <Upload className="h-5 w-5 text-black dark:text-white" />,
    },
  ]

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-bg relative">
        {isMobile && open && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        <div
          className={`${isMobile ? "fixed" : "relative"} ${
            isMobile ? "z-50" : "z-10"
          } ${isMobile && !open ? "-translate-x-full" : "translate-x-0"} transition-transform duration-300 ease-in-out`}
        >
          <Sidebar open={open} setOpen={setOpen}>
            <SidebarBody className="justify-between gap-10">
              <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
                <Logo open={open} />
                <div className="mt-8 flex flex-col gap-2">
                  {links.map((link, idx) => (
                    <SidebarLink key={idx} link={link as any} />
                  ))}
                </div>
              </div>
            </SidebarBody>
          </Sidebar>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header />
          <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
