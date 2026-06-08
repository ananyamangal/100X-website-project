// GET /api/admin/users/[id]/permissions  — full permission resolution for a user
// PUT /api/admin/users/[id]/permissions  — replace user override sets
// PATCH /api/admin/users/[id]/permissions — granular grant/deny/revoke

import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requirePermission, writeAuditLog } from "@/lib/rbac/server"
import { resolveEffectivePermissions, getUserOverrides, setUserOverrides } from "@/lib/rbac/engine"
import type { DBUser } from "@/lib/rbac/types"

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requirePermission(request, "users.view")
  if (!("user" in auth)) return auth

  const { id } = await params

  const client = await clientPromise
  const db     = client.db()

  let userDoc: DBUser | null = null
  try {
    userDoc = await db.collection<DBUser>("rbac_users").findOne({ _id: new ObjectId(id) as unknown as string })
  } catch {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
  }
  if (!userDoc) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const resolution = await resolveEffectivePermissions(id, userDoc.role)

  return NextResponse.json({
    userId: id,
    role:   userDoc.role,
    ...resolution,
  })
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requirePermission(request, "permissions.edit")
  if (!("user" in auth)) return auth
  const { user: actor } = auth

  const { id } = await params
  const body = await request.json()
  const { grantedPermissions = [], deniedPermissions = [], notes } = body

  const before = await getUserOverrides(id)

  await setUserOverrides(id, grantedPermissions, deniedPermissions, actor.sub, notes)

  await writeAuditLog(actor, "permission_change", "user", {
    id,
    grantedPermissions,
    deniedPermissions,
    previousGrants: before?.grantedPermissions ?? [],
    previousDenials: before?.deniedPermissions ?? [],
  }, request)

  return NextResponse.json({ success: true })
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requirePermission(request, "permissions.edit")
  if (!("user" in auth)) return auth
  const { user: actor } = auth

  const { id } = await params
  const body = await request.json()

  const current = await getUserOverrides(id)
  let granted = [...(current?.grantedPermissions ?? [])]
  let denied  = [...(current?.deniedPermissions ?? [])]

  // grant: add to grants, remove from denials
  if (Array.isArray(body.grant)) {
    for (const p of body.grant) {
      if (!granted.includes(p)) granted.push(p)
      denied = denied.filter(d => d !== p)
    }
  }

  // deny: add to denials, remove from grants
  if (Array.isArray(body.deny)) {
    for (const p of body.deny) {
      if (!denied.includes(p)) denied.push(p)
      granted = granted.filter(g => g !== p)
    }
  }

  // revoke_grant: remove from grants
  if (Array.isArray(body.revoke_grant)) {
    granted = granted.filter(g => !body.revoke_grant.includes(g))
  }

  // revoke_denial: remove from denials
  if (Array.isArray(body.revoke_denial)) {
    denied = denied.filter(d => !body.revoke_denial.includes(d))
  }

  await setUserOverrides(id, granted, denied, actor.sub, body.notes)

  await writeAuditLog(actor, "permission_change", "user", {
    id,
    op: { grant: body.grant, deny: body.deny, revoke_grant: body.revoke_grant, revoke_denial: body.revoke_denial },
  }, request)

  return NextResponse.json({ success: true, grants: granted.length, denials: denied.length })
}
