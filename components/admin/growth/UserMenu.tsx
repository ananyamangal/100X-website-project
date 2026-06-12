"use client"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import {
  User, Shield, Monitor, Key, LogOut,
  ChevronDown, Clock, AlertTriangle,
} from "lucide-react"
import { useAuth } from "@/lib/rbac/client"
import { performAdminLogout } from "@/components/admin/AdminUserMenu"

function initials(name: string): string {
  if (!name) return "?"
  return name.split(" ").map(w => w[0] ?? "").join("").toUpperCase().slice(0, 2) || "?"
}

function roleBadgeColor(role: string): string {
  const map: Record<string, string> = {
    super_admin:         "bg-red-100 text-red-700 border-red-200",
    growth_admin:        "bg-purple-100 text-purple-700 border-purple-200",
    seo_team:            "bg-blue-100 text-blue-700 border-blue-200",
    sales_manager:       "bg-green-100 text-green-700 border-green-200",
    sales_executive:     "bg-emerald-100 text-emerald-700 border-emerald-200",
    procurement_analyst: "bg-amber-100 text-amber-700 border-amber-200",
    content_team:        "bg-cyan-100 text-cyan-700 border-cyan-200",
    viewer:              "bg-gray-100 text-gray-600 border-gray-200",
  }
  return map[role] ?? "bg-gray-100 text-gray-600 border-gray-200"
}

const MENU_ITEMS = [
  { href: "/admin/growth/security/sessions", label: "My Profile",        icon: User    },
  { href: "/admin/growth/security/sessions", label: "Active Sessions",   icon: Monitor },
  { href: "/admin/growth/security",          label: "Security",          icon: Shield  },
  { href: "/admin/growth/security/sessions", label: "Change Password",   icon: Key     },
]

export function UserMenu() {
  const [open, setOpen]       = useState(false)
  const [loginTime, setLoginTime] = useState<Date | null>(null)
  const { user, loading }     = useAuth()

  useEffect(() => { setLoginTime(new Date()) }, [])
  const ref                   = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  if (loading || !user) {
    return <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
  }

  const roleName = user.role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
      >
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold text-white">{initials(user.name)}</span>
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-xs font-semibold text-gray-800 leading-none">{user.name.split(" ")[0]}</p>
          <p className="text-[10px] text-gray-400 leading-none mt-0.5 capitalize">{roleName}</p>
        </div>
        <ChevronDown size={12} className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-white">{initials(user.name)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border font-medium mt-1 ${roleBadgeColor(user.role)}`}>
                  {roleName}
                </span>
              </div>
            </div>
          </div>

          {/* Session info */}
          <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2 text-[11px] text-gray-400">
            <Clock size={11} />
            <span>Logged in at {loginTime ? loginTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "–"}</span>
          </div>

          {/* Menu items */}
          <nav className="py-1">
            <Link
              href="/admin/growth/security/sessions"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <User size={13} className="text-gray-400" />My Profile
            </Link>
            <Link
              href="/admin/growth/security"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Shield size={13} className="text-gray-400" />Security
            </Link>
            <Link
              href="/admin/growth/security/sessions"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Monitor size={13} className="text-gray-400" />Active Sessions
            </Link>
            <Link
              href="/admin/change-password"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Key size={13} className="text-gray-400" />Change Password
            </Link>
          </nav>

          {/* Divider */}
          <div className="border-t border-gray-100 py-1">
            <button
              onClick={performAdminLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={13} />Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Compact security banner — shows in page headers
export function SecurityBanner() {
  const { user, loading } = useAuth()
  const [loginTime, setLoginTime] = useState<Date | null>(null)

  useEffect(() => { setLoginTime(new Date()) }, [])

  if (loading || !user) return null

  const roleName = user.role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div className="flex items-center gap-2 text-[10px] text-gray-400 border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50">
      <div className="w-4 h-4 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
        <span className="text-[8px] font-bold text-white">{initials(user.name)}</span>
      </div>
      <span className="hidden md:inline">
        <span className="text-gray-600 font-medium">{user.name}</span>
        <span className="mx-1 text-gray-300">·</span>
        <span className="capitalize">{roleName}</span>
        <span className="mx-1 text-gray-300">·</span>
        <span>Since {loginTime ? loginTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "–"}</span>
      </span>
      <span className="md:hidden text-gray-600 font-medium">{user.name.split(" ")[0]}</span>
    </div>
  )
}

// Floating warning shown when user is idle (inactivity warning)
export function InactivityWarning({ minutesLeft, onExtend }: { minutesLeft: number; onExtend: () => void }) {
  if (minutesLeft > 5) return null
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-amber-50 border border-amber-200 rounded-xl shadow-lg p-4 max-w-sm animate-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-amber-800">Session expiring soon</p>
          <p className="text-[11px] text-amber-700 mt-0.5">
            Your session will expire in {minutesLeft} minute{minutesLeft !== 1 ? "s" : ""}.
          </p>
          <button
            onClick={onExtend}
            className="mt-2 text-[11px] bg-amber-600 text-white px-3 py-1 rounded-lg hover:bg-amber-700 font-medium"
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  )
}
