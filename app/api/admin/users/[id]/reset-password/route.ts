import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requirePermission, writeAuditLog } from "@/lib/rbac/server"
import { hashPassword, generateTemporaryPassword } from "@/lib/rbac/password"
import type { DBUser } from "@/lib/rbac/types"

type Params = { params: Promise<{ id: string }> }

// POST /api/admin/users/[id]/reset-password
// Returns a one-time temporary password. The user must change it on next login.
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requirePermission(request, "users.edit")
  if (!("user" in auth)) return auth
  const { user: actor } = auth

  const { id } = await params
  let query: object
  try { query = { _id: new ObjectId(id) } } catch {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
  }

  const client = await clientPromise
  const db     = client.db()

  const existing = await db.collection<DBUser>("rbac_users").findOne(query)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (existing.role === "super_admin" && actor.role !== "super_admin") {
    return NextResponse.json({ error: "Cannot reset a Super Admin password" }, { status: 403 })
  }

  const tempPassword = generateTemporaryPassword()

  await db.collection("rbac_users").updateOne(query, {
    $set: {
      passwordHash: hashPassword(tempPassword),
      updatedAt: new Date(),
    },
  })

  await writeAuditLog(actor, "password_reset", "user", { id, email: existing.email }, request)

  return NextResponse.json({ success: true, tempPassword })
}
