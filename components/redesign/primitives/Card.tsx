import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

type Props = {
  children: ReactNode
  className?: string
  /** `solid` (default) = surface-1; `glass` = blurred translucent; `outlined` = transparent + strong border. */
  tone?: "solid" | "glass" | "outlined"
  /** When true, applies a subtle hover lift + accent border. */
  interactive?: boolean
}

const TONE_CLASS: Record<NonNullable<Props["tone"]>, string> = {
  solid: "bg-[var(--rd-surface-1)] border border-[var(--rd-border)]",
  glass: "bg-white/[0.04] backdrop-blur-md border border-white/[0.08]",
  outlined: "bg-transparent border border-[var(--rd-border-strong)]",
}

/**
 * Card surface used by trust stats, benefit cards, testimonials,
 * deployment showcases. Radius + shadow centralized via tokens so a
 * brand tweak only touches `globals.css`.
 */
export default function Card({ children, className, tone = "solid", interactive = false }: Props) {
  return (
    <div
      className={cn(
        "rounded-[var(--rd-radius-card)] shadow-[var(--rd-shadow-card)]",
        TONE_CLASS[tone],
        interactive
          ? "transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--rd-accent)]/40 hover:shadow-[var(--rd-shadow-accent)]"
          : "",
        className,
      )}
    >
      {children}
    </div>
  )
}
