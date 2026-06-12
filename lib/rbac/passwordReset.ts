// Password-reset token system.
// Tokens are 32-byte random hex strings.  Only the SHA-256 hash is stored in
// MongoDB so a DB breach does not expose working reset links.

import { createHash, randomBytes } from "crypto"
import clientPromise from "@/lib/mongodb"

const TOKEN_EXPIRY_MS         = 60 * 60 * 1000   // 60 minutes
const MAX_PER_EMAIL_PER_HOUR  = 5
const MAX_PER_IP_PER_HOUR     = 20

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}

// ── Indexes ───────────────────────────────────────────────────────────────────

async function ensureIndexes() {
  try {
    const db = (await clientPromise).db()
    const col = db.collection("password_reset_tokens")
    // TTL — MongoDB auto-deletes expired tokens
    await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, background: true })
    await col.createIndex({ tokenHash: 1 }, { unique: true, background: true })
    await col.createIndex({ email: 1, createdAt: 1 }, { background: true })
    await col.createIndex({ ip: 1, createdAt: 1 }, { background: true })
  } catch { /* idempotent */ }
}

// ── Public API ────────────────────────────────────────────────────────────────

export type CreateTokenResult =
  | { token: string }
  | { error: "rate_limited" | "user_not_found" }

export async function createPasswordResetToken(
  email: string,
  ip: string,
  userAgent: string,
): Promise<CreateTokenResult> {
  const db = (await clientPromise).db()

  // Verify user exists and is active
  const user = await db.collection("rbac_users").findOne({
    email: email.toLowerCase().trim(),
    isActive: true,
  })
  if (!user) return { error: "user_not_found" }

  await ensureIndexes()

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  // Rate limit: per email
  const emailCount = await db.collection("password_reset_tokens").countDocuments({
    email: email.toLowerCase().trim(),
    createdAt: { $gte: oneHourAgo },
  })
  if (emailCount >= MAX_PER_EMAIL_PER_HOUR) return { error: "rate_limited" }

  // Rate limit: per IP (skip for localhost/unknown)
  if (ip && ip !== "unknown" && ip !== "::1" && ip !== "127.0.0.1") {
    const ipCount = await db.collection("password_reset_tokens").countDocuments({
      ip,
      createdAt: { $gte: oneHourAgo },
    })
    if (ipCount >= MAX_PER_IP_PER_HOUR) return { error: "rate_limited" }
  }

  const rawToken = randomBytes(32).toString("hex")
  const now      = new Date()

  await db.collection("password_reset_tokens").insertOne({
    email:     email.toLowerCase().trim(),
    tokenHash: hashToken(rawToken),
    createdAt: now,
    expiresAt: new Date(now.getTime() + TOKEN_EXPIRY_MS),
    usedAt:    null,
    ip,
    userAgent,
  })

  return { token: rawToken }
}

export type ConsumeTokenResult =
  | { email: string; userId: string }
  | { error: "invalid" | "expired" | "used" }

export async function consumePasswordResetToken(
  rawToken: string,
): Promise<ConsumeTokenResult> {
  const db   = (await clientPromise).db()
  const hash = hashToken(rawToken)

  const doc = await db.collection("password_reset_tokens").findOne({ tokenHash: hash })
  if (!doc) return { error: "invalid" }
  if (doc.usedAt) return { error: "used" }
  if (new Date(doc.expiresAt) < new Date()) return { error: "expired" }

  // Mark single-use immediately to prevent replay
  await db.collection("password_reset_tokens").updateOne(
    { tokenHash: hash },
    { $set: { usedAt: new Date() } },
  )

  // Fetch the user's ID for session revocation
  const user = await db.collection("rbac_users").findOne({ email: doc.email })
  if (!user) return { error: "invalid" }

  return { email: doc.email, userId: String(user._id) }
}
