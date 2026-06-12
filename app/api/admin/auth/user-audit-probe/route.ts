/**
 * READ-ONLY user audit probe.
 * Fetches full record for audit_p14@100xcircle.test + cross-checks related collections.
 * Zero writes. DELETE after one use.
 */
import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const PROBE_KEY   = "useraudit:p14:20260612"
const TARGET      = "audit_p14@100xcircle.test"

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }) }
  if (body.key !== PROBE_KEY) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = (await clientPromise).db()

  // ── 1. User record ─────────────────────────────────────────────────────────
  const user = await db.collection("rbac_users").findOne({ email: TARGET })

  if (!user) {
    // Also check case-insensitive
    const userCI = await db.collection("rbac_users").findOne({
      email: { $regex: new RegExp(`^${TARGET.replace(/\./g, "\\.")}$`, "i") }
    })
    return NextResponse.json({
      found:          false,
      caseInsensitive: userCI ? { email: userCI.email, role: userCI.role } : null,
      target:         TARGET,
    })
  }

  // ── 2. Active sessions ─────────────────────────────────────────────────────
  const sessions = await db.collection("active_sessions")
    .find({ userId: String(user._id) })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray()

  // ── 3. Auth audit log entries ──────────────────────────────────────────────
  const authLogs = await db.collection("auth_audit_log")
    .find({ $or: [{ email: TARGET }, { userId: String(user._id) }] })
    .sort({ timestamp: -1 })
    .limit(20)
    .toArray()

  // ── 4. General audit_logs ──────────────────────────────────────────────────
  const auditLogs = await db.collection("audit_logs")
    .find({ $or: [{ userEmail: TARGET }, { userId: String(user._id) }] })
    .sort({ timestamp: -1 })
    .limit(20)
    .toArray()

  // ── 5. Permission overrides ────────────────────────────────────────────────
  const permOverrides = await db.collection("rbac_user_permissions")
    .findOne({ userId: String(user._id) })

  // ── 6. All rbac_users — see who else was created at same time ─────────────
  const allUsers = await db.collection("rbac_users")
    .find({}, { projection: { email: 1, role: 1, createdAt: 1, createdBy: 1, lastLoginAt: 1 } })
    .sort({ createdAt: 1 })
    .toArray()

  return NextResponse.json({
    // ── User record ──────────────────────────────────────────────────────────
    userRecord: {
      _id:               String(user._id),
      email:             user.email,
      name:              user.name,
      role:              user.role,
      isActive:          user.isActive,
      createdAt:         user.createdAt,
      createdBy:         user.createdBy ?? null,
      updatedAt:         user.updatedAt,
      lastLoginAt:       user.lastLoginAt ?? null,
      passwordChangedAt: user.passwordChangedAt ?? null,
      failedLoginCount:  user.failedLoginCount ?? 0,
      lockUntil:         user.lockUntil ?? null,
      loginHistoryCount: (user.loginHistory ?? []).length,
      loginHistory:      (user.loginHistory ?? []).slice(-5),
      hasPasswordHash:   !!(user.passwordHash),
      passwordHashPrefix: (user.passwordHash ?? "").slice(0, 14) + "…",
    },

    // ── Sessions ─────────────────────────────────────────────────────────────
    sessions: {
      total: sessions.length,
      records: sessions.map(s => ({
        sessionId:   s.sessionId?.slice(0, 8) + "…",
        createdAt:   s.createdAt,
        isRevoked:   s.isRevoked,
        ip:          s.ip,
        browser:     s.browser,
      })),
    },

    // ── Auth audit log ────────────────────────────────────────────────────────
    authAuditLog: authLogs.map(l => ({
      action:    l.action,
      timestamp: l.timestamp,
      ip:        l.ip,
      details:   l.details,
    })),

    // ── General audit log ─────────────────────────────────────────────────────
    auditLog: auditLogs.map(l => ({
      action:    l.action,
      resource:  l.resource,
      timestamp: l.timestamp,
      userId:    l.userId,
    })),

    // ── Permission overrides ──────────────────────────────────────────────────
    permissionOverrides: permOverrides ? {
      grantedCount: (permOverrides.grantedPermissions ?? []).length,
      deniedCount:  (permOverrides.deniedPermissions  ?? []).length,
      updatedBy:    permOverrides.updatedBy,
      notes:        permOverrides.notes ?? null,
    } : null,

    // ── All users (creation timeline) ────────────────────────────────────────
    allUsersTimeline: allUsers.map(u => ({
      email:      u.email,
      role:       u.role,
      createdAt:  u.createdAt,
      createdBy:  u.createdBy ?? null,
      lastLogin:  u.lastLoginAt ?? null,
    })),
  })
}
