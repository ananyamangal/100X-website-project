/**
 * READ-ONLY production authentication verification probe.
 * Fetches user record and runs verifyPassword() — ZERO writes.
 * DELETE after one use.
 */
import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { verifyPassword } from "@/lib/rbac/password"

const PROBE_KEY = "verifyprobe:sulabh:20260612"
const TARGET    = "sulabh.mangal@gmail.com"
const TEST_PW   = "TestProbe@123"

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }) }
  if (body.key !== PROBE_KEY) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await clientPromise
  const db     = client.db()                    // same call as login route line 31-32
  const dbName = db.databaseName

  const user = await db.collection("rbac_users").findOne({ email: TARGET })

  if (!user) {
    return NextResponse.json({ found: false, dbName, collection: "rbac_users", target: TARGET })
  }

  // Exact same call as login route line 53
  const pwResult = verifyPassword(TEST_PW, user.passwordHash ?? "")

  // Lock check — mirrors login route lines 45-51
  const now = new Date()
  const isLocked = !!(user.lockUntil && new Date(user.lockUntil) > now)
  const lockMinsRemaining = isLocked
    ? Math.ceil((new Date(user.lockUntil).getTime() - now.getTime()) / 60000)
    : 0

  return NextResponse.json({
    // ── User record fields ─────────────────────────────────────────────────────
    user: {
      email:             user.email,
      role:              user.role,
      isActive:          user.isActive,
      failedLoginCount:  user.failedLoginCount ?? 0,
      lockUntil:         user.lockUntil ?? null,
      passwordChangedAt: user.passwordChangedAt ?? null,
      passwordHashPrefix: (user.passwordHash ?? "").slice(0, 20) + "…",
    },

    // ── Password verification (same function, same call site) ─────────────────
    passwordVerification: {
      tested:     TEST_PW,
      result:     pwResult ? "PASS" : "FAIL",
      function:   "verifyPassword() from lib/rbac/password.ts",
    },

    // ── Lock status ────────────────────────────────────────────────────────────
    lockStatus: {
      isLocked,
      lockUntil:        user.lockUntil ?? null,
      lockMinsRemaining,
      loginWouldBlock:  isLocked,
    },

    // ── Database proof ─────────────────────────────────────────────────────────
    databaseProof: {
      client:        "clientPromise from lib/mongodb.ts",
      dbCall:        "client.db() — no name arg, uses URI default",
      dbName,
      collection:    "rbac_users",
      environment:   process.env.NODE_ENV,
      uriDbFragment: (process.env.MONGODB_URI ?? "").match(/\/([^/?]+)\?/)?.[1] ?? "(not extractable)",
    },

    // ── Code path for login (for reference) ───────────────────────────────────
    loginCodePath: {
      file:             "app/api/admin/auth/route.ts",
      dbConnection:     "line 30-31: const client = await clientPromise; const db = client.db()",
      userQuery:        "line 35-38: db.collection<DBUser>('rbac_users').findOne({ email, isActive: true })",
      lockCheck:        "line 45-51: if (dbUser.lockUntil && new Date(dbUser.lockUntil) > new Date())",
      passwordVerify:   "line 53: verifyPassword(password, dbUser.passwordHash)",
    },
  })
}
