// Run: node --import ./tests/support/register.mjs --test --test-concurrency=1 tests/unit/crm-reminders-send.test.mjs
// STEP 7c: crm_jobs runner, staff task pushes (fog_team_task to the assignee's own WhatsApp), customer
// reminders (fog_quote_followup / fog_service_reminder) with send-time re-checks, staff numbers never
// becoming leads, the deal-reminder and staff-number settings APIs. Graph is always an injected fake.
import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { ObjectId } from "mongodb"
import { startMemoryMongo } from "./crm/helpers/memory-mongo.mjs"
import { freshCrm, all, count, post } from "./crm/helpers/wa-harness.mjs"
import { TEST_WA, loadFixtureJson } from "./crm/helpers/wa-sign.mjs"
import { NOW, H, PNID, ago, graphFetch, jreq, reqCtx, apiDeps, seedContact, seedTemplate } from "./crm/helpers/outbound-kit.mjs"
import { COLL } from "../../lib/crm/model.ts"
import { claimJob, finishJob, runJobs, backoffMs, LEASE_MS } from "../../lib/crm/queue/jobs.ts"
import { outcomeOf, maskPhone, istDayTime } from "../../lib/crm/reminders/send.ts"
import { parseRuleInput } from "../../lib/crm/reminders/rules.ts"
import { driveReminders } from "../../lib/crm/reminders/drive.ts"
import { dealRemindersHandler, getStaffHandler, putStaffHandler } from "../../lib/crm/api/reminder-settings.ts"

let m
before(async () => { m = await startMemoryMongo() })
after(async () => { if (m) await m.stop() })
const need = t => { if (!m.ok) { t.skip(m.skip); return false } return true }
const D = 24 * H
const NO_PARAMS = { params: Promise.resolve({}) }
const ENV = { waPhoneNumberIds: [PNID], waAccessToken: TEST_WA.accessToken, waApiVersion: "v23.0" }
const drive = (crm, fetch, o = {}) => driveReminders(crm, { env: o.env ?? ENV, fetch, requestId: "req-rem", now: o.now ?? NOW, lazy: false })
const STAFF = [{ userId: "u1", name: "Asha", waE164: "+919811100001", pushTasks: true }]

async function rule(crm, o) {
  const p = parseRuleInput(o, null)
  assert.ok(p.ok, JSON.stringify(p.fields))
  await crm.collection(COLL.reminderRules).insertOne({ _id: new ObjectId(), ...p.rule, createdBy: { userId: "u1", name: "Asha" }, createdAt: NOW, updatedAt: NOW })
}
async function deal(crm, o = {}) {
  const c = o.contact ?? (await seedContact(crm, { name: o.name ?? "Ramesh Kumar", extra: { language: o.language ?? "en_US", ...(o.contactExtra ?? {}) } }))
  const _id = new ObjectId()
  await crm.collection(COLL.deals).insertOne({
    _id, contactId: c._id, stage: o.stage ?? "quotation_sent", isOpen: o.isOpen ?? true, stageEnteredAt: o.stageEnteredAt ?? ago(4 * D), nextFollowUpAt: null,
    assignedTo: o.assignedTo === undefined ? { userId: "u1", name: "Asha" } : o.assignedTo, customerReminders: o.customerReminders ?? { quoteFollowUp: false, serviceAmc: false },
    lastQuotation: o.lastQuotation ?? null, productInterest: o.productInterest ?? [], won: o.won ?? null, closedAt: o.closedAt ?? null, createdAt: NOW,
  })
  return { dealId: _id, contact: c }
}
const job = (o = {}) => ({ kind: "staff_push", payload: {}, status: "pending", attempts: 0, maxAttempts: 3, nextAttemptAt: ago(1000), leaseUntil: null, leaseOwner: null, lastError: null, idempotencyKey: `k-${new ObjectId()}`, doneAt: null, createdAt: NOW, ...o })

// ───────────────────────── runner ─────────────────────────
test("jobs: claim leases + counts attempts; done gets a 30-day TTL; retry backs off; dead at maxAttempts; failed kept; expired leases are reclaimed", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await crm.collection(COLL.jobs).insertMany([job(), job({ nextAttemptAt: new Date(NOW.getTime() + H) }), job({ kind: "other" })])
  const j = await claimJob(crm, ["staff_push"], "w1", NOW)
  assert.equal(j.status, "leased"); assert.equal(j.attempts, 1); assert.deepEqual(j.leaseUntil, new Date(NOW.getTime() + LEASE_MS))
  assert.equal(await claimJob(crm, ["staff_push"], "w2", NOW), null, "the other is not due; leased one is not re-claimed")
  assert.ok(await claimJob(crm, ["staff_push"], "w2", new Date(NOW.getTime() + LEASE_MS + 1)), "expired lease reclaimed")
  assert.equal(await finishJob(crm, { ...j, leaseOwner: "w1" }, { kind: "done" }, "w1", NOW), "done", "stale owner still records (no-op on the row)")
  const crm2 = await freshCrm(m)
  await crm2.collection(COLL.jobs).insertOne(job())
  const a = await claimJob(crm2, ["staff_push"], "w", NOW)
  assert.equal(await finishJob(crm2, a, { kind: "retry", code: "x", message: "y" }, "w", NOW), "retry")
  let row = (await all(crm2, COLL.jobs))[0]
  assert.equal(row.status, "pending"); assert.deepEqual(row.nextAttemptAt, new Date(NOW.getTime() + backoffMs(1))); assert.equal(row.lastError.retryable, true)
  for (let i = 0; i < 2; i++) {
    const later = new Date(NOW.getTime() + 2 * H * (i + 1))
    const c = await claimJob(crm2, ["staff_push"], "w", later)
    await finishJob(crm2, c, { kind: "retry", code: "x", message: "y" }, "w", later)
  }
  row = (await all(crm2, COLL.jobs))[0]
  assert.equal(row.status, "dead"); assert.equal(row.attempts, 3)
  const crm3 = await freshCrm(m)
  await crm3.collection(COLL.jobs).insertMany([job(), job()])
  const tl = await runJobs(crm3, { staff_push: async () => ({ kind: "failed", code: "nope", message: "n" }) }, { owner: "w", limit: 1, now: () => NOW })
  assert.deepEqual([tl.claimed, tl.failed, tl.stoppedBy], [1, 1, "limit"])
  const done = await runJobs(crm3, { staff_push: async () => ({ kind: "done" }) }, { owner: "w", now: () => NOW })
  assert.equal(done.done, 1)
  const rows = await all(crm3, COLL.jobs)
  assert.ok(rows.find(r => r.status === "done").expireAt > NOW); assert.equal(rows.find(r => r.status === "failed").expireAt, undefined)
  assert.equal(backoffMs(1), 30_000); assert.equal(backoffMs(10), 3_600_000)
})

test("outcomeOf: sent / deduped / half-sent replay / retry handed to wa_send / permanent / gate retry vs fail", () => {
  assert.equal(outcomeOf({ ok: true, deduped: false, message: { status: "sent" } }).kind, "done")
  assert.equal(outcomeOf({ ok: true, deduped: true, message: { status: "delivered" } }).kind, "done")
  assert.deepEqual(outcomeOf({ ok: true, deduped: true, message: { status: "queued" } }).code, "unknown_outcome")
  assert.equal(outcomeOf({ ok: false, status: 502, error: "send_failed", detail: { code: 130429, retryQueued: true } }).note, "handed_to_wa_send_retry")
  assert.equal(outcomeOf({ ok: false, status: 502, error: "send_failed", detail: { code: 131026, retryQueued: false } }).code, "meta_131026")
  assert.equal(outcomeOf({ ok: false, status: 429, error: "tier_cap" }).kind, "retry")
  assert.equal(outcomeOf({ ok: false, status: 409, error: "opted_out" }).kind, "failed")
  assert.equal(maskPhone("+919876543210"), "+91 98XXXXXX10")
  assert.equal(istDayTime(new Date("2026-10-13T05:30:00Z")), "13 Oct 2026, 11:00")
})

// ───────────────────────── staff push ─────────────────────────
test("staff push end-to-end: rule task -> fog_team_task to the assignee's WhatsApp with the template params; staff contact created, never a deal; replay sends nothing", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await crm.collection(COLL.settings).insertOne({ _id: "fogging", staff: STAFF })
  await seedTemplate(crm, { name: "fog_team_task", bodyParamCount: 5 })
  await rule(crm, { name: "Q", trigger: "stage_stale", stage: "quotation_sent", days: 3, templateName: "fog_team_task" })
  const { contact } = await deal(crm, { name: "Ramesh Kumar" })
  const f = graphFetch()
  const r = await drive(crm, f)
  assert.equal(r.evaluated.staffPushQueued, 1); assert.equal(r.jobs.done, 1)
  assert.equal(f.calls.length, 1)
  const body = f.calls[0].body
  assert.equal(body.to, "919811100001"); assert.equal(body.template.name, "fog_team_task"); assert.equal(body.template.language.code, "en_US")
  const [task] = await all(crm, COLL.tasks)
  assert.deepEqual(body.template.components[0].parameters.map(p => p.text), ["Asha", task.title, "Ramesh Kumar", maskPhone(contact.phoneE164), istDayTime(task.dueAt)])
  assert.equal(task.staffPush.status, "sent"); assert.ok(task.staffPush.messageId)
  const staffContact = await crm.collection(COLL.contacts).findOne({ phoneE164: "+919811100001" })
  assert.equal(staffContact.staffUserId, "u1")
  assert.equal(await count(crm, COLL.deals, { contactId: staffContact._id }), 0, "staff never get a deal")
  await drive(crm, f)
  assert.equal(f.calls.length, 1, "nothing re-sent")
})

test("staff push failures: template not approved -> job failed + task marked; assignee without a number -> failed; no Graph call", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await crm.collection(COLL.settings).insertOne({ _id: "fogging", staff: STAFF })
  await rule(crm, { name: "Q", trigger: "stage_stale", stage: "quotation_sent", days: 3, templateName: "fog_team_task" })
  await deal(crm)
  const f = graphFetch()
  const r = await drive(crm, f)
  assert.equal(r.jobs.failed, 1); assert.equal(f.calls.length, 0)
  assert.equal((await all(crm, COLL.jobs))[0].lastError.code, "template_unknown")
  assert.equal((await all(crm, COLL.tasks))[0].staffPush.status, "failed")
  // number removed after queueing
  const crm2 = await freshCrm(m)
  await crm2.collection(COLL.settings).insertOne({ _id: "fogging", staff: STAFF })
  await seedTemplate(crm2, { name: "fog_team_task", bodyParamCount: 5 })
  await rule(crm2, { name: "Q", trigger: "stage_stale", stage: "quotation_sent", days: 3, templateName: "fog_team_task" })
  await deal(crm2)
  await driveReminders(crm2, { env: { ...ENV, waAccessToken: undefined }, requestId: "r", now: NOW, lazy: false })
  assert.equal((await all(crm2, COLL.jobs))[0].status, "pending", "no token: jobs wait")
  await crm2.collection(COLL.settings).updateOne({ _id: "fogging" }, { $set: { staff: [{ ...STAFF[0], waE164: null, pushTasks: false }] } })
  const r2 = await drive(crm2, f)
  assert.equal(r2.jobs.failed, 1); assert.equal((await all(crm2, COLL.jobs))[0].lastError.code, "no_staff_number")
  assert.equal(f.calls.length, 0)
})

test("a WhatsApp message FROM a team member's number marks the contact as staff and opens no deal", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await crm.collection(COLL.settings).insertOne({ _id: "fogging", staff: [{ userId: "u9", name: "Vaibhav", waE164: "+919800000001", pushTasks: true }] })
  await post(crm, loadFixtureJson("text"))
  const c = await crm.collection(COLL.contacts).findOne({ phoneE164: "+919800000001" })
  assert.equal(c.staffUserId, "u9")
  assert.equal(await count(crm, COLL.deals), 0)
})

// ───────────────────────── customer reminders ─────────────────────────
test("customer quotation follow-up end-to-end: fog_quote_followup with name/date/product/number; Hindi contact falls back to en_US", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await seedTemplate(crm, { name: "fog_quote_followup", bodyParamCount: 4 })
  await rule(crm, { name: "Cust", trigger: "stage_stale", stage: "quotation_sent", days: 3, audience: "customer", templateName: "fog_quote_followup" })
  const qid = new ObjectId()
  await crm.collection(COLL.quotations).insertOne({ _id: qid, lines: [{ model: "TF-35" }, { model: "Spares" }], issuedAt: ago(5 * D) })
  const lq = { quotationId: qid, quoteNumber: "100X/QT/2026-27/0007", version: 2, grandTotal: 100, sentAt: new Date("2026-10-06T06:00:00Z") }
  await deal(crm, { language: "hi", customerReminders: { quoteFollowUp: true, serviceAmc: false }, lastQuotation: lq })
  const f = graphFetch()
  const r = await drive(crm, f)
  assert.equal(r.evaluated.customerQueued, 1); assert.equal(r.jobs.done, 1)
  const tpl = f.calls[0].body.template
  assert.equal(tpl.name, "fog_quote_followup"); assert.equal(tpl.language.code, "en_US")
  assert.deepEqual(tpl.components[0].parameters.map(p => p.text), ["Ramesh Kumar", "6 Oct 2026", "TF-35 and 1 more", "100X/QT/2026-27/0007 Rev 2"])
  assert.equal(await count(crm, COLL.sendLedger), 1, "business-initiated, counted")
})

test("customer reminders are re-checked at send time: deal moved on / opt-in switched off -> done without sending; opted out -> gate refuses, no Graph call", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await seedTemplate(crm, { name: "fog_quote_followup", bodyParamCount: 4 })
  await rule(crm, { name: "Cust", trigger: "stage_stale", stage: "quotation_sent", days: 3, audience: "customer", templateName: "fog_quote_followup" })
  const lq = { quotationId: new ObjectId(), quoteNumber: "100X/QT/2026-27/0001", version: 1, grandTotal: 1, sentAt: ago(4 * D) }
  const a = await deal(crm, { customerReminders: { quoteFollowUp: true, serviceAmc: false }, lastQuotation: lq })
  const b = await deal(crm, { customerReminders: { quoteFollowUp: true, serviceAmc: false }, lastQuotation: lq })
  const c = await deal(crm, { customerReminders: { quoteFollowUp: true, serviceAmc: false }, lastQuotation: lq })
  await driveReminders(crm, { env: { ...ENV, waAccessToken: undefined }, requestId: "r", now: NOW, lazy: false })
  assert.equal(await count(crm, COLL.jobs, { status: "pending" }), 3)
  await crm.collection(COLL.deals).updateOne({ _id: a.dealId }, { $set: { stage: "negotiation" } })
  await crm.collection(COLL.deals).updateOne({ _id: b.dealId }, { $set: { "customerReminders.quoteFollowUp": false } })
  await crm.collection(COLL.optOuts).insertOne({ phoneE164: c.contact.phoneE164, scope: "marketing", via: "stop_keyword", at: NOW, by: null, sourceMessageId: null })
  const f = graphFetch()
  const r = await drive(crm, f)
  assert.equal(f.calls.length, 0)
  const jobs = await all(crm, COLL.jobs)
  assert.deepEqual(jobs.map(j => j.note ?? j.lastError?.code).sort(), ["no_longer_due", "opt_in_off", "opted_out"])
  assert.equal(r.jobs.done, 2); assert.equal(r.jobs.failed, 1)
})

test("customer AMC reminder: fog_service_reminder with name / machine / purchase date; a changed AMC date skips the stale job", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await seedTemplate(crm, { name: "fog_service_reminder", bodyParamCount: 3 })
  await rule(crm, { name: "AMC", trigger: "amc_due", days: 7, audience: "customer", templateName: "fog_service_reminder" })
  const c = await seedContact(crm, { name: "Nagar Nigam", extra: { amcDueAt: new Date(NOW.getTime() + 3 * D) } })
  await deal(crm, { contact: c, stage: "closed_won", isOpen: false, closedAt: ago(300 * D), won: { wonAt: new Date("2025-12-15T06:00:00Z") }, productInterest: [{ label: "Thermal Fogger TF-35", qty: 2 }], customerReminders: { quoteFollowUp: false, serviceAmc: true } })
  const f = graphFetch()
  assert.equal((await drive(crm, f)).jobs.done, 1)
  assert.deepEqual(f.calls[0].body.template.components[0].parameters.map(p => p.text), ["Nagar Nigam", "Thermal Fogger TF-35", "15 Dec 2025"])
  const c2 = await seedContact(crm, { extra: { amcDueAt: new Date(NOW.getTime() + 2 * D) } })
  await deal(crm, { contact: c2, stage: "closed_won", isOpen: false, closedAt: ago(10 * D), customerReminders: { quoteFollowUp: false, serviceAmc: true } })
  await driveReminders(crm, { env: { ...ENV, waAccessToken: undefined }, requestId: "r", now: NOW, lazy: false })
  await crm.collection(COLL.contacts).updateOne({ _id: c2._id }, { $set: { amcDueAt: new Date(NOW.getTime() + 200 * D) } })
  await drive(crm, f)
  assert.equal(f.calls.length, 1, "rescheduled AMC: no send")
})

// ───────────────────────── settings APIs ─────────────────────────
test("deal reminders API: toggles + AMC date (also on a closed deal), timeline row + audit, validation, scope 404", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const { dealId, contact } = await deal(crm, { stage: "closed_won", isOpen: false })
  const call = (b, o = {}) => dealRemindersHandler(jreq("PATCH", "http://x/r", b), reqCtx(dealId), apiDeps(crm, { perms: ["crm.view", "crm.leads.edit", "crm.leads.view_all"], ...o }))
  const r = await call({ serviceAmc: true, amcDueAt: "2027-04-12" })
  assert.equal(r.status, 200)
  const j = await r.json()
  assert.deepEqual(j.customerReminders, { quoteFollowUp: false, serviceAmc: true }); assert.equal(j.amcDueAt, "2027-04-12T04:30:00.000Z")
  assert.deepEqual((await crm.collection(COLL.contacts).findOne({ _id: contact._id })).amcDueAt, new Date("2027-04-12T04:30:00Z"))
  const [act] = await all(crm, COLL.activities, { kind: "field_change" })
  assert.match(act.summary, /service reminders on, service due 2027-04-12/)
  assert.equal(await count(crm, COLL.audit, { action: "deal.reminders" }), 1)
  assert.equal((await (await call({ amcDueAt: null })).json()).amcDueAt, null)
  assert.equal((await call({ serviceAmc: "yes" })).status, 400)
  assert.equal((await call({ amcDueAt: "12/04/2027" })).status, 400)
  assert.equal((await call({ other: 1 })).status, 400)
  assert.equal((await call({ serviceAmc: false }, { perms: ["crm.view", "crm.leads.view_all"] })).status, 403)
  assert.equal((await call({ serviceAmc: false }, { perms: ["crm.view", "crm.leads.edit", "crm.leads.view_assigned"], sub: "u7" })).status, 404)
})

test("staff numbers API: lists the team; normalises numbers; rejects bad / duplicate / unassignable; push needs a number; removing a number clears the staff marker", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const d = apiDeps(crm, { perms: ["crm.view", "crm.settings.edit"] })
  const g = await (await getStaffHandler(jreq("GET", "http://x/s"), NO_PARAMS, d)).json()
  assert.deepEqual(g.items, [{ userId: "u1", name: "Asha", waE164: null, pushTasks: false }, { userId: "u2", name: "Ravi", waE164: null, pushTasks: false }])
  const put = b => putStaffHandler(jreq("PUT", "http://x/s", b), NO_PARAMS, d)
  const ok = await put({ staff: [{ userId: "u1", waE164: "98111 00001", pushTasks: true }, { userId: "u2", waE164: "", pushTasks: true }] })
  assert.equal(ok.status, 200)
  assert.deepEqual((await ok.json()).items, [{ userId: "u1", name: "Asha", waE164: "+919811100001", pushTasks: true }, { userId: "u2", name: "Ravi", waE164: null, pushTasks: false }])
  assert.equal((await (await put({ staff: [{ userId: "u1", waE164: "123", pushTasks: true }] })).json()).fields["staff.0.waE164"], "invalid_phone")
  assert.equal((await (await put({ staff: [{ userId: "u1", waE164: "9811100001", pushTasks: true }, { userId: "u2", waE164: "+91 98111 00001", pushTasks: true }] })).json()).fields["staff.1.waE164"], "duplicate_phone")
  assert.equal((await (await put({ staff: [{ userId: "ghost", waE164: null, pushTasks: false }] })).json()).fields["staff.0.userId"], "not_assignable")
  assert.equal((await putStaffHandler(jreq("PUT", "http://x/s", { staff: [] }), NO_PARAMS, apiDeps(crm, { perms: ["crm.view"] }))).status, 403)
  await crm.collection(COLL.contacts).insertOne({ phoneE164: "+919811100001", staffUserId: "u1", mergedInto: null, createdAt: NOW })
  await put({ staff: [{ userId: "u1", waE164: null, pushTasks: false }] })
  assert.equal((await crm.collection(COLL.contacts).findOne({ phoneE164: "+919811100001" })).staffUserId, null)
  assert.equal(await count(crm, COLL.audit, { action: "settings.staff" }), 2)
})

test("UI: AMC date input shows the IST day; lead detail has the customer-reminder box; Reminders page has team numbers", async () => {
  const { loadUiFn } = await import("./crm/helpers/ui-fn.mjs")
  const { readFileSync } = await import("node:fs")
  const f = loadUiFn("components/admin/crm/Tasks.tsx", "isoToIstDateInput")
  assert.equal(f("2027-04-12T04:30:00.000Z"), "2027-04-12")
  assert.equal(f("2027-04-11T19:00:00.000Z"), "2027-04-12", "00:30 IST is already the next day")
  assert.equal(f(null), ""); assert.equal(f("junk"), "")
  assert.ok(readFileSync("components/admin/crm/LeadDetail.tsx", "utf8").includes("<CustomerReminders"))
  assert.ok(readFileSync("components/admin/crm/Reminders.tsx", "utf8").includes("<StaffNumbers />"))
})
