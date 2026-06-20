"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface SupplyCard {
  _id: string
  organization?: string
  department?: string
  state?: string
  product?: string
  status?: string
  orderYear?: number
  verified?: boolean
}

function SupplyCardMini({ r }: { r: SupplyCard }) {
  return (
    <div className={`rounded-xl p-4 border transition-colors ${r.verified ? "border-brand-200 bg-brand-50" : "border-gray-100 bg-white"}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-700 text-gray-800 leading-snug truncate">{r.organization || "Government Body"}</p>
          {r.department && <p className="text-[11px] text-gray-500 mt-0.5">{r.department}</p>}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          {r.verified && (
            <span className="text-[10px] bg-brand-100 text-brand-700 font-700 px-1.5 py-0.5 rounded-full">★ Verified</span>
          )}
          {r.state && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{r.state}</span>}
        </div>
      </div>
      {r.product && <p className="text-[11px] text-brand-600 font-600 mb-1">{r.product}</p>}
      <div className="flex items-center gap-2 mt-1.5">
        {r.status && <span className="text-[10px] text-gray-500 capitalize">{r.status}</span>}
        {r.orderYear && <span className="text-[10px] text-gray-400">· {r.orderYear}</span>}
      </div>
    </div>
  )
}

export default function HomeGovSuppliesSection({ initialData }: { initialData?: SupplyCard[] } = {}) {
  const [records, setRecords] = useState<SupplyCard[]>(initialData?.slice(0, 6) ?? [])
  const [loaded, setLoaded] = useState(!!initialData)

  useEffect(() => {
    if (initialData && initialData.length > 0) return
    fetch("/api/gov-past-performance?limit=6")
      .then((r) => r.json())
      .then((data: any) => {
        const arr = Array.isArray(data) ? data : []
        setRecords(arr.slice(0, 6))
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [initialData])

  if (!loaded || records.length === 0) return null

  return (
    <section className="py-16 md:py-20 bg-gray-50 border-t border-gray-100">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-700 uppercase tracking-widest text-brand-600 mb-1.5">Track Record</p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Featured Government Supplies</h2>
            <p className="text-gray-500 text-sm mt-1.5">A sample of government procurement orders fulfilled across India.</p>
          </div>
          <Link href="/past-performance-government"
            className="shrink-0 inline-flex items-center gap-1.5 text-sm font-600 text-brand-600 hover:text-brand-700 transition-colors">
            View all records
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg>
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {records.map((r) => <SupplyCardMini key={r._id} r={r} />)}
        </div>
        <div className="mt-6 text-center">
          <Link href="/past-performance-government"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-600 rounded-full text-sm transition-colors">
            View Full Past Performance Record
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg>
          </Link>
        </div>
      </div>
    </section>
  )
}
