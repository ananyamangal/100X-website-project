/**
 * SEO Content Factory API
 * GET  — preflight: list content plans + recommendation picker
 * POST — generate content for a recommendation
 */
import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { runSeoContentFactory, COLL_SEO_CONTENT_PLANS } from "@/lib/growth-os/seo-content-factory"
import type { SeoFactoryInput } from "@/lib/growth-os/seo-content-factory"

export const maxDuration = 120
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const db = (await clientPromise).db()

    const [plans, recs] = await Promise.all([
      db.collection(COLL_SEO_CONTENT_PLANS)
        .find({})
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray(),
      db.collection("seo_recommendations")
        .find({ status: { $in: ["pending", "approved"] } })
        .sort({ priority: 1, generated_at: -1 })
        .limit(30)
        .toArray(),
    ])

    // Enrich recs — flag which ones already have a plan
    const plannedIds = new Set(plans.map(p => p.recommendationId))
    const recommendations = recs.map(r => ({
      id:              String(r._id),
      type:            r.type,
      priority:        r.priority,
      title:           r.title,
      url:             r.url,
      targetKeyword:   r.target_keyword ?? r.url?.split("/").pop()?.replace(/-/g, " ") ?? "",
      contentType:     r.content_type ?? "landing_page",
      currentState:    r.current_state ?? "Page exists",
      proposedChange:  r.proposed_change ?? "Optimize content for target keyword",
      expectedClicks:  r.expected_clicks ?? 0,
      confidence:      r.confidence ?? 0,
      difficulty:      r.difficulty ?? "medium",
      hasPlan:         plannedIds.has(String(r._id)),
    }))

    const hasApiKey = !!(process.env.ANTHROPIC_API_KEY || "").trim()

    return NextResponse.json({
      apiKeyConfigured: hasApiKey,
      totalPlans:       plans.length,
      pendingReview:    plans.filter(p => p.status === "pending_review").length,
      published:        plans.filter(p => p.status === "published").length,
      plans: plans.map(({ _id, ...rest }) => rest),
      recommendations,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Partial<SeoFactoryInput>

    const { recommendationId, keyword, targetUrl, contentType, priority, currentState, proposedChange } = body
    if (!keyword || !targetUrl) {
      return NextResponse.json({ error: "keyword and targetUrl are required" }, { status: 400 })
    }

    const result = await runSeoContentFactory({
      recommendationId: recommendationId ?? `manual_${Date.now()}`,
      keyword:          keyword.trim(),
      targetUrl:        targetUrl.trim(),
      contentType:      contentType ?? "landing_page",
      priority:         priority ?? "medium",
      currentState:     currentState ?? "Existing page",
      proposedChange:   proposedChange ?? "Optimize content for target keyword",
    })

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error("[seo/content-factory] error:", String(err))
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
