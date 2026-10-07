"use client"
import { useEffect, useState, useCallback } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  BarChart3, Users, Database, Shield, TrendingUp, Brain,
  Globe, Layers, RefreshCw, ChevronRight, CheckCircle2,
  Clock, AlertTriangle, ExternalLink, Package,
  MapPin, Building2, Tag, Zap, Star,
  ArrowLeft, Settings, Archive, Network,
  DollarSign, FileText, Search,
} from "lucide-react"
import { CATEGORY_CATALOG } from "@/lib/category-catalog"

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkspaceStats {
  slug: string; name: string; icon: string; description: string
  status: string; collection: string; isCurated: boolean
  metrics: {
    contracts: number; gmvCr: number; buyers: number; suppliers: number
    oems: number; dealers: number; states: number; departments: number
    products: number; enriched: number; enrichPct: number; coveragePct: number
  }
  health: {
    archivePct: number; enrichPct: number; knowledgeGraph: number; aiSearchReady: number
    relationshipsPct: number; buyerProfilesPct: number; supplierProfilesPct: number
    oemMappingPct: number; marketPct: number; packReadyPct: number; overallScore: number
  }
  packs: Record<string, string>
  topBuyers:    { name: string; contracts: number; gmvCr: number }[]
  topSuppliers: { name: string; contracts: number; gmvCr: number }[]
  topProducts:  { name: string; count: number }[]
  topStates:    { state: string; count: number; gmvCr: number }[]
  monthlyVolume: { label: string; contracts: number; gmvCr: number }[]
  estimate: { contracts: number; gmvCr: number; importTimeMin: number; storageMb: number }
  timeline: { event: string; date: string | null; done: boolean }[]
  deepLinks: Record<string, string | null>
}

// ─── Constants ────────────────────────────────────────────────────────────────

type TabId = "overview" | "procurement" | "buyers" | "suppliers" | "dealers" |
  "oem" | "competitor" | "market" | "products" | "pricing" |
  "knowledge" | "ai-search" | "archive" | "recommendations" | "settings"

const TABS: { id: TabId; label: string; icon: typeof BarChart3; badge?: string }[] = [
  { id: "overview",        label: "Overview",         icon: BarChart3  },
  { id: "procurement",     label: "Procurement",      icon: FileText   },
  { id: "buyers",          label: "Buyers",           icon: Users      },
  { id: "suppliers",       label: "Suppliers",        icon: Database   },
  { id: "dealers",         label: "Dealers",          icon: Building2  },
  { id: "oem",             label: "OEM",              icon: Tag        },
  { id: "competitor",      label: "Competitor",       icon: Shield     },
  { id: "market",          label: "Market",           icon: TrendingUp },
  { id: "products",        label: "Products",         icon: Package    },
  { id: "pricing",         label: "Pricing",          icon: DollarSign },
  { id: "knowledge",       label: "Knowledge Graph",  icon: Network    },
  { id: "ai-search",       label: "AI Search",        icon: Brain      },
  { id: "archive",         label: "Archive",          icon: Archive    },
  { id: "recommendations", label: "Recommendations",  icon: Star       },
  { id: "settings",        label: "Settings",         icon: Settings   },
]

const PACK_LABELS: Record<string, string> = {
  procurement: "Procurement Intelligence",
  buyer:       "Buyer Intelligence",
  supplier:    "Supplier Intelligence",
  oem:         "OEM Intelligence",
  competitor:  "Competitor Intelligence",
  market:      "Market Intelligence",
  pricing:     "Pricing Intelligence",
  tender:      "Tender Intelligence",
  aiSearch:    "AI Search Intelligence",
  knowledgeGraph: "Knowledge Graph",
}

const PACK_ICONS: Record<string, typeof BarChart3> = {
  procurement: BarChart3,
  buyer:       Users,
  supplier:    Database,
  oem:         Tag,
  competitor:  Shield,
  market:      TrendingUp,
  pricing:     DollarSign,
  tender:      FileText,
  aiSearch:    Brain,
  knowledgeGraph: Network,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtN(n: number) { return n.toLocaleString("en-IN") }
function fmtDate(d: string | null) {
  if (!d || typeof d !== "string") return null
  const parsed = new Date(d)
  if (isNaN(parsed.getTime())) return d
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function PackChip({ status }: { status: string }) {
  const cfg = {
    active:      "bg-emerald-100 text-emerald-700 border-emerald-200",
    pending:     "bg-amber-100 text-amber-700 border-amber-200",
    in_progress: "bg-blue-100 text-blue-700 border-blue-200",
    not_started: "bg-gray-100 text-gray-400 border-gray-200",
  }[status] ?? "bg-gray-100 text-gray-400 border-gray-200"
  const label = { active: "Active", pending: "Pending", in_progress: "In Progress", not_started: "Not Started" }[status] ?? status
  return <span className={`text-[9px] border px-1.5 py-0.5 rounded-full font-medium ${cfg}`}>{label}</span>
}

function ScoreArc({ score }: { score: number }) {
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#6b7280"
  return (
    <div className="relative w-28 h-14 overflow-hidden mx-auto">
      <svg viewBox="0 0 120 60" className="w-full">
        <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="#f3f4f6" strokeWidth="14" strokeLinecap="round" />
        <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke={color} strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 157} 157`}
        />
      </svg>
      <div className="absolute inset-0 flex items-end justify-center pb-0.5">
        <span className="text-xl font-black text-gray-800">{score}</span>
      </div>
    </div>
  )
}

function HealthBar({ label, pct, color = "bg-emerald-500" }: { label: string; pct: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500 w-40 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="text-[10px] text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  )
}

function DeepLinkCard({ label, href, description, icon: Icon, active }: {
  label: string; href: string | null; description: string; icon: typeof BarChart3; active: boolean
}) {
  if (!active || !href) {
    return (
      <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl opacity-50">
        <Icon size={16} className="text-gray-300 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-gray-400">{label}</p>
          <p className="text-[10px] text-gray-400">{active ? "Not yet available for this category" : description}</p>
        </div>
      </div>
    )
  }
  return (
    <Link href={href} className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-brand-300 hover:bg-brand-50/30 transition-all group">
      <Icon size={16} className="text-brand-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 group-hover:text-brand-700">{label}</p>
        <p className="text-[10px] text-gray-500">{description}</p>
      </div>
      <ExternalLink size={11} className="text-gray-300 group-hover:text-brand-500 shrink-0 mt-0.5" />
    </Link>
  )
}

function NotStartedState({ packName, slug }: { packName: string; slug: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <Clock size={24} className="text-gray-300" />
      </div>
      <h3 className="text-sm font-bold text-gray-600 mb-1">{packName} — Not Started</h3>
      <p className="text-xs text-gray-400 max-w-xs">
        Import the archive data for this category to unlock {packName.toLowerCase()}.
        Once imported, this tab activates automatically.
      </p>
      <Link
        href={`/admin/growth/categories?import=${slug}`}
        className="mt-4 text-xs px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
      >
        Import Category Data
      </Link>
    </div>
  )
}

// ─── Tab: Overview ───────────────────────────────────────────────────────────

function OverviewTab({ data }: { data: WorkspaceStats }) {
  const { metrics: m, health: h, packs, topBuyers, topStates, timeline, deepLinks } = data
  const isActive = data.status === "active"

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {([
          ["Contracts",   fmtN(m.contracts),   m.contracts > 0 ? "text-brand-700" : "text-gray-400"],
          ["GMV (Cr)",    m.gmvCr > 0 ? `₹${m.gmvCr}` : "—", "text-emerald-700"],
          ["Buyers",      fmtN(m.buyers),      "text-blue-700"],
          ["Suppliers",   fmtN(m.suppliers),   "text-purple-700"],
          ["States",      String(m.states),    "text-amber-700"],
          ["Departments", String(m.departments), "text-gray-700"],
          ["OEMs",        String(m.oems),      "text-pink-700"],
          ["Products",    String(m.products),  "text-teal-700"],
          ["Coverage",    `${m.coveragePct}%`, m.coveragePct >= 80 ? "text-emerald-700" : "text-amber-700"],
          ["Enriched",    `${m.enrichPct}%`,   m.enrichPct >= 80 ? "text-emerald-700" : "text-amber-700"],
          ["Dealers",     fmtN(m.dealers),     "text-indigo-700"],
          ["Quality",     isActive ? `${h.overallScore}/100` : "—", h.overallScore >= 70 ? "text-emerald-700" : "text-amber-700"],
        ] as [string, string, string][]).map(([label, val, color]) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm">
            <p className="text-[9px] text-gray-400 uppercase tracking-wide">{label}</p>
            <p className={`text-base font-black ${color} leading-tight`}>{val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Category Health Score */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-4">
          <p className="text-xs font-bold text-gray-700">Category Health Score</p>
          <ScoreArc score={h.overallScore} />
          <div className="space-y-2">
            <HealthBar label="Archive Coverage"   pct={h.archivePct}        color="bg-blue-500" />
            <HealthBar label="Enrichment"         pct={h.enrichPct}         color="bg-emerald-500" />
            <HealthBar label="Pack Readiness"     pct={h.packReadyPct}      color="bg-purple-500" />
            <HealthBar label="Buyer Profiles"     pct={h.buyerProfilesPct}  color="bg-amber-500" />
            <HealthBar label="Supplier Profiles"  pct={h.supplierProfilesPct} color="bg-pink-500" />
            <HealthBar label="OEM Mapping"        pct={h.oemMappingPct}     color="bg-teal-500" />
            <HealthBar label="Market Intelligence" pct={h.marketPct}        color="bg-indigo-500" />
            <HealthBar label="Knowledge Graph"    pct={h.knowledgeGraph}    color="bg-violet-500" />
            <HealthBar label="AI Search"          pct={h.aiSearchReady}     color="bg-sky-500" />
          </div>
        </div>

        {/* Intelligence Pack Status */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-700 mb-3">Intelligence Packs</p>
          <div className="space-y-2">
            {Object.entries(PACK_LABELS).map(([key, label]) => {
              const Icon   = PACK_ICONS[key] ?? BarChart3
              const status = packs[key] ?? "not_started"
              return (
                <div key={key} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon size={12} className={status === "active" ? "text-emerald-600" : "text-gray-300"} />
                    <span className="text-[11px] text-gray-700">{label}</span>
                  </div>
                  <PackChip status={status} />
                </div>
              )
            })}
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-700 mb-3">Category Timeline</p>
          <div className="space-y-3">
            {timeline.map((t, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                  t.done ? "bg-emerald-100" : "bg-gray-100"
                }`}>
                  {t.done
                    ? <CheckCircle2 size={10} className="text-emerald-600" />
                    : <Clock size={9} className="text-gray-300" />}
                </div>
                <div>
                  <p className={`text-[11px] font-medium ${t.done ? "text-gray-800" : "text-gray-400"}`}>{t.event}</p>
                  {t.date && (
                    <p className="text-[9px] text-gray-400">{fmtDate(t.date) ?? t.date}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links to Deep Pages */}
      <div>
        <p className="text-xs font-bold text-gray-700 mb-3">Quick Access</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <DeepLinkCard
            label="Procurement Intelligence"
            href={deepLinks.procurement}
            description="Contract search, buyer mapping, GMV analytics"
            icon={BarChart3}
            active={m.contracts > 0}
          />
          {data.isCurated && (
            <DeepLinkCard
              label={`${data.name} Intelligence`}
              href={deepLinks.foggingFull}
              description="Fully enriched curated intelligence — all OEM, buyer, org data"
              icon={Zap}
              active={true}
            />
          )}
          <DeepLinkCard
            label="Dealer Intelligence"
            href={deepLinks.dealers}
            description="790 real dealer prospects with GST, email, phone"
            icon={Building2}
            active={true}
          />
          <DeepLinkCard
            label="Competitor Intelligence"
            href={deepLinks.competitors}
            description="Competitive landscape, threat scores, OEM analysis"
            icon={Shield}
            active={packs.competitor === "active"}
          />
          <DeepLinkCard
            label="Market Intelligence"
            href={deepLinks.market}
            description="Market trends, GMV growth, buyer forecasts"
            icon={TrendingUp}
            active={packs.market === "active"}
          />
          <DeepLinkCard
            label="AI Search Visibility"
            href={deepLinks.aiSearch}
            description="GEO tracking, AI citation monitoring, search position"
            icon={Brain}
            active={true}
          />
        </div>
      </div>

      {/* Top States */}
      {topStates.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-700 mb-3">Top States by Contracts</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {topStates.map(s => (
              <div key={s.state} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <MapPin size={9} className="text-gray-400 shrink-0" />
                  <span className="text-[10px] text-gray-700 truncate">{s.state}</span>
                </div>
                <span className="text-[10px] font-bold text-gray-600 shrink-0 ml-1">{fmtN(s.count)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Buyers ──────────────────────────────────────────────────────────────

function BuyersTab({ data }: { data: WorkspaceStats }) {
  if (data.status !== "active") return <NotStartedState packName="Buyer Intelligence" slug={data.slug} />
  const buyers = data.topBuyers
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {([
          ["Total Buyers",   fmtN(data.metrics.buyers)],
          ["Avg Contracts",  data.metrics.buyers > 0 ? Math.round(data.metrics.contracts / data.metrics.buyers).toString() : "—"],
          ["States Covered", String(data.metrics.states)],
        ] as [string, string][]).map(([k, v]) => (
          <div key={k} className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
            <p className="text-[9px] text-blue-400 uppercase tracking-wide">{k}</p>
            <p className="text-lg font-black text-blue-700">{v}</p>
          </div>
        ))}
      </div>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-700">Top Buyers by Contract Count</p>
        </div>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-2 text-left text-[9px] text-gray-400 uppercase tracking-wide">#</th>
              <th className="px-4 py-2 text-left text-[9px] text-gray-400 uppercase tracking-wide">Organization</th>
              <th className="px-4 py-2 text-right text-[9px] text-gray-400 uppercase tracking-wide">Contracts</th>
              <th className="px-4 py-2 text-right text-[9px] text-gray-400 uppercase tracking-wide">GMV (Cr)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {buyers.map((b, i) => (
              <tr key={b.name} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[280px] truncate">{b.name || "—"}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-brand-700">{fmtN(b.contracts)}</td>
                <td className="px-4 py-2.5 text-right text-gray-600">₹{b.gmvCr}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.deepLinks.foggingFull && (
        <Link href={`${data.deepLinks.foggingFull}/buyer`}
          className="flex items-center gap-2 text-xs text-brand-600 hover:text-brand-700">
          <ExternalLink size={12} />
          Open full Buyer Intelligence with org resolution and contacts →
        </Link>
      )}
    </div>
  )
}

// ─── Tab: Suppliers ───────────────────────────────────────────────────────────

function SuppliersTab({ data }: { data: WorkspaceStats }) {
  if (data.status !== "active") return <NotStartedState packName="Supplier Intelligence" slug={data.slug} />
  const suppliers = data.topSuppliers
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {([
          ["Total Suppliers", fmtN(data.metrics.suppliers)],
          ["OEMs Identified", String(data.metrics.oems)],
          ["Avg Contracts",   data.metrics.suppliers > 0 ? Math.round(data.metrics.contracts / data.metrics.suppliers).toString() : "—"],
        ] as [string, string][]).map(([k, v]) => (
          <div key={k} className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
            <p className="text-[9px] text-purple-400 uppercase tracking-wide">{k}</p>
            <p className="text-lg font-black text-purple-700">{v}</p>
          </div>
        ))}
      </div>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-700">Top Suppliers by Contract Count</p>
        </div>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-2 text-left text-[9px] text-gray-400 uppercase tracking-wide">#</th>
              <th className="px-4 py-2 text-left text-[9px] text-gray-400 uppercase tracking-wide">Seller</th>
              <th className="px-4 py-2 text-right text-[9px] text-gray-400 uppercase tracking-wide">Contracts</th>
              <th className="px-4 py-2 text-right text-[9px] text-gray-400 uppercase tracking-wide">GMV (Cr)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {suppliers.map((s, i) => (
              <tr key={s.name} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[280px] truncate">{s.name || "—"}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-purple-700">{fmtN(s.contracts)}</td>
                <td className="px-4 py-2.5 text-right text-gray-600">₹{s.gmvCr}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.deepLinks.foggingFull && (
        <Link href={`${data.deepLinks.foggingFull}/oem`}
          className="flex items-center gap-2 text-xs text-brand-600 hover:text-brand-700">
          <ExternalLink size={12} />
          Open OEM Intelligence — brand-level market share breakdown →
        </Link>
      )}
    </div>
  )
}

// ─── Tab: Products ────────────────────────────────────────────────────────────

function ProductsTab({ data }: { data: WorkspaceStats }) {
  if (data.status !== "active") return <NotStartedState packName="Product Intelligence" slug={data.slug} />
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 text-center">
          <p className="text-[9px] text-teal-400 uppercase tracking-wide">Unique Products</p>
          <p className="text-2xl font-black text-teal-700">{fmtN(data.metrics.products)}</p>
        </div>
        <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 text-center">
          <p className="text-[9px] text-teal-400 uppercase tracking-wide">Enriched Records</p>
          <p className="text-2xl font-black text-teal-700">{fmtN(data.metrics.enriched)}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {data.topProducts.map((p, i) => (
          <div key={p.name} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-3 py-2.5 shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] text-gray-400 w-4 shrink-0">{i + 1}</span>
              <span className="text-[11px] font-medium text-gray-700 truncate">{p.name}</span>
            </div>
            <span className="text-[10px] font-bold text-brand-600 shrink-0 ml-2">{fmtN(p.count)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tab: Pricing ─────────────────────────────────────────────────────────────

function PricingTab({ data }: { data: WorkspaceStats }) {
  if (data.status !== "active") return <NotStartedState packName="Pricing Intelligence" slug={data.slug} />
  const avgContract = data.metrics.contracts > 0 ? data.metrics.gmvCr / data.metrics.contracts : 0
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {([
          ["Total GMV",     `₹${data.metrics.gmvCr} Cr`],
          ["Avg Contract",  `₹${(avgContract * 10_000_000 / 100_000).toFixed(1)}L`],
          ["Contracts",     fmtN(data.metrics.contracts)],
        ] as [string, string][]).map(([k, v]) => (
          <div key={k} className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
            <p className="text-[9px] text-emerald-400 uppercase tracking-wide">{k}</p>
            <p className="text-lg font-black text-emerald-700">{v}</p>
          </div>
        ))}
      </div>
      {data.isCurated && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-700 flex items-start gap-2">
          <DollarSign size={12} className="shrink-0 mt-0.5 text-amber-500" />
          <span>
            Unit price analysis is available for fogging machines.
            Open <Link href="/admin/growth/fogging" className="font-semibold underline">Fogging Intelligence</Link> to
            see model-level pricing with ₹/unit breakdowns.
          </span>
        </div>
      )}
      {!data.isCurated && (
        <div className="text-center py-8 text-gray-400 text-sm">
          Unit price enrichment requires OEM classification. Import and enrich this category to enable pricing analysis.
        </div>
      )}
    </div>
  )
}

// ─── Tab: Procurement ─────────────────────────────────────────────────────────

function ProcurementTab({ data }: { data: WorkspaceStats }) {
  if (data.status !== "active") return <NotStartedState packName="Procurement Intelligence" slug={data.slug} />
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          ["Total Contracts", fmtN(data.metrics.contracts), "brand"],
          ["Total GMV",       `₹${data.metrics.gmvCr} Cr`, "emerald"],
          ["Buyers",          fmtN(data.metrics.buyers),   "blue"],
          ["States",          String(data.metrics.states), "amber"],
        ] as [string, string, string][]).map(([k, v, c]) => (
          <div key={k} className={`bg-${c}-50 border border-${c}-100 rounded-xl p-3 text-center`}>
            <p className={`text-[9px] text-${c}-400 uppercase tracking-wide`}>{k}</p>
            <p className={`text-lg font-black text-${c}-700`}>{v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link href={data.deepLinks.procurement ?? "/admin/growth/procurement"}
          className="group flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-brand-300 hover:bg-brand-50/20 transition-all shadow-sm">
          <BarChart3 size={20} className="text-brand-600" />
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-800 group-hover:text-brand-700">Procurement Intelligence</p>
            <p className="text-xs text-gray-500">Full contract search across all categories</p>
          </div>
          <ExternalLink size={14} className="text-gray-300 group-hover:text-brand-500" />
        </Link>

        {data.isCurated && data.deepLinks.foggingFull && (
          <Link href={data.deepLinks.foggingFull}
            className="group flex items-center gap-3 p-4 bg-white border border-brand-200 rounded-xl hover:border-brand-300 hover:bg-brand-50/30 transition-all shadow-sm">
            <Zap size={20} className="text-brand-600" />
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-800 group-hover:text-brand-700">{data.name} Intelligence</p>
              <p className="text-xs text-gray-500">Curated dataset — fully enriched v1.4</p>
            </div>
            <ExternalLink size={14} className="text-gray-300 group-hover:text-brand-500" />
          </Link>
        )}
      </div>

      {/* Monthly Volume */}
      {data.monthlyVolume.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-700 mb-3">Monthly Contract Volume</p>
          <div className="flex items-end gap-1 h-24">
            {data.monthlyVolume.map((m, i) => {
              const max = Math.max(...data.monthlyVolume.map(x => x.contracts))
              const h   = max > 0 ? Math.round((m.contracts / max) * 100) : 0
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-[8px] text-gray-400">{fmtN(m.contracts)}</span>
                  <div className="w-full bg-brand-500 rounded-t-sm" style={{ height: `${h}%`, minHeight: "2px" }} />
                  <span className="text-[8px] text-gray-400 rotate-0">{m.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Dealers ─────────────────────────────────────────────────────────────

function DealersTab({ data }: { data: WorkspaceStats }) {
  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
        <Building2 size={16} className="text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-indigo-800">Dealer Intelligence</p>
          <p className="text-xs text-indigo-600 mt-0.5">
            {fmtN(data.metrics.dealers)} real dealer prospects across India — with GST, email, phone, and state.
            Dealer data is shared across all categories.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link href="/admin/growth/dealers"
          className="group flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-brand-300 hover:bg-brand-50/20 shadow-sm transition-all">
          <Building2 size={20} className="text-brand-600" />
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-800 group-hover:text-brand-700">Dealer Intelligence</p>
            <p className="text-xs text-gray-500">Full dealer database with enrichment scores</p>
          </div>
          <ExternalLink size={14} className="text-gray-300 group-hover:text-brand-500" />
        </Link>
        <Link href="/admin/growth/dealers/prospects"
          className="group flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-brand-300 hover:bg-brand-50/20 shadow-sm transition-all">
          <TrendingUp size={20} className="text-brand-600" />
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-800 group-hover:text-brand-700">Prospect Engine</p>
            <p className="text-xs text-gray-500">Prioritized outreach list with contact details</p>
          </div>
          <ExternalLink size={14} className="text-gray-300 group-hover:text-brand-500" />
        </Link>
      </div>
    </div>
  )
}

// ─── Generic placeholder tabs ──────────────────────────────────────────────────

function ComingSoonTab({ title, description, icon: Icon, deepLink }: {
  title: string; description: string; icon: typeof BarChart3; deepLink?: string | null
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
        <Icon size={24} className="text-gray-300" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-gray-600">{title}</h3>
        <p className="text-xs text-gray-400 max-w-xs mt-1">{description}</p>
      </div>
      {deepLink && (
        <Link href={deepLink} className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700">
          <ExternalLink size={11} />Open existing {title} →
        </Link>
      )}
    </div>
  )
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ data }: { data: WorkspaceStats }) {
  const cat = CATEGORY_CATALOG.find(c => c.slug === data.slug)
  return (
    <div className="space-y-4 max-w-xl">
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
        <p className="text-xs font-bold text-gray-700">Category Configuration</p>
        <div className="space-y-2 text-[11px]">
          <div className="flex justify-between py-1.5 border-b border-gray-50">
            <span className="text-gray-500">Slug</span>
            <span className="font-mono font-medium text-gray-800">{data.slug}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-gray-50">
            <span className="text-gray-500">Collection</span>
            <span className="font-mono font-medium text-gray-800">{data.collection}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-gray-50">
            <span className="text-gray-500">Curated</span>
            <span className={`font-medium ${data.isCurated ? "text-emerald-600" : "text-gray-400"}`}>
              {data.isCurated ? "Yes — dedicated enriched collection" : "No — generic archive with tagging"}
            </span>
          </div>
          <div className="py-1.5 border-b border-gray-50">
            <p className="text-gray-500 mb-1.5">Keywords</p>
            <div className="flex flex-wrap gap-1">
              {cat?.keywords.map(kw => (
                <span key={kw} className="text-[9px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{kw}</span>
              ))}
            </div>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-gray-500">Est. Total Contracts</span>
            <span className="font-medium text-gray-800">{fmtN(data.estimate.contracts)}</span>
          </div>
        </div>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[10px] text-amber-700 flex gap-2">
        <AlertTriangle size={10} className="shrink-0 mt-0.5 text-amber-500" />
        <span>Category settings (name, keywords, enabled state) can be edited via the Category Manager. Pack enablement is automatic based on data availability.</span>
      </div>
      <Link href="/admin/growth/categories"
        className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700">
        <ArrowLeft size={11} />Back to Category Manager
      </Link>
    </div>
  )
}

// ─── Main Workspace Page ──────────────────────────────────────────────────────

export default function CategoryWorkspacePage() {
  const params        = useParams<{ slug: string }>()
  const searchParams  = useSearchParams()
  const router        = useRouter()
  const slug          = params.slug

  const tab = (searchParams.get("tab") as TabId) ?? "overview"

  const [data,    setData]    = useState<WorkspaceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`/api/admin/growth/categories/${slug}/stats`)
      if (!res.ok) { setError(true); return }
      setData(await res.json())
    } catch { setError(true) }
    finally { setLoading(false) }
  }, [slug])

  useEffect(() => { load() }, [load])

  const setTab = (t: TabId) => {
    const url = new URL(window.location.href)
    url.searchParams.set("tab", t)
    router.replace(url.pathname + url.search, { scroll: false })
  }

  const cat = CATEGORY_CATALOG.find(c => c.slug === slug)

  if (error) return (
    <main className="flex-1 p-4 flex items-center justify-center">
      <div className="text-center">
        <p className="text-sm font-bold text-gray-600 mb-1">Category not found</p>
        <p className="text-xs text-gray-400 mb-3">Slug &quot;{slug}&quot; is not in the catalog.</p>
        <Link href="/admin/growth/categories" className="text-xs text-brand-600 hover:text-brand-700">
          ← Back to Category Manager
        </Link>
      </div>
    </main>
  )

  const name = data?.name ?? cat?.name ?? slug
  const icon = data?.icon ?? cat?.icon ?? "📦"

  return (
    <main className="flex-1 flex flex-col min-h-0">
      {/* Workspace header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-2">
          <Link href="/admin/growth/categories" className="hover:text-gray-600 flex items-center gap-1">
            <Layers size={10} />Category Manager
          </Link>
          <ChevronRight size={10} />
          <span className="text-gray-600 font-medium">{name}</span>
        </div>

        {/* Title row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <div>
              <h1 className="text-base font-black text-gray-900 leading-tight">
                {name} Intelligence
              </h1>
              <p className="text-[10px] text-gray-400 mt-0.5">{cat?.description ?? ""}</p>
            </div>
            {data && (
              <span className={`text-[9px] px-2 py-1 rounded-full font-bold border ${
                data.status === "active"
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                  : "bg-gray-100 text-gray-500 border-gray-200"
              }`}>
                {data.status === "active" ? "● Active" : "Not Imported"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {data?.status !== "active" && (
              <Link
                href={`/admin/growth/categories?import=${slug}`}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
              >
                Import Category
              </Link>
            )}
            <button onClick={load} disabled={loading}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Status strip */}
        {data && (
          <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400 flex-wrap">
            <span>{fmtN(data.metrics.contracts)} contracts</span>
            <span>·</span>
            <span>₹{data.metrics.gmvCr} Cr GMV</span>
            <span>·</span>
            <span>{fmtN(data.metrics.buyers)} buyers</span>
            <span>·</span>
            <span>{data.metrics.states} states</span>
            <span>·</span>
            <span>Health {data.health.overallScore}/100</span>
            <span>·</span>
            <span className="text-[9px] font-mono text-gray-300">{data.collection}</span>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-100 px-4 overflow-x-auto">
        <div className="flex gap-0.5 py-1 min-w-max">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                tab === t.id
                  ? "bg-brand-50 text-brand-700 font-semibold"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <t.icon size={11} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {[...Array(12)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
            <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
          </div>
        ) : data ? (
          <>
            {tab === "overview"        && <OverviewTab data={data} />}
            {tab === "procurement"     && <ProcurementTab data={data} />}
            {tab === "buyers"          && <BuyersTab data={data} />}
            {tab === "suppliers"       && <SuppliersTab data={data} />}
            {tab === "dealers"         && <DealersTab data={data} />}
            {tab === "products"        && <ProductsTab data={data} />}
            {tab === "pricing"         && <PricingTab data={data} />}
            {tab === "oem"             && (
              data.packs.oem === "active"
                ? <ComingSoonTab title="OEM Intelligence" description="OEM mapping available — open Fogging Intelligence for full OEM breakdown" icon={Tag} deepLink={data.deepLinks.foggingFull ? `${data.deepLinks.foggingFull}/oem` : null} />
                : <NotStartedState packName="OEM Intelligence" slug={slug} />
            )}
            {tab === "competitor"      && (
              data.packs.competitor === "active"
                ? <ComingSoonTab title="Competitor Intelligence" description="Full competitive analysis available" icon={Shield} deepLink={data.deepLinks.competitors} />
                : <NotStartedState packName="Competitor Intelligence" slug={slug} />
            )}
            {tab === "market"          && (
              data.packs.market === "active"
                ? <ComingSoonTab title="Market Intelligence" description="Trend analysis, GMV forecasts, regional insights" icon={TrendingUp} deepLink={data.deepLinks.market} />
                : <NotStartedState packName="Market Intelligence" slug={slug} />
            )}
            {tab === "knowledge"       && <ComingSoonTab title="Knowledge Graph" description="Entity relationships between buyers, sellers, OEMs, and products. Requires enrichment." icon={Network} />}
            {tab === "ai-search"       && <ComingSoonTab title="AI Search Intelligence" description="GEO tracking and AI citation monitoring for this category" icon={Brain} deepLink={data.deepLinks.aiSearch} />}
            {tab === "archive"         && <ComingSoonTab title="Archive" description="Full raw contract archive with download and filtering" icon={Archive} deepLink={data.deepLinks.procurement} />}
            {tab === "recommendations" && <ComingSoonTab title="Recommendations" description="AI-generated growth recommendations for this category" icon={Star} />}
            {tab === "settings"        && <SettingsTab data={data} />}
          </>
        ) : null}
      </div>
    </main>
  )
}
