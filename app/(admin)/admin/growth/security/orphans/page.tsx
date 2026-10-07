"use client"

import React, { useState } from "react"
import { RefreshCw, Trash2, AlertTriangle, CheckCircle, XCircle, Users, Shield, Clock, Mail } from "lucide-react"

interface OrphanReport {
  scannedAt: string
  summary: {
    totalUsers: number
    activeUsers: number
    inactiveUsers: number
    totalIssues: number
  }
  orphans: {
    duplicateEmails: Array<{ email: string; count: number }>
    sessionsForMissingUsers: Array<{ sessionId: string; userId: string; userEmail: string; createdAt: string }>
    sessionsForInactiveUsers: Array<{ sessionId: string; userId: string; userEmail: string; createdAt: string }>
    orphanedPermissions: Array<{ userId: string; grantedCount: number; deniedCount: number }>
    permsForInactiveUsers: Array<{ userId: string; grantedCount: number; deniedCount: number }>
    expiredTokensCount: number
  }
  info: {
    neverLoggedIn: Array<{ id: string; email: string; name: string; createdAt: string }>
    inactiveUsersCount: number
  }
}

function IssueRow({ label, count, items }: { label: string; count: number; items?: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false)
  const hasIssue = count > 0
  return (
    <div className={`border rounded-xl overflow-hidden ${hasIssue ? "border-amber-800/50" : "border-gray-800/50"}`}>
      <button
        onClick={() => count > 0 && setExpanded(v => !v)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
          hasIssue ? "bg-amber-950/30 hover:bg-amber-950/50" : "bg-green-950/20"
        }`}
      >
        {hasIssue
          ? <AlertTriangle size={14} className="text-amber-400 shrink-0" />
          : <CheckCircle size={14} className="text-green-400 shrink-0" />
        }
        <span className="text-sm text-gray-200 flex-1">{label}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          hasIssue ? "bg-amber-900 text-amber-300" : "bg-green-900 text-green-300"
        }`}>
          {count}
        </span>
      </button>
      {expanded && items && (
        <div className="px-4 py-3 bg-gray-950/40 border-t border-gray-800/50 text-xs text-gray-400 space-y-1">
          {items}
        </div>
      )}
    </div>
  )
}

export default function OrphansPage() {
  const [report,   setReport]   = useState<OrphanReport | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [cleanResult, setCleanResult] = useState<Record<string, number> | null>(null)
  const [error,    setError]    = useState("")

  const scan = async () => {
    setLoading(true)
    setError("")
    setCleanResult(null)
    try {
      const res  = await fetch("/api/admin/security/orphans")
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Scan failed"); return }
      setReport(data)
    } catch { setError("Network error") }
    finally  { setLoading(false) }
  }

  const cleanup = async () => {
    if (!confirm("Run orphan cleanup? This will revoke stale sessions and delete orphaned permission records. Cannot be undone.")) return
    setCleaning(true)
    setError("")
    try {
      const res  = await fetch("/api/admin/security/orphans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "CLEANUP_ORPHANS" }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Cleanup failed"); return }
      setCleanResult(data.cleaned)
      // Re-scan after cleanup
      await scan()
    } catch { setError("Network error") }
    finally  { setCleaning(false) }
  }

  const o = report?.orphans
  const hasIssues = (report?.summary.totalIssues ?? 0) > 0

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-2xl mx-auto space-y-6">

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-white text-xl font-bold">Orphan Data Cleanup</h1>
            <p className="text-gray-500 text-sm mt-1">
              Scan for stale sessions, orphaned permissions, and duplicate emails.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={scan}
              disabled={loading}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg px-4 py-2 text-sm transition-colors"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Scan
            </button>
            {report && hasIssues && (
              <button
                onClick={cleanup}
                disabled={cleaning}
                className="flex items-center gap-2 bg-red-700 hover:bg-red-600 text-white rounded-lg px-4 py-2 text-sm transition-colors"
              >
                <Trash2 size={14} />
                {cleaning ? "Cleaning…" : "Clean Up"}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-red-300 text-sm">{error}</div>
        )}

        {cleanResult && (
          <div className="bg-green-900/20 border border-green-800 rounded-xl px-4 py-3 text-sm">
            <p className="text-green-300 font-semibold mb-2">Cleanup complete</p>
            {Object.entries(cleanResult).map(([k, v]) => (
              <p key={k} className="text-green-400 text-xs">{k}: {v} record{v !== 1 ? "s" : ""} processed</p>
            ))}
          </div>
        )}

        {!report && !loading && (
          <div className="text-center py-16 text-gray-600">
            <Trash2 size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Click Scan to check for orphaned data</p>
          </div>
        )}

        {report && (
          <div className="space-y-4">
            {/* Summary */}
            <div className={`rounded-xl px-5 py-4 border ${
              hasIssues ? "bg-amber-900/20 border-amber-800" : "bg-green-900/20 border-green-800"
            }`}>
              <div className="flex items-center gap-3">
                {hasIssues
                  ? <AlertTriangle size={20} className="text-amber-400" />
                  : <CheckCircle size={20} className="text-green-400" />
                }
                <div>
                  <p className={`font-semibold text-sm ${hasIssues ? "text-amber-300" : "text-green-300"}`}>
                    {hasIssues
                      ? `${report.summary.totalIssues} issue${report.summary.totalIssues !== 1 ? "s" : ""} found`
                      : "No orphaned data found"}
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Scanned {report.summary.totalUsers} users · {new Date(report.scannedAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-700/30">
                {[
                  { label: "Total Users",    value: report.summary.totalUsers },
                  { label: "Active",         value: report.summary.activeUsers },
                  { label: "Inactive",       value: report.summary.inactiveUsers },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className="text-white text-lg font-bold">{s.value}</p>
                    <p className="text-gray-500 text-[10px]">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Issues */}
            <div className="space-y-2">
              <IssueRow
                label="Duplicate email addresses"
                count={o?.duplicateEmails.length ?? 0}
                items={o?.duplicateEmails.map(d => (
                  <div key={d.email}>{d.email} — {d.count} records</div>
                ))}
              />
              <IssueRow
                label="Active sessions for deleted/non-existent users"
                count={o?.sessionsForMissingUsers.length ?? 0}
                items={o?.sessionsForMissingUsers.map(s => (
                  <div key={s.sessionId}>{s.userEmail} · session {s.sessionId.slice(0, 8)}…</div>
                ))}
              />
              <IssueRow
                label="Active sessions for inactive/disabled users"
                count={o?.sessionsForInactiveUsers.length ?? 0}
                items={o?.sessionsForInactiveUsers.map(s => (
                  <div key={s.sessionId}>{s.userEmail} · session {s.sessionId.slice(0, 8)}…</div>
                ))}
              />
              <IssueRow
                label="Orphaned permission records (user deleted)"
                count={o?.orphanedPermissions.length ?? 0}
                items={o?.orphanedPermissions.map((p, i) => (
                  <div key={i}>userId: {p.userId} · {p.grantedCount} grants, {p.deniedCount} denials</div>
                ))}
              />
              <IssueRow
                label="Permission records for inactive users"
                count={o?.permsForInactiveUsers.length ?? 0}
                items={o?.permsForInactiveUsers.map((p, i) => (
                  <div key={i}>userId: {p.userId} · {p.grantedCount} grants, {p.deniedCount} denials</div>
                ))}
              />
              <IssueRow
                label="Expired (un-consumed) password reset tokens"
                count={o?.expiredTokensCount ?? 0}
              />
            </div>

            {/* Info */}
            {report.info.neverLoggedIn.length > 0 && (
              <div className="border border-gray-800 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-900/60">
                  <Users size={14} className="text-gray-400" />
                  <span className="text-xs font-semibold text-gray-300">
                    Active users who have never logged in ({report.info.neverLoggedIn.length})
                  </span>
                </div>
                <div className="px-4 py-2 space-y-1">
                  {report.info.neverLoggedIn.map(u => (
                    <div key={u.id} className="flex items-center gap-3 text-xs py-1">
                      <span className="text-gray-300 font-medium">{u.name}</span>
                      <span className="text-gray-500">{u.email}</span>
                      <span className="text-gray-700 ml-auto">
                        created {new Date(u.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
