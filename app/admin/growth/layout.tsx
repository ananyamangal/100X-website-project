"use client"
import { GrowthSidebar } from "@/components/admin/growth/GrowthSidebar"
import { UserMenu }      from "@/components/admin/growth/UserMenu"
import { AuthProvider }  from "@/lib/rbac/client"
import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

// Heartbeat: pings /api/admin/auth/sessions/heartbeat every 5 min.
// Returns 401 if session was revoked → redirect to login.
function SessionHeartbeat() {
  const router    = useRouter()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const ping = async () => {
      try {
        const res = await fetch("/api/admin/auth/sessions/heartbeat", { method: "POST" })
        if (res.status === 401) {
          // Session revoked or expired — redirect immediately
          router.push("/admin/login?reason=session_expired")
        }
      } catch {
        // Network error — don't redirect (could be temporary)
      }
    }

    // Ping immediately on mount, then every 5 minutes
    ping()
    intervalRef.current = setInterval(ping, 5 * 60 * 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [router])

  return null
}

export default function GrowthOSLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SessionHeartbeat />
      <div style={{ display: "flex", minHeight: "100vh", background: "#f3f4f6" }}>
        <GrowthSidebar />
        <div
          style={{
            marginLeft: "var(--sidebar-w, 224px)",
            flex: 1,
            minHeight: "100vh",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            transition: "margin-left 0.2s",
          }}
        >
          {/* Global top bar with user menu */}
          <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-end gap-2 sticky top-0 z-20">
            <UserMenu />
          </div>
          {children}
        </div>
      </div>
    </AuthProvider>
  )
}
