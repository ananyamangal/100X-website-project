// GET  /api/admin/permissions          — list all permission definitions
// GET  /api/admin/permissions?format=matrix — full matrix data for UI
// POST /api/admin/permissions          — add a custom permission (super admin only)

import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requirePermission } from "@/lib/rbac/server"
import { PERMISSION_REGISTRY, PERMISSION_GROUPS, type PermDef } from "@/lib/rbac/permissions"
import { ROLE_DEFINITIONS } from "@/lib/rbac/roles"
import type { DBRolePermissions } from "@/lib/rbac/types"

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "permissions.view")
  if (!("user" in auth)) return auth

  const format = request.nextUrl.searchParams.get("format")

  const client = await clientPromise
  const db     = client.db()

  // Custom permissions added via UI
  const dbPerms = await db.collection("rbac_permissions")
    .find({ isActive: { $ne: false } })
    .sort({ sortOrder: 1 })
    .toArray()

  // Merge: code registry + DB custom permissions (DB ones take precedence if key collision)
  const codeMap = new Map(PERMISSION_REGISTRY.map(p => [p.key, p]))
  for (const p of dbPerms) codeMap.set(p.key as string, p as unknown as PermDef)
  const allPerms = Array.from(codeMap.values()).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

  if (format !== "matrix") {
    return NextResponse.json({ permissions: allPerms, groups: PERMISSION_GROUPS })
  }

  // Matrix format: roles + their current permission sets
  const rolePermsRows = await db
    .collection<DBRolePermissions>("rbac_role_permissions")
    .find({})
    .toArray()

  const rolePermMap: Record<string, string[]> = {}
  for (const row of rolePermsRows) {
    rolePermMap[row.roleSlug] = row.permissions
  }

  // Fill in code defaults for roles not yet in DB
  for (const role of ROLE_DEFINITIONS) {
    if (!rolePermMap[role.slug]) {
      const { ROLE_PERMISSIONS } = await import("@/lib/rbac/roles")
      rolePermMap[role.slug] = ROLE_PERMISSIONS[role.slug] ?? []
    }
  }

  // Group permissions by group → subgroup
  const grouped: Record<string, Record<string, typeof allPerms>> = {}
  for (const perm of allPerms) {
    if (!grouped[perm.group]) grouped[perm.group] = {}
    const sub = perm.subgroup ?? "__root__"
    if (!grouped[perm.group][sub]) grouped[perm.group][sub] = []
    grouped[perm.group][sub].push(perm)
  }

  return NextResponse.json({
    roles:        ROLE_DEFINITIONS.map(r => ({ slug: r.slug, name: r.name })),
    permissions:  allPerms,
    grouped,
    groups:       PERMISSION_GROUPS,
    rolePermMap,
  })
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "permissions.edit")
  if (!("user" in auth)) return auth

  const body = await request.json()
  const { key, label, description, group, subgroup, module, action, sortOrder } = body

  if (!key || !label || !group || !module || !action) {
    return NextResponse.json({ error: "key, label, group, module, action required" }, { status: 400 })
  }

  const client = await clientPromise
  const db     = client.db()

  await db.collection("rbac_permissions").updateOne(
    { key },
    {
      $set: { key, label, description: description ?? "", group, subgroup, module, action, sortOrder: sortOrder ?? 9999, isActive: true, updatedAt: new Date() },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  )

  return NextResponse.json({ success: true })
}
