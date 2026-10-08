"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useCountUp } from "@/components/cinematic/useCountUp"
import { FOUNDED_YEAR, yearsInBusiness, VERIFIED_STATE_COUNT, GOV_BUYERS_LISTED, CASE_STUDY_COUNT } from "@/lib/facts"

function StatCounter({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const count = useCountUp(value, 2000, active)
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

// The database `gov_kpis` numbers (orders / departments / units) have no records behind them and
// are not published; tiles come from lib/facts.ts. `initialKpis` is accepted but ignored.
export default function GovPerformanceSnapshot(_props: { initialKpis?: unknown }) {
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

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <StatCounter value={GOV_BUYERS_LISTED} suffix="" label="Government Buyers Listed" />
          <StatCounter value={VERIFIED_STATE_COUNT} suffix="" label="States With Verified Orders" />
          <StatCounter value={CASE_STUDY_COUNT} suffix="" label="Case Studies" />
          <StatCounter value={yearsInBusiness()} suffix="" label={`Years Experience (Est. ${FOUNDED_YEAR})`} />
        </div>

        <p className="text-center text-sm text-gray-500 mb-6">
          Supplied to many government buyers across {VERIFIED_STATE_COUNT} states.
        </p>

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
