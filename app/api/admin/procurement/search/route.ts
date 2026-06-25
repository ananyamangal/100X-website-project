import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { Filter, Document } from "mongodb"

export const maxDuration = 60

const PROJECT_FIELDS = {
  _id: 0,
  gemc_no: 1,
  seller_name_canonical: 1,
  dept_name: 1,
  ministry: 1,
  product_name: 1,
  contract_value_num: 1,
  seller_state: 1,
  state: 1,
  contract_status: 1,
  contract_date_dt: 1,
  quantity: 1,
  unit_rate: 1,
  buyer_name: 1,
  buying_mode: 1,
  seller_msme_category: 1,
  detail_scraped: 1,
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function csvEscape(val: unknown): string {
  const s = val == null ? "" : String(val)
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

function buildFilter(searchParams: URLSearchParams): Filter<Document> {
  const filter: Filter<Document> = {}
  const conditions: Filter<Document>[] = []

  const q = searchParams.get("q")?.trim()
  if (q) {
    const re = { $regex: escapeRegex(q), $options: "i" }
    conditions.push({
      $or: [
        { gemc_no: re },
        { seller_name_canonical: re },
        { dept_name: re },
        { product_name: re },
        { seller_gst: re },
      ],
    })
  }

  const seller = searchParams.get("seller")?.trim()
  if (seller) conditions.push({ seller_name_canonical: { $regex: escapeRegex(seller), $options: "i" } })

  const dept = searchParams.get("dept")?.trim()
  if (dept) conditions.push({ dept_name: { $regex: escapeRegex(dept), $options: "i" } })

  const ministry = searchParams.get("ministry")?.trim()
  if (ministry) conditions.push({ ministry: { $regex: escapeRegex(ministry), $options: "i" } })

  const product = searchParams.get("product")?.trim()
  if (product) conditions.push({ product_name: { $regex: escapeRegex(product), $options: "i" } })

  const state = searchParams.get("state")?.trim()
  if (state) {
    const re = { $regex: escapeRegex(state), $options: "i" }
    conditions.push({ $or: [{ seller_state: re }, { state: re }] })
  }

  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")
  if (dateFrom || dateTo) {
    const dateRange: Record<string, string> = {}
    if (dateFrom) dateRange.$gte = dateFrom
    if (dateTo) dateRange.$lte = dateTo
    conditions.push({ contract_date_dt: dateRange })
  }

  const valueMin = searchParams.get("valueMin")
  const valueMax = searchParams.get("valueMax")
  if (valueMin || valueMax) {
    const valRange: Record<string, number> = {}
    if (valueMin) valRange.$gte = Number(valueMin)
    if (valueMax) valRange.$lte = Number(valueMax)
    conditions.push({ contract_value_num: valRange })
  }

  const status = searchParams.get("status")?.trim()
  if (status) conditions.push({ contract_status: status })

  const gemc = searchParams.get("gemc")?.trim()
  if (gemc) conditions.push({ gemc_no: gemc })

  const msme = searchParams.get("msme")
  if (msme === "true") conditions.push({ seller_msme_category: { $nin: [null, ""] } })

  const country = searchParams.get("country")?.trim()
  if (country) conditions.push({ country_of_origin: { $regex: escapeRegex(country), $options: "i" } })

  if (conditions.length === 1) return conditions[0]
  if (conditions.length > 1) filter.$and = conditions
  return filter
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const db = (await clientPromise).db()
    const gc = db.collection("gem_contracts")

    const filter = buildFilter(searchParams)

    const isExport = searchParams.get("export") === "csv"

    if (isExport) {
      // Stream up to 5000 matching contracts as CSV
      const rows = await gc
        .find(filter, { projection: PROJECT_FIELDS })
        .limit(5000)
        .toArray()

      const header = [
        "Contract#", "Seller", "Department", "Ministry", "Product",
        "Value(₹)", "State", "Status", "Date", "Qty", "Unit Rate",
        "Buyer", "Mode",
      ].join(",")

      const lines = rows.map(r => [
        csvEscape(r.gemc_no),
        csvEscape(r.seller_name_canonical),
        csvEscape(r.dept_name),
        csvEscape(r.ministry),
        csvEscape(r.product_name),
        csvEscape(r.contract_value_num),
        csvEscape(r.seller_state || r.state),
        csvEscape(r.contract_status),
        csvEscape(r.contract_date_dt ? String(r.contract_date_dt).slice(0, 10) : ""),
        csvEscape(r.quantity),
        csvEscape(r.unit_rate),
        csvEscape(r.buyer_name),
        csvEscape(r.buying_mode),
      ].join(","))

      const csv = [header, ...lines].join("\r\n")

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="contracts-export-${Date.now()}.csv"`,
        },
      })
    }

    // Paginated JSON response
    const page = Math.max(1, Number(searchParams.get("page") || 1))
    const limit = Math.min(Math.max(1, Number(searchParams.get("limit") || 25)), 100)
    const skip = (page - 1) * limit

    // Run data + summary in parallel
    const [contracts, summaryArr] = await Promise.all([
      gc
        .find(filter, { projection: PROJECT_FIELDS })
        .sort({ contract_date_dt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      gc
        .aggregate([
          { $match: filter },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              total_gmv: { $sum: { $ifNull: ["$contract_value_num", 0] } },
            },
          },
        ])
        .toArray(),
    ])

    const summary = summaryArr[0] as { total?: number; total_gmv?: number } | undefined
    const total = summary?.total ?? 0
    const total_gmv = summary?.total_gmv ?? 0
    const pages = Math.ceil(total / limit)

    return NextResponse.json({
      contracts,
      page,
      pages,
      total,
      total_gmv,
      limit,
    })
  } catch (err) {
    console.error("procurement search error:", err)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
