"use client"

import { useState } from "react"

const STATE_NAMES: Record<string, string> = {
  AP: "Andhra Pradesh", AR: "Arunachal Pradesh", AS: "Assam", BR: "Bihar",
  CG: "Chhattisgarh", GA: "Goa", GJ: "Gujarat", HR: "Haryana",
  HP: "Himachal Pradesh", JH: "Jharkhand", KA: "Karnataka", KL: "Kerala",
  MP: "Madhya Pradesh", MH: "Maharashtra", MN: "Manipur", MG: "Meghalaya",
  MZ: "Mizoram", NL: "Nagaland", OD: "Odisha", PB: "Punjab",
  RJ: "Rajasthan", SK: "Sikkim", TN: "Tamil Nadu", TG: "Telangana",
  TR: "Tripura", UP: "Uttar Pradesh", UK: "Uttarakhand", WB: "West Bengal",
  DL: "Delhi", JK: "Jammu & Kashmir", PY: "Puducherry",
  AN: "Andaman & Nicobar", CH: "Chandigarh", LA: "Ladakh",
}

// Fallback demo data shown when no DB records exist
const DEMO_DATA: Array<{ code: string; count: number; categories: string[]; departments: string[] }> = [
  { code: "UP", count: 8, categories: ["Municipal", "Health"], departments: ["Nagar Panchayats", "Health Dept."] },
  { code: "BR", count: 6, categories: ["Municipal"], departments: ["Nagar Nigam Muzaffarpur", "Municipal Corp."] },
  { code: "HR", count: 5, categories: ["Municipal", "Health"], departments: ["Municipal Bodies", "Health Departments"] },
  { code: "DL", count: 4, categories: ["Municipal", "Defence"], departments: ["Municipal Corporation", "Cantonment"] },
  { code: "RJ", count: 4, categories: ["Municipal", "Health"], departments: ["Nagar Panchayats", "Health Dept."] },
  { code: "MH", count: 3, categories: ["Municipal"], departments: ["Municipal Corporations"] },
  { code: "GJ", count: 3, categories: ["Municipal", "Health"], departments: ["Municipal Bodies", "Health Dept."] },
  { code: "WB", count: 3, categories: ["Municipal"], departments: ["Municipal Bodies"] },
  { code: "PB", count: 2, categories: ["Municipal", "Health"], departments: ["Municipal Bodies", "Health Dept."] },
  { code: "MP", count: 2, categories: ["Municipal"], departments: ["Nagar Panchayats"] },
  { code: "TG", count: 2, categories: ["Municipal"], departments: ["Municipal Bodies"] },
  { code: "KA", count: 2, categories: ["Municipal"], departments: ["Municipal Bodies"] },
  { code: "UK", count: 1, categories: ["Health"], departments: ["Health Dept."] },
  { code: "CG", count: 1, categories: ["Municipal"], departments: ["Nagar Panchayats"] },
  { code: "OD", count: 1, categories: ["Municipal"], departments: ["Municipal Bodies"] },
]

export interface StateEntry {
  code: string
  count: number
  categories: string[]
  departments: string[]
}

interface Props {
  deployments?: Record<string, { count: number; categories?: string[]; departments?: string[] }>
  heading?: string
  subheading?: string
  onDark?: boolean
}

export default function StateDeploymentCards({ deployments, heading, subheading, onDark = false }: Props) {
  const [filter, setFilter] = useState<string>("All")

  // Build state list from deployments or use demo
  const hasData = deployments && Object.keys(deployments).length > 0
  const rawStates: StateEntry[] = hasData
    ? Object.entries(deployments).map(([code, d]) => ({
        code,
        count: d.count,
        categories: d.categories || [],
        departments: d.departments || [],
      }))
    : DEMO_DATA

  const states = rawStates.sort((a, b) => b.count - a.count)

  // Gather all categories for filter
  const allCategories = ["All", ...Array.from(new Set(states.flatMap(s => s.categories))).sort()]
  const visible = filter === "All" ? states : states.filter(s => s.categories.includes(filter))

  const textH = onDark ? "text-white" : "text-gray-900"
  const textB = onDark ? "text-gray-400" : "text-gray-600"
  const cardBg = onDark ? "glass-card" : "bg-white border border-gray-100 hover:border-brand-200"
  const filterActive = "bg-brand-600 text-white"
  const filterIdle = onDark
    ? "bg-white/[0.06] text-gray-300 hover:bg-white/[0.1]"
    : "bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-700"

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          {heading && <h2 className={`text-display-xs font-700 ${textH} mb-2`}>{heading}</h2>}
          {subheading && <p className={`text-sm ${textB} max-w-xl`}>{subheading}</p>}
          {!hasData && (
            <p className={`text-xs ${onDark ? "text-gray-600" : "text-gray-400"} mt-1`}>
              Representative coverage — actual deployment data grows as records are imported.
            </p>
          )}
        </div>
        {allCategories.length > 2 && (
          <div className="flex flex-wrap gap-2 shrink-0">
            {allCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-600 transition-all ${filter === cat ? filterActive : filterIdle}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {visible.map(s => (
          <div key={s.code} className={`rounded-2xl p-4 md:p-5 transition-all ${cardBg}`}>
            {/* State name */}
            <p className={`font-700 text-sm leading-tight mb-1 ${onDark ? "text-white" : "text-gray-900"}`}>
              {STATE_NAMES[s.code] || s.code}
            </p>
            {/* Count */}
            <p className="text-2xl font-900 text-brand-600 tabular-nums leading-none mb-2">
              {s.count}
              <span className="text-sm font-600 text-brand-400 ml-0.5">{s.count === 1 ? " order" : " orders"}</span>
            </p>
            {/* Categories */}
            {s.categories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {s.categories.slice(0, 2).map(cat => (
                  <span key={cat} className="text-[10px] font-600 px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-100">
                    {cat}
                  </span>
                ))}
              </div>
            )}
            {/* Departments */}
            {s.departments.length > 0 && (
              <p className={`text-[10px] mt-2 leading-snug ${onDark ? "text-gray-500" : "text-gray-400"}`}>
                {s.departments.slice(0, 2).join(" · ")}
              </p>
            )}
          </div>
        ))}
      </div>

      {visible.length === 0 && (
        <div className={`text-center py-10 text-sm ${textB}`}>No deployments in this category yet.</div>
      )}
    </div>
  )
}
