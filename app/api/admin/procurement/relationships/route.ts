import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const maxDuration = 60

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** relationship_strength = contract_count * ln(total_gmv + 1), normalised 0-100 */
function relStrength(contractCount: number, totalGmv: number): number {
  const raw = contractCount * Math.log(totalGmv + 1)
  return Math.min(Math.round(raw / 100), 100)
}

/**
 * Compute YoY growth trend from an array of { year, gmv } sorted ascending.
 * Returns pct change between the last two years, or null if not enough data.
 */
function yoyTrend(yearRows: { year: string; gmv: number }[]): number | null {
  if (yearRows.length < 2) return null
  const sorted = [...yearRows].sort((a, b) => a.year.localeCompare(b.year))
  const prev = sorted[sorted.length - 2].gmv
  const last = sorted[sorted.length - 1].gmv
  if (prev === 0) return null
  return Math.round(((last - prev) / prev) * 100)
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DealerProductRow {
  product?: string
  contract_count?: number
  total_gmv?: number
  dept_count?: number
  state_count?: number
  first_seen?: string
  last_seen?: string
}

interface DealerDeptRow {
  dept?: string
  ministry?: string
  contract_count?: number
  total_gmv?: number
  first_seen?: string
  last_seen?: string
  product_count?: number
  state_count?: number
}

interface YearGroup {
  _id: string
  gmv: number
}

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type") as "dealer" | "dept" | "product" | null
    const name = searchParams.get("name")

    const db = (await clientPromise).db()

    // ── No name param — return explore overview ────────────────────────────────
    if (!name || !type) {
      const [topDealersRaw, topDeptsRaw, topProductsRaw] = await Promise.all([
        db.collection("gem_kg_dealer_scores").find({}).sort({ total_gmv: -1 }).limit(20).toArray(),
        db.collection("gem_kg_dept_scores").find({}).sort({ total_gmv: -1 }).limit(20).toArray(),
        db.collection("gem_kg_product_scores").find({}).sort({ total_gmv: -1 }).limit(20).toArray(),
      ])

      // Add top_dept to dealers from a bulk kg query
      const dealerNames = topDealersRaw.map((d: Record<string, unknown>) => d.dealer as string).filter(Boolean)
      const topDeptRows = await db
        .collection("gem_kg_dealer_dept")
        .aggregate([
          { $match: { dealer: { $in: dealerNames } } },
          { $sort: { total_gmv: -1 } },
          { $group: { _id: "$dealer", top_dept: { $first: "$dept" }, top_dept_gmv: { $first: "$total_gmv" } } },
        ])
        .toArray()
      const dealerTopDeptMap: Record<string, string> = {}
      for (const row of topDeptRows) {
        dealerTopDeptMap[row._id as string] = (row as Record<string, unknown>).top_dept as string ?? ""
      }

      // Compute growth_trend for dealers from kg_dealer_scores (use active_years as proxy — no year breakdown in overview)
      const topDealers = topDealersRaw.map((d: Record<string, unknown>) => ({
        ...d,
        top_dept: dealerTopDeptMap[d.dealer as string] ?? null,
        growth_trend: null as number | null, // detailed trend available via ?type=dealer&name=X
      }))

      // Add growth_trend to products from gem_kg_product_scores year_trend field
      const topProducts = topProductsRaw.map((p: Record<string, unknown>) => {
        const yt = p.year_trend as Record<string, number> | undefined
        let growth_trend: number | null = null
        if (yt && typeof yt === "object") {
          const years = Object.keys(yt).sort()
          if (years.length >= 2) {
            const prev = yt[years[years.length - 2]] ?? 0
            const last = yt[years[years.length - 1]] ?? 0
            growth_trend = prev > 0 ? Math.round(((last - prev) / prev) * 100) : null
          }
        }
        return { ...p, growth_trend }
      })

      return NextResponse.json({ top_dealers: topDealers, top_depts: topDeptsRaw, top_products: topProducts })
    }

    const gc = db.collection("gem_contracts")

    // ── Dealer detail ──────────────────────────────────────────────────────────
    if (type === "dealer") {
      const nameRegex = new RegExp(`^${escapeRegex(name)}$`, "i")

      const [productsRaw, deptsRaw, states, recentContracts, yearGroupsRaw] = await Promise.all([
        db.collection("gem_kg_dealer_product").find({ dealer: name }).sort({ total_gmv: -1 }).limit(20).toArray(),
        db.collection("gem_kg_dealer_dept").find({ dealer: name }).sort({ total_gmv: -1 }).limit(20).toArray(),
        db.collection("gem_kg_dealer_state").find({ dealer: name }).toArray(),
        gc.find({ seller_name_canonical: nameRegex }).sort({ contract_date_dt: -1 }).limit(10).toArray(),
        // Year GMV for growth_trend
        gc.aggregate([
          { $match: { seller_name_canonical: nameRegex, contract_date_dt: { $nin: [null, ""] } } },
          {
            $group: {
              _id: { $substr: ["$contract_date_dt", 0, 4] },
              gmv: { $sum: { $ifNull: ["$contract_value_num", 0] } },
            },
          },
          { $sort: { _id: 1 } },
        ]).toArray() as Promise<YearGroup[]>,
      ])

      const yearRows = yearGroupsRaw.map(r => ({ year: r._id, gmv: r.gmv }))
      const growth_trend = yoyTrend(yearRows)

      // repeat_buy_score: depts with multi-year relationship / total depts
      const deptRows = deptsRaw as DealerDeptRow[]
      const multiYearDepts = deptRows.filter(r => {
        if (!r.first_seen || !r.last_seen) return false
        return r.first_seen.slice(0, 4) !== r.last_seen.slice(0, 4)
      }).length
      const totalDeptCount = deptRows.length
      const repeat_buy_score = totalDeptCount > 0
        ? Math.round((multiYearDepts / totalDeptCount) * 100)
        : 0

      // Augment products with relationship_strength
      const products = (productsRaw as DealerProductRow[]).map(p => ({
        ...p,
        relationship_strength: relStrength(p.contract_count ?? 0, p.total_gmv ?? 0),
      }))

      // Augment depts with relationship_strength
      const depts = deptRows.map(d => ({
        ...d,
        relationship_strength: relStrength(d.contract_count ?? 0, d.total_gmv ?? 0),
      }))

      const total_gmv = products.reduce((s, p) => s + (p.total_gmv ?? 0), 0)
      const total_contracts = recentContracts.length

      return NextResponse.json({
        type,
        name,
        products,
        depts,
        states,
        recent_contracts: recentContracts,
        total_gmv,
        total_contracts,
        repeat_buy_score,
        growth_trend,
      })
    }

    // ── Dept detail ────────────────────────────────────────────────────────────
    if (type === "dept") {
      const nameRegex = new RegExp(`^${escapeRegex(name)}$`, "i")

      const [dealersRaw, productsRaw, recentContracts, yearGroupsRaw] = await Promise.all([
        db.collection("gem_kg_dealer_dept").find({ dept: name }).sort({ total_gmv: -1 }).limit(20).toArray(),
        db.collection("gem_kg_dept_product").find({ dept: name }).sort({ total_gmv: -1 }).limit(20).toArray(),
        gc.find({ dept_name: nameRegex }).sort({ contract_date_dt: -1 }).limit(10).toArray(),
        gc.aggregate([
          { $match: { dept_name: nameRegex, contract_date_dt: { $nin: [null, ""] } } },
          {
            $group: {
              _id: { $substr: ["$contract_date_dt", 0, 4] },
              gmv: { $sum: { $ifNull: ["$contract_value_num", 0] } },
            },
          },
          { $sort: { _id: 1 } },
        ]).toArray() as Promise<YearGroup[]>,
      ])

      const yearRows = yearGroupsRaw.map(r => ({ year: r._id, gmv: r.gmv }))
      const growth_trend = yoyTrend(yearRows)

      type DealerDeptDetailRow = {
        dealer?: string
        contract_count?: number
        total_gmv?: number
        [key: string]: unknown
      }

      const dealers = (dealersRaw as DealerDeptDetailRow[]).map(d => ({
        ...d,
        relationship_strength: relStrength(d.contract_count ?? 0, d.total_gmv ?? 0),
      }))

      const total_gmv = dealers.reduce((s, d) => s + (d.total_gmv ?? 0), 0)
      const total_contracts = dealers.reduce((s, d) => s + (d.contract_count ?? 0), 0)

      return NextResponse.json({
        type,
        name,
        dealers,
        products: productsRaw,
        recent_contracts: recentContracts,
        total_gmv,
        total_contracts,
        growth_trend,
      })
    }

    // ── Product detail ─────────────────────────────────────────────────────────
    if (type === "product") {
      const nameRegex = new RegExp(`^${escapeRegex(name)}$`, "i")

      const [deptsRaw, dealersRaw, recentContracts, yearGroupsRaw] = await Promise.all([
        db.collection("gem_kg_dept_product").find({ product: name }).sort({ total_gmv: -1 }).limit(20).toArray(),
        db.collection("gem_kg_dealer_product").find({ product: name }).sort({ total_gmv: -1 }).limit(20).toArray(),
        gc.find({ product_name: nameRegex }).sort({ contract_date_dt: -1 }).limit(10).toArray(),
        gc.aggregate([
          { $match: { product_name: nameRegex, contract_date_dt: { $nin: [null, ""] } } },
          {
            $group: {
              _id: { $substr: ["$contract_date_dt", 0, 4] },
              gmv: { $sum: { $ifNull: ["$contract_value_num", 0] } },
            },
          },
          { $sort: { _id: 1 } },
        ]).toArray() as Promise<YearGroup[]>,
      ])

      const yearRows = yearGroupsRaw.map(r => ({ year: r._id, gmv: r.gmv }))
      const growth_trend = yoyTrend(yearRows)

      type DeptProductRow = { dept?: string; contract_count?: number; total_gmv?: number; [key: string]: unknown }
      type DealerProductRow2 = { dealer?: string; contract_count?: number; total_gmv?: number; [key: string]: unknown }

      const depts = (deptsRaw as DeptProductRow[]).map(d => ({
        ...d,
        relationship_strength: relStrength(d.contract_count ?? 0, d.total_gmv ?? 0),
      }))

      const dealers = (dealersRaw as DealerProductRow2[]).map(d => ({
        ...d,
        relationship_strength: relStrength(d.contract_count ?? 0, d.total_gmv ?? 0),
      }))

      const total_gmv = depts.reduce((s, d) => s + (d.total_gmv ?? 0), 0)
      const total_contracts = depts.reduce((s, d) => s + (d.contract_count ?? 0), 0)

      return NextResponse.json({
        type,
        name,
        depts,
        dealers,
        recent_contracts: recentContracts,
        total_gmv,
        total_contracts,
        growth_trend,
      })
    }

    return NextResponse.json({ error: "Invalid type. Must be dealer, dept, or product" }, { status: 400 })
  } catch (err) {
    console.error("relationships error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
