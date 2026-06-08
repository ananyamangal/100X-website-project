import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requirePermission } from "@/lib/rbac/server"
import type { DBAuditLog } from "@/lib/rbac/types"

// GET /api/admin/audit — paginated audit log
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "audit.view")
  if (!("user" in auth)) return auth

  const { searchParams } = request.nextUrl
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const limit    = Math.min(100, parseInt(searchParams.get("limit") ?? "50"))
  const action   = searchParams.get("action") ?? ""
  const userId   = searchParams.get("userId") ?? ""
  const resource = searchParams.get("resource") ?? ""

  const filter: Record<string, unknown> = {}
  if (action)   filter.action   = action
  if (userId)   filter.userId   = userId
  if (resource) filter.resource = resource

  const client = await clientPromise
  const db     = client.db()

  const [logs, total] = await Promise.all([
    db
      .collection<DBAuditLog>("audit_logs")
      .find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    db.collection("audit_logs").countDocuments(filter),
  ])

  return NextResponse.json({
    logs: logs.map(l => ({ ...l, id: String(l._id) })),
    total,
    page,
    pages: Math.ceil(total / limit),
  })
}
