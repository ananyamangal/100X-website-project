// GET /api/admin/simulate/[userId]
// Returns the full permission context as the target user would experience it.
// Requires: super_admin role (most privileged operation — you see everything they see).

import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requirePermission } from "@/lib/rbac/server"
import { resolveEffectivePermissions } from "@/lib/rbac/engine"
import { MODULE_PERMISSIONS } from "@/lib/rbac/permissions"
import type { DBUser } from "@/lib/rbac/types"

type Params = { params: Promise<{ userId: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  // Only super_admin can simulate another user's view
  const auth = await requirePermission(request, "permissions.edit")
  if (!("user" in auth)) return auth
  if (auth.user.role !== "super_admin") {
    return NextResponse.json({ error: "Only Super Admin can simulate user sessions" }, { status: 403 })
  }

  const { userId } = await params
  const client = await clientPromise
  const db     = client.db()

  let userDoc: DBUser | null = null
  try {
    userDoc = await db.collection<DBUser>("rbac_users").findOne({
      _id: new ObjectId(userId) as unknown as string,
    })
  } catch {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
  }
  if (!userDoc) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const resolution = await resolveEffectivePermissions(userId, userDoc.role)

  // Compute which sidebar modules are visible for this user
  const visibleModules = Object.entries(MODULE_PERMISSIONS)
    .filter(([, perm]) => resolution.effective.includes(perm))
    .map(([path]) => path)

  return NextResponse.json({
    simulatedUser: {
      id:    userId,
      name:  userDoc.name,
      email: userDoc.email,
      role:  userDoc.role,
    },
    permissions: {
      effective:  resolution.effective,
      base:       resolution.base,
      granted:    resolution.granted,
      denied:     resolution.denied,
    },
    visibleModules,
    simulatedAt: new Date().toISOString(),
  })
}
