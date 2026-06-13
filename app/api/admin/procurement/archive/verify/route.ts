/**
 * POST /api/admin/procurement/archive/verify
 *
 * Re-reads the stored contract.pdf and recomputes SHA256 against metadata.json.
 * Updates integrity_verified and status in gem_contract_archives.
 *
 * Body: { gemc_number: string }
 */

import { NextRequest, NextResponse }  from "next/server"
import { requirePermission, writeAuditLog } from "@/lib/rbac/server"
import { verifyContractIntegrity }    from "@/lib/gem/archive-service"
import { getStorageProvider }         from "@/lib/gem/providers/factory"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "procurement.archive.view")
  if (!("user" in auth)) return auth

  let body: { gemc_number?: string }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) }

  const gemc = body.gemc_number?.trim()
  if (!gemc) return NextResponse.json({ error: "gemc_number is required" }, { status: 400 })

  try {
    const provider = getStorageProvider()
    const result   = await verifyContractIntegrity(provider, gemc)

    const action = result.match ? "archive_integrity_pass" : "archive_integrity_fail"
    await writeAuditLog(auth.user, action, "archive/verify", {
      gemc_number: result.gemcNumber,
      sha256:      result.storedSha256,
      match:       result.match,
    }, req)

    return NextResponse.json(result)
  } catch (err) {
    console.error("[archive/verify] POST error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
