import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

export interface WeeklyAction {
  rank: number
  channel: "seo" | "ads" | "dealer" | "procurement"
  title: string
  why: string
  effort: string
  expected_impact: string
  source: string
  href: string
}

export interface WeeklyPlanData {
  generated_at: string
  week_start: string
  week_end: string
  actions: WeeklyAction[]
  summary: {
    seo: number
    ads: number
    dealer: number
    procurement: number
    total: number
  }
  top3_message: string
}

function mondayOfWeek(d: Date): Date {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const db = (await clientPromise).db()

    const now = new Date()
    const weekStart = mondayOfWeek(new Date(now))
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    // ── Parallel data fetch ──────────────────────────────────────────────────
    const [
      pendingRecs,
      openOpps,
      dealerPipeline,
      gscNearWins,
      seoItems,
      adsItems,
    ] = await Promise.all([
      // Director recs — pending, sorted by expected impact
      db.collection("director_recommendations")
        .find({ status: "pending" })
        .sort({ expected_revenue_impact: -1 })
        .limit(20)
        .toArray(),

      // Open opportunities (not won/lost)
      db.collection("crm_opportunities")
        .find({ stage: { $nin: ["won", "lost"] } })
        .sort({ value: -1 })
        .limit(10)
        .toArray(),

      // Active dealer pipeline
      db.collection("crm_dealers")
        .find({ stage: { $nin: ["active_dealer", "lost"] } })
        .sort({ expected_revenue: -1 })
        .limit(10)
        .toArray(),

      // GSC near-wins
      db.collection("gsc_query_rows")
        .find({ position: { $gte: 4, $lte: 15 }, impressions: { $gte: 100 } })
        .sort({ impressions: -1 })
        .limit(10)
        .toArray(),

      // SEO items in progress
      db.collection("seo_workflow_items")
        .find({ stage: { $nin: ["published", "rejected"] } })
        .sort({ created_at: -1 })
        .limit(5)
        .toArray(),

      // Ads items pending
      db.collection("ads_workflow_items")
        .find({ stage: { $nin: ["deployed", "rejected"] } })
        .sort({ created_at: -1 })
        .limit(5)
        .toArray(),
    ])

    const actions: WeeklyAction[] = []
    let rank = 1

    // ── SEO priorities ────────────────────────────────────────────────────────
    const topNearWin = gscNearWins[0]
    if (topNearWin) {
      actions.push({
        rank: rank++,
        channel: "seo",
        title: `Optimize title tag for "${String(topNearWin.query || "").slice(0, 50)}"`,
        why: `Position ${Number(topNearWin.position || 0).toFixed(1)} with ${Number(topNearWin.impressions || 0).toLocaleString()} impressions — within striking distance of page 1 top`,
        effort: "30 min",
        expected_impact: `+${Math.round(Number(topNearWin.impressions || 0) * 0.03)} clicks/month if CTR improves to 3%`,
        source: "GSC Near-Win Data",
        href: "/admin/growth/reports",
      })
    }

    const seoLandingPageRecs = pendingRecs.filter((r) => r.type === "landing_page_create").slice(0, 2)
    for (const rec of seoLandingPageRecs) {
      actions.push({
        rank: rank++,
        channel: "seo",
        title: `Create landing page: ${String(rec.title || "").replace("Create landing page for", "").trim()}`,
        why: String(rec.why_now || rec.evidence || "High-demand keyword with no dedicated landing page"),
        effort: "Half day",
        expected_impact: `${rec.expected_revenue_impact >= 1e5 ? `₹${(rec.expected_revenue_impact / 1e5).toFixed(1)}L` : `₹${Math.round(rec.expected_revenue_impact).toLocaleString()}`} estimated`,
        source: "Revenue Director",
        href: "/admin/growth/director",
      })
    }

    if (seoItems.length > 0) {
      const item = seoItems[0]
      actions.push({
        rank: rank++,
        channel: "seo",
        title: `Advance SEO item: ${String(item.title || item.keyword || "In-progress SEO work")}`,
        why: `Currently at stage "${String(item.stage || "in_progress")}" — move to next stage this week`,
        effort: "1 hour",
        expected_impact: "Landing page published = organic traffic + lead capture",
        source: "SEO Workflow",
        href: "/admin/growth/seo/workflow",
      })
    }

    // ── Ads priorities ────────────────────────────────────────────────────────
    const negativeKwRecs = pendingRecs.filter((r) => r.type === "negative_keyword").slice(0, 1)
    for (const rec of negativeKwRecs) {
      actions.push({
        rank: rank++,
        channel: "ads",
        title: `Add negative keywords: ${String(rec.title || "").slice(0, 60)}`,
        why: String(rec.why_now || "Wasted spend on irrelevant search terms"),
        effort: "5 min",
        expected_impact: `Save ${rec.expected_revenue_impact >= 1e5 ? `₹${(rec.expected_revenue_impact / 1e5).toFixed(1)}L` : `₹${Math.round(rec.expected_revenue_impact).toLocaleString()}`} in wasted spend`,
        source: "Revenue Director",
        href: "/admin/growth/director",
      })
    }

    const campaignRecs = pendingRecs
      .filter((r) => ["search_campaign", "customer_match_campaign", "remarketing_campaign"].includes(r.type))
      .slice(0, 1)
    for (const rec of campaignRecs) {
      actions.push({
        rank: rank++,
        channel: "ads",
        title: String(rec.title || "Launch recommended campaign"),
        why: String(rec.why_now || rec.evidence || ""),
        effort: "1 hour",
        expected_impact: `${rec.expected_revenue_impact >= 1e5 ? `₹${(rec.expected_revenue_impact / 1e5).toFixed(1)}L` : `₹${Math.round(rec.expected_revenue_impact).toLocaleString()}`} pipeline`,
        source: "Revenue Director",
        href: "/admin/growth/director",
      })
    }

    if (adsItems.length > 0) {
      const item = adsItems[0]
      actions.push({
        rank: rank++,
        channel: "ads",
        title: `Advance ads item: ${String(item.title || item.name || "In-progress ad")}`,
        why: `At stage "${String(item.stage || "recommendation")}" — needs approval to move forward`,
        effort: "30 min",
        expected_impact: "Campaign live = impressions + leads",
        source: "Ads Workflow",
        href: "/admin/growth/ads/workflow",
      })
    }

    // ── Dealer priorities ─────────────────────────────────────────────────────
    const dealerRecs = pendingRecs.filter((r) => r.type === "dealer_recruit").slice(0, 2)
    for (const rec of dealerRecs) {
      actions.push({
        rank: rank++,
        channel: "dealer",
        title: String(rec.title || "Recruit dealer"),
        why: String(rec.why_now || rec.evidence || "Untapped state with high procurement volume"),
        effort: "30 min",
        expected_impact: `${rec.expected_revenue_impact >= 1e5 ? `₹${(rec.expected_revenue_impact / 1e5).toFixed(1)}L` : `₹${Math.round(rec.expected_revenue_impact).toLocaleString()}`} potential`,
        source: "Revenue Director",
        href: "/admin/growth/director",
      })
    }

    const staleDealers = dealerPipeline.filter((d) => {
      if (!d.next_followup_at) return true
      return new Date(d.next_followup_at) <= now
    }).slice(0, 2)
    for (const dealer of staleDealers) {
      actions.push({
        rank: rank++,
        channel: "dealer",
        title: `Follow up: ${String(dealer.company || dealer.name || "Dealer")} (${String(dealer.state || "")})`,
        why: `Stage: ${String(dealer.stage || "lead")} — follow-up due${dealer.next_followup_at ? ` (${new Date(dealer.next_followup_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })})` : ""}`,
        effort: "15 min",
        expected_impact: `₹${Number(dealer.expected_revenue || 0).toLocaleString()} expected revenue`,
        source: "Dealer CRM",
        href: "/admin/growth/crm/dealers",
      })
    }

    // ── Procurement priorities ────────────────────────────────────────────────
    const oemRecs = pendingRecs.filter((r) => r.type === "oem_displacement").slice(0, 2)
    for (const rec of oemRecs) {
      actions.push({
        rank: rank++,
        channel: "procurement",
        title: String(rec.title || "OEM displacement opportunity"),
        why: String(rec.why_now || rec.evidence || "Incumbent OEM contract up for renewal"),
        effort: "1 hour",
        expected_impact: `${rec.expected_revenue_impact >= 1e7 ? `₹${(rec.expected_revenue_impact / 1e7).toFixed(1)}Cr` : rec.expected_revenue_impact >= 1e5 ? `₹${(rec.expected_revenue_impact / 1e5).toFixed(1)}L` : `₹${Math.round(rec.expected_revenue_impact).toLocaleString()}`} contract`,
        source: "Revenue Director",
        href: "/admin/growth/director",
      })
    }

    const highValueOpps = openOpps.slice(0, 2)
    for (const opp of highValueOpps) {
      actions.push({
        rank: rank++,
        channel: "procurement",
        title: `Advance: ${String(opp.name || "Open opportunity")}`,
        why: `${String(opp.organization || "")} · Stage: ${String(opp.stage || "identified")} · ${Number(opp.probability || 50)}% probability`,
        effort: "30 min",
        expected_impact: `₹${Number(opp.value || 0) >= 1e7 ? `${(Number(opp.value || 0) / 1e7).toFixed(1)}Cr` : Number(opp.value || 0) >= 1e5 ? `${(Number(opp.value || 0) / 1e5).toFixed(1)}L` : Math.round(Number(opp.value || 0)).toLocaleString()} pipeline`,
        source: "Opportunity CRM",
        href: "/admin/growth/crm/opportunities",
      })
    }

    // Re-rank in final order
    actions.forEach((a, i) => { a.rank = i + 1 })

    const summary = {
      seo: actions.filter((a) => a.channel === "seo").length,
      ads: actions.filter((a) => a.channel === "ads").length,
      dealer: actions.filter((a) => a.channel === "dealer").length,
      procurement: actions.filter((a) => a.channel === "procurement").length,
      total: actions.length,
    }

    const topActions = actions.slice(0, 3)
    const top3Message = topActions.length > 0
      ? `This week, prioritize: ${topActions.map((a) => a.title.slice(0, 40)).join(" → ")}`
      : "Run Revenue Director first to generate this week's priorities."

    return NextResponse.json({
      generated_at: now.toISOString(),
      week_start: weekStart.toISOString().split("T")[0],
      week_end: weekEnd.toISOString().split("T")[0],
      actions,
      summary,
      top3_message: top3Message,
    } satisfies WeeklyPlanData)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
