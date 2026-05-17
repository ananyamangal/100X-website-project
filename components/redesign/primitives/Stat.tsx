import { cn } from "@/lib/utils"

type Props = {
  value: string
  label: string
  className?: string
  /** Smaller variant for tight grids. */
  size?: "md" | "lg"
}

/**
 * Static stat (value + label) — building block for the trust strip
 * and any inline metric callout. The animated counter version uses
 * this same markup with a wrapper that swaps `value` over time.
 */
export default function Stat({ value, label, className, size = "lg" }: Props) {
  return (
    <div className={cn("text-center md:text-left", className)}>
      <div
        className={cn(
          "font-bold tracking-tight text-[var(--rd-accent)] tabular-nums",
          size === "lg" ? "text-4xl md:text-5xl" : "text-3xl md:text-4xl",
        )}
      >
        {value}
      </div>
      <div className="mt-1 text-[11px] md:text-xs font-semibold uppercase tracking-[0.14em] text-[var(--rd-text-muted)]">
        {label}
      </div>
    </div>
  )
}
