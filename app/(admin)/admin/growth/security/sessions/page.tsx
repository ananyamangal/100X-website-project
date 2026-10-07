"use client"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Monitor, Smartphone, Tablet, Globe, Clock, LogOut,
  AlertTriangle, RefreshCw, Shield, Trash2, ShieldOff,
  CheckCircle, Loader2, Users,
} from "lucide-react"
import { useAuth } from "@/lib/rbac/client"

interface Session {
  sessionId:    string
  userId:       string
  userEmail:    string
  userName:     string
  userRole:     string
  ip:           string
  browser:      string
  os:           string
  deviceType:   "desktop" | "mobile" | "tablet"
  createdAt:    string
  lastActivity: string
  expiresAt:    string
  isRevoked:    boolean
  revokedAt:    string | null
  revokedReason: string | null
}

function DeviceIcon({ type }: { type: string }) {
  if (type === "mobile")  return <Smartphone size={14} className="text-gray-400" />
  if (type === "tablet")  return <Tablet     size={14} className="text-gray-400" />
  return <Monitor size={14} className="text-gray-400" />
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

export default function SessionsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [sessions, setSessions]         = useState<Session[]>([])
  const [currentId, setCurrentId]       = useState<string | null>(null)
  const [loading, setLoading]           = useState(true)
  const [showAll, setShowAll]           = useState(false)
  const [revoking, setRevoking]         = useState<string | null>(null)
  const [killAllOpen, setKillAllOpen]   = useState(false)
  const [killAllBusy, setKillAllBusy]   = useState(false)
  const [message, setMessage]           = useState<{ ok: boolean; text: string } | null>(null)

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
      setMessage({ ok: true, text: "Session revoked." })
      if (data.isSelf) {
        router.push("/admin/login")
        return
      }
      await load()
    } else {
      setMessage({ ok: false, text: data.error ?? "Failed to revoke session" })
    }
    setRevoking(null)
  }

  const revokeOthers = async () => {
    const res  = await fetch("/api/admin/auth/sessions", { method: "DELETE" })
    const data = await res.json()
    if (res.ok) {
      setMessage({ ok: true, text: `${data.revoked} other session(s) revoked.` })
      await load()
    } else {
      setMessage({ ok: false, text: data.error ?? "Failed" })
    }
  }

  const killAll = async () => {
    setKillAllBusy(true)
    const res  = await fetch("/api/admin/auth/sessions/kill-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "KILL_ALL_SESSIONS" }),
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

  const active   = sessions.filter(s => !s.isRevoked && new Date(s.expiresAt) > new Date())
  const revoked  = sessions.filter(s => s.isRevoked)
  const isSA     = user?.role === "super_admin"

  // Group by user if showing all sessions
  const grouped = showAll
    ? sessions.reduce<Record<string, Session[]>>((acc, s) => {
        const key = `${s.userEmail}|||${s.userName}|||${s.userRole}`
        if (!acc[key]) acc[key] = []
        acc[key].push(s)
        return acc
      }, {})
    : null

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-[41px] z-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-brand-600" />
            <h1 className="text-sm font-bold text-gray-900">Active Sessions</h1>
            {!loading && (
              <span className="text-[11px] text-gray-400 ml-1">
                {active.length} active{revoked.length > 0 ? ` · ${revoked.length} revoked` : ""}
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
            <button onClick={load}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">
              <RefreshCw size={11} />Refresh
            </button>
            {active.length > 1 && (
              <button onClick={revokeOthers}
                className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-800 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-50">
                <LogOut size={11} />Sign out other sessions
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
      </div>

      <div className="px-6 py-5 max-w-5xl space-y-5">

        {/* Toast */}
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

        {/* Security info for current user */}
        {!showAll && user && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-white">
                  {user.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${roleBadge(user.role)}`}>
                    {user.role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">{user.email}</p>
              </div>
              <div className="text-right text-[11px] text-gray-400">
                <p>{active.length} active session{active.length !== 1 ? "s" : ""}</p>
                <p>
                  {user.role === "super_admin" || user.role === "growth_admin"
                    ? "8-hour timeout"
                    : "4-hour timeout"}
                </p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
            <Monitor size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No sessions found.</p>
          </div>
        ) : showAll && grouped ? (
          // All-users view: grouped by user
          <div className="space-y-5">
            {Object.entries(grouped).map(([key, userSessions]) => {
              const [email, name, role] = key.split("|||")
              const userActive = userSessions.filter(s => !s.isRevoked && new Date(s.expiresAt) > new Date())
              return (
                <div key={key} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-white">
                        {name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-gray-800">{name}</span>
                      <span className="text-[11px] text-gray-400 ml-2">{email}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${roleBadge(role)}`}>
                      {role.replace(/_/g, " ")}
                    </span>
                    <span className="text-[11px] text-gray-400">{userActive.length} active</span>
                  </div>
                  <SessionList sessions={userSessions} currentId={currentId} onRevoke={revokeSession} revoking={revoking} />
                </div>
              )
            })}
          </div>
        ) : (
          // Own sessions view
          <div className="space-y-4">
            {active.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Active ({active.length})</h3>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <SessionList sessions={active} currentId={currentId} onRevoke={revokeSession} revoking={revoking} />
                </div>
              </div>
            )}
            {revoked.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Revoked History ({revoked.length})</h3>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm opacity-60">
                  <SessionList sessions={revoked.slice(0, 10)} currentId={null} onRevoke={revokeSession} revoking={revoking} />
                </div>
              </div>
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
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 space-y-2 text-xs text-red-800">
              <p className="font-semibold">This will immediately:</p>
              <ul className="space-y-1 list-disc list-inside text-red-700">
                <li>Revoke ALL active sessions across ALL users</li>
                <li>Sign you out immediately</li>
                <li>Force all other users to sign in again</li>
                <li>Be recorded in the audit log</li>
              </ul>
            </div>
            <p className="text-xs text-gray-600 mb-4">
              Use this only if you suspect a compromised session or security breach.
            </p>
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

function SessionList({ sessions, currentId, onRevoke, revoking }: {
  sessions: Session[]
  currentId: string | null
  onRevoke: (id: string) => void
  revoking: string | null
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
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="text-xs font-semibold text-gray-800">{s.browser} on {s.os}</span>
                {isCurrent && (
                  <span className="text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-semibold">Current</span>
                )}
                {s.isRevoked && (
                  <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                    Revoked {s.revokedReason ? `· ${s.revokedReason.replace("_", " ")}` : ""}
                  </span>
                )}
                {isExpired && !s.isRevoked && (
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">Expired</span>
                )}
              </div>
              <div className="flex flex-wrap gap-3 text-[11px] text-gray-400">
                <span className="flex items-center gap-1"><Globe size={10} />{s.ip}</span>
                <span className="flex items-center gap-1"><Clock size={10} />Login: {fmt(s.createdAt)}</span>
                <span className="flex items-center gap-1">Active: {timeAgo(s.lastActivity)}</span>
                {!s.isRevoked && !isExpired && (
                  <span>Expires: {fmt(s.expiresAt)}</span>
                )}
              </div>
            </div>
            {!s.isRevoked && !isExpired && (
              <button
                onClick={() => onRevoke(s.sessionId)}
                disabled={revoking === s.sessionId}
                title={isCurrent ? "Sign out" : "Revoke session"}
                className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors flex-shrink-0 ${
                  isCurrent
                    ? "border-red-200 text-red-600 hover:bg-red-50"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-red-600"
                }`}
              >
                {revoking === s.sessionId
                  ? <Loader2 size={11} className="animate-spin" />
                  : <Trash2 size={11} />}
                {isCurrent ? "Sign out" : "Revoke"}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
