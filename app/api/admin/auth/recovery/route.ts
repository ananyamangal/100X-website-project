// ONE-TIME TOKEN GENERATOR — remove after use
import { type NextRequest, NextResponse } from "next/server"
import { createHash, randomBytes } from "crypto"
import clientPromise from "@/lib/mongodb"

const ONE_TIME_TOKEN = "107950921b6258bab523765701f8b17eaec61e1b2665da6e"
const TARGET_EMAIL   = "sulabh.mangal@gmail.com"
const APP_URL        = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.100xcircle.com").trim()

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try { body = await request.json() }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  if (((body.token as string) ?? "").trim() !== ONE_TIME_TOKEN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const db  = (await clientPromise).db()
  const now = new Date()

  // Verify user — read only, no modifications
  const user = await db.collection("rbac_users").findOne({ email: TARGET_EMAIL })

  if (!user) {
    return NextResponse.json({ error: `User ${TARGET_EMAIL} not found` }, { status: 404 })
  }

  const verification = {
    email:           user.email,
    role:            user.role,
    isActive:        user.isActive,
    hasPasswordHash: !!(user.passwordHash as string)?.startsWith("pbkdf2:"),
    failedLoginCount: user.failedLoginCount ?? 0,
    isLocked:        !!(user.lockUntil && new Date(user.lockUntil) > now),
  }

  if (user.role !== "super_admin" || !user.isActive) {
    return NextResponse.json({ error: "User is not an active super_admin", verification }, { status: 400 })
  }

  // Invalidate existing unexpired tokens for this email only
  await db.collection("password_reset_tokens").deleteMany({
    email:     TARGET_EMAIL.toLowerCase(),
    usedAt:    null,
    expiresAt: { $gt: now },
  })

  // Generate new 60-minute token
  try {
    await db.collection("password_reset_tokens").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, background: true })
    await db.collection("password_reset_tokens").createIndex({ tokenHash: 1 }, { unique: true, background: true })
  } catch { /* idempotent */ }

  const rawToken  = randomBytes(32).toString("hex")
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000)

  await db.collection("password_reset_tokens").insertOne({
    email:     TARGET_EMAIL.toLowerCase(),
    tokenHash: createHash("sha256").update(rawToken).digest("hex"),
    createdAt: now,
    expiresAt,
    usedAt:    null,
    ip:        request.headers.get("x-forwarded-for") ?? "recovery-api",
    userAgent: "recovery-api",
  })

  return NextResponse.json({
    verification,
    resetToken: {
      email:     TARGET_EMAIL,
      expiresAt: expiresAt.toISOString(),
      resetUrl:  `${APP_URL}/admin/reset-password?token=${rawToken}`,
    },
  })
}
