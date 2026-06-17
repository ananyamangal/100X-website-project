"use client"
import { useState, useEffect, useCallback } from "react"
import { Link2, RotateCw, Shield, ExternalLink, Plus, Check, AlertCircle, ChevronDown, ChevronUp, Globe, Building2, Megaphone, RefreshCw, TrendingUp, TrendingDown, Award, Search, BookOpen, Target, Zap, Activity, ArrowLeft } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type BacklinkStatus = "detected" | "recommended" | "approved" | "outreach_sent" | "follow_up" | "acquired" | "verified" | "impact_measured"
type CitationStatus = "recommended" | "approved" | "submitted" | "verified"
type OutreachStatus = "draft" | "approved" | "sent" | "opened" | "replied" | "won" | "lost"
type RecoveryStatus = "detected" | "in_recovery" | "recovered" | "abandoned"
type PartnerStatus = "identified" | "approached" | "active" | "inactive"
type GemType = "gem_listing" | "oem_authorization" | "tender_reference" | "procurement_portal" | "government_mention"
type PRType = "press_release" | "guest_post" | "industry_award" | "expert_quote" | "data_story"

interface Backlink {
  _id: string; url: string; domain: string; anchor_text: string; target_page: string
  status: BacklinkStatus; source_type: string; domain_authority: number
  is_dofollow: boolean; notes: string; detected_at: string; acquired_at: string | null
  traffic_impact: number | null; ranking_impact: number | null; revenue_impact: number | null
}
interface Citation {
  _id: string; platform: string; platform_label: string; listing_url: string
  nap_consistent: boolean; status: CitationStatus; notes: string
  submitted_at: string | null; verified_at: string | null; created_at: string
}
interface CompetitorLink {
  _id: string; competitor: string; backlink_url: string; domain: string
  anchor_text: string; domain_authority: number; gap_status: string; opportunity: string
}
interface Partnership {
  _id: string; company_name: string; website: string; contact_name: string
  contact_email: string; partner_type: string; status: PartnerStatus
  has_existing_link: boolean; backlink_opportunity: boolean; notes: string
}
interface OutreachItem {
  _id: string; type: string; target_domain: string; target_url: string
  contact_email: string; subject: string; body: string; status: OutreachStatus
  sent_at: string | null; replied_at: string | null; approved_at: string | null; notes: string
}
interface GemItem {
  _id: string; type: GemType; title: string; url: string; organization: string
  authority_value: string; status: string; backlink_opportunity: boolean
  opportunity_notes: string; notes: string
}
interface RecoveryItem {
  _id: string; type: string; lost_url: string; our_page: string; domain: string
  domain_authority: number; anchor_text: string; status: RecoveryStatus; recovery_action: string; detected_at: string
}
interface PROpportunity {
  _id: string; type: PRType; title: string; publication: string; url: string
  estimated_da: number; status: string; deadline: string | null; notes: string
}
interface AuthorityScore {
  score: number; delta: number; referring_domains: number; acquired_backlinks: number; scored_at: string
  score_breakdown?: { domain_pts: number; quality_pts: number; diversity_pts: number; brand_pts: number }
}
interface DashboardData {
  backlinks: { total: number; acquired: number; in_progress: number; pending_approval: number; by_status: Record<string, number> }
  citations: { total: number; verified: number; by_status: Record<string, number> }
  outreach: { total: number; pending_approval: number; won: number; by_status: Record<string, number> }
  gem_authority: { total: number; active: number; by_type: { type: string; total: number; active: number }[] }
  link_recovery: { open: number }
  partnerships: { active: number }
  pr_opportunities: { total: number; by_status: Record<string, number> }
  authority_score: AuthorityScore | null
  recent_activity: { _id: string; action: string; detail: string; created_at: string }[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BL_STAGES: { id: BacklinkStatus; label: string; color: string }[] = [
  { id: "detected",       label: "Detected",        color: "bg-gray-100 text-gray-600" },
  { id: "recommended",    label: "Recommended",      color: "bg-blue-100 text-blue-700" },
  { id: "approved",       label: "Approved",         color: "bg-indigo-100 text-indigo-700" },
  { id: "outreach_sent",  label: "Outreach Sent",    color: "bg-amber-100 text-amber-700" },
  { id: "follow_up",      label: "Follow Up",        color: "bg-orange-100 text-orange-700" },
  { id: "acquired",       label: "Acquired",         color: "bg-emerald-100 text-emerald-700" },
  { id: "verified",       label: "Verified",         color: "bg-green-100 text-green-700" },
  { id: "impact_measured",label: "Impact Measured",  color: "bg-teal-100 text-teal-700" },
]

const CITATION_PLATFORMS = [
  { id: "indiamart",           label: "IndiaMART" },
  { id: "tradeindia",          label: "TradeIndia" },
  { id: "justdial",            label: "Justdial" },
  { id: "exportersindia",      label: "ExportersIndia" },
  { id: "industry_association",label: "Industry Association" },
  { id: "msme_directory",      label: "MSME Directory" },
  { id: "gem_portal",          label: "GeM Portal" },
]

const COMPETITORS = [
  { id: "balwaan",       label: "Balwaan" },
  { id: "kisankraft",    label: "Kisankraft" },
  { id: "neptune",       label: "Neptune" },
  { id: "vectorfog",     label: "VectorFog" },
  { id: "curtisdynafog", label: "Curtis Dyna-Fog" },
]

const GEM_TYPES: { id: GemType; label: string }[] = [
  { id: "gem_listing",         label: "GeM Listing" },
  { id: "oem_authorization",   label: "OEM Authorization" },
  { id: "tender_reference",    label: "Tender Reference" },
  { id: "procurement_portal",  label: "Procurement Portal" },
  { id: "government_mention",  label: "Government Mention" },
]

const PR_TYPES: { id: PRType; label: string }[] = [
  { id: "press_release",  label: "Press Release" },
  { id: "guest_post",     label: "Guest Post" },
  { id: "industry_award", label: "Industry Award" },
  { id: "expert_quote",   label: "Expert Quote" },
  { id: "data_story",     label: "Data Story" },
]

const SOURCE_TYPES = ["organic", "competitor", "recovery", "partnership", "citation", "pr", "gem"]
const PARTNER_TYPES = ["dealer", "distributor", "supplier", "oem_partner"]
const OUTREACH_TYPES = ["email", "partnership_request", "resource_page", "guest_article"]

// ─── Utilities ────────────────────────────────────────────────────────────────

function blColor(s: BacklinkStatus): string {
  return BL_STAGES.find(b => b.id === s)?.color ?? "bg-gray-100 text-gray-500"
}
function scoreColor(s: number): string {
  return s >= 70 ? "text-green-600" : s >= 40 ? "text-amber-500" : "text-red-500"
}
function fmt(d: string): string {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

// ─── Authority Gauge ─────────────────────────────────────────────────────────

function AuthorityGauge({ score, delta }: { score: number; delta: number }) {
  const r = 44; const circ = 2 * Math.PI * r
  const fill = circ * (1 - score / 100)
  const color = score >= 70 ? "#16a34a" : score >= 40 ? "#d97706" : "#dc2626"
  return (
    <div className="flex flex-col items-center">
      <svg width={120} height={120} className="-rotate-90">
        <circle cx={60} cy={60} r={r} fill="none" stroke="#f1f5f9" strokeWidth={10} />
        <circle cx={60} cy={60} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div className="flex flex-col items-center -mt-16 pb-4">
        <span className={`text-3xl font-bold ${scoreColor(score)}`}>{score}</span>
        <span className="text-[11px] text-gray-400">/ 100</span>
        {delta !== 0 && (
          <span className={`text-[11px] font-semibold flex items-center gap-0.5 mt-0.5 ${delta > 0 ? "text-green-600" : "text-red-500"}`}>
            {delta > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {delta > 0 ? "+" : ""}{delta}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab({ data, onCalcScore, calculating }: {
  data: DashboardData | null; onCalcScore: () => void; calculating: boolean
}) {
  if (!data) return <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading…</div>
  const as = data.authority_score
  return (
    <div className="space-y-5">
      {/* Authority Score */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Off-Page Authority Score</h3>
            <p className="text-[11px] text-gray-400">Composite: referring domains · link quality · diversity · brand authority</p>
          </div>
          <button onClick={onCalcScore} disabled={calculating}
            className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50">
            <RotateCw size={11} className={calculating ? "animate-spin" : ""} />
            {calculating ? "Calculating…" : "Recalculate"}
          </button>
        </div>
        {as ? (
          <div className="flex items-center gap-8">
            <AuthorityGauge score={as.score} delta={as.delta} />
            <div className="grid grid-cols-2 gap-4 flex-1">
              {[
                { label: "Referring Domains", value: as.referring_domains, color: "text-brand-600" },
                { label: "Acquired Backlinks", value: as.acquired_backlinks, color: "text-green-600" },
                { label: "Citations Verified", value: data.citations.verified, color: "text-teal-600" },
                { label: "GeM Authority Items", value: data.gem_authority.active, color: "text-indigo-600" },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-[11px] text-gray-400">{label}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400 text-sm">
            <p>No score calculated yet.</p>
            <button onClick={onCalcScore} className="mt-2 text-brand-600 text-xs underline">Calculate now</button>
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: "Total Backlinks", value: data.backlinks.total, sub: `${data.backlinks.acquired} acquired`, color: "text-gray-800" },
          { label: "In Progress", value: data.backlinks.in_progress, sub: "outreach active", color: "text-amber-600" },
          { label: "Need Approval", value: data.backlinks.pending_approval + data.outreach.pending_approval, sub: "backlinks + outreach", color: "text-red-500" },
          { label: "Citations", value: data.citations.total, sub: `${data.citations.verified} verified`, color: "text-teal-600" },
          { label: "GeM Items", value: data.gem_authority.total, sub: `${data.gem_authority.active} active`, color: "text-indigo-600" },
          { label: "Link Recovery", value: data.link_recovery.open, sub: "open items", color: "text-orange-600" },
          { label: "PR Pipeline", value: data.pr_opportunities.total, sub: "opportunities", color: "text-purple-600" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm text-center">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-[10px] text-gray-700 font-medium">{label}</p>
            <p className="text-[10px] text-gray-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Backlink funnel */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h4 className="text-xs font-bold text-gray-700 mb-3">Backlink Pipeline</h4>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {BL_STAGES.map(stage => (
            <div key={stage.id} className="flex-1 min-w-[70px] text-center">
              <div className={`rounded-lg px-2 py-2 ${stage.color}`}>
                <p className="text-lg font-bold">{data.backlinks.by_status[stage.id] ?? 0}</p>
                <p className="text-[9px] leading-tight">{stage.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Founder Safety */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={14} className="text-green-600" />
          <h4 className="text-xs font-bold text-green-800">Founder Safety — Off-Page SEO</h4>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            "No auto-purchase of links",
            "No auto-disavow",
            "No PBNs or link farms",
            "No spam directories",
            "Approval required before outreach",
            "All actions audit-logged",
          ].map(rule => (
            <div key={rule} className="flex items-center gap-1.5 text-[11px] text-green-700">
              <Check size={10} className="text-green-500 shrink-0" />
              {rule}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      {data.recent_activity.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-3">Recent Activity</h4>
          <div className="space-y-2">
            {data.recent_activity.map(a => (
              <div key={a._id} className="flex items-start justify-between gap-3 text-[11px]">
                <span className="text-gray-700">{a.detail}</span>
                <span className="text-gray-400 shrink-0">{fmt(a.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Backlinks Tab ────────────────────────────────────────────────────────────

function BacklinksTab({ items, loading, onRefresh }: { items: Backlink[]; loading: boolean; onRefresh: () => void }) {
  const [filterStatus, setFilterStatus] = useState<string>("")
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ url: "", domain: "", anchor_text: "", target_page: "/", source_type: "organic", domain_authority: "", is_dofollow: true, notes: "" })

  const add = async () => {
    setSaving(true)
    await fetch("/api/admin/growth/seo/offpage/backlinks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, domain_authority: Number(form.domain_authority) || 0 }),
    })
    setSaving(false); setShowAdd(false); onRefresh()
  }

  const advance = async (id: string, status: BacklinkStatus) => {
    await fetch("/api/admin/growth/seo/offpage/backlinks", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: id, status }),
    })
    onRefresh()
  }

  const NEXT_STATUS: Partial<Record<BacklinkStatus, BacklinkStatus>> = {
    detected: "recommended", recommended: "approved", approved: "outreach_sent",
    outreach_sent: "follow_up", follow_up: "acquired", acquired: "verified", verified: "impact_measured",
  }

  const filtered = filterStatus ? items.filter(i => i.status === filterStatus) : items

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none">
          <option value="">All Stages</option>
          {BL_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <button onClick={onRefresh} className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50">
          <RotateCw size={11} />Refresh
        </button>
        <button onClick={() => setShowAdd(s => !s)}
          className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-2 rounded-lg hover:bg-brand-700 ml-auto">
          <Plus size={11} />Add Backlink
        </button>
      </div>

      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-bold text-blue-800">Add Backlink</h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "url", label: "Linking Page URL", placeholder: "https://example.com/page" },
              { key: "domain", label: "Domain", placeholder: "example.com" },
              { key: "anchor_text", label: "Anchor Text", placeholder: "thermal fogging machine" },
              { key: "target_page", label: "Target Page (ours)", placeholder: "/" },
              { key: "domain_authority", label: "Est. Domain Authority (0-100)", placeholder: "30" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-[10px] text-gray-500 block mb-0.5">{label}</label>
                <input value={(form as Record<string, string>)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
              </div>
            ))}
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Source Type</label>
              <select value={form.source_type} onChange={e => setForm(f => ({ ...f, source_type: e.target.value }))}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none">
                {SOURCE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="dofollow" checked={form.is_dofollow} onChange={e => setForm(f => ({ ...f, is_dofollow: e.target.checked }))} />
            <label htmlFor="dofollow" className="text-xs text-gray-700">DoFollow link</label>
          </div>
          <div className="flex gap-2">
            <button onClick={add} disabled={saving}
              className="text-xs bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50">
              {saving ? "Saving…" : "Add Backlink"}
            </button>
            <button onClick={() => setShowAdd(false)} className="text-xs text-gray-500 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
          <Link2 size={28} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No backlinks {filterStatus ? `with status "${filterStatus}"` : "yet"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(bl => (
            <div key={bl._id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <a href={bl.url} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-semibold text-gray-800 hover:text-brand-600 flex items-center gap-1 truncate max-w-xs">
                      {bl.domain}<ExternalLink size={10} className="text-gray-400 shrink-0" />
                    </a>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${blColor(bl.status)}`}>{BL_STAGES.find(s => s.id === bl.status)?.label ?? bl.status}</span>
                    {bl.is_dofollow && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">DoFollow</span>}
                    {bl.domain_authority > 0 && <span className="text-[10px] text-gray-500">DA {bl.domain_authority}</span>}
                  </div>
                  <p className="text-[11px] text-gray-500">Anchor: <span className="font-medium text-gray-700">{bl.anchor_text || "—"}</span> → <code className="text-brand-600">{bl.target_page}</code></p>
                  {bl.notes && <p className="text-[11px] text-gray-400 mt-0.5 italic">{bl.notes}</p>}
                </div>
                {NEXT_STATUS[bl.status] && (
                  <button onClick={() => advance(bl._id, NEXT_STATUS[bl.status]!)}
                    className="shrink-0 flex items-center gap-1 text-[11px] border border-brand-300 text-brand-600 px-2.5 py-1 rounded-lg hover:bg-brand-50">
                    → {BL_STAGES.find(s => s.id === NEXT_STATUS[bl.status])?.label}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Citations Tab ────────────────────────────────────────────────────────────

function CitationsTab({ items, loading, onRefresh }: { items: Citation[]; loading: boolean; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ platform: "indiamart", listing_url: "", nap_consistent: false, notes: "" })
  const [saving, setSaving] = useState(false)

  const add = async () => {
    setSaving(true)
    const plat = CITATION_PLATFORMS.find(p => p.id === form.platform)
    await fetch("/api/admin/growth/seo/offpage/citations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, platform_label: plat?.label ?? form.platform }),
    })
    setSaving(false); setShowAdd(false); onRefresh()
  }

  const advance = async (id: string, status: CitationStatus) => {
    await fetch("/api/admin/growth/seo/offpage/citations", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: id, status }),
    })
    onRefresh()
  }

  const CITATION_FLOW: CitationStatus[] = ["recommended", "approved", "submitted", "verified"]
  const STATUS_COLORS: Record<CitationStatus, string> = {
    recommended: "bg-gray-100 text-gray-600", approved: "bg-blue-100 text-blue-700",
    submitted: "bg-amber-100 text-amber-700", verified: "bg-green-100 text-green-700",
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onRefresh} className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50">
          <RotateCw size={11} />Refresh
        </button>
        <button onClick={() => setShowAdd(s => !s)}
          className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-2 rounded-lg hover:bg-brand-700 ml-auto">
          <Plus size={11} />Add Citation
        </button>
      </div>

      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-bold text-blue-800">Add Citation (Approved Sources Only)</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Platform</label>
              <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none">
                {CITATION_PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Listing URL (if known)</label>
              <input value={form.listing_url} onChange={e => setForm(f => ({ ...f, listing_url: e.target.value }))}
                placeholder="https://indiamart.com/..." className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="nap" checked={form.nap_consistent} onChange={e => setForm(f => ({ ...f, nap_consistent: e.target.checked }))} />
            <label htmlFor="nap" className="text-xs text-gray-700">NAP consistent (Name, Address, Phone matches website)</label>
          </div>
          <div className="flex gap-2">
            <button onClick={add} disabled={saving} className="text-xs bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50">{saving ? "Saving…" : "Add Citation"}</button>
            <button onClick={() => setShowAdd(false)} className="text-xs text-gray-500 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {loading ? <div className="py-12 text-center text-gray-400 text-sm">Loading…</div> : (
        <div className="space-y-2">
          {items.length === 0 && <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">No citations yet</div>}
          {items.map(c => {
            const nextIdx = CITATION_FLOW.indexOf(c.status) + 1
            const next = nextIdx < CITATION_FLOW.length ? CITATION_FLOW[nextIdx] : null
            return (
              <div key={c._id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800">{CITATION_PLATFORMS.find(p => p.id === c.platform)?.label ?? c.platform}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                    {c.nap_consistent && <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">NAP ✓</span>}
                  </div>
                  {c.listing_url && <a href={c.listing_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-brand-600 flex items-center gap-1 mt-0.5">{c.listing_url.slice(0, 50)}… <ExternalLink size={9} /></a>}
                </div>
                {next && (
                  <button onClick={() => advance(c._id, next)}
                    className="shrink-0 text-[11px] border border-brand-300 text-brand-600 px-2.5 py-1 rounded-lg hover:bg-brand-50">
                    → {next}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Competitor Links Tab ─────────────────────────────────────────────────────

function CompetitorLinksTab({ items, summary, loading, onRefresh }: {
  items: CompetitorLink[]
  summary: { _id: string; total: number; gaps: number; avg_da: number }[]
  loading: boolean; onRefresh: () => void
}) {
  const [activeComp, setActiveComp] = useState("balwaan")
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ competitor: "balwaan", competitor_domain: "balwaan.com", backlink_url: "", domain: "", anchor_text: "", domain_authority: "", gap_status: "gap", opportunity: "medium" })
  const [saving, setSaving] = useState(false)

  const add = async () => {
    setSaving(true)
    await fetch("/api/admin/growth/seo/offpage/competitor-links", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, domain_authority: Number(form.domain_authority) || 0 }),
    })
    setSaving(false); setShowAdd(false); onRefresh()
  }

  const filtered = items.filter(i => i.competitor === activeComp)
  const compSummary = summary.find(s => String(s._id) === activeComp)

  return (
    <div className="space-y-4">
      {/* Competitor selector */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
        {COMPETITORS.map(c => {
          const s = summary.find(x => String(x._id) === c.id)
          return (
            <button key={c.id} onClick={() => setActiveComp(c.id)}
              className={`flex-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${activeComp === c.id ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-700"}`}>
              {c.label}
              {s && s.gaps > 0 && <span className="ml-1 text-[10px] opacity-75">({s.gaps} gaps)</span>}
            </button>
          )
        })}
      </div>

      {compSummary && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Links Tracked", value: compSummary.total },
            { label: "Link Gaps (we're missing)", value: compSummary.gaps, color: "text-red-500" },
            { label: "Avg Domain Authority", value: Math.round(Number(compSummary.avg_da || 0)) },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm text-center">
              <p className={`text-xl font-bold ${color ?? "text-gray-800"}`}>{value}</p>
              <p className="text-[10px] text-gray-400">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button onClick={onRefresh} className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50"><RotateCw size={11} />Refresh</button>
        <button onClick={() => setShowAdd(s => !s)} className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-2 rounded-lg hover:bg-brand-700 ml-auto"><Plus size={11} />Add Competitor Link</button>
      </div>

      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Competitor</label>
              <select value={form.competitor} onChange={e => { const c = COMPETITORS.find(x => x.id === e.target.value); setForm(f => ({ ...f, competitor: e.target.value, competitor_domain: c?.label?.toLowerCase().replace(" ", "") + ".com" ?? "" })) }}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none">
                {COMPETITORS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            {[
              { key: "backlink_url", label: "Backlink URL", placeholder: "https://..." },
              { key: "domain", label: "Linking Domain", placeholder: "example.com" },
              { key: "anchor_text", label: "Anchor Text", placeholder: "fogging machine" },
              { key: "domain_authority", label: "Est. DA", placeholder: "40" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-[10px] text-gray-500 block mb-0.5">{label}</label>
                <input value={(form as Record<string, string>)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none" />
              </div>
            ))}
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Gap Status</label>
              <select value={form.gap_status} onChange={e => setForm(f => ({ ...f, gap_status: e.target.value }))}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none">
                <option value="gap">Gap (they have it, we don&apos;t)</option>
                <option value="shared">Shared (both have it)</option>
                <option value="unique_to_us">Unique to us</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={add} disabled={saving} className="text-xs bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50">{saving ? "Saving…" : "Add"}</button>
            <button onClick={() => setShowAdd(false)} className="text-xs text-gray-500 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {loading ? <div className="py-12 text-center text-gray-400 text-sm">Loading…</div> : (
        <div className="space-y-2">
          {filtered.length === 0 && <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">No links tracked for {COMPETITORS.find(c => c.id === activeComp)?.label} yet</div>}
          {filtered.map(cl => (
            <div key={cl._id} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{cl.domain}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cl.gap_status === "gap" ? "bg-red-100 text-red-600" : cl.gap_status === "shared" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>{cl.gap_status}</span>
                  {cl.domain_authority > 0 && <span className="text-[10px] text-gray-400">DA {cl.domain_authority}</span>}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${cl.opportunity === "high" ? "bg-orange-100 text-orange-700" : cl.opportunity === "medium" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>{cl.opportunity} priority</span>
                </div>
                {cl.anchor_text && <p className="text-[11px] text-gray-400 mt-0.5">Anchor: {cl.anchor_text}</p>}
              </div>
              <a href={cl.backlink_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-brand-600"><ExternalLink size={13} /></a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Link Recovery Tab ────────────────────────────────────────────────────────

function LinkRecoveryTab({ items, counts, loading, onRefresh }: {
  items: RecoveryItem[]
  counts: { _id: string; count: number }[]
  loading: boolean; onRefresh: () => void
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ type: "lost", lost_url: "", our_page: "/", domain: "", domain_authority: "", anchor_text: "", recovery_action: "outreach", notes: "" })
  const [saving, setSaving] = useState(false)

  const add = async () => {
    setSaving(true)
    await fetch("/api/admin/growth/seo/offpage/link-recovery", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, domain_authority: Number(form.domain_authority) || 0 }),
    })
    setSaving(false); setShowAdd(false); onRefresh()
  }

  const advance = async (id: string, status: RecoveryStatus) => {
    await fetch("/api/admin/growth/seo/offpage/link-recovery", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: id, status }),
    })
    onRefresh()
  }

  const STATUS_COLORS: Record<RecoveryStatus, string> = {
    detected: "bg-gray-100 text-gray-600", in_recovery: "bg-amber-100 text-amber-700",
    recovered: "bg-green-100 text-green-700", abandoned: "bg-red-100 text-red-500",
  }

  const open = items.filter(i => i.status === "detected" || i.status === "in_recovery")
  const closedCount = counts.reduce((a, b) => a + (String(b._id) === "recovered" ? Number(b.count) : 0), 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Open Items", value: open.length, color: "text-red-500" },
          { label: "In Recovery", value: items.filter(i => i.status === "in_recovery").length, color: "text-amber-600" },
          { label: "Recovered", value: closedCount, color: "text-green-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm text-center">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-[10px] text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button onClick={onRefresh} className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50"><RotateCw size={11} />Refresh</button>
        <button onClick={() => setShowAdd(s => !s)} className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-2 rounded-lg hover:bg-brand-700 ml-auto"><Plus size={11} />Add Lost Link</button>
      </div>

      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none">
                <option value="lost">Lost Backlink</option>
                <option value="broken_404">Broken / 404</option>
              </select>
            </div>
            {[
              { key: "lost_url", label: "Lost URL (their page that linked us)", placeholder: "https://example.com/article" },
              { key: "our_page", label: "Our Page (what they linked to)", placeholder: "/products/thermal-fogging-machine" },
              { key: "domain", label: "Domain", placeholder: "example.com" },
              { key: "domain_authority", label: "Est. DA", placeholder: "35" },
              { key: "anchor_text", label: "Anchor Text", placeholder: "thermal fogging" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-[10px] text-gray-500 block mb-0.5">{label}</label>
                <input value={(form as Record<string, string>)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none" />
              </div>
            ))}
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Recovery Action</label>
              <select value={form.recovery_action} onChange={e => setForm(f => ({ ...f, recovery_action: e.target.value }))}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none">
                <option value="outreach">Outreach to site owner</option>
                <option value="redirect">Set up redirect</option>
                <option value="content_update">Update our content</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={add} disabled={saving} className="text-xs bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50">{saving ? "Saving…" : "Add"}</button>
            <button onClick={() => setShowAdd(false)} className="text-xs text-gray-500 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {loading ? <div className="py-12 text-center text-gray-400 text-sm">Loading…</div> : (
        <div className="space-y-2">
          {items.length === 0 && <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">No lost or broken links tracked yet</div>}
          {items.map(r => (
            <div key={r._id} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-800">{r.domain}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{r.type}</span>
                  {r.domain_authority > 0 && <span className="text-[10px] text-gray-400">DA {r.domain_authority}</span>}
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5 truncate">Lost URL: {r.lost_url}</p>
                <p className="text-[11px] text-gray-500">Our page: <code className="text-brand-600">{r.our_page}</code> · Action: {r.recovery_action}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                {r.status === "detected" && <button onClick={() => advance(r._id, "in_recovery")} className="text-[10px] border border-amber-300 text-amber-700 px-2 py-1 rounded hover:bg-amber-50">Start Recovery</button>}
                {r.status === "in_recovery" && <button onClick={() => advance(r._id, "recovered")} className="text-[10px] border border-green-300 text-green-700 px-2 py-1 rounded hover:bg-green-50">Mark Recovered</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Partnerships Tab ─────────────────────────────────────────────────────────

function PartnershipsTab({ items, loading, onRefresh }: { items: Partnership[]; loading: boolean; onRefresh: () => void }) {
  const [filterType, setFilterType] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ company_name: "", website: "", contact_name: "", contact_email: "", partner_type: "dealer", backlink_opportunity: true, notes: "" })
  const [saving, setSaving] = useState(false)

  const add = async () => {
    setSaving(true)
    await fetch("/api/admin/growth/seo/offpage/partnerships", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false); setShowAdd(false); onRefresh()
  }

  const advance = async (id: string, status: PartnerStatus) => {
    await fetch("/api/admin/growth/seo/offpage/partnerships", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: id, status }),
    })
    onRefresh()
  }

  const STATUS_COLORS: Record<PartnerStatus, string> = {
    identified: "bg-gray-100 text-gray-600", approached: "bg-blue-100 text-blue-700",
    active: "bg-green-100 text-green-700", inactive: "bg-red-100 text-red-500",
  }

  const filtered = filterType ? items.filter(i => i.partner_type === filterType) : items

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none">
          <option value="">All Types</option>
          {PARTNER_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        <button onClick={onRefresh} className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50"><RotateCw size={11} />Refresh</button>
        <button onClick={() => setShowAdd(s => !s)} className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-2 rounded-lg hover:bg-brand-700 ml-auto"><Plus size={11} />Add Partner</button>
      </div>

      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "company_name", label: "Company Name", placeholder: "ABC Distributors" },
              { key: "website", label: "Website", placeholder: "https://abcdist.com" },
              { key: "contact_name", label: "Contact Name", placeholder: "Ramesh Kumar" },
              { key: "contact_email", label: "Contact Email", placeholder: "ramesh@abcdist.com" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-[10px] text-gray-500 block mb-0.5">{label}</label>
                <input value={(form as Record<string, string>)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none" />
              </div>
            ))}
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Partner Type</label>
              <select value={form.partner_type} onChange={e => setForm(f => ({ ...f, partner_type: e.target.value }))}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none">
                {PARTNER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="bl_opp" checked={form.backlink_opportunity} onChange={e => setForm(f => ({ ...f, backlink_opportunity: e.target.checked }))} />
            <label htmlFor="bl_opp" className="text-xs text-gray-700">Backlink opportunity exists</label>
          </div>
          <div className="flex gap-2">
            <button onClick={add} disabled={saving} className="text-xs bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50">{saving ? "Saving…" : "Add Partner"}</button>
            <button onClick={() => setShowAdd(false)} className="text-xs text-gray-500 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {loading ? <div className="py-12 text-center text-gray-400 text-sm">Loading…</div> : (
        <div className="space-y-2">
          {filtered.length === 0 && <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">No partners tracked yet</div>}
          {filtered.map(p => (
            <div key={p._id} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-800">{p.company_name}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{p.partner_type}</span>
                  {p.has_existing_link && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Link Active ✓</span>}
                  {p.backlink_opportunity && !p.has_existing_link && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Link Opportunity</span>}
                </div>
                {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-[11px] text-brand-600 flex items-center gap-1 mt-0.5">{p.website} <ExternalLink size={9} /></a>}
                {p.contact_email && <p className="text-[11px] text-gray-400">{p.contact_name} · {p.contact_email}</p>}
              </div>
              <div className="flex gap-1.5 shrink-0">
                {p.status === "identified" && <button onClick={() => advance(p._id, "approached")} className="text-[10px] border border-blue-300 text-blue-700 px-2 py-1 rounded hover:bg-blue-50">Approach</button>}
                {p.status === "approached" && <button onClick={() => advance(p._id, "active")} className="text-[10px] border border-green-300 text-green-700 px-2 py-1 rounded hover:bg-green-50">Mark Active</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Outreach Tab ─────────────────────────────────────────────────────────────

function OutreachTab({ items, loading, onRefresh }: { items: OutreachItem[]; loading: boolean; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ type: "email", target_url: "", target_domain: "", contact_email: "", contact_name: "", subject: "", body: "", notes: "" })
  const [saving, setSaving] = useState(false)
  const [actioning, setActioning] = useState<string | null>(null)

  const add = async () => {
    setSaving(true)
    await fetch("/api/admin/growth/seo/offpage/outreach", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    })
    setSaving(false); setShowAdd(false); onRefresh()
  }

  const doAction = async (id: string, action: string) => {
    setActioning(id)
    await fetch("/api/admin/growth/seo/offpage/outreach", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ _id: id, action }),
    })
    setActioning(null); onRefresh()
  }

  const STATUS_COLORS: Record<OutreachStatus, string> = {
    draft: "bg-gray-100 text-gray-600", approved: "bg-blue-100 text-blue-700",
    sent: "bg-amber-100 text-amber-700", opened: "bg-indigo-100 text-indigo-700",
    replied: "bg-purple-100 text-purple-700", won: "bg-green-100 text-green-700",
    lost: "bg-red-100 text-red-500",
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-800">
        <Shield size={13} className="shrink-0 mt-0.5 text-amber-600" />
        <p><strong>Founder approval required</strong> before any outreach is sent. All drafts must be approved. No outreach is ever auto-sent.</p>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={onRefresh} className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50"><RotateCw size={11} />Refresh</button>
        <button onClick={() => setShowAdd(s => !s)} className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-2 rounded-lg hover:bg-brand-700 ml-auto"><Plus size={11} />Create Outreach Draft</button>
      </div>

      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none">
                {OUTREACH_TYPES.map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
              </select>
            </div>
            {[
              { key: "target_domain", label: "Target Domain", placeholder: "example.com" },
              { key: "target_url", label: "Target URL", placeholder: "https://example.com/contact" },
              { key: "contact_email", label: "Contact Email", placeholder: "editor@example.com" },
              { key: "contact_name", label: "Contact Name", placeholder: "John Smith" },
              { key: "subject", label: "Email Subject", placeholder: "Partnership opportunity — 100x Circle" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-[10px] text-gray-500 block mb-0.5">{label}</label>
                <input value={(form as Record<string, string>)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none" />
              </div>
            ))}
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-0.5">Email Body</label>
            <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={4}
              placeholder="Write your outreach email…" className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={add} disabled={saving} className="text-xs bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50">{saving ? "Saving…" : "Save Draft"}</button>
            <button onClick={() => setShowAdd(false)} className="text-xs text-gray-500 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {loading ? <div className="py-12 text-center text-gray-400 text-sm">Loading…</div> : (
        <div className="space-y-2">
          {items.length === 0 && <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">No outreach drafts yet</div>}
          {items.map(o => (
            <div key={o._id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <button onClick={() => setExpanded(e => e === o._id ? null : o._id)}
                className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 text-left">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800">{o.target_domain}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status]}`}>{o.status}</span>
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{o.type}</span>
                    {o.status === "draft" && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">Needs Approval</span>}
                  </div>
                  {o.subject && <p className="text-[11px] text-gray-500 mt-0.5">{o.subject}</p>}
                </div>
                {expanded === o._id ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
              </button>
              {expanded === o._id && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                  {o.body && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-[10px] text-gray-400 font-semibold mb-1">Email Body</p>
                      <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{o.body}</p>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {o.status === "draft" && (
                      <button onClick={() => doAction(o._id, "approve")} disabled={actioning === o._id}
                        className="flex items-center gap-1.5 text-[11px] font-semibold bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50">
                        <Check size={10} />Approve for Outreach
                      </button>
                    )}
                    {o.status === "approved" && (
                      <button onClick={() => doAction(o._id, "mark_sent")} disabled={actioning === o._id}
                        className="text-[11px] border border-amber-300 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-50 disabled:opacity-50">Mark Sent</button>
                    )}
                    {o.status === "sent" && (
                      <>
                        <button onClick={() => doAction(o._id, "mark_opened")} disabled={actioning === o._id} className="text-[11px] border border-indigo-300 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 disabled:opacity-50">Mark Opened</button>
                        <button onClick={() => doAction(o._id, "mark_replied")} disabled={actioning === o._id} className="text-[11px] border border-purple-300 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-50 disabled:opacity-50">Mark Replied</button>
                      </>
                    )}
                    {(o.status === "opened" || o.status === "replied") && (
                      <>
                        <button onClick={() => doAction(o._id, "mark_won")} disabled={actioning === o._id} className="text-[11px] border border-green-300 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-50 disabled:opacity-50">Won ✓</button>
                        <button onClick={() => doAction(o._id, "mark_lost")} disabled={actioning === o._id} className="text-[11px] border border-red-300 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50">Lost</button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── PR Opportunities Tab ─────────────────────────────────────────────────────

function PROpportunitiesTab({ items, loading, onRefresh }: { items: PROpportunity[]; loading: boolean; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ type: "press_release" as PRType, title: "", publication: "", url: "", estimated_da: "", estimated_traffic: "", deadline: "", notes: "" })
  const [saving, setSaving] = useState(false)

  const add = async () => {
    setSaving(true)
    await fetch("/api/admin/growth/seo/offpage/pr-opportunities", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, estimated_da: Number(form.estimated_da) || 0, estimated_traffic: Number(form.estimated_traffic) || 0 }),
    })
    setSaving(false); setShowAdd(false); onRefresh()
  }

  const advance = async (id: string, status: string) => {
    await fetch("/api/admin/growth/seo/offpage/pr-opportunities", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ _id: id, status }),
    })
    onRefresh()
  }

  const STATUS_COLORS: Record<string, string> = {
    identified: "bg-gray-100 text-gray-600", approved: "bg-blue-100 text-blue-700",
    submitted: "bg-amber-100 text-amber-700", published: "bg-green-100 text-green-700", live: "bg-teal-100 text-teal-700",
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onRefresh} className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50"><RotateCw size={11} />Refresh</button>
        <button onClick={() => setShowAdd(s => !s)} className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-2 rounded-lg hover:bg-brand-700 ml-auto"><Plus size={11} />Add PR Opportunity</button>
      </div>

      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as PRType }))}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none">
                {PR_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            {[
              { key: "title", label: "Title / Angle", placeholder: "100x Circle wins best MSME brand 2026" },
              { key: "publication", label: "Publication / Site", placeholder: "YourStory, Economic Times, etc." },
              { key: "url", label: "Publication URL", placeholder: "https://yourstory.com" },
              { key: "estimated_da", label: "Est. DA", placeholder: "45" },
              { key: "deadline", label: "Deadline (YYYY-MM-DD)", placeholder: "2026-07-15" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-[10px] text-gray-500 block mb-0.5">{label}</label>
                <input value={(form as Record<string, string>)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none" />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={add} disabled={saving} className="text-xs bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50">{saving ? "Saving…" : "Add"}</button>
            <button onClick={() => setShowAdd(false)} className="text-xs text-gray-500 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {loading ? <div className="py-12 text-center text-gray-400 text-sm">Loading…</div> : (
        <div className="space-y-2">
          {items.length === 0 && <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">No PR opportunities yet</div>}
          {items.map(pr => (
            <div key={pr._id} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-800">{pr.title}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[pr.status] ?? "bg-gray-100 text-gray-500"}`}>{pr.status}</span>
                  <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">{PR_TYPES.find(t => t.id === pr.type)?.label ?? pr.type}</span>
                  {pr.estimated_da > 0 && <span className="text-[10px] text-gray-400">DA {pr.estimated_da}</span>}
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">{pr.publication}{pr.deadline ? ` · Deadline: ${pr.deadline}` : ""}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                {pr.status === "identified" && <button onClick={() => advance(pr._id, "approved")} className="text-[10px] border border-blue-300 text-blue-700 px-2 py-1 rounded hover:bg-blue-50">Approve</button>}
                {pr.status === "approved" && <button onClick={() => advance(pr._id, "submitted")} className="text-[10px] border border-amber-300 text-amber-700 px-2 py-1 rounded hover:bg-amber-50">Mark Submitted</button>}
                {pr.status === "submitted" && <button onClick={() => advance(pr._id, "published")} className="text-[10px] border border-green-300 text-green-700 px-2 py-1 rounded hover:bg-green-50">Mark Published</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── GeM Authority Tab ────────────────────────────────────────────────────────

function GemAuthorityTab({ items, stats, loading, onRefresh }: {
  items: GemItem[]
  stats: { type: string; total: number; active: number }[]
  loading: boolean; onRefresh: () => void
}) {
  const [filterType, setFilterType] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ type: "gem_listing" as GemType, title: "", url: "", organization: "", authority_value: "medium", backlink_opportunity: true, opportunity_notes: "", notes: "" })
  const [saving, setSaving] = useState(false)

  const add = async () => {
    setSaving(true)
    await fetch("/api/admin/growth/seo/offpage/gem-authority", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    })
    setSaving(false); setShowAdd(false); onRefresh()
  }

  const advance = async (id: string, status: string) => {
    await fetch("/api/admin/growth/seo/offpage/gem-authority", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ _id: id, status }),
    })
    onRefresh()
  }

  const filtered = filterType ? items.filter(i => i.type === filterType) : items

  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-800">
        <p><strong>GeM Authority Engine:</strong> Track GeM listings, OEM authorizations, tender references, and government mentions as an authority ecosystem — not just backlinks. Each item builds procurement credibility.</p>
      </div>

      {stats.length > 0 && (
        <div className="grid grid-cols-5 gap-2">
          {GEM_TYPES.map(t => {
            const s = stats.find(x => x.type === t.id)
            return (
              <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm text-center">
                <p className="text-lg font-bold text-indigo-600">{s?.active ?? 0}</p>
                <p className="text-[10px] text-gray-400 leading-tight">{t.label}</p>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none">
          <option value="">All Types</option>
          {GEM_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <button onClick={onRefresh} className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50"><RotateCw size={11} />Refresh</button>
        <button onClick={() => setShowAdd(s => !s)} className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-2 rounded-lg hover:bg-brand-700 ml-auto"><Plus size={11} />Add GeM Item</button>
      </div>

      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as GemType }))}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none">
                {GEM_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            {[
              { key: "title", label: "Title", placeholder: "GeM Catalogue — Thermal Fogging Machine" },
              { key: "url", label: "URL", placeholder: "https://gem.gov.in/..." },
              { key: "organization", label: "Organization", placeholder: "Municipal Corporation Delhi" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-[10px] text-gray-500 block mb-0.5">{label}</label>
                <input value={(form as Record<string, string>)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none" />
              </div>
            ))}
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Authority Value</label>
              <select value={form.authority_value} onChange={e => setForm(f => ({ ...f, authority_value: e.target.value }))}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none">
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="gem_bl" checked={form.backlink_opportunity} onChange={e => setForm(f => ({ ...f, backlink_opportunity: e.target.checked }))} />
            <label htmlFor="gem_bl" className="text-xs text-gray-700">Backlink opportunity from this item</label>
          </div>
          {form.backlink_opportunity && (
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Opportunity Notes</label>
              <input value={form.opportunity_notes} onChange={e => setForm(f => ({ ...f, opportunity_notes: e.target.value }))}
                placeholder="How to acquire a link from this item…" className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none" />
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={add} disabled={saving} className="text-xs bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50">{saving ? "Saving…" : "Add"}</button>
            <button onClick={() => setShowAdd(false)} className="text-xs text-gray-500 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {loading ? <div className="py-12 text-center text-gray-400 text-sm">Loading…</div> : (
        <div className="space-y-2">
          {filtered.length === 0 && <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">No GeM authority items yet</div>}
          {filtered.map(g => (
            <div key={g._id} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-800">{g.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${g.status === "active" ? "bg-green-100 text-green-700" : g.status === "expired" ? "bg-red-100 text-red-500" : "bg-gray-100 text-gray-600"}`}>{g.status}</span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">{GEM_TYPES.find(t => t.id === g.type)?.label ?? g.type}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${g.authority_value === "high" ? "bg-green-100 text-green-700" : g.authority_value === "medium" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>{g.authority_value} authority</span>
                </div>
                {g.organization && <p className="text-[11px] text-gray-500 mt-0.5">{g.organization}</p>}
                {g.backlink_opportunity && g.opportunity_notes && <p className="text-[11px] text-brand-600 mt-0.5">Opp: {g.opportunity_notes}</p>}
              </div>
              <div className="flex gap-1.5 shrink-0">
                {g.url && <a href={g.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-brand-600"><ExternalLink size={13} /></a>}
                {g.status === "identified" && <button onClick={() => advance(g._id, "active")} className="text-[10px] border border-green-300 text-green-700 px-2 py-1 rounded hover:bg-green-50">Mark Active</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Impact Reports Tab ───────────────────────────────────────────────────────

function ImpactReportsTab({ backlinks, loading }: { backlinks: Backlink[]; loading: boolean }) {
  const withImpact = backlinks.filter(b => b.traffic_impact !== null || b.ranking_impact !== null || b.revenue_impact !== null)
  const totalTraffic = withImpact.reduce((a, b) => a + (b.traffic_impact ?? 0), 0)
  const totalRevenue = withImpact.reduce((a, b) => a + (b.revenue_impact ?? 0), 0)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Traffic Impact", value: `+${totalTraffic.toLocaleString()}`, sub: "monthly visits", color: "text-green-600" },
          { label: "Total Revenue Impact", value: totalRevenue > 0 ? `₹${(totalRevenue / 1000).toFixed(1)}K` : "—", sub: "attributed monthly", color: "text-brand-600" },
          { label: "Links with Impact Data", value: `${withImpact.length}/${backlinks.filter(b => ["acquired","verified","impact_measured"].includes(b.status)).length}`, sub: "measured / acquired", color: "text-gray-800" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-700 font-medium mt-1">{label}</p>
            <p className="text-[10px] text-gray-400">{sub}</p>
          </div>
        ))}
      </div>

      {loading ? <div className="py-12 text-center text-gray-400 text-sm">Loading…</div> : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h4 className="text-xs font-bold text-gray-700">Per-Link Impact</h4>
          </div>
          {backlinks.filter(b => ["acquired","verified","impact_measured"].includes(b.status)).length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-400">No acquired backlinks yet — impact data available after links are acquired and verified</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {backlinks.filter(b => ["acquired","verified","impact_measured"].includes(b.status)).map(b => (
                <div key={b._id} className="px-4 py-3 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{b.domain}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${blColor(b.status)}`}>{b.status}</span>
                    </div>
                    <p className="text-[11px] text-gray-400">{b.anchor_text} → <code className="text-brand-600">{b.target_page}</code></p>
                  </div>
                  <div className="flex gap-4 text-center">
                    <div>
                      <p className={`text-sm font-bold ${b.traffic_impact ? "text-green-600" : "text-gray-300"}`}>
                        {b.traffic_impact !== null ? `+${b.traffic_impact}` : "—"}
                      </p>
                      <p className="text-[9px] text-gray-400">Traffic</p>
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${b.ranking_impact ? "text-brand-600" : "text-gray-300"}`}>
                        {b.ranking_impact !== null ? `+${b.ranking_impact}` : "—"}
                      </p>
                      <p className="text-[9px] text-gray-400">Rankings</p>
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${b.revenue_impact ? "text-amber-600" : "text-gray-300"}`}>
                        {b.revenue_impact !== null ? `₹${(b.revenue_impact / 1000).toFixed(1)}K` : "—"}
                      </p>
                      <p className="text-[9px] text-gray-400">Revenue</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "dashboard" | "backlinks" | "citations" | "competitor-links" | "link-recovery" | "partnerships" | "outreach" | "pr-opportunities" | "gem-authority" | "impact-reports"

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard",        label: "Dashboard",        icon: <Activity size={12} /> },
  { id: "backlinks",        label: "Backlinks",        icon: <Link2 size={12} /> },
  { id: "citations",        label: "Citations",        icon: <BookOpen size={12} /> },
  { id: "competitor-links", label: "Competitor Links", icon: <Search size={12} /> },
  { id: "link-recovery",    label: "Link Recovery",    icon: <RefreshCw size={12} /> },
  { id: "partnerships",     label: "Partnerships",     icon: <Building2 size={12} /> },
  { id: "outreach",         label: "Outreach",         icon: <Megaphone size={12} /> },
  { id: "pr-opportunities", label: "PR",               icon: <Award size={12} /> },
  { id: "gem-authority",    label: "GeM Authority",    icon: <Globe size={12} /> },
  { id: "impact-reports",   label: "Impact Reports",   icon: <Target size={12} /> },
]

export default function OffPageSEOPage() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard")

  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [backlinks, setBacklinks] = useState<Backlink[]>([])
  const [citations, setCitations] = useState<Citation[]>([])
  const [competitorLinks, setCompetitorLinks] = useState<CompetitorLink[]>([])
  const [competitorSummary, setCompetitorSummary] = useState<{ _id: string; total: number; gaps: number; avg_da: number }[]>([])
  const [partnerships, setPartnerships] = useState<Partnership[]>([])
  const [outreach, setOutreach] = useState<OutreachItem[]>([])
  const [gemItems, setGemItems] = useState<GemItem[]>([])
  const [gemStats, setGemStats] = useState<{ type: string; total: number; active: number }[]>([])
  const [recoveryItems, setRecoveryItems] = useState<RecoveryItem[]>([])
  const [recoveryCounts, setRecoveryCounts] = useState<{ _id: string; count: number }[]>([])
  const [prOpps, setPrOpps] = useState<PROpportunity[]>([])

  const [loadingDash, setLoadingDash] = useState(true)
  const [loadingBL, setLoadingBL] = useState(false)
  const [loadingCit, setLoadingCit] = useState(false)
  const [loadingComp, setLoadingComp] = useState(false)
  const [loadingPart, setLoadingPart] = useState(false)
  const [loadingOut, setLoadingOut] = useState(false)
  const [loadingGem, setLoadingGem] = useState(false)
  const [loadingRec, setLoadingRec] = useState(false)
  const [loadingPR, setLoadingPR] = useState(false)
  const [calculating, setCalculating] = useState(false)

  const loadDashboard = useCallback(async () => {
    setLoadingDash(true)
    const res = await fetch("/api/admin/growth/seo/offpage/dashboard")
    const d = await res.json()
    setDashboard(d as DashboardData)
    setLoadingDash(false)
  }, [])

  const loadBacklinks = useCallback(async () => {
    setLoadingBL(true)
    const res = await fetch("/api/admin/growth/seo/offpage/backlinks")
    setBacklinks(await res.json())
    setLoadingBL(false)
  }, [])

  const loadCitations = useCallback(async () => {
    setLoadingCit(true)
    const res = await fetch("/api/admin/growth/seo/offpage/citations")
    setCitations(await res.json())
    setLoadingCit(false)
  }, [])

  const loadCompetitorLinks = useCallback(async () => {
    setLoadingComp(true)
    const res = await fetch("/api/admin/growth/seo/offpage/competitor-links")
    const d = await res.json()
    setCompetitorLinks(d.items ?? [])
    setCompetitorSummary(d.summary ?? [])
    setLoadingComp(false)
  }, [])

  const loadPartnerships = useCallback(async () => {
    setLoadingPart(true)
    const res = await fetch("/api/admin/growth/seo/offpage/partnerships")
    setPartnerships(await res.json())
    setLoadingPart(false)
  }, [])

  const loadOutreach = useCallback(async () => {
    setLoadingOut(true)
    const res = await fetch("/api/admin/growth/seo/offpage/outreach")
    setOutreach(await res.json())
    setLoadingOut(false)
  }, [])

  const loadGem = useCallback(async () => {
    setLoadingGem(true)
    const res = await fetch("/api/admin/growth/seo/offpage/gem-authority")
    const d = await res.json()
    setGemItems(d.items ?? [])
    setGemStats(d.stats ?? [])
    setLoadingGem(false)
  }, [])

  const loadRecovery = useCallback(async () => {
    setLoadingRec(true)
    const res = await fetch("/api/admin/growth/seo/offpage/link-recovery")
    const d = await res.json()
    setRecoveryItems(d.items ?? [])
    setRecoveryCounts(d.counts ?? [])
    setLoadingRec(false)
  }, [])

  const loadPR = useCallback(async () => {
    setLoadingPR(true)
    const res = await fetch("/api/admin/growth/seo/offpage/pr-opportunities")
    setPrOpps(await res.json())
    setLoadingPR(false)
  }, [])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  useEffect(() => {
    if (activeTab === "backlinks" && backlinks.length === 0) loadBacklinks()
    if (activeTab === "citations" && citations.length === 0) loadCitations()
    if (activeTab === "competitor-links" && competitorLinks.length === 0) loadCompetitorLinks()
    if (activeTab === "partnerships" && partnerships.length === 0) loadPartnerships()
    if (activeTab === "outreach" && outreach.length === 0) loadOutreach()
    if (activeTab === "gem-authority" && gemItems.length === 0) loadGem()
    if (activeTab === "link-recovery" && recoveryItems.length === 0) loadRecovery()
    if (activeTab === "pr-opportunities" && prOpps.length === 0) loadPR()
    if (activeTab === "impact-reports" && backlinks.length === 0) loadBacklinks()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const calcScore = async () => {
    setCalculating(true)
    await fetch("/api/admin/growth/seo/offpage/authority-score", { method: "POST" })
    await loadDashboard()
    setCalculating(false)
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/admin/growth/seo" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-600 transition-colors">
              <ArrowLeft size={13} />SEO
            </a>
            <span className="text-gray-300">/</span>
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-brand-600" />
              <div>
                <h1 className="text-base font-bold text-gray-900">Off-Page SEO Authority Engine</h1>
                <p className="text-gray-400 text-[11px]">Backlinks · Citations · Competitor Intel · GeM Authority · Digital PR — Revenue OS v3.0</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-semibold">v3.0</span>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1400px] space-y-5">
        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm flex-wrap">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-700"}`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "dashboard" && <DashboardTab data={loadingDash ? null : dashboard} onCalcScore={calcScore} calculating={calculating} />}
        {activeTab === "backlinks" && <BacklinksTab items={backlinks} loading={loadingBL} onRefresh={loadBacklinks} />}
        {activeTab === "citations" && <CitationsTab items={citations} loading={loadingCit} onRefresh={loadCitations} />}
        {activeTab === "competitor-links" && <CompetitorLinksTab items={competitorLinks} summary={competitorSummary} loading={loadingComp} onRefresh={loadCompetitorLinks} />}
        {activeTab === "link-recovery" && <LinkRecoveryTab items={recoveryItems} counts={recoveryCounts} loading={loadingRec} onRefresh={loadRecovery} />}
        {activeTab === "partnerships" && <PartnershipsTab items={partnerships} loading={loadingPart} onRefresh={loadPartnerships} />}
        {activeTab === "outreach" && <OutreachTab items={outreach} loading={loadingOut} onRefresh={loadOutreach} />}
        {activeTab === "pr-opportunities" && <PROpportunitiesTab items={prOpps} loading={loadingPR} onRefresh={loadPR} />}
        {activeTab === "gem-authority" && <GemAuthorityTab items={gemItems} stats={gemStats} loading={loadingGem} onRefresh={loadGem} />}
        {activeTab === "impact-reports" && <ImpactReportsTab backlinks={backlinks} loading={loadingBL} />}
      </div>
    </div>
  )
}
