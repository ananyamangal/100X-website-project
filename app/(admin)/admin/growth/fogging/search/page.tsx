"use client"
import { useEffect, useState, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Search, RefreshCw, Building2, Truck, BarChart3, Package, FileText } from "lucide-react"

const INR = (v: string | null | undefined) => v ?? "—"

interface SearchResult {
  type: string; id: string; label: string; sub?: string | null; gmv?: string | null; badge?: string | null; href: string
}
interface SearchResults {
  buyers: SearchResult[]; sellers: SearchResult[]; oems: SearchResult[]
  models: SearchResult[]; contracts: SearchResult[]
}

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  buyers:    { label: "Organizations", icon: <Building2 size={13} />,  color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
  sellers:   { label: "Sellers",       icon: <Truck size={13} />,      color: "text-amber-700 bg-amber-50 border-amber-200" },
  oems:      { label: "OEMs",          icon: <BarChart3 size={13} />,  color: "text-purple-700 bg-purple-50 border-purple-200" },
  models:    { label: "Models",        icon: <Package size={13} />,    color: "text-green-700 bg-green-50 border-green-200" },
  contracts: { label: "Contracts",     icon: <FileText size={13} />,   color: "text-gray-700 bg-gray-50 border-gray-200" },
}

function SearchPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQ = searchParams.get("q") ?? ""

  const [query, setQuery] = useState(initialQ)
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)

  const run = useCallback((q: string) => {
    if (q.length < 2) { setResults(null); setTotal(0); return }
    setLoading(true)
    router.replace(`/admin/growth/fogging/search?q=${encodeURIComponent(q)}`, { scroll: false })
    fetch(`/api/fogging/search?q=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(d => { setResults(d.results ?? null); setTotal(d.total ?? 0) })
      .finally(() => setLoading(false))
  }, [router])

  useEffect(() => {
    if (initialQ.length >= 2) run(initialQ)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") run(query)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
            <Link href="/admin/growth/fogging" className="hover:text-gray-700">Fogging Intelligence</Link>
            <span>/</span>
            <span className="text-gray-800">Search</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-3">Universal Search</h1>
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-2xl">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Search organizations, sellers, OEMs, models, GEMC#, GST, state…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
            </div>
            <button onClick={() => run(query)} disabled={loading || query.length < 2}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
              Search
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Searches across buyers · sellers · OEMs · models · contracts simultaneously</p>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {!results && !loading && (
          <div className="text-center py-24 text-gray-400">
            <Search size={40} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">Type a name, GEMC#, GST, state, OEM or model to search</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {["Neptune","Royal Tradelinks","NPF-35","Uttar Pradesh","Municipality","GEMC-511"].map(ex => (
                <button key={ex} onClick={() => { setQuery(ex); run(ex) }}
                  className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full hover:border-blue-400 hover:text-blue-600 transition-colors">
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-24">
            <RefreshCw size={24} className="animate-spin text-gray-400" />
          </div>
        )}

        {results && !loading && (
          <div>
            <p className="text-xs text-gray-500 mb-4">{total} results for <strong>&ldquo;{query}&rdquo;</strong></p>
            {total === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-sm">No results found. Try a different search term.</p>
              </div>
            )}
            <div className="space-y-4">
              {(Object.entries(results) as [string, SearchResult[]][]).map(([type, items]) => {
                if (!items.length) return null
                const meta = TYPE_META[type]
                return (
                  <div key={type} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className={`flex items-center gap-2 px-4 py-2 border-b text-xs font-semibold uppercase tracking-wide ${meta.color}`}>
                      {meta.icon} {meta.label} ({items.length})
                    </div>
                    <div className="divide-y divide-gray-50">
                      {items.map(r => (
                        <Link key={r.id} href={r.href}
                          className="flex items-center justify-between px-4 py-3 hover:bg-blue-50 transition-colors">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{r.label}</div>
                            {r.sub && <div className="text-xs text-gray-500 truncate mt-0.5">{r.sub}</div>}
                          </div>
                          <div className="flex items-center gap-2 ml-4 shrink-0">
                            {r.gmv && <span className="text-xs text-gray-500">{INR(r.gmv)}</span>}
                            {r.badge && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{r.badge}</span>}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><RefreshCw size={24} className="animate-spin text-gray-400" /></div>}>
      <SearchPageInner />
    </Suspense>
  )
}
