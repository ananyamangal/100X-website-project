// DELETE /api/admin/auth/sessions/:sessionId — revoke a specific session
// Any authenticated user can revoke their OWN sessions.
// Super Admin can revoke anyone's session.

import { type NextRequest, NextResponse } from "next/server"
import { SESSION_COOKIE, verifyJWT } from "@/lib/rbac/jwt"
import { getCurrentUser, writeAuditLog } from "@/lib/rbac/server"
import { revokeSession, getActiveSessions } from "@/lib/rbac/sessions"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { sessionId } = await params

  // Find the session to verify ownership
  const allSessions  = await getActiveSessions(user.role === "super_admin" ? undefined : user.sub)
  const target       = allSessions.find(s => s.sessionId === sessionId)

  if (!target) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  // Non-SA can only revoke their own sessions
  if (user.role !== "super_admin" && target.userId !== user.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (target.isRevoked) {
    return NextResponse.json({ ok: true, message: "Already revoked" })
  }

  // Check if this is the caller's own current session
  const token   = request.cookies.get(SESSION_COOKIE)?.value ?? ""
  const payload = await verifyJWT(token)
  const isSelf  = payload?.sessionId === sessionId

  await revokeSession(sessionId, user.sub, "force_logout")
  await writeAuditLog(user, "session_revoked", "auth",
    { sessionId, targetUserId: target.userId, targetEmail: target.userEmail, isSelf },
    request
  )

  const response = NextResponse.json({ ok: true, isSelf })

  // If revoking own current session, also clear the cookie
  if (isSelf) {
    response.cookies.set("admin-token", "", { httpOnly: true, secure: true, sameSite: "strict", maxAge: 0, path: "/" })
  }

  return response
}
