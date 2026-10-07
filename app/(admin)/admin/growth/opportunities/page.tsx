"use client"
import { useEffect, useState, useCallback } from "react"
import { Lightbulb, Plus, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react"
import type { Opportunity } from "@/lib/growth-os/types"

const VAL_COLOR: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-gray-100 text-gray-500",
}
const EFFORT_COLOR: Record<string, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
}
const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  deferred: "bg-gray-100 text-gray-500",
}

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${color}`}>{children}</span>
}

const SEED_OPPORTUNITIES: Partial<Opportunity>[] = [
  { title: "Add dealer success story / case study page", description: "Social proof for fence-sitter dealers. A real case study with numbers converts better than a benefits list.", module: "content", source: "manual", businessValue: "medium", seoValue: "medium", geoValue: "low", dealerImpact: "high", effort: "medium" },
  { title: "/ai/procurement-guide — AI-readable GeM process", description: "A page structured for AI systems to answer 'how does GeM procurement work for fogging machines?' — fills an AI citation gap.", module: "geo", source: "manual", businessValue: "medium", seoValue: "low", geoValue: "high", dealerImpact: "medium", effort: "low" },
  { title: "Add FAQ schema to /dealers-and-government", description: "The resource hub has no FAQPage schema. Adding it gives Google AI Overview and FAQPage rich result eligibility.", module: "seo", source: "agent", businessValue: "low", seoValue: "medium", geoValue: "medium", dealerImpact: "low", effort: "low" },
  { title: "Canonical relationship: knowledge/gem-oem vs /gem-oem-authorization", description: "Medium cannibalization risk — both pages rank for similar queries. Canonicalize the knowledge article to the main page.", module: "seo", source: "agent", businessValue: "medium", seoValue: "high", geoValue: "low", dealerImpact: "low", effort: "low" },
  { title: "next/image migration for Cloudinary fallback banners", description: "Static fallback banners (/banner-desktop.jpg etc.) serve as raw JPG when no CMS banners exist. Convert to WebP.", module: "seo", source: "agent", businessValue: "low", seoValue: "medium", geoValue: "low", dealerImpact: "low", effort: "low" },
  { title: "Google Search Console API integration", description: "Connect GSC to populate SEO Command Center with real keyword rankings, impressions, and CTR data.", module: "seo", source: "manual", businessValue: "high", seoValue: "high", geoValue: "low", dealerImpact: "low", effort: "medium" },
  { title: "Launch Google Ads Campaign 1A — OEM Authorization Intent", description: "Highest-intent keyword cluster. 100–300 monthly searches. VERY HIGH lead quality. Low competition from incumbents.", module: "ads", source: "manual", businessValue: "high", seoValue: "low", geoValue: "low", dealerImpact: "high", effort: "low" },
  { title: "Dealer email capture — fallback to email form", description: "Dealer funnel currently depends 100% on WhatsApp. Add email as fallback for users who prefer email.", module: "dealers", source: "manual", businessValue: "medium", seoValue: "low", geoValue: "low", dealerImpact: "high", effort: "medium" },
]

export default function OpportunityEngine() {
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [seeded, setSeeded] = useState(false)
  const [filter, setFilter] = useState("all")
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: "", description: "", module: "seo", businessValue: "medium", seoValue: "medium", dealerImpact: "medium", effort: "medium" })

  const load = useCallback(() => {
    setLoading(true)
    fetch("/api/admin/growth/opportunities")
      .then(r => r.json())
      .then(d => { setOpps(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const seedOpps = async () => {
    for (const opp of SEED_OPPORTUNITIES) {
      await fetch("/api/admin/growth/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opp),
      })
    }
    setSeeded(true)
    load()
  }

  const setStatus = async (id: string, status: string) => {
    await fetch("/api/admin/growth/opportunities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    })
    setOpps(prev => prev.map(o => o._id === id ? { ...o, status: status as Opportunity["status"] } : o))
  }

  const addOpp = async () => {
    await fetch("/api/admin/growth/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, source: "manual", geoValue: "medium", status: "pending" }),
    })
    setShowAdd(false)
    setForm({ title: "", description: "", module: "seo", businessValue: "medium", seoValue: "medium", dealerImpact: "medium", effort: "medium" })
    load()
  }

  const filtered = filter === "all" ? opps : opps.filter(o => o.status === filter)
  const pending = opps.filter(o => o.status === "pending").length

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb size={18} className="text-brand-600" />
            <div>
              <h1 className="text-base font-bold text-gray-900">Opportunity Engine</h1>
              <p className="text-gray-400 text-[11px]">Discover, score, approve, and act on growth opportunities</p>
            </div>
          </div>
          <div className="flex gap-2">
            {opps.length === 0 && !loading && (
              <button onClick={seedOpps} className="text-xs border border-brand-400 text-brand-600 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors">
                Seed from roadmap
              </button>
            )}
            <button onClick={() => setShowAdd(s => !s)} className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition-colors">
              <Plus size={13} /> Add Opportunity
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1400px] space-y-4">
        {seeded && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 text-xs flex items-center gap-2">
            <CheckCircle2 size={13} /> Seeded {SEED_OPPORTUNITIES.length} opportunities from project roadmap.
          </div>
        )}

        {/* Add form */}
        {showAdd && (
          <div className="bg-white rounded-xl border border-brand-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Add Opportunity</h3>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 col-span-2" />
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" rows={2} className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 col-span-2 resize-none" />
              {[
                { key: "module", label: "Module", opts: ["seo", "geo", "competitors", "content", "dealers", "gem", "ads", "automation"] },
                { key: "businessValue", label: "Business Value", opts: ["low", "medium", "high", "critical"] },
                { key: "seoValue", label: "SEO Value", opts: ["low", "medium", "high"] },
                { key: "dealerImpact", label: "Dealer Impact", opts: ["low", "medium", "high"] },
                { key: "effort", label: "Effort", opts: ["low", "medium", "high"] },
              ].map(({ key, label, opts }) => (
                <div key={key}>
                  <label className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 block">{label}</label>
                  <select value={(form as Record<string, string>)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
                    {opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={addOpp} disabled={!form.title} className="text-xs bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">Add</button>
              <button onClick={() => setShowAdd(false)} className="text-xs border border-gray-200 text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "approved", "deferred", "rejected"].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filter === s ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"}`}>
              {s === "all" ? `All (${opps.length})` : s === "pending" ? `Pending (${pending})` : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <button onClick={load} className="ml-auto text-xs text-gray-400 hover:text-brand-600 px-2">
            <RefreshCw size={12} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <Lightbulb size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-medium">No opportunities yet</p>
            <p className="text-gray-400 text-xs mt-1">Click &quot;Seed from roadmap&quot; or &quot;Add Opportunity&quot; to start</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(opp => (
              <div key={opp._id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-semibold text-gray-800">{opp.title}</h3>
                      <Pill color={STATUS_COLOR[opp.status]}>{opp.status}</Pill>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{opp.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Pill color={VAL_COLOR[opp.businessValue]}>Biz: {opp.businessValue}</Pill>
                      <Pill color={VAL_COLOR[opp.seoValue]}>SEO: {opp.seoValue}</Pill>
                      <Pill color={VAL_COLOR[opp.geoValue]}>GEO: {opp.geoValue}</Pill>
                      <Pill color={VAL_COLOR[opp.dealerImpact]}>Dealer: {opp.dealerImpact}</Pill>
                      <Pill color={EFFORT_COLOR[opp.effort]}>Effort: {opp.effort}</Pill>
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{opp.module}</span>
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{opp.source}</span>
                    </div>
                  </div>

                  {opp.status === "pending" && (
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button onClick={() => setStatus(opp._id!, "approved")} className="flex items-center gap-1 text-[11px] font-medium bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors">
                        <CheckCircle2 size={11} /> Approve
                      </button>
                      <button onClick={() => setStatus(opp._id!, "deferred")} className="flex items-center gap-1 text-[11px] font-medium border border-amber-300 text-amber-600 px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors">
                        <Clock size={11} /> Defer
                      </button>
                      <button onClick={() => setStatus(opp._id!, "rejected")} className="flex items-center gap-1 text-[11px] font-medium border border-gray-200 text-gray-400 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                        <XCircle size={11} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
