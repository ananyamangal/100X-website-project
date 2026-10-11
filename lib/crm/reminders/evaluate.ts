/**
 * Reminder rule evaluator (STEP 7; DATA_MODEL §1.13, §5 drivers 4–5). Idempotent and bounded:
 *
 *   stage_stale   open deals in `stage` whose stageEnteredAt ≤ now − days
 *   follow_up_due open deals whose nextFollowUpAt ≤ now + days
 *   amc_due       contacts whose amcDueAt ≤ now + days (and not more than 30 days past)
 *
 * audience "assignee": a rule task (unique dedupeKey "<ruleId>:<dealId|contactId>:<ISO of the
 *   triggering date>", so re-evaluation never duplicates) for deal.assignedTo → contact.assignedTo
 *   (no assignee → counted as `unassigned`, nothing written); plus a `staff_push` job when the rule
 *   names a template and the assignee has a WhatsApp number with pushTasks on (crm_settings.staff).
 * audience "customer": a `customer_reminder` job (idempotencyKey on the same triggering date) only
 *   when the deal's matching opt-in (customerReminders.quoteFollowUp / serviceAmc) is on, the number
 *   is not opted out, and the template is APPROVED. The send itself (7c) re-checks everything.
 *
 * Drivers: lazily from the task list (≤ once per 15 min per workspace, crm_locks gate), the admin
 * "Run now" button, and — once the owner approves it — the daily cron. Day-level precision.
 */
import { ObjectId, type Document } from "mongodb"
import type { CrmDb } from "../db"
import { isDuplicateKeyError } from "../capture"
import { COLL, CRM_DEFAULTS, STAGE_LABEL, type Stage } from "../model"
import { prettyName } from "../tasks/display"

const DAY = 86_400_000
export const EVAL_BUDGET = 200
export const LAZY_INTERVAL_MS = 15 * 60_000

export interface EvalTally {
  rules: number
  examined: number
  tasksCreated: number
  tasksExisting: number
  unassigned: number
  staffPushQueued: number
  customerQueued: number
  customerSkipped: Record<string, number>
  budgetExhausted: boolean
}

const istDate = (d: Date) => new Date(d.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10)

function jobDoc(kind: "staff_push" | "customer_reminder", payload: Document, idempotencyKey: string, now: Date): Document {
  return {
    kind, phoneNumberId: null, payload, status: "pending", attempts: 0, maxAttempts: CRM_DEFAULTS.jobMaxAttempts,
    nextAttemptAt: now, leaseUntil: null, leaseOwner: null, lastError: null, idempotencyKey, doneAt: null, createdAt: now,
  }
}

async function insertJob(crm: CrmDb, doc: Document): Promise<boolean> {
  try {
    await crm.collection(COLL.jobs).insertOne(doc)
    return true
  } catch (e) {
    if (isDuplicateKeyError(e)) return false
    throw e
  }
}

export async function evaluateReminders(crm: CrmDb, now: Date = new Date(), budget = EVAL_BUDGET): Promise<EvalTally> {
  const t: EvalTally = { rules: 0, examined: 0, tasksCreated: 0, tasksExisting: 0, unassigned: 0, staffPushQueued: 0, customerQueued: 0, customerSkipped: {}, budgetExhausted: false }
  const skip = (why: string) => { t.customerSkipped[why] = (t.customerSkipped[why] ?? 0) + 1 }
  const rules = await crm.collection(COLL.reminderRules).find({ active: true }, { sort: { createdAt: 1 }, limit: 100 }).toArray()
  t.rules = rules.length
  if (!rules.length) return t
  const settings = await crm.collection<{ _id: string; staff?: { userId: string; waE164: string | null; pushTasks: boolean }[] }>(COLL.settings).findOne({ _id: crm.workspace }, { projection: { staff: 1 } })
  const staffPushable = new Set((settings?.staff ?? []).filter(s => s.pushTasks && s.waE164).map(s => String(s.userId)))
  const approved = new Set(
    (await crm.collection(COLL.waTemplates).find({ status: "APPROVED" }, { projection: { name: 1 } }).toArray()).map(r => String(r.name)),
  )
  const contactCache = new Map<string, Document | null>()
  const contactOf = async (id: ObjectId) => {
    const k = String(id)
    if (!contactCache.has(k)) contactCache.set(k, await crm.collection(COLL.contacts).findOne({ _id: id }, { projection: { name: 1, company: 1, waProfileName: 1, phoneE164: 1, assignedTo: 1, marketingOptOut: 1, amcDueAt: 1 } }))
    return contactCache.get(k) ?? null
  }

  for (const rule of rules) {
    if (t.examined >= budget) { t.budgetExhausted = true; break }
    const left = budget - t.examined
    const ruleId = String(rule._id)
    const days = Number(rule.days) || 0

    // Candidate rows: {dealId|null, contactId, refAt, assignee, title, dueAt, deal}
    const candidates: { dealId: ObjectId | null; contactId: ObjectId; refAt: Date; assignedTo: Document | null; title: string; dueAt: Date; deal: Document | null }[] = []
    if (rule.trigger === "stage_stale" || rule.trigger === "follow_up_due") {
      const filter: Document = rule.trigger === "stage_stale"
        ? { isOpen: true, stage: rule.stage, stageEnteredAt: { $lte: new Date(now.getTime() - days * DAY) } }
        : { isOpen: true, nextFollowUpAt: { $ne: null, $lte: new Date(now.getTime() + days * DAY) } }
      const deals = await crm.collection(COLL.deals).find(filter, { sort: { _id: 1 }, limit: left, projection: { contactId: 1, stage: 1, stageEnteredAt: 1, nextFollowUpAt: 1, assignedTo: 1, customerReminders: 1, lastQuotation: 1 } }).toArray()
      if (deals.length === left) t.budgetExhausted = true
      for (const d of deals) {
        t.examined++
        const c = await contactOf(d.contactId as ObjectId)
        if (!c) continue
        const who = prettyName(c)
        const stale = rule.trigger === "stage_stale"
        const refAt = (stale ? d.stageEnteredAt : d.nextFollowUpAt) as Date
        candidates.push({
          dealId: d._id as ObjectId,
          contactId: d.contactId as ObjectId,
          refAt,
          assignedTo: (d.assignedTo as Document | null) ?? (c.assignedTo as Document | null) ?? null,
          title: stale ? `Follow up: ${who} has been in ${STAGE_LABEL[d.stage as Stage] ?? d.stage} for ${days}+ days` : `Follow-up due: ${who}`,
          dueAt: stale ? now : refAt,
          deal: d,
        })
      }
    } else if (rule.trigger === "amc_due") {
      const contacts = await crm.collection(COLL.contacts).find(
        { amcDueAt: { $ne: null, $lte: new Date(now.getTime() + days * DAY), $gte: new Date(now.getTime() - 30 * DAY) }, mergedInto: null },
        { sort: { _id: 1 }, limit: left, projection: { name: 1, company: 1, waProfileName: 1, phoneE164: 1, assignedTo: 1, marketingOptOut: 1, amcDueAt: 1 } },
      ).toArray()
      if (contacts.length === left) t.budgetExhausted = true
      for (const c of contacts) {
        t.examined++
        contactCache.set(String(c._id), c)
        const deal = await crm.collection(COLL.deals).findOne({ contactId: c._id, stage: "closed_won" }, { sort: { closedAt: -1 }, projection: { assignedTo: 1, customerReminders: 1 } })
        candidates.push({
          dealId: (deal?._id as ObjectId) ?? null,
          contactId: c._id as ObjectId,
          refAt: c.amcDueAt as Date,
          assignedTo: (c.assignedTo as Document | null) ?? (deal?.assignedTo as Document | null) ?? null,
          title: `Service / AMC due on ${istDate(c.amcDueAt as Date)}: ${prettyName(c)}`,
          dueAt: c.amcDueAt as Date,
          deal,
        })
      }
    }

    for (const cand of candidates) {
      const anchor = cand.dealId ? String(cand.dealId) : String(cand.contactId)
      const dedupeKey = `${ruleId}:${anchor}:${cand.refAt.toISOString()}`
      if (rule.audience === "assignee") {
        if (!cand.assignedTo || !cand.assignedTo.userId) { t.unassigned++; continue }
        const taskId = new ObjectId()
        const push = !!rule.templateName && staffPushable.has(String(cand.assignedTo.userId))
        try {
          await crm.collection(COLL.tasks).insertOne({
            _id: taskId, title: cand.title.slice(0, 200), dueAt: cand.dueAt, assignedTo: { userId: String(cand.assignedTo.userId), name: String(cand.assignedTo.name ?? "") },
            status: "open", doneAt: null, contactId: cand.contactId, dealId: cand.dealId, origin: { kind: "rule", ruleId: rule._id }, dedupeKey,
            staffPush: { status: push ? "queued" : "none" }, rev: 0, createdAt: now, updatedAt: now,
          })
        } catch (e) {
          if (isDuplicateKeyError(e)) { t.tasksExisting++; continue }
          throw e
        }
        t.tasksCreated++
        if (push && (await insertJob(crm, jobDoc("staff_push", { taskId, ruleId: rule._id, templateName: rule.templateName }, `task:${taskId.toHexString()}:push`, now)))) t.staffPushQueued++
      } else {
        const c = await contactOf(cand.contactId)
        const optIn = rule.trigger === "amc_due" ? cand.deal?.customerReminders?.serviceAmc === true : cand.deal?.customerReminders?.quoteFollowUp === true
        if (!optIn) { skip("no_opt_in"); continue }
        if (rule.trigger === "stage_stale" && !cand.deal?.lastQuotation) { skip("no_quotation"); continue }
        if (!c?.phoneE164) { skip("no_phone"); continue }
        if (c.marketingOptOut || (await crm.collection(COLL.optOuts).findOne({ phoneE164: c.phoneE164 }, { projection: { _id: 1 } }))) { skip("opted_out"); continue }
        if (!approved.has(String(rule.templateName))) { skip("template_not_approved"); continue }
        const queued = await insertJob(crm, jobDoc("customer_reminder", {
          ruleId: rule._id, trigger: rule.trigger, templateName: rule.templateName, contactId: cand.contactId, dealId: cand.dealId, refAt: cand.refAt,
        }, `rule:${dedupeKey}`, now))
        if (queued) t.customerQueued++
        else t.tasksExisting++
      }
    }
  }
  return t
}

/**
 * Lazy driver: runs the evaluator at most once per LAZY_INTERVAL_MS per workspace. The gate is a
 * crm_locks row whose upsert only matches an expired lease; a live lease makes the insert collide
 * (E11000) and the call returns null without evaluating.
 */
export async function maybeEvaluateReminders(crm: CrmDb, now: Date = new Date(), owner = "lazy"): Promise<EvalTally | null> {
  const id = `${crm.workspace}:reminders`
  try {
    await crm.collection(COLL.locks).updateOne(
      { _id: id, leaseUntil: { $lt: now } } as Document,
      { $set: { owner, leaseUntil: new Date(now.getTime() + LAZY_INTERVAL_MS) } },
      { upsert: true },
    )
  } catch (e) {
    if (isDuplicateKeyError(e)) return null
    throw e
  }
  return evaluateReminders(crm, now)
}
