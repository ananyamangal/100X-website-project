import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getAdsSettings, searchAds } from "@/lib/google-ads"
import { getValidAccessToken } from "@/lib/google-oauth"

export const dynamic = "force-dynamic"

const CAMPAIGN_ID  = "23926990781"
const DEALER_PAGES = /dealer|gem-oem|government|oem-auth/i
const OEM_PAGES    = /gem-oem|oem-auth/i

// ── Google Ads: today's campaign metrics ─────────────────────────────────────

async function adsToday(customerId: string, loginCustomerId?: string) {
  try {
    const token = await getValidAccessToken()
    const cid   = customerId.replace(/-/g, "")
    const [metricRows, statusRows] = await Promise.all([
      searchAds(cid,
        `SELECT metrics.impressions, metrics.clicks, metrics.cost_micros
         FROM campaign
         WHERE campaign.id = '${CAMPAIGN_ID}' AND segments.date DURING TODAY`,
        token, loginCustomerId),
      searchAds(cid,
        `SELECT campaign.status FROM campaign WHERE campaign.id = '${CAMPAIGN_ID}'`,
        token, loginCustomerId),
    ])
    let impressions = 0, clicks = 0, costMicros = 0
    for (const r of metricRows) {
      const m = r.metrics as Record<string, unknown>
      impressions += Number(m?.impressions ?? 0)
      clicks      += Number(m?.clicks ?? 0)
      costMicros  += Number(m?.costMicros ?? 0)
    }
    const status = (statusRows[0]?.campaign as Record<string, unknown> | undefined)?.status ?? "UNKNOWN"
    return { impressions, clicks, spendINR: costMicros / 1_000_000, status: String(status) }
  } catch {
    return { impressions: 0, clicks: 0, spendINR: 0, status: "UNKNOWN" }
  }
}

// ── Next Best Action ──────────────────────────────────────────────────────────

interface NextAction {
  id:          string
  title:       string
  description: string
  cta:         string
  ctaUrl:      string
  urgency:     "critical" | "high" | "normal"
  external:    boolean
}

function buildNextAction(
  checklist:  Record<string, boolean>,
  ads:        { impressions: number; clicks: number; spendINR: number; status: string },
  leads:      { leadsToday: number; oemNew: number; dealerNew: number; pendingApprovals: number; totalAttributed: number },
  cpl:        number | null,
): NextAction {

  if (!checklist.accountFunded)
    return { id: "fund", urgency: "critical", external: true,
      title: "Add funds to your Google Ads account",
      description: "Without a balance your campaign cannot serve a single ad. Add ₹2,000 to begin.",
      cta: "Open Billing", ctaUrl: "https://ads.google.com/aw/billing/summary" }

  if (!checklist.conversionActionsCreated)
    return { id: "conversions", urgency: "critical", external: true,
      title: "Create 3 conversion actions in Google Ads",
      description: "Without conversion tracking every rupee spent is unmeasured. Takes 30 minutes.",
      cta: "Open Conversions", ctaUrl: "https://ads.google.com/aw/conversions" }

  if (!checklist.gtmTagsPublished)
    return { id: "gtm", urgency: "critical", external: true,
      title: "Publish conversion tags in Google Tag Manager",
      description: "Conversion actions exist but the tags are not live. Open GTM-5JMGCKRW and publish.",
      cta: "Open Tag Manager", ctaUrl: "https://tagmanager.google.com" }

  if (ads.status !== "ENABLED")
    return { id: "enable", urgency: "critical", external: true,
      title: "Enable your campaign",
      description: "Campaign is ready but paused. Find 'Funnel A — Dealer Acquisition' in Google Ads and enable it.",
      cta: "Open Campaigns", ctaUrl: "https://ads.google.com/aw/campaigns" }

  if (leads.oemNew > 0)
    return { id: "oem_followup", urgency: "critical", external: false,
      title: `Call ${leads.oemNew} new OEM enquir${leads.oemNew === 1 ? "y" : "ies"} now`,
      description: "OEM authorization requests are your highest-value leads. Respond within 4 hours.",
      cta: "View OEM Leads", ctaUrl: "/admin/growth/contact-this-week" }

  if (leads.dealerNew > 0)
    return { id: "dealer_followup", urgency: "high", external: false,
      title: `Call ${leads.dealerNew} new dealer lead${leads.dealerNew === 1 ? "" : "s"}`,
      description: "New dealer enquiries from the last 48 hours. First-mover response wins the deal.",
      cta: "View Dealer Leads", ctaUrl: "/admin/growth/contact-this-week" }

  if (ads.impressions === 0)
    return { id: "not_serving", urgency: "high", external: true,
      title: "Campaign is enabled but not serving ads",
      description: "Zero impressions. Check for disapproved ads, keyword policy violations, or zero budget.",
      cta: "Open Google Ads", ctaUrl: "https://ads.google.com/aw/campaigns" }

  if (cpl !== null && cpl > 2000 && ads.clicks > 20)
    return { id: "high_cpl", urgency: "high", external: true,
      title: `Cost per lead is ₹${Math.round(cpl)} — pause underperforming keywords`,
      description: "Budget is going to low-intent searches. Review the search term report and add negatives.",
      cta: "View Search Terms", ctaUrl: "https://ads.google.com/aw/keywords/search-terms" }

  if (leads.pendingApprovals > 0)
    return { id: "approvals", urgency: "normal", external: false,
      title: `Approve ${leads.pendingApprovals} pending recommendation${leads.pendingApprovals === 1 ? "" : "s"}`,
      description: "Budget and geo-targeting recommendations are waiting for your approval.",
      cta: "Open Review Queue", ctaUrl: "/admin/growth/ads/approval-queue" }

  const clickRate = ads.impressions > 0 ? ads.clicks / ads.impressions : null
  if (ads.impressions > 200 && clickRate !== null && clickRate < 0.01)
    return { id: "low_ctr", urgency: "normal", external: true,
      title: "Ad click rate is low — improve your headlines",
      description: `${(clickRate * 100).toFixed(2)}% CTR. Most searchers are not clicking. Test new headlines.`,
      cta: "Open Ads", ctaUrl: "https://ads.google.com/aw/ads" }

  if (ads.clicks > 20 && leads.leadsToday === 0 && leads.totalAttributed === 0)
    return { id: "no_conversion", urgency: "normal", external: false,
      title: "Clicks are arriving but nobody is filling the form",
      description: `${ads.clicks} clicks today with 0 form submissions. The landing page may not match search intent.`,
      cta: "Review Landing Pages", ctaUrl: "/admin/growth/paid" }

  return { id: "monitor", urgency: "normal", external: false,
    title: "System healthy — check results in 24 hours",
    description: "Campaign is active and converting. Review lead quality and call your top prospects.",
    cta: "View Leads", ctaUrl: "/admin/growth/contact-this-week" }
}

// ── Funnel bottleneck ─────────────────────────────────────────────────────────

function detectBottleneck(
  impressions: number, clicks: number, rfqs: number,
  dealerLeads: number, oemLeads: number,
): string | null {
  if (impressions === 0) return null
  const base = impressions
  const drops = [
    { stage: "clicks",       drop: (impressions - clicks)     / base },
    { stage: "rfqs",         drop: (clicks - rfqs)            / base },
    { stage: "dealerLeads",  drop: (rfqs - dealerLeads)       / base },
    { stage: "oemLeads",     drop: (dealerLeads - oemLeads)   / base },
  ].filter(d => d.drop > 0)
  if (!drops.length) return null
  return drops.reduce((a, b) => a.drop > b.drop ? a : b).stage
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET() {
  const db = (await clientPromise).db()

  // Date helpers
  const now        = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const h48ago     = new Date(now.getTime() - 48 * 60 * 60 * 1000)

  // Settings + checklist
  const settings  = await db.collection("ads_settings").findOne({})
  const checklist = (settings?.launchChecklist ?? {}) as Record<string, boolean>

  // Lead counts (parallel)
  const [
    leadsToday,
    dealerMonth,
    oemMonth,
    dealerNew,      // dealer leads in last 48h (uncontacted proxy)
    oemNew,
    totalAttributed,
    pendingApprovals,
  ] = await Promise.all([
    db.collection("rfq_popup_leads").countDocuments({ createdAt: { $gte: todayStart } }),
    db.collection("rfq_popup_leads").countDocuments({
      createdAt: { $gte: monthStart },
      $or: [{ landingPage: DEALER_PAGES }],
    }),
    db.collection("rfq_popup_leads").countDocuments({
      createdAt: { $gte: monthStart },
      landingPage: OEM_PAGES,
    }),
    db.collection("rfq_popup_leads").countDocuments({
      createdAt: { $gte: h48ago },
      $or: [{ landingPage: DEALER_PAGES }],
    }),
    db.collection("rfq_popup_leads").countDocuments({
      createdAt: { $gte: h48ago },
      landingPage: OEM_PAGES,
    }),
    db.collection("rfq_popup_leads").countDocuments({ "utm.source": "google" }),
    db.collection("ads_approval_queue").countDocuments({ status: "pending" }),
  ])

  // Google Ads live data
  const adsSettings = await getAdsSettings()
  const ads = adsSettings
    ? await adsToday(adsSettings.customerId, adsSettings.loginCustomerId)
    : { impressions: 0, clicks: 0, spendINR: 0, status: "UNKNOWN" }

  // Derived metrics
  const cpl: number | null = ads.spendINR > 0 && leadsToday > 0
    ? Math.round(ads.spendINR / leadsToday)
    : null

  const clickRate = ads.impressions > 0 ? ads.clicks / ads.impressions : null
  const convRate  = ads.clicks > 0 ? leadsToday / ads.clicks : null

  // All-time search term clicks (first paid click detection)
  const everClicked = await db.collection("ads_searchterm_rows")
    .countDocuments({ clicks: { $gt: 0 } }).then(n => n > 0)

  // Next Best Action
  const nextAction = buildNextAction(
    checklist, ads,
    { leadsToday, oemNew, dealerNew, pendingApprovals, totalAttributed },
    cpl,
  )

  // Funnel
  const rfqsToday    = leadsToday
  const dealerToday  = await db.collection("rfq_popup_leads").countDocuments({
    createdAt: { $gte: todayStart }, $or: [{ landingPage: DEALER_PAGES }],
  })
  const oemToday     = await db.collection("rfq_popup_leads").countDocuments({
    createdAt: { $gte: todayStart }, landingPage: OEM_PAGES,
  })
  const bottleneck   = detectBottleneck(ads.impressions, ads.clicks, rfqsToday, dealerToday, oemToday)

  return NextResponse.json({
    revenue: {
      revenueToday:        0,         // deal tracking not yet configured
      leadsToday,
      dealerLeadsThisMonth: dealerMonth,
      oemLeadsThisMonth:    oemMonth,
      adSpendToday:         Math.round(ads.spendINR * 100) / 100,
      costPerLead:          cpl,
    },
    campaign: {
      status:   ads.status,         // ENABLED | PAUSED | REMOVED | UNKNOWN
      live:     ads.status === "ENABLED",
    },
    funnel: {
      impressions:     ads.impressions,
      clicks:          ads.clicks,
      landingVisits:   null,         // requires GA4 — not yet connected
      rfqs:            rfqsToday,
      dealerLeads:     dealerToday,
      oemLeads:        oemToday,
      clickRate,
      convRate,
      bottleneck,      // stage name where biggest drop occurs
    },
    milestones: {
      firstPaidClick:      ads.clicks > 0 || everClicked,
      firstAttributedLead: totalAttributed > 0,
      firstDealerLead:     dealerMonth > 0,
      firstOEMLead:        oemMonth > 0,
    },
    nextAction,
    checkedAt: now.toISOString(),
  })
}
