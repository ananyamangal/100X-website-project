"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/rbac/client"
import { ApiError, crmFetch, errorText, fieldText } from "./api"
import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABEL, INDIAN_STATES, LEAD_SOURCES, SOURCE_LABEL, type CustomerType, type LeadSource } from "./format"
import { Badge, Chip, ErrorBox, btnPrimary, btnSecondary, inputCls } from "./ui"
import { useTeam } from "./useTeam"

interface CreateResult {
  contactId: string
  dealId: string | null
  created: boolean
  dealCreated: boolean
  existingDealer: boolean
}

function FieldLabel({ id, children, error }: { id: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="mb-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-800">{children}</label>
      {error && <p className="text-sm text-red-700" role="alert">{fieldText(error)}</p>}
    </div>
  )
}

export function LogCallForm() {
  const { user, permissions } = useAuth()
  const canAssign = user?.role === "super_admin" || (permissions as string[]).includes("crm.leads.assign")
  const team = useTeam()
  const mobileRef = useRef<HTMLInputElement>(null)
  const [mobile, setMobile] = useState("")
  const [name, setName] = useState("")
  const [company, setCompany] = useState("")
  const [customerType, setCustomerType] = useState<CustomerType | null>(null)
  const [leadSource, setLeadSource] = useState<LeadSource>("call")
  const [state, setState] = useState("")
  const [city, setCity] = useState("")
  const [product, setProduct] = useState("")
  const [quantity, setQuantity] = useState("")
  const [notes, setNotes] = useState("")
  const [assignee, setAssignee] = useState("") // "" = me (server default)
  const [busy, setBusy] = useState(false)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CreateResult | null>(null)

  useEffect(() => { mobileRef.current?.focus() }, [])

  const reset = () => {
    setMobile(""); setName(""); setCompany(""); setCustomerType(null); setLeadSource("call"); setState(""); setCity("")
    setProduct(""); setQuantity(""); setNotes(""); setAssignee(""); setFields({}); setError(null); setResult(null)
    setTimeout(() => mobileRef.current?.focus(), 0)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true); setError(null); setFields({})
    const body: Record<string, unknown> = { mobile, leadSource }
    if (name.trim()) body.name = name.trim()
    if (company.trim()) body.company = company.trim()
    if (customerType) body.customerType = customerType
    if (state.trim()) body.state = state.trim()
    if (city.trim()) body.city = city.trim()
    if (product.trim()) body.product = product.trim()
    if (quantity.trim()) body.quantity = Number(quantity)
    if (notes.trim()) body.notes = notes.trim()
    if (canAssign && assignee && assignee !== user?.id) body.assignedTo = assignee
    try {
      setResult(await crmFetch<CreateResult>("/api/crm/leads", { method: "POST", body: JSON.stringify(body) }))
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && Object.keys(err.fields).length) {
        setFields(err.fields)
        setError("Please fix the highlighted fields.")
      } else setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-xl space-y-4 rounded-xl border border-green-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900">
            {result.created ? "New lead created" : "Existing customer — added to their history"}
          </h1>
          {result.existingDealer && <Badge tone="violet">Existing dealer</Badge>}
        </div>
        {!result.created && !result.dealCreated && <p className="text-sm text-gray-600">The call was added to their open deal.</p>}
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/crm/leads/${result.contactId}`} className={btnPrimary}>Open lead</Link>
          <button type="button" onClick={reset} className={btnSecondary}>Log another call</button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-5 pb-24" noValidate>
      <h1 className="text-xl font-bold">Log a call</h1>
      {error && <ErrorBox>{error}</ErrorBox>}

      <div>
        <FieldLabel id="mobile" error={fields.mobile}>Mobile number *</FieldLabel>
        <input id="mobile" ref={mobileRef} className={inputCls} type="tel" inputMode="tel" autoComplete="off" autoFocus
          placeholder="98765 43210" value={mobile} onChange={e => setMobile(e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel id="name" error={fields.name}>Name</FieldLabel>
          <input id="name" className={inputCls} value={name} onChange={e => setName(e.target.value)} autoComplete="off" />
        </div>
        <div>
          <FieldLabel id="company" error={fields.company}>Company</FieldLabel>
          <input id="company" className={inputCls} value={company} onChange={e => setCompany(e.target.value)} autoComplete="off" />
        </div>
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-gray-800">Customer type</legend>
        {fields.customerType && <p className="text-sm text-red-700" role="alert">{fieldText(fields.customerType)}</p>}
        <div className="flex flex-wrap gap-2">
          {CUSTOMER_TYPES.map(t => (
            <Chip key={t} selected={customerType === t} onClick={() => setCustomerType(customerType === t ? null : t)}>
              {CUSTOMER_TYPE_LABEL[t]}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-gray-800">Lead source</legend>
        {fields.leadSource && <p className="text-sm text-red-700" role="alert">{fieldText(fields.leadSource)}</p>}
        <div className="flex flex-wrap gap-2">
          {LEAD_SOURCES.map(s => (
            <Chip key={s} selected={leadSource === s} onClick={() => setLeadSource(s)}>{SOURCE_LABEL[s]}</Chip>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel id="state" error={fields.state}>State</FieldLabel>
          <input id="state" className={inputCls} list="in-states" value={state} onChange={e => setState(e.target.value)} placeholder="Start typing..." autoComplete="off" />
          <datalist id="in-states">{INDIAN_STATES.map(s => <option key={s} value={s} />)}</datalist>
        </div>
        <div>
          <FieldLabel id="city" error={fields.city}>City</FieldLabel>
          <input id="city" className={inputCls} value={city} onChange={e => setCity(e.target.value)} autoComplete="off" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <FieldLabel id="product" error={fields.product}>Product</FieldLabel>
          <input id="product" className={inputCls} value={product} onChange={e => setProduct(e.target.value)} autoComplete="off" />
        </div>
        <div>
          <FieldLabel id="qty" error={fields.quantity}>Quantity</FieldLabel>
          <input id="qty" className={inputCls} type="number" inputMode="numeric" min={1} value={quantity} onChange={e => setQuantity(e.target.value)} />
        </div>
      </div>

      <div>
        <FieldLabel id="assignee" error={fields.assignedTo}>Assigned to</FieldLabel>
        {!canAssign ? <p className="min-h-[48px] py-3 text-base text-gray-800">Me</p> : <select id="assignee" className={inputCls} value={assignee} onChange={e => setAssignee(e.target.value)}>
          <option value="">Me</option>
          {team.filter(t => t.id !== user?.id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>}
      </div>

      <div>
        <FieldLabel id="notes" error={fields.notes}>Internal note — never sent to customer</FieldLabel>
        <textarea id="notes" className={`${inputCls} min-h-[96px] border-amber-300 bg-amber-50`} rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white p-3 sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <button type="submit" disabled={busy || !mobile.trim()} className={`${btnPrimary} w-full`}>
          {busy ? "Saving..." : "Save call"}
        </button>
      </div>
    </form>
  )
}
