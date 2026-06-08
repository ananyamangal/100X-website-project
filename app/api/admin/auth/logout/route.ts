import { type NextRequest, NextResponse } from "next/server"
import { SESSION_COOKIE } from "@/lib/rbac/jwt"
import { getCurrentUser, writeAuditLog } from "@/lib/rbac/server"

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (user) {
    await writeAuditLog(user, "logout", "auth", {}, request)
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  })
  return response
}
