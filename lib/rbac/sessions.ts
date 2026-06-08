// Session management utilities — create, revoke, list, and check active sessions.
// All writes go to `active_sessions` collection (indexed on sessionId + userId).

import { randomUUID } from "crypto"
import clientPromise from "@/lib/mongodb"
import type { ActiveSession } from "./types"
import { getRoleTimeout } from "./jwt"

// ── UA parsing (no external deps) ────────────────────────────────────────────

function parseBrowser(ua: string): string {
  if (/Edg\//.test(ua))     return "Edge"
  if (/OPR\//.test(ua))     return "Opera"
  if (/Chrome\//.test(ua))  return "Chrome"
  if (/Firefox\//.test(ua)) return "Firefox"
  if (/Safari\//.test(ua))  return "Safari"
  return "Unknown"
}

function parseOS(ua: string): string {
  if (/Windows NT/.test(ua))  return "Windows"
  if (/Macintosh/.test(ua))   return "macOS"
  if (/iPhone|iPad/.test(ua)) return "iOS"
  if (/Android/.test(ua))     return "Android"
  if (/Linux/.test(ua))       return "Linux"
  return "Unknown"
}

function parseDeviceType(ua: string): "desktop" | "mobile" | "tablet" {
  if (/iPad|Tablet/.test(ua))        return "tablet"
  if (/Mobile|iPhone|Android.*Mobile/.test(ua)) return "mobile"
  return "desktop"
}

// ── Session lifecycle ─────────────────────────────────────────────────────────

export async function createSession(opts: {
  userId:    string
  userEmail: string
  userName:  string
  userRole:  string
  ip:        string
  userAgent: string
}): Promise<string> {
  const sessionId = randomUUID()
  const now       = new Date()
  const expiresAt = new Date(now.getTime() + getRoleTimeout(opts.userRole) * 1000)

  const doc: Omit<ActiveSession, "_id"> = {
    sessionId,
    userId:       opts.userId,
    userEmail:    opts.userEmail,
    userName:     opts.userName,
    userRole:     opts.userRole,
    ip:           opts.ip,
    userAgent:    opts.userAgent,
    browser:      parseBrowser(opts.userAgent),
    os:           parseOS(opts.userAgent),
    deviceType:   parseDeviceType(opts.userAgent),
    createdAt:    now,
    lastActivity: now,
    expiresAt,
    isRevoked:    false,
    revokedAt:    null,
    revokedBy:    null,
    revokedReason: null,
  }

  const db = (await clientPromise).db()
  await db.collection("active_sessions").insertOne(doc)
  return sessionId
}

export async function revokeSession(
  sessionId: string,
  revokedBy: string | null,
  reason: ActiveSession["revokedReason"]
): Promise<void> {
  const db = (await clientPromise).db()
  await db.collection("active_sessions").updateOne(
    { sessionId },
    { $set: { isRevoked: true, revokedAt: new Date(), revokedBy, revokedReason: reason } }
  )
}

export async function revokeAllUserSessions(
  userId: string,
  revokedBy: string | null,
  reason: ActiveSession["revokedReason"] = "force_logout"
): Promise<number> {
  const db = (await clientPromise).db()
  const result = await db.collection("active_sessions").updateMany(
    { userId, isRevoked: false },
    { $set: { isRevoked: true, revokedAt: new Date(), revokedBy, revokedReason: reason } }
  )
  return result.modifiedCount
}

export async function revokeAllActiveSessions(
  revokedBy: string
): Promise<number> {
  const db = (await clientPromise).db()
  const result = await db.collection("active_sessions").updateMany(
    { isRevoked: false },
    { $set: { isRevoked: true, revokedAt: new Date(), revokedBy, revokedReason: "kill_all" } }
  )
  return result.modifiedCount
}

export async function isSessionRevoked(sessionId: string): Promise<boolean> {
  if (!sessionId) return false
  const db  = (await clientPromise).db()
  const doc = await db.collection("active_sessions").findOne(
    { sessionId },
    { projection: { isRevoked: 1, expiresAt: 1 } }
  )
  if (!doc) return true  // unknown session = treat as revoked
  if (doc.isRevoked) return true
  if (doc.expiresAt && new Date(doc.expiresAt as Date) < new Date()) return true
  return false
}

export async function updateLastActivity(sessionId: string): Promise<void> {
  if (!sessionId) return
  const db = (await clientPromise).db()
  await db.collection("active_sessions").updateOne(
    { sessionId, isRevoked: false },
    { $set: { lastActivity: new Date() } }
  )
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getActiveSessions(userId?: string): Promise<ActiveSession[]> {
  const db    = (await clientPromise).db()
  const query = userId ? { userId } : {}
  const docs  = await db.collection("active_sessions")
    .find(query)
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray()
  return docs.map(d => ({ ...d, _id: String(d._id) })) as unknown as ActiveSession[]
}

export async function getAllActiveSessions(): Promise<ActiveSession[]> {
  const db   = (await clientPromise).db()
  const docs = await db.collection("active_sessions")
    .find({ isRevoked: false, expiresAt: { $gt: new Date() } })
    .sort({ lastActivity: -1 })
    .limit(500)
    .toArray()
  return docs.map(d => ({ ...d, _id: String(d._id) })) as unknown as ActiveSession[]
}

export async function ensureSessionIndexes(): Promise<void> {
  try {
    const db = (await clientPromise).db()
    const col = db.collection("active_sessions")
    await col.createIndex({ sessionId: 1 }, { unique: true, background: true })
    await col.createIndex({ userId: 1, isRevoked: 1 }, { background: true })
    await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, background: true })
  } catch {
    // Index creation is idempotent — ignore duplicate index errors
  }
}
