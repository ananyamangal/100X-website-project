"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
import { Shield, Search, Save, RefreshCw, ChevronDown, ChevronRight, AlertTriangle, Check, X } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface PermDef {
  key: string
  label: string
  description: string
  group: string
  subgroup?: string
  module: string
  action: string
  critical?: boolean
  sortOrder: number
}

interface RoleDef { slug: string; name: string }

interface MatrixData {
  roles:       RoleDef[]
  permissions: PermDef[]
  grouped:     Record<string, Record<string, PermDef[]>>
  groups:      string[]
  rolePermMap: Record<string, string[]>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
  view:    "text-blue-400",
  edit:    "text-amber-400",
  create:  "text-green-400",
  delete:  "text-red-400",
  export:  "text-purple-400",
  publish: "text-cyan-400",
  run:     "text-orange-400",
  approve: "text-teal-400",
}

const ROLE_ABBR: Record<string, string> = {
  super_admin:         "SA",
  growth_admin:        "GA",
  seo_team:            "SE",
  sales_manager:       "SM",
  sales_executive:     "SX",
  procurement_analyst: "PA",
  content_team:        "CT",
  viewer:              "VW",
}

// ── Permission cell ───────────────────────────────────────────────────────────

function PermCell({
  roleSlug,
  permKey,
  checked,
  pending,
  onToggle,
  disabled,
}: {
  roleSlug: string
  permKey: string
  checked: boolean
  pending: boolean
  onToggle: (roleSlug: string, permKey: string, value: boolean) => void
  disabled: boolean
}) {
  return (
    <td className="px-2 py-1.5 text-center border-r border-gray-800/50">
      <button
        onClick={() => !disabled && onToggle(roleSlug, permKey, !checked)}
        disabled={disabled}
        className={`w-5 h-5 rounded transition-all mx-auto flex items-center justify-center ${
          disabled ? "opacity-40 cursor-not-allowed" :
          checked
            ? "bg-green-600 hover:bg-green-500 border border-green-500"
            : "bg-gray-800 hover:bg-gray-700 border border-gray-700"
        } ${pending ? "ring-2 ring-amber-500/50" : ""}`}
        title={`${checked ? "Revoke" : "Grant"} ${permKey} for ${roleSlug}`}
      >
        {checked && <Check size={10} className="text-white" />}
      </button>
    </td>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function PermissionMatrix() {
  const [data,         setData]         = useState<MatrixData | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [search,       setSearch]       = useState("")
  const [groupFilter,  setGroupFilter]  = useState<string>("all")
  const [collapsed,    setCollapsed]    = useState<Set<string>>(new Set())
  const [pendingMap,   setPendingMap]   = useState<Record<string, Record<string, boolean>>>({})  // roleSlug → permKey → newValue
  const [saveStatus,   setSaveStatus]   = useState<"idle" | "saving" | "saved" | "error">("idle")
  const pendingCount = Object.values(pendingMap).reduce((n, m) => n + Object.keys(m).length, 0)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch("/api/admin/permissions?format=matrix")
      const json = await res.json() as MatrixData
      setData(json)
    } catch { }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleToggle = useCallback((roleSlug: string, permKey: string, newValue: boolean) => {
    setPendingMap(prev => {
      const rolePending = { ...(prev[roleSlug] ?? {}) }

      // If this cancels the change vs original, remove from pending
      const original = data?.rolePermMap?.[roleSlug]?.includes(permKey) ?? false
      if (newValue === original) {
        delete rolePending[permKey]
      } else {
        rolePending[permKey] = newValue
      }

      const next = { ...prev }
      if (Object.keys(rolePending).length === 0) {
        delete next[roleSlug]
      } else {
        next[roleSlug] = rolePending
      }
      return next
    })
  }, [data])

  const saveAll = useCallback(async () => {
    if (pendingCount === 0 || !data) return
    setSaveStatus("saving")
    setSaving(true)

    try {
      const saves = Object.entries(pendingMap).map(async ([roleSlug, changes]) => {
        const current = new Set(data.rolePermMap[roleSlug] ?? [])
        for (const [permKey, value] of Object.entries(changes)) {
          if (value) current.add(permKey)
          else current.delete(permKey)
        }
        await fetch(`/api/admin/roles/${roleSlug}/permissions`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissions: Array.from(current) }),
        })
        // Update local data
        data.rolePermMap[roleSlug] = Array.from(current)
      })
      await Promise.all(saves)
      setPendingMap({})
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
    } catch {
      setSaveStatus("error")
    } finally {
      setSaving(false)
    }
  }, [pendingMap, pendingCount, data])

  const toggleGroup = (group: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(group) ? next.delete(group) : next.add(group)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <RefreshCw size={20} className="text-gray-600 animate-spin" />
      </div>
    )
  }
  if (!data) return <div className="text-red-400 p-6">Failed to load permission matrix.</div>

  const groups = groupFilter === "all" ? data.groups : [groupFilter]

  const filterPerm = (p: PermDef) => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.key.includes(q) || p.label.toLowerCase().includes(q) || (p.subgroup ?? "").toLowerCase().includes(q)
  }

  return (
    <div className="bg-gray-950 min-h-screen p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-white text-xl font-bold flex items-center gap-2">
            <Shield size={20} className="text-brand-400" />
            Permission Matrix
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Control which permissions each role template includes. Changes apply to all new logins.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="text-amber-400 text-sm font-medium">
              {pendingCount} unsaved change{pendingCount !== 1 ? "s" : ""}
            </span>
          )}
          <button
            onClick={saveAll}
            disabled={pendingCount === 0 || saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              pendingCount > 0 && !saving
                ? "bg-green-600 hover:bg-green-500 text-white"
                : "bg-gray-800 text-gray-500 cursor-not-allowed"
            }`}
          >
            {saveStatus === "saving" ? <RefreshCw size={14} className="animate-spin" /> :
             saveStatus === "saved"  ? <Check size={14} className="text-green-400" /> :
             <Save size={14} />}
            {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : "Save Changes"}
          </button>
          <button onClick={fetchData} className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search permissions…"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-brand-500"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setGroupFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${groupFilter === "all" ? "bg-brand-600 text-white" : "text-gray-500 hover:text-white hover:bg-gray-800"}`}
          >
            All
          </button>
          {data.groups.map(g => (
            <button
              key={g}
              onClick={() => setGroupFilter(groupFilter === g ? "all" : g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${groupFilter === g ? "bg-brand-600 text-white" : "text-gray-500 hover:text-white hover:bg-gray-800"}`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Matrix table */}
      <div className="rounded-xl border border-gray-800 overflow-hidden overflow-x-auto">
        <table className="w-full text-xs">
          {/* Role header */}
          <thead>
            <tr className="bg-gray-900 border-b border-gray-800">
              <th className="text-left px-4 py-3 text-gray-400 font-medium w-72 sticky left-0 bg-gray-900 border-r border-gray-800">
                Permission
              </th>
              {data.roles.map(role => (
                <th key={role.slug} className="px-2 py-3 text-center border-r border-gray-800 min-w-[56px]">
                  <div className="text-white font-bold text-[11px]">{ROLE_ABBR[role.slug] ?? role.slug.slice(0, 2).toUpperCase()}</div>
                  <div className="text-gray-600 text-[9px] truncate max-w-[52px] mx-auto mt-0.5">{role.name.split(" ")[0]}</div>
                </th>
              ))}
              <th className="px-4 py-3 text-left text-gray-400 font-medium min-w-[180px]">Description</th>
            </tr>
          </thead>

          <tbody>
            {groups.map(group => {
              const subgroups = data.grouped[group]
              if (!subgroups) return null
              const isCollapsed = collapsed.has(group)

              // Flatten all perms in this group for search filter
              const allInGroup = Object.values(subgroups).flat().filter(filterPerm)
              if (search && allInGroup.length === 0) return null

              return (
                <React.Fragment key={group}>
                  {/* Group header */}
                  <tr
                    className="bg-gray-900/80 border-b border-t border-gray-800 cursor-pointer hover:bg-gray-900"
                    onClick={() => toggleGroup(group)}
                  >
                    <td className="px-4 py-2.5 sticky left-0 bg-gray-900/80" colSpan={data.roles.length + 2}>
                      <div className="flex items-center gap-2">
                        {isCollapsed ? <ChevronRight size={13} className="text-gray-500" /> : <ChevronDown size={13} className="text-gray-500" />}
                        <span className="text-white font-semibold text-xs tracking-wide uppercase">{group}</span>
                        <span className="text-gray-600 text-[10px]">
                          ({allInGroup.length} permission{allInGroup.length !== 1 ? "s" : ""})
                        </span>
                      </div>
                    </td>
                  </tr>

                  {!isCollapsed && Object.entries(subgroups).map(([subgroup, perms]) => {
                    const filtered = perms.filter(filterPerm)
                    if (filtered.length === 0) return null

                    return (
                      <React.Fragment key={subgroup}>
                        {subgroup !== "__root__" && (
                          <tr className="bg-gray-900/40 border-b border-gray-800/50">
                            <td className="px-6 py-1.5 text-gray-500 text-[10px] uppercase tracking-wider font-medium sticky left-0 bg-gray-900/40" colSpan={data.roles.length + 2}>
                              {subgroup}
                            </td>
                          </tr>
                        )}

                        {filtered.map(perm => {
                          return (
                            <tr key={perm.key} className="border-b border-gray-800/30 hover:bg-gray-900/30 group/row">
                              {/* Permission name — sticky */}
                              <td className="px-4 py-1.5 sticky left-0 bg-gray-950 group-hover/row:bg-gray-900/60 border-r border-gray-800">
                                <div className="flex items-center gap-2">
                                  {perm.critical && <AlertTriangle size={9} className="text-amber-500 shrink-0" />}
                                  <div>
                                    <span className={`font-medium ${ACTION_COLORS[perm.action] ?? "text-gray-300"}`}>{perm.label}</span>
                                    <span className="text-gray-700 text-[9px] ml-1.5 font-mono">{perm.key}</span>
                                  </div>
                                </div>
                              </td>

                              {/* Checkbox per role */}
                              {data.roles.map(role => {
                                const base    = data.rolePermMap[role.slug] ?? []
                                const pending = pendingMap[role.slug] ?? {}
                                const checked = perm.key in pending
                                  ? pending[perm.key]
                                  : base.includes(perm.key)
                                const isPending = perm.key in pending
                                const isSuperAdmin = role.slug === "super_admin"

                                return (
                                  <PermCell
                                    key={role.slug}
                                    roleSlug={role.slug}
                                    permKey={perm.key}
                                    checked={checked}
                                    pending={isPending}
                                    onToggle={handleToggle}
                                    disabled={isSuperAdmin}
                                  />
                                )
                              })}

                              {/* Description */}
                              <td className="px-4 py-1.5 text-gray-600 text-[10px]">
                                {perm.description}
                              </td>
                            </tr>
                          )
                        })}
                      </React.Fragment>
                    )
                  })}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Role legend */}
      <div className="mt-4 flex items-center gap-4 flex-wrap">
        <span className="text-gray-600 text-xs">Roles:</span>
        {data.roles.map(role => (
          <span key={role.slug} className="text-gray-500 text-xs">
            <span className="text-white font-bold">{ROLE_ABBR[role.slug]}</span> = {role.name}
          </span>
        ))}
        <span className="text-amber-600 text-xs ml-4">⚠ = Critical permission</span>
        <span className="text-amber-400 text-xs">Ring = Unsaved change</span>
        <span className="text-gray-600 text-xs">SA column is locked (always full access)</span>
      </div>
    </div>
  )
}
