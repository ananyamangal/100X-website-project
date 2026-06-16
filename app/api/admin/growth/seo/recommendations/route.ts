/**
 * SEO Recommendation Engine — v2.4
 * GET  /api/admin/growth/seo/recommendations          — list all recs
 * POST /api/admin/growth/seo/recommendations          — generate fresh recs from GSC + schema + link data
 */
import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

export type SeoRecType =
  | "ctr_opportunity"      // Position 4-20, high impressions, low CTR
  | "ranking_opportunity"  // Position 8-20, rising, needs content expansion
  | "schema_fix"           // Missing Product/FAQ/Organization schema
  | "internal_link"        // Orphan or weak page needing links
  | "content_gap"          // High impressions, zero content matched
  | "title_optimization"   // Title too long/short or low CTR vs position

export type SeoRecStatus = "pending" | "approved" | "rejected" | "deferred" | "implemented"
export type SeoRecDifficulty = "easy" | "medium" | "hard"
export type SeoRecEffort = "5_min" | "30_min" | "1_hour" | "half_day" | "project"

export interface SeoRecommendation {
  _id?: string
  type: SeoRecType
  priority: "critical" | "high" | "medium" | "low"
  title: string
  url: string
  why: string
  current_state: string
  proposed_change: string
  expected_clicks: number
  expected_traffic_pct: number
  expected_revenue_inr: number
  confidence: number
  difficulty: SeoRecDifficulty
  effort: SeoRecEffort
  status: SeoRecStatus
  generated_at: string
  reviewed_at?: string
  implemented_at?: string
  implementation_package?: {
    meta_title?: string
    meta_description?: string
    schema_snippet?: string
    link_recommendations?: Array<{ from: string; anchor: string; to: string }>
    content_sections?: string[]
    notes?: string
  }
}

const REVENUE_PER_CLICK = 150 // ₹150 avg revenue per organic click (conservative estimate)

function inferPriority(rec: Omit<SeoRecommendation, "_id" | "priority">): SeoRecommendation["priority"] {
  if (rec.expected_revenue_inr >= 50000) return "critical"
  if (rec.expected_revenue_inr >= 20000) return "high"
  if (rec.expected_revenue_inr >= 5000) return "medium"
  return "low"
}

function generateTitleProposal(query: string, currentTitle: string): string {
  const keyword = query.charAt(0).toUpperCase() + query.slice(1)
  if (!currentTitle || currentTitle.length < 10) {
    return `${keyword} | 100x Circle — Buy Direct from Manufacturer`
  }
  if (!currentTitle.toLowerCase().includes(query.split(" ")[0].toLowerCase())) {
    return `${keyword} | ${currentTitle.replace(" | 100x Circle", "").trim().slice(0, 35)} | 100x Circle`
  }
  if (currentTitle.length > 60) {
    return currentTitle.slice(0, 57) + "…"
  }
  return `${keyword} — ${currentTitle.includes("100x") ? "100x Circle" : "Buy from Indian Manufacturer"}`
}

function generateMetaProposal(query: string): string {
  return `Buy ${query} directly from 100x Circle — Indian OEM manufacturer. GeM-listed, ISO 9001 certified. Competitive pricing, PAN India delivery. Get a free quote in 24 hours.`
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") || ""
  const limit = Number(searchParams.get("limit") || "50")

  try {
    const db = (await clientPromise).db()
    const filter: Record<string, unknown> = {}
    if (status) filter.status = status

    const docs = await db.collection("seo_recommendations")
      .find(filter)
      .sort({ generated_at: -1 })
      .limit(limit)
      .toArray()

    return NextResponse.json({
      recs: docs.map(d => ({ ...d, _id: String(d._id) })),
      total: docs.length,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const db = (await clientPromise).db()
    const now = new Date().toISOString()

    // Pull data from existing collections
    const [nearWins, schemaAudit, linkGraph] = await Promise.all([
      db.collection("gsc_query_rows")
        .find({ position: { $gte: 4, $lte: 20 }, impressions: { $gte: 50 } })
        .sort({ impressions: -1 })
        .limit(30)
        .toArray(),
      db.collection("seo_schema_audits")
        .findOne({}, { sort: { auditedAt: -1 } }),
      db.collection("seo_link_graphs")
        .findOne({}, { sort: { auditedAt: -1 } }),
    ])

    const recs: Omit<SeoRecommendation, "_id">[] = []

    // ── CTR Opportunities (Near-Wins: position 4-15, impressions ≥100) ──────
    for (const row of nearWins) {
      const position = Number(row.position || 0)
      const impressions = Number(row.impressions || 0)
      const clicks = Number(row.clicks || 0)
      const query = String(row.query || "")
      if (!query || impressions < 100) continue

      const expectedCtr = position <= 5 ? 0.08 : position <= 10 ? 0.04 : 0.02
      const actualCtr = impressions > 0 ? clicks / impressions : 0
      const ctrGap = expectedCtr - actualCtr
      if (ctrGap < 0.01) continue

      const expectedNewClicks = Math.round(impressions * ctrGap * 30) // monthly
      const expectedRevenue = expectedNewClicks * REVENUE_PER_CLICK

      const rec: Omit<SeoRecommendation, "_id"> = {
        type: position <= 8 ? "ctr_opportunity" : "ranking_opportunity",
        priority: "high",
        title: `${position <= 8 ? "Optimize title/meta" : "Expand content"} for "${query}"`,
        url: String(row.page || row.pagePath || "/"),
        why: `Position ${position.toFixed(1)} · ${impressions.toLocaleString()} impressions/mo · only ${clicks} clicks · expected CTR ${Math.round(expectedCtr * 100)}% vs actual ${Math.round(actualCtr * 100)}%`,
        current_state: `Position: ${position.toFixed(1)}, CTR: ${(actualCtr * 100).toFixed(1)}%, Impressions: ${impressions}`,
        proposed_change: position <= 8
          ? `Rewrite title tag to include "${query}" in first 30 chars. Update meta description with clear CTA.`
          : `Add 300-word section targeting "${query}" with FAQs and internal links to product pages.`,
        expected_clicks: expectedNewClicks,
        expected_traffic_pct: Math.round(ctrGap * 100),
        expected_revenue_inr: expectedRevenue,
        confidence: position <= 8 ? 75 : 60,
        difficulty: position <= 8 ? "easy" : "medium",
        effort: position <= 8 ? "30_min" : "1_hour",
        status: "pending",
        generated_at: now,
        implementation_package: {
          meta_title: generateTitleProposal(query, ""),
          meta_description: generateMetaProposal(query),
          notes: `Target keyword: "${query}". Current position: ${position.toFixed(1)}. Optimization will move this to top-5 and capture ${expectedNewClicks} additional clicks/month.`,
        },
      }
      rec.priority = inferPriority(rec)
      recs.push(rec)
    }

    // ── Schema Fixes ──────────────────────────────────────────────────────────
    if (schemaAudit) {
      const missingProduct: string[] = schemaAudit.findings?.missingProduct ?? []
      const noSchema: string[] = schemaAudit.findings?.noSchema ?? []

      for (const path of [...missingProduct, ...noSchema].slice(0, 10)) {
        const isProduct = path.includes("/products/") || missingProduct.includes(path)
        const rec: Omit<SeoRecommendation, "_id"> = {
          type: "schema_fix",
          priority: "medium",
          title: `Add ${isProduct ? "Product" : "FAQ"} schema to ${path}`,
          url: path,
          why: `Page has no structured data — Google cannot show rich results for this URL`,
          current_state: "No schema markup detected",
          proposed_change: isProduct
            ? "Add Product schema with name, description, brand, offers, availability, SKU"
            : "Add FAQPage schema with top 3 questions from page content",
          expected_clicks: 15,
          expected_traffic_pct: 20,
          expected_revenue_inr: 15 * REVENUE_PER_CLICK,
          confidence: 80,
          difficulty: "easy",
          effort: "30_min",
          status: "pending",
          generated_at: now,
          implementation_package: {
            schema_snippet: isProduct
              ? JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "Product",
                  "name": "100X Circle Thermal Fogging Machine",
                  "brand": { "@type": "Brand", "name": "100X Circle" },
                  "offers": {
                    "@type": "Offer",
                    "availability": "https://schema.org/InStock",
                    "priceCurrency": "INR",
                    "seller": { "@type": "Organization", "name": "100X Circle Pvt Ltd" }
                  }
                }, null, 2)
              : JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  "mainEntity": [
                    { "@type": "Question", "name": "What is a thermal fogging machine?", "acceptedAnswer": { "@type": "Answer", "text": "A thermal fogging machine uses heat to vaporize insecticidal solutions, creating a dense fog that effectively controls mosquitoes, flies, and other insects." } }
                  ]
                }, null, 2),
          },
        }
        rec.priority = inferPriority(rec)
        recs.push(rec)
      }
    }

    // ── Internal Link Opportunities ───────────────────────────────────────────
    if (linkGraph) {
      const orphans: Array<{ path: string; addLinkFrom?: string[] }> = linkGraph.orphanPages ?? []
      for (const page of orphans.slice(0, 5)) {
        const fromPages = page.addLinkFrom ?? []
        const rec: Omit<SeoRecommendation, "_id"> = {
          type: "internal_link",
          priority: "low",
          title: `Add internal links to orphan page: ${page.path}`,
          url: page.path,
          why: "Page has no inbound internal links — PageRank cannot flow to it",
          current_state: "0 internal links pointing to this page",
          proposed_change: `Add contextual links from: ${fromPages.slice(0, 3).join(", ")}`,
          expected_clicks: 5,
          expected_traffic_pct: 10,
          expected_revenue_inr: 5 * REVENUE_PER_CLICK,
          confidence: 65,
          difficulty: "easy",
          effort: "5_min",
          status: "pending",
          generated_at: now,
          implementation_package: {
            link_recommendations: fromPages.slice(0, 3).map(from => ({
              from,
              anchor: page.path.split("/").pop()?.replace(/-/g, " ") ?? "learn more",
              to: page.path,
            })),
          },
        }
        recs.push(rec)
      }
    }

    if (recs.length === 0) {
      return NextResponse.json({
        ok: true,
        created: 0,
        message: "No opportunities detected — GSC data may not be synced yet. Run GSC sync first.",
      })
    }

    // Deduplicate against existing pending recs (by url+type)
    const existing = await db.collection("seo_recommendations")
      .find({ status: "pending" }, { projection: { url: 1, type: 1 } })
      .toArray()
    const existingKeys = new Set(existing.map(e => `${e.type}::${e.url}`))
    const newRecs = recs.filter(r => !existingKeys.has(`${r.type}::${r.url}`))

    if (newRecs.length > 0) {
      await db.collection("seo_recommendations").insertMany(newRecs)
    }

    return NextResponse.json({ ok: true, created: newRecs.length, skipped: recs.length - newRecs.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
