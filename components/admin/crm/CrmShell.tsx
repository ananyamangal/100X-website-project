"use client"
import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AuthProvider, useAuth } from "@/lib/rbac/client"

interface NavItem {
  href: string
  label: string
  /** Hide when the (client-side) session lacks this key. Server enforces regardless. */
  perm?: string
  disabled?: boolean
}

const NAV: NavItem[] = [
  { href: "/admin/crm/leads", label: "Leads" },
  { href: "/admin/crm/tasks", label: "Tasks" },
  { href: "/admin/crm/log-call", label: "Log a call", perm: "crm.leads.create" },
  { href: "/admin/crm/dealers", label: "Dealers import", perm: "crm.import.run" },
  { href: "/admin/crm/inbox", label: "Inbox", perm: "crm.inbox.view" },
  { href: "/admin/crm/broadcasts", label: "Broadcasts", perm: "crm.broadcasts.view" },
  { href: "/admin/crm/reports", label: "Reports", perm: "crm.reports.view" },
  { href: "/admin/crm/reminders", label: "Reminders", perm: "crm.settings.edit" },
  { href: "/admin/crm/automation", label: "Automation", perm: "crm.settings.edit" },
  { href: "/admin/crm/settings", label: "Settings" },
]

function Nav() {
  const path = usePathname() ?? ""
  const { user, permissions, loading } = useAuth()
  const isSuper = user?.role === "super_admin"
  const visible = NAV.filter(n => loading || !n.perm || isSuper || (permissions as string[]).includes(n.perm))
  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2">
        <Link href="/admin/crm/leads" className="shrink-0 pr-2 text-base font-bold text-gray-900">
          Sales CRM
        </Link>
        <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto" aria-label="CRM sections">
          {visible.map(n =>
            n.disabled ? (
              <span key={n.label} title="Coming soon" className="shrink-0 cursor-not-allowed rounded-lg px-3 py-2 text-sm text-gray-400">
                {n.label}
              </span>
            ) : (
              <Link
                key={n.href}
                href={n.href}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${
                  path.startsWith(n.href) ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {n.label}
              </Link>
            ),
          )}
        </nav>
        <Link href="/admin" className="hidden shrink-0 text-xs text-gray-500 hover:text-gray-800 sm:inline">
          Admin home
        </Link>
      </div>
    </header>
  )
}

function Body({ children }: { children: ReactNode }) {
  const [problem, setProblem] = useState(false)
  useEffect(() => {
    let live = true
    fetch("/api/admin/auth/me", { credentials: "same-origin", cache: "no-store" })
      .then(r => {
        if (!live) return
        if (r.status === 401) window.location.href = "/admin/login?reason=session_expired"
        else if (!r.ok) setProblem(true)
      })
      .catch(() => { if (live) setProblem(true) })
    return () => { live = false }
  }, [])
  return (
    <main className="mx-auto max-w-6xl px-3 py-4">
      {problem && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          Could not check your session. Check your connection, then reload the page.
        </div>
      )}
      {children}
    </main>
  )
}

export function CrmShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <Nav />
        <Body>{children}</Body>
      </div>
    </AuthProvider>
  )
}
