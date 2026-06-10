/**
 * Growth OS — State Intelligence (Phase 3A).
 *
 * Reads the latest Lead Value Intelligence run and generates geo-level analysis:
 *   - Which states are producing high-value leads?
 *   - Where should budget increase / decrease / new campaign?
 *   - Which states are untapped?
 *
 * All recommendations are pushed to the Approval Queue — no auto-spend.
 *
 * High-value India states for industrial equipment (seeded from domain knowledge):
 *   Tier 1 — Kerala, Maharashtra, Karnataka, Tamil Nadu, Delhi, Gujarat
 *   Tier 2 — Uttar Pradesh, Rajasthan, West Bengal, Andhra Pradesh, Telangana
 *   Untapped — J&K, NE states, Himachal Pradesh, Uttarakhand
 *
 * Data flow:
 *   ads_lead_value_intelligence (latest run)
 *     → stateRanks[] (pre-aggregated)
 *     → StateConversionProfile[]
 *     → StateIntelligenceRun (saved to ads_state_intelligence)
 *     → Approval Queue items (ads_approval_queue)
 */

import type { Db } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { runLeadValueIntelligence } from "@/lib/growth-os/lead-value-intelligence"
import { pushToQueue, type RecommendationType } from "@/lib/growth-os/approval-queue"

// ── Collections ───────────────────────────────────────────────────────────────

const COLL_LVI    = "ads_lead_value_intelligence"
const COLL_SI     = "ads_state_intelligence"
const COLL_SEARCH = "ads_searchterm_rows"

// ── Domain knowledge: state classification ────────────────────────────────────

// States historically active for industrial fogging / pest control / government procurement
const STATE_TIERS: Record<string, "tier1" | "tier2" | "tier3"> = {
  // Tier 1: high government health spend + active pest control procurement
  "kerala":           "tier1",
  "maharashtra":      "tier1",
  "karnataka":        "tier1",
  "tamil nadu":       "tier1",
  "delhi":            "tier1",
  "gujarat":          "tier1",

  // Tier 2: large population, active but slower procurement cycle
  "uttar pradesh":    "tier2",
  "rajasthan":        "tier2",
  "west bengal":      "tier2",
  "andhra pradesh":   "tier2",
  "telangana":        "tier2",
  "haryana":          "tier2",
  "madhya pradesh":   "tier2",
  "bihar":            "tier2",
  "odisha":           "tier2",
  "assam":            "tier2",

  // Tier 3: lower opportunity or harder to reach
  "jharkhand":        "tier3",
  "chhattisgarh":     "tier3",
  "himachal pradesh": "tier3",
  "uttarakhand":      "tier3",
  "punjab":           "tier3",
  "goa":              "tier3",
}

function getStateTier(state: string): "tier1" | "tier2" | "tier3" {
  const normalized = state.toLowerCase().trim()
  return STATE_TIERS[normalized] ?? "tier3"
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type StateSignal =
  | "strong_performer"      // High lead value + high density
  | "emerging"              // Mid density but weighted score growing relative to tier
  | "high_potential"        // Tier 1 state with few leads — untapped opportunity
  | "low_performer"         // Leads present but low weighted score (brochure-heavy)
  | "no_data"               // No leads from this state in period

export interface StateConversionProfile {
  state:               string
  tier:                "tier1" | "tier2" | "tier3"
  totalLeads:          number
  totalWeightedScore:  number
  avgWeightedScore:    number
  densityLabel:        "high" | "medium" | "low"
  signal:              StateSignal
  leadMix:             Record<string, number>    // leadType → count
  topKeywords:         string[]
  topLandingPages:     string[]
  budgetSignal:        "increase" | "decrease" | "maintain" | "new_campaign" | "hold"
  rationale:           string
}

export interface StateIntelligenceRun {
  runId:            string
  periodDays:       number
  lviRunId:         string                       // source LVI run
  statesAnalyzed:   number
  profiles:         StateConversionProfile[]
  topState:         string
  untappedTier1:    string[]                     // Tier 1 states with zero leads
  recommendations:  StateRecommendation[]
  summary:          string
  generatedAt:      string
}

export interface StateRecommendation {
  state:          string
  tier:           "tier1" | "tier2" | "tier3"
  action:         "increase_budget" | "decrease_budget" | "new_campaign" | "pause" | "hold"
  weightedScore:  number
  totalLeads:     number
  rationale:      string
  expectedImpact: string
  queuedAt?:      string
}

// ── Signal classification ─────────────────────────────────────────────────────

function classifyStateSignal(
  profile: { tier: "tier1" | "tier2" | "tier3"; totalLeads: number; avgWeightedScore: number; densityLabel: "high" | "medium" | "low" },
): StateSignal {
  if (profile.totalLeads === 0) {
    return profile.tier === "tier1" ? "high_potential" : "no_data"
  }
  if (profile.densityLabel === "high" && profile.avgWeightedScore >= 80) return "strong_performer"
  if (profile.densityLabel === "high" && profile.avgWeightedScore >= 40) return "emerging"
  if (profile.tier === "tier1" && profile.totalLeads < 3)                return "high_potential"
  if (profile.avgWeightedScore < 20)                                     return "low_performer"
  return "emerging"
}

function classifyBudgetSignal(
  signal: StateSignal,
  tier: "tier1" | "tier2" | "tier3",
  totalLeads: number,
): StateConversionProfile["budgetSignal"] {
  switch (signal) {
    case "strong_performer": return "increase"
    case "emerging":         return tier === "tier1" ? "increase" : "maintain"
    case "high_potential":   return "new_campaign"
    case "low_performer":    return totalLeads >= 5 ? "decrease" : "hold"
    case "no_data":          return tier === "tier1" ? "new_campaign" : "hold"
    default:                 return "hold"
  }
}

// ── Build rationale strings ───────────────────────────────────────────────────

function buildRationale(profile: Omit<StateConversionProfile, "rationale" | "budgetSignal">): string {
  const leadSummary = Object.entries(profile.leadMix)
    .sort((a, b) => b[1] - a[1])
    .map(([t, c]) => `${c} ${t.replace(/_/g, " ")}`)
    .join(", ")

  switch (profile.signal) {
    case "strong_performer":
      return `${profile.state} is the top-performing state with ${profile.totalLeads} leads, avg weighted score ${profile.avgWeightedScore}. Lead mix: ${leadSummary}. High-density conversion zone — increase budget to capture more share.`
    case "emerging":
      return `${profile.state} shows ${profile.totalLeads} leads with avg score ${profile.avgWeightedScore}. ${getStateTier(profile.state) === "tier1" ? "Tier 1 state" : "Active state"} with moderate density — worth monitoring and increasing budget if trend continues.`
    case "high_potential":
      return `${profile.state} is a Tier 1 state (high government health spend) with only ${profile.totalLeads} leads. The low lead count is a targeting gap, not a demand signal — consider a geo-targeted campaign.`
    case "low_performer":
      return `${profile.state} has ${profile.totalLeads} leads but avg score is ${profile.avgWeightedScore} — mostly brochure downloads (low value). Decrease budget or shift to a different landing page.`
    case "no_data":
      return profile.tier === "tier1"
        ? `No leads from ${profile.state} despite being a Tier 1 market. This may indicate geo targeting is missing this state — consider a new campaign.`
        : `No data from ${profile.state}. Low priority expansion — tier 2/3 state with no current signal.`
  }
}

function buildExpectedImpact(action: StateRecommendation["action"], state: string, avgScore: number): string {
  switch (action) {
    case "increase_budget":
      return `Increasing budget in ${state} should produce more high-value leads. Avg lead quality score ${avgScore} — focus ad copy on dealer acquisition and OEM authorization.`
    case "new_campaign":
      return `New geo-targeted campaign for ${state} may unlock ${getStateTier(state) === "tier1" ? "10–20 leads/month" : "5–10 leads/month"} at current market conditions.`
    case "decrease_budget":
      return `Reducing budget in ${state} saves spend without meaningful conversion loss — leads are low-value (score ${avgScore}).`
    case "pause":
      return `Pause spend in ${state}. No conversion signal in the current period.`
    case "hold":
      return `Monitor ${state}. Insufficient data to recommend action.`
  }
}

// ── Fetch ad spend by state (best-effort from search term data) ───────────────

async function fetchStateSpendEstimates(db: Db): Promise<Map<string, number>> {
  // ads_searchterm_rows doesn't directly have state breakdowns from the API,
  // but campaign names often encode geo targets. Best-effort heuristic.
  const recent = await db.collection(COLL_SEARCH)
    .find({})
    .sort({ date: -1 })
    .limit(1000)
    .toArray()

  const byState = new Map<string, number>()
  for (const row of recent) {
    const campaign = String(row.campaign ?? "").toLowerCase()
    for (const state of Object.keys(STATE_TIERS)) {
      if (campaign.includes(state.replace(" ", "_")) || campaign.includes(state)) {
        const existing = byState.get(state) ?? 0
        byState.set(state, existing + (Number(row.costMicros ?? 0) / 1_000_000))
      }
    }
  }
  return byState
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function runStateIntelligence(
  opts: { periodDays?: number; enqueueRecommendations?: boolean } = {},
): Promise<StateIntelligenceRun> {
  const periodDays          = opts.periodDays ?? 90
  const enqueueRecommendations = opts.enqueueRecommendations ?? true

  const client = await clientPromise
  const db     = client.db() as Db

  // 1. Load the latest LVI run, or run a fresh one if none exists
  const latestLVI = await db.collection(COLL_LVI)
    .findOne({}, { sort: { generatedAt: -1 } })

  let lviRunId    = "fresh"
  let stateRanks: Array<{
    state: string
    totalLeads: number
    totalWeightedScore: number
    avgWeightedScore: number
    densityLabel: "high" | "medium" | "low"
    leadMix: Record<string, number>
    topKeywords: string[]
    topLandingPages: string[]
  }>

  if (latestLVI?.stateRanks?.length) {
    lviRunId   = String(latestLVI.runId ?? "unknown")
    stateRanks = latestLVI.stateRanks as typeof stateRanks
  } else {
    // No LVI run found — execute one now
    const freshRun = await runLeadValueIntelligence({ periodDays })
    lviRunId       = freshRun.runId
    stateRanks     = freshRun.stateRanks as typeof stateRanks
  }

  // 2. Build profiles for states that have leads
  const profiles: StateConversionProfile[] = []
  const seenStates = new Set<string>()

  for (const rank of stateRanks) {
    if (!rank.state || rank.state === "(unknown)") continue
    const normalized = rank.state.toLowerCase().trim()
    seenStates.add(normalized)
    const tier = getStateTier(rank.state)

    const partial = {
      state:              rank.state,
      tier,
      totalLeads:         rank.totalLeads,
      totalWeightedScore: rank.totalWeightedScore,
      avgWeightedScore:   rank.avgWeightedScore,
      densityLabel:       rank.densityLabel,
      leadMix:            rank.leadMix,
      topKeywords:        rank.topKeywords,
      topLandingPages:    rank.topLandingPages,
      signal:             "emerging" as StateSignal,
    }

    const signal      = classifyStateSignal(partial)
    const budgetSignal = classifyBudgetSignal(signal, tier, rank.totalLeads)
    const rationale   = buildRationale({ ...partial, signal })

    profiles.push({ ...partial, signal, budgetSignal, rationale })
  }

  // 3. Add Tier 1 states with no leads (untapped opportunities)
  const untappedTier1: string[] = []
  for (const [stateName, tier] of Object.entries(STATE_TIERS)) {
    if (tier !== "tier1") continue
    const normalized = stateName.toLowerCase().trim()
    if (seenStates.has(normalized)) continue

    // Capitalize properly
    const displayName = stateName
      .split(" ")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")

    untappedTier1.push(displayName)
    const partial = {
      state:              displayName,
      tier:               "tier1" as const,
      totalLeads:         0,
      totalWeightedScore: 0,
      avgWeightedScore:   0,
      densityLabel:       "low" as const,
      leadMix:            {},
      topKeywords:        [],
      topLandingPages:    [],
      signal:             "high_potential" as StateSignal,
    }

    profiles.push({
      ...partial,
      budgetSignal: "new_campaign",
      rationale:    buildRationale(partial),
    })
  }

  // 4. Build recommendation list (only actionable — not "hold")
  const recommendations: StateRecommendation[] = profiles
    .filter(p => p.budgetSignal !== "hold")
    .sort((a, b) => b.totalWeightedScore - a.totalWeightedScore)
    .map(p => {
      const action: StateRecommendation["action"] =
        p.budgetSignal === "increase"     ? "increase_budget"  :
        p.budgetSignal === "decrease"     ? "decrease_budget"  :
        p.budgetSignal === "new_campaign" ? "new_campaign"      :
        p.budgetSignal === "maintain"     ? "hold"              : "hold"

      return {
        state:          p.state,
        tier:           p.tier,
        action,
        weightedScore:  p.totalWeightedScore,
        totalLeads:     p.totalLeads,
        rationale:      p.rationale,
        expectedImpact: buildExpectedImpact(action, p.state, p.avgWeightedScore),
      }
    })

  // 5. Sort all profiles: strong performers first
  profiles.sort((a, b) => b.totalWeightedScore - a.totalWeightedScore)

  const topState = profiles[0]?.state ?? "(none)"
  const summary  = [
    `${profiles.length} states analyzed over ${periodDays} days.`,
    `Top state: ${topState} (weighted score ${profiles[0]?.totalWeightedScore ?? 0}).`,
    untappedTier1.length > 0
      ? `${untappedTier1.length} Tier 1 states with no leads: ${untappedTier1.join(", ")}.`
      : "All Tier 1 states have conversion data.",
    `${recommendations.filter(r => r.action === "increase_budget").length} increase / ${recommendations.filter(r => r.action === "new_campaign").length} new campaign recommendations queued.`,
  ].join(" ")

  // 6. Push actionable recommendations to Approval Queue
  const NOW = new Date().toISOString()
  if (enqueueRecommendations) {
    const queueable = recommendations.filter(
      r => r.action === "increase_budget" || r.action === "new_campaign",
    )
    for (const rec of queueable) {
      const recType: RecommendationType =
        rec.action === "increase_budget" ? "increase_budget" : "create_campaign"

      await pushToQueue(db, {
        type:            recType,
        priority:        rec.tier === "tier1" ? "high" : "medium",
        title:           `${rec.action === "new_campaign" ? "New Campaign" : "Increase Budget"} — ${rec.state}`,
        rationale:       rec.rationale,
        estimatedImpact: rec.expectedImpact,
        agentSource:     "state_intelligence",
        dataWindowDays:  periodDays,
        confidence:      rec.tier === "tier1" ? 75 : 55,
        payload:         {
          state:         rec.state,
          tier:          rec.tier,
          action:        rec.action,
          weightedScore: rec.weightedScore,
          totalLeads:    rec.totalLeads,
        },
      })
      rec.queuedAt = NOW
    }
  }

  const runId = `si_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const run: StateIntelligenceRun = {
    runId,
    periodDays,
    lviRunId,
    statesAnalyzed: profiles.length,
    profiles,
    topState,
    untappedTier1,
    recommendations,
    summary,
    generatedAt: NOW,
  }

  await db.collection(COLL_SI).insertOne({ ...run })

  return run
}
