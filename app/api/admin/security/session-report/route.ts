import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requirePermission } from "@/lib/rbac/server"

// GET /api/admin/security/session-report
// Returns per-user session summary for the session audit report.
// Requires users.view permission.
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "users.view")
  if (!("user" in auth)) return auth

  const db  = (await clientPromise).db()
  const now = new Date()

  // All users
  const users = await db.collection("rbac_users")
    .find({})
    .sort({ createdAt: -1 })
    .toArray()

  // All sessions grouped by userId
  const allSessions = await db.collection("active_sessions")
    .find({})
    .sort({ createdAt: -1 })
    .limit(2000)
    .toArray()

  const sessionsByUser = new Map<string, typeof allSessions>()
  for (const s of allSessions) {
    const arr = sessionsByUser.get(s.userId) ?? []
    arr.push(s)
    sessionsByUser.set(s.userId, arr)
  }

  const report = users.map(u => {
    const userId   = String(u._id)
    const sessions = sessionsByUser.get(userId) ?? []
    const active   = sessions.filter(s => !s.isRevoked && new Date(s.expiresAt) > now)
    const revoked  = sessions.filter(s => s.isRevoked)
    const expired  = sessions.filter(s => !s.isRevoked && new Date(s.expiresAt) <= now)
    const lastSession = sessions[0] // already sorted desc
    return {
      userId,
      email:          u.email,
      name:           u.name,
      role:           u.role,
      isActive:       u.isActive ?? false,
      lastLoginAt:    u.lastLoginAt ?? null,
      activeSessions: active.length,
      revokedSessions: revoked.length,
      expiredSessions: expired.length,
      totalSessions:  sessions.length,
      lastSessionAt:  lastSession?.createdAt ?? null,
      lastActivity:   active[0]?.lastActivity ?? null,
      devices: active.slice(0, 3).map(s => ({
        sessionId:  s.sessionId,
        browser:    s.browser,
        os:         s.os,
        deviceType: s.deviceType,
        ip:         s.ip,
        createdAt:  s.createdAt,
        lastActivity: s.lastActivity,
        expiresAt:  s.expiresAt,
      })),
    }
  })

  const totals = {
    users:          users.length,
    activeUsers:    users.filter(u => u.isActive).length,
    totalSessions:  allSessions.length,
    activeSessions: allSessions.filter(s => !s.isRevoked && new Date(s.expiresAt) > now).length,
    revokedSessions: allSessions.filter(s => s.isRevoked).length,
  }

  return NextResponse.json({ report, totals, generatedAt: now.toISOString() })
}
