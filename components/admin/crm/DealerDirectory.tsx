"use client"
import { useCallback, useEffect, useState } from "react"
import { crmFetch, errorText, qs } from "./api"
import { INDIAN_STATES, prettyPhone } from "./format"
import { EmptyBox, ErrorBox, Spinner, btnSecondary, inputCls } from "./ui"

interface DirRow {
  id: string
  phoneE164: string
  name: string | null
  company: string | null
  state: string | null
  city: string | null
}
interface DirPage {
  items: DirRow[]
  total: number
  page: number
  pageSize: number
}

export function DealerDirectory() {
  const [q, setQ] = useState("")
  const [dq, setDq] = useState("")
  const [state, setState] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<DirPage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => { setDq(q.trim()); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [q])

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      setData(await crmFetch<DirPage>(`/api/crm/dealers${qs({ q: dq, state, page })}`))
    } catch (e) {
      setError(errorText(e))
    } finally {
      setLoading(false)
    }
  }, [dq, state, page])
  useEffect(() => { void load() }, [load])

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">Dealer directory{data ? ` (${data.total})` : ""}</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        <input className={inputCls} placeholder="Search name, company or mobile" value={q} onChange={e => setQ(e.target.value)} />
        <select className={inputCls} value={state} onChange={e => { setState(e.target.value); setPage(1) }}>
          <option value="">All states</option>
          {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {error && <ErrorBox onRetry={() => void load()}>{error}</ErrorBox>}
      {loading && !data && <Spinner />}
      {data && data.items.length === 0 && !loading && <EmptyBox>No dealers found.</EmptyBox>}
      {data && data.items.length > 0 && (
        <ul className={`divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white ${loading ? "opacity-60" : ""}`}>
          {data.items.map(d => (
            <li key={d.id ?? d.phoneE164} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{d.company || d.name || "—"}</p>
                <p className="truncate text-xs text-gray-500">{[d.company ? d.name : null, d.city, d.state].filter(Boolean).join(" · ")}</p>
              </div>
              <span className="shrink-0 text-sm text-gray-700">{prettyPhone(d.phoneE164)}</span>
            </li>
          ))}
        </ul>
      )}
      {data && pages > 1 && (
        <div className="flex items-center justify-between">
          <button type="button" className={btnSecondary} disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span className="text-sm text-gray-600">Page {page} of {pages}</span>
          <button type="button" className={btnSecondary} disabled={page >= pages || loading} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
    </section>
  )
}
