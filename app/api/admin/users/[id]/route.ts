import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requirePermission, writeAuditLog } from "@/lib/rbac/server"
import { hashPassword, generateTemporaryPassword } from "@/lib/rbac/password"
import type { DBUser } from "@/lib/rbac/types"

type Params = { params: Promise<{ id: string }> }

// GET /api/admin/users/[id]
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requirePermission(request, "users.view")
  if (!("user" in auth)) return auth

  const { id } = await params
  const client  = await clientPromise
  const db      = client.db()

  let query: object
  try { query = { _id: new ObjectId(id) } } catch { return NextResponse.json({ error: "Invalid ID" }, { status: 400 }) }

  const u = await db.collection<DBUser>("rbac_users").findOne(query)
  if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    user: {
      id:                String(u._id),
      email:             u.email,
      name:              u.name,
      role:              u.role,
      isActive:          u.isActive,
      createdAt:         u.createdAt,
      lastLoginAt:       u.lastLoginAt,
      loginHistory:      u.loginHistory ?? [],
      customPermissions: u.customPermissions ?? [],
      deniedPermissions: u.deniedPermissions ?? [],
      passwordChangedAt: u.passwordChangedAt ?? null,
      failedLoginCount:  u.failedLoginCount ?? 0,
      lockedAt:          u.lockedAt ?? null,
      lockedBy:          u.lockedBy ?? null,
    },
  })
}

// PATCH /api/admin/users/[id] — edit role, status, custom permissions
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requirePermission(request, "users.edit")
  if (!("user" in auth)) return auth
  const { user: actor } = auth

  const { id } = await params
  const body    = await request.json()

  let query: object
  try { query = { _id: new ObjectId(id) } } catch { return NextResponse.json({ error: "Invalid ID" }, { status: 400 }) }

  const client = await clientPromise
  const db     = client.db()

  const existing = await db.collection<DBUser>("rbac_users").findOne(query)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Prevent editing another super admin (unless you are super admin)
  if (existing.role === "super_admin" && actor.role !== "super_admin") {
    return NextResponse.json({ error: "Cannot modify a Super Admin" }, { status: 403 })
  }

  const update: Partial<DBUser> & { updatedAt: Date } = { updatedAt: new Date() }
  const changes: Record<string, unknown> = {}

  if (body.role !== undefined) {
    update.role = body.role
    changes.role = body.role
  }
  if (body.isActive !== undefined) {
    update.isActive = Boolean(body.isActive)
    changes.isActive = update.isActive
  }
  if (body.customPermissions !== undefined) {
    update.customPermissions = body.customPermissions
    changes.customPermissions = body.customPermissions
  }
  if (body.deniedPermissions !== undefined) {
    update.deniedPermissions = body.deniedPermissions
    changes.deniedPermissions = body.deniedPermissions
  }
  if (body.name !== undefined) {
    update.name = body.name.trim()
    changes.name = update.name
  }

  await db.collection("rbac_users").updateOne(query, { $set: update })

  const action = body.isActive === false ? "user_disabled"
    : body.isActive === true  ? "user_enabled"
    : body.role !== undefined ? "role_change"
    : "edit"

  await writeAuditLog(actor, action, "user", { id, ...changes }, request)

  return NextResponse.json({ success: true })
}

// POST /api/admin/users/[id]/reset-password via same route with action query
// Implemented as a sub-action in PATCH: body.resetPassword = true
// Returns the temporary password only to super_admin / users.edit holders

// DELETE /api/admin/users/[id] — soft delete (deactivate)
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requirePermission(request, "users.delete")
  if (!("user" in auth)) return auth
  const { user: actor } = auth

  const { id } = await params
  let query: object
  try { query = { _id: new ObjectId(id) } } catch { return NextResponse.json({ error: "Invalid ID" }, { status: 400 }) }

  const client = await clientPromise
  const db     = client.db()

  const existing = await db.collection<DBUser>("rbac_users").findOne(query)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (String(existing._id) === actor.sub) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
  }

  if (existing.role === "super_admin" && actor.role !== "super_admin") {
    return NextResponse.json({ error: "Cannot delete a Super Admin" }, { status: 403 })
  }

  // Soft delete — deactivate rather than destroy
  await db.collection("rbac_users").updateOne(query, {
    $set: { isActive: false, updatedAt: new Date() },
  })

  await writeAuditLog(actor, "delete", "user", { id, email: existing.email }, request)

  return NextResponse.json({ success: true })
}
