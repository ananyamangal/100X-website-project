// Run: node --import ./tests/support/register.mjs --test tests/unit/crm-stage.test.mjs
// Independent tests (STEP 4c): stage parsing, changeStage, POST /api/crm/deals/:id/stage, UI rupeesToPaise.
import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { ObjectId } from "mongodb"
import { startMemoryMongo } from "./crm/helpers/memory-mongo.mjs"
import { freshCrm, all, count } from "./crm/helpers/wa-harness.mjs"
import { COLL, STAGES, STAGE_LABEL, LOST_REASONS } from "../../lib/crm/model.ts"
import { ROLE_PERMISSIONS } from "../../lib/rbac/roles.ts"
import { parseStageInput, changeStage, MAX_ORDER_PAISE } from "../../lib/crm/leads/stage.ts"
import { dealStageHandler } from "../../lib/crm/api/stage.ts"
import { loadUiFn } from "./crm/helpers/ui-fn.mjs"
import { leadScopeOf } from "../../lib/crm/api/auth.ts"

let m
before(async () => { m = await startMemoryMongo() })
after(async () => { if (m) await m.stop() })
const need = t => { if (!m.ok) { t.skip(m.skip); return false } return true }

const hex = () => new ObjectId().toHexString()
const NOW = new Date("2026-10-10T10:00:00Z")
const OWNER = ROLE_PERMISSIONS.super_admin
const actorOf = (perms, userId = hex()) => ({ userId, name: "Tester Rep", role: "x", permissions: new Set(perms) })
const ALL = { kind: "all" }
const EDIT_ONLY = ["crm.view", "crm.leads.edit", "crm.leads.view_all"]

async function seed(crm, { stage = "new", assignedTo = null, contactAssigned = null, lastQuotation = null, extra = {} } = {}) {
  const contactId = new ObjectId(), dealId = new ObjectId()
  await crm.collection(COLL.contacts).insertOne({ _id: contactId, phoneE164: "+9198" + String(Math.floor(Math.random() * 1e8)).padStart(8, "0"), name: "Ravi Kumar", company: "Ravi Traders", assignedTo: contactAssigned, createdAt: NOW, updatedAt: NOW })
  const closed = stage === "closed_won" || stage === "closed_lost"
  await crm.collection(COLL.deals).insertOne({
    _id: dealId, contactId, stage, stageEnteredAt: NOW, stageHistory: [], isOpen: !closed, leadSource: "call", customerType: "dealer",
    assignedTo, lastQuotation, closedAt: closed ? NOW : null, won: null, lost: null, createdAt: NOW, updatedAt: NOW, ...extra,
  })
  return { contactId, dealId }
}
const deal = (crm, id) => crm.collection(COLL.deals).findOne({ _id: id })
const WON = { stage: "closed_won", invoiceNumber: "INV-2026/001", orderValue: 1250050 }
const LOST = { stage: "closed_lost", lostReason: "price_too_high" }

// ───────────── parseStageInput ─────────────
test("parse: every stage label (slug) is valid; guarded stages need their fields", () => {
  for (const s of STAGES) {
    const body = s === "closed_won" ? WON : s === "closed_lost" ? LOST : { stage: s }
    const r = parseStageInput(body)
    assert.ok(r.ok, s); assert.equal(r.input.stage, s)
  }
  assert.equal(STAGES.length, 13)
  assert.deepEqual(Object.values(STAGE_LABEL), ["New", "Contacted", "Requirement Shared", "Quotation Sent", "Sample Requested", "Negotiation", "PO Received", "Invoice Raised", "Payment Received", "Dispatched", "Closed-Won", "Closed-Lost", "Repeat Enquiry"])
})

test("parse: bad / prototype stage names rejected", () => {
  for (const s of ["__proto__", "constructor", "toString", "hasOwnProperty", "Closed-Won", "NEW", "", "x", 5, null, {}, []]) {
    const r = parseStageInput({ stage: s })
    assert.equal(r.ok, false, String(s)); assert.ok(r.fields.stage, String(s))
  }
  assert.equal(parseStageInput({}).fields.stage, "required")
  assert.equal(parseStageInput({ stage: "new", bogus: 1 }).fields.bogus, "unknown_field")
  const pr = parseStageInput(JSON.parse('{"__proto__":{"polluted":1},"stage":"new"}'))
  assert.equal(({}).polluted, undefined)
  assert.equal(pr.ok, false); assert.equal(Object.getOwnPropertyDescriptor(pr.fields, "__proto__")?.value, "unknown_field")
})

test("parse: closed_won requires invoice + order value", () => {
  assert.deepEqual(parseStageInput({ stage: "closed_won" }).fields, { invoiceNumber: "required", orderValue: "required" })
  assert.equal(parseStageInput({ stage: "closed_won", invoiceNumber: "A1" }).fields.orderValue, "required")
  assert.equal(parseStageInput({ stage: "closed_won", orderValue: 100 }).fields.invoiceNumber, "required")
  assert.equal(parseStageInput({ stage: "closed_won", invoiceNumber: "   ", orderValue: 100 }).fields.invoiceNumber, "required")
})

test("parse: paise bounds", () => {
  const p = v => parseStageInput({ stage: "closed_won", invoiceNumber: "A1", orderValue: v })
  for (const bad of [0, -1, 1.5, "100", NaN, Infinity, MAX_ORDER_PAISE + 1, true, {}, []]) assert.equal(p(bad).fields?.orderValue, "invalid_number", String(bad))
  assert.ok(p(1).ok); assert.ok(p(MAX_ORDER_PAISE).ok)
  assert.equal(p(1).input.orderValue, 1)
})

test("parse: invoice charset + length", () => {
  const p = v => parseStageInput({ stage: "closed_won", invoiceNumber: v, orderValue: 100 })
  for (const good of ["INV-1", "2026/27/0042", "A 12", "inv_9.1", "A#7"]) assert.ok(p(good).ok, good)
  for (const bad of ["-1", "#1", "A<script>", "A'B", 'A"B', "A;B", "A=1", "A\u0000B", "A\nB"]) assert.equal(p(bad).ok, false, JSON.stringify(bad))
  assert.equal(p("x".repeat(61)).fields.invoiceNumber, "too_long")
  assert.ok(p("x".repeat(60)).ok)
  assert.equal(p({}).fields.invoiceNumber, "not_text")
  assert.equal(p(12345).input.invoiceNumber, "12345", "numeric invoice numbers are coerced to text")
  assert.equal(p("  INV-1  ").input.invoiceNumber, "INV-1")
})

test("parse: lost reason dropdown + free text", () => {
  for (const r of LOST_REASONS) {
    if (r === "other") continue
    assert.ok(parseStageInput({ stage: "closed_lost", lostReason: r }).ok, r)
  }
  assert.deepEqual(parseStageInput({ stage: "closed_lost" }).fields, { lostReason: "required" })
  assert.equal(parseStageInput({ stage: "closed_lost", lostReason: "nonsense" }).fields.lostReason, "invalid_enum")
  assert.equal(parseStageInput({ stage: "closed_lost", lostReason: "__proto__" }).fields.lostReason, "invalid_enum")
  assert.equal(parseStageInput({ stage: "closed_lost", lostReason: "other" }).fields.lostReasonText, "required")
  assert.equal(parseStageInput({ stage: "closed_lost", lostReason: "other", lostReasonText: "   " }).fields.lostReasonText, "required")
  const ok = parseStageInput({ stage: "closed_lost", lostReason: "other", lostReasonText: "Bought elsewhere" })
  assert.ok(ok.ok); assert.equal(ok.input.lostReasonText, "Bought elsewhere")
  assert.ok(parseStageInput({ stage: "closed_lost", lostReason: "no_budget", lostReasonText: "client says Q3" }).ok)
  assert.equal(parseStageInput({ stage: "closed_lost", lostReason: "no_budget", lostReasonText: "x".repeat(501) }).fields.lostReasonText, "too_long")
})

test("parse: won fields on non-won stage and lost fields on non-lost stage rejected", () => {
  assert.equal(parseStageInput({ stage: "negotiation", invoiceNumber: "A1" }).fields.invoiceNumber, "only_for_closed_won")
  assert.equal(parseStageInput({ stage: "negotiation", orderValue: 5 }).fields.orderValue, "only_for_closed_won")
  assert.equal(parseStageInput({ stage: "closed_lost", lostReason: "other", lostReasonText: "x", orderValue: 5 }).fields.orderValue, "only_for_closed_won")
  assert.equal(parseStageInput({ stage: "negotiation", lostReason: "other" }).fields.lostReason, "only_for_closed_lost")
  assert.equal(parseStageInput({ stage: "closed_won", ...WON, lostReasonText: "x" }).fields.lostReasonText, "only_for_closed_lost")
  assert.ok(parseStageInput({ stage: "new", invoiceNumber: null, orderValue: "", lostReason: null }).ok)
})

// ───────────── changeStage ─────────────
test("changeStage: unchanged stage -> 400 unchanged; nothing written", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m); const { dealId } = await seed(crm)
  const r = await changeStage(crm, actorOf(OWNER), ALL, dealId, { stage: "new" }, { now: NOW })
  assert.equal(r.ok, false); assert.equal(r.status, 400); assert.equal(r.fields.stage, "unchanged")
  assert.equal((await deal(crm, dealId)).stageHistory.length, 0)
})

test("changeStage: history appended in order with from/to/at/by; stageEnteredAt updated", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m); const { dealId } = await seed(crm)
  const actor = actorOf(OWNER)
  const seq = ["contacted", "requirement_shared", "quotation_sent", "negotiation"]
  let i = 0
  for (const s of seq) {
    const at = new Date(NOW.getTime() + ++i * 60_000)
    const r = await changeStage(crm, actor, ALL, dealId, { stage: s }, { now: at })
    assert.ok(r.ok, s); assert.equal(r.deal.stage, s)
  }
  const d = await deal(crm, dealId)
  assert.equal(d.stage, "negotiation"); assert.equal(d.isOpen, true); assert.equal(d.closedAt, null)
  assert.equal(d.stageHistory.length, 4)
  d.stageHistory.forEach((h, k) => {
    assert.equal(h.from, ["new", ...seq][k]); assert.equal(h.to, seq[k])
    assert.ok(h.at instanceof Date); assert.equal(h.at.getTime(), NOW.getTime() + (k + 1) * 60_000)
    assert.deepEqual(h.by, { userId: actor.userId, name: actor.name })
  })
  assert.equal(d.stageEnteredAt.getTime(), NOW.getTime() + 4 * 60_000)
  assert.ok((await changeStage(crm, actor, ALL, dealId, { stage: "new" }, { now: NOW })).ok, "any-to-any permitted")
})

test("changeStage: closed_won sets closedAt/won; reopen clears with note; lost; won<->lost", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m); const { dealId } = await seed(crm, { stage: "dispatched" })
  const actor = actorOf(OWNER)
  assert.ok((await changeStage(crm, actor, ALL, dealId, WON, { now: NOW })).ok)
  let d = await deal(crm, dealId)
  assert.equal(d.isOpen, false); assert.equal(d.closedAt.getTime(), NOW.getTime()); assert.equal(d.lost, null)
  assert.equal(d.won.invoiceNumber, "INV-2026/001"); assert.equal(d.won.orderValue, 1250050); assert.equal(d.won.wonAt.getTime(), NOW.getTime())
  const later = new Date(NOW.getTime() + 3600_000)
  assert.ok((await changeStage(crm, actor, ALL, dealId, { stage: "negotiation" }, { now: later })).ok)
  d = await deal(crm, dealId)
  assert.equal(d.isOpen, true); assert.equal(d.closedAt, null); assert.equal(d.won, null); assert.equal(d.lost, null)
  const last = d.stageHistory.at(-1)
  assert.equal(last.from, "closed_won"); assert.equal(last.to, "negotiation")
  assert.match(last.note, /cleared won: invoice INV-2026\/001, 1250050 paise/)
  assert.ok((await changeStage(crm, actor, ALL, dealId, { stage: "closed_lost", lostReason: "other", lostReasonText: "Went with rival" }, { now: later })).ok)
  d = await deal(crm, dealId)
  assert.deepEqual({ r: d.lost.reason, t: d.lost.text }, { r: "other", t: "Went with rival" }); assert.equal(d.won, null); assert.equal(d.isOpen, false)
  assert.ok((await changeStage(crm, actor, ALL, dealId, WON, { now: later })).ok)
  d = await deal(crm, dealId)
  assert.equal(d.lost, null); assert.match(d.stageHistory.at(-1).note, /cleared lost: other/)
})

test("changeStage: stale stage -> 409 stage_conflict; concurrent changes: exactly one wins", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m); const { dealId } = await seed(crm)
  const actor = actorOf(OWNER)
  let hit = false
  const dealsWrap = c => ({ findOne: async (...a) => { const r = await c.findOne(...a); if (!hit) { hit = true; await c.updateOne({ _id: dealId }, { $set: { stage: "contacted" } }) } return r }, updateOne: (...a) => c.updateOne(...a) })
  const proxied = Object.create(crm, { collection: { value: n => (n === COLL.deals ? dealsWrap(crm.collection(n)) : crm.collection(n)) } })
  const stale = await changeStage(proxied, actor, ALL, dealId, { stage: "negotiation" }, { now: NOW })
  assert.equal(stale.ok, false); assert.equal(stale.status, 409); assert.equal(stale.error, "stage_conflict")
  const d1 = await deal(crm, dealId)
  assert.equal(d1.stage, "contacted"); assert.equal(d1.stageHistory.length, 0, "losing writer appended no history")

  const { dealId: d2 } = await seed(crm)
  // barrier: both callers read the deal before either writes (a true race)
  let arrived = 0; let release; const gate = new Promise(r => { release = r })
  const racing = Object.create(crm, { collection: { value: n => n !== COLL.deals ? crm.collection(n) : (c => ({
    findOne: async (...a) => { const r = await c.findOne(...a); if (++arrived >= 2) release(); await gate; return r },
    updateOne: (...a) => c.updateOne(...a),
  }))(crm.collection(n)) } })
  const [a, b] = await Promise.all([
    changeStage(racing, actor, ALL, d2, { stage: 'contacted' }, { now: NOW }),
    changeStage(racing, actor, ALL, d2, { stage: 'negotiation' }, { now: NOW }),
  ])
  const oks = [a, b].filter(r => r.ok)
  assert.equal(oks.length, 1, "exactly one concurrent change wins: " + JSON.stringify([a.ok, b.ok, a.error, b.error]))
  const loser = [a, b].find(r => !r.ok)
  assert.equal(loser.status, 409); assert.equal(loser.error, "stage_conflict")
  const d = await deal(crm, d2)
  assert.equal(d.stageHistory.length, 1)
  assert.equal(d.stageHistory[0].to, d.stage)
})

test("changeStage: reopen while another open deal exists -> 409 other_open_deal; deal unchanged", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m); const { dealId, contactId } = await seed(crm, { stage: "closed_lost", extra: { lost: { reason: "no_budget", text: null, lostAt: NOW } } })
  await crm.collection(COLL.deals).insertOne({ contactId, stage: "new", isOpen: true, stageHistory: [], assignedTo: null, createdAt: NOW, updatedAt: NOW })
  const r = await changeStage(crm, actorOf(OWNER), ALL, dealId, { stage: "contacted" }, { now: NOW })
  assert.equal(r.ok, false); assert.equal(r.status, 409); assert.equal(r.error, "other_open_deal")
  const d = await deal(crm, dealId)
  assert.equal(d.stage, "closed_lost"); assert.equal(d.isOpen, false); assert.equal(d.lost.reason, "no_budget"); assert.equal(d.stageHistory.length, 0)
})

test("changeStage: permissions - close needs crm.leads.close; plain stages need only crm.leads.edit; no edit -> 403", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const { dealId } = await seed(crm)
  const editor = actorOf(EDIT_ONLY)
  assert.ok((await changeStage(crm, editor, ALL, dealId, { stage: "contacted" }, { now: NOW })).ok)
  for (const input of [WON, LOST]) {
    const r = await changeStage(crm, editor, ALL, dealId, input, { now: NOW })
    assert.equal(r.status, 403); assert.deepEqual(r.required, ["crm.leads.close"])
  }
  assert.equal((await deal(crm, dealId)).stage, "contacted")
  assert.ok((await changeStage(crm, actorOf([...EDIT_ONLY, "crm.leads.close"]), ALL, dealId, LOST, { now: NOW })).ok)
  const re = await changeStage(crm, editor, ALL, dealId, { stage: "contacted" }, { now: NOW })
  assert.equal(re.status, 403); assert.deepEqual(re.required, ["crm.leads.close"])
  assert.equal((await deal(crm, dealId)).stage, "closed_lost")
  const none = await changeStage(crm, actorOf(["crm.view", "crm.leads.view_all", "crm.leads.close"]), ALL, dealId, { stage: "new" }, { now: NOW })
  assert.equal(none.status, 403); assert.deepEqual(none.required, ["crm.leads.edit"])
})

test("changeStage: scope - out of scope -> 404; in scope via deal or via contact assignment", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const me = hex(), other = hex()
  const mine = await seed(crm, { assignedTo: { userId: me, name: "Me" } })
  const viaContact = await seed(crm, { contactAssigned: { userId: me, name: "Me" } })
  const theirs = await seed(crm, { assignedTo: { userId: other, name: "Other" } })
  const unassigned = await seed(crm)
  const actor = actorOf([...EDIT_ONLY.filter(p => p !== "crm.leads.view_all"), "crm.leads.view_assigned", "crm.leads.close"], me)
  const scope = leadScopeOf(actor); assert.deepEqual(scope, { kind: "assigned", userId: me })
  assert.ok((await changeStage(crm, actor, scope, mine.dealId, { stage: "contacted" }, { now: NOW })).ok)
  assert.ok((await changeStage(crm, actor, scope, viaContact.dealId, { stage: "contacted" }, { now: NOW })).ok)
  for (const o of [theirs, unassigned]) {
    const r = await changeStage(crm, actor, scope, o.dealId, { stage: "contacted" }, { now: NOW })
    assert.equal(r.status, 404); assert.equal(r.error, "not_found")
    assert.equal((await deal(crm, o.dealId)).stage, "new")
  }
  assert.equal((await changeStage(crm, actor, { kind: "none" }, mine.dealId, { stage: "negotiation" }, { now: NOW })).status, 404)
  assert.equal((await changeStage(crm, actor, ALL, new ObjectId(), { stage: "negotiation" }, { now: NOW })).status, 404)
})

test("changeStage: activity row, conversation mirror (open stage vs closed -> null)", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m); const { dealId, contactId } = await seed(crm)
  await crm.collection(COLL.conversations).insertOne({ contactId, stage: "new", status: "open", createdAt: NOW, updatedAt: NOW })
  const actor = actorOf(OWNER)
  assert.ok((await changeStage(crm, actor, ALL, dealId, { stage: "po_received" }, { now: NOW })).ok)
  let acts = await all(crm, COLL.activities, { kind: "stage_change" })
  assert.equal(acts.length, 1); assert.equal(acts[0].summary, "Stage: New to PO Received")
  assert.deepEqual([acts[0].data.from, acts[0].data.to], ["new", "po_received"])
  assert.ok(acts[0].dealId.equals(dealId)); assert.ok(acts[0].contactId.equals(contactId)); assert.equal(acts[0].by.userId, actor.userId)
  assert.equal((await all(crm, COLL.conversations))[0].stage, "po_received")
  assert.ok((await changeStage(crm, actor, ALL, dealId, WON, { now: NOW })).ok)
  assert.equal((await all(crm, COLL.conversations))[0].stage, null)
  acts = await all(crm, COLL.activities, { kind: "stage_change" })
  assert.equal(acts.length, 2)
  assert.equal(acts.find(a => a.data.to === "closed_won").data.orderValue, 1250050)
})

test("changeStage: audit row has ids/enums/numbers; never name, phone, company, free text", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m); const { dealId, contactId } = await seed(crm)
  await changeStage(crm, actorOf(OWNER), ALL, dealId, { stage: "closed_lost", lostReason: "other", lostReasonText: "SECRET-FREE-TEXT-9921" }, { now: NOW, ip: "1.2.3.4", userAgent: "UA" })
  await changeStage(crm, actorOf(OWNER), ALL, dealId, WON, { now: NOW })
  const rows = await all(crm, COLL.audit, { action: "deal.stage_change" })
  assert.equal(rows.length, 2)
  const dump = JSON.stringify(rows)
  for (const pii of ["Ravi Kumar", "Ravi Traders", "+9198", "SECRET-FREE-TEXT-9921"]) assert.ok(!dump.includes(pii), pii)
  const lost = rows.find(r => r.after.stage === "closed_lost"), won = rows.find(r => r.after.stage === "closed_won")
  assert.equal(lost.targetId, dealId.toHexString()); assert.equal(lost.before.stage, "new"); assert.equal(lost.after.lostReason, "other"); assert.equal(lost.after.contactId, contactId.toHexString()); assert.equal(lost.ip, "1.2.3.4")
  // invoice number + value are business data kept in the audit trail (per code)
  assert.equal(won.after.orderValuePaise, 1250050); assert.equal(won.after.invoiceNumber, "INV-2026/001")
})

// ───────────── conversion ─────────────
async function withAttribution(crm, contactId, dealId, click = { gclid: "G-CLICK-1" }) {
  await crm.collection(COLL.attribution).insertOne({ _id: "sub-" + hex(), dealId, contactId, submissionId: null, gclid: null, gbraid: null, wbraid: null, utm: {}, landingPage: null, formPage: null, completedAt: NOW, capturedAt: NOW, ...click })
}
async function envSync(v, fn) {
  const old = process.env.CRM_GROWTH_OS_SYNC
  if (v === undefined) delete process.env.CRM_GROWTH_OS_SYNC; else process.env.CRM_GROWTH_OS_SYNC = v
  try { return await fn() } finally { if (old === undefined) delete process.env.CRM_GROWTH_OS_SYNC; else process.env.CRM_GROWTH_OS_SYNC = old }
}

test("conversion: sync ON + click id -> one event; reopen keeps it; re-win does not duplicate", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m); const { dealId, contactId } = await seed(crm, { stage: "dispatched" })
  await withAttribution(crm, contactId, dealId)
  await envSync("1", async () => {
    const actor = actorOf(OWNER)
    assert.ok((await changeStage(crm, actor, ALL, dealId, WON, { now: NOW })).ok)
    let ev = await all(crm, COLL.conversionEvents)
    assert.equal(ev.length, 1); assert.equal(ev[0].kind, "closed_won"); assert.equal(ev[0].value, 1250050); assert.equal(ev[0].orderId, dealId.toHexString() + ":won"); assert.equal(ev[0].gclid, "G-CLICK-1")
    assert.ok((await changeStage(crm, actor, ALL, dealId, { stage: "negotiation" }, { now: NOW })).ok)
    assert.equal(await count(crm, COLL.conversionEvents), 1, "reopen does not delete the event")
    assert.ok((await changeStage(crm, actor, ALL, dealId, WON, { now: NOW })).ok)
    ev = await all(crm, COLL.conversionEvents)
    assert.equal(ev.length, 1)
  })
})

test("conversion: sync OFF -> none; no click id -> none; lost -> none", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const a = await seed(crm, { stage: "dispatched" }); await withAttribution(crm, a.contactId, a.dealId)
  await envSync("off", async () => { assert.ok((await changeStage(crm, actorOf(OWNER), ALL, a.dealId, WON, { now: NOW })).ok) })
  assert.equal(await count(crm, COLL.conversionEvents), 0)
  const b = await seed(crm, { stage: "dispatched" })
  await envSync("1", async () => { assert.ok((await changeStage(crm, actorOf(OWNER), ALL, b.dealId, WON, { now: NOW })).ok) })
  assert.equal(await count(crm, COLL.conversionEvents), 0)
  const c = await seed(crm); await withAttribution(crm, c.contactId, c.dealId)
  await envSync("1", async () => { assert.ok((await changeStage(crm, actorOf(OWNER), ALL, c.dealId, LOST, { now: NOW })).ok) })
  assert.equal(await count(crm, COLL.conversionEvents), 0)
})

test("conversion: manual move to quotation_sent never records an event (quotation module does, step 6)", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const q = { quotationId: new ObjectId(), quoteNumber: "Q-2026-001", version: 1, grandTotal: 500000, sentAt: NOW }
  const a = await seed(crm, { lastQuotation: q }); await withAttribution(crm, a.contactId, a.dealId)
  await envSync("1", async () => {
    assert.ok((await changeStage(crm, actorOf(OWNER), ALL, a.dealId, { stage: "quotation_sent" }, { now: NOW })).ok)
  })
  assert.equal(await count(crm, COLL.conversionEvents), 0)
})

test("mirror: closed->closed leaves conversation alone; reopen recomputes from the open deal; mirror failure keeps activity + ok", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m); const { dealId, contactId } = await seed(crm)
  await crm.collection(COLL.conversations).insertOne({ contactId, stage: "new", status: "open", createdAt: NOW, updatedAt: NOW })
  const actor = actorOf(OWNER)
  assert.ok((await changeStage(crm, actor, ALL, dealId, WON, { now: NOW })).ok)
  await crm.collection(COLL.conversations).updateMany({ contactId }, { $set: { stage: "sentinel" } })
  assert.ok((await changeStage(crm, actor, ALL, dealId, LOST, { now: NOW })).ok)
  assert.equal((await all(crm, COLL.conversations))[0].stage, "sentinel", "closed->closed skips the mirror")
  assert.ok((await changeStage(crm, actor, ALL, dealId, { stage: "negotiation" }, { now: NOW })).ok)
  assert.equal((await all(crm, COLL.conversations))[0].stage, "negotiation")
  const broken = Object.create(crm, { collection: { value: n => { if (n === COLL.conversations) throw new Error("boom"); return crm.collection(n) } } })
  const orig = console.error; console.error = () => {}
  let r; try { r = await changeStage(broken, actor, ALL, dealId, { stage: "contacted" }, { now: NOW }) } finally { console.error = orig }
  assert.ok(r.ok)
  assert.equal((await all(crm, COLL.activities, { kind: "stage_change" })).filter(a => a.data.to === "contacted").length, 1)
})

test("changeStage: re-read failure after a successful write returns the computed deal, not an error", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m); const { dealId } = await seed(crm)
  const real = crm.collection(COLL.deals)
  let n = 0
  const flaky = new Proxy(real, { get(t2, k) { if (k === "findOne") return async (...a) => { if (++n >= 2) throw new Error("read boom"); return t2.findOne(...a) }; const v = t2[k]; return typeof v === "function" ? v.bind(t2) : v } })
  const broken = Object.create(crm, { collection: { value: nm => (nm === COLL.deals ? flaky : crm.collection(nm)) } })
  const orig = console.error; console.error = () => {}
  let r; try { r = await changeStage(broken, actorOf(OWNER), ALL, dealId, { stage: "negotiation" }, { now: NOW }) } finally { console.error = orig }
  assert.ok(r.ok); assert.equal(r.deal.stage, "negotiation"); assert.equal(r.deal.isOpen, true)
  assert.equal(r.deal.stageHistory.at(-1).to, "negotiation")
})

test("conversion: recordConversionEvent throwing never fails the stage change", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m); const { dealId, contactId } = await seed(crm, { stage: "dispatched" })
  await withAttribution(crm, contactId, dealId)
  const broken = Object.create(crm, { collection: { value: n => { if (n === COLL.attribution) throw new Error("attribution boom"); return crm.collection(n) } } })
  const errs = []; const orig = console.error; console.error = (...a) => errs.push(a.join(" "))
  let r
  try { r = await envSync("1", () => changeStage(broken, actorOf(OWNER), ALL, dealId, WON, { now: NOW })) } finally { console.error = orig }
  assert.ok(r.ok, "stage change still ok"); assert.equal(r.deal.stage, "closed_won")
  assert.equal((await deal(crm, dealId)).stage, "closed_won")
  assert.ok(errs.some(l => l.includes("conversion event failed")))
  assert.ok(!errs.join("\n").includes("attribution boom"), "error message not logged (only name)")
})

// ───────────── HTTP handler ─────────────
const mkDeps = (crm, perms, user = { sub: hex(), name: "Rep", role: "sales_manager" }) => ({
  getDb: async () => crm,
  auth: { getUser: async () => user, resolvePermissions: async () => perms },
  now: () => NOW,
})
const call = (deps, id, body) => dealStageHandler(new Request("http://x/api/crm/deals/" + id + "/stage", { method: "POST", headers: { "content-type": "application/json", "user-agent": "t/1" }, body: typeof body === "string" ? body : JSON.stringify(body) }), { params: Promise.resolve({ id: String(id) }) }, deps)

test("handler: 401, 403 w/o edit, 400 invalid id/json/fields, 200 ok, 403 close perm, 404", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m); const { dealId } = await seed(crm)
  const id = dealId.toHexString()
  let r = await call({ ...mkDeps(crm, OWNER), auth: { getUser: async () => null, resolvePermissions: async () => OWNER } }, id, { stage: "contacted" })
  assert.equal(r.status, 401)
  r = await call(mkDeps(crm, ["crm.view", "crm.leads.view_all"]), id, { stage: "contacted" })
  assert.equal(r.status, 403); assert.ok((await r.json()).required.includes("crm.leads.edit"))
  r = await call(mkDeps(crm, ["crm.leads.edit", "crm.leads.view_all"]), id, { stage: "contacted" })
  assert.equal(r.status, 403, "crm.view required")
  const d = mkDeps(crm, EDIT_ONLY)
  r = await call(d, "nothex", { stage: "contacted" }); assert.equal(r.status, 400)
  r = await call(d, id, "garbage"); assert.equal(r.status, 400); assert.equal((await r.json()).error, "invalid_json")
  r = await call(d, id, { stage: "closed_won" })
  assert.equal(r.status, 400); assert.deepEqual((await r.json()).fields, { invoiceNumber: "required", orderValue: "required" })
  r = await call(d, id, WON); assert.equal(r.status, 403)
  r = await call(d, id, { stage: "contacted" }); assert.equal(r.status, 200)
  const body = await r.json(); assert.equal(body.deal.stage, "contacted")
  assert.ok(r.headers.get("x-request-id"))
  r = await call(d, id, { stage: "contacted" }); assert.equal(r.status, 400)
  r = await call(d, hex(), { stage: "contacted" }); assert.equal(r.status, 404)
  r = await call(mkDeps(crm, [...EDIT_ONLY, "crm.leads.close"]), id, WON); assert.equal(r.status, 200)
  assert.equal((await r.json()).deal.stage, "closed_won")
})

// ───────────── role fallback permission FINDING ─────────────
test("FINDING role mapping: sales_manager / sales_executive hold crm.leads.close + crm.reports.view", () => {
  const rows = {}
  for (const role of ["super_admin", "sales_manager", "sales_executive"]) {
    const p = ROLE_PERMISSIONS[role]
    rows[role] = { close: p.includes("crm.leads.close"), reports: p.includes("crm.reports.view"), edit: p.includes("crm.leads.edit"), viewAll: p.includes("crm.leads.view_all"), viewAssigned: p.includes("crm.leads.view_assigned") }
  }
  console.log("ROLE-MAP " + JSON.stringify(rows))
  for (const r of ["sales_manager", "sales_executive"]) { assert.ok(rows[r].close, r + " can close deals"); assert.ok(rows[r].reports, r + " can view reports"); assert.ok(rows[r].edit, r) }
  assert.ok(rows.sales_manager.viewAll); assert.ok(rows.sales_executive.viewAssigned && !rows.sales_executive.viewAll)
})

// ───────────── UI helper ─────────────
test('UI rupeesToPaise', () => {
  const f = loadUiFn('components/admin/crm/StageControl.tsx', 'rupeesToPaise')
  assert.equal(f('12,500.50'), 1250050); assert.equal(f('0'), null); assert.equal(f('0.00'), null); assert.equal(f('₹5'), 500)
  assert.equal(f('1.234'), null, '3 decimals rejected, not rounded')
  assert.equal(f('5.5'), 550); assert.equal(f('5.'), null); assert.equal(f(''), null); assert.equal(f('abc'), null); assert.equal(f('-5'), null)
  assert.equal(f(' ₹ 1,00,000 '), 10000000); assert.equal(f('125000'), 12500000)
  assert.equal(f('1'.repeat(13)), null, '13 integer digits rejected')
  const cap = f('10000000000')
  assert.equal(cap, MAX_ORDER_PAISE)
  assert.equal(parseStageInput({ stage: 'closed_won', invoiceNumber: 'A1', orderValue: cap }).ok, true)
})
