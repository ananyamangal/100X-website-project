// GET /api/admin/procurement/health
// Comprehensive collection health, data quality, enrichment gaps, and staleness report.
// Designed to be the single source of truth for operational state.

import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requirePermission } from "@/lib/rbac/server"

export const maxDuration = 60

interface CollectionStat {
  name:         string
  count:        number
  label:        string
  lastUpdated:  Date | null
  staleDays:    number | null
  status:       "healthy" | "warn" | "critical" | "empty"
  notes:        string[]
}

function staleness(last: Date | null): number | null {
  if (!last) return null
  return Math.floor((Date.now() - last.getTime()) / 86_400_000)
}

function collectionStatus(count: number, stale: number | null): "healthy" | "warn" | "critical" | "empty" {
  if (count === 0)  return "empty"
  if (stale === null || stale > 30) return "warn"
  if (stale > 60)   return "critical"
  return "healthy"
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "procurement.view")
  if (!("user" in auth)) return auth

  const db = (await clientPromise).db()

  // ── Parallel queries ───────────────────────────────────────────────────────
  const [
    contractsTotal, contractsEnriched, contractsMissingValue, contractsMissingDept,
    contractsMissingProduct, contractsMissingState, contractsMissingMinistry,
    contractsMissingGst, contractsLowConfidence, contractsLastDoc,
    contractsEnrichmentErrors,
    dealersTotal, dealersWithScore, dealersWithoutScore, dealersLastDoc,
    dealersNoBids, dealersDuplicateCheck,
    bidsTotal, bidsLastDoc,
    kgCounts, insightsTotal, insightsLastDoc,
    alertsTotal, alertsUnread, alertsLastDoc,
    cacheSize,
    harvesterState,
    bidLifecycleTotal,
    productsTotal, productsMissingImages, productsMissingDesc, productsMissingSpec,
    productsMissingPrice, productsMissingSlug,
  ] = await Promise.all([
    // gem_contracts
    db.collection("gem_contracts").countDocuments(),
    db.collection("gem_contracts").countDocuments({ detail_scraped: true }),
    db.collection("gem_contracts").countDocuments({ contract_value_num: { $in: [null, 0] } }),
    db.collection("gem_contracts").countDocuments({ dept_name: { $in: [null, ""] } }),
    db.collection("gem_contracts").countDocuments({ product_name: { $in: [null, ""] } }),
    db.collection("gem_contracts").countDocuments({ seller_state: { $in: [null, ""] } }),
    db.collection("gem_contracts").countDocuments({ ministry: { $in: [null, ""] } }),
    db.collection("gem_contracts").countDocuments({ seller_gst: { $in: [null, ""] } }),
    db.collection("gem_contracts").countDocuments({ extraction_confidence: { $lt: 0.5 } }),
    db.collection("gem_contracts").find({}).sort({ first_seen: -1 }).limit(1).project({ first_seen: 1 }).toArray(),
    db.collection("gem_contracts").countDocuments({ enrichment_error: { $exists: true, $ne: null } }),

    // gem_dealers
    db.collection("gem_dealers").countDocuments(),
    db.collection("gem_dealers").countDocuments({ opportunity_score: { $exists: true, $gt: 0 } }),
    db.collection("gem_dealers").countDocuments({ $or: [{ opportunity_score: { $exists: false } }, { opportunity_score: 0 }] }),
    db.collection("gem_dealers").find({}).sort({ scores_updated_at: -1 }).limit(1).project({ scores_updated_at: 1 }).toArray(),
    db.collection("gem_dealers").countDocuments({ total_contracts: { $in: [null, 0] } }),
    db.collection("gem_dealers").aggregate([
      { $group: { _id: "$seller_name_canonical", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: "duplicates" }
    ]).toArray(),

    // gem_awarded_bids
    db.collection("gem_awarded_bids").countDocuments(),
    db.collection("gem_awarded_bids").find({}).sort({ updated_at: -1 }).limit(1).project({ updated_at: 1 }).toArray(),

    // knowledge graph
    Promise.all([
      "gem_kg_dealer_dept","gem_kg_dealer_product","gem_kg_dealer_state",
      "gem_kg_dept_product","gem_kg_dealer_scores","gem_kg_dept_scores","gem_kg_product_scores"
    ].map(c => db.collection(c).countDocuments().then(n => ({ c, n })))),

    // insights + alerts + cache
    db.collection("gem_procurement_insights").countDocuments(),
    db.collection("gem_procurement_insights").find({}).sort({ generated_at: -1 }).limit(1).project({ generated_at: 1 }).toArray(),
    db.collection("gem_procurement_alerts").countDocuments(),
    db.collection("gem_procurement_alerts").countDocuments({ read: { $ne: true } }),
    db.collection("gem_procurement_alerts").find({}).sort({ created_at: -1 }).limit(1).project({ created_at: 1 }).toArray(),
    db.collection("gem_procurement_query_cache").countDocuments(),

    // harvester state
    db.collection("harvester_state").findOne({ key: "singleton" }),

    // bid_lifecycle (legacy)
    db.collection("bid_lifecycle").countDocuments(),

    // website products
    db.collection("products").countDocuments(),
    db.collection("products").countDocuments({ $or: [{ images: { $exists: false } }, { images: { $size: 0 } }, { images: null }] }),
    db.collection("products").countDocuments({ $or: [{ description: { $exists: false } }, { description: "" }, { description: null }] }),
    db.collection("products").countDocuments({ $or: [{ specifications: { $exists: false } }, { specifications: { $size: 0 } }] }),
    db.collection("products").countDocuments({ $or: [{ price: { $exists: false } }, { price: null }, { price: 0 }] }),
    db.collection("products").countDocuments({ $or: [{ slug: { $exists: false } }, { slug: "" }, { slug: null }] }),
  ])

  const now = new Date()

  // ── Enrichment analysis ────────────────────────────────────────────────────
  const pendingEnrichment     = contractsTotal - contractsEnriched
  const pctEnriched           = contractsTotal ? Math.round((contractsEnriched / contractsTotal) * 100) : 0
  const contractsLastSeen     = contractsLastDoc[0]?.first_seen ? new Date(contractsLastDoc[0].first_seen) : null
  const contractsStaleDays    = staleness(contractsLastSeen)

  // ── KG analysis ───────────────────────────────────────────────────────────
  const kgMap   = Object.fromEntries(kgCounts.map(({ c, n }) => [c, n]))
  const kgBuilt = kgCounts.every(({ n }) => n > 0)
  const kgTotal = kgCounts.reduce((s, { n }) => s + n, 0)

  // ── Dealer analysis ───────────────────────────────────────────────────────
  const dealerDuplicates      = (dealersDuplicateCheck[0] as { duplicates?: number } | undefined)?.duplicates ?? 0
  const dealerScoreStale      = dealersLastDoc[0]?.scores_updated_at
    ? Math.floor((now.getTime() - new Date(dealersLastDoc[0].scores_updated_at).getTime()) / 86_400_000)
    : null

  // ── Issues list (ordered by severity) ────────────────────────────────────
  const issues: Array<{ sev: "critical" | "warn" | "info"; msg: string; action: string }> = []

  if (pctEnriched < 95) {
    issues.push({
      sev: pctEnriched < 80 ? "critical" : "warn",
      msg: `${pendingEnrichment} contracts unenriched (${pctEnriched}% complete)`,
      action: "Run Enrich Pending in the Health tab — targets >95%",
    })
  }
  if (contractsEnrichmentErrors > 0) {
    issues.push({
      sev: "warn",
      msg: `${contractsEnrichmentErrors} contracts with enrichment errors`,
      action: "Re-trigger enrichment for failed contracts",
    })
  }
  if (contractsMissingValue > 0) {
    issues.push({
      sev: "warn",
      msg: `${contractsMissingValue} contracts missing contract value (${Math.round(contractsMissingValue/contractsTotal*100)}%)`,
      action: "Check extraction_confidence — re-enrich low-confidence records",
    })
  }
  if (contractsMissingDept > 0) {
    issues.push({
      sev: "warn",
      msg: `${contractsMissingDept} contracts missing dept_name`,
      action: "Re-enrich contracts with dept_name = null",
    })
  }
  if (contractsMissingProduct > 0) {
    issues.push({
      sev: contractsMissingProduct > contractsTotal * 0.3 ? "critical" : "warn",
      msg: `${contractsMissingProduct} contracts missing product_name`,
      action: "Product name is critical for product-level intelligence — enrich now",
    })
  }
  if (!kgBuilt) {
    issues.push({
      sev: "critical",
      msg: "Knowledge Graph not built or has empty collections",
      action: "Run Knowledge Graph Build in AI Analyst tab",
    })
  } else if (kgTotal < 1000) {
    issues.push({
      sev: "warn",
      msg: `Knowledge Graph has only ${kgTotal} total nodes — may be underbuilt`,
      action: "Rebuild Knowledge Graph after enriching more contracts",
    })
  }
  if (dealersWithoutScore > 0) {
    issues.push({
      sev: "info",
      msg: `${dealersWithoutScore} dealers without opportunity score`,
      action: "Run Enrich Dealer Scores in Operations",
    })
  }
  if (dealerDuplicates > 0) {
    issues.push({
      sev: "warn",
      msg: `${dealerDuplicates} duplicate dealer entities (same canonical_name, multiple docs)`,
      action: "Run dealer deduplication script",
    })
  }
  if (contractsStaleDays !== null && contractsStaleDays > 3) {
    issues.push({
      sev: contractsStaleDays > 10 ? "critical" : "warn",
      msg: `No new contracts collected in ${contractsStaleDays} days`,
      action: "Check if Vercel cron is running — manually trigger harvest",
    })
  }
  if (dealerScoreStale !== null && dealerScoreStale > 7) {
    issues.push({
      sev: "info",
      msg: `Dealer scores ${dealerScoreStale} days stale`,
      action: "Run Enrich Dealer Scores",
    })
  }
  if (insightsTotal === 0) {
    issues.push({ sev: "warn", msg: "No procurement insights generated", action: "Trigger insights generation from Auto Insights tab" })
  }

  // ── ROI recommendations ───────────────────────────────────────────────────
  const roiActions: Array<{ rank: number; action: string; why: string; effort: string }> = [
    {
      rank: 1,
      action: "Complete contract enrichment to >95%",
      why:   `${pendingEnrichment} contracts are unenriched — missing GMV, dept, product, and seller data blocks all downstream intelligence`,
      effort: "Low — automated, trigger once",
    },
    {
      rank: 2,
      action: "Rebuild Knowledge Graph after enrichment",
      why:   "KG drives dealer scoring and product-department relationship maps — stale KG means mis-ranked dealer targets",
      effort: "Low — 1 click",
    },
    {
      rank: 3,
      action: "Run Enrich Dealer Scores",
      why:   `${dealersWithoutScore} dealers have no opportunity score — sales team cannot prioritize outreach`,
      effort: "Low — automated",
    },
    {
      rank: 4,
      action: "Export Top 20 Dealer Targets and begin outreach",
      why:   "Dealer Acquisition tab identifies high-opportunity dealers. Converting 1 dealer = ₹5L+ GMV potential.",
      effort: "Medium — requires sales team action",
    },
    {
      rank: 5,
      action: "Use Copilot to identify departments buying competing products",
      why:   "Find departments with active fogging procurement budgets before they issue next tender",
      effort: "Low — query available now",
    },
  ]

  return NextResponse.json({
    generatedAt:    now.toISOString(),
    contracts: {
      total:               contractsTotal,
      enriched:            contractsEnriched,
      pending:             pendingEnrichment,
      pctEnriched,
      enrichmentErrors:    contractsEnrichmentErrors,
      missingValue:        contractsMissingValue,
      missingDept:         contractsMissingDept,
      missingProduct:      contractsMissingProduct,
      missingState:        contractsMissingState,
      missingMinistry:     contractsMissingMinistry,
      missingGst:          contractsMissingGst,
      lowConfidence:       contractsLowConfidence,
      lastCollected:       contractsLastSeen?.toISOString() ?? null,
      staleDays:           contractsStaleDays,
    },
    dealers: {
      total:         dealersTotal,
      withScore:     dealersWithScore,
      withoutScore:  dealersWithoutScore,
      noBids:        dealersNoBids,
      duplicates:    dealerDuplicates,
      scoreAgeDays:  dealerScoreStale,
    },
    knowledgeGraph: {
      built:       kgBuilt,
      totalNodes:  kgTotal,
      collections: kgMap,
    },
    legacyBids: {
      gemAwardedBids:  bidsTotal,
      bidLifecycle:    bidLifecycleTotal,
    },
    insights: {
      total:       insightsTotal,
      lastUpdated: insightsLastDoc[0]?.generated_at ?? null,
    },
    alerts: {
      total:  alertsTotal,
      unread: alertsUnread,
    },
    harvester: {
      lastScannedId: (harvesterState as Record<string, unknown> | null)?.last_scanned_id ?? null,
      isRunning:     (harvesterState as Record<string, unknown> | null)?.running ?? false,
    },
    queryCache: {
      size: cacheSize,
    },
    websiteProducts: {
      total:            productsTotal,
      missingImages:    productsMissingImages,
      missingDesc:      productsMissingDesc,
      missingSpec:      productsMissingSpec,
      missingPrice:     productsMissingPrice,
      missingSlug:      productsMissingSlug,
    },
    issues,
    roiActions,
  })
}
