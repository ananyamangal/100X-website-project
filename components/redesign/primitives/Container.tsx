import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

type Props = {
  children: ReactNode
  className?: string
  /** Max width preset. `wide` = 1280px (default), `narrow` = 880px (long-form prose). */
  width?: "wide" | "narrow"
  /** When set, removes horizontal padding (rare; used by full-bleed slides). */
  flush?: boolean
}

/**
 * Centered content well used by every redesigned section. Apple/Tesla
 * style — generous gutters on mobile (`px-6`), wider on desktop
 * (`md:px-8`), capped at 1280px so heroes don't sprawl on 4K monitors.
 */
export default function Container({ children, className, width = "wide", flush = false }: Props) {
  return (
    <div
      className={cn(
        "mx-auto w-full",
        width === "wide" ? "max-w-[1280px]" : "max-w-[880px]",
        flush ? "" : "px-6 md:px-8",
        className,
      )}
    >
      {children}
    </div>
  )
}
