import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requirePermission } from "@/lib/rbac/server"

// GET /api/admin/auth/audit-log
// Returns the most recent auth audit entries (up to 200).
// Optional query params: email, action, limit
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "users.view")
  if (!("user" in auth)) return auth

  const { searchParams } = new URL(request.url)
  const email  = searchParams.get("email")?.toLowerCase().trim()
  const action = searchParams.get("action")?.trim()
  const limit  = Math.min(parseInt(searchParams.get("limit") ?? "100", 10), 200)

  const filter: Record<string, unknown> = {}
  if (email)  filter.email  = { $regex: email, $options: "i" }
  if (action) filter.action = action

  const db = (await clientPromise).db()
  const entries = await db
    .collection("auth_audit_log")
    .find(filter)
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray()

  return NextResponse.json({
    entries: entries.map(e => ({
      id:        String(e._id),
      action:    e.action,
      email:     e.email,
      userId:    e.userId ?? null,
      ip:        e.ip,
      userAgent: e.userAgent,
      details:   e.details ?? {},
      timestamp: e.timestamp,
    })),
  })
}
