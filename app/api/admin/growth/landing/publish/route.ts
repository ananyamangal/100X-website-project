/**
 * Landing Page Publish
 * POST — publish an approved landing page draft:
 *   1. Write to landing_pages_published (canonical CMS record)
 *   2. Update plan status to "published"
 *   3. Trigger ISR revalidation
 *   4. Log to growth_os_logs
 */
import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { COLL_LANDING_PLANS, COLL_LANDING_PUBLISHED } from "@/lib/growth-os/landing-page-factory"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const { planId } = await req.json() as { planId: string }
    if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 })

    const db  = (await clientPromise).db()
    const now = new Date().toISOString()

    const plan = await db.collection(COLL_LANDING_PLANS).findOne({ planId })
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    if (plan.status !== "approved") {
      return NextResponse.json({ error: "Plan must be approved before publishing" }, { status: 400 })
    }

    const gc   = plan.generatedContent
    const slug = plan.targetUrl.replace(/^\//, "").replace(/\//g, "-") || "home"

    // Write canonical CMS record for the URL
    await db.collection(COLL_LANDING_PUBLISHED).updateOne(
      { slug },
      {
        $set: {
          slug,
          url:             plan.targetUrl,
          keyword:         plan.keyword,
          source:          plan.source,
          pageType:        plan.pageType,
          metaTitle:       gc.metaTitle,
          metaDescription: gc.metaDescription,
          hero:            gc.hero,
          cta:             gc.cta,
          benefits:        gc.benefits,
          faq:             gc.faq,
          sections:        gc.sections,
          schema:          gc.schema,
          internalLinks:   gc.internalLinks,
          publishedAt:     now,
          planId:          plan.planId,
          updatedAt:       now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    )

    // Mark plan as published + start tracking
    await db.collection(COLL_LANDING_PLANS).updateOne(
      { planId },
      {
        $set: {
          status:    "published",
          updatedAt: now,
          "deploymentInfo.publishedAt":   now,
          "deploymentInfo.publishedUrl":  plan.targetUrl,
        },
      },
    )

    // ISR revalidation — non-fatal
    const siteUrl    = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.100xcircle.com").replace(/\/$/, "")
    const revalToken = process.env.REVALIDATION_TOKEN
    if (revalToken) {
      try {
        await fetch(`${siteUrl}/api/revalidate?token=${revalToken}&path=${encodeURIComponent(plan.targetUrl)}`, {
          method: "POST",
        })
      } catch {
        // Endpoint may not exist yet — non-fatal
      }
    }

    await db.collection("growth_os_logs").insertOne({
      ts: now, agent: "landing-page-publish",
      action: "lp_published", planId,
      keyword: plan.keyword, url: plan.targetUrl, source: plan.source,
      module: "landing", level: "success",
    })

    return NextResponse.json({ ok: true, publishedAt: now, slug, url: plan.targetUrl })
  } catch (err) {
    console.error("[landing/publish] error:", String(err))
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
