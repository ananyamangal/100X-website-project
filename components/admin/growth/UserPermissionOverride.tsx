"use client"

import React, { useEffect, useState, useCallback } from "react"
import { X, Plus, Minus, RefreshCw, Shield, Check, AlertTriangle, ChevronDown, Search, Eye, Ban } from "lucide-react"
import type { PermDef } from "@/lib/rbac/permissions"

// ── Types ─────────────────────────────────────────────────────────────────────

interface PermResolution {
  userId: string
  role: string
  base: string[]
  granted: string[]
  denied: string[]
  effective: string[]
}

interface Props {
  userId: string
  userName: string
  userRole: string
  onClose: () => void
}

type TabKey = "overrides" | "effective" | "base"

// ── Sub-components ────────────────────────────────────────────────────────────

function PermTag({
  permKey,
  type,
  label,
  description,
  onRemove,
}: {
  permKey: string
  type: "grant" | "deny" | "base"
  label?: string
  description?: string
  onRemove?: () => void
}) {
  const colors = {
    grant: "bg-green-900/40 text-green-400 border-green-800",
    deny:  "bg-red-900/40 text-red-400 border-red-800",
    base:  "bg-gray-800 text-gray-400 border-gray-700",
  }

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs ${colors[type]}`} title={description}>
      {type === "grant" ? <Plus size={9} /> : type === "deny" ? <Minus size={9} /> : null}
      <span className="font-medium">{label ?? permKey}</span>
      <span className="text-[9px] opacity-50 font-mono hidden sm:inline">{permKey}</span>
      {onRemove && (
        <button onClick={onRemove} className="ml-1 opacity-60 hover:opacity-100 transition-opacity">
          <X size={9} />
        </button>
      )}
    </div>
  )
}

// ── Permission search dropdown ────────────────────────────────────────────────

function PermSearchDropdown({
  allPerms,
  excluded,
  onSelect,
  placeholder,
  actionType,
}: {
  allPerms: PermDef[]
  excluded: string[]
  onSelect: (key: string) => void
  placeholder: string
  actionType: "grant" | "deny"
}) {
  const [query, setQuery]   = useState("")
  const [open, setOpen]     = useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const filtered = allPerms
    .filter(p => !excluded.includes(p.key))
    .filter(p => {
      if (!query) return true
      const q = query.toLowerCase()
      return p.key.includes(q) || p.label.toLowerCase().includes(q) || p.group.toLowerCase().includes(q)
    })
    .slice(0, 30)

  const colors = actionType === "grant"
    ? { btn: "bg-green-800/40 hover:bg-green-700/40 text-green-400 border-green-800", item: "hover:bg-green-900/30" }
    : { btn: "bg-red-800/40 hover:bg-red-700/40 text-red-400 border-red-800", item: "hover:bg-red-900/30" }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${colors.btn}`}
      >
        {actionType === "grant" ? <><Plus size={11} />Grant Permission</> : <><Minus size={11} />Deny Permission</>}
        <ChevronDown size={10} className={open ? "rotate-180" : ""} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 z-50 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-gray-800">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search permissions…"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-3 py-1.5 text-white text-xs placeholder-gray-600 focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-gray-600 text-xs p-4 text-center">No permissions found</p>
            ) : (
              filtered.map(p => (
                <button
                  key={p.key}
                  onClick={() => { onSelect(p.key); setQuery(""); setOpen(false) }}
                  className={`w-full flex items-start gap-2 px-3 py-2 text-left text-xs transition-colors ${colors.item}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">{p.label}</div>
                    <div className="text-gray-600 font-mono text-[10px]">{p.key}</div>
                    <div className="text-gray-600 text-[10px] truncate">{p.group}{p.subgroup ? ` › ${p.subgroup}` : ""}</div>
                  </div>
                  {p.critical && <AlertTriangle size={10} className="text-amber-500 mt-0.5 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function UserPermissionOverride({ userId, userName, userRole, onClose }: Props) {
  const [resolution, setResolution] = useState<PermResolution | null>(null)
  const [allPerms,   setAllPerms]   = useState<PermDef[]>([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [activeTab,  setActiveTab]  = useState<TabKey>("overrides")
  const [search,     setSearch]     = useState("")

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [resolutionRes, allPermsRes] = await Promise.all([
        fetch(`/api/admin/users/${userId}/permissions`),
        fetch("/api/admin/permissions"),
      ])
      const r = await resolutionRes.json()
      const a = await allPermsRes.json()
      setResolution(r)
      setAllPerms(a.permissions ?? [])
    } catch { }
    finally  { setLoading(false) }
  }, [userId])

  useEffect(() => { fetchAll() }, [fetchAll])

  const save = async (granted: string[], denied: string[]) => {
    setSaving(true)
    try {
      await fetch(`/api/admin/users/${userId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grantedPermissions: granted, deniedPermissions: denied }),
      })
      await fetchAll()
    } finally { setSaving(false) }
  }

  const grant = async (key: string) => {
    if (!resolution) return
    const granted = [...resolution.granted.filter(p => p !== key), key]
    const denied  = resolution.denied.filter(p => p !== key)
    await save(granted, denied)
  }

  const deny = async (key: string) => {
    if (!resolution) return
    const denied  = [...resolution.denied.filter(p => p !== key), key]
    const granted = resolution.granted.filter(p => p !== key)
    await save(granted, denied)
  }

  const revokeGrant = async (key: string) => {
    if (!resolution) return
    await save(resolution.granted.filter(p => p !== key), resolution.denied)
  }

  const revokeDeny = async (key: string) => {
    if (!resolution) return
    await save(resolution.granted, resolution.denied.filter(p => p !== key))
  }

  const permLabel = (key: string) => allPerms.find(p => p.key === key)?.label ?? key
  const permDesc  = (key: string) => allPerms.find(p => p.key === key)?.description

  const filteredEffective = (resolution?.effective ?? []).filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.includes(q) || permLabel(p).toLowerCase().includes(q)
  })

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-end">
      <div className="bg-gray-900 border-l border-gray-700 w-full max-w-2xl h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-brand-400" />
              <h2 className="text-white font-semibold">Permission Overrides</h2>
            </div>
            <p className="text-gray-500 text-xs mt-1">
              <span className="text-white font-medium">{userName}</span>
              {" · "}
              <span className="text-amber-400 capitalize">{userRole.replace("_", " ")}</span>
              {" role"}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2">
            <X size={18} />
          </button>
        </div>

        {/* Stats bar */}
        {resolution && (
          <div className="px-6 py-3 border-b border-gray-800 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-gray-400">{resolution.base.length} base (from role)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-gray-400">{resolution.granted.length} granted</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-gray-400">{resolution.denied.length} denied</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5 font-medium">
              <Check size={12} className="text-green-500" />
              <span className="text-white">{resolution.effective.length} effective</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          {([["overrides", "Overrides"], ["effective", "All Effective"], ["base", "Base Role"]] as [TabKey, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-5 py-3 text-xs font-medium transition-colors border-b-2 ${
                activeTab === key
                  ? "text-white border-brand-500"
                  : "text-gray-500 hover:text-white border-transparent"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw size={18} className="text-gray-600 animate-spin" />
            </div>
          ) : !resolution ? (
            <div className="text-red-400 text-sm p-6">Failed to load permissions.</div>
          ) : (

            <>
              {/* ── OVERRIDES TAB ── */}
              {activeTab === "overrides" && (
                <div className="p-6 space-y-6">
                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <PermSearchDropdown
                      allPerms={allPerms}
                      excluded={[...resolution.granted, ...resolution.base]}
                      onSelect={grant}
                      placeholder="Grant permission"
                      actionType="grant"
                    />
                    <PermSearchDropdown
                      allPerms={allPerms}
                      excluded={resolution.denied}
                      onSelect={deny}
                      placeholder="Deny permission"
                      actionType="deny"
                    />
                    {saving && <RefreshCw size={14} className="text-gray-500 animate-spin" />}
                  </div>

                  {/* Granted overrides */}
                  <div>
                    <h3 className="text-green-400 text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-2">
                      <Plus size={10} />
                      Granted (+{resolution.granted.length})
                      <span className="text-gray-600 font-normal normal-case tracking-normal">beyond role template</span>
                    </h3>
                    {resolution.granted.length === 0 ? (
                      <p className="text-gray-700 text-xs italic">No extra grants — user gets base role permissions only.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {resolution.granted.map(p => (
                          <PermTag key={p} permKey={p} type="grant" label={permLabel(p)} description={permDesc(p)} onRemove={() => revokeGrant(p)} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Denied overrides */}
                  <div>
                    <h3 className="text-red-400 text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-2">
                      <Ban size={10} />
                      Denied (−{resolution.denied.length})
                      <span className="text-gray-600 font-normal normal-case tracking-normal">stripped from role template</span>
                    </h3>
                    {resolution.denied.length === 0 ? (
                      <p className="text-gray-700 text-xs italic">No denials — user has full role template access.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {resolution.denied.map(p => (
                          <PermTag key={p} permKey={p} type="deny" label={permLabel(p)} description={permDesc(p)} onRemove={() => revokeDeny(p)} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  {resolution.granted.length === 0 && resolution.denied.length === 0 && (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-gray-500 text-xs">
                      <p className="font-medium text-gray-400 mb-1">No overrides set</p>
                      <p>This user inherits all {resolution.base.length} permissions from the <span className="text-white">{userRole.replace("_", " ")}</span> role template.</p>
                      <p className="mt-1">Use "Grant Permission" to add extra access, or "Deny Permission" to restrict access below the role default.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── EFFECTIVE TAB ── */}
              {activeTab === "effective" && (
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative flex-1">
                      <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Filter permissions…"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-4 py-2 text-white text-xs placeholder-gray-600 focus:outline-none"
                      />
                    </div>
                    <span className="text-gray-500 text-xs shrink-0">{filteredEffective.length} shown</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {filteredEffective.map(p => {
                      const isGrant   = resolution.granted.includes(p)
                      const type: "grant" | "base" = isGrant ? "grant" : "base"
                      return <PermTag key={p} permKey={p} type={type} label={permLabel(p)} description={permDesc(p)} />
                    })}
                  </div>
                </div>
              )}

              {/* ── BASE TAB ── */}
              {activeTab === "base" && (
                <div className="p-6">
                  <p className="text-gray-500 text-xs mb-4">
                    These are the permissions granted by the <span className="text-white font-medium capitalize">{userRole.replace("_", " ")}</span> role template.
                    To change these for ALL users with this role, use the <span className="text-brand-400">Permission Matrix</span>.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {resolution.base.map(p => (
                      <PermTag key={p} permKey={p} type="base" label={permLabel(p)} description={permDesc(p)} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
