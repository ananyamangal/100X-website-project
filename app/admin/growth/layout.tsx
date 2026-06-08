"use client"
import { GrowthSidebar } from "@/components/admin/growth/GrowthSidebar"
import { AuthProvider }  from "@/lib/rbac/client"

export default function GrowthOSLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
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
          {children}
        </div>
      </div>
    </AuthProvider>
  )
}
