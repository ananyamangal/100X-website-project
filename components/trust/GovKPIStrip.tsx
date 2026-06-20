"use client"

import { useEffect, useRef, useState } from "react"

export interface KPIs {
  totalOrders: number
  statesServed: number
  departmentsServed: number
  unitsSupplied: number
  yearsExperience: number
  totalOrderValue?: number
}

function useCountUp(target: number, duration = 2200, enabled = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!enabled) return
    if (target === 0) { setCount(0); return }
    let raf: number
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setCount(Math.round(eased * target))
      if (t < 1) raf = requestAnimationFrame(tick)
      else setCount(target)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, enabled])
  return count
}

function KPICard({
  value, label, suffix, prefix, icon, delay, accent, note,
}: {
  value: number
  label: string
  suffix?: string
  prefix?: string
  icon: React.ReactNode
  delay?: number
  accent: string
  note?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const count = useCountUp(value, 2200, active)

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
    <div
      ref={ref}
      className="group flex flex-col items-center text-center px-4 py-8 hover:bg-white/[0.04] transition-colors duration-300 relative"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${accent} group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <div className="text-5xl md:text-6xl font-black text-white tabular-nums tracking-tight leading-none">
        {prefix && <span className="text-3xl md:text-4xl font-bold opacity-80">{prefix}</span>}
        {count.toLocaleString("en-IN")}
        {suffix && <span className="text-emerald-400 text-3xl md:text-4xl">{suffix}</span>}
      </div>
      <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mt-3">{label}</p>
      {note && <p className="text-slate-600 text-[10px] mt-1">{note}</p>}
      <div className="absolute inset-x-0 bottom-0 h-px bg-white/5" />
    </div>
  )
}

function IconClipboard() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  )
}
function IconMap() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  )
}
function IconBuilding() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}
function IconBox() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  )
}
function IconCalendar() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

export default function GovKPIStrip({ kpis }: { kpis: KPIs }) {
  const founded = new Date().getFullYear() - (kpis.yearsExperience || 12)

  const metrics = [
    {
      value: kpis.totalOrders,
      label: "Govt. Orders",
      suffix: "+",
      icon: <IconClipboard />,
      delay: 0,
      accent: "bg-blue-500/20 text-blue-400",
    },
    {
      value: kpis.statesServed,
      label: "States Served",
      suffix: "+",
      icon: <IconMap />,
      delay: 120,
      accent: "bg-emerald-500/20 text-emerald-400",
    },
    {
      value: kpis.departmentsServed,
      label: "Departments",
      suffix: "+",
      icon: <IconBuilding />,
      delay: 240,
      accent: "bg-violet-500/20 text-violet-400",
    },
    {
      value: kpis.unitsSupplied,
      label: "Units Supplied",
      suffix: "+",
      icon: <IconBox />,
      delay: 360,
      accent: "bg-amber-500/20 text-amber-400",
    },
    {
      value: kpis.yearsExperience,
      label: "Years Track Record",
      suffix: "",
      note: `Est. ${founded}`,
      icon: <IconCalendar />,
      delay: 480,
      accent: "bg-rose-500/20 text-rose-400",
    },
  ]

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-3xl overflow-hidden border border-white/[0.06] shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-white/[0.06]">
        <div>
          <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-0.5">Verified Supply Track Record</p>
          <h2 className="text-white text-lg font-bold">Government Procurement Performance</h2>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
          GeM Registered OEM · Gurugram, Haryana
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y lg:divide-y-0 divide-white/[0.05]">
        {metrics.map((m) => (
          <KPICard key={m.label} {...m} />
        ))}
      </div>

      {/* Footer Bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-8 py-4 bg-white/[0.015] border-t border-white/[0.05]">
        {[
          "IS 14855 (Part 1) BIS Standard",
          "ISO 9001:2015 Certified",
          "MSME / UDYAM Registered",
          "GeM OEM Seller Verified",
        ].map((cert) => (
          <span key={cert} className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <svg className="w-3 h-3 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {cert}
          </span>
        ))}
      </div>
    </div>
  )
}
