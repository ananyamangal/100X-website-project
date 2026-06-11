"use client"
import { useState, useEffect, useCallback } from "react"
import { Link2, RotateCw, Mail, CheckCircle2, Clock, AlertCircle, ExternalLink, ChevronDown, ChevronUp, Copy } from "lucide-react"
import type { BacklinkOpportunity, OutreachStatus, OpportunityType } from "@/lib/growth-os/agents/offpage-seo-director"

// ── Types (mirrored for client) ───────────────────────────────────────────────

interface Stats {
  total: number; pending: number; inProgress: number; acquired: number; approved: number;
}
interface APIResponse {
  opportunities: (BacklinkOpportunity & { _id: string })[]
  stats: Stats
}

// ── Labels / colors ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<OutreachStatus, string> = {
  discovered:  "bg-gray-100 text-gray-600",
  queued:      "bg-blue-100 text-blue-700",
  contacted:   "bg-amber-100 text-amber-700",
  replied:     "bg-indigo-100 text-indigo-700",
  negotiating: "bg-purple-100 text-purple-700",
  published:   "bg-green-100 text-green-700",
  acquired:    "bg-emerald-100 text-emerald-700",
  declined:    "bg-red-100 text-red-600",
  no_response: "bg-gray-100 text-gray-400",
}

const STATUS_LABELS: Record<OutreachStatus, string> = {
  discovered:  "Discovered",
  queued:      "Queued",
  contacted:   "Contacted",
  replied:     "Replied",
  negotiating: "Negotiating",
  published:   "Published",
  acquired:    "Acquired ✓",
  declined:    "Declined",
  no_response: "No Response",
}

const TYPE_LABELS: Record<OpportunityType, string> = {
  directory:           "Directory",
  guest_post:          "Guest Post",
  citation:            "Citation",
  competitor_backlink: "Competitor Link",
  press_release:       "Press Release",
  government_listing:  "Govt. Listing",
  association:         "Association",
  review_site:         "Review Site",
  resource_page:       "Resource Page",
  podcast:             "Podcast",
  forum:               "Forum",
}

const SCORE_ORDER: Array<{ key: keyof BacklinkOpportunity["scores"]; label: string }> = [
  { key: "priorityScore",         label: "Priority" },
  { key: "relevance",             label: "Relevance" },
  { key: "domainAuthority",       label: "DA" },
  { key: "trafficValue",          label: "Traffic" },
  { key: "acquisitionDifficulty", label: "Difficulty" },
  { key: "spamRisk",              label: "Spam Risk" },
]

// ── Score pill ────────────────────────────────────────────────────────────────

function ScorePill({ label, value, invert = false }: { label: string; value: number; invert?: boolean }) {
  const v = invert ? 10 - value : value
  const bg = v >= 7 ? "bg-green-100 text-green-700" : v >= 4 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"
  return (
    <div className={`flex flex-col items-center rounded-lg px-2 py-1.5 ${bg}`}>
      <span className="text-[11px] font-bold">{value.toFixed(1)}</span>
      <span className="text-[9px] leading-tight">{label}</span>
    </div>
  )
}

// ── Outreach email panel ──────────────────────────────────────────────────────

function OutreachPanel({ opp, onRefresh }: { opp: BacklinkOpportunity & { _id: string }; onRefresh: () => void }) {
  const [loading, setLoading]   = useState(false)
  const [copied, setCopied]     = useState<string | null>(null)

  const generate = async () => {
    setLoading(true)
    await fetch("/api/admin/growth/agents/offpage-seo", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate_outreach", id: opp._id }),
    })
    setLoading(false)
    onRefresh()
  }

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const hasEmail = opp.outreach.emailBody

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
      {!hasEmail && (
        <button onClick={generate} disabled={loading}
          className="flex items-center gap-1.5 text-[11px] font-medium bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
          <Mail size={11} className={loading ? "animate-pulse" : ""} />
          {loading ? "Generating outreach email…" : "Generate Outreach Email (Claude)"}
        </button>
      )}
      {hasEmail && (
        <>
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-gray-500 font-semibold">Subject</p>
              <button onClick={() => copy(opp.outreach.emailSubject ?? "", "subject")}
                className="text-gray-400 hover:text-brand-600">
                {copied === "subject" ? <CheckCircle2 size={11} className="text-green-500" /> : <Copy size={11} />}
              </button>
            </div>
            <p className="text-xs text-gray-800 font-medium">{opp.outreach.emailSubject}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-gray-500 font-semibold">Email Body</p>
              <button onClick={() => copy(opp.outreach.emailBody ?? "", "body")}
                className="text-gray-400 hover:text-brand-600">
                {copied === "body" ? <CheckCircle2 size={11} className="text-green-500" /> : <Copy size={11} />}
              </button>
            </div>
            <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{opp.outreach.emailBody}</p>
          </div>
          {(opp.outreach.followUps ?? []).length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-gray-500 font-semibold">Follow-up Sequences</p>
              {(opp.outreach.followUps ?? []).map((fu, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3 flex gap-2">
                  <p className="text-xs text-gray-600 flex-1 whitespace-pre-wrap">{fu}</p>
                  <button onClick={() => copy(fu, `fu${i}`)} className="text-gray-400 hover:text-brand-600 shrink-0">
                    {copied === `fu${i}` ? <CheckCircle2 size={11} className="text-green-500" /> : <Copy size={11} />}
                  </button>
                </div>
              ))}
            </div>
          )}
          <button onClick={generate} disabled={loading}
            className="text-[10px] text-gray-400 hover:text-brand-600 underline">
            {loading ? "Regenerating…" : "Regenerate email"}
          </button>
        </>
      )}
    </div>
  )
}

// ── Opportunity card ──────────────────────────────────────────────────────────

function OppCard({ opp, onRefresh }: { opp: BacklinkOpportunity & { _id: string }; onRefresh: () => void }) {
  const [open, setOpen]   = useState(false)
  const [saving, setSaving] = useState(false)

  const updateStatus = async (status: OutreachStatus) => {
    setSaving(true)
    await fetch("/api/admin/growth/agents/offpage-seo", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_status", id: opp._id, status }),
    })
    setSaving(false)
    onRefresh()
  }

  const approve = async () => {
    await fetch("/api/admin/growth/agents/offpage-seo", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", id: opp._id }),
    })
    onRefresh()
  }

  const STATUS_FLOW: OutreachStatus[] = ["discovered","queued","contacted","replied","negotiating","published","acquired"]

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 p-4 hover:bg-gray-50/50 transition-colors text-left">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <a href={opp.url} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-sm font-semibold text-gray-800 hover:text-brand-600 flex items-center gap-1">
              {opp.domain}
              <ExternalLink size={10} className="text-gray-400" />
            </a>
            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
              {TYPE_LABELS[opp.type] ?? opp.type}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[opp.outreach.status]}`}>
              {STATUS_LABELS[opp.outreach.status]}
            </span>
            {opp.approvalStatus === "pending_review" && (
              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">Needs Approval</span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">{opp.pageTitle}</p>
          {opp.metadata.suggestedTopic && (
            <p className="text-[11px] text-brand-600 mt-0.5">Topic: {opp.metadata.suggestedTopic}</p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {SCORE_ORDER.slice(0, 3).map(s => (
            <ScorePill key={s.key} label={s.label} value={opp.scores[s.key]} invert={s.key === "spamRisk" || s.key === "acquisitionDifficulty"} />
          ))}
          {open ? <ChevronUp size={14} className="text-gray-400 ml-1" /> : <ChevronDown size={14} className="text-gray-400 ml-1" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-4">
          {/* All scores */}
          <div className="flex gap-2 flex-wrap">
            {SCORE_ORDER.map(s => (
              <ScorePill key={s.key} label={s.label} value={opp.scores[s.key]} invert={s.key === "spamRisk" || s.key === "acquisitionDifficulty"} />
            ))}
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-gray-400 text-[10px] mb-0.5">Suggested Anchor</p>
              <p className="text-gray-700 font-medium">{opp.metadata.anchorText}</p>
            </div>
            <div>
              <p className="text-gray-400 text-[10px] mb-0.5">Target Page</p>
              <p className="text-gray-700 font-medium">{opp.metadata.targetPage}</p>
            </div>
            {opp.contactEmail && (
              <div>
                <p className="text-gray-400 text-[10px] mb-0.5">Contact Email</p>
                <p className="text-gray-700">{opp.contactEmail}</p>
              </div>
            )}
            {opp.outreach.notes && (
              <div className="col-span-2">
                <p className="text-gray-400 text-[10px] mb-0.5">Notes</p>
                <p className="text-gray-600 italic">{opp.outreach.notes}</p>
              </div>
            )}
          </div>

          {/* Approval */}
          {opp.approvalStatus === "pending_review" && (
            <button onClick={approve}
              className="flex items-center gap-1.5 text-[11px] font-semibold bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors">
              <CheckCircle2 size={11} />
              Approve for Outreach
            </button>
          )}

          {/* Status flow */}
          {opp.approvalStatus === "approved" && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-gray-400 mr-1">Move to:</span>
              {STATUS_FLOW.filter(s => s !== opp.outreach.status).map(s => (
                <button key={s} onClick={() => updateStatus(s)} disabled={saving}
                  className={`text-[10px] font-medium px-2.5 py-1 rounded-lg border transition-colors ${STATUS_COLORS[s]} border-current`}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          )}

          {/* Outreach email */}
          {opp.approvalStatus === "approved" && (
            <OutreachPanel opp={opp} onRefresh={onRefresh} />
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OffPageSEOPage() {
  const [data,       setData]       = useState<APIResponse | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [discovering, setDiscovering] = useState(false)
  const [vertical,   setVertical]   = useState("government_procurement_india")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterType,   setFilterType]   = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus) params.set("status", filterStatus)
    if (filterType)   params.set("type", filterType)
    const res = await fetch(`/api/admin/growth/agents/offpage-seo?${params}`)
    const d   = await res.json()
    setData(d as APIResponse)
    setLoading(false)
  }, [filterStatus, filterType])

  useEffect(() => { load() }, [load])

  const discover = async () => {
    setDiscovering(true)
    await fetch("/api/admin/growth/agents/offpage-seo", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "discover", vertical, count: 8 }),
    })
    setDiscovering(false)
    load()
  }

  const stats = data?.stats

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Link2 size={18} className="text-brand-600" />
          <div>
            <h1 className="text-base font-bold text-gray-900">Off-Page SEO Director</h1>
            <p className="text-gray-400 text-[11px]">Backlink discovery, outreach, citations, authority building — GeM · government · MSME · fogging verticals</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1400px] space-y-6">
        {/* Governance notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-xs text-blue-700">
          <AlertCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
          <p><strong>Founder approval required</strong> before any outreach is sent. New opportunities appear as "Needs Approval" — review and approve each one individually. No PBNs or link farms are ever included.</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: "Total Opportunities", value: stats.total,      color: "text-gray-700" },
              { label: "Pending Review",       value: stats.pending,    color: "text-amber-600" },
              { label: "In Progress",          value: stats.inProgress, color: "text-blue-600" },
              { label: "Acquired Links",       value: stats.acquired,   color: "text-green-600" },
              { label: "Approved",             value: stats.approved,   color: "text-brand-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Discover panel */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[11px] font-medium text-gray-500 block mb-1">Discover new opportunities for vertical</label>
            <input value={vertical} onChange={e => setVertical(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              placeholder="e.g. government_procurement_india, pest_control_india" />
          </div>
          <button onClick={discover} disabled={discovering}
            className="flex items-center gap-1.5 text-xs font-medium bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors whitespace-nowrap">
            <RotateCw size={12} className={discovering ? "animate-spin" : ""} />
            {discovering ? "Discovering…" : "Discover Opportunities (AI)"}
          </button>
          <p className="text-[10px] text-gray-400 w-full">Uses Claude Haiku · finds 8 real Indian sites per run · results require approval before outreach</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30">
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30">
            <option value="">All Types</option>
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button onClick={load} className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <RotateCw size={11} />
            Refresh
          </button>
        </div>

        {/* Opportunity list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {(data?.opportunities ?? []).length === 0 && (
              <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
                <Link2 size={28} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-400">No opportunities yet</p>
                <p className="text-[11px] text-gray-300 mt-1">Click "Discover Opportunities" to find backlink targets in your vertical</p>
              </div>
            )}
            {(data?.opportunities ?? []).map(opp => (
              <OppCard key={opp._id} opp={opp} onRefresh={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
