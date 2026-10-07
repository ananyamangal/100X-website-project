"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { RefreshCw, AlertCircle } from "lucide-react"

const INR = (v: number | null | undefined) => {
  if (v == null) return "—"
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)} L`
  return `₹${Math.round(v).toLocaleString()}`
}

interface UnresolvedOrg {
  organization_canonical: string
  organization_name:      string
  buyer_count_merged:     number
  buyer_canonicals:       string[]
  total_gmv:              number | null
  total_contracts:        number
  organization_status:    string
}

export default function DataQualityQueuePage() {
  const [orgs,    setOrgs]    = useState<UnresolvedOrg[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/fogging/organizations?status=unresolved&page_size=100")
      .then(r => r.json())
      .then(d => setOrgs(d.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  const totalGmv    = orgs.reduce((s, o) => s + (o.total_gmv || 0), 0)
  const marketShare = totalGmv > 0 ? ((totalGmv / 750816000) * 100).toFixed(1) : "—"

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <Link href="/admin/growth/fogging" className="hover:text-gray-700">Fogging Intelligence</Link>
            <span>/</span>
            <Link href="/admin/growth/fogging/data-quality" className="hover:text-gray-700">Data Quality</Link>
            <span>/</span>
            <span className="text-gray-800">Unresolved Entity Queue</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <AlertCircle size={18} className="text-red-500" />
            Unresolved Entity Queue
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Organizations with ambiguous identity — review and resolve
          </p>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800 flex flex-wrap gap-x-4 gap-y-1 items-center">
          <span className="font-semibold">{orgs.length} unresolved organizations</span>
          <span>{INR(totalGmv)} total GMV</span>
          <span>{marketShare}% of market</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-24"><RefreshCw size={24} className="animate-spin text-gray-400" /></div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Organization Name</th>
                  <th className="px-3 py-2 text-left">Buyer Canonical</th>
                  <th className="px-3 py-2 text-right">GMV</th>
                  <th className="px-3 py-2 text-right">Contracts</th>
                  <th className="px-3 py-2 text-left">Reason</th>
                  <th className="px-4 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map(o => (
                  <tr key={o.organization_canonical} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium max-w-xs">
                      <Link
                        href={`/admin/growth/fogging/organizations/${encodeURIComponent(o.organization_canonical)}`}
                        className="hover:text-indigo-700 hover:underline truncate block">
                        {o.organization_name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500 font-mono max-w-[180px]">
                      <div className="truncate">{o.buyer_canonicals?.[0] || o.organization_canonical}</div>
                      {o.buyer_count_merged > 1 && (
                        <div className="text-gray-400">+{o.buyer_count_merged - 1} more</div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-medium">{INR(o.total_gmv)}</td>
                    <td className="px-3 py-3 text-right text-gray-600">{o.total_contracts}</td>
                    <td className="px-3 py-3 text-xs text-red-600">
                      {o.buyer_count_merged > 1 ? "Multiple buyer records merged — verify identity" : "Name ambiguity — needs manual review"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-center flex-wrap">
                        <button
                          onClick={() => alert("Coming soon — full resolution workflow")}
                          className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 whitespace-nowrap">
                          Mark Resolved
                        </button>
                        <button
                          onClick={() => alert("Coming soon — full resolution workflow")}
                          className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300">
                          Ignore
                        </button>
                        <Link
                          href={`/admin/growth/fogging/contracts?buyer_canonical=${encodeURIComponent(o.buyer_canonicals?.[0] || o.organization_canonical)}`}
                          className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 whitespace-nowrap">
                          View Contracts
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {orgs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">
                      No unresolved organizations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
