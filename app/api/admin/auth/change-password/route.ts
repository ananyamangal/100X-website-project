import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { getCurrentUser } from "@/lib/rbac/server"
import { verifyPassword, hashPassword } from "@/lib/rbac/password"
import { validatePassword } from "@/lib/passwordPolicy"
import { writeAuthAuditLog } from "@/lib/authAuditLog"

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  )
}

// POST /api/admin/auth/change-password
// Requires an active session (JWT cookie). Verifies current password,
// sets new password, revokes all other sessions, keeps current session alive.
export async function POST(request: NextRequest) {
  const ip        = getIp(request)
  const userAgent = request.headers.get("user-agent") ?? "unknown"

  const payload = await getCurrentUser(request)
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let currentPassword: string, newPassword: string, confirmPassword: string
  try {
    const body  = await request.json()
    currentPassword = (body.currentPassword ?? "")
    newPassword     = (body.newPassword     ?? "")
    confirmPassword = (body.confirmPassword ?? "")
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!currentPassword) {
    return NextResponse.json({ error: "Current password is required" }, { status: 400 })
  }

  // Validate new password against policy before any DB work
  const policyError = validatePassword(newPassword)
  if (policyError) return NextResponse.json({ error: policyError }, { status: 422 })
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match" }, { status: 422 })
  }

  const db = (await clientPromise).db()

  let userDoc: Record<string, unknown> | null
  try {
    userDoc = await db.collection("rbac_users").findOne({ _id: new ObjectId(payload.sub) })
  } catch {
    return NextResponse.json({ error: "Invalid user reference" }, { status: 400 })
  }

  if (!userDoc || !userDoc.isActive) {
    return NextResponse.json({ error: "User not found or inactive" }, { status: 404 })
  }

  // Verify current password using the same PBKDF2 function as login
  const valid = verifyPassword(currentPassword, (userDoc.passwordHash as string) ?? "")
  if (!valid) {
    await writeAuthAuditLog("login_failed", payload.email, ip, userAgent, {
      reason: "wrong_current_password_on_change",
    }, payload.sub)
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 })
  }

  // Prevent reusing the same password
  if (verifyPassword(newPassword, (userDoc.passwordHash as string) ?? "")) {
    return NextResponse.json(
      { error: "New password must be different from your current password" },
      { status: 422 }
    )
  }

  const now = new Date()

  // Set new password + clear lockout state
  await db.collection("rbac_users").updateOne(
    { _id: new ObjectId(payload.sub) },
    {
      $set: {
        passwordHash:      hashPassword(newPassword),
        passwordChangedAt: now,
        failedLoginCount:  0,
        lockUntil:         null,
        lockedAt:          null,
        lockedBy:          null,
        updatedAt:         now,
      },
    }
  )

  // Revoke every OTHER active session — keep the caller's session alive
  const currentSessionId = payload.sessionId
  await db.collection("active_sessions").updateMany(
    {
      userId:    payload.sub,
      ...(currentSessionId ? { sessionId: { $ne: currentSessionId } } : {}),
      isRevoked: false,
    },
    {
      $set: {
        isRevoked:     true,
        revokedAt:     now,
        revokedBy:     payload.sub,
        revokedReason: "force_logout",
      },
    }
  )

  await writeAuthAuditLog("password_changed", payload.email, ip, userAgent, {
    method:             "change_password",
    currentSessionKept: !!currentSessionId,
  }, payload.sub)

  return NextResponse.json({ ok: true })
}
