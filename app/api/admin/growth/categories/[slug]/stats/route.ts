/**
 * GET /api/admin/growth/categories/[slug]/stats
 *
 * Returns comprehensive workspace stats for a single category.
 * Routing is universal: fogging-machines → fogging_contracts; all others → gem_contracts tagged.
 */
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { CATEGORY_CATALOG } from "@/lib/category-catalog"

export const maxDuration = 30

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const t0        = Date.now()
  const { slug }  = await params
  const db        = (await clientPromise).db()

  const cat = CATEGORY_CATALOG.find(c => c.slug === slug)
  if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 404 })

  // Universal routing: curated collection OR gem_contracts tagged
  const col    = cat.gemCollection ?? "gem_contracts"
  const filter = cat.gemCollection ? {} : { category_slugs: slug }

  // Determine buyer/state field names (fogging_contracts vs gem_contracts schema differs slightly)
  const isCurated  = !!cat.gemCollection
  const buyerField  = isCurated ? "buyer_canonical" : "buyer_name"
  const sellerField = isCurated ? "seller_gst"       : "seller_name_canonical"
  const stateField  = isCurated ? "buyer_state"      : "seller_state"

  const [
    totalContracts,
    gmvAgg,
    buyerCount,
    sellerCount,
    oemCount,
    stateCount,
    deptCount,
    productCount,
    topBuyers,
    topSellers,
    topProducts,
    topStates,
    enriched,
    lastDoc,
    firstDoc,
    monthlyVol,
    dealerCount,
  ] = await Promise.all([
    db.collection(col).countDocuments(filter),

    db.collection(col).aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: "$contract_value_num" }, avg: { $avg: "$contract_value_num" } } },
    ]).toArray(),

    db.collection(col).distinct(buyerField, filter).then(a => a.filter(Boolean).length),
    db.collection(col).distinct(sellerField, filter).then(a => a.filter(Boolean).length),

    isCurated
      ? db.collection(col).distinct("oem_canonical", filter).then(a => a.filter(Boolean).length)
      : Promise.resolve(0),

    db.collection(col).distinct(stateField, filter).then(a => a.filter(Boolean).length),
    db.collection(col).distinct("dept_name", filter).then(a => a.filter(Boolean).length),

    isCurated
      ? db.collection(col).distinct("model_normalized", filter).then(a => a.filter(Boolean).length)
      : db.collection(col).distinct("product_name", filter).then(a => a.filter(Boolean).length),

    // Top 10 buyers
    db.collection(col).aggregate([
      { $match: filter },
      { $group: { _id: `$${buyerField}`, contracts: { $sum: 1 }, gmv: { $sum: "$contract_value_num" } } },
      { $match: { _id: { $nin: [null, ""] } } },
      { $sort: { contracts: -1 } },
      { $limit: 10 },
    ]).toArray(),

    // Top 10 sellers
    db.collection(col).aggregate([
      { $match: filter },
      { $group: { _id: `$${sellerField}`, contracts: { $sum: 1 }, gmv: { $sum: "$contract_value_num" } } },
      { $match: { _id: { $nin: [null, ""] } } },
      { $sort: { contracts: -1 } },
      { $limit: 10 },
    ]).toArray(),

    // Top products
    db.collection(col).aggregate([
      { $match: { ...filter, product_name: { $nin: [null, ""] } } },
      { $group: { _id: "$product_name", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]).toArray(),

    // Top states
    db.collection(col).aggregate([
      { $match: { ...filter, [stateField]: { $nin: [null, ""] } } },
      { $group: { _id: `$${stateField}`, count: { $sum: 1 }, gmv: { $sum: "$contract_value_num" } } },
      { $sort: { count: -1 } },
      { $limit: 12 },
    ]).toArray(),

    // Enriched count (OEM classified or detail_scraped)
    isCurated
      ? db.collection(col).countDocuments({ ...filter, oem_canonical: { $nin: [null, ""] } })
      : db.collection(col).countDocuments({ ...filter, detail_scraped: true }),

    // Last contract date
    db.collection(col).findOne(filter, {
      sort: { contract_date_dt: -1 },
      projection: { contract_date_dt: 1, contract_date: 1 },
    }),

    // First contract date
    db.collection(col).findOne(filter, {
      sort: { contract_date_dt: 1 },
      projection: { contract_date_dt: 1, contract_date: 1 },
    }),

    // Monthly volume (last 12 months)
    db.collection(col).aggregate([
      { $match: filter },
      { $group: {
        _id: { year: "$contract_year", month: "$contract_month" },
        contracts: { $sum: 1 },
        gmv: { $sum: "$contract_value_num" },
      }},
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 12 },
    ]).toArray(),

    // Dealer count (from dealer_prospects or fogging_sellers)
    db.collection("dealer_prospects").countDocuments(),
  ])

  const gmvCr       = +((gmvAgg[0]?.total ?? 0) / 10_000_000).toFixed(2)
  const enrichPct   = totalContracts > 0 ? Math.round((enriched / totalContracts) * 100) : 0
  const coveragePct = isCurated ? 100 : (cat.estimate.contracts > 0 ? Math.round((totalContracts / cat.estimate.contracts) * 100) : 0)
  const isActive    = totalContracts > 0

  // Health score (composite)
  const archivePct   = coveragePct
  const buyerPct     = totalContracts > 0 ? Math.min(100, Math.round((buyerCount / Math.max(1, totalContracts)) * 500)) : 0
  const packActive   = Object.values(cat.packs).filter(v => v === "active").length
  const packTotal    = Object.values(cat.packs).length
  const packReadyPct = Math.round((packActive / packTotal) * 100)
  const overallScore = isActive
    ? Math.round(archivePct * 0.30 + enrichPct * 0.25 + packReadyPct * 0.25 + Math.min(100, buyerPct) * 0.20)
    : 0

  // Timeline events
  const timeline = [
    { event: "Category Created",        date: null, done: true },
    { event: "First Archive Import",    date: firstDoc?.contract_date ?? firstDoc?.contract_date_dt ?? null, done: isActive },
    { event: "Procurement Intelligence",date: isActive ? (firstDoc?.contract_date ?? null) : null, done: isActive },
    { event: "Buyer Intelligence",      date: isActive && buyerCount > 0 ? "Derived from contracts" : null, done: isActive && buyerCount > 0 },
    { event: "Supplier Intelligence",   date: isActive && sellerCount > 0 ? "Derived from contracts" : null, done: isActive && sellerCount > 0 },
    { event: "OEM Enrichment",          date: oemCount > 0 ? "Complete" : null, done: oemCount > 0 },
    { event: "Last Data Refresh",       date: lastDoc?.contract_date ?? lastDoc?.contract_date_dt ?? null, done: isActive },
    { event: "Knowledge Graph Build",   date: null, done: false },
    { event: "AI Search Indexing",      date: null, done: false },
  ]

  // Deep links — universal, no hardcoding
  const deepLinks: Record<string, string | null> = {
    procurement:  "/admin/growth/procurement",
    dealers:      "/admin/growth/dealers",
    competitors:  cat.packs.competitor === "active" ? "/admin/growth/competitors" : null,
    market:       cat.packs.market     === "active" ? "/admin/growth/market-intelligence" : null,
    aiSearch:     "/admin/growth/geo",
    foggingFull:  isCurated ? "/admin/growth/fogging" : null,
  }

  return NextResponse.json({
    slug, name: cat.name, icon: cat.icon, description: cat.description,
    status:      isActive ? "active" : "not_started",
    collection:  col,
    isCurated,

    metrics: {
      contracts:  totalContracts,
      gmvCr,
      buyers:     buyerCount,
      suppliers:  sellerCount,
      oems:       oemCount,
      dealers:    dealerCount,
      states:     stateCount,
      departments: deptCount,
      products:   productCount,
      enriched,
      enrichPct,
      coveragePct,
    },

    health: {
      archivePct:      archivePct,
      enrichPct,
      knowledgeGraph:  0,
      aiSearchReady:   0,
      relationshipsPct: isActive ? 45 : 0,
      buyerProfilesPct: isActive ? Math.min(100, Math.round(buyerPct)) : 0,
      supplierProfilesPct: isActive ? Math.min(100, Math.round((sellerCount / Math.max(1, totalContracts)) * 800)) : 0,
      oemMappingPct:   isCurated ? enrichPct : 0,
      marketPct:       isCurated ? 75 : 0,
      packReadyPct,
      overallScore,
    },

    packs: {
      procurement:     isActive ? "active"      : "pending",
      buyer:           isActive ? "active"      : "pending",
      supplier:        isActive ? "active"      : "pending",
      oem:             oemCount > 0 ? "active"  : (isActive ? "pending" : "not_started"),
      competitor:      cat.packs.competitor,
      market:          cat.packs.market,
      pricing:         isActive && oemCount > 0 ? "active" : (isActive ? "pending" : "not_started"),
      tender:          "not_started",
      aiSearch:        "not_started",
      knowledgeGraph:  "not_started",
    },

    topBuyers:   topBuyers.map(b => ({ name: String(b._id), contracts: b.contracts as number, gmvCr: +((b.gmv as number) / 10_000_000).toFixed(2) })),
    topSuppliers: topSellers.map(s => ({ name: String(s._id), contracts: s.contracts as number, gmvCr: +((s.gmv as number) / 10_000_000).toFixed(2) })),
    topProducts:  topProducts.map(p => ({ name: String(p._id), count: p.count as number })),
    topStates:    topStates.map(s => ({ state: String(s._id), count: s.count as number, gmvCr: +((s.gmv as number) / 10_000_000).toFixed(2) })),

    monthlyVolume: (monthlyVol as Array<{ _id: { year?: number; month?: number }; contracts: number; gmv: number }>)
      .map(m => ({
        label:     `${m._id.month ?? "?"}/${String(m._id.year ?? "").slice(2)}`,
        contracts: m.contracts,
        gmvCr:     +((m.gmv) / 10_000_000).toFixed(2),
      })),

    estimate: cat.estimate,
    timeline,
    deepLinks,
    processingMs: Date.now() - t0,
  })
}
