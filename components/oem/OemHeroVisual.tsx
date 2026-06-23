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
    .slice(0, 4)

  useEffect(() => {
    if (candidates.length <= 1) return
    const t = setInterval(() => setActiveIdx(i => (i + 1) % candidates.length), 3500)
    return () => clearInterval(t)
  }, [candidates.length])

  if (candidates.length === 0) {
    return (
      <div className="w-full max-w-sm aspect-[4/3] rounded-2xl bg-white/[0.03] border border-white/[0.07] flex flex-col items-center justify-center gap-4 mx-auto">
        <svg className="w-20 h-20 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={0.8}>
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        <p className="text-gray-600 text-sm font-600">Thermal Fogging Machine</p>
        <p className="text-gray-700 text-xs">IS 14855 · GeM Registered</p>
      </div>
    )
  }

  const active = candidates[activeIdx]

  return (
    <div className="relative w-full max-w-[480px]">
      <div className="absolute -inset-12 bg-brand-600/8 rounded-full blur-3xl pointer-events-none" />

      {/* Main image with crossfade */}
      <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl shadow-black/60 border border-white/[0.06] aspect-[4/3] bg-gray-900">
        {candidates.map((p, i) => (
          <div
            key={p._id}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: i === activeIdx ? 1 : 0 }}
            aria-hidden={i !== activeIdx}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.imageUrls[0]}
              alt={p.name}
              className="w-full h-full object-cover"
            />
          </div>
        ))}

        {/* Floating badge: GeM */}
        <div className="absolute top-4 right-4 bg-gray-900/80 backdrop-blur-sm border border-white/[0.12] rounded-xl px-3 py-2 text-center z-10">
          <p className="text-[10px] font-700 text-brand-400 uppercase tracking-widest">GeM Registered</p>
          <p className="text-[10px] text-gray-500 mt-0.5">gem.gov.in Verified</p>
        </div>

        {/* Floating badge: IS 14855 */}
        <div className="absolute bottom-4 left-4 bg-gray-900/80 backdrop-blur-sm border border-white/[0.12] rounded-xl px-3 py-2 z-10">
          <p className="text-[10px] font-700 text-white">{active.name}</p>
          <p className="text-[10px] text-brand-400 mt-0.5">IS 14855 Certified</p>
        </div>
      </div>

      {/* Thumbnail strip */}
      {candidates.length > 1 && (
        <div className="flex gap-2 mt-3 justify-center">
          {candidates.map((p, i) => (
            <button
              key={p._id}
              onClick={() => setActiveIdx(i)}
              className={`relative w-14 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                i === activeIdx ? "border-brand-500 opacity-100" : "border-white/[0.10] opacity-50 hover:opacity-75"
              }`}
              aria-label={p.name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.imageUrls[0]} alt={p.name} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
