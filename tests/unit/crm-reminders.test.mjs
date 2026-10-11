// Run: node --import ./tests/support/register.mjs --test --test-concurrency=1 tests/unit/crm-reminders.test.mjs
// STEP 7b reminder rules + evaluator: validation, triggers, idempotent rule tasks, staff-push and
// customer-reminder job queueing (opt-in / opt-out / template gates), budget, lazy 15-min gate, API.
import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { ObjectId } from "mongodb"
import { startMemoryMongo } from "./crm/helpers/memory-mongo.mjs"
import { freshCrm, all, count } from "./crm/helpers/wa-harness.mjs"
import { NOW, H, ago, jreq, reqCtx, apiDeps, seedContact, seedTemplate } from "./crm/helpers/outbound-kit.mjs"
import { COLL } from "../../lib/crm/model.ts"
import { parseRuleInput, SUGGESTED_RULES } from "../../lib/crm/reminders/rules.ts"
import { evaluateReminders, maybeEvaluateReminders } from "../../lib/crm/reminders/evaluate.ts"
import { listRulesHandler, createRuleHandler, updateRuleHandler, runRemindersHandler } from "../../lib/crm/api/reminders.ts"
import { listTasksHandler } from "../../lib/crm/api/tasks.ts"

let m
before(async () => { m = await startMemoryMongo() })
after(async () => { if (m) await m.stop() })
const need = t => { if (!m.ok) { t.skip(m.skip); return false } return true }
const D = 24 * H
const NO_PARAMS = { params: Promise.resolve({}) }
const U1 = { userId: "u1", name: "Asha" }
const U2 = { userId: "u2", name: "Ravi" }

async function rule(crm, o) {
  const p = parseRuleInput(o, null)
  assert.ok(p.ok, JSON.stringify(p.fields))
  const doc = { _id: new ObjectId(), ...p.rule, createdBy: U1, createdAt: NOW, updatedAt: NOW }
  await crm.collection(COLL.reminderRules).insertOne(doc)
  return doc
}
async function deal(crm, o = {}) {
  const c = o.contact ?? (await seedContact(crm, { assignedTo: o.contactAssignedTo ?? null, name: o.name ?? undefined }))
  const _id = new ObjectId()
  await crm.collection(COLL.deals).insertOne({
    _id, contactId: c._id, stage: o.stage ?? "quotation_sent", isOpen: o.isOpen ?? true, stageEnteredAt: o.stageEnteredAt ?? ago(4 * D),
    nextFollowUpAt: o.nextFollowUpAt ?? null, assignedTo: o.assignedTo === undefined ? U1 : o.assignedTo,
    customerReminders: o.customerReminders ?? { quoteFollowUp: false, serviceAmc: false }, lastQuotation: o.lastQuotation ?? null, closedAt: o.closedAt ?? null, createdAt: NOW,
  })
  return { dealId: _id, contact: c }
}

test("parseRuleInput: triggers, stage rules, days bounds, customer constraints, suggested presets are all valid", () => {
  const f = o => parseRuleInput(o, null).fields ?? {}
  assert.equal(f({ name: "x", trigger: "nope", days: 1 }).trigger, "invalid_enum")
  assert.equal(f({ name: "x", trigger: "stage_stale", days: 1 }).stage, "required")
  assert.equal(f({ name: "x", trigger: "stage_stale", stage: "closed_won", days: 1 }).stage, "open_stage_required")
  assert.equal(f({ name: "x", trigger: "stage_stale", stage: "new", days: 0 }).days, "min_1_for_stage_stale")
  assert.equal(f({ name: "x", trigger: "follow_up_due", stage: "new", days: 0 }).stage, "only_for_stage_stale")
  assert.equal(f({ name: "x", trigger: "amc_due", days: 400 }).days, "invalid_number")
  assert.equal(f({ name: "x", trigger: "amc_due", days: 7, audience: "customer" }).templateName, "required_for_customer")
  assert.equal(f({ name: "x", trigger: "follow_up_due", days: 0, audience: "customer", templateName: "t" }).audience, "customer_not_for_follow_up_due")
  assert.equal(f({ name: "x", trigger: "stage_stale", stage: "new", days: 1, audience: "customer", templateName: "t" }).stage, "customer_only_quotation_sent")
  assert.equal(f({ name: "x", trigger: "amc_due", days: 1, templateName: "Bad Name" }).templateName, "invalid")
  assert.equal(parseRuleInput(JSON.parse('{"name":"x","trigger":"amc_due","days":1,"__proto__":1}'), null).fields.__proto__, "unknown_field")
  for (const s of SUGGESTED_RULES) assert.equal(parseRuleInput(s, null).ok, true, s.name)
  // patch semantics: merged with the existing rule
  const ex = { name: "Old", active: true, trigger: "stage_stale", stage: "new", days: 2, audience: "assignee", templateName: null }
  assert.deepEqual(parseRuleInput({ active: false }, ex).rule, { ...ex, active: false })
})

test("stage_stale (assignee): one task per stale deal, contact-assignee fallback, unassigned counted; re-run creates nothing; fresh/closed deals ignored", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const r = await rule(crm, { name: "Quote follow-up", trigger: "stage_stale", stage: "quotation_sent", days: 3 })
  const a = await deal(crm, { name: "Ramesh" })
  const b = await deal(crm, { assignedTo: null, contactAssignedTo: U2 })
  await deal(crm, { assignedTo: null })
  await deal(crm, { stageEnteredAt: ago(1 * D) })
  await deal(crm, { isOpen: false, stage: "quotation_sent" })
  const t1 = await evaluateReminders(crm, NOW)
  assert.equal(t1.tasksCreated, 2); assert.equal(t1.unassigned, 1); assert.equal(t1.examined, 3)
  const tasks = await crm.collection(COLL.tasks).find({}).sort({ _id: 1 }).toArray()
  assert.deepEqual(tasks.map(x => x.assignedTo.userId).sort(), ["u1", "u2"])
  const ta = tasks.find(x => String(x.dealId) === String(a.dealId))
  assert.match(ta.title, /^Follow up: Ramesh has been in Quotation Sent for 3\+ days$/)
  assert.equal(ta.origin.kind, "rule"); assert.equal(String(ta.origin.ruleId), String(r._id))
  assert.equal(ta.dedupeKey, `${r._id}:${a.dealId}:${ago(4 * D).toISOString()}`)
  assert.deepEqual(ta.dueAt, NOW); assert.equal(ta.staffPush.status, "none")
  const t2 = await evaluateReminders(crm, new Date(NOW.getTime() + H))
  assert.equal(t2.tasksCreated, 0); assert.equal(t2.tasksExisting, 2)
  // a deal re-entering the stage later is a new occurrence
  await crm.collection(COLL.deals).updateOne({ _id: b.dealId }, { $set: { stageEnteredAt: ago(3.5 * D) } })
  assert.equal((await evaluateReminders(crm, NOW)).tasksCreated, 1)
})

test("follow_up_due: task due at the follow-up time; a new follow-up date = a new task; days = lead time", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await rule(crm, { name: "Follow-up due", trigger: "follow_up_due", days: 0 })
  const { dealId } = await deal(crm, { stage: "contacted", nextFollowUpAt: ago(2 * H) })
  await deal(crm, { stage: "contacted", nextFollowUpAt: new Date(NOW.getTime() + 2 * D) })
  assert.equal((await evaluateReminders(crm, NOW)).tasksCreated, 1)
  const [tk] = await all(crm, COLL.tasks)
  assert.deepEqual(tk.dueAt, ago(2 * H)); assert.match(tk.title, /^Follow-up due: /)
  await crm.collection(COLL.deals).updateOne({ _id: dealId }, { $set: { nextFollowUpAt: ago(1 * H) } })
  assert.equal((await evaluateReminders(crm, NOW)).tasksCreated, 1)
  const crm2 = await freshCrm(m)
  await rule(crm2, { name: "Lead 3 days", trigger: "follow_up_due", days: 3 })
  await deal(crm2, { stage: "contacted", nextFollowUpAt: new Date(NOW.getTime() + 2 * D) })
  assert.equal((await evaluateReminders(crm2, NOW)).tasksCreated, 1)
})

test("amc_due: contacts due within N days (≤ 30 days overdue) get a task for the contact's assignee", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await rule(crm, { name: "AMC", trigger: "amc_due", days: 7 })
  const c1 = await seedContact(crm, { assignedTo: U2, name: "Nagar Nigam", extra: { amcDueAt: new Date(NOW.getTime() + 5 * D) } })
  await seedContact(crm, { assignedTo: U2, extra: { amcDueAt: new Date(NOW.getTime() + 20 * D) } })
  await seedContact(crm, { assignedTo: U2, extra: { amcDueAt: ago(40 * D) } })
  const tl = await evaluateReminders(crm, NOW)
  assert.equal(tl.tasksCreated, 1)
  const [tk] = await all(crm, COLL.tasks)
  assert.equal(String(tk.contactId), String(c1._id)); assert.equal(tk.dealId, null); assert.equal(tk.assignedTo.userId, "u2")
  assert.match(tk.title, /^Service \/ AMC due on 2026-10-15: Nagar Nigam$/)
})

test("staff push: queued only for assignees with pushTasks + a WhatsApp number and when the rule names a template; idempotent job key", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await crm.collection(COLL.settings).insertOne({ _id: "fogging", staff: [{ userId: "u1", name: "Asha", waE164: "+919811100001", pushTasks: true }, { userId: "u2", name: "Ravi", waE164: null, pushTasks: true }] })
  await rule(crm, { name: "Q", trigger: "stage_stale", stage: "quotation_sent", days: 3, templateName: "fog_team_task" })
  await deal(crm, { assignedTo: U1 })
  await deal(crm, { assignedTo: U2 })
  const tl = await evaluateReminders(crm, NOW)
  assert.equal(tl.tasksCreated, 2); assert.equal(tl.staffPushQueued, 1)
  const [job] = await all(crm, COLL.jobs)
  assert.equal(job.kind, "staff_push"); assert.equal(job.status, "pending"); assert.equal(job.payload.templateName, "fog_team_task")
  const pushed = await crm.collection(COLL.tasks).findOne({ _id: job.payload.taskId })
  assert.equal(pushed.assignedTo.userId, "u1"); assert.equal(pushed.staffPush.status, "queued")
  assert.equal(job.idempotencyKey, `task:${pushed._id.toHexString()}:push`)
  await evaluateReminders(crm, NOW)
  assert.equal(await count(crm, COLL.jobs), 1)
})

test("customer audience: needs the deal opt-in, a quotation, no opt-out and an APPROVED template; then one job per occurrence", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await rule(crm, { name: "Cust Q", trigger: "stage_stale", stage: "quotation_sent", days: 3, audience: "customer", templateName: "fog_quote_followup" })
  const lq = { quotationId: new ObjectId(), quoteNumber: "100X/QT/2026-27/0001", version: 1, grandTotal: 100, sentAt: ago(4 * D) }
  await deal(crm, {})
  await deal(crm, { customerReminders: { quoteFollowUp: true, serviceAmc: false } })
  const ok = await deal(crm, { customerReminders: { quoteFollowUp: true, serviceAmc: false }, lastQuotation: lq })
  const oo = await deal(crm, { customerReminders: { quoteFollowUp: true, serviceAmc: false }, lastQuotation: lq })
  await crm.collection(COLL.optOuts).insertOne({ phoneE164: oo.contact.phoneE164, scope: "marketing", via: "stop_keyword", at: NOW, by: null, sourceMessageId: null })
  let tl = await evaluateReminders(crm, NOW)
  assert.equal(tl.customerQueued, 0)
  assert.deepEqual(tl.customerSkipped, { no_opt_in: 1, no_quotation: 1, template_not_approved: 1, opted_out: 1 })
  assert.equal(await count(crm, COLL.tasks), 0, "customer rules write no tasks")
  await seedTemplate(crm, { name: "fog_quote_followup", bodyParamCount: 4 })
  tl = await evaluateReminders(crm, NOW)
  assert.equal(tl.customerQueued, 1)
  const [job] = await all(crm, COLL.jobs)
  assert.equal(job.kind, "customer_reminder"); assert.equal(String(job.payload.dealId), String(ok.dealId)); assert.equal(job.payload.templateName, "fog_quote_followup")
  assert.equal((await evaluateReminders(crm, NOW)).customerQueued, 0, "idempotent")
  assert.equal(await count(crm, COLL.jobs), 1)
  // AMC customer rule uses the closed-won deal's serviceAmc opt-in
  await rule(crm, { name: "Cust AMC", trigger: "amc_due", days: 7, audience: "customer", templateName: "fog_service_reminder" })
  await seedTemplate(crm, { name: "fog_service_reminder", bodyParamCount: 3 })
  const won = await seedContact(crm, { extra: { amcDueAt: new Date(NOW.getTime() + 2 * D) } })
  await deal(crm, { contact: won, stage: "closed_won", isOpen: false, closedAt: ago(300 * D), customerReminders: { quoteFollowUp: false, serviceAmc: true } })
  assert.equal((await evaluateReminders(crm, NOW)).customerQueued, 1)
})

test("budget: evaluation stops after the budget and reports it", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await rule(crm, { name: "Q", trigger: "stage_stale", stage: "quotation_sent", days: 3 })
  for (let i = 0; i < 3; i++) await deal(crm)
  const tl = await evaluateReminders(crm, NOW, 2)
  assert.equal(tl.examined, 2); assert.equal(tl.tasksCreated, 2); assert.equal(tl.budgetExhausted, true)
  assert.equal((await evaluateReminders(crm, NOW)).tasksCreated, 1, "the rest on the next run")
})

test("lazy gate: at most once per 15 minutes per workspace", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await rule(crm, { name: "Q", trigger: "stage_stale", stage: "quotation_sent", days: 3 })
  await deal(crm)
  assert.ok(await maybeEvaluateReminders(crm, NOW))
  assert.equal(await maybeEvaluateReminders(crm, new Date(NOW.getTime() + 10 * 60_000)), null)
  await deal(crm)
  const later = await maybeEvaluateReminders(crm, new Date(NOW.getTime() + 16 * 60_000))
  assert.ok(later); assert.equal(later.tasksCreated, 1)
})

test("API: rules need crm.settings.edit; create / deactivate (audited); run returns the tally; the task list evaluates lazily", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const SET = ["crm.view", "crm.settings.edit", "crm.leads.view_all"]
  const d = (o = {}) => apiDeps(crm, { perms: SET, ...o })
  assert.equal((await listRulesHandler(jreq("GET", "http://x/r"), NO_PARAMS, d({ perms: ["crm.view"] }))).status, 403)
  const lst = await (await listRulesHandler(jreq("GET", "http://x/r"), NO_PARAMS, d())).json()
  assert.deepEqual(lst.items, []); assert.equal(lst.suggested.length, SUGGESTED_RULES.length)
  const bad = await createRuleHandler(jreq("POST", "http://x/r", { name: "x", trigger: "stage_stale", days: 2 }), NO_PARAMS, d())
  assert.equal(bad.status, 400)
  const cr = await createRuleHandler(jreq("POST", "http://x/r", SUGGESTED_RULES[1]), NO_PARAMS, d())
  assert.equal(cr.status, 201)
  const id = (await cr.json()).rule.id
  const off = await updateRuleHandler(jreq("PATCH", "http://x/r", { active: false }), reqCtx(id), d())
  assert.equal((await off.json()).rule.active, false)
  assert.equal(await count(crm, COLL.audit, { action: { $in: ["reminder_rule.create", "reminder_rule.update"] } }), 2)
  await updateRuleHandler(jreq("PATCH", "http://x/r", { active: true }), reqCtx(id), d())
  await deal(crm)
  const run = await (await runRemindersHandler(jreq("POST", "http://x/run"), NO_PARAMS, d())).json()
  assert.equal(run.tally.tasksCreated, 1)
  // lazy: a second stale deal shows up when u1 opens the task list (no schedule in tests -> inline)
  await deal(crm)
  await crm.collection(COLL.locks).deleteMany({})
  const items = (await (await listTasksHandler(jreq("GET", "http://x/t"), NO_PARAMS, apiDeps(crm, { perms: ["crm.view", "crm.leads.view_assigned"] }))).json()).items
  assert.equal(items.length, 2)
})

test("UI: rule descriptions read naturally; Reminders page is in the nav behind crm.settings.edit", async () => {
  const { loadUiFn } = await import("./crm/helpers/ui-fn.mjs")
  const { readFileSync } = await import("node:fs")
  const f = loadUiFn("components/admin/crm/Reminders.tsx", "describeRule")
  const label = s => ({ quotation_sent: "Quotation Sent", new: "New" })[s] ?? s
  assert.equal(f(SUGGESTED_RULES[1], label), "When deal in Quotation Sent for 3+ days: task for the assignee + WhatsApp push (fog_team_task)")
  assert.equal(f(SUGGESTED_RULES[2], label), "When follow-up date reached: task for the assignee + WhatsApp push (fog_team_task)")
  assert.equal(f(SUGGESTED_RULES[5], label), "When service / AMC due within 7 days: WhatsApp the customer (fog_service_reminder, opt-in only)")
  assert.equal(f({ trigger: "stage_stale", stage: "new", days: 1, audience: "assignee", templateName: null }, label), "When deal in New for 1+ day: task for the assignee")
  assert.ok(readFileSync("components/admin/crm/CrmShell.tsx", "utf8").includes('{ href: "/admin/crm/reminders", label: "Reminders", perm: "crm.settings.edit" }'))
})
