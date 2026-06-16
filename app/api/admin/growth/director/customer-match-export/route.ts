/**
 * Customer Match Export
 * Returns org data as CSV for Google Ads Customer Match upload,
 * or as JSON breakdown for the UI audience summary.
 *
 * GET /api/admin/growth/director/customer-match-export?format=csv  → download CSV
 * GET /api/admin/growth/director/customer-match-export             → JSON breakdown
 */
import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

interface OrgRow {
  org_name: string
  state: string
  dept_category: string
  total_gmv: number
  total_contracts: number
  normalized_category: string
  priority_score: number
}

interface CategoryBreakdown {
  category: string
  normalized: string
  org_count: number
  total_gmv: number
  avg_gmv: number
  priority_score: number
}

function normalizeCategory(raw: string): string {
  const s = raw.toLowerCase()
  if (s.includes("municipal") || s.includes("municipality") || s.includes("urban local"))
    return "Municipal"
  if (s.includes("health") || s.includes("medical") || s.includes("hospital") || s.includes("sanit"))
    return "Health"
  if (s.includes("urban") || s.includes("smart city") || s.includes("development authority"))
    return "Urban Development"
  if (s.includes("agri") || s.includes("horticulture") || s.includes("farm"))
    return "Agriculture"
  if (s.includes("water") || s.includes("sewage") || s.includes("drainage"))
    return "Water & Sanitation"
  if (s.includes("forest") || s.includes("environ"))
    return "Forest & Environment"
  return "Other Government"
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = new URL(req.url)
    const format = searchParams.get("format") || "json"
    const minGmv = parseInt(searchParams.get("min_gmv") || "5000")

    const db = (await clientPromise).db()

    const orgs = await db.collection("fogging_organizations")
      .find({ total_gmv: { $gte: minGmv } })
      .sort({ total_gmv: -1 })
      .toArray()

    const rows: OrgRow[] = orgs.map(o => {
      const rawCat = String(o.dept_category || o.organization_type || "Other Government")
      const normalizedCat = normalizeCategory(rawCat)
      const gmv = Number(o.total_gmv || 0)
      const contracts = Number(o.total_contracts || 0)
      const priorityScore = Math.round((gmv / 1_000_000) * Math.min(contracts, 10))

      return {
        org_name: String(o.organization_name || o.name || ""),
        state: String(o.state || o.organization_state || ""),
        dept_category: rawCat,
        total_gmv: gmv,
        total_contracts: contracts,
        normalized_category: normalizedCat,
        priority_score: priorityScore,
      }
    }).filter(r => r.org_name)

    // ── CSV format ────────────────────────────────────────────────────────────
    if (format === "csv") {
      const header = "Organization Name,State,Department Category,Total GMV (INR),Total Contracts,Audience Category,Priority Score"
      const csvRows = rows.map(r =>
        [
          `"${r.org_name.replace(/"/g, '""')}"`,
          `"${r.state}"`,
          `"${r.dept_category.replace(/"/g, '""')}"`,
          r.total_gmv,
          r.total_contracts,
          `"${r.normalized_category}"`,
          r.priority_score,
        ].join(",")
      )
      const csv = [header, ...csvRows].join("\r\n")

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="100x-customer-match-${new Date().toISOString().split("T")[0]}.csv"`,
          "Cache-Control": "no-store",
        },
      })
    }

    // ── JSON breakdown ────────────────────────────────────────────────────────
    const categoryMap = new Map<string, { count: number; gmv: number; raw_categories: Set<string> }>()

    for (const row of rows) {
      const key = row.normalized_category
      const entry = categoryMap.get(key) || { count: 0, gmv: 0, raw_categories: new Set() }
      entry.count++
      entry.gmv += row.total_gmv
      entry.raw_categories.add(row.dept_category)
      categoryMap.set(key, entry)
    }

    const totalGmv = rows.reduce((s, r) => s + r.total_gmv, 0)

    const categories: CategoryBreakdown[] = Array.from(categoryMap.entries())
      .map(([cat, data]) => ({
        category: cat,
        normalized: cat,
        org_count: data.count,
        total_gmv: data.gmv,
        avg_gmv: Math.round(data.gmv / data.count),
        priority_score: Math.round((data.gmv / totalGmv) * 100),
      }))
      .sort((a, b) => b.total_gmv - a.total_gmv)

    return NextResponse.json({
      generated_at: new Date().toISOString(),
      total_orgs: rows.length,
      total_gmv: totalGmv,
      min_gmv_filter: minGmv,
      categories,
      top_orgs: rows.slice(0, 20).map(r => ({
        org_name: r.org_name,
        state: r.state,
        dept_category: r.dept_category,
        normalized_category: r.normalized_category,
        total_gmv: r.total_gmv,
        total_contracts: r.total_contracts,
        priority_score: r.priority_score,
      })),
      upload_ready: rows.length >= 1000,
      estimated_match_rate: 0.28,
      estimated_matches: Math.round(rows.length * 0.28),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
