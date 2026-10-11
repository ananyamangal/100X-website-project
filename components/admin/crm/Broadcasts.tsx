"use client"
// Broadcasts (STEP 9): campaigns (segment + approved template + parameter mapping) and segments.
// Sending runs in the background; the campaign page refreshes its counts while it is sending.
import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/lib/rbac/client"
import { crmFetch, errorText } from "./api"
import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABEL, INDIAN_STATES, LEAD_SOURCES, SOURCE_LABEL, STAGES, fullTime, prettyPhone, stageLabel } from "./format"
import { Badge, Chip, EmptyBox, ErrorBox, Spinner, btnPrimary, btnSecondary, inputCls } from "./ui"

interface Filter { customerTypes?: string[]; states?: string[]; stages?: string[]; closedWonWithinDays?: number; existingDealer?: boolean; interestTags?: string[]; leadSources?: string[] }
interface Segment { id: string; name: string; filter: Filter }
type Param = { from: "contact.name" | "contact.company" | "contact.city" } | { from: "csv.column"; column: string } | { literal: string }
interface Counts { total: number; queued: number; sent: number; delivered: number; read: number; failed: number; skipped: number; replied: number; deferred_cap: number }
interface Broadcast { id: string; name: string; status: string; templateName: string; languageMode: string; params: Param[]; audience: { kind: string; segmentId?: string; importId?: string }; counts: Counts; createdAt: string; startedAt: string | null; completedAt: string | null; pausedReason?: string | null }
interface Template { name: string; language: string; bodyText: string; bodyParamCount: number; headerType: string; category: string }

const STATUS_TONE: Record<string, "gray" | "blue" | "green" | "amber" | "red"> = { draft: "gray", expanding: "blue", sending: "blue", paused: "amber", completed: "green", cancelled: "red" }
const REASON: Record<string, string> = { team_member: "team member's own number", opted_out: "opted out", not_on_whatsapp: "not on WhatsApp", template_missing_param: "missing name/company/city", cancelled: "campaign cancelled", unknown_outcome: "unknown outcome (not re-sent)" }

/** Toggle a value in an optional list (undefined when empty). */
export function toggleIn(list: string[] | undefined, v: string): string[] | undefined {
  const s = new Set(list ?? [])
  if (s.has(v)) s.delete(v); else s.add(v)
  return s.size ? Array.from(s) : undefined
}

/** One-line summary of a segment filter. */
export function describeFilter(f: Filter, labels: { type: (s: string) => string; stage: (s: string) => string; source: (s: string) => string }): string {
  const parts: string[] = []
  if (f.customerTypes?.length) parts.push(f.customerTypes.map(labels.type).join(" / "))
  if (f.states?.length) parts.push(`in ${f.states.join(", ")}`)
  if (f.stages?.length) parts.push(`stage ${f.stages.map(labels.stage).join(" / ")}`)
  if (f.closedWonWithinDays) parts.push(`bought in the last ${f.closedWonWithinDays} days`)
  if (f.existingDealer === true) parts.push("existing dealers")
  if (f.existingDealer === false) parts.push("not existing dealers")
  if (f.interestTags?.length) parts.push(`tagged ${f.interestTags.join(", ")}`)
  if (f.leadSources?.length) parts.push(`from ${f.leadSources.map(labels.source).join(" / ")}`)
  return parts.length ? parts.join("; ") : "Everyone"
}

function usePerm() {
  const { user, permissions } = useAuth()
  return user?.role === "super_admin" || (permissions as string[]).includes("crm.broadcasts.send")
}

export function Broadcasts() {
  const [tab, setTab] = useState<"campaigns" | "segments">("campaigns")
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Broadcasts</h1>
      <div className="flex gap-2">
        <Chip selected={tab === "campaigns"} onClick={() => setTab("campaigns")}>Campaigns</Chip>
        <Chip selected={tab === "segments"} onClick={() => setTab("segments")}>Segments</Chip>
      </div>
      {tab === "campaigns" ? <Campaigns /> : <Segments />}
    </div>
  )
}

// ───────────────────────── segments ─────────────────────────

function Segments() {
  const canSend = usePerm()
  const [items, setItems] = useState<Segment[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Segment | null>(null)
  const load = useCallback(async () => {
    try { setItems((await crmFetch<{ items: Segment[] }>("/api/crm/segments")).items) } catch (e) { setError(errorText(e)) }
  }, [])
  useEffect(() => { void load() }, [load])
  if (error) return <ErrorBox onRetry={() => void load()}>{error}</ErrorBox>
  if (!items) return <Spinner />
  if (editing) return <SegmentEditor initial={editing} onDone={() => { setEditing(null); void load() }} />
  return (
    <div className="space-y-3">
      {canSend && <button type="button" className={btnPrimary} onClick={() => setEditing({ id: "", name: "", filter: {} })}>New segment</button>}
      {items.length === 0 ? <EmptyBox>No segments yet. A segment picks who receives a broadcast.</EmptyBox> : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {items.map(s => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div>
                <div className="font-medium text-gray-900">{s.name}</div>
                <div className="text-sm text-gray-600">{describeFilter(s.filter, { type: t => CUSTOMER_TYPE_LABEL[t as keyof typeof CUSTOMER_TYPE_LABEL] ?? t, stage: stageLabel, source: x => SOURCE_LABEL[x as keyof typeof SOURCE_LABEL] ?? x })}</div>
              </div>
              {canSend && <button type="button" className={btnSecondary} onClick={() => setEditing(s)}>Edit</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SegmentEditor({ initial, onDone }: { initial: Segment; onDone: () => void }) {
  const [name, setName] = useState(initial.name)
  const [f, setF] = useState<Filter>(initial.filter)
  const [tags, setTags] = useState((initial.filter.interestTags ?? []).join(", "))
  const [preview, setPreview] = useState<{ total: number; sendable: number; optedOut: number; notOnWhatsApp: number; tooMany: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const filter = (): Filter => ({ ...f, interestTags: tags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean).length ? tags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean) : undefined })

  async function runPreview() {
    setError(null)
    try { setPreview((await crmFetch<{ preview: NonNullable<typeof preview> }>("/api/crm/segments/preview", { method: "POST", body: JSON.stringify({ filter: filter() }) })).preview) } catch (e) { setError(errorText(e)) }
  }
  async function save() {
    setSaving(true); setError(null)
    try {
      const body = JSON.stringify({ name: name.trim(), filter: filter() })
      if (initial.id) await crmFetch(`/api/crm/segments/${initial.id}`, { method: "PATCH", body })
      else await crmFetch("/api/crm/segments", { method: "POST", body })
      onDone()
    } catch (e) { setError(errorText(e)) } finally { setSaving(false) }
  }
  const chips = (label: string, values: readonly string[], key: "customerTypes" | "stages" | "leadSources", text: (v: string) => string) => (
    <div className="space-y-1"><div className="text-sm font-medium text-gray-700">{label}</div>
      <div className="flex flex-wrap gap-2">{values.map(v => <Chip key={v} selected={!!f[key]?.includes(v)} onClick={() => setF({ ...f, [key]: toggleIn(f[key], v) })}>{text(v)}</Chip>)}</div></div>
  )
  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <label className="block text-sm"><span className="mb-1 block text-gray-700">Segment name</span>
        <input className={inputCls} value={name} maxLength={80} onChange={e => setName(e.target.value)} /></label>
      {chips("Customer type", CUSTOMER_TYPES, "customerTypes", t => CUSTOMER_TYPE_LABEL[t as keyof typeof CUSTOMER_TYPE_LABEL])}
      {chips("Deal stage", STAGES, "stages", stageLabel)}
      {chips("Lead source", LEAD_SOURCES, "leadSources", s => SOURCE_LABEL[s as keyof typeof SOURCE_LABEL])}
      <label className="block text-sm"><span className="mb-1 block text-gray-700">States (hold Ctrl to pick several)</span>
        <select multiple className={`${inputCls} min-h-[120px]`} value={f.states ?? []} onChange={e => { const v = Array.from(e.target.selectedOptions).map(o => o.value); setF({ ...f, states: v.length ? v : undefined }) }}>
          {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select></label>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-sm"><span className="mb-1 block text-gray-700">Bought in the last N days</span>
          <input className={inputCls} type="number" min={1} max={3650} value={f.closedWonWithinDays ?? ""} onChange={e => setF({ ...f, closedWonWithinDays: e.target.value ? Number(e.target.value) : undefined })} /></label>
        <label className="text-sm"><span className="mb-1 block text-gray-700">Existing dealers</span>
          <select className={inputCls} value={f.existingDealer === undefined ? "" : String(f.existingDealer)} onChange={e => setF({ ...f, existingDealer: e.target.value === "" ? undefined : e.target.value === "true" })}>
            <option value="">Any</option><option value="true">Only existing dealers</option><option value="false">Exclude existing dealers</option>
          </select></label>
        <label className="text-sm"><span className="mb-1 block text-gray-700">Interest tags (comma separated)</span>
          <input className={inputCls} value={tags} onChange={e => setTags(e.target.value)} placeholder="gem, tender" /></label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={btnSecondary} onClick={() => void runPreview()}>Preview audience</button>
        {preview && <span className="text-sm text-gray-700" role="status">{preview.total} matching: <strong>{preview.sendable} can receive it</strong>, {preview.optedOut} opted out, {preview.notOnWhatsApp} not on WhatsApp{preview.tooMany ? " (over the 10,000 limit — narrow it)" : ""}.</span>}
      </div>
      {error && <ErrorBox>{error}</ErrorBox>}
      <div className="flex gap-2">
        <button type="button" className={btnPrimary} disabled={saving || !name.trim()} onClick={() => void save()}>{saving ? "Saving..." : "Save segment"}</button>
        <button type="button" className={btnSecondary} onClick={onDone}>Cancel</button>
      </div>
    </div>
  )
}

// ───────────────────────── campaigns ─────────────────────────

function Campaigns() {
  const canSend = usePerm()
  const [items, setItems] = useState<Broadcast[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const load = useCallback(async () => {
    try { setItems((await crmFetch<{ items: Broadcast[] }>("/api/crm/broadcasts")).items) } catch (e) { setError(errorText(e)) }
  }, [])
  useEffect(() => { void load() }, [load])
  if (error) return <ErrorBox onRetry={() => void load()}>{error}</ErrorBox>
  if (!items) return <Spinner />
  if (creating) return <CampaignEditor onDone={() => { setCreating(false); void load() }} />
  if (open) return <CampaignDetail id={open} canSend={canSend} onBack={() => { setOpen(null); void load() }} />
  return (
    <div className="space-y-3">
      {canSend && <button type="button" className={btnPrimary} onClick={() => setCreating(true)}>New campaign</button>}
      {items.length === 0 ? <EmptyBox>No campaigns yet.</EmptyBox> : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {items.map(b => (
            <li key={b.id}>
              <button type="button" className="flex w-full flex-wrap items-center justify-between gap-2 p-3 text-left hover:bg-gray-50" onClick={() => setOpen(b.id)}>
                <span><span className="font-medium text-gray-900">{b.name}</span> <Badge tone={STATUS_TONE[b.status] ?? "gray"}>{b.status}</Badge>
                  <span className="block text-sm text-gray-600">{b.templateName} · created {fullTime(b.createdAt)}</span></span>
                <span className="text-sm text-gray-700">{b.counts.sent}/{b.counts.total} sent · {b.counts.read} read · {b.counts.replied} replied</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CampaignEditor({ onDone }: { onDone: () => void }) {
  const [segments, setSegments] = useState<Segment[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [name, setName] = useState("")
  const [segmentId, setSegmentId] = useState("")
  const [source, setSource] = useState<"segment" | "csv">("segment")
  const [csv, setCsv] = useState<{ importId: string; headers: string[]; total: number; summary: { valid: number; invalid_phone: number; duplicate_in_batch: number } } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [languageMode, setLanguageMode] = useState("contact_preference")
  const [params, setParams] = useState<Param[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    crmFetch<{ items: Segment[] }>("/api/crm/segments").then(r => setSegments(r.items)).catch(e => setError(errorText(e)))
    crmFetch<{ items: Template[] }>("/api/crm/templates").then(r => setTemplates(r.items.filter(t => t.headerType === "NONE" || t.headerType === "TEXT"))).catch(e => setError(errorText(e)))
  }, [])
  const tpl = templates.find(t => t.name === templateName && t.language === "en_US") ?? templates.find(t => t.name === templateName)
  const pickTemplate = (n: string) => {
    setTemplateName(n)
    const t = templates.find(x => x.name === n)
    setParams(Array.from({ length: t?.bodyParamCount ?? 0 }, (_, i) => (i === 0 ? { from: "contact.name" } : { literal: "" })))
  }
  async function upload(file: File) {
    setUploading(true); setError(null)
    try {
      const fd = new FormData()
      fd.set("file", file)
      setCsv(await crmFetch("/api/crm/broadcasts/audiences", { method: "POST", body: fd }))
    } catch (e) { setError(errorText(e)) } finally { setUploading(false) }
  }
  async function save() {
    setSaving(true); setError(null)
    try {
      const audience = source === "csv" ? { csvImportId: csv?.importId } : { segmentId }
      await crmFetch("/api/crm/broadcasts", { method: "POST", body: JSON.stringify({ name: name.trim(), ...audience, templateName, languageMode, params }) })
      onDone()
    } catch (e) { setError(errorText(e)) } finally { setSaving(false) }
  }
  const names = Array.from(new Set(templates.map(t => t.name)))
  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="font-semibold text-gray-900">New campaign (saved as a draft)</h2>
      <label className="block text-sm"><span className="mb-1 block text-gray-700">Campaign name</span>
        <input className={inputCls} value={name} maxLength={100} onChange={e => setName(e.target.value)} /></label>
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="space-y-1 text-sm"><span className="block text-gray-700">Audience</span>
          <select className={inputCls} value={source} onChange={e => { setSource(e.target.value as "segment" | "csv"); setParams(ps => ps.map(p => ("from" in p && p.from === "csv.column" ? { from: "contact.name" } : p))) }} aria-label="Audience source">
            <option value="segment">A segment</option><option value="csv">Upload a CSV list</option>
          </select>
          {source === "segment" ? (
            <select className={inputCls} value={segmentId} onChange={e => setSegmentId(e.target.value)} aria-label="Segment">
              <option value="">Pick a segment</option>{segments.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          ) : (
            <div>
              <input type="file" accept=".csv,.txt,.tsv,text/csv" disabled={uploading} onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(f) }} aria-label="CSV file" />
              {uploading && <span className="text-gray-600"> Uploading…</span>}
              {csv && <p className="text-gray-700">{csv.summary.valid} numbers ready{csv.summary.invalid_phone ? `, ${csv.summary.invalid_phone} invalid` : ""}{csv.summary.duplicate_in_batch ? `, ${csv.summary.duplicate_in_batch} duplicates` : ""} (of {csv.total} rows).</p>}
            </div>
          )}
        </div>
        <label className="text-sm"><span className="mb-1 block text-gray-700">Approved template</span>
          <select className={inputCls} value={templateName} onChange={e => pickTemplate(e.target.value)}>
            <option value="">Pick a template</option>{names.map(n => <option key={n} value={n}>{n}</option>)}
          </select></label>
        <label className="text-sm"><span className="mb-1 block text-gray-700">Language</span>
          <select className={inputCls} value={languageMode} onChange={e => setLanguageMode(e.target.value)}>
            <option value="contact_preference">Customer&apos;s language</option><option value="en_US">English</option><option value="hi">Hindi</option>
          </select></label>
      </div>
      {tpl && <p className="whitespace-pre-line rounded-md bg-gray-50 p-3 text-sm text-gray-700">{tpl.bodyText}</p>}
      {params.map((p, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[120px_1fr_1fr]">
          <span className="self-center text-sm text-gray-700">{`{{${i + 1}}}`}</span>
          <select className={inputCls} value={"from" in p ? p.from : "literal"} onChange={e => setParams(params.map((x, j) => (j === i ? (e.target.value === "literal" ? { literal: "" } : e.target.value === "csv.column" ? { from: "csv.column", column: csv?.headers[0] ?? "" } : { from: e.target.value as "contact.name" }) : x)))}>
            <option value="contact.name">Customer name</option><option value="contact.company">Company</option><option value="contact.city">City</option>
            {source === "csv" && csv && <option value="csv.column">Column from the CSV</option>}
            <option value="literal">Fixed text</option>
          </select>
          {"literal" in p ? <input className={inputCls} value={p.literal} maxLength={200} onChange={e => setParams(params.map((x, j) => (j === i ? { literal: e.target.value } : x)))} placeholder="e.g. ₹41,000" />
            : "from" in p && p.from === "csv.column" ? (
              <select className={inputCls} value={p.column} onChange={e => setParams(params.map((x, j) => (j === i ? { from: "csv.column", column: e.target.value } : x)))} aria-label="CSV column">
                {(csv?.headers ?? []).map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            ) : <span />}
        </div>
      ))}
      {error && <ErrorBox>{error}</ErrorBox>}
      <div className="flex gap-2">
        <button type="button" className={btnPrimary} disabled={saving || !name.trim() || (source === "segment" ? !segmentId : !csv) || !templateName} onClick={() => void save()}>{saving ? "Saving..." : "Save draft"}</button>
        <button type="button" className={btnSecondary} onClick={onDone}>Cancel</button>
      </div>
    </div>
  )
}

function CampaignDetail({ id, canSend, onBack }: { id: string; canSend: boolean; onBack: () => void }) {
  const [data, setData] = useState<{ broadcast: Broadcast; problems: { phoneE164: string; status: string; reason: string | null }[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const load = useCallback(async () => {
    try { setData(await crmFetch(`/api/crm/broadcasts/${id}`)) } catch (e) { setError(errorText(e)) }
  }, [id])
  useEffect(() => { void load() }, [load])
  const sending = data?.broadcast.status === "sending" || data?.broadcast.status === "expanding"
  useEffect(() => {
    if (!sending) return
    const t = setInterval(() => { if (document.visibilityState === "visible") void load() }, 15_000)
    return () => clearInterval(t)
  }, [sending, load])
  async function act(a: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return
    setBusy(a); setError(null)
    try { await crmFetch(`/api/crm/broadcasts/${id}/${a}`, { method: "POST" }); await load() } catch (e) { setError(errorText(e)) } finally { setBusy(null) }
  }
  if (!data) return error ? <ErrorBox onRetry={() => void load()}>{error}</ErrorBox> : <Spinner />
  const b = data.broadcast
  const c = b.counts
  return (
    <div className="space-y-4">
      <button type="button" className="text-sm text-blue-700 hover:underline" onClick={onBack}>&larr; All campaigns</button>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-gray-900">{b.name}</h2><Badge tone={STATUS_TONE[b.status] ?? "gray"}>{b.status}</Badge></div>
        <p className="text-sm text-gray-600">Template {b.templateName}{b.startedAt ? ` · started ${fullTime(b.startedAt)}` : ""}{b.completedAt ? ` · finished ${fullTime(b.completedAt)}` : ""}</p>
        {b.pausedReason === "number_paused" && <p className="mt-2 text-sm text-amber-800">Paused because WhatsApp paused sending on this number. Resume once the number is healthy again.</p>}
        <dl className="mt-3 grid grid-cols-3 gap-2 text-sm sm:grid-cols-5">
          {([["Recipients", c.total], ["Waiting", c.queued], ["Sent", c.sent], ["Delivered", c.delivered], ["Read", c.read], ["Replied", c.replied], ["Failed", c.failed], ["Skipped", c.skipped], ["Held by daily limit", c.deferred_cap]] as [string, number][]).map(([k, v]) => (
            <div key={k} className="rounded-md bg-gray-50 p-2"><dt className="text-gray-600">{k}</dt><dd className="text-lg font-semibold text-gray-900">{v}</dd></div>
          ))}
        </dl>
        {error && <div className="mt-2"><ErrorBox>{error}</ErrorBox></div>}
        {canSend && (
          <div className="mt-3 flex flex-wrap gap-2">
            {b.status === "draft" && <button type="button" className={btnPrimary} disabled={!!busy} onClick={() => void act("start", "Start sending this campaign now? Messages cannot be recalled.")}>{busy === "start" ? "Starting..." : "Start sending"}</button>}
            {b.status === "sending" && <button type="button" className={btnSecondary} disabled={!!busy} onClick={() => void act("pause")}>Pause</button>}
            {b.status === "paused" && <button type="button" className={btnPrimary} disabled={!!busy} onClick={() => void act("resume")}>Resume</button>}
            {["sending", "paused"].includes(b.status) && <button type="button" className={btnSecondary} disabled={!!busy} onClick={() => void act("cancel", "Cancel this campaign? Recipients not yet sent to will be skipped.")}>Cancel campaign</button>}
            {b.status !== "draft" && <button type="button" className={btnSecondary} disabled={!!busy} onClick={() => void act("recount")}>Recount</button>}
          </div>
        )}
      </div>
      {data.problems.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Not sent ({data.problems.length}{data.problems.length === 100 ? "+" : ""})</h3>
          <ul className="space-y-1 text-sm">{data.problems.map(p => <li key={p.phoneE164} className="flex justify-between gap-2"><span>{prettyPhone(p.phoneE164)}</span><span className="text-gray-600">{REASON[p.reason ?? ""] ?? p.reason ?? p.status}</span></li>)}</ul>
        </section>
      )}
    </div>
  )
}
