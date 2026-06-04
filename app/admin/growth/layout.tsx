"use client"
import { GrowthSidebar } from "@/components/admin/growth/GrowthSidebar"

// Auth is enforced server-side by middleware for all /admin/growth/* routes.
// If a request reaches this layout, it has already passed the middleware
// cookie check — no client-side re-check needed.
export default function GrowthOSLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f3f4f6" }}>
      <GrowthSidebar />
      <div style={{ marginLeft: 224, flex: 1, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  )
}
