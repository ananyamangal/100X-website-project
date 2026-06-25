"use client"

import { useState, useEffect, useRef } from "react"
import { BUSINESS } from "@/lib/seo/site-config"

// ─── Sticky Floating CTA ─────────────────────────────────────────────────────

export function StickyProcurementCTA({ waTenderQuote, waOemTeam, phonePrimary, email }: {
  waTenderQuote: string
  waOemTeam: string
  phonePrimary: string
  email: string
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Hide global WhatsApp button when Procurement Desk is visible — eliminates
  // any potential overlap; Desk already contains WhatsApp CTAs
  useEffect(() => {
    const waBtn = document.getElementById("whatsapp-float-btn")
    if (!waBtn) return
    waBtn.style.opacity = visible ? "0" : "1"
    waBtn.style.pointerEvents = visible ? "none" : "auto"
    waBtn.style.transition = "opacity 0.3s ease"
  }, [visible])

  if (!visible) return null

  return (
    <div className="fixed bottom-6 left-5 z-50 flex flex-col gap-2 items-start">
      <div className="bg-gray-950/95 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-2xl flex flex-col gap-2 min-w-[200px] max-w-[220px]">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest px-1 font-semibold">Procurement Desk</p>
        <a href={waTenderQuote} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Request Tender Quote
        </a>
        <a href={`tel:${phonePrimary}`}
          className="flex items-center gap-2.5 bg-white/[0.06] hover:bg-white/[0.10] border border-white/10 text-gray-200 text-xs font-medium px-3 py-2 rounded-xl transition-colors">
          <svg className="w-4 h-4 shrink-0 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 013 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
          {phonePrimary}
        </a>
        <a href="#gov-rfq-form"
          className="flex items-center gap-2.5 bg-white/[0.06] hover:bg-white/[0.10] border border-white/10 text-gray-200 text-xs font-medium px-3 py-2 rounded-xl transition-colors">
          <svg className="w-4 h-4 shrink-0 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          Fill RFQ Form
        </a>
        <a href={`mailto:${email}?subject=Government Fogging Machine Tender Enquiry`}
          className="flex items-center gap-2.5 bg-white/[0.06] hover:bg-white/[0.10] border border-white/10 text-gray-200 text-xs font-medium px-3 py-2 rounded-xl transition-colors">
          <svg className="w-4 h-4 shrink-0 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          Email Enquiry
        </a>
        <a href={waOemTeam} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2.5 bg-white/[0.06] hover:bg-white/[0.10] border border-white/10 text-gray-200 text-xs font-medium px-3 py-2 rounded-xl transition-colors">
          <svg className="w-4 h-4 shrink-0 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 2H3v16h5l3 3 3-3h7V2z"/></svg>
          OEM Team Chat
        </a>
      </div>
    </div>
  )
}

// ─── Procurement Lifecycle Timeline ──────────────────────────────────────────

const LIFECYCLE_STAGES = [
  { num: 1, phase: "Pre-Procurement", title: "Requirement Identification", body: "Municipal ward or health department identifies fogging need — ward coverage area, machine type (portable vs vehicle-mounted), capacity required.", icon: "📋", duration: "1–2 weeks" },
  { num: 2, phase: "Pre-Procurement", title: "Budget Allocation", body: "Budget line item approved in annual procurement plan. Finance officer confirms funds under relevant scheme (NVBDCP, Swachh Bharat, State Health Mission).", icon: "💰", duration: "1–4 weeks" },
  { num: 3, phase: "Specification", title: "Technical Specification Drafting", body: "Technical spec based on IS 14855 (Part 1), machine capacity, fuel type, tank material. 100X Circle can assist with GeM-aligned specification drafting.", icon: "📐", duration: "1–2 weeks" },
  { num: 4, phase: "Specification", title: "GeM Bid / Tender Drafting", body: "GeM bid parameters set (or NIT/tender floated). OEM certifications, MSME status, and IS 14855 compliance included in eligibility criteria.", icon: "📝", duration: "1 week" },
  { num: 5, phase: "Bidding", title: "Pre-Bid Meeting", body: "Vendors may request technical clarification. 100X Circle participates actively in pre-bid meetings to align machine specifications with procurement requirements.", icon: "🤝", duration: "1 day" },
  { num: 6, phase: "Bidding", title: "Bid Submission", body: "GeM portal submission or physical tender response. 100X Circle submits complete technical and commercial bid with all compliance documents.", icon: "📤", duration: "Deadline" },
  { num: 7, phase: "Evaluation", title: "Technical Evaluation", body: "Compliance check against IS 14855, OEM certification, MSME eligibility, GeM listing verification. All 100X Circle bids pass technical stage.", icon: "🔍", duration: "3–7 days" },
  { num: 8, phase: "Evaluation", title: "Financial Evaluation (L1)", body: "Price comparison among technically qualified vendors. MSME preference rules may apply. 100X Circle offers L1-competitive pricing with direct OEM advantage.", icon: "⚖️", duration: "1–3 days" },
  { num: 9, phase: "Award", title: "Purchase Order / GeM Order", body: "GeM purchase order issued or LoA (Letter of Award) sent. 100X Circle acknowledges within 24 hours with formal acceptance and delivery confirmation.", icon: "✅", duration: "1–2 days" },
  { num: 10, phase: "Supply", title: "Dispatch from Gurugram Factory", body: "Machines dispatched from IMT Manesar facility within 5–10 working days. Full documentation package shipped with every unit (GST invoice, test certificate, warranty card).", icon: "🚚", duration: "5–10 days" },
  { num: 11, phase: "Supply", title: "Delivery Inspection & Acceptance", body: "Consignment inspected at delivery site. 100X Circle provides field inspection support. Acceptance certificate issued by government officer on satisfaction.", icon: "✔️", duration: "1 day" },
  { num: 12, phase: "Post-Supply", title: "AMC & After-Sales Support", body: "Annual Maintenance Contract available for bulk orders. Spare parts supply, operator training, and priority call support. Pan-India service network via dealer partners.", icon: "🛠️", duration: "Ongoing" },
]

const PHASE_COLORS: Record<string, string> = {
  "Pre-Procurement": "bg-blue-100 text-blue-700 border-blue-200",
  "Specification": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Bidding": "bg-violet-100 text-violet-700 border-violet-200",
  "Evaluation": "bg-amber-100 text-amber-700 border-amber-200",
  "Award": "bg-green-100 text-green-700 border-green-200",
  "Supply": "bg-teal-100 text-teal-700 border-teal-200",
  "Post-Supply": "bg-gray-100 text-gray-700 border-gray-200",
}

export function ProcurementLifecycleTimeline() {
  const [expanded, setExpanded] = useState<number | null>(null)

  return (
    <div className="relative">
      {/* Vertical connector line */}
      <div className="absolute left-[19px] top-8 bottom-8 w-px bg-gradient-to-b from-blue-200 via-violet-200 to-gray-200 hidden sm:block" />
      <div className="space-y-2">
        {LIFECYCLE_STAGES.map((s) => (
          <div key={s.num}
            className={`relative flex gap-4 group cursor-pointer`}
            onClick={() => setExpanded(expanded === s.num ? null : s.num)}>
            {/* Step circle */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all z-10
              ${expanded === s.num
                ? "bg-gray-900 border-gray-700 text-white shadow-lg"
                : "bg-white border-gray-200 text-gray-500 group-hover:border-gray-400"}`}>
              {s.num}
            </div>
            <div className={`flex-1 rounded-xl border px-4 py-3 transition-all
              ${expanded === s.num ? "border-gray-300 bg-gray-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"}`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{s.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{s.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${PHASE_COLORS[s.phase]}`}>{s.phase}</span>
                      <span className="text-[10px] text-gray-400">{s.duration}</span>
                    </div>
                  </div>
                </div>
                <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${expanded === s.num ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              {expanded === s.num && (
                <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-200 leading-relaxed">{s.body}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Procurement Readiness Score ──────────────────────────────────────────────

const READINESS_ITEMS = [
  { label: "IS 14855 (Part 1) — BIS Indian Standard", score: 100, note: "Required in most municipal & health department tenders" },
  { label: "ISO 9001:2015 — Quality Management System", score: 100, note: "Accepted by central and state government bodies" },
  { label: "ISI Mark — BIS Certification on models", score: 100, note: "Mandatory for many health department procurements" },
  { label: "MSME / UDYAM Registration", score: 100, note: "Enables 25% mandatory MSME quota compliance" },
  { label: "GeM OEM Seller Registration", score: 100, note: "Direct purchase without separate public tender" },
  { label: "GST Registration with correct HSN", score: 100, note: "HSN 8424 — Mechanical appliances for spraying" },
  { label: "L1 Quotation on Company Letterhead", score: 100, note: "Within 24 hours for tender submissions" },
  { label: "Complete Tender Documentation Pack", score: 100, note: "10 pre-prepared documents — shareable same day" },
  { label: "Pan-India Delivery Capability", score: 100, note: "5–10 days from Gurugram (IMT Manesar)" },
  { label: "OEM Authorization Letters for Dealers", score: 100, note: "Issued on request for dealer-assisted bids" },
  { label: "AMC / After-Sales Support Program", score: 85, note: "Available for bulk orders — terms on request" },
]

function ScoreBar({ score, delay }: { score: number; delay: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [animated, setAnimated] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!ref.current) return
      const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setAnimated(true); obs.disconnect() } }, { threshold: 0.5 })
      obs.observe(ref.current)
      return () => obs.disconnect()
    }, delay)
    return () => clearTimeout(timer)
  }, [delay])
  return (
    <div ref={ref} className="w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: animated ? `${score}%` : "0%", background: score === 100 ? "#16a34a" : "#2563eb" }} />
    </div>
  )
}

export function ProcurementReadinessScore() {
  const fullScore = Math.round(READINESS_ITEMS.reduce((s, i) => s + i.score, 0) / READINESS_ITEMS.length)
  return (
    <div className="grid lg:grid-cols-[auto_1fr] gap-8 items-start">
      {/* Score display */}
      <div className="flex flex-col items-center justify-center bg-gray-900 rounded-2xl p-8 text-center min-w-[180px]">
        <div className="relative w-28 h-28 mb-3">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="#16a34a" strokeWidth="8"
              strokeDasharray={`${(fullScore / 100) * 251.2} 251.2`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-white">{fullScore}</span>
            <span className="text-[10px] text-gray-400 font-medium">/100</span>
          </div>
        </div>
        <p className="text-white font-bold text-sm">Procurement Ready</p>
        <p className="text-gray-500 text-[11px] mt-1">{READINESS_ITEMS.filter(i => i.score === 100).length}/{READINESS_ITEMS.length} criteria met</p>
        <div className="mt-3 px-3 py-1 bg-green-900/40 border border-green-700/40 rounded-full text-green-400 text-[10px] font-semibold uppercase tracking-wide">
          Full Compliance
        </div>
      </div>
      {/* Checklist */}
      <div className="space-y-2">
        {READINESS_ITEMS.map((item, i) => (
          <div key={item.label} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors group">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${item.score === 100 ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}>
              {item.score === 100 ? (
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 leading-tight">{item.label}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{item.note}</p>
            </div>
            <ScoreBar score={item.score} delay={i * 60} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Institutional Buyer Tabs ─────────────────────────────────────────────────

export type BuyerTypeDef = {
  icon: string; type: string; use: string; products: string; route: string
  typical: string; recommended: string
}

export function InstitutionalBuyerTabs({ buyers }: { buyers: BuyerTypeDef[] }) {
  const [active, setActive] = useState(0)
  const b = buyers[active]
  return (
    <div>
      {/* Tab headers */}
      <div className="flex flex-wrap gap-2 mb-6">
        {buyers.map((buyer, i) => (
          <button key={i} onClick={() => setActive(i)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all border
              ${active === i
                ? "bg-gray-900 text-white border-gray-700 shadow-md"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-800"}`}>
            <span className="text-base">{buyer.icon}</span>
            <span className="hidden sm:inline">{buyer.type.split(" ")[0]}{buyer.type.includes("&") ? " " + buyer.type.split(" ")[1] + " " + buyer.type.split(" ")[2] : ""}</span>
          </button>
        ))}
      </div>
      {/* Active buyer card */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden">
        <div className="bg-gray-900 px-6 py-5">
          <div className="flex items-start gap-4">
            <span className="text-3xl">{b.icon}</span>
            <div>
              <h3 className="text-white font-bold text-lg">{b.type}</h3>
              <p className="text-gray-400 text-sm mt-1">{b.use}</p>
            </div>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
          <div className="px-5 py-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Typical Requirement</p>
            <p className="text-sm text-gray-700">{b.typical}</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Recommended Models</p>
            <p className="text-sm text-gray-700">{b.recommended}</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Procurement Route</p>
            <p className="text-sm text-gray-700">{b.route}</p>
          </div>
        </div>
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-500"><span className="font-medium">Products available:</span> {b.products}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Institutional Product Cards ─────────────────────────────────────────────

type ProductSlimRef = { _id: string; name: string; slug: string; imageUrls: string[]; badges: string[]; category: string }

interface CatalogueItem {
  id: string; name: string; slug: string
  buyerIcon: string; buyerType: string; buyerBg: string
  is14855: boolean; gem: boolean
  applications: string[]; specs: string[]; delivery: string
  matchTerms: string[]
}

const INSTITUTIONAL_CATALOGUE: CatalogueItem[] = [
  {
    id: "double-barrel", name: "Double Barrel Vehicle-Mounted Fogger", slug: "double-barrel-fogging-machine",
    buyerIcon: "🏛", buyerType: "Municipal Corporations", buyerBg: "bg-blue-600/20 text-blue-300 border-blue-500/30",
    is14855: true, gem: true,
    applications: ["Ward-level mosquito drives", "Dengue & malaria campaigns", "City-wide vector control"],
    specs: ["Dual-output nozzles", "Vehicle-mountable", "IS 14855 (Part 1)"],
    delivery: "5–10 working days", matchTerms: ["double barrel", "vehicle-mounted", "vehicle mounted"],
  },
  {
    id: "hdpe", name: "ISI Marked HDPE Tank Thermal Fogger", slug: "isi-marked-hdpe-thermal-fogging-machine",
    buyerIcon: "🏥", buyerType: "Health Departments", buyerBg: "bg-green-600/20 text-green-300 border-green-500/30",
    is14855: true, gem: true,
    applications: ["Emergency outbreak response", "NVBDCP programmes", "District health operations"],
    specs: ["ISI mark (BIS certified)", "IS 14855 (Part 1)", "HDPE tank"],
    delivery: "5–10 working days", matchTerms: ["hdpe", "isi marked", "isi mark"],
  },
  {
    id: "stainless", name: "Stainless Steel Heavy-Duty Fogger", slug: "stainless-steel-fogging-machine",
    buyerIcon: "🌿", buyerType: "Panchayats & Forest Depts", buyerBg: "bg-emerald-600/20 text-emerald-300 border-emerald-500/30",
    is14855: true, gem: true,
    applications: ["Long-service deployments", "Harsh-environment operations", "Pest control programmes"],
    specs: ["Stainless steel tank", "Heavy-duty build", "IS 14855 compliant"],
    delivery: "5–10 working days", matchTerms: ["stainless", "ss tank", "heavy duty", "heavy-duty"],
  },
  {
    id: "bf150", name: "BF-150 Petrol Portable Fogger", slug: "bf-150-fogging-machine",
    buyerIcon: "🛡", buyerType: "Defence & Cantonment Boards", buyerBg: "bg-violet-600/20 text-violet-300 border-violet-500/30",
    is14855: true, gem: true,
    applications: ["Cantonment hygiene ops", "Indoor vector control", "Rapid portable deployment"],
    specs: ["Petrol-powered engine", "IS 14855 (Part 1)", "GeM direct purchase"],
    delivery: "5–10 working days", matchTerms: ["bf-150", "bf150", "portable", "petrol"],
  },
  {
    id: "bf400", name: "BF-400 High-Capacity Fogger", slug: "bf-400-fogging-machine",
    buyerIcon: "✈️", buyerType: "Airports & Port Authorities", buyerBg: "bg-amber-600/20 text-amber-300 border-amber-500/30",
    is14855: true, gem: true,
    applications: ["Airport perimeter fogging", "Cargo area sanitisation", "High-coverage operations"],
    specs: ["High-capacity output", "IS 14855 certified", "Professional-grade"],
    delivery: "7–10 working days", matchTerms: ["bf-400", "bf400", "high capacity"],
  },
  {
    id: "cold-fogger", name: "Thermal + Cold ULV Fogging Machine", slug: "cold-fogging-machine",
    buyerIcon: "🌾", buyerType: "Agriculture & State Depts", buyerBg: "bg-teal-600/20 text-teal-300 border-teal-500/30",
    is14855: true, gem: true,
    applications: ["Agricultural pest control", "Indoor & outdoor use", "NHM programme supply"],
    specs: ["Dual mode: thermal + cold", "IS 14855 aligned", "Multi-chemical compatible"],
    delivery: "5–10 working days", matchTerms: ["cold", "ulv", "dual mode"],
  },
]

export function GovInstitutionalProductCards({ products }: { products: ProductSlimRef[] }) {
  function matchImage(item: CatalogueItem): string | null {
    const matched = products.find(p =>
      item.matchTerms.some(t => p.name.toLowerCase().includes(t))
    )
    return matched?.imageUrls?.[0] ?? products[0]?.imageUrls?.[0] ?? null
  }

  return (
    <div>
      {/* Section header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div>
          <p className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-2">GeM Registered OEM · IS 14855 Certified</p>
          <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
            Government Procurement Product Catalogue
          </h2>
          <p className="text-gray-400 text-sm mt-2 max-w-xl leading-relaxed">
            All models GeM-listed, IS 14855 (Part 1) certified, and ready for direct purchase or tender submission.
            L1 quotation available within 24 hours.
          </p>
        </div>
        <a
          href={`https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent("Hi, I am a government procurement officer and need the full product catalogue and L1 quotations for IS 14855 fogging machines.")}`}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-full text-sm transition-colors whitespace-nowrap flex-shrink-0"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Request Full Catalogue
        </a>
      </div>

      {/* Cards grid */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
        {INSTITUTIONAL_CATALOGUE.map((item) => {
          const img = matchImage(item)
          const waText = `Hi, I am a government procurement officer interested in the ${item.name} for tender/GeM procurement. Please share IS 14855 documentation, GeM listing ID, and L1 quotation.`
          const waHref = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(waText)}`

          return (
            <div key={item.id} className="bg-gray-900 border border-white/[0.08] rounded-2xl overflow-hidden flex flex-col hover:border-white/[0.16] transition-all duration-200 hover:shadow-xl hover:shadow-black/40">
              {/* Compliance badges */}
              <div className="flex items-center gap-2 px-4 pt-4">
                <span className="text-[10px] font-bold bg-green-900/50 text-green-400 border border-green-700/40 px-2 py-0.5 rounded-full uppercase tracking-wide">IS 14855</span>
                <span className="text-[10px] font-bold bg-blue-900/50 text-blue-400 border border-blue-700/40 px-2 py-0.5 rounded-full uppercase tracking-wide">GeM Listed</span>
                <span className="text-[10px] font-bold bg-white/[0.05] text-gray-500 border border-white/[0.08] px-2 py-0.5 rounded-full uppercase tracking-wide ml-auto">OEM Direct</span>
              </div>

              {/* Product image */}
              <div className="mx-4 mt-3 rounded-xl overflow-hidden bg-[#f5f7fa]" style={{ aspectRatio: "4/3" }}>
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt={item.name}
                    className="w-full h-full object-contain p-4 transition-transform duration-500 hover:scale-[1.04]"
                    loading="lazy" decoding="async" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center flex-col gap-2">
                    <svg className="w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <span className="text-[10px] text-gray-400">Product image on request</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col p-4 pt-3">
                {/* Buyer type tag */}
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm leading-none">{item.buyerIcon}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${item.buyerBg}`}>{item.buyerType}</span>
                </div>

                {/* Name */}
                <h3 className="text-white font-bold text-[0.9375rem] leading-snug mb-3">{item.name}</h3>

                {/* Applications */}
                <div className="mb-3">
                  <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Applications</p>
                  <ul className="space-y-1">
                    {item.applications.map((a, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-gray-400">
                        <svg className="w-2.5 h-2.5 text-brand-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg>
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Quick specs chips */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {item.specs.map((s, i) => (
                    <span key={i} className="text-[10px] bg-white/[0.05] text-gray-400 border border-white/[0.07] px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>

                {/* Delivery */}
                <div className="flex items-center gap-1.5 mb-4">
                  <svg className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                  <span className="text-xs text-gray-500">Delivery: <span className="text-gray-300 font-medium">{item.delivery}</span></span>
                </div>

                {/* CTAs */}
                <div className="flex gap-2 mt-auto">
                  <a href={`/${item.slug}`}
                    className="flex-1 inline-flex items-center justify-center text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.10] text-gray-200 px-3 py-2.5 rounded-xl transition-colors">
                    View Details
                  </a>
                  <a href={waHref} target="_blank" rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white px-3 py-2.5 rounded-xl transition-colors">
                    <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Tender Quote
                  </a>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom CTA strip */}
      <div className="mt-8 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-300 font-medium">Don&apos;t see the exact model you need?</p>
          <p className="text-xs text-gray-500 mt-0.5">We manufacture custom configurations within IS 14855 parameters.</p>
        </div>
        <div className="flex gap-3">
          <a href="#gov-rfq-form"
            className="inline-flex items-center gap-2 border border-white/[0.12] text-gray-200 hover:bg-white/[0.06] font-semibold px-5 py-2.5 rounded-full text-sm transition-colors">
            Fill RFQ Form
          </a>
          <a href={`https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent("Hi, I need a custom fogging machine specification for a government tender. Please advise.")}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-full text-sm transition-colors">
            Discuss Custom Requirements
          </a>
        </div>
      </div>
    </div>
  )
}
