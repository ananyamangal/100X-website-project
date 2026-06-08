// GET    /api/admin/auth/sessions  — list sessions (own, or all if SA + ?all=1)
// DELETE /api/admin/auth/sessions  — revoke all OTHER sessions for current user

import { type NextRequest, NextResponse } from "next/server"
import { SESSION_COOKIE, verifyJWT } from "@/lib/rbac/jwt"
import { getCurrentUser, writeAuditLog } from "@/lib/rbac/server"
import {
  getActiveSessions, getAllActiveSessions, revokeSession,
} from "@/lib/rbac/sessions"

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const token    = request.cookies.get(SESSION_COOKIE)?.value ?? ""
  const payload  = await verifyJWT(token)
  const isSA     = user.role === "super_admin"
  const showAll  = isSA && request.nextUrl.searchParams.get("all") === "1"

  const sessions = showAll
    ? await getAllActiveSessions()
    : await getActiveSessions(user.sub)

  return NextResponse.json({ sessions, currentSessionId: payload?.sessionId ?? null })
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const token            = request.cookies.get(SESSION_COOKIE)?.value ?? ""
  const payload          = await verifyJWT(token)
  const currentSessionId = payload?.sessionId ?? null

  const sessions = await getActiveSessions(user.sub)
  let count = 0
  for (const s of sessions) {
    if (s.sessionId !== currentSessionId && !s.isRevoked) {
      await revokeSession(s.sessionId, user.sub, "force_logout")
      count++
    }
  }

  await writeAuditLog(user, "force_logout", "auth", { count, kept: currentSessionId }, request)
  return NextResponse.json({ ok: true, revoked: count })
}
