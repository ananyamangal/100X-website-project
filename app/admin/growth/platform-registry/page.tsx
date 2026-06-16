"use client"
import { useState, useMemo } from "react"
import {
  Database, Search, CheckCircle2, EyeOff, AlertCircle,
  Archive, Copy, XCircle, Filter, ChevronDown, ChevronRight,
  Activity, TrendingUp, BarChart2, Layers, Clock, LayoutGrid,
} from "lucide-react"
import {
  CAPABILITY_REGISTRY,
  COLLECTION_REGISTRY,
  STATUS_LABELS,
  STATUS_COLOR,
  CATEGORY_LABELS,
  getRegistryStats,
  type CapabilityStatus,
  type CapabilityCategory,
  type Capability,
} from "@/lib/growth-os/platform-registry"

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "capabilities" | "collections" | "agents" | "crm" | "roadmap"

const STATUS_ICON: Record<CapabilityStatus, React.ReactNode> = {
  active:    <CheckCircle2 size={12} className="text-green-600" />,
  hidden:    <EyeOff       size={12} className="text-yellow-600" />,
  orphaned:  <AlertCircle  size={12} className="text-orange-600" />,
  legacy:    <Archive      size={12} className="text-gray-500" />,
  duplicate: <Copy         size={12} className="text-blue-600" />,
  broken:    <XCircle      size={12} className="text-red-600" />,
}

const ALL_STATUSES: CapabilityStatus[] = ["active", "hidden", "orphaned", "legacy", "duplicate", "broken"]

// ─── Capability row ────────────────────────────────────────────────────────────

function CapabilityRow({ cap }: { cap: Capability }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-start gap-3"
      >
        <span className="mt-0.5 flex-shrink-0">{STATUS_ICON[cap.status]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900">{cap.name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${STATUS_COLOR[cap.status]}`}>
              {STATUS_LABELS[cap.status]}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200">
              {CATEGORY_LABELS[cap.category]}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{cap.description}</p>
        </div>
        {expanded ? <ChevronDown size={14} className="text-gray-400 flex-shrink-0 mt-0.5" /> : <ChevronRight size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />}
      </button>

      {expanded && (
        <div className="px-11 pb-4 space-y-3">
          {cap.route && (
            <div className="flex gap-3">
              <span className="text-[11px] font-medium text-gray-500 w-24 flex-shrink-0 pt-0.5">Route</span>
              <a href={cap.route} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 hover:underline font-mono">{cap.route}</a>
            </div>
          )}
          {cap.api && (
            <div className="flex gap-3">
              <span className="text-[11px] font-medium text-gray-500 w-24 flex-shrink-0 pt-0.5">API</span>
              <span className="text-[11px] text-gray-700 font-mono">{cap.api}</span>
            </div>
          )}
          {cap.collections && cap.collections.length > 0 && (
            <div className="flex gap-3">
              <span className="text-[11px] font-medium text-gray-500 w-24 flex-shrink-0 pt-0.5">Collections</span>
              <div className="flex flex-wrap gap-1">
                {cap.collections.map(c => (
                  <span key={c} className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200 font-mono">{c}</span>
                ))}
              </div>
            </div>
          )}
          {cap.trigger && (
            <div className="flex gap-3">
              <span className="text-[11px] font-medium text-gray-500 w-24 flex-shrink-0 pt-0.5">Trigger</span>
              <span className="text-[11px] text-gray-700">{cap.trigger}</span>
            </div>
          )}
          {cap.output && (
            <div className="flex gap-3">
              <span className="text-[11px] font-medium text-gray-500 w-24 flex-shrink-0 pt-0.5">Output</span>
              <span className="text-[11px] text-gray-700">{cap.output}</span>
            </div>
          )}
          {cap.usedBy && (
            <div className="flex gap-3">
              <span className="text-[11px] font-medium text-gray-500 w-24 flex-shrink-0 pt-0.5">Used by</span>
              <span className="text-[11px] text-gray-700">{cap.usedBy}</span>
            </div>
          )}
          {cap.statusNote && (
            <div className="mt-2 p-2 rounded bg-amber-50 border border-amber-200">
              <p className="text-[11px] text-amber-800">{cap.statusNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Capabilities ────────────────────────────────────────────────────────

function CapabilitiesTab() {
  const [query,          setQuery]          = useState("")
  const [statusFilter,   setStatusFilter]   = useState<CapabilityStatus | "all">("all")
  const [categoryFilter, setCategoryFilter] = useState<CapabilityCategory | "all">("all")

  const categories = useMemo(() => {
    const cats = Array.from(new Set(CAPABILITY_REGISTRY.map(c => c.category)))
    return cats.sort()
  }, [])

  const filtered = useMemo(() => {
    return CAPABILITY_REGISTRY.filter(c => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false
      if (categoryFilter !== "all" && c.category !== categoryFilter) return false
      if (query) {
        const q = query.toLowerCase()
        return (
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          (c.route?.toLowerCase().includes(q) ?? false) ||
          (c.api?.toLowerCase().includes(q) ?? false) ||
          (c.collections?.some(col => col.toLowerCase().includes(q)) ?? false)
        )
      }
      return true
    })
  }, [query, statusFilter, categoryFilter])

  const stats = getRegistryStats()

  return (
    <div className="space-y-4">
      {/* Summary tiles */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {ALL_STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(prev => prev === s ? "all" : s)}
            className={`rounded-lg border p-3 text-center transition-all ${
              statusFilter === s ? "ring-2 ring-offset-1 ring-blue-400 " + STATUS_COLOR[s] : "bg-white border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex justify-center mb-1">{STATUS_ICON[s]}</div>
            <div className="text-lg font-bold text-gray-900">{stats.byStatus[s] || 0}</div>
            <div className="text-[10px] text-gray-500 capitalize">{s}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search capabilities, routes, collections…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
          />
        </div>
        <div className="relative">
          <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value as CapabilityCategory | "all")}
            className="pl-7 pr-6 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white appearance-none"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">{filtered.length} of {CAPABILITY_REGISTRY.length} capabilities</span>
          {(query || statusFilter !== "all" || categoryFilter !== "all") && (
            <button
              onClick={() => { setQuery(""); setStatusFilter("all"); setCategoryFilter("all") }}
              className="text-xs text-blue-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">No capabilities match your filters.</div>
        ) : (
          filtered.map(cap => <CapabilityRow key={cap.id} cap={cap} />)
        )}
      </div>
    </div>
  )
}

// ─── Tab: Collections ─────────────────────────────────────────────────────────

function CollectionsTab() {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    if (!query) return COLLECTION_REGISTRY
    const q = query.toLowerCase()
    return COLLECTION_REGISTRY.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.purpose.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.writtenBy.toLowerCase().includes(q)
    )
  }, [query])

  const byCategory = useMemo(() => {
    return filtered.reduce((acc, c) => {
      if (!acc[c.category]) acc[c.category] = []
      acc[c.category].push(c)
      return acc
    }, {} as Record<string, typeof filtered>)
  }, [filtered])

  const statusColors: Record<string, string> = {
    active:   "bg-green-100 text-green-700 border-green-200",
    frozen:   "bg-blue-100 text-blue-700 border-blue-200",
    legacy:   "bg-gray-100 text-gray-500 border-gray-200",
    orphaned: "bg-orange-100 text-orange-700 border-orange-200",
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{COLLECTION_REGISTRY.length}</span> MongoDB collections in 100xDB
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search collections…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white w-56"
          />
        </div>
      </div>

      {Object.entries(byCategory).sort().map(([cat, cols]) => (
        <div key={cat} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">{cat}</h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400">
                <th className="text-left px-4 py-2 font-medium">Collection</th>
                <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Purpose</th>
                <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Written by</th>
                <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Read by</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">~Docs</th>
              </tr>
            </thead>
            <tbody>
              {cols.map(col => (
                <tr key={col.name} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-[11px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">{col.name}</span>
                  </td>
                  <td className="px-4 py-2 text-gray-600 hidden sm:table-cell max-w-48">
                    <span className="line-clamp-2">{col.purpose}</span>
                  </td>
                  <td className="px-4 py-2 text-gray-500 hidden md:table-cell">{col.writtenBy}</td>
                  <td className="px-4 py-2 text-gray-500 hidden md:table-cell">{col.readBy}</td>
                  <td className="px-4 py-2">
                    <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${statusColors[col.status] || statusColors.active}`}>
                      {col.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-400 hidden sm:table-cell">{col.estimatedDocs || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

// ─── Tab: Agents & Crons ──────────────────────────────────────────────────────

function AgentsTab() {
  const crons = [
    {
      name: "Revenue Director",
      schedule: "Daily 07:00 IST (01:30 UTC)",
      route: "/api/admin/growth/cron/revenue-director",
      description: "Reads fogging + ads + GSC, generates ranked recommendations, sends morning email",
      collections: ["director_recommendations", "director_daily_runs"],
      status: "active",
    },
    {
      name: "GSC Daily Sync",
      schedule: "Daily 10:30 IST (05:00 UTC)",
      route: "/api/admin/growth/cron/gsc-sync",
      description: "Syncs 28-day GSC query + page data. Triggers SEO Opportunity Agent.",
      collections: ["gsc_syncs", "gsc_query_rows", "gsc_page_rows"],
      status: "active",
    },
    {
      name: "Procurement Insights",
      schedule: "Daily 06:30 IST (01:00 UTC)",
      route: "/api/admin/growth/cron/procurement-insights",
      description: "AI-generated procurement insights from latest gem_contracts data",
      collections: ["gem_procurement_insights", "gem_procurement_alerts"],
      status: "active",
    },
    {
      name: "Google Ads Director",
      schedule: "Weekly Monday 09:30 IST",
      route: "/api/admin/growth/cron/google-ads-director",
      description: "Weekly read of Google Ads data → generates 4 recommendation types",
      collections: ["ads_recommendations", "ads_director_snapshots"],
      status: "active",
    },
    {
      name: "Dealer Opportunity Engine",
      schedule: "Weekly Monday 08:00 IST",
      route: "/api/admin/growth/cron/dealer-opportunities",
      description: "Cross-references fogging seller data vs 100X dealer list → ranked acquisition targets",
      collections: ["growth_opportunities"],
      status: "active",
    },
    {
      name: "Machine Buyer Opportunities",
      schedule: "Weekly Monday 08:30 IST",
      route: "/api/admin/growth/cron/buyer-opportunities",
      description: "Identifies high-value government buyers from fogging data for direct outreach",
      collections: ["growth_opportunities"],
      status: "active",
    },
    {
      name: "Weekly Executive Summary",
      schedule: "Weekly Monday 08:30 IST",
      route: "/api/admin/growth/cron/weekly-exec-summary",
      description: "7-day rollup of all signals: ads, SEO, leads, fogging intel, revenue",
      collections: ["growth_exec_summaries"],
      status: "active",
    },
  ]

  const manualAgents = [
    { name: "Market Intelligence Agent",   route: "/api/admin/growth/agents/market-intelligence", trigger: "Manual",       description: "Cross-signal AI synthesis. Reads all data sources simultaneously." },
    { name: "SEO Opportunity Agent",       route: "/api/admin/growth/agents/seo-opportunity",     trigger: "Manual / post-GSC-sync", description: "Identifies ranking opportunities from GSC query data." },
    { name: "Off-Page SEO Director",       route: "/api/admin/growth/seo/offpage",                trigger: "Manual",       description: "Discovers 11 types of backlink/citation opportunities." },
    { name: "Creative Director",           route: "/api/admin/growth/agents/creative-director",   trigger: "Manual",       description: "AI ad creative generator. 8 persuasion frameworks." },
    { name: "Dealer Lead Classifier",      route: "/api/admin/growth/agents/dealer-lead",         trigger: "Event-driven", description: "Classifies incoming dealer/OEM applications by intent." },
    { name: "AI Citation Audit",           route: "/api/admin/growth/agents/ai-citation",         trigger: "Manual",       description: "Checks 100X visibility across ChatGPT, Perplexity, Gemini." },
    { name: "Schema Auditor",              route: "/api/admin/growth/agents/schema-audit",        trigger: "Manual",       description: "Validates JSON-LD schemas across all public pages." },
    { name: "Internal Link Auditor",       route: "/api/admin/growth/agents/internal-link",       trigger: "Manual",       description: "Analyzes internal link graph for orphans and weak pages." },
    { name: "Execution Pack Generator",    route: "lib/growth-os/agents/execution-pack-generator.ts", trigger: "Auto on approval", description: "Generates rich execution artifacts when Revenue Director rec is approved." },
  ]

  return (
    <div className="space-y-6">
      {/* Scheduled Crons */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Clock size={14} className="text-gray-500" />
          Scheduled Crons
          <span className="text-xs font-normal text-gray-500">({crons.length} jobs in vercel.json)</span>
        </h3>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {crons.map((cron, i) => (
            <div key={i} className="px-4 py-3 border-b border-gray-100 last:border-0">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">{cron.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-mono">{cron.schedule}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{cron.description}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 font-mono">{cron.route}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {cron.collections.map(c => (
                      <span key={c} className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded border border-purple-100 font-mono">{c}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manual / Event Agents */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Activity size={14} className="text-gray-500" />
          Manual & Event-Driven Agents
          <span className="text-xs font-normal text-gray-500">({manualAgents.length} agents)</span>
        </h3>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {manualAgents.map((agent, i) => (
            <div key={i} className="px-4 py-3 border-b border-gray-100 last:border-0">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">{agent.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-medium">{agent.trigger}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{agent.description}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 font-mono">{agent.route}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: CRM Audit ───────────────────────────────────────────────────────────

function CrmTab() {
  const crmObjects = [
    {
      name: "Brochure Leads",
      collection: "brochure_leads",
      fields: ["name", "company", "email", "phone", "state", "created_at"],
      source: "Public brochure download form",
      uiLocation: "Main admin panel > BrochureLeadsTab",
      growthOs: "Not in Growth OS — data accessible via /api/admin/brochure-leads",
      gap: "No dedicated Growth OS lead management page. Recommend linking to main admin or building /admin/growth/leads.",
    },
    {
      name: "RFQ Submissions",
      collection: "rfq_popup_leads",
      fields: ["product", "quantity", "org", "contact", "state", "requirements", "created_at"],
      source: "Public RFQ popup form + RFQ upload",
      uiLocation: "Main admin panel",
      growthOs: "Not in Growth OS. API: /api/rfq-submit",
      gap: "No Growth OS RFQ tracking page. Recommend /admin/growth/rfqs to show all RFQ submissions.",
    },
    {
      name: "Dealer Applications",
      collection: "dealer_lead_classifications",
      fields: ["company", "state", "type", "intent_score", "classification", "created_at"],
      source: "Public dealer application form + AI classifier",
      uiLocation: "Not surfaced in any admin panel",
      growthOs: "API exists: /api/admin/growth/agents/dealer-lead. No UI.",
      gap: "Dealer classifications are orphaned. Should surface in /admin/growth/dealers or CRM page.",
    },
    {
      name: "Opportunities",
      collection: "growth_opportunities",
      fields: ["type", "target", "score", "estimated_value", "status", "created_at"],
      source: "Dealer Opportunity cron + Machine Buyer cron",
      uiLocation: "/admin/growth/opportunities",
      growthOs: "Page exists but hidden from nav. Now added to CRM section.",
      gap: "Was hidden — now surfaced in CRM nav section.",
    },
    {
      name: "Revenue Attribution",
      collection: "revenue_attribution",
      fields: ["source", "medium", "campaign", "lead_id", "value", "attributed_at"],
      source: "Attribution system",
      uiLocation: "/admin/growth/ads/revenue",
      growthOs: "Page exists but hidden. Now in Advanced Tools.",
      gap: "Attribution model needs validation against actual conversion data.",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
        <h3 className="text-sm font-semibold text-amber-900 mb-1">Phase 6 CRM Audit — Findings</h3>
        <p className="text-xs text-amber-800">
          CRM infrastructure exists across 5 collections and is partially functional.
          The main gap is that lead data lives in the main admin panel, not Growth OS.
          No leads, RFQs, or dealer applications are visible in the Growth OS sidebar.
          Opportunities page existed but was hidden from nav — now restored.
        </p>
      </div>

      <div className="grid gap-4">
        {crmObjects.map(obj => (
          <div key={obj.collection} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-gray-900">{obj.name}</span>
                <span className="ml-2 font-mono text-[11px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">{obj.collection}</span>
              </div>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              <div className="flex gap-3">
                <span className="text-[11px] text-gray-500 w-24 flex-shrink-0">Fields</span>
                <div className="flex flex-wrap gap-1">
                  {obj.fields.map(f => (
                    <span key={f} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-mono">{f}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-[11px] text-gray-500 w-24 flex-shrink-0">Source</span>
                <span className="text-xs text-gray-700">{obj.source}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-[11px] text-gray-500 w-24 flex-shrink-0">Current UI</span>
                <span className="text-xs text-gray-700">{obj.uiLocation}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-[11px] text-gray-500 w-24 flex-shrink-0">Gap</span>
                <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 flex-1">{obj.gap}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tab: Future Roadmap ──────────────────────────────────────────────────────

function RoadmapTab() {
  const phases = [
    {
      phase: "Current State (v1.4 Complete)",
      status: "done",
      items: [
        "Fogging Intelligence v1.4 — 1,418 contracts, 670 orgs, org-first, FROZEN",
        "Revenue Director v1.1 — 6 signal generators, lifecycle, execution packs, measurement",
        "Google Ads Director — weekly cron, 4 rec types, approval queue",
        "SEO Stack — GSC sync, SEO opportunity agent, off-page director, schema auditor",
        "Operations Center — 15 automations tracked, manual triggers, health monitoring",
        "Platform Registry — this page, full capability inventory",
      ],
    },
    {
      phase: "Phase 2A — CRM Consolidation",
      status: "next",
      items: [
        "Build /admin/growth/leads page — unified view of brochure_leads + rfq_popup_leads",
        "Build /admin/growth/rfqs page — RFQ pipeline with status tracking",
        "Surface dealer_lead_classifications in Growth OS",
        "Connect Revenue Director outcomes → CRM records (won rec = customer)",
        "Lead-to-opportunity conversion tracking",
      ],
    },
    {
      phase: "Phase 2B — Revenue Attribution",
      status: "planned",
      items: [
        "Validate revenue_attribution model against real conversion data",
        "Connect Google Ads conversion tracking to CRM lead records",
        "Attribution dashboard: source → lead → opportunity → won",
        "CAC calculation per channel (Google Ads vs organic vs referral)",
      ],
    },
    {
      phase: "Phase 3 — AI Copilot",
      status: "planned",
      items: [
        "NLQ over full platform (ask 'which OEM is losing most to us this quarter')",
        "Voice-to-action in Revenue Director",
        "Procurement AI Analyst chat UI (API exists: /api/admin/procurement/ai-analyst)",
        "Knowledge Graph visualization (API exists: /api/admin/procurement/knowledge-graph)",
        "Requires: ANTHROPIC_API_KEY set in Vercel environment variables",
      ],
    },
    {
      phase: "Phase 4 — Cross-Category Expansion",
      status: "future",
      items: [
        "Expand Fogging Intelligence beyond thermal fogging → mosquito control, industrial cleaning",
        "New GeM category harvest: disinfection equipment, ULV sprayers",
        "Cross-category buyer persona overlap analysis",
        "Unified intelligence layer across all machinery categories",
      ],
    },
    {
      phase: "Revenue OS v2 — Full Loop",
      status: "future",
      items: [
        "Intelligence → Recommendation → Approval → Execution → CRM → Attribution → Revenue",
        "Every approved rec has a CRM record. Every CRM record has a revenue outcome.",
        "Full pipeline: fogging signal → dealer rec → outreach → meeting → order → attributed revenue",
        "Director learns from won/lost outcomes (reinforcement loop)",
      ],
    },
  ]

  const statusColors: Record<string, string> = {
    done:    "bg-green-100 text-green-700 border-green-200",
    next:    "bg-blue-100 text-blue-700 border-blue-200",
    planned: "bg-yellow-100 text-yellow-700 border-yellow-200",
    future:  "bg-gray-100 text-gray-500 border-gray-200",
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
        <h3 className="text-sm font-semibold text-blue-900 mb-1">Platform Vision — Revenue OS v2</h3>
        <p className="text-xs text-blue-800">
          Every intelligence signal leads to a recommendation. Every recommendation, when approved, creates an execution pack.
          Every execution leads to a CRM record. Every CRM record eventually has a revenue outcome.
          The Director learns from each outcome and weights future recommendations accordingly.
        </p>
      </div>

      {phases.map((p, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
            <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wide ${statusColors[p.status]}`}>
              {p.status}
            </span>
            <h3 className="text-sm font-semibold text-gray-900">{p.phase}</h3>
          </div>
          <ul className="px-4 py-3 space-y-1.5">
            {p.items.map((item, j) => (
              <li key={j} className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                <span className="text-xs text-gray-700">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "capabilities", label: "Capabilities",  icon: <LayoutGrid size={14} /> },
  { id: "collections",  label: "Collections",   icon: <Database   size={14} /> },
  { id: "agents",       label: "Agents & Crons", icon: <Activity   size={14} /> },
  { id: "crm",          label: "CRM Audit",      icon: <TrendingUp size={14} /> },
  { id: "roadmap",      label: "Roadmap",        icon: <Layers     size={14} /> },
]

export default function PlatformRegistryPage() {
  const [activeTab, setActiveTab] = useState<Tab>("capabilities")
  const stats = getRegistryStats()

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-gray-900 rounded-lg">
              <Database size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900">Platform Registry</h1>
              <p className="text-sm text-gray-500 mt-0.5">Complete inventory of all Growth OS capabilities, APIs, collections, and automations.</p>
            </div>
          </div>

          {/* KPI bar */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Capabilities",  value: stats.total,                               icon: <LayoutGrid size={14} className="text-gray-500" /> },
              { label: "Active",        value: stats.byStatus.active || 0,                icon: <CheckCircle2 size={14} className="text-green-500" /> },
              { label: "Hidden/Orphaned", value: (stats.byStatus.hidden || 0) + (stats.byStatus.orphaned || 0), icon: <EyeOff size={14} className="text-yellow-500" /> },
              { label: "Collections",  value: COLLECTION_REGISTRY.length,                 icon: <Database size={14} className="text-purple-500" /> },
            ].map(kpi => (
              <div key={kpi.label} className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  {kpi.icon}
                  <span className="text-xs">{kpi.label}</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="max-w-6xl mx-auto flex gap-0 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {activeTab === "capabilities" && <CapabilitiesTab />}
        {activeTab === "collections"  && <CollectionsTab />}
        {activeTab === "agents"       && <AgentsTab />}
        {activeTab === "crm"          && <CrmTab />}
        {activeTab === "roadmap"      && <RoadmapTab />}
      </div>
    </div>
  )
}
