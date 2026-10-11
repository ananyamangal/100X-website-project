"use client"
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { crmFetch, errorText, qs } from "./api"
import {
  CUSTOMER_TYPES, CUSTOMER_TYPE_LABEL, LEAD_SOURCES, SOURCE_LABEL, STAGES, STAGE_LABEL,
  displayName, prettyPhone, sourceLabel, stageLabel, timeAgo, typeLabel, type UserRefView,
} from "./format"
import { Badge, DealerBadge, EmptyBox, ErrorBox, Spinner, btnPrimary, btnSecondary, inputCls, stageTone } from "./ui"
import { useTeam } from "./useTeam"

interface LeadRow {
  dealId: string
  contactId: string
  stage: string
  isOpen: boolean
  leadSource: string
  customerType: string | null
  assignedTo: UserRefView | null
  contact: {
    phoneE164: string
    name: string | null
    waProfileName: string | null
    company: string | null
    customerType: string | null
    existingDealer: unknown
    lastActivityAt: string | null
  }
}
interface LeadPage {
  items: LeadRow[]
  total: number
  page: number
  pageSize: number
}

const PAGE_SIZE = 25

export function LeadList() {
  const team = useTeam()
  const [q, setQ] = useState("")
  const [dq, setDq] = useState("")
  const [stage, setStage] = useState("")
  const [source, setSource] = useState("")
  const [ctype, setCtype] = useState("")
  const [assignee, setAssignee] = useState("")
  const [dealer, setDealer] = useState("")
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<LeadPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => { setDq(q.trim()); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [q])

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const url = `/api/crm/leads${qs({ q: dq, stage, source, customerType: ctype, assignee, existingDealer: dealer, status, page, pageSize: PAGE_SIZE })}`
      setData(await crmFetch<LeadPage>(url))
    } catch (e) {
      setError(errorText(e))
    } finally {
      setLoading(false)
    }
  }, [dq, stage, source, ctype, assignee, dealer, status, page])
  useEffect(() => { void load() }, [load])

  const pick = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => { set(e.target.value); setPage(1) }
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const filtered = !!(dq || stage || source || ctype || assignee || dealer || status !== "all")

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Leads</h1>
        <Link href="/admin/crm/log-call" className={btnPrimary}>Log a call</Link>
      </div>

      <input
        className={inputCls} type="search" value={q} onChange={e => setQ(e.target.value)}
        placeholder="Search by mobile (any format), name or company" aria-label="Search leads"
      />

      <details className="rounded-xl border border-gray-200 bg-white p-3" open>
        <summary className="cursor-pointer text-sm font-medium md:hidden">Filters</summary>
        <div className="mt-3 grid grid-cols-2 gap-2 md:mt-0 md:grid-cols-6">
          <select className={inputCls} value={status} onChange={pick(setStatus)} aria-label="Open or closed">
            <option value="all">Open and closed</option>
            <option value="open">Open only</option>
            <option value="closed">Closed only</option>
          </select>
          <select className={inputCls} value={stage} onChange={pick(setStage)} aria-label="Stage">
            <option value="">All stages</option>
            {STAGES.map(s => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
          </select>
          <select className={inputCls} value={source} onChange={pick(setSource)} aria-label="Source">
            <option value="">All sources</option>
            {LEAD_SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
          </select>
          <select className={inputCls} value={ctype} onChange={pick(setCtype)} aria-label="Customer type">
            <option value="">All customer types</option>
            {CUSTOMER_TYPES.map(t => <option key={t} value={t}>{CUSTOMER_TYPE_LABEL[t]}</option>)}
          </select>
          <select className={inputCls} value={assignee} onChange={pick(setAssignee)} aria-label="Assigned to">
            <option value="">Anyone</option>
            <option value="unassigned">Unassigned</option>
            {team.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className={inputCls} value={dealer} onChange={pick(setDealer)} aria-label="Existing dealer">
            <option value="">Dealer or not</option>
            <option value="true">Existing dealers</option>
            <option value="false">Not dealers</option>
          </select>
        </div>
      </details>

      {error && <ErrorBox onRetry={() => void load()}>{error}</ErrorBox>}
      {loading && !data && <Spinner />}
      {data && data.items.length === 0 && !loading && (
        <EmptyBox>{filtered ? "No leads match. Try clearing a filter." : "No leads yet. Log your first call."}</EmptyBox>
      )}

      {data && data.items.length > 0 && (
        <div className={loading ? "opacity-60" : ""}>
          {/* Phone: cards */}
          <ul className="space-y-2 md:hidden">
            {data.items.map(r => (
              <li key={r.dealId}>
                <Link href={`/admin/crm/leads/${r.contactId}`} className="block rounded-xl border border-gray-200 bg-white p-3 active:bg-gray-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{displayName(r.contact)}</p>
                      {r.contact.company && <p className="truncate text-sm text-gray-600">{r.contact.company}</p>}
                      <p className="text-sm text-gray-700">{prettyPhone(r.contact.phoneE164)}</p>
                    </div>
                    <Badge tone={stageTone(r.stage)}>{stageLabel(r.stage)}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge>{sourceLabel(r.leadSource)}</Badge>
                    {(r.customerType || r.contact.customerType) && <Badge>{typeLabel(r.customerType || r.contact.customerType)}</Badge>}
                    {r.contact.existingDealer ? <DealerBadge /> : null}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {r.assignedTo ? r.assignedTo.name : "Unassigned"} · {timeAgo(r.contact.lastActivityAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Name / company</th><th className="px-3 py-2">Mobile</th><th className="px-3 py-2">Stage</th>
                  <th className="px-3 py-2">Source</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Assigned to</th>
                  <th className="px-3 py-2">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map(r => (
                  <tr key={r.dealId} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <Link href={`/admin/crm/leads/${r.contactId}`} className="font-medium text-blue-700 hover:underline">{displayName(r.contact)}</Link>
                      {r.contact.existingDealer ? <span className="ml-2"><DealerBadge /></span> : null}
                      {r.contact.company && <div className="text-xs text-gray-500">{r.contact.company}</div>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{prettyPhone(r.contact.phoneE164)}</td>
                    <td className="px-3 py-2"><Badge tone={stageTone(r.stage)}>{stageLabel(r.stage)}</Badge></td>
                    <td className="px-3 py-2">{sourceLabel(r.leadSource)}</td>
                    <td className="px-3 py-2">{typeLabel(r.customerType || r.contact.customerType)}</td>
                    <td className="px-3 py-2">{r.assignedTo ? r.assignedTo.name : <span className="text-gray-400">Unassigned</span>}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">{timeAgo(r.contact.lastActivityAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && pages > 1 && (
        <div className="flex items-center justify-between">
          <button type="button" className={btnSecondary} disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span className="text-sm text-gray-600">Page {page} of {pages} · {data.total} leads</span>
          <button type="button" className={btnSecondary} disabled={page >= pages || loading} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
    </div>
  )
}
