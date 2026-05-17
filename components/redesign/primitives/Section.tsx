import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

type Props = {
  children: ReactNode
  className?: string
  /** Optional landmark id for in-page anchor links. */
  id?: string
  /** Padding density. `default` = py-24/32/40; `tight` = py-16/20/24; `flush` = no vertical padding. */
  pad?: "default" | "tight" | "flush"
  /** Surface tint. `bg` = pure black; `surface` = #141414 panel; `transparent` = inherit. */
  tone?: "transparent" | "bg" | "surface"
  /** ARIA labelling — pass when the section has a logical title. */
  ariaLabelledBy?: string
  ariaLabel?: string
}

const PAD_CLASS = {
  default: "py-24 md:py-32 lg:py-40",
  tight: "py-16 md:py-20 lg:py-24",
  flush: "",
}

const TONE_CLASS = {
  transparent: "",
  bg: "bg-[var(--rd-bg)]",
  surface: "bg-[var(--rd-surface-1)]",
}

/**
 * Standard vertical section. Apple/Tesla-grade vertical breathing on
 * desktop (160px / 128px / 96px scale); compacts on mobile but stays
 * generous so the page never feels cramped.
 */
export default function Section({
  children,
  className,
  id,
  pad = "default",
  tone = "transparent",
  ariaLabelledBy,
  ariaLabel,
}: Props) {
  return (
    <section
      id={id}
      aria-labelledby={ariaLabelledBy}
      aria-label={ariaLabel}
      className={cn("relative", PAD_CLASS[pad], TONE_CLASS[tone], className)}
    >
      {children}
    </section>
  )
}
