// POST /api/admin/auth/sessions/heartbeat
// Called by the client every 5 minutes to:
// 1. Update lastActivity on the current session
// 2. Return 401 if the session has been revoked (triggers client-side logout)

import { type NextRequest, NextResponse } from "next/server"
import { SESSION_COOKIE, verifyJWT } from "@/lib/rbac/jwt"
import { isSessionRevoked, updateLastActivity } from "@/lib/rbac/sessions"

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token || token === "authenticated") {
    // Legacy session — heartbeat not applicable
    return NextResponse.json({ ok: true, legacy: true })
  }

  const payload = await verifyJWT(token)
  if (!payload) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 })
  }

  const sessionId = payload.sessionId
  if (!sessionId) {
    return NextResponse.json({ ok: true, noSession: true })
  }

  const revoked = await isSessionRevoked(sessionId)
  if (revoked) {
    const response = NextResponse.json({ error: "Session revoked" }, { status: 401 })
    response.cookies.set("admin-token", "", { httpOnly: true, secure: true, sameSite: "strict", maxAge: 0, path: "/" })
    return response
  }

  await updateLastActivity(sessionId)
  return NextResponse.json({ ok: true, sessionId })
}
