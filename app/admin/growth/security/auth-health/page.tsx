"use client"

import { useEffect, useState } from "react"
import {
  Shield, Users, Monitor, Lock, AlertTriangle,
  CheckCircle, RefreshCw, Chrome, Mail, Key, Clock,
} from "lucide-react"

interface AuthHealthData {
  users: {
    total: number
    active: number
    locked: number
    light: "green" | "yellow" | "red"
  }
  sessions: {
    active: number
    light: "green" | "yellow" | "red"
  }
  failedLoginsToday: {
    count: number
    light: "green" | "yellow" | "red"
    recent: Array<{ email: string; timestamp: string; ip: string }>
  }
  passwordResetsToday: number
  googleLoginsToday: number
  email: {
    configured: boolean
    successRate: number | null
    sentLast7d: number
    failedLast7d: number
    light: "green" | "yellow" | "red"
  }
  asOf: string
}

type TrafficLight = "green" | "yellow" | "red"

function TrafficLightDot({ light }: { light: TrafficLight }) {
  const colors = {
    green:  "bg-green-500 shadow-green-500/60",
    yellow: "bg-amber-400 shadow-amber-400/60",
    red:    "bg-red-500 shadow-red-500/60",
  }
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full shadow-md ${colors[light]}`} />
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  light,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  light?: TrafficLight
}) {
  const borderColors = {
    green:  "border-green-800/50",
    yellow: "border-amber-800/50",
    red:    "border-red-800/50",
  }
  const bgColors = {
    green:  "bg-green-900/10",
    yellow: "bg-amber-900/10",
    red:    "bg-red-900/10",
  }
  return (
    <div className={`rounded-xl border p-4 ${
      light ? `${borderColors[light]} ${bgColors[light]}` : "border-gray-800 bg-gray-900"
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-gray-400" />
          <span className="text-xs text-gray-400">{label}</span>
        </div>
        {light && <TrafficLightDot light={light} />}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
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

export default function AuthHealthPage() {
  const [data,    setData]    = useState<AuthHealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState("")

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const res  = await fetch("/api/admin/security/auth-health")
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? "Failed"); return }
      setData(json)
    } catch { setError("Network error") }
    finally  { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // Overall system health
  function overallLight(): TrafficLight {
    if (!data) return "green"
    const lights: TrafficLight[] = [
      data.users.light,
      data.sessions.light,
      data.failedLoginsToday.light,
      data.email.light,
    ]
    if (lights.includes("red"))    return "red"
    if (lights.includes("yellow")) return "yellow"
    return "green"
  }

  return (
    <div className="flex-1 bg-gray-950 min-h-screen">
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 sticky top-[41px] z-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-green-500" />
            <h1 className="text-sm font-bold text-white">Auth Health</h1>
            {!loading && data && (
              <div className="flex items-center gap-1.5 ml-2">
                <TrafficLightDot light={overallLight()} />
                <span className="text-[11px] text-gray-500 capitalize">{overallLight()}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!loading && data && (
              <span className="text-[11px] text-gray-600">
                As of {fmt(data.asOf)}
              </span>
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

      <div className="px-6 py-6 max-w-4xl space-y-6">

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-red-300 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : data && (
          <>
            {/* Metric grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <MetricCard
                icon={Users}
                label="Total Users"
                value={data.users.total}
                sub={`${data.users.active} active`}
                light={data.users.light}
              />
              <MetricCard
                icon={Monitor}
                label="Active Sessions"
                value={data.sessions.active}
                light={data.sessions.light}
              />
              <MetricCard
                icon={Lock}
                label="Locked / Disabled"
                value={data.users.locked}
                light={data.users.light}
              />
              <MetricCard
                icon={AlertTriangle}
                label="Failed Logins Today"
                value={data.failedLoginsToday.count}
                light={data.failedLoginsToday.light}
              />
              <MetricCard
                icon={Key}
                label="Password Resets Today"
                value={data.passwordResetsToday}
              />
              <MetricCard
                icon={Chrome}
                label="Google Logins Today"
                value={data.googleLoginsToday}
              />
              <MetricCard
                icon={Mail}
                label="Email Delivery (7d)"
                value={data.email.successRate !== null ? `${data.email.successRate}%` : "N/A"}
                sub={data.email.configured
                  ? `${data.email.sentLast7d} sent · ${data.email.failedLast7d} failed`
                  : "Email not configured"}
                light={data.email.light}
              />
            </div>

            {/* Traffic light legend */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-1.5">
                <Shield size={12}/>Traffic Light Legend
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {([
                  { light: "green"  as TrafficLight, label: "GREEN",  desc: "System healthy — no action needed" },
                  { light: "yellow" as TrafficLight, label: "YELLOW", desc: "Monitor — possible issue forming" },
                  { light: "red"    as TrafficLight, label: "RED",    desc: "Attention required — investigate now" },
                ] as const).map(row => (
                  <div key={row.light} className="flex items-center gap-2">
                    <TrafficLightDot light={row.light} />
                    <span className="font-semibold text-gray-300">{row.label}</span>
                    <span className="text-gray-500">{row.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent failed logins */}
            {data.failedLoginsToday.recent.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
                  <AlertTriangle size={13} className="text-amber-400"/>
                  <span className="text-xs font-semibold text-gray-200">Recent Failed Logins</span>
                </div>
                <div className="divide-y divide-gray-800/60">
                  {data.failedLoginsToday.recent.map((row, i) => (
                    <div key={i} className="px-4 py-3 flex items-center gap-4 text-xs">
                      <AlertTriangle size={11} className="text-red-400 shrink-0"/>
                      <span className="text-gray-300 font-medium">{row.email}</span>
                      <span className="text-gray-600 font-mono">{row.ip}</span>
                      <span className="text-gray-500 ml-auto flex items-center gap-1">
                        <Clock size={10}/>{fmt(row.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Email config notice */}
            {!data.email.configured && (
              <div className="bg-amber-900/20 border border-amber-800 rounded-xl px-4 py-3 flex items-start gap-3">
                <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5"/>
                <div className="text-xs">
                  <p className="text-amber-300 font-semibold">Email not configured</p>
                  <p className="text-amber-200/70 mt-1">
                    Password reset emails will fail. Set <code className="bg-gray-900 px-1 rounded">EMAIL_USER</code> and{" "}
                    <code className="bg-gray-900 px-1 rounded">EMAIL_APP_PASSWORD</code> in Vercel environment variables.
                    Check the{" "}
                    <a href="/admin/growth/security/email-diagnostics" className="text-amber-400 underline">
                      Email Diagnostics
                    </a>{" "}
                    page for setup instructions.
                  </p>
                </div>
              </div>
            )}

            {/* All-green banner */}
            {overallLight() === "green" && (
              <div className="bg-green-900/20 border border-green-800 rounded-xl px-5 py-4 flex items-center gap-3">
                <CheckCircle size={18} className="text-green-400"/>
                <p className="text-green-300 text-sm font-medium">All systems healthy</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
