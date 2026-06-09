"use client"

import { useState } from "react"
import { ExternalLink } from "lucide-react"

type Tab = "split" | "current" | "v2"

export default function DesignComparison({
  currentUrl,
  v2Url,
  productSlug,
}: {
  currentUrl: string
  v2Url: string
  productSlug: string
}) {
  const [tab, setTab] = useState<Tab>("split")

  return (
    <>
      {/* Tab switcher */}
      <div className="flex items-center gap-1 p-1 bg-gray-900 border border-gray-700 rounded-xl inline-flex">
        {([
          { key: "current" as Tab, label: "Current Design (V1)" },
          { key: "split"   as Tab, label: "Side by Side" },
          { key: "v2"      as Tab, label: "New Design (V2)" },
        ] as { key: Tab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === t.key
                ? "bg-amber-500 text-white shadow-sm"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Open-in-tab links */}
      <div className="flex gap-4 mt-3">
        <a
          href={currentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <ExternalLink size={11} /> Open V1 in new tab
        </a>
        <a
          href={`/preview/product-v2?slug=${productSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <ExternalLink size={11} /> Open V2 in new tab
        </a>
      </div>

      {/* Iframe views */}
      <div className="mt-4 rounded-xl overflow-hidden border border-gray-700 bg-gray-900" style={{ height: "82vh" }}>
        {tab === "split" && (
          <div className="flex h-full">
            <div className="w-1/2 flex flex-col border-r border-gray-700">
              <div className="px-3 py-1.5 bg-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-widest flex-shrink-0">
                V1 — Current Production
              </div>
              <iframe src={currentUrl} className="flex-1 w-full" title="Current V1 design" />
            </div>
            <div className="w-1/2 flex flex-col">
              <div className="px-3 py-1.5 bg-gray-800 text-[10px] font-bold text-amber-400 uppercase tracking-widest flex-shrink-0">
                V2 — Proposed Redesign
              </div>
              <iframe src={v2Url} className="flex-1 w-full" title="New V2 design" />
            </div>
          </div>
        )}
        {tab === "current" && (
          <iframe src={currentUrl} className="w-full h-full" title="Current V1 design" />
        )}
        {tab === "v2" && (
          <iframe src={v2Url} className="w-full h-full" title="New V2 design" />
        )}
      </div>
    </>
  )
}
