"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Monitor, Smartphone, Tablet, Globe, Clock, LogOut,
  AlertTriangle, RefreshCw, Shield, Trash2, ShieldOff,
  CheckCircle, Loader2, Users, Search,
} from "lucide-react"
import { useAuth } from "@/lib/rbac/client"

interface Session {
  sessionId:     string
  userId:        string
  userEmail:     string
  userName:      string
  userRole:      string
  ip:            string
  browser:       string
  os:            string
  deviceType:    "desktop" | "mobile" | "tablet"
  createdAt:     string
  lastActivity:  string
  expiresAt:     string
  isRevoked:     boolean
  revokedAt:     string | null
  revokedReason: string | null
}

function DeviceIcon({ type }: { type: string }) {
  if (type === "mobile")  return <Smartphone size={14} className="text-gray-400 shrink-0" />
  if (type === "tablet")  return <Tablet     size={14} className="text-gray-400 shrink-0" />
  return <Monitor size={14} className="text-gray-400 shrink-0" />
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m    = Math.floor(diff / 60000)
  if (m < 1)   return "just now"
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function roleBadge(role: string): string {
  const map: Record<string, string> = {
    super_admin:  "bg-red-100 text-red-700",
    growth_admin: "bg-purple-100 text-purple-700",
  }
  return map[role] ?? "bg-gray-100 text-gray-600"
}

export default function SessionCenterPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [sessions,       setSessions]       = useState<Session[]>([])
  const [currentId,      setCurrentId]      = useState<string | null>(null)
  const [loading,        setLoading]        = useState(true)
  const [showAll,        setShowAll]        = useState(false)
  const [filterEmail,    setFilterEmail]    = useState("")
  const [revoking,       setRevoking]       = useState<string | null>(null)
  const [killAllOpen,    setKillAllOpen]    = useState(false)
  const [killAllBusy,    setKillAllBusy]    = useState(false)
  const [message,        setMessage]        = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const url = showAll && user?.role === "super_admin"
      ? "/api/admin/auth/sessions?all=1"
      : "/api/admin/auth/sessions"
    const res  = await fetch(url)
    const data = await res.json()
    setSessions(data.sessions ?? [])
    setCurrentId(data.currentSessionId ?? null)
    setLoading(false)
  }, [showAll, user?.role])

  useEffect(() => { if (!authLoading) load() }, [load, authLoading])

  const revokeSession = async (sessionId: string) => {
    setRevoking(sessionId)
    const res  = await fetch(`/api/admin/auth/sessions/${sessionId}`, { method: "DELETE" })
    const data = await res.json()
    if (res.ok) {
      setMessage({ ok: true, text: "Session terminated." })
      if (data.isSelf) { router.push("/admin/login"); return }
      await load()
    } else {
      setMessage({ ok: false, text: data.error ?? "Failed to terminate session" })
    }
    setRevoking(null)
  }

  const revokeOtherSessions = async () => {
    const res  = await fetch("/api/admin/auth/sessions", { method: "DELETE" })
    const data = await res.json()
    if (res.ok) {
      setMessage({ ok: true, text: `${data.revoked} other session(s) terminated.` })
      await load()
    } else {
      setMessage({ ok: false, text: data.error ?? "Failed" })
    }
  }

  const killAll = async () => {
    setKillAllBusy(true)
    const res  = await fetch("/api/admin/auth/sessions/kill-all", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ confirm: "KILL_ALL_SESSIONS" }),
    })
    const data = await res.json()
    setKillAllBusy(false)
    setKillAllOpen(false)
    if (res.ok) {
      router.push("/admin/login")
    } else {
      setMessage({ ok: false, text: data.error ?? "Kill switch failed" })
    }
  }

  const isSA = user?.role === "super_admin"

  const displayed = filterEmail.trim()
    ? sessions.filter(s =>
        s.userEmail.toLowerCase().includes(filterEmail.toLowerCase()) ||
        s.userName.toLowerCase().includes(filterEmail.toLowerCase())
      )
    : sessions

  const active  = displayed.filter(s => !s.isRevoked && new Date(s.expiresAt) > new Date())
  const revoked = displayed.filter(s => s.isRevoked)

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-[41px] z-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-brand-600" />
            <h1 className="text-sm font-bold text-gray-900">Session Center</h1>
            {!loading && (
              <span className="text-[11px] text-gray-400 ml-1">
                {active.length} active
                {revoked.length > 0 ? ` · ${revoked.length} revoked` : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isSA && (
              <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showAll}
                  onChange={e => setShowAll(e.target.checked)}
                  className="rounded"
                />
                <Users size={11} />All users
              </label>
            )}
            <button
              onClick={load}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} />Refresh
            </button>
            {active.length > 1 && (
              <button
                onClick={revokeOtherSessions}
                className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-800 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-50"
              >
                <LogOut size={11} />Terminate other sessions
              </button>
            )}
            {isSA && (
              <button
                onClick={() => setKillAllOpen(true)}
                className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-800 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 font-medium"
              >
                <ShieldOff size={11} />Emergency Kill Switch
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        {showAll && (
          <div className="mt-3 relative max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={filterEmail}
              onChange={e => setFilterEmail(e.target.value)}
              placeholder="Filter by user or email…"
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500 bg-white"
            />
          </div>
        )}
      </div>

      <div className="px-6 py-5 max-w-5xl space-y-5">

        {message && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-medium ${
            message.ok
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}>
            {message.ok ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
            {message.text}
            <button onClick={() => setMessage(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
            <Monitor size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              {filterEmail ? "No sessions match the filter." : "No sessions found."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {active.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <CheckCircle size={11} className="text-green-500"/>Active ({active.length})
                </h3>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <SessionRows
                    sessions={active}
                    currentId={currentId}
                    onRevoke={revokeSession}
                    revoking={revoking}
                    showUser={showAll}
                    roleBadge={roleBadge}
                  />
                </div>
              </section>
            )}

            {revoked.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <ShieldOff size={11}/>Revoked history ({revoked.length})
                </h3>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm opacity-60">
                  <SessionRows
                    sessions={revoked.slice(0, 20)}
                    currentId={null}
                    onRevoke={revokeSession}
                    revoking={revoking}
                    showUser={showAll}
                    roleBadge={roleBadge}
                  />
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Kill All Modal */}
      {killAllOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <ShieldOff size={18} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Emergency Kill Switch</h2>
                <p className="text-xs text-gray-400">Super Admin · Irreversible action</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-xs text-red-800 space-y-1">
              <p className="font-semibold">This will immediately:</p>
              <ul className="list-disc list-inside text-red-700 space-y-0.5">
                <li>Revoke ALL active sessions across ALL users</li>
                <li>Sign you out immediately</li>
                <li>Force all other users to sign in again</li>
                <li>Be recorded in the audit log</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setKillAllOpen(false)}
                className="flex-1 text-xs border border-gray-200 text-gray-600 py-2.5 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={killAll}
                disabled={killAllBusy}
                className="flex-1 text-xs bg-red-600 text-white py-2.5 rounded-xl hover:bg-red-700 disabled:opacity-50 font-semibold flex items-center justify-center gap-2"
              >
                {killAllBusy ? <Loader2 size={12} className="animate-spin" /> : <ShieldOff size={12} />}
                Terminate All Sessions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SessionRows({
  sessions, currentId, onRevoke, revoking, showUser, roleBadge,
}: {
  sessions:  Session[]
  currentId: string | null
  onRevoke:  (id: string) => void
  revoking:  string | null
  showUser:  boolean
  roleBadge: (role: string) => string
}) {
  return (
    <div className="divide-y divide-gray-50">
      {sessions.map(s => {
        const isCurrent = s.sessionId === currentId
        const isExpired = new Date(s.expiresAt) < new Date()
        return (
          <div key={s.sessionId} className={`flex items-start gap-4 px-5 py-4 ${isCurrent ? "bg-brand-50/40" : ""}`}>
            <DeviceIcon type={s.deviceType} />
            <div className="flex-1 min-w-0">
              {showUser && (
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-semibold text-gray-800">{s.userName}</span>
                  <span className="text-[11px] text-gray-400">{s.userEmail}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${roleBadge(s.userRole)}`}>
                    {s.userRole.replace(/_/g, " ")}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="text-xs font-semibold text-gray-700">{s.browser} on {s.os}</span>
                {isCurrent && (
                  <span className="text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-semibold">Current</span>
                )}
                {s.isRevoked && (
                  <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                    Terminated{s.revokedReason ? ` · ${s.revokedReason.replace(/_/g, " ")}` : ""}
                  </span>
                )}
                {isExpired && !s.isRevoked && (
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">Expired</span>
                )}
              </div>
              <div className="flex flex-wrap gap-3 text-[11px] text-gray-400">
                <span className="flex items-center gap-1"><Globe size={10}/>{s.ip}</span>
                <span className="flex items-center gap-1"><Clock size={10}/>Login: {fmt(s.createdAt)}</span>
                <span>Active: {timeAgo(s.lastActivity)}</span>
                {!s.isRevoked && !isExpired && <span>Expires: {fmt(s.expiresAt)}</span>}
              </div>
            </div>
            {!s.isRevoked && !isExpired && (
              <button
                onClick={() => onRevoke(s.sessionId)}
                disabled={revoking === s.sessionId}
                className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors flex-shrink-0 ${
                  isCurrent
                    ? "border-red-200 text-red-600 hover:bg-red-50"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-red-600"
                }`}
              >
                {revoking === s.sessionId
                  ? <Loader2 size={11} className="animate-spin" />
                  : <Trash2 size={11} />}
                {isCurrent ? "Sign out" : "Terminate"}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
