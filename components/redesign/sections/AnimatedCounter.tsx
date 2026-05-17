"use client"

import { useEffect, useRef, useState } from "react"

type Props = {
  /** Target numeric value. */
  to: number
  /** Optional prefix (e.g. "₹"). */
  prefix?: string
  /** Optional suffix (e.g. "+", "K"). */
  suffix?: string
  /** Animation duration in ms. */
  durationMs?: number
  className?: string
}

/**
 * Counts from 0 → `to` when scrolled into view. Single-fire — once the
 * value lands, it stops observing. Respects prefers-reduced-motion by
 * jumping straight to the final value on mount.
 */
export default function AnimatedCounter({
  to,
  prefix = "",
  suffix = "",
  durationMs = 1400,
  className,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const [value, setValue] = useState(0)
  const fired = useRef(false)

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (reduce) {
      setValue(to)
      fired.current = true
      return
    }

    const node = ref.current
    if (!node || fired.current) return

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !fired.current) {
            fired.current = true
            const start = performance.now()
            const tick = (now: number) => {
              const t = Math.min(1, (now - start) / durationMs)
              // easeOutCubic
              const eased = 1 - Math.pow(1 - t, 3)
              setValue(Math.round(eased * to))
              if (t < 1) requestAnimationFrame(tick)
            }
            requestAnimationFrame(tick)
            obs.disconnect()
            return
          }
        }
      },
      { threshold: 0.4 },
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [to, durationMs])

  return (
    <span ref={ref} className={className} aria-live="polite">
      {prefix}
      {value.toLocaleString("en-IN")}
      {suffix}
    </span>
  )
}
