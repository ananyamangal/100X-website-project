/**
 * Job handlers for reminder sends (STEP 7), run by lib/crm/queue/jobs.ts:
 *
 *   staff_push        → fog_team_task (en_US) to the assignee's own WhatsApp (crm_settings.staff),
 *                       params: assignee, task, customer, masked customer mobile, due (IST)
 *   customer_reminder → fog_quote_followup (quotation follow-up) or fog_service_reminder (AMC),
 *                       contact language hi → en_US fallback; everything re-checked at send time
 *                       (opt-in still on, deal still due, number not opted out — the gate too)
 *
 * All sends go through lib/crm/outbound/send.ts with the job's idempotency key, so a replay never
 * sends twice; a replay that finds a half-sent row (sendAttemptedAt, no wamid) is `unknown_outcome`
 * and is never re-sent automatically (DATA_MODEL §5).
 */
import type { Document, ObjectId } from "mongodb"
import type { CrmDb } from "../db"
import { COLL, type WaLanguage } from "../model"
import { fromTemplateParams } from "../outbound/compose"
import type { GraphConfig } from "../outbound/graph"
import { sendMessage, type SendLogger, type SendResult } from "../outbound/send"
import type { SendPurpose } from "../outbound/gate"
import { ensureStaffContact, staffList } from "../staff"
import { prettyName } from "../tasks/display"
import { quoteLabel } from "../quotes/numbering"
import type { JobHandler, JobOutcome } from "../queue/jobs"

export interface ReminderSendDeps {
  allowList: readonly string[]
  graph: GraphConfig | null
  requestId: string
  now?: () => Date
  log?: SendLogger
}

const IST = 5.5 * 3600_000
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
export function istDay(d: Date): string {
  const t = new Date(d.getTime() + IST)
  return `${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]} ${t.getUTCFullYear()}`
}
export function istDayTime(d: Date): string {
  const t = new Date(d.getTime() + IST)
  return `${istDay(d)}, ${String(t.getUTCHours()).padStart(2, "0")}:${String(t.getUTCMinutes()).padStart(2, "0")}`
}
/** "+91 98XXXXXX10" (template sample); other numbers keep the country code and last 2 digits. */
export function maskPhone(e164: string | null | undefined): string {
  if (!e164) return "—"
  const m = /^\+91(\d{10})$/.exec(e164)
  if (m) return `+91 ${m[1].slice(0, 2)}XXXXXX${m[1].slice(-2)}`
  return `${e164.slice(0, 3)}…${e164.slice(-2)}`
}

const RETRY_GATE = new Set(["tier_cap", "sending_paused", "template_paused", "whatsapp_not_configured"])

/** sendMessage result → job outcome. */
export function outcomeOf(r: SendResult): JobOutcome {
  if (r.ok) {
    if (r.deduped && r.message.status === "queued") return { kind: "failed", code: "unknown_outcome", message: "an earlier attempt may have reached Meta; not re-sent" }
    return { kind: "done", note: r.deduped ? "deduped" : "sent" }
  }
  if (r.error === "send_failed") {
    const d = (r.detail ?? {}) as { code?: number | null; retryQueued?: boolean; title?: string }
    if (d.retryQueued) return { kind: "done", note: "handed_to_wa_send_retry" }
    return { kind: "failed", code: `meta_${d.code ?? "error"}`, message: String(d.title ?? "send failed") }
  }
  if (RETRY_GATE.has(r.error)) return { kind: "retry", code: r.error, message: r.error }
  return { kind: "failed", code: r.error, message: r.error }
}

async function languageFor(crm: CrmDb, template: string, preferred: WaLanguage): Promise<WaLanguage | null> {
  const rows = await crm.collection(COLL.waTemplates).find({ name: template, status: "APPROVED" }, { projection: { language: 1 } }).toArray()
  const langs = new Set(rows.map(r => String(r.language)))
  if (langs.has(preferred)) return preferred
  if (langs.has("en_US")) return "en_US"
  return null
}

async function sendTemplate(crm: CrmDb, deps: ReminderSendDeps, o: { contactId: ObjectId; key: string; purpose: SendPurpose; route: string; template: string; language: WaLanguage; params: string[] }): Promise<SendResult | JobOutcome> {
  const p = fromTemplateParams(o.params.map(s => s.replace(/\s+/g, " ").trim() || "—"))
  if (!p.ok) return { kind: "failed", code: "template_param_invalid", message: `param ${p.index}: ${p.reason}` }
  return sendMessage(
    crm,
    { system: "reminders" },
    { contactId: o.contactId, conversationId: null, idempotencyKey: o.key, purpose: o.purpose, route: o.route, content: { kind: "template", name: o.template, language: o.language, params: p.params } },
    { allowList: deps.allowList, graph: deps.graph, requestId: deps.requestId, now: deps.now, log: deps.log },
  )
}
const isOutcome = (x: SendResult | JobOutcome): x is JobOutcome => "kind" in x

export function reminderHandlers(crm: CrmDb, deps: ReminderSendDeps): Record<string, JobHandler> {
  const now = () => (deps.now ? deps.now() : new Date())

  const staffPush: JobHandler = async job => {
    const task = await crm.collection(COLL.tasks).findOne({ _id: job.payload?.taskId })
    if (!task) return { kind: "failed", code: "task_not_found", message: "task deleted" }
    if (task.status !== "open") {
      await crm.collection(COLL.tasks).updateOne({ _id: task._id }, { $set: { staffPush: { status: "none" } } })
      return { kind: "done", note: "task_closed" }
    }
    const staff = (await staffList(crm)).find(s => String(s.userId) === String(task.assignedTo?.userId) && s.pushTasks && s.waE164)
    const markFailed = () => crm.collection(COLL.tasks).updateOne({ _id: task._id }, { $set: { staffPush: { status: "failed" }, updatedAt: now() } })
    if (!staff) { await markFailed(); return { kind: "failed", code: "no_staff_number", message: "assignee has no WhatsApp number with pushes on" } }
    const recipient = await ensureStaffContact(crm, staff, now())
    const customer = task.contactId ? await crm.collection(COLL.contacts).findOne({ _id: task.contactId }, { projection: { name: 1, company: 1, waProfileName: 1, phoneE164: 1 } }) : null
    const r = await sendTemplate(crm, deps, {
      contactId: recipient._id as ObjectId,
      key: String(job.idempotencyKey ?? `task:${String(task._id)}:push`),
      purpose: "staff_push",
      route: "reminders.staff_push",
      template: String(job.payload?.templateName ?? "fog_team_task"),
      language: "en_US",
      params: [staff.name, String(task.title), customer ? prettyName(customer) : "—", maskPhone(customer?.phoneE164 as string | undefined), istDayTime(task.dueAt as Date)],
    })
    if (isOutcome(r)) { await markFailed(); return r }
    const out = outcomeOf(r)
    if (out.kind === "done") await crm.collection(COLL.tasks).updateOne({ _id: task._id }, { $set: { staffPush: { status: "sent", ...(r.ok ? { messageId: r.message._id } : {}) } } })
    else if (out.kind === "failed") await markFailed()
    return out
  }

  const customerReminder: JobHandler = async job => {
    const p = job.payload ?? {}
    const contact = await crm.collection(COLL.contacts).findOne({ _id: p.contactId }, { projection: { name: 1, company: 1, waProfileName: 1, phoneE164: 1, language: 1, amcDueAt: 1, marketingOptOut: 1 } })
    if (!contact) return { kind: "failed", code: "contact_not_found", message: "contact missing" }
    const deal: Document | null = p.dealId ? await crm.collection(COLL.deals).findOne({ _id: p.dealId }) : null
    const template = String(p.templateName)
    let params: string[]
    if (p.trigger === "amc_due") {
      const refAt = p.refAt instanceof Date ? p.refAt.getTime() : NaN
      if (!(contact.amcDueAt instanceof Date) || contact.amcDueAt.getTime() !== refAt) return { kind: "done", note: "no_longer_due" }
      if (!deal || deal.customerReminders?.serviceAmc !== true) return { kind: "done", note: "opt_in_off" }
      const machine = (Array.isArray(deal.productInterest) && deal.productInterest[0]?.label) || "machine"
      const since = (deal.won?.wonAt as Date | undefined) ?? (deal.closedAt as Date | undefined) ?? null
      params = [prettyName(contact), String(machine), since ? istDay(since) : "your last service"]
    } else {
      if (!deal || deal.isOpen !== true || deal.stage !== "quotation_sent") return { kind: "done", note: "no_longer_due" }
      if (deal.customerReminders?.quoteFollowUp !== true) return { kind: "done", note: "opt_in_off" }
      const lq = deal.lastQuotation
      if (!lq?.quoteNumber) return { kind: "done", note: "no_quotation" }
      const q = await crm.collection(COLL.quotations).findOne({ _id: lq.quotationId }, { projection: { lines: 1, issuedAt: 1 } })
      const lines = (q?.lines ?? []) as { model: string }[]
      const product = lines.length ? (lines.length > 1 ? `${lines[0].model} and ${lines.length - 1} more` : lines[0].model) : "your requirement"
      const date = (lq.sentAt as Date | null) ?? (q?.issuedAt as Date | undefined) ?? null
      params = [prettyName(contact), date ? istDay(date) : "recently", product, quoteLabel(String(lq.quoteNumber), Number(lq.version ?? 1))]
    }
    const language = await languageFor(crm, template, contact.language === "hi" ? "hi" : "en_US")
    if (!language) return { kind: "failed", code: "template_not_approved", message: `${template} has no approved language` }
    const r = await sendTemplate(crm, deps, { contactId: contact._id as ObjectId, key: String(job.idempotencyKey), purpose: "automation", route: `reminders.${p.trigger}`, template, language, params })
    return isOutcome(r) ? r : outcomeOf(r)
  }

  return { staff_push: staffPush, customer_reminder: customerReminder }
}
