"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import { GrowthSidebar } from "@/components/admin/growth/GrowthSidebar"

export default function GrowthOSLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Same cookie name and check as the main admin page
    const token = Cookies.get("admin-token")
    if (token !== "authenticated") {
      router.replace("/admin")
    } else {
      setReady(true)
    }
  }, [router])

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Do NOT return <html> or <body> — app/admin/layout.tsx already provides those.
  // Returning nested <html>/<body> causes hydration failure and triggers the auth
  // redirect incorrectly.
  return (
    <div className="flex bg-gray-100" style={{ minHeight: "100vh" }}>
      <GrowthSidebar />
      <div style={{ marginLeft: 224, flex: 1, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  )
}
