/**
 * GET /api/admin/growth/categories/coverage
 *
 * Returns per-category coverage stats for the Coverage Dashboard.
 * Shows contracts, GMV, buyers, states, data quality, and last refresh per category.
 */
import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { CATEGORY_CATALOG } from "@/lib/category-catalog"

export const maxDuration = 30

export async function GET() {
  const t0 = Date.now()
  const db = (await clientPromise).db()

  const rows = await Promise.all(CATEGORY_CATALOG.map(async cat => {
    if (cat.slug === "fogging-machines") {
      const [total, gmv, oem, states, buyers, lastDoc] = await Promise.all([
        db.collection("fogging_contracts").countDocuments(),
        db.collection("fogging_contracts").aggregate([
          { $group: { _id: null, total: { $sum: "$contract_value_num" } } }
        ]).toArray(),
        db.collection("fogging_contracts").countDocuments({ oem_canonical: { $nin: [null, ""] } }),
        db.collection("fogging_contracts").distinct("buyer_state").then(a => a.filter(Boolean).length),
        db.collection("fogging_contracts").distinct("buyer_canonical").then(a => a.filter(Boolean).length),
        db.collection("fogging_contracts").findOne({}, { sort: { contract_date_dt: -1 }, projection: { contract_date_dt: 1 } }),
      ])
      const gmvCr     = +((gmv[0]?.total ?? 0) / 10_000_000).toFixed(2)
      const enrichPct = total > 0 ? Math.round((oem / total) * 100) : 0
      return {
        slug:     cat.slug,
        name:     cat.name,
        icon:     cat.icon,
        status:   "active",
        contracts: total,
        gmvCr,
        buyers,
        states,
        enrichPct,
        qualityScore: 92,
        coveragePct:  100,
        lastRefresh:  lastDoc?.contract_date_dt ?? null,
        source:       "fogging_contracts (v1.4 curated)",
        packs:        { procurement: "active", buyer: "active", supplier: "active", oem: "active", competitor: "active", market: "active", aiSearch: "pending" },
      }
    }

    // Generic: gem_contracts tagged with this category_slug
    const slug = cat.slug
    const [total, gmv, states, buyers, lastDoc] = await Promise.all([
      db.collection("gem_contracts").countDocuments({ category_slugs: slug }),
      db.collection("gem_contracts").aggregate([
        { $match: { category_slugs: slug } },
        { $group: { _id: null, total: { $sum: "$contract_value_num" } } },
      ]).toArray(),
      db.collection("gem_contracts")
        .distinct("seller_state", { category_slugs: slug })
        .then(a => a.filter(Boolean).length),
      db.collection("gem_contracts")
        .distinct("buyer_name", { category_slugs: slug })
        .then(a => a.filter(Boolean).length),
      db.collection("gem_contracts").findOne(
        { category_slugs: slug },
        { sort: { first_seen: -1 }, projection: { first_seen: 1 } }
      ),
    ])

    const gmvCr      = +((gmv[0]?.total ?? 0) / 10_000_000).toFixed(2)
    const estContracts = cat.estimate.contracts
    const coveragePct  = estContracts > 0 ? Math.round((total / estContracts) * 100) : 0

    // Data quality: based on enrichment available
    const enrichedCount = await db.collection("gem_contracts").countDocuments({
      category_slugs: slug,
      detail_scraped: true,
    })
    const enrichPct = total > 0 ? Math.round((enrichedCount / total) * 100) : 0
    const qualityScore = total === 0 ? 0
      : Math.round(enrichPct * 0.5 + (states > 3 ? 25 : 10) + (buyers > 5 ? 25 : 10))

    return {
      slug,
      name:        cat.name,
      icon:        cat.icon,
      status:      total > 0 ? "active" : "not_started",
      contracts:   total,
      gmvCr,
      buyers,
      states,
      enrichPct,
      qualityScore: Math.min(100, qualityScore),
      coveragePct,
      lastRefresh:  lastDoc?.first_seen ?? null,
      source:       "gem_contracts (tagged)",
      packs:        total > 0
        ? { procurement: "active", buyer: "active", supplier: "active", oem: "pending", competitor: "not_started", market: "pending", aiSearch: "not_started" }
        : Object.fromEntries(["procurement","buyer","supplier","oem","competitor","market","aiSearch"].map(k => [k, "not_started"])),
      archiveNote: total === 0
        ? "Archive not yet imported for this category"
        : undefined,
    }
  }))

  const totalContracts  = rows.reduce((s, r) => s + r.contracts, 0)
  const totalGmvCr      = +rows.reduce((s, r) => s + r.gmvCr, 0).toFixed(2)
  const activeCategories = rows.filter(r => r.status === "active").length
  const pendingCategories = rows.filter(r => r.status === "not_started").length

  return NextResponse.json({
    rows,
    summary: {
      totalContracts,
      totalGmvCr,
      totalCategories:   rows.length,
      activeCategories,
      pendingCategories,
    },
    processingMs: Date.now() - t0,
  })
}
