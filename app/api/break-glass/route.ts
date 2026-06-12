// TEMPORARY BREAK-GLASS — DELETE IMMEDIATELY AFTER USE
// Clears account lockout + issues a fresh password reset URL
// for sulabh.mangal@gmail.com without requiring authentication.
// Protected by a hard-coded one-time secret.

import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { randomBytes, createHash } from "crypto"

const TARGET_EMAIL    = "sulabh.mangal@gmail.com"
const BREAK_GLASS_KEY = "bg-100x-2026-06-12-unlock"

export async function GET(request: NextRequest) {
  const s = request.nextUrl.searchParams.get("s")
  if (s !== BREAK_GLASS_KEY) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const db = (await clientPromise).db()

  // 1 — Clear lockout
  await db.collection("rbac_users").updateOne(
    { email: TARGET_EMAIL },
    { $set: { failedLoginCount: 0, lockUntil: null, lockedAt: null } },
  )

  // 2 — Create fresh reset token (bypasses rate limit directly)
  const rawToken  = randomBytes(32).toString("hex")
  const now       = new Date()
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000)
  const tokenHash = createHash("sha256").update(rawToken).digest("hex")

  try {
    await db.collection("password_reset_tokens").insertOne({
      email:     TARGET_EMAIL,
      tokenHash,
      createdAt: now,
      expiresAt,
      usedAt:    null,
      ip:        "break-glass",
      userAgent: "break-glass-admin",
    })
  } catch {
    // duplicate key — token creation failed, proceed without reset URL
    return NextResponse.json({
      ok:          true,
      lockCleared: true,
      resetUrl:    null,
      error:       "Token insert failed (duplicate). Try again in 1 min.",
    })
  }

  const base     = process.env.NEXT_PUBLIC_APP_URL ?? "https://100xcircle.in"
  const resetUrl = `${base}/admin/reset-password?token=${rawToken}`

  return NextResponse.json({
    ok:          true,
    lockCleared: true,
    resetUrl,
    expiresAt:   expiresAt.toISOString(),
    instruction: "Visit resetUrl to set new password. DELETE this route immediately after.",
  })
}
