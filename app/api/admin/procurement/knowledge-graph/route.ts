import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requirePermission } from "@/lib/rbac/server"

export const maxDuration = 60

const KG_COLLECTIONS = [
  "gem_kg_dealer_dept",
  "gem_kg_dealer_product",
  "gem_kg_dealer_state",
  "gem_kg_dept_product",
  "gem_kg_dealer_scores",
  "gem_kg_dept_scores",
  "gem_kg_product_scores",
]

// ─── GET: status ──────────────────────────────────────────────────────────────

export async function GET() {
  const db = (await clientPromise).db()
  const counts = await Promise.all(
    KG_COLLECTIONS.map(c => db.collection(c).countDocuments().then(n => ({ collection: c, count: n })))
  )
  const built = counts.every(c => c.count > 0)
  return NextResponse.json({ built, collections: counts })
}

// ─── POST: build / rebuild ────────────────────────────────────────────────────

export async function POST(_req: NextRequest) {
  const auth = await requirePermission(_req, "procurement.knowledge_graph.view")
  if (!("user" in auth)) return auth

  const db = (await clientPromise).db()
  const gc = db.collection("gem_contracts")
  const log: Record<string, number> = {}

  // ── 1. Dealer ↔ Department ──────────────────────────────────────────────────
  {
    const rows = await gc.aggregate([
      { $match: { seller_name_canonical: { $nin: [null, ""] }, dept_name: { $nin: [null, ""] } } },
      { $group: {
        _id:            { dealer: "$seller_name_canonical", dept: "$dept_name" },
        ministry:       { $first: "$ministry" },
        contract_count: { $sum: 1 },
        total_gmv:      { $sum: "$contract_value_num" },
        first_seen:     { $min: "$contract_date_dt" },
        last_seen:      { $max: "$contract_date_dt" },
        products:       { $addToSet: "$product_name" },
        states:         { $addToSet: "$seller_state" },
      }},
      { $project: {
        _id: 0,
        dealer:         "$_id.dealer",
        dept:           "$_id.dept",
        ministry:       1,
        contract_count: 1,
        total_gmv:      1,
        first_seen:     1,
        last_seen:      1,
        product_count:  { $size: { $filter: { input: "$products", cond: { $ne: ["$$this", null] } } } },
        state_count:    { $size: { $filter: { input: "$states",   cond: { $ne: ["$$this", null] } } } },
      }},
    ]).toArray()

    const coll = db.collection("gem_kg_dealer_dept")
    await coll.deleteMany({})
    if (rows.length) await coll.insertMany(rows)
    await coll.createIndex({ dealer: 1 })
    await coll.createIndex({ dept: 1 })
    await coll.createIndex({ total_gmv: -1 })
    log["gem_kg_dealer_dept"] = rows.length
  }

  // ── 2. Dealer ↔ Product ─────────────────────────────────────────────────────
  {
    const rows = await gc.aggregate([
      { $match: { seller_name_canonical: { $nin: [null, ""] }, product_name: { $nin: [null, ""] } } },
      { $group: {
        _id:            { dealer: "$seller_name_canonical", product: "$product_name" },
        contract_count: { $sum: 1 },
        total_gmv:      { $sum: "$contract_value_num" },
        first_seen:     { $min: "$contract_date_dt" },
        last_seen:      { $max: "$contract_date_dt" },
        depts:          { $addToSet: "$dept_name" },
        states:         { $addToSet: "$seller_state" },
      }},
      { $project: {
        _id: 0,
        dealer:         "$_id.dealer",
        product:        "$_id.product",
        contract_count: 1,
        total_gmv:      1,
        first_seen:     1,
        last_seen:      1,
        dept_count:     { $size: { $filter: { input: "$depts",  cond: { $ne: ["$$this", null] } } } },
        state_count:    { $size: { $filter: { input: "$states", cond: { $ne: ["$$this", null] } } } },
      }},
    ]).toArray()

    const coll = db.collection("gem_kg_dealer_product")
    await coll.deleteMany({})
    if (rows.length) await coll.insertMany(rows)
    await coll.createIndex({ dealer: 1 })
    await coll.createIndex({ product: 1 })
    log["gem_kg_dealer_product"] = rows.length
  }

  // ── 3. Dealer ↔ State ───────────────────────────────────────────────────────
  {
    const rows = await gc.aggregate([
      { $match: { seller_name_canonical: { $nin: [null, ""] }, seller_state: { $nin: [null, ""] } } },
      { $group: {
        _id:            { dealer: "$seller_name_canonical", state: "$seller_state" },
        contract_count: { $sum: 1 },
        total_gmv:      { $sum: "$contract_value_num" },
      }},
      { $project: { _id: 0, dealer: "$_id.dealer", state: "$_id.state", contract_count: 1, total_gmv: 1 } },
    ]).toArray()

    const coll = db.collection("gem_kg_dealer_state")
    await coll.deleteMany({})
    if (rows.length) await coll.insertMany(rows)
    await coll.createIndex({ dealer: 1 })
    await coll.createIndex({ state: 1 })
    log["gem_kg_dealer_state"] = rows.length
  }

  // ── 4. Department ↔ Product ─────────────────────────────────────────────────
  {
    const rows = await gc.aggregate([
      { $match: { dept_name: { $nin: [null, ""] }, product_name: { $nin: [null, ""] } } },
      { $group: {
        _id:            { dept: "$dept_name", product: "$product_name" },
        ministry:       { $first: "$ministry" },
        contract_count: { $sum: 1 },
        total_gmv:      { $sum: "$contract_value_num" },
        first_seen:     { $min: "$contract_date_dt" },
        last_seen:      { $max: "$contract_date_dt" },
        sellers:        { $addToSet: "$seller_name_canonical" },
        states:         { $addToSet: "$seller_state" },
      }},
      { $project: {
        _id: 0,
        dept:           "$_id.dept",
        product:        "$_id.product",
        ministry:       1,
        contract_count: 1,
        total_gmv:      1,
        first_seen:     1,
        last_seen:      1,
        seller_count:   { $size: { $filter: { input: "$sellers", cond: { $ne: ["$$this", null] } } } },
        state_count:    { $size: { $filter: { input: "$states",  cond: { $ne: ["$$this", null] } } } },
      }},
    ]).toArray()

    const coll = db.collection("gem_kg_dept_product")
    await coll.deleteMany({})
    if (rows.length) await coll.insertMany(rows)
    await coll.createIndex({ dept: 1 })
    await coll.createIndex({ product: 1 })
    await coll.createIndex({ total_gmv: -1 })
    log["gem_kg_dept_product"] = rows.length
  }

  // ── 5. Dealer Scores ────────────────────────────────────────────────────────
  {
    type DealerRaw = {
      dealer: string
      total_contracts: number
      total_gmv: number
      dept_count: number
      state_count: number
      product_count: number
      ministry_count: number
      first_seen: string | null
      last_seen: string | null
    }

    const raw = (await gc.aggregate([
      { $match: { seller_name_canonical: { $nin: [null, ""] } } },
      { $group: {
        _id:       "$seller_name_canonical",
        total_gmv: { $sum: "$contract_value_num" },
        count:     { $sum: 1 },
        depts:     { $addToSet: "$dept_name" },
        states:    { $addToSet: "$seller_state" },
        products:  { $addToSet: "$product_name" },
        ministries:{ $addToSet: "$ministry" },
        first_seen:{ $min: "$contract_date_dt" },
        last_seen: { $max: "$contract_date_dt" },
      }},
      { $project: {
        _id: 0,
        dealer:          "$_id",
        total_gmv:       1,
        total_contracts: "$count",
        dept_count:      { $size: { $filter: { input: "$depts",      cond: { $ne: ["$$this", null] } } } },
        state_count:     { $size: { $filter: { input: "$states",     cond: { $ne: ["$$this", null] } } } },
        product_count:   { $size: { $filter: { input: "$products",   cond: { $ne: ["$$this", null] } } } },
        ministry_count:  { $size: { $filter: { input: "$ministries", cond: { $ne: ["$$this", null] } } } },
        first_seen: 1,
        last_seen:  1,
      }},
    ]).toArray()) as DealerRaw[]

    // Normalize 0–100 scores
    const maxGmv      = Math.max(...raw.map(r => r.total_gmv      || 0), 1)
    const maxContracts= Math.max(...raw.map(r => r.total_contracts || 0), 1)
    const maxDepts    = Math.max(...raw.map(r => r.dept_count      || 0), 1)
    const maxStates   = Math.max(...raw.map(r => r.state_count     || 0), 1)
    const maxProducts = Math.max(...raw.map(r => r.product_count   || 0), 1)

    function activeYears(first: string | null, last: string | null) {
      if (!first || !last) return 0
      return Math.max(0, (new Date(last).getFullYear() - new Date(first).getFullYear()) + 1)
    }

    const scored = raw.map(r => {
      const gmv_score      = (r.total_gmv      / maxGmv)      * 30
      const count_score    = (r.total_contracts / maxContracts)* 25
      const dept_score     = (r.dept_count      / maxDepts)    * 20
      const state_score    = (r.state_count     / maxStates)   * 15
      const product_score  = (r.product_count   / maxProducts) * 10
      const dealer_score   = Math.round(gmv_score + count_score + dept_score + state_score + product_score)
      return {
        ...r,
        active_years:   activeYears(r.first_seen, r.last_seen),
        network_reach:  Math.round((r.dept_count   / maxDepts)  * 100),
        state_reach:    Math.round((r.state_count  / maxStates) * 100),
        category_breadth: Math.round((r.product_count / maxProducts) * 100),
        dealer_score,
        updated_at: new Date().toISOString(),
      }
    })

    const coll = db.collection("gem_kg_dealer_scores")
    await coll.deleteMany({})
    if (scored.length) await coll.insertMany(scored)
    await coll.createIndex({ dealer: 1 }, { unique: true })
    await coll.createIndex({ dealer_score: -1 })
    await coll.createIndex({ total_gmv: -1 })
    log["gem_kg_dealer_scores"] = scored.length
  }

  // ── 6. Department Scores ────────────────────────────────────────────────────
  {
    type DeptRaw = {
      dept: string
      ministry: string | null
      total_contracts: number
      total_gmv: number
      seller_count: number
      product_count: number
      state_count: number
    }

    const raw = (await gc.aggregate([
      { $match: { dept_name: { $nin: [null, ""] } } },
      { $group: {
        _id:       "$dept_name",
        ministry:  { $first: "$ministry" },
        count:     { $sum: 1 },
        total_gmv: { $sum: "$contract_value_num" },
        sellers:   { $addToSet: "$seller_name_canonical" },
        products:  { $addToSet: "$product_name" },
        states:    { $addToSet: "$seller_state" },
      }},
      { $project: {
        _id: 0,
        dept:            "$_id",
        ministry:        1,
        total_contracts: "$count",
        total_gmv:       1,
        seller_count:  { $size: { $filter: { input: "$sellers",  cond: { $ne: ["$$this", null] } } } },
        product_count: { $size: { $filter: { input: "$products", cond: { $ne: ["$$this", null] } } } },
        state_count:   { $size: { $filter: { input: "$states",   cond: { $ne: ["$$this", null] } } } },
      }},
    ]).toArray()) as DeptRaw[]

    // Vendor concentration: top_seller_gmv / total_gmv (computed from gem_kg_dealer_dept)
    const dealerDeptColl = db.collection("gem_kg_dealer_dept")
    const deptDocs = await dealerDeptColl.aggregate([
      { $group: {
        _id:       "$dept",
        total_gmv: { $sum: "$total_gmv" },
        max_gmv:   { $max: "$total_gmv" },
      }},
    ]).toArray()
    type ConcRow = { _id: string; total_gmv: number; max_gmv: number }
    const concMap = new Map((deptDocs as ConcRow[]).map(d => [
      d._id,
      d.total_gmv > 0 ? Math.round((d.max_gmv / d.total_gmv) * 100) : 0
    ]))

    const scored = raw.map(r => ({
      ...r,
      vendor_concentration: concMap.get(r.dept) ?? 0,
      updated_at: new Date().toISOString(),
    }))

    const coll = db.collection("gem_kg_dept_scores")
    await coll.deleteMany({})
    if (scored.length) await coll.insertMany(scored)
    await coll.createIndex({ dept: 1 }, { unique: true })
    await coll.createIndex({ total_gmv: -1 })
    log["gem_kg_dept_scores"] = scored.length
  }

  // ── 7. Product Scores ───────────────────────────────────────────────────────
  {
    type ProductRaw = {
      product: string
      total_contracts: number
      total_gmv: number
      dept_count: number
      seller_count: number
      state_count: number
    }

    const raw = (await gc.aggregate([
      { $match: { product_name: { $nin: [null, ""] } } },
      { $group: {
        _id:       "$product_name",
        count:     { $sum: 1 },
        total_gmv: { $sum: "$contract_value_num" },
        depts:     { $addToSet: "$dept_name" },
        sellers:   { $addToSet: "$seller_name_canonical" },
        states:    { $addToSet: "$seller_state" },
      }},
      { $project: {
        _id: 0,
        product:         "$_id",
        total_contracts: "$count",
        total_gmv:       1,
        dept_count:   { $size: { $filter: { input: "$depts",   cond: { $ne: ["$$this", null] } } } },
        seller_count: { $size: { $filter: { input: "$sellers", cond: { $ne: ["$$this", null] } } } },
        state_count:  { $size: { $filter: { input: "$states",  cond: { $ne: ["$$this", null] } } } },
      }},
    ]).toArray()) as ProductRaw[]

    // Growth rate: compare year-over-year GMV using gem_contracts
    const yearTrend = await gc.aggregate([
      { $match: { product_name: { $nin: [null, ""] }, contract_date_dt: { $nin: [null, ""] } } },
      { $addFields: { year: { $year: { $dateFromString: { dateString: "$contract_date_dt", onError: null } } } } },
      { $match: { year: { $ne: null } } },
      { $group: {
        _id: { product: "$product_name", year: "$year" },
        gmv: { $sum: "$contract_value_num" },
      }},
      { $sort: { "_id.year": 1 } },
    ]).toArray()

    type YearRow = { _id: { product: string; year: number }; gmv: number }
    const yearMap = new Map<string, Record<number, number>>()
    for (const r of yearTrend as YearRow[]) {
      if (!yearMap.has(r._id.product)) yearMap.set(r._id.product, {})
      yearMap.get(r._id.product)![r._id.year] = r.gmv
    }

    function growthRate(trend: Record<number, number> | undefined): number {
      if (!trend) return 0
      const years = Object.keys(trend).map(Number).sort()
      if (years.length < 2) return 0
      const prev = trend[years[years.length - 2]] || 0
      const curr = trend[years[years.length - 1]] || 0
      if (!prev) return curr > 0 ? 100 : 0
      return Math.round(((curr - prev) / prev) * 100)
    }

    const scored = raw.map(r => ({
      ...r,
      year_trend:    yearMap.get(r.product) || {},
      growth_rate:   growthRate(yearMap.get(r.product)),
      fragmentation: r.seller_count,
      updated_at: new Date().toISOString(),
    }))

    const coll = db.collection("gem_kg_product_scores")
    await coll.deleteMany({})
    if (scored.length) await coll.insertMany(scored)
    await coll.createIndex({ product: 1 }, { unique: true })
    await coll.createIndex({ total_gmv: -1 })
    await coll.createIndex({ growth_rate: -1 })
    log["gem_kg_product_scores"] = scored.length
  }

  return NextResponse.json({ success: true, built: log, built_at: new Date().toISOString() })
}
