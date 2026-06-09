import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const client = await clientPromise
  const db = client.db()

  const products = await db
    .collection("products")
    .find({})
    .sort({ order: 1, createdAt: -1 })
    .toArray()

  // ── Per-product SEO status ─────────────────────────────────────────────────
  const impactReport = products.map((p) => {
    const id = String(p._id)
    const slug = String(p.slug ?? id)
    return {
      id,
      name: String(p.name ?? ""),
      url: `/products/${slug}`,
      h1: String(p.h1Title ?? p.name ?? ""),
      seoTitle: String(p.seoTitle ?? "").trim() || null,
      metaDescription: String(p.metaDescription ?? "").trim() || null,
      ogTitle: String(p.ogTitle ?? "").trim() || null,
      ogDescription: String(p.ogDescription ?? "").trim() || null,
      hasImages: Array.isArray(p.imageUrls) && p.imageUrls.filter(Boolean).length > 0,
      hasSchema: !!p.name && (!!p.category || !!p.shortDescription),
      isPublished: p.isPublished !== false,
      status:
        !String(p.seoTitle ?? "").trim() || !String(p.metaDescription ?? "").trim()
          ? ("missing" as const)
          : ("existing" as const),
    }
  })

  // ── 1. Missing SEO Titles ──────────────────────────────────────────────────
  const missingSeoTitle = impactReport.filter((p) => !p.seoTitle)

  // ── 2. Missing Meta Descriptions ──────────────────────────────────────────
  const missingMetaDesc = impactReport.filter((p) => !p.metaDescription)

  // ── 3. Duplicate SEO Titles ────────────────────────────────────────────────
  const titleGroups = new Map<string, typeof impactReport>()
  for (const p of impactReport) {
    if (!p.seoTitle) continue
    const key = p.seoTitle.toLowerCase().trim()
    titleGroups.set(key, [...(titleGroups.get(key) ?? []), p])
  }
  const duplicateTitles = [...titleGroups.entries()]
    .filter(([, ps]) => ps.length > 1)
    .map(([title, products]) => ({ title, products }))

  // ── 4. Duplicate Meta Descriptions ────────────────────────────────────────
  const descGroups = new Map<string, typeof impactReport>()
  for (const p of impactReport) {
    if (!p.metaDescription) continue
    const key = p.metaDescription.toLowerCase().trim()
    descGroups.set(key, [...(descGroups.get(key) ?? []), p])
  }
  const duplicateDescriptions = [...descGroups.entries()]
    .filter(([, ps]) => ps.length > 1)
    .map(([desc, products]) => ({ desc, products }))

  // ── 5. Missing H1 ─────────────────────────────────────────────────────────
  const missingH1 = impactReport.filter((p) => !String(p.h1 ?? "").trim())

  // ── 6. Missing OG Images ──────────────────────────────────────────────────
  const missingOgImages = impactReport.filter((p) => !p.hasImages)

  // ── 7. Missing Schema Data ────────────────────────────────────────────────
  const missingSchema = impactReport.filter((p) => !p.hasSchema)

  // ── 8. Orphan Pages (published products with no slug) ─────────────────────
  const orphanPages = impactReport.filter(
    (p) => p.isPublished && products.find((r) => String(r._id) === p.id && !String(r.slug ?? "").trim())
  )

  // ── Overall score ──────────────────────────────────────────────────────────
  const total = products.length
  const fullyOptimized = impactReport.filter((p) => p.seoTitle && p.metaDescription && p.hasImages).length
  const seoScore = total > 0 ? Math.round((fullyOptimized / total) * 100) : 100

  return NextResponse.json({
    scannedAt: new Date().toISOString(),
    totalProducts: total,
    publishedProducts: impactReport.filter((p) => p.isPublished).length,
    seoScore,
    fullyOptimized,
    issues: {
      missingSeoTitle: {
        count: missingSeoTitle.length,
        severity: missingSeoTitle.length > 0 ? "warning" : "ok",
        items: missingSeoTitle,
      },
      missingMetaDesc: {
        count: missingMetaDesc.length,
        severity: missingMetaDesc.length > 0 ? "warning" : "ok",
        items: missingMetaDesc,
      },
      duplicateTitles: {
        count: duplicateTitles.reduce((n, g) => n + g.products.length, 0),
        severity: duplicateTitles.length > 0 ? "warning" : "ok",
        groups: duplicateTitles,
      },
      duplicateDescriptions: {
        count: duplicateDescriptions.reduce((n, g) => n + g.products.length, 0),
        severity: duplicateDescriptions.length > 0 ? "warning" : "ok",
        groups: duplicateDescriptions,
      },
      missingH1: {
        count: missingH1.length,
        severity: missingH1.length > 0 ? "critical" : "ok",
        items: missingH1,
      },
      missingOgImages: {
        count: missingOgImages.length,
        severity: missingOgImages.length > 0 ? "warning" : "ok",
        items: missingOgImages,
      },
      missingSchema: {
        count: missingSchema.length,
        severity: missingSchema.length > 0 ? "warning" : "ok",
        items: missingSchema,
      },
      orphanPages: {
        count: orphanPages.length,
        severity: orphanPages.length > 0 ? "warning" : "ok",
        items: orphanPages,
      },
    },
    impactReport,
  })
}
