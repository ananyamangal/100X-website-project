"use client"

import { useEffect, useState } from "react"
import AboutPageContent from "@/components/AboutPageContent"

export default function AboutRoutePage() {
  const [content, setContent] = useState<Record<string, string> | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetch("/api/about-page")
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => {
        setContent(data && typeof data === "object" ? (data as Record<string, string>) : {})
      })
      .catch(() => setContent({}))
      .finally(() => setReady(true))
  }, [])

  if (!ready || content === null) {
    return (
      <div className="pt-32 min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading…</p>
      </div>
    )
  }

  return <AboutPageContent content={content} />
}
