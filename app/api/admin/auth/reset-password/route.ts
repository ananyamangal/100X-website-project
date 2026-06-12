import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { consumePasswordResetToken } from "@/lib/rbac/passwordReset"
import { hashPassword } from "@/lib/rbac/password"
import { validatePassword } from "@/lib/passwordPolicy"
import { revokeAllUserSessions } from "@/lib/rbac/sessions"
import { renderAndSend } from "@/lib/emailTemplates"
import { writeAuthAuditLog } from "@/lib/authAuditLog"

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  )
}

// POST /api/admin/auth/reset-password
// Public — no authentication required.
export async function POST(request: NextRequest) {
  const ip        = getClientIp(request)
  const userAgent = request.headers.get("user-agent") ?? "unknown"

  let token: string, password: string, confirmPassword: string
  try {
    const body = await request.json()
    token           = (body.token ?? "").trim()
    password        = body.password ?? ""
    confirmPassword = body.confirmPassword ?? ""
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!token) {
    return NextResponse.json({ error: "Reset token is required" }, { status: 400 })
  }

  // Validate password policy before consuming the token (avoid wasting the one-time use)
  const policyError = validatePassword(password)
  if (policyError) {
    return NextResponse.json({ error: policyError }, { status: 422 })
  }
  if (password !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match" }, { status: 422 })
  }

  // Consume (and mark used) the reset token
  const consumed = await consumePasswordResetToken(token)

  if ("error" in consumed) {
    const messages: Record<string, string> = {
      expired: "This reset link has expired. Please request a new one.",
      used:    "This reset link has already been used.",
      invalid: "Invalid or unrecognised reset link.",
    }
    await writeAuthAuditLog(
      consumed.error === "expired" ? "reset_token_expired" : "reset_token_used",
      "unknown",
      ip,
      userAgent,
      { reason: consumed.error },
    )
    return NextResponse.json(
      { error: messages[consumed.error] ?? "Invalid reset link." },
      { status: 400 },
    )
  }

  const { email, userId } = consumed

  // Update password + clear lock + reset failed count
  const db = (await clientPromise).db()
  let userQuery: object
  try {
    userQuery = { _id: new ObjectId(userId) }
  } catch {
    return NextResponse.json({ error: "Invalid user reference" }, { status: 500 })
  }

  const now = new Date()
  await db.collection("rbac_users").updateOne(userQuery, {
    $set: {
      passwordHash:      hashPassword(password),
      passwordChangedAt: now,
      failedLoginCount:  0,
      lockUntil:         null,
      lockedAt:          null,
      lockedBy:          null,
      updatedAt:         now,
    },
  })

  // Revoke all active sessions — user must log in again
  await revokeAllUserSessions(userId, "system", "force_logout").catch(() => {})

  // Fetch user name for the confirmation email
  const user = await db.collection("rbac_users").findOne(userQuery)
  if (user) {
    await renderAndSend(
      "password_changed",
      {
        NAME:       user.name ?? "Admin",
        EMAIL:      email,
        CHANGED_AT: now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      },
      email,
    )
  }

  await writeAuthAuditLog("password_changed", email, ip, userAgent, {}, userId)

  return NextResponse.json({ ok: true })
}
