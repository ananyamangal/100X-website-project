import type { ReactNode } from "react"

/**
 * Wraps a tree in the black-industrial design tokens. Sets
 * `data-theme="black-industrial"` so the CSS variables defined in
 * `app/globals.css` apply to everything inside.
 *
 * Co-existence:
 *   - Default site → no theme attribute → existing brand-green styling.
 *   - /[slug] landings with theme="dark-industrial" → existing navy theme.
 *   - This provider → new black + graphite + orange premium theme.
 *
 * The sticky mobile CTA bar lives OUTSIDE this provider in
 * `app/layout.tsx`, so it keeps its brand-green look regardless of
 * which page is using the redesigned theme. We can opt the bar into
 * the redesign variant in a later commit by adding
 * `[[data-theme=black-industrial]_&]:…` classes to it — same pattern
 * the dark-industrial theme already uses.
 *
 * Ambient orange glow is delivered as a fixed pseudo-element on the
 * wrapper to avoid layout cost.
 */
export default function RedesignThemeProvider({ children }: { children: ReactNode }) {
  return (
    <div
      data-theme="black-industrial"
      className="
        relative isolate min-h-screen
        bg-[var(--rd-bg)] text-[var(--rd-text)]
        before:pointer-events-none before:fixed before:inset-0 before:-z-10
        before:bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(255,106,0,0.10),transparent_60%),radial-gradient(ellipse_60%_40%_at_10%_110%,rgba(255,106,0,0.06),transparent_60%)]
      "
    >
      {children}
    </div>
  )
}
