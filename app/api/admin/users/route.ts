import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requirePermission, writeAuditLog } from "@/lib/rbac/server"
import { hashPassword } from "@/lib/rbac/password"
import { validatePassword } from "@/lib/passwordPolicy"
import { renderAndSend } from "@/lib/emailTemplates"
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
    id:               String(u._id),
    email:            u.email,
    name:             u.name,
    role:             u.role,
    isActive:         u.isActive,
    createdAt:        u.createdAt,
    lastLoginAt:      u.lastLoginAt,
    loginHistory:     (u.loginHistory ?? []).slice(-10),
    customPermissions:  u.customPermissions ?? [],
    deniedPermissions:  u.deniedPermissions ?? [],
    passwordChangedAt:  u.passwordChangedAt ?? null,
    failedLoginCount:   u.failedLoginCount ?? 0,
    lockedAt:           u.lockedAt ?? null,
    lockedBy:           u.lockedBy ?? null,
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

  // Enforce password policy on server side
  const policyError = validatePassword(password)
  if (policyError) {
    return NextResponse.json({ error: policyError }, { status: 422 })
  }

  const client = await clientPromise
  const db     = client.db()

  const normalizedEmail = email.toLowerCase().trim()

  // Check for existing user with this email (active OR inactive)
  const existing = await db.collection("rbac_users").findOne({ email: normalizedEmail })

  if (existing) {
    if (existing.isActive) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }
    // Soft-deleted record — hard-delete it and all orphaned data so we can recreate cleanly
    const oldId = String(existing._id)
    await db.collection("rbac_users").deleteOne({ email: normalizedEmail })
    await db.collection("rbac_user_permissions").deleteOne({ userId: oldId })
    await db.collection("active_sessions").updateMany(
      { userId: oldId, isRevoked: false },
      { $set: { isRevoked: true, revokedAt: new Date(), revokedReason: "user_recreated" } }
    )
    await db.collection("password_reset_tokens").deleteMany({ email: normalizedEmail })
    await writeAuditLog(actor, "delete", "user", { id: oldId, email: normalizedEmail, reason: "purged_before_recreate" }, request)
  }

  const now: Omit<DBUser, "_id"> = {
    email:            normalizedEmail,
    name:             name.trim(),
    passwordHash:     hashPassword(password),
    role,
    customPermissions,
    deniedPermissions,
    isActive:         true,
    createdAt:        new Date(),
    updatedAt:        new Date(),
    lastLoginAt:       null,
    createdBy:         actor.sub,
    loginHistory:      [],
    passwordChangedAt: null,
    failedLoginCount:  0,
    lockedAt:          null,
    lockUntil:         null,
    lockedBy:          null,
  }

  const result = await db.collection("rbac_users").insertOne(now)
  const newId  = String(result.insertedId)

  await writeAuditLog(actor, "create", "user", { id: newId, email: normalizedEmail, role }, request)

  // Send welcome email (non-blocking — failure is logged, not surfaced)
  renderAndSend(
    "welcome",
    {
      NAME:  name.trim(),
      EMAIL: normalizedEmail,
      ROLE:  role,
      TEMP_PASSWORD: password,
    },
    normalizedEmail,
  ).catch(err => console.error("Welcome email failed:", err))

  return NextResponse.json({ success: true, id: newId }, { status: 201 })
}
