import { type NextRequest, NextResponse } from "next/server"
import { createPasswordResetToken } from "@/lib/rbac/passwordReset"
import { renderAndSend } from "@/lib/emailTemplates"
import { writeAuthAuditLog } from "@/lib/authAuditLog"
import clientPromise from "@/lib/mongodb"

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  )
}

// POST /api/admin/auth/forgot-password
// Public — no authentication required.
// Always returns the same response to prevent user enumeration.
export async function POST(request: NextRequest) {
  const ip        = getClientIp(request)
  const userAgent = request.headers.get("user-agent") ?? "unknown"

  let email: string
  try {
    const body = await request.json()
    email = (body.email ?? "").toLowerCase().trim()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
  }

  const result = await createPasswordResetToken(email, ip, userAgent)

  if ("error" in result) {
    if (result.error === "rate_limited") {
      // Leak rate-limit status — legitimate UX, not enumeration
      return NextResponse.json(
        { error: "Too many reset requests. Please try again in an hour." },
        { status: 429 },
      )
    }
    // user_not_found — still return success to prevent enumeration
    await writeAuthAuditLog("password_reset_requested", email, ip, userAgent, {
      found: false,
    })
    return NextResponse.json({ ok: true })
  }

  // Fetch user name for the email template
  const db   = (await clientPromise).db()
  const user = await db.collection("rbac_users").findOne({ email })
  const name = user?.name ?? "Admin"

  const baseUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "https://100xcircle.in"
  const resetUrl = `${baseUrl}/admin/reset-password?token=${result.token}`

  await renderAndSend(
    "forgot_password",
    {
      NAME:      name,
      EMAIL:     email,
      RESET_URL: resetUrl,
    },
    email,
  )

  await writeAuthAuditLog(
    "password_reset_requested",
    email,
    ip,
    userAgent,
    { userId: user ? String(user._id) : null },
    user ? String(user._id) : null,
  )

  return NextResponse.json({ ok: true })
}
