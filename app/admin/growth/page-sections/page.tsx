"use client"

import { useState } from "react"
import { Layout, Home, Package } from "lucide-react"
import { PageSectionsBuilder } from "@/components/admin/PageSectionsBuilder"

type Tab = 'homepage' | 'product'

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { key: 'homepage', label: 'Homepage',     icon: Home },
  { key: 'product',  label: 'Product Pages', icon: Package },
]

export default function PageSectionsPage() {
  const [tab, setTab] = useState<Tab>('homepage')

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-[41px] z-10">
        <div className="flex items-center gap-2">
          <Layout size={16} className="text-brand-600" />
          <h1 className="text-sm font-bold text-gray-900">Page Section Builder</h1>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          Toggle, reorder, and customise every section on your homepage and product pages.
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
