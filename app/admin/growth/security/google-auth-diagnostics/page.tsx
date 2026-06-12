"use client"

import { useEffect, useState } from "react"
import {
  Shield, Globe, Users, Mail, CheckCircle, XCircle,
  AlertTriangle, RefreshCw, Send, Clock, Link as LinkIcon,
} from "lucide-react"

interface DiagnosticsData {
  oauthConfig: {
    clientIdDetected:        boolean
    clientIdMasked:          string
    clientIdFormat:          "valid" | "invalid" | "missing"
    clientSecretPresent:     boolean
    redirectUri:             string
    redirectUriIsAdminLogin: boolean
    callbackRoute:           string
    googleReachable:         boolean
    googleLatencyMs:         number | null
    googleConnectivityError: string | null
  }
  authorizedUsers: {
    total:             number
    active:            number
    googleLoginsToday: number
  }
  smtp: {
    configured:    boolean
    smtpConnected: boolean
    smtpError:     string | null
    emailUser:     string | null
  }
  forgotPassword: {
    appUrl:                 string
    resetUrlTemplate:       string
    lastResetEmailSentAt:   string | null
    lastResetEmailSentTo:   string | null
    lastResetEmailFailedAt: string | null
    lastFailureReason:      string | null
  }
  asOf: string
}

type Status = "ok" | "warn" | "error"

function StatusDot({ status }: { status: Status }) {
  const cls = {
    ok:    "bg-green-500 shadow-green-500/60",
    warn:  "bg-amber-400 shadow-amber-400/60",
    error: "bg-red-500 shadow-red-500/60",
  }[status]
  return <span className={`inline-block w-2 h-2 rounded-full shadow-md ${cls}`} />
}

function StatusIcon({ status }: { status: Status }) {
  if (status === "ok")    return <CheckCircle size={14} className="text-green-400 shrink-0" />
  if (status === "warn")  return <AlertTriangle size={14} className="text-amber-400 shrink-0" />
  return <XCircle size={14} className="text-red-400 shrink-0" />
}

function Row({
  label,
  value,
  status,
  mono,
}: {
  label:   string
  value:   string
  status?: Status
  mono?:   boolean
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-800/60 last:border-0">
      {status && <StatusIcon status={status} />}
      <span className="text-xs text-gray-400 w-44 shrink-0">{label}</span>
      <span className={`text-xs font-medium text-gray-200 ${mono ? "font-mono" : ""} break-all`}>
        {value}
      </span>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, status }: {
  icon:   React.ComponentType<{ size?: number; className?: string }>
  title:  string
  status?: Status
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 bg-gray-900/60">
      <Icon size={13} className="text-gray-400" />
      <span className="text-xs font-semibold text-gray-200">{title}</span>
      {status && (
        <span className="ml-auto">
          <StatusDot status={status} />
        </span>
      )}
    </div>
  )
}

function fmt(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit",
  })
}

function oauthOverall(d: DiagnosticsData["oauthConfig"]): Status {
  if (!d.clientIdDetected || !d.clientSecretPresent) return "error"
  if (d.clientIdFormat !== "valid")                  return "error"
  if (!d.redirectUriIsAdminLogin)                    return "warn"
  if (!d.googleReachable)                            return "warn"
  return "ok"
}

function smtpOverall(d: DiagnosticsData["smtp"]): Status {
  if (!d.configured)    return "warn"
  if (!d.smtpConnected) return "error"
  return "ok"
}

export default function GoogleAuthDiagnosticsPage() {
  const [data,          setData]          = useState<DiagnosticsData | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState("")
  const [testEmailMsg,  setTestEmailMsg]  = useState("")
  const [testEmailLoading, setTestEmailLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const res  = await fetch("/api/admin/security/google-auth-diagnostics")
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? "Failed to load diagnostics"); return }
      setData(json)
    } catch { setError("Network error — check your connection") }
    finally  { setLoading(false) }
  }

  const sendTestEmail = async () => {
    setTestEmailLoading(true)
    setTestEmailMsg("")
    try {
      const res  = await fetch("/api/admin/security/google-auth-diagnostics", { method: "POST" })
      const json = await res.json()
      setTestEmailMsg(res.ok ? `✓ ${json.message}` : `✗ ${json.error}`)
    } catch { setTestEmailMsg("✗ Network error") }
    finally  { setTestEmailLoading(false) }
  }

  useEffect(() => { load() }, [])

  const allOk = data
    ? oauthOverall(data.oauthConfig) === "ok" && smtpOverall(data.smtp) === "ok"
    : false

  return (
    <div className="flex-1 bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 sticky top-[41px] z-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-blue-400" />
            <h1 className="text-sm font-bold text-white">Google Auth Diagnostics</h1>
            {!loading && data && (
              <div className="flex items-center gap-1.5 ml-2">
                <StatusDot status={allOk ? "ok" : "warn"} />
                <span className="text-[11px] text-gray-500">{allOk ? "All systems ok" : "Action required"}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!loading && data && (
              <span className="text-[11px] text-gray-600">As of {fmt(data.asOf)}</span>
            )}
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-3xl space-y-4">

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-red-300 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data && (
          <>
            {/* ── Section 1: Google OAuth Config ───────────────────────────── */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <SectionHeader
                icon={Globe}
                title="Google OAuth — Admin Login"
                status={oauthOverall(data.oauthConfig)}
              />
              <div className="px-4 py-1">
                <Row
                  label="Client ID"
                  value={data.oauthConfig.clientIdMasked}
                  status={
                    !data.oauthConfig.clientIdDetected ? "error" :
                    data.oauthConfig.clientIdFormat !== "valid" ? "warn" : "ok"
                  }
                  mono
                />
                <Row
                  label="Client ID Format"
                  value={data.oauthConfig.clientIdFormat}
                  status={data.oauthConfig.clientIdFormat === "valid" ? "ok" : data.oauthConfig.clientIdFormat === "missing" ? "error" : "warn"}
                />
                <Row
                  label="Client Secret"
                  value={data.oauthConfig.clientSecretPresent ? "Present" : "Missing"}
                  status={data.oauthConfig.clientSecretPresent ? "ok" : "error"}
                />
                <Row
                  label="Redirect URI"
                  value={data.oauthConfig.redirectUri}
                  status={
                    data.oauthConfig.redirectUri === "(not set)" ? "error" :
                    data.oauthConfig.redirectUriIsAdminLogin ? "ok" : "warn"
                  }
                  mono
                />
                <Row
                  label="Redirect URI Points To"
                  value={
                    data.oauthConfig.redirectUriIsAdminLogin
                      ? "Admin login callback ✓"
                      : "NOT the admin login callback — may be set to GSC/GA4 URI"
                  }
                  status={data.oauthConfig.redirectUriIsAdminLogin ? "ok" : "warn"}
                />
                <Row
                  label="Callback Route"
                  value={data.oauthConfig.callbackRoute}
                  status="ok"
                  mono
                />
                <Row
                  label="Google Connectivity"
                  value={
                    data.oauthConfig.googleReachable
                      ? `Connected${data.oauthConfig.googleLatencyMs !== null ? ` (${data.oauthConfig.googleLatencyMs}ms)` : ""}`
                      : `Unreachable — ${data.oauthConfig.googleConnectivityError ?? "unknown error"}`
                  }
                  status={data.oauthConfig.googleReachable ? "ok" : "error"}
                />
              </div>
            </div>

            {/* ── Missing-config instructions ───────────────────────────────── */}
            {(oauthOverall(data.oauthConfig) !== "ok") && (
              <div className="bg-amber-900/20 border border-amber-800 rounded-xl px-4 py-4 space-y-2">
                <p className="text-amber-300 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle size={13} />
                  Setup Required — Google Admin Login
                </p>
                <ol className="text-amber-200/80 text-xs space-y-1 list-decimal list-inside">
                  <li>
                    Go to{" "}
                    <span className="font-mono bg-gray-900 px-1 rounded">
                      console.cloud.google.com → APIs &amp; Services → Credentials
                    </span>
                  </li>
                  <li>Create an OAuth 2.0 Client ID — application type: <strong>Web application</strong></li>
                  <li>
                    Add both authorised redirect URIs:
                    <br />
                    <span className="font-mono text-amber-300">https://www.100xcircle.com/api/admin/auth/google/callback</span>
                    <br />
                    <span className="font-mono text-amber-300">https://100xcircle.in/api/admin/auth/google/callback</span>
                  </li>
                  <li>
                    Set three Vercel env vars:{" "}
                    <span className="font-mono bg-gray-900 px-1 rounded">GOOGLE_LOGIN_CLIENT_ID</span>
                    {" · "}
                    <span className="font-mono bg-gray-900 px-1 rounded">GOOGLE_LOGIN_CLIENT_SECRET</span>
                    {" · "}
                    <span className="font-mono bg-gray-900 px-1 rounded">GOOGLE_LOGIN_REDIRECT_URI</span>
                  </li>
                  <li>If the OAuth app is in Testing mode, add your email as a Test User or publish to Production.</li>
                  <li>Redeploy after setting env vars.</li>
                </ol>
              </div>
            )}

            {/* ── Section 2: Authorized Users ───────────────────────────────── */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <SectionHeader icon={Users} title="Authorized Users" />
              <div className="px-4 py-1">
                <Row label="Total users in system" value={String(data.authorizedUsers.total)} status="ok" />
                <Row
                  label="Active (can log in)"
                  value={String(data.authorizedUsers.active)}
                  status={data.authorizedUsers.active > 0 ? "ok" : "warn"}
                />
                <Row label="Google logins today" value={String(data.authorizedUsers.googleLoginsToday)} />
              </div>
              <div className="px-4 py-3 border-t border-gray-800 text-[11px] text-gray-500">
                Only users in <span className="font-mono">rbac_users</span> with{" "}
                <span className="font-mono">isActive: true</span> can sign in via Google.
                Google login never creates users automatically.
              </div>
            </div>

            {/* ── Section 3: SMTP / Email ───────────────────────────────────── */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <SectionHeader icon={Mail} title="SMTP — Forgot Password Email" status={smtpOverall(data.smtp)} />
              <div className="px-4 py-1">
                <Row
                  label="Email configured"
                  value={data.smtp.configured ? "Yes" : "No — set EMAIL_USER and EMAIL_APP_PASSWORD"}
                  status={data.smtp.configured ? "ok" : "warn"}
                />
                {data.smtp.emailUser && (
                  <Row label="Email account" value={data.smtp.emailUser} status="ok" mono />
                )}
                <Row
                  label="SMTP connection"
                  value={data.smtp.smtpConnected ? "Connected (Gmail SMTP)" : data.smtp.smtpError ?? "Not connected"}
                  status={data.smtp.smtpConnected ? "ok" : data.smtp.configured ? "error" : "warn"}
                />
              </div>
            </div>

            {/* ── Section 4: Forgot Password / Reset URL ────────────────────── */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <SectionHeader icon={LinkIcon} title="Reset URL &amp; Forgot Password" />
              <div className="px-4 py-1">
                <Row
                  label="App base URL"
                  value={data.forgotPassword.appUrl}
                  status={data.forgotPassword.appUrl.startsWith("http") ? "ok" : "warn"}
                  mono
                />
                <Row
                  label="Reset URL template"
                  value={data.forgotPassword.resetUrlTemplate}
                  mono
                />
                <Row
                  label="Last reset email sent"
                  value={
                    data.forgotPassword.lastResetEmailSentAt
                      ? `${fmt(data.forgotPassword.lastResetEmailSentAt)} → ${data.forgotPassword.lastResetEmailSentTo ?? "?"}`
                      : "None on record"
                  }
                />
                <Row
                  label="Last reset email failed"
                  value={
                    data.forgotPassword.lastResetEmailFailedAt
                      ? `${fmt(data.forgotPassword.lastResetEmailFailedAt)} — ${data.forgotPassword.lastFailureReason ?? "unknown reason"}`
                      : "No failures on record"
                  }
                  status={data.forgotPassword.lastResetEmailFailedAt ? "warn" : undefined}
                />
              </div>
            </div>

            {/* ── Test Email ────────────────────────────────────────────────── */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-300 mb-1 flex items-center gap-2">
                <Send size={12} className="text-gray-400" />
                Send Test Email
              </p>
              <p className="text-[11px] text-gray-500 mb-3">
                Sends a test welcome email to your account to verify end-to-end SMTP delivery.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={sendTestEmail}
                  disabled={testEmailLoading || !data.smtp.configured}
                  className="flex items-center gap-2 text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Send size={12} />
                  {testEmailLoading ? "Sending…" : "Send Test Email"}
                </button>
                {testEmailMsg && (
                  <span className={`text-xs ${testEmailMsg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>
                    {testEmailMsg}
                  </span>
                )}
              </div>
              {!data.smtp.configured && (
                <p className="text-[11px] text-amber-400 mt-2">
                  Email not configured — set <span className="font-mono">EMAIL_USER</span> and{" "}
                  <span className="font-mono">EMAIL_APP_PASSWORD</span> in Vercel first.
                </p>
              )}
            </div>

            {/* ── All-ok banner ─────────────────────────────────────────────── */}
            {allOk && (
              <div className="bg-green-900/20 border border-green-800 rounded-xl px-5 py-4 flex items-center gap-3">
                <CheckCircle size={18} className="text-green-400" />
                <p className="text-green-300 text-sm font-medium">
                  Google OAuth and SMTP are fully configured and reachable.
                </p>
              </div>
            )}

            {/* ── Timestamp ─────────────────────────────────────────────────── */}
            <p className="text-[11px] text-gray-700 flex items-center gap-1">
              <Clock size={10} />
              Snapshot taken at {fmt(data.asOf)} · Refresh to rerun live SMTP + connectivity tests.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
