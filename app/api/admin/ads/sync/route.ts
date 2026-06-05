/**
 * GET  /api/admin/ads/sync — connection + last sync status
 * POST /api/admin/ads/sync — run full 30-day sync: campaigns, keywords, search terms,
 *                            devices, locations, conversions
 */
import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getValidAccessToken, getStoredTokens, isOAuthAppConfigured } from "@/lib/google-oauth"
import { searchAds, getAdsSettings, fromMicros, isDeveloperTokenConfigured, QUERIES } from "@/lib/google-ads"

export const maxDuration = 60

export async function GET() {
  const db = (await clientPromise).db()
  const [last, stored, settings] = await Promise.all([
    db.collection("ads_syncs").findOne({}, { sort: { syncedAt: -1 } }),
    getStoredTokens(),
    getAdsSettings(),
  ])
  return NextResponse.json({
    oauthConfigured: isOAuthAppConfigured(),
    devTokenConfigured: isDeveloperTokenConfigured(),
    connected: !!stored,
    connectedEmail: stored?.connectedEmail ?? null,
    hasAdsScope: stored?.scope?.includes("adwords") ?? false,
    customerId: settings?.customerId ?? null,
    customerName: settings?.customerName ?? null,
    currencyCode: settings?.currencyCode ?? "INR",
    lastSync: last ? JSON.parse(JSON.stringify(last)) : null,
  })
}

// Helper: aggregate rows by a dimension key
function aggregateBy<T extends Record<string, unknown>>(
  rows: T[],
  keyFn: (r: T) => string,
  merge: (acc: Record<string, unknown>, r: T) => void
): Record<string, unknown>[] {
  const map = new Map<string, Record<string, unknown>>()
  for (const row of rows) {
    const key = keyFn(row)
    if (!map.has(key)) map.set(key, { _key: key })
    merge(map.get(key)!, row)
  }
  return Array.from(map.values())
}

export async function POST() {
  let accessToken: string
  try {
    accessToken = await getValidAccessToken()
  } catch (err) {
    const msg = String(err)
    if (msg.startsWith("NOT_CONNECTED")) {
      return NextResponse.json({ error: "not_connected", message: "Connect your Google account first." }, { status: 400 })
    }
    return NextResponse.json({ error: "auth_failed", message: msg }, { status: 401 })
  }

  if (!isDeveloperTokenConfigured()) {
    return NextResponse.json({ error: "no_dev_token", message: "GOOGLE_ADS_DEVELOPER_TOKEN is not configured." }, { status: 400 })
  }

  const settings = await getAdsSettings()
  if (!settings?.customerId) {
    return NextResponse.json({ error: "no_account", message: "No Ads account selected. Go to Ads Setup and select an account." }, { status: 400 })
  }

  const db = (await clientPromise).db()
  const syncedAt = new Date().toISOString()
  const syncDate = syncedAt.split("T")[0]
  const { customerId, loginCustomerId } = settings

  const errors: string[] = []
  const counts: Record<string, number> = {}

  // Helper: run a query and store results
  async function syncCollection(
    collectionName: string,
    query: string,
    transform: (row: Record<string, unknown>) => Record<string, unknown>
  ) {
    const raw = await searchAds(customerId, query, accessToken, loginCustomerId)
    const rows = raw.map(transform)
    await db.collection(collectionName).deleteMany({ syncDate })
    if (rows.length > 0) {
      await db.collection(collectionName).insertMany(rows.map(r => ({ ...r, syncDate })))
    }
    return rows.length
  }

  type CampaignRow = { campaign?: { id?: unknown; name?: unknown; status?: unknown; advertisingChannelType?: unknown }; metrics?: { costMicros?: unknown; clicks?: unknown; impressions?: unknown; ctr?: unknown; averageCpc?: unknown; conversions?: unknown; costPerConversion?: unknown } }
  type KeywordRow = { adGroupCriterion?: { keyword?: { text?: unknown; matchType?: unknown } }; campaign?: { name?: unknown }; adGroup?: { name?: unknown }; metrics?: { costMicros?: unknown; clicks?: unknown; impressions?: unknown; ctr?: unknown; averageCpc?: unknown; conversions?: unknown } }
  type SearchTermRow = { searchTermView?: { searchTerm?: unknown; status?: unknown }; campaign?: { name?: unknown }; adGroup?: { name?: unknown }; metrics?: { costMicros?: unknown; clicks?: unknown; impressions?: unknown; ctr?: unknown; averageCpc?: unknown; conversions?: unknown } }
  type DeviceRow = { segments?: { device?: unknown }; metrics?: { costMicros?: unknown; clicks?: unknown; impressions?: unknown; ctr?: unknown; averageCpc?: unknown; conversions?: unknown } }
  type LocationRow = { geographicView?: { countryCriterionId?: unknown; locationType?: unknown }; metrics?: { costMicros?: unknown; clicks?: unknown; impressions?: unknown; conversions?: unknown } }
  type ConversionRow = { conversionAction?: { name?: unknown; category?: unknown }; metrics?: { allConversions?: unknown } }

  // 1. Campaigns
  try {
    counts.campaigns = await syncCollection("ads_campaign_rows", QUERIES.campaigns, (r) => {
      const row = r as CampaignRow
      return {
        campaignId: String(row.campaign?.id ?? ""),
        campaignName: String(row.campaign?.name ?? ""),
        status: String(row.campaign?.status ?? ""),
        channelType: String(row.campaign?.advertisingChannelType ?? ""),
        spend: fromMicros(row.metrics?.costMicros),
        clicks: Number(row.metrics?.clicks ?? 0),
        impressions: Number(row.metrics?.impressions ?? 0),
        ctr: Math.round(Number(row.metrics?.ctr ?? 0) * 10000) / 100,
        avgCpc: fromMicros(row.metrics?.averageCpc),
        conversions: Math.round(Number(row.metrics?.conversions ?? 0) * 100) / 100,
        costPerConversion: fromMicros(row.metrics?.costPerConversion),
      }
    })
  } catch (err) { errors.push(`campaigns: ${err}`) }

  // 2. Overview — aggregate campaign totals
  try {
    const campaignRows = await db.collection("ads_campaign_rows").find({ syncDate }).toArray()
    const totalSpend = campaignRows.reduce((s, r) => s + ((r.spend as number) || 0), 0)
    const totalClicks = campaignRows.reduce((s, r) => s + ((r.clicks as number) || 0), 0)
    const totalImpressions = campaignRows.reduce((s, r) => s + ((r.impressions as number) || 0), 0)
    const totalConversions = campaignRows.reduce((s, r) => s + ((r.conversions as number) || 0), 0)
    await db.collection("ads_overview_rows").deleteMany({ syncDate })
    await db.collection("ads_overview_rows").insertOne({
      syncDate,
      spend: Math.round(totalSpend * 100) / 100,
      clicks: totalClicks,
      impressions: totalImpressions,
      ctr: totalImpressions > 0 ? Math.round(totalClicks / totalImpressions * 10000) / 100 : 0,
      avgCpc: totalClicks > 0 ? Math.round(totalSpend / totalClicks * 100) / 100 : 0,
      conversions: Math.round(totalConversions * 100) / 100,
      costPerConversion: totalConversions > 0 ? Math.round(totalSpend / totalConversions * 100) / 100 : 0,
    })
  } catch (err) { errors.push(`overview: ${err}`) }

  // 3. Keywords
  try {
    counts.keywords = await syncCollection("ads_keyword_rows", QUERIES.keywords, (r) => {
      const row = r as KeywordRow
      return {
        keyword: String(row.adGroupCriterion?.keyword?.text ?? ""),
        matchType: String(row.adGroupCriterion?.keyword?.matchType ?? ""),
        campaign: String(row.campaign?.name ?? ""),
        adGroup: String(row.adGroup?.name ?? ""),
        spend: fromMicros(row.metrics?.costMicros),
        clicks: Number(row.metrics?.clicks ?? 0),
        impressions: Number(row.metrics?.impressions ?? 0),
        ctr: Math.round(Number(row.metrics?.ctr ?? 0) * 10000) / 100,
        avgCpc: fromMicros(row.metrics?.averageCpc),
        conversions: Math.round(Number(row.metrics?.conversions ?? 0) * 100) / 100,
      }
    })
  } catch (err) { errors.push(`keywords: ${err}`) }

  // 4. Search terms
  try {
    counts.searchTerms = await syncCollection("ads_searchterm_rows", QUERIES.searchTerms, (r) => {
      const row = r as SearchTermRow
      return {
        searchTerm: String(row.searchTermView?.searchTerm ?? ""),
        status: String(row.searchTermView?.status ?? ""),
        campaign: String(row.campaign?.name ?? ""),
        adGroup: String(row.adGroup?.name ?? ""),
        spend: fromMicros(row.metrics?.costMicros),
        clicks: Number(row.metrics?.clicks ?? 0),
        impressions: Number(row.metrics?.impressions ?? 0),
        ctr: Math.round(Number(row.metrics?.ctr ?? 0) * 10000) / 100,
        avgCpc: fromMicros(row.metrics?.averageCpc),
        conversions: Math.round(Number(row.metrics?.conversions ?? 0) * 100) / 100,
      }
    })
  } catch (err) { errors.push(`searchTerms: ${err}`) }

  // 5. Devices — aggregate across campaigns
  try {
    const deviceRaw = await searchAds(customerId, QUERIES.devices, accessToken, loginCustomerId)
    const deviceAgg = aggregateBy(
      deviceRaw as DeviceRow[],
      r => String(r.segments?.device ?? "UNKNOWN"),
      (acc, r) => {
        acc.device = String(r.segments?.device ?? "UNKNOWN")
        acc.spend = ((acc.spend as number) || 0) + fromMicros(r.metrics?.costMicros)
        acc.clicks = ((acc.clicks as number) || 0) + Number(r.metrics?.clicks ?? 0)
        acc.impressions = ((acc.impressions as number) || 0) + Number(r.metrics?.impressions ?? 0)
        acc.conversions = ((acc.conversions as number) || 0) + Number(r.metrics?.conversions ?? 0)
      }
    )
    const deviceFinal = deviceAgg.map(r => ({
      ...r,
      spend: Math.round(((r.spend as number) || 0) * 100) / 100,
      ctr: (r.impressions as number) > 0 ? Math.round(((r.clicks as number) / (r.impressions as number)) * 10000) / 100 : 0,
      avgCpc: (r.clicks as number) > 0 ? Math.round(((r.spend as number) / (r.clicks as number)) * 100) / 100 : 0,
    })).sort((a, b) => ((b.spend as number) || 0) - ((a.spend as number) || 0))
    await db.collection("ads_device_rows").deleteMany({ syncDate })
    if (deviceFinal.length > 0) {
      await db.collection("ads_device_rows").insertMany(deviceFinal.map(r => ({ ...r, syncDate })))
    }
    counts.devices = deviceFinal.length
  } catch (err) { errors.push(`devices: ${err}`) }

  // 6. Locations
  try {
    counts.locations = await syncCollection("ads_location_rows", QUERIES.locations, (r) => {
      const row = r as LocationRow
      return {
        countryCriterionId: String(row.geographicView?.countryCriterionId ?? ""),
        locationType: String(row.geographicView?.locationType ?? ""),
        spend: fromMicros(row.metrics?.costMicros),
        clicks: Number(row.metrics?.clicks ?? 0),
        impressions: Number(row.metrics?.impressions ?? 0),
        conversions: Math.round(Number(row.metrics?.conversions ?? 0) * 100) / 100,
      }
    })
  } catch (err) { errors.push(`locations: ${err}`) }

  // 7. Conversions — uses all_conversions (metrics.conversions not valid on conversion_action)
  try {
    counts.conversions = await syncCollection("ads_conversion_rows", QUERIES.conversions, (r) => {
      const row = r as ConversionRow
      return {
        name: String(row.conversionAction?.name ?? ""),
        category: String(row.conversionAction?.category ?? ""),
        allConversions: Math.round(Number(row.metrics?.allConversions ?? 0) * 100) / 100,
      }
    })
  } catch (err) { errors.push(`conversions: ${err}`) }

  const syncDoc = {
    syncedAt,
    syncDate,
    customerId,
    customerName: settings.customerName,
    counts,
    errors,
    status: errors.length === 0 ? "ok" : "partial",
  }
  await db.collection("ads_syncs").insertOne(syncDoc)

  // Keep only last 30 syncs
  const total = await db.collection("ads_syncs").countDocuments()
  if (total > 30) {
    const oldest = await db.collection("ads_syncs").find({}).sort({ syncedAt: 1 }).limit(total - 30).project({ _id: 1 }).toArray()
    if (oldest.length) await db.collection("ads_syncs").deleteMany({ _id: { $in: oldest.map(d => d._id) } })
  }

  if (errors.length > 0) {
    return NextResponse.json({ ok: false, errors, syncedAt }, { status: 500 })
  }
  return NextResponse.json({ ok: true, counts, syncedAt })
}
