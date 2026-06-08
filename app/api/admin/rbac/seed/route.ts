// One-time RBAC seed endpoint.
// Creates default roles and the initial super admin user.
// Protected by SEED_SECRET env var OR existing admin-token cookie.
// Safe to call multiple times — uses upsert logic.

import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { hashPassword } from "@/lib/rbac/password"
import { ROLE_DEFINITIONS } from "@/lib/rbac/roles"
import { getCurrentUser } from "@/lib/rbac/server"
import type { DBUser, DBRole } from "@/lib/rbac/types"

export async function POST(request: NextRequest) {
  // Auth: require existing admin session OR seed secret
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

  // ── 1. Seed default roles ──────────────────────────────────────────────────
  const roleResults: string[] = []
  for (const role of ROLE_DEFINITIONS) {
    await db.collection<DBRole>("rbac_roles").updateOne(
      { slug: role.slug },
      {
        $setOnInsert: { createdAt: new Date() },
        $set: {
          name:        role.name,
          description: role.description,
          permissions: role.permissions,
          isSystem:    role.isSystem,
          updatedAt:   new Date(),
        },
      },
      { upsert: true }
    )
    roleResults.push(role.slug)
  }

  // ── 2. Seed super admin user ───────────────────────────────────────────────
  const superAdminEmail    = (body.email as string | undefined) ?? "sulabh.mangal@gmail.com"
  const superAdminPassword = (body.password as string | undefined) ?? process.env.ADMIN_PASSWORD ?? "dtu@ananya"
  const superAdminName     = (body.name as string | undefined) ?? "Sulabh Mangal"

  const existingSuperAdmin = await db.collection<DBUser>("rbac_users").findOne({ email: superAdminEmail })

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
      lastLoginAt:       null,
      createdBy:         null,
      loginHistory:      [],
    }
    await db.collection("rbac_users").insertOne(superAdmin)
  }

  // ── 3. Create MongoDB indexes ──────────────────────────────────────────────
  await db.collection("rbac_users").createIndex({ email: 1 }, { unique: true, background: true })
  await db.collection("rbac_users").createIndex({ role: 1 },  { background: true })
  await db.collection("rbac_roles").createIndex({ slug: 1 },  { unique: true, background: true })
  await db.collection("audit_logs").createIndex({ timestamp: -1 }, { background: true })
  await db.collection("audit_logs").createIndex({ userId: 1 },     { background: true })
  await db.collection("audit_logs").createIndex({ action: 1 },     { background: true })

  return NextResponse.json({
    success: true,
    rolesSeeded:    roleResults,
    superAdminSeed: !existingSuperAdmin,
  })
}
