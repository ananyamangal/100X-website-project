// Run: node --import ./tests/support/register.mjs --test tests/unit/crm-website-ingest.test.mjs
// STEP 3c independent tests: website form -> CRM lead, attribution privacy, idempotency, conversions.
import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { ObjectId } from "mongodb"
import { startMemoryMongo } from "./crm/helpers/memory-mongo.mjs"
import { freshCrm, all, count } from "./crm/helpers/wa-harness.mjs"
import { COLL, WEB_FORM_ACTIVITY_FIELDS } from "../../lib/crm/model.ts"
import { captureWebsiteSubmission, mapWebsiteSubmission, webFormActivityData, attributionFields, parseQuantity, submissionIdOf, CLAIM_STALE_MS } from "../../lib/crm/website.ts"
import { recordConversionEvent, conversionFacts } from "../../lib/crm/conversions.ts"

let m
before(async () => { m = await startMemoryMongo() })
after(async () => { if (m) await m.stop() })
const need = t => { if (!m.ok) { t.skip(m.skip); return false } return true }
const ON = { growthSync: true }
const OFF = { growthSync: false }
const T = new Date("2026-10-09T10:00:00Z")
const oid = () => new ObjectId()
const ATTR = { gclid: "GCLID_SECRET_1", gbraid: "GBRAID_X", wbraid: "WBRAID_X", utm_source: "google", utm_medium: "cpc", utm_campaign: "CAMP_Z", utm_term: "TERM_Z", utm_content: "CONT_Z", landingPage: "https://www.100xcircle.com/LANDING_Z" }
const sub = (o = {}) => ({ _id: oid(), name: "Asha Verma", mobile: "9876543210", type: "contact", createdAt: T.toISOString(), ...o })

// ───────────── pure mapping ─────────────
test("webFormActivityData: output keys are a subset of WEB_FORM_ACTIVITY_FIELDS, never attribution/utm/pages/_id", () => {
  const junk = {
    _id: oid(), type: "contact", productName: "P", product: "Q", subject: "S", message: "M", requirement: "R", description: "D",
    company: "C", organization: "O", state: "Bihar", email: "a@b.co", intent: "buy", wantsQuote: true, wantsDealer: false, dealerInquiry: true,
    attribution: ATTR, form_page_url: "https://x/y", form_page_path: "/y", gclid: "G", utm_source: "u", landingPage: "L",
    name: "N", mobile: "9", phone: "9", city: "c", cityState: "cs", quantity: "5", website: "spam", createdAt: "x", emailStatus: "pending", randomJunk: "z",
  }
  const out = webFormActivityData(junk)
  for (const k of Object.keys(out)) assert.ok(WEB_FORM_ACTIVITY_FIELDS.includes(k), `unexpected key ${k}`)
  const s = JSON.stringify(out)
  for (const bad of ["GCLID", "CAMP_Z", "LANDING_Z", "form_page", "attribution", "utm", "gclid", "/y", "Asha"]) assert.ok(!s.includes(bad), bad)
  assert.equal(out.productName, "P"); assert.equal(out.message, "M"); assert.equal(out.company, "C")
  assert.deepEqual(webFormActivityData({}), {})
  assert.deepEqual(webFormActivityData({ requirement: "R", organization: "O", product: "Q", dealerInquiry: true }), { productName: "Q", message: "R", company: "O", wantsDealer: true })
})

test("mapWebsiteSubmission: phone from mobile vs phone; none/invalid -> not ok", () => {
  const a = mapWebsiteSubmission({ mobile: "9876543210" }); const b = mapWebsiteSubmission({ phone: "9876543210" })
  assert.ok(a.ok && b.ok); assert.equal(a.phone.phoneE164, b.phone.phoneE164); assert.equal(a.phone.phoneE164, "+919876543210")
  assert.equal(mapWebsiteSubmission({ mobile: "9876543210", phone: "9111111111" }).phone.phoneE164, "+919876543210")
  assert.deepEqual(mapWebsiteSubmission({ name: "x" }), { ok: false, reason: "no_phone" })
  assert.deepEqual(mapWebsiteSubmission({ phone: "   " }), { ok: false, reason: "no_phone" })
  assert.deepEqual(mapWebsiteSubmission({ phone: "123" }), { ok: false, reason: "invalid_phone" })
  assert.deepEqual(mapWebsiteSubmission({ phone: "12345" }), { ok: false, reason: "invalid_phone" })
})

test("mapWebsiteSubmission: every submission type shape", () => {
  const p = mapWebsiteSubmission({ type: "partner_application", name: "A", mobile: "9876543210", company: "Co", state: "Bihar", email: "a@b.co", message: "hi" })
  assert.ok(p.ok); assert.equal(p.intent, null); assert.equal(p.productInterest, null); assert.equal(p.profile.company, "Co"); assert.equal(p.profile.state, "Bihar")
  const c = mapWebsiteSubmission({ type: "contact", name: "A", phone: "9876543210", message: "q" })
  assert.ok(c.ok); assert.equal(c.intent, null); assert.match(c.activity.summary, /contact/)
  const q = mapWebsiteSubmission({ type: "quote", name: "A", phone: "9876543210", productName: "Mist machine", quantity: "10 units", wantsQuote: true })
  assert.ok(q.ok); assert.deepEqual(q.intent, { wantsQuote: true, wantsDealer: false }); assert.deepEqual(q.productInterest, { productSlug: null, label: "Mist machine", qty: 10 })
  const l = mapWebsiteSubmission({ type: "landing", source: "landing:x", name: "A", mobile: "9876543210", state: "UP", intent: "buy", quantity: 5 })
  assert.ok(l.ok); assert.equal(l.profile.state, "UP"); assert.equal(l.activity.data.intent, "buy")
  const r = mapWebsiteSubmission({ type: "rfq", product: "Cold fogger", quantity: "1,200", description: "need", organization: "Org", dealerInquiry: true, cityState: "Patna, Bihar", name: "A", phone: "9876543210", email: "a@b.co" })
  assert.ok(r.ok); assert.deepEqual(r.intent, { wantsQuote: true, wantsDealer: true })
  assert.deepEqual(r.productInterest, { productSlug: null, label: "Cold fogger", qty: 1200 })
  assert.equal(r.profile.company, "Org"); assert.equal(r.profile.city, "Patna, Bihar"); assert.equal(r.activity.data.message, "need"); assert.equal(r.activity.data.productName, "Cold fogger")
  const r2 = mapWebsiteSubmission({ type: "rfq", product: "X", dealerInquiry: false, phone: "9876543210" })
  assert.deepEqual(r2.intent, { wantsQuote: true, wantsDealer: false })
  const d = mapWebsiteSubmission({ type: "dealer_application", mobile: "9876543210" })
  assert.deepEqual(d.intent, { wantsQuote: false, wantsDealer: true })
})

test("parseQuantity / submissionIdOf / attributionFields", () => {
  assert.equal(parseQuantity("10"), 10); assert.equal(parseQuantity("10 units"), 10); assert.equal(parseQuantity(7), 7)
  for (const v of ["", "many", 0, -3, 1.5, null, undefined, "0", {}]) assert.equal(parseQuantity(v), null, String(v))
  const o = oid(); assert.equal(submissionIdOf({ _id: o }), o.toHexString()); assert.equal(submissionIdOf({ _id: o.toHexString().toUpperCase() }), o.toHexString())
  assert.equal(submissionIdOf({}), null); assert.equal(submissionIdOf({ _id: "nope" }), null)
  const a = attributionFields({ attribution: ATTR, form_page_url: "https://x/f" })
  assert.equal(a.gclid, "GCLID_SECRET_1"); assert.equal(a.utm.campaign, "CAMP_Z"); assert.equal(a.formPage, "https://x/f"); assert.equal(a.landingPage, ATTR.landingPage)
  assert.equal(attributionFields({ attribution: [1] }).gclid, null)
  assert.equal(attributionFields({}).formPage, null)
})

// ───────────── capture ─────────────
const deepHas = (v, needles) => { const s = JSON.stringify(v); return needles.filter(n => s.includes(n)) }
const SECRETS = ["GCLID_SECRET_1", "GBRAID_X", "WBRAID_X", "CAMP_Z", "TERM_Z", "CONT_Z", "LANDING_Z", "FORMPAGE_Z", "utm_", "gclid", "gbraid", "wbraid", "landingPage", "formPage", "form_page"]

test("capture ON: only crm_attribution carries click ids/utm/pages; sales docs are clean", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const s = sub({ type: "rfq", product: "Fogger", quantity: "3", phone: "9876543210", mobile: undefined, attribution: ATTR, form_page_url: "https://w/FORMPAGE_Z", form_page_path: "/FORMPAGE_Z" })
  const r = await captureWebsiteSubmission(crm, s, ON, { now: T })
  assert.equal(r.status, "captured"); assert.equal(r.attributionWritten, true)
  for (const c of [COLL.contacts, COLL.deals, COLL.activities, COLL.conversations]) {
    const docs = await all(crm, c)
    assert.deepEqual(deepHas(docs, SECRETS), [], `${c} leaks`)
    assert.ok(!JSON.stringify(docs).includes(s._id.toHexString()), `${c} has submission id`)
  }
  const [row] = await all(crm, COLL.attribution)
  assert.equal(row.gclid, "GCLID_SECRET_1"); assert.equal(row.gbraid, "GBRAID_X"); assert.equal(row.wbraid, "WBRAID_X")
  assert.equal(row.utm.source, "google"); assert.equal(row.utm.campaign, "CAMP_Z"); assert.equal(row.landingPage, ATTR.landingPage); assert.equal(row.formPage, "https://w/FORMPAGE_Z")
  assert.equal(row.submissionId, s._id.toHexString()); assert.ok(row.completedAt); assert.ok(row.dealId); assert.ok(row.contactId)
  const [act] = await all(crm, COLL.activities, { kind: "web_form" })
  for (const k of Object.keys(act.data)) assert.ok(WEB_FORM_ACTIVITY_FIELDS.includes(k), k)
})

test("capture OFF: claim row has no click ids/utm/pages; conversion skipped", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const r = await captureWebsiteSubmission(crm, sub({ attribution: ATTR, form_page_url: "https://w/FORMPAGE_Z" }), OFF, { now: T })
  assert.equal(r.status, "captured"); assert.equal(r.attributionWritten, false)
  const [row] = await all(crm, COLL.attribution)
  assert.equal(row.gclid, null); assert.equal(row.gbraid, null); assert.equal(row.wbraid, null); assert.deepEqual(row.utm, {}); assert.equal(row.landingPage, null); assert.equal(row.formPage, null)
  assert.deepEqual(deepHas(row, ["GCLID", "CAMP_Z", "LANDING_Z", "FORMPAGE_Z"]), [])
  assert.ok(row.completedAt)
  const deal = (await all(crm, COLL.deals))[0]
  assert.deepEqual(await recordConversionEvent(crm, { ...deal, won: { orderValue: 5000, wonAt: T } }, "closed_won", OFF, { now: T }), { status: "skipped", reason: "growth_sync_off" })
  assert.equal(await count(crm, COLL.conversionEvents), 0)
})

test("capture: no phone / invalid phone -> completed claim with skipReason, no contact; replay is duplicate", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const a = sub({ mobile: undefined, phone: undefined }); const b = sub({ mobile: "12" })
  assert.deepEqual(await captureWebsiteSubmission(crm, a, ON, { now: T }), { status: "skipped", submissionId: a._id.toHexString(), reason: "no_phone" })
  assert.equal((await captureWebsiteSubmission(crm, b, ON, { now: T })).reason, "invalid_phone")
  assert.equal(await count(crm, COLL.contacts), 0); assert.equal(await count(crm, COLL.deals), 0)
  const rows = await all(crm, COLL.attribution)
  assert.deepEqual(rows.map(r => r.skipReason).sort(), ["invalid_phone", "no_phone"]); assert.ok(rows.every(r => r.completedAt && !r.dealId))
  assert.equal((await captureWebsiteSubmission(crm, a, ON, { now: new Date(T.getTime() + 3600e3) })).status, "duplicate")
  assert.equal((await captureWebsiteSubmission(crm, {}, ON)).status, "invalid")
})

test("idempotent: same submission twice and concurrently -> one contact/deal/activity", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const s = sub({ type: "rfq", product: "Fogger", phone: "9876543210", mobile: undefined })
  const a = await captureWebsiteSubmission(crm, s, ON, { now: T })
  const b = await captureWebsiteSubmission(crm, s, ON, { now: T })
  assert.equal(a.status, "captured"); assert.equal(b.status, "duplicate")
  const s2 = sub({ mobile: "9811112222" })
  const rs = await Promise.all(Array.from({ length: 6 }, () => captureWebsiteSubmission(crm, s2, ON, { now: T })))
  assert.equal(rs.filter(r => r.status === "captured").length, 1, JSON.stringify(rs.map(r => r.status)))
  assert.ok(rs.every(r => ["captured", "duplicate", "in_progress"].includes(r.status)))
  assert.equal(await count(crm, COLL.contacts), 2); assert.equal(await count(crm, COLL.deals), 2)
  assert.equal(await count(crm, COLL.activities, { kind: "web_form" }), 2)
  assert.equal(await count(crm, COLL.attribution), 2)
})

test("stale claim: <5min in_progress, >=5min taken over once and completed", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const s = sub({ attribution: ATTR })
  await crm.collection(COLL.attribution).insertOne({ submissionId: s._id.toHexString(), dealId: null, contactId: null, completedAt: null, skipReason: null, capturedAt: T })
  const young = await captureWebsiteSubmission(crm, s, ON, { now: new Date(T.getTime() + CLAIM_STALE_MS - 1000) })
  assert.equal(young.status, "in_progress"); assert.equal(await count(crm, COLL.contacts), 0)
  const later = new Date(T.getTime() + CLAIM_STALE_MS + 1000)
  const rs = await Promise.all([1, 2, 3, 4].map(() => captureWebsiteSubmission(crm, s, ON, { now: later })))
  assert.equal(rs.filter(r => r.status === "captured").length, 1, JSON.stringify(rs.map(r => r.status)))
  assert.equal(await count(crm, COLL.contacts), 1); assert.equal(await count(crm, COLL.deals), 1); assert.equal(await count(crm, COLL.activities, { kind: "web_form" }), 1)
  const [row] = await all(crm, COLL.attribution)
  assert.ok(row.completedAt); assert.equal(row.gclid, "GCLID_SECRET_1"); assert.ok(row.dealId)
})

test("second form on an open deal attaches, merges product interest, ORs intent; only one claim row owns the deal", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const a = await captureWebsiteSubmission(crm, sub({ mobile: "9876543210", type: "contact" }), ON, { now: T })
  const b = await captureWebsiteSubmission(crm, sub({ mobile: "9876543210", type: "quote", productName: "Fogger", quantity: "2", wantsQuote: true, attribution: ATTR }), ON, { now: new Date(T.getTime() + 1000) })
  const c = await captureWebsiteSubmission(crm, sub({ phone: "9876543210", mobile: undefined, type: "rfq", product: "fogger", dealerInquiry: true }), ON, { now: new Date(T.getTime() + 2000) })
  const d = await captureWebsiteSubmission(crm, sub({ phone: "9876543210", mobile: undefined, type: "rfq", product: "Mist", dealerInquiry: false }), ON, { now: new Date(T.getTime() + 3000) })
  assert.equal(a.status, "captured"); for (const x of [b, c, d]) { assert.equal(x.status, "captured"); assert.equal(x.dealId, a.dealId); assert.equal(x.contactId, a.contactId) }
  assert.equal(await count(crm, COLL.contacts), 1); assert.equal(await count(crm, COLL.deals), 1)
  const [deal] = await all(crm, COLL.deals)
  assert.deepEqual(deal.productInterest.map(p => p.label.toLowerCase()).sort(), ["fogger", "mist"])
  assert.deepEqual(deal.intent, { wantsQuote: true, wantsDealer: true })
  assert.equal(await count(crm, COLL.activities, { kind: "web_form" }), 4)
  const rows = await all(crm, COLL.attribution)
  assert.equal(rows.length, 4); assert.equal(rows.filter(r => r.dealId).length, 1, "u_deal: only one row owns the deal")
  assert.ok(rows.every(r => r.completedAt && r.contactId))
})

// ───────────── conversions ─────────────
test("conversions: gating, values, orderId, duplicate, concurrency", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const noClick = await captureWebsiteSubmission(crm, sub({ mobile: "9811100001" }), ON, { now: T })
  const dealNo = (await all(crm, COLL.deals, { _id: new ObjectId(noClick.dealId) }))[0]
  const won = { orderValue: 123456, wonAt: new Date("2026-10-09T12:00:00Z") }
  assert.deepEqual(await recordConversionEvent(crm, { ...dealNo, won }, "closed_won", ON, { now: T }), { status: "skipped", reason: "no_click_id" })

  const cap = await captureWebsiteSubmission(crm, sub({ mobile: "9811100002", attribution: { gclid: "G2" } }), ON, { now: T })
  const deal = (await all(crm, COLL.deals, { _id: new ObjectId(cap.dealId) }))[0]
  assert.deepEqual(await recordConversionEvent(crm, deal, "closed_won", ON, { now: T }), { status: "skipped", reason: "not_won" })
  assert.deepEqual(await recordConversionEvent(crm, { ...deal, won: { orderValue: 0, wonAt: T } }, "closed_won", ON, { now: T }), { status: "skipped", reason: "invalid_value" })
  assert.equal(await count(crm, COLL.conversionEvents), 0)
  const w = { ...deal, won }
  const r1 = await recordConversionEvent(crm, w, "closed_won", ON, { now: T })
  assert.deepEqual(r1, { status: "recorded", orderId: `${deal._id.toHexString()}:won` })
  assert.equal((await recordConversionEvent(crm, w, "closed_won", ON, { now: T })).status, "duplicate")
  const [ev] = await all(crm, COLL.conversionEvents)
  assert.equal(ev.value, 123456); assert.equal(ev.kind, "closed_won"); assert.equal(ev.gclid, "G2"); assert.equal(ev.hasClickId, true); assert.deepEqual(ev.conversionAt, won.wonAt); assert.equal(ev.currency, "INR")

  assert.deepEqual(await recordConversionEvent(crm, deal, "quotation_sent", ON, { now: T }), { status: "skipped", reason: "no_quotation" })
  const q = { ...deal, lastQuotation: { quoteNumber: "Q-2026-0007", version: 2, grandTotal: 99900, sentAt: T } }
  assert.deepEqual(await recordConversionEvent(crm, q, "quotation_sent", ON, { now: T }), { status: "recorded", orderId: "Q-2026-0007:v2" })
  assert.equal((await all(crm, COLL.conversionEvents, { kind: "quotation_sent" }))[0].value, 99900)

  const q3 = { ...deal, lastQuotation: { quoteNumber: "Q-2026-0008", version: 1, grandTotal: 500, sentAt: T } }
  const rs = await Promise.all(Array.from({ length: 8 }, () => recordConversionEvent(crm, q3, "quotation_sent", ON, { now: T })))
  assert.equal(rs.filter(r => r.status === "recorded").length, 1); assert.ok(rs.every(r => ["recorded", "duplicate"].includes(r.status)))
  assert.equal(await count(crm, COLL.conversionEvents, { orderId: "Q-2026-0008:v1" }), 1)
  assert.equal(await count(crm, COLL.conversionEvents), 3)
  assert.equal(conversionFacts({ _id: "x", contactId: "y" }, "closed_won", T).ok, false)
})
