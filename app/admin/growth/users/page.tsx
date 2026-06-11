"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  UserPlus, RefreshCw, Shield, Check, X, Key, Trash2,
  Activity, Eye, EyeOff, Copy, CheckCheck, ShieldCheck, Mail, Link,
} from "lucide-react"
import { useAuth, PermissionGate } from "@/lib/rbac/client"
import { ROLE_DEFINITIONS } from "@/lib/rbac/roles"
import type { RoleSlug } from "@/lib/rbac/types"
import { UserPermissionOverride } from "@/components/admin/growth/UserPermissionOverride"
import { checkPasswordStrength } from "@/lib/passwordPolicy"

// ── Types ─────────────────────────────────────────────────────────────────────

interface User {
  id: string
  email: string
  name: string
  role: RoleSlug
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
  loginHistory: Array<{ ip: string; userAgent: string; timestamp: string; success: boolean }>
  customPermissions: string[]
  deniedPermissions: string[]
  passwordChangedAt: string | null
  failedLoginCount: number
  lockedAt: string | null
}

// ── Role badge colors ──────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  super_admin:          "bg-purple-900/50 text-purple-300 border-purple-700",
  growth_admin:         "bg-blue-900/50 text-blue-300 border-blue-700",
  seo_team:             "bg-green-900/50 text-green-300 border-green-700",
  sales_manager:        "bg-amber-900/50 text-amber-300 border-amber-700",
  sales_executive:      "bg-yellow-900/50 text-yellow-300 border-yellow-700",
  procurement_analyst:  "bg-cyan-900/50 text-cyan-300 border-cyan-700",
  content_team:         "bg-pink-900/50 text-pink-300 border-pink-700",
  viewer:               "bg-gray-800 text-gray-400 border-gray-700",
}

function RoleBadge({ role }: { role: string }) {
  const colors = ROLE_COLORS[role] ?? "bg-gray-800 text-gray-400 border-gray-700"
  const label  = ROLE_DEFINITIONS.find(r => r.slug === role)?.name ?? role
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${colors}`}>
      <Shield size={9} />
      {label}
    </span>
  )
}

function formatDate(d: string | null) {
  if (!d) return "Never"
  return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
}

// ── Create User Modal ─────────────────────────────────────────────────────────

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name,     setName]     = useState("")
  const [email,    setEmail]    = useState("")
  const [role,     setRole]     = useState<RoleSlug>("viewer")
  const [password, setPassword] = useState("")
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState("")

  const strength = checkPasswordStrength(password)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!strength.valid) { setError("Password does not meet requirements"); return }
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Failed to create user"); return }
      onCreated()
    } catch { setError("Network error") }
    finally   { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-white font-semibold text-sm">Create New User</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div>
            <label className="text-gray-400 text-xs mb-1.5 block">Full Name</label>
            <input
              value={name} onChange={e => setName(e.target.value)} required
              placeholder="Jane Smith"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1.5 block">Email Address</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="jane@example.com"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1.5 block">Role</label>
            <select
              value={role} onChange={e => setRole(e.target.value as RoleSlug)} required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
            >
              {ROLE_DEFINITIONS.filter(r => r.slug !== "super_admin").map(r => (
                <option key={r.slug} value={r.slug}>{r.name}</option>
              ))}
            </select>
            <p className="text-gray-600 text-[11px] mt-1">
              {ROLE_DEFINITIONS.find(r => r.slug === role)?.description}
            </p>
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1.5 block">Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="Min 10 chars, upper, number, special"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 pr-10 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500"
              />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength.score ? strength.color : "bg-gray-700"}`} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]">
                  {[
                    { ok: strength.checks.minLength,    label: "10+ chars" },
                    { ok: strength.checks.hasUppercase, label: "Uppercase" },
                    { ok: strength.checks.hasLowercase, label: "Lowercase" },
                    { ok: strength.checks.hasNumber,    label: "Number" },
                    { ok: strength.checks.hasSpecial,   label: "Special" },
                  ].map(c => (
                    <span key={c.label} className={c.ok ? "text-green-400" : "text-gray-600"}>
                      {c.ok ? "✓" : "·"} {c.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg py-2 text-sm transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading || !strength.valid} className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
              {loading ? "Creating…" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── User Row ──────────────────────────────────────────────────────────────────

function UserRow({
  u,
  isSelf,
  onRefresh,
  onOpenPermissions,
}: {
  u: User
  isSelf: boolean
  onRefresh: () => void
  onOpenPermissions: (u: User) => void
}) {
  const { user: self } = useAuth()
  const isSuperAdmin = self?.role === "super_admin"
  const [expanded,      setExpanded]      = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [tempPw,        setTempPw]        = useState<string | null>(null)
  const [copied,        setCopied]        = useState(false)
  const [resetSent,     setResetSent]     = useState(false)
  const [resetSending,  setResetSending]  = useState(false)
  const [resetLink,     setResetLink]     = useState<string | null>(null)
  const [resetLinkLoading, setResetLinkLoading] = useState(false)

  const toggle = async (field: "isActive", value: boolean) => {
    setLoading(true)
    await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    })
    setLoading(false)
    onRefresh()
  }

  const resetPassword = async () => {
    setLoading(true)
    const res  = await fetch(`/api/admin/users/${u.id}/reset-password`, { method: "POST" })
    const data = await res.json()
    if (data.tempPassword) setTempPw(data.tempPassword)
    setLoading(false)
  }

  const copyPw = () => {
    if (!tempPw) return
    navigator.clipboard.writeText(tempPw)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sendResetEmail = async () => {
    setResetSending(true)
    await fetch(`/api/admin/users/${u.id}/send-reset`, { method: "POST" })
    setResetSending(false)
    setResetSent(true)
    setTimeout(() => setResetSent(false), 5000)
  }

  const getResetLink = async () => {
    setResetLinkLoading(true)
    const res  = await fetch(`/api/admin/users/${u.id}/get-reset-link`, { method: "POST" })
    const data = await res.json()
    if (data.resetUrl) setResetLink(data.resetUrl)
    setResetLinkLoading(false)
  }

  const softDelete = async () => {
    if (!confirm(`Disable ${u.email}? They will lose access immediately.`)) return
    await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" })
    onRefresh()
  }

  return (
    <>
      <tr className={`border-b border-gray-800 hover:bg-gray-900/50 transition-colors ${!u.isActive ? "opacity-50" : ""}`}>
        <td className="px-4 py-3">
          <div>
            <p className="text-white text-sm font-medium">{u.name}</p>
            <p className="text-gray-500 text-xs">{u.email}</p>
            {isSelf && <span className="text-[10px] text-green-500 font-medium">You</span>}
          </div>
        </td>
        <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
            u.isActive ? "bg-green-900/40 text-green-400 border-green-800" : "bg-red-900/40 text-red-400 border-red-800"
          }`}>
            {u.isActive ? <><Check size={9} /> Active</> : <><X size={9} /> Inactive</>}
          </span>
        </td>
        <td className="px-4 py-3 text-gray-400 text-xs">
          <div>{formatDate(u.lastLoginAt)}</div>
          {u.failedLoginCount > 0 && (
            <div className="text-red-400 text-[10px] mt-0.5">
              {u.failedLoginCount} failed attempt{u.failedLoginCount !== 1 ? "s" : ""}
            </div>
          )}
          {u.lockedAt && (
            <div className="text-red-400 font-semibold text-[10px] mt-0.5">Locked</div>
          )}
          {u.passwordChangedAt && (
            <div className="text-gray-600 text-[10px] mt-0.5">
              pw changed {formatDate(u.passwordChangedAt)}
            </div>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <PermissionGate permission="users.edit">
              <button
                onClick={() => resetPassword()}
                disabled={loading || isSelf}
                title="Generate temp password"
                className="p-1.5 rounded text-gray-500 hover:text-amber-400 hover:bg-amber-900/20 transition-colors disabled:opacity-30"
              >
                <Key size={13} />
              </button>
              <button
                onClick={sendResetEmail}
                disabled={resetSending || isSelf || !u.isActive}
                title={resetSent ? "Reset email sent!" : "Send reset email"}
                className={`p-1.5 rounded transition-colors disabled:opacity-30 ${
                  resetSent
                    ? "text-green-400 bg-green-900/20"
                    : "text-gray-500 hover:text-blue-400 hover:bg-blue-900/20"
                }`}
              >
                {resetSending ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : resetSent ? (
                  <CheckCheck size={13} />
                ) : (
                  <Mail size={13} />
                )}
              </button>
              <button
                onClick={() => toggle("isActive", !u.isActive)}
                disabled={loading || isSelf}
                title={u.isActive ? "Deactivate" : "Reactivate"}
                className={`p-1.5 rounded transition-colors disabled:opacity-30 ${
                  u.isActive
                    ? "text-gray-500 hover:text-red-400 hover:bg-red-900/20"
                    : "text-gray-500 hover:text-green-400 hover:bg-green-900/20"
                }`}
              >
                {u.isActive ? <X size={13} /> : <Check size={13} />}
              </button>
            </PermissionGate>
            <button
              onClick={() => setExpanded(v => !v)}
              title="View login history"
              className="p-1.5 rounded text-gray-500 hover:text-blue-400 hover:bg-blue-900/20 transition-colors"
            >
              <Activity size={13} />
            </button>
            <PermissionGate permission="permissions.view">
              <button
                onClick={() => onOpenPermissions(u)}
                title="Manage permissions"
                className="p-1.5 rounded text-gray-500 hover:text-purple-400 hover:bg-purple-900/20 transition-colors"
              >
                <ShieldCheck size={13} />
              </button>
            </PermissionGate>
            {isSuperAdmin && !isSelf && u.isActive && (
              <button
                onClick={getResetLink}
                disabled={resetLinkLoading}
                title="Get reset link (manual delivery)"
                className="p-1.5 rounded text-gray-500 hover:text-purple-400 hover:bg-purple-900/20 transition-colors disabled:opacity-30"
              >
                {resetLinkLoading ? <RefreshCw size={13} className="animate-spin" /> : <Link size={13} />}
              </button>
            )}
            <PermissionGate permission="users.delete">
              <button
                onClick={softDelete}
                disabled={isSelf}
                title="Disable user"
                className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-30"
              >
                <Trash2 size={13} />
              </button>
            </PermissionGate>
          </div>
        </td>
      </tr>

      {/* Temporary password reveal */}
      {tempPw && (
        <tr>
          <td colSpan={5} className="px-4 py-2 bg-amber-950/20">
            <div className="flex items-center gap-3">
              <span className="text-amber-400 text-xs font-medium">Temporary password (share securely):</span>
              <code className="bg-gray-900 text-amber-300 text-xs px-3 py-1 rounded font-mono border border-amber-800">{tempPw}</code>
              <button onClick={copyPw} className="text-gray-400 hover:text-white transition-colors">
                {copied ? <CheckCheck size={14} className="text-green-400" /> : <Copy size={14} />}
              </button>
              <button onClick={() => setTempPw(null)} className="text-gray-500 hover:text-white ml-auto"><X size={14} /></button>
            </div>
          </td>
        </tr>
      )}

      {/* Manual reset link reveal */}
      {resetLink && (
        <tr>
          <td colSpan={5} className="px-4 py-2 bg-purple-950/20">
            <div className="flex items-start gap-3">
              <span className="text-purple-400 text-xs font-medium pt-0.5 shrink-0">Reset link (30 min, one-time):</span>
              <code className="bg-gray-900 text-purple-300 text-[10px] px-3 py-1 rounded font-mono border border-purple-800 break-all flex-1">{resetLink}</code>
              <button
                onClick={() => { navigator.clipboard.writeText(resetLink); }}
                className="text-gray-400 hover:text-white transition-colors shrink-0"
                title="Copy link"
              >
                <Copy size={14} />
              </button>
              <button onClick={() => setResetLink(null)} className="text-gray-500 hover:text-white shrink-0"><X size={14} /></button>
            </div>
          </td>
        </tr>
      )}

      {/* Login history expansion */}
      {expanded && (
        <tr>
          <td colSpan={5} className="px-4 pb-3 bg-gray-950/30">
            <p className="text-gray-500 text-xs font-medium mb-2 pt-2">Recent Login History</p>
            {u.loginHistory.length === 0 ? (
              <p className="text-gray-600 text-xs">No login history</p>
            ) : (
              <div className="space-y-1">
                {[...u.loginHistory].reverse().slice(0, 10).map((h, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <span className={h.success ? "text-green-500" : "text-red-500"}>
                      {h.success ? "✓" : "✗"}
                    </span>
                    <span className="text-gray-400">{formatDate(h.timestamp)}</span>
                    <span className="text-gray-600 font-mono">{h.ip}</span>
                    <span className="text-gray-700 truncate max-w-xs">{h.userAgent?.slice(0, 60)}</span>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UserManagementPage() {
  const { user: self } = useAuth()
  const [users,       setUsers]       = useState<User[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showCreate,  setShowCreate]  = useState(false)
  const [filter,      setFilter]      = useState<"all" | "active" | "inactive">("active")
  const [roleFilter,  setRoleFilter]  = useState<string>("all")
  const [permUser,    setPermUser]    = useState<User | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch("/api/admin/users")
      const data = await res.json()
      setUsers(data.users ?? [])
    } catch { }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const filtered = users.filter(u => {
    if (filter === "active"   && !u.isActive) return false
    if (filter === "inactive" && u.isActive)  return false
    if (roleFilter !== "all" && u.role !== roleFilter) return false
    return true
  })

  return (
    <PermissionGate
      permission="users.view"
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gray-950">
          <div className="text-center">
            <Shield size={40} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Access Denied</p>
            <p className="text-gray-600 text-sm mt-1">You don&apos;t have permission to manage users.</p>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-gray-950 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-xl font-bold">User Management</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {users.filter(u => u.isActive).length} active user{users.filter(u => u.isActive).length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchUsers}
              className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <PermissionGate permission="users.create">
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                <UserPlus size={15} />
                New User
              </button>
            </PermissionGate>
          </div>
        </div>

        {/* Role summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {ROLE_DEFINITIONS.map(role => {
            const count = users.filter(u => u.role === role.slug && u.isActive).length
            return (
              <button
                key={role.slug}
                onClick={() => setRoleFilter(prev => prev === role.slug ? "all" : role.slug)}
                className={`rounded-xl border p-3 text-left transition-all ${
                  roleFilter === role.slug
                    ? "border-green-600 bg-green-950/30"
                    : "border-gray-800 bg-gray-900 hover:border-gray-700"
                }`}
              >
                <p className="text-white text-lg font-bold">{count}</p>
                <p className="text-gray-400 text-xs mt-0.5">{role.name}</p>
              </button>
            )
          })}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          {(["all", "active", "inactive"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                filter === f
                  ? "bg-gray-700 text-white"
                  : "text-gray-500 hover:text-white hover:bg-gray-800"
              }`}
            >
              {f}
            </button>
          ))}
          {roleFilter !== "all" && (
            <button
              onClick={() => setRoleFilter("all")}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-400 bg-amber-900/20 border border-amber-800"
            >
              <X size={11} />
              {ROLE_DEFINITIONS.find(r => r.slug === roleFilter)?.name}
            </button>
          )}
          <span className="ml-auto text-gray-600 text-xs">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Users table */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw size={20} className="text-gray-600 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-4 py-3 text-gray-500 text-xs font-medium">User</th>
                    <th className="text-left px-4 py-3 text-gray-500 text-xs font-medium">Role</th>
                    <th className="text-left px-4 py-3 text-gray-500 text-xs font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-gray-500 text-xs font-medium">Last Login</th>
                    <th className="text-left px-4 py-3 text-gray-500 text-xs font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <UserRow
                      key={u.id}
                      u={u}
                      isSelf={self?.id === u.id || self?.email === u.email}
                      onRefresh={fetchUsers}
                      onOpenPermissions={setPermUser}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchUsers() }}
        />
      )}

      {permUser && (
        <UserPermissionOverride
          userId={permUser.id}
          userName={permUser.name}
          userRole={permUser.role}
          onClose={() => setPermUser(null)}
        />
      )}
    </PermissionGate>
  )
}
