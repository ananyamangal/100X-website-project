// Run: node --import ./tests/support/register.mjs --test --test-concurrency=1 tests/unit/crm-tasks.test.mjs
// STEP 7a tasks: IST buckets, validation, create/assign rules, lead scope, own-task completion,
// task_done timeline row, audit.
import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { ObjectId } from "mongodb"
import { startMemoryMongo } from "./crm/helpers/memory-mongo.mjs"
import { freshCrm, all, count } from "./crm/helpers/wa-harness.mjs"
import { NOW, jreq, reqCtx, apiDeps, seedContact } from "./crm/helpers/outbound-kit.mjs"
import { COLL } from "../../lib/crm/model.ts"
import { bucketOf, istDayStart, parseTaskInput } from "../../lib/crm/tasks/service.ts"
import { createTaskHandler, listTasksHandler, updateTaskHandler } from "../../lib/crm/api/tasks.ts"

let m
before(async () => { m = await startMemoryMongo() })
after(async () => { if (m) await m.stop() })
const need = t => { if (!m.ok) { t.skip(m.skip); return false } return true }
const NO_PARAMS = { params: Promise.resolve({}) }
const body = r => r.json()
const MANAGER = ["crm.view", "crm.tasks.manage", "crm.leads.assign", "crm.leads.view_all"]
const SALES = ["crm.view", "crm.tasks.manage", "crm.leads.view_assigned"]
const VIEWER = ["crm.view", "crm.leads.view_assigned"]
const create = (crm, b, o = {}) => createTaskHandler(jreq("POST", "http://x/t", b), NO_PARAMS, apiDeps(crm, { perms: MANAGER, ...o }))
const list = (crm, q = "", o = {}) => listTasksHandler(jreq("GET", `http://x/t${q}`), NO_PARAMS, apiDeps(crm, { perms: MANAGER, ...o }))
const patch = (crm, id, b, o = {}) => updateTaskHandler(jreq("PATCH", "http://x/t", b), reqCtx(id), apiDeps(crm, { perms: MANAGER, ...o }))

test("IST day buckets: overdue / today / upcoming / done (NOW = 15:30 IST)", () => {
  assert.equal(istDayStart(NOW).toISOString(), "2026-10-09T18:30:00.000Z")
  const b = d => bucketOf({ status: "open", dueAt: new Date(d) }, NOW)
  assert.equal(b("2026-10-09T18:29:59Z"), "overdue")
  assert.equal(b("2026-10-09T18:30:00Z"), "today")
  assert.equal(b("2026-10-10T18:29:59Z"), "today")
  assert.equal(b("2026-10-10T18:30:00Z"), "upcoming")
  assert.equal(bucketOf({ status: "done", dueAt: new Date(0) }, NOW), "done")
})

test("parseTaskInput: required, unknown/prototype keys, dates, deal needs contact, empty patch", () => {
  assert.deepEqual(Object.keys(parseTaskInput({}, "create").fields).sort(), ["dueAt", "title"])
  assert.equal(parseTaskInput(JSON.parse('{"title":"x","dueAt":"2026-10-11","__proto__":1}'), "create").fields.__proto__, "unknown_field")
  assert.equal(parseTaskInput({ title: "x", dueAt: "soon" }, "create").fields.dueAt, "invalid_date")
  assert.equal(parseTaskInput({ title: "x", dueAt: "1999-01-01" }, "create").fields.dueAt, "out_of_range")
  assert.equal(parseTaskInput({ title: "x", dueAt: "2026-10-11", dealId: "a".repeat(24) }, "create").fields.contactId, "required_with_deal")
  assert.equal(parseTaskInput({}, "patch").fields.body, "empty")
  assert.equal(parseTaskInput({ status: "later" }, "patch").fields.status, "invalid_enum")
  assert.equal(parseTaskInput({ contactId: "a".repeat(24) }, "patch").fields.contactId, "unknown_field")
})

test("create: defaults to me; assigning others needs crm.leads.assign and an assignable user; contact/deal must be visible and match", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await seedContact(crm)
  const dealId = new ObjectId()
  await crm.collection(COLL.deals).insertOne({ _id: dealId, contactId: c._id, stage: "new", isOpen: true, assignedTo: null, createdAt: NOW })
  const r = await create(crm, { title: "Call back about TF-35", dueAt: "2026-10-11T05:00:00Z", contactId: String(c._id), dealId: String(dealId) })
  assert.equal(r.status, 201)
  const tk = (await body(r)).task
  assert.equal(tk.assignedTo.userId, "u1"); assert.equal(tk.status, "open"); assert.equal(tk.bucket, "upcoming")
  assert.equal(tk.contact.id, String(c._id)); assert.ok(tk.contact.name)
  assert.equal((await create(crm, { title: "x", dueAt: "2026-10-11", assignedTo: "u2" })).status, 201)
  assert.equal((await create(crm, { title: "x", dueAt: "2026-10-11", assignedTo: "u2" }, { perms: SALES })).status, 403)
  assert.equal((await body(await create(crm, { title: "x", dueAt: "2026-10-11", assignedTo: "ghost" }))).fields.assignedTo, "not_assignable")
  assert.equal((await body(await create(crm, { title: "x", dueAt: "2026-10-11", contactId: String(c._id), dealId: String(new ObjectId()) }))).fields.dealId, "not_of_contact")
  assert.equal((await create(crm, { title: "x", dueAt: "2026-10-11", contactId: String(c._id) }, { perms: SALES, sub: "u2" })).status, 404, "contact not visible to u2")
  assert.equal((await create(crm, { title: "x", dueAt: "2026-10-11" }, { perms: VIEWER })).status, 403, "crm.tasks.manage required")
  const aud = await all(crm, COLL.audit, { action: "task.create" })
  assert.equal(aud.length, 2); assert.ok(!JSON.stringify(aud).includes("TF-35"), "no title in audit")
})

test("list: mine (default) sorted by due; all needs view_all; contact view follows lead scope; done list", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await seedContact(crm, { assignedTo: { userId: "u2", name: "Ravi" } })
  await create(crm, { title: "later", dueAt: "2026-10-20T05:00:00Z" })
  await create(crm, { title: "overdue", dueAt: "2026-10-01T05:00:00Z" })
  await create(crm, { title: "ravi's", dueAt: "2026-10-12T05:00:00Z", assignedTo: "u2", contactId: String(c._id) })
  const mine = (await body(await list(crm))).items
  assert.deepEqual(mine.map(x => x.title), ["overdue", "later"])
  assert.deepEqual(mine.map(x => x.bucket), ["overdue", "upcoming"])
  assert.equal((await body(await list(crm, "?view=all"))).items.length, 3)
  assert.equal((await list(crm, "?view=all", { perms: SALES, sub: "u2" })).status, 403)
  assert.equal((await body(await list(crm, "", { perms: SALES, sub: "u2" }))).items[0].title, "ravi's")
  assert.equal((await body(await list(crm, `?contactId=${c._id}`, { perms: VIEWER, sub: "u2" }))).items.length, 1, "u2 owns the contact")
  assert.equal((await list(crm, `?contactId=${c._id}`, { perms: VIEWER, sub: "u3" })).status, 404)
  assert.equal((await list(crm, "?status=nope")).status, 400)
  assert.equal((await body(await list(crm, "?status=done"))).items.length, 0)
})

test("update: assignee completes own task with crm.view only; task_done timeline row; reopen; others' tasks need crm.tasks.manage; edits audited; stale write -> 409", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await seedContact(crm, { assignedTo: { userId: "u2", name: "Ravi" } })
  const tk = (await body(await create(crm, { title: "Send price list", dueAt: "2026-10-11T05:00:00Z", assignedTo: "u2", contactId: String(c._id) }))).task
  const done = await patch(crm, tk.id, { status: "done" }, { perms: VIEWER, sub: "u2" })
  assert.equal(done.status, 200)
  const d = (await body(done)).task
  assert.equal(d.status, "done"); assert.ok(d.doneAt); assert.equal(d.bucket, "done")
  const [act] = await all(crm, COLL.activities, { kind: "task_done" })
  assert.equal(String(act.contactId), String(c._id)); assert.match(act.summary, /Send price list/)
  assert.equal((await patch(crm, tk.id, { status: "open" }, { perms: VIEWER, sub: "u2" })).status, 200)
  assert.equal((await patch(crm, tk.id, { dueAt: "2026-10-15T05:00:00Z" }, { perms: VIEWER, sub: "u2" })).status, 403, "rescheduling = management")
  assert.equal((await patch(crm, tk.id, { status: "done" }, { perms: ["crm.view", "crm.leads.view_assigned"], sub: "u3" })).status, 404, "not visible to u3")
  assert.equal((await patch(crm, tk.id, { status: "cancelled", assignedTo: "u1" })).status, 200)
  assert.equal(await count(crm, COLL.activities, { kind: "task_done" }), 1, "cancel writes no task_done")
  const aud = await crm.collection(COLL.audit).find({ action: "task.update" }).sort({ _id: 1 }).toArray()
  assert.equal(aud.length, 3); assert.equal(aud[2].after.status, "cancelled")
  // optimistic concurrency: another write landing between this request's read and its update -> 409
  // (crm is frozen, so copy it rather than proxy it)
  const racing = {
    ...crm,
    collection(name) {
      const c = crm.collection(name)
      if (name !== COLL.tasks) return c
      return new Proxy(c, { get(ct, p) {
        if (p === "findOne") return async (...args) => { const d = await ct.findOne(...args); if (d) await ct.updateOne({ _id: d._id }, { $inc: { rev: 1 } }); return d }
        const v = Reflect.get(ct, p); return typeof v === "function" ? v.bind(ct) : v
      } })
    },
  }
  const stale = await updateTaskHandler(jreq("PATCH", "http://x/t", { title: "A" }), reqCtx(tk.id), { ...apiDeps(crm, { perms: MANAGER }), getDb: async () => racing })
  assert.equal(stale.status, 409)
  assert.equal((await patch(crm, tk.id, { title: "B" })).status, 200, "a fresh write succeeds")
})

test("UI: datetime-local input -> ISO (browser local time); Tasks page is in the CRM nav and lead detail has a Tasks tab", async () => {
  const { loadUiFn } = await import("./crm/helpers/ui-fn.mjs")
  const { readFileSync } = await import("node:fs")
  const f = loadUiFn("components/admin/crm/Tasks.tsx", "localInputToIso")
  assert.equal(f("2026-10-11T05:30"), new Date("2026-10-11T05:30").toISOString())
  for (const bad of ["", "2026-10-11", "11/10/2026 05:30", "2026-13-40T99:99"]) assert.equal(f(bad), null, bad)
  assert.ok(readFileSync("components/admin/crm/CrmShell.tsx", "utf8").includes('href: "/admin/crm/tasks"'))
  assert.ok(readFileSync("components/admin/crm/LeadDetail.tsx", "utf8").includes("<TaskPanel"))
})
