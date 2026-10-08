"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Count-up display. The initial state is the FINAL value, so server-rendered HTML
 * (and any crawler that does not run scripts) shows the real number. The animation
 * is visual only: it starts on the client once `start` is true, and is skipped
 * entirely when the visitor prefers reduced motion.
 */
export function useCountUp(target: number, duration = 2000, start = false) {
  const [count, setCount] = useState(target)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    setCount(target)
    if (!start) return
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return
    const startTime = performance.now()
    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
      else setCount(target)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, duration, start])

  return count
}
