import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getAdsSettings, searchAds } from "@/lib/google-ads"
import { getValidAccessToken } from "@/lib/google-oauth"

export const dynamic = "force-dynamic"

const CAMPAIGN_ID  = "23421174455"  // 100X FGG Search 2026 DEL,UP,BHR,MUM,ASM
const DEALER_PAGES = /dealer|oem|gem-oem|government/i
const OEM_PAGES    = /gem-oem|oem-auth/i

// ── Raw diagnostic: list ALL campaigns from the account ───────────────────────

interface RawCampaign {
  campaign_id:   string
  campaign_name: string
  status:        string
  customer_id:   string
}

async function fetchAllCampaigns(customerId: string, loginCustomerId?: string): Promise<{
  usedCustomerId:   string
  usedLoginId:      string | null
  hardcodedId:      string
  campaigns:        RawCampaign[]
  targetedCampaign: RawCampaign | null
  error:            string | null
}> {
  const cid = customerId.replace(/-/g, "")
  const out = {
    usedCustomerId:   cid,
    usedLoginId:      loginCustomerId ?? null,
    hardcodedId:      CAMPAIGN_ID,
    campaigns:        [] as RawCampaign[],
    targetedCampaign: null as RawCampaign | null,
    error:            null as string | null,
  }
  try {
    const token = await getValidAccessToken()
    const rows  = await searchAds(
      cid,
      `SELECT campaign.id, campaign.name, campaign.status FROM campaign ORDER BY campaign.id ASC`,
      token,
      loginCustomerId,
    )
    out.campaigns = rows.map(r => {
      const c = r.campaign as Record<string, unknown>
      return {
        campaign_id:   String(c?.id   ?? ""),
        campaign_name: String(c?.name ?? ""),
        status:        String(c?.status ?? ""),
        customer_id:   cid,
      }
    })
    out.targetedCampaign = out.campaigns.find(c => c.campaign_id === CAMPAIGN_ID) ?? null
  } catch (e) {
    out.error = String(e)
  }
  return out
}

// ── Live Google Ads metrics for today ────────────────────────────────────────

async function fetchTodayMetrics(
  customerId: string,
  campaignId: string,          // use the real campaign ID, not the hardcoded constant
  loginCustomerId?: string,
) {
  try {
    const token = await getValidAccessToken()
    const rows = await searchAds(
      customerId.replace(/-/g, ""),
      `SELECT metrics.impressions, metrics.clicks, metrics.cost_micros
       FROM campaign
       WHERE campaign.id = '${campaignId}'
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

// ── GET: full launch status ───────────────────────────────────────────────────

export async function GET() {
  try {
    const db = (await clientPromise).db()

    // Manual checklist confirmations stored in ads_settings
    const settings = await db.collection("ads_settings").findOne({})
    const lc       = (settings?.launchChecklist ?? {}) as Record<string, boolean>

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [leadsToday, attributedTotal, dealerTotal, oemTotal] = await Promise.all([
      db.collection("rfq_popup_leads").countDocuments({ createdAt: { $gte: todayStart } }),
      db.collection("rfq_popup_leads").countDocuments({ "utm.utm_source": "google" }),
      db.collection("rfq_popup_leads").countDocuments({
        "utm.utm_source": "google",
        $or: [{ pagePath: DEALER_PAGES }, { landingPage: DEALER_PAGES }],
      }),
      db.collection("rfq_popup_leads").countDocuments({
        "utm.utm_source": "google",
        $or: [{ pagePath: OEM_PAGES }, { landingPage: OEM_PAGES }],
      }),
    ])

    // Fetch all campaigns (raw, unfiltered) — surfaces real campaign IDs & names
    const adsSettings = await getAdsSettings()
    const rawApi = adsSettings
      ? await fetchAllCampaigns(adsSettings.customerId, adsSettings.loginCustomerId)
      : {
          usedCustomerId:   "(no ads settings saved)",
          usedLoginId:      null,
          hardcodedId:      CAMPAIGN_ID,
          campaigns:        [],
          targetedCampaign: null,
          error:            "Ads settings not configured",
        }

    // Use the live campaign that matches the hardcoded ID, or fall back to first ENABLED campaign
    const activeCampaign = rawApi.targetedCampaign
      ?? rawApi.campaigns.find(c => c.status === "ENABLED")
      ?? rawApi.campaigns.find(c => c.status === "PAUSED")
      ?? null

    const campaignStatusRaw = rawApi.targetedCampaign?.status ?? "NOT_FOUND"
    const campaignLive      = campaignStatusRaw === "ENABLED"

    // Metrics: use whichever campaign ID actually exists in Google Ads
    const metricsId    = activeCampaign?.campaign_id ?? CAMPAIGN_ID
    const todayMetrics = adsSettings
      ? await fetchTodayMetrics(adsSettings.customerId, metricsId, adsSettings.loginCustomerId)
      : { impressions: 0, clicks: 0, spendINR: 0 }

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
          confirmed:  campaignLive,
          manual:     false,
          label:      activeCampaign
            ? `${activeCampaign.campaign_name} (${activeCampaign.campaign_id})`
            : `Campaign ${CAMPAIGN_ID}`,
          detail:     campaignStatusRaw,
          link:       "https://ads.google.com/aw/campaigns",
          linkLabel:  "Open Campaigns",
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
      rawApi,
      checkedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error("GET /api/admin/growth/launch-status error:", err)
    return NextResponse.json(
      { error: "Failed to load launch status", detail: String(err) },
      { status: 500 },
    )
  }
}

// ── PATCH: confirm a manual checklist item ────────────────────────────────────

export async function PATCH(req: Request) {
  try {
    const body = await req.json() as { field: string; value: boolean }
    const { field, value } = body

    const allowed: Record<string, string> = {
      accountFunded:            "launchChecklist.accountFunded",
      conversionActionsCreated: "launchChecklist.conversionActionsCreated",
      gtmTagsPublished:         "launchChecklist.gtmTagsPublished",
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
  } catch (err) {
    console.error("PATCH /api/admin/growth/launch-status error:", err)
    return NextResponse.json(
      { error: "Failed to update checklist", detail: String(err) },
      { status: 500 },
    )
  }
}
