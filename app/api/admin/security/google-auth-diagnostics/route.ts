// GET /api/admin/security/google-auth-diagnostics
// Returns Google OAuth (admin login) config health + SMTP / forgot-password status.
// POST — sends a test email to the requesting user.
// Requires settings.view permission.

import { type NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
import clientPromise from "@/lib/mongodb"
import { isEmailConfigured } from "@/lib/email"
import { requirePermission, isAuthResult } from "@/lib/rbac/server"

// Google Web Client IDs follow: DIGITS-ALPHANUMCHARS.apps.googleusercontent.com
const CLIENT_ID_PATTERN = /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/i

function validateClientIdFormat(id: string): "valid" | "invalid" | "missing" {
  if (!id) return "missing"
  return CLIENT_ID_PATTERN.test(id) ? "valid" : "invalid"
}

function maskClientId(id: string): string {
  if (!id) return "(not set)"
  return id.length > 8 ? `${id.slice(0, 8)}...` : `${id.slice(0, 3)}...`
}

async function testGoogleConnectivity(): Promise<{ reachable: boolean; latencyMs: number | null; error: string | null }> {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const res = await fetch("https://accounts.google.com/.well-known/openid-configuration", {
      signal: controller.signal,
    })
    clearTimeout(timer)
    const latencyMs = Date.now() - start
    return { reachable: res.ok, latencyMs, error: res.ok ? null : `HTTP ${res.status}` }
  } catch (err) {
    return {
      reachable:  false,
      latencyMs:  null,
      error:      err instanceof Error ? err.message : String(err),
    }
  }
}

async function testSmtp(): Promise<{ connected: boolean; error: string | null }> {
  if (!isEmailConfigured()) return { connected: false, error: "EMAIL_USER or EMAIL_APP_PASSWORD not set" }
  const emailUser = process.env.EMAIL_USER!
  const rawPass   = process.env.EMAIL_APP_PASSWORD!
  try {
    const t = nodemailer.createTransport({
      service: "gmail",
      auth: { user: emailUser, pass: rawPass.replace(/\s+/g, "") },
    })
    await t.verify()
    return { connected: true, error: null }
  } catch (e) {
    return { connected: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "settings.view")
  if (!isAuthResult(auth)) return auth

  const clientId     = (process.env.GOOGLE_LOGIN_CLIENT_ID ?? "").trim()
  const clientSecret = (process.env.GOOGLE_LOGIN_CLIENT_SECRET ?? "").trim()
  const redirectUri  = (process.env.GOOGLE_LOGIN_REDIRECT_URI ?? "").trim()
  const appUrl       = (process.env.NEXT_PUBLIC_APP_URL ?? "https://100xcircle.in").trim()
  const emailUser    = process.env.EMAIL_USER ?? null

  const [googleConn, smtpResult, dbResult] = await Promise.all([
    testGoogleConnectivity(),
    testSmtp(),
    (async () => {
      const db         = (await clientPromise).db()
      const now        = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      const [
        totalUsers,
        activeUsers,
        googleLoginsToday,
        lastSent,
        lastFailed,
      ] = await Promise.all([
        db.collection("rbac_users").countDocuments({}),
        db.collection("rbac_users").countDocuments({ isActive: true }),
        db.collection("auth_audit_log").countDocuments({
          action:    "google_login",
          timestamp: { $gte: todayStart },
        }),
        db.collection("auth_audit_log").findOne(
          { action: "password_reset_requested", "details.emailSent": true },
          { sort: { timestamp: -1 }, projection: { timestamp: 1, email: 1 } }
        ),
        db.collection("auth_audit_log").findOne(
          { action: "password_reset_requested", "details.emailSent": false },
          { sort: { timestamp: -1 }, projection: { timestamp: 1, "details.reason": 1 } }
        ),
      ])

      return { totalUsers, activeUsers, googleLoginsToday, lastSent, lastFailed }
    })(),
  ])

  const clientIdFormat = validateClientIdFormat(clientId)
  const redirectUriOk  = redirectUri.includes("/api/admin/auth/google/callback")

  return NextResponse.json({
    oauthConfig: {
      clientIdDetected:      clientId.length > 0,
      clientIdMasked:        maskClientId(clientId),
      clientIdFormat,
      clientSecretPresent:   clientSecret.length > 0,
      redirectUri:           redirectUri || "(not set)",
      redirectUriIsAdminLogin: redirectUriOk,
      callbackRoute:         "/api/admin/auth/google/callback",
      googleReachable:       googleConn.reachable,
      googleLatencyMs:       googleConn.latencyMs,
      googleConnectivityError: googleConn.error,
    },
    authorizedUsers: {
      total:             dbResult.totalUsers,
      active:            dbResult.activeUsers,
      googleLoginsToday: dbResult.googleLoginsToday,
    },
    smtp: {
      configured:    isEmailConfigured(),
      smtpConnected: smtpResult.connected,
      smtpError:     smtpResult.error,
      emailUser:     emailUser
        ? `${emailUser.slice(0, 3)}****@${emailUser.split("@")[1] ?? "?"}`
        : null,
    },
    forgotPassword: {
      appUrl,
      resetUrlTemplate:       `${appUrl}/admin/reset-password?token=<token>`,
      lastResetEmailSentAt:   dbResult.lastSent?.timestamp  ?? null,
      lastResetEmailSentTo:   dbResult.lastSent?.email      ?? null,
      lastResetEmailFailedAt: dbResult.lastFailed?.timestamp ?? null,
      lastFailureReason:      (dbResult.lastFailed?.details as Record<string, unknown>)?.reason ?? null,
    },
    asOf: new Date().toISOString(),
  })
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "settings.view")
  if (!isAuthResult(auth)) return auth

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Email not configured. Set EMAIL_USER and EMAIL_APP_PASSWORD in Vercel." },
      { status: 503 }
    )
  }

  const { renderAndSend } = await import("@/lib/emailTemplates")
  const result = await renderAndSend(
    "welcome",
    {
      NAME:          auth.user.name,
      EMAIL:         auth.user.email,
      ROLE:          auth.user.role,
      TEMP_PASSWORD: "(this is a test — no password change required)",
    },
    auth.user.email
  )

  if (!result.ok) {
    return NextResponse.json({ error: `Test email failed: ${result.error}` }, { status: 503 })
  }
  return NextResponse.json({ ok: true, message: `Test email sent to ${auth.user.email}` })
}
