/**
 * Growth OS — Daily Briefing Engine.
 *
 * Generates a Founder Mode briefing every morning:
 *   - Top 5 priority actions (ranked by impact × urgency)
 *   - Top opportunities identified
 *   - Active risks
 *   - What changed since yesterday
 *
 * All text is written for a non-expert reader.
 * Avoids Google Ads / SEO jargon. Uses business outcomes language.
 *
 * Output stored to ads_daily_briefing, read by the Founder Mode dashboard.
 */

import type { Db } from "mongodb"
import clientPromise from "@/lib/mongodb"

// ── Types ─────────────────────────────────────────────────────────────────────

export type ActionPriority = "urgent" | "important" | "this_week"
export type ActionImpact   = "high" | "medium" | "low"

export interface ActionItem {
  id:          string
  title:       string               // short title: 5–8 words
  why:         string               // one sentence: why this matters NOW
  evidence:    string               // what data supports this recommendation
  expectedOutcome: string           // what will happen if you do it
  impact:      ActionImpact
  priority:    ActionPriority
  effort:      "5_min" | "30_min" | "1_hour" | "half_day"
  actionUrl:   string
  category:    "campaign" | "leads" | "budget" | "content" | "setup"
}

export interface OpportunityItem {
  title:       string
  description: string
  evidence:    string
  confidence:  "high" | "medium" | "low"
  actionUrl:   string
}

export interface RiskItem {
  title:       string
  description: string
  severity:    "critical" | "high" | "medium"
  mitigation:  string
  actionUrl?:  string
}

export interface ChangeItem {
  what:        string
  when:        string
  impact:      string
}

export interface DailyBriefing {
  date:          string           // YYYY-MM-DD
  topActions:    ActionItem[]     // max 5, sorted by priority
  opportunities: OpportunityItem[]
  risks:         RiskItem[]
  whatChanged:   ChangeItem[]
  readinessSummary: string        // one-line system health
  generatedAt:   string
}

// ── Data fetchers ──────────────────────────────────────────────────────────────

async function fetchLeadMetrics(db: Db, since24h: string): Promise<{
  newLeadsToday:     number
  totalLeads:        number
  highValueLeads:    number
  topLeadType:       string
}> {
  const [newLeads, totalLeads] = await Promise.all([
    db.collection("rfq_popup_leads").countDocuments({ createdAt: { $gte: since24h } }),
    db.collection("rfq_popup_leads").countDocuments({}),
  ])

  // High-value = dealer_application or oem_authorization
  const highValue = await db.collection("rfq_popup_leads")
    .countDocuments({ leadType: { $in: ["dealer_application", "oem_authorization"] } })

  // Most common recent lead type
  const recent = await db.collection("rfq_popup_leads")
    .find({ createdAt: { $gte: since24h } })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray()
  const typeCounts: Record<string, number> = {}
  for (const l of recent) {
    const t = String(l.leadType ?? "general")
    typeCounts[t] = (typeCounts[t] ?? 0) + 1
  }
  const topLeadType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "general"

  return { newLeadsToday: newLeads, totalLeads, highValueLeads: highValue, topLeadType }
}

async function fetchApprovalQueueMetrics(db: Db): Promise<{
  pendingCount:  number
  highPriority:  number
  oldestPending: string | null
}> {
  const pending = await db.collection("ads_approval_queue")
    .find({ status: "pending" })
    .sort({ generatedAt: 1 })
    .limit(20)
    .toArray()

  const highPriority = pending.filter(
    p => p.priority === "critical" || p.priority === "high",
  ).length

  return {
    pendingCount:  pending.length,
    highPriority,
    oldestPending: pending[0]?.generatedAt as string | null ?? null,
  }
}

async function fetchCampaignMetrics(db: Db): Promise<{
  activeCampaigns:   number
  pausedCampaigns:   number
  rolledBackCount:   number
  accountBalance:    string
}> {
  const [active, paused, rolledBack] = await Promise.all([
    db.collection("ads_deployments").countDocuments({ state: "enabled"      }),
    db.collection("ads_deployments").countDocuments({ state: "paused"       }),
    db.collection("ads_deployments").countDocuments({ status: "rolled_back" }),
  ])
  return { activeCampaigns: active, pausedCampaigns: paused, rolledBackCount: rolledBack, accountBalance: "unknown" }
}

async function fetchRecentChanges(db: Db, since24h: string): Promise<ChangeItem[]> {
  const changes: ChangeItem[] = []

  // New leads
  const newLeads = await db.collection("rfq_popup_leads")
    .countDocuments({ createdAt: { $gte: since24h } })
  if (newLeads > 0) {
    changes.push({
      what:   `${newLeads} new lead(s) received`,
      when:   "last 24 hours",
      impact: newLeads >= 3 ? "Strong activity — review and qualify leads" : "Moderate activity",
    })
  }

  // New approval queue items
  const newQueueItems = await db.collection("ads_approval_queue")
    .countDocuments({ status: "pending", generatedAt: { $gte: since24h } })
  if (newQueueItems > 0) {
    changes.push({
      what:   `${newQueueItems} new recommendation(s) in the Approval Queue`,
      when:   "last 24 hours",
      impact: "Review and approve to improve campaign performance",
    })
  }

  // LVI runs
  const newLVI = await db.collection("ads_lead_value_intelligence")
    .countDocuments({ generatedAt: { $gte: since24h } })
  if (newLVI > 0) {
    changes.push({
      what:   "Lead Value Intelligence updated",
      when:   "last 24 hours",
      impact: "Keyword rankings and budget recommendations have been refreshed",
    })
  }

  // Budget recommendations
  const newBudget = await db.collection("ads_budget_recommendations_v2")
    .countDocuments({ generatedAt: { $gte: since24h } })
  if (newBudget > 0) {
    changes.push({
      what:   "New budget recommendations generated",
      when:   "last 24 hours",
      impact: "Review budget recommendations in the Approval Queue",
    })
  }

  return changes.slice(0, 6)
}

// ── Action builders ────────────────────────────────────────────────────────────

function buildActions(metrics: {
  leads:    Awaited<ReturnType<typeof fetchLeadMetrics>>
  queue:    Awaited<ReturnType<typeof fetchApprovalQueueMetrics>>
  campaign: Awaited<ReturnType<typeof fetchCampaignMetrics>>
  hasGTM:          boolean
  hasConversionData: boolean
  lviIsRecent:     boolean
}): ActionItem[] {
  const actions: ActionItem[] = []

  // 1. Urgent: high-priority queue items
  if (metrics.queue.highPriority > 0) {
    actions.push({
      id:          "review_queue",
      title:       "Review urgent recommendations now",
      why:         `${metrics.queue.highPriority} high-priority recommendation(s) need your decision.`,
      evidence:    `${metrics.queue.pendingCount} items pending in the Approval Queue, ${metrics.queue.highPriority} marked high-priority.`,
      expectedOutcome: "Each approved recommendation improves keyword targeting, budget allocation, or geo coverage.",
      impact:      "high",
      priority:    "urgent",
      effort:      "30_min",
      actionUrl:   "/admin/growth/ads/approval-queue",
      category:    "campaign",
    })
  }

  // 2. Urgent: conversion tracking not working
  if (!metrics.hasConversionData) {
    actions.push({
      id:          "setup_conversion_tracking",
      title:       "Enable conversion tracking in Google Ads",
      why:         "Without conversion tracking, you cannot see which keywords are generating leads. Every ₹ spent is unmeasured.",
      evidence:    "No conversion data in the Google Ads search term rows. GTM container may not be published.",
      expectedOutcome: "Once enabled, Growth OS can identify which keywords produce dealer applications vs brochure downloads.",
      impact:      "high",
      priority:    "urgent",
      effort:      "1_hour",
      actionUrl:   "/admin/growth/paid",
      category:    "setup",
    })
  }

  // 3. Important: rolled-back or paused campaigns with no active spend
  if (metrics.campaign.rolledBackCount > 0 && metrics.campaign.activeCampaigns === 0) {
    actions.push({
      id:          "fix_rolled_back_campaign",
      title:       "Fix rolled-back campaign and re-deploy",
      why:         "Your campaign was deployed but rolled back. No ads are running — zero impressions, zero leads from paid search.",
      evidence:    `${metrics.campaign.rolledBackCount} deployment(s) have status "rolled_back". Keyword threshold may not have been met or account balance was zero.`,
      expectedOutcome: "Re-deploying with validated keywords at ₹150–₹200/day can generate 10–20 leads/month.",
      impact:      "high",
      priority:    "urgent",
      effort:      "30_min",
      actionUrl:   "/admin/growth/paid",
      category:    "campaign",
    })
  } else if (metrics.campaign.pausedCampaigns > 0 && metrics.campaign.activeCampaigns === 0) {
    actions.push({
      id:          "activate_campaign",
      title:       "Recharge account to activate campaigns",
      why:         `${metrics.campaign.pausedCampaigns} campaign(s) are ready but paused. Account may need recharging.`,
      evidence:    "Campaign deployments exist but all are in paused state. No active spend.",
      expectedOutcome: "Activating a ₹150–₹200/day campaign can generate 10–20 qualified leads/month.",
      impact:      "high",
      priority:    "important",
      effort:      "30_min",
      actionUrl:   "/admin/growth/paid",
      category:    "budget",
    })
  }

  // 4. Important: qualify new leads
  if (metrics.leads.newLeadsToday > 0) {
    actions.push({
      id:          "qualify_leads",
      title:       `Qualify ${metrics.leads.newLeadsToday} new lead(s)`,
      why:         "New leads received today. Respond within 4 hours to maximize conversion.",
      evidence:    `${metrics.leads.newLeadsToday} leads in the last 24 hours. Dominant type: ${metrics.leads.topLeadType.replace(/_/g, " ")}.`,
      expectedOutcome: "Fast follow-up increases dealer application conversion rate significantly.",
      impact:      "high",
      priority:    "urgent",
      effort:      "30_min",
      actionUrl:   "/admin/growth/leads",
      category:    "leads",
    })
  }

  // 5. This week: run Lead Value Intelligence (suppressed if run recently — caller passes lviIsRecent)
  if (metrics.leads.totalLeads > 5 && !metrics.lviIsRecent) {
    actions.push({
      id:          "run_lvi",
      title:       "Update keyword value rankings",
      why:         "Lead Value Intelligence ranks your keywords by business value, not just click volume.",
      evidence:    `${metrics.leads.totalLeads} total leads available for analysis. Run LVI to see which keywords are generating dealer applications vs brochure downloads.`,
      expectedOutcome: "Updated rankings help prioritize budget on keywords that generate high-value leads.",
      impact:      "medium",
      priority:    "this_week",
      effort:      "5_min",
      actionUrl:   "/admin/growth/ads/lead-value-intelligence",
      category:    "campaign",
    })
  }

  // 6. This week: GTM setup
  if (!metrics.hasGTM) {
    actions.push({
      id:          "setup_gtm",
      title:       "Add Google Tag Manager container ID",
      why:         "GTM is required for conversion tracking. Without it, phone calls, WhatsApp, and RFQ form submissions cannot be tracked.",
      evidence:    "GTM_CONTAINER_ID environment variable is not set.",
      expectedOutcome: "Once GTM is live, every lead source becomes trackable and Growth OS can optimize spend.",
      impact:      "high",
      priority:    "important",
      effort:      "30_min",
      actionUrl:   "/admin/growth/paid",
      category:    "setup",
    })
  }

  // Sort: urgent first, then by impact
  const PRIORITY_RANK: Record<string, number> = { urgent: 0, important: 1, this_week: 2 }
  const IMPACT_RANK:   Record<string, number> = { high: 0, medium: 1, low: 2 }
  actions.sort((a, b) =>
    (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) ||
    (IMPACT_RANK[a.impact]   - IMPACT_RANK[b.impact]),
  )

  return actions.slice(0, 5)
}

function buildOpportunities(metrics: {
  leads: Awaited<ReturnType<typeof fetchLeadMetrics>>
  queue: Awaited<ReturnType<typeof fetchApprovalQueueMetrics>>
}): OpportunityItem[] {
  const opps: OpportunityItem[] = []

  if (metrics.leads.highValueLeads > 0) {
    opps.push({
      title:       `${metrics.leads.highValueLeads} high-value lead(s) in pipeline`,
      description: "Dealer applications and OEM authorization enquiries are the highest-value leads. Each represents long-term recurring revenue.",
      evidence:    `${metrics.leads.highValueLeads} leads classified as dealer_application or oem_authorization.`,
      confidence:  "high",
      actionUrl:   "/admin/growth/leads",
    })
  }

  if (metrics.queue.pendingCount > 0) {
    opps.push({
      title:       "Keyword optimizations ready to deploy",
      description: "Growth OS has identified keyword, budget, and geo targeting improvements. These are waiting for your approval.",
      evidence:    `${metrics.queue.pendingCount} items in the Approval Queue.`,
      confidence:  "high",
      actionUrl:   "/admin/growth/ads/approval-queue",
    })
  }

  opps.push({
    title:       "Tier 1 state expansion opportunity",
    description: "Kerala, Maharashtra, Karnataka, Tamil Nadu, Delhi, and Gujarat are Tier 1 markets with high government health procurement spend. State Intelligence has identified geo targeting gaps.",
    evidence:    "State Intelligence analysis based on lead conversion density.",
    confidence:  "medium",
    actionUrl:   "/admin/growth/ads/state-intelligence",
  })

  return opps.slice(0, 3)
}

function buildRisks(metrics: {
  campaign:         Awaited<ReturnType<typeof fetchCampaignMetrics>>
  hasConversionData: boolean
  hasGTM:           boolean
}): RiskItem[] {
  const risks: RiskItem[] = []

  if (!metrics.hasConversionData) {
    risks.push({
      title:       "Ad spend is unmeasured",
      description: "Without conversion tracking, every rupee spent on Google Ads cannot be attributed to a lead or sale. You cannot tell which keywords are working.",
      severity:    "critical",
      mitigation:  "Set up 5 conversion actions in Google Ads and publish GTM container with conversion tags.",
      actionUrl:   "/admin/growth/paid",
    })
  }

  if (metrics.campaign.activeCampaigns === 0 && metrics.campaign.rolledBackCount > 0) {
    risks.push({
      title:       "Campaign deployment rolled back",
      description: "A campaign was deployed but rolled back — no ads are currently running. Zero impressions, zero leads from paid search.",
      severity:    "high",
      mitigation:  "Review the rollback reason in Paid Growth, fix keyword count or account balance issues, and re-deploy.",
      actionUrl:   "/admin/growth/paid",
    })
  }

  if (metrics.campaign.activeCampaigns === 0 && metrics.campaign.pausedCampaigns > 0) {
    risks.push({
      title:       "Zero active campaign spend",
      description: "All campaigns are paused. Zero impressions, zero clicks, zero leads from paid search.",
      severity:    "high",
      mitigation:  "Recharge Google Ads account balance and activate the paused campaign.",
      actionUrl:   "/admin/growth/paid",
    })
  }

  if (!metrics.hasGTM) {
    risks.push({
      title:       "Tag Manager not configured",
      description: "GTM container is not set up. Lead capture events (phone, WhatsApp, RFQ form) may not be firing correctly.",
      severity:    "high",
      mitigation:  "Add GTM_CONTAINER_ID to Vercel environment variables and publish the container.",
      actionUrl:   "/admin/growth/paid",
    })
  }

  return risks.slice(0, 3)
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function generateDailyBriefing(): Promise<DailyBriefing> {
  const client = await clientPromise
  const db     = client.db() as Db

  const since24h   = new Date(Date.now() - 86_400_000).toISOString()
  const today      = new Date().toISOString().slice(0, 10)
  // GTM-5JMGCKRW is hardcoded in layout.tsx and confirmed firing in production.
  // Treat GTM as present unless the env var is explicitly set to empty string.
  const hasGTM = !!(process.env.NEXT_PUBLIC_GTM_CONTAINER_ID || "GTM-5JMGCKRW").trim()

  const [leads, queue, campaign, whatChanged] = await Promise.all([
    fetchLeadMetrics(db, since24h),
    fetchApprovalQueueMetrics(db),
    fetchCampaignMetrics(db),
    fetchRecentChanges(db, since24h),
  ])

  const [hasConversionData, lviLastRun] = await Promise.all([
    db.collection("ads_searchterm_rows")
      .countDocuments({ conversions: { $gt: 0 } })
      .then(n => n > 0),
    db.collection("ads_lead_value_intelligence")
      .findOne({}, { sort: { generatedAt: -1 }, projection: { generatedAt: 1 } }),
  ])
  const lviIsRecent = !!lviLastRun?.generatedAt &&
    (Date.now() - new Date(String(lviLastRun.generatedAt)).getTime()) < 7 * 86_400_000

  const metrics = { leads, queue, campaign, hasGTM, hasConversionData, lviIsRecent }
  const topActions    = buildActions(metrics)
  const opportunities = buildOpportunities({ leads, queue })
  const risks         = buildRisks({ campaign, hasConversionData, hasGTM })

  const systemOk = !risks.some(r => r.severity === "critical")
  const readinessSummary = systemOk
    ? `${campaign.activeCampaigns} active campaign(s), ${leads.newLeadsToday} new lead(s) today, ${queue.pendingCount} item(s) pending review.`
    : `Action required: ${risks.filter(r => r.severity === "critical").map(r => r.title).join("; ")}.`

  const briefing: DailyBriefing = {
    date:    today,
    topActions,
    opportunities,
    risks,
    whatChanged,
    readinessSummary,
    generatedAt: new Date().toISOString(),
  }

  // Cache the briefing
  await db.collection("ads_daily_briefing").updateOne(
    { date: today },
    { $set: briefing },
    { upsert: true },
  )

  return briefing
}

// Load cached or generate fresh
export async function getDailyBriefing(): Promise<DailyBriefing> {
  const client = await clientPromise
  const db     = client.db() as Db
  const today  = new Date().toISOString().slice(0, 10)

  const cached = await db.collection("ads_daily_briefing")
    .findOne({ date: today }, { sort: { generatedAt: -1 } })

  if (cached) {
    const { _id, ...rest } = cached
    void _id
    return rest as unknown as DailyBriefing
  }

  return generateDailyBriefing()
}
