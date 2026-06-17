/**
 * Landing Page Factory API
 * GET  — preflight: plans + opportunities from all 4 sources
 * POST — generate landing page draft from opportunity
 */
import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { runLandingPageFactory, COLL_LANDING_PLANS } from "@/lib/growth-os/landing-page-factory"
import type { LandingPageFactoryInput, OpportunitySource } from "@/lib/growth-os/landing-page-factory"

export const maxDuration = 120
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const db = (await clientPromise).db()

    const [plans, seoRecs, dealers, contracts, adsCampaigns] = await Promise.all([
      db.collection(COLL_LANDING_PLANS)
        .find({})
        .sort({ createdAt: -1 })
        .limit(30)
        .toArray(),

      // SEO opportunities
      db.collection("seo_recommendations")
        .find({ status: { $in: ["pending", "approved"] } })
        .sort({ priority: 1 })
        .limit(15)
        .toArray(),

      // Dealer opportunities — high opportunity_score
      db.collection("gem_dealers")
        .find({ opportunity_score: { $gt: 0 } })
        .sort({ opportunity_score: -1 })
        .limit(8)
        .toArray(),

      // Procurement opportunities — recent fogging contracts
      db.collection("fogging_contracts")
        .find({})
        .sort({ total_contract_value: -1 })
        .limit(8)
        .toArray(),

      // Ads opportunities — pending or active campaigns
      db.collection("ads_campaign_plans")
        .find({ status: { $in: ["pending_approval", "active", "draft"] } })
        .sort({ createdAt: -1 })
        .limit(8)
        .toArray(),
    ])

    const plannedIds = new Set(plans.map(p => p.opportunityId))

    const opportunities = [
      ...seoRecs.map(r => ({
        id:          String(r._id),
        source:      "seo" as OpportunitySource,
        title:       r.title ?? `SEO: ${r.target_keyword ?? r.url ?? ""}`,
        keyword:     r.target_keyword ?? r.url?.split("/").pop()?.replace(/-/g, " ") ?? "",
        targetUrl:   r.url ?? "/",
        pageType:    r.content_type ?? "landing_page",
        priority:    r.priority ?? "medium",
        context:     r.current_state ?? "",
        expectedClicks: r.expected_clicks ?? 0,
        hasPlan:     plannedIds.has(String(r._id)),
      })),
      ...dealers.map(d => ({
        id:          String(d._id),
        source:      "dealer" as OpportunitySource,
        title:       `Dealer: ${d.canonical_name ?? d.name ?? "Unknown"}`,
        keyword:     `thermal fogging machine dealer ${(d.state ?? d.city ?? "India")}`,
        targetUrl:   `/become-a-dealer/${(d.canonical_name ?? "dealer").toLowerCase().replace(/\s+/g, "-")}`,
        pageType:    "dealer_page",
        priority:    (d.opportunity_score ?? 0) > 70 ? "high" : "medium",
        context:     `GeM contracts: ${d.total_contracts ?? 0}, score: ${d.opportunity_score ?? 0}`,
        expectedClicks: 0,
        hasPlan:     plannedIds.has(String(d._id)),
      })),
      ...contracts.map(c => ({
        id:          String(c._id),
        source:      "procurement" as OpportunitySource,
        title:       `Procurement: ${c.buyer_organisation ?? c.item_description ?? "Government Buyer"}`,
        keyword:     c.item_description ?? "thermal fogging machine government supply",
        targetUrl:   `/procurement/${(c.gemc_no ?? String(c._id)).replace(/\//g, "-")}`,
        pageType:    "procurement_page",
        priority:    (c.total_contract_value ?? 0) > 500000 ? "high" : "medium",
        context:     `Value: ₹${(c.total_contract_value ?? 0).toLocaleString("en-IN")}, buyer: ${c.buyer_organisation ?? ""}`,
        expectedClicks: 0,
        hasPlan:     plannedIds.has(String(c._id)),
      })),
      ...adsCampaigns.map(c => ({
        id:          c.planId ?? String(c._id),
        source:      "ads" as OpportunitySource,
        title:       `Ads: ${c.campaignName ?? c.keyword ?? "Campaign"}`,
        keyword:     c.keyword ?? c.targetKeyword ?? "fogging machine",
        targetUrl:   c.landingPageUrl ?? `/ads/${(c.planId ?? String(c._id)).slice(-8)}`,
        pageType:    "ads_landing_page",
        priority:    "high",
        context:     `Funnel: ${c.funnelType ?? ""}, budget: ₹${c.budget ?? 0}/day`,
        expectedClicks: c.estimatedClicks ?? 0,
        hasPlan:     plannedIds.has(c.planId ?? String(c._id)),
      })),
    ]

    const hasApiKey = !!(process.env.ANTHROPIC_API_KEY || "").trim()

    return NextResponse.json({
      apiKeyConfigured: hasApiKey,
      totalPlans:       plans.length,
      pendingApproval:  plans.filter(p => p.status === "draft").length,
      published:        plans.filter(p => p.status === "published").length,
      tracking:         plans.filter(p => p.status === "tracking").length,
      plans:            plans.map(({ _id, ...rest }) => rest),
      opportunities,
      sourceBreakdown: {
        seo:         seoRecs.length,
        dealer:      dealers.length,
        procurement: contracts.length,
        ads:         adsCampaigns.length,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Partial<LandingPageFactoryInput>

    const { opportunityId, source, keyword, targetUrl, pageType, priority, sourceContext } = body
    if (!keyword || !targetUrl || !source) {
      return NextResponse.json(
        { error: "keyword, targetUrl, and source are required" },
        { status: 400 },
      )
    }

    const result = await runLandingPageFactory({
      opportunityId: opportunityId ?? `manual_${Date.now()}`,
      source:        source as OpportunitySource,
      keyword:       keyword.trim(),
      targetUrl:     targetUrl.trim(),
      pageType:      pageType ?? "landing_page",
      priority:      priority ?? "medium",
      sourceContext,
    })

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error("[landing/factory] error:", String(err))
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
