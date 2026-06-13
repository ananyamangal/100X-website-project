/**
 * GET /api/admin/procurement/archive/[contractId]
 *
 * Returns the full archive record for a single contract.
 * [contractId] is the normalized GEMC number (e.g., GEMC-511687788095606)
 */

import { NextRequest, NextResponse }    from "next/server"
import clientPromise                    from "@/lib/mongodb"
import { requirePermission }            from "@/lib/rbac/server"
import type { ContractArchiveRecord }   from "@/lib/gem/storage-provider"

export const maxDuration = 15

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const auth = await requirePermission(req, "procurement.archive.view")
  if (!("user" in auth)) return auth

  const { contractId } = await params
  if (!contractId) return NextResponse.json({ error: "contractId required" }, { status: 400 })

  try {
    const db     = (await clientPromise).db()
    const record = await db.collection<ContractArchiveRecord>("gem_contract_archives")
      .findOne({ gemc_number: contractId.toUpperCase().trim() })

    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 })

    return NextResponse.json(JSON.parse(JSON.stringify(record)))
  } catch (err) {
    console.error("[archive/contractId] GET error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
