"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import { GrowthSidebar } from "@/components/admin/growth/GrowthSidebar"

export default function GrowthOSLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (Cookies.get("admin-token") !== "authenticated") {
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

  return (
    <html lang="en">
      <body className="bg-gray-100 min-h-screen">
        <GrowthSidebar />
        <div className="ml-56 min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  )
}
