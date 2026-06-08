// GET /api/admin/growth/audit/permissions
// Returns all users with their effective permissions, overrides, and last permission change.
// Requires: users.view + audit.view

import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requirePermission } from "@/lib/rbac/server"
import { resolveEffectivePermissions } from "@/lib/rbac/engine"
import type { DBUser } from "@/lib/rbac/types"

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "users.view")
  if (!("user" in auth)) return auth

  const client = await clientPromise
  const db     = client.db()

  const users = await db
    .collection<DBUser>("rbac_users")
    .find({ isActive: { $ne: false } })
    .sort({ createdAt: 1 })
    .toArray()

  // Get last permission change per user from audit log
  const auditMap = new Map<string, { ts: Date; actor: string; op: string }>()
  const auditRows = await db
    .collection("audit_logs")
    .find({ action: "permission_change" })
    .sort({ timestamp: -1 })
    .limit(500)
    .toArray()

  for (const row of auditRows) {
    const key = row.details?.id ?? row.details?.roleSlug ?? ""
    if (key && !auditMap.has(key)) {
      auditMap.set(key, {
        ts:    row.timestamp,
        actor: row.actorName ?? row.actorEmail ?? "system",
        op:    row.details?.op ? JSON.stringify(row.details.op).slice(0, 80) : "override set",
      })
    }
  }

  const results = await Promise.all(
    users.map(async u => {
      const id = (u._id as unknown as ObjectId).toString()
      let resolution = null
      try {
        resolution = await resolveEffectivePermissions(id, u.role)
      } catch { }

      const lastChange = auditMap.get(id)

      return {
        id,
        name:              u.name,
        email:             u.email,
        role:              u.role,
        isActive:          u.isActive,
        lastLoginAt:       u.lastLoginAt,
        base:              resolution?.base     ?? [],
        granted:           resolution?.granted  ?? [],
        denied:            resolution?.denied   ?? [],
        effective:         resolution?.effective ?? [],
        overrideCount:     (resolution?.granted.length ?? 0) + (resolution?.denied.length ?? 0),
        lastPermChange:    lastChange ?? null,
      }
    })
  )

  // Summary stats
  const stats = {
    totalUsers:          results.length,
    usersWithOverrides:  results.filter(u => u.overrideCount > 0).length,
    usersWithDenials:    results.filter(u => u.denied.length > 0).length,
    usersWithGrants:     results.filter(u => u.granted.length > 0).length,
    roleBreakdown:       results.reduce((acc, u) => { acc[u.role] = (acc[u.role] ?? 0) + 1; return acc }, {} as Record<string, number>),
  }

  return NextResponse.json({ users: results, stats })
}
