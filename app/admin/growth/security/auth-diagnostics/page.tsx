"use client"

import React, { useState } from "react"
import {
  Search, CheckCircle, XCircle, AlertTriangle, RefreshCw,
  User, Shield, Key, Activity, Mail, Clock, Lock,
  ChevronDown, ChevronRight,
} from "lucide-react"

interface DiagResult {
  email: string
  summary: "PASS" | "ISSUES_FOUND" | "FAIL"
  failReason?: string
  issues: string[]
  checks: {
    userExists?: boolean
    userId?: string
    userName?: string
    isActive?: boolean
    passwordHashExists?: boolean
    passwordHashFormat?: string
    roleAssigned?: boolean
    role?: string
    permissionsAssigned?: boolean
    permissionsCount?: number
    permissionsBase?: number
    permissionsGranted?: number
    permissionsDenied?: number
    permissionsEffective?: string[]
    permissionsError?: string
    totalSessions?: number
    activeSessions?: number
    revokedSessions?: number
    expiredSessions?: number
    lastLoginAt?: string | null
    failedLoginCount?: number
    lockedAt?: string | null
    passwordChangedAt?: string | null
    emailConfigured?: boolean
    pendingResetTokens?: number
    hasCustomPermissions?: boolean
    grantedOverrides?: number
    deniedOverrides?: number
    recentLogins?: Array<{ timestamp: string; success: boolean; ip: string }>
  }
}

function StatusIcon({ ok, warn }: { ok: boolean; warn?: boolean }) {
  if (ok) return <CheckCircle size={14} className="text-green-400 shrink-0" />
  if (warn) return <AlertTriangle size={14} className="text-amber-400 shrink-0" />
  return <XCircle size={14} className="text-red-400 shrink-0" />
}

function Row({ label, ok, value, warn }: { label: string; ok: boolean; value?: string | number | null; warn?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-800/50">
      <StatusIcon ok={ok} warn={warn} />
      <span className="text-gray-300 text-xs w-44 shrink-0">{label}</span>
      <span className={`text-xs font-mono ${ok ? "text-green-300" : warn ? "text-amber-300" : "text-red-300"}`}>
        {value !== undefined && value !== null ? String(value) : ok ? "OK" : "FAIL"}
      </span>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-gray-900/60 hover:bg-gray-900 transition-colors"
      >
        <Icon size={14} className="text-gray-400" />
        <span className="text-gray-200 text-xs font-semibold">{title}</span>
        <span className="ml-auto text-gray-600">{open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
      </button>
      {open && <div className="px-4 py-2 bg-gray-950/40">{children}</div>}
    </div>
  )
}

export default function AuthDiagnosticsPage() {
  const [email,   setEmail]   = useState("")
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState<DiagResult | null>(null)
  const [error,   setError]   = useState("")

  const run = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const res  = await fetch(`/api/admin/security/auth-diagnostics?email=${encodeURIComponent(email.trim().toLowerCase())}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Diagnostic failed"); return }
      setResult(data)
    } catch { setError("Network error") }
    finally  { setLoading(false) }
  }

  const c = result?.checks ?? {}

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-white text-xl font-bold">Auth Diagnostics</h1>
          <p className="text-gray-500 text-sm mt-1">
            Inspect the full login flow for any email without logging them in.
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={run} className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-green-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg px-5 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
            Inspect
          </button>
        </form>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-red-300 text-sm">{error}</div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">

            {/* Summary banner */}
            <div className={`rounded-xl px-5 py-4 border ${
              result.summary === "PASS"
                ? "bg-green-900/20 border-green-800"
                : result.summary === "FAIL"
                  ? "bg-red-900/20 border-red-800"
                  : "bg-amber-900/20 border-amber-800"
            }`}>
              <div className="flex items-center gap-3">
                {result.summary === "PASS"
                  ? <CheckCircle size={20} className="text-green-400" />
                  : result.summary === "FAIL"
                    ? <XCircle size={20} className="text-red-400" />
                    : <AlertTriangle size={20} className="text-amber-400" />
                }
                <div>
                  <p className={`font-semibold text-sm ${
                    result.summary === "PASS" ? "text-green-300"
                    : result.summary === "FAIL" ? "text-red-300"
                    : "text-amber-300"
                  }`}>
                    {result.summary === "PASS" ? "All checks passed — login should work"
                     : result.summary === "FAIL" ? `Login impossible — ${result.failReason}`
                     : `${result.issues.length} issue${result.issues.length !== 1 ? "s" : ""} detected`}
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">{result.email}</p>
                </div>
              </div>
              {result.issues.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {result.issues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-amber-200">
                      <AlertTriangle size={11} className="text-amber-400 mt-0.5 shrink-0" />
                      {issue}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Identity */}
            <Section title="Identity & Account Status" icon={User}>
              <Row label="User exists in DB"    ok={Boolean(c.userExists)}  value={c.userId ? `ID: ${c.userId}` : undefined} />
              <Row label="Account active"       ok={Boolean(c.isActive)}   value={c.isActive ? "Active" : "Inactive / Disabled"} />
              <Row label="Account locked"       ok={!c.lockedAt}           value={c.lockedAt ? `Locked at ${new Date(c.lockedAt).toLocaleString()}` : "Not locked"} />
              <Row label="Failed login count"   ok={(c.failedLoginCount ?? 0) < 5} warn={(c.failedLoginCount ?? 0) >= 3 && (c.failedLoginCount ?? 0) < 5}
                value={`${c.failedLoginCount ?? 0} failed attempts`} />
            </Section>

            {/* Password */}
            <Section title="Password & Hash" icon={Key}>
              <Row label="Password hash exists" ok={Boolean(c.passwordHashExists)} />
              <Row label="Hash format"          ok={c.passwordHashFormat === "pbkdf2 (correct)"}  value={c.passwordHashFormat} />
              <Row label="Password last changed" ok={true} warn={!c.passwordChangedAt}
                value={c.passwordChangedAt ? new Date(c.passwordChangedAt).toLocaleString() : "Never changed"} />
              <Row label="Pending reset tokens"  ok={(c.pendingResetTokens ?? 0) === 0} warn={(c.pendingResetTokens ?? 0) > 0}
                value={`${c.pendingResetTokens ?? 0} pending`} />
            </Section>

            {/* Role & Permissions */}
            <Section title="Role & Permissions" icon={Shield}>
              <Row label="Role assigned"          ok={Boolean(c.roleAssigned)}         value={c.role ?? "none"} />
              <Row label="Effective permissions"  ok={(c.permissionsCount ?? 0) > 0}   value={`${c.permissionsCount ?? 0} permissions`} />
              <Row label="Base (role) perms"      ok={(c.permissionsBase ?? 0) > 0}    value={`${c.permissionsBase ?? 0}`} />
              <Row label="Granted overrides"      ok={true}                            value={`+${c.permissionsGranted ?? 0}`} />
              <Row label="Denied overrides"       ok={(c.permissionsDenied ?? 0) === 0} warn={(c.permissionsDenied ?? 0) > 0}
                value={`-${c.permissionsDenied ?? 0}`} />
              <Row label="Custom permission doc"  ok={true}                            value={c.hasCustomPermissions ? `Yes (${c.grantedOverrides ?? 0} grants, ${c.deniedOverrides ?? 0} denials)` : "None"} />
              {c.permissionsError && (
                <div className="mt-2 text-xs text-red-400 bg-red-900/20 rounded px-3 py-2">
                  Permission engine error: {c.permissionsError}
                </div>
              )}
              {c.permissionsEffective && c.permissionsEffective.length > 0 && (
                <div className="mt-2">
                  <p className="text-gray-500 text-[10px] mb-1">First 20 effective permissions:</p>
                  <div className="flex flex-wrap gap-1">
                    {c.permissionsEffective.map(p => (
                      <span key={p} className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded font-mono">{p}</span>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            {/* Sessions */}
            <Section title="Session State" icon={Activity}>
              <Row label="Active sessions"   ok={(c.activeSessions ?? 0) >= 0} value={`${c.activeSessions ?? 0} active`} />
              <Row label="Revoked sessions"  ok={true}                         value={`${c.revokedSessions ?? 0} revoked`} />
              <Row label="Expired sessions"  ok={true}                         value={`${c.expiredSessions ?? 0} expired`} />
              <Row label="Total sessions"    ok={true}                         value={`${c.totalSessions ?? 0} total`} />
              <Row label="Last login"        ok={Boolean(c.lastLoginAt)} warn={!c.lastLoginAt}
                value={c.lastLoginAt ? new Date(c.lastLoginAt).toLocaleString() : "Never"} />
            </Section>

            {/* Email */}
            <Section title="Password Reset / Email" icon={Mail}>
              <Row label="Email delivery configured" ok={Boolean(c.emailConfigured)}
                value={c.emailConfigured ? "Configured" : "Not configured — forgot-password emails will fail"} />
            </Section>

            {/* Recent login history */}
            {c.recentLogins && c.recentLogins.length > 0 && (
              <Section title="Recent Login Attempts" icon={Clock}>
                <div className="space-y-1 py-1">
                  {c.recentLogins.map((l, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs py-1 border-b border-gray-800/50">
                      {l.success
                        ? <CheckCircle size={12} className="text-green-400 shrink-0" />
                        : <XCircle size={12} className="text-red-400 shrink-0" />
                      }
                      <span className="text-gray-400">{new Date(l.timestamp).toLocaleString()}</span>
                      <span className="text-gray-600 font-mono">{l.ip}</span>
                      <span className={l.success ? "text-green-400" : "text-red-400"}>{l.success ? "Success" : "Failed"}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

          </div>
        )}

        {!result && !loading && (
          <div className="text-center py-16 text-gray-600">
            <Lock size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Enter an email address to inspect the login flow</p>
          </div>
        )}
      </div>
    </div>
  )
}
