import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requirePermission, writeAuditLog } from "@/lib/rbac/server"
import { createPasswordResetToken } from "@/lib/rbac/passwordReset"
import type { DBUser } from "@/lib/rbac/types"

type Params = { params: Promise<{ id: string }> }

// POST /api/admin/users/[id]/get-reset-link
// Super Admin only — generates a one-time reset URL to share manually (for when email isn't configured).
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requirePermission(request, "users.edit")
  if (!("user" in auth)) return auth
  const { user: actor } = auth

  // Only super admins can get raw reset links (they contain the plaintext token)
  if (actor.role !== "super_admin") {
    return NextResponse.json({ error: "Only Super Admins can generate reset links" }, { status: 403 })
  }

  const { id } = await params
  let query: object
  try { query = { _id: new ObjectId(id) } } catch {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
  }

  const client = await clientPromise
  const db     = client.db()

  const user = await db.collection<DBUser>("rbac_users").findOne(query)
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })
  if (!user.isActive) return NextResponse.json({ error: "Cannot reset an inactive account" }, { status: 400 })
  if (user.role === "super_admin" && actor.sub !== String(user._id)) {
    return NextResponse.json({ error: "Cannot generate reset link for another Super Admin" }, { status: 403 })
  }

  const ip        = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown"
  const userAgent = request.headers.get("user-agent") ?? "unknown"

  const result = await createPasswordResetToken(user.email, ip, userAgent)
  if ("error" in result) {
    if (result.error === "rate_limited") {
      return NextResponse.json({ error: "Rate limit reached — too many reset requests for this user" }, { status: 429 })
    }
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500 })
  }

  const baseUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "https://100xcircle.in"
  const resetUrl = `${baseUrl}/admin/reset-password?token=${result.token}`

  await writeAuditLog(actor, "password_reset", "user", {
    targetId: id,
    targetEmail: user.email,
    method: "manual_link",
  }, request)

  return NextResponse.json({
    resetUrl,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    targetEmail: user.email,
    targetName:  user.name,
  })
}
