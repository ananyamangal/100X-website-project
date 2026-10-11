"use client"
// CRM settings (STEP 10): WhatsApp number health + daily limit + resume, template sync, Growth OS
// exports, and links to the other settings pages (Automation, Reminders).
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/rbac/client"
import { crmFetch, errorText } from "./api"
import { fullTime } from "./format"
import { Badge, EmptyBox, ErrorBox, Spinner, btnPrimary, btnSecondary, inputCls } from "./ui"

interface NumberHealth {
  phoneNumberId: string; displayPhone?: string | null; lastWebhookAt: string | null; lastInboundAt: string | null; lastSendAt: string | null
  lastSendError: { code: number | string | null; at: string | null } | null; sendingPaused: { reason: string; at: string | null } | null; tierCap: number | null; tierUsed24h?: number
}
interface Health { status?: string; queueDepth: number; numbers: NumberHealth[] }
interface Segment { id: string; name: string }

function usePerms() {
  const { user, permissions } = useAuth()
  const has = (k: string) => user?.role === "super_admin" || (permissions as string[]).includes(k)
  return { settings: has("crm.settings.edit"), growth: has("crm.growth.export"), broadcastsView: has("crm.broadcasts.view") }
}

export function Settings() {
  const p = usePerms()
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-gray-900">CRM settings</h1>
      <WhatsAppNumbers canEdit={p.settings} />
      {p.settings && <Templates />}
      {p.growth && <GrowthExports />}
      <section className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
        <h2 className="mb-2 font-semibold text-gray-900">More settings</h2>
        <ul className="list-inside list-disc space-y-1 text-blue-700">
          <li><Link className="hover:underline" href="/admin/crm/automation">Automation — office hours, automatic replies, keyword tags, STOP words</Link></li>
          <li><Link className="hover:underline" href="/admin/crm/reminders">Reminders — rules and team WhatsApp numbers</Link></li>
          <li><Link className="hover:underline" href="/admin/growth/users">Team and roles (user management, admins only)</Link></li>
        </ul>
      </section>
    </div>
  )
}

function WhatsAppNumbers({ canEdit }: { canEdit: boolean }) {
  const [h, setH] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    try { setH(await crmFetch<Health>("/api/crm/settings/whatsapp")) } catch (e) { setError(errorText(e)) }
  }, [])
  useEffect(() => { void load() }, [load])
  if (error) return <ErrorBox onRetry={() => void load()}>{error}</ErrorBox>
  if (!h) return <Spinner />
  return (
    <section className="space-y-2 rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="font-semibold text-gray-900">WhatsApp numbers</h2>
      {h.numbers.length === 0 ? <EmptyBox>No WhatsApp number is connected yet. Once the fogging number is set up (CRM_WA_PHONE_NUMBER_IDS), it appears here.</EmptyBox> : h.numbers.map(n => <NumberRow key={n.phoneNumberId} n={n} canEdit={canEdit} onChanged={() => void load()} />)}
      <p className="text-xs text-gray-500">Work waiting in the queues: {h.queueDepth}.</p>
    </section>
  )
}

function NumberRow({ n, canEdit, onChanged }: { n: NumberHealth; canEdit: boolean; onChanged: () => void }) {
  const [cap, setCap] = useState(String(n.tierCap ?? 250))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function patch(body: Record<string, unknown>) {
    setBusy(true); setError(null)
    try { await crmFetch("/api/crm/settings/numbers", { method: "PATCH", body: JSON.stringify({ phoneNumberId: n.phoneNumberId, ...body }) }); onChanged() } catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }
  return (
    <div className="space-y-1 rounded-md border border-gray-100 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-gray-900">{n.displayPhone ?? n.phoneNumberId}</span>
        {n.sendingPaused ? <Badge tone="red">Sending paused ({n.sendingPaused.reason})</Badge> : <Badge tone="green">Sending OK</Badge>}
      </div>
      <div className="text-gray-600">Last message in: {fullTime(n.lastInboundAt) || "—"} · last sent: {fullTime(n.lastSendAt) || "—"} · webhook: {fullTime(n.lastWebhookAt) || "—"}</div>
      {n.lastSendError && <div className="text-amber-800">Last send error: {String(n.lastSendError.code)} at {fullTime(n.lastSendError.at)}</div>}
      <div className="text-gray-600">Business-initiated chats in the last 24 h: {n.tierUsed24h ?? 0} of {n.tierCap ?? "?"}</div>
      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2"><span>Daily limit (from WhatsApp Manager)</span>
            <input className={`${inputCls} max-w-[120px]`} type="number" min={1} value={cap} onChange={e => setCap(e.target.value)} /></label>
          <button type="button" className={btnSecondary} disabled={busy || Number(cap) === n.tierCap} onClick={() => void patch({ tierCap: Number(cap) })}>Save limit</button>
          {n.sendingPaused && <button type="button" className={btnPrimary} disabled={busy} onClick={() => { if (window.confirm("Resume sending? Check WhatsApp Manager first: the number was paused because Meta reported a spam or policy problem.")) void patch({ resume: true }) }}>Resume sending</button>}
        </div>
      )}
      {error && <ErrorBox>{error}</ErrorBox>}
    </div>
  )
}

function Templates() {
  const [items, setItems] = useState<{ name: string; language: string; category: string; syncedAt: string | null }[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    try { setItems((await crmFetch<{ items: { name: string; language: string; category: string; syncedAt: string | null }[] }>("/api/crm/templates")).items) } catch (e) { setError(errorText(e)) }
  }, [])
  useEffect(() => { void load() }, [load])
  async function sync() {
    setBusy(true); setError(null); setResult(null)
    try {
      const r = await crmFetch<{ fetched: number; disabled: number }>("/api/crm/templates/sync", { method: "POST" })
      setResult(`Synced ${r.fetched} template${r.fetched === 1 ? "" : "s"} from Meta${r.disabled ? `; ${r.disabled} no longer exist and were switched off` : ""}.`)
      await load()
    } catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }
  return (
    <section className="space-y-2 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-gray-900">WhatsApp templates (approved)</h2>
        <button type="button" className={btnSecondary} disabled={busy} onClick={() => void sync()}>{busy ? "Syncing..." : "Sync from Meta"}</button>
      </div>
      {result && <p className="text-sm text-green-700" role="status">{result}</p>}
      {error && <ErrorBox>{error}</ErrorBox>}
      {!items ? <Spinner /> : items.length === 0 ? <p className="text-sm text-gray-600">No approved templates yet.</p> : (
        <ul className="divide-y divide-gray-100 text-sm">{items.map(t => <li key={`${t.name}|${t.language}`} className="flex justify-between gap-2 py-1"><span>{t.name} <span className="text-gray-500">({t.language}, {t.category.toLowerCase()})</span></span><span className="text-gray-500">{t.syncedAt ? `synced ${fullTime(t.syncedAt)}` : ""}</span></li>)}</ul>
      )}
    </section>
  )
}

/** Download URL for the conversions export. */
export function conversionsUrl(kind: string, from: string, to: string): string {
  const q = new URLSearchParams({ kind })
  if (from) q.set("from", from)
  if (to) q.set("to", to)
  return `/api/crm/growth/conversions.csv?${q.toString()}`
}

function GrowthExports() {
  const [kind, setKind] = useState("all")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [segments, setSegments] = useState<Segment[]>([])
  const [segmentId, setSegmentId] = useState("")
  useEffect(() => { crmFetch<{ items: Segment[] }>("/api/crm/segments").then(r => setSegments(r.items)).catch(() => {}) }, [])
  return (
    <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 text-sm">
      <h2 className="font-semibold text-gray-900">Growth OS exports (Google Ads)</h2>
      <p className="text-gray-600">Only leads that came from an ad click are in the conversions file. Every export is logged.</p>
      <div className="flex flex-wrap items-end gap-2">
        <label><span className="mb-1 block text-gray-700">Conversions</span>
          <select className={inputCls} value={kind} onChange={e => setKind(e.target.value)}><option value="all">All</option><option value="closed_won">Closed-Won (primary)</option><option value="quotation_sent">Quotation sent (secondary)</option></select></label>
        <label><span className="mb-1 block text-gray-700">From</span><input type="date" className={inputCls} value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label><span className="mb-1 block text-gray-700">To (not included)</span><input type="date" className={inputCls} value={to} onChange={e => setTo(e.target.value)} /></label>
        <a className={btnPrimary} href={conversionsUrl(kind, from, to)}>Download conversions CSV</a>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label><span className="mb-1 block text-gray-700">Customer Match audience (segment)</span>
          <select className={inputCls} value={segmentId} onChange={e => setSegmentId(e.target.value)}><option value="">Pick a segment</option>{segments.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        {segmentId ? <a className={btnSecondary} href={`/api/crm/growth/customer-match.csv?segmentId=${segmentId}`}>Download Customer Match CSV</a> : <span className="text-gray-500">Pick a segment to download (phones are hashed; opted-out numbers are left out).</span>}
      </div>
    </section>
  )
}
