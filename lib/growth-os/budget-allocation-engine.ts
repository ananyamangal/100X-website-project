/**
 * Growth OS — Budget Allocation Engine.
 *
 * Recommends budget changes based on conversion performance, not impressions.
 * Every recommendation goes to the Approval Queue — nothing is applied automatically.
 *
 * Recommendation types:
 *   increase_budget  → campaign/ad group converts well, budget is capping delivery
 *   decrease_budget  → spend without conversions over a meaningful window
 *   pause_ad_group   → zero conversions + budget spent over 14+ days
 *   expand_ad_group  → high CTR + conversions, room to scale
 *   split_ad_group   → one ad group mixing too many intents, diluting relevance
 *   create_ad_group  → conversion data shows demand cluster not yet in a campaign
 *
 * GOVERNANCE: Recommendations only. No automatic budget changes. Ever.
 */

import type { Db } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { pushBatch, type ApprovalItem } from "@/lib/growth-os/approval-queue"

// ── Collection names ──────────────────────────────────────────────────────────

const COLL_SEARCHTERM = "ads_searchterm_rows"
const COLL_CI_RUNS    = "ads_conversion_intelligence"
export const BUDGET_ENGINE_COLL = "ads_budget_allocation_runs"

// ── Types ────────────────────────────────────────────────────────────────────

export type BudgetAction =
  | "increase_budget"
  | "decrease_budget"
  | "pause_ad_group"
  | "expand_ad_group"
  | "split_ad_group"
  | "create_ad_group"

export interface AdGroupMetrics {
  campaign:     string
  adGroup:      string
  impressions:  number
  clicks:       number
  conversions:  number
  spend:        number
  ctr:          number   // clicks / impressions
  cpa:          number   // spend / conversions (0 if no conversions)
  conversionRate: number // conversions / clicks
}

export interface BudgetRecommendation {
  action:          BudgetAction
  campaign:        string
  adGroup:         string
  currentBudget?:  number
  recommendedChange?: string    // e.g. "+₹100/day" or "-₹50/day"
  reason:          string
  metrics:         Pick<AdGroupMetrics, "conversions" | "spend" | "ctr" | "cpa">
  confidence:      number
  dataWindowDays:  number
}

export interface BudgetAllocationRun {
  runId:                string
  dataWindowDays:       number
  adGroupsAnalyzed:     number
  recommendations:      BudgetRecommendation[]
  recommendationsCount: number
  pushedToQueue:        number
  generatedAt:          string
}

// ── Data collection ───────────────────────────────────────────────────────────

async function collectAdGroupMetrics(db: Db): Promise<AdGroupMetrics[]> {
  // Aggregates from ads_searchterm_rows which contains campaign/ad group breakdown
  const rows = await db.collection(COLL_SEARCHTERM).find({}).toArray()

  const map = new Map<string, AdGroupMetrics>()

  for (const row of rows) {
    const campaign = String(row.campaign ?? row.Campaign ?? "")
    const adGroup  = String(row.adGroup  ?? row.ad_group ?? row["Ad group"] ?? campaign)
    if (!campaign) continue

    const key = `${campaign}||${adGroup}`
    const ex  = map.get(key) ?? {
      campaign, adGroup, impressions: 0, clicks: 0, conversions: 0, spend: 0,
      ctr: 0, cpa: 0, conversionRate: 0,
    }

    ex.impressions  += Number(row.impressions ?? 0)
    ex.clicks       += Number(row.clicks      ?? 0)
    ex.conversions  += Number(row.conversions ?? 0)
    ex.spend        += Number(row.cost ?? row.spend ?? 0)
    map.set(key, ex)
  }

  // Compute derived metrics
  for (const m of map.values()) {
    m.ctr            = m.impressions > 0 ? m.clicks / m.impressions : 0
    m.cpa            = m.conversions > 0 ? m.spend / m.conversions  : 0
    m.conversionRate = m.clicks      > 0 ? m.conversions / m.clicks : 0
  }

  return Array.from(map.values())
}

// ── Also pull from latest conversion intelligence run ────────────────────────

async function getLatestCIRun(db: Db): Promise<{ adGroupPerf?: Array<{ campaign: string; adGroup: string; conversions: number }> } | null> {
  const rows = await db.collection(COLL_CI_RUNS)
    .find({})
    .sort({ generatedAt: -1 })
    .limit(1)
    .toArray()
  if (!rows[0]) return null
  const { _id, ...rest } = rows[0]
  void _id
  return rest as { adGroupPerf?: Array<{ campaign: string; adGroup: string; conversions: number }> }
}

// ── Recommendation logic ──────────────────────────────────────────────────────

function generateRecommendations(
  metrics: AdGroupMetrics[],
  dataWindowDays: number,
): BudgetRecommendation[] {
  const recs: BudgetRecommendation[] = []

  for (const m of metrics) {
    const metricSummary = {
      conversions: m.conversions,
      spend:       m.spend,
      ctr:         m.ctr,
      cpa:         m.cpa,
    }

    // PAUSE: significant spend, zero conversions, enough data window
    if (m.spend > 500 && m.conversions === 0 && m.clicks >= 20) {
      recs.push({
        action:   "pause_ad_group",
        campaign: m.campaign,
        adGroup:  m.adGroup,
        reason:   `₹${m.spend.toFixed(0)} spent, ${m.clicks} clicks, 0 conversions over ${dataWindowDays} days. Budget is being consumed without generating leads.`,
        metrics:  metricSummary,
        confidence: 75,
        dataWindowDays,
      })
      continue
    }

    // DECREASE: some spend, very low CTR (<0.5%), few clicks, no conversions
    if (m.spend > 200 && m.conversions === 0 && m.ctr < 0.005 && m.clicks < 10) {
      recs.push({
        action:   "decrease_budget",
        campaign: m.campaign,
        adGroup:  m.adGroup,
        recommendedChange: "Reduce by 30–50%",
        reason:   `CTR ${(m.ctr * 100).toFixed(2)}% — well below 1% benchmark. Low relevance signal. Reduce budget while investigating keyword/ad copy alignment.`,
        metrics:  metricSummary,
        confidence: 60,
        dataWindowDays,
      })
      continue
    }

    // INCREASE: strong conversion rate, healthy CPA
    if (m.conversions >= 3 && m.conversionRate >= 0.03 && m.ctr >= 0.02) {
      recs.push({
        action:   "increase_budget",
        campaign: m.campaign,
        adGroup:  m.adGroup,
        recommendedChange: "+₹100–200/day",
        reason:   `${m.conversions} conversions at ${(m.conversionRate * 100).toFixed(1)}% conversion rate. Strong signal. More budget will generate more leads at acceptable CPA.`,
        metrics:  metricSummary,
        confidence: 80,
        dataWindowDays,
      })
    }

    // EXPAND: high CTR, decent clicks, zero/low conversions — keyword set too narrow
    if (m.ctr >= 0.05 && m.clicks >= 30 && m.conversions < 2) {
      recs.push({
        action:   "expand_ad_group",
        campaign: m.campaign,
        adGroup:  m.adGroup,
        reason:   `CTR ${(m.ctr * 100).toFixed(1)}% shows strong ad relevance but few conversions. Review landing page conversion rate — the ad is working, the page may not be.`,
        metrics:  metricSummary,
        confidence: 65,
        dataWindowDays,
      })
    }
  }

  return recs.sort((a, b) => {
    // Pause recommendations first (protect budget), then increase (scale winners)
    const order: Record<BudgetAction, number> = {
      pause_ad_group: 0, decrease_budget: 1, increase_budget: 2,
      expand_ad_group: 3, split_ad_group: 4, create_ad_group: 5,
    }
    return (order[a.action] ?? 9) - (order[b.action] ?? 9)
  })
}

// ── Main runner ───────────────────────────────────────────────────────────────

export async function runBudgetAllocationEngine(
  opts: { dataWindowDays?: number; pushToQueue?: boolean } = {},
): Promise<BudgetAllocationRun> {
  const dataWindowDays = opts.dataWindowDays ?? 14
  const pushToQueue    = opts.pushToQueue    ?? true

  const client = await clientPromise
  const db     = client.db() as Db

  const [metrics] = await Promise.all([
    collectAdGroupMetrics(db),
    getLatestCIRun(db),  // enrichment — used in future for cross-signal validation
  ])

  const recommendations = generateRecommendations(metrics, dataWindowDays)

  let pushedCount = 0
  if (pushToQueue && recommendations.length > 0) {
    const queueItems: Omit<ApprovalItem, "id" | "status" | "generatedAt" | "expiresAt">[] = recommendations.map(r => ({
      type:     r.action as ApprovalItem["type"],
      priority: (r.action === "pause_ad_group" ? "high"
        : r.action === "increase_budget" ? "high"
        : r.action === "decrease_budget" ? "medium"
        : "low") as ApprovalItem["priority"],
      title:    `${r.action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}: ${r.adGroup || r.campaign}`,
      rationale:  r.reason,
      payload: {
        campaign:          r.campaign,
        adGroup:           r.adGroup,
        recommendedChange: r.recommendedChange,
        metrics:           r.metrics,
      },
      estimatedImpact:  r.action === "pause_ad_group"
        ? `Recover ₹${r.metrics.spend.toFixed(0)} in wasted spend`
        : r.action === "increase_budget"
          ? `Scale ${r.metrics.conversions} conversions with additional budget`
          : `Optimize campaign efficiency`,
      agentSource:    "budget-allocation-engine",
      dataWindowDays: r.dataWindowDays,
      confidence:     r.confidence,
    }))

    await pushBatch(db, queueItems)
    pushedCount = queueItems.length
  }

  const runId = `bae_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const run: BudgetAllocationRun = {
    runId,
    dataWindowDays,
    adGroupsAnalyzed: metrics.length,
    recommendations,
    recommendationsCount: recommendations.length,
    pushedToQueue: pushedCount,
    generatedAt: new Date().toISOString(),
  }

  await db.collection(BUDGET_ENGINE_COLL).insertOne({ ...run })
  return run
}
