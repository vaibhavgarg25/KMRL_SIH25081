import { LoadingSpinner } from "./loading-spinner"
import { cn } from "@/lib/utils"

interface PageLoaderProps {
  message?: string
  className?: string
  variant?: "overlay" | "inline"
}

export function PageLoader({ message = "Loading...", className, variant = "overlay" }: PageLoaderProps) {
  if (variant === "inline") {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 space-y-4", className)}>
        <div className="relative">
          <LoadingSpinner size="xl" variant="teal" />
          <div className="absolute inset-0 animate-ping">
            <LoadingSpinner size="xl" variant="teal" className="opacity-20" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-background/80 backdrop-blur-sm",
        className,
      )}
    >
      <div className="glass-card p-8 text-center space-y-4 border border-border/50 shadow-2xl">
        <div className="relative mx-auto">
          <LoadingSpinner size="xl" variant="teal" />
          <div className="absolute inset-0 animate-ping">
            <LoadingSpinner size="xl" variant="teal" className="opacity-20" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
      </div>
    </div>
  )
}
