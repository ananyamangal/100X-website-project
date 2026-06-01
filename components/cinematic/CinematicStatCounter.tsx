"use client"

import { useEffect, useRef, useState } from "react"
import { useCountUp } from "./useCountUp"

interface Stat {
  value: number
  suffix?: string
  prefix?: string
  label: string
  description?: string
}

interface Props {
  stats: Stat[]
  dark?: boolean
}

function StatItem({ stat, dark }: { stat: Stat; dark: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [started, setStarted] = useState(false)
  const count = useCountUp(stat.value, 2200, started)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setStarted(true); observer.disconnect() }
      },
      { threshold: 0.4 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="text-center group">
      <div className={`metric-value ${dark ? "text-white" : "text-gray-900"}`}>
        {stat.prefix && <span className={`text-[0.6em] ${dark ? "text-brand-400" : "text-brand-600"}`}>{stat.prefix}</span>}
        <span>{count.toLocaleString()}</span>
        {stat.suffix && <span className={`text-[0.55em] font-700 ml-1 ${dark ? "text-brand-400" : "text-brand-600"}`}>{stat.suffix}</span>}
      </div>
      <p className={`mt-2 text-sm font-600 uppercase tracking-widest ${dark ? "text-cinema-300" : "text-gray-500"}`}>
        {stat.label}
      </p>
      {stat.description && (
        <p className={`mt-1 text-xs max-w-[160px] mx-auto ${dark ? "text-cinema-400" : "text-gray-400"}`}>
          {stat.description}
        </p>
      )}
    </div>
  )
}

export default function CinematicStatCounter({ stats, dark = true }: Props) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12`}>
      {stats.map((stat, i) => (
        <StatItem key={i} stat={stat} dark={dark} />
      ))}
    </div>
  )
}
