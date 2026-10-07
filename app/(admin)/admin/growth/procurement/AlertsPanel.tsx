"use client"
import { useEffect, useState, useCallback } from "react"
import { Bell, X, CheckCheck, AlertCircle, Info, AlertTriangle, TrendingUp } from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Alert {
  _id:         string
  type:        string
  title:       string
  description: string
  severity:    "high" | "warning" | "info"
  created_at:  string
  read:        boolean
}

interface AlertsData {
  alerts:       Alert[]
  unread_count: number
}

// ─── Severity styles ────────────────────────────────────────────────────────────

const SEV = {
  high:    { icon: AlertCircle,   cls: "text-red-600 bg-red-50 border-red-200" },
  warning: { icon: AlertTriangle, cls: "text-amber-600 bg-amber-50 border-amber-200" },
  info:    { icon: Info,          cls: "text-blue-600 bg-blue-50 border-blue-200" },
}

const TYPE_ICON: Record<string, React.ElementType> = {
  new_dealer:           Bell,
  new_fogging_opp:      TrendingUp,
  large_contract:       AlertCircle,
  category_growth_spike:TrendingUp,
  fragmented_market:    Info,
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)   return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400)return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// ─── Alert item ─────────────────────────────────────────────────────────────────

function AlertItem({ alert, onMarkRead }: { alert: Alert; onMarkRead: (id: string) => void }) {
  const sev = SEV[alert.severity] || SEV.info
  const SevIcon = sev.icon
  const TypeIcon = TYPE_ICON[alert.type] || Bell

  return (
    <div className={`border rounded-lg px-3 py-2.5 space-y-1 transition-opacity ${
      alert.read ? "opacity-60" : ""
    } ${sev.cls}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <SevIcon size={12} className="flex-shrink-0 mt-0.5" />
          <p className={`text-xs font-semibold ${alert.read ? "text-gray-500" : ""}`}>{alert.title}</p>
          {!alert.read && <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] opacity-70">{timeAgo(alert.created_at)}</span>
          {!alert.read && (
            <button onClick={() => onMarkRead(alert._id)}
              title="Mark as read"
              className="opacity-60 hover:opacity-100 transition-opacity">
              <CheckCheck size={11} />
            </button>
          )}
        </div>
      </div>
      {alert.description && (
        <p className="text-[10px] opacity-80 ml-5">{alert.description}</p>
      )}
      <div className="flex items-center gap-1 ml-5">
        <TypeIcon size={9} className="opacity-50" />
        <span className="text-[9px] opacity-50 uppercase tracking-wide">{alert.type.replace(/_/g, " ")}</span>
      </div>
    </div>
  )
}

// ─── Trigger button (badge) ─────────────────────────────────────────────────────

export function AlertsBell({ onClick, count }: { onClick: () => void; count: number }) {
  return (
    <button onClick={onClick} className="relative text-gray-400 hover:text-gray-700 transition-colors">
      <Bell size={15} />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  )
}

// ─── Slide-over panel ───────────────────────────────────────────────────────────

export function AlertsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [data, setData]       = useState<AlertsData | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetch("/api/admin/procurement/alerts")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { if (open) load() }, [open, load])

  const markRead = async (id: string) => {
    await fetch("/api/admin/procurement/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, read: true }),
    })
    setData(prev => prev ? {
      ...prev,
      unread_count: Math.max(0, prev.unread_count - 1),
      alerts: prev.alerts.map(a => a._id === id ? { ...a, read: true } : a),
    } : prev)
  }

  const markAllRead = async () => {
    await fetch("/api/admin/procurement/alerts?mark_read=all")
    setData(prev => prev ? {
      ...prev,
      unread_count: 0,
      alerts: prev.alerts.map(a => ({ ...a, read: true })),
    } : prev)
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-800">Procurement Alerts</p>
            {data && data.unread_count > 0 && (
              <p className="text-xs text-red-500">{data.unread_count} unread</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {data && data.unread_count > 0 && (
              <button onClick={markAllRead}
                className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1">
                <CheckCheck size={10} />All read
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {loading && (
            <div className="text-center py-8 text-xs text-gray-400">Loading alerts…</div>
          )}

          {!loading && (!data || data.alerts.length === 0) && (
            <div className="text-center py-12 space-y-2">
              <Bell size={24} className="mx-auto text-gray-200" />
              <p className="text-xs text-gray-400">No alerts yet.</p>
              <p className="text-[10px] text-gray-300">Generate insights to create alerts.</p>
            </div>
          )}

          {!loading && data && data.alerts.map(alert => (
            <AlertItem key={alert._id} alert={alert} onMarkRead={markRead} />
          ))}
        </div>

        <div className="px-3 py-2 border-t border-gray-100 text-[10px] text-gray-400 text-center">
          Alerts generated automatically by Insights Engine · runs nightly
        </div>
      </div>
    </>
  )
}

// ─── Hook for unread count ──────────────────────────────────────────────────────

export function useAlertCount(): number {
  const [count, setCount] = useState(0)
  useEffect(() => {
    fetch("/api/admin/procurement/alerts")
      .then(r => r.json())
      .then(d => setCount(d.unread_count || 0))
      .catch(() => {})
  }, [])
  return count
}
