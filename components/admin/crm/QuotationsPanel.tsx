"use client"
// Quotations tab of the lead detail (STEP 6): versions of the deal's quotations, draft builder with
// live totals, issue / revise / discard, PDF, and send on WhatsApp or by email.
import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/lib/rbac/client"
import { formatInr } from "@/lib/crm/quotes/money"
import { ApiError, crmFetch, errorText } from "./api"
import { fullTime } from "./format"
import {
  GST_RATES, buildDraftBody, emptyLine, emptyTerms, newIdemKey, previewTotals, rowsFromQuotation,
  type LineRow, type TermsForm,
} from "./quoteForm"
import { Badge, EmptyBox, ErrorBox, Spinner, btnPrimary, btnSecondary, inputCls } from "./ui"
import type { GstRate } from "@/lib/crm/model"

interface QuoteLine { model: string; description: string; hsn: string | null; qty: number; unitPrice: number; gstRate: GstRate; lineTotal: number }
interface QuoteSend { channel: "whatsapp" | "email"; at: string; by: { name: string }; to: string }
interface Quote {
  id: string
  label: string
  status: "draft" | "issued" | "superseded"
  version: number
  quoteNumber: string | null
  lines: QuoteLine[]
  totals: { taxable: number; gst: number; grandTotal: number }
  terms: { validityDays: number; payment: string; delivery: string; warranty: string; freight: string; notes: string }
  sends: QuoteSend[]
  issuedAt: string | null
  createdAt: string
}

const STATUS_TONE = { draft: "amber", issued: "green", superseded: "gray" } as const
const rupee = (p: number) => `₹ ${formatInr(p)}`

export function QuotationsPanel({ dealId, dealOpen, contactEmail, onChanged }: { dealId: string | null; dealOpen: boolean; contactEmail: string | null; onChanged: () => void }) {
  const { user, permissions } = useAuth()
  const has = (k: string) => user?.role === "super_admin" || (permissions as string[]).includes(k)
  const canCreate = has("crm.quotes.create")
  const canSend = has("crm.quotes.send")

  const [items, setItems] = useState<Quote[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id: string | null; rows: LineRow[]; terms: TermsForm } | null>(null)

  const load = useCallback(async () => {
    if (!dealId) return
    setError(null)
    try {
      setItems((await crmFetch<{ items: Quote[] }>(`/api/crm/deals/${dealId}/quotations`)).items)
    } catch (e) {
      setError(errorText(e))
    }
  }, [dealId])
  useEffect(() => { void load() }, [load])

  if (!dealId) return <EmptyBox>This customer has no deal yet. Log a call or enquiry first, then make a quotation.</EmptyBox>
  if (error) return <ErrorBox onRetry={() => void load()}>{error}</ErrorBox>
  if (!items) return <Spinner />

  const refresh = () => { void load(); onChanged() }

  if (editing) {
    return (
      <QuoteBuilder
        dealId={dealId}
        initial={editing}
        onCancel={() => setEditing(null)}
        onSaved={() => { setEditing(null); refresh() }}
      />
    )
  }

  return (
    <div className="space-y-3">
      {canCreate && dealOpen && (
        <button type="button" className={btnPrimary} onClick={() => setEditing({ id: null, rows: [emptyLine()], terms: emptyTerms() })}>
          New quotation
        </button>
      )}
      {!dealOpen && <p className="text-sm text-gray-500">This deal is closed. Issued quotations stay available below.</p>}
      {items.length === 0 ? (
        <EmptyBox>No quotations for this deal yet.</EmptyBox>
      ) : (
        items.map(q => (
          <QuoteCard
            key={q.id}
            q={q}
            canCreate={canCreate && dealOpen}
            canSend={canSend}
            contactEmail={contactEmail}
            onEdit={() => setEditing({ id: q.id, rows: rowsFromQuotation(q.lines), terms: { ...q.terms, validityDays: String(q.terms.validityDays) } })}
            onChanged={refresh}
          />
        ))
      )}
    </div>
  )
}

function QuoteCard({ q, canCreate, canSend, contactEmail, onEdit, onChanged }: {
  q: Quote; canCreate: boolean; canSend: boolean; contactEmail: string | null; onEdit: () => void; onChanged: () => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [emailTo, setEmailTo] = useState<string | null>(null)
  // One key per send intent: a retry after a network error reuses it, so nothing is sent twice.
  const [keys, setKeys] = useState<{ whatsapp: string; email: string }>(() => ({ whatsapp: newIdemKey("qwa"), email: newIdemKey("qem") }))

  async function act(name: string, path: string, init: RequestInit, after?: () => void) {
    if (busy) return
    setBusy(name); setError(null)
    try {
      await crmFetch(path, init)
      after?.()
      onChanged()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(null)
    }
  }

  const sendWhatsApp = () =>
    act("wa", `/api/crm/quotations/${q.id}/send`, { method: "POST", body: JSON.stringify({ channel: "whatsapp", idempotencyKey: keys.whatsapp }) }, () =>
      setKeys(k => ({ ...k, whatsapp: newIdemKey("qwa") })))
  const sendEmail = (to: string) =>
    act("email", `/api/crm/quotations/${q.id}/send`, { method: "POST", body: JSON.stringify({ channel: "email", idempotencyKey: keys.email, ...(to.trim() ? { to: to.trim() } : {}) }) }, () => {
      setKeys(k => ({ ...k, email: newIdemKey("qem") }))
      setEmailTo(null)
    })

  const pdfHref = `/api/crm/quotations/${q.id}/pdf`
  const lastSend = q.sends.length ? q.sends[q.sends.length - 1] : null

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-gray-900">{q.label}</div>
          <div className="text-xs text-gray-500">
            {q.issuedAt ? `Issued ${fullTime(q.issuedAt)}` : `Drafted ${fullTime(q.createdAt)}`} · {q.lines.length} item{q.lines.length === 1 ? "" : "s"}
          </div>
        </div>
        <div className="text-right">
          <Badge tone={STATUS_TONE[q.status]}>{q.status === "draft" ? "Draft" : q.status === "issued" ? "Issued" : "Superseded"}</Badge>
          <div className="mt-1 text-lg font-semibold text-gray-900">{rupee(q.totals.grandTotal)}</div>
          <div className="text-xs text-gray-500">incl. GST {rupee(q.totals.gst)}</div>
        </div>
      </div>

      <ul className="mt-2 space-y-0.5 text-sm text-gray-700">
        {q.lines.slice(0, 4).map((l, i) => (
          <li key={i} className="flex justify-between gap-2">
            <span className="truncate">{l.qty} × {l.model}</span>
            <span className="whitespace-nowrap">{rupee(l.lineTotal)}</span>
          </li>
        ))}
        {q.lines.length > 4 && <li className="text-xs text-gray-500">and {q.lines.length - 4} more</li>}
      </ul>

      {lastSend && (
        <p className="mt-2 text-xs text-gray-500">
          Sent {q.sends.length} time{q.sends.length === 1 ? "" : "s"}; last by {lastSend.channel === "email" ? "email" : "WhatsApp"} on {fullTime(lastSend.at)} by {lastSend.by.name}
        </p>
      )}

      {error && <div className="mt-2"><ErrorBox>{error}</ErrorBox></div>}

      <div className="mt-3 flex flex-wrap gap-2">
        <a className={btnSecondary} href={pdfHref} target="_blank" rel="noopener noreferrer">{q.status === "draft" ? "Preview PDF" : "PDF"}</a>
        {q.status === "draft" && canCreate && (
          <>
            <button type="button" className={btnSecondary} onClick={onEdit} disabled={!!busy}>Edit</button>
            <button type="button" className={btnPrimary} disabled={!!busy} onClick={() => {
              if (window.confirm(`Issue ${q.version > 1 ? `revision ${q.version}` : "this quotation"}? It gets its number and can no longer be edited.`)) void act("issue", `/api/crm/quotations/${q.id}/issue`, { method: "POST" })
            }}>{busy === "issue" ? "Issuing..." : "Issue"}</button>
            <button type="button" className={btnSecondary} disabled={!!busy} onClick={() => {
              if (window.confirm("Discard this draft?")) void act("discard", `/api/crm/quotations/${q.id}`, { method: "DELETE" })
            }}>Discard</button>
          </>
        )}
        {q.status === "issued" && canSend && (
          <>
            <button type="button" className={btnPrimary} disabled={!!busy} onClick={() => void sendWhatsApp()}>{busy === "wa" ? "Sending..." : "Send on WhatsApp"}</button>
            <button type="button" className={btnSecondary} disabled={!!busy} onClick={() => setEmailTo(contactEmail ?? "")}>Send by email</button>
          </>
        )}
        {q.status === "issued" && canCreate && (
          <button type="button" className={btnSecondary} disabled={!!busy} onClick={() => void act("revise", `/api/crm/quotations/${q.id}/revise`, { method: "POST" })}>
            {busy === "revise" ? "Creating..." : "Revise"}
          </button>
        )}
      </div>

      {emailTo !== null && (
        <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); void sendEmail(emailTo) }}>
          <label className="min-w-[220px] flex-1 text-sm">
            <span className="mb-1 block text-gray-700">Email address</span>
            <input className={inputCls} type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="customer@example.com" required />
          </label>
          <button type="submit" className={btnPrimary} disabled={!!busy}>{busy === "email" ? "Sending..." : "Send"}</button>
          <button type="button" className={btnSecondary} onClick={() => setEmailTo(null)}>Cancel</button>
        </form>
      )}
    </div>
  )
}

function QuoteBuilder({ dealId, initial, onCancel, onSaved }: {
  dealId: string
  initial: { id: string | null; rows: LineRow[]; terms: TermsForm }
  onCancel: () => void
  onSaved: () => void
}) {
  const [rows, setRows] = useState<LineRow[]>(initial.rows)
  const [terms, setTerms] = useState<TermsForm>(initial.terms)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const totals = previewTotals(rows)

  const setRow = (i: number, patch: Partial<LineRow>) => setRows(rs => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const setTerm = (k: keyof TermsForm, v: string) => setTerms(t => ({ ...t, [k]: v }))
  const err = (k: string) => (errors[k] ? <span className="mt-1 block text-xs text-red-700">{errors[k]}</span> : null)

  async function save() {
    const b = buildDraftBody(rows, terms)
    if (!b.ok) { setErrors(b.errors); return }
    setErrors({}); setSaving(true); setSaveError(null)
    try {
      if (initial.id) await crmFetch(`/api/crm/quotations/${initial.id}`, { method: "PATCH", body: JSON.stringify(b.body) })
      else await crmFetch(`/api/crm/deals/${dealId}/quotations`, { method: "POST", body: JSON.stringify(b.body) })
      onSaved()
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && Object.keys(e.fields).length) setErrors(e.fields)
      setSaveError(errorText(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="font-semibold text-gray-900">{initial.id ? "Edit draft quotation" : "New quotation"}</h3>
      {rows.map((r, i) => (
        <fieldset key={i} className="space-y-2 rounded-md border border-gray-200 p-3">
          <legend className="px-1 text-xs font-medium text-gray-600">Item {i + 1}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-sm"><span className="mb-1 block text-gray-700">Model / item</span>
              <input className={inputCls} value={r.model} maxLength={80} onChange={e => setRow(i, { model: e.target.value })} />{err(`lines.${i}.model`)}</label>
            <label className="text-sm"><span className="mb-1 block text-gray-700">HSN (optional)</span>
              <input className={inputCls} value={r.hsn} inputMode="numeric" maxLength={8} onChange={e => setRow(i, { hsn: e.target.value })} />{err(`lines.${i}.hsn`)}</label>
          </div>
          <label className="block text-sm"><span className="mb-1 block text-gray-700">Description (optional)</span>
            <textarea className={`${inputCls} min-h-[64px] py-2`} value={r.description} maxLength={500} onChange={e => setRow(i, { description: e.target.value })} /></label>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-sm"><span className="mb-1 block text-gray-700">Qty</span>
              <input className={inputCls} value={r.qty} inputMode="numeric" onChange={e => setRow(i, { qty: e.target.value })} />{err(`lines.${i}.qty`)}</label>
            <label className="text-sm"><span className="mb-1 block text-gray-700">Rate (₹, excl. GST)</span>
              <input className={inputCls} value={r.price} inputMode="decimal" placeholder="20500" onChange={e => setRow(i, { price: e.target.value })} />{err(`lines.${i}.price`) ?? err(`lines.${i}.unitPrice`)}</label>
            <label className="text-sm"><span className="mb-1 block text-gray-700">GST</span>
              <select className={inputCls} value={r.gstRate} onChange={e => setRow(i, { gstRate: Number(e.target.value) as GstRate })}>
                {GST_RATES.map(g => <option key={g} value={g}>{g}%</option>)}
              </select></label>
          </div>
          {rows.length > 1 && (
            <button type="button" className="text-sm text-red-700 hover:underline" onClick={() => setRows(rs => rs.filter((_, j) => j !== i))}>Remove item</button>
          )}
        </fieldset>
      ))}
      {err("lines")}
      <button type="button" className={btnSecondary} onClick={() => setRows(rs => [...rs, emptyLine()])} disabled={rows.length >= 50}>Add item</button>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-sm"><span className="mb-1 block text-gray-700">Valid for (days)</span>
          <input className={inputCls} value={terms.validityDays} inputMode="numeric" onChange={e => setTerm("validityDays", e.target.value)} />{err("terms.validityDays")}</label>
        {(["payment", "delivery", "warranty", "freight"] as const).map(k => (
          <label key={k} className="text-sm"><span className="mb-1 block capitalize text-gray-700">{k}</span>
            <input className={inputCls} value={terms[k]} maxLength={300} onChange={e => setTerm(k, e.target.value)} />{err(`terms.${k}`)}</label>
        ))}
      </div>
      <label className="block text-sm"><span className="mb-1 block text-gray-700">Notes for the customer (printed on the quotation)</span>
        <textarea className={`${inputCls} min-h-[64px] py-2`} value={terms.notes} maxLength={1500} onChange={e => setTerm("notes", e.target.value)} />{err("terms.notes")}</label>

      <div className="rounded-md bg-gray-50 p-3 text-sm">
        <div className="flex justify-between"><span>Taxable value</span><span>{rupee(totals.taxable)}</span></div>
        <div className="flex justify-between"><span>GST</span><span>{rupee(totals.gst)}</span></div>
        <div className="flex justify-between font-semibold"><span>Grand total</span><span>{rupee(totals.grandTotal)}</span></div>
      </div>

      {saveError && <ErrorBox>{saveError}</ErrorBox>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} disabled={saving} onClick={() => void save()}>{saving ? "Saving..." : "Save draft"}</button>
        <button type="button" className={btnSecondary} disabled={saving} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
