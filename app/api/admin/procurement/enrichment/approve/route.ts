/**
 * POST /api/admin/procurement/enrichment/approve
 *   Issue a single-use, time-limited approval token for an enrichment operation.
 *   Requires permission: procurement.enrichment.approve
 *   Body: { phrase: string, operation: ApprovalOperation }
 *   Returns: { ok: true, token_id, expires_at, ttl_seconds }
 *
 * GET /api/admin/procurement/enrichment/approve?token_id=<uuid>
 *   Check the status of a previously issued token.
 *   Only the issuing user can check their own token.
 */

import { NextRequest, NextResponse } from "next/server"
import { requirePermission, writeAuditLog } from "@/lib/rbac/server"
import {
  issueApprovalToken,
  getApprovalRecord,
  APPROVAL_PHRASE,
  type ApprovalOperation,
} from "@/lib/gem/approval"

export const maxDuration = 15

const VALID_OPERATIONS: ApprovalOperation[] = [
  "harvest_scan",
  "batch_fetch",
  "batch_parse_save",
  "enrich_pending",
]

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "procurement.enrichment.approve")
  if (!("user" in auth)) return auth

  try {
    const body = await req.json()
    const { phrase, operation }: { phrase?: string; operation?: string } = body

    if (!VALID_OPERATIONS.includes(operation as ApprovalOperation)) {
      return NextResponse.json({ error: "Invalid operation" }, { status: 400 })
    }

    if (phrase !== APPROVAL_PHRASE) {
      await writeAuditLog(
        auth.user,
        "enrichment_approval_rejected",
        "gem_enrichment_approvals",
        { reason: "wrong_phrase", operation, provided_length: phrase?.length ?? 0 },
        req,
      )
      return NextResponse.json(
        {
          error: `Approval phrase incorrect. Type exactly: "${APPROVAL_PHRASE}"`,
          required: APPROVAL_PHRASE,
        },
        { status: 403 },
      )
    }

    const ip        = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown"
    const userAgent = req.headers.get("user-agent") ?? "unknown"

    const { token_id, expires_at, ttl_seconds } = await issueApprovalToken(
      auth.user,
      operation as ApprovalOperation,
      ip,
      userAgent,
    )

    await writeAuditLog(
      auth.user,
      "enrichment_approved",
      "gem_enrichment_approvals",
      { token_id, operation, expires_at: expires_at.toISOString(), ttl_seconds },
      req,
    )

    return NextResponse.json({ ok: true, token_id, expires_at, ttl_seconds })
  } catch (err) {
    console.error("[enrichment/approve] POST error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "procurement.enrichment.approve")
  if (!("user" in auth)) return auth

  const token_id = req.nextUrl.searchParams.get("token_id")
  if (!token_id) return NextResponse.json({ error: "token_id required" }, { status: 400 })

  try {
    const record = await getApprovalRecord(token_id)
    if (!record) return NextResponse.json({ error: "Token not found" }, { status: 404 })

    if (record.issued_to_user_id !== auth.user.sub) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const now              = new Date()
    const is_expired       = record.status === "active" && record.expires_at < now
    const effective_status = is_expired ? "expired" : record.status

    return NextResponse.json({
      token_id:          record.token_id,
      status:            effective_status,
      operation:         record.operation,
      issued_at:         record.issued_at,
      expires_at:        record.expires_at,
      consumed_at:       record.consumed_at,
      consumed_by_route: record.consumed_by_route,
      ttl_remaining_ms:  effective_status === "active"
        ? Math.max(0, record.expires_at.getTime() - now.getTime())
        : 0,
    })
  } catch (err) {
    console.error("[enrichment/approve] GET error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
