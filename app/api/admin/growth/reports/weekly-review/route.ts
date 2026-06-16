import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  // Default: last 7 days. Support ?weeks=N for historical
  const weeks = Math.min(parseInt(searchParams.get("weeks") ?? "1"), 12)
  const now = new Date()
  const windowStart = new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000)

  const client = await clientPromise
  const db = client.db()

  const [
    opportunitiesWon,
    opportunitiesLost,
    dealersActivated,
    opportunitiesOpen,
    seoPublished,
    adsCampaignsLaunched,
    directorApproved,
    directorWon,
    directorLost,
    dealerPipelineActive,
  ] = await Promise.all([

    // Opportunities won this window
    db.collection("crm_opportunities")
      .find({ stage: "won", won_at: { $gte: windowStart.toISOString() } })
      .toArray(),

    // Opportunities lost this window
    db.collection("crm_opportunities")
      .find({ stage: "lost", lost_at: { $gte: windowStart.toISOString() } })
      .toArray(),

    // Dealers activated (stage → active_dealer) this window
    db.collection("crm_dealers")
      .find({
        stage: "active_dealer",
        updated_at: { $gte: windowStart.toISOString() },
      })
      .toArray(),

    // Opportunities currently open (not won or lost)
    db.collection("crm_opportunities")
      .find({ stage: { $nin: ["won", "lost"] } })
      .toArray(),

    // SEO content published this window
    db.collection("seo_workflow_items")
      .find({
        stage: "published",
        published_at: { $gte: windowStart.toISOString() },
      })
      .toArray(),

    // Ads campaigns deployed this window
    db.collection("ads_workflow_items")
      .find({
        stage: "deployed",
        deployed_at: { $gte: windowStart.toISOString() },
      })
      .toArray(),

    // Director recs approved this window
    db.collection("director_recommendations")
      .find({ status: "approved", reviewed_at: { $gte: windowStart.toISOString() } })
      .toArray(),

    // Director recs marked won this window
    db.collection("director_recommendations")
      .find({ status: "won", won_at: { $gte: windowStart.toISOString() } })
      .toArray(),

    // Director recs marked lost this window
    db.collection("director_recommendations")
      .find({ status: "lost", lost_at: { $gte: windowStart.toISOString() } })
      .toArray(),

    // Active dealer pipeline (not lost or active_dealer yet)
    db.collection("crm_dealers")
      .find({ stage: { $nin: ["active_dealer", "lost"] } })
      .toArray(),
  ])

  // ── Aggregate revenue numbers ──────────────────────────────────────────────
  const revenueWon  = opportunitiesWon.reduce((sum, o) => sum + (o.actual_revenue || o.value || 0), 0)
  const revenueLost = opportunitiesLost.reduce((sum, o) => sum + (o.value || 0), 0)
  const pipelineValue = opportunitiesOpen.reduce((sum, o) => sum + (o.value || 0), 0)
  const weightedPipeline = opportunitiesOpen.reduce((sum, o) => sum + (o.value || 0) * ((o.probability || 50) / 100), 0)
  const directorImpact = directorWon.reduce((sum, r) => sum + (r.realized_impact || r.expected_revenue_impact || 0), 0)

  return NextResponse.json({
    window_days: weeks * 7,
    window_start: windowStart.toISOString(),
    window_end: now.toISOString(),
    summary: {
      revenue_won:            revenueWon,
      revenue_lost:           revenueLost,
      pipeline_value:         pipelineValue,
      weighted_pipeline:      weightedPipeline,
      director_realized:      directorImpact,
    },
    deals: {
      opportunities_won:      opportunitiesWon.length,
      opportunities_lost:     opportunitiesLost.length,
      opportunities_open:     opportunitiesOpen.length,
      dealers_activated:      dealersActivated.length,
      dealers_in_pipeline:    dealerPipelineActive.length,
    },
    execution: {
      seo_published:          seoPublished.length,
      ads_launched:           adsCampaignsLaunched.length,
      director_approved:      directorApproved.length,
      director_won:           directorWon.length,
      director_lost:          directorLost.length,
    },
    details: {
      opportunities_won:      opportunitiesWon.map(o => ({
        _id: String(o._id), name: o.name, organization: o.organization,
        value: o.value, actual_revenue: o.actual_revenue, won_at: o.won_at,
      })),
      opportunities_lost:     opportunitiesLost.map(o => ({
        _id: String(o._id), name: o.name, organization: o.organization,
        value: o.value, lost_at: o.lost_at,
      })),
      dealers_activated:      dealersActivated.map(d => ({
        _id: String(d._id), name: d.name, state: d.state,
        expected_revenue: d.expected_revenue, updated_at: d.updated_at,
      })),
      seo_published:          seoPublished.map(s => ({
        _id: String(s._id), title: s.title, keyword: s.keyword,
        target_url: s.target_url, published_at: s.published_at,
      })),
      ads_launched:           adsCampaignsLaunched.map(a => ({
        _id: String(a._id), title: a.title, campaign_type: a.campaign_type,
        budget: a.budget, deployed_at: a.deployed_at,
      })),
    },
  })
}
