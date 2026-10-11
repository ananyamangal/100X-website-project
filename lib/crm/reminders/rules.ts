/**
 * Reminder rules (STEP 7; DATA_MODEL §1.13): the small editable table "trigger, stage, days,
 * audience, template". Nothing is seeded; SUGGESTED_RULES are offered in the editor for the owner
 * to add. Rules are deactivated, never deleted (tasks keep their ruleId).
 */
import { ObjectId, type Document } from "mongodb"
import type { CrmDb } from "../db"
import { logCrmAction } from "../audit"
import { CLOSED_STAGES, COLL, STAGES, type Stage } from "../model"
import { userRefOf, type CrmActor } from "../api/auth"
import { Checker, type FieldErrors } from "../validate"
import { toClient } from "../leads/query"

export const TRIGGERS = ["stage_stale", "follow_up_due", "amc_due"] as const
export type Trigger = (typeof TRIGGERS)[number]
export const AUDIENCES = ["assignee", "customer"] as const
export type Audience = (typeof AUDIENCES)[number]

export interface RuleInput {
  name?: string
  active?: boolean
  trigger?: Trigger
  stage?: Stage | null
  days?: number
  audience?: Audience
  templateName?: string | null
}

/** Offered in the editor; the owner decides which to add. Template names = docs/crm/META_TEMPLATES.md. */
export const SUGGESTED_RULES: Required<Omit<RuleInput, "active">>[] = [
  { name: "New lead not contacted (1 day)", trigger: "stage_stale", stage: "new", days: 1, audience: "assignee", templateName: "fog_team_task" },
  { name: "Quotation follow-up (3 days)", trigger: "stage_stale", stage: "quotation_sent", days: 3, audience: "assignee", templateName: "fog_team_task" },
  { name: "Follow-up date due", trigger: "follow_up_due", stage: null, days: 0, audience: "assignee", templateName: "fog_team_task" },
  { name: "Service / AMC due (7 days ahead)", trigger: "amc_due", stage: null, days: 7, audience: "assignee", templateName: "fog_team_task" },
  { name: "Customer: quotation follow-up (opt-in, 3 days)", trigger: "stage_stale", stage: "quotation_sent", days: 3, audience: "customer", templateName: "fog_quote_followup" },
  { name: "Customer: service reminder (opt-in, 7 days ahead)", trigger: "amc_due", stage: null, days: 7, audience: "customer", templateName: "fog_service_reminder" },
]

const KEYS = new Set(["name", "active", "trigger", "stage", "days", "audience", "templateName"])
const OPEN_STAGES = STAGES.filter(s => !(CLOSED_STAGES as readonly string[]).includes(s))

/** Full validation of the merged rule (create = body; patch = existing + body). */
export function parseRuleInput(body: Record<string, unknown>, existing: Document | null): { ok: true; rule: Required<RuleInput> } | { ok: false; fields: FieldErrors } {
  const c = new Checker()
  for (const k of Object.getOwnPropertyNames(body)) if (!KEYS.has(k) || k === "__proto__") c.fail(k, "unknown_field")
  const pick = (k: string) => (Object.hasOwn(body, k) ? body[k] : existing ? existing[k] : undefined)
  const name = c.str({ name: pick("name") }, "name", 80, { required: true })
  const activeRaw = pick("active")
  if (activeRaw !== undefined && typeof activeRaw !== "boolean") c.fail("active", "invalid")
  const trigger = (TRIGGERS as readonly unknown[]).includes(pick("trigger")) ? (pick("trigger") as Trigger) : null
  if (!trigger) c.fail("trigger", pick("trigger") === undefined ? "required" : "invalid_enum")
  const audience = (AUDIENCES as readonly unknown[]).includes(pick("audience") ?? "assignee") ? ((pick("audience") ?? "assignee") as Audience) : null
  if (!audience) c.fail("audience", "invalid_enum")
  const daysRaw = pick("days")
  const days = typeof daysRaw === "number" && Number.isInteger(daysRaw) && daysRaw >= 0 && daysRaw <= 365 ? daysRaw : null
  if (days === null) c.fail("days", daysRaw === undefined ? "required" : "invalid_number")
  let stage: Stage | null = null
  const stageRaw = pick("stage")
  if (trigger === "stage_stale") {
    if (!(OPEN_STAGES as readonly unknown[]).includes(stageRaw)) c.fail("stage", stageRaw ? "open_stage_required" : "required")
    else stage = stageRaw as Stage
    if (days === 0) c.fail("days", "min_1_for_stage_stale")
  } else if (stageRaw !== undefined && stageRaw !== null && stageRaw !== "") c.fail("stage", "only_for_stage_stale")
  const tplRaw = pick("templateName")
  let templateName: string | null = null
  if (tplRaw !== undefined && tplRaw !== null && tplRaw !== "") {
    if (typeof tplRaw !== "string" || !/^[a-z0-9_]{1,512}$/.test(tplRaw)) c.fail("templateName", "invalid")
    else templateName = tplRaw
  }
  if (audience === "customer") {
    if (!templateName) c.fail("templateName", "required_for_customer")
    if (trigger === "follow_up_due") c.fail("audience", "customer_not_for_follow_up_due")
    if (trigger === "stage_stale" && stage && stage !== "quotation_sent") c.fail("stage", "customer_only_quotation_sent")
  }
  if (!c.ok) return { ok: false, fields: c.errors }
  return { ok: true, rule: { name: name as string, active: activeRaw === undefined ? true : (activeRaw as boolean), trigger: trigger as Trigger, stage, days: days as number, audience: audience as Audience, templateName } }
}

export const ruleView = (r: Document) => toClient(r)

export async function listRules(crm: CrmDb): Promise<Document[]> {
  return crm.collection(COLL.reminderRules).find({}, { sort: { active: -1, createdAt: 1 }, limit: 100 }).toArray()
}

export async function createRule(crm: CrmDb, actor: CrmActor, rule: Required<RuleInput>, now: Date): Promise<Document> {
  const me = userRefOf(actor)
  const doc: Document = { _id: new ObjectId(), ...rule, createdBy: me, createdAt: now, updatedAt: now }
  await crm.collection(COLL.reminderRules).insertOne(doc)
  await logCrmAction(crm, me, "reminder_rule.create", { type: "reminder_rule", id: String(doc._id) }, { after: { ...rule } })
  return doc
}

export async function updateRule(crm: CrmDb, actor: CrmActor, id: ObjectId, rule: Required<RuleInput>, before: Document, now: Date): Promise<Document> {
  const me = userRefOf(actor)
  await crm.collection(COLL.reminderRules).updateOne({ _id: id }, { $set: { ...rule, updatedAt: now } })
  await logCrmAction(crm, me, "reminder_rule.update", { type: "reminder_rule", id: id.toHexString() }, {
    before: { name: before.name, active: before.active, trigger: before.trigger, stage: before.stage ?? null, days: before.days, audience: before.audience, templateName: before.templateName ?? null },
    after: { ...rule },
  })
  return { ...before, ...rule, updatedAt: now }
}
