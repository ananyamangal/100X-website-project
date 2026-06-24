/**
 * GET /api/growth/fogging/sellers/export
 *
 * Exports fogging_sellers as CSV or Excel (XLSX).
 *
 * Query params (mirrors /api/fogging/sellers filters + extras):
 *   format   = csv (default) | excel
 *   preset   = all (default) | top100 | top500 | instafog | multioem | statewise
 *   q        = text search
 *   sort     = gmv | contracts | buyers | states | recent
 *   state    = seller_state
 *   is_100x  = true | false
 *   multi_oem = true
 *   has_gst  = true | false
 */
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import * as XLSX from "xlsx"
import type { Document, Filter } from "mongodb"

const DB   = "100xDB"
const COLL = "fogging_sellers"

interface SellerDoc {
  _id:               unknown
  seller_display_name?: string
  seller_gst?:       string
  seller_state?:     string
  total_gmv?:        number
  total_contracts?:  number
  buyers_served?:    number
  oems_represented?: { oem_canonical: string; brand_name: string; gmv: number }[]
  selling_as?:       string
  oem_count?:        number
  first_contract_date?: unknown
  last_contract_date?:  unknown
  seller_email?:     string
  seller_phone?:     string
  seller_gem_id?:    string
  average_contract_value?: number
  states_served?:    number
  is_100x_dealer?:   boolean
  has_gst?:          boolean
}

function buildFilter(p: Record<string, string>): Filter<Document> {
  const filter: Filter<Document> = {}
  if (p.state)               filter.seller_state      = p.state
  if (p.is_100x === "true")  filter.is_100x_dealer    = true
  if (p.is_100x === "false") filter.is_100x_dealer    = false
  if (p.has_gst === "true")  filter.has_gst           = true
  if (p.has_gst === "false") filter.has_gst           = false
  if (p.multi_oem === "true") filter.oem_count        = { $gt: 1 }
  if (p.q) filter.seller_display_name = { $regex: p.q, $options: "i" }
  return filter
}

function fmtDate(val: unknown): string {
  if (!val) return ""
  try {
    const d = new Date(String(val))
    return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0]
  } catch { return "" }
}

function fmtGmv(v: number | undefined): string {
  if (v == null) return ""
  if (v >= 10_000_000) return `${(v / 10_000_000).toFixed(2)} Cr`
  if (v >= 100_000)    return `${(v / 100_000).toFixed(1)} L`
  return String(v)
}

function rowsFromDocs(docs: SellerDoc[], startRank = 1): Record<string, string | number>[] {
  return docs.map((s, i) => ({
    "Rank":                  startRank + i,
    "Seller Name":           s.seller_display_name ?? "",
    "GSTIN":                 s.seller_gst ?? "",
    "State":                 s.seller_state ?? "",
    "GMV":                   s.total_gmv ?? 0,
    "GMV (formatted)":       fmtGmv(s.total_gmv),
    "Contracts":             s.total_contracts ?? 0,
    "Buyers":                s.buyers_served ?? 0,
    "OEMs":                  (s.oems_represented ?? []).map(o => o.brand_name || o.oem_canonical).join("; "),
    "Seller Type":           s.selling_as ?? "",
    "OEM Count":             s.oem_count ?? 0,
    "First Seen":            fmtDate(s.first_contract_date),
    "Last Contract Date":    fmtDate(s.last_contract_date),
    "Email":                 s.seller_email ?? "",
    "Phone":                 s.seller_phone ?? "",
    "Website":               "",
    "GeM Seller ID":         s.seller_gem_id ?? "",
  }))
}

function rowsStatewise(docs: SellerDoc[]): Record<string, string | number>[] {
  // Sort by state then GMV desc; add State Rank column
  const sorted = [...docs].sort((a, b) => {
    const sc = (a.seller_state ?? "").localeCompare(b.seller_state ?? "")
    if (sc !== 0) return sc
    return (b.total_gmv ?? 0) - (a.total_gmv ?? 0)
  })

  let stateRank = 0
  let lastState = ""
  let globalRank = 0

  return sorted.map(s => {
    globalRank++
    if (s.seller_state !== lastState) {
      stateRank = 1
      lastState = s.seller_state ?? ""
    } else {
      stateRank++
    }
    return {
      "State Rank":          stateRank,
      "Global Rank":         globalRank,
      "Seller Name":         s.seller_display_name ?? "",
      "GSTIN":               s.seller_gst ?? "",
      "State":               s.seller_state ?? "",
      "GMV":                 s.total_gmv ?? 0,
      "GMV (formatted)":     fmtGmv(s.total_gmv),
      "Contracts":           s.total_contracts ?? 0,
      "Buyers":              s.buyers_served ?? 0,
      "OEMs":                (s.oems_represented ?? []).map(o => o.brand_name || o.oem_canonical).join("; "),
      "Seller Type":         s.selling_as ?? "",
      "OEM Count":           s.oem_count ?? 0,
      "First Seen":          fmtDate(s.first_contract_date),
      "Last Contract Date":  fmtDate(s.last_contract_date),
      "Email":               s.seller_email ?? "",
      "Phone":               s.seller_phone ?? "",
      "Website":             "",
      "GeM Seller ID":       s.seller_gem_id ?? "",
    }
  })
}

function toCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return ""
  const headers = Object.keys(rows[0])
  const escape = (v: string | number) => {
    const s = String(v ?? "")
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [
    headers.join(","),
    ...rows.map(r => headers.map(h => escape(r[h] ?? "")).join(",")),
  ]
  return lines.join("\r\n")
}

function toExcel(rows: Record<string, string | number>[], sheetName: string): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows)

  // Auto-size columns based on max content length
  const headers = Object.keys(rows[0] ?? {})
  const colWidths = headers.map(h => {
    const maxLen = rows.reduce((max, r) => Math.max(max, String(r[h] ?? "").length), h.length)
    return { wch: Math.min(Math.max(maxLen + 2, 10), 50) }
  })
  ws["!cols"] = colWidths

  // Freeze header row
  ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }))
}

export async function GET(req: NextRequest) {
  const p = Object.fromEntries(req.nextUrl.searchParams)
  const format = p.format === "excel" ? "excel" : "csv"
  const preset = p.preset ?? "all"

  try {
    const client  = await clientPromise
    const db      = client.db(DB)
    const coll    = db.collection<SellerDoc>(COLL)

    const projection = {
      seller_display_name: 1, seller_gst: 1, seller_state: 1,
      total_gmv: 1, total_contracts: 1, buyers_served: 1,
      oems_represented: 1, selling_as: 1, oem_count: 1,
      first_contract_date: 1, last_contract_date: 1,
      seller_email: 1, seller_phone: 1, seller_gem_id: 1,
      is_100x_dealer: 1, has_gst: 1, states_served: 1,
    } as const

    // Build query based on preset
    let filter: Filter<Document> = buildFilter(p)
    let limit  = 0   // 0 = no limit
    let sortBy: Record<string, 1 | -1> = { total_gmv: -1 }
    let label  = "all_sellers"

    if (preset === "top100")   { limit = 100;  label = "top_100" }
    if (preset === "top500")   { limit = 500;  label = "top_500" }
    if (preset === "instafog") {
      filter["oems_represented.oem_canonical"] = "INSTA FOG"
      label = "insta_fog_sellers"
    }
    if (preset === "multioem") {
      filter.oem_count = { $gt: 1 }
      label = "multi_oem_sellers"
    }
    if (preset === "statewise") {
      label = "statewise_sellers"
      // No special filter, handled in row generation
    }

    const cursor = coll.find(filter, { projection }).sort(sortBy)
    if (limit > 0) cursor.limit(limit)
    const docs = await cursor.toArray() as SellerDoc[]

    // Build rows
    const rows = preset === "statewise"
      ? rowsStatewise(docs)
      : rowsFromDocs(docs)

    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "")
    const filename  = `fogging_sellers_${label}_${timestamp}`

    // Audit log
    await db.collection("growth_os_logs").insertOne({
      ts:      new Date().toISOString(),
      agent:   "seller-intelligence",
      action:  "export_downloaded",
      module:  "fogging",
      format,
      preset,
      filters: Object.fromEntries(
        Object.entries(p).filter(([k]) => !["format","preset"].includes(k))
      ),
      rowCount: rows.length,
      filename: `${filename}.${format === "excel" ? "xlsx" : "csv"}`,
      level:   "info",
    })

    if (format === "excel") {
      const buf = toExcel(rows, label.replace(/_/g, " "))
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
          "Cache-Control":       "no-store",
        },
      })
    } else {
      const csv = toCsv(rows)
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type":        "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
          "Cache-Control":       "no-store",
        },
      })
    }
  } catch (e) {
    console.error("[sellers/export]", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
