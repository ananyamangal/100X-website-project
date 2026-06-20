"use client"

import { useState } from "react"

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
  images?: string[]
}

interface Props {
  records: PastPerformanceRecord[]
  showFilters?: boolean
  maxVisible?: number
  showViewAll?: boolean
}

const STATUS_CFG: Record<string, { label: string; dot: string; pill: string }> = {
  Completed:   { label: "Completed",   dot: "bg-brand-400",  pill: "bg-brand-500/15 text-brand-400 border-brand-500/30" },
  Ongoing:     { label: "Ongoing",     dot: "bg-blue-400",    pill: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  "In Progress":{ label:"In Progress", dot: "bg-amber-400",   pill: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  Pending:     { label: "Pending",     dot: "bg-gray-400",   pill: "bg-gray-500/15 text-gray-400 border-gray-500/30" },
}

const CAT_CFG: Record<string, { header: string; icon: React.ReactNode; badge: string }> = {
  Municipal: {
    header: "from-blue-600 to-blue-800",
    badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18M3 7v1a3 3 0 006 0V7m0 1a3 3 0 006 0V7m0 1a3 3 0 006 0V7M6 21V10.85M18 21V10.85M3 7l9-4 9 4" />
      </svg>
    ),
  },
  Health: {
    header: "from-brand-700 to-brand-900",
    badge: "bg-brand-500/20 text-brand-300 border-brand-500/30",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  Defence: {
    header: "from-gray-600 to-gray-800",
    badge: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s-8-4-8-10V5l8-3 8 3v7c0 6-8 10-8 10z" />
      </svg>
    ),
  },
  Railways: {
    header: "from-orange-600 to-orange-800",
    badge: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="16" height="13" rx="2" /><path d="M4 13h16M7 21h10M9 21V16M15 21V16" />
      </svg>
    ),
  },
  Agriculture: {
    header: "from-lime-600 to-lime-800",
    badge: "bg-lime-500/20 text-lime-300 border-lime-500/30",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22V12M12 12C12 7 17 2 22 2c0 5-5 10-10 10zM12 12C12 7 7 2 2 2c0 5 5 10 10 10z" />
      </svg>
    ),
  },
  Other: {
    header: "from-violet-600 to-violet-800",
    badge: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.Pending
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function RecordCard({ record, onClick }: { record: PastPerformanceRecord; onClick: () => void }) {
  const cat = CAT_CFG[record.category] ?? CAT_CFG.Other

  return (
    <button
      onClick={onClick}
      className="group text-left bg-gray-900 border border-white/[0.06] hover:border-brand-500/30 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-brand-500/5 hover:-translate-y-0.5 w-full"
    >
      {/* Card header */}
      <div className={`bg-gradient-to-r ${cat.header} px-5 py-4 flex items-start gap-3`}>
        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-white group-hover:bg-white/20 transition-colors">
          {cat.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-0.5">{record.category}</p>
          <h3 className="text-white font-bold text-sm leading-snug line-clamp-2">{record.organization}</h3>
        </div>
        <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full border ${cat.badge}`}>
          {record.state}
        </span>
      </div>

      {/* Card body */}
      <div className="px-5 py-4">
        <p className="text-gray-400 text-xs mb-4 truncate">{record.department}</p>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs uppercase tracking-wide">Product</span>
            <span className="text-gray-200 text-xs font-medium text-right max-w-[60%] truncate">{record.product}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs uppercase tracking-wide">Year</span>
            <span className="text-gray-200 text-xs font-medium">{record.orderYear}</span>
          </div>
          {record.quantity && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-xs uppercase tracking-wide">Quantity</span>
              <span className="text-gray-200 text-xs font-medium">{record.quantity} units</span>
            </div>
          )}
          {record.orderValue && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-xs uppercase tracking-wide">Order Value</span>
              <span className="text-brand-400 text-sm font-700">₹{record.orderValue.toLocaleString("en-IN")}L</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <StatusBadge status={record.status} />
          <span className="text-gray-500 text-xs flex items-center gap-1 group-hover:text-gray-300 transition-colors">
            View details
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </span>
        </div>
      </div>
    </button>
  )
}

function RecordDrawer({ record, onClose }: { record: PastPerformanceRecord; onClose: () => void }) {
  const cat = CAT_CFG[record.category] ?? CAT_CFG.Other

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-lg bg-gray-950 rounded-t-3xl sm:rounded-3xl border border-white/[0.08] overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer header */}
        <div className={`bg-gradient-to-r ${cat.header} px-6 py-6`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white">
                {cat.icon}
              </div>
              <div>
                <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">{record.category}</p>
                <h3 className="text-white font-black text-lg leading-snug">{record.organization}</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors shrink-0"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </div>

        {/* Drawer body */}
        <div className="p-6 space-y-5">
          {/* Primary info grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "State", value: record.state },
              { label: "Year", value: String(record.orderYear) },
              { label: "Status", value: record.status, isStatus: true },
              ...(record.quantity ? [{ label: "Units Supplied", value: `${record.quantity} units` }] : []),
              ...(record.orderValue ? [{ label: "Order Value", value: `₹${record.orderValue.toLocaleString("en-IN")} Lakhs`, highlight: true }] : []),
            ].map((item: any) => (
              <div key={item.label} className="bg-gray-900 rounded-xl p-3">
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">{item.label}</p>
                {item.isStatus ? (
                  <StatusBadge status={item.value} />
                ) : (
                  <p className={`text-sm font-700 ${item.highlight ? "text-brand-400" : "text-white"}`}>{item.value}</p>
                )}
              </div>
            ))}
          </div>

          {/* Department */}
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">Department</p>
            <p className="text-gray-200 text-sm">{record.department || "—"}</p>
          </div>

          {/* Product */}
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">Product / Equipment</p>
            <p className="text-gray-200 text-sm">{record.product || "—"}</p>
          </div>

          {/* Notes */}
          {record.notes && (
            <div className="bg-gray-900 rounded-xl p-4">
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">Supply Details</p>
              <p className="text-gray-400 text-sm leading-relaxed">{record.notes}</p>
            </div>
          )}

          {/* Certifications note */}
          <div className="bg-brand-500/5 border border-brand-500/20 rounded-xl p-4">
            <p className="text-brand-400 text-xs font-600 mb-1">Documentation Available</p>
            <p className="text-gray-400 text-xs leading-relaxed">
              IS 14855 compliance certificate, ISO 9001:2015 certificate, MSME/UDYAM registration, and delivery documentation available on request.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GovPerformanceCards({
  records,
  showFilters = true,
  maxVisible = 9,
  showViewAll = true,
}: Props) {
  const [stateFilter, setStateFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [yearFilter, setYearFilter] = useState("")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<PastPerformanceRecord | null>(null)

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
  const hasFilters = !!(stateFilter || categoryFilter || yearFilter || search)

  return (
    <>
      {showFilters && (
        <div className="mb-6 space-y-3">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search department, organization, state, product…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-white/[0.08] hover:border-white/[0.15] focus:border-brand-500/50 rounded-xl text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2.5">
            {[
              { value: stateFilter, options: states, placeholder: "All States", onChange: setStateFilter },
              { value: categoryFilter, options: categories, placeholder: "All Categories", onChange: setCategoryFilter },
              { value: yearFilter, options: years.map(String), placeholder: "All Years", onChange: setYearFilter },
            ].map(({ value, options, placeholder, onChange }) => (
              <select
                key={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="px-3 py-2.5 bg-gray-900 border border-white/[0.08] hover:border-white/[0.15] rounded-xl text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/50 transition-colors cursor-pointer"
              >
                <option value="">{placeholder}</option>
                {options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ))}

            {hasFilters && (
              <button
                onClick={() => { setStateFilter(""); setCategoryFilter(""); setYearFilter(""); setSearch("") }}
                className="px-3 py-2 text-sm text-gray-400 hover:text-white border border-white/[0.08] hover:border-white/[0.20] rounded-xl bg-gray-900 transition-colors"
              >
                Clear filters
              </button>
            )}

            {filtered.length > 0 && (
              <span className="ml-auto text-xs text-gray-500 self-center">
                {filtered.length} {filtered.length === 1 ? "record" : "records"}
              </span>
            )}
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="bg-gray-900 border border-white/[0.06] rounded-2xl py-16 text-center">
          <svg className="w-10 h-10 text-gray-700 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
          </svg>
          <p className="text-gray-400 font-semibold text-sm">No records match your filters</p>
          {hasFilters && (
            <button
              onClick={() => { setStateFilter(""); setCategoryFilter(""); setYearFilter(""); setSearch("") }}
              className="mt-3 text-xs text-brand-400 hover:text-brand-300 underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((r) => (
            <RecordCard key={r._id} record={r} onClick={() => setSelected(r)} />
          ))}
        </div>
      )}

      {showViewAll && filtered.length > maxVisible && (
        <div className="text-center mt-8">
          <a
            href="/past-performance-government"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-gray-900 hover:bg-gray-800 border border-white/[0.08] text-white font-semibold rounded-xl text-sm transition-all hover:border-white/20"
          >
            View All {filtered.length} Records
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg>
          </a>
        </div>
      )}

      {selected && <RecordDrawer record={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
