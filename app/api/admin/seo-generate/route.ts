import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

// ── Title generator ────────────────────────────────────────────────────────────
// Rules: 50–65 chars · Product Name + keyword + India · 100X brand at end
function generateSeoTitle(name: string): string {
  const full = `${name} Manufacturer in India | 100X Circle`
  if (full.length <= 65) return full

  const mid = `${name} | OEM Manufacturer India | 100X`
  if (mid.length <= 65) return mid

  // Truncate name to fit
  const suffix = " | India Manufacturer | 100X"
  return name.slice(0, 65 - suffix.length) + suffix
}

// ── Description generator ──────────────────────────────────────────────────────
// Rules: 120–155 chars · category · use case · OEM India · GeM
function generateMetaDesc(
  name: string,
  category: string,
  applications: unknown[],
): string {
  const appNames = applications
    .slice(0, 2)
    .map((a) => {
      if (typeof a === "string") return a
      const obj = a as Record<string, unknown>
      return String(obj.name ?? obj.title ?? obj.label ?? "")
    })
    .filter(Boolean)

  const cat = category
    ? category.toLowerCase()
    : "thermal fogging machine"

  let desc = ""
  if (appNames.length > 0) {
    desc = `${name}: ${cat} for ${appNames.join(" & ")}. OEM manufacturer in India. GeM registered supplier.`
  } else {
    desc = `${name}: professional ${cat} by 100X Circle. OEM manufacturer & GeM supplier in India.`
  }

  // Pad to ≥ 120 if short
  if (desc.length < 120) {
    desc += " Trusted by municipalities, pest control agencies & agriculture sector."
  }

  // Hard cap at 155
  if (desc.length > 155) desc = desc.slice(0, 152) + "…"

  return desc
}

// ── GET — preview what would be generated ─────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const client = await clientPromise
  const db = client.db()

  const products = await db
    .collection("products")
    .find({}, {
      projection: {
        _id: 1, name: 1, slug: 1, category: 1, applications: 1,
        seoTitle: 1, metaDescription: 1, h1Title: 1, shortDescription: 1,
        isPublished: 1,
      },
    })
    .sort({ order: 1, createdAt: -1 })
    .toArray()

  const preview = products.map((p) => {
    const id = String(p._id)
    const name = String(p.name ?? "")
    const slug = String(p.slug ?? id)
    const existing = {
      seoTitle: String(p.seoTitle ?? "").trim(),
      metaDescription: String(p.metaDescription ?? "").trim(),
    }
    const needs = {
      seoTitle: !existing.seoTitle,
      metaDescription: !existing.metaDescription,
    }
    const generated = {
      seoTitle: needs.seoTitle
        ? generateSeoTitle(name)
        : null,
      metaDescription: needs.metaDescription
        ? generateMetaDesc(
            name,
            String(p.category ?? ""),
            Array.isArray(p.applications) ? p.applications : [],
          )
        : null,
    }

    return {
      id,
      name,
      slug,
      url: `/products/${slug}`,
      existingSeoTitle: existing.seoTitle || null,
      existingMetaDesc: existing.metaDescription || null,
      h1: String(p.h1Title ?? p.name ?? ""),
      generatedSeoTitle: generated.seoTitle,
      generatedMetaDesc: generated.metaDescription,
      needsSeoTitle: needs.seoTitle,
      needsMetaDesc: needs.metaDescription,
      willChange: needs.seoTitle || needs.metaDescription,
    }
  })

  const toChange = preview.filter((p) => p.willChange)
  const toSkip = preview.filter((p) => !p.willChange)

  return NextResponse.json({
    previewGeneratedAt: new Date().toISOString(),
    totalProducts: products.length,
    willChange: toChange.length,
    willSkip: toSkip.length,
    // SEO Protection Audit — these fields are NEVER touched by this endpoint
    protectionAudit: {
      slugsUnchanged: true,
      urlsUnchanged: true,
      canonicalsUnchanged: true,
      structuredDataUnchanged: true,
      internalLinksUnchanged: true,
      sitemapCountUnchanged: true,
      riskLevel: "LOW",
    },
    preview,
  })
}

// ── POST — approve and save (blank fields only) ────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const updates: Array<{ id: string; seoTitle?: string; metaDescription?: string }> =
    body.updates ?? []

  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 })
  }

  const client = await clientPromise
  const db = client.db()

  const results = { saved: 0, skipped: 0, errors: 0, details: [] as string[] }

  for (const u of updates) {
    if (!u.id || !ObjectId.isValid(u.id)) {
      results.errors++
      continue
    }

    // Re-read the current document to enforce "never overwrite existing" rule
    const current = await db
      .collection("products")
      .findOne({ _id: new ObjectId(u.id) }, { projection: { seoTitle: 1, metaDescription: 1, name: 1, slug: 1 } })

    if (!current) {
      results.errors++
      continue
    }

    const $set: Record<string, string> = { updatedAt: new Date().toISOString() }
    let changed = false

    // Only write seoTitle if STILL blank in DB right now
    if (u.seoTitle && !String(current.seoTitle ?? "").trim()) {
      $set.seoTitle = u.seoTitle
      changed = true
    }

    // Only write metaDescription if STILL blank in DB right now
    if (u.metaDescription && !String(current.metaDescription ?? "").trim()) {
      $set.metaDescription = u.metaDescription
      changed = true
    }

    if (!changed) {
      results.skipped++
      continue
    }

    await db.collection("products").updateOne(
      { _id: new ObjectId(u.id) },
      { $set },
    )
    results.saved++
    results.details.push(String(current.name ?? u.id))
  }

  return NextResponse.json({
    success: true,
    ...results,
    // Final SEO Protection confirmation
    protectionAudit: {
      slugsUnchanged: true,
      urlsUnchanged: true,
      canonicalsUnchanged: true,
      structuredDataUnchanged: true,
      riskLevel: "LOW",
    },
    savedAt: new Date().toISOString(),
  })
}
