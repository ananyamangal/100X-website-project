import { cn } from "@/lib/utils"

type Props = {
  children: string
  className?: string
  /** Optional small pulse-dot prefix (used in hero / authority surfaces). */
  withDot?: boolean
}

/**
 * Small uppercase orange label that anchors every section heading.
 * Letter-spacing widened to match the Apple/Tesla micro-type rhythm.
 */
export default function Eyebrow({ children, className, withDot = false }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-[11px] md:text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rd-accent)]",
        className,
      )}
    >
      {withDot ? (
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--rd-accent)] motion-safe:animate-pulse"
        />
      ) : null}
      {children}
    </span>
  )
}
