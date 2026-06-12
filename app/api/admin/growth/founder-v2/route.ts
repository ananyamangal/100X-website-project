import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getAdsSettings, searchAds } from "@/lib/google-ads"
import { getValidAccessToken } from "@/lib/google-oauth"

export const dynamic = "force-dynamic"

const DEALER_PAGES = /dealer|gem-oem|government|oem-auth/i
const OEM_PAGES    = /gem-oem|oem-auth/i

// Google Ads: today campaign metrics

async function adsToday(customerId: string, campaignId: string, loginCustomerId?: string) {
  if (!campaignId) return { impressions: 0, clicks: 0, spendINR: 0, status: "NOT_CONFIGURED" }
  try {
    const token = await getValidAccessToken()
    const cid   = customerId.replace(/-/g, "")
    const [metricRows, statusRows] = await Promise.all([
      searchAds(cid,
        `SELECT metrics.impressions, metrics.clicks, metrics.cost_micros FROM campaign WHERE campaign.id = '${campaignId}' AND segments.date DURING TODAY`,
        token, loginCustomerId),
      searchAds(cid,
        `SELECT campaign.status FROM campaign WHERE campaign.id = '${campaignId}'`,
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

// Next Best Action

interface NextAction {
  id:             string
  title:          string
  description:    string
  cta:            string
  ctaUrl:         string
  urgency:        "critical" | "high" | "normal"
  external:       boolean
  expectedResult: string
  explain: {
    dataUsed:        string
    assumptions:     string
    confidenceScore: number
  }
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
      description: "Without a balance your campaign cannot serve a single ad. Add Rs.2,000 to begin.",
      cta: "Open Billing", ctaUrl: "https://ads.google.com/aw/billing/summary",
      expectedResult: "Campaign starts serving within 15 minutes of the balance clearing. First impressions visible in Google Ads dashboard.",
      explain: {
        dataUsed: "ads_settings.launchChecklist.accountFunded = null (not set)",
        assumptions: "Google Ads billing processes UPI/card payments within 15 minutes of authorization.",
        confidenceScore: 99,
      },
    }

  if (!checklist.conversionActionsCreated)
    return { id: "conversions", urgency: "critical", external: true,
      title: "Create 3 conversion actions in Google Ads",
      description: "Without conversion tracking every rupee spent is unmeasured. Takes 30 minutes.",
      cta: "Open Conversions", ctaUrl: "https://ads.google.com/aw/conversions",
      expectedResult: "Every form submission, WhatsApp click, and phone call is counted. Google can now optimize bids toward leads, not just clicks.",
      explain: {
        dataUsed: "ads_settings.launchChecklist.conversionActionsCreated = null (not set)",
        assumptions: "GTM container GTM-5JMGCKRW is installed on the live website and tags will fire once published.",
        confidenceScore: 95,
      },
    }

  if (!checklist.gtmTagsPublished)
    return { id: "gtm", urgency: "critical", external: true,
      title: "Publish conversion tags in Google Tag Manager",
      description: "Conversion actions exist but the tags are not live. Open GTM-5JMGCKRW and publish.",
      cta: "Open Tag Manager", ctaUrl: "https://tagmanager.google.com",
      expectedResult: "Conversion tags go live on the website. Each lead is attributed to the exact keyword and ad that generated it.",
      explain: {
        dataUsed: "ads_settings.launchChecklist.gtmTagsPublished = null (not set)",
        assumptions: "Conversion actions have already been created in Google Ads. Tags are staged in GTM but not yet published to production.",
        confidenceScore: 95,
      },
    }

  if (ads.status !== "ENABLED")
    return { id: "enable", urgency: "critical", external: true,
      title: "Enable your campaign",
      description: "Campaign is ready but paused. Find 'Funnel A - Dealer Acquisition' in Google Ads and enable it.",
      cta: "Open Campaigns", ctaUrl: "https://ads.google.com/aw/campaigns",
      expectedResult: "Ads start serving immediately after enabling. First impressions visible within minutes in Google Ads.",
      explain: {
        dataUsed: `Google Ads API live query: campaign.status = "${ads.status}" (required: ENABLED). Campaign ID resolved from most recent approved ads_deployments record.`,
        assumptions: "Account is funded and conversion tags are published. The campaign is structurally complete and only needs to be unpaused.",
        confidenceScore: 90,
      },
    }

  if (leads.oemNew > 0)
    return { id: "oem_followup", urgency: "critical", external: false,
      title: `Call ${leads.oemNew} new OEM enquir${leads.oemNew === 1 ? "y" : "ies"} now`,
      description: "OEM authorization requests are your highest-value leads. Respond within 4 hours.",
      cta: "View OEM Leads", ctaUrl: "/admin/growth/contact-this-week",
      expectedResult: "OEM leads contacted within 4 hours convert at 3-5x the rate of leads contacted the next day. Each OEM deal is worth Rs.5-15L.",
      explain: {
        dataUsed: `rfq_popup_leads: ${leads.oemNew} leads matching OEM pages in the last 48 hours`,
        assumptions: "No outbound contact has been made yet. Lead arrived organically or via ad and has not been followed up.",
        confidenceScore: 95,
      },
    }

  if (leads.dealerNew > 0)
    return { id: "dealer_followup", urgency: "high", external: false,
      title: `Call ${leads.dealerNew} new dealer lead${leads.dealerNew === 1 ? "" : "s"}`,
      description: "New dealer enquiries from the last 48 hours. First-mover response wins the deal.",
      cta: "View Dealer Leads", ctaUrl: "/admin/growth/contact-this-week",
      expectedResult: "Dealer leads engaged within 48 hours have the highest conversion rate in B2B. First contact establishes the trust relationship.",
      explain: {
        dataUsed: `rfq_popup_leads: ${leads.dealerNew} leads matching dealer pages in last 48 hours`,
        assumptions: "No outbound contact recorded yet. Leads may have originated from organic search or paid campaigns.",
        confidenceScore: 90,
      },
    }

  if (ads.impressions === 0)
    return { id: "not_serving", urgency: "high", external: true,
      title: "Campaign is enabled but not serving ads",
      description: "Zero impressions. Check for disapproved ads, keyword policy violations, or zero budget.",
      cta: "Open Google Ads", ctaUrl: "https://ads.google.com/aw/campaigns",
      expectedResult: "Impressions resume once the underlying issue is resolved. Most Google ad policy fixes clear within 1 business day.",
      explain: {
        dataUsed: `Google Ads API: campaign.status = ENABLED but metrics.impressions = 0 today. Account funded and checklist gates cleared.`,
        assumptions: "Most common causes: disapproved ad creatives, keyword policy violations, or budget exhaustion.",
        confidenceScore: 80,
      },
    }

  if (cpl !== null && cpl > 2000 && ads.clicks > 20)
    return { id: "high_cpl", urgency: "high", external: true,
      title: `Cost per lead is Rs.${Math.round(cpl)} - pause underperforming keywords`,
      description: "Budget is going to low-intent searches. Review the search term report and add negatives.",
      cta: "View Search Terms", ctaUrl: "https://ads.google.com/aw/keywords/search-terms",
      expectedResult: "Removing low-intent search terms concentrates budget on converting queries. CPL typically drops 20-40% within 7 days.",
      explain: {
        dataUsed: `Google Ads API: spend Rs.${Math.round(ads.spendINR)} / ${leads.leadsToday} leads today = Rs.${Math.round(cpl!)} CPL. Threshold: Rs.2,000. Clicks: ${ads.clicks}.`,
        assumptions: "High CPL indicates budget is going to informational or competitor-intent searches. Adding negative keywords will reclaim budget efficiency.",
        confidenceScore: 75,
      },
    }

  if (leads.pendingApprovals > 0)
    return { id: "approvals", urgency: "normal", external: false,
      title: `Approve ${leads.pendingApprovals} pending recommendation${leads.pendingApprovals === 1 ? "" : "s"}`,
      description: "Budget and geo-targeting recommendations are waiting for your approval.",
      cta: "Open Review Queue", ctaUrl: "/admin/growth/ads/approval-queue",
      expectedResult: "Each approved recommendation applies within 24 hours. Keyword and bid optimizations improve CPL incrementally over 7-14 days.",
      explain: {
        dataUsed: `ads_approval_queue: ${leads.pendingApprovals} items with status = "pending". Generated by the Growth OS Director agent.`,
        assumptions: "Recommendations are based on recent search term performance data. Each item has been scored and prioritized automatically.",
        confidenceScore: 70,
      },
    }

  const clickRate = ads.impressions > 0 ? ads.clicks / ads.impressions : null
  if (ads.impressions > 200 && clickRate !== null && clickRate < 0.01)
    return { id: "low_ctr", urgency: "normal", external: true,
      title: "Ad click rate is low - improve your headlines",
      description: `${(clickRate * 100).toFixed(2)}% CTR. Most searchers are not clicking. Test new headlines.`,
      cta: "Open Ads", ctaUrl: "https://ads.google.com/aw/ads",
      expectedResult: "Improved headlines matching search intent increase CTR. Expect 30-60% improvement with better headline-query alignment within 2 weeks.",
      explain: {
        dataUsed: `Google Ads API: ${ads.impressions} impressions, ${ads.clicks} clicks = ${(clickRate * 100).toFixed(2)}% CTR. B2B search benchmark: 1.0%.`,
        assumptions: "Low CTR indicates ad copy is not resonating with the searcher's intent. Headlines may be too generic or missing purchase-signal language.",
        confidenceScore: 75,
      },
    }

  if (ads.clicks > 20 && leads.leadsToday === 0 && leads.totalAttributed === 0)
    return { id: "no_conversion", urgency: "normal", external: false,
      title: "Clicks are arriving but nobody is filling the form",
      description: `${ads.clicks} clicks today with 0 form submissions. The landing page may not match search intent.`,
      cta: "Review Landing Pages", ctaUrl: "/admin/growth/paid",
      expectedResult: "Landing page improvements lift form submission rate. Expect 15-30% improvement within 7 days of fixing the primary conversion barrier.",
      explain: {
        dataUsed: `Google Ads API: ${ads.clicks} clicks today. rfq_popup_leads: 0 submissions today. revenue_attribution: ${leads.totalAttributed} attributed leads total.`,
        assumptions: "Traffic is reaching the landing page. Issue is in page content, CTA placement, form friction, or mobile experience.",
        confidenceScore: 70,
      },
    }

  return { id: "monitor", urgency: "normal", external: false,
    title: "System healthy - check results in 24 hours",
    description: "Campaign is active and converting. Review lead quality and call your top prospects.",
    cta: "View Leads", ctaUrl: "/admin/growth/contact-this-week",
    expectedResult: "Campaign continues optimizing automatically. Check back in 24 hours for updated conversion and CPL data.",
    explain: {
      dataUsed: "All launchChecklist items confirmed. Campaign ENABLED. Leads flowing. No active performance blockers detected.",
      assumptions: "System is operating as expected. No manual intervention required today.",
      confidenceScore: 85,
    },
  }
}

// Funnel bottleneck

function detectBottleneck(
  impressions: number, clicks: number, rfqs: number,
  dealerLeads: number, oemLeads: number,
): string | null {
  if (impressions === 0) return null
  const base = impressions
  const drops = [
    { stage: "clicks",       drop: (impressions - clicks)   / base },
    { stage: "rfqs",         drop: (clicks - rfqs)          / base },
    { stage: "dealerLeads",  drop: (rfqs - dealerLeads)     / base },
    { stage: "oemLeads",     drop: (dealerLeads - oemLeads) / base },
  ].filter(d => d.drop > 0)
  if (!drops.length) return null
  return drops.reduce((a, b) => a.drop > b.drop ? a : b).stage
}

// GET

export async function GET() {
  const db = (await clientPromise).db()

  const now        = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const h48ago     = new Date(now.getTime() - 48 * 60 * 60 * 1000)

  const settings  = await db.collection("ads_settings").findOne({})
  const checklist = (settings?.launchChecklist ?? {}) as Record<string, boolean>

  const [
    leadsToday,
    dealerMonth,
    oemMonth,
    dealerNew,
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

  // Resolve live campaign ID from most recent approved deployment
  const activeDeployment = await db.collection("ads_deployments").findOne(
    { state: "enabled", status: "approved" },
    { sort: { approvedAt: -1 }, projection: { "resourceNames.campaign": 1 } },
  )
  const liveCampaignId = activeDeployment
    ? String(activeDeployment.resourceNames?.campaign ?? "").split("/").pop() ?? ""
    : ""

  const adsSettings = await getAdsSettings()
  const ads = adsSettings
    ? await adsToday(adsSettings.customerId, liveCampaignId, adsSettings.loginCustomerId)
    : { impressions: 0, clicks: 0, spendINR: 0, status: "UNKNOWN" }

  const cpl: number | null = ads.spendINR > 0 && leadsToday > 0
    ? Math.round(ads.spendINR / leadsToday)
    : null

  const clickRate = ads.impressions > 0 ? ads.clicks / ads.impressions : null
  const convRate  = ads.clicks > 0 ? leadsToday / ads.clicks : null

  const everClicked = await db.collection("ads_searchterm_rows")
    .countDocuments({ clicks: { $gt: 0 } }).then(n => n > 0)

  const nextAction = buildNextAction(
    checklist, ads,
    { leadsToday, oemNew, dealerNew, pendingApprovals, totalAttributed },
    cpl,
  )

  const rfqsToday   = leadsToday
  const dealerToday = await db.collection("rfq_popup_leads").countDocuments({
    createdAt: { $gte: todayStart }, $or: [{ landingPage: DEALER_PAGES }],
  })
  const oemToday    = await db.collection("rfq_popup_leads").countDocuments({
    createdAt: { $gte: todayStart }, landingPage: OEM_PAGES,
  })
  const bottleneck  = detectBottleneck(ads.impressions, ads.clicks, rfqsToday, dealerToday, oemToday)

  return NextResponse.json({
    revenue: {
      revenueToday:         0,
      leadsToday,
      dealerLeadsThisMonth: dealerMonth,
      oemLeadsThisMonth:    oemMonth,
      adSpendToday:         Math.round(ads.spendINR * 100) / 100,
      costPerLead:          cpl,
    },
    campaign: {
      status:     ads.status,
      live:       ads.status === "ENABLED",
      campaignId: liveCampaignId || null,
    },
    funnel: {
      impressions:   ads.impressions,
      clicks:        ads.clicks,
      landingVisits: null,
      rfqs:          rfqsToday,
      dealerLeads:   dealerToday,
      oemLeads:      oemToday,
      clickRate,
      convRate,
      bottleneck,
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
