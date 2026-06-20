"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"

interface KPIs {
  totalOrders: number
  statesServed: number
  departmentsServed: number
  unitsSupplied: number
  yearsExperience: number
}

function useCountUp(target: number, enabled: boolean) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!enabled || target === 0) return
    let start = 0
    const step = target / 100
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [target, enabled])
  return count
}

function StatCounter({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const count = useCountUp(value, active)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setActive(true); obs.disconnect() } }, { threshold: 0.5 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} className="text-center">
      <p className="text-3xl md:text-4xl font-bold text-gray-900 tabular-nums">
        {count.toLocaleString("en-IN")}<span className="text-brand-600">{suffix}</span>
      </p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  )
}

export default function GovPerformanceSnapshot() {
  const [kpis, setKpis] = useState<KPIs | null>(null)

  useEffect(() => {
    fetch("/api/gov-kpis")
      .then((r) => r.json())
      .then((d) => setKpis(d))
      .catch(() => {})
  }, [])

  if (!kpis) return null

  return (
    <section className="py-14 md:py-18 bg-gray-50 border-t border-b border-gray-200">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-2">Track Record</p>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Government Supply Performance</h2>
          <p className="text-gray-500 text-sm max-w-lg mx-auto">
            Trusted by government departments, municipal bodies, and public institutions across India.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 mb-8">
          <StatCounter value={kpis.totalOrders} suffix="+" label="Government Orders" />
          <StatCounter value={kpis.statesServed} suffix="+" label="States Served" />
          <StatCounter value={kpis.departmentsServed} suffix="+" label="Departments" />
          <StatCounter value={kpis.unitsSupplied} suffix="+" label="Units Supplied" />
          <StatCounter value={kpis.yearsExperience} suffix="" label="Years Experience" />
        </div>

        <div className="text-center">
          <Link
            href="/past-performance-government"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-semibold rounded-full text-sm hover:bg-gray-700 transition-colors"
          >
            View Full Past Performance
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link
            href="/fogging-machine-government-procurement"
            className="ml-4 inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-full text-sm hover:bg-gray-100 transition-colors"
          >
            Government Procurement Guide
          </Link>
        </div>
      </div>
    </section>
  )
}
