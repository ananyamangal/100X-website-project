"use client"

import { useRef, useState } from "react"
import { Layout, Home, Package, Database, CheckCircle, Loader2, RefreshCw } from "lucide-react"
import { PageSectionsBuilder } from "@/components/admin/PageSectionsBuilder"

type Tab = 'homepage' | 'product'

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { key: 'homepage', label: 'Homepage',      icon: Home    },
  { key: 'product',  label: 'Product Pages', icon: Package },
]

export default function PageSectionsPage() {
  const [tab, setTab]         = useState<Tab>('homepage')
  const [seeding, setSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<{ ok: boolean; upserted: number; skipped: number; overwrite: boolean } | null>(null)
  const builderRef = useRef<{ reload: () => void } | null>(null)

  const seed = async (overwrite = false) => {
    if (!confirm(overwrite
      ? "This will OVERWRITE all manual edits and reset every section to default values. Continue?"
      : "This will add missing sections using default values. Existing edits are preserved. Continue?"
    )) return

    setSeeding(true); setSeedResult(null)
    try {
      const res  = await fetch(`/api/admin/page-sections/seed${overwrite ? "?overwrite=true" : ""}`, { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        setSeedResult({ ok: true, upserted: data.upserted, skipped: data.skipped, overwrite })
        // Give the builder a moment then trigger reload
        setTimeout(() => window.location.reload(), 800)
      } else {
        setSeedResult({ ok: false, upserted: 0, skipped: 0, overwrite })
      }
    } catch {
      setSeedResult({ ok: false, upserted: 0, skipped: 0, overwrite })
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-[41px] z-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Layout size={16} className="text-brand-600" />
            <h1 className="text-sm font-bold text-gray-900">Page Section Builder</h1>
          </div>

          {/* Seed controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {seedResult && (
              <span className={`text-xs flex items-center gap-1 ${seedResult.ok ? 'text-green-600' : 'text-red-500'}`}>
                {seedResult.ok
                  ? <><CheckCircle size={12} />{seedResult.upserted} seeded, {seedResult.skipped} kept</>
                  : 'Seed failed'}
              </span>
            )}
            <button
              onClick={() => seed(false)}
              disabled={seeding}
              title="Add missing sections with default icons and images. Existing edits are not touched."
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {seeding ? <Loader2 size={12} className="animate-spin" /> : <Database size={12} />}
              Seed Defaults
            </button>
            <button
              onClick={() => seed(true)}
              disabled={seeding}
              title="Reset ALL sections to default values — overwrites any manual edits."
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 rounded-lg transition-colors border border-gray-200 disabled:opacity-50"
            >
              <RefreshCw size={12} />
              Reset All
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          Toggle, reorder, and customise every section — icons, images, headings, variants.
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-0.5">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-brand-600 text-brand-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <t.icon size={13} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Builder */}
      <div className="px-6 py-5 max-w-3xl">
        <PageSectionsBuilder key={tab} pageKey={tab} />
      </div>
    </div>
  )
}
