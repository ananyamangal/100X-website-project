import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import type { QueueItem, ActionType } from "@/types/growth-execution"

export const dynamic = "force-dynamic"

function toPriority(p: string | number | undefined): QueueItem["priority"] {
  if (p === "critical" || p === 1) return "critical"
  if (p === "high"     || p === 2) return "high"
  if (p === "low"      || p === 4) return "low"
  return "medium"
}

const ACTION_ORDER: Record<ActionType, number> = {
  deploy: 0, approve: 1, publish: 2, execute: 3, monitor: 4,
}

export async function GET() {
  try {
    const db = (await clientPromise).db()

    const [adsCampaigns, seoPlans, landingPlans, directorRecs] = await Promise.all([
      db.collection("ads_campaign_plans")
        .find({ status: { $in: ["pending_approval", "draft"] } })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray(),

      db.collection("seo_content_plans")
        .find({ status: { $in: ["pending_review", "approved", "published", "indexed"] } })
        .sort({ createdAt: -1 })
        .limit(30)
        .toArray(),

      db.collection("landing_page_plans")
        .find({ status: { $in: ["draft", "approved", "published", "tracking"] } })
        .sort({ createdAt: -1 })
        .limit(30)
        .toArray(),

      db.collection("director_recommendations")
        .find({ status: { $in: ["approved", "in_progress"] } })
        .sort({ priority: 1, generated_at: -1 })
        .limit(15)
        .toArray(),
    ])

    const queue: QueueItem[] = []

    // ── Ads campaigns ─────────────────────────────────────────────────────────
    for (const c of adsCampaigns) {
      const planId = c.planId ?? String(c._id)
      queue.push({
        assetId:        planId,
        assetType:      "campaign",
        source:         "ads",
        title:          c.campaignName ?? c.keyword ?? "Unnamed Campaign",
        opportunity:    c.keyword ?? c.targetKeyword ?? c.funnelType ?? "",
        revenueImpact:  Number(c.estimatedRevenue ?? 0),
        status:         c.status,
        requiredAction: "deploy",
        actionLabel:    "Deploy Campaign",
        actionEndpoint: "/api/admin/growth/ads/approval-queue",
        actionPayload:  { action: "approve", planId, deploymentId: c.deploymentId ?? "" },
        priority:       "high",
        createdAt:      c.createdAt ?? new Date().toISOString(),
        meta: {
          keywords:   (c.keywords ?? []).length,
          budget:     c.budget ?? 0,
          funnelType: c.funnelType ?? "",
        },
      })
    }

    // ── SEO content plans ─────────────────────────────────────────────────────
    for (const p of seoPlans) {
      let requiredAction: ActionType
      let actionLabel: string
      let actionEndpoint: string
      let actionPayload: Record<string, unknown>

      if (p.status === "pending_review") {
        requiredAction = "approve"; actionLabel = "Approve Article"
        actionEndpoint = "/api/admin/growth/seo/content-factory/approve"
        actionPayload  = { action: "approve", planId: p.planId }
      } else if (p.status === "approved") {
        requiredAction = "publish"; actionLabel = "Publish Article"
        actionEndpoint = "/api/admin/growth/seo/content-factory/publish"
        actionPayload  = { planId: p.planId }
      } else {
        requiredAction = "monitor"; actionLabel = "View Index Status"
        actionEndpoint = "/api/admin/growth/seo/content-factory/index-request"
        actionPayload  = { planId: p.planId }
      }

      queue.push({
        assetId:        p.planId,
        assetType:      "seo_article",
        source:         "seo",
        title:          p.generatedContent?.h1 ?? p.keyword ?? "SEO Article",
        opportunity:    p.keyword ?? "",
        revenueImpact:  0,
        status:         p.status,
        requiredAction,
        actionLabel,
        actionEndpoint,
        actionPayload,
        priority:       toPriority(p.priority),
        createdAt:      p.createdAt,
        meta: {
          targetUrl:  p.targetUrl,
          wordCount:  p.generatedContent?.wordCount ?? 0,
          confidence: p.qualityScores?.confidence ?? 0,
          simulated:  p.simulated,
        },
      })
    }

    // ── Landing page plans ────────────────────────────────────────────────────
    for (const p of landingPlans) {
      let requiredAction: ActionType
      let actionLabel: string
      let actionEndpoint: string
      let actionPayload: Record<string, unknown>

      if (p.status === "draft") {
        requiredAction = "approve"; actionLabel = "Approve Page"
        actionEndpoint = "/api/admin/growth/landing/approve"
        actionPayload  = { action: "approve", planId: p.planId }
      } else if (p.status === "approved") {
        requiredAction = "publish"; actionLabel = "Publish Page"
        actionEndpoint = "/api/admin/growth/landing/publish"
        actionPayload  = { planId: p.planId }
      } else {
        requiredAction = "monitor"; actionLabel = "View Performance"
        actionEndpoint = `/api/admin/growth/landing/${p.planId}/performance`
        actionPayload  = {}
      }

      queue.push({
        assetId:        p.planId,
        assetType:      "landing_page",
        source:         "landing",
        title:          p.generatedContent?.hero?.headline ?? p.keyword ?? "Landing Page",
        opportunity:    p.keyword ?? "",
        revenueImpact:  Number(p.performance?.revenueAttributed ?? 0),
        status:         p.status,
        requiredAction,
        actionLabel,
        actionEndpoint,
        actionPayload,
        priority:       toPriority(p.priority),
        createdAt:      p.createdAt,
        meta: {
          targetUrl:  p.targetUrl,
          lpSource:   p.source,
          leads:      p.performance?.leads ?? 0,
          confidence: p.qualityScores?.confidence ?? 0,
        },
      })
    }

    // ── Revenue Director recs ─────────────────────────────────────────────────
    for (const r of directorRecs) {
      queue.push({
        assetId:        String(r._id),
        assetType:      "director_rec",
        source:         "director",
        title:          r.title ?? r.recommendation ?? "Revenue Recommendation",
        opportunity:    r.type ?? r.category ?? "",
        revenueImpact:  Number(r.estimated_revenue ?? r.revenue_impact ?? 0),
        status:         r.status,
        requiredAction: "execute",
        actionLabel:    "View Execution Pack",
        actionEndpoint: `/api/admin/growth/director/packs/${String(r._id)}`,
        actionPayload:  {},
        priority:       toPriority(r.priority),
        createdAt:      r.generated_at ?? r.created_at ?? new Date().toISOString(),
        meta: { type: r.type, summary: r.summary },
      })
    }

    queue.sort((a, b) => {
      const oa = ACTION_ORDER[a.requiredAction] ?? 5
      const ob = ACTION_ORDER[b.requiredAction] ?? 5
      if (oa !== ob) return oa - ob
      return b.revenueImpact - a.revenueImpact
    })

    return NextResponse.json({
      summary: {
        totalItems:         queue.length,
        campaignsReady:     queue.filter(i => i.assetType === "campaign").length,
        articlesReady:      queue.filter(i => i.assetType === "seo_article" && i.requiredAction !== "monitor").length,
        pagesReady:         queue.filter(i => i.assetType === "landing_page" && i.requiredAction !== "monitor").length,
        monitoring:         queue.filter(i => i.requiredAction === "monitor").length,
        directorRecs:       queue.filter(i => i.assetType === "director_rec").length,
        totalRevenueImpact: queue.reduce((s, i) => s + i.revenueImpact, 0),
      },
      queue,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
