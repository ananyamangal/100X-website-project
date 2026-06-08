// Password hashing via Node.js crypto (PBKDF2-SHA512).
// Only used in API routes — never in Edge Runtime middleware.

import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto"

const ITERATIONS = 100_000
const KEYLEN     = 64
const DIGEST     = "sha512"

export function hashPassword(plaintext: string): string {
  const salt = randomBytes(16).toString("hex")
  const hash = pbkdf2Sync(plaintext, salt, ITERATIONS, KEYLEN, DIGEST).toString("hex")
  return `pbkdf2:${salt}:${hash}`
}

export function verifyPassword(plaintext: string, stored: string): boolean {
  try {
    if (stored.startsWith("pbkdf2:")) {
      const [, salt, hash] = stored.split(":")
      if (!salt || !hash) return false
      const attempt = pbkdf2Sync(plaintext, salt, ITERATIONS, KEYLEN, DIGEST).toString("hex")
      const hashBuf    = Buffer.from(hash, "hex")
      const attemptBuf = Buffer.from(attempt, "hex")
      if (hashBuf.length !== attemptBuf.length) return false
      return timingSafeEqual(hashBuf, attemptBuf)
    }

    // Legacy: sha256 hash used by old single-admin system
    // Format was a raw hex sha256 string stored in admin_settings.hash
    // We do NOT support this path for user accounts — handled separately in auth route
    return false
  } catch {
    return false
  }
}

export function generateTemporaryPassword(length = 16): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$"
  const bytes = randomBytes(length)
  return Array.from(bytes).map(b => chars[b % chars.length]).join("")
}
