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
  const secure = process.env.NODE_ENV === "production"

  // Clear the HTTP-only JWT cookie (path=/)
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure,
    sameSite: "strict",
    maxAge:   0,
    path:     "/",
  })

  // Also clear the legacy client-set cookie that the legacy admin writes at path=/admin.
  // Must use headers.append because cookies.set() with the same name overwrites the first Set-Cookie.
  const legacyCookieStr = `${SESSION_COOKIE}=; path=/admin; max-age=0; SameSite=Strict${secure ? "; Secure" : ""}`
  response.headers.append("Set-Cookie", legacyCookieStr)

  return response
}
