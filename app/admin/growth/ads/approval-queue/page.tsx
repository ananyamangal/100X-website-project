"use client"

import { useState, useEffect, useCallback } from "react"
import {
  CheckCircle, XCircle, Edit3, RefreshCw, PlayCircle,
  AlertTriangle, Info, ChevronDown, ChevronUp, Zap,
  Target, Type, Globe, TrendingUp, RotateCcw,
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────────────────────

interface QualityScores {
  opportunityScore:     number
  keywordQualityScore:  number
  adCopyQualityScore:   number
  landingPageScore:     number
  deploymentConfidence: number
  recommendation:       "recommended_for_deployment" | "needs_review"
  gaps:                 string[]
}

interface KeywordEntry {
  text:       string
  matchType:  "EXACT" | "PHRASE" | "BROAD"
  rationale:  string
}

interface AdGroup {
  name:        string
  landingPage: string
  keywords:    KeywordEntry[]
  rsa:         { headlines: string[]; descriptions: string[]; callouts: string[] }
}

interface LandingRec {
  adGroup: string
  page:    string
  score:   number
  gaps:    string[]
}

interface CampaignPlan {
  planId:         string
  deploymentId?:  string
  campaignName:   string
  status:         string
  simulated:      boolean
  adGroups:       AdGroup[]
  campaignNegatives: string[]
  landingPageRecs: LandingRec[]
  qualityScores:  QualityScores
  execHeader:     { confidence: number; roi: string; risk: string; priority: string; recommendation: string }
  createdAt:      string
}

interface Preflight {
  tokenStatus:      { configured: boolean; note: string }
  accountConnected: boolean
  customerId?:      string
  canDeploy:        boolean
  recentPlans:      Array<{ planId: string; campaignName: string; status: string; simulated: boolean; createdAt: string }>
}

// ── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ label, score, icon: Icon }: { label: string; score: number; icon: React.ComponentType<{ size?: number; className?: string }> }) {
  const color = score >= 75 ? "bg-green-500" : score >= 55 ? "bg-yellow-500" : "bg-red-500"
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-gray-400"><Icon size={11} />{label}</span>
        <span className={`font-bold ${score >= 75 ? "text-green-400" : score >= 55 ? "text-yellow-400" : "text-red-400"}`}>{score}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

// ── Match type badge ─────────────────────────────────────────────────────────

function MatchBadge({ type }: { type: string }) {
  const c = type === "EXACT" ? "bg-blue-900/50 text-blue-300 border-blue-700" :
            type === "PHRASE" ? "bg-purple-900/50 text-purple-300 border-purple-700" :
            "bg-gray-800 text-gray-400 border-gray-700"
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${c}`}>
      {type === "EXACT" ? "[e]" : type === "PHRASE" ? '"p"' : "~b~"}
    </span>
  )
}

// ── Status chip ──────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending_approval:    "bg-yellow-900/40 text-yellow-300 border-yellow-700",
    approved:            "bg-green-900/40 text-green-300 border-green-700",
    approved_simulated:  "bg-green-900/40 text-green-300 border-green-700",
    rejected:            "bg-red-900/40 text-red-400 border-red-800",
    modify_requested:    "bg-blue-900/40 text-blue-300 border-blue-700",
  }
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${map[status] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>
      {status.replace(/_/g, " ")}
    </span>
  )
}

// ── Plan detail card ─────────────────────────────────────────────────────────

function PlanCard({ plan, onAction }: { plan: CampaignPlan; onAction: () => void }) {
  const [expanded, setExpanded] = useState(plan.status === "pending_approval")
  const [acting, setActing] = useState(false)
  const [modifyReason, setModifyReason] = useState("")
  const [showModify, setShowModify] = useState(false)

  const qs = plan.qualityScores
  const isRec = qs.recommendation === "recommended_for_deployment"

  const act = async (action: "approve" | "reject" | "modify", reason?: string) => {
    setActing(true)
    try {
      const res = await fetch("/api/admin/growth/ads/approval-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, planId: plan.planId, deploymentId: plan.deploymentId, reason }),
      })
      if (!res.ok) throw new Error(await res.text())
      onAction()
    } catch (e) {
      alert(`Action failed: ${String(e)}`)
    } finally {
      setActing(false)
      setShowModify(false)
    }
  }

  const isPending = plan.status === "pending_approval"

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-white font-semibold text-sm truncate">{plan.campaignName}</span>
            <StatusChip status={plan.status} />
            {plan.simulated && (
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-gray-600 text-gray-400">simulated</span>
            )}
          </div>
          <p className="text-gray-500 text-xs">
            {new Date(plan.createdAt).toLocaleString()} · {plan.adGroups.length} ad groups · {plan.adGroups.reduce((s, g) => s + g.keywords.length, 0)} keywords
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Recommendation badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
            isRec ? "bg-green-900/30 border-green-700 text-green-400" : "bg-yellow-900/30 border-yellow-700 text-yellow-400"
          }`}>
            {isRec ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
            <span>{isRec ? "Recommended" : "Needs Review"}</span>
          </div>
          {/* Confidence */}
          <div className="text-center">
            <div className={`text-lg font-bold ${qs.deploymentConfidence >= 65 ? "text-green-400" : "text-yellow-400"}`}>
              {qs.deploymentConfidence}
            </div>
            <div className="text-[10px] text-gray-500">confidence</div>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 text-gray-500 hover:text-white transition-colors">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Quality scores bar */}
      <div className="px-5 pb-3 grid grid-cols-4 gap-4 border-t border-gray-800/50 pt-3">
        <ScoreBar label="Opportunity"  score={qs.opportunityScore}    icon={TrendingUp} />
        <ScoreBar label="Keywords"     score={qs.keywordQualityScore} icon={Target} />
        <ScoreBar label="Ad Copy"      score={qs.adCopyQualityScore}  icon={Type} />
        <ScoreBar label="Landing Page" score={qs.landingPageScore}    icon={Globe} />
      </div>

      {/* Gaps */}
      {qs.gaps.length > 0 && (
        <div className="px-5 pb-3">
          <div className="bg-yellow-950/20 border border-yellow-900/40 rounded-lg p-3 space-y-1">
            {qs.gaps.slice(0, 5).map((g, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-yellow-400">
                <AlertTriangle size={10} className="flex-shrink-0 mt-0.5" />
                <span>{g}</span>
              </div>
            ))}
            {qs.gaps.length > 5 && (
              <div className="text-xs text-gray-500">+{qs.gaps.length - 5} more gaps</div>
            )}
          </div>
        </div>
      )}

      {/* Expanded campaign tree */}
      {expanded && (
        <div className="border-t border-gray-800 px-5 py-4 space-y-5">
          {plan.adGroups.map(ag => (
            <div key={ag.name} className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-white">{ag.name}</h4>
                <span className="text-xs text-gray-500">{ag.landingPage}</span>
              </div>

              {/* Keywords */}
              <div className="space-y-1.5">
                {ag.keywords.map((kw, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <MatchBadge type={kw.matchType} />
                    <code className="text-gray-300 flex-1 font-mono text-[11px]">{kw.text}</code>
                    <span className="text-gray-600 text-[10px] hidden xl:block truncate max-w-48">{kw.rationale}</span>
                  </div>
                ))}
              </div>

              {/* RSA headlines preview */}
              <div className="bg-gray-800/40 rounded-lg p-3">
                <p className="text-[10px] text-gray-500 mb-2 font-medium uppercase tracking-wider">RSA Headlines</p>
                <div className="flex flex-wrap gap-1.5">
                  {ag.rsa.headlines.slice(0, 8).map((h, i) => (
                    <span key={i} className="text-[11px] bg-gray-700/60 text-gray-300 px-2 py-0.5 rounded">{h}</span>
                  ))}
                  {ag.rsa.headlines.length > 8 && (
                    <span className="text-[11px] text-gray-500">+{ag.rsa.headlines.length - 8} more</span>
                  )}
                </div>
              </div>

              {/* LP recommendation */}
              {plan.landingPageRecs.find(r => r.adGroup === ag.name) && (() => {
                const rec = plan.landingPageRecs.find(r => r.adGroup === ag.name)!
                return (
                  <div className="flex items-start gap-3 text-xs">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${rec.score >= 75 ? "bg-green-900/40 text-green-400" : rec.score >= 60 ? "bg-yellow-900/40 text-yellow-400" : "bg-red-900/40 text-red-400"}`}>
                      LP {rec.score}
                    </span>
                    <span className="text-gray-400">{rec.page}</span>
                    {rec.gaps.length > 0 && <span className="text-yellow-600">{rec.gaps[0]}</span>}
                  </div>
                )
              })()}
            </div>
          ))}

          {/* Campaign negatives */}
          <div>
            <p className="text-[10px] text-gray-500 mb-2 font-medium uppercase tracking-wider">Campaign Negatives</p>
            <div className="flex flex-wrap gap-1.5">
              {plan.campaignNegatives.map((neg, i) => (
                <span key={i} className="text-[11px] bg-red-950/40 text-red-400 border border-red-900/40 px-2 py-0.5 rounded">
                  -{neg}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action bar */}
      {isPending && (
        <div className="border-t border-gray-800 px-5 py-3 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            {plan.simulated ? "Simulated — no real Google Ads changes on approve." : "Approve will enable the campaign and commit budget."}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowModify(!showModify)}
              disabled={acting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-400 border border-blue-800 rounded-lg hover:bg-blue-950/30 transition-colors disabled:opacity-50"
            >
              <Edit3 size={12} />Modify
            </button>
            <button
              onClick={() => act("reject")}
              disabled={acting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 border border-red-800 rounded-lg hover:bg-red-950/30 transition-colors disabled:opacity-50"
            >
              <XCircle size={12} />Reject
            </button>
            <button
              onClick={() => act("approve")}
              disabled={acting}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-green-700 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 font-medium"
            >
              {acting ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle size={12} />}
              Approve
            </button>
          </div>
        </div>
      )}

      {showModify && (
        <div className="border-t border-gray-800 px-5 py-3 bg-blue-950/10">
          <p className="text-xs text-gray-400 mb-2">Describe what to change — the factory will regenerate on next run.</p>
          <div className="flex gap-2">
            <input
              value={modifyReason}
              onChange={e => setModifyReason(e.target.value)}
              placeholder="e.g. Add more Exact keywords for OEM group"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:border-blue-600"
            />
            <button
              onClick={() => act("modify", modifyReason)}
              disabled={acting || !modifyReason.trim()}
              className="px-3 py-1.5 text-xs bg-blue-700 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ApprovalQueuePage() {
  const [preflight, setPreflight] = useState<Preflight | null>(null)
  const [plans, setPlans]       = useState<CampaignPlan[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("pending_approval")
  const [loading, setLoading]   = useState(true)
  const [running, setRunning]   = useState(false)
  const [runResult, setRunResult] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [preRes, queueRes] = await Promise.all([
        fetch("/api/admin/growth/ads/campaign-factory"),
        fetch(`/api/admin/growth/ads/approval-queue?status=${statusFilter}`),
      ])
      const preData   = await preRes.json() as Preflight
      const queueData = await queueRes.json() as { items: CampaignPlan[] }
      setPreflight(preData)
      setPlans(queueData.items ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const runFactory = async () => {
    setRunning(true)
    setRunResult(null)
    try {
      const res = await fetch("/api/admin/growth/ads/campaign-factory", { method: "POST" })
      const data = await res.json() as { ok: boolean; simulated?: boolean; skippedReason?: string; campaignName?: string; error?: string }
      if (data.skippedReason) {
        setRunResult(`Skipped: ${data.skippedReason}`)
      } else if (data.ok) {
        setRunResult(data.simulated
          ? `Simulated — ${data.campaignName} staged (no dev token / account)`
          : `Deployed — ${data.campaignName} → Approval Queue`)
        await load()
      } else {
        setRunResult(`Error: ${data.error}`)
      }
    } catch (e) {
      setRunResult(`Error: ${String(e)}`)
    } finally {
      setRunning(false)
    }
  }

  const pendingCount = plans.filter(p => p.status === "pending_approval").length

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={18} className="text-brand-400" />
              <h1 className="text-xl font-bold">Media Buyer Review</h1>
              {pendingCount > 0 && (
                <span className="bg-yellow-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingCount}</span>
              )}
            </div>
            <p className="text-gray-400 text-sm">Funnel A · Dealer Acquisition · Search campaigns pending approval</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-2 text-gray-500 hover:text-white border border-gray-800 rounded-lg transition-colors" title="Refresh">
              <RefreshCw size={14} />
            </button>
            <button
              onClick={runFactory}
              disabled={running}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-500 transition-colors disabled:opacity-50 font-medium"
            >
              {running ? <RefreshCw size={14} className="animate-spin" /> : <PlayCircle size={14} />}
              Run Campaign Factory
            </button>
          </div>
        </div>

        {/* Governance banner */}
        <div className="flex items-start gap-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
          <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-gray-400 space-y-0.5">
            <p className="font-medium text-gray-300">Governance rules — AI Media Buyer</p>
            <p>AI creates drafts only. No automatic publishing, spending, or budget increases. Human APPROVE is the only path to live traffic.</p>
          </div>
        </div>

        {/* Preflight status */}
        {preflight && (
          <div className="grid grid-cols-3 gap-3">
            <div className={`bg-gray-900 border rounded-xl p-4 ${preflight.tokenStatus.configured ? "border-green-800/50" : "border-red-800/50"}`}>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Developer Token</p>
              <p className={`text-sm font-semibold ${preflight.tokenStatus.configured ? "text-green-400" : "text-red-400"}`}>
                {preflight.tokenStatus.configured ? "Configured" : "Not Set"}
              </p>
              <p className="text-[10px] text-gray-600 mt-1">{preflight.tokenStatus.note.slice(0, 80)}</p>
            </div>
            <div className={`bg-gray-900 border rounded-xl p-4 ${preflight.accountConnected ? "border-green-800/50" : "border-yellow-800/50"}`}>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Ads Account</p>
              <p className={`text-sm font-semibold ${preflight.accountConnected ? "text-green-400" : "text-yellow-400"}`}>
                {preflight.accountConnected ? `Connected (${preflight.customerId})` : "Not Connected"}
              </p>
              <p className="text-[10px] text-gray-600 mt-1">
                {preflight.accountConnected ? "Ready for real deployment" : "Set up in Ads Setup first"}
              </p>
            </div>
            <div className={`bg-gray-900 border rounded-xl p-4 ${preflight.canDeploy ? "border-green-800/50" : "border-gray-700"}`}>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Deploy Mode</p>
              <p className={`text-sm font-semibold ${preflight.canDeploy ? "text-green-400" : "text-yellow-400"}`}>
                {preflight.canDeploy ? "Live Deployment" : "Simulation Mode"}
              </p>
              <p className="text-[10px] text-gray-600 mt-1">
                {preflight.canDeploy ? "Will create real Google Ads entities" : "No real API calls — testing pipeline"}
              </p>
            </div>
          </div>
        )}

        {/* Run result */}
        {runResult && (
          <div className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${
            runResult.startsWith("Error") ? "bg-red-950/20 border-red-800/50 text-red-400" :
            runResult.startsWith("Skipped") ? "bg-yellow-950/20 border-yellow-800/50 text-yellow-400" :
            "bg-green-950/20 border-green-800/50 text-green-400"
          }`}>
            {runResult.startsWith("Error") ? <XCircle size={14} /> : <CheckCircle size={14} />}
            {runResult}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex items-center gap-2">
          {["pending_approval", "approved", "rejected", "all"].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                statusFilter === s
                  ? "bg-brand-600/20 border-brand-600/40 text-brand-400"
                  : "border-gray-800 text-gray-500 hover:text-white hover:border-gray-700"
              }`}
            >
              {s.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        {/* Plan list */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="h-32 bg-gray-900 rounded-xl animate-pulse" />)}
          </div>
        ) : plans.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <RotateCcw size={32} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No campaigns in this queue.</p>
            <p className="text-gray-600 text-xs mt-1">Click "Run Campaign Factory" to generate a new draft.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map(plan => (
              <PlanCard key={plan.planId} plan={plan} onAction={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
