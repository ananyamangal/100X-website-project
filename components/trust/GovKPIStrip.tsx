"use client"

import { useEffect, useRef, useState } from "react"
import { useCountUp } from "@/components/cinematic/useCountUp"
import { FOUNDED_YEAR, yearsInBusiness, VERIFIED_STATE_COUNT, GOV_BUYERS_LISTED, CASE_STUDY_COUNT } from "@/lib/facts"

export interface KPIs {
  totalOrders: number
  statesServed: number
  departmentsServed: number
  unitsSupplied: number
  yearsExperience: number
  totalOrderValue?: number
}

function KPICard({
  value, label, suffix, icon, delay, note,
}: {
  value: number
  label: string
  suffix?: string
  icon: React.ReactNode
  delay?: number
  note?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const count = useCountUp(value, 2000, active)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!ref.current) return
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) { setActive(true); obs.disconnect() } },
        { threshold: 0.25 }
      )
      obs.observe(ref.current)
      return () => obs.disconnect()
    }, delay ?? 0)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div ref={ref} className="flex flex-col items-center text-center px-4 py-8 relative">
      <div className="w-10 h-10 rounded-xl bg-brand-600/15 border border-brand-500/20 flex items-center justify-center mb-4 text-brand-400">
        {icon}
      </div>
      <div className="text-5xl md:text-6xl font-900 text-white tabular-nums tracking-tight leading-none">
        {count.toLocaleString("en-IN")}
        {suffix && <span className="text-brand-400 text-3xl md:text-4xl">{suffix}</span>}
      </div>
      <p className="text-gray-400 text-xs font-700 uppercase tracking-widest mt-3">{label}</p>
      {note && <p className="text-gray-600 text-[10px] mt-1">{note}</p>}
      <div className="absolute inset-x-0 bottom-0 h-px bg-white/5" />
    </div>
  )
}

function IconClipboard() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
}
function IconMap() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  )
}
function IconBuilding() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M3 7v1a3 3 0 006 0V7m0 1a3 3 0 006 0V7m0 1a3 3 0 006 0V7M6 21V10.85M18 21V10.85M3 7l9-4 9 4" />
    </svg>
  )
}
function IconCalendar() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

// The database `gov_kpis` numbers (total orders / departments / units) have no records behind
// them and are not published. Tiles below come from lib/facts.ts. The `kpis` prop is accepted
// for backwards compatibility but its numbers are ignored.
export default function GovKPIStrip(_props: { kpis?: KPIs | null }) {
  const metrics = [
    { value: GOV_BUYERS_LISTED, label: "Govt. Buyers Listed", icon: <IconBuilding />, delay: 0 },
    { value: VERIFIED_STATE_COUNT, label: "States With Verified Orders", icon: <IconMap />, delay: 100 },
    { value: CASE_STUDY_COUNT, label: "Case Studies", icon: <IconClipboard />, delay: 200 },
    { value: yearsInBusiness(), label: "Years Track Record", icon: <IconCalendar />, delay: 300, note: `Est. ${FOUNDED_YEAR}` },
  ]

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div>
          <p className="eyebrow text-brand-400 mb-0.5">Verified Supply Track Record</p>
          <p className="text-white font-700 text-base">Government Procurement Performance</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 inline-block" />
          GeM Registered OEM · Gurugram
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 divide-y lg:divide-y-0 divide-white/[0.05]">
        {metrics.map((m) => (
          <KPICard key={m.label} {...m} />
        ))}
      </div>

      <p className="px-6 py-3 text-center text-xs text-gray-400 border-t border-white/[0.05]">
        Supplied to many government buyers across {VERIFIED_STATE_COUNT} states.
      </p>

      {/* Certifications footer */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4 bg-white/[0.02] border-t border-white/[0.05]">
        {["IS 14855 (Part 1) BIS Standard", "ISO 9001:2015 Certified", "MSME / UDYAM Registered", "GeM OEM Seller"].map((cert) => (
          <span key={cert} className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <svg className="w-3 h-3 text-brand-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {cert}
          </span>
        ))}
      </div>
    </div>
  )
}
