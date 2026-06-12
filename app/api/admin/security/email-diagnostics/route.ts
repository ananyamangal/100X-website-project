// GET /api/admin/security/email-diagnostics
// Returns SMTP connection status, last email events, and provider config.
// Requires settings.view permission (super_admin / growth_admin).

import { type NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
import clientPromise from "@/lib/mongodb"
import { isEmailConfigured } from "@/lib/email"
import { requirePermission, isAuthResult } from "@/lib/rbac/server"

// POST — send a test email to the currently logged-in user
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "settings.view")
  if (!isAuthResult(auth)) return auth

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Email not configured. Set EMAIL_USER and EMAIL_APP_PASSWORD environment variables." },
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

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "settings.view")
  if (!isAuthResult(auth)) return auth

  const configured  = isEmailConfigured()
  const emailUser   = process.env.EMAIL_USER ?? null
  const rawPass     = process.env.EMAIL_APP_PASSWORD ?? null

  let smtpConnected = false
  let smtpAuthOk    = false
  let smtpError: string | null = null
  let smtpHost: string | null  = null

  if (configured && emailUser && rawPass) {
    try {
      const cleanPass = rawPass.replace(/\s+/g, "")
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth:    { user: emailUser, pass: cleanPass },
      })
      // verify() performs SMTP EHLO + AUTH without sending a message
      await transporter.verify()
      smtpConnected = true
      smtpAuthOk    = true
      smtpHost      = "smtp.gmail.com:465"
    } catch (err) {
      smtpError = err instanceof Error ? err.message : String(err)
    }
  }

  // Fetch last email events from auth_audit_log
  const db = (await clientPromise).db()

  const [lastSent, lastFailed, sentCount7d, failedCount7d] = await Promise.all([
    db.collection("auth_audit_log").findOne(
      { action: "password_reset_requested", "details.emailSent": true },
      { sort: { timestamp: -1 }, projection: { timestamp: 1, email: 1 } }
    ),
    db.collection("auth_audit_log").findOne(
      { action: "password_reset_requested", "details.emailSent": false },
      { sort: { timestamp: -1 }, projection: { timestamp: 1, "details.reason": 1 } }
    ),
    db.collection("auth_audit_log").countDocuments({
      action:    "password_reset_requested",
      "details.emailSent": true,
      timestamp: { $gte: new Date(Date.now() - 7 * 24 * 3600_000) },
    }),
    db.collection("auth_audit_log").countDocuments({
      action:    "password_reset_requested",
      "details.emailSent": false,
      timestamp: { $gte: new Date(Date.now() - 7 * 24 * 3600_000) },
    }),
  ])

  const total7d   = sentCount7d + failedCount7d
  const successRate = total7d > 0
    ? Math.round((sentCount7d / total7d) * 100)
    : null

  // Rate limit: Gmail free tier = 500 emails/day
  // We don't track this but can document it
  return NextResponse.json({
    provider:          configured ? "Gmail (SMTP via nodemailer)" : null,
    configured,
    emailUser:         emailUser
      ? `${emailUser.slice(0, 3)}****@${emailUser.split("@")[1] ?? "?"}`
      : null,
    smtpHost,
    smtpConnected,
    smtpAuthOk,
    smtpError,
    lastEmailSentAt:    lastSent?.timestamp    ?? null,
    lastEmailSentTo:    lastSent?.email        ?? null,
    lastEmailFailedAt:  lastFailed?.timestamp  ?? null,
    lastFailureReason:  (lastFailed?.details as Record<string, unknown>)?.reason ?? null,
    sentLast7d:         sentCount7d,
    failedLast7d:       failedCount7d,
    successRateLast7d:  successRate,
    rateLimit:          "~500 emails/day (Gmail free tier)",
    queueSize:          0,   // nodemailer sends synchronously — no queue
    asOf:               new Date().toISOString(),
  })
}
