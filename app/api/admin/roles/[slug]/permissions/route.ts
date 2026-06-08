// GET  /api/admin/roles/[slug]/permissions  — get permissions for a role
// PUT  /api/admin/roles/[slug]/permissions  — replace full permission set for a role

import { type NextRequest, NextResponse } from "next/server"
import { requirePermission, writeAuditLog } from "@/lib/rbac/server"
import { getRolePermissions, setRolePermissions } from "@/lib/rbac/engine"
import type { RoleSlug } from "@/lib/rbac/types"

type Params = { params: Promise<{ slug: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requirePermission(request, "permissions.view")
  if (!("user" in auth)) return auth

  const { slug } = await params
  const permissions = await getRolePermissions(slug as RoleSlug)

  return NextResponse.json({ slug, permissions })
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requirePermission(request, "permissions.edit")
  if (!("user" in auth)) return auth
  const { user } = auth

  const { slug } = await params
  const body = await request.json()
  const { permissions } = body

  if (!Array.isArray(permissions)) {
    return NextResponse.json({ error: "permissions array required" }, { status: 400 })
  }

  const before = await getRolePermissions(slug as RoleSlug)
  await setRolePermissions(slug as RoleSlug, permissions, user.sub)

  const added   = permissions.filter(p => !before.includes(p))
  const removed = before.filter(p => !permissions.includes(p))

  await writeAuditLog(user, "permission_change", "role", {
    roleSlug: slug,
    added,
    removed,
    total: permissions.length,
  }, request)

  return NextResponse.json({ success: true, added: added.length, removed: removed.length })
}

// PATCH — granular add/remove without full replace
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requirePermission(request, "permissions.edit")
  if (!("user" in auth)) return auth
  const { user } = auth

  const { slug } = await params
  const body = await request.json()
  const { add = [], remove = [] } = body

  const current = await getRolePermissions(slug as RoleSlug)
  const updated = [...new Set([
    ...current.filter(p => !remove.includes(p)),
    ...add,
  ])]

  await setRolePermissions(slug as RoleSlug, updated, user.sub)

  await writeAuditLog(user, "permission_change", "role", {
    roleSlug: slug, added: add, removed: remove,
  }, request)

  return NextResponse.json({ success: true, total: updated.length })
}
