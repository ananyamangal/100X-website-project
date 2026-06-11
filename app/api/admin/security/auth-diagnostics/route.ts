import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requirePermission } from "@/lib/rbac/server"
import { isEmailConfigured } from "@/lib/email"
import { resolveEffectivePermissions } from "@/lib/rbac/engine"

// GET /api/admin/security/auth-diagnostics?email=...
// Runs a full login-flow inspection for a given email WITHOUT actually logging them in.
// Requires users.view permission.
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "users.view")
  if (!("user" in auth)) return auth

  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase()
  if (!email) {
    return NextResponse.json({ error: "email query param required" }, { status: 400 })
  }

  const db = (await clientPromise).db()
  const checks: Record<string, unknown> = {}

  // ── 1. User Exists ─────────────────────────────────────────────────────────
  const user = await db.collection("rbac_users").findOne({ email })
  checks.userExists = Boolean(user)

  if (!user) {
    return NextResponse.json({
      email,
      checks,
      summary: "FAIL",
      failReason: "User not found in rbac_users",
    })
  }

  checks.userId    = String(user._id)
  checks.userName  = user.name
  checks.isActive  = user.isActive ?? false

  // ── 2. Password Hash ───────────────────────────────────────────────────────
  const hash = user.passwordHash as string | undefined
  checks.passwordHashExists  = Boolean(hash)
  checks.passwordHashFormat  = hash?.startsWith("pbkdf2:") ? "pbkdf2 (correct)" : hash ? "unknown / legacy" : "missing"

  // ── 3. Role ────────────────────────────────────────────────────────────────
  checks.role        = user.role ?? null
  checks.roleAssigned = Boolean(user.role)

  // ── 4. Effective permissions ───────────────────────────────────────────────
  let permCount  = 0
  let permError: string | null = null
  try {
    const resolution = await resolveEffectivePermissions(String(user._id), user.role)
    permCount = resolution.effective.length
    checks.permissionsCount   = permCount
    checks.permissionsGranted = resolution.granted.length
    checks.permissionsDenied  = resolution.denied.length
    checks.permissionsBase    = resolution.base.length
    checks.permissionsEffective = resolution.effective.slice(0, 20) // first 20 for display
  } catch (e) {
    permError = e instanceof Error ? e.message : String(e)
    checks.permissionsError = permError
    checks.permissionsCount = 0
  }
  checks.permissionsAssigned = permCount > 0

  // ── 5. Active sessions ─────────────────────────────────────────────────────
  const sessions = await db.collection("active_sessions")
    .find({ userId: String(user._id) })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray()

  const now = new Date()
  const activeSessions = sessions.filter(s => !s.isRevoked && new Date(s.expiresAt) > now)
  checks.totalSessions   = sessions.length
  checks.activeSessions  = activeSessions.length
  checks.revokedSessions = sessions.filter(s => s.isRevoked).length
  checks.expiredSessions = sessions.filter(s => !s.isRevoked && new Date(s.expiresAt) <= now).length

  checks.lastLoginAt        = user.lastLoginAt ?? null
  checks.failedLoginCount   = user.failedLoginCount ?? 0
  checks.lockedAt           = user.lockedAt ?? null
  checks.passwordChangedAt  = user.passwordChangedAt ?? null

  const recentLogins = (user.loginHistory ?? []).slice(-5).reverse()
  checks.recentLogins = recentLogins

  // ── 6. Email delivery ─────────────────────────────────────────────────────
  checks.emailConfigured = isEmailConfigured()

  // ── 7. Pending reset tokens ───────────────────────────────────────────────
  const pendingTokens = await db.collection("password_reset_tokens").countDocuments({
    email,
    usedAt: null,
    expiresAt: { $gt: now },
  })
  checks.pendingResetTokens = pendingTokens

  // ── 8. Permission overrides ───────────────────────────────────────────────
  const overrides = await db.collection("rbac_user_permissions").findOne({ userId: String(user._id) })
  checks.hasCustomPermissions = Boolean(overrides)
  if (overrides) {
    checks.grantedOverrides = (overrides.grantedPermissions ?? []).length
    checks.deniedOverrides  = (overrides.deniedPermissions ?? []).length
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const issues: string[] = []
  if (!user.isActive)                     issues.push("Account is inactive/disabled")
  if (!hash)                              issues.push("No password hash — user cannot log in")
  if (hash && !hash.startsWith("pbkdf2:")) issues.push("Password hash uses unknown format")
  if (!user.role)                         issues.push("No role assigned")
  if (permCount === 0 && !permError)      issues.push("0 effective permissions — role may be invalid")
  if (user.lockedAt)                      issues.push("Account is locked")
  if (user.failedLoginCount > 5)          issues.push(`${user.failedLoginCount} consecutive failed logins`)
  if (!isEmailConfigured())               issues.push("Email not configured — forgot-password email will fail")

  const summary = issues.length === 0 ? "PASS" : "ISSUES_FOUND"

  return NextResponse.json({
    email,
    checks,
    issues,
    summary,
  })
}
