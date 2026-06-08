"use client"
import { GrowthSidebar } from "@/components/admin/growth/GrowthSidebar"

// Auth is enforced server-side by middleware for all /admin/growth/* routes.
// If a request reaches this layout, it has already passed the middleware
// cookie check — no client-side re-check needed.
export default function GrowthOSLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f3f4f6" }}>
      <GrowthSidebar />
      {/* marginLeft tracks CSS variable set by GrowthSidebar on collapse/expand */}
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
  )
}
