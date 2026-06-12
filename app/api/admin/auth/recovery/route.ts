// POST /api/admin/auth/recovery
// Emergency super admin recovery endpoint.
// Authenticates via ADMIN_PASSWORD env var (the legacy single-admin password).
// Audits rbac_users, unlocks any locked super_admin accounts,
// generates a 60-minute password reset token, returns the full reset URL.
// NOT whitelisted in middleware — callers must supply the recovery_password.

import { type NextRequest, NextResponse } from "next/server"
import { createHash, randomBytes } from "crypto"
import clientPromise from "@/lib/mongodb"
import { hashPassword } from "@/lib/rbac/password"

function sha256hex(s: string): string {
  return createHash("sha256").update(s).digest("hex")
}

const TARGET_EMAILS = ["sulabhmangal@gmail.com", "100xcirclefogging2025@gmail.com"]
const APP_URL       = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.100xcircle.com").trim()

export async function POST(request: NextRequest) {
  // ── Auth: require ADMIN_PASSWORD ──────────────────────────────────────────
  const adminPassword = (process.env.ADMIN_PASSWORD ?? "").trim()
  if (!adminPassword) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD env var is not set on this server." },
      { status: 503 }
    )
  }

  let body: Record<string, unknown>
  try { body = await request.json() }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) }

  const recoveryPassword = ((body.recovery_password as string | undefined) ?? "").trim()
  if (!recoveryPassword || recoveryPassword !== adminPassword) {
    return NextResponse.json({ error: "Invalid recovery_password" }, { status: 403 })
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

  // ── 2. Find target accounts ───────────────────────────────────────────────
  const targetFound = TARGET_EMAILS.map(email => {
    const u = users.find(x => (x.email ?? "").toLowerCase() === email.toLowerCase())
    return { email, found: !!u, role: u?.role ?? null }
  })

  const superAdmins = users.filter(u => u.role === "super_admin")

  // ── 3. Unlock locked super_admin accounts ─────────────────────────────────
  const unlockLog: string[] = []
  for (const u of superAdmins) {
    const locked = (u.failedLoginCount >= 5) || (u.lockUntil && new Date(u.lockUntil) > now)
    if (locked || !u.isActive) {
      await db.collection("rbac_users").updateOne(
        { _id: u._id },
        { $set: { failedLoginCount: 0, lockUntil: null, lockedAt: null, isActive: true } }
      )
      unlockLog.push(`Unlocked and activated: ${u.email}`)
    }
  }

  // ── 4. Determine recovery target email ────────────────────────────────────
  let recoveryEmail: string | null = null
  let createdUser = false

  const usableSuperAdmin = users.find(u =>
    u.role === "super_admin" &&
    (u.passwordHash as string)?.startsWith("pbkdf2:")
  )

  if (usableSuperAdmin) {
    recoveryEmail = usableSuperAdmin.email
  } else {
    // No usable super_admin — find or create one from target emails
    let targetUser = null
    for (const email of TARGET_EMAILS) {
      targetUser = users.find(u => (u.email ?? "").toLowerCase() === email.toLowerCase())
      if (targetUser) break
    }

    if (targetUser && targetUser.role !== "super_admin") {
      // Promote existing user
      await db.collection("rbac_users").updateOne(
        { _id: targetUser._id },
        { $set: {
            role:             "super_admin",
            isActive:         true,
            failedLoginCount: 0,
            lockUntil:        null,
            lockedAt:         null,
          }
        }
      )
      unlockLog.push(`Promoted to super_admin + activated: ${targetUser.email}`)
      recoveryEmail = targetUser.email
    } else if (!targetUser) {
      // Create emergency super_admin
      const tempPw  = `Temp@${randomBytes(6).toString("hex").toUpperCase()}`
      recoveryEmail = TARGET_EMAILS[0]
      await db.collection("rbac_users").insertOne({
        email:             recoveryEmail,
        name:              "Super Admin",
        passwordHash:      hashPassword(tempPw),
        role:              "super_admin",
        customPermissions: [],
        deniedPermissions: [],
        isActive:          true,
        createdAt:         now,
        updatedAt:         now,
        lastLoginAt:       null,
        createdBy:         null,
        loginHistory:      [],
        passwordChangedAt: null,
        failedLoginCount:  0,
        lockedAt:          null,
        lockUntil:         null,
        lockedBy:          null,
      })
      unlockLog.push(`Created emergency super_admin: ${recoveryEmail} (temp password: ${tempPw})`)
      createdUser = true
    } else {
      recoveryEmail = targetUser.email
    }
  }

  // ── 5. Generate password reset token ─────────────────────────────────────
  // Ensure indexes
  try {
    await db.collection("password_reset_tokens").createIndex(
      { expiresAt: 1 }, { expireAfterSeconds: 0, background: true }
    )
    await db.collection("password_reset_tokens").createIndex(
      { tokenHash: 1 }, { unique: true, background: true }
    )
  } catch { /* idempotent */ }

  // Invalidate existing unexpired tokens for this email
  await db.collection("password_reset_tokens").deleteMany({
    email:     recoveryEmail!.toLowerCase(),
    usedAt:    null,
    expiresAt: { $gt: now },
  })

  const rawToken = randomBytes(32).toString("hex")
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000)  // 60 min

  await db.collection("password_reset_tokens").insertOne({
    email:     recoveryEmail!.toLowerCase(),
    tokenHash: sha256hex(rawToken),
    createdAt: now,
    expiresAt,
    usedAt:    null,
    ip:        request.headers.get("x-forwarded-for") ?? "recovery-api",
    userAgent: "recovery-api",
  })

  const resetUrl = `${APP_URL}/admin/reset-password?token=${rawToken}`

  // ── 6. Return full report ─────────────────────────────────────────────────
  return NextResponse.json({
    audit: {
      totalUsers:       users.length,
      superAdminCount:  superAdmins.length,
      targetEmails:     targetFound,
      users:            userTable,
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
    instructions: [
      "1. Open the resetUrl in your browser",
      "2. Set a new password: 10+ chars, uppercase, lowercase, number, special char",
      "3. Log in at /admin/login with the email and new password",
      "4. After successful login, delete this recovery endpoint from the codebase",
    ],
  })
}
