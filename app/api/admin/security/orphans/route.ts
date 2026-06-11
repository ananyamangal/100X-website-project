import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requirePermission, writeAuditLog } from "@/lib/rbac/server"

// GET  /api/admin/security/orphans  — scan for orphaned/inconsistent data
// POST /api/admin/security/orphans  — run cleanup (purge confirmed orphans)

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "users.view")
  if (!("user" in auth)) return auth

  const db  = (await clientPromise).db()
  const now = new Date()

  // ── Fetch all users (active + inactive) ─────────────────────────────────────
  const allUsers = await db.collection("rbac_users").find({}).toArray()
  const activeUserIds   = new Set(allUsers.filter(u => u.isActive).map(u => String(u._id)))
  const allUserIds      = new Set(allUsers.map(u => String(u._id)))
  const allUserEmails   = allUsers.map(u => u.email as string)

  // ── 1. Duplicate emails ────────────────────────────────────────────────────
  const emailCounts = new Map<string, number>()
  for (const e of allUserEmails) emailCounts.set(e, (emailCounts.get(e) ?? 0) + 1)
  const duplicateEmails = [...emailCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([email, count]) => ({ email, count }))

  // ── 2. Sessions for non-existent users ───────────────────────────────────
  const activeSessions = await db.collection("active_sessions")
    .find({ isRevoked: false, expiresAt: { $gt: now } })
    .toArray()

  const sessionsForMissingUsers = activeSessions.filter(s => !allUserIds.has(s.userId))
  const sessionsForInactiveUsers = activeSessions.filter(s => allUserIds.has(s.userId) && !activeUserIds.has(s.userId))

  // ── 3. Permission overrides for non-existent users ────────────────────────
  const allPermOverrides = await db.collection("rbac_user_permissions").find({}).toArray()
  const orphanedPermissions = allPermOverrides.filter(p => !allUserIds.has(p.userId))

  // ── 4. Permission overrides for inactive users ───────────────────────────
  const permsForInactiveUsers = allPermOverrides.filter(p => allUserIds.has(p.userId) && !activeUserIds.has(p.userId))

  // ── 5. Expired (but not TTL-deleted) reset tokens ─────────────────────────
  const expiredTokens = await db.collection("password_reset_tokens").countDocuments({
    expiresAt: { $lt: now },
    usedAt: null,
  })

  // ── 6. Inactive users with no sessions (clean) ────────────────────────────
  const inactiveUsers = allUsers.filter(u => !u.isActive)

  // ── 7. Users who never logged in ──────────────────────────────────────────
  const neverLoggedIn = allUsers
    .filter(u => u.isActive && !u.lastLoginAt)
    .map(u => ({ id: String(u._id), email: u.email, name: u.name, createdAt: u.createdAt }))

  // ── Summary ────────────────────────────────────────────────────────────────
  const totalIssues =
    duplicateEmails.length +
    sessionsForMissingUsers.length +
    sessionsForInactiveUsers.length +
    orphanedPermissions.length

  return NextResponse.json({
    scannedAt: now.toISOString(),
    summary: {
      totalUsers:         allUsers.length,
      activeUsers:        activeUserIds.size,
      inactiveUsers:      inactiveUsers.length,
      totalIssues,
    },
    orphans: {
      duplicateEmails,
      sessionsForMissingUsers: sessionsForMissingUsers.map(s => ({
        sessionId: s.sessionId,
        userId:    s.userId,
        userEmail: s.userEmail,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
      })),
      sessionsForInactiveUsers: sessionsForInactiveUsers.map(s => ({
        sessionId: s.sessionId,
        userId:    s.userId,
        userEmail: s.userEmail,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
      })),
      orphanedPermissions: orphanedPermissions.map(p => ({
        userId: p.userId,
        grantedCount: (p.grantedPermissions ?? []).length,
        deniedCount:  (p.deniedPermissions ?? []).length,
      })),
      permsForInactiveUsers: permsForInactiveUsers.map(p => ({
        userId: p.userId,
        grantedCount: (p.grantedPermissions ?? []).length,
        deniedCount:  (p.deniedPermissions ?? []).length,
      })),
      expiredTokensCount: expiredTokens,
    },
    info: {
      neverLoggedIn,
      inactiveUsersCount: inactiveUsers.length,
    },
  })
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "users.delete")
  if (!("user" in auth)) return auth
  const { user: actor } = auth

  // Only super admins can run cleanup
  if (actor.role !== "super_admin") {
    return NextResponse.json({ error: "Only Super Admins can run orphan cleanup" }, { status: 403 })
  }

  let body: { confirm?: string } = {}
  try { body = await request.json() } catch { /* empty body OK */ }

  if (body.confirm !== "CLEANUP_ORPHANS") {
    return NextResponse.json(
      { error: 'Send { "confirm": "CLEANUP_ORPHANS" } to proceed' },
      { status: 400 }
    )
  }

  const db  = (await clientPromise).db()
  const now = new Date()

  const allUsers    = await db.collection("rbac_users").find({}, { projection: { _id: 1, isActive: 1 } }).toArray()
  const allUserIds  = new Set(allUsers.map(u => String(u._id)))
  const activeUserIds = new Set(allUsers.filter(u => u.isActive).map(u => String(u._id)))

  const cleaned: Record<string, number> = {}

  // Revoke sessions for non-existent users
  const r1 = await db.collection("active_sessions").updateMany(
    { userId: { $nin: [...allUserIds] }, isRevoked: false },
    { $set: { isRevoked: true, revokedAt: now, revokedReason: "orphan_cleanup" } }
  )
  cleaned.sessionsForMissingUsers = r1.modifiedCount

  // Revoke sessions for inactive users
  const r2 = await db.collection("active_sessions").updateMany(
    { userId: { $in: [...allUserIds].filter(id => !activeUserIds.has(id)) }, isRevoked: false },
    { $set: { isRevoked: true, revokedAt: now, revokedReason: "orphan_cleanup_inactive" } }
  )
  cleaned.sessionsForInactiveUsers = r2.modifiedCount

  // Delete orphaned permission records for non-existent users
  const r3 = await db.collection("rbac_user_permissions").deleteMany(
    { userId: { $nin: [...allUserIds] } }
  )
  cleaned.orphanedPermissions = r3.deletedCount

  // Expire abandoned reset tokens (no usedAt, already expired)
  const r4 = await db.collection("password_reset_tokens").updateMany(
    { expiresAt: { $lt: now }, usedAt: null },
    { $set: { usedAt: now } }
  )
  cleaned.expiredTokensMarked = r4.modifiedCount

  await writeAuditLog(actor, "delete", "security", { action: "orphan_cleanup", cleaned }, request)

  return NextResponse.json({ ok: true, cleaned })
}
