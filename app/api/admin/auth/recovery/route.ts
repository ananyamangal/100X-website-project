// READ-ONLY FORENSIC PROBE — no data changes, no token creation
// Remove after audit is complete.
import { type NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import clientPromise from "@/lib/mongodb"

const PROBE_TOKEN = "b44d0efa805abaf3077d7ba8557c4a8685a61147dfd159e8"

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try { body = await request.json() }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  if (((body.probe as string) ?? "").trim() !== PROBE_TOKEN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const db = (await clientPromise).db()

  // ── What database are we connected to? ────────────────────────────────────
  const mongoUri = process.env.MONGODB_URI ?? ""
  const uriDbMatch = mongoUri.match(/\/([^/?]+)(\?|$)/)
  const uriDatabase = uriDbMatch ? uriDbMatch[1] : "(not in URI)"

  // ── List all tokens (read-only) ───────────────────────────────────────────
  const allTokenDocs = await db.collection("password_reset_tokens")
    .find({})
    .sort({ createdAt: -1 })
    .limit(10)
    .project({ tokenHash: 1, email: 1, createdAt: 1, expiresAt: 1, usedAt: 1, ip: 1 })
    .toArray()

  // ── Compute expected hash for the last known token ─────────────────────────
  const lastKnownRawToken = body.rawToken as string | undefined
  let hashLookup = null
  if (lastKnownRawToken) {
    const expectedHash = createHash("sha256").update(lastKnownRawToken).digest("hex")
    const doc = await db.collection("password_reset_tokens").findOne({ tokenHash: expectedHash })
    hashLookup = {
      inputToken:     lastKnownRawToken.slice(0, 8) + "...",
      computedHash:   expectedHash,
      foundInDb:      !!doc,
      doc: doc ? {
        email:     doc.email,
        createdAt: doc.createdAt,
        expiresAt: doc.expiresAt,
        usedAt:    doc.usedAt,
        isExpired: new Date(doc.expiresAt) < new Date(),
        isUsed:    !!doc.usedAt,
      } : null,
    }
  }

  // ── Collection stats ──────────────────────────────────────────────────────
  const totalTokens = await db.collection("password_reset_tokens").countDocuments({})
  const activeTokens = await db.collection("password_reset_tokens").countDocuments({
    usedAt: null,
    expiresAt: { $gt: new Date() },
  })

  // ── TTL index ─────────────────────────────────────────────────────────────
  const indexes = await db.collection("password_reset_tokens").indexes()

  return NextResponse.json({
    database: {
      uriDatabase,
      connectedDb: db.databaseName,
    },
    collection: {
      name:          "password_reset_tokens",
      totalDocuments: totalTokens,
      activeUnusedNotExpired: activeTokens,
    },
    recentTokens: allTokenDocs.map(d => ({
      email:     d.email,
      hashPrefix: (d.tokenHash as string)?.slice(0, 16) + "...",
      createdAt: d.createdAt,
      expiresAt: d.expiresAt,
      usedAt:    d.usedAt,
      isExpired: new Date(d.expiresAt) < new Date(),
      isUsed:    !!d.usedAt,
    })),
    hashLookup,
    indexes: indexes.map(i => ({ key: i.key, expireAfterSeconds: i.expireAfterSeconds })),
    serverTime: new Date().toISOString(),
  })
}
