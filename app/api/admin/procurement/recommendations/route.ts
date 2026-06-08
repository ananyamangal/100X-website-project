import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const maxDuration = 60

const FOGGING_REGEX = /fog|fogger|thermal fog|ulv|mosquito|vector control|insecticide sprayer/i

// ─── WHY generators ───────────────────────────────────────────────────────────

function dealerWhy(d: DealerScore): string[] {
  const why: string[] = []
  if ((d.total_gmv ?? 0) > 1_000_000) {
    const crore = ((d.total_gmv ?? 0) / 10_000_000).toFixed(2)
    why.push(`₹${crore}Cr GMV across ${d.total_contracts ?? 0} contracts`)
  }
  if ((d.dept_count ?? 0) >= 5)
    why.push(`Serves ${d.dept_count} departments — multi-departmental presence reduces churn risk`)
  if ((d.state_count ?? 0) >= 3)
    why.push(`Geographic reach across ${d.state_count} states — potential multi-state distributor`)
  if ((d.product_count ?? 0) >= 10)
    why.push(`Carries ${d.product_count} product types — broad portfolio, can add 100X line`)
  if ((d.active_years ?? 0) >= 3)
    why.push(`${d.active_years} years active on GeM — established government supplier`)
  if ((d.dealer_score ?? 0) >= 65)
    why.push("Priority A: Top-quartile dealer by composite score")
  return why.length > 0 ? why : ["Emerging GeM supplier — monitor for growth"]
}

function productWhy(p: ProductScore, score: number): string[] {
  const why: string[] = []
  const crore = ((p.total_gmv ?? 0) / 10_000_000).toFixed(2)
  why.push(`₹${crore}Cr total market, ${p.total_contracts ?? 0} contracts`)
  const gr = p.growth_rate ?? 0
  if (gr > 20) why.push(`${gr.toFixed(0)}% year-over-year growth — expanding market`)
  else if (gr < 0) why.push(`${gr.toFixed(0)}% decline — monitor before committing`)
  if ((p.fragmentation ?? 0) > 0.7)
    why.push(`Fragmentation score ${(p.fragmentation ?? 0).toFixed(2)} — no dominant supplier, market is open`)
  if ((p.seller_count ?? 0) <= 3)
    why.push(`Only ${p.seller_count} sellers — low competition, first-mover advantage`)
  if ((p.dept_count ?? 0) >= 20)
    why.push(`Bought by ${p.dept_count} departments — broad institutional demand`)
  void score
  return why
}

function productRoute(p: ProductScore, score: number): string {
  const avgContract = (p.total_contracts ?? 0) > 0
    ? (p.total_gmv ?? 0) / (p.total_contracts ?? 1)
    : 0
  if (score >= 70 && avgContract >= 500_000) return "Manufacture"
  if (score >= 55) return "OEM"
  if (score >= 40) return "Import"
  return "Monitor"
}

function deptWhy(d: DeptScore): string[] {
  const why: string[] = []
  const crore = ((d.total_gmv ?? 0) / 10_000_000).toFixed(2)
  why.push(`₹${crore}Cr procurement — ${d.total_contracts ?? 0} contracts`)
  const vc = d.vendor_concentration ?? 0
  if (vc < 0.25)
    why.push(`Low vendor concentration (${vc.toFixed(2)}) — open to new suppliers`)
  else if (vc > 0.6)
    why.push(`High vendor concentration — incumbent strong but challengeable`)
  if ((d.seller_count ?? 0) >= 10)
    why.push(`${d.seller_count} active sellers — competitive but accessible`)
  else if ((d.seller_count ?? 0) <= 3)
    why.push(`Only ${d.seller_count} sellers — niche opportunity, easier entry`)
  return why
}

// ─── Score helpers ────────────────────────────────────────────────────────────

function computeOpportunityScore(p: ProductScore): number {
  const gr = p.growth_rate ?? 0
  const growthScore = gr > 0 ? Math.min(gr / 100, 1) * 25 : 0
  const fragScore = (1 - 1 / Math.max(p.seller_count ?? 1, 1)) * 20
  const gmvScore = Math.min((p.total_gmv ?? 0) / 50_000_000, 1) * 25
  const deptScore = Math.min((p.dept_count ?? 0) / 50, 1) * 15
  const stateScore = Math.min((p.state_count ?? 0) / 30, 1) * 15
  return Math.round(growthScore + fragScore + gmvScore + deptScore + stateScore)
}

function computeDeptScore(d: DeptScore, maxGmv: number, maxSellers: number): number {
  const gmvNorm = maxGmv > 0 ? Math.min((d.total_gmv ?? 0) / maxGmv, 1) : 0
  const openness = 1 - (d.vendor_concentration ?? 0)
  const diversityNorm = maxSellers > 0 ? Math.min((d.seller_count ?? 0) / maxSellers, 1) : 0
  return Math.round(gmvNorm * 40 + openness * 30 + diversityNorm * 30)
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DealerScore {
  dealer?: string
  total_contracts?: number
  total_gmv?: number
  dept_count?: number
  state_count?: number
  product_count?: number
  active_years?: number
  dealer_score?: number
}

interface ProductScore {
  product?: string
  total_contracts?: number
  total_gmv?: number
  dept_count?: number
  seller_count?: number
  state_count?: number
  growth_rate?: number
  fragmentation?: number
}

interface DeptScore {
  dept?: string
  ministry?: string
  total_contracts?: number
  total_gmv?: number
  seller_count?: number
  vendor_concentration?: number
}

interface DealerProduct {
  dealer?: string
  product?: string
  total_gmv?: number
  dept_count?: number
}

interface DealerDept {
  dealer?: string
  dept?: string
  total_gmv?: number
}

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const typeParam = searchParams.get("type") || "all"
    const limit = Math.min(Number(searchParams.get("limit") || 50), 100)

    const db = (await clientPromise).db()
    const wantAll = typeParam === "all"

    const wantDealers = wantAll || typeParam === "dealers"
    const wantProducts = wantAll || typeParam === "products"
    const wantDepts = wantAll || typeParam === "depts"
    const wantCrossSell = wantAll || typeParam === "cross_sell"

    // ── Parallel main fetches ──────────────────────────────────────────────────
    const [rawDealers, rawProducts, rawDepts] = await Promise.all([
      wantDealers || wantCrossSell
        ? db.collection("gem_kg_dealer_scores")
            .find({})
            .sort({ dealer_score: -1 })
            .limit(limit)
            .toArray() as Promise<DealerScore[]>
        : Promise.resolve([] as DealerScore[]),
      wantProducts
        ? db.collection("gem_kg_product_scores")
            .find({ product: { $not: FOGGING_REGEX } })
            .limit(500) // fetch more to sort by computed score
            .toArray() as Promise<ProductScore[]>
        : Promise.resolve([] as ProductScore[]),
      wantDepts
        ? db.collection("gem_kg_dept_scores")
            .find({})
            .sort({ total_gmv: -1 })
            .limit(limit)
            .toArray() as Promise<DeptScore[]>
        : Promise.resolve([] as DeptScore[]),
    ])

    // ── Bulk-fetch dealer relationships ───────────────────────────────────────
    const topDealerNames = rawDealers.map(d => d.dealer).filter(Boolean) as string[]

    const [dealerProductRows, dealerDeptRows] = await Promise.all([
      wantDealers || wantCrossSell
        ? db.collection("gem_kg_dealer_product")
            .find({ dealer: { $in: topDealerNames } })
            .sort({ total_gmv: -1 })
            .toArray() as Promise<DealerProduct[]>
        : Promise.resolve([] as DealerProduct[]),
      wantDealers
        ? db.collection("gem_kg_dealer_dept")
            .find({ dealer: { $in: topDealerNames } })
            .sort({ total_gmv: -1 })
            .toArray() as Promise<DealerDept[]>
        : Promise.resolve([] as DealerDept[]),
    ])

    // Group products by dealer
    const dealerProductMap: Record<string, string[]> = {}
    for (const row of dealerProductRows) {
      if (!row.dealer) continue
      if (!dealerProductMap[row.dealer]) dealerProductMap[row.dealer] = []
      dealerProductMap[row.dealer].push(row.product ?? "")
    }

    // Group depts by dealer
    const dealerDeptMap: Record<string, string[]> = {}
    for (const row of dealerDeptRows) {
      if (!row.dealer) continue
      if (!dealerDeptMap[row.dealer]) dealerDeptMap[row.dealer] = []
      dealerDeptMap[row.dealer].push(row.dept ?? "")
    }

    // ── Build dealers response ─────────────────────────────────────────────────
    const dealers = wantDealers ? rawDealers.slice(0, limit).map(d => {
      const score = d.dealer_score ?? 0
      let priority: "A" | "B" | "C" = "C"
      let action = "Watch list"
      if (score >= 65) { priority = "A"; action = "Recruit this month" }
      else if (score >= 40) { priority = "B"; action = "Nurture — target Q3" }

      return {
        dealer: d.dealer ?? "",
        priority,
        score,
        total_gmv: d.total_gmv ?? 0,
        total_contracts: d.total_contracts ?? 0,
        dept_count: d.dept_count ?? 0,
        state_count: d.state_count ?? 0,
        product_count: d.product_count ?? 0,
        active_years: d.active_years ?? 0,
        why: dealerWhy(d),
        action,
        top_products: (dealerProductMap[d.dealer ?? ""] ?? []).slice(0, 5),
        top_depts: (dealerDeptMap[d.dealer ?? ""] ?? []).slice(0, 5),
      }
    }) : []

    // ── Build products response ────────────────────────────────────────────────
    let products: ReturnType<typeof buildProduct>[] = []
    function buildProduct(p: ProductScore) {
      const score = computeOpportunityScore(p)
      const evidence = {
        demand_score: Math.round(Math.min((p.dept_count ?? 0) / 50, 1) * 15 + Math.min((p.total_contracts ?? 0) / 200, 1) * 10),
        growth_score: Math.round((p.growth_rate ?? 0) > 0 ? Math.min((p.growth_rate ?? 0) / 100, 1) * 20 : 0),
        fragmentation_score: Math.round((1 - 1 / Math.max(p.seller_count ?? 1, 1)) * 20),
        value_score: Math.round(Math.min((p.total_gmv ?? 0) / 50_000_000, 1) * 25),
        reach_score: Math.round(Math.min((p.state_count ?? 0) / 30, 1) * 15),
      }
      return {
        product: p.product ?? "",
        opportunity_score: score,
        total_gmv: p.total_gmv ?? 0,
        total_contracts: p.total_contracts ?? 0,
        dept_count: p.dept_count ?? 0,
        seller_count: p.seller_count ?? 0,
        growth_rate: p.growth_rate ?? 0,
        fragmentation: p.fragmentation ?? 0,
        route: productRoute(p, score),
        why: productWhy(p, score),
        evidence,
      }
    }

    if (wantProducts) {
      products = rawProducts
        .map(p => buildProduct(p))
        .sort((a, b) => b.opportunity_score - a.opportunity_score)
        .slice(0, limit)
    }

    // ── Build departments response ─────────────────────────────────────────────
    let departments: ReturnType<typeof buildDept>[] = []
    function buildDept(d: DeptScore, score: number, rank: number, total: number) {
      let action = "Monitor"
      if (rank < total / 3) action = "Target this quarter"
      else if (rank < (total * 2) / 3) action = "Nurture — invite to demo"
      return {
        dept: d.dept ?? "",
        ministry: d.ministry ?? "",
        total_gmv: d.total_gmv ?? 0,
        total_contracts: d.total_contracts ?? 0,
        seller_count: d.seller_count ?? 0,
        vendor_concentration: d.vendor_concentration ?? 0,
        score,
        why: deptWhy(d),
        action,
        top_products: [] as string[],
      }
    }

    if (wantDepts) {
      const maxGmv = rawDepts.reduce((m, d) => Math.max(m, d.total_gmv ?? 0), 0)
      const maxSellers = rawDepts.reduce((m, d) => Math.max(m, d.seller_count ?? 0), 0)
      const scored = rawDepts.map(d => ({
        d,
        score: computeDeptScore(d, maxGmv, maxSellers),
      }))
      departments = scored
        .slice(0, limit)
        .map(({ d, score }, idx) => buildDept(d, score, idx, Math.min(rawDepts.length, limit)))
    }

    // ── Cross-sell ─────────────────────────────────────────────────────────────
    type CrossSell = {
      dealer: string
      fogging_gmv: number
      adjacent_products: string[]
      adjacent_count: number
      why: string[]
      action: string
    }
    let cross_sell: CrossSell[] = []

    if (wantCrossSell) {
      // Dealers who sell fogging products
      const foggingRows = dealerProductRows.filter(r => FOGGING_REGEX.test(r.product ?? ""))
      const foggingDealerMap: Record<string, number> = {}
      for (const r of foggingRows) {
        if (!r.dealer) continue
        foggingDealerMap[r.dealer] = (foggingDealerMap[r.dealer] ?? 0) + (r.total_gmv ?? 0)
      }

      // For each fogging dealer, get non-fogging products as adjacent
      for (const [dealer, foggingGmv] of Object.entries(foggingDealerMap).slice(0, limit)) {
        const allProducts = dealerProductMap[dealer] ?? []
        const adjacentProducts = allProducts.filter(p => !FOGGING_REGEX.test(p)).slice(0, 5)

        // Dept info for why
        const depts = dealerDeptMap[dealer] ?? []
        const healthDepts = depts.filter(dep =>
          /health|hospital|medical|PHC|municipal|sanitation/i.test(dep)
        )

        const why: string[] = []
        if (healthDepts.length > 0)
          why.push(`Already sells to ${healthDepts.length} health/municipal departments`)
        if (adjacentProducts.length > 0)
          why.push(`Carries ${adjacentProducts.length} products adjacent to thermal fogging`)
        if ((foggingGmv / 10_000_000) > 0.05)
          why.push(`₹${(foggingGmv / 10_000_000).toFixed(2)}Cr in fogging/vector-control GMV`)

        cross_sell.push({
          dealer,
          fogging_gmv: foggingGmv,
          adjacent_products: adjacentProducts,
          adjacent_count: adjacentProducts.length,
          why: why.length > 0 ? why : ["Fogging seller on GeM — introduce 100X product line"],
          action: "Introduce 100X product line",
        })
      }
      cross_sell = cross_sell.slice(0, limit)
    }

    const result: Record<string, unknown> = {}
    if (wantDealers) result.dealers = dealers
    if (wantProducts) result.products = products
    if (wantDepts) result.departments = departments
    if (wantCrossSell) result.cross_sell = cross_sell

    return NextResponse.json(result)
  } catch (err) {
    console.error("recommendations error:", err)
    return NextResponse.json({ error: "Failed to load recommendations" }, { status: 500 })
  }
}
