"use client"

import React, { useEffect, useState, useCallback } from "react"
import {
  Shield, RefreshCw, Users, Check, X, AlertTriangle,
  Plus, Minus, Clock, Eye, ChevronDown, ChevronRight, Search,
} from "lucide-react"
import { PermissionGate, useAuth } from "@/lib/rbac/client"
import { UserPermissionOverride } from "@/components/admin/growth/UserPermissionOverride"

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuditUser {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  lastLoginAt: string | null
  base: string[]
  granted: string[]
  denied: string[]
  effective: string[]
  overrideCount: number
  lastPermChange: { ts: string; actor: string; op: string } | null
}

interface Stats {
  totalUsers: number
  usersWithOverrides: number
  usersWithDenials: number
  usersWithGrants: number
  roleBreakdown: Record<string, number>
}

interface SimulationResult {
  simulatedUser: { id: string; name: string; email: string; role: string }
  permissions: { effective: string[]; base: string[]; granted: string[]; denied: string[] }
  visibleModules: string[]
  simulatedAt: string
}

// ── Role colors ───────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  super_admin:         "text-purple-400 bg-purple-900/20 border-purple-800",
  growth_admin:        "text-blue-400 bg-blue-900/20 border-blue-800",
  seo_team:            "text-green-400 bg-green-900/20 border-green-800",
  sales_manager:       "text-amber-400 bg-amber-900/20 border-amber-800",
  sales_executive:     "text-yellow-400 bg-yellow-900/20 border-yellow-800",
  procurement_analyst: "text-cyan-400 bg-cyan-900/20 border-cyan-800",
  content_team:        "text-pink-400 bg-pink-900/20 border-pink-800",
  viewer:              "text-gray-400 bg-gray-800 border-gray-700",
}

// ── Simulation panel ──────────────────────────────────────────────────────────

function SimulationPanel({ userId, userName, onClose }: { userId: string; userName: string; onClose: () => void }) {
  const [result, setResult]   = useState<SimulationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState("")

  useEffect(() => {
    fetch(`/api/admin/simulate/${userId}`)
      .then(r => r.json())
      .then(setResult)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [userId])

  const filtered = (result?.permissions.effective ?? []).filter(p => {
    if (!search) return true
    return p.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-end">
      <div className="bg-gray-900 border-l border-gray-700 w-full max-w-2xl h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <Eye size={16} className="text-brand-400" />
              <h2 className="text-white font-semibold">Simulating: {userName}</h2>
            </div>
            {result && (
              <p className="text-gray-500 text-xs mt-1">
                Role: <span className="text-white capitalize">{result.simulatedUser.role.replace("_"," ")}</span>
                {" · "}{result.permissions.effective.length} effective permissions
                {" · "}{result.visibleModules.length} visible modules
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-2">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <RefreshCw size={18} className="text-gray-600 animate-spin" />
          </div>
        ) : !result ? (
          <p className="text-red-400 p-6">Failed to load simulation.</p>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Visible modules */}
            <div>
              <h3 className="text-white text-xs font-semibold uppercase tracking-wide mb-3">
                Visible Modules ({result.visibleModules.length})
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {result.visibleModules.map(m => (
                  <span key={m} className="text-xs bg-blue-900/30 text-blue-400 border border-blue-800 px-2 py-0.5 rounded-lg font-mono">
                    {m.replace("/admin/growth/", "")}
                  </span>
                ))}
              </div>
            </div>

            {/* Permission stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Base (role)", count: result.permissions.base.length, color: "text-blue-400" },
                { label: "Granted (+)", count: result.permissions.granted.length, color: "text-green-400" },
                { label: "Denied (−)", count: result.permissions.denied.length, color: "text-red-400" },
              ].map(({ label, count, color }) => (
                <div key={label} className="bg-gray-800 rounded-xl p-3 text-center">
                  <div className={`text-xl font-bold ${color}`}>{count}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Effective permissions list */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-white text-xs font-semibold uppercase tracking-wide">
                  Effective Permissions
                </h3>
                <div className="relative flex-1 max-w-xs">
                  <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Filter…"
                    className="w-full bg-gray-800 border border-gray-700 rounded pl-7 pr-3 py-1 text-white text-xs placeholder-gray-600 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {filtered.map(p => {
                  const isGrant = result.permissions.granted.includes(p)
                  return (
                    <span
                      key={p}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        isGrant
                          ? "bg-green-900/30 text-green-400 border-green-800"
                          : "bg-gray-800 text-gray-400 border-gray-700"
                      }`}
                    >
                      {p}
                    </span>
                  )
                })}
              </div>
              {result.permissions.denied.length > 0 && (
                <div className="mt-3">
                  <p className="text-red-400 text-[10px] uppercase tracking-wide font-semibold mb-2">Denied overrides</p>
                  <div className="flex flex-wrap gap-1">
                    {result.permissions.denied.map(p => (
                      <span key={p} className="text-[10px] font-mono px-2 py-0.5 rounded border bg-red-900/30 text-red-400 border-red-800">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── User audit row ────────────────────────────────────────────────────────────

function AuditRow({
  u,
  onSimulate,
  onOpenOverride,
}: {
  u: AuditUser
  onSimulate: (u: AuditUser) => void
  onOpenOverride: (u: AuditUser) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const roleColor = ROLE_COLORS[u.role] ?? ROLE_COLORS.viewer

  return (
    <>
      <tr className="border-b border-gray-800 hover:bg-gray-900/40 transition-colors">
        <td className="px-4 py-3">
          <div>
            <p className="text-white text-sm font-medium">{u.name}</p>
            <p className="text-gray-500 text-xs">{u.email}</p>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${roleColor}`}>
            <Shield size={9} />
            {u.role.replace("_", " ")}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          <span className="text-white font-bold text-sm">{u.effective.length}</span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {u.granted.length > 0 && (
              <span className="text-green-400 text-xs flex items-center gap-1">
                <Plus size={9} />{u.granted.length}
              </span>
            )}
            {u.denied.length > 0 && (
              <span className="text-red-400 text-xs flex items-center gap-1">
                <Minus size={9} />{u.denied.length}
              </span>
            )}
            {u.overrideCount === 0 && (
              <span className="text-gray-600 text-xs">None</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          {u.lastPermChange ? (
            <div>
              <p className="text-gray-400 text-xs">{new Date(u.lastPermChange.ts).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
              <p className="text-gray-600 text-[10px]">by {u.lastPermChange.actor}</p>
            </div>
          ) : (
            <span className="text-gray-600 text-xs">Never changed</span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setExpanded(v => !v)}
              title="Expand permissions"
              className="p-1.5 rounded text-gray-500 hover:text-blue-400 hover:bg-blue-900/20 transition-colors"
            >
              {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
            <button
              onClick={() => onSimulate(u)}
              title="Simulate this user's view"
              className="p-1.5 rounded text-gray-500 hover:text-amber-400 hover:bg-amber-900/20 transition-colors"
            >
              <Eye size={13} />
            </button>
            <button
              onClick={() => onOpenOverride(u)}
              title="Edit overrides"
              className="p-1.5 rounded text-gray-500 hover:text-purple-400 hover:bg-purple-900/20 transition-colors"
            >
              <Shield size={13} />
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="px-4 pb-4 bg-gray-950/40">
            <div className="mt-2 space-y-3">
              {u.granted.length > 0 && (
                <div>
                  <p className="text-green-400 text-[10px] uppercase tracking-wide font-semibold mb-1.5">Granted ({u.granted.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {u.granted.map(p => (
                      <span key={p} className="text-[10px] font-mono px-2 py-0.5 rounded border bg-green-900/30 text-green-400 border-green-800">{p}</span>
                    ))}
                  </div>
                </div>
              )}
              {u.denied.length > 0 && (
                <div>
                  <p className="text-red-400 text-[10px] uppercase tracking-wide font-semibold mb-1.5">Denied ({u.denied.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {u.denied.map(p => (
                      <span key={p} className="text-[10px] font-mono px-2 py-0.5 rounded border bg-red-900/30 text-red-400 border-red-800">{p}</span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-gray-500 text-[10px] uppercase tracking-wide font-semibold mb-1.5">Effective ({u.effective.length})</p>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                  {u.effective.map(p => (
                    <span key={p} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">{p}</span>
                  ))}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PermissionAuditPage() {
  const { user: self } = useAuth()
  const [data,       setData]       = useState<{ users: AuditUser[]; stats: Stats } | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState("")
  const [simUser,    setSimUser]    = useState<AuditUser | null>(null)
  const [overUser,   setOverUser]   = useState<AuditUser | null>(null)
  const [roleFilter, setRoleFilter] = useState("all")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch("/api/admin/growth/audit/permissions")
      const json = await res.json()
      setData(json)
    } catch { }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const isSuperAdmin = self?.role === "super_admin"

  const filtered = (data?.users ?? []).filter(u => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    }
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
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-gray-950 p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-white text-xl font-bold flex items-center gap-2">
              <Shield size={20} className="text-brand-400" />
              Permission Audit
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Effective permissions, overrides, and last changes per user.
              {isSuperAdmin && <span className="text-amber-400 ml-2">Eye icon = simulate user view</span>}
            </p>
          </div>
          <button onClick={fetchData} className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Stats */}
        {data?.stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total Users", value: data.stats.totalUsers, color: "text-white" },
              { label: "With Overrides", value: data.stats.usersWithOverrides, color: "text-amber-400" },
              { label: "With Extra Grants", value: data.stats.usersWithGrants, color: "text-green-400" },
              { label: "With Denials", value: data.stats.usersWithDenials, color: "text-red-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-gray-500 text-xs mt-1">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users…"
              className="bg-gray-900 border border-gray-700 rounded-lg pl-8 pr-4 py-2 text-white text-xs placeholder-gray-600 focus:outline-none w-48"
            />
          </div>
          {data?.stats && Object.entries(data.stats.roleBreakdown).map(([role, count]) => (
            <button
              key={role}
              onClick={() => setRoleFilter(prev => prev === role ? "all" : role)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${roleFilter === role ? "bg-brand-600 text-white" : "text-gray-500 hover:text-white hover:bg-gray-800"}`}
            >
              {role.replace("_", " ")} ({count})
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw size={20} className="text-gray-600 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">User</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Role</th>
                    <th className="text-center px-4 py-3 text-gray-500 font-medium">Effective</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Overrides</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Last Perm Change</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-600">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map(u => (
                      <AuditRow
                        key={u.id}
                        u={u}
                        onSimulate={setSimUser}
                        onOpenOverride={setOverUser}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!isSuperAdmin && (
          <p className="text-gray-700 text-xs mt-4 text-center">
            Permission simulation (Eye icon) is available to Super Admin only.
          </p>
        )}
      </div>

      {simUser && isSuperAdmin && (
        <SimulationPanel
          userId={simUser.id}
          userName={simUser.name}
          onClose={() => setSimUser(null)}
        />
      )}

      {overUser && (
        <UserPermissionOverride
          userId={overUser.id}
          userName={overUser.name}
          userRole={overUser.role}
          onClose={() => { setOverUser(null); fetchData() }}
        />
      )}
    </PermissionGate>
  )
}
