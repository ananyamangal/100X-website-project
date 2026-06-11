import { type NextRequest, NextResponse } from "next/server"
import { createPasswordResetToken } from "@/lib/rbac/passwordReset"
import { renderAndSend } from "@/lib/emailTemplates"
import { isEmailConfigured } from "@/lib/email"
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

  // Check if email is configured before attempting send
  if (!isEmailConfigured()) {
    await writeAuthAuditLog(
      "password_reset_requested",
      email,
      ip,
      userAgent,
      { userId: user ? String(user._id) : null, emailSent: false, reason: "email_not_configured" },
      user ? String(user._id) : null,
    )
    // Email not configured — tell the user instead of showing fake success
    return NextResponse.json(
      {
        error: "Email delivery is not configured on this server. Ask your Super Admin to generate a reset link manually from the User Management panel.",
        code: "email_not_configured",
      },
      { status: 503 },
    )
  }

  const emailResult = await renderAndSend(
    "forgot_password",
    {
      NAME:      name,
      EMAIL:     email,
      RESET_URL: resetUrl,
    },
    email,
  )

  if (!emailResult.ok) {
    console.error(`Password reset email failed for ${email}:`, emailResult.error)
    await writeAuthAuditLog(
      "password_reset_requested",
      email,
      ip,
      userAgent,
      { userId: user ? String(user._id) : null, emailSent: false, reason: emailResult.error },
      user ? String(user._id) : null,
    )
    return NextResponse.json(
      { error: "Failed to send reset email. Please contact your Super Admin.", code: "email_send_failed" },
      { status: 503 },
    )
  }

  await writeAuthAuditLog(
    "password_reset_requested",
    email,
    ip,
    userAgent,
    { userId: user ? String(user._id) : null, emailSent: true },
    user ? String(user._id) : null,
  )

  return NextResponse.json({ ok: true })
}
