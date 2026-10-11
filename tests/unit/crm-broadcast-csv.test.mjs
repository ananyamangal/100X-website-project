// Run: node --import ./tests/support/register.mjs --test --test-concurrency=1 tests/unit/crm-broadcast-csv.test.mjs
// STEP 9b CSV broadcast audiences: upload + parse, campaign from a CSV with csv.column params, contacts
// reused / created (never a deal), staff / opted-out / not-on-WhatsApp skipped, validation.
import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { ObjectId } from "mongodb"
import { startMemoryMongo } from "./crm/helpers/memory-mongo.mjs"
import { freshCrm, all, count } from "./crm/helpers/wa-harness.mjs"
import { TEST_WA } from "./crm/helpers/wa-sign.mjs"
import { NOW, PNID, graphFetch, jreq, reqCtx, apiDeps, seedTemplate } from "./crm/helpers/outbound-kit.mjs"
import { COLL } from "../../lib/crm/model.ts"
import { createCsvAudienceHandler, createBroadcastHandler, broadcastActionHandler } from "../../lib/crm/api/broadcasts.ts"

let m
before(async () => { m = await startMemoryMongo() })
after(async () => { if (m) await m.stop() })
const need = t => { if (!m.ok) { t.skip(m.skip); return false } return true }
const NO_PARAMS = { params: Promise.resolve({}) }
const SEND = ["crm.view", "crm.broadcasts.view", "crm.broadcasts.send"]
const ENV = { waPhoneNumberIds: [PNID], waAccessToken: TEST_WA.accessToken, waApiVersion: "v23.0", growthSync: true }
const CSV = "Name,Mobile No,Machine\nRamesh,98000 00001,TF-35\nSuresh,+91 98000 00002,TF-60\nBad,12345,X\nDup,9800000001,Y\nKnown,9800000003,TF-35\nStaff,9800000004,Z\nOpted,9800000005,Z\n"

async function upload(crm, text = CSV, o = {}) {
  const r = await createCsvAudienceHandler(jreq("POST", "http://x/a", { text, fileName: "dealers.csv", ...o }), NO_PARAMS, apiDeps(crm, { perms: SEND, env: ENV }))
  return { status: r.status, body: await r.json() }
}

test("upload: mobile column detected, rows normalised, invalid and duplicate phones counted, cells kept by header; CSV only; 403 without send", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const r = await upload(crm)
  assert.equal(r.status, 201)
  assert.equal(r.body.mobileColumn, "Mobile No")
  assert.deepEqual(r.body.headers, ["Name", "Mobile No", "Machine"])
  assert.deepEqual(r.body.summary, { valid: 5, invalid_phone: 1, duplicate_in_batch: 1 })
  const imp = await crm.collection(COLL.imports).findOne({ _id: new ObjectId(r.body.importId) })
  assert.equal(imp.kind, "broadcast_audience"); assert.equal(imp.rows[0].raw.Machine, "TF-35"); assert.equal(imp.rows[0].phoneE164, "+919800000001")
  assert.equal((await upload(crm, "a,b\n1,2\n")).body.fields.mobileColumn, "not_detected")
  assert.equal((await upload(crm, "x,y\n9800000001,2\n", { mobileColumn: "x" })).status, 201, "explicit mobile column")
  assert.equal((await createCsvAudienceHandler(jreq("POST", "http://x/a", { text: CSV }), NO_PARAMS, apiDeps(crm, { perms: ["crm.view", "crm.broadcasts.view"], env: ENV }))).status, 403)
})

test("campaign from a CSV: csv.column params, existing contacts reused, CSV-only numbers become plain contacts (no deal), staff / opted-out / not-on-WhatsApp skipped", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await seedTemplate(crm, { name: "fog_product_offer", bodyParamCount: 2, category: "MARKETING", headerType: "NONE" })
  const known = new ObjectId()
  await crm.collection(COLL.contacts).insertOne({ _id: known, phoneE164: "+919800000003", waId: "919800000003", name: "Known Dealer", mergedInto: null, staffUserId: null, language: "en_US", createdAt: NOW })
  await crm.collection(COLL.contacts).insertOne({ _id: new ObjectId(), phoneE164: "+919800000004", waId: "919800000004", name: "Staff", mergedInto: null, staffUserId: "u9", createdAt: NOW })
  await crm.collection(COLL.optOuts).insertOne({ phoneE164: "+919800000005", scope: "marketing", via: "manual", at: NOW, by: null, sourceMessageId: null })
  const up = await upload(crm)
  const created = await createBroadcastHandler(jreq("POST", "http://x/b", { name: "CSV offer", csvImportId: up.body.importId, templateName: "fog_product_offer", params: [{ from: "contact.name" }, { from: "csv.column", column: "Machine" }] }), NO_PARAMS, apiDeps(crm, { perms: SEND, env: ENV }))
  assert.equal(created.status, 201, JSON.stringify(await created.clone().json()))
  const id = (await created.json()).broadcast.id
  const f = graphFetch()
  const r = await broadcastActionHandler("start")(jreq("POST", "http://x/s"), reqCtx(id), apiDeps(crm, { perms: SEND, env: ENV, fetch: f, sleep: async () => {} }))
  assert.equal(r.status, 200)
  const b = await crm.collection(COLL.broadcasts).findOne({ _id: new ObjectId(id) })
  assert.equal(b.status, "completed"); assert.equal(b.counts.sent, 3); assert.equal(b.counts.skipped, 2)
  const recs = await all(crm, COLL.broadcastRecipients)
  assert.deepEqual(recs.filter(x => x.deliveryStatus === "skipped").map(x => x.skipReason).sort(), ["opted_out", "team_member"])
  const byTo = Object.fromEntries(f.calls.map(c => [c.body.to, c.body.template.components[0].parameters.map(p => p.text)]))
  assert.deepEqual(byTo["919800000001"], ["Ramesh", "TF-35"], "CSV name used for a new contact")
  assert.deepEqual(byTo["919800000003"], ["Known Dealer", "TF-35"], "existing contact name wins")
  const newC = await crm.collection(COLL.contacts).findOne({ phoneE164: "+919800000002" })
  assert.equal(newC.name, "Suresh"); assert.equal(newC.origin.channel, "import")
  assert.equal(await count(crm, COLL.contacts, { phoneE164: "+919800000003" }), 1, "no duplicate contact")
  assert.equal(await count(crm, COLL.deals), 0, "CSV contacts never get a deal")
})

test("validation: csv.column needs a CSV audience and a real column; one audience only", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await seedTemplate(crm, { name: "fog_product_offer", bodyParamCount: 1, category: "MARKETING", headerType: "NONE" })
  const up = await upload(crm)
  const mk = b => createBroadcastHandler(jreq("POST", "http://x/b", { name: "X", templateName: "fog_product_offer", ...b }), NO_PARAMS, apiDeps(crm, { perms: SEND, env: ENV }))
  assert.equal((await (await mk({ segmentId: String(new ObjectId()), params: [{ from: "csv.column", column: "Machine" }] })).json()).fields.params, "csv_column_needs_csv_audience")
  assert.equal((await (await mk({ csvImportId: up.body.importId, params: [{ from: "csv.column", column: "Colour" }] })).json()).fields["params.0"], "unknown_csv_column")
  assert.equal((await (await mk({ csvImportId: up.body.importId, segmentId: String(new ObjectId()), params: [{ literal: "x" }] })).json()).fields.csvImportId, "one_audience_only")
  assert.equal((await (await mk({ csvImportId: String(new ObjectId()), params: [{ literal: "x" }] })).json()).fields.csvImportId, "not_found")
})

test("FIX2-4: header names clipped to 100 chars (unique); a file whose stored rows would pass ~15 MB is refused with 413", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const long = "M".repeat(300)
  const r = await upload(crm, `Mobile,${long},${long}\n9800000001,a,b\n`)
  assert.equal(r.status, 201)
  assert.equal(r.body.headers[1].length, 100); assert.notEqual(r.body.headers[1], r.body.headers[2])
  const heads = ["Mobile", ...Array.from({ length: 19 }, (_, i) => `${i}`.padEnd(100, "h"))]
  const lines = [heads.join(",")]
  for (let i = 0; i < 9000; i++) lines.push([`98${String(10000000 + i)}`, ...Array(19).fill("x")].join(","))
  const big = await upload(crm, lines.join("\n"))
  assert.equal(big.status, 413); assert.equal(big.body.error, "audience_too_large")
})

test("FIX2-5: a CSV number belonging to a merged contact is sent to the surviving contact, not dropped", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await seedTemplate(crm, { name: "fog_product_offer", bodyParamCount: 1, category: "MARKETING", headerType: "NONE" })
  const keep = new ObjectId()
  await crm.collection(COLL.contacts).insertOne({ _id: keep, phoneE164: "+919800000009", waId: "919800000009", name: "Kept", mergedInto: null, staffUserId: null, language: "en_US", createdAt: NOW })
  await crm.collection(COLL.contacts).insertOne({ _id: new ObjectId(), phoneE164: "+919800000001", waId: "919800000001", name: "Old", mergedInto: keep, staffUserId: null, createdAt: NOW })
  const up = await upload(crm, "Name,Mobile\nRamesh,9800000001\n")
  const created = await createBroadcastHandler(jreq("POST", "http://x/b", { name: "M", csvImportId: up.body.importId, templateName: "fog_product_offer", params: [{ from: "contact.name" }] }), NO_PARAMS, apiDeps(crm, { perms: SEND, env: ENV }))
  const id = (await created.json()).broadcast.id
  const f = graphFetch()
  await broadcastActionHandler("start")(jreq("POST", "http://x/s"), reqCtx(id), apiDeps(crm, { perms: SEND, env: ENV, fetch: f, sleep: async () => {} }))
  const recs = await all(crm, COLL.broadcastRecipients)
  assert.equal(recs.length, 1); assert.equal(String(recs[0].contactId), String(keep))
  assert.equal(await count(crm, COLL.contacts), 2, "no new contact for a merged number")
})
