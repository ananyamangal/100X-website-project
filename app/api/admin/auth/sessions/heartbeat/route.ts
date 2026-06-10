// POST /api/admin/auth/sessions/heartbeat
// Called by the client every 5 minutes to:
// 1. Update lastActivity on the current session
// 2. Return 401 if the session has been revoked (triggers client-side logout)
// 3. Rotate the JWT when it has less than half its original lifetime remaining

import { type NextRequest, NextResponse } from "next/server"
import { SESSION_COOKIE, SESSION_MAX_AGE, verifyJWT, signJWT, getRoleTimeout } from "@/lib/rbac/jwt"
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

  // Rotate the JWT when less than half its lifetime remains.
  // Also extends the session's expiresAt so the MongoDB TTL doesn't evict it.
  const now = Math.floor(Date.now() / 1000)
  const totalTtl = getRoleTimeout(payload.role)
  const remaining = payload.exp - now
  const shouldRotate = remaining < totalTtl / 2
  const response = NextResponse.json({ ok: true, sessionId, rotated: shouldRotate })

  if (shouldRotate) {
    const { iat: _iat, exp: _exp, ...rest } = payload
    const newToken = await signJWT(rest)
    response.cookies.set(SESSION_COOKIE, newToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    })
    // Extend the session record's expiresAt so TTL index doesn't evict the active session
    if (sessionId) {
      const db = (await (await import("@/lib/mongodb")).default).db()
      await db.collection("active_sessions").updateOne(
        { sessionId, isRevoked: false },
        { $set: { expiresAt: new Date(Date.now() + totalTtl * 1000), lastActivity: new Date() } }
      )
    }
  }

  return response
}
