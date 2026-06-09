"use client"

import React, { useEffect, useState, useCallback } from "react"
import { Shield, RefreshCw, Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input }  from "@/components/ui/input"

type AuditEntry = {
  id:        string
  action:    string
  email:     string
  userId:    string | null
  ip:        string
  userAgent: string
  details:   Record<string, unknown>
  timestamp: string
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  login:                      { label: "Login",              color: "bg-green-100 text-green-800" },
  logout:                     { label: "Logout",             color: "bg-gray-100 text-gray-700" },
  login_failed:               { label: "Failed Login",       color: "bg-red-100 text-red-800" },
  password_reset_requested:   { label: "Reset Requested",    color: "bg-amber-100 text-amber-800" },
  password_changed:           { label: "Password Changed",   color: "bg-blue-100 text-blue-800" },
  account_locked:             { label: "Account Locked",     color: "bg-red-100 text-red-800" },
  account_unlocked:           { label: "Account Unlocked",   color: "bg-green-100 text-green-800" },
  reset_token_expired:        { label: "Token Expired",      color: "bg-gray-100 text-gray-600" },
  reset_token_used:           { label: "Token Used",         color: "bg-gray-100 text-gray-600" },
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function AuthAuditLogPage() {
  const [entries,    setEntries]    = useState<AuditEntry[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState("")
  const [search,     setSearch]     = useState("")
  const [actionFilt, setActionFilt] = useState("")
  const [expanded,   setExpanded]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams({ limit: "200" })
      if (search.trim())     params.set("email",  search.trim())
      if (actionFilt.trim()) params.set("action", actionFilt.trim())
      const res  = await fetch(`/api/admin/auth/audit-log?${params}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Failed to load"); return }
      setEntries(data.entries)
    } catch { setError("Network error") }
    finally { setLoading(false) }
  }, [search, actionFilt])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-[41px] z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-brand-600" />
            <h1 className="text-sm font-bold text-gray-900">Auth Audit Log</h1>
            <span className="text-xs text-gray-400">({entries.length} entries)</span>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="text-xs gap-1.5">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="px-6 py-4 space-y-4 max-w-5xl">
        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Filter by email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-white"
            />
          </div>
          <div className="relative">
            <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={actionFilt}
              onChange={e => setActionFilt(e.target.value)}
              className="pl-8 pr-3 h-8 text-xs bg-white border border-gray-200 rounded-md appearance-none cursor-pointer"
            >
              <option value="">All actions</option>
              {Object.keys(ACTION_LABELS).map(a => (
                <option key={a} value={a}>{ACTION_LABELS[a].label}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No entries found.</div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Time", "Action", "Email", "IP", ""].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map(e => {
                  const meta = ACTION_LABELS[e.action] ?? { label: e.action, color: "bg-gray-100 text-gray-600" }
                  const isExpanded = expanded === e.id
                  return (
                    <React.Fragment key={e.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                          <span title={new Date(e.timestamp).toLocaleString()}>{timeAgo(e.timestamp)}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${meta.color}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-700 font-medium">{e.email}</td>
                        <td className="px-4 py-2.5 text-gray-500 font-mono">{e.ip}</td>
                        <td className="px-4 py-2.5 text-right">
                          {Object.keys(e.details).length > 0 && (
                            <button
                              onClick={() => setExpanded(isExpanded ? null : e.id)}
                              className="text-brand-600 hover:underline text-[11px]"
                            >
                              {isExpanded ? "Hide" : "Details"}
                            </button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="px-4 py-3 bg-gray-50">
                            <pre className="text-[11px] text-gray-600 whitespace-pre-wrap font-mono">
                              {JSON.stringify(e.details, null, 2)}
                            </pre>
                            <p className="text-[11px] text-gray-400 mt-1">UA: {e.userAgent}</p>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
