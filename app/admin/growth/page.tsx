"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function GrowthRoot() {
  const router = useRouter()
  useEffect(() => { router.replace("/admin/growth/dashboard") }, [router])
  return null
}
