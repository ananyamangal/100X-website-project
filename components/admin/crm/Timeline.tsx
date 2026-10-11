"use client"
import { useState } from "react"
import { crmFetch, errorText } from "./api"
import { fullTime } from "./format"
import { EmptyBox, ErrorBox, btnSecondary } from "./ui"

interface Media {
  mime?: string | null
  filename?: string | null
  caption?: string | null
  url?: string | null
  storage?: string | null
}
interface Activity {
  id: string
  kind: string
  summary?: string
  by?: { name?: string } | { system?: string } | null
}
interface Message {
  id: string
  direction: "in" | "out"
  type: string
  text?: string | null
  media?: Media | null
  template?: { name: string } | null
  interactive?: { title: string } | null
  location?: { name?: string; address?: string } | null
  status?: string | null
  author?: { kind: string; user?: { name: string } } | null
}
export interface TimelineItem {
  type: "activity" | "message"
  at: string
  item: Activity | Message
}
interface Page {
  items: TimelineItem[]
  nextBefore: string | null
}

const byName = (by: Activity["by"]) => (by && "name" in by && by.name ? by.name : "")

function MediaView({ m, type }: { m: Media; type: string }) {
  const mime = m.mime ?? ""
  if (!m.url || !m.url.startsWith("https:") || (m.storage && m.storage !== "stored")) return <p className="text-xs italic text-gray-500">{m.filename || type} (file not available yet)</p>
  if (mime.startsWith("image/"))
    return (
      <a href={m.url} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={m.url} alt={m.caption || m.filename || "Photo"} loading="lazy" className="max-h-48 max-w-full rounded-lg border border-gray-200" />
      </a>
    )
  if (mime.startsWith("audio/")) return <audio controls preload="none" src={m.url} className="w-full max-w-xs" />
  return (
    <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-700 underline">
      {m.filename || (mime.startsWith("video/") ? "Open video" : "Open document")}
    </a>
  )
}

function MessageRow({ m }: { m: Message }) {
  const out = m.direction === "out"
  const who = out ? (m.author?.kind === "user" && m.author.user?.name ? m.author.user.name : "Us") : "Customer"
  return (
    <div className={`flex ${out ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] space-y-1 rounded-2xl px-3 py-2 text-sm ${out ? "bg-green-100" : "bg-white border border-gray-200"}`}>
        <p className="text-xs font-medium text-gray-500">WhatsApp · {who}</p>
        {m.media && <MediaView m={m.media} type={m.type} />}
        {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
        {m.media?.caption && !m.text && <p className="whitespace-pre-wrap break-words">{m.media.caption}</p>}
        {m.template && <p className="italic text-gray-600">Template: {m.template.name}</p>}
        {m.interactive && <p className="italic text-gray-600">Tapped: {m.interactive.title}</p>}
        {m.location && <p className="text-gray-600">Location: {m.location.name || m.location.address || "shared"}</p>}
        {!m.text && !m.media && !m.template && !m.interactive && !m.location && <p className="italic text-gray-500">({m.type} message)</p>}
        {out && m.status && <p className="text-right text-[11px] text-gray-500">{m.status}</p>}
      </div>
    </div>
  )
}

function ActivityRow({ a }: { a: Activity }) {
  const who = byName(a.by)
  return (
    <div className="flex justify-center">
      <p className="rounded-full bg-gray-100 px-3 py-1 text-center text-xs text-gray-700">
        {a.summary || a.kind.replace(/_/g, " ")}
        {who ? ` · ${who}` : ""}
      </p>
    </div>
  )
}

export function Timeline({ contactId, initial }: { contactId: string; initial: Page }) {
  const [items, setItems] = useState(initial.items)
  const [next, setNext] = useState(initial.nextBefore)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function more() {
    if (!next || busy) return
    setBusy(true); setError(null)
    try {
      const p = await crmFetch<Page>(`/api/crm/contacts/${encodeURIComponent(contactId)}/timeline?limit=30&before=${encodeURIComponent(next)}`)
      setItems(prev => {
        const seen = new Set(prev.map(i => `${i.type}:${(i.item as { id: string }).id}`))
        return [...prev, ...p.items.filter(i => !seen.has(`${i.type}:${(i.item as { id: string }).id}`))]
      })
      setNext(p.nextBefore)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  if (items.length === 0) return <EmptyBox>Nothing here yet.</EmptyBox>
  return (
    <div className="space-y-2">
      {items.map(i => (
        <div key={`${i.type}:${(i.item as { id: string }).id}`} className="space-y-0.5">
          <p className="text-center text-[11px] text-gray-400">{fullTime(i.at)}</p>
          {i.type === "message" ? <MessageRow m={i.item as Message} /> : <ActivityRow a={i.item as Activity} />}
        </div>
      ))}
      {error && <ErrorBox onRetry={() => void more()}>{error}</ErrorBox>}
      {next && (
        <div className="text-center">
          <button type="button" className={btnSecondary} disabled={busy} onClick={() => void more()}>{busy ? "Loading..." : "Load older"}</button>
        </div>
      )}
    </div>
  )
}
