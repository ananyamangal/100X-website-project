"use client"

import React, { useState, useEffect } from "react"
import { X } from "lucide-react"

function getYouTubeId(url: string): string | null {
  if (!url || typeof url !== "string") return null
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

export default function VideoPopup() {
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null)
  const [closed, setClosed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/video-popup")
      .then((res) => res.json())
      .then((data) => {
        const u = data?.youtubeUrl
        setYoutubeUrl(u && String(u).trim() ? String(u).trim() : null)
      })
      .catch(() => setYoutubeUrl(null))
      .finally(() => setLoading(false))
  }, [])

  const videoId = getYouTubeId(youtubeUrl || "")
  if (loading || !videoId || closed) return null

  const embed = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${videoId}`

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
      <div className="w-[200px] overflow-hidden rounded-xl border-2 border-white/20 shadow-2xl bg-black">
        <div className="aspect-[9/16] w-full">
          <iframe
            src={embed}
            title="Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  )
}
