// GET /api/admin/security/auth-health
// Returns live auth health metrics for the dashboard.
// Requires settings.view permission.

import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { isEmailConfigured } from "@/lib/email"
import { requirePermission, isAuthResult } from "@/lib/rbac/server"

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "settings.view")
  if (!isAuthResult(auth)) return auth

  const db  = (await clientPromise).db()
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const week7Start = new Date(now.getTime() - 7 * 24 * 3600_000)

  const [
    totalUsers,
    activeUsers,
    lockedUsers,
    activeSessions,
    failedLoginsToday,
    passwordResetsToday,
    googleLoginsToday,
    emailSentLast7d,
    emailFailedLast7d,
    recentFailedLogins,
  ] = await Promise.all([
    db.collection("rbac_users").countDocuments({}),
    db.collection("rbac_users").countDocuments({ isActive: true }),
    db.collection("rbac_users").countDocuments({
      $or: [
        { lockUntil: { $gt: now } },
        { isActive: false },
      ],
    }),
    db.collection("active_sessions").countDocuments({
      isRevoked: false,
      expiresAt: { $gt: now },
    }),
    db.collection("auth_audit_log").countDocuments({
      action:    "login_failed",
      timestamp: { $gte: todayStart },
    }),
    db.collection("auth_audit_log").countDocuments({
      action:    "password_reset_requested",
      "details.emailSent": true,
      timestamp: { $gte: todayStart },
    }),
    db.collection("auth_audit_log").countDocuments({
      action:    "google_login",
      timestamp: { $gte: todayStart },
    }),
    db.collection("auth_audit_log").countDocuments({
      action:    "password_reset_requested",
      "details.emailSent": true,
      timestamp: { $gte: week7Start },
    }),
    db.collection("auth_audit_log").countDocuments({
      action:    "password_reset_requested",
      "details.emailSent": false,
      timestamp: { $gte: week7Start },
    }),
    db.collection("auth_audit_log")
      .find({ action: "login_failed" }, {
        sort:       { timestamp: -1 },
        limit:      5,
        projection: { email: 1, timestamp: 1, ip: 1 },
      })
      .toArray(),
  ])

  const emailTotal7d   = emailSentLast7d + emailFailedLast7d
  const emailSuccessRate = emailTotal7d > 0
    ? Math.round((emailSentLast7d / emailTotal7d) * 100)
    : null

  const emailConfigured = isEmailConfigured()

  // ── Traffic-light thresholds ──────────────────────────────────────────────
  function usersLight(): "green" | "yellow" | "red" {
    if (lockedUsers === 0) return "green"
    if (lockedUsers <= 2)  return "yellow"
    return "red"
  }

  function sessionsLight(): "green" | "yellow" | "red" {
    if (activeSessions <= 20) return "green"
    if (activeSessions <= 50) return "yellow"
    return "red"
  }

  function failedLoginsLight(): "green" | "yellow" | "red" {
    if (failedLoginsToday === 0)  return "green"
    if (failedLoginsToday <= 10)  return "yellow"
    return "red"
  }

  function emailLight(): "green" | "yellow" | "red" {
    if (!emailConfigured)                          return "yellow"
    if (emailSuccessRate === null)                 return "green"   // no emails sent yet
    if (emailSuccessRate >= 90)                    return "green"
    if (emailSuccessRate >= 50)                    return "yellow"
    return "red"
  }

  return NextResponse.json({
    users: {
      total:   totalUsers,
      active:  activeUsers,
      locked:  lockedUsers,
      light:   usersLight(),
    },
    sessions: {
      active: activeSessions,
      light:  sessionsLight(),
    },
    failedLoginsToday: {
      count: failedLoginsToday,
      light: failedLoginsLight(),
      recent: recentFailedLogins.map(r => ({
        email:     r.email as string,
        timestamp: r.timestamp as Date,
        ip:        r.ip as string,
      })),
    },
    passwordResetsToday,
    googleLoginsToday,
    email: {
      configured:    emailConfigured,
      successRate:   emailSuccessRate,
      sentLast7d:    emailSentLast7d,
      failedLast7d:  emailFailedLast7d,
      light:         emailLight(),
    },
    asOf: now.toISOString(),
  })
}
