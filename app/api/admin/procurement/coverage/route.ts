/**
 * GET /api/admin/procurement/coverage
 *
 * Returns a unified coverage report showing exactly what data is in each
 * procurement collection and what is searchable vs not yet imported.
 *
 * gem_contracts  — raw GeM contract archive, all categories, partial enrichment
 * fogging_contracts — curated fogging-only subset, fully enriched
 */
import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const maxDuration = 30

export async function GET() {
  const t0 = Date.now()
  const db = (await clientPromise).db()

  const [
    // gem_contracts (universal archive)
    gemTotal,
    gemEnriched,
    gemMissingProduct,
    gemTopProducts,
    gemTopDepts,
    gemLastDoc,
    gemGmv,

    // fogging_contracts (curated subset)
    fogTotal,
    fogGmv,
    fogOemEnriched,
    fogStates,

    // harvester state
    harvesterState,
  ] = await Promise.all([
    db.collection("gem_contracts").countDocuments(),
    db.collection("gem_contracts").countDocuments({ detail_scraped: true }),
    db.collection("gem_contracts").countDocuments({ product_name: { $in: [null, ""] } }),

    // Top 15 product categories by count (only from enriched records)
    db.collection("gem_contracts").aggregate([
      { $match: { product_name: { $nin: [null, ""] } } },
      { $group: { _id: "$product_name", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]).toArray(),

    db.collection("gem_contracts").aggregate([
      { $match: { dept_name: { $nin: [null, ""] } } },
      { $group: { _id: "$dept_name", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]).toArray(),

    db.collection("gem_contracts").find({}).sort({ first_seen: -1 }).limit(1)
      .project({ first_seen: 1, contract_date_dt: 1 }).toArray(),

    db.collection("gem_contracts").aggregate([
      { $group: { _id: null, total: { $sum: "$contract_value_num" } } },
    ]).toArray(),

    // fogging_contracts
    db.collection("fogging_contracts").countDocuments(),
    db.collection("fogging_contracts").aggregate([
      { $group: { _id: null, total: { $sum: "$contract_value_num" } } },
    ]).toArray(),
    db.collection("fogging_contracts").countDocuments({ oem_canonical: { $nin: [null, ""] } }),
    db.collection("fogging_contracts").distinct("buyer_state").then(a => a.filter(Boolean).length),

    // harvester
    db.collection("harvester_state").findOne({ key: "singleton" }),
  ])

  const gemEnrichPct = gemTotal > 0 ? Math.round((gemEnriched / gemTotal) * 100) : 0
  const gemSearchablePct = gemTotal > 0 ? Math.round(((gemTotal - gemMissingProduct) / gemTotal) * 100) : 0
  const fogGmvCr = +((fogGmv[0]?.total ?? 0) / 10_000_000).toFixed(2)
  const gemGmvCr = +((gemGmv[0]?.total ?? 0) / 10_000_000).toFixed(2)
  const lastHarvest = gemLastDoc[0]?.first_seen
    ? new Date(gemLastDoc[0].first_seen).toISOString()
    : null

  const hs = harvesterState as Record<string, unknown> | null

  return NextResponse.json({
    processingMs: Date.now() - t0,

    gem: {
      label:           "Imported Contract Archive",
      description:     "Raw GeM contracts imported from the GeM archive. Contains all categories where contracts were harvested.",
      totalContracts:  gemTotal,
      enrichedCount:   gemEnriched,
      enrichedPct:     gemEnrichPct,
      searchableCount: gemTotal - gemMissingProduct,
      searchablePct:   gemSearchablePct,
      missingProduct:  gemMissingProduct,
      totalGmvCr:      gemGmvCr,
      lastImport:      lastHarvest,
      isUniversal:     false,
      scopeNote:       gemTotal === 0
        ? "No contracts imported yet."
        : `${gemTotal.toLocaleString("en-IN")} contracts across all harvested categories. ${gemMissingProduct.toLocaleString("en-IN")} contracts missing product name (not yet enriched — cannot be found by product search).`,
      topProducts: gemTopProducts.map(p => ({ name: String(p._id), count: p.count as number })),
      topDepts:    gemTopDepts.map(d => ({ name: String(d._id), count: d.count as number })),
    },

    fogging: {
      label:          "Fogging Intelligence Dataset",
      description:    "Curated, fully enriched fogging machine contracts only. Used by Fogging Intelligence, Registry, and Market Intelligence.",
      totalContracts: fogTotal,
      totalGmvCr:     fogGmvCr,
      oemEnrichedPct: fogTotal > 0 ? Math.round((fogOemEnriched / fogTotal) * 100) : 0,
      statesCovered:  fogStates,
      datasetVersion: "v1.4",
      scopeNote:      `1,418 fogging machine contracts from GeM. Fully enriched with OEM, model, buyer, and department classification. This is the ONLY category with full enrichment.`,
    },

    harvester: {
      lastScannedId: hs?.last_scanned_id ?? null,
      isRunning:     hs?.running ?? false,
      progressNote:  hs?.last_scanned_id
        ? `Harvester position: ID #${Number(hs.last_scanned_id).toLocaleString("en-IN")}. GeM frontier is ~9.4M. Gap = ${(9_420_000 - Number(hs.last_scanned_id)).toLocaleString("en-IN")} IDs remaining.`
        : "Harvester position unknown.",
    },

    searchScope: {
      contractsTab:  "gem_contracts — all imported categories (product search requires detail_scraped=true)",
      analyticsTab:  "fogging_contracts — fogging only (fully enriched)",
      aiAnalystTab:  "gem_contracts + knowledge graph — all harvested categories",
      registryPanel: "fogging_contracts — fogging summary stats",
    },

    limitation: gemTotal === 0
      ? "No contracts have been imported yet. The gem_contracts archive is empty."
      : `Only contracts in the harvested archive are searchable. Categories not yet imported (e.g., Note Sorting Machines, most non-fogging products) will return zero or minimal results. To add a category, import its contracts from the GeM archive.`,
  })
}
