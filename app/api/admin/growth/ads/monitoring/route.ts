/**
 * Ads Monitoring — campaign metrics sync + health data
 *
 * GET  /api/admin/growth/ads/monitoring — return stored metrics + pending recs
 * POST /api/admin/growth/ads/monitoring — sync live metrics from Google Ads + generate recs
 */
import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { searchAds, getAdsSettings } from "@/lib/google-ads"
import { getValidAccessToken } from "@/lib/google-oauth"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic  = "force-dynamic"
export const maxDuration = 60

const METRICS_COLL = "ads_campaign_metrics"
const RECS_COLL    = "ads_optimization_recommendations"

// ── Helpers ───────────────────────────────────────────────────────────────────

function fromMicros(v: unknown): number {
  return Math.round(Number(v ?? 0) / 10_000) / 100
}

function safeNum(v: unknown, fallback = 0): number {
  const n = Number(v ?? fallback)
  return isNaN(n) ? fallback : n
}

function pctDisplay(ratio: unknown): number {
  return Math.round(safeNum(ratio) * 1000) / 10
}

// ── GET — return stored metrics ───────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const db = (await clientPromise).db()
    const [metrics, recs] = await Promise.all([
      db.collection(METRICS_COLL).find({}).sort({ syncedAt: -1 }).limit(100).toArray(),
      db.collection(RECS_COLL).find({ status: "pending" }).sort({ generatedAt: -1 }).limit(50).toArray(),
    ])

    return NextResponse.json({
      ok: true,
      metrics:         metrics.map(({ _id, ...m }) => m),
      recommendations: recs.map(({ _id, ...r }) => r),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ── POST — sync from Google Ads ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const db          = (await clientPromise).db()
    const adsSettings = await getAdsSettings()

    if (!adsSettings?.customerId) {
      return NextResponse.json({ error: "Google Ads account not connected" }, { status: 400 })
    }

    let accessToken: string
    try {
      accessToken = await getValidAccessToken()
    } catch {
      return NextResponse.json({ error: "Could not get Google Ads access token. Reconnect OAuth." }, { status: 401 })
    }

    const { customerId, loginCustomerId } = adsSettings
    const now = new Date().toISOString()

    // Find real (non-simulated) deployments that have a Google resource name
    const deployments = await db.collection("ads_deployments")
      .find({ status: { $in: ["pending", "approved"] } })
      .toArray()

    const campaignIds = deployments
      .map((d) => (d.resourceNames?.campaign as string | undefined)?.split("/campaigns/")[1] ?? null)
      .filter((id): id is string => !!id)

    if (!campaignIds.length) {
      return NextResponse.json({
        ok: true,
        note: "No real deployed campaign IDs found. Deploy a campaign first.",
        syncedCampaigns: [],
        recommendationsGenerated: 0,
      })
    }

    const idList = campaignIds.join(",")

    // Campaign-level 30-day aggregated metrics
    const campaignRows = await searchAds(
      customerId,
      `SELECT
         campaign.id, campaign.name, campaign.status,
         metrics.impressions, metrics.clicks, metrics.ctr,
         metrics.average_cpc, metrics.cost_micros,
         metrics.conversions, metrics.conversions_value,
         metrics.search_impression_share
       FROM campaign
       WHERE campaign.id IN (${idList})
         AND segments.date DURING LAST_30_DAYS`,
      accessToken,
      loginCustomerId,
    ).catch(() => [] as Record<string, unknown>[])

    // Today's spend (different date segment)
    const todayRows = await searchAds(
      customerId,
      `SELECT campaign.id, metrics.cost_micros
       FROM campaign
       WHERE campaign.id IN (${idList})
         AND segments.date DURING TODAY`,
      accessToken,
      loginCustomerId,
    ).catch(() => [] as Record<string, unknown>[])

    const todaySpend: Record<string, number> = {}
    for (const row of todayRows) {
      const c = row.campaign as { id?: string } | undefined
      const m = row.metrics  as { costMicros?: unknown } | undefined
      if (c?.id) todaySpend[c.id] = fromMicros(m?.costMicros)
    }

    const syncedCampaigns: string[] = []
    const allRecs: Record<string, unknown>[] = []

    for (const row of campaignRows) {
      const c = row.campaign as { id?: string; name?: string; status?: string } | undefined
      const m = row.metrics  as {
        impressions?: unknown; clicks?: unknown; ctr?: unknown
        averageCpc?: unknown; costMicros?: unknown
        conversions?: unknown; conversionsValue?: unknown
        searchImpressionShare?: unknown
      } | undefined
      if (!c?.id) continue

      const impressions = safeNum(m?.impressions)
      const clicks      = safeNum(m?.clicks)
      const ctr         = safeNum(m?.ctr)
      const averageCpc  = fromMicros(m?.averageCpc)
      const cost        = fromMicros(m?.costMicros)
      const conversions = safeNum(m?.conversions)
      const convValue   = safeNum(m?.conversionsValue)
      // search_impression_share can be "--" (string) when data is insufficient
      const sisRaw      = m?.searchImpressionShare
      const sis         = typeof sisRaw === "number" ? sisRaw : 0
      const costPerConv = conversions > 0 ? Math.round(cost / conversions) : 0

      // Per-campaign keyword performance
      const kwRows = await searchAds(
        customerId,
        `SELECT
           ad_group_criterion.keyword.text,
           ad_group_criterion.keyword.match_type,
           metrics.impressions, metrics.clicks,
           metrics.cost_micros, metrics.conversions
         FROM keyword_view
         WHERE campaign.id = ${c.id}
           AND segments.date DURING LAST_30_DAYS
         ORDER BY metrics.impressions DESC
         LIMIT 15`,
        accessToken,
        loginCustomerId,
      ).catch(() => [] as Record<string, unknown>[])

      // Search terms that triggered the campaign
      const stRows = await searchAds(
        customerId,
        `SELECT
           search_term_view.search_term,
           metrics.impressions, metrics.clicks,
           metrics.conversions, metrics.cost_micros
         FROM search_term_view
         WHERE campaign.id = ${c.id}
           AND segments.date DURING LAST_30_DAYS
         ORDER BY metrics.conversions DESC, metrics.clicks DESC
         LIMIT 15`,
        accessToken,
        loginCustomerId,
      ).catch(() => [] as Record<string, unknown>[])

      type KwRow = {
        adGroupCriterion?: { keyword?: { text?: string; matchType?: string } }
        metrics?: { impressions?: unknown; clicks?: unknown; costMicros?: unknown; conversions?: unknown }
      }
      type StRow = {
        searchTermView?: { searchTerm?: string }
        metrics?: { impressions?: unknown; clicks?: unknown; conversions?: unknown; costMicros?: unknown }
      }

      const topKeywords = (kwRows as KwRow[])
        .map((r) => ({
          text:        r.adGroupCriterion?.keyword?.text ?? "",
          matchType:   r.adGroupCriterion?.keyword?.matchType ?? "",
          impressions: safeNum(r.metrics?.impressions),
          clicks:      safeNum(r.metrics?.clicks),
          cost:        fromMicros(r.metrics?.costMicros),
          conversions: safeNum(r.metrics?.conversions),
        }))
        .filter((k) => k.text)

      const topSearchTerms = (stRows as StRow[])
        .map((r) => ({
          term:        r.searchTermView?.searchTerm ?? "",
          impressions: safeNum(r.metrics?.impressions),
          clicks:      safeNum(r.metrics?.clicks),
          conversions: safeNum(r.metrics?.conversions),
          cost:        fromMicros(r.metrics?.costMicros),
        }))
        .filter((s) => s.term)

      const dep = deployments.find((d) =>
        (d.resourceNames?.campaign as string | undefined)?.includes(`/campaigns/${c.id}`),
      )

      const metricsDoc = {
        campaignId:            c.id,
        campaignName:          c.name ?? "",
        campaignResourceName:  dep?.resourceNames?.campaign ?? `customers/${customerId}/campaigns/${c.id}`,
        deploymentId:          dep?.deploymentId ?? null,
        syncedAt:              now,
        dateRange:             "LAST_30_DAYS",
        impressions,
        clicks,
        ctr:                   pctDisplay(ctr),
        ctrRaw:                ctr,
        averageCpc,
        cost,
        costToday:             todaySpend[c.id] ?? 0,
        conversions,
        conversionsValue:      convValue,
        costPerConversion:     costPerConv,
        searchImpressionShare: pctDisplay(sis),
        googleStatus:          c.status ?? "UNKNOWN",
        topKeywords,
        topSearchTerms,
      }

      await db.collection(METRICS_COLL).updateOne(
        { campaignId: c.id },
        { $set: metricsDoc },
        { upsert: true },
      )

      syncedCampaigns.push(c.id)

      // Generate and upsert optimization recommendations
      const recs = generateRecommendations({
        ctr, impressions, clicks, conversions, cost,
        costPerConversion: costPerConv,
        searchImpressionShareRaw: sis,
        averageCpc,
        topKeywords,
        topSearchTerms,
      })
      for (const rec of recs) {
        allRecs.push({ ...rec, campaignId: c.id, campaignName: c.name ?? "", generatedAt: now })
      }
    }

    // Upsert recommendations (one per type per campaign — overwrite stale data)
    for (const rec of allRecs) {
      await db.collection(RECS_COLL).updateOne(
        { campaignId: rec.campaignId as string, type: rec.type as string },
        {
          $set:         { ...rec, updatedAt: now },
          $setOnInsert: { status: "pending", createdAt: now },
        },
        { upsert: true },
      )
    }

    await db.collection("growth_os_logs").insertOne({
      ts: now, agent: "ads-monitoring", action: "metrics_synced",
      syncedCampaigns, recommendationsGenerated: allRecs.length,
      level: "success", module: "ads",
    })

    return NextResponse.json({
      ok:                       true,
      syncedAt:                 now,
      syncedCampaigns,
      recommendationsGenerated: allRecs.length,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ── Recommendation engine ─────────────────────────────────────────────────────

type RecEntry = {
  type: string; priority: "high" | "medium" | "low"
  title: string; description: string
  metric: string; threshold: string; dataPoints: string[]
}

function generateRecommendations(m: {
  ctr: number; impressions: number; clicks: number
  conversions: number; cost: number; costPerConversion: number
  searchImpressionShareRaw: number; averageCpc: number
  topSearchTerms: Array<{ term: string; clicks: number; conversions: number; cost: number }>
  topKeywords:    Array<{ text: string; conversions: number; clicks: number }>
}): RecEntry[] {
  const recs: RecEntry[] = []
  const ctrPct = pctDisplay(m.ctr)

  if (m.impressions > 100 && m.ctr < 0.02) {
    recs.push({
      type:        "rewrite_rsa",
      priority:    m.ctr < 0.01 ? "high" : "medium",
      title:       "Rewrite RSA — CTR below 2%",
      description: "Refresh headlines and descriptions with specific thermal fogging use cases and stronger value propositions.",
      metric:      `CTR: ${ctrPct}%`,
      threshold:   "Target: >5%",
      dataPoints:  [`${m.impressions.toLocaleString("en-IN")} impressions`, `${m.clicks} clicks`, `CTR: ${ctrPct}%`],
    })
  }

  const converting = m.topSearchTerms.filter((t) => t.conversions >= 1 && t.clicks >= 3)
  if (converting.length > 0) {
    recs.push({
      type:        "add_exact_match",
      priority:    "high",
      title:       `Add ${converting.length} converting term(s) as [exact match]`,
      description: "These search terms drive conversions but lack exact-match control. Adding as [exact] keywords improves bid precision.",
      metric:      `${converting.length} converting terms`,
      threshold:   "≥1 conversion & ≥3 clicks",
      dataPoints:  converting.slice(0, 5).map((t) => `"${t.term}" — ${t.conversions} conv, ₹${t.cost.toFixed(0)}`),
    })
  }

  const wasted = m.topSearchTerms.filter((t) => t.cost > 100 && t.conversions === 0 && t.clicks > 5)
  if (wasted.length > 0) {
    recs.push({
      type:        "add_negative",
      priority:    "high",
      title:       `Block ${wasted.length} wasted term(s) as negatives`,
      description: "These terms consume budget with zero conversions. Adding as negatives stops spend immediately.",
      metric:      `₹${wasted.reduce((s, t) => s + t.cost, 0).toFixed(0)} wasted`,
      threshold:   ">₹100 spend, 0 conversions, >5 clicks",
      dataPoints:  wasted.slice(0, 5).map((t) => `"${t.term}" — ₹${t.cost.toFixed(0)}, ${t.clicks} clicks`),
    })
  }

  if (m.conversions > 5 && m.costPerConversion < 2000) {
    recs.push({
      type:        "increase_budget",
      priority:    "medium",
      title:       "Increase daily budget — CPA is healthy",
      description: `CPA of ₹${m.costPerConversion} is within target. Raising budget captures more demand without diminishing returns.`,
      metric:      `CPA: ₹${m.costPerConversion}`,
      threshold:   "Target CPA: <₹2,000",
      dataPoints:  [`${m.conversions} conversions`, `₹${m.cost.toFixed(0)} total spend`],
    })
  }

  if (m.impressions > 50 && m.searchImpressionShareRaw > 0 && m.searchImpressionShareRaw < 0.30) {
    recs.push({
      type:        "raise_bids",
      priority:    "medium",
      title:       `Raise bids — impression share only ${pctDisplay(m.searchImpressionShareRaw)}%`,
      description: "Campaign captures a small fraction of available impressions. Raising keyword bids or campaign budget increases reach.",
      metric:      `IS: ${pctDisplay(m.searchImpressionShareRaw)}%`,
      threshold:   "Target IS: >50%",
      dataPoints:  [`IS: ${pctDisplay(m.searchImpressionShareRaw)}%`, `${m.impressions.toLocaleString("en-IN")} impressions captured`],
    })
  }

  return recs
}
