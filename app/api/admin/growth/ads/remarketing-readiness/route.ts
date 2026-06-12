import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getAdsSettings, searchAds } from "@/lib/google-ads"
import { getValidAccessToken } from "@/lib/google-oauth"

export const dynamic = "force-dynamic"

// ── Types ─────────────────────────────────────────────────────────────────────

interface CheckResult {
  id:          string
  label:       string
  status:      "pass" | "warn" | "fail" | "unknown"
  value:       string
  detail:      string
  requirement: string
}

// ── Audience list query via GAQL ──────────────────────────────────────────────

async function getAudienceLists(customerId: string, loginCustomerId?: string) {
  try {
    const token = await getValidAccessToken()
    const cid   = customerId.replace(/-/g, "")
    const rows  = await searchAds(cid,
      `SELECT user_list.name, user_list.size_for_display, user_list.size_for_search,
              user_list.type, user_list.membership_status, user_list.eligible_for_display
       FROM user_list
       WHERE user_list.membership_status = 'OPEN'`,
      token, loginCustomerId,
    )
    return rows.map((r: Record<string, unknown>) => {
      const ul = r.userList as Record<string, unknown> | undefined
      return {
        name:             String(ul?.name ?? ""),
        sizeForDisplay:   Number(ul?.sizeForDisplay ?? 0),
        sizeForSearch:    Number(ul?.sizeForSearch ?? 0),
        type:             String(ul?.type ?? ""),
        eligibleForDisplay: Boolean(ul?.eligibleForDisplay),
      }
    })
  } catch {
    return null
  }
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET() {
  const db = (await clientPromise).db()

  const checks: CheckResult[] = []

  // ── Check 1: GTM tag configured ───────────────────────────────────────────
  const adsSettings = await db.collection("ads_settings").findOne({})
  const gtmId = adsSettings?.gtmContainerId ?? process.env.NEXT_PUBLIC_GTM_CONTAINER_ID ?? null
  checks.push({
    id:          "gtm_tag",
    label:       "Google Tag Manager installed",
    status:      gtmId ? "pass" : "fail",
    value:       gtmId ?? "Not set",
    detail:      gtmId
      ? `GTM container ${gtmId} is configured. Remarketing tag can be deployed through it.`
      : "No GTM container ID found in ads_settings or environment variables. GTM-5JMGCKRW is hardcoded in layout.tsx — update NEXT_PUBLIC_GTM_CONTAINER_ID in Vercel to register it properly.",
    requirement: "GTM must be installed to deploy a Google Ads Remarketing tag",
  })

  // ── Check 2: Google Ads audience lists ────────────────────────────────────
  const googleAdsSettings = await getAdsSettings()
  let audienceCheck: CheckResult
  if (!googleAdsSettings) {
    audienceCheck = {
      id:          "audience_lists",
      label:       "Google Ads audience lists",
      status:      "unknown",
      value:       "API not connected",
      detail:      "Google Ads API settings not found. Connect the Ads account to check audience list sizes.",
      requirement: "Remarketing audience must have >= 1,000 members for Search and >= 100 for Display",
    }
  } else {
    const audiences = await getAudienceLists(googleAdsSettings.customerId, googleAdsSettings.loginCustomerId)
    if (audiences === null) {
      audienceCheck = {
        id:          "audience_lists",
        label:       "Google Ads audience lists",
        status:      "unknown",
        value:       "Query failed",
        detail:      "Could not fetch audience lists from Google Ads API. This is expected if no remarketing tags have been deployed yet.",
        requirement: "Remarketing audience must have >= 1,000 members for Search and >= 100 for Display",
      }
    } else if (audiences.length === 0) {
      audienceCheck = {
        id:          "audience_lists",
        label:       "Google Ads audience lists",
        status:      "fail",
        value:       "0 audiences",
        detail:      "No open audience lists exist in Google Ads. You need to create a website visitor list after deploying the remarketing tag.",
        requirement: "Remarketing audience must have >= 1,000 members for Search and >= 100 for Display",
      }
    } else {
      const maxSearch  = Math.max(...audiences.map(a => a.sizeForSearch))
      const maxDisplay = Math.max(...audiences.map(a => a.sizeForDisplay))
      const meetsSearch  = maxSearch  >= 1000
      const meetsDisplay = maxDisplay >= 100
      audienceCheck = {
        id:          "audience_lists",
        label:       "Google Ads audience lists",
        status:      meetsSearch ? "pass" : meetsDisplay ? "warn" : "fail",
        value:       `${audiences.length} list${audiences.length === 1 ? "" : "s"} — largest: ${maxSearch.toLocaleString()} (Search) / ${maxDisplay.toLocaleString()} (Display)`,
        detail:      meetsSearch
          ? `${audiences.length} audience list(s) active. Largest Search list has ${maxSearch.toLocaleString()} members — meets the 1,000 minimum for Search remarketing.`
          : `Largest audience has ${maxSearch.toLocaleString()} Search members. Need 1,000+ for Search remarketing campaigns.`,
        requirement: "Remarketing audience must have >= 1,000 members for Search and >= 100 for Display",
      }
    }
  }
  checks.push(audienceCheck)

  // ── Check 3: Website traffic (paid clicks in last 30 days) ────────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000)
  const [paidClicks30d, totalClicks30d] = await Promise.all([
    db.collection("ads_campaign_rows")
      .aggregate([
        { $match: { date: { $gte: thirtyDaysAgo.toISOString().slice(0, 10) } } },
        { $group: { _id: null, total: { $sum: "$clicks" } } },
      ])
      .toArray()
      .then(r => r[0]?.total ?? 0),
    db.collection("ads_searchterm_rows")
      .aggregate([
        { $match: { date: { $gte: thirtyDaysAgo.toISOString().slice(0, 10) } } },
        { $group: { _id: null, total: { $sum: "$clicks" } } },
      ])
      .toArray()
      .then(r => r[0]?.total ?? 0),
  ])
  const totalTraffic = paidClicks30d + totalClicks30d
  checks.push({
    id:          "website_traffic",
    label:       "Website traffic (paid clicks, 30 days)",
    status:      totalTraffic >= 1000 ? "pass" : totalTraffic >= 100 ? "warn" : "fail",
    value:       `${totalTraffic.toLocaleString()} paid clicks`,
    detail:      totalTraffic >= 1000
      ? `${totalTraffic.toLocaleString()} paid clicks in the last 30 days. Audience is growing fast enough to support remarketing.`
      : totalTraffic > 0
      ? `Only ${totalTraffic.toLocaleString()} paid clicks in the last 30 days. Need ~100+ monthly visitors to build an audience over time. Organic traffic is not tracked (GA4 not integrated).`
      : "No paid traffic data found. Account may be unfunded or campaign not yet running.",
    requirement: "Need >= 100 paid clicks/month to build a remarketing audience within 90 days",
  })

  // ── Check 4: CRM size (Customer Match eligibility) ────────────────────────
  const [rfqCount, brochureCount] = await Promise.all([
    db.collection("rfq_popup_leads").countDocuments(),
    db.collection("brochure_leads").countDocuments(),
  ])
  const crmSize = rfqCount + brochureCount
  checks.push({
    id:          "customer_match",
    label:       "Customer Match eligibility (CRM size)",
    status:      crmSize >= 1000 ? "pass" : crmSize >= 100 ? "warn" : "fail",
    value:       `${crmSize.toLocaleString()} contacts (${rfqCount} RFQ + ${brochureCount} brochure)`,
    detail:      crmSize >= 1000
      ? `${crmSize.toLocaleString()} CRM contacts. Google Customer Match requires 1,000+ email matches to serve ads — you meet this threshold.`
      : crmSize >= 100
      ? `${crmSize.toLocaleString()} contacts. Customer Match needs 1,000+ emails that Google can match. You have ${1000 - crmSize} to go.`
      : `Only ${crmSize.toLocaleString()} contacts in CRM. Customer Match is not viable yet. Focus on building the contact list first.`,
    requirement: "Google Customer Match requires >= 1,000 matched emails to create a usable audience",
  })

  // ── Check 5: GA4 integration ──────────────────────────────────────────────
  checks.push({
    id:          "ga4_integration",
    label:       "GA4 audience integration",
    status:      "unknown",
    value:       "Not integrated",
    detail:      "GA4 is not connected to this platform. Organic and direct website traffic is not tracked here. Remarketing audiences from GA4 (all-traffic visitors) are not available. Only Google Ads first-party audiences (paid clicks) are accessible.",
    requirement: "GA4 integration provides all-traffic audience data — not required but dramatically improves remarketing reach",
  })

  // ── Check 6: Conversion tracking (required for Smart Remarketing) ─────────
  const launchChecklist = (adsSettings?.launchChecklist ?? {}) as Record<string, boolean>
  const convTrackingOk  = Boolean(launchChecklist.conversionActionsCreated && launchChecklist.gtmTagsPublished)
  checks.push({
    id:          "conversion_tracking",
    label:       "Conversion tracking active",
    status:      convTrackingOk ? "pass" : "fail",
    value:       convTrackingOk ? "Active" : "Not configured",
    detail:      convTrackingOk
      ? "Conversion actions created and GTM tags published. Required for Smart Remarketing (Target CPA / Target ROAS bidding)."
      : "Conversion tracking is not confirmed active. Smart Remarketing and value-based bidding require conversion data. Complete the launch checklist first.",
    requirement: "Conversion tracking must be active to use Smart Remarketing bidding strategies",
  })

  // ── Verdict ───────────────────────────────────────────────────────────────
  const fails   = checks.filter(c => c.status === "fail")
  const unknowns = checks.filter(c => c.status === "unknown")

  let verdict: "YES" | "NO" | "NOT_YET"
  let verdictReason: string

  if (fails.length === 0 && unknowns.length <= 1) {
    verdict = "YES"
    verdictReason = "All critical prerequisites are met. You can build and deploy a Search Remarketing campaign."
  } else if (fails.length >= 3 || fails.some(f => ["gtm_tag", "audience_lists"].includes(f.id))) {
    verdict = "NO"
    verdictReason = `${fails.length} critical prerequisite${fails.length === 1 ? "" : "s"} not met: ${fails.map(f => f.label).join(", ")}. Fix these before building any remarketing campaign.`
  } else {
    verdict = "NOT_YET"
    verdictReason = `${fails.length} issue${fails.length === 1 ? "" : "s"} to resolve before remarketing campaigns can be effective. These are fixable within 30–90 days.`
  }

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    verdict,
    verdictReason,
    checks,
    summary: {
      pass:    checks.filter(c => c.status === "pass").length,
      warn:    checks.filter(c => c.status === "warn").length,
      fail:    checks.length - checks.filter(c => ["pass", "warn"].includes(c.status)).length,
      unknown: unknowns.length,
      total:   checks.length,
    },
    estimatedAudienceBuildTime: totalTraffic >= 100
      ? `~${Math.ceil(1000 / Math.max(totalTraffic, 1))} months to reach 1,000 audience members at current traffic`
      : "Cannot estimate — no paid traffic data",
  })
}
