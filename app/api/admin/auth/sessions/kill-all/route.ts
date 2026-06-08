// POST /api/admin/auth/sessions/kill-all
// Emergency kill switch — Super Admin only.
// Revokes ALL active sessions across ALL users immediately.

import { type NextRequest, NextResponse } from "next/server"
import { SESSION_COOKIE } from "@/lib/rbac/jwt"
import { getCurrentUser, writeAuditLog } from "@/lib/rbac/server"
import { revokeAllActiveSessions } from "@/lib/rbac/sessions"

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role !== "super_admin") {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 })
  }

  const body    = await request.json().catch(() => ({}))
  const confirm = (body as { confirm?: string }).confirm

  if (confirm !== "KILL_ALL_SESSIONS") {
    return NextResponse.json({
      error: "Confirmation required",
      hint:  'POST with { "confirm": "KILL_ALL_SESSIONS" }',
    }, { status: 400 })
  }

  const count = await revokeAllActiveSessions(user.sub)

  await writeAuditLog(user, "kill_all", "auth", { revokedCount: count }, request)

  const response = NextResponse.json({
    ok:      true,
    revoked: count,
    message: `${count} active sessions terminated. All users will be signed out within 5 minutes.`,
  })

  // Also sign out the caller
  response.cookies.set("admin-token", "", { httpOnly: true, secure: true, sameSite: "strict", maxAge: 0, path: "/" })
  return response
}
