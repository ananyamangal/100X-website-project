/**
 * Live collection audit — checks what data actually exists in MongoDB
 * for all collections that the User Success Layer reads from.
 */
import { MongoClient } from "mongodb"

const URI = "mongodb://ananyamangal20:CtzH9HMgZy3COE6k@ac-0w8luaw-shard-00-00.sq3cjz5.mongodb.net:27017,ac-0w8luaw-shard-00-01.sq3cjz5.mongodb.net:27017,ac-0w8luaw-shard-00-02.sq3cjz5.mongodb.net:27017/100xDB?authSource=admin&replicaSet=atlas-fmfsa5-shard-0&tls=true&retryWrites=true&w=majority&appName=100x-website-project"

const client = new MongoClient(URI)

async function run() {
  await client.connect()
  const db = client.db()
  const now = new Date()
  const since24h  = new Date(now - 86_400_000).toISOString()
  const since7d   = new Date(now - 7 * 86_400_000).toISOString()
  const since90d  = new Date(now - 90 * 86_400_000).toISOString()

  console.log("=".repeat(60))
  console.log("FOUNDER MODE READINESS AUDIT — LIVE DATA")
  console.log(new Date().toISOString())
  console.log("=".repeat(60))

  // ── LEADS ────────────────────────────────────────────────────────────────

  const rfqTotal  = await db.collection("rfq_popup_leads").countDocuments({})
  const rfq24h    = await db.collection("rfq_popup_leads").countDocuments({ createdAt: { $gte: since24h } })
  const rfq90d    = await db.collection("rfq_popup_leads").countDocuments({ createdAt: { $gte: since90d } })
  const highValue = await db.collection("rfq_popup_leads").countDocuments({ leadType: { $in: ["dealer_application","oem_authorization"] } })
  const recentRFQ = await db.collection("rfq_popup_leads").find({}).sort({ createdAt: -1 }).limit(3).toArray()

  console.log("\n[1] RFQ POPUP LEADS")
  console.log(`  Total:      ${rfqTotal}`)
  console.log(`  Last 24h:   ${rfq24h}`)
  console.log(`  Last 90d:   ${rfq90d}`)
  console.log(`  High-value: ${highValue} (dealer_application | oem_authorization)`)
  if (recentRFQ.length) {
    console.log("  Most recent:")
    recentRFQ.forEach(l => console.log(`    - ${l.createdAt ?? "(no date)"} | type=${l.leadType ?? "(none)"} | utmTerm=${l.utmTerm ?? "(none)"} | state=${l.state ?? l.answers?.state ?? "(unknown)"}`))
  }

  const brochureTotal = await db.collection("brochure_leads").countDocuments({})
  const brochure24h   = await db.collection("brochure_leads").countDocuments({ createdAt: { $gte: since24h } })
  const recentBro     = await db.collection("brochure_leads").find({}).sort({ createdAt: -1 }).limit(2).toArray()
  console.log("\n[2] BROCHURE LEADS")
  console.log(`  Total: ${brochureTotal}  |  Last 24h: ${brochure24h}`)
  recentBro.forEach(l => console.log(`    - ${l.createdAt ?? "(no date)"} | product=${l.productName ?? "(none)"} | state=${l.state ?? "(unknown)"}`))

  const gemTotal = await db.collection("gem_inquiries").countDocuments({})
  const gem24h   = await db.collection("gem_inquiries").countDocuments({ createdAt: { $gte: since24h } })
  console.log("\n[3] GEM INQUIRIES")
  console.log(`  Total: ${gemTotal}  |  Last 24h: ${gem24h}`)

  // ── APPROVAL QUEUE ────────────────────────────────────────────────────────

  const queuePending  = await db.collection("ads_approval_queue").countDocuments({ status: "pending" })
  const queueCritical = await db.collection("ads_approval_queue").countDocuments({ status: "pending", priority: "critical" })
  const queueHigh     = await db.collection("ads_approval_queue").countDocuments({ status: "pending", priority: "high" })
  const queueApproved = await db.collection("ads_approval_queue").countDocuments({ status: "approved" })
  const queueSample   = await db.collection("ads_approval_queue").find({ status: "pending" }).sort({ generatedAt: -1 }).limit(3).toArray()

  console.log("\n[4] APPROVAL QUEUE")
  console.log(`  Pending:  ${queuePending}  (critical: ${queueCritical}, high: ${queueHigh})`)
  console.log(`  Approved: ${queueApproved}`)
  queueSample.forEach(q => console.log(`    - [${q.priority}] ${q.type}: ${q.title}`))

  // ── CAMPAIGNS ────────────────────────────────────────────────────────────

  const campActive = await db.collection("ads_deployments").countDocuments({ state: "enabled" })
  const campPaused = await db.collection("ads_deployments").countDocuments({ state: "paused" })
  const campTotal  = await db.collection("ads_deployments").countDocuments({})
  const settings   = await db.collection("ads_settings").findOne({})

  console.log("\n[5] ADS DEPLOYMENTS")
  console.log(`  Total: ${campTotal}  |  Active: ${campActive}  |  Paused: ${campPaused}`)
  console.log(`  AdsSettings: customerId=${settings?.customerId ?? "(not set)"}`)

  // ── SEARCH TERMS ─────────────────────────────────────────────────────────

  const stRows       = await db.collection("ads_searchterm_rows").countDocuments({})
  const stWithConv   = await db.collection("ads_searchterm_rows").countDocuments({ conversions: { $gt: 0 } })
  const stRecent7d   = await db.collection("ads_searchterm_rows").countDocuments({ date: { $gte: since7d.slice(0,10) } })

  console.log("\n[6] ADS SEARCH TERM ROWS")
  console.log(`  Total rows:         ${stRows}`)
  console.log(`  With conversions:   ${stWithConv}`)
  console.log(`  Last 7d:            ${stRecent7d}`)

  // ── GSC DATA ─────────────────────────────────────────────────────────────

  const gscTotal  = await db.collection("gsc_query_rows").countDocuments({})
  const gscRecent = await db.collection("gsc_query_rows").countDocuments({ syncedAt: { $gte: since7d } })
  const gscSample = await db.collection("gsc_query_rows").findOne({}, { sort: { impressions: -1 } })

  console.log("\n[7] GSC QUERY ROWS")
  console.log(`  Total: ${gscTotal}  |  Last 7d: ${gscRecent}`)
  if (gscSample) console.log(`  Top query: "${gscSample.query}" (${gscSample.impressions} impressions)`)

  // ── LVI RUNS ─────────────────────────────────────────────────────────────

  const lviCount  = await db.collection("ads_lead_value_intelligence").countDocuments({})
  const lviLatest = await db.collection("ads_lead_value_intelligence").findOne({}, { sort: { generatedAt: -1 } })

  console.log("\n[8] LEAD VALUE INTELLIGENCE RUNS")
  console.log(`  Total runs: ${lviCount}`)
  if (lviLatest) {
    console.log(`  Latest:     ${lviLatest.generatedAt}`)
    console.log(`  totalLeads: ${lviLatest.totalLeads}  |  totalWeightedScore: ${lviLatest.totalWeightedScore}`)
    console.log(`  keywordRanks: ${(lviLatest.keywordRanks ?? []).length} items`)
    console.log(`  stateRanks:   ${(lviLatest.stateRanks ?? []).length} items`)
  }

  // ── STATE INTELLIGENCE ────────────────────────────────────────────────────

  const siCount  = await db.collection("ads_state_intelligence").countDocuments({})
  const siLatest = await db.collection("ads_state_intelligence").findOne({}, { sort: { generatedAt: -1 } })

  console.log("\n[9] STATE INTELLIGENCE RUNS")
  console.log(`  Total runs: ${siCount}`)
  if (siLatest) {
    console.log(`  Latest:     ${siLatest.generatedAt}`)
    console.log(`  states:     ${siLatest.statesAnalyzed}  |  topState: ${siLatest.topState}`)
  }

  // ── BUDGET RECOMMENDATIONS ────────────────────────────────────────────────

  const brCount  = await db.collection("ads_budget_recommendations_v2").countDocuments({})
  console.log("\n[10] BUDGET RECOMMENDATION V2 RUNS")
  console.log(`  Total runs: ${brCount}`)

  // ── DAILY BRIEFINGS ───────────────────────────────────────────────────────

  const dbCount  = await db.collection("ads_daily_briefing").countDocuments({})
  const dbLatest = await db.collection("ads_daily_briefing").findOne({}, { sort: { generatedAt: -1 } })

  console.log("\n[11] DAILY BRIEFINGS")
  console.log(`  Total: ${dbCount}`)
  if (dbLatest) {
    console.log(`  Latest date:    ${dbLatest.date}`)
    console.log(`  Actions:        ${(dbLatest.topActions ?? []).length}`)
    console.log(`  Risks:          ${(dbLatest.risks ?? []).length}`)
    console.log(`  Opportunities:  ${(dbLatest.opportunities ?? []).length}`)
    console.log(`  WhatChanged:    ${(dbLatest.whatChanged ?? []).length}`)
  }

  // ── ENV VARS (non-secret checks) ─────────────────────────────────────────

  console.log("\n[12] ENVIRONMENT VARIABLES (non-secret)")
  const GTM = process.env.NEXT_PUBLIC_GTM_CONTAINER_ID
  const ADS = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const GSC_ID  = process.env.GOOGLE_OAUTH_CLIENT_ID
  const GSC_SEC = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  console.log(`  NEXT_PUBLIC_GTM_CONTAINER_ID:    ${GTM   ? GTM : "(NOT SET)"}`)
  console.log(`  GOOGLE_ADS_DEVELOPER_TOKEN:      ${ADS   ? "SET (hidden)" : "(NOT SET)"}`)
  console.log(`  GOOGLE_OAUTH_CLIENT_ID:          ${GSC_ID  ? "SET (hidden)" : "(NOT SET)"}`)
  console.log(`  GOOGLE_OAUTH_CLIENT_SECRET:      ${GSC_SEC ? "SET (hidden)" : "(NOT SET)"}`)

  console.log("\n" + "=".repeat(60))
  console.log("AUDIT COMPLETE")
  console.log("=".repeat(60))

  await client.close()
}

run().catch(e => { console.error(e); process.exit(1) })
