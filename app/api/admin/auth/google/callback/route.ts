// GET /api/admin/auth/google/callback
// Handles the OAuth 2.0 authorization code callback from Google.
// Verifies state (CSRF), exchanges code+PKCE verifier for tokens,
// fetches user info, and issues a session JWT — same flow as password login.
// NEVER auto-creates users. Only existing rbac_users can log in.

import { type NextRequest, NextResponse } from "next/server"
import {
  consumeOAuthState,
  exchangeCodeForTokens,
  getGoogleUserInfo,
} from "@/lib/rbac/googleOAuth"
import clientPromise from "@/lib/mongodb"
import { signJWT, SESSION_COOKIE, SESSION_MAX_AGE, getRoleTimeout } from "@/lib/rbac/jwt"
import { getEffectivePermissions } from "@/lib/rbac/engine"
import { writeAuditLog } from "@/lib/rbac/server"
import { createSession, ensureSessionIndexes } from "@/lib/rbac/sessions"
import { writeAuthAuditLog } from "@/lib/authAuditLog"
import { getDefaultLandingPage } from "@/lib/rbac/landing"
import type { DBUser } from "@/lib/rbac/types"

function getBaseUrl(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL
    ?? `${request.nextUrl.protocol}//${request.nextUrl.host}`
}

function loginRedirect(request: NextRequest, error: string): NextResponse {
  const url = new URL("/admin/login", getBaseUrl(request))
  url.searchParams.set("error", error)
  const res = NextResponse.redirect(url)
  res.cookies.delete("__oauth_state")
  return res
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  )
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code       = searchParams.get("code")
  const state      = searchParams.get("state")
  const errorParam = searchParams.get("error")

  const ip = getClientIp(request)
  const ua = request.headers.get("user-agent") ?? "unknown"

  // User denied Google login
  if (errorParam) {
    return loginRedirect(request, "google_denied")
  }

  if (!code || !state) {
    return loginRedirect(request, "google_invalid_callback")
  }

  // ── CSRF validation: state must match the cookie set at initiation ─────────
  const cookieState = request.cookies.get("__oauth_state")?.value
  if (!cookieState || cookieState !== state) {
    await writeAuthAuditLog("oauth_state_invalid", "unknown", ip, ua, {
      reason: "state_mismatch",
    })
    return loginRedirect(request, "google_state_invalid")
  }

  // ── Consume state from DB (retrieves code_verifier, prevents replay) ───────
  const stateData = await consumeOAuthState(state)
  if (!stateData) {
    return loginRedirect(request, "google_state_expired")
  }

  const clientId     = (process.env.GOOGLE_LOGIN_CLIENT_ID ?? "").trim()
  const clientSecret = (process.env.GOOGLE_LOGIN_CLIENT_SECRET ?? "").trim()
  const redirectUri  = (process.env.GOOGLE_LOGIN_REDIRECT_URI ?? "").trim()

  // ── Exchange authorization code + PKCE verifier for access token ───────────
  const tokens = await exchangeCodeForTokens({
    code,
    codeVerifier: stateData.codeVerifier,
    clientId,
    clientSecret,
    redirectUri,
  })

  if (!tokens?.access_token) {
    await writeAuthAuditLog("google_login_failed", "unknown", ip, ua, {
      reason: "token_exchange_failed",
    })
    return loginRedirect(request, "google_token_exchange_failed")
  }

  // ── Fetch Google user info ─────────────────────────────────────────────────
  const googleUser = await getGoogleUserInfo(tokens.access_token)
  if (!googleUser) {
    await writeAuthAuditLog("google_login_failed", "unknown", ip, ua, {
      reason: "userinfo_failed",
    })
    return loginRedirect(request, "google_userinfo_failed")
  }

  // ── Require verified email (Google accounts with unverified emails) ─────────
  if (!googleUser.email_verified) {
    await writeAuthAuditLog("google_login_failed", googleUser.email, ip, ua, {
      reason: "email_not_verified",
    })
    return loginRedirect(request, "google_email_not_verified")
  }

  const email = googleUser.email.toLowerCase().trim()

  // ── Look up existing user — NEVER auto-create ──────────────────────────────
  const db     = (await clientPromise).db()
  const dbUser = await db.collection<DBUser>("rbac_users").findOne({
    email,
    isActive: true,
  })

  if (!dbUser) {
    await writeAuthAuditLog("google_login_failed", email, ip, ua, {
      reason: "user_not_found_or_disabled",
    })
    return loginRedirect(request, "google_access_denied")
  }

  // ── Issue session + JWT (identical flow to password login) ─────────────────
  const permissions = await getEffectivePermissions(String(dbUser._id), dbUser.role)
  await ensureSessionIndexes()

  const sessionId = await createSession({
    userId:    String(dbUser._id),
    userEmail: dbUser.email,
    userName:  dbUser.name,
    userRole:  dbUser.role,
    ip,
    userAgent: ua,
  })

  const ttl   = getRoleTimeout(dbUser.role)
  const token = await signJWT(
    {
      sub:         String(dbUser._id),
      email:       dbUser.email,
      name:        dbUser.name,
      role:        dbUser.role,
      permissions,
      sessionId,
    },
    ttl
  )

  // Update last login + history
  await db.collection("rbac_users").updateOne(
    { email },
    {
      $set: {
        lastLoginAt:      new Date(),
        failedLoginCount: 0,
        lockUntil:        null,
        lockedAt:         null,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $push: {
        loginHistory: {
          $each:  [{ ip, userAgent: ua, timestamp: new Date(), success: true, method: "google", googleSub: googleUser.sub }],
          $slice: -50,
        },
      } as any,
    }
  )

  await writeAuditLog(
    {
      sub:         String(dbUser._id),
      email:       dbUser.email,
      name:        dbUser.name,
      role:        dbUser.role,
      permissions,
      sessionId,
      iat:         0,
      exp:         0,
    },
    "google_login",
    "auth",
    { email, sessionId, method: "google", googleSub: googleUser.sub },
    request
  )

  const destinationPage = getDefaultLandingPage(dbUser.role)
  await writeAuthAuditLog("google_login", email, ip, ua, { sessionId, destination_page: destinationPage }, String(dbUser._id))

  // ── Set session cookie and redirect to role-specific landing page ──────────
  const dashboardUrl = new URL(destinationPage, getBaseUrl(request))
  const response     = NextResponse.redirect(dashboardUrl)

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",   // lax required: cookie is set on a redirect from Google
    maxAge:   SESSION_MAX_AGE,
    path:     "/",
  })
  response.cookies.delete("__oauth_state")
  return response
}
