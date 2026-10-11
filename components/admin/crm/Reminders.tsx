"use client"
// Reminder rules editor (STEP 7): the small table "trigger, stage, days, audience, template".
// Nothing is pre-installed; suggested rules are added with one click. Rules are switched off,
// never deleted. "Run now" evaluates every active rule immediately (normally it runs by itself
// when task lists load, at most every 15 minutes).
import { useCallback, useEffect, useState } from "react"
import { crmFetch, errorText } from "./api"
import { STAGES, stageLabel } from "./format"
import { Badge, EmptyBox, ErrorBox, Spinner, btnPrimary, btnSecondary, inputCls } from "./ui"

interface Rule {
  id?: string
  name: string
  active?: boolean
  trigger: "stage_stale" | "follow_up_due" | "amc_due"
  stage: string | null
  days: number
  audience: "assignee" | "customer"
  templateName: string | null
}
interface Tally { rules: number; examined: number; tasksCreated: number; tasksExisting: number; unassigned: number; staffPushQueued: number; customerQueued: number; customerSkipped: Record<string, number>; budgetExhausted: boolean }

const OPEN_STAGES = STAGES.filter(s => s !== "closed_won" && s !== "closed_lost")

/** One-line description of a rule for the table. */
export function describeRule(r: { trigger: string; stage: string | null; days: number; audience: string; templateName: string | null }, label: (s: string) => string): string {
  const when = r.trigger === "stage_stale" ? `deal in ${label(r.stage ?? "")} for ${r.days}+ day${r.days === 1 ? "" : "s"}`
    : r.trigger === "follow_up_due" ? (r.days ? `follow-up date within ${r.days} day${r.days === 1 ? "" : "s"}` : "follow-up date reached")
    : `service / AMC due within ${r.days} day${r.days === 1 ? "" : "s"}`
  const what = r.audience === "customer" ? `WhatsApp the customer (${r.templateName}, opt-in only)` : `task for the assignee${r.templateName ? ` + WhatsApp push (${r.templateName})` : ""}`
  return `When ${when}: ${what}`
}

const SKIP_TEXT: Record<string, string> = {
  no_opt_in: "customer reminders off on the deal",
  no_quotation: "no quotation on the deal",
  no_phone: "no phone number",
  opted_out: "customer opted out",
  template_not_approved: "template not approved yet",
}

export function Reminders() {
  const [rules, setRules] = useState<Rule[] | null>(null)
  const [suggested, setSuggested] = useState<Rule[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [tally, setTally] = useState<Tally | null>(null)
  const [form, setForm] = useState<Rule | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const r = await crmFetch<{ items: Rule[]; suggested: Rule[] }>("/api/crm/reminders/rules")
      setRules(r.items); setSuggested(r.suggested)
    } catch (e) {
      setError(errorText(e))
    }
  }, [])
  useEffect(() => { void load() }, [load])

  async function act(name: string, fn: () => Promise<unknown>) {
    if (busy) return
    setBusy(name); setActionError(null)
    try {
      await fn()
      await load()
    } catch (e) {
      setActionError(errorText(e))
    } finally {
      setBusy(null)
    }
  }
  const add = (r: Rule) => act(`add:${r.name}`, () => crmFetch("/api/crm/reminders/rules", { method: "POST", body: JSON.stringify({ name: r.name, trigger: r.trigger, stage: r.stage, days: r.days, audience: r.audience, templateName: r.templateName || null }) }))
  const toggle = (r: Rule) => act(`t:${r.id}`, () => crmFetch(`/api/crm/reminders/rules/${r.id}`, { method: "PATCH", body: JSON.stringify({ active: !r.active }) }))
  const runNow = () => act("run", async () => setTally((await crmFetch<{ tally: Tally }>("/api/crm/reminders/run", { method: "POST" })).tally))

  if (error) return <ErrorBox onRetry={() => void load()}>{error}</ErrorBox>
  if (!rules) return <Spinner />
  const names = new Set(rules.map(r => r.name))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-gray-900">Reminder rules</h1>
        <button type="button" className={btnSecondary} disabled={!!busy} onClick={() => void runNow()}>{busy === "run" ? "Running..." : "Run now"}</button>
      </div>
      <p className="text-sm text-gray-600">Rules run by themselves when task lists are opened (at most every 15 minutes). Each reminder is created once per occurrence.</p>
      {actionError && <ErrorBox>{actionError}</ErrorBox>}
      {tally && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900" role="status">
          {tally.rules} active rule{tally.rules === 1 ? "" : "s"}: {tally.tasksCreated} new task{tally.tasksCreated === 1 ? "" : "s"}, {tally.staffPushQueued} team WhatsApp push{tally.staffPushQueued === 1 ? "" : "es"} and {tally.customerQueued} customer reminder{tally.customerQueued === 1 ? "" : "s"} queued.
          {tally.unassigned > 0 && ` ${tally.unassigned} lead${tally.unassigned === 1 ? " has" : "s have"} no assignee, so no task was made.`}
          {Object.entries(tally.customerSkipped).map(([k, v]) => ` ${v} skipped: ${SKIP_TEXT[k] ?? k}.`).join("")}
          {tally.budgetExhausted && " More are due; they are picked up on the next run."}
        </div>
      )}

      {rules.length === 0 ? <EmptyBox>No reminder rules yet. Add one of the suggestions below or create your own.</EmptyBox> : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {rules.map(r => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900">{r.name} {!r.active && <Badge>Off</Badge>}</div>
                <div className="text-sm text-gray-600">{describeRule(r, stageLabel)}</div>
              </div>
              <button type="button" className={btnSecondary} disabled={!!busy} onClick={() => void toggle(r)}>{r.active ? "Turn off" : "Turn on"}</button>
            </li>
          ))}
        </ul>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-700">Suggested rules</h2>
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {suggested.map(s => (
            <li key={s.name} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900">{s.name}</div>
                <div className="text-sm text-gray-600">{describeRule(s, stageLabel)}</div>
              </div>
              <button type="button" className={btnSecondary} disabled={!!busy || names.has(s.name)} onClick={() => void add(s)}>{names.has(s.name) ? "Added" : "Add"}</button>
            </li>
          ))}
        </ul>
      </section>

      <StaffNumbers />

      {form ? (
        <form className="space-y-3 rounded-lg border border-gray-200 bg-white p-4" onSubmit={e => { e.preventDefault(); void add(form).then(() => setForm(null)) }}>
          <h2 className="font-semibold text-gray-900">New rule</h2>
          <label className="block text-sm"><span className="mb-1 block text-gray-700">Name</span>
            <input className={inputCls} value={form.name} maxLength={80} onChange={e => setForm({ ...form, name: e.target.value })} required /></label>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-sm"><span className="mb-1 block text-gray-700">When</span>
              <select className={inputCls} value={form.trigger} onChange={e => setForm({ ...form, trigger: e.target.value as Rule["trigger"], stage: e.target.value === "stage_stale" ? "new" : null, audience: e.target.value === "follow_up_due" ? "assignee" : form.audience })}>
                <option value="stage_stale">Deal stays in a stage</option>
                <option value="follow_up_due">Follow-up date</option>
                <option value="amc_due">Service / AMC due</option>
              </select></label>
            {form.trigger === "stage_stale" && (
              <label className="text-sm"><span className="mb-1 block text-gray-700">Stage</span>
                <select className={inputCls} value={form.stage ?? "new"} onChange={e => setForm({ ...form, stage: e.target.value })}>
                  {OPEN_STAGES.map(s => <option key={s} value={s}>{stageLabel(s)}</option>)}
                </select></label>
            )}
            <label className="text-sm"><span className="mb-1 block text-gray-700">{form.trigger === "stage_stale" ? "For at least (days)" : "Days ahead"}</span>
              <input className={inputCls} type="number" min={form.trigger === "stage_stale" ? 1 : 0} max={365} value={form.days} onChange={e => setForm({ ...form, days: Number(e.target.value) })} /></label>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-sm"><span className="mb-1 block text-gray-700">Who</span>
              <select className={inputCls} value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value as Rule["audience"] })}>
                <option value="assignee">Task for the assigned salesperson</option>
                {form.trigger !== "follow_up_due" && <option value="customer">WhatsApp the customer (opt-in only)</option>}
              </select></label>
            <label className="text-sm"><span className="mb-1 block text-gray-700">WhatsApp template {form.audience === "assignee" ? "(optional push)" : ""}</span>
              <input className={inputCls} value={form.templateName ?? ""} placeholder={form.audience === "customer" ? "fog_quote_followup" : "fog_team_task"} onChange={e => setForm({ ...form, templateName: e.target.value.trim() || null })} /></label>
          </div>
          <div className="flex gap-2">
            <button type="submit" className={btnPrimary} disabled={!!busy}>Save rule</button>
            <button type="button" className={btnSecondary} onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button type="button" className={btnSecondary} onClick={() => setForm({ name: "", trigger: "stage_stale", stage: "new", days: 2, audience: "assignee", templateName: null })}>Create a custom rule</button>
      )}
    </div>
  )
}

interface StaffRow { userId: string; name: string; waE164: string | null; pushTasks: boolean }

/** Team members' own WhatsApp numbers: where rule tasks are pushed (template fog_team_task). */
export function StaffNumbers() {
  const [rows, setRows] = useState<StaffRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    crmFetch<{ items: StaffRow[] }>("/api/crm/settings/staff").then(r => setRows(r.items)).catch(e => setError(errorText(e)))
  }, [])
  async function save() {
    if (!rows) return
    setSaving(true); setError(null); setSaved(false)
    try {
      const r = await crmFetch<{ items: StaffRow[] }>("/api/crm/settings/staff", { method: "PUT", body: JSON.stringify({ staff: rows.map(x => ({ userId: x.userId, waE164: x.waE164?.trim() || null, pushTasks: x.pushTasks })) }) })
      const byId = new Map(r.items.map(x => [x.userId, x]))
      setRows(rows.map(x => ({ ...x, ...(byId.get(x.userId) ?? { waE164: x.waE164?.trim() || null, pushTasks: false }) })))
      setSaved(true)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setSaving(false)
    }
  }
  if (!rows) return error ? <ErrorBox>{error}</ErrorBox> : <Spinner />
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-gray-700">Team WhatsApp numbers</h2>
      <p className="text-sm text-gray-600">Rule tasks are also sent to these numbers on WhatsApp when the rule names a template. Messages from these numbers never create leads.</p>
      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
        {rows.map((r, i) => (
          <li key={r.userId} className="grid items-center gap-2 p-3 sm:grid-cols-[1fr_220px_auto]">
            <span className="font-medium text-gray-900">{r.name}</span>
            <input className={inputCls} inputMode="tel" placeholder="98765 43210" value={r.waE164 ?? ""} aria-label={`WhatsApp number of ${r.name}`}
              onChange={e => setRows(rows.map((x, j) => (j === i ? { ...x, waE164: e.target.value } : x)))} />
            <label className="flex min-h-[40px] items-center gap-2 text-sm">
              <input type="checkbox" className="h-5 w-5" checked={r.pushTasks} onChange={e => setRows(rows.map((x, j) => (j === i ? { ...x, pushTasks: e.target.checked } : x)))} />
              Send task reminders
            </label>
          </li>
        ))}
      </ul>
      {error && <ErrorBox>{error}</ErrorBox>}
      <div className="flex items-center gap-3">
        <button type="button" className={btnPrimary} disabled={saving} onClick={() => void save()}>{saving ? "Saving..." : "Save numbers"}</button>
        {saved && <span className="text-sm text-green-700" role="status">Saved.</span>}
      </div>
    </section>
  )
}
