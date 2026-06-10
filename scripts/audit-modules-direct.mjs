/**
 * Direct module audit — bypasses Next.js HTTP layer and auth.
 * Calls each User Success module directly with the live MongoDB connection.
 * This is exactly what the API routes call.
 */

// Patch module resolution to work with TypeScript path aliases
import { register } from "node:module"
import { pathToFileURL } from "node:url"

// We need to run through ts-node or transpile. Use a simpler approach:
// Call the MongoDB directly with the same logic as each module.

import { MongoClient } from "mongodb"
import os from "node:os"

const URI = "mongodb://ananyamangal20:CtzH9HMgZy3COE6k@ac-0w8luaw-shard-00-00.sq3cjz5.mongodb.net:27017,ac-0w8luaw-shard-00-01.sq3cjz5.mongodb.net:27017,ac-0w8luaw-shard-00-02.sq3cjz5.mongodb.net:27017/100xDB?authSource=admin&replicaSet=atlas-fmfsa5-shard-0&tls=true&retryWrites=true&w=majority&appName=100x-website-project"
const client = new MongoClient(URI)

// ── Simulate readiness checker ────────────────────────────────────────────────

async function simulateReadiness(db) {
  const now = Date.now()
  const since7d = new Date(now - 7 * 86_400_000).toISOString()

  // Google Ads
  const settings    = await db.collection("ads_settings").findOne({})
  const customerId  = settings?.customerId
  const deployments = await db.collection("ads_deployments").countDocuments({})

  // NOTE: env vars won't be set in this Node.js script — simulating Vercel state
  // From audit: GOOGLE_ADS_DEVELOPER_TOKEN is Vercel-only
  const hasToken = false  // local env only, Vercel has it

  let googleAdsStatus = "unknown"
  let googleAdsLabel  = ""
  let googleAdsScore  = 0
  if (!customerId)   { googleAdsStatus = "error";   googleAdsLabel = "No customer ID"; googleAdsScore = 5 }
  else if (deployments === 0) { googleAdsStatus = "warning"; googleAdsLabel = "No campaigns"; googleAdsScore = 12 }
  else                { googleAdsStatus = "ok";      googleAdsLabel = `${deployments} deployment(s)`; googleAdsScore = 15 }
  // Note: without token check (it's on Vercel), score is penalized

  // GSC — BUG: uses syncedAt but field is syncDate
  const gscTotalRows  = await db.collection("gsc_query_rows").countDocuments({})
  const gscRecentSyncedAt = await db.collection("gsc_query_rows").countDocuments({ syncedAt: { $gte: since7d } })
  // Correct check using actual field name
  const latestRow = await db.collection("gsc_query_rows").findOne({}, { sort: { endDate: -1 }, projection: { endDate: 1, syncDate: 1 } })

  let gscStatus = "unknown"; let gscLabel = ""; let gscScore = 0
  if (gscTotalRows === 0)     { gscStatus = "error";   gscLabel = "No GSC data";            gscScore = 0 }
  else if (gscRecentSyncedAt === 0) {
    // syncedAt check fails — there are rows but syncedAt field doesn't exist
    gscStatus = "warning"; gscLabel = `${gscTotalRows} rows (syncedAt field missing — may be current)`;  gscScore = 12
    // Note: this is the BUG — field should be syncDate
  }

  // GTM
  const gtmSet = !!(process.env.NEXT_PUBLIC_GTM_CONTAINER_ID || "").trim()
  const gtmStatus = gtmSet ? "ok" : "error"
  const gtmLabel  = gtmSet ? process.env.NEXT_PUBLIC_GTM_CONTAINER_ID : "NEXT_PUBLIC_GTM_CONTAINER_ID not set in LOCAL env (may be set on Vercel)"
  const gtmScore  = gtmSet ? 20 : 0

  // Conversion tracking
  const stWithConv = await db.collection("ads_searchterm_rows").countDocuments({ conversions: { $gt: 0 } })
  const stTotal    = await db.collection("ads_searchterm_rows").countDocuments({})
  let convStatus = "unknown"; let convLabel = ""; let convScore = 0
  if (stTotal === 0)       { convStatus = "error";   convLabel = "No search term data imported";   convScore = 0 }
  else if (stWithConv === 0) { convStatus = "warning"; convLabel = "0 conversions tracked";         convScore = 8 }
  else                     { convStatus = "ok";      convLabel = `${stWithConv} converting queries`; convScore = 20 }

  // Campaign activation
  const pending     = await db.collection("ads_approval_queue").countDocuments({ status: "pending" })
  const kwLatest    = await db.collection("ads_keyword_intelligence").findOne({}, { sort: { generatedAt: -1 }, projection: { meetsSuccessCriterion: 1, totalCount: 1, generatedAt: 1 } })
  const paused      = await db.collection("ads_deployments").countDocuments({ state: "paused", status: { $in: ["pending","approved"] } })
  let campStatus = "unknown"; let campLabel = ""; let campScore = 0

  if (pending > 0)  { campStatus = "warning"; campLabel = `${pending} pending approvals`; campScore = 12 }
  else if (paused > 0) { campStatus = "warning"; campLabel = `${paused} paused campaigns`; campScore = 15 }
  else if (!kwLatest?.meetsSuccessCriterion) { campStatus = "error"; campLabel = "No viable campaign ready"; campScore = 2 }
  else               { campStatus = "ok"; campLabel = "Campaign-ready"; campScore = 20 }

  const total = googleAdsScore + gscScore + gtmScore + convScore + campScore

  return {
    score:   total,
    overall: total >= 80 ? "ready" : total >= 40 ? "partial" : "not_ready",
    systems: {
      googleAds:          { status: googleAdsStatus, label: googleAdsLabel, score: googleAdsScore, note: "Token is Vercel-only; local shows NOT SET but Vercel has it" },
      gsc:                { status: gscStatus, label: gscLabel, score: gscScore, BUG: "syncedAt field doesn't exist — actual field is syncDate. Score will be wrong." },
      gtm:                { status: gtmStatus, label: gtmLabel, score: gtmScore, note: "NOT SET locally; check if set on Vercel" },
      conversionTracking: { status: convStatus, label: convLabel, score: convScore },
      campaignActivation: { status: campStatus, label: campLabel, score: campScore, kwMeets: kwLatest?.meetsSuccessCriterion, kwCount: kwLatest?.totalCount, kwDate: kwLatest?.generatedAt },
    },
    debug: { latestGscRow: latestRow },
  }
}

// ── Simulate daily briefing ───────────────────────────────────────────────────

async function simulateDailyBriefing(db) {
  const since24h = new Date(Date.now() - 86_400_000).toISOString()
  const since7d  = new Date(Date.now() - 7 * 86_400_000).toISOString()

  const rfqTotal  = await db.collection("rfq_popup_leads").countDocuments({})
  const rfq24h    = await db.collection("rfq_popup_leads").countDocuments({ createdAt: { $gte: since24h } })
  const highValue = await db.collection("rfq_popup_leads").countDocuments({ leadType: { $in: ["dealer_application","oem_authorization"] } })
  const qPending  = await db.collection("ads_approval_queue").countDocuments({ status: "pending" })
  const qHigh     = await db.collection("ads_approval_queue").countDocuments({ status: "pending", priority: { $in: ["critical","high"] } })
  const campActive  = await db.collection("ads_deployments").countDocuments({ state: "enabled" })
  const campPaused  = await db.collection("ads_deployments").countDocuments({ state: "paused" })
  const hasConvData = await db.collection("ads_searchterm_rows").countDocuments({ conversions: { $gt: 0 } }).then(n => n > 0)
  const hasGTM      = !!(process.env.NEXT_PUBLIC_GTM_CONTAINER_ID || "").trim()

  const recent3 = await db.collection("rfq_popup_leads").find({}).sort({ createdAt: -1 }).limit(3).toArray()
  const typeCounts = {}
  for (const l of recent3) {
    const t = l.leadType ?? "general"
    typeCounts[t] = (typeCounts[t] ?? 0) + 1
  }
  const topLeadType = Object.entries(typeCounts).sort((a,b) => b[1]-a[1])[0]?.[0] ?? "general"

  // Determine what actions WOULD be generated
  const actions = []

  if (qHigh > 0) actions.push({ id: "review_queue", title: "Review urgent recommendations", priority: "urgent", impact: "high", why: `${qHigh} high-priority items in queue`, dataSource: "ads_approval_queue" })
  if (!hasConvData) actions.push({ id: "setup_conversion_tracking", title: "Enable conversion tracking in Google Ads", priority: "urgent", impact: "high", why: "0 conversions tracked — spend is unmeasured", dataSource: "ads_searchterm_rows (0 rows with conversions > 0)" })
  if (campPaused > 0 && campActive === 0) actions.push({ id: "activate_campaign", title: "Recharge account to activate campaigns", priority: "important", impact: "high", why: `${campPaused} campaigns paused, 0 active`, dataSource: "ads_deployments" })
  if (rfq24h > 0) actions.push({ id: "qualify_leads", title: `Qualify ${rfq24h} new leads`, priority: "urgent", impact: "high", why: `${rfq24h} leads in last 24h`, dataSource: "rfq_popup_leads" })
  if (rfqTotal > 5) actions.push({ id: "run_lvi", title: "Update keyword value rankings", priority: "this_week", impact: "medium", why: `${rfqTotal} leads available for analysis`, dataSource: "rfq_popup_leads" })
  if (!hasGTM) actions.push({ id: "setup_gtm", title: "Add Google Tag Manager container ID", priority: "important", impact: "high", why: "GTM not configured", dataSource: "NEXT_PUBLIC_GTM_CONTAINER_ID env var" })

  const risks = []
  if (!hasConvData) risks.push({ title: "Ad spend is unmeasured", severity: "critical", source: "0 rows in ads_searchterm_rows with conversions>0" })
  if (campActive === 0 && campPaused > 0) risks.push({ title: "Zero active campaign spend", severity: "high", source: "ads_deployments: 0 enabled, >0 paused" })
  if (!hasGTM) risks.push({ title: "Tag Manager not configured", severity: "high", source: "NEXT_PUBLIC_GTM_CONTAINER_ID not set" })

  // Note on campaign paused — actual deployment is "rolled_back" state not "paused"
  const actualDeployment = await db.collection("ads_deployments").findOne({}, { sort: { createdAt: -1 }, projection: { state: 1, status: 1 } })
  const campActualState = actualDeployment ? `${actualDeployment.state}/${actualDeployment.status}` : "none"

  return {
    metrics: { rfqTotal, rfq24h, highValue, qPending, qHigh, campActive, campPaused, hasConvData, hasGTM, topLeadType },
    wouldGenerate: {
      actionsCount: actions.length,
      actions: actions.slice(0, 5),
      risks,
      opportunities: [
        highValue > 0 ? `${highValue} high-value leads in pipeline` : null,
        qPending > 0  ? `${qPending} recommendations in approval queue` : null,
        "Tier 1 state expansion opportunity",
      ].filter(Boolean),
    },
    dataQualityIssues: [
      `All 14 RFQ leads have leadType="general" — dealer-lead agent has NOT classified them`,
      `No utmTerm on any RFQ lead — UTM stored under lead.utm (nested), not lead.utmTerm (flat)`,
      "LVI extractKeyword() checks lead.utmTerm but actual field path is lead.utm.term — all keywords will be '(direct/unknown)'",
      `Campaign deployment state is "${campActualState}" — not "paused". readiness checker won't see it as paused campaign.`,
    ],
  }
}

// ── Simulate page guidance ────────────────────────────────────────────────────

async function simulatePageGuidance(db) {
  const pages = ["approval-queue", "keyword-intelligence", "lead-value-intelligence", "state-intelligence", "paid", "dashboard"]
  const results = {}

  const kwLatest  = await db.collection("ads_keyword_intelligence").findOne({}, { sort: { generatedAt: -1 }, projection: { totalCount: 1, meetsSuccessCriterion: 1, generatedAt: 1, validatorRejectionCount: 1 } })
  const pending   = await db.collection("ads_approval_queue").countDocuments({ status: "pending" })
  const lviLatest = await db.collection("ads_lead_value_intelligence").findOne({}, { sort: { generatedAt: -1 }, projection: { totalLeads: 1, generatedAt: 1 } })
  const siLatest  = await db.collection("ads_state_intelligence").findOne({}, { sort: { generatedAt: -1 }, projection: { statesAnalyzed: 1, generatedAt: 1 } })
  const settings  = await db.collection("ads_settings").findOne({}, { projection: { customerId: 1 } })
  const deps      = await db.collection("ads_deployments").countDocuments({})
  const opps      = await db.collection("growth_opportunities").countDocuments({ status: "pending" })
  const leads     = await db.collection("rfq_popup_leads").countDocuments({})
  const dealers   = await db.collection("rfq_popup_leads").countDocuments({ leadType: { $in: ["dealer_application","oem_authorization"] } })

  results["approval-queue"] = {
    primaryAction: pending > 0 ? `Review ${pending} pending items` : "Queue is empty",
    readinessScore: pending > 0 ? 60 : 100,
    dataSource: "ads_approval_queue",
    isLive: true,
  }

  const kwRunAge = kwLatest ? Math.floor((Date.now() - new Date(kwLatest.generatedAt).getTime()) / 3_600_000) : 999
  results["keyword-intelligence"] = {
    primaryAction: kwLatest ? "Refresh keyword intelligence" : "Run keyword intelligence",
    readinessScore: !kwLatest ? 0 : kwRunAge > 48 ? 40 : kwLatest.meetsSuccessCriterion ? 90 : 60,
    readinessLabel: !kwLatest ? "No run yet" : `${kwLatest.totalCount} keywords (${kwRunAge}h ago)`,
    validatorRejections: kwLatest?.validatorRejectionCount ?? 0,
    meetsSuccessCriterion: kwLatest?.meetsSuccessCriterion,
    dataSource: "ads_keyword_intelligence",
    isLive: true,
  }

  results["lead-value-intelligence"] = {
    primaryAction: "Run Lead Value Intelligence",
    readinessScore: !lviLatest ? 0 : 80,
    readinessLabel: !lviLatest ? "No run yet" : `${lviLatest.totalLeads} leads scored`,
    dataSource: "ads_lead_value_intelligence",
    isLive: true,
    ISSUE: "LVI never run — readinessScore will be 0, primary action will be Run (not Refresh)",
  }

  results["state-intelligence"] = {
    primaryAction: siLatest ? "Refresh state analysis" : "Run state analysis",
    readinessScore: !siLatest ? 0 : 85,
    dataSource: "ads_state_intelligence",
    isLive: true,
    ISSUE: "SI never run — readinessScore will be 0",
  }

  results["paid"] = {
    primaryAction: !settings?.customerId ? "Configure Google Ads API" : deps === 0 ? "Run Campaign Factory V2" : `Review ${pending} pending items`,
    readinessScore: !settings?.customerId ? 10 : deps === 0 ? 50 : 85,
    dataSource: "ads_settings + ads_deployments + ads_approval_queue",
    isLive: true,
  }

  results["dashboard"] = {
    primaryAction: pending > 0 ? `Review ${pending} queued recommendations` : "Run Lead Value Intelligence",
    dataSource: "rfq_popup_leads + growth_opportunities + ads_approval_queue",
    isLive: true,
    stats: { leads, dealers, opps, pending },
  }

  return results
}

async function main() {
  await client.connect()
  const db = client.db()

  console.log("=".repeat(70))
  console.log("FOUNDER MODE READINESS AUDIT — MODULE SIMULATION")
  console.log("=".repeat(70))

  console.log("\n[A] READINESS CHECKER SIMULATION")
  const readiness = await simulateReadiness(db)
  console.log(`  Overall: ${readiness.overall}  Score: ${readiness.score}/100`)
  for (const [key, sys] of Object.entries(readiness.systems)) {
    console.log(`  ${key.padEnd(22)} [${sys.status.padEnd(7)}] score=${sys.score}/20  "${sys.label}"`)
    if (sys.BUG)  console.log(`    ⚠️  BUG: ${sys.BUG}`)
    if (sys.note) console.log(`    ℹ️  ${sys.note}`)
    if (sys.kwMeets !== undefined) console.log(`    meetsSuccessCriterion=${sys.kwMeets}, totalCount=${sys.kwCount}, generatedAt=${sys.kwDate}`)
  }
  console.log("  Debug gscRow:", JSON.stringify(readiness.debug.latestGscRow))

  console.log("\n[B] DAILY BRIEFING SIMULATION")
  const briefing = await simulateDailyBriefing(db)
  console.log("  Metrics:", JSON.stringify(briefing.metrics, null, 4))
  console.log("  Actions that would be generated:")
  briefing.wouldGenerate.actions.forEach((a, i) => console.log(`    ${i+1}. [${a.priority}/${a.impact}] ${a.title} — source: ${a.dataSource}`))
  console.log("  Risks:", briefing.wouldGenerate.risks.map(r => `[${r.severity}] ${r.title}`).join(", ") || "none")
  console.log("  Opportunities:", briefing.wouldGenerate.opportunities.join(", "))
  console.log("\n  DATA QUALITY ISSUES:")
  briefing.dataQualityIssues.forEach(i => console.log(`    ⚠️  ${i}`))

  console.log("\n[C] PAGE GUIDANCE SIMULATION")
  const guidance = await simulatePageGuidance(db)
  for (const [page, g] of Object.entries(guidance)) {
    console.log(`\n  [${page}]`)
    console.log(`    primaryAction:   "${g.primaryAction}"`)
    if (g.readinessScore !== undefined) console.log(`    readinessScore:  ${g.readinessScore}/100`)
    if (g.readinessLabel) console.log(`    readinessLabel:  "${g.readinessLabel}"`)
    if (g.dataSource)     console.log(`    dataSource:      ${g.dataSource}`)
    if (g.ISSUE)          console.log(`    ⚠️  ISSUE: ${g.ISSUE}`)
    if (g.stats)          console.log(`    stats:           ${JSON.stringify(g.stats)}`)
  }

  console.log("\n[D] PRODUCTION BLOCKERS")
  const blockers = [
    { blocker: "First live campaign", issues: [
      "1 campaign deployment exists but state=draft/status=rolled_back — was previously rolled back",
      "meetsSuccessCriterion=false (48 eligible keywords) — more keywords needed",
      "Account balance needs recharging before enabling",
      "CPC bids set to ₹15 default — may need adjustment after account active",
    ]},
    { blocker: "Conversion tracking", issues: [
      "NEXT_PUBLIC_GTM_CONTAINER_ID not set in local env — check Vercel",
      "No conversion actions created in Google Ads",
      "GTM container not published with conversion tags",
      "0 search term rows with conversions — no data will flow",
    ]},
    { blocker: "Budget optimization", issues: [
      "LVI never run — no keyword value data",
      "State Intelligence never run — no geo data",
      "Budget Recommendation V2 never run — no recommendations generated",
      "No approval queue items — intelligence engines need to run first",
    ]},
    { blocker: "State intelligence", issues: [
      "Depends on LVI run first — LVI must be triggered before SI",
      "RFQ leads have no state data (answers object contains Name/Phone/Email/Requirement — no state field)",
      "Brochure leads have state data (Nagaland, Rajasthan) — small sample",
    ]},
  ]

  blockers.forEach(b => {
    console.log(`\n  [${b.blocker.toUpperCase()}]`)
    b.issues.forEach(i => console.log(`    - ${i}`))
  })

  console.log("\n[E] BUGS TO FIX BEFORE LAUNCH")
  const bugs = [
    "BUG-1: readiness-checker.ts uses syncedAt field but GSC rows have syncDate field. GSC check always returns 0 recent rows.",
    "BUG-2: lead-value-intelligence.ts uses lead.utmTerm but actual RFQ structure is lead.utm.term (nested object). All 14 leads get keyword='(direct/unknown)'.",
    "BUG-3: readiness-checker.ts checks state:'paused' for paused campaigns but actual deployment is state:'draft'/status:'rolled_back'. Paused campaign check shows 0.",
    "BUG-4: daily-briefing activate_campaign action fires when campPaused>0, but actual paused count is 0 (the deployment is state='draft'). Action is inaccurate.",
  ]
  bugs.forEach(b => console.log(`  ⚠️  ${b}`))

  console.log("\n" + "=".repeat(70))
  console.log("VERDICT: DO NOT DEPLOY FOUNDER MODE until bugs BUG-1 and BUG-2 are fixed.")
  console.log("=".repeat(70))

  await client.close()
}

main().catch(e => { console.error(e); process.exit(1) })
