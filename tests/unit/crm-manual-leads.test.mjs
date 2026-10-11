// Run: node --import ./tests/support/register.mjs --test tests/unit/crm-manual-leads.test.mjs
// Independent tests (3d + lead APIs): manual call entry, internal-note separation, lead list/search,
// contact reads, PATCH deals.
import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { ObjectId } from "mongodb"
import { startMemoryMongo } from "./crm/helpers/memory-mongo.mjs"
import { freshCrm, all, count } from "./crm/helpers/wa-harness.mjs"
import { COLL } from "../../lib/crm/model.ts"
import { ROLE_PERMISSIONS } from "../../lib/rbac/roles.ts"
import { listLeadsHandler, createLeadHandler } from "../../lib/crm/api/leads.ts"
import { contactDetailHandler, contactTimelineHandler, patchDealHandler } from "../../lib/crm/api/contacts.ts"
import { listNotesHandler, createNoteHandler } from "../../lib/crm/api/notes.ts"
import { validateManualLead } from "../../lib/crm/leads/manual.ts"

let m
before(async () => { m = await startMemoryMongo() })
after(async () => { if (m) await m.stop() })
const rawDb = crm => m.client.db(crm.databaseName)
const need = t => { if (!m.ok) { t.skip(m.skip); return false } return true }

const SALES_BASE = ROLE_PERMISSIONS.sales_manager
const OWNER = ROLE_PERMISSIONS.super_admin
const hex = () => new ObjectId().toHexString()
const USERS = [{ id: hex(), name: "Asha Rep" }, { id: hex(), name: "Bhanu Rep" }]
const NOTE = "ZEBRA-SECRET-NOTE-4821 wants 40% discount, mentions Kumar"

function mk(crm, { userId = hex(), name = "Caller Sales", perms = OWNER, role = "super_admin" } = {}) {
  return {
    userId, name,
    deps: {
      getDb: async () => crm,
      auth: { getUser: async () => ({ sub: userId, name, role }), resolvePermissions: async () => perms },
      assignable: async () => USERS,
      now: () => new Date("2026-10-10T10:00:00Z"),
    },
  }
}
const json = (method, url, body) => new Request(url, { method, headers: { "content-type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) })
const P = id => ({ params: Promise.resolve({ id: String(id) }) })
const NOP = { params: Promise.resolve({}) }
const post = (deps, body) => createLeadHandler(json("POST", "http://x/api/crm/leads", body), NOP, deps)
const get = async (h, deps, url, id) => { const r = await h(new Request(url), id ? P(id) : NOP, deps); return { status: r.status, body: await r.json() } }
const BASE = { mobile: "98765 43210", leadSource: "Call", name: "Ravi Kumar", company: "Ravi Traders" }

async function captureConsole(fn) {
  const lines = []
  const orig = { log: console.log, error: console.error, warn: console.warn, info: console.info }
  for (const k of Object.keys(orig)) console[k] = (...a) => lines.push(a.map(x => (typeof x === "string" ? x : JSON.stringify(x))).join(" "))
  try { await fn() } finally { Object.assign(console, orig) }
  return lines
}

// ───────────────────────── validation ─────────────────────────
test("validation: required fields, enum labels exactly as the brief, lengths, types", () => {
  const f = b => validateManualLead(b)
  assert.deepEqual(f({}).fields, { mobile: "required", leadSource: "required" })
  assert.equal(f({ mobile: "   ", leadSource: "Call" }).fields.mobile, "required")
  assert.equal(f({ mobile: "12345", leadSource: "Call" }).fields.mobile, "invalid_phone")
  // letters-only input is stripped to empty by fromHumanInput, so the field reports "required" (cosmetic; reported)
  assert.ok(["required", "invalid_phone"].includes(f({ mobile: "abcdefghij", leadSource: "Call" }).fields.mobile))
  assert.equal(f({ mobile: "9".repeat(16), leadSource: "Call" }).fields.mobile, "invalid_phone")
  assert.equal(f({ mobile: "987654321", leadSource: "Call" }).fields.mobile, "invalid_phone")
  assert.equal(f({ mobile: "9876543210", leadSource: "Fax" }).fields.leadSource, "invalid_enum")
  assert.equal(f({ mobile: "9876543210", leadSource: "Call", customerType: "Wholesaler" }).fields.customerType, "invalid_enum")
  // labels from the brief
  const types = { Dealer: "dealer", "GeM supplier": "gem_supplier", "Government dept": "govt_dept", "Government officer": "govt_officer", B2C: "b2c", Other: "other" }
  for (const [label, slug] of Object.entries(types)) {
    const r = f({ mobile: "9876543210", leadSource: "Call", customerType: label })
    assert.ok(r.ok, label); assert.equal(r.input.customerType, slug, label)
    assert.equal(f({ mobile: "9876543210", leadSource: "Call", customerType: slug }).input.customerType, slug)
  }
  const sources = { Call: "call", WhatsApp: "whatsapp", Website: "website", GeM: "gem", Referral: "referral", "Existing dealer": "existing_dealer" }
  for (const [label, slug] of Object.entries(sources)) {
    const r = f({ mobile: "9876543210", leadSource: label })
    assert.ok(r.ok, label); assert.equal(r.input.leadSource, slug, label)
  }
  assert.equal(f({ mobile: "9876543210", leadSource: "Call", name: "x".repeat(121) }).fields.name, "too_long")
  assert.equal(f({ mobile: "9876543210", leadSource: "Call", company: "x".repeat(161) }).fields.company, "too_long")
  assert.equal(f({ mobile: "9876543210", leadSource: "Call", name: "a\u0000b" }).fields.name, "invalid_characters")
  assert.equal(f({ mobile: "9876543210", leadSource: "Call", name: { a: 1 } }).fields.name, "not_text")
  assert.equal(f({ mobile: "9876543210", leadSource: "Call", notes: "n".repeat(4001) }).fields.notes, "too_long")
  assert.equal(f({ mobile: "9876543210", leadSource: "Call", notes: 5 }).fields.notes, "not_text")
  assert.equal(f({ mobile: "9876543210", leadSource: "Call", quantity: 5 }).fields.product, "required_with_quantity")
  for (const q of [0, -1, 1.5, "abc", 1_000_001]) assert.equal(f({ mobile: "9876543210", leadSource: "Call", product: "p", quantity: q }).fields.quantity, "invalid_number", String(q))
  assert.ok(f({ mobile: "9876543210", leadSource: "Call", product: "p", quantity: "12" }).ok)
  assert.equal(f({ mobile: "9876543210", leadSource: "Call", assignedTo: "nope" }).fields.assignedTo, "invalid_id")
  assert.ok(f({ mobile: "9876543210", leadSource: "Call", notes: "   " }).ok, "blank notes are ignored")
  assert.equal(f({ mobile: "9876543210", leadSource: "Call", notes: "  " }).input.notes, null)
})

test("API validation: 400 validation with fields, invalid_json for non-object / garbage / oversize; nothing written", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const { deps } = mk(crm)
  let r = await post(deps, { leadSource: "Call" })
  assert.equal(r.status, 400); assert.deepEqual(await r.json(), { error: "validation", fields: { mobile: "required" } })
  for (const bad of ["not json", "[1,2]", "null", '"s"', ""]) {
    r = await post(deps, bad); assert.equal(r.status, 400, bad); assert.equal((await r.json()).error, "invalid_json", bad)
  }
  r = await post(deps, { ...BASE, notes: "n".repeat(70_000) })
  assert.equal(r.status, 400)
  assert.equal(await count(crm, COLL.contacts), 0); assert.equal(await count(crm, COLL.deals), 0)
})

// ───────────────────────── phone formats + dedupe ─────────────────────────
test("phone formats all resolve to the same contact (no duplicate); 201 first then 200", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const { deps } = mk(crm)
  const forms = ["98765 43210", "+91-98765-43210", "09876543210", "919876543210", "0091 98765 43210", "(+91) 98765 43210", "+919876543210"]
  const results = []
  for (const mobile of forms) {
    const r = await post(deps, { ...BASE, mobile })
    results.push({ status: r.status, body: await r.json(), mobile })
  }
  assert.equal(results[0].status, 201); assert.equal(results[0].body.created, true)
  for (const r of results.slice(1)) {
    assert.equal(r.status, 200, r.mobile)
    assert.equal(r.body.created, false, r.mobile)
    assert.equal(r.body.contactId, results[0].body.contactId, r.mobile)
    assert.equal(r.body.dealId, results[0].body.dealId, "open deal attached: " + r.mobile)
    assert.equal(r.body.dealCreated, false)
  }
  assert.equal(await count(crm, COLL.contacts), 1)
  assert.equal(await count(crm, COLL.deals), 1)
  const [c] = await all(crm, COLL.contacts)
  assert.equal(c.phoneE164, "+919876543210"); assert.equal(c.waId, "919876543210")
  // other kinds
  let r = await post(deps, { ...BASE, mobile: "+1 415 555 2671" })
  assert.equal(r.status, 201)
  assert.equal((await crm.collection(COLL.contacts).findOne({ phoneE164: "+14155552671" })).phoneKind, "international")
  r = await post(deps, { ...BASE, mobile: "0124 4567890" })
  const j = await r.json()
  assert.ok(r.status === 201 || r.status === 400, "STD-style 10 digit starting 1-5 is unverified_mobile or rejected, never a crash")
  void j
  r = await post(deps, { ...BASE, mobile: "1234567890" })
  assert.equal(r.status, 201)
  assert.equal((await crm.collection(COLL.contacts).findOne({ phoneE164: "+911234567890" })).phoneKind, "unverified_mobile")
})

test("existing contact is not overwritten; an alt phone resolves to the same contact; closed deal -> new repeat_enquiry deal", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const { deps } = mk(crm)
  const a = await (await post(deps, BASE)).json()
  const again = await (await post(deps, { ...BASE, name: "Someone Else", company: "Other Co", customerType: "B2C" })).json()
  assert.equal(again.contactId, a.contactId)
  const c = await crm.collection(COLL.contacts).findOne({ _id: new ObjectId(a.contactId) })
  assert.equal(c.name, "Ravi Kumar"); assert.equal(c.company, "Ravi Traders")
  await crm.collection(COLL.contacts).updateOne({ _id: c._id }, { $set: { altPhones: ["+919000000001"] } })
  const viaAlt = await (await post(deps, { ...BASE, mobile: "9000000001" })).json()
  assert.equal(viaAlt.contactId, a.contactId); assert.equal(viaAlt.created, false)
  assert.equal(await count(crm, COLL.contacts), 1)
  // close the deal; the next call opens a repeat deal on the same contact
  await crm.collection(COLL.deals).updateOne({ _id: new ObjectId(a.dealId) }, { $set: { isOpen: false, stage: "closed_lost", closedAt: new Date() } })
  const rep = await post(deps, BASE)
  const repBody = await rep.json()
  assert.equal(rep.status, 201); assert.equal(repBody.dealCreated, true); assert.equal(repBody.created, false)
  assert.notEqual(repBody.dealId, a.dealId)
  assert.equal((await crm.collection(COLL.deals).findOne({ _id: new ObjectId(repBody.dealId) })).stage, "repeat_enquiry")
  assert.equal(await count(crm, COLL.deals, { isOpen: true }), 1)
  // concurrent identical submissions never duplicate
  const rs = await Promise.all(Array.from({ length: 6 }, () => post(deps, { ...BASE, mobile: "9111111111" })))
  const bodies = await Promise.all(rs.map(r => r.json()))
  assert.equal(new Set(bodies.map(b => b.contactId)).size, 1)
  assert.equal(await count(crm, COLL.contacts, { phoneE164: "+919111111111" }), 1)
  assert.equal(await count(crm, COLL.deals, { contactId: new ObjectId(bodies[0].contactId), isOpen: true }), 1)
})

test("dealer-directory match -> existingDealer true, one activity, customerType suggestion; product/qty on the deal", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await crm.collection(COLL.dealerDirectory).insertOne({ phoneE164: "+919876543210", name: "Dir Ravi", company: "Dir Co", createdAt: new Date() })
  const { deps } = mk(crm)
  const r = await post(deps, { ...BASE, leadSource: "Existing dealer", customerType: "Dealer", product: "ULV Fogger", quantity: 3 })
  const b = await r.json()
  assert.equal(r.status, 201); assert.equal(b.existingDealer, true)
  const c = await crm.collection(COLL.contacts).findOne({ _id: new ObjectId(b.contactId) })
  assert.ok(c.existingDealer && c.existingDealer.matchedAt)
  assert.equal(c.customerType, "dealer")
  assert.equal(await count(crm, COLL.activities, { kind: "existing_dealer_match" }), 1)
  const d = await crm.collection(COLL.deals).findOne({ _id: new ObjectId(b.dealId) })
  assert.deepEqual(d.productInterest.map(p => [p.label, p.qty]), [["ULV Fogger", 3]])
  assert.equal(d.leadSource, "existing_dealer"); assert.equal(d.customerType, "dealer")
  // second call: still existingDealer true, no second match activity
  const b2 = await (await post(deps, BASE)).json()
  assert.equal(b2.existingDealer, true)
  assert.equal(await count(crm, COLL.activities, { kind: "existing_dealer_match" }), 1)
  // a non-dealer number
  assert.equal((await (await post(deps, { ...BASE, mobile: "9222222222" })).json()).existingDealer, false)
})

// ───────────────────────── assignment ─────────────────────────
test("assignee: defaults to caller; someone else needs crm.leads.assign (403, nothing written); unknown user 400; reassign with permission", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const rep = mk(crm, { perms: SALES_BASE.filter(p => p !== "crm.leads.view_all"), role: "sales_executive", name: "Rep Self" })
  let r = await post(rep.deps, BASE)
  let b = await r.json()
  assert.equal(r.status, 201)
  let deal = await crm.collection(COLL.deals).findOne({ _id: new ObjectId(b.dealId) })
  assert.equal(deal.assignedTo.userId, rep.userId); assert.equal(deal.assignedTo.name, "Rep Self")
  assert.equal((await crm.collection(COLL.contacts).findOne({ _id: new ObjectId(b.contactId) })).assignedTo.userId, rep.userId)
  // explicit self assignment is allowed without assign
  r = await post(rep.deps, { ...BASE, mobile: "9333333333", assignedTo: rep.userId })
  assert.equal(r.status, 201)
  // someone else: forbidden, and nothing is created
  const before = [await count(crm, COLL.contacts), await count(crm, COLL.deals), await count(crm, COLL.activities), await count(crm, COLL.audit)]
  r = await post(rep.deps, { ...BASE, mobile: "9444444444", assignedTo: USERS[0].id })
  assert.equal(r.status, 403)
  assert.deepEqual(await r.json(), { error: "forbidden", required: ["crm.leads.assign"] })
  assert.deepEqual([await count(crm, COLL.contacts), await count(crm, COLL.deals), await count(crm, COLL.activities), await count(crm, COLL.audit)], before)
  // owner assigns to someone else / unknown user
  const owner = mk(crm)
  r = await post(owner.deps, { ...BASE, mobile: "9555555555", assignedTo: USERS[0].id })
  b = await r.json()
  assert.equal(r.status, 201)
  deal = await crm.collection(COLL.deals).findOne({ _id: new ObjectId(b.dealId) })
  assert.equal(deal.assignedTo.userId, USERS[0].id); assert.equal(deal.assignedTo.name, "Asha Rep")
  r = await post(owner.deps, { ...BASE, mobile: "9666666666", assignedTo: hex() })
  assert.equal(r.status, 400); assert.deepEqual((await r.json()).fields, { assignedTo: "unknown_user" })
  // owner re-assigns an already assigned open deal -> reassigned + assignment activity
  r = await post(owner.deps, { ...BASE, mobile: "9555555555", assignedTo: USERS[1].id })
  b = await r.json()
  deal = await crm.collection(COLL.deals).findOne({ _id: new ObjectId(b.dealId) })
  assert.equal(deal.assignedTo.userId, USERS[1].id)
  const acts = await all(crm, COLL.activities, { dealId: deal._id, kind: "assignment" })
  assert.equal(acts.length, 2)
  // without explicit assignedTo an existing assignee is kept
  r = await post(rep.deps, { ...BASE, mobile: "9555555555" })
  deal = await crm.collection(COLL.deals).findOne({ _id: deal._id })
  assert.equal(deal.assignedTo.userId, USERS[1].id)
})

// ───────────────────────── notes separation (owner hard rule) ─────────────────────────
test("call note text appears ONLY in crm_internal_notes: DB deep scan, audit, console, every GET payload", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const owner = mk(crm)
  let resBody
  const logs = await captureConsole(async () => {
    const r = await post(owner.deps, { ...BASE, product: "ULV Fogger", quantity: 2, customerType: "Dealer", notes: NOTE })
    resBody = await r.json()
    assert.equal(r.status, 201)
  })
  assert.ok(resBody.noteId)
  const needle = "ZEBRA-SECRET"
  const hasNeedle = v => JSON.stringify(v).includes(needle)
  // 1. only the notes collection holds it
  const names = (await rawDb(crm).listCollections().toArray()).map(c => c.name)
  const holders = []
  for (const n of names) {
    if ((await rawDb(crm).collection(n).find({}).toArray()).some(hasNeedle)) holders.push(n)
  }
  assert.deepEqual(holders, [COLL.internalNotes])
  const [note] = await all(crm, COLL.internalNotes)
  assert.equal(note.text, NOTE); assert.equal(note.contactId.toHexString(), resBody.contactId)
  assert.equal(note.dealId.toHexString(), resBody.dealId); assert.equal(note.author.userId, owner.userId)
  assert.ok(note.textHash && note.textHash.length === 64)
  // the call_log activity records only that a note exists
  const act = (await all(crm, COLL.activities, { kind: "call_log" }))[0]
  assert.equal(act.data.hasInternalNote, true)
  assert.ok(!JSON.stringify(act).includes("discount") && !JSON.stringify(act).includes("Kumar discount"))
  // 2. audit rows hold ids only (no note text, phone, names)
  const audits = await all(crm, COLL.audit)
  assert.ok(audits.length >= 1)
  for (const a of audits) {
    const s = JSON.stringify(a)
    for (const bad of ["9876543210", "Ravi", "Traders", "ZEBRA", "discount", "Kumar"]) assert.ok(!s.includes(bad), `audit leaks ${bad}: ${s}`)
  }
  // 3. console output of the whole request
  assert.ok(logs.length > 0)
  for (const l of logs) for (const bad of ["ZEBRA", "discount", "9876543210", "Ravi"]) assert.ok(!l.includes(bad), `log leaks ${bad}: ${l}`)
  // 4. read payloads
  const cid = resBody.contactId
  const detail = await get(contactDetailHandler, owner.deps, `http://x/api/crm/contacts/${cid}`, cid)
  const tl = await get(contactTimelineHandler, owner.deps, `http://x/api/crm/contacts/${cid}/timeline`, cid)
  const list = await get(listLeadsHandler, owner.deps, "http://x/api/crm/leads")
  const listQ = await get(listLeadsHandler, owner.deps, "http://x/api/crm/leads?q=ZEBRA")
  for (const [name, x] of [["detail", detail], ["timeline", tl], ["list", list], ["listQ", listQ]]) {
    assert.equal(x.status, 200, name)
    assert.ok(!hasNeedle(x.body), name + " leaks note text")
    assert.ok(!/"notes?"\s*:/.test(JSON.stringify(x.body)) , name + " exposes a notes key")
  }
  assert.equal(listQ.body.total, 0, "list search never matches note text")
  // 5. GET notes returns it, needs crm.notes.view
  const ok = await get(listNotesHandler, owner.deps, `http://x/api/crm/contacts/${cid}/notes`, cid)
  assert.equal(ok.status, 200); assert.equal(ok.body.items.length, 1); assert.equal(ok.body.items[0].text, NOTE)
  assert.ok(!("textHash" in ok.body.items[0]))
  const noView = mk(crm, { perms: OWNER.filter(p => p !== "crm.notes.view"), role: "sales_manager" })
  const denied = await get(listNotesHandler, noView.deps, `http://x/api/crm/contacts/${cid}/notes`, cid)
  assert.equal(denied.status, 403); assert.deepEqual(denied.body.required, ["crm.notes.view"])
  assert.ok(!hasNeedle(denied.body))
  // ... but can still read the contact page
  assert.equal((await get(contactDetailHandler, noView.deps, `http://x/api/crm/contacts/${cid}`, cid)).status, 200)
  // 6. POST /notes: stored, audited without text, attached to the open deal, validated
  const r = await createNoteHandler(json("POST", "http://x", { text: "SECOND-NOTE-TEXT-77 call back" }), P(cid), owner.deps)
  const nb = await r.json()
  assert.equal(r.status, 201); assert.equal(nb.note.dealId, resBody.dealId)
  const holders2 = []
  for (const n of names) if ((await rawDb(crm).collection(n).find({}).toArray()).some(d => JSON.stringify(d).includes("SECOND-NOTE-TEXT-77"))) holders2.push(n)
  const allNames = (await rawDb(crm).listCollections().toArray()).map(c => c.name)
  for (const n of allNames) if ((await rawDb(crm).collection(n).find({}).toArray()).some(d => JSON.stringify(d).includes("SECOND-NOTE-TEXT-77")) && !holders2.includes(n)) holders2.push(n)
  assert.deepEqual(holders2, [COLL.internalNotes])
  for (const bad of [{}, { text: "" }, { text: 5 }, { text: "x".repeat(4001) }, { text: "ok", dealId: "zz" }, { text: "ok", dealId: hex() }]) {
    const rr = await createNoteHandler(json("POST", "http://x", bad), P(cid), owner.deps)
    assert.equal(rr.status, 400, JSON.stringify(bad).slice(0, 40))
  }
  assert.equal((await createNoteHandler(json("POST", "http://x", { text: "t" }), P(hex()), owner.deps)).status, 404)
  const noCreate = mk(crm, { perms: OWNER.filter(p => p !== "crm.notes.create") })
  const rc = await createNoteHandler(json("POST", "http://x", { text: "t" }), P(cid), noCreate.deps)
  assert.equal(rc.status, 403); assert.deepEqual((await rc.json()).required, ["crm.notes.create"])
  // still no leak in detail after the second note
  const d2 = await get(contactDetailHandler, owner.deps, `http://x/api/crm/contacts/${cid}`, cid)
  assert.ok(!JSON.stringify(d2.body).includes("SECOND-NOTE-TEXT-77"))
  // notes in a later page cursor
  const lst = await get(listNotesHandler, owner.deps, `http://x/api/crm/contacts/${cid}/notes?before=garbage`, cid)
  assert.equal(lst.status, 400)
})

test("notes with whitespace/CRLF are trimmed and stored once; blank notes create no note row", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const { deps } = mk(crm)
  let b = await (await post(deps, { ...BASE, notes: "   " })).json()
  assert.equal(b.noteId, null); assert.equal(await count(crm, COLL.internalNotes), 0)
  b = await (await post(deps, { ...BASE, mobile: "9777777777", notes: "  line1\r\nline2  " })).json()
  const [n] = await all(crm, COLL.internalNotes)
  assert.equal(n.text, "line1\nline2")
  assert.equal((await crm.collection(COLL.activities).findOne({ kind: "call_log", contactId: new ObjectId(b.contactId) })).data.hasInternalNote, true)
})

// ───────────────────────── lead list ─────────────────────────
async function seedList(crm) {
  const owner = mk(crm)
  const mkLead = async (body, extra) => {
    const b = await (await post(owner.deps, body)).json()
    if (extra) await extra(b)
    return b
  }
  const a = await mkLead({ mobile: "9876543210", leadSource: "Call", name: "Ravi Kumar", company: "Ravi Traders", customerType: "Dealer", assignedTo: USERS[0].id })
  const b = await mkLead({ mobile: "9123456789", leadSource: "WhatsApp", name: "Sunita", company: "Green Agro", customerType: "B2C" })
  const c = await mkLead({ mobile: "9000012345", leadSource: "GeM", name: "Dept Officer", company: "PWD", customerType: "Government dept", assignedTo: USERS[1].id })
  await crm.collection(COLL.deals).updateOne({ _id: new ObjectId(c.dealId) }, { $set: { stage: "closed_won", isOpen: false, closedAt: new Date() } })
  await crm.collection(COLL.contacts).updateOne({ _id: new ObjectId(b.contactId) }, { $set: { existingDealer: { directoryId: "x", matchedAt: new Date() } } })
  return { owner, a, b, c }
}
const listBy = async (owner, qs) => (await get(listLeadsHandler, owner.deps, "http://x/api/crm/leads" + (qs ? "?" + qs : ""))).body
const phones = r => r.items.map(i => i.contact.phoneE164).sort()

test("lead list: q by mobile formats, digit prefix, name, company; each filter; combined", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const { owner } = await seedList(crm)
  const q = s => listBy(owner, "q=" + encodeURIComponent(s))
  for (const s of ["98765 43210", "+919876543210", "09876543210", "919876543210", "+91 98765-43210", "9876543210"]) assert.deepEqual(phones(await q(s)), ["+919876543210"], s)
  for (const s of ["98765", "9876", "987", "0987", "+91987", "91987"]) assert.deepEqual(phones(await q(s)), ["+919876543210"], "prefix " + s)
  assert.deepEqual(phones(await q("9000012")), ["+919000012345"])
  assert.equal((await q("555")).total, 0)
  assert.deepEqual(phones(await q("ravi")), ["+919876543210"])
  assert.deepEqual(phones(await q("RAVI TRAD")), ["+919876543210"])
  assert.deepEqual(phones(await q("agro")), ["+919123456789"])
  assert.deepEqual(phones(await q("pwd")), ["+919000012345"])
  assert.equal((await q("(ravi|x)")).total, 0, "regex metacharacters are escaped")
  assert.equal((await q(".*")).total, 0)
  // filters
  assert.deepEqual(phones(await listBy(owner, "stage=closed_won")), ["+919000012345"])
  assert.equal((await listBy(owner, "stage=new,repeat_enquiry")).total, 2)
  assert.deepEqual(phones(await listBy(owner, "source=whatsapp")), ["+919123456789"])
  assert.equal((await listBy(owner, "source=call&source=gem")).total, 2)
  assert.deepEqual(phones(await listBy(owner, "customerType=b2c")), ["+919123456789"])
  assert.deepEqual(phones(await listBy(owner, "assignee=" + USERS[1].id)), ["+919000012345"])
  assert.equal((await listBy(owner, "assignee=" + owner.userId)).total, 1)
  assert.equal((await listBy(owner, "existingDealer=true")).total, 1)
  assert.equal((await listBy(owner, "existingDealer=false")).total, 2)
  assert.equal((await listBy(owner, "status=open")).total, 2)
  assert.deepEqual(phones(await listBy(owner, "status=closed")), ["+919000012345"])
  assert.deepEqual(phones(await listBy(owner, "status=open&source=call&q=ravi")), ["+919876543210"])
  // invalid params -> 400 with the field
  for (const [qs, field] of [["stage=bogus", "stage"], ["source=x", "source"], ["customerType=x", "customerType"], ["assignee=zz", "assignee"], ["existingDealer=maybe", "existingDealer"], ["status=what", "status"], ["page=0", "page"], ["page=abc", "page"], ["pageSize=101", "pageSize"], ["pageSize=0", "pageSize"], ["q=" + "x".repeat(101), "q"]]) {
    const r = await get(listLeadsHandler, owner.deps, "http://x/api/crm/leads?" + qs)
    assert.equal(r.status, 400, qs); assert.equal(r.body.fields[field] !== undefined, true, qs)
  }
})

test("lead list: pagination covers every row exactly once, stable order, correct totals", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const owner = mk(crm)
  const now = new Date("2026-01-01T00:00:00Z")
  const cs = Array.from({ length: 23 }, (_, i) => ({ _id: new ObjectId(), phoneE164: "+9190000000" + String(i).padStart(2, "0"), waId: "x", phoneKind: "mobile", name: "P" + i, existingDealer: null, mergedInto: null, lastActivityAt: new Date(now.getTime() + i * 1000), createdAt: now, updatedAt: now }))
  await crm.collection(COLL.contacts).insertMany(cs)
  await crm.collection(COLL.deals).insertMany(cs.map(c => ({ contactId: c._id, stage: "new", isOpen: true, assignedTo: null, leadSource: "call", createdAt: now, updatedAt: now })))
  const seen = []
  for (let p = 1; p <= 3; p++) {
    const r = await listBy(owner, `page=${p}&pageSize=10`)
    assert.equal(r.total, 23); assert.equal(r.page, p); assert.equal(r.pageSize, 10)
    assert.equal(r.items.length, p === 3 ? 3 : 10)
    seen.push(...r.items.map(i => i.contact.phoneE164))
  }
  assert.equal(new Set(seen).size, 23)
  assert.equal(seen[0], "+919000000022", "most recent lastActivityAt first")
  assert.equal((await listBy(owner, "page=4&pageSize=10")).items.length, 0)
  assert.equal((await listBy(owner, "pageSize=100")).items.length, 23)
})

test("sales-invisible rule: list, contact, timeline payloads never contain gclid/utm/attribution/raw fields", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const owner = mk(crm)
  const b = await (await post(owner.deps, { ...BASE, product: "Fogger", quantity: 1 })).json()
  const cid = new ObjectId(b.contactId), did = new ObjectId(b.dealId)
  const SECRET = { gclid: "GCLID-SECRET-1", utm: { source: "UTM-SECRET-SRC" }, fbclid: "FBCLID-SECRET" }
  // poison every sales-visible doc with attribution-like extras; whitelist projections must drop them
  await crm.collection(COLL.contacts).updateOne({ _id: cid }, { $set: { ...SECRET, attribution: SECRET, internalNotes: ["INLINE-NOTE-SECRET"], rawPayload: { x: "RAW-SECRET" } } })
  await crm.collection(COLL.deals).updateOne({ _id: did }, { $set: { ...SECRET, attribution: SECRET, notes: "DEAL-NOTE-SECRET" } })
  await crm.collection(COLL.activities).insertOne({ contactId: cid, dealId: did, kind: "note", at: new Date(), by: { system: "t" }, summary: "s", data: { ok: 1 }, ...SECRET, rawPayload: "RAW-SECRET" })
  await crm.collection(COLL.messages).insertOne({ contactId: cid, direction: "in", type: "text", text: { body: "hello there" }, createdAt: new Date(), ...SECRET, raw: { gclid: "RAW-SECRET" } })
  await crm.collection(COLL.attribution).insertOne({ contactId: cid, dealId: did, gclid: "GCLID-ATTR-DOC", utm: { campaign: "UTM-ATTR-DOC" }, createdAt: new Date() })
  const payloads = [
    (await get(listLeadsHandler, owner.deps, "http://x/api/crm/leads")).body,
    (await get(contactDetailHandler, owner.deps, `http://x/api/crm/contacts/${cid}`, cid)).body,
    (await get(contactTimelineHandler, owner.deps, `http://x/api/crm/contacts/${cid}/timeline`, cid)).body,
  ]
  assert.ok(JSON.stringify(payloads[1]).includes("hello there"), "sanity: message rendered")
  for (const p of payloads) {
    const s = JSON.stringify(p)
    assert.ok(!/gclid|utm|attribution|fbclid|SECRET|ATTR-DOC|rawPayload/i.test(s), "leak: " + (s.match(/.{0,30}(gclid|utm|attribution|fbclid|SECRET|ATTR-DOC|rawPayload).{0,30}/i) || [])[0])
  }
  // searching for attribution values finds nothing
  assert.equal((await listBy(owner, "q=GCLID-ATTR-DOC")).total, 0)
})

// ───────────────────────── PATCH deals ─────────────────────────
test("PATCH deal: assignment syncs deal + contact + conversations, activity, audit has no PII; unassign; no-op", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const owner = mk(crm)
  const b = await (await post(owner.deps, { ...BASE, notes: NOTE })).json()
  const cid = new ObjectId(b.contactId)
  await crm.collection(COLL.conversations).insertMany([{ contactId: cid, phoneNumberId: "pn1", waId: "w1", assignedTo: null, createdAt: new Date() }, { contactId: cid, phoneNumberId: "pn2", waId: "w1", assignedTo: null, createdAt: new Date() }, { contactId: new ObjectId(), phoneNumberId: "pn1", waId: "w2", assignedTo: null }])
  const patch = body => patchDealHandler(json("PATCH", "http://x", body), P(b.dealId), owner.deps)
  let r = await patch({ assignedTo: USERS[0].id })
  assert.equal(r.status, 200)
  const body = await r.json()
  assert.equal(body.deal.assignedTo.userId, USERS[0].id)
  assert.ok(!("_id" in body.deal) && body.deal.id)
  const contact = await crm.collection(COLL.contacts).findOne({ _id: cid })
  assert.equal(contact.assignedTo.userId, USERS[0].id)
  const convs = await all(crm, COLL.conversations, { contactId: cid })
  assert.ok(convs.every(c => c.assignedTo && c.assignedTo.userId === USERS[0].id))
  assert.equal((await all(crm, COLL.conversations, { assignedTo: null })).length, 1, "other contacts' conversations untouched")
  const act = (await all(crm, COLL.activities, { kind: "assignment", "data.to": USERS[0].id }))[0]
  assert.ok(act); assert.equal(act.summary, "Assigned to Asha Rep")
  // same assignee again: no new activity / audit
  const aBefore = await count(crm, COLL.audit)
  r = await patch({ assignedTo: USERS[0].id })
  assert.equal(r.status, 200); assert.equal(await count(crm, COLL.audit), aBefore, "no-op writes no audit row")
  assert.equal(await count(crm, COLL.activities, { kind: "assignment" }), 2)
  // unassign
  r = await patch({ assignedTo: null })
  assert.equal(r.status, 200)
  assert.equal((await crm.collection(COLL.contacts).findOne({ _id: cid })).assignedTo, null)
  assert.ok((await all(crm, COLL.conversations, { contactId: cid })).every(c => c.assignedTo === null))
  // unknown user, bad id
  r = await patch({ assignedTo: hex() }); assert.equal(r.status, 400); assert.deepEqual((await r.json()).fields, { assignedTo: "unknown_user" })
  r = await patch({ assignedTo: "nope" }); assert.equal(r.status, 400)
  // audit rows: no phone / name / company / note text
  for (const a of await all(crm, COLL.audit)) {
    const s = JSON.stringify(a)
    for (const bad of ["9876543210", "Ravi", "Traders", "ZEBRA", "discount", "Kumar", "Asha Rep"]) assert.ok(!s.includes(bad), `audit leaks ${bad}: ${s}`)
  }
  assert.ok((await all(crm, COLL.audit, { action: "deal.update" })).length >= 2)
})

test("PATCH deal: follow-up, productInterest validation, stage refusal, closed deal 409, empty/unknown fields, permissions", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const owner = mk(crm)
  const b = await (await post(owner.deps, BASE)).json()
  const patchAs = (u, body, id = b.dealId) => patchDealHandler(json("PATCH", "http://x", body), P(id), u.deps)
  let r = await patchAs(owner, { nextFollowUpAt: "2026-11-01T09:00:00Z", productInterest: [{ label: "ULV Fogger", qty: 2, productSlug: "ulv-fogger" }] })
  assert.equal(r.status, 200)
  const d = await crm.collection(COLL.deals).findOne({ _id: new ObjectId(b.dealId) })
  assert.equal(d.nextFollowUpAt.toISOString(), "2026-11-01T09:00:00.000Z"); assert.equal(d.productInterest.length, 1)
  assert.equal(await count(crm, COLL.activities, { kind: "field_change" }), 1)
  r = await patchAs(owner, { nextFollowUpAt: null }); assert.equal(r.status, 200)
  assert.equal((await crm.collection(COLL.deals).findOne({ _id: d._id })).nextFollowUpAt, null)
  const bad = [
    [{ nextFollowUpAt: "garbage" }, "nextFollowUpAt"], [{ nextFollowUpAt: "1999-01-01" }, "nextFollowUpAt"], [{ nextFollowUpAt: 5 }, "nextFollowUpAt"],
    [{ productInterest: "x" }, "productInterest"], [{ productInterest: [{ qty: 1 }] }, "productInterest.0.label"], [{ productInterest: [{ label: "a", qty: 0 }] }, "productInterest.0.qty"],
    [{ productInterest: [{ label: "a", productSlug: "Bad Slug" }] }, "productInterest.0.productSlug"], [{ productInterest: Array(21).fill({ label: "a" }) }, "productInterest"],
    [{ customerType: "Wholesaler" }, "customerType"], [{ customerType: null }, "customerType"], [{ bogus: 1 }, "bogus"], [{}, "body"],
  ]
  for (const [body, field] of bad) {
    r = await patchAs(owner, body)
    assert.equal(r.status, 400, JSON.stringify(body))
    assert.ok(field in (await r.json()).fields, JSON.stringify(body))
  }
  for (const body of [{ stage: "contacted" }, { stage: "closed_won" }, { won: {} }, { lost: {} }, { isOpen: false }, { closedAt: "2026-01-01" }, { stageHistory: [] }, { assignedTo: USERS[0].id, stage: "new" }]) {
    r = await patchAs(owner, body); assert.equal(r.status, 400, JSON.stringify(body)); assert.equal((await r.json()).error, "stage_changes_not_supported")
  }
  assert.equal((await crm.collection(COLL.deals).findOne({ _id: d._id })).stage, "new")
  assert.equal((await patchAs(owner, { nextFollowUpAt: null }, "zz")).status, 400)
  assert.equal((await patchAs(owner, { nextFollowUpAt: null }, hex())).status, 404)
  assert.equal((await patchDealHandler(json("PATCH", "http://x", "{bad"), P(b.dealId), owner.deps)).status, 400)
  // permissions: edit-only role cannot assign; assign-only role cannot edit fields
  const editOnly = mk(crm, { perms: ["crm.view", "crm.leads.view_all", "crm.leads.edit"] })
  r = await patchAs(editOnly, { assignedTo: USERS[0].id }); assert.equal(r.status, 403); assert.deepEqual((await r.json()).required, ["crm.leads.assign"])
  const assignOnly = mk(crm, { perms: ["crm.view", "crm.leads.view_all", "crm.leads.assign"] })
  r = await patchAs(assignOnly, { nextFollowUpAt: null }); assert.equal(r.status, 403); assert.deepEqual((await r.json()).required, ["crm.leads.edit"])
  r = await patchAs(assignOnly, { assignedTo: USERS[1].id, nextFollowUpAt: null }); assert.equal(r.status, 403); assert.deepEqual((await r.json()).required, ["crm.leads.edit"])
  // closed deal -> 409, nothing changes
  await crm.collection(COLL.deals).updateOne({ _id: d._id }, { $set: { isOpen: false, stage: "closed_lost" } })
  const snap = JSON.stringify(await crm.collection(COLL.deals).findOne({ _id: d._id }))
  r = await patchAs(owner, { nextFollowUpAt: "2027-01-01T00:00:00Z" })
  assert.equal(r.status, 409); assert.equal((await r.json()).error, "deal_closed")
  assert.equal(JSON.stringify(await crm.collection(COLL.deals).findOne({ _id: d._id })), snap)
})

test("PATCH customerType: confirms on contact; equal pending suggestion accepted, others rejected", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const owner = mk(crm)
  const b = await (await post(owner.deps, BASE)).json()
  const cid = new ObjectId(b.contactId)
  const at = new Date()
  await crm.collection(COLL.contacts).updateOne({ _id: cid }, { $set: { suggestions: [
    { field: "customerType", value: "dealer", keyword: "k", status: "pending", at },
    { field: "customerType", value: "govt_dept", keyword: "k", status: "pending", at },
    { field: "customerType", value: "b2c", keyword: "k", status: "accepted", at },
    { field: "other", value: "x", status: "pending", at },
  ] } })
  const r = await patchDealHandler(json("PATCH", "http://x", { customerType: "dealer" }), P(b.dealId), owner.deps)
  assert.equal(r.status, 200)
  const c = await crm.collection(COLL.contacts).findOne({ _id: cid })
  assert.equal(c.customerType, "dealer")
  const by = v => c.suggestions.find(s => s.field === "customerType" && s.value === v)
  assert.equal(by("dealer").status, "accepted"); assert.equal(by("dealer").decidedBy.userId, owner.userId)
  assert.equal(by("govt_dept").status, "rejected")
  assert.equal(by("b2c").status, "accepted", "already-decided suggestion untouched")
  assert.equal(c.suggestions.find(s => s.field === "other").status, "pending", "non-customerType suggestion untouched")
  assert.equal((await crm.collection(COLL.deals).findOne({ _id: new ObjectId(b.dealId) })).customerType, "dealer")
  // same value again is a no-error repeat
  assert.equal((await patchDealHandler(json("PATCH", "http://x", { customerType: "dealer" }), P(b.dealId), owner.deps)).status, 200)
})

test("contact detail/timeline: validation + paging cursor", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const owner = mk(crm)
  const b = await (await post(owner.deps, BASE)).json()
  const cid = b.contactId
  const base = new Date("2026-02-01T00:00:00Z")
  await crm.collection(COLL.activities).insertMany(Array.from({ length: 7 }, (_, i) => ({ contactId: new ObjectId(cid), dealId: null, kind: "note", at: new Date(base.getTime() + i * 60000), by: { system: "t" }, summary: "a" + i, data: {} })))
  assert.equal((await get(contactDetailHandler, owner.deps, `http://x/c?before=bad`, cid)).status, 400)
  assert.equal((await get(contactDetailHandler, owner.deps, `http://x/c?limit=0`, cid)).status, 400)
  assert.equal((await get(contactDetailHandler, owner.deps, `http://x/c?limit=101`, cid)).status, 400)
  assert.equal((await get(contactDetailHandler, owner.deps, `http://x/c`, "zz")).status, 400)
  assert.equal((await get(contactDetailHandler, owner.deps, `http://x/c`, hex())).status, 404)
  const p1 = await get(contactTimelineHandler, owner.deps, `http://x/t?limit=3`, cid)
  assert.equal(p1.body.items.length, 3); assert.ok(p1.body.nextBefore)
  const p2 = await get(contactTimelineHandler, owner.deps, `http://x/t?limit=3&before=${encodeURIComponent(p1.body.nextBefore)}`, cid)
  assert.ok(p2.body.items.every(i => i.at < p1.body.nextBefore || i.at === p1.body.nextBefore))
  const d = await get(contactDetailHandler, owner.deps, `http://x/c`, cid)
  assert.equal(d.body.deals.length, 1); assert.ok(d.body.contact.id); assert.ok(!("_id" in d.body.contact))
})
