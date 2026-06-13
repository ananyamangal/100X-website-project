/**
 * GET /api/admin/procurement/archive/contracts
 *
 * List archived contracts from gem_contract_archives.
 * Query params: limit, skip, status, class, q (search GEMC# or buyer)
 */

import { NextRequest, NextResponse }    from "next/server"
import clientPromise                    from "@/lib/mongodb"
import { requirePermission }            from "@/lib/rbac/server"
import type { ContractArchiveRecord }   from "@/lib/gem/storage-provider"

export const maxDuration = 30

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "procurement.archive.view")
  if (!("user" in auth)) return auth

  const sp     = req.nextUrl.searchParams
  const limit  = Math.min(parseInt(sp.get("limit") ?? "50"), 200)
  const skip   = parseInt(sp.get("skip") ?? "0")
  const status = sp.get("status") ?? ""
  const cls    = sp.get("class") ?? ""
  const q      = sp.get("q") ?? ""

  const query: Record<string, unknown> = {}
  if (status) query.status    = status
  if (cls)    query.pdf_class = cls.toUpperCase()
  if (q.length >= 2) {
    const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    query.$or = [
      { gemc_number:  { $regex: esc, $options: "i" } },
      { buyer_name:   { $regex: esc, $options: "i" } },
      { buyer_slug:   { $regex: esc, $options: "i" } },
      { seller_name:  { $regex: esc, $options: "i" } },
    ]
  }

  try {
    const db  = (await clientPromise).db()
    const col = db.collection<ContractArchiveRecord>("gem_contract_archives")

    const [contracts, total] = await Promise.all([
      col.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      col.countDocuments(query),
    ])

    return NextResponse.json(
      JSON.parse(JSON.stringify({ contracts, total, limit, skip }))
    )
  } catch (err) {
    console.error("[archive/contracts] GET error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
