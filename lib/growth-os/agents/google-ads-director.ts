import clientPromise from "@/lib/mongodb"
import type { Db } from "mongodb"
import { logAgentRun } from "@/lib/growth-os/log-agent"
import { ADS_DIRECTOR_CONFIG as C, ADS_DIRECTOR_VERSION, type AdsConfidence, type AdsRecType } from "@/lib/growth-os/ads-director-config"

const AGENT = "Google Ads Director"
const COLL_RECS = "ads_recommendations"

interface AdsRec {
  type: AdsRecType
  title: string
  detail: string
  evidence: Record<string, unknown>
  confidence: AdsConfidence
  expectedImpact: string
  governance: string
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`

/**
 * Google Ads Director — Phase 1 (READ-ONLY intelligence).
 * Reads the latest Ads sync (ads_* collections) and generates recommendations.
 * Does NOT touch spend, bids, budgets, or campaigns. Recommendations only.
 */
export async function runGoogleAdsDirector() {
  const db: Db = (await clientPromise).db()

  const lastSync = await db.collection("ads_syncs").findOne({ status: { $ne: "error" } }, { sort: { syncedAt: -1 } })
  if (!lastSync) {
    await logAgentRun(db, {
      agent: AGENT, action: "No Ads data yet — connect a Google Ads account and run a sync first.",
      reason: "ads_syncs empty", expectedImpact: "—", actualImpact: "0 recommendations",
      level: "warning", module: "ads",
    })
    return { connected: false, message: "No Ads sync data. Connect Google Ads + run a sync.", recommendations: 0 }
  }
  const syncDate = lastSync.syncDate as string

  const [overview, searchTerms, keywords, conversions] = await Promise.all([
    db.collection("ads_overview_rows").findOne({ syncDate }),
    db.collection("ads_searchterm_rows").find({ syncDate }).toArray(),
    db.collection("ads_keyword_rows").find({ syncDate }).toArray(),
    db.collection("ads_conversion_rows").find({ syncDate }).toArray(),
  ])

  const recs: AdsRec[] = []

  // 1. Negative keyword candidates — clicks, no conversions
  const negatives = searchTerms
    .filter((t) => Number(t.clicks) >= C.negativeKeyword.minClicks && Number(t.conversions) <= C.negativeKeyword.maxConversions)
    .sort((a, b) => Number(b.spend) - Number(a.spend))
    .slice(0, 25)
  for (const t of negatives) {
    recs.push({
      type: "negative_keyword",
      title: `Add negative: “${t.searchTerm}”`,
      detail: `${t.clicks} clicks, ${inr(Number(t.spend))} spent, 0 conversions in “${t.campaign}”. Likely wasted spend.`,
      evidence: { searchTerm: t.searchTerm, clicks: t.clicks, spend: t.spend, campaign: t.campaign },
      confidence: Number(t.clicks) >= C.negativeKeyword.minClicks * 2 ? "high" : "medium",
      expectedImpact: `Reclaim ~${inr(Number(t.spend))}/period of wasted spend`,
      governance: "Recommendation only — requires human approval before adding negative.",
    })
  }

  // 2. New keyword opportunities — converted search terms not yet exact keywords
  const exactKw = new Set(keywords.map((k) => String(k.keyword).toLowerCase()))
  const newKw = searchTerms
    .filter((t) => Number(t.conversions) >= C.newKeyword.minConversions && Number(t.clicks) >= C.newKeyword.minClicks && !exactKw.has(String(t.searchTerm).toLowerCase()))
    .sort((a, b) => Number(b.conversions) - Number(a.conversions))
    .slice(0, 25)
  for (const t of newKw) {
    recs.push({
      type: "new_keyword",
      title: `Add keyword: “${t.searchTerm}”`,
      detail: `Converted ${t.conversions}× from ${t.clicks} clicks but has no dedicated keyword. Add + write a tailored ad.`,
      evidence: { searchTerm: t.searchTerm, conversions: t.conversions, clicks: t.clicks, campaign: t.campaign },
      confidence: "high",
      expectedImpact: "Capture proven-intent demand with better Quality Score",
      governance: "Recommendation only — requires human approval before adding keyword.",
    })
  }

  // 3. High CPC, no conversions
  const kwWithClicks = keywords.filter((k) => Number(k.clicks) >= C.highCpc.minClicks)
  const cpcs = kwWithClicks.map((k) => Number(k.avgCpc)).sort((a, b) => a - b)
  const cpcThreshold = cpcs.length ? cpcs[Math.floor(cpcs.length * C.highCpc.cpcPercentile)] : Infinity
  const highCpc = kwWithClicks
    .filter((k) => Number(k.avgCpc) >= cpcThreshold && Number(k.conversions) <= C.highCpc.maxConversions)
    .sort((a, b) => Number(b.spend) - Number(a.spend))
    .slice(0, 20)
  for (const k of highCpc) {
    recs.push({
      type: "high_cpc",
      title: `Review high-CPC keyword: “${k.keyword}”`,
      detail: `Avg CPC ${inr(Number(k.avgCpc))} (top quartile), ${k.clicks} clicks, ${inr(Number(k.spend))} spent, 0 conversions in “${k.campaign}”.`,
      evidence: { keyword: k.keyword, avgCpc: k.avgCpc, clicks: k.clicks, spend: k.spend, campaign: k.campaign },
      confidence: "medium",
      expectedImpact: "Lower bid or pause to stop unproductive spend",
      governance: "Recommendation only — no bid/budget change is made automatically.",
    })
  }

  // 4. Low CTR despite impressions
  const lowCtr = keywords
    .filter((k) => Number(k.impressions) >= C.lowCtr.minImpressions && Number(k.ctr) <= C.lowCtr.maxCtrPct)
    .sort((a, b) => Number(b.impressions) - Number(a.impressions))
    .slice(0, 20)
  for (const k of lowCtr) {
    recs.push({
      type: "low_ctr",
      title: `Low CTR: “${k.keyword}” (${Number(k.ctr).toFixed(2)}%)`,
      detail: `${k.impressions} impressions but only ${Number(k.ctr).toFixed(2)}% CTR in “${k.campaign}”. Ad copy or keyword relevance needs work.`,
      evidence: { keyword: k.keyword, ctr: k.ctr, impressions: k.impressions, campaign: k.campaign },
      confidence: "medium",
      expectedImpact: "Improve ad relevance → more clicks at the same spend",
      governance: "Recommendation only — ad copy changes require human approval.",
    })
  }

  // Conversion proxy (V1 ROAS): Ads call conversions + website enquiries (last N days)
  const callConvs = conversions
    .filter((c) => /call|phone/i.test(String(c.category) + String(c.name)))
    .reduce((s, c) => s + Number(c.allConversions || 0), 0)
  const since = new Date(Date.now() - C.enquiryWindowDays * 86_400_000).toISOString()
  const [waLeads, rfqLeads, gemLeads] = await Promise.all([
    db.collection("rfq_popup_leads").countDocuments({ createdAt: { $gte: since } }).catch(() => 0),
    db.collection("submissions").countDocuments({ createdAt: { $gte: since } }).catch(() => 0),
    db.collection("gem_inquiries").countDocuments({ createdAt: { $gte: since } }).catch(() => 0),
  ])

  const snapshot = {
    syncDate,
    spend: overview?.spend ?? 0, clicks: overview?.clicks ?? 0, impressions: overview?.impressions ?? 0,
    ctr: overview?.ctr ?? 0, avgCpc: overview?.avgCpc ?? 0,
    adsCallConversions: Math.round(callConvs * 100) / 100,
    websiteEnquiries: { rfqPopup: waLeads, submissions: rfqLeads, gemInquiries: gemLeads, window: `${C.enquiryWindowDays}d` },
  }

  const generatedAt = new Date().toISOString()
  await db.collection(COLL_RECS).deleteMany({ syncDate })
  if (recs.length) {
    await db.collection(COLL_RECS).insertMany(
      recs.map((r) => ({ ...r, syncDate, generatedAt, directorVersion: ADS_DIRECTOR_VERSION, status: "pending" }))
    )
  }
  await db.collection("ads_director_snapshots").updateOne(
    { syncDate }, { $set: { ...snapshot, generatedAt, directorVersion: ADS_DIRECTOR_VERSION, recommendationCount: recs.length } }, { upsert: true }
  )

  const byType = recs.reduce((m: Record<string, number>, r) => { m[r.type] = (m[r.type] || 0) + 1; return m }, {})
  await db.collection("growth_os_opportunities").updateOne(
    { title: `Google Ads Director — ${recs.length} recommendations` },
    {
      $set: {
        title: `Google Ads Director — ${recs.length} recommendations`,
        description: `${byType.negative_keyword || 0} negatives, ${byType.new_keyword || 0} new keywords, ${byType.high_cpc || 0} high-CPC, ${byType.low_ctr || 0} low-CTR. Read-only — approval required. Open Growth OS → Ads Director.`,
        module: "ads", source: "agent", businessValue: "high", seoValue: "low", geoValue: "low",
        dealerImpact: "medium", effort: "low", status: "pending", updatedAt: generatedAt,
      },
      $setOnInsert: { createdAt: generatedAt },
    },
    { upsert: true }
  )

  await logAgentRun(db, {
    agent: AGENT,
    action: `${recs.length} recommendations from ${syncDate}: ${byType.negative_keyword || 0} neg, ${byType.new_keyword || 0} new kw, ${byType.high_cpc || 0} high-CPC, ${byType.low_ctr || 0} low-CTR.`,
    reason: `Director ${ADS_DIRECTOR_VERSION}, read-only intelligence`,
    expectedImpact: "Reduce wasted spend + capture proven-intent demand",
    actualImpact: `${recs.length} approval-gated recommendations`,
    level: "success", module: "ads",
    after: JSON.stringify({ snapshot, byType }),
  })

  return { connected: true, syncDate, recommendations: recs.length, byType, snapshot }
}
