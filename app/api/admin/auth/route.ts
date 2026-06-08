import { type NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import clientPromise from "@/lib/mongodb"
import { signJWT, SESSION_COOKIE, getRoleTimeout } from "@/lib/rbac/jwt"
import { verifyPassword } from "@/lib/rbac/password"
import { getEffectivePermissions } from "@/lib/rbac/engine"
import { writeAuditLog } from "@/lib/rbac/server"
import { createSession, ensureSessionIndexes } from "@/lib/rbac/sessions"
import type { DBUser } from "@/lib/rbac/types"

function legacySha256(password: string): string {
  return createHash("sha256").update(`100x-admin-v1:${password}`).digest("hex")
}

function setCookie(response: NextResponse, token: string, maxAge: number) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge,
    path: "/",
  })
}

export async function POST(request: NextRequest) {
  try {
    const body     = await request.json()
    const email    = (body.email as string | undefined)?.trim().toLowerCase() ?? ""
    const password = (body.password as string | undefined) ?? ""

    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 400 })
    }

    const client = await clientPromise
    const db     = client.db()

    // ── Path 1: email + password (new per-user auth) ──────────────────────────
    if (email) {
      const dbUser = await db.collection<DBUser>("rbac_users").findOne({
        email: email,
        isActive: true,
      })

      if (!dbUser) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
      }

      const valid = verifyPassword(password, dbUser.passwordHash)
      if (!valid) {
        // Log failed attempt
        await db.collection("rbac_users").updateOne(
          { email },
          {
            $push: {
              loginHistory: {
                $each: [{ ip: request.headers.get("x-forwarded-for") ?? "unknown", userAgent: request.headers.get("user-agent") ?? "", timestamp: new Date(), success: false }],
                $slice: -50,
              },
            },
          }
        )
        await writeAuditLog(null, "login_failed", "auth", { email }, request)
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
      }

      const permissions = await getEffectivePermissions(String(dbUser._id), dbUser.role)
      await ensureSessionIndexes()

      const sessionId = await createSession({
        userId:    String(dbUser._id),
        userEmail: dbUser.email,
        userName:  dbUser.name,
        userRole:  dbUser.role,
        ip:        request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown",
        userAgent: request.headers.get("user-agent") ?? "",
      })

      const ttl   = getRoleTimeout(dbUser.role)
      const token = await signJWT({
        sub: String(dbUser._id),
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        permissions,
        sessionId,
      }, ttl)

      // Update last login + history
      await db.collection("rbac_users").updateOne(
        { email },
        {
          $set: { lastLoginAt: new Date() },
          $push: {
            loginHistory: {
              $each: [{ ip: request.headers.get("x-forwarded-for") ?? "unknown", userAgent: request.headers.get("user-agent") ?? "", timestamp: new Date(), success: true }],
              $slice: -50,
            },
          },
        }
      )

      await writeAuditLog(
        { sub: String(dbUser._id), email: dbUser.email, name: dbUser.name, role: dbUser.role, permissions, sessionId, iat: 0, exp: 0 },
        "login",
        "auth",
        { email, sessionId },
        request
      )

      const response = NextResponse.json({ success: true, role: dbUser.role })
      setCookie(response, token, ttl)
      return response
    }

    // ── Path 2: password-only (legacy super admin — backward compat) ──────────
    let legacyMatch = false

    // Check MongoDB override hash
    try {
      const settings = await db.collection("admin_settings").findOne({ key: "password" })
      if (settings?.hash && legacySha256(password) === String(settings.hash)) {
        legacyMatch = true
      }
    } catch {
      // DB unavailable — fall through
    }

    if (!legacyMatch) {
      const envPassword = process.env.ADMIN_PASSWORD || "dtu@ananya"
      legacyMatch = password === envPassword
    }

    if (!legacyMatch) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Legacy login: issue super-admin JWT (or legacy cookie if no JWT_SECRET configured)
    // Try to find the super admin in DB first
    const superAdmin = await db.collection<DBUser>("rbac_users").findOne({
      role: "super_admin",
      isActive: true,
    })

    let token: string

    if (superAdmin) {
      const permissions = await getEffectivePermissions(String(superAdmin._id), superAdmin.role)
      await ensureSessionIndexes()
      const sessionId = await createSession({
        userId:    String(superAdmin._id),
        userEmail: superAdmin.email,
        userName:  superAdmin.name,
        userRole:  superAdmin.role,
        ip:        request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown",
        userAgent: request.headers.get("user-agent") ?? "",
      })
      const ttl = getRoleTimeout(superAdmin.role)
      token = await signJWT({
        sub: String(superAdmin._id),
        email: superAdmin.email,
        name: superAdmin.name,
        role: superAdmin.role,
        permissions,
        sessionId,
      }, ttl)

      await db.collection("rbac_users").updateOne(
        { _id: superAdmin._id },
        { $set: { lastLoginAt: new Date() } }
      )
    } else {
      // No DB users yet — issue a minimal super-admin JWT for migration
      const { ROLE_PERMISSIONS } = await import("@/lib/rbac/roles")
      token = await signJWT({
        sub: "legacy-super-admin",
        email: "sulabh.mangal@gmail.com",
        name: "Super Admin",
        role: "super_admin",
        permissions: ROLE_PERMISSIONS.super_admin,
      }, getRoleTimeout("super_admin"))
    }

    await writeAuditLog(
      { sub: "legacy", email: "legacy-admin", name: "Legacy Admin", role: "super_admin", permissions: [], iat: 0, exp: 0 },
      "login",
      "auth",
      { method: "legacy-password" },
      request
    )

    const response = NextResponse.json({ success: true, role: "super_admin" })
    setCookie(response, token, getRoleTimeout("super_admin"))
    return response
  } catch (error) {
    console.error("Auth error:", error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}
