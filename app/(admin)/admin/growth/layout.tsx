"use client"
import { GrowthSidebar }    from "@/components/admin/growth/GrowthSidebar"
import { UserMenu }         from "@/components/admin/growth/UserMenu"
import { Breadcrumb }       from "@/components/admin/growth/Breadcrumb"
import { CommandPalette }   from "@/components/admin/growth/CommandPalette"
import { PageHelp, openPageHelp } from "@/components/admin/growth/PageHelp"
import { AuthProvider }     from "@/lib/rbac/client"
import { useEffect, useRef } from "react"
import { useRouter }        from "next/navigation"
import Link                 from "next/link"
import { Search, LayoutDashboard, Globe } from "lucide-react"

// Heartbeat: pings /api/admin/auth/sessions/heartbeat every 5 min.
// Returns 401 if session was revoked → redirect to login.
function SessionHeartbeat() {
  const router      = useRouter()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const ping = async () => {
      try {
        const res = await fetch("/api/admin/auth/sessions/heartbeat", { method: "POST" })
        if (res.status === 401) router.push("/admin/login?reason=session_expired")
      } catch {
        // Network error — don't redirect (could be temporary)
      }
    }
    ping()
    intervalRef.current = setInterval(ping, 5 * 60 * 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [router])

  return null
}

function openCommandPalette() {
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }))
}

export default function GrowthOSLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SessionHeartbeat />
      <CommandPalette />
      <PageHelp />
      <div style={{ display: "flex", minHeight: "100vh", background: "#f3f4f6" }}>
        <GrowthSidebar />
        <div
          style={{
            marginLeft:    "var(--sidebar-w, 224px)",
            flex:          1,
            minHeight:     "100vh",
            minWidth:      0,
            display:       "flex",
            flexDirection: "column",
            overflow:      "hidden",
            transition:    "margin-left 0.2s",
          }}
        >
          {/* ── Global top bar ──────────────────────────────────────────────── */}
          <div className="bg-white border-b border-gray-200 px-3 py-1.5 flex items-center justify-between gap-3 sticky top-0 z-20">

            {/* Left: back links + breadcrumb */}
            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
              <Link
                href="/admin"
                className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800 border border-gray-200 rounded px-2 py-1 hover:border-gray-300 transition-colors flex-shrink-0 bg-gray-50 hover:bg-white"
                title="Main Admin Dashboard"
              >
                <LayoutDashboard size={11} />
                <span className="hidden sm:inline">Admin</span>
              </Link>
              <Link
                href="/"
                className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800 border border-gray-200 rounded px-2 py-1 hover:border-gray-300 transition-colors flex-shrink-0 bg-gray-50 hover:bg-white"
                title="Public Website"
              >
                <Globe size={11} />
                <span className="hidden sm:inline">Website</span>
              </Link>
              <span className="text-gray-200 flex-shrink-0 hidden sm:inline select-none">│</span>
              <Breadcrumb />
            </div>

            {/* Right: CMD+K search + user menu */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Desktop search pill */}
              <button
                onClick={openCommandPalette}
                className="hidden md:flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-gray-500 border border-gray-200 rounded-md hover:border-gray-300 hover:text-gray-700 transition-colors bg-gray-50 hover:bg-white"
                title="Search (⌘K)"
              >
                <Search size={11} />
                <span>Search</span>
                <kbd className="text-[9px] px-1 py-0.5 rounded bg-white border border-gray-200 font-mono text-gray-400 leading-none ml-1">
                  ⌘K
                </kbd>
              </button>
              {/* Mobile search icon */}
              <button
                onClick={openCommandPalette}
                className="md:hidden flex items-center justify-center w-7 h-7 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50"
                title="Search (⌘K)"
              >
                <Search size={13} />
              </button>
              {/* Page help button */}
              <button
                onClick={openPageHelp}
                className="flex items-center justify-center w-7 h-7 rounded-md border border-gray-200 text-gray-500 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 transition-colors"
                title="Explain this page (?)"
              >
                <span className="text-[12px] font-bold leading-none">?</span>
              </button>
              <UserMenu />
            </div>
          </div>

          {children}
        </div>
      </div>
    </AuthProvider>
  )
}
