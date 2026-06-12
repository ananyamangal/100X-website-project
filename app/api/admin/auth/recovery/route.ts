// ONE-TIME UNLOCK — remove after use
import { type NextRequest, NextResponse } from "next/server"
import { createHash, randomBytes } from "crypto"
import clientPromise from "@/lib/mongodb"

const ONE_TIME_TOKEN = "90db22840f7f8e45efdae5df3c2626ad9655f4dc29c4ca1f"
const TARGET_EMAIL   = "sulabh.mangal@gmail.com"
const APP_URL        = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.100xcircle.com").trim()

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try { body = await request.json() }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  if (((body.token as string) ?? "").trim() !== ONE_TIME_TOKEN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const db  = (await clientPromise).db()
  const now = new Date()

  const user = await db.collection("rbac_users").findOne({ email: TARGET_EMAIL })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  // Unlock only — no other modifications
  await db.collection("rbac_users").updateOne(
    { email: TARGET_EMAIL },
    { $set: { failedLoginCount: 0, lockUntil: null, lockedAt: null } }
  )

  // Re-issue a fresh 60-minute reset token
  try {
    await db.collection("password_reset_tokens").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, background: true })
    await db.collection("password_reset_tokens").createIndex({ tokenHash: 1 }, { unique: true, background: true })
  } catch { /* idempotent */ }

  await db.collection("password_reset_tokens").deleteMany({
    email: TARGET_EMAIL.toLowerCase(), usedAt: null, expiresAt: { $gt: now },
  })

  const rawToken  = randomBytes(32).toString("hex")
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000)
  await db.collection("password_reset_tokens").insertOne({
    email:     TARGET_EMAIL.toLowerCase(),
    tokenHash: createHash("sha256").update(rawToken).digest("hex"),
    createdAt: now, expiresAt, usedAt: null,
    ip: request.headers.get("x-forwarded-for") ?? "unlock-api",
    userAgent: "unlock-api",
  })

  return NextResponse.json({
    unlocked:  true,
    email:     TARGET_EMAIL,
    expiresAt: expiresAt.toISOString(),
    resetUrl:  `${APP_URL}/admin/reset-password?token=${rawToken}`,
  })
}
