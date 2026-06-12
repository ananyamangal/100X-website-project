// POST /api/admin/auth/recovery
// Emergency super admin recovery endpoint.
// ONE-TIME USE — remove this file after super admin access is restored.
// Secured by a hardcoded token valid for this deployment only.

import { type NextRequest, NextResponse } from "next/server"
import { createHash, randomBytes } from "crypto"
import clientPromise from "@/lib/mongodb"
import { hashPassword } from "@/lib/rbac/password"

const ONE_TIME_TOKEN = "f8fe96aee7c9386cba8deb898bfdbeef0237932c1ce7758b"

function sha256hex(s: string): string {
  return createHash("sha256").update(s).digest("hex")
}

const TARGET_EMAILS = ["sulabhmangal@gmail.com", "100xcirclefogging2025@gmail.com"]
const APP_URL       = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.100xcircle.com").trim()

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try { body = await request.json() }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) }

  const token = ((body.token as string | undefined) ?? "").trim()
  if (!token || token !== ONE_TIME_TOKEN) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 })
  }

  const db  = (await clientPromise).db()
  const now = new Date()

  // ── 1. Audit all users ────────────────────────────────────────────────────
  const users = await db.collection("rbac_users").find({}).toArray()

  const userTable = users.map(u => ({
    role:             u.role     ?? null,
    email:            u.email    ?? null,
    name:             u.name     ?? null,
    isActive:         u.isActive ?? false,
    failedLoginCount: u.failedLoginCount ?? 0,
    lockedUntil:      u.lockUntil ? new Date(u.lockUntil).toISOString() : null,
    isLocked:         !!(u.lockUntil && new Date(u.lockUntil) > now),
    hasPasswordHash:  !!(u.passwordHash && (u.passwordHash as string).startsWith("pbkdf2:")),
  }))

  const targetFound = TARGET_EMAILS.map(email => {
    const u = users.find(x => (x.email ?? "").toLowerCase() === email.toLowerCase())
    return { email, found: !!u, role: u?.role ?? null, isActive: u?.isActive ?? null }
  })

  const superAdmins = users.filter(u => u.role === "super_admin")

  // ── 2. Unlock any locked/inactive super_admin accounts ────────────────────
  const unlockLog: string[] = []
  for (const u of superAdmins) {
    const isLocked   = (u.failedLoginCount >= 5) || (u.lockUntil && new Date(u.lockUntil) > now)
    const isInactive = !u.isActive
    if (isLocked || isInactive) {
      await db.collection("rbac_users").updateOne(
        { _id: u._id },
        { $set: { failedLoginCount: 0, lockUntil: null, lockedAt: null, isActive: true } }
      )
      unlockLog.push(`Unlocked + activated: ${u.email}`)
    }
  }

  // ── 3. Determine recovery target / create if needed ───────────────────────
  let recoveryEmail: string | null = null
  let createdUser = false

  // Re-query after unlock updates
  const refreshedUsers = await db.collection("rbac_users").find({}).toArray()
  const usableSuperAdmin = refreshedUsers.find(u =>
    u.role === "super_admin" &&
    (u.passwordHash as string)?.startsWith("pbkdf2:") &&
    u.isActive === true
  )

  if (usableSuperAdmin) {
    recoveryEmail = usableSuperAdmin.email
  } else {
    let targetUser = null
    for (const email of TARGET_EMAILS) {
      targetUser = refreshedUsers.find(u => (u.email ?? "").toLowerCase() === email.toLowerCase())
      if (targetUser) break
    }

    if (targetUser && targetUser.role !== "super_admin") {
      await db.collection("rbac_users").updateOne(
        { _id: targetUser._id },
        { $set: { role: "super_admin", isActive: true, failedLoginCount: 0, lockUntil: null, lockedAt: null } }
      )
      unlockLog.push(`Promoted to super_admin + activated: ${targetUser.email}`)
      recoveryEmail = targetUser.email
    } else if (!targetUser) {
      const tempPw  = `Temp@${randomBytes(6).toString("hex").toUpperCase()}`
      recoveryEmail = TARGET_EMAILS[0]
      await db.collection("rbac_users").insertOne({
        email: recoveryEmail, name: "Super Admin",
        passwordHash: hashPassword(tempPw), role: "super_admin",
        customPermissions: [], deniedPermissions: [],
        isActive: true, createdAt: now, updatedAt: now,
        lastLoginAt: null, createdBy: null, loginHistory: [],
        passwordChangedAt: null, failedLoginCount: 0,
        lockedAt: null, lockUntil: null, lockedBy: null,
      })
      unlockLog.push(`Created emergency super_admin: ${recoveryEmail} (temp password: ${tempPw})`)
      createdUser = true
    } else {
      recoveryEmail = targetUser.email
    }
  }

  // ── 4. Generate password reset token (60 min) ─────────────────────────────
  try {
    await db.collection("password_reset_tokens").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, background: true })
    await db.collection("password_reset_tokens").createIndex({ tokenHash: 1 }, { unique: true, background: true })
  } catch { /* idempotent */ }

  await db.collection("password_reset_tokens").deleteMany({
    email: recoveryEmail!.toLowerCase(), usedAt: null, expiresAt: { $gt: now },
  })

  const rawToken  = randomBytes(32).toString("hex")
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000)

  await db.collection("password_reset_tokens").insertOne({
    email: recoveryEmail!.toLowerCase(), tokenHash: sha256hex(rawToken),
    createdAt: now, expiresAt, usedAt: null,
    ip: request.headers.get("x-forwarded-for") ?? "recovery-api",
    userAgent: "recovery-api",
  })

  const resetUrl = `${APP_URL}/admin/reset-password?token=${rawToken}`

  return NextResponse.json({
    audit: {
      totalUsers:      users.length,
      superAdminCount: superAdmins.length,
      targetEmails:    targetFound,
      allUsers:        userTable,
    },
    recovery: {
      actionsPerformed: unlockLog,
      createdNewUser:   createdUser,
      recoveryEmail,
    },
    resetToken: {
      email:     recoveryEmail,
      expiresAt: expiresAt.toISOString(),
      resetUrl,
    },
    next: [
      "1. Open resetToken.resetUrl in your browser",
      "2. Set a strong password (10+ chars, upper, lower, number, special)",
      "3. Log in at /admin/login with the email + new password",
      "4. Push a commit removing app/api/admin/auth/recovery/route.ts",
    ],
  })
}
