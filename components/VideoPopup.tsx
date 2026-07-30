"use client"

import React, { useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { Volume2, VolumeX, X } from "lucide-react"

const FALLBACK_VIDEO_URL = "https://www.youtube.com/shorts/ZiVGNkvAI9g"
const SESSION_KEY = "video-popup-seen-v1"

function getYouTubeId(url: string): string | null {
  if (!url || typeof url !== "string") return null
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

interface VideoConfig {
  youtubeUrl: string
  orientation: "portrait" | "landscape"
  enabled: boolean
  delayMs: number
  sessionOnce: boolean
  showOnMobile: boolean
  showOnDesktop: boolean
  autoCloseMs: number
  hideOnPaths: string[]
}

export default function VideoPopup() {
  const pathname = usePathname() || ""
  const [config, setConfig] = useState<VideoConfig | null>(null)
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [muted, setMuted] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track explicit user dismissal — once dismissed, never reopen until page reload
  const userDismissedRef = useRef(false)

  useEffect(() => {
    setLoading(true)
    fetch("/api/video-popup")
      .then((r) => r.json())
      .then((data) => {
        setConfig({
          youtubeUrl: data?.youtubeUrl?.trim() || FALLBACK_VIDEO_URL,
          orientation: data?.orientation === "landscape" ? "landscape" : "portrait",
          enabled: data?.enabled !== false,
          delayMs: typeof data?.delayMs === "number" ? data.delayMs : 5000,
          sessionOnce: data?.sessionOnce !== false,
          showOnMobile: data?.showOnMobile !== false,
          showOnDesktop: data?.showOnDesktop !== false,
          autoCloseMs: typeof data?.autoCloseMs === "number" ? data.autoCloseMs : 0,
          hideOnPaths: Array.isArray(data?.hideOnPaths) ? data.hideOnPaths : [],
        })
      })
      .catch(() => {
        // Fail closed, matching the server route's own fetch-failure handling --
        // a fetch error here (network blip, timeout, cold start) shouldn't force
        // the popup to show regardless of what's actually configured in the DB.
        setConfig({
          youtubeUrl: FALLBACK_VIDEO_URL,
          orientation: "portrait",
          enabled: false,
          delayMs: 5000,
          sessionOnce: true,
          showOnMobile: true,
          showOnDesktop: true,
          autoCloseMs: 0,
          hideOnPaths: [],
        })
      })
      .finally(() => setLoading(false))
  }, [pathname])

  useEffect(() => {
    if (!config || loading) return
    if (!config.enabled) return
    // Never reopen if user explicitly dismissed
    if (userDismissedRef.current) return

    // Reset on navigation — clear timers and close any open popup so it
    // doesn't persist as an overlay on a new page.
    setVisible(false)
    clearTimeout(timerRef.current!)
    clearTimeout(autoCloseRef.current!)

    // Path check — normalize stored values: strip any leading domain so
    // full URLs pasted by the admin ("https://site.com/path") still match.
    const toPath = (raw: string) => {
      try { return new URL(raw).pathname } catch { return raw }
    }
    const defaultHide = ["/admin", "/thank-you", "/brochure-thank-you"]
    const hidePaths = [...defaultHide, ...config.hideOnPaths.map(toPath)]
    if (hidePaths.some((p) => p && pathname.startsWith(p))) return

    // Mobile/desktop check
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768
    if (isMobile && !config.showOnMobile) return
    if (!isMobile && !config.showOnDesktop) return

    // Session once check
    if (config.sessionOnce && sessionStorage.getItem(SESSION_KEY)) return

    timerRef.current = setTimeout(() => {
      if (userDismissedRef.current) return
      setVisible(true)
      if (config.sessionOnce) sessionStorage.setItem(SESSION_KEY, "1")
      if (config.autoCloseMs > 0) {
        autoCloseRef.current = setTimeout(() => setVisible(false), config.autoCloseMs)
      }
    }, config.delayMs)

    return () => {
      clearTimeout(timerRef.current!)
      clearTimeout(autoCloseRef.current!)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, loading, pathname])

  // ESC key closes the popup
  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        userDismissedRef.current = true
        setVisible(false)
        clearTimeout(autoCloseRef.current!)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [visible])

  if (loading || !config || !visible) return null

  const dismiss = () => {
    userDismissedRef.current = true
    setVisible(false)
    clearTimeout(timerRef.current!)
    clearTimeout(autoCloseRef.current!)
  }

  const videoId = getYouTubeId(config.youtubeUrl)
  if (!videoId) return null

  const isPortrait = config.orientation === "portrait"
  const muteParam = muted ? "1" : "0"
  const embed = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${muteParam}&playsinline=1&loop=1&playlist=${videoId}&rel=0&controls=0&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0`

  return (
    <div
      className="fixed right-6 z-[49] flex flex-col items-end gap-1"
      style={{ bottom: "7rem" }}
    >
      {/* Close + mute controls */}
      <div className="flex items-center gap-1.5 -mb-1 z-10">
        <button
          onClick={() => setMuted((m) => !m)}
          className="rounded-full bg-black/60 text-white p-1.5 hover:bg-black/80 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
          aria-label={muted ? "Unmute video" : "Mute video"}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <button
          onClick={dismiss}
          className="rounded-full bg-black/60 text-white p-1.5 hover:bg-black/80 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
          aria-label="Close video — will not reopen"
        >
          <X size={18} />
        </button>
      </div>
      <div
        className={`overflow-hidden rounded-xl border-2 border-white/20 shadow-2xl bg-black ${
          isPortrait ? "w-[200px] sm:w-[220px]" : "w-[280px] sm:w-[320px]"
        }`}
      >
        <div className={`w-full relative ${isPortrait ? "aspect-[9/16]" : "aspect-video"}`}>
          <iframe
            key={muteParam}
            src={embed}
            title="Product video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>
    </div>
  )
}
