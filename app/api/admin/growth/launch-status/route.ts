import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getAdsSettings, searchAds } from "@/lib/google-ads"
import { getValidAccessToken } from "@/lib/google-oauth"

export const dynamic = "force-dynamic"

const CAMPAIGN_ID    = "23926990781"
const DEALER_PAGES   = /dealer|oem|gem-oem|government/i
const OEM_PAGES      = /gem-oem|oem-auth/i

// ── Live Google Ads metrics for today ────────────────────────────────────────

async function fetchTodayMetrics(customerId: string, loginCustomerId?: string) {
  try {
    const token = await getValidAccessToken()
    const rows = await searchAds(
      customerId.replace(/-/g, ""),
      `SELECT metrics.impressions, metrics.clicks, metrics.cost_micros
       FROM campaign
       WHERE campaign.id = '${CAMPAIGN_ID}'
       AND segments.date DURING TODAY`,
      token,
      loginCustomerId,
    )
    let impressions = 0, clicks = 0, costMicros = 0
    for (const row of rows) {
      const m = row.metrics as Record<string, unknown> | undefined
      impressions += Number(m?.impressions ?? 0)
      clicks      += Number(m?.clicks ?? 0)
      costMicros  += Number(m?.costMicros ?? 0)
    }
    return { impressions, clicks, spendINR: Math.round(costMicros / 1_000_000 * 100) / 100 }
  } catch {
    return { impressions: 0, clicks: 0, spendINR: 0 }
  }
}

// ── Campaign status from Google Ads ──────────────────────────────────────────

async function fetchCampaignStatus(customerId: string, loginCustomerId?: string) {
  try {
    const token = await getValidAccessToken()
    const rows = await searchAds(
      customerId.replace(/-/g, ""),
      `SELECT campaign.status FROM campaign WHERE campaign.id = '${CAMPAIGN_ID}'`,
      token,
      loginCustomerId,
    )
    const status = (rows[0]?.campaign as Record<string, unknown> | undefined)?.status
    return typeof status === "string" ? status : "UNKNOWN"
  } catch {
    return "UNKNOWN"
  }
}

// ── GET: full launch status ───────────────────────────────────────────────────

export async function GET() {
  const db = (await clientPromise).db()

  // Manual checklist confirmations stored in ads_settings
  const settings = await db.collection("ads_settings").findOne({})
  const lc       = (settings?.launchChecklist ?? {}) as Record<string, boolean>

  // Today's lead count
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [leadsToday, attributedTotal, dealerTotal, oemTotal] = await Promise.all([
    db.collection("rfq_popup_leads").countDocuments({ createdAt: { $gte: todayStart } }),
    db.collection("rfq_popup_leads").countDocuments({ "utm.source": "google" }),
    db.collection("rfq_popup_leads").countDocuments({
      "utm.source": "google",
      $or: [{ landingPage: DEALER_PAGES }, { landingPage: OEM_PAGES }],
    }),
    db.collection("rfq_popup_leads").countDocuments({
      "utm.source": "google",
      landingPage: OEM_PAGES,
    }),
  ])

  // Google Ads live data
  const adsSettings = await getAdsSettings()
  const [todayMetrics, campaignStatusRaw] = await Promise.all([
    adsSettings ? fetchTodayMetrics(adsSettings.customerId, adsSettings.loginCustomerId) : Promise.resolve({ impressions: 0, clicks: 0, spendINR: 0 }),
    adsSettings ? fetchCampaignStatus(adsSettings.customerId, adsSettings.loginCustomerId) : Promise.resolve("UNKNOWN"),
  ])

  const campaignLive = campaignStatusRaw === "ENABLED"

  // All-time click check (from synced search term data)
  const everHadClick = await db.collection("ads_searchterm_rows")
    .countDocuments({ clicks: { $gt: 0 } })
    .then(n => n > 0)

  return NextResponse.json({
    checklist: {
      accountFunded: {
        confirmed: !!lc.accountFunded,
        manual:    true,
        label:     "Google Ads account funded (≥ ₹2,000)",
        link:      "https://ads.google.com/aw/billing/summary",
        linkLabel: "Open Billing",
      },
      conversionActions: {
        confirmed: !!lc.conversionActionsCreated,
        manual:    true,
        label:     "3 conversion actions created (RFQ Submit, WhatsApp Click, Phone Call)",
        link:      "https://ads.google.com/aw/conversions",
        linkLabel: "Open Conversions",
      },
      gtmTags: {
        confirmed: !!lc.gtmTagsPublished,
        manual:    true,
        label:     "GTM conversion tags published in GTM-5JMGCKRW",
        link:      "https://tagmanager.google.com",
        linkLabel: "Open GTM",
      },
      campaignEnabled: {
        confirmed: campaignLive,
        manual:    false,
        label:     "Campaign 23926990781 enabled",
        detail:    campaignStatusRaw,
        link:      "https://ads.google.com/aw/campaigns",
        linkLabel: "Open Campaigns",
      },
    },
    metrics: {
      impressionsToday: todayMetrics.impressions,
      clicksToday:      todayMetrics.clicks,
      spendToday:       todayMetrics.spendINR,
      leadsToday,
    },
    milestones: {
      firstPaidClick:      todayMetrics.clicks > 0 || everHadClick,
      firstAttributedLead: attributedTotal > 0,
      firstDealerLead:     dealerTotal > 0,
      firstOEMLead:        oemTotal > 0,
    },
    checkedAt: new Date().toISOString(),
  })
}

// ── PATCH: confirm a manual checklist item ────────────────────────────────────

export async function PATCH(req: Request) {
  const body = await req.json() as { field: string; value: boolean }
  const { field, value } = body

  const allowed: Record<string, string> = {
    accountFunded:           "launchChecklist.accountFunded",
    conversionActionsCreated:"launchChecklist.conversionActionsCreated",
    gtmTagsPublished:        "launchChecklist.gtmTagsPublished",
  }
  if (!allowed[field]) {
    return NextResponse.json({ error: "Invalid field" }, { status: 400 })
  }

  const db = (await clientPromise).db()
  await db.collection("ads_settings").updateOne(
    {},
    { $set: { [allowed[field]]: value, updatedAt: new Date().toISOString() } },
    { upsert: true },
  )
  return NextResponse.json({ ok: true, field, value })
}
