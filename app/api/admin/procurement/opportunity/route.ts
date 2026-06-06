import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const maxDuration = 60

// ─── Keyword banks ─────────────────────────────────────────────────────────────
const FOGGING_KW  = ["fog", "mist", "mosquito", "vector", "pest", "malaria", "dengue", "larvi", "aerosol", "spray machine", "fumigat", "ulv", "thermal fog", "cold fog"]
const HEALTH_KW   = ["health", "hospital", "sanit", "hygiene", "epidemic", "disease", "phed", "water supply", "medicine"]
const MUNI_KW     = ["municipal", "civic", "nagar", "corporation", "panchayat", "town", "waste", "drain", "sewer"]
const DEFENSE_KW  = ["defense", "defence", "army", "navy", "air force", "military", "drdo", "ordnance", "bsf", "crpf"]

const STRATEGIC_KW = [...FOGGING_KW, ...HEALTH_KW, ...MUNI_KW, ...DEFENSE_KW]

function kwMatch(text: string | null, kws: string[]) {
  if (!text) return false
  const t = text.toLowerCase()
  return kws.some(k => t.includes(k))
}

function categoryRelevance(contract: Record<string, unknown>): number {
  const text = [
    contract.product_name, contract.dept_name, contract.ministry,
  ].filter(Boolean).join(" ")
  if (kwMatch(text, FOGGING_KW))  return 1.0
  if (kwMatch(text, HEALTH_KW))   return 0.7
  if (kwMatch(text, MUNI_KW))     return 0.6
  if (kwMatch(text, DEFENSE_KW))  return 0.5
  return 0.1
}

function clamp(v: number, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, v)) }
function norm(val: number, max: number) { return max > 0 ? clamp(val / max) : 0 }

// HHI: Herfindahl-Hirschman Index (0=perfect competition, 1=monopoly)
function hhi(gmvMap: Record<string, number>): number {
  const total = Object.values(gmvMap).reduce((a, b) => a + b, 0)
  if (!total) return 0
  return Object.values(gmvMap).reduce((s, v) => s + Math.pow(v / total, 2), 0)
}

// ─── Route ────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const db  = (await clientPromise).db()
    const gc  = db.collection("gem_contracts")
    const dls = db.collection("gem_dealers")
    const sp  = req.nextUrl.searchParams
    const section = sp.get("section") || "overview"

    // ── Overview ─────────────────────────────────────────────────────────────
    if (section === "overview") {
      const [
        total, enriched, newSellerCount, highValueCount, foggingCount,
      ] = await Promise.all([
        gc.countDocuments(),
        gc.countDocuments({ detail_scraped: true }),
        gc.aggregate([
          { $match: { detail_scraped: true, seller_name_canonical: { $nin: [null, ""] } } },
          { $group: { _id: "$seller_name_canonical" } },
          { $lookup: {
            from: "gem_dealers",
            let: { name: "$_id" },
            pipeline: [{ $match: { $expr: { $eq: [{ $toUpper: "$canonical_name" }, { $toUpper: "$$name" }] } } }],
            as: "inDealers",
          }},
          { $match: { inDealers: { $size: 0 } } },
          { $count: "n" },
        ]).toArray().then((r: Array<{n: number}>) => r[0]?.n || 0),
        gc.countDocuments({ contract_value_num: { $gte: 1_000_000 } }),
        gc.countDocuments({
          $or: FOGGING_KW.map(k => ({ product_name: { $regex: k, $options: "i" } })),
        }),
      ])

      return NextResponse.json({
        total, enriched,
        new_sellers: newSellerCount,
        high_value_contracts: highValueCount,
        fogging_contracts: foggingCount,
        coverage_pct: total > 0 ? Math.round(enriched / total * 100) : 0,
      })
    }

    // ── A. Dealer acquisition targets (top 100) ───────────────────────────────
    if (section === "dealer_targets") {
      const limit = parseInt(sp.get("limit") || "100")

      // Get all enriched sellers with their stats
      const sellers = await gc.aggregate([
        { $match: { detail_scraped: true, seller_name_canonical: { $nin: [null, ""] } } },
        { $group: {
          _id:      "$seller_name_canonical",
          gmv:      { $sum: "$contract_value_num" },
          count:    { $sum: 1 },
          states:   { $addToSet: "$seller_state" },
          depts:    { $addToSet: "$dept_name" },
          products: { $addToSet: "$product_name" },
          phone:    { $first: "$seller_phone" },
          email:    { $first: "$seller_email" },
          gstin:    { $first: "$seller_gst" },
          state:    { $first: "$seller_state" },
          msme:     { $first: "$seller_msme_category" },
          gem_id:   { $first: "$seller_gem_id" },
          contracts: { $push: { product: "$product_name", dept: "$dept_name", ministry: "$ministry", value: "$contract_value_num" } },
        }},
        { $sort: { gmv: -1 } },
      ]).toArray() as Array<{
        _id: string; gmv: number; count: number; states: string[]; depts: string[]
        products: string[]; phone: string | null; email: string | null
        gstin: string | null; state: string | null; msme: string | null
        gem_id: string | null
        contracts: Array<{ product: string; dept: string; ministry: string; value: number }>
      }>

      if (!sellers.length) return NextResponse.json({ targets: [] })

      // Load dealer lookup
      const dealerNames = new Set(
        (await dls.distinct("canonical_name") as string[]).map(n => n.toUpperCase())
      )

      const maxGmv    = Math.max(...sellers.map(s => s.gmv))
      const maxCount  = Math.max(...sellers.map(s => s.count))
      const maxStates = Math.max(...sellers.map(s => (s.states || []).filter(Boolean).length))
      const maxDepts  = Math.max(...sellers.map(s => (s.depts || []).filter(Boolean).length))

      const targets = sellers
        .filter(s => !dealerNames.has(s._id.toUpperCase()))  // exclude existing dealers
        .map(s => {
          const uniqueStates  = (s.states   || []).filter(Boolean).length
          const uniqueDepts   = (s.depts    || []).filter(Boolean).length
          const hasPhone      = !!s.phone
          const hasEmail      = !!s.email

          // Category relevance: max relevance across all their contracts
          const catRel = Math.max(...(s.contracts || []).map(c => {
            const text = `${c.product} ${c.dept} ${c.ministry}`
            return categoryRelevance({ product_name: c.product, dept_name: c.dept, ministry: c.ministry })
          }), 0)

          const gmvScore      = norm(s.gmv, maxGmv)
          const contactScore  = (hasPhone ? 0.5 : 0) + (hasEmail ? 0.5 : 0)
          const categoryScore = catRel
          const spreadScore   = norm(uniqueStates, maxStates) * 0.5 + norm(uniqueDepts, maxDepts) * 0.5

          const score = clamp(
            gmvScore * 0.35 +
            contactScore * 0.30 +
            categoryScore * 0.20 +
            spreadScore * 0.15
          )

          return {
            name:        s._id,
            gmv:         s.gmv,
            count:       s.count,
            score:       Math.round(score * 100),
            phone:       s.phone,
            email:       s.email,
            gstin:       s.gstin,
            state:       s.state,
            msme:        s.msme,
            gem_id:      s.gem_id,
            states:      uniqueStates,
            depts:       uniqueDepts,
            cat_rel:     Math.round(catRel * 100),
            in_dealers:  false,
          }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)

      return NextResponse.json({ targets, total_new_sellers: sellers.filter(s => !dealerNames.has(s._id.toUpperCase())).length })
    }

    // ── B. Government reach ranking ───────────────────────────────────────────
    if (section === "govt_reach") {
      const rows = await gc.aggregate([
        { $match: { detail_scraped: true, seller_name_canonical: { $nin: [null, ""] } } },
        { $group: {
          _id:        "$seller_name_canonical",
          gmv:        { $sum: "$contract_value_num" },
          count:      { $sum: 1 },
          ministries: { $addToSet: "$ministry" },
          depts:      { $addToSet: "$dept_name" },
          states:     { $addToSet: "$seller_state" },
          phone:      { $first: "$seller_phone" },
          email:      { $first: "$seller_email" },
        }},
        { $addFields: {
          ministry_count: { $size: { $filter: { input: { $ifNull: ["$ministries", []] }, cond: { $ne: ["$$this", null] } } } },
          dept_count:     { $size: { $filter: { input: { $ifNull: ["$depts",     []] }, cond: { $ne: ["$$this", null] } } } },
          state_count:    { $size: { $filter: { input: { $ifNull: ["$states",    []] }, cond: { $ne: ["$$this", null] } } } },
        }},
        { $sort: { dept_count: -1, gmv: -1 } },
        { $limit: 50 },
      ]).toArray()

      return NextResponse.json({ rows })
    }

    // ── C. Adjacent product opportunities ─────────────────────────────────────
    // Products bought by departments that ALSO buy fogging/health/sanitation
    if (section === "adjacent_products") {
      // Step 1: identify "strategic departments"
      const foggingDepts = await gc.distinct("dept_name", {
        $or: STRATEGIC_KW.map(k => ({
          $or: [
            { product_name: { $regex: k, $options: "i" } },
            { dept_name:    { $regex: k, $options: "i" } },
            { ministry:     { $regex: k, $options: "i" } },
          ],
        })),
      }) as string[]

      const strategicDepts = foggingDepts.filter(Boolean)

      if (!strategicDepts.length) {
        return NextResponse.json({ products: [], strategic_dept_count: 0 })
      }

      // Step 2: all products bought by those departments
      const products = await gc.aggregate([
        { $match: { dept_name: { $in: strategicDepts }, product_name: { $nin: [null, ""] } } },
        { $group: {
          _id:      "$product_name",
          gmv:      { $sum: "$contract_value_num" },
          count:    { $sum: 1 },
          sellers:  { $addToSet: "$seller_name_canonical" },
          depts:    { $addToSet: "$dept_name" },
          states:   { $addToSet: "$seller_state" },
        }},
        { $sort: { gmv: -1 } },
        { $limit: 100 },
      ]).toArray() as Array<{
        _id: string; gmv: number; count: number
        sellers: string[]; depts: string[]; states: string[]
      }>

      const result = products.map(p => {
        const uniqueSellers = (p.sellers || []).filter(Boolean).length
        const uniqueDepts   = (p.depts   || []).filter(Boolean).length
        const isFogging     = kwMatch(p._id, FOGGING_KW)
        const isHealth      = kwMatch(p._id, HEALTH_KW)
        const isMuni        = kwMatch(p._id, MUNI_KW)
        const isStrategic   = kwMatch(p._id, STRATEGIC_KW)

        // Opportunity score: high GMV + many depts + NOT already our product + fragmented sellers
        const sellerHhi = uniqueSellers > 0 ? 1 / uniqueSellers : 1  // simple proxy for fragmentation
        const oppScore  = clamp(
          norm(p.gmv,   products[0]?.gmv || 1) * 0.35 +
          norm(uniqueDepts, 10) * 0.25 +
          (isStrategic ? 0.25 : 0.05) +
          sellerHhi * 0.15
        )

        return {
          product:    p._id,
          gmv:        p.gmv,
          count:      p.count,
          sellers:    uniqueSellers,
          depts:      uniqueDepts,
          opp_score:  Math.round(oppScore * 100),
          is_fogging: isFogging,
          is_health:  isHealth,
          is_muni:    isMuni,
          tag: isFogging ? "core" : isHealth ? "health" : isMuni ? "municipal" : "adjacent",
        }
      })

      return NextResponse.json({ products: result, strategic_dept_count: strategicDepts.length })
    }

    // ── D. High-GMV fragmented categories ─────────────────────────────────────
    if (section === "fragmented_categories") {
      const categories = await gc.aggregate([
        { $match: { product_name: { $nin: [null, ""] } } },
        { $group: {
          _id:      "$product_name",
          gmv:      { $sum: "$contract_value_num" },
          count:    { $sum: 1 },
          sellers:  { $addToSet: "$seller_name_canonical" },
          depts:    { $addToSet: "$dept_name" },
          sellersGmv: { $push: { name: "$seller_name_canonical", value: "$contract_value_num" } },
        }},
        { $match: { count: { $gte: 2 } } },
        { $sort: { gmv: -1 } },
        { $limit: 200 },
      ]).toArray() as Array<{
        _id: string; gmv: number; count: number; sellers: string[]
        depts: string[]; sellersGmv: Array<{name: string; value: number}>
      }>

      const result = categories.map(c => {
        const uniqueSellers = (c.sellers || []).filter(Boolean).length

        // Compute HHI from sellersGmv
        const gmvMap: Record<string, number> = {}
        for (const s of c.sellersGmv || []) {
          if (s.name) gmvMap[s.name] = (gmvMap[s.name] || 0) + (s.value || 0)
        }
        const hhiScore = hhi(gmvMap)
        const fragmentation = 1 - hhiScore  // 0=monopoly, 1=perfect competition

        return {
          product:       c._id,
          gmv:           c.gmv,
          count:         c.count,
          unique_sellers: uniqueSellers,
          hhi:           Math.round(hhiScore * 100),
          fragmentation: Math.round(fragmentation * 100),
          // Opportunity = high GMV × high fragmentation
          opp_score: Math.round(clamp(norm(c.gmv, categories[0]?.gmv || 1) * 0.6 + fragmentation * 0.4) * 100),
          is_strategic: kwMatch(c._id, STRATEGIC_KW),
        }
      }).sort((a, b) => b.opp_score - a.opp_score).slice(0, 50)

      return NextResponse.json({ categories: result })
    }

    // ── E. Adjacent categories (cluster analysis) ─────────────────────────────
    if (section === "adjacent_categories") {
      // Products where multiple strategic departments appear
      const rows = await gc.aggregate([
        { $match: { product_name: { $nin: [null, ""] }, contract_value_num: { $gte: 10000 } } },
        { $group: {
          _id:      "$product_name",
          gmv:      { $sum: "$contract_value_num" },
          count:    { $sum: 1 },
          depts:    { $addToSet: "$dept_name" },
          states:   { $addToSet: "$seller_state" },
          sellers:  { $addToSet: "$seller_name_canonical" },
          ministries: { $addToSet: "$ministry" },
        }},
        { $sort: { gmv: -1 } },
        { $limit: 150 },
      ]).toArray() as Array<{
        _id: string; gmv: number; count: number
        depts: string[]; states: string[]; sellers: string[]; ministries: string[]
      }>

      // Score adjacency to 100X Circle core (thermal fogging equipment)
      const adj = rows.map(r => {
        const isFogging     = kwMatch(r._id, FOGGING_KW)
        const isHealth      = kwMatch(r._id, HEALTH_KW)
        const isMuni        = kwMatch(r._id, MUNI_KW)
        const isDefense     = kwMatch(r._id, DEFENSE_KW)
        const deptCount     = (r.depts    || []).filter(Boolean).length
        const stateCount    = (r.states   || []).filter(Boolean).length
        const sellerCount   = (r.sellers  || []).filter(Boolean).length

        const categoryScore = isFogging ? 1.0 : isHealth ? 0.7 : isMuni ? 0.6 : isDefense ? 0.5 : 0.1

        return {
          product:      r._id,
          gmv:          r.gmv,
          count:        r.count,
          dept_count:   deptCount,
          state_count:  stateCount,
          seller_count: sellerCount,
          adjacency:    Math.round(categoryScore * 100),
          tag: isFogging ? "core" : isHealth ? "health" : isMuni ? "municipal" : isDefense ? "defense" : "general",
        }
      })

      return NextResponse.json({ categories: adj })
    }

    // ── F. Top 100 dealer acquisition targets (scored) ────────────────────────
    // Same as dealer_targets but returns the full scored list for the UI
    if (section === "acquisition_targets") {
      return GET(new NextRequest(
        req.url.replace("acquisition_targets", "dealer_targets") + "&limit=100",
        req
      ))
    }

    // ── G. Top 50 product opportunities ──────────────────────────────────────
    if (section === "product_opportunities") {
      const [adj, frag] = await Promise.all([
        fetch(`${req.url.split("?")[0]}?section=adjacent_products`).then(r => r.json()).catch(() => ({ products: [] })),
        fetch(`${req.url.split("?")[0]}?section=fragmented_categories`).then(r => r.json()).catch(() => ({ categories: [] })),
      ])

      // Merge and deduplicate, picking higher score
      const seen = new Map<string, number>()
      const all: Array<{ product: string; opp_score: number; gmv: number; tag?: string; source: string }> = []

      for (const p of (adj.products || [])) {
        const cur = seen.get(p.product) || 0
        if (p.opp_score > cur) { seen.set(p.product, p.opp_score); all.push({ ...p, source: "adjacent" }) }
      }
      for (const c of (frag.categories || [])) {
        const cur = seen.get(c.product) || 0
        if (c.opp_score > cur) { seen.set(c.product, c.opp_score); all.push({ ...c, source: "fragmented" }) }
      }

      const top50 = all
        .sort((a, b) => b.opp_score - a.opp_score)
        .slice(0, 50)

      return NextResponse.json({ opportunities: top50 })
    }

    // ── Department map ────────────────────────────────────────────────────────
    if (section === "dept_map") {
      const rows = await gc.aggregate([
        { $match: { dept_name: { $nin: [null, ""] } } },
        { $group: {
          _id:       "$dept_name",
          gmv:       { $sum: "$contract_value_num" },
          count:     { $sum: 1 },
          products:  { $addToSet: "$product_name" },
          sellers:   { $addToSet: "$seller_name_canonical" },
          ministry:  { $first: "$ministry" },
          state:     { $first: "$state" },
          buyFogging: { $max: {
            $cond: [{
              $or: FOGGING_KW.map(k => ({ $regexMatch: { input: { $ifNull: ["$product_name", ""] }, regex: k, options: "i" } }))
            }, 1, 0]
          }},
          buyHealth: { $max: {
            $cond: [{
              $or: HEALTH_KW.map(k => ({ $regexMatch: { input: { $ifNull: ["$product_name", ""] }, regex: k, options: "i" } }))
            }, 1, 0]
          }},
        }},
        { $sort: { gmv: -1 } },
        { $limit: 100 },
      ]).toArray()

      return NextResponse.json({
        departments: rows.map(r => ({
          name:        r._id,
          gmv:         r.gmv,
          count:       r.count,
          ministry:    r.ministry,
          state:       r.state,
          products:    (r.products || []).filter(Boolean).length,
          sellers:     (r.sellers  || []).filter(Boolean).length,
          buys_fogging: r.buyFogging === 1,
          buys_health:  r.buyHealth  === 1,
          is_target:    r.buyFogging === 1 || r.buyHealth === 1,
        })),
      })
    }

    return NextResponse.json({ error: `Unknown section: ${section}` }, { status: 400 })
  } catch (err) {
    console.error("opportunity API error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
