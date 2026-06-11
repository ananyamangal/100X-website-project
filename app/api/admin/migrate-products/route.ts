/**
 * POST /api/admin/migrate-products
 *
 * One-time migration: normalizes all legacy product documents in MongoDB
 * to the canonical schema (string → string[], null → [], etc.).
 * Idempotent — safe to run multiple times.
 *
 * Protected by admin cookie auth (same pattern as other admin routes).
 */
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { toStringArray, toObjectArray } from "@/lib/normalizeProduct"
import { generateProductSlug } from "@/lib/productSlug"
import { requireAuth } from "@/lib/rbac/server"

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!("user" in auth)) return auth


  try {
    const client = await clientPromise
    const db = client.db()
    const products = await db.collection("products").find({}).toArray()

    const results = {
      total: products.length,
      migrated: 0,
      skipped: 0,
      errors: [] as string[],
    }

    for (const product of products) {
      try {
        const id = product._id

        // Build normalized imageUrls
        let imageUrls: string[] = []
        if (Array.isArray(product.imageUrls) && product.imageUrls.length > 0) {
          imageUrls = product.imageUrls.filter(Boolean)
        } else if (typeof product.imageUrls === "string" && product.imageUrls.trim()) {
          imageUrls = product.imageUrls.split(/\r?\n/).map((u: string) => u.trim()).filter(Boolean)
        } else if (typeof product.imageUrl === "string" && product.imageUrl.trim()) {
          imageUrls = [product.imageUrl]
        } else if (typeof product.image === "string" && product.image.trim()) {
          imageUrls = [product.image]
        }

        const productIdStr = String(product._id)
        const patch = {
          // Auto-generate slug for products that don't have one yet
          ...(!product.slug && { slug: generateProductSlug(product.name || "product", productIdStr) }),
          features: toStringArray(product.features),
          specifications: toStringArray(product.specifications),
          applications: toStringArray(product.applications),
          badges: toStringArray(product.badges),
          certifications: toStringArray(product.certifications),
          performanceMetrics: toStringArray(product.performanceMetrics),
          productFaqs: toStringArray(product.productFaqs),
          filmChapters: toObjectArray(product.filmChapters),
          boxContents: toObjectArray(product.boxContents),
          linkedCaseStudyIds: toObjectArray(product.linkedCaseStudyIds),
          imageUrls,
          migratedAt: new Date().toISOString(),
        }

        await db.collection("products").updateOne(
          { _id: id },
          { $set: patch }
        )
        results.migrated++
      } catch (err) {
        results.errors.push(`${product._id}: ${String(err)}`)
        results.skipped++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration complete: ${results.migrated}/${results.total} products normalized.`,
      ...results,
    })
  } catch (error) {
    console.error("❌ Migration failed:", error)
    return NextResponse.json({ error: "Migration failed", details: String(error) }, { status: 500 })
  }
}

/** GET — dry-run: shows what would be migrated without writing anything. */
export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const client = await clientPromise
    const db = client.db()
    const products = await db.collection("products").find({}).toArray()

    const report = products.map((p) => ({
      _id: String(p._id),
      name: p.name,
      currentSlug: p.slug || null,
      issues: [
        !p.slug && "missing slug",
        !Array.isArray(p.features) && "features is not array",
        !Array.isArray(p.specifications) && "specifications is not array",
        !Array.isArray(p.applications) && "applications is not array",
        !Array.isArray(p.badges) && "badges is not array",
        !Array.isArray(p.certifications) && "certifications is not array",
        !Array.isArray(p.performanceMetrics) && "performanceMetrics is not array",
        !Array.isArray(p.productFaqs) && "productFaqs is not array",
        !Array.isArray(p.filmChapters) && "filmChapters is not array",
        !Array.isArray(p.boxContents) && "boxContents is not array",
        !Array.isArray(p.imageUrls) && "imageUrls is not array",
      ].filter(Boolean),
    }))

    const needsMigration = report.filter((r) => r.issues.length > 0)
    return NextResponse.json({
      total: products.length,
      needsMigration: needsMigration.length,
      clean: products.length - needsMigration.length,
      products: needsMigration,
    })
  } catch (error) {
    return NextResponse.json({ error: "Dry-run failed", details: String(error) }, { status: 500 })
  }
}
