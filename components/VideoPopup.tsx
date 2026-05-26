"use client"

import React, { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { X } from "lucide-react"

// Fallback when admin hasn't configured /api/video-popup — uses the hero
// demo so the floating video popup is visible by default. Replaces the
// in-page HeroVideoBlock that used to render this video full-width.
const FALLBACK_HERO_VIDEO_URL = "https://www.youtube.com/shorts/ZiVGNkvAI9g"
const FALLBACK_HERO_ORIENTATION: "portrait" | "landscape" = "portrait"

function getYouTubeId(url: string): string | null {
  if (!url || typeof url !== "string") return null
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

export default function VideoPopup() {
  // Hide on admin + transactional routes — the popup overlaps edit forms and
  // confirmation screens.
  const pathname = usePathname() || ""
  const hideOnRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/thank-you") ||
    pathname.startsWith("/brochure-thank-you")

  // Important: keep both pieces of "what to render" in one state so we
  // commit URL + orientation atomically. Initialising to null + loading
  // true means the iframe is NOT rendered until we know which video to
  // play — eliminates the fallback → admin-config flash that looked
  // like "the video keeps changing".
  const [config, setConfig] = useState<{
    url: string;
    orientation: "portrait" | "landscape";
  } | null>(null)
  const [closed, setClosed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/video-popup")
      .then((res) => res.json())
      .then((data) => {
        const u = data?.youtubeUrl
        if (u && String(u).trim()) {
          setConfig({
            url: String(u).trim(),
            orientation: data?.orientation === "landscape" ? "landscape" : "portrait",
          })
        } else {
          setConfig({ url: FALLBACK_HERO_VIDEO_URL, orientation: FALLBACK_HERO_ORIENTATION })
        }
      })
      .catch(() => {
        setConfig({ url: FALLBACK_HERO_VIDEO_URL, orientation: FALLBACK_HERO_ORIENTATION })
      })
      .finally(() => setLoading(false))
  }, [])

  if (hideOnRoute || loading || !config || closed) return null
  const videoId = getYouTubeId(config.url)
  if (!videoId) return null
  const orientation = config.orientation

  // Lock the player down: loop the same video, hide YouTube branding/related,
  // disable keyboard controls, kill annotations. Prevents the player from
  // advancing into "up next" suggestions which looked like the video
  // randomly changing.
  const embed = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${videoId}&rel=0&controls=0&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0`
  const isPortrait = orientation === "portrait"

  return (
    <div
      className="fixed right-6 bottom-24 z-[51] flex flex-col items-end gap-1"
      style={{ bottom: "7rem" }}
    >
      <button
        onClick={() => setClosed(true)}
        className="rounded-full bg-black/60 text-white p-1.5 hover:bg-black/80 transition-colors -mb-1 z-10"
        aria-label="Close video"
      >
        <X size={18} />
      </button>
      <div
        className={`overflow-hidden rounded-xl border-2 border-white/20 shadow-2xl bg-black ${
          isPortrait ? "w-[200px] sm:w-[220px]" : "w-[280px] sm:w-[320px]"
        }`}
      >
        <div className={`w-full relative ${isPortrait ? "aspect-[9/16]" : "aspect-video"}`}>
          <iframe
            src={embed}
            title="Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>
    </div>
  )
}
