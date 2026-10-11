"use client"
// Tasks (STEP 7): the "Tasks" page (mine / everyone's, grouped overdue → today → upcoming) and the
// per-lead TaskPanel on the lead detail. Completing your own task needs no extra permission.
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/rbac/client"
import { crmFetch, errorText } from "./api"
import { fullTime, prettyPhone } from "./format"
import { useTeam } from "./useTeam"
import { Badge, Chip, EmptyBox, ErrorBox, Spinner, btnPrimary, btnSecondary, inputCls } from "./ui"

export interface TaskView {
  id: string
  title: string
  dueAt: string
  status: "open" | "done" | "cancelled"
  bucket: "overdue" | "today" | "upcoming" | "done"
  assignedTo: { userId: string; name: string }
  contact: { id: string; name: string; phoneE164: string | null } | null
  origin: { kind: "manual" | "rule" }
}

const BUCKETS = [
  { id: "overdue", label: "Overdue", tone: "red" },
  { id: "today", label: "Today", tone: "amber" },
  { id: "upcoming", label: "Upcoming", tone: "gray" },
] as const

/** "2026-10-11T05:30" (datetime-local, IST shown by the browser) -> ISO; null when empty/invalid. */
export function localInputToIso(v: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function usePerms() {
  const { user, permissions } = useAuth()
  const has = (k: string) => user?.role === "super_admin" || (permissions as string[]).includes(k)
  return { me: user?.id ?? null, canManage: has("crm.tasks.manage"), canAssign: has("crm.leads.assign"), viewAll: has("crm.leads.view_all") }
}

function TaskRow({ t, me, canManage, onChanged, showContact }: { t: TaskView; me: string | null; canManage: boolean; onChanged: () => void; showContact: boolean }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mine = me === t.assignedTo.userId
  async function setStatus(status: "done" | "open" | "cancelled") {
    setBusy(true); setError(null)
    try {
      await crmFetch(`/api/crm/tasks/${t.id}`, { method: "PATCH", body: JSON.stringify({ status }) })
      onChanged()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <li className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <div className={`font-medium ${t.status === "open" ? "text-gray-900" : "text-gray-500 line-through"}`}>{t.title}</div>
        <div className="text-xs text-gray-500">
          Due {fullTime(t.dueAt)} · {t.assignedTo.name}
          {t.origin.kind === "rule" && " · from a reminder rule"}
        </div>
        {showContact && t.contact && (
          <Link href={`/admin/crm/leads/${t.contact.id}`} className="text-sm text-blue-700 hover:underline">
            {t.contact.name}{t.contact.phoneE164 ? ` · ${prettyPhone(t.contact.phoneE164)}` : ""}
          </Link>
        )}
        {error && <div className="mt-1 text-xs text-red-700">{error}</div>}
      </div>
      <div className="flex gap-2">
        {t.status === "open" && (mine || canManage) && (
          <button type="button" className={btnSecondary} disabled={busy} onClick={() => void setStatus("done")}>Done</button>
        )}
        {t.status !== "open" && (mine || canManage) && (
          <button type="button" className={btnSecondary} disabled={busy} onClick={() => void setStatus("open")}>Reopen</button>
        )}
      </div>
    </li>
  )
}

function NewTaskForm({ contactId, dealId, onCreated }: { contactId?: string; dealId?: string | null; onCreated: () => void }) {
  const { canAssign, me } = usePerms()
  const team = useTeam()
  const [title, setTitle] = useState("")
  const [due, setDue] = useState("")
  const [assignee, setAssignee] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  async function submit() {
    const dueAt = localInputToIso(due)
    if (!title.trim()) return setError("Enter what needs to be done.")
    if (!dueAt) return setError("Pick a due date and time.")
    setSaving(true); setError(null)
    try {
      await crmFetch("/api/crm/tasks", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), dueAt, ...(assignee && assignee !== me ? { assignedTo: assignee } : {}), ...(contactId ? { contactId } : {}), ...(dealId ? { dealId } : {}) }),
      })
      setTitle(""); setDue(""); setAssignee("")
      onCreated()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setSaving(false)
    }
  }
  return (
    <form className="grid gap-2 rounded-lg border border-gray-200 bg-white p-3 sm:grid-cols-[1fr_auto_auto_auto]" onSubmit={e => { e.preventDefault(); void submit() }}>
      <input className={inputCls} placeholder="New task, e.g. Call back about the demo" value={title} maxLength={200} onChange={e => setTitle(e.target.value)} aria-label="Task" />
      <input className={inputCls} type="datetime-local" value={due} onChange={e => setDue(e.target.value)} aria-label="Due" />
      {canAssign && team.length > 0 ? (
        <select className={inputCls} value={assignee} onChange={e => setAssignee(e.target.value)} aria-label="Assign to">
          <option value="">Me</option>
          {team.filter(u => u.id !== me).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      ) : <span className="hidden sm:block" />}
      <button type="submit" className={btnPrimary} disabled={saving}>{saving ? "Adding..." : "Add task"}</button>
      {error && <div className="text-sm text-red-700 sm:col-span-4">{error}</div>}
    </form>
  )
}

function useTasks(query: string) {
  const [items, setItems] = useState<TaskView[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    setError(null)
    try {
      setItems((await crmFetch<{ items: TaskView[] }>(`/api/crm/tasks${query}`)).items)
    } catch (e) {
      setError(errorText(e))
    }
  }, [query])
  useEffect(() => { void load() }, [load])
  return { items, error, load }
}

/** The Tasks page. */
export function TasksPage() {
  const { me, canManage, viewAll } = usePerms()
  const [view, setView] = useState<"mine" | "all">("mine")
  const [status, setStatus] = useState<"open" | "done">("open")
  const { items, error, load } = useTasks(`?view=${view}&status=${status}`)
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Tasks</h1>
      <div className="flex flex-wrap gap-2">
        <Chip selected={view === "mine"} onClick={() => setView("mine")}>Mine</Chip>
        {viewAll && <Chip selected={view === "all"} onClick={() => setView("all")}>Everyone</Chip>}
        <Chip selected={status === "open"} onClick={() => setStatus("open")}>Open</Chip>
        <Chip selected={status === "done"} onClick={() => setStatus("done")}>Done</Chip>
      </div>
      {canManage && <NewTaskForm onCreated={() => void load()} />}
      {error ? <ErrorBox onRetry={() => void load()}>{error}</ErrorBox> : !items ? <Spinner /> : items.length === 0 ? (
        <EmptyBox>{status === "open" ? "Nothing to do. New tasks and reminder-rule tasks appear here." : "No completed tasks yet."}</EmptyBox>
      ) : status === "done" ? (
        <ul className="rounded-lg border border-gray-200 bg-white px-4">{items.map(t => <TaskRow key={t.id} t={t} me={me} canManage={canManage} onChanged={() => void load()} showContact />)}</ul>
      ) : (
        BUCKETS.map(b => {
          const rows = items.filter(t => t.bucket === b.id)
          if (!rows.length) return null
          return (
            <section key={b.id} className="space-y-1">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700">{b.label} <Badge tone={b.tone}>{rows.length}</Badge></h2>
              <ul className="rounded-lg border border-gray-200 bg-white px-4">{rows.map(t => <TaskRow key={t.id} t={t} me={me} canManage={canManage} onChanged={() => void load()} showContact />)}</ul>
            </section>
          )
        })
      )}
    </div>
  )
}

/** Lead detail tab: this customer's tasks. */
export function TaskPanel({ contactId, dealId }: { contactId: string; dealId: string | null }) {
  const { me, canManage } = usePerms()
  const [status, setStatus] = useState<"open" | "done">("open")
  const { items, error, load } = useTasks(`?contactId=${encodeURIComponent(contactId)}&status=${status}`)
  return (
    <div className="space-y-3">
      {canManage && <NewTaskForm contactId={contactId} dealId={dealId} onCreated={() => void load()} />}
      <div className="flex gap-2">
        <Chip selected={status === "open"} onClick={() => setStatus("open")}>Open</Chip>
        <Chip selected={status === "done"} onClick={() => setStatus("done")}>Done</Chip>
      </div>
      {error ? <ErrorBox onRetry={() => void load()}>{error}</ErrorBox> : !items ? <Spinner /> : items.length === 0 ? (
        <EmptyBox>{status === "open" ? "No open tasks for this customer." : "No completed tasks."}</EmptyBox>
      ) : (
        <ul className="rounded-lg border border-gray-200 bg-white px-4">{items.map(t => <TaskRow key={t.id} t={t} me={me} canManage={canManage} onChanged={() => void load()} showContact={false} />)}</ul>
      )}
    </div>
  )
}

/** "2026-10-15T04:30:00.000Z" -> "2026-10-15" in IST, for a date input. */
export function isoToIstDateInput(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "" : new Date(d.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10)
}

/** Lead detail: opt-in customer reminders on the deal + the contact's service / AMC due date. */
export function CustomerReminders({ dealId, initial, amcDueAt, onChanged }: { dealId: string; initial: { quoteFollowUp: boolean; serviceAmc: boolean }; amcDueAt: string | null; onChanged: () => void }) {
  const { user, permissions } = useAuth()
  const canEdit = user?.role === "super_admin" || (permissions as string[]).includes("crm.leads.edit")
  const [state, setState] = useState(initial)
  const [amc, setAmc] = useState(isoToIstDateInput(amcDueAt))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function save(patch: Record<string, unknown>) {
    setBusy(true); setError(null)
    try {
      const r = await crmFetch<{ customerReminders: { quoteFollowUp: boolean; serviceAmc: boolean }; amcDueAt: string | null }>(`/api/crm/deals/${dealId}/reminders`, { method: "PATCH", body: JSON.stringify(patch) })
      setState(r.customerReminders); setAmc(isoToIstDateInput(r.amcDueAt))
      onChanged()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-3 text-sm">
      <div className="font-semibold text-gray-900">Customer reminders <span className="font-normal text-gray-500">(sent only if the customer agreed)</span></div>
      <label className="flex min-h-[40px] items-center gap-2">
        <input type="checkbox" className="h-5 w-5" checked={state.quoteFollowUp} disabled={!canEdit || busy} onChange={e => void save({ quoteFollowUp: e.target.checked })} />
        WhatsApp follow-up after a quotation
      </label>
      <label className="flex min-h-[40px] items-center gap-2">
        <input type="checkbox" className="h-5 w-5" checked={state.serviceAmc} disabled={!canEdit || busy} onChange={e => void save({ serviceAmc: e.target.checked })} />
        WhatsApp service / AMC reminder
      </label>
      <label className="flex flex-wrap items-center gap-2">
        <span className="text-gray-700">Service / AMC due on</span>
        <input type="date" className={`${inputCls} max-w-[200px]`} value={amc} disabled={!canEdit || busy} onChange={e => setAmc(e.target.value)} onBlur={() => { if (amc !== isoToIstDateInput(amcDueAt)) void save({ amcDueAt: amc || null }) }} />
      </label>
      {error && <div className="text-red-700">{error}</div>}
    </div>
  )
}
