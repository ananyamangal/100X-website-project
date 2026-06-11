// One-time RBAC seed endpoint.
// Creates: default roles, role permission sets, permission registry, super admin user.
// Protected by SEED_SECRET env var OR existing admin session.
// Safe to re-run — uses upsert logic throughout.

import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { hashPassword } from "@/lib/rbac/password"
import { ROLE_DEFINITIONS, ROLE_PERMISSIONS } from "@/lib/rbac/roles"
import { PERMISSION_REGISTRY } from "@/lib/rbac/permissions"
import { getCurrentUser } from "@/lib/rbac/server"
import type { DBUser, DBRole } from "@/lib/rbac/types"

export async function POST(request: NextRequest) {
  const actor = await getCurrentUser(request)
  const body  = await request.json().catch(() => ({}))
  const seedSecret = process.env.SEED_SECRET

  const hasSecret = seedSecret && body.secret === seedSecret
  const isAdmin   = actor?.role === "super_admin"

  if (!hasSecret && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const client = await clientPromise
  const db     = client.db()

  // ── 1. Seed rbac_roles ─────────────────────────────────────────────────────
  const roleResults: string[] = []
  for (const role of ROLE_DEFINITIONS) {
    await db.collection<DBRole>("rbac_roles").updateOne(
      { slug: role.slug },
      {
        $setOnInsert: { createdAt: new Date() },
        $set: { name: role.name, description: role.description, isSystem: role.isSystem, updatedAt: new Date() },
      },
      { upsert: true }
    )
    roleResults.push(role.slug)
  }

  // ── 2. Seed rbac_role_permissions (dynamic role→permission mapping) ─────────
  for (const role of ROLE_DEFINITIONS) {
    await db.collection("rbac_role_permissions").updateOne(
      { roleSlug: role.slug },
      {
        $setOnInsert: { roleSlug: role.slug },
        $set: { permissions: ROLE_PERMISSIONS[role.slug] ?? [], updatedAt: new Date(), updatedBy: "seed" },
      },
      { upsert: true }
    )
  }

  // ── 3. Seed rbac_permissions (permission registry) ─────────────────────────
  let permCount = 0
  for (const perm of PERMISSION_REGISTRY) {
    await db.collection("rbac_permissions").updateOne(
      { key: perm.key },
      {
        $setOnInsert: { createdAt: new Date() },
        $set: {
          label:       perm.label,
          description: perm.description,
          group:       perm.group,
          subgroup:    perm.subgroup ?? null,
          module:      perm.module,
          action:      perm.action,
          critical:    perm.critical ?? false,
          sortOrder:   perm.sortOrder,
          isActive:    true,
          updatedAt:   new Date(),
        },
      },
      { upsert: true }
    )
    permCount++
  }

  // ── 4. Seed super admin user ───────────────────────────────────────────────
  const superAdminEmail    = (body.email as string | undefined)    ?? "sulabh.mangal@gmail.com"
  const superAdminPassword = (body.password as string | undefined) ?? process.env.ADMIN_PASSWORD ?? ""
  if (!superAdminPassword) {
    return NextResponse.json({ error: "password required in body or ADMIN_PASSWORD env var" }, { status: 400 })
  }
  const superAdminName     = (body.name as string | undefined)     ?? "Sulabh Mangal"

  const existingSuperAdmin = await db.collection<DBUser>("rbac_users").findOne({ email: superAdminEmail })
  let superAdminSeeded = false

  if (!existingSuperAdmin) {
    const superAdmin: Omit<DBUser, "_id"> = {
      email:             superAdminEmail,
      name:              superAdminName,
      passwordHash:      hashPassword(superAdminPassword),
      role:              "super_admin",
      customPermissions: [],
      deniedPermissions: [],
      isActive:          true,
      createdAt:         new Date(),
      updatedAt:         new Date(),
      lastLoginAt:        null,
      createdBy:          null,
      loginHistory:       [],
      passwordChangedAt:  null,
      failedLoginCount:   0,
      lockedAt:           null,
      lockUntil:          null,
      lockedBy:           null,
    }
    await db.collection("rbac_users").insertOne(superAdmin)
    superAdminSeeded = true
  }

  // ── 5. Create MongoDB indexes ──────────────────────────────────────────────
  await Promise.all([
    db.collection("rbac_users").createIndex({ email: 1 }, { unique: true, background: true }),
    db.collection("rbac_users").createIndex({ role: 1 },  { background: true }),
    db.collection("rbac_roles").createIndex({ slug: 1 },  { unique: true, background: true }),
    db.collection("rbac_permissions").createIndex({ key: 1 },     { unique: true, background: true }),
    db.collection("rbac_permissions").createIndex({ group: 1 },   { background: true }),
    db.collection("rbac_role_permissions").createIndex({ roleSlug: 1 }, { unique: true, background: true }),
    db.collection("rbac_user_permissions").createIndex({ userId: 1 },   { unique: true, background: true }),
    db.collection("audit_logs").createIndex({ timestamp: -1 }, { background: true }),
    db.collection("audit_logs").createIndex({ userId: 1 },     { background: true }),
    db.collection("audit_logs").createIndex({ action: 1 },     { background: true }),
  ])

  return NextResponse.json({
    success: true,
    rolesSeeded:          roleResults,
    permissionsSeeded:    permCount,
    superAdminSeeded,
    rolePermSetsSeeded:   roleResults.length,
  })
}
