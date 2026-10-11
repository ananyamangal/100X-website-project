"use client"
import { useState } from "react"
import { crmFetch, errorText } from "./api"
import {
  displayName, prettyPhone, sourceLabel, stageLabel, telHref, typeLabel, waHref, type UserRefView,
} from "./format"
import { Badge, DealerBadge, btnSecondary, inputCls, stageTone } from "./ui"
import { useTeam } from "./useTeam"
import { StageControl, type StageHistoryView } from "./StageControl"

export interface SuggestionView {
  field: string
  value: string
  keyword: string
  status: "pending" | "accepted" | "rejected"
}

export interface ContactView {
  phoneE164: string
  waId?: string
  name: string | null
  waProfileName: string | null
  company: string | null
  customerType: string | null
  state: string | null
  city: string | null
  email?: string | null
  amcDueAt?: string | null
  existingDealer: unknown
  suggestions?: SuggestionView[]
}

export interface DealView {
  id: string
  stage: string
  isOpen: boolean
  leadSource: string
  customerType: string | null
  assignedTo: UserRefView | null
  productInterest?: { label: string; qty: number | null }[]
  stageHistory?: StageHistoryView[]
  customerReminders?: { quoteFollowUp: boolean; serviceAmc: boolean }
}

export function LeadHeader({ contact, deal, onChanged }: { contact: ContactView; deal: DealView | null; onChanged: () => void }) {
  const team = useTeam()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function patch(body: Record<string, unknown>) {
    if (!deal || busy) return
    setBusy(true); setError(null)
    try {
      await crmFetch(`/api/crm/deals/${deal.id}`, { method: "PATCH", body: JSON.stringify(body) })
      onChanged()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const currentId = deal?.assignedTo?.userId ?? ""
  const options = [...team]
  if (deal?.assignedTo && !options.some(t => t.id === deal.assignedTo!.userId)) options.push({ id: deal.assignedTo.userId, name: deal.assignedTo.name })
  const pending = (contact.suggestions ?? []).filter(s => s.status === "pending" && s.field === "customerType")
  const tags = (contact.suggestions ?? []).filter(s => s.status === "pending" && s.field === "interestTag")
  const wa = waHref(contact.waId ? `+${contact.waId}` : contact.phoneE164)

  return (
    <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">{displayName(contact)}</h1>
          {contact.company && <p className="text-sm text-gray-600">{contact.company}</p>}
          {(contact.city || contact.state) && <p className="text-xs text-gray-500">{[contact.city, contact.state].filter(Boolean).join(", ")}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {deal && <Badge tone={stageTone(deal.stage)}>{stageLabel(deal.stage)}</Badge>}
          {contact.existingDealer ? <DealerBadge /> : null}
          {(deal?.customerType || contact.customerType) && <Badge>{typeLabel(deal?.customerType || contact.customerType)}</Badge>}
          {deal && <Badge>{sourceLabel(deal.leadSource)}</Badge>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-base font-medium">{prettyPhone(contact.phoneE164)}</span>
        <a href={telHref(contact.phoneE164)} className={btnSecondary}>Call</a>
        <a href={wa} target="_blank" rel="noopener noreferrer" className={btnSecondary}>WhatsApp</a>
      </div>

      {deal && <StageControl dealId={deal.id} stage={deal.stage} onChanged={onChanged} />}

      {deal ? (
        <div>
          <label htmlFor="assignee" className="mb-1 block text-sm font-medium">Assigned to</label>
          <select
            id="assignee" className={`${inputCls} sm:max-w-xs`} value={currentId} disabled={busy || !deal.isOpen}
            onChange={e => void patch({ assignedTo: e.target.value || null })}
          >
            <option value="">Unassigned</option>
            {options.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {!deal.isOpen && <p className="mt-1 text-xs text-gray-500">This deal is closed.</p>}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No deal on this contact yet.</p>
      )}

      {deal?.productInterest && deal.productInterest.length > 0 && (
        <p className="text-sm text-gray-700">
          <span className="font-medium">Interested in: </span>
          {deal.productInterest.map(p => (p.qty ? `${p.label} × ${p.qty}` : p.label)).join(", ")}
        </p>
      )}

      {pending.map(s => (
        <div key={s.value} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <p>Looks like a <strong>{typeLabel(s.value)}</strong>. Is that right?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={btnSecondary} disabled={busy || !deal?.isOpen} onClick={() => void patch({ customerType: s.value })}>Accept</button>
            <button type="button" className={btnSecondary} disabled={busy} onClick={() => void patch({ rejectSuggestion: { kind: "customerType", value: s.value } })}>Reject</button>
          </div>
        </div>
      ))}

      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-600">Suggested tags:</span>
          {tags.map(s => (
            <span key={s.value} className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 py-0.5 pl-3 pr-1">
              {s.value.replace(/_/g, " ")}
              <button type="button" aria-label={`Accept ${s.value}`} disabled={busy} className="min-h-[44px] rounded-full px-2 font-medium text-green-700" onClick={() => void patch({ acceptSuggestion: { kind: "interestTag", value: s.value } })}>Accept</button>
              <button type="button" aria-label={`Reject ${s.value}`} disabled={busy} className="min-h-[44px] rounded-full px-2 font-medium text-red-700" onClick={() => void patch({ rejectSuggestion: { kind: "interestTag", value: s.value } })}>Reject</button>
            </span>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
    </section>
  )
}
