/**
 * GET  /api/admin/growth/categories  — list all categories with live stats
 * POST /api/admin/growth/categories  — upsert custom category (or re-seed defaults)
 */
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { CATEGORY_CATALOG } from "@/lib/category-catalog"
import type { Db } from "mongodb"

const PACK_NAMES = ["procurement", "buyer", "supplier", "oem", "competitor", "market", "aiSearch"] as const

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET() {
  const t0 = Date.now()
  const db = (await clientPromise).db()

  // Seed if empty
  const existingCount = await db.collection("gem_categories").countDocuments()
  if (existingCount === 0) {
    await seedDefaults(db)
  }

  const categories = await db.collection("gem_categories")
    .find({})
    .sort({ sortOrder: 1 })
    .toArray()

  // Attach live stats from DB
  const withStats = await Promise.all(categories.map(async cat => {
    let liveStats: Record<string, unknown> = {}

    if (cat.slug === "fogging-machines") {
      // Use curated collection for fogging
      const [total, gmv, oem, states, buyers] = await Promise.all([
        db.collection("fogging_contracts").countDocuments(),
        db.collection("fogging_contracts").aggregate([
          { $group: { _id: null, total: { $sum: "$contract_value_num" } } }
        ]).toArray(),
        db.collection("fogging_contracts").countDocuments({ oem_canonical: { $nin: [null, ""] } }),
        db.collection("fogging_contracts").distinct("buyer_state").then(a => a.filter(Boolean).length),
        db.collection("fogging_contracts").distinct("buyer_canonical").then(a => a.filter(Boolean).length),
      ])
      liveStats = {
        importedContracts: total,
        gmvCr: +((gmv[0]?.total ?? 0) / 10_000_000).toFixed(2),
        enrichedContracts: oem,
        statesCovered: states,
        buyerCount: buyers,
        coveragePct: 100,
      }
    } else {
      // Use gem_contracts tagged with this category_slug
      const slug = String(cat.slug)
      const [total, gmv, states, buyers] = await Promise.all([
        db.collection("gem_contracts").countDocuments({ category_slugs: slug }),
        db.collection("gem_contracts").aggregate([
          { $match: { category_slugs: slug } },
          { $group: { _id: null, total: { $sum: "$contract_value_num" } } },
        ]).toArray(),
        db.collection("gem_contracts").distinct("seller_state", { category_slugs: slug })
          .then(a => a.filter(Boolean).length),
        db.collection("gem_contracts").distinct("buyer_name", { category_slugs: slug })
          .then(a => a.filter(Boolean).length),
      ])
      const estimate = cat.estimate as { contracts: number } | undefined
      liveStats = {
        importedContracts: total,
        gmvCr: +((gmv[0]?.total ?? 0) / 10_000_000).toFixed(2),
        enrichedContracts: 0,
        statesCovered: states,
        buyerCount: buyers,
        coveragePct: estimate?.contracts
          ? Math.round((total / estimate.contracts) * 100)
          : 0,
      }
    }

    // Derive status
    const imported = (liveStats.importedContracts as number) ?? 0
    let status = cat.status as string
    if (status !== "active" && imported > 0) status = "active"
    if (status !== "active" && status !== "importing") {
      const job = await db.collection("category_jobs").findOne(
        { categorySlug: cat.slug, status: "running" }
      )
      if (job) status = "importing"
    }

    return { ...cat, liveStats, status, _id: cat._id.toString() }
  }))

  // Summary
  const totalImported  = withStats.reduce((s, c) => s + ((c.liveStats?.importedContracts as number) ?? 0), 0)
  const totalGmv       = withStats.reduce((s, c) => s + ((c.liveStats?.gmvCr as number) ?? 0), 0)
  const activeCount    = withStats.filter(c => c.status === "active").length
  const importingCount = withStats.filter(c => c.status === "importing").length

  return NextResponse.json({
    categories:     withStats,
    summary: {
      totalCategories:  withStats.length,
      activeCategories: activeCount,
      importing:        importingCount,
      totalImported,
      totalGmvCr: +totalGmv.toFixed(2),
    },
    processingMs: Date.now() - t0,
  })
}

// ─── POST — add custom category ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body

  const db = (await clientPromise).db()

  if (action === "seed_defaults") {
    await db.collection("gem_categories").deleteMany({})
    await seedDefaults(db)
    return NextResponse.json({ ok: true, seeded: CATEGORY_CATALOG.length })
  }

  // Add custom category
  const { slug, name, description, keywords, icon } = body
  if (!slug || !name || !keywords?.length) {
    return NextResponse.json({ error: "slug, name, and keywords required" }, { status: 400 })
  }

  const existing = await db.collection("gem_categories").findOne({ slug })
  if (existing) {
    return NextResponse.json({ error: "Category slug already exists" }, { status: 409 })
  }

  const cat = {
    slug, name, description: description ?? "", icon: icon ?? "📦",
    keywords,
    status:    "not_started",
    enabled:   true,
    sortOrder: 999,
    estimate:  { contracts: 0, gmvCr: 0, importTimeMin: 0, storageMb: 0 },
    packs:     Object.fromEntries(PACK_NAMES.map(k => [k, "not_started"])),
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection("gem_categories").insertOne(cat)
  return NextResponse.json({ ok: true, category: cat })
}

// ─── Seed helper ──────────────────────────────────────────────────────────────

async function seedDefaults(db: Db) {
  const docs = CATEGORY_CATALOG.map((c, i) => ({
    ...c,
    status:   c.slug === "fogging-machines" ? "active" : "not_started",
    enabled:  true,
    sortOrder: i,
    createdAt: new Date(),
    updatedAt: new Date(),
  }))
  await db.collection("gem_categories").insertMany(docs)
}
