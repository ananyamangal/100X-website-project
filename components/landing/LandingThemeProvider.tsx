import type { ReactNode } from "react"
import type { LandingTheme } from "@/lib/seo/landing-types"

type Props = {
  theme: LandingTheme
  children: ReactNode
}

/**
 * Wraps a landing page in a themed surface. Blocks inside
 * `components/landing/` look up `[data-theme=dark-industrial]` via the
 * arbitrary Tailwind variant `[[data-theme=dark-industrial]_&]:...` —
 * so every nested colour, border, and background switches in lockstep
 * without per-component branching.
 *
 * Why a wrapper instead of a global class on <body>?
 *   1. Landings can opt-in per-page, not site-wide.
 *   2. The sticky CTA bar, navbar, and footer live OUTSIDE this wrapper
 *      so they keep their existing brand-green-on-white treatment
 *      regardless of landing theme.
 */
export default function LandingThemeProvider({ theme, children }: Props) {
  const isDark = theme === "dark-industrial"
  return (
    <div
      data-theme={theme}
      className={
        isDark
          ? // Dark industrial palette: navy base, subtle ambient mesh, green/yellow accents.
            // The radial-gradient mesh is a pseudo-element on the wrapper to avoid layout cost.
            "relative isolate bg-[#0a1628] text-slate-100 motion-safe:[--landing-motion:initial] [--landing-mesh:1] before:pointer-events-none before:fixed before:inset-0 before:-z-10 before:bg-[radial-gradient(ellipse_80%_50%_at_10%_20%,rgba(0,200,83,0.12),transparent_60%),radial-gradient(ellipse_60%_40%_at_90%_80%,rgba(255,230,0,0.06),transparent_60%)]"
          : "bg-white text-gray-900"
      }
    >
      {children}
    </div>
  )
}
