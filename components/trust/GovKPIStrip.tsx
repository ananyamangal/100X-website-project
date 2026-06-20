"use client"

import { useEffect, useRef, useState } from "react"

interface KPIs {
  totalOrders: number
  statesServed: number
  departmentsServed: number
  unitsSupplied: number
  yearsExperience: number
}

interface Props {
  kpis: KPIs
}

function useCountUp(target: number, duration = 1800, enabled = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!enabled || target === 0) return
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration, enabled])
  return count
}

function KPICounter({ value, label, suffix = "+", delay = 0 }: { value: number; label: string; suffix?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const count = useCountUp(value, 1600, active)

  useEffect(() => {
    const timer = setTimeout(() => {
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) { setActive(true); obs.disconnect() } },
        { threshold: 0.4 }
      )
      if (ref.current) obs.observe(ref.current)
      return () => obs.disconnect()
    }, delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl md:text-4xl font-bold text-gray-900 tabular-nums">
        {count.toLocaleString("en-IN")}
        <span className="text-brand-600">{suffix}</span>
      </div>
      <div className="text-sm text-gray-500 mt-1 font-medium">{label}</div>
    </div>
  )
}

export default function GovKPIStrip({ kpis }: Props) {
  const metrics = [
    { value: kpis.totalOrders, label: "Government Orders", suffix: "+" },
    { value: kpis.statesServed, label: "States Served", suffix: "+" },
    { value: kpis.departmentsServed, label: "Departments Served", suffix: "+" },
    { value: kpis.unitsSupplied, label: "Units Supplied", suffix: "+" },
    { value: kpis.yearsExperience, label: "Years Experience", suffix: "" },
  ]

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 md:p-10">
      <p className="text-center text-xs font-semibold text-brand-400 uppercase tracking-widest mb-6">
        Government Supply Performance
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 md:gap-4">
        {metrics.map((m, i) => (
          <div key={m.label} className="text-center group">
            <div className="text-3xl md:text-4xl font-bold tabular-nums text-white group-hover:text-brand-400 transition-colors">
              <KPICounter value={m.value} label={m.label} suffix={m.suffix} delay={i * 100} />
            </div>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-gray-500 mt-6">
        Track record of institutional and government supplies across India
      </p>
    </div>
  )
}
