// Run: node --import ./tests/support/register.mjs --test --test-concurrency=1 tests/unit/crm-growth-exports.test.mjs
// STEP 10 Growth OS exports: offline conversions CSV (click-id rows only, IST times, exports[] batch),
// Customer Match CSV (SHA-256 of E.164, opted-out / not-on-WhatsApp excluded), toggle-off 409, perms, audit.
import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { ObjectId } from "mongodb"
import { startMemoryMongo } from "./crm/helpers/memory-mongo.mjs"
import { freshCrm, all } from "./crm/helpers/wa-harness.mjs"
import { NOW, jreq, apiDeps } from "./crm/helpers/outbound-kit.mjs"
import { COLL } from "../../lib/crm/model.ts"
import { adsTime, csvCell, sha256Phone } from "../../lib/crm/growth/exports.ts"
import { conversionsCsvHandler, customerMatchCsvHandler } from "../../lib/crm/api/growth.ts"

let m
before(async () => { m = await startMemoryMongo() })
after(async () => { if (m) await m.stop() })
const need = t => { if (!m.ok) { t.skip(m.skip); return false } return true }
const NO_PARAMS = { params: Promise.resolve({}) }
const PERMS = ["crm.view", "crm.growth.export"]
const ON = { waPhoneNumberIds: [], growthSync: true }

async function event(crm, o) {
  await crm.collection(COLL.conversionEvents).insertOne({ _id: new ObjectId(), kind: "closed_won", dealId: new ObjectId(), orderId: `o-${new ObjectId()}`, value: 4838000, currency: "INR", conversionAt: NOW, gclid: "GCLID-1", gbraid: null, wbraid: null, hasClickId: true, exports: [], createdAt: NOW, ...o })
}

test("helpers: IST conversion time, CSV quoting + formula-injection guard, phone hash", () => {
  assert.equal(adsTime(new Date("2026-10-10T10:00:00Z")), "2026-10-10 15:30:00+05:30")
  assert.equal(csvCell('a,"b"'), '"a,""b"""')
  assert.equal(csvCell("=HYPERLINK(1)"), "'=HYPERLINK(1)")
  assert.equal(csvCell("plain"), "plain")
  assert.equal(sha256Phone("+919800000001"), createHash("sha256").update("+919800000001").digest("hex"))
  assert.match(sha256Phone("+919800000001"), /^[a-f0-9]{64}$/)
})

test("conversions.csv: click-id rows only, kind + IST date filters, rupee values, exports[] batch recorded, audited", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await event(crm, { orderId: "D1:won" })
  await event(crm, { kind: "quotation_sent", orderId: "100X/QT/2026-27/0001:v1", value: 100050, gclid: null, gbraid: "GB-1", conversionAt: new Date("2026-10-09T20:00:00Z") })
  await event(crm, { orderId: "NOCLICK", hasClickId: false, gclid: null })
  await event(crm, { orderId: "OLD:won", conversionAt: new Date("2026-09-01T00:00:00Z") })
  const get = q => conversionsCsvHandler(jreq("GET", `http://x/c${q}`), NO_PARAMS, apiDeps(crm, { perms: PERMS, env: ON }))
  const r = await get("?from=2026-10-01")
  assert.equal(r.status, 200)
  assert.match(r.headers.get("content-type"), /text\/csv/)
  assert.match(r.headers.get("content-disposition"), /attachment; filename="crm-conversions-all-/)
  const lines = (await r.text()).trim().split("\r\n")
  assert.equal(lines[0], "Google Click ID,GBRAID,WBRAID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency,Order ID")
  assert.equal(lines.length, 3, "header + 2 rows (no-click and old excluded)")
  assert.ok(lines.includes(",GB-1,,CRM Quotation Sent,2026-10-10 01:30:00+05:30,1000.50,INR,100X/QT/2026-27/0001:v1"))
  assert.ok(lines.includes("GCLID-1,,,CRM Closed Won,2026-10-10 15:30:00+05:30,48380.00,INR,D1:won"))
  const only = (await (await get("?kind=closed_won")).text()).trim().split("\r\n")
  assert.equal(only.length, 3, "closed_won incl. the old one")
  const ev = await crm.collection(COLL.conversionEvents).findOne({ orderId: "D1:won" })
  assert.equal(ev.exports.length, 2); assert.equal(ev.exports[0].by.userId, "u1")
  assert.equal((await crm.collection(COLL.conversionEvents).findOne({ orderId: "NOCLICK" })).exports.length, 0)
  const aud = await all(crm, COLL.audit, { action: "export.conversions" })
  assert.equal(aud.length, 2); assert.equal(aud[0].after.rows, 2); assert.ok(!JSON.stringify(aud).includes("GCLID"))
  assert.equal((await get("?kind=nope")).status, 400)
  assert.equal((await get("?from=10/01/2026")).status, 400)
})

test("customer-match.csv: SHA-256 phones of the segment, opted-out / not-on-WhatsApp / merged / staff excluded, de-duplicated", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const mk = async (phone, o = {}) => crm.collection(COLL.contacts).insertOne({ _id: new ObjectId(), phoneE164: phone, customerType: "dealer", interestTags: [], marketingOptOut: null, notOnWhatsApp: null, mergedInto: null, staffUserId: null, createdAt: NOW, ...o })
  await mk("+919800000001"); await mk("+919800000002")
  await mk("+919800000003", { marketingOptOut: { at: NOW, via: "manual" } })
  await mk("+919800000004")
  await crm.collection(COLL.optOuts).insertOne({ phoneE164: "+919800000004", scope: "marketing", via: "stop_keyword", at: NOW, by: null, sourceMessageId: null })
  await mk("+919800000005", { notOnWhatsApp: NOW })
  await mk("+919800000006", { mergedInto: new ObjectId() })
  await mk("+919800000007", { staffUserId: "u9" })
  await mk("+919800000008", { customerType: "b2c" })
  const segId = new ObjectId()
  await crm.collection(COLL.segments).insertOne({ _id: segId, name: "Dealers", filter: { customerTypes: ["dealer"] }, createdAt: NOW })
  const r = await customerMatchCsvHandler(jreq("GET", `http://x/m?segmentId=${segId}`), NO_PARAMS, apiDeps(crm, { perms: PERMS, env: ON }))
  assert.equal(r.status, 200)
  const lines = (await r.text()).trim().split("\r\n")
  assert.deepEqual(lines, ["Phone", sha256Phone("+919800000001"), sha256Phone("+919800000002")].sort((a, b) => (a === "Phone" ? -1 : b === "Phone" ? 1 : 0)) )
  const [aud] = await all(crm, COLL.audit, { action: "export.customer_match" })
  assert.deepEqual([aud.after.rows, aud.after.excluded], [2, 3])
  assert.equal((await customerMatchCsvHandler(jreq("GET", "http://x/m?segmentId=nope"), NO_PARAMS, apiDeps(crm, { perms: PERMS, env: ON }))).status, 400)
  assert.equal((await customerMatchCsvHandler(jreq("GET", `http://x/m?segmentId=${new ObjectId()}`), NO_PARAMS, apiDeps(crm, { perms: PERMS, env: ON }))).status, 404)
})

test("toggle off -> 409 growth_sync_disabled with a message; crm.growth.export required", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const off = await conversionsCsvHandler(jreq("GET", "http://x/c"), NO_PARAMS, apiDeps(crm, { perms: PERMS, env: { waPhoneNumberIds: [], growthSync: false } }))
  assert.equal(off.status, 409)
  const j = await off.json()
  assert.equal(j.error, "growth_sync_disabled"); assert.match(j.message, /switched off/)
  assert.equal((await customerMatchCsvHandler(jreq("GET", `http://x/m?segmentId=${new ObjectId()}`), NO_PARAMS, apiDeps(crm, { perms: PERMS, env: { waPhoneNumberIds: [], growthSync: false } }))).status, 409)
  assert.equal((await conversionsCsvHandler(jreq("GET", "http://x/c"), NO_PARAMS, apiDeps(crm, { perms: ["crm.view", "crm.reports.view"], env: ON }))).status, 403)
})
