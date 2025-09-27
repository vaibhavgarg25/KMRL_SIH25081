import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  variant?: "default" | "teal" | "gradient"
}

export function LoadingSpinner({ size = "md", className, variant = "default" }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-12 h-12",
  }

  const variantClasses = {
    default: "text-muted-foreground",
    teal: "text-teal-500",
    gradient: "text-transparent bg-gradient-to-r from-teal-500 to-teal-600 bg-clip-text",
  }

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-current border-t-transparent",
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
    />
  )
}
