"use client"
import { useState, useRef, useEffect } from "react"
import { LogOut, ChevronDown, Shield, Monitor, User } from "lucide-react"

interface UserInfo {
  name: string
  email: string
  role: string
}

// Shared logout function — call from any admin area.
// Clears both the HTTP-only JWT cookie (via API) and the legacy client-set cookie.
export async function performAdminLogout() {
  try {
    await fetch("/api/admin/auth/logout", { method: "POST" })
  } catch { /* network error — still redirect */ }
  window.location.href = "/admin/login"
}

function roleBadge(role: string): string {
  const map: Record<string, string> = {
    super_admin:  "bg-red-100 text-red-700",
    growth_admin: "bg-purple-100 text-purple-700",
  }
  return map[role] ?? "bg-gray-100 text-gray-600"
}

function roleLabel(role: string): string {
  return role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

function initials(name: string): string {
  if (!name) return "A"
  return name.split(" ").map(w => w[0] ?? "").join("").toUpperCase().slice(0, 2) || "A"
}

// Full dropdown user menu — add to any admin header.
// Self-contained: fetches user info from /api/admin/auth/me, falls back to "Admin".
export function AdminUserMenu() {
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<UserInfo | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/admin/auth/me", { credentials: "same-origin" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user) setUser(d.user) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const displayName = user?.name || "Admin"
  const displayRole = user?.role ? roleLabel(user.role) : "Administrator"

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-white">{initials(displayName)}</span>
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-xs font-semibold text-gray-800 leading-none">{displayName}</p>
          <p className="text-[10px] text-gray-400 leading-none mt-0.5">{displayRole}</p>
        </div>
        <ChevronDown size={12} className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Identity header */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-white">{initials(displayName)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                {user?.email && <p className="text-[11px] text-gray-400 truncate">{user.email}</p>}
                <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium mt-0.5 ${
                  user?.role ? roleBadge(user.role) : "bg-gray-100 text-gray-600"
                }`}>
                  {displayRole}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="py-1">
            <a
              href="/admin/growth/security/sessions"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <User size={13} className="text-gray-400" />Profile &amp; Sessions
            </a>
            <a
              href="/admin/growth/security"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Shield size={13} className="text-gray-400" />Security
            </a>
            <a
              href="/admin/growth/security/sessions"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Monitor size={13} className="text-gray-400" />Active Sessions
            </a>
          </nav>

          {/* Sign Out */}
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

// Compact sign-out button — use in sidebar footers or toolbars.
export function AdminSignOutButton({ className = "" }: { className?: string }) {
  return (
    <button
      onClick={performAdminLogout}
      className={`flex items-center gap-2 transition-colors ${className}`}
    >
      <LogOut size={14} />
      <span>Sign Out</span>
    </button>
  )
}
