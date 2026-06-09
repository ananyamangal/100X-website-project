import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requirePermission, writeAuditLog } from "@/lib/rbac/server"
import { createPasswordResetToken } from "@/lib/rbac/passwordReset"
import { renderAndSend } from "@/lib/emailTemplates"
import { writeAuthAuditLog } from "@/lib/authAuditLog"
import type { DBUser } from "@/lib/rbac/types"

type Params = { params: Promise<{ id: string }> }

// POST /api/admin/users/[id]/send-reset
// Super Admin / users.edit: trigger a password reset email for any user.
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requirePermission(request, "users.edit")
  if (!("user" in auth)) return auth
  const { user: actor } = auth

  const { id } = await params
  let userQuery: object
  try { userQuery = { _id: new ObjectId(id) } }
  catch { return NextResponse.json({ error: "Invalid user ID" }, { status: 400 }) }

  const db      = (await clientPromise).db()
  const target  = await db.collection<DBUser>("rbac_users").findOne(userQuery)

  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 })
  if (!target.isActive) return NextResponse.json({ error: "Cannot reset password for an inactive account" }, { status: 400 })

  // Prevent non-super-admin from resetting another super_admin's password
  if (target.role === "super_admin" && actor.role !== "super_admin") {
    return NextResponse.json({ error: "Only a Super Admin can reset another Super Admin's password" }, { status: 403 })
  }

  const ip        = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "admin"
  const userAgent = request.headers.get("user-agent") ?? "admin"

  const result = await createPasswordResetToken(target.email, ip, userAgent)

  if ("error" in result) {
    const message = result.error === "rate_limited"
      ? "Too many reset requests for this account — try again in an hour."
      : "Could not create reset token."
    return NextResponse.json({ error: message }, { status: 429 })
  }

  const baseUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "https://100xcircle.in"
  const resetUrl = `${baseUrl}/admin/reset-password?token=${result.token}`

  await renderAndSend(
    "forgot_password",
    {
      NAME:      target.name,
      EMAIL:     target.email,
      RESET_URL: resetUrl,
    },
    target.email,
  )

  await writeAuditLog(actor, "password_reset", "user", { targetId: id, email: target.email }, request)
  await writeAuthAuditLog(
    "password_reset_requested",
    target.email,
    ip,
    userAgent,
    { initiatedBy: actor.sub, adminTriggered: true },
    id,
  )

  return NextResponse.json({ ok: true })
}
