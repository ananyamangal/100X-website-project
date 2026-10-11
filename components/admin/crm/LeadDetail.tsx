"use client"
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { crmFetch, errorText } from "./api"
import { LeadHeader, type ContactView, type DealView } from "./LeadHeader"
import { NotesPanel } from "./NotesPanel"
import { QuotationsPanel } from "./QuotationsPanel"
import { CustomerReminders, TaskPanel } from "./Tasks"
import { Timeline, type TimelineItem } from "./Timeline"
import { StageHistory } from "./StageControl"
import { ErrorBox, Spinner } from "./ui"

interface Detail {
  contact: ContactView
  deals: DealView[]
  timeline: { items: TimelineItem[]; nextBefore: string | null }
}

type Tab = "timeline" | "tasks" | "notes" | "quotes"

export function LeadDetail({ contactId }: { contactId: string }) {
  const [data, setData] = useState<Detail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>("timeline")

  const load = useCallback(async () => {
    setError(null)
    try {
      setData(await crmFetch<Detail>(`/api/crm/contacts/${encodeURIComponent(contactId)}?limit=30`))
    } catch (e) {
      setError(errorText(e))
    }
  }, [contactId])
  useEffect(() => { void load() }, [load])

  const back = <Link href="/admin/crm/leads" className="text-sm text-blue-700 hover:underline">&larr; All leads</Link>

  if (error) return <div className="space-y-3">{back}<ErrorBox onRetry={() => void load()}>{error}</ErrorBox></div>
  if (!data) return <div className="space-y-3">{back}<Spinner /></div>

  const primary = data.deals.find(d => d.isOpen) ?? data.deals[0] ?? null
  const tabs: { id: Tab; label: string }[] = [
    { id: "timeline", label: "Timeline" },
    { id: "tasks", label: "Tasks" },
    { id: "notes", label: "Internal notes" },
    { id: "quotes", label: "Quotations" },
  ]

  return (
    <div className="space-y-4">
      {back}
      <LeadHeader contact={data.contact} deal={primary} onChanged={() => void load()} />
      <StageHistory history={primary?.stageHistory} />

      <div role="tablist" className="flex gap-1 border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`min-h-[44px] px-4 text-sm font-medium ${tab === t.id ? "border-b-2 border-blue-600 text-blue-700" : "text-gray-600"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "timeline" && <Timeline contactId={contactId} initial={data.timeline} />}
      {tab === "tasks" && (
        <div className="space-y-3">
          {primary && (
            <CustomerReminders
              key={primary.id}
              dealId={primary.id}
              initial={primary.customerReminders ?? { quoteFollowUp: false, serviceAmc: false }}
              amcDueAt={data.contact.amcDueAt ?? null}
              onChanged={() => void load()}
            />
          )}
          <TaskPanel contactId={contactId} dealId={primary?.isOpen ? primary.id : null} />
        </div>
      )}
      {tab === "notes" && <NotesPanel contactId={contactId} dealId={primary?.isOpen ? primary.id : null} />}
      {tab === "quotes" && (
        <QuotationsPanel dealId={primary?.id ?? null} dealOpen={!!primary?.isOpen} contactEmail={data.contact.email ?? null} onChanged={() => void load()} />
      )}
    </div>
  )
}
