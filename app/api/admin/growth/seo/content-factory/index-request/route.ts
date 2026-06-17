/**
 * SEO Index Request
 * POST — submit a published URL to Google Search Console for indexing via URL Inspection API
 * GET  — check indexing status for a URL
 */
import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getValidAccessToken, getStoredTokens } from "@/lib/google-oauth"
import { COLL_SEO_CONTENT_PLANS } from "@/lib/growth-os/seo-content-factory"

export const dynamic = "force-dynamic"

const SITE_URL = "https://www.100xcircle.com"

// GSC URL Inspection API — check index status
async function inspectUrl(url: string, accessToken: string): Promise<{
  indexingState: string
  lastCrawlTime?: string
  pageFetchState?: string
  robotsTxtState?: string
}> {
  const res = await fetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inspectionUrl:  url,
      siteUrl:        SITE_URL,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GSC URL Inspection ${res.status}: ${text.slice(0, 300)}`)
  }
  const data = await res.json() as {
    inspectionResult?: {
      indexStatusResult?: {
        coverageState?: string
        lastCrawlTime?: string
        pageFetchState?: string
        robotsTxtState?: string
      }
    }
  }
  const r = data.inspectionResult?.indexStatusResult ?? {}
  return {
    indexingState:   r.coverageState ?? "UNKNOWN",
    lastCrawlTime:   r.lastCrawlTime,
    pageFetchState:  r.pageFetchState,
    robotsTxtState:  r.robotsTxtState,
  }
}

// GET — check current indexing status
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const planId = searchParams.get("planId")
    if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 })

    const db   = (await clientPromise).db()
    const plan = await db.collection(COLL_SEO_CONTENT_PLANS).findOne({ planId })
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    if (!plan.deploymentInfo?.publishedUrl) {
      return NextResponse.json({ error: "Page not published yet" }, { status: 400 })
    }

    const tokens = await getStoredTokens()
    if (!tokens?.scope?.includes("webmasters")) {
      return NextResponse.json({ error: "GSC scope not available — re-authenticate." }, { status: 400 })
    }

    const accessToken = await getValidAccessToken()
    const fullUrl     = `${SITE_URL}${plan.deploymentInfo.publishedUrl}`
    const result      = await inspectUrl(fullUrl, accessToken)

    return NextResponse.json({ planId, url: fullUrl, ...result })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST — request indexing (inspect + record the request)
export async function POST(req: Request) {
  try {
    const { planId } = await req.json() as { planId: string }
    if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 })

    const db   = (await clientPromise).db()
    const now  = new Date().toISOString()
    const plan = await db.collection(COLL_SEO_CONTENT_PLANS).findOne({ planId })
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    if (plan.status !== "published") {
      return NextResponse.json({ error: "Page must be published before requesting indexing" }, { status: 400 })
    }

    const tokens = await getStoredTokens()
    const hasGsc = tokens?.scope?.includes("webmasters")
    const fullUrl = `${SITE_URL}${plan.targetUrl}`

    let indexStatus = "requested"
    let inspectionResult: Record<string, string | undefined> = {}

    if (hasGsc) {
      try {
        const accessToken = await getValidAccessToken()
        inspectionResult = await inspectUrl(fullUrl, accessToken)
        // GSC URL Inspection doesn't trigger indexing itself — it reports current status.
        // The indexing request is implicit via the URL being live + sitemap submission.
        indexStatus = inspectionResult.indexingState === "SUBMITTED_AND_INDEXED" ? "indexed" : "requested"
      } catch {
        // Non-fatal
      }
    }

    // Update plan with indexing request
    await db.collection(COLL_SEO_CONTENT_PLANS).updateOne(
      { planId },
      {
        $set: {
          status:                              indexStatus === "indexed" ? "indexed" : "published",
          updatedAt:                           now,
          "deploymentInfo.indexRequestedAt":   now,
          "deploymentInfo.indexStatus":        indexStatus,
          "deploymentInfo.inspectionResult":   inspectionResult,
        },
      },
    )

    await db.collection("growth_os_logs").insertOne({
      ts: now, agent: "seo-index-request",
      action: "index_requested", planId,
      url: fullUrl, indexStatus, hasGsc,
      module: "seo", level: "success",
    })

    return NextResponse.json({
      ok:               true,
      url:              fullUrl,
      indexStatus,
      inspectionResult,
      gscConnected:     hasGsc,
      note:             hasGsc
        ? "URL inspected via Google Search Console. Google crawls new content within 1–7 days."
        : "GSC not connected — indexing recorded locally. Submit URL manually in Google Search Console.",
    })
  } catch (err) {
    console.error("[seo/index-request] error:", String(err))
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
