"use client"

import { useState } from "react"
import Link from "next/link"

export interface PastPerformanceRecord {
  _id: string
  department: string
  organization: string
  state: string
  product: string
  quantity?: number | null
  orderValue?: number | null
  orderYear: number
  status: string
  category: string
  notes?: string
}

interface Props {
  records: PastPerformanceRecord[]
  showFilters?: boolean
  maxVisible?: number
  showViewAll?: boolean
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Completed: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  Ongoing: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  "In Progress": { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  Pending: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
}

const CATEGORY_ICONS: Record<string, string> = {
  Municipal: "🏙",
  Health: "🏥",
  Railways: "🚂",
  Defence: "🛡",
  Agriculture: "🌿",
  Other: "🏛",
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS["Pending"]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  )
}

export default function GovPerformanceCards({ records, showFilters = true, maxVisible = 9, showViewAll = true }: Props) {
  const [stateFilter, setStateFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [yearFilter, setYearFilter] = useState("")
  const [search, setSearch] = useState("")

  const states = [...new Set(records.map((r) => r.state))].sort()
  const categories = [...new Set(records.map((r) => r.category))].sort()
  const years = [...new Set(records.map((r) => r.orderYear))].sort((a, b) => b - a)

  const filtered = records.filter((r) => {
    if (stateFilter && r.state !== stateFilter) return false
    if (categoryFilter && r.category !== categoryFilter) return false
    if (yearFilter && String(r.orderYear) !== yearFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        r.organization.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.state.toLowerCase().includes(q) ||
        r.product.toLowerCase().includes(q)
      )
    }
    return true
  })

  const visible = filtered.slice(0, maxVisible)

  return (
    <div>
      {showFilters && (
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="Search department, state, product…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          />
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All States</option>
            {states.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Years</option>
            {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
          </select>
          {(stateFilter || categoryFilter || yearFilter || search) && (
            <button
              onClick={() => { setStateFilter(""); setCategoryFilter(""); setYearFilter(""); setSearch("") }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl bg-white"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">No records match your filters.</p>
          <p className="text-sm mt-1">Try clearing filters to see all records.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((r) => (
            <div
              key={r._id}
              className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-brand-300 hover:shadow-md transition-all duration-200 group"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden>{CATEGORY_ICONS[r.category] || "🏛"}</span>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">{r.category}</p>
                    <p className="text-xs text-brand-600 font-semibold">{r.state}</p>
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>

              <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1">{r.organization}</h3>
              <p className="text-xs text-gray-500 mb-3">{r.department}</p>

              <div className="border-t border-gray-100 pt-3 space-y-1.5">
                <p className="text-xs text-gray-600">
                  <span className="text-gray-400">Product: </span>{r.product}
                </p>
                {r.orderValue && (
                  <p className="text-xs text-gray-600">
                    <span className="text-gray-400">Value: </span>
                    <span className="font-semibold text-gray-800">₹{r.orderValue.toLocaleString("en-IN")} Lakhs</span>
                  </p>
                )}
                {r.quantity && (
                  <p className="text-xs text-gray-600">
                    <span className="text-gray-400">Qty: </span>{r.quantity} units
                  </p>
                )}
                <p className="text-xs text-gray-400">{r.orderYear}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showViewAll && filtered.length > maxVisible && (
        <div className="text-center mt-8">
          <Link
            href="/past-performance-government"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-semibold rounded-full text-sm hover:bg-gray-700 transition-colors"
          >
            View All {filtered.length} Records →
          </Link>
        </div>
      )}
    </div>
  )
}
