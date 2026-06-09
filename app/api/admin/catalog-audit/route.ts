import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

type Severity = "critical" | "warning" | "info"

interface AuditIssue {
  severity: Severity
  category: string
  title: string
  detail: string
  count: number
  items: Array<{ id: string; name: string; extra?: string }>
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const client = await clientPromise
  const db = client.db()

  const [allProducts, cmsBadges, cmsCerts, allParts] = await Promise.all([
    db.collection("products").find({}).toArray(),
    db.collection("product_badges").find({}).toArray(),
    db.collection("certifications").find({}).toArray(),
    db.collection("spare_parts").find({}).toArray(),
  ])

  const productIds = new Set(allProducts.map((p) => String(p._id)))
  const cmsBadgeNames = new Set(cmsBadges.map((b) => String(b.name ?? "").toLowerCase().trim()))

  const issues: AuditIssue[] = []

  // ── 1. Duplicate slugs ── Critical
  const slugMap = new Map<string, typeof allProducts>()
  for (const p of allProducts) {
    if (!p.slug) continue
    slugMap.set(p.slug, [...(slugMap.get(p.slug) ?? []), p])
  }
  const dupSlugs = [...slugMap.entries()].filter(([, ps]) => ps.length > 1)
  if (dupSlugs.length > 0) {
    issues.push({
      severity: "critical",
      category: "Duplicate Slugs",
      title: `${dupSlugs.length} slug${dupSlugs.length > 1 ? "s" : ""} used by multiple products`,
      detail: "Duplicate slugs cause routing collisions and split SEO authority. Each product must have a unique slug.",
      count: dupSlugs.reduce((n, [, ps]) => n + ps.length, 0),
      items: dupSlugs.flatMap(([slug, ps]) =>
        ps.map((p) => ({ id: String(p._id), name: String(p.name ?? ""), extra: `slug: ${slug}` }))
      ),
    })
  }

  // ── 2. Products with no slug ── Critical
  const noSlug = allProducts.filter((p) => !String(p.slug ?? "").trim())
  if (noSlug.length > 0) {
    issues.push({
      severity: "critical",
      category: "Missing Slug",
      title: `${noSlug.length} product${noSlug.length > 1 ? "s" : ""} have no URL slug`,
      detail: "Products without slugs fall back to MongoDB _id in URLs. Set a canonical slug for each product.",
      count: noSlug.length,
      items: noSlug.map((p) => ({ id: String(p._id), name: String(p.name ?? "") })),
    })
  }

  // ── 3. Missing images ── Critical
  const noImages = allProducts.filter((p) => {
    const urls = Array.isArray(p.imageUrls) ? p.imageUrls.filter(Boolean) : []
    return urls.length === 0 && !p.imageUrl && !p.image
  })
  if (noImages.length > 0) {
    issues.push({
      severity: "critical",
      category: "Missing Images",
      title: `${noImages.length} product${noImages.length > 1 ? "s" : ""} have no images`,
      detail: "Products without images cannot be displayed in listings or detail pages. Upload at least one product photo.",
      count: noImages.length,
      items: noImages.map((p) => ({ id: String(p._id), name: String(p.name ?? "") })),
    })
  }

  // ── 4. Orphan spare parts ── Warning
  const orphanParts = allParts.filter((part) => {
    const ids: string[] = Array.isArray(part.compatibleProducts) ? part.compatibleProducts : []
    return ids.length > 0 && ids.some((id) => !productIds.has(String(id)))
  })
  if (orphanParts.length > 0) {
    issues.push({
      severity: "warning",
      category: "Orphan Spare Parts",
      title: `${orphanParts.length} spare part${orphanParts.length > 1 ? "s" : ""} linked to missing products`,
      detail: "These parts reference product IDs that no longer exist. Update the compatibleProducts list for each.",
      count: orphanParts.length,
      items: orphanParts.map((p) => ({ id: String(p._id), name: String(p.name ?? "") })),
    })
  }

  // ── 5. Missing SEO title ── Warning
  const noSeoTitle = allProducts.filter((p) => !String(p.seoTitle ?? "").trim())
  if (noSeoTitle.length > 0) {
    issues.push({
      severity: "warning",
      category: "Missing SEO",
      title: `${noSeoTitle.length} product${noSeoTitle.length > 1 ? "s" : ""} missing SEO title`,
      detail: "SEO titles control the headline shown in Google search results. Missing titles reduce click-through rates.",
      count: noSeoTitle.length,
      items: noSeoTitle.map((p) => ({ id: String(p._id), name: String(p.name ?? "") })),
    })
  }

  // ── 6. Missing meta description ── Warning
  const noMetaDesc = allProducts.filter((p) => !String(p.metaDescription ?? "").trim())
  if (noMetaDesc.length > 0) {
    issues.push({
      severity: "warning",
      category: "Missing SEO",
      title: `${noMetaDesc.length} product${noMetaDesc.length > 1 ? "s" : ""} missing meta description`,
      detail: "Meta descriptions appear as the snippet under the title in Google. Missing descriptions reduce organic CTR.",
      count: noMetaDesc.length,
      items: noMetaDesc.map((p) => ({ id: String(p._id), name: String(p.name ?? "") })),
    })
  }

  // ── 7. Unmatched badge mappings ── Warning
  const badgeIssues: Array<{ id: string; name: string; extra?: string }> = []
  for (const p of allProducts) {
    const badges: string[] = Array.isArray(p.badges) ? p.badges : []
    if (badges.length === 0) continue
    const unmatched = badges.filter((b) => !cmsBadgeNames.has(String(b).toLowerCase().trim()))
    if (unmatched.length > 0) {
      badgeIssues.push({ id: String(p._id), name: String(p.name ?? ""), extra: unmatched.join(", ") })
    }
  }
  if (badgeIssues.length > 0) {
    issues.push({
      severity: "warning",
      category: "Missing Badge Mappings",
      title: `${badgeIssues.length} product${badgeIssues.length > 1 ? "s" : ""} with unmatched badge strings`,
      detail: "Badge strings that don't match a CMS product_badges record won't render a badge icon on the product page.",
      count: badgeIssues.length,
      items: badgeIssues,
    })
  }

  // ── 8. Duplicate product names ── Warning
  const nameMap = new Map<string, typeof allProducts>()
  for (const p of allProducts) {
    const key = String(p.name ?? "").trim().toLowerCase()
    if (!key) continue
    nameMap.set(key, [...(nameMap.get(key) ?? []), p])
  }
  const dupNames = [...nameMap.entries()].filter(([, ps]) => ps.length > 1)
  if (dupNames.length > 0) {
    issues.push({
      severity: "warning",
      category: "Duplicate Products",
      title: `${dupNames.length} product name${dupNames.length > 1 ? "s" : ""} used by multiple entries`,
      detail: "Multiple products share the same name. Verify these are intentional variants and not accidental duplicates.",
      count: dupNames.reduce((n, [, ps]) => n + ps.length, 0),
      items: dupNames.flatMap(([, ps]) => ps.map((p) => ({ id: String(p._id), name: String(p.name ?? "") }))),
    })
  }

  // ── 9. Missing certifications ── Info
  const noCerts = allProducts.filter((p) => {
    const certs = Array.isArray(p.certifications) ? p.certifications : []
    return certs.length === 0
  })
  if (noCerts.length > 0) {
    issues.push({
      severity: "info",
      category: "Missing Certifications",
      title: `${noCerts.length} product${noCerts.length > 1 ? "s" : ""} have no certifications listed`,
      detail: "Certifications build buyer trust. Not required, but recommended for compliance-critical products.",
      count: noCerts.length,
      items: noCerts.map((p) => ({ id: String(p._id), name: String(p.name ?? "") })),
    })
  }

  // ── 10. Spare parts with no compatible product link ── Info
  const unlinkedParts = allParts.filter((part) => {
    const ids: string[] = Array.isArray(part.compatibleProducts) ? part.compatibleProducts : []
    const names: string[] = Array.isArray(part.compatibleProductNames) ? part.compatibleProductNames : []
    return ids.length === 0 && names.length === 0
  })
  if (unlinkedParts.length > 0) {
    issues.push({
      severity: "info",
      category: "Unlinked Spare Parts",
      title: `${unlinkedParts.length} spare part${unlinkedParts.length > 1 ? "s" : ""} not linked to any product`,
      detail: "These parts won't appear on any product's spare parts page because no product relationship is set.",
      count: unlinkedParts.length,
      items: unlinkedParts.map((p) => ({ id: String(p._id), name: String(p.name ?? "") })),
    })
  }

  const order: Record<Severity, number> = { critical: 0, warning: 1, info: 2 }
  issues.sort((a, b) => order[a.severity] - order[b.severity])

  return NextResponse.json({
    scannedAt: new Date().toISOString(),
    counts: {
      products: allProducts.length,
      published: allProducts.filter((p) => p.isPublished !== false).length,
      drafts: allProducts.filter((p) => p.isPublished === false).length,
      parts: allParts.length,
      badges: cmsBadges.length,
      certs: cmsCerts.length,
    },
    criticalCount: issues.filter((i) => i.severity === "critical").length,
    warningCount: issues.filter((i) => i.severity === "warning").length,
    infoCount: issues.filter((i) => i.severity === "info").length,
    issues,
  })
}
