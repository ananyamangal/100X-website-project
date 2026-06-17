/**
 * SEO Content Publish
 * POST — publish an approved content plan to seo_published_content + trigger revalidation
 */
import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { COLL_SEO_CONTENT_PLANS } from "@/lib/growth-os/seo-content-factory"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const { planId } = await req.json() as { planId: string }
    if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 })

    const db  = (await clientPromise).db()
    const now = new Date().toISOString()

    const plan = await db.collection(COLL_SEO_CONTENT_PLANS).findOne({ planId })
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    if (plan.status !== "approved") {
      return NextResponse.json({ error: "Plan must be approved before publishing" }, { status: 400 })
    }

    // Write to seo_published_content (canonical CMS record for the URL)
    const slug = plan.targetUrl.replace(/^\//, "").replace(/\//g, "-") || "home"
    await db.collection("seo_published_content").updateOne(
      { slug },
      {
        $set: {
          slug,
          url:             plan.targetUrl,
          keyword:         plan.keyword,
          contentType:     plan.contentType,
          metaTitle:       plan.generatedContent.metaTitle,
          metaDescription: plan.generatedContent.metaDescription,
          h1:              plan.generatedContent.h1,
          sections:        plan.generatedContent.sections,
          schema:          plan.generatedContent.schema,
          internalLinks:   plan.generatedContent.internalLinks,
          ctas:            plan.generatedContent.ctas,
          publishedAt:     now,
          planId:          plan.planId,
          updatedAt:       now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    )

    // Mark plan as published
    await db.collection(COLL_SEO_CONTENT_PLANS).updateOne(
      { planId },
      {
        $set: {
          status:                     "published",
          updatedAt:                  now,
          "deploymentInfo.publishedAt":  now,
          "deploymentInfo.publishedUrl": plan.targetUrl,
        },
      },
    )

    // Trigger Next.js ISR revalidation (non-fatal if route doesn't exist)
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.100xcircle.com").replace(/\/$/, "")
    const revalToken = process.env.REVALIDATION_TOKEN
    if (revalToken) {
      try {
        await fetch(`${siteUrl}/api/revalidate?token=${revalToken}&path=${encodeURIComponent(plan.targetUrl)}`, {
          method: "POST",
        })
      } catch {
        // Revalidation endpoint may not exist yet — non-fatal
      }
    }

    await db.collection("growth_os_logs").insertOne({
      ts: now, agent: "seo-content-publish",
      action: "content_published", planId,
      keyword: plan.keyword, url: plan.targetUrl,
      module: "seo", level: "success",
    })

    return NextResponse.json({ ok: true, publishedAt: now, slug, url: plan.targetUrl })
  } catch (err) {
    console.error("[seo/publish] error:", String(err))
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
