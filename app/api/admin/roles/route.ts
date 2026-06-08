import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requirePermission } from "@/lib/rbac/server"
import { ROLE_DEFINITIONS } from "@/lib/rbac/roles"
import type { DBRole } from "@/lib/rbac/types"

// GET /api/admin/roles — list all roles (from DB, falling back to code defaults)
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "roles.view")
  if (!("user" in auth)) return auth

  const client = await clientPromise
  const db     = client.db()

  const dbRoles = await db.collection<DBRole>("rbac_roles").find({}).sort({ slug: 1 }).toArray()

  // Merge: DB roles take precedence, fill gaps from code defaults
  const slugSet    = new Set(dbRoles.map(r => r.slug))
  const codeRoles  = ROLE_DEFINITIONS.filter(r => !slugSet.has(r.slug))
  const allRoles   = [
    ...dbRoles.map(r => ({ ...r, id: String(r._id) })),
    ...codeRoles.map(r => ({ ...r, id: r.slug, fromCode: true })),
  ]

  return NextResponse.json({ roles: allRoles })
}

// PATCH /api/admin/roles — update a role's permissions
export async function PATCH(request: NextRequest) {
  const auth = await requirePermission(request, "roles.edit")
  if (!("user" in auth)) return auth

  const body       = await request.json()
  const { slug, permissions } = body

  if (!slug || !Array.isArray(permissions)) {
    return NextResponse.json({ error: "slug and permissions array required" }, { status: 400 })
  }

  const client = await clientPromise
  const db     = client.db()

  await db.collection("rbac_roles").updateOne(
    { slug },
    {
      $set: { permissions, updatedAt: new Date() },
      $setOnInsert: {
        slug,
        name: slug,
        description: "Custom role",
        isSystem: false,
        createdAt: new Date(),
      },
    },
    { upsert: true }
  )

  return NextResponse.json({ success: true })
}
