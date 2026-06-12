/**
 * Step-by-step login trace probe — runs every post-verification step
 * in the exact order the login route does, catching each one individually.
 * createSession is tested with immediate delete (net-zero write).
 * DELETE after one use.
 */
import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import clientPromise from "@/lib/mongodb"
import { verifyPassword } from "@/lib/rbac/password"
import { getEffectivePermissions } from "@/lib/rbac/engine"
import { signJWT, getRoleTimeout } from "@/lib/rbac/jwt"
import { ensureSessionIndexes } from "@/lib/rbac/sessions"
import type { RoleSlug } from "@/lib/rbac/types"

const PROBE_KEY  = "logintrace:sulabh:20260612"
const TARGET     = "sulabh.mangal@gmail.com"
const TEST_PW    = "TestProbe@123"

type StepResult = { ok: true; detail?: string } | { ok: false; error: string; stack?: string }

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }) }
  if (body.key !== PROBE_KEY) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const results: Record<string, StepResult> = {}

  // ── Step 0: user lookup (mirrors login route lines 30-38) ──────────────────
  const client = await clientPromise
  const db     = client.db()

  const dbUser = await db.collection("rbac_users").findOne({
    email:    TARGET,
    isActive: true,
  })

  if (!dbUser) {
    return NextResponse.json({ fatal: "user not found with isActive:true", target: TARGET })
  }

  results.step0_userLookup = { ok: true, detail: `found _id:${dbUser._id} role:${dbUser.role}` }

  // ── Step 1: password verification (login route line 53) ────────────────────
  try {
    const valid = verifyPassword(TEST_PW, dbUser.passwordHash ?? "")
    results.step1_verifyPassword = valid
      ? { ok: true, detail: "PASS" }
      : { ok: false, error: "FAIL — hash mismatch" }
  } catch (e) {
    results.step1_verifyPassword = { ok: false, error: String(e), stack: (e as Error).stack }
  }

  // ── Step 2: lock check (login route lines 45-51) ───────────────────────────
  const isLocked = !!(dbUser.lockUntil && new Date(dbUser.lockUntil) > new Date())
  results.step2_lockCheck = isLocked
    ? { ok: false, error: `LOCKED until ${dbUser.lockUntil}` }
    : { ok: true, detail: "not locked" }

  // ── Step 3: getEffectivePermissions (login route line 83) ─────────────────
  let permissions: string[] = []
  try {
    permissions = await getEffectivePermissions(String(dbUser._id), dbUser.role as RoleSlug)
    results.step3_getEffectivePermissions = { ok: true, detail: `${permissions.length} permissions` }
  } catch (e) {
    results.step3_getEffectivePermissions = { ok: false, error: String(e), stack: (e as Error).stack }
  }

  // ── Step 4: ensureSessionIndexes (login route line 84) ────────────────────
  try {
    await ensureSessionIndexes()
    results.step4_ensureSessionIndexes = { ok: true }
  } catch (e) {
    results.step4_ensureSessionIndexes = { ok: false, error: String(e), stack: (e as Error).stack }
  }

  // ── Step 5: createSession + immediate delete (login route lines 86-93) ─────
  let sessionId = ""
  try {
    sessionId = randomUUID()
    const now       = new Date()
    const expiresAt = new Date(now.getTime() + getRoleTimeout(dbUser.role) * 1000)
    const testDoc = {
      sessionId,
      userId:       String(dbUser._id),
      userEmail:    dbUser.email,
      userName:     dbUser.name ?? "Unknown",
      userRole:     dbUser.role,
      ip:           "diagnostic-probe",
      userAgent:    "diagnostic-probe",
      browser:      "Unknown",
      os:           "Unknown",
      deviceType:   "desktop" as const,
      createdAt:    now,
      lastActivity: now,
      expiresAt,
      isRevoked:    false,
      revokedAt:    null,
      revokedBy:    null,
      revokedReason: null,
    }
    await db.collection("active_sessions").insertOne(testDoc)
    await db.collection("active_sessions").deleteOne({ sessionId })   // immediate cleanup
    results.step5_createSession = { ok: true, detail: `insert+delete ok, sessionId:${sessionId.slice(0,8)}…` }
  } catch (e) {
    results.step5_createSession = { ok: false, error: String(e), stack: (e as Error).stack }
  }

  // ── Step 6: signJWT (login route lines 96-103) ────────────────────────────
  try {
    const ttl   = getRoleTimeout(dbUser.role)
    const token = await signJWT({
      sub:         String(dbUser._id),
      email:       dbUser.email,
      name:        dbUser.name ?? "Unknown",
      role:        dbUser.role as RoleSlug,
      permissions: permissions as never[],
      sessionId:   sessionId || "diagnostic",
    }, ttl)
    results.step6_signJWT = { ok: true, detail: `token length:${token.length}` }
  } catch (e) {
    results.step6_signJWT = { ok: false, error: String(e), stack: (e as Error).stack }
  }

  // ── Step 7: updateOne lastLoginAt (login route lines 106-117) ─────────────
  // READ-ONLY simulation — just verify the query would match, no actual write
  try {
    const matchCount = await db.collection("rbac_users").countDocuments({ email: TARGET })
    results.step7_updateOneTarget = { ok: true, detail: `query matches ${matchCount} doc(s)` }
  } catch (e) {
    results.step7_updateOneTarget = { ok: false, error: String(e), stack: (e as Error).stack }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const failed = Object.entries(results)
    .filter(([, v]) => !v.ok)
    .map(([k]) => k)

  return NextResponse.json({
    summary: failed.length === 0 ? "ALL STEPS PASSED" : `FAILED AT: ${failed.join(", ")}`,
    failedSteps: failed,
    steps: results,
    env: {
      NODE_ENV:           process.env.NODE_ENV,
      JWT_SECRET_set:     !!(process.env.JWT_SECRET),
      JWT_SECRET_length:  (process.env.JWT_SECRET ?? "").length,
      MONGODB_URI_set:    !!(process.env.MONGODB_URI),
    },
  })
}
