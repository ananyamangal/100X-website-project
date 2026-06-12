"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Zap, Play, RefreshCw, CheckCircle, XCircle, AlertTriangle, Info,
  ChevronDown, ChevronUp, Target, Type, Globe, TrendingUp, RotateCcw,
  Shield, Layers, Key, BarChart3, ArrowRight, Rocket, Eye, Edit3,
} from "lucide-react"

import type { NegativeDraftV2 } from "@/lib/growth-os/types"

// ── Types ─────────────────────────────────────────────────────────────────────

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
  rationale?: string
  confidence?: number
  source?:    string
}

interface RSAVariant {
  headlines:    string[]
  descriptions: string[]
  callouts?:    string[]
}

interface AdGroup {
  name:        string
  theme?:      string
  landingPage: string
  keywords:    KeywordEntry[]
  rsa:         RSAVariant
}

interface LandingRec {
  adGroup: string
  page:    string
  score:   number
  gaps:    string[]
}

interface CampaignPlan {
  planId:              string
  deploymentId?:       string
  campaignName:        string
  status:              string
  simulated:           boolean
  adGroups:            AdGroup[]
  campaignNegatives:   NegativeDraftV2[]
  landingPageRecs:     LandingRec[]
  qualityScores:       QualityScores
  execHeader:          { confidence: number; roi: string; risk: string; priority: string; recommendation: string }
  createdAt:           string
}

interface Preflight {
  tokenStatus:      { configured: boolean; note: string }
  accountConnected: boolean
  customerId?:      string
  canDeploy:        boolean
  recentPlans:      Array<{ planId: string; campaignName: string; status: string; simulated: boolean; createdAt: string }>
}

interface ConversionAction {
  name:            string
  dataLayerEvent:  string
  category:        string
  defaultValue:    number
  countingMode:    string
  description:     string
  gtmPageFilter:   string | null
  isRevenue:       boolean
  labelConfigured: boolean
}

interface ConversionMapping {
  conversionIdConfigured: boolean
  allLabelsConfigured:    boolean
  awConversionId:         string
  gtmContainer:           string
  actions:                ConversionAction[]
  totalValue:             number
  adGroupMap:             Record<string, string[]>
  status:                 "configured" | "pending_setup"
}

type TabKey = "adgroups" | "keywords" | "rsa" | "conversions" | "quality"

// ── Helpers ───────────────────────────────────────────────────────────────────

function MatchBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    EXACT:  "bg-blue-900/60 text-blue-300 border-blue-700",
    PHRASE: "bg-purple-900/60 text-purple-300 border-purple-700",
    BROAD:  "bg-gray-800 text-gray-400 border-gray-700",
  }
  const labels: Record<string, string> = { EXACT: "[exact]", PHRASE: '"phrase"', BROAD: "~broad~" }
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono flex-shrink-0 ${styles[type] ?? styles.BROAD}`}>
      {labels[type] ?? type}
    </span>
  )
}

function ScoreBar({ label, score, icon: Icon }: {
  label: string; score: number
  icon: React.ComponentType<{ size?: number; className?: string }>
}) {
  const color = score >= 75 ? "bg-emerald-500" : score >= 55 ? "bg-amber-500" : "bg-red-500"
  const text  = score >= 75 ? "text-emerald-400" : score >= 55 ? "text-amber-400" : "text-red-400"
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-gray-400"><Icon size={11} />{label}</span>
        <span className={`font-bold text-sm ${text}`}>{score}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
    </div>
  )
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending_approval:   "bg-amber-900/40 text-amber-300 border-amber-700",
    approved:           "bg-emerald-900/40 text-emerald-300 border-emerald-700",
    approved_simulated: "bg-emerald-900/40 text-emerald-300 border-emerald-700",
    rejected:           "bg-red-900/40 text-red-400 border-red-800",
    modify_requested:   "bg-blue-900/40 text-blue-300 border-blue-700",
  }
  return (
    <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-semibold capitalize ${map[status] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>
      {status.replace(/_/g, " ")}
    </span>
  )
}

function ReadinessChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${ok ? "border-emerald-800 text-emerald-400 bg-emerald-950/30" : "border-red-800 text-red-400 bg-red-950/30"}`}>
      {ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
      {label}
    </div>
  )
}

function negText(n: NegativeDraftV2): string {
  return n.text
}

// ── Tab content components ────────────────────────────────────────────────────

function AdGroupsTab({ plan }: { plan: CampaignPlan }) {
  return (
    <div className="space-y-4">
      {plan.adGroups.map(ag => (
        <div key={ag.name} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h4 className="text-white font-semibold">{ag.name}</h4>
              {ag.theme && <span className="text-[11px] text-gray-500">Theme: {ag.theme}</span>}
            </div>
            <div className="text-right">
              <code className="text-xs text-brand-400 bg-brand-950/30 px-2 py-1 rounded border border-brand-900/40">{ag.landingPage}</code>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-xl font-bold text-white">{ag.keywords.length}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Keywords</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-xl font-bold text-white">{ag.rsa.headlines.length}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">RSA Headlines</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-xl font-bold text-white">{ag.rsa.descriptions.length}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">RSA Descriptions</p>
            </div>
          </div>
          {plan.landingPageRecs.find(r => r.adGroup === ag.name) && (() => {
            const rec = plan.landingPageRecs.find(r => r.adGroup === ag.name)!
            const color = rec.score >= 75 ? "text-emerald-400 border-emerald-800 bg-emerald-950/20" : rec.score >= 60 ? "text-amber-400 border-amber-800 bg-amber-950/20" : "text-red-400 border-red-800 bg-red-950/20"
            return (
              <div className={`mt-3 flex items-start gap-3 text-xs p-2.5 rounded-lg border ${color}`}>
                <Globe size={12} className="flex-shrink-0 mt-0.5" />
                <span>Landing page score: <strong>{rec.score}/100</strong>{rec.gaps.length > 0 && ` · Gap: ${rec.gaps[0]}`}</span>
              </div>
            )
          })()}
        </div>
      ))}

      {/* Campaign-level negatives */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Shield size={12} className="text-red-400" />
          Campaign Negative Keywords ({plan.campaignNegatives.length})
        </p>
        <div className="flex flex-wrap gap-1.5">
          {plan.campaignNegatives.map((neg, i) => (
            <span key={i} className="text-[11px] bg-red-950/30 text-red-400 border border-red-900/40 px-2 py-0.5 rounded">
              −{negText(neg)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function KeywordsTab({ plan }: { plan: CampaignPlan }) {
  const totalKeywords = plan.adGroups.reduce((s, g) => s + g.keywords.length, 0)
  const byMatchType: Record<string, number> = {}
  plan.adGroups.forEach(g => g.keywords.forEach(k => {
    byMatchType[k.matchType] = (byMatchType[k.matchType] || 0) + 1
  }))

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{totalKeywords}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Total Keywords</p>
        </div>
        {Object.entries(byMatchType).map(([type, count]) => (
          <div key={type} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{count}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{type.charAt(0) + type.slice(1).toLowerCase()}</p>
          </div>
        ))}
      </div>

      {/* Keywords by ad group */}
      {plan.adGroups.map(ag => (
        <div key={ag.name} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
            <span className="text-sm font-medium text-white">{ag.name}</span>
            <span className="text-xs text-gray-500">{ag.keywords.length} keywords</span>
          </div>
          <div className="divide-y divide-gray-800/60">
            {ag.keywords.map((kw, i) => (
              <div key={i} className="px-5 py-3 flex items-start gap-3">
                <MatchBadge type={kw.matchType} />
                <div className="flex-1 min-w-0">
                  <code className="text-sm text-gray-200 font-mono">{kw.text}</code>
                  {kw.rationale && (
                    <p className="text-[11px] text-gray-600 mt-0.5 truncate">{kw.rationale}</p>
                  )}
                </div>
                {kw.confidence !== undefined && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${kw.confidence >= 80 ? "bg-emerald-900/40 text-emerald-400" : kw.confidence >= 60 ? "bg-amber-900/40 text-amber-400" : "bg-gray-800 text-gray-500"}`}>
                    {kw.confidence}%
                  </span>
                )}
                {kw.source && (
                  <span className="text-[10px] text-gray-600 flex-shrink-0">{kw.source}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function RSATab({ plan }: { plan: CampaignPlan }) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(plan.adGroups[0]?.name ?? null)

  return (
    <div className="space-y-3">
      <div className="bg-gray-900 border border-amber-900/40 rounded-xl p-4 flex gap-3">
        <Info size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400">
          RSA ads are created as <strong className="text-white">PAUSED</strong> within the paused campaign.
          Google's AI rotates headlines and descriptions to find best-performing combinations after the campaign is enabled.
          Max 15 headlines / 4 descriptions per RSA.
        </p>
      </div>

      {plan.adGroups.map(ag => {
        const isExpanded = expandedGroup === ag.name
        return (
          <div key={ag.name} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedGroup(isExpanded ? null : ag.name)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
            >
              <div className="text-left">
                <p className="text-sm font-medium text-white">{ag.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {ag.rsa.headlines.length} headlines · {ag.rsa.descriptions.length} descriptions
                  {ag.rsa.callouts && ag.rsa.callouts.length > 0 ? ` · ${ag.rsa.callouts.length} callouts` : ""}
                </p>
              </div>
              {isExpanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
            </button>

            {isExpanded && (
              <div className="px-5 pb-5 space-y-4 border-t border-gray-800">
                {/* Ad preview */}
                <div className="mt-4 bg-white rounded-xl p-4 shadow-lg">
                  <div className="text-[10px] text-gray-400 mb-1">Ad · 100xcircle.com{ag.landingPage}</div>
                  <p className="text-blue-700 text-sm font-medium leading-tight hover:underline cursor-pointer">
                    {ag.rsa.headlines.slice(0, 3).join(" | ")}
                  </p>
                  <p className="text-gray-600 text-xs mt-1 leading-relaxed">
                    {ag.rsa.descriptions[0] ?? ""}
                  </p>
                </div>

                {/* Headlines */}
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                    <Type size={10} />Headlines ({ag.rsa.headlines.length}/15)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ag.rsa.headlines.map((h, i) => (
                      <span key={i} className="text-xs bg-gray-800 text-gray-300 px-2.5 py-1 rounded-lg border border-gray-700">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Descriptions */}
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">Descriptions ({ag.rsa.descriptions.length}/4)</p>
                  <div className="space-y-2">
                    {ag.rsa.descriptions.map((d, i) => (
                      <div key={i} className="text-xs text-gray-300 bg-gray-800/60 rounded-lg px-3 py-2 border border-gray-700/60">
                        {d}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Callouts */}
                {ag.rsa.callouts && ag.rsa.callouts.length > 0 && (
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">Callouts</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ag.rsa.callouts.map((c, i) => (
                        <span key={i} className="text-[11px] text-gray-400 bg-gray-800/40 border border-gray-700 px-2 py-0.5 rounded">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ConversionsTab({ convMap, plan }: { convMap: ConversionMapping | null; plan: CampaignPlan }) {
  if (!convMap) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
        <RefreshCw size={24} className="text-gray-700 mx-auto mb-2 animate-spin" />
        <p className="text-gray-500 text-sm">Loading conversion data…</p>
      </div>
    )
  }

  const catColor: Record<string, string> = {
    lead:    "bg-emerald-900/40 text-emerald-400 border-emerald-800",
    contact: "bg-blue-900/40 text-blue-400 border-blue-800",
    engagement: "bg-gray-800 text-gray-400 border-gray-700",
  }

  return (
    <div className="space-y-4">
      {/* GTM Status */}
      <div className={`flex items-start gap-3 p-4 rounded-xl border ${convMap.status === "configured" ? "bg-emerald-950/20 border-emerald-800/40" : "bg-amber-950/20 border-amber-800/40"}`}>
        {convMap.status === "configured" ? <CheckCircle size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />}
        <div className="text-sm">
          <p className={`font-semibold ${convMap.status === "configured" ? "text-emerald-300" : "text-amber-300"}`}>
            {convMap.status === "configured" ? "Conversion tracking configured" : "Conversion tracking needs setup"}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">
            GTM Container: {convMap.gtmContainer} · Conversion ID: {convMap.conversionIdConfigured ? convMap.awConversionId : "NOT SET"} · Total value: ₹{convMap.totalValue.toLocaleString("en-IN")} per lead
          </p>
        </div>
      </div>

      {/* Conversion actions */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Conversion Actions ({convMap.actions.length})</p>
        </div>
        <div className="divide-y divide-gray-800/60">
          {convMap.actions.map(action => (
            <div key={action.name} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-medium text-white">{action.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${catColor[action.category]}`}>{action.category}</span>
                    {action.isRevenue && <span className="text-[10px] px-2 py-0.5 rounded-full border border-brand-800 bg-brand-950/30 text-brand-400 font-semibold">primary</span>}
                    {!action.labelConfigured && <span className="text-[10px] px-2 py-0.5 rounded-full border border-red-800 bg-red-950/30 text-red-400">label not set</span>}
                  </div>
                  <p className="text-xs text-gray-500">{action.description}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-600">
                    <span>Event: <code className="text-gray-400">{action.dataLayerEvent}</code></span>
                    {action.gtmPageFilter && <span>Page filter: <code className="text-gray-400">{action.gtmPageFilter}</code></span>}
                    <span>{action.countingMode.replace(/_/g, " ").toLowerCase()}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-white">₹{action.defaultValue.toLocaleString("en-IN")}</p>
                  <p className="text-[10px] text-gray-600">per conversion</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ad group → conversion mapping */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ad Group → Conversion Assignment</p>
        </div>
        <div className="divide-y divide-gray-800/60">
          {plan.adGroups.map(ag => {
            const assigned = convMap.adGroupMap[ag.name] ?? ["RFQ Submit", "WhatsApp Click", "Phone Click"]
            const totalVal = convMap.actions
              .filter(a => assigned.includes(a.name))
              .reduce((s, a) => s + a.defaultValue, 0)
            return (
              <div key={ag.name} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-white mb-1.5">{ag.name}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {assigned.map(name => (
                        <span key={name} className="text-[11px] bg-gray-800 text-gray-300 border border-gray-700 px-2 py-0.5 rounded">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-base font-bold text-emerald-400">₹{totalVal.toLocaleString("en-IN")}</p>
                    <p className="text-[10px] text-gray-600">max value/click</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function QualityTab({ plan }: { plan: CampaignPlan }) {
  const qs = plan.qualityScores
  const isRec = qs.recommendation === "recommended_for_deployment"

  return (
    <div className="space-y-4">
      {/* Recommendation banner */}
      <div className={`flex items-center gap-3 p-4 rounded-xl border ${isRec ? "bg-emerald-950/20 border-emerald-800/40" : "bg-amber-950/20 border-amber-800/40"}`}>
        {isRec ? <CheckCircle size={20} className="text-emerald-400" /> : <AlertTriangle size={20} className="text-amber-400" />}
        <div>
          <p className={`font-bold ${isRec ? "text-emerald-300" : "text-amber-300"}`}>
            {isRec ? "Recommended for Deployment" : "Needs Review Before Deployment"}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">Deployment confidence: {qs.deploymentConfidence}/100</p>
        </div>
        <div className="ml-auto text-right">
          <p className={`text-3xl font-black ${qs.deploymentConfidence >= 65 ? "text-emerald-400" : "text-amber-400"}`}>{qs.deploymentConfidence}</p>
          <p className="text-[10px] text-gray-600">/ 100</p>
        </div>
      </div>

      {/* Score bars */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
        <ScoreBar label="Opportunity Score"    score={qs.opportunityScore}    icon={TrendingUp} />
        <ScoreBar label="Keyword Quality"      score={qs.keywordQualityScore} icon={Target} />
        <ScoreBar label="Ad Copy Quality"      score={qs.adCopyQualityScore}  icon={Type} />
        <ScoreBar label="Landing Page Score"   score={qs.landingPageScore}    icon={Globe} />
        <div className="border-t border-gray-800 pt-4">
          <ScoreBar label="Deployment Confidence (composite)" score={qs.deploymentConfidence} icon={BarChart3} />
        </div>
      </div>

      {/* Gaps */}
      {qs.gaps.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Gaps to Address</p>
          <div className="space-y-2">
            {qs.gaps.map((g, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-amber-400 bg-amber-950/20 px-3 py-2 rounded-lg">
                <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
                <span>{g}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Executive summary */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Executive Summary</p>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { label: "ROI Estimate", value: plan.execHeader.roi },
            { label: "Risk Level", value: plan.execHeader.risk },
            { label: "Priority", value: plan.execHeader.priority },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-base font-bold text-white">{value}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: "draft" | "preview" | "approve" | "deployed" }) {
  const steps = [
    { id: "draft",    label: "Generate Draft" },
    { id: "preview",  label: "Preview" },
    { id: "approve",  label: "Approve" },
    { id: "deployed", label: "Deploy" },
  ]
  const order = ["draft", "preview", "approve", "deployed"]
  const currentIdx = order.indexOf(current)

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const done    = i < currentIdx
        const active  = i === currentIdx
        const pending = i > currentIdx
        return (
          <div key={step.id} className="flex items-center">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold ${
              done    ? "text-emerald-400" :
              active  ? "text-white bg-brand-600/20 border border-brand-600/40" :
                        "text-gray-600"
            }`}>
              {done ? <CheckCircle size={12} /> : <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] ${active ? "border-brand-400 text-brand-400" : "border-gray-700 text-gray-700"}`}>{i + 1}</span>}
              {step.label}
            </div>
            {i < steps.length - 1 && (
              <ArrowRight size={14} className={`mx-1 ${done ? "text-emerald-700" : "text-gray-800"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CampaignFactoryPage() {
  const [preflight, setPreflight]   = useState<Preflight | null>(null)
  const [activePlan, setActivePlan] = useState<CampaignPlan | null>(null)
  const [convMap, setConvMap]       = useState<ConversionMapping | null>(null)
  const [loading, setLoading]       = useState(true)
  const [running, setRunning]       = useState(false)
  const [acting, setActing]         = useState(false)
  const [runMsg, setRunMsg]         = useState<{ type: "ok" | "error" | "warn"; text: string } | null>(null)
  const [activeTab, setActiveTab]   = useState<TabKey>("adgroups")
  const [modifyReason, setModifyReason] = useState("")
  const [showModify, setShowModify] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [preRes, queueRes, convRes] = await Promise.all([
        fetch("/api/admin/growth/ads/campaign-factory"),
        fetch("/api/admin/growth/ads/approval-queue?status=all"),
        fetch("/api/admin/growth/ads/conversion-mapping"),
      ])
      const pre   = await preRes.json()   as Preflight
      const queue = await queueRes.json() as { items: CampaignPlan[] }
      const conv  = await convRes.json()  as ConversionMapping
      setPreflight(pre)
      setConvMap(conv)
      // Show the most recent pending plan first, then fall back to most recent any
      const pending = (queue.items ?? []).find(p => p.status === "pending_approval")
      setActivePlan(pending ?? queue.items?.[0] ?? null)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const runFactory = async () => {
    setRunning(true)
    setRunMsg(null)
    try {
      const res  = await fetch("/api/admin/growth/ads/campaign-factory", { method: "POST" })
      const data = await res.json() as { ok: boolean; simulated?: boolean; skippedReason?: string; campaignName?: string; error?: string }
      if (data.skippedReason) {
        setRunMsg({ type: "warn", text: `Skipped: ${data.skippedReason}` })
      } else if (data.ok) {
        setRunMsg({ type: "ok", text: data.simulated ? `Draft staged (simulation — no developer token / account connected): ${data.campaignName}` : `Campaign drafted and staged for approval: ${data.campaignName}` })
        await load()
      } else {
        setRunMsg({ type: "error", text: `Factory error: ${data.error}` })
      }
    } catch (e) {
      setRunMsg({ type: "error", text: `Network error: ${String(e)}` })
    } finally {
      setRunning(false)
    }
  }

  const act = async (action: "approve" | "reject" | "modify", reason?: string) => {
    if (!activePlan) return
    setActing(true)
    try {
      const res = await fetch("/api/admin/growth/ads/approval-queue", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action, planId: activePlan.planId, deploymentId: activePlan.deploymentId, reason }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json() as { ok: boolean; simulated?: boolean; campaignEnabled?: boolean }
      if (action === "approve") {
        setRunMsg({ type: "ok", text: data.simulated ? "Simulated approval recorded — no real Google Ads changes." : "Campaign ENABLED in Google Ads. It will begin serving within minutes." })
      } else if (action === "reject") {
        setRunMsg({ type: "warn", text: "Campaign rejected and rolled back from Google Ads." })
      } else {
        setRunMsg({ type: "ok", text: "Modification request logged. Re-run factory to regenerate." })
      }
      setShowModify(false)
      setModifyReason("")
      await load()
    } catch (e) {
      setRunMsg({ type: "error", text: `Action failed: ${String(e)}` })
    } finally {
      setActing(false)
    }
  }

  // Derive UI state
  const isPending  = activePlan?.status === "pending_approval"
  const isApproved = activePlan?.status === "approved" || activePlan?.status === "approved_simulated"
  const step: "draft" | "preview" | "approve" | "deployed" =
    !activePlan         ? "draft" :
    isPending           ? "approve" :
    isApproved          ? "deployed" :
                          "preview"

  const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { key: "adgroups",   label: "Ad Groups",          icon: Layers },
    { key: "keywords",   label: "Keywords",            icon: Key },
    { key: "rsa",        label: "RSA Ads",             icon: Type },
    { key: "conversions",label: "Conversion Mapping",  icon: BarChart3 },
    { key: "quality",    label: "Quality Scores",      icon: TrendingUp },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={20} className="text-brand-400" />
              <h1 className="text-xl font-bold">Campaign Factory</h1>
            </div>
            <p className="text-gray-400 text-sm">Funnel A · Dealer Acquisition · Search — Draft → Preview → Approve → Deploy</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-2 text-gray-500 hover:text-white border border-gray-800 rounded-lg transition-colors" title="Refresh">
              <RefreshCw size={14} />
            </button>
            <button
              onClick={runFactory}
              disabled={running || loading}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-500 transition-colors disabled:opacity-50 font-medium"
            >
              {running ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
              {running ? "Generating…" : "Generate Draft"}
            </button>
          </div>
        </div>

        {/* Governance banner */}
        <div className="flex items-start gap-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
          <Shield size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-gray-400 space-y-0.5">
            <p className="font-semibold text-gray-300">No automatic spend. No automatic publishing.</p>
            <p>The factory creates drafts and stages campaigns as PAUSED in Google Ads. Only the "Deploy to Google Ads" button below enables the campaign — and only after your explicit click.</p>
          </div>
        </div>

        {/* System readiness */}
        {preflight && (
          <div className="space-y-2">
            <p className="text-[11px] text-gray-600 font-semibold uppercase tracking-wider">System Readiness</p>
            <div className="flex flex-wrap gap-2">
              <ReadinessChip ok={preflight.tokenStatus.configured} label="Developer Token" />
              <ReadinessChip ok={preflight.accountConnected}       label={preflight.accountConnected ? `Ads Account (${preflight.customerId})` : "Ads Account"} />
              <ReadinessChip ok={preflight.canDeploy}              label={preflight.canDeploy ? "Live Deployment Mode" : "Simulation Mode"} />
              <ReadinessChip ok={!!convMap && convMap.conversionIdConfigured} label="Conversion Tracking" />
            </div>
            {!preflight.tokenStatus.configured && (
              <p className="text-[11px] text-amber-500">Token missing: {preflight.tokenStatus.note}</p>
            )}
            {!preflight.accountConnected && (
              <p className="text-[11px] text-amber-500">
                Ads account not connected.{" "}
                <a href="/admin/growth/ads/setup" className="underline hover:text-amber-300">Set up in Ads Setup →</a>
              </p>
            )}
          </div>
        )}

        {/* Workflow step indicator */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-3">
          <StepIndicator current={step} />
        </div>

        {/* Run result message */}
        {runMsg && (
          <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
            runMsg.type === "error" ? "bg-red-950/20 border-red-800/50 text-red-400"  :
            runMsg.type === "warn"  ? "bg-amber-950/20 border-amber-800/50 text-amber-400" :
                                     "bg-emerald-950/20 border-emerald-800/50 text-emerald-400"
          }`}>
            {runMsg.type === "ok" ? <CheckCircle size={16} className="flex-shrink-0 mt-0.5" /> :
             runMsg.type === "warn" ? <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" /> :
             <XCircle size={16} className="flex-shrink-0 mt-0.5" />}
            {runMsg.text}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            <div className="h-12 bg-gray-900 rounded-xl animate-pulse" />
            <div className="h-48 bg-gray-900 rounded-xl animate-pulse" />
          </div>
        )}

        {/* Empty state */}
        {!loading && !activePlan && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-16 text-center">
            <RotateCcw size={36} className="text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 text-sm font-medium">No campaign drafts yet</p>
            <p className="text-gray-600 text-xs mt-1.5 max-w-sm mx-auto">
              Click "Generate Draft" to run the full pipeline: keyword intelligence → ad copy factory → quality scoring → Google Ads staging.
            </p>
            <button
              onClick={runFactory}
              disabled={running}
              className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-500 transition-colors disabled:opacity-50 font-medium mx-auto"
            >
              {running ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
              Generate First Draft
            </button>
          </div>
        )}

        {/* Campaign plan detail */}
        {!loading && activePlan && (
          <div className="space-y-4">
            {/* Plan header */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="text-base font-bold text-white">{activePlan.campaignName}</h2>
                    <StatusChip status={activePlan.status} />
                    {activePlan.simulated && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-gray-700 text-gray-500">simulated</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Generated {new Date(activePlan.createdAt).toLocaleString("en-IN")} ·
                    {activePlan.adGroups.length} ad groups ·
                    {activePlan.adGroups.reduce((s, g) => s + g.keywords.length, 0)} keywords ·
                    {activePlan.adGroups.reduce((s, g) => s + (g.rsa.headlines?.length || 0), 0)} RSA headlines
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <p className={`text-2xl font-black ${activePlan.qualityScores.deploymentConfidence >= 65 ? "text-emerald-400" : "text-amber-400"}`}>
                      {activePlan.qualityScores.deploymentConfidence}
                    </p>
                    <p className="text-[10px] text-gray-600">confidence</p>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                    activePlan.qualityScores.recommendation === "recommended_for_deployment"
                      ? "bg-emerald-900/30 border-emerald-700 text-emerald-400"
                      : "bg-amber-900/30 border-amber-700 text-amber-400"
                  }`}>
                    {activePlan.qualityScores.recommendation === "recommended_for_deployment" ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                    {activePlan.qualityScores.recommendation === "recommended_for_deployment" ? "Recommended" : "Needs Review"}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    activeTab === key
                      ? "bg-brand-600/20 border border-brand-600/40 text-brand-300"
                      : "text-gray-500 border border-gray-800 hover:text-gray-300 hover:border-gray-700"
                  }`}
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div>
              {activeTab === "adgroups"    && <AdGroupsTab   plan={activePlan} />}
              {activeTab === "keywords"    && <KeywordsTab   plan={activePlan} />}
              {activeTab === "rsa"         && <RSATab        plan={activePlan} />}
              {activeTab === "conversions" && <ConversionsTab plan={activePlan} convMap={convMap} />}
              {activeTab === "quality"     && <QualityTab    plan={activePlan} />}
            </div>

            {/* Approval action bar (only when pending) */}
            {isPending && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Eye size={14} className="text-gray-400" />
                    <p className="text-sm font-semibold text-white">Founder Approval Required</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {activePlan.simulated
                      ? "This is a simulated draft. Approving will record the decision but make no real Google Ads changes."
                      : "The campaign exists in Google Ads as PAUSED. Approving will set it to ENABLED and it will begin serving within minutes."
                    }
                  </p>
                </div>

                <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowModify(!showModify)}
                      disabled={acting}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs text-blue-400 border border-blue-800 rounded-lg hover:bg-blue-950/30 transition-colors disabled:opacity-50"
                    >
                      <Edit3 size={12} />Request Modification
                    </button>
                    <button
                      onClick={() => act("reject")}
                      disabled={acting}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs text-red-400 border border-red-800 rounded-lg hover:bg-red-950/30 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={12} />Reject
                    </button>
                  </div>

                  <button
                    onClick={() => act("approve")}
                    disabled={acting}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-700 text-white text-sm rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 font-bold shadow-lg shadow-emerald-900/30"
                  >
                    {acting ? <RefreshCw size={14} className="animate-spin" /> : <Rocket size={14} />}
                    {activePlan.simulated ? "Approve (Simulated)" : "Deploy to Google Ads"}
                  </button>
                </div>

                {showModify && (
                  <div className="px-5 pb-4 pt-0 border-t border-gray-800 bg-blue-950/10">
                    <p className="text-xs text-gray-400 mb-2 mt-3">Describe what needs to change. Factory will regenerate on next run.</p>
                    <div className="flex gap-2">
                      <input
                        value={modifyReason}
                        onChange={e => setModifyReason(e.target.value)}
                        placeholder="e.g. Add more Exact match keywords for OEM theme, increase headline count"
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-blue-600"
                      />
                      <button
                        onClick={() => act("modify", modifyReason)}
                        disabled={acting || !modifyReason.trim()}
                        className="px-4 py-2 text-xs bg-blue-700 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 font-medium"
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Approved state */}
            {isApproved && (
              <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-5 flex items-center gap-3">
                <CheckCircle size={20} className="text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-300">
                    {activePlan.simulated ? "Approved (simulated)" : "Deployed to Google Ads"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {activePlan.simulated
                      ? "Simulated approval recorded. Connect a real account and re-run to deploy."
                      : "Campaign is ENABLED and will start serving. Monitor performance in Google Ads."}
                  </p>
                </div>
              </div>
            )}

            {/* History toggle */}
            {(preflight?.recentPlans?.length ?? 0) > 1 && (
              <div>
                <button
                  onClick={() => setHistoryOpen(!historyOpen)}
                  className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {historyOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {preflight!.recentPlans.length - 1} previous draft{preflight!.recentPlans.length > 2 ? "s" : ""}
                </button>
                {historyOpen && (
                  <div className="mt-2 bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
                    {preflight!.recentPlans.slice(1).map(p => (
                      <div key={p.planId} className="px-4 py-3 flex items-center justify-between text-xs">
                        <span className="text-gray-400 truncate">{p.campaignName}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusChip status={p.status} />
                          {p.simulated && <span className="text-gray-600">sim</span>}
                          <span className="text-gray-600">{new Date(p.createdAt).toLocaleDateString("en-IN")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
