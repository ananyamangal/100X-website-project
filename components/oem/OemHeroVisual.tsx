"use client"

import { useState, useEffect } from "react"

interface ProductSlim {
  _id: string
  name: string
  imageUrls: string[]
}

interface Props {
  products: ProductSlim[]
}

export default function OemHeroVisual({ products }: Props) {
  const [activeIdx, setActiveIdx] = useState(0)

  const candidates = products
    .filter(p => p.imageUrls?.[0] && !/trolley|baggage|airport/i.test(p.name))
    .slice(0, 5)

  useEffect(() => {
    if (candidates.length <= 1) return
    const t = setInterval(() => setActiveIdx(i => (i + 1) % candidates.length), 4000)
    return () => clearInterval(t)
  }, [candidates.length])

  if (candidates.length === 0) {
    return (
      <div className="w-full max-w-[560px] mx-auto" style={{ height: "420px" }}>
        <div className="w-full h-full rounded-2xl bg-gray-50 border border-gray-200 flex flex-col items-center justify-center gap-4">
          <svg className="w-24 h-24 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={0.8}>
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <p className="text-gray-400 text-sm font-600">Thermal Fogging Machine</p>
          <div className="flex gap-2">
            <span className="text-xs font-600 text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">IS 14855</span>
            <span className="text-xs font-600 text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">GeM Registered</span>
          </div>
        </div>
      </div>
    )
  }

  const active = candidates[activeIdx]

  return (
    <div className="relative w-full max-w-[560px]">
      {/* Ambient glow behind canvas */}
      <div className="absolute -inset-8 bg-brand-500/6 rounded-full blur-3xl pointer-events-none" />

      {/* ── Main canvas ────────────────────────────────────────────────── */}
      <div
        className="relative w-full rounded-2xl overflow-hidden shadow-xl shadow-black/20 border border-gray-200"
        style={{ height: "420px", background: "linear-gradient(160deg, #f8f9fa 0%, #ffffff 50%, #f1f3f4 100%)" }}
      >
        {/* Slide stack */}
        {candidates.map((p, i) => (
          <div
            key={p._id}
            className="absolute inset-0 flex items-center justify-center transition-opacity duration-700"
            style={{ opacity: i === activeIdx ? 1 : 0, padding: "40px 48px" }}
            aria-hidden={i !== activeIdx}
          >
            {/* Subtle drop shadow layer beneath the machine */}
            <div
              className="absolute bottom-12 left-1/2 -translate-x-1/2 rounded-full bg-black/8 blur-2xl pointer-events-none"
              style={{ width: "65%", height: "40px" }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.imageUrls[0]}
              alt={p.name}
              className="relative z-10 w-full h-full object-contain drop-shadow-md"
              style={{ maxHeight: "340px" }}
            />
          </div>
        ))}

        {/* ── Badges — top-right ───────────────────────────────────────── */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
          <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl px-3 py-2 text-center shadow-sm">
            <p className="text-[10px] font-800 text-emerald-700 uppercase tracking-widest">GeM Registered</p>
            <p className="text-[10px] text-gray-400 mt-0.5 font-500">gem.gov.in Verified</p>
          </div>
          <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl px-3 py-2 text-center shadow-sm">
            <p className="text-[10px] font-800 text-brand-700 uppercase tracking-widest">IS 14855</p>
            <p className="text-[10px] text-gray-400 mt-0.5 font-500">BIS Certified</p>
          </div>
        </div>

        {/* ── Product name — bottom bar ─────────────────────────────────── */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-gray-100 px-5 py-3 z-20">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-700 text-brand-600 uppercase tracking-widest mb-0.5">Current Product</p>
              <p className="text-sm font-700 text-gray-900 truncate">{active.name}</p>
            </div>
            {/* Slide dots */}
            {candidates.length > 1 && (
              <div className="flex gap-1.5 shrink-0">
                {candidates.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIdx(i)}
                    className={`rounded-full transition-all ${i === activeIdx ? "w-5 h-2 bg-brand-600" : "w-2 h-2 bg-gray-300 hover:bg-gray-400"}`}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Thumbnail strip ──────────────────────────────────────────────── */}
      {candidates.length > 1 && (
        <div className="flex gap-2 mt-3 justify-center flex-wrap">
          {candidates.map((p, i) => (
            <button
              key={p._id}
              onClick={() => setActiveIdx(i)}
              aria-label={p.name}
              className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                i === activeIdx
                  ? "border-brand-500 shadow-md shadow-brand-500/20 opacity-100"
                  : "border-gray-200 opacity-55 hover:opacity-80 hover:border-gray-300"
              }`}
              style={{ width: "72px", height: "52px", background: "#f8f9fa" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.imageUrls[0]}
                alt={p.name}
                className="w-full h-full object-contain p-1"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
