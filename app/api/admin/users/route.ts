import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requirePermission, writeAuditLog } from "@/lib/rbac/server"
import { hashPassword } from "@/lib/rbac/password"
import { resolvePermissions } from "@/lib/rbac/roles"
import type { DBUser } from "@/lib/rbac/types"

// GET /api/admin/users — list all users
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "users.view")
  if (!("user" in auth)) return auth

  const client = await clientPromise
  const db     = client.db()

  const users = await db
    .collection<DBUser>("rbac_users")
    .find({})
    .sort({ createdAt: -1 })
    .toArray()

  const safe = users.map(u => ({
    id:           String(u._id),
    email:        u.email,
    name:         u.name,
    role:         u.role,
    isActive:     u.isActive,
    createdAt:    u.createdAt,
    lastLoginAt:  u.lastLoginAt,
    loginHistory: (u.loginHistory ?? []).slice(-10),
    customPermissions: u.customPermissions ?? [],
    deniedPermissions: u.deniedPermissions ?? [],
  }))

  return NextResponse.json({ users: safe })
}

// POST /api/admin/users — create a new user
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "users.create")
  if (!("user" in auth)) return auth
  const { user: actor } = auth

  const body = await request.json()
  const { email, name, role, password, customPermissions = [], deniedPermissions = [] } = body

  if (!email || !name || !role || !password) {
    return NextResponse.json({ error: "email, name, role, and password are required" }, { status: 400 })
  }

  const client = await clientPromise
  const db     = client.db()

  const existing = await db.collection("rbac_users").findOne({ email: email.toLowerCase() })
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 })
  }

  const now: Omit<DBUser, "_id"> = {
    email:            email.toLowerCase().trim(),
    name:             name.trim(),
    passwordHash:     hashPassword(password),
    role,
    customPermissions,
    deniedPermissions,
    isActive:         true,
    createdAt:        new Date(),
    updatedAt:        new Date(),
    lastLoginAt:      null,
    createdBy:        actor.sub,
    loginHistory:     [],
  }

  const result = await db.collection("rbac_users").insertOne(now)
  const newId  = String(result.insertedId)

  await writeAuditLog(actor, "create", "user", { id: newId, email, role }, request)

  return NextResponse.json({ success: true, id: newId }, { status: 201 })
}
