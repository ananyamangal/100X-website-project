"use client"
import { useCallback, useEffect, useState } from "react"
import { ApiError, crmFetch, errorText } from "./api"
import { fullTime } from "./format"
import { EmptyBox, ErrorBox, Spinner, btnPrimary, btnSecondary, inputCls } from "./ui"

interface Note {
  id: string
  author: { name: string }
  at: string
  text: string
}
interface Page {
  items: Note[]
  nextBefore: string | null
}

export function NotesPanel({ contactId, dealId }: { contactId: string; dealId: string | null }) {
  const base = `/api/crm/contacts/${encodeURIComponent(contactId)}/notes`
  const [notes, setNotes] = useState<Note[] | null>(null)
  const [next, setNext] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)
  const [text, setText] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const p = await crmFetch<Page>(base)
      setNotes(p.items); setNext(p.nextBefore)
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setDenied(true)
      else setError(errorText(e))
    }
  }, [base])
  useEffect(() => { void load() }, [load])

  async function more() {
    if (!next) return
    try {
      const p = await crmFetch<Page>(`${base}?before=${encodeURIComponent(next)}`)
      setNotes(n => [...(n ?? []), ...p.items]); setNext(p.nextBefore)
    } catch (e) {
      setError(errorText(e))
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || saving) return
    setSaving(true); setSaveError(null)
    try {
      await crmFetch(base, { method: "POST", body: JSON.stringify({ text: text.trim(), ...(dealId ? { dealId } : {}) }) })
      setText("")
      await load()
    } catch (err) {
      setSaveError(err instanceof ApiError && err.status === 403 ? "You can read notes but not add them." : errorText(err))
    } finally {
      setSaving(false)
    }
  }

  if (denied) return <EmptyBox>You do not have access to internal notes.</EmptyBox>

  return (
    <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-3">
      <p className="text-sm font-medium text-amber-900">Internal notes — only the team sees these. Never sent to the customer.</p>
      <form onSubmit={add} className="space-y-2">
        <textarea className={`${inputCls} min-h-[84px] bg-white`} rows={3} value={text} onChange={e => setText(e.target.value)} placeholder="Add an internal note..." aria-label="New internal note" maxLength={4000} />
        {saveError && <p className="text-sm text-red-700" role="alert">{saveError}</p>}
        <button type="submit" className={btnPrimary} disabled={saving || !text.trim()}>{saving ? "Saving..." : "Add note"}</button>
      </form>
      {error && <ErrorBox onRetry={() => void load()}>{error}</ErrorBox>}
      {!notes && !error && <Spinner />}
      {notes && notes.length === 0 && <p className="text-sm text-amber-900/70">No notes yet.</p>}
      <ul className="space-y-2">
        {notes?.map(n => (
          <li key={n.id} className="rounded-lg border border-amber-200 bg-white p-3">
            <p className="whitespace-pre-wrap break-words text-sm">{n.text}</p>
            <p className="mt-1 text-xs text-gray-500">{n.author.name || "Team"} · {fullTime(n.at)}</p>
          </li>
        ))}
      </ul>
      {next && <button type="button" className={btnSecondary} onClick={() => void more()}>Load older notes</button>}
    </div>
  )
}
