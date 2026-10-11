"use client"
import { useState } from "react"
import { crmFetch, errorText } from "./api"
import { fullTime, STAGES, stageLabel } from "./format"
import { LOST_REASONS } from "@/lib/crm/model"
import { btnPrimary, btnSecondary, inputCls } from "./ui"

export interface StageHistoryView {
  from: string | null
  to: string
  at: string
  by?: { name?: string; system?: string } | null
  note?: string
}

export const LOST_REASON_LABEL: Record<string, string> = {
  price_too_high: "Price too high",
  chose_competitor: "Chose a competitor",
  no_budget: "No budget",
  no_response: "No response",
  requirement_changed: "Requirement changed",
  tender_lost: "Tender lost",
  specs_mismatch: "Specs did not match",
  delivery_timeline: "Delivery timeline",
  duplicate_or_spam: "Duplicate or spam",
  other: "Other",
}

/** Cap = server MAX_ORDER_PAISE (1e12 paise = ₹10,000 crore). "12,500.50" -> 1250050 paise; null when it is not a positive amount with at most 2 decimals. */
export function rupeesToPaise(input: string): number | null {
  const s = input.replace(/[,\s₹]/g, "")
  const m = /^(\d{1,12})(?:\.(\d{1,2}))?$/.exec(s)
  if (!m) return null
  const paise = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0") || "0")
  return paise > 0 && paise <= 1_000_000_000_000 ? paise : null
}


type Pending = "closed_won" | "closed_lost" | null

export function StageControl({ dealId, stage, onChanged }: { dealId: string; stage: string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending>(null)
  const [invoice, setInvoice] = useState("")
  const [value, setValue] = useState("")
  const [reason, setReason] = useState("")
  const [reasonText, setReasonText] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  async function send(body: Record<string, unknown>): Promise<boolean> {
    if (busy) return false
    setBusy(true); setError(null)
    try {
      await crmFetch(`/api/crm/deals/${dealId}/stage`, { method: "POST", body: JSON.stringify(body) })
      onChanged()
      return true
    } catch (e) {
      const msg = errorText(e)
      if (pending) setFormError(msg)
      else setError(msg)
      return false
    } finally {
      setBusy(false)
    }
  }

  function choose(next: string) {
    if (next === stage) return
    setFormError(null); setError(null)
    if (next === "closed_won") { setInvoice(""); setValue(""); setPending("closed_won") }
    else if (next === "closed_lost") { setReason(""); setReasonText(""); setPending("closed_lost") }
    else void send({ stage: next })
  }

  async function submit() {
    if (pending === "closed_won") {
      const paise = rupeesToPaise(value)
      if (!invoice.trim()) return setFormError("Enter the invoice number from Busy.")
      if (paise === null) return setFormError("Enter the order value in rupees (more than 0, at most ₹10,000 crore), for example 125000 or 125000.50.")
      if (await send({ stage: "closed_won", invoiceNumber: invoice.trim(), orderValue: paise })) setPending(null)
    } else if (pending === "closed_lost") {
      if (!reason) return setFormError("Pick a reason.")
      if (reason === "other" && !reasonText.trim()) return setFormError("Tell us the reason in a few words.")
      if (await send({ stage: "closed_lost", lostReason: reason, ...(reasonText.trim() ? { lostReasonText: reasonText.trim() } : {}) })) setPending(null)
    }
  }

  return (
    <div>
      <label htmlFor="stage" className="mb-1 block text-sm font-medium">Stage</label>
      <select id="stage" className={`${inputCls} sm:max-w-xs`} value={stage} disabled={busy} onChange={e => choose(e.target.value)}>
        {STAGES.map(s => <option key={s} value={s}>{stageLabel(s)}</option>)}
      </select>
      {error && <p className="mt-1 text-sm text-red-700" role="alert">{error}</p>}

      {pending && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="stage-dialog-title">
          <div className="w-full max-w-md space-y-3 rounded-xl bg-white p-4 shadow-xl">
            <h2 id="stage-dialog-title" className="text-lg font-bold">{pending === "closed_won" ? "Mark as Closed-Won" : "Mark as Closed-Lost"}</h2>
            {pending === "closed_won" ? (
              <>
                <div>
                  <label htmlFor="inv" className="mb-1 block text-sm font-medium">Invoice number (from Busy)</label>
                  <input id="inv" className={inputCls} value={invoice} maxLength={60} onChange={e => setInvoice(e.target.value)} autoFocus />
                </div>
                <div>
                  <label htmlFor="ov" className="mb-1 block text-sm font-medium">Order value (₹)</label>
                  <input id="ov" className={inputCls} inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} placeholder="125000" />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="lr" className="mb-1 block text-sm font-medium">Why was it lost?</label>
                  <select id="lr" className={inputCls} value={reason} onChange={e => setReason(e.target.value)}>
                    <option value="">Pick a reason</option>
                    {LOST_REASONS.map(r => <option key={r} value={r}>{LOST_REASON_LABEL[r] ?? r}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="lt" className="mb-1 block text-sm font-medium">Details{reason === "other" ? "" : " (optional)"}</label>
                  <textarea id="lt" className={`${inputCls} min-h-[96px] py-2`} value={reasonText} maxLength={500} onChange={e => setReasonText(e.target.value)} />
                </div>
              </>
            )}
            {formError && <p className="text-sm text-red-700" role="alert">{formError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className={btnSecondary} disabled={busy} onClick={() => setPending(null)}>Cancel</button>
              <button type="button" className={btnPrimary} disabled={busy} onClick={() => void submit()}>{busy ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function StageHistory({ history }: { history: StageHistoryView[] | undefined }) {
  const rows = [...(history ?? [])].reverse()
  if (rows.length === 0) return null
  return (
    <details className="rounded-xl border border-gray-200 bg-white p-4">
      <summary className="min-h-[44px] cursor-pointer text-sm font-medium leading-[44px]">Stage history ({rows.length})</summary>
      <ol className="mt-2 space-y-2 text-sm">
        {rows.map((h, i) => (
          <li key={`${h.at}-${i}`} className="border-l-2 border-gray-200 pl-3">
            <div className="font-medium">{h.from ? `${stageLabel(h.from)} → ${stageLabel(h.to)}` : `Started as ${stageLabel(h.to)}`}</div>
            <div className="text-xs text-gray-500">
              {fullTime(h.at)}
              {h.by?.name ? ` · ${h.by.name}` : h.by?.system ? ` · ${h.by.system}` : ""}
            </div>
            {h.note && <div className="text-xs text-gray-500">{h.note}</div>}
          </li>
        ))}
      </ol>
    </details>
  )
}
