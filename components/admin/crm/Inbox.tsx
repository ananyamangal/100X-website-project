"use client"
// WhatsApp inbox (STEP 9 UI on the step-5 inbox API): conversation list + thread, polling every 30 s
// while the tab is visible (If-None-Match → a cheap 304 when nothing changed), free-form replies inside
// the 24-hour window, approved templates outside it, attachments, assign / resolve / reopen.
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/rbac/client"
import { ApiError, crmFetch, errorText, rotateKeyAfter, sentMessageFailed, UiError } from "./api"
import { fullTime, prettyPhone } from "./format"
import { useTeam } from "./useTeam"
import { Badge, Chip, EmptyBox, ErrorBox, Spinner, btnPrimary, btnSecondary, inputCls } from "./ui"

interface ContactLite { id: string; name: string | null; waProfileName: string | null; company: string | null; phoneE164: string; marketingOptOut: unknown; notOnWhatsApp: unknown }
interface Conv {
  id: string; contactId: string; status: "open" | "resolved"; hasUnread: boolean; unreadCount: number; lastMessageAt: string; lastMessagePreview: string
  assignedTo: { userId: string; name: string } | null; window: { open: boolean; openUntil: string | null; freeFormUntil: string | null }; contact: ContactLite | null; optedOut?: boolean
}
interface Msg {
  id: string; direction: "in" | "out"; type: string; text: string | null; status: string; createdAt: string
  media?: { mime?: string; filename?: string | null; caption?: string | null; url?: string | null } | null
  template?: { name: string; params: string[] } | null
  interactive?: { title?: string } | null
  error?: { code?: number; title?: string } | null
  author?: { kind: string; user?: { name: string } } | null
}
interface Template { name: string; language: string; bodyText: string; bodyParamCount: number; headerType: string }

const POLL_MS = 30_000
const TICKS: Record<string, string> = { queued: "🕓", sent: "✓", delivered: "✓✓", read: "✓✓ read", failed: "failed" }

/** Fetch with an ETag: returns null on 304 (unchanged). */
async function pollJson<T>(url: string, etagRef: { current: string | null }): Promise<T | null> {
  const res = await fetch(url, { cache: "no-store", credentials: "same-origin", headers: etagRef.current ? { "If-None-Match": etagRef.current } : {} })
  if (res.status === 304) return null
  if (res.status === 401) { window.location.href = "/admin/login?reason=session_expired"; throw new ApiError(401, "unauthorized") }
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, (body as { error?: string } | null)?.error ?? "request_failed")
  etagRef.current = res.headers.get("ETag")
  return body as T
}

const nameOf = (c: ContactLite | null) => (c ? c.name || c.company || c.waProfileName || prettyPhone(c.phoneE164) : "Unknown")

/** Fills {{n}} in a template body for the preview. */
export function fillTemplate(body: string, params: string[]): string {
  return body.replace(/\{\{\s*(\d+)\s*\}\}/g, (m, n) => params[Number(n) - 1] || m)
}

function useVisiblePoll(fn: () => void, ms: number) {
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") fn() }, ms)
    const onVis = () => { if (document.visibilityState === "visible") fn() }
    document.addEventListener("visibilitychange", onVis)
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis) }
  }, [fn, ms])
}

export function Inbox() {
  const [status, setStatus] = useState<"open" | "resolved">("open")
  const [filter, setFilter] = useState<"all" | "me" | "unassigned" | "unread">("all")
  const [items, setItems] = useState<Conv[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const etag = useRef<string | null>(null)
  const query = `?status=${status}${filter === "me" ? "&assignee=me" : filter === "unassigned" ? "&assignee=unassigned" : filter === "unread" ? "&unread=1" : ""}`

  const load = useCallback(async (fresh = false) => {
    try {
      if (fresh) etag.current = null
      const r = await pollJson<{ items: Conv[] }>(`/api/crm/inbox/conversations${query}`, etag)
      if (r) setItems(r.items)
      setError(null)
    } catch (e) {
      setError(errorText(e))
    }
  }, [query])
  useEffect(() => { setItems(null); void load(true) }, [load])
  const poll = useCallback(() => { void load() }, [load])
  useVisiblePoll(poll, POLL_MS)

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold text-gray-900">Inbox</h1>
      <div className="grid gap-3 lg:grid-cols-[360px_1fr]">
        <section className={`space-y-2 ${openId ? "hidden lg:block" : ""}`}>
          <div className="flex flex-wrap gap-2">
            <Chip selected={status === "open"} onClick={() => setStatus("open")}>Open</Chip>
            <Chip selected={status === "resolved"} onClick={() => setStatus("resolved")}>Resolved</Chip>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "unread", "me", "unassigned"] as const).map(f => (
              <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>{f === "all" ? "All" : f === "me" ? "Mine" : f === "unread" ? "Unread" : "Unassigned"}</Chip>
            ))}
          </div>
          {error && <ErrorBox onRetry={() => void load(true)}>{error}</ErrorBox>}
          {!items ? <Spinner /> : items.length === 0 ? <EmptyBox>No conversations here.</EmptyBox> : (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
              {items.map(c => (
                <li key={c.id}>
                  <button type="button" onClick={() => setOpenId(c.id)} className={`flex w-full gap-2 p-3 text-left hover:bg-gray-50 ${openId === c.id ? "bg-blue-50" : ""}`}>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate ${c.hasUnread ? "font-semibold text-gray-900" : "text-gray-800"}`}>{nameOf(c.contact)}</span>
                      <span className="block truncate text-sm text-gray-600">{c.lastMessagePreview}</span>
                      <span className="block text-xs text-gray-500">{fullTime(c.lastMessageAt)}{c.assignedTo ? ` · ${c.assignedTo.name}` : ""}</span>
                    </span>
                    {c.hasUnread && <Badge tone="green">{c.unreadCount || "new"}</Badge>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className={openId ? "" : "hidden lg:block"}>
          {openId ? <Thread key={openId} id={openId} onBack={() => setOpenId(null)} onChanged={() => void load(true)} /> : <EmptyBox>Pick a conversation.</EmptyBox>}
        </section>
      </div>
    </div>
  )
}

function Thread({ id, onBack, onChanged }: { id: string; onBack: () => void; onChanged: () => void }) {
  const { user, permissions } = useAuth()
  const has = (k: string) => user?.role === "super_admin" || (permissions as string[]).includes(k)
  const canReply = has("crm.inbox.reply")
  const canAssign = has("crm.leads.assign")
  const team = useTeam()
  const [conv, setConv] = useState<Conv | null>(null)
  const [msgs, setMsgs] = useState<Msg[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState("")
  const [key, setKey] = useState(() => newKey("r"))
  const [busy, setBusy] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [picker, setPicker] = useState(false)
  const etag = useRef<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async (markRead = false) => {
    try {
      const r = await pollJson<{ conversation: Conv; messages: Msg[] }>(`/api/crm/inbox/conversations/${id}/messages?limit=50${markRead ? "&markRead=1" : ""}`, etag)
      if (r) { setConv(r.conversation); setMsgs([...r.messages].reverse()) }
      setError(null)
    } catch (e) { setError(errorText(e)) }
  }, [id])
  useEffect(() => { void load(true).then(() => onChanged()) }, [load]) // eslint-disable-line react-hooks/exhaustive-deps
  const poll = useCallback(() => { void load() }, [load])
  useVisiblePoll(poll, POLL_MS)

  async function act(name: string, fn: () => Promise<unknown>) {
    setBusy(name); setSendError(null)
    try { await fn(); etag.current = null; await load(); onChanged() } catch (e) { setSendError(errorText(e)) } finally { setBusy(null) }
  }
  const send = () => act("send", async () => {
    let r: unknown
    try {
      r = await crmFetch(`/api/crm/inbox/conversations/${id}/reply`, { method: "POST", body: JSON.stringify({ text, idempotencyKey: key }) })
    } catch (e) {
      if (rotateKeyAfter(e)) setKey(newKey("r"))
      throw e
    }
    setKey(newKey("r"))
    // A dedupe to an earlier failed attempt: keep the text so the user can send it again (new key).
    if (sentMessageFailed(r)) throw new UiError("That message did not go through. Check the thread, then press Send again.")
    setText("")
  })
  const attach = (file: File) => act("media", async () => {
    const fd = new FormData()
    fd.set("file", file); fd.set("idempotencyKey", newKey("m"))
    if (text.trim()) fd.set("caption", text.trim())
    const r = await crmFetch(`/api/crm/inbox/conversations/${id}/media`, { method: "POST", body: fd })
    if (sentMessageFailed(r)) throw new UiError("That file did not go through. Check the thread, then try again.")
    setText("")
  })

  if (error && !conv) return <ErrorBox onRetry={() => void load()}>{error}</ErrorBox>
  if (!conv || !msgs) return <Spinner />
  const c = conv.contact
  const open = conv.window.open
  return (
    <div className="flex min-h-[60vh] flex-col rounded-lg border border-gray-200 bg-white">
      <header className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-3">
        <button type="button" className="text-sm text-blue-700 lg:hidden" onClick={onBack}>&larr;</button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-gray-900">{nameOf(c)}</div>
          <div className="text-sm text-gray-600">{c ? prettyPhone(c.phoneE164) : ""}{c ? <> · <Link className="text-blue-700 hover:underline" href={`/admin/crm/leads/${c.id}`}>Open lead</Link></> : null}</div>
        </div>
        {canAssign && team.length > 0 && (
          <select className={`${inputCls} max-w-[180px]`} aria-label="Assign" value={conv.assignedTo?.userId ?? ""} disabled={!!busy}
            onChange={e => void act("assign", () => crmFetch(`/api/crm/inbox/conversations/${id}/assign`, { method: "POST", body: JSON.stringify({ assignedTo: e.target.value || null }) }))}>
            <option value="">Unassigned</option>{team.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}
        {canReply && (conv.status === "open"
          ? <button type="button" className={btnSecondary} disabled={!!busy} onClick={() => void act("resolve", () => crmFetch(`/api/crm/inbox/conversations/${id}/resolve`, { method: "POST" }))}>Resolve</button>
          : <button type="button" className={btnSecondary} disabled={!!busy} onClick={() => void act("reopen", () => crmFetch(`/api/crm/inbox/conversations/${id}/reopen`, { method: "POST" }))}>Reopen</button>)}
      </header>
      {conv.optedOut && <div className="bg-amber-50 p-2 text-sm text-amber-900">This customer opted out of promotional messages. You can still reply while they are writing to you.</div>}
      <ol className="flex-1 space-y-2 overflow-y-auto p-3">
        {msgs.length === 0 && <li className="text-sm text-gray-500">No messages yet.</li>}
        {msgs.map(m => (
          <li key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.direction === "out" ? "bg-green-50 text-gray-900" : "bg-gray-100 text-gray-900"}`}>
              {m.template ? <div className="italic text-gray-700">Template: {m.template.name}{m.template.params?.length ? ` (${m.template.params.join(", ")})` : ""}</div> : null}
              {m.text && <div className="whitespace-pre-wrap break-words">{m.text}</div>}
              {m.interactive?.title && !m.text && <div>{m.interactive.title}</div>}
              {m.media && (
                <div>{m.media.url ? <a className="text-blue-700 underline" href={m.media.url} target="_blank" rel="noopener noreferrer">{m.media.filename || m.type}</a> : <span className="text-gray-600">{m.type}</span>}
                  {m.media.caption && <div className="whitespace-pre-wrap">{m.media.caption}</div>}</div>
              )}
              {!m.text && !m.media && !m.template && !m.interactive && <div className="text-gray-500">[{m.type}]</div>}
              <div className="mt-1 text-right text-[11px] text-gray-500">
                {m.direction === "out" && m.author?.kind === "user" && m.author.user ? `${m.author.user.name} · ` : m.direction === "out" && m.author?.kind ? `${m.author.kind} · ` : ""}
                {fullTime(m.createdAt)} {m.direction === "out" ? TICKS[m.status] ?? m.status : ""}
                {m.status === "failed" && m.error?.title ? ` — ${m.error.title}` : ""}
              </div>
            </div>
          </li>
        ))}
      </ol>
      {canReply && (
        <footer className="space-y-2 border-t border-gray-100 p-3">
          {sendError && <ErrorBox>{sendError}</ErrorBox>}
          {open ? (
            <>
              <textarea className={`${inputCls} min-h-[72px] py-2`} placeholder="Type a reply…" value={text} maxLength={4096} onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && text.trim()) { e.preventDefault(); void send() } }} />
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className={btnPrimary} disabled={!!busy || !text.trim()} onClick={() => void send()}>{busy === "send" ? "Sending..." : "Send"}</button>
                <button type="button" className={btnSecondary} disabled={!!busy} onClick={() => fileRef.current?.click()}>{busy === "media" ? "Uploading..." : "Attach file"}</button>
                <input ref={fileRef} type="file" className="hidden" accept="image/jpeg,image/png,application/pdf,.doc,.docx,.xls,.xlsx,audio/*" onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void attach(f) }} />
                <button type="button" className={btnSecondary} onClick={() => setPicker(true)}>Template</button>
                {conv.window.freeFormUntil && <span className="text-xs text-gray-500">Free replies until {fullTime(conv.window.freeFormUntil)}</span>}
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
              <span>The 24-hour window is closed. Only an approved template can be sent until the customer writes again.</span>
              <button type="button" className={btnPrimary} onClick={() => setPicker(true)}>Send a template</button>
            </div>
          )}
          {picker && <TemplatePicker conversationId={id} onClose={() => setPicker(false)} onSent={() => { setPicker(false); etag.current = null; void load(); onChanged() }} />}
        </footer>
      )}
    </div>
  )
}

function newKey(prefix: string): string {
  const r = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${r}`.replace(/[^\w:.\-]/g, "").slice(0, 100)
}

function TemplatePicker({ conversationId, onClose, onSent }: { conversationId: string; onClose: () => void; onSent: () => void }) {
  const [templates, setTemplates] = useState<Template[] | null>(null)
  const [pick, setPick] = useState<Template | null>(null)
  const [params, setParams] = useState<string[]>([])
  const [key, setKey] = useState(() => newKey("t"))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    crmFetch<{ items: Template[] }>("/api/crm/templates").then(r => setTemplates(r.items.filter(t => t.headerType === "NONE" || t.headerType === "TEXT"))).catch(e => setError(errorText(e)))
  }, [])
  async function send() {
    if (!pick) return
    setBusy(true); setError(null)
    try {
      const r = await crmFetch(`/api/crm/inbox/conversations/${conversationId}/template`, { method: "POST", body: JSON.stringify({ name: pick.name, language: pick.language, params, idempotencyKey: key }) })
      if (sentMessageFailed(r)) { setKey(newKey("t")); setError("That template did not go through. Check the thread, then press Send again."); return }
      onSent()
    } catch (e) {
      if (rotateKeyAfter(e)) setKey(newKey("t"))
      setError(errorText(e))
    } finally { setBusy(false) }
  }
  return (
    <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center justify-between"><span className="font-semibold text-gray-900">Send an approved template</span><button type="button" className="text-sm text-gray-600" onClick={onClose}>Close</button></div>
      {!templates ? (error ? <ErrorBox>{error}</ErrorBox> : <Spinner />) : templates.length === 0 ? <p className="text-sm text-gray-600">No approved templates yet (sync them under Templates once the WhatsApp number is connected).</p> : (
        <>
          <select className={inputCls} value={pick ? `${pick.name}|${pick.language}` : ""} onChange={e => { const t = templates.find(x => `${x.name}|${x.language}` === e.target.value) ?? null; setPick(t); setParams(Array.from({ length: t?.bodyParamCount ?? 0 }, () => "")) }}>
            <option value="">Pick a template</option>{templates.map(t => <option key={`${t.name}|${t.language}`} value={`${t.name}|${t.language}`}>{t.name} ({t.language})</option>)}
          </select>
          {pick && (
            <>
              {params.map((p, i) => <input key={i} className={inputCls} placeholder={`Value for {{${i + 1}}}`} value={p} maxLength={200} onChange={e => setParams(params.map((x, j) => (j === i ? e.target.value : x)))} />)}
              <p className="whitespace-pre-wrap rounded-md bg-white p-2 text-sm text-gray-800">{fillTemplate(pick.bodyText, params)}</p>
              {error && <ErrorBox>{error}</ErrorBox>}
              <button type="button" className={btnPrimary} disabled={busy || params.some(p => !p.trim())} onClick={() => void send()}>{busy ? "Sending..." : "Send template"}</button>
            </>
          )}
        </>
      )}
    </div>
  )
}
