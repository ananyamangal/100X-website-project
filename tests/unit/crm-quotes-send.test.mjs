// Run: node --import ./tests/support/register.mjs --test --test-concurrency=1 tests/unit/crm-quotes-send.test.mjs
// STEP 6c sending quotations: WhatsApp document (window open) / fog_quote_document template (closed),
// email with PDF, gate-before-upload, failures, idempotency, deal stage + lastQuotation, conversion
// event per version, opt-out, permissions. Graph and SMTP are always injected fakes.
import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { ObjectId } from "mongodb"
import { startMemoryMongo } from "./crm/helpers/memory-mongo.mjs"
import { all, count } from "./crm/helpers/wa-harness.mjs"
import { NOW, H, ago, fx, PNID, graphFetch, errStep, seedContact, seedConv, seedTemplate, jreq, reqCtx, apiDeps } from "./crm/helpers/outbound-kit.mjs"
import { crmDbFrom } from "../../lib/crm/db.ts"
import { COLL } from "../../lib/crm/model.ts"
import { createDraft, issueQuotation, reviseQuotation } from "../../lib/crm/quotes/service.ts"
import { parseQuoteInput } from "../../lib/crm/quotes/input.ts"
import { sendQuotationHandler } from "../../lib/crm/api/quotations.ts"

let m
before(async () => { m = await startMemoryMongo() })
after(async () => { if (m) await m.stop() })
const need = t => { if (!m.ok) { t.skip(m.skip); return false } return true }

let n = 0
async function txCrm() {
  const crm = crmDbFrom(m.client.db(`crm_qs_${process.pid}_${++n}`), "fogging", { client: m.client })
  await crm.ensureIndexes()
  return crm
}
const ACTOR = { userId: "u1", name: "Asha", role: "sales", permissions: ["crm.view", "crm.quotes.create", "crm.quotes.send", "crm.leads.view_all"] }
const ALL = { kind: "all" }
const LINE = { model: "TF-35", description: "Thermal fogger", qty: 2, unitPrice: 2050000, gstRate: 18 }
const PERMS = ["crm.view", "crm.quotes.send", "crm.leads.view_all"]
const MEDIA_ID = "1234567890123456"

/** Graph fake: /media -> {id}, /messages -> success (or the given step). */
const graph = (messagesStep, mediaStep = { status: 200, body: { id: MEDIA_ID } }) =>
  graphFetch([call => (call.url.endsWith("/media") ? mediaStep : (messagesStep ?? { status: 200, body: fx("graph-send-success") }))])

async function setup(o = {}) {
  const crm = await txCrm()
  const c = await seedContact(crm, { name: o.name ?? "Ramesh Kumar", marketingOptOut: o.optedOut ? { at: NOW, via: "stop_keyword" } : null, extra: { email: o.email === undefined ? "ramesh@example.in" : o.email, language: o.language ?? "en_US", company: "Nagar Nigam", state: "Haryana" } })
  if (o.optedOut) await crm.collection(COLL.optOuts).insertOne({ phoneE164: c.phoneE164, scope: "marketing", via: "stop_keyword", at: NOW, by: null, sourceMessageId: null })
  const conv = await seedConv(crm, c, { lastInboundAt: o.lastInboundAt === undefined ? ago(H) : o.lastInboundAt })
  const dealId = new ObjectId()
  await crm.collection(COLL.deals).insertOne({ _id: dealId, contactId: c._id, stage: o.stage ?? "requirement_shared", isOpen: true, stageEnteredAt: NOW, stageHistory: [], assignedTo: null, lastQuotation: null, createdAt: NOW, updatedAt: NOW })
  const d = await createDraft(crm, ACTOR, ALL, dealId, { lines: parseQuoteInput({ lines: [LINE] }, { requireLines: true }).input.lines }, { now: NOW })
  const issued = await issueQuotation(crm, ACTOR, ALL, d.quotation._id, { now: NOW })
  return { crm, c, conv, dealId, q: issued.quotation }
}
const send = (crm, id, b, o = {}) => sendQuotationHandler(jreq("POST", "http://x/s", b), reqCtx(id), apiDeps(crm, { perms: PERMS, ...o }))
const body = r => r.json()
const tplApproved = (crm, o = {}) => seedTemplate(crm, { name: "fog_quote_document", bodyParamCount: 5, headerType: "DOCUMENT", bodyText: "Hello {{1}} ... {{5}}", ...o })

test("WhatsApp, window open: upload PDF -> document message (id, filename, caption); sends[], activity, stage -> quotation_sent, lastQuotation.sentAt, audit; replay -> 200 deduped, no calls", async t => {
  if (!need(t)) return
  const { crm, dealId, q } = await setup()
  const f = graph()
  const r = await send(crm, q._id, { channel: "whatsapp", idempotencyKey: "send-key-0001" }, { fetch: f })
  assert.equal(r.status, 201, JSON.stringify(await r.clone().json()))
  assert.equal(f.calls.length, 2)
  const [up, msg] = f.calls
  assert.equal(up.url, `https://graph.facebook.com/v23.0/${PNID}/media`)
  assert.equal(up.body.messaging_product, "whatsapp"); assert.equal(up.body.type, "application/pdf")
  assert.equal(up.body.file.name, "Quotation-100X-QT-2026-27-0001.pdf")
  const stored = (await all(crm, COLL.quotationPdfs))[0]
  assert.equal(createHash("sha256").update(Buffer.from(await up.body.file.arrayBuffer())).digest("hex"), stored.sha256, "the stored PDF is what was uploaded")
  assert.equal(msg.body.type, "document")
  assert.deepEqual(msg.body.document, { id: MEDIA_ID, filename: "Quotation-100X-QT-2026-27-0001.pdf", caption: "Quotation 100X/QT/2026-27/0001" })
  const row = (await all(crm, COLL.messages))[0]
  assert.equal(row.status, "sent"); assert.equal(row.type, "document"); assert.equal(row.media.waMediaId, MEDIA_ID)
  const qd = await crm.collection(COLL.quotations).findOne({ _id: q._id })
  assert.equal(qd.sends.length, 1); assert.equal(qd.sends[0].channel, "whatsapp"); assert.equal(String(qd.sends[0].messageId), String(row._id))
  assert.equal(await count(crm, COLL.activities, { kind: "quotation_sent" }), 1)
  const deal = await crm.collection(COLL.deals).findOne({ _id: dealId })
  assert.equal(deal.stage, "quotation_sent"); assert.equal(deal.stageHistory.at(-1).note, "auto: quotation 100X/QT/2026-27/0001 sent")
  assert.deepEqual(deal.lastQuotation.sentAt, NOW)
  assert.equal(await count(crm, COLL.audit, { action: "quotation.send" }), 1)
  const again = await send(crm, q._id, { channel: "whatsapp", idempotencyKey: "send-key-0001" }, { fetch: f })
  assert.equal(again.status, 200); assert.equal((await body(again)).deduped, true)
  assert.equal(f.calls.length, 2, "no upload, no send on replay")
})

test("WhatsApp, window closed: fog_quote_document template with DOCUMENT header + 5 params; Hindi contact falls back to en_US when no hi template, uses hi when approved", async t => {
  if (!need(t)) return
  const { crm, q } = await setup({ lastInboundAt: ago(40 * H), language: "hi" })
  await tplApproved(crm)
  const f = graph()
  const r = await send(crm, q._id, { channel: "whatsapp", idempotencyKey: "send-key-0002" }, { fetch: f })
  assert.equal(r.status, 201)
  const tpl = f.calls[1].body.template
  assert.equal(tpl.name, "fog_quote_document"); assert.equal(tpl.language.code, "en_US")
  assert.deepEqual(tpl.components[0], { type: "header", parameters: [{ type: "document", document: { id: MEDIA_ID, filename: "Quotation-100X-QT-2026-27-0001.pdf" } }] })
  assert.deepEqual(tpl.components[1].parameters.map(p => p.text), ["Ramesh Kumar", "100X/QT/2026-27/0001", "TF-35", "48,380", "25 Oct 2026"])
  assert.equal(await count(crm, COLL.sendLedger), 1, "business-initiated: counted for the tier cap")
  // with a hi template approved, the next version goes out in Hindi
  await tplApproved(crm, { language: "hi" })
  const rv = await reviseQuotation(crm, ACTOR, ALL, q._id, { now: NOW })
  const v2 = await issueQuotation(crm, ACTOR, ALL, rv.quotation._id, { now: NOW })
  const f2 = graph()
  assert.equal((await send(crm, v2.quotation._id, { channel: "whatsapp", idempotencyKey: "send-key-0003" }, { fetch: f2 })).status, 201)
  assert.equal(f2.calls[1].body.template.language.code, "hi")
  assert.equal(f2.calls[1].body.template.components[1].parameters[1].text, "100X/QT/2026-27/0001 Rev 2")
})

test("gate refuses BEFORE any Meta call: template missing (window closed), not on WhatsApp, opted out + template; no sends recorded", async t => {
  if (!need(t)) return
  const a = await setup({ lastInboundAt: ago(40 * H) })
  const f = graph()
  const r = await send(a.crm, a.q._id, { channel: "whatsapp", idempotencyKey: "send-key-0004" }, { fetch: f })
  assert.equal(r.status, 422); assert.equal((await body(r)).error, "template_unknown")
  const b = await setup()
  await b.crm.collection(COLL.contacts).updateOne({ _id: b.c._id }, { $set: { notOnWhatsApp: NOW } })
  const r2 = await send(b.crm, b.q._id, { channel: "whatsapp", idempotencyKey: "send-key-0005" }, { fetch: f })
  assert.equal(r2.status, 409); assert.equal((await body(r2)).error, "not_on_whatsapp")
  const c = await setup({ lastInboundAt: ago(40 * H), optedOut: true })
  await tplApproved(c.crm)
  const r3 = await send(c.crm, c.q._id, { channel: "whatsapp", idempotencyKey: "send-key-0006" }, { fetch: f })
  assert.equal((await body(r3)).error, "opted_out")
  assert.equal(f.calls.length, 0, "zero Graph calls (no upload)")
  for (const x of [a, b, c]) assert.equal((await x.crm.collection(COLL.quotations).findOne({ _id: x.q._id })).sends.length, 0)
})

test("opted-out contact inside the window still gets the quotation document (quotation purpose, DATA_MODEL §1.11)", async t => {
  if (!need(t)) return
  const { crm, q } = await setup({ optedOut: true })
  const f = graph()
  assert.equal((await send(crm, q._id, { channel: "whatsapp", idempotencyKey: "send-key-0007" }, { fetch: f })).status, 201)
  assert.equal(f.calls[1].body.type, "document")
})

test("failures: upload error -> 502, no message row; send error -> 502 failed row, same key stays failed (no new calls), a new key sends", async t => {
  if (!need(t)) return
  const { crm, q } = await setup()
  const bad = graph(undefined, { status: 400, body: { error: { message: "(#100) Invalid parameter", code: 100, fbtrace_id: "TUP" } } })
  const r = await send(crm, q._id, { channel: "whatsapp", idempotencyKey: "send-key-0008" }, { fetch: bad })
  assert.equal(r.status, 502); assert.equal((await body(r)).error, "media_upload_failed")
  assert.equal(await count(crm, COLL.messages), 0)
  const f = graph(errStep("graph-send-error-131047"))
  const s1 = await send(crm, q._id, { channel: "whatsapp", idempotencyKey: "send-key-0009" }, { fetch: f })
  assert.equal(s1.status, 502); assert.equal((await body(s1)).error, "send_failed")
  const callsAfter = f.calls.length
  const s2 = await send(crm, q._id, { channel: "whatsapp", idempotencyKey: "send-key-0009" }, { fetch: f })
  assert.equal(s2.status, 502); assert.equal(f.calls.length, callsAfter, "failed attempt is not retried under the same key")
  assert.equal((await crm.collection(COLL.quotations).findOne({ _id: q._id })).sends.length, 0)
  assert.equal((await send(crm, q._id, { channel: "whatsapp", idempotencyKey: "send-key-0010" }, { fetch: graph() })).status, 201)
})

test("email: PDF attached (the stored bytes), default address from the contact, explicit 'to'; validation; not configured -> 503", async t => {
  if (!need(t)) return
  const { crm, q, dealId } = await setup()
  const mails = []
  const sendEmail = async a => { mails.push(a); return { ok: true, messageId: "<m1@x>" } }
  const r = await send(crm, q._id, { channel: "email", idempotencyKey: "mail-key-0001" }, { sendEmail })
  assert.equal(r.status, 201)
  assert.equal(mails[0].to, "ramesh@example.in")
  assert.equal(mails[0].subject, "Quotation 100X/QT/2026-27/0001 — 100X Circle")
  assert.match(mails[0].text, /Rs\. 48,380\.00 \(incl\. GST\)/)
  const att = mails[0].attachments[0]
  assert.equal(att.filename, "Quotation-100X-QT-2026-27-0001.pdf"); assert.equal(att.contentType, "application/pdf")
  assert.equal(createHash("sha256").update(att.content).digest("hex"), (await all(crm, COLL.quotationPdfs))[0].sha256)
  assert.equal((await crm.collection(COLL.deals).findOne({ _id: dealId })).stage, "quotation_sent")
  assert.equal((await send(crm, q._id, { channel: "email", idempotencyKey: "mail-key-0001" }, { sendEmail })).status, 200, "replay deduped")
  assert.equal(mails.length, 1)
  assert.equal((await send(crm, q._id, { channel: "email", idempotencyKey: "mail-key-0002", to: "buyer@corp.example" }, { sendEmail })).status, 201)
  assert.equal(mails[1].to, "buyer@corp.example")
  const bad = await send(crm, q._id, { channel: "email", idempotencyKey: "mail-key-0003", to: "not an email" }, { sendEmail })
  assert.equal(bad.status, 400); assert.equal((await body(bad)).fields.to, "invalid_email")
  assert.equal((await send(crm, q._id, { channel: "whatsapp", idempotencyKey: "mail-key-0004", to: "a@b.co" }, { sendEmail })).status, 400, "'to' only for email")
  assert.equal((await send(crm, q._id, { channel: "email", idempotencyKey: "mail-key-0005" }, { sendEmail: async () => ({ ok: false, reason: "not_configured" }) })).status, 503)
  const noMail = await setup({ email: null })
  const nm = await send(noMail.crm, noMail.q._id, { channel: "email", idempotencyKey: "mail-key-0006" }, { sendEmail })
  assert.equal((await body(nm)).fields.to, "no_email_on_contact")
})

test("stage never moves backwards: a deal at negotiation stays there; lastQuotation still records the send", async t => {
  if (!need(t)) return
  const { crm, q, dealId } = await setup({ stage: "negotiation" })
  assert.equal((await send(crm, q._id, { channel: "whatsapp", idempotencyKey: "send-key-0011" }, { fetch: graph() })).status, 201)
  const deal = await crm.collection(COLL.deals).findOne({ _id: dealId })
  assert.equal(deal.stage, "negotiation"); assert.equal(deal.stageHistory.length, 0)
  assert.deepEqual(deal.lastQuotation.sentAt, NOW)
})

test("conversion event (secondary, quotation_sent): on the FIRST send of each version only, value = grand total, orderId <number>:v<version>", async t => {
  if (!need(t)) return
  const { crm, c, q, dealId } = await setup()
  await crm.collection(COLL.attribution).insertOne({ contactId: c._id, dealId, gclid: "TEST-GCLID-1", capturedAt: NOW, submissionId: new ObjectId() })
  const env = { waPhoneNumberIds: [PNID], waAccessToken: "test-access-token-not-real", waApiVersion: "v23.0", growthSync: true }
  const mails = []
  const sendEmail = async a => { mails.push(a); return { ok: true } }
  await send(crm, q._id, { channel: "whatsapp", idempotencyKey: "conv-key-0001" }, { fetch: graph(), env })
  await send(crm, q._id, { channel: "email", idempotencyKey: "conv-key-0002" }, { env, sendEmail })
  let ev = await all(crm, COLL.conversionEvents)
  assert.equal(ev.length, 1)
  assert.equal(ev[0].kind, "quotation_sent"); assert.equal(ev[0].orderId, "100X/QT/2026-27/0001:v1"); assert.equal(ev[0].value, 4838000)
  const rv = await reviseQuotation(crm, ACTOR, ALL, q._id, { now: NOW })
  const v2 = await issueQuotation(crm, ACTOR, ALL, rv.quotation._id, { now: NOW })
  await send(crm, v2.quotation._id, { channel: "email", idempotencyKey: "conv-key-0003" }, { env, sendEmail })
  ev = await all(crm, COLL.conversionEvents)
  assert.deepEqual(ev.map(e => e.orderId).sort(), ["100X/QT/2026-27/0001:v1", "100X/QT/2026-27/0001:v2"])
  // sync off -> nothing
  const off = await setup()
  await off.crm.collection(COLL.attribution).insertOne({ contactId: off.c._id, dealId: off.dealId, gclid: "G2", capturedAt: NOW, submissionId: new ObjectId() })
  await send(off.crm, off.q._id, { channel: "email", idempotencyKey: "conv-key-0004" }, { env: { ...env, growthSync: false }, sendEmail })
  assert.equal(await count(off.crm, COLL.conversionEvents), 0)
})

test("only the latest issued version is sendable; drafts are not; crm.quotes.send required; out-of-scope -> 404; bad body -> 400", async t => {
  if (!need(t)) return
  const { crm, q } = await setup()
  const rv = await reviseQuotation(crm, ACTOR, ALL, q._id, { now: NOW })
  const draftRes = await send(crm, rv.quotation._id, { channel: "email", idempotencyKey: "perm-key-0001" }, { sendEmail: async () => ({ ok: true }) })
  assert.equal((await body(draftRes)).error, "not_issued")
  await issueQuotation(crm, ACTOR, ALL, rv.quotation._id, { now: NOW })
  const old = await send(crm, q._id, { channel: "email", idempotencyKey: "perm-key-0002" }, { sendEmail: async () => ({ ok: true }) })
  assert.equal(old.status, 409); assert.equal((await body(old)).error, "not_latest")
  assert.equal((await send(crm, q._id, { channel: "email", idempotencyKey: "perm-key-0003" }, { perms: ["crm.view", "crm.quotes.create", "crm.leads.view_all"] })).status, 403)
  assert.equal((await send(crm, rv.quotation._id, { channel: "email", idempotencyKey: "perm-key-0004" }, { perms: ["crm.view", "crm.quotes.send", "crm.leads.view_assigned"], sub: "u7" })).status, 404)
  assert.equal((await send(crm, rv.quotation._id, { channel: "fax", idempotencyKey: "perm-key-0005" })).status, 400)
  assert.equal((await send(crm, rv.quotation._id, { channel: "email", idempotencyKey: "short" })).status, 400)
})
