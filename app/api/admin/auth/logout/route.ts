import { type NextRequest, NextResponse } from "next/server"
import { SESSION_COOKIE, verifyJWT } from "@/lib/rbac/jwt"
import { getCurrentUser, writeAuditLog } from "@/lib/rbac/server"
import { revokeSession } from "@/lib/rbac/sessions"

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const user  = await getCurrentUser(request)

  // Revoke the DB session if we have a sessionId in the JWT
  if (token && token !== "authenticated") {
    const payload = await verifyJWT(token)
    if (payload?.sessionId) {
      await revokeSession(payload.sessionId, payload.sub, "logout")
    }
  }

  if (user) {
    await writeAuditLog(user, "logout", "auth", { sessionId: (await verifyJWT(token ?? ""))?.sessionId ?? null }, request)
  }

  const response = NextResponse.json({ success: true })
  // Clear both the JWT cookie and the legacy cookie (same name, different values)
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge:   0,
    path:     "/",
  })
  return response
}
