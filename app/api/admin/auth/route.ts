import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { signJWT, SESSION_COOKIE, SESSION_MAX_AGE, getRoleTimeout } from "@/lib/rbac/jwt"
import { verifyPassword } from "@/lib/rbac/password"
import { getEffectivePermissions } from "@/lib/rbac/engine"
import { writeAuditLog } from "@/lib/rbac/server"
import { createSession, ensureSessionIndexes } from "@/lib/rbac/sessions"
import { getDefaultLandingPage } from "@/lib/rbac/landing"
import type { DBUser } from "@/lib/rbac/types"

function setCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_MAX_AGE,  // always 24h — JWT TTL is enforced by the JWT exp claim
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

      // Check lockout
      if (dbUser.lockUntil && new Date(dbUser.lockUntil) > new Date()) {
        const mins = Math.ceil((new Date(dbUser.lockUntil).getTime() - Date.now()) / 60000)
        return NextResponse.json(
          { error: `Account locked due to too many failed attempts. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.` },
          { status: 423 }
        )
      }

      const valid = verifyPassword(password, dbUser.passwordHash)
      if (!valid) {
        const newFailCount = (dbUser.failedLoginCount ?? 0) + 1
        const lockUpdate: Record<string, unknown> = { failedLoginCount: newFailCount }
        if (newFailCount >= 5) {
          lockUpdate.lockUntil = new Date(Date.now() + 30 * 60 * 1000) // 30 min
          lockUpdate.lockedAt  = new Date()
        }
        await db.collection("rbac_users").updateOne(
          { email },
          {
            $set: lockUpdate,
            $push: {
              loginHistory: {
                $each: [{ ip: request.headers.get("x-forwarded-for") ?? "unknown", userAgent: request.headers.get("user-agent") ?? "", timestamp: new Date(), success: false }],
                $slice: -50,
              },
            },
          }
        )
        await writeAuditLog(null, "login_failed", "auth", { email, failedCount: newFailCount }, request)
        if (newFailCount >= 5) {
          return NextResponse.json(
            { error: "Account locked for 30 minutes after 5 failed attempts." },
            { status: 423 }
          )
        }
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

      // Update last login + history, reset lockout
      await db.collection("rbac_users").updateOne(
        { email },
        {
          $set: { lastLoginAt: new Date(), failedLoginCount: 0, lockUntil: null, lockedAt: null },
          $push: {
            loginHistory: {
              $each: [{ ip: request.headers.get("x-forwarded-for") ?? "unknown", userAgent: request.headers.get("user-agent") ?? "", timestamp: new Date(), success: true }],
              $slice: -50,
            },
          },
        }
      )

      const destinationPage = getDefaultLandingPage(dbUser.role)
      await writeAuditLog(
        { sub: String(dbUser._id), email: dbUser.email, name: dbUser.name, role: dbUser.role, permissions, sessionId, iat: 0, exp: 0 },
        "login",
        "auth",
        { email, sessionId, destination_page: destinationPage },
        request
      )

      const response = NextResponse.json({ success: true, role: dbUser.role, destination: destinationPage })
      setCookie(response, token)
      return response
    }

    // Email is required — legacy password-only path has been removed
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  } catch (error) {
    console.error("Auth error:", error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}
