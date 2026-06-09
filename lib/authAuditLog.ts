// Auth-specific audit log.  Writes to `auth_audit_log` collection (separate
// from the general `audit_logs` used by the RBAC engine).

import clientPromise from "@/lib/mongodb"

export type AuthAuditAction =
  | "login"
  | "logout"
  | "login_failed"
  | "password_reset_requested"
  | "password_changed"
  | "account_locked"
  | "account_unlocked"
  | "reset_token_expired"
  | "reset_token_used"

export interface AuthAuditEntry {
  _id?:      string
  action:    AuthAuditAction
  email:     string
  userId?:   string | null
  ip:        string
  userAgent: string
  details:   Record<string, unknown>
  timestamp: Date
}

export async function writeAuthAuditLog(
  action:    AuthAuditAction,
  email:     string,
  ip:        string,
  userAgent: string,
  details:   Record<string, unknown> = {},
  userId?:   string | null,
): Promise<void> {
  try {
    const db = (await clientPromise).db()
    const entry: Omit<AuthAuditEntry, "_id"> = {
      action,
      email,
      userId:    userId ?? null,
      ip,
      userAgent,
      details,
      timestamp: new Date(),
    }
    await db.collection("auth_audit_log").insertOne(entry)

    // Keep collection lean — TTL of 90 days
    try {
      await db.collection("auth_audit_log").createIndex(
        { timestamp: 1 },
        { expireAfterSeconds: 90 * 24 * 3600, background: true },
      )
    } catch { /* idempotent */ }
  } catch {
    // Audit log failures must never break the main request
  }
}
