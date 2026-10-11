// Run: node --import ./tests/support/register.mjs --test --test-concurrency=1 tests/unit/crm-broadcasts.test.mjs
// STEP 9 segments + broadcasts + chunk loop + tracking + queue route. Graph and the self-call are
// injected fakes; sleeps are no-ops.
import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { ObjectId } from "mongodb"
import { startMemoryMongo } from "./crm/helpers/memory-mongo.mjs"
import { freshCrm, all, count, post } from "./crm/helpers/wa-harness.mjs"
import { TEST_WA, loadFixtureJson } from "./crm/helpers/wa-sign.mjs"
import { NOW, H, PNID, ago, graphFetch, errStep, fx, jreq, reqCtx, apiDeps, seedTemplate } from "./crm/helpers/outbound-kit.mjs"
import { COLL } from "../../lib/crm/model.ts"
import { parseSegmentInput, previewAudience, audienceContacts } from "../../lib/crm/broadcasts/segments.ts"
import { parseBroadcastInput } from "../../lib/crm/broadcasts/service.ts"
import { runChunk } from "../../lib/crm/queue/chunk.ts"
import { handleQueueRun, signChunk, verifyChunkSig, SIG_HEADER } from "../../lib/crm/queue/trigger.ts"
import { applyRecipientStatus, attributeReply } from "../../lib/crm/broadcasts/tracking.ts"
import { sendMessage } from "../../lib/crm/outbound/send.ts"
import { fromComposer } from "../../lib/crm/outbound/compose.ts"
import {
  listSegmentsHandler, createSegmentHandler, previewSegmentHandler, createBroadcastHandler, getBroadcastHandler, updateBroadcastHandler, deleteBroadcastHandler, broadcastActionHandler, listBroadcastsHandler,
} from "../../lib/crm/api/broadcasts.ts"

let m
before(async () => { m = await startMemoryMongo() })
after(async () => { if (m) await m.stop() })
const need = t => { if (!m.ok) { t.skip(m.skip); return false } return true }
const D = 24 * H
const NO_PARAMS = { params: Promise.resolve({}) }
const SEND = ["crm.view", "crm.broadcasts.view", "crm.broadcasts.send"]
const ENV = { waPhoneNumberIds: [PNID], waAccessToken: TEST_WA.accessToken, waApiVersion: "v23.0", growthSync: true }
const noSleep = async () => {}
const body = r => r.json()
let n = 0
async function contact(crm, o = {}) {
  const i = ++n
  const _id = new ObjectId()
  const phone = o.phone ?? `+9197${String(10000000 + i).padStart(8, "0")}`
  await crm.collection(COLL.contacts).insertOne({
    _id, phoneE164: phone, waId: phone.slice(1), name: o.name === undefined ? `Cust ${i}` : o.name, waProfileName: null, company: o.company ?? null, city: o.city ?? null,
    state: o.state ?? null, customerType: o.customerType ?? null, interestTags: o.tags ?? [], existingDealer: o.dealer ? { directoryId: "d", matchedAt: NOW } : null,
    language: o.language ?? "en_US", marketingOptOut: o.optedOut ? { at: NOW, via: "manual" } : null, notOnWhatsApp: o.notOn ? NOW : null, mergedInto: o.merged ? new ObjectId() : null,
    staffUserId: o.staff ?? null, suggestions: [], assignedTo: null, createdAt: NOW, updatedAt: NOW,
  })
  if (o.deal) await crm.collection(COLL.deals).insertOne({ contactId: _id, isOpen: o.deal.stage !== "closed_won", leadSource: "call", closedAt: null, ...o.deal, createdAt: NOW })
  return { _id, phone }
}
const tpl = (crm, o = {}) => seedTemplate(crm, { name: "fog_product_offer", bodyParamCount: 2, category: "MARKETING", headerType: "NONE", ...o })
async function seg(crm, filter = {}) {
  const _id = new ObjectId()
  await crm.collection(COLL.segments).insertOne({ _id, name: "S", filter, createdBy: { userId: "u1", name: "A" }, createdAt: NOW, updatedAt: NOW })
  return _id
}
const PARAMS = [{ from: "contact.name" }, { literal: "₹41,000" }]
async function draft(crm, segmentId, o = {}) {
  const r = await createBroadcastHandler(jreq("POST", "http://x/b", { name: "Diwali offer", segmentId: String(segmentId), templateName: "fog_product_offer", params: PARAMS, ...o }), NO_PARAMS, apiDeps(crm, { perms: SEND, env: ENV }))
  assert.equal(r.status, 201, JSON.stringify(await r.clone().json()))
  return (await r.json()).broadcast.id
}
const action = (crm, a, id, o = {}) => broadcastActionHandler(a)(jreq("POST", "http://x/a"), reqCtx(id), apiDeps(crm, { perms: SEND, env: ENV, sleep: noSleep, ...o }))
const bc = (crm, id) => crm.collection(COLL.broadcasts).findOne({ _id: new ObjectId(id) })

// ───────────────────────── segments ─────────────────────────
test("segments: validation; contact + deal criteria ANDed; merged and staff contacts never included; preview counts", async t => {
  if (!need(t)) return
  assert.equal(parseSegmentInput({ name: "x", filter: { customerTypes: ["alien"] } }).fields["filter.customerTypes"], "invalid_list")
  assert.equal(parseSegmentInput({ name: "x", filter: { closedWonWithinDays: 0 } }).fields["filter.closedWonWithinDays"], "invalid_number")
  assert.equal(parseSegmentInput({ name: "x", filter: { colour: 1 } }).fields["filter.colour"], "unknown_field")
  const crm = await freshCrm(m)
  const a = await contact(crm, { customerType: "dealer", state: "Haryana", tags: ["gem"] })
  await contact(crm, { customerType: "dealer", state: "Punjab" })
  await contact(crm, { customerType: "b2c", state: "Haryana" })
  await contact(crm, { customerType: "dealer", state: "Haryana", merged: true })
  await contact(crm, { customerType: "dealer", state: "Haryana", staff: "u9" })
  const won = await contact(crm, { deal: { stage: "closed_won", closedAt: ago(100 * D) } })
  await contact(crm, { deal: { stage: "closed_won", closedAt: ago(400 * D) } })
  const ids = async f => (await audienceContacts(crm, f, NOW)).map(c => String(c._id))
  assert.deepEqual(await ids({ customerTypes: ["dealer"], states: ["Haryana"] }), [String(a._id)])
  assert.deepEqual(await ids({ interestTags: ["gem"] }), [String(a._id)])
  assert.deepEqual(await ids({ closedWonWithinDays: 365 }), [String(won._id)])
  assert.equal((await ids({})).length, 5, "empty filter = everyone except merged + staff")
  await contact(crm, { customerType: "dealer", state: "Haryana", optedOut: true })
  await contact(crm, { customerType: "dealer", state: "Haryana", notOn: true })
  assert.deepEqual(await previewAudience(crm, { customerTypes: ["dealer"], states: ["Haryana"] }, NOW), { total: 3, sendable: 1, optedOut: 1, notOnWhatsApp: 1, tooMany: false })
})

// ───────────────────────── drafts ─────────────────────────
test("broadcast drafts: template must be APPROVED, positional, no media header, matching param count; edit/delete only while draft", async t => {
  if (!need(t)) return
  assert.equal(parseBroadcastInput({ name: "x", segmentId: "a".repeat(24), templateName: "t", params: [{ from: "contact.age" }] }).fields["params.0"], "invalid")
  assert.equal(parseBroadcastInput({ name: "x", segmentId: "a".repeat(24), templateName: "t", params: [{ literal: "a\nb" }] }).fields["params.0.literal"], "invalid_characters")
  const crm = await freshCrm(m)
  const s = await seg(crm)
  const make = b => createBroadcastHandler(jreq("POST", "http://x/b", { name: "B", segmentId: String(s), templateName: "fog_product_offer", params: PARAMS, ...b }), NO_PARAMS, apiDeps(crm, { perms: SEND, env: ENV }))
  assert.equal((await body(await make())).fields.templateName, "template_unknown")
  await tpl(crm, { status: "PENDING" })
  assert.equal((await body(await make())).fields.templateName, "template_not_approved")
  await crm.collection(COLL.waTemplates).updateOne({ name: "fog_product_offer" }, { $set: { status: "APPROVED", headerType: "IMAGE" } })
  assert.equal((await body(await make())).fields.templateName, "media_header_unsupported")
  await crm.collection(COLL.waTemplates).updateOne({ name: "fog_product_offer" }, { $set: { headerType: "NONE" } })
  assert.equal((await body(await make({ params: [PARAMS[0]] }))).fields.params, "expected_2")
  assert.equal((await make({}, )).status, 201)
  assert.equal((await createBroadcastHandler(jreq("POST", "http://x/b", {}), NO_PARAMS, apiDeps(crm, { perms: ["crm.view", "crm.broadcasts.view"], env: ENV }))).status, 403)
  const id = await draft(crm, s)
  assert.equal((await updateBroadcastHandler(jreq("PATCH", "http://x/b", { name: "Renamed", segmentId: String(s), templateName: "fog_product_offer", params: PARAMS }), reqCtx(id), apiDeps(crm, { perms: SEND, env: ENV }))).status, 200)
  assert.equal((await bc(crm, id)).name, "Renamed")
  assert.equal((await deleteBroadcastHandler(jreq("DELETE", "http://x/b"), reqCtx(id), apiDeps(crm, { perms: SEND }))).status, 200)
  assert.equal((await listBroadcastsHandler(jreq("GET", "http://x/b"), NO_PARAMS, apiDeps(crm, { perms: SEND }))).status, 200)
})

// ───────────────────────── start + send ─────────────────────────
test("start: expansion with skip reasons + language choice, then the chunk loop sends every queued recipient and completes the campaign", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await tpl(crm); await tpl(crm, { language: "hi" })
  const ok = await contact(crm, { name: "Ramesh", customerType: "dealer" })
  const hi = await contact(crm, { name: "सुरेश", customerType: "dealer", language: "hi" })
  await contact(crm, { customerType: "dealer", optedOut: true })
  await contact(crm, { customerType: "dealer", notOn: true })
  await contact(crm, { customerType: "dealer", name: null })
  const s = await seg(crm, { customerTypes: ["dealer"] })
  const id = await draft(crm, s)
  const f = graphFetch()
  const r = await action(crm, "start", id, { fetch: f })
  assert.equal(r.status, 200)
  const b = await bc(crm, id)
  assert.equal(b.status, "completed")
  assert.deepEqual({ total: b.counts.total, skipped: b.counts.skipped, sent: b.counts.sent, queued: b.counts.queued }, { total: 5, skipped: 3, sent: 2, queued: 0 })
  const recs = await all(crm, COLL.broadcastRecipients)
  assert.deepEqual(recs.filter(x => x.deliveryStatus === "skipped").map(x => x.skipReason).sort(), ["not_on_whatsapp", "opted_out", "template_missing_param"])
  assert.equal(f.calls.length, 2)
  const byTo = Object.fromEntries(f.calls.map(c => [c.body.to, c.body.template]))
  assert.deepEqual(byTo[ok.phone.slice(1)].components[0].parameters.map(p => p.text), ["Ramesh", "₹41,000"])
  assert.equal(byTo[ok.phone.slice(1)].language.code, "en_US")
  assert.equal(byTo[hi.phone.slice(1)].language.code, "hi")
  const msgs = await all(crm, COLL.messages, { direction: "out" })
  assert.ok(msgs.every(x => x.author.kind === "broadcast" && String(x.author.broadcastId) === id))
  assert.ok(msgs.every(x => x.idempotencyKey.startsWith(`bc:${id}:`)))
  assert.equal((await action(crm, "start", id)).status, 409, "cannot start twice")
})

test("tier cap: broadcasts stop at cap − margin; the rest is DEFERRED (not failed) to the cap's retry time; the loop reports only-deferred", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await tpl(crm)
  await crm.collection(COLL.waNumbers).insertOne({ phoneNumberId: PNID, tierCap: 3, tierCapSafetyMargin: 1 })
  for (let i = 0; i < 4; i++) await contact(crm, { customerType: "dealer" })
  const id = await draft(crm, await seg(crm, { customerTypes: ["dealer"] }))
  const f = graphFetch()
  await action(crm, "start", id, { fetch: f })
  assert.equal(f.calls.length, 2, "limit = 3 − 1")
  const b = await bc(crm, id)
  assert.equal(b.status, "sending"); assert.equal(b.counts.sent, 2); assert.equal(b.counts.deferred_cap, 2); assert.equal(b.counts.failed, 0)
  const deferred = await all(crm, COLL.broadcastRecipients, { status: "pending" })
  assert.equal(deferred.length, 2)
  assert.ok(deferred.every(x => x.deferredForCap === 1 && x.nextAttemptAt > NOW && x.attempts === 0))
  const r = await runChunk(crm, PNID, { allowList: [PNID], graph: { accessToken: "t", apiVersion: "v23.0", fetch: f, timeoutMs: 1000 }, requestId: "r", now: () => NOW, sleep: noSleep })
  assert.equal(r.more, false); assert.equal(r.onlyDeferred, true)
  // 24 h later the cap has room again
  const later = new Date(NOW.getTime() + D + 60_000)
  await runChunk(crm, PNID, { allowList: [PNID], graph: { accessToken: "t", apiVersion: "v23.0", fetch: f, timeoutMs: 1000 }, requestId: "r", now: () => later, sleep: noSleep })
  assert.equal((await bc(crm, id)).status, "completed")
  assert.equal(f.calls.length, 4)
})

test("pause releases recipients untouched; resume sends; cancel marks the rest skipped(cancelled)", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await tpl(crm)
  for (let i = 0; i < 3; i++) await contact(crm, { customerType: "dealer" })
  const id = await draft(crm, await seg(crm, { customerTypes: ["dealer"] }))
  // start without a token: expansion happens, nothing can be sent yet
  await action(crm, "start", id, { env: { ...ENV, waAccessToken: undefined } })
  assert.equal((await bc(crm, id)).status, "sending")
  assert.equal((await action(crm, "pause", id)).status, 200)
  const f = graphFetch()
  await runChunk(crm, PNID, { allowList: [PNID], graph: { accessToken: "t", apiVersion: "v23.0", fetch: f, timeoutMs: 1000 }, requestId: "r", now: () => NOW, sleep: noSleep })
  assert.equal(f.calls.length, 0, "paused: nothing sent")
  assert.equal(await count(crm, COLL.broadcastRecipients, { status: "pending", attempts: 0 }), 3)
  assert.equal((await action(crm, "pause", id)).status, 409)
  assert.equal((await action(crm, "resume", id, { fetch: f })).status, 200)
  assert.equal(f.calls.length, 3); assert.equal((await bc(crm, id)).status, "completed")
  // cancel
  const crm2 = await freshCrm(m)
  await tpl(crm2)
  for (let i = 0; i < 2; i++) await contact(crm2, { customerType: "dealer" })
  const id2 = await draft(crm2, await seg(crm2, { customerTypes: ["dealer"] }))
  await action(crm2, "start", id2, { env: { ...ENV, waAccessToken: undefined } })
  assert.equal((await action(crm2, "cancel", id2)).status, 200)
  const b2 = await bc(crm2, id2)
  assert.equal(b2.status, "cancelled"); assert.equal(b2.counts.queued, 0); assert.equal(b2.counts.skipped, 2)
  assert.ok((await all(crm2, COLL.broadcastRecipients)).every(x => x.status === "cancelled" && x.skipReason === "cancelled"))
})

test("Meta errors: retryable -> backoff and retried; 131026 -> failed(not_on_whatsapp); 131048 -> number paused -> campaign pauses; half-sent replay -> unknown_outcome", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await tpl(crm)
  const c1 = await contact(crm, { customerType: "dealer" })
  const id = await draft(crm, await seg(crm, { customerTypes: ["dealer"] }))
  await action(crm, "start", id, { fetch: graphFetch([errStep("graph-send-error-130429", 429)]) })
  let rec = (await all(crm, COLL.broadcastRecipients))[0]
  assert.equal(rec.status, "pending"); assert.equal(rec.attempts, 1); assert.ok(rec.nextAttemptAt > NOW)
  assert.equal(await count(crm, COLL.jobs, { kind: "wa_send" }), 0, "broadcast owns its retries (no wa_send job)")
  const later = new Date(NOW.getTime() + 10 * 60_000)
  const ok = graphFetch()
  await runChunk(crm, PNID, { allowList: [PNID], graph: { accessToken: "t", apiVersion: "v23.0", fetch: ok, timeoutMs: 1000 }, requestId: "r", now: () => later, sleep: noSleep })
  rec = (await all(crm, COLL.broadcastRecipients))[0]
  assert.equal(rec.deliveryStatus, "sent")
  // 131026
  const crm2 = await freshCrm(m)
  await tpl(crm2)
  await contact(crm2, { customerType: "dealer" })
  const id2 = await draft(crm2, await seg(crm2, { customerTypes: ["dealer"] }))
  await action(crm2, "start", id2, { fetch: graphFetch([errStep("graph-send-error-131026")]) })
  const r2 = (await all(crm2, COLL.broadcastRecipients))[0]
  assert.equal(r2.deliveryStatus, "failed"); assert.equal(r2.skipReason, "not_on_whatsapp")
  assert.equal((await bc(crm2, id2)).counts.failed, 1)
  // 131048 pauses the number, then the campaign
  const crm3 = await freshCrm(m)
  await tpl(crm3)
  for (let i = 0; i < 3; i++) await contact(crm3, { customerType: "dealer" })
  const id3 = await draft(crm3, await seg(crm3, { customerTypes: ["dealer"] }))
  await action(crm3, "start", id3, { fetch: graphFetch([{ status: 400, body: { error: { message: "(#131048) Spam rate limit", code: 131048, fbtrace_id: "T" } } }]) })
  const b3 = await bc(crm3, id3)
  assert.equal(b3.status, "paused"); assert.equal(b3.pausedReason, "number_paused")
  assert.ok(await count(crm3, COLL.broadcastRecipients, { status: "pending" }) >= 1, "the rest waits")
  // half-sent replay
  const crm4 = await freshCrm(m)
  await tpl(crm4)
  const c4 = await contact(crm4, { customerType: "dealer" })
  const id4 = await draft(crm4, await seg(crm4, { customerTypes: ["dealer"] }))
  await action(crm4, "start", id4, { env: { ...ENV, waAccessToken: undefined } })
  await crm4.collection(COLL.messages).insertOne({ _id: new ObjectId(), contactId: c4._id, conversationId: new ObjectId(), direction: "out", type: "template", status: "queued", sendAttemptedAt: NOW, waMessageId: null, idempotencyKey: `bc:${id4}:${c4.phone}`, createdAt: NOW })
  const f4 = graphFetch()
  await runChunk(crm4, PNID, { allowList: [PNID], graph: { accessToken: "t", apiVersion: "v23.0", fetch: f4, timeoutMs: 1000 }, requestId: "r", now: () => NOW, sleep: noSleep })
  const r4 = (await all(crm4, COLL.broadcastRecipients))[0]
  assert.equal(r4.deliveryStatus, "failed"); assert.equal(r4.lastError.code, "unknown_outcome"); assert.equal(f4.calls.length, 0, "never re-sent")
  void c1
})

// ───────────────────────── tracking ─────────────────────────
test("tracking: delivered / read ticks counted once per recipient (read implies delivered); replies within 72 h attributed once", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await tpl(crm)
  const c = await contact(crm, { customerType: "dealer", phone: "+919800000001" })
  const id = await draft(crm, await seg(crm, { customerTypes: ["dealer"] }))
  const f = graphFetch()
  await action(crm, "start", id, { fetch: f })
  const wamid = f.wamids[0]
  assert.equal(await applyRecipientStatus(crm, wamid, "read", NOW), true)
  assert.equal(await applyRecipientStatus(crm, wamid, "delivered", NOW), false, "already reached")
  assert.equal(await applyRecipientStatus(crm, wamid, "read", NOW), false)
  let b = await bc(crm, id)
  assert.deepEqual([b.counts.sent, b.counts.delivered, b.counts.read], [1, 1, 1])
  assert.equal(await applyRecipientStatus(crm, "wamid.other", "read", NOW), false)
  // reply through the real webhook path (customer +919800000001)
  await post(crm, loadFixtureJson("text"), { now: () => new Date(NOW.getTime() + H) })
  b = await bc(crm, id)
  assert.equal(b.counts.replied, 1)
  assert.ok((await all(crm, COLL.broadcastRecipients))[0].repliedAt)
  assert.equal(await attributeReply(crm, c.phone, new Date(NOW.getTime() + 2 * H)), false, "once")
  // a status webhook for the broadcast wamid also updates the recipient
  const j = loadFixtureJson("status-delivered")
  j.entry[0].changes[0].value.statuses[0].id = wamid
  await post(crm, j)
  assert.equal((await bc(crm, id)).counts.delivered, 1, "no double count")
})

test("chunk loop also runs queued jobs: a retryable single-send failure is re-sent under retry:<id>:a<n>", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await contact(crm)
  const conv = new ObjectId()
  await crm.collection(COLL.conversations).insertOne({ _id: conv, contactId: c._id, phoneNumberId: PNID, waId: c.phone.slice(1), status: "open", lastInboundAt: ago(H), lastMessageAt: ago(H), createdAt: NOW, updatedAt: NOW })
  const text = fromComposer("Hello again")
  const first = await sendMessage(crm, { userId: "u1", name: "A" }, { contactId: c._id, conversationId: conv, idempotencyKey: "reply:u1:k-000001", route: "t", content: { kind: "text", text: text.text } },
    { allowList: [PNID], graph: { accessToken: "t", apiVersion: "v23.0", fetch: graphFetch([errStep("graph-send-error-130429", 429)]), timeoutMs: 1000 }, requestId: "r", now: () => NOW })
  assert.equal(first.detail.retryQueued, true)
  const later = new Date(NOW.getTime() + H)
  const f = graphFetch()
  const r = await runChunk(crm, PNID, { allowList: [PNID], graph: { accessToken: "t", apiVersion: "v23.0", fetch: f, timeoutMs: 1000 }, requestId: "r", now: () => later, sleep: noSleep })
  assert.equal(r.jobs.done, 1); assert.equal(f.calls.length, 1); assert.equal(f.calls[0].body.text.body, "Hello again")
  assert.equal((await all(crm, COLL.messages, { idempotencyKey: `retry:${String(first.message._id)}:a1` }))[0].status, "sent", "attempt-numbered retry key")
})

// ───────────────────────── queue route ─────────────────────────
test("queue route: session needs broadcasts.send or settings.edit; signed self-calls verified (bad / expired / too deep -> 401); continues while work is due; lock prevents overlap", async t => {
  if (!need(t)) return
  const secret = "test-cron-secret-not-real"
  const v = verifyChunkSig(signChunk(secret, PNID, Date.now(), 3), secret, PNID, Date.now())
  assert.deepEqual(v, { ok: true, depth: 3 })
  assert.equal(verifyChunkSig(signChunk(secret, PNID, Date.now() - 6 * 60_000, 1), secret, PNID, Date.now()).ok, false, "expired")
  assert.equal(verifyChunkSig(signChunk(secret, PNID, Date.now(), 51), secret, PNID, Date.now()).ok, false, "too deep")
  assert.equal(verifyChunkSig(signChunk("other", PNID, Date.now(), 1), secret, PNID, Date.now()).ok, false, "wrong secret")
  assert.equal(verifyChunkSig(signChunk(secret, "999", Date.now(), 1), secret, PNID, Date.now()).ok, false, "other number")
  const crm = await freshCrm(m)
  const run = (o = {}, headers = {}) => handleQueueRun(jreq("POST", "http://x/q", {}, headers), { ...apiDeps(crm, { env: { ...ENV, publicBaseUrl: "https://crm.example" }, sleep: noSleep, ...o }), cronSecret: secret })
  assert.equal((await run({ noUser: true })).status, 401)
  assert.equal((await run({ perms: ["crm.view"] })).status, 403)
  assert.equal((await run({ perms: ["crm.view", "crm.settings.edit"] })).status, 200)
  assert.equal((await run({ noUser: true }, { [SIG_HEADER]: "123.1.abc" })).status, 401)
  assert.equal((await run({ noUser: true }, { [SIG_HEADER]: signChunk(secret, PNID, Date.now(), 1) })).status, 200, "signed self-call needs no session")
  // continuation: due work left after the time budget -> one signed self-call to CRM_PUBLIC_BASE_URL
  await tpl(crm)
  for (let i = 0; i < 3; i++) await contact(crm, { customerType: "dealer" })
  const id = await draft(crm, await seg(crm, { customerTypes: ["dealer"] }))
  await action(crm, "start", id, { env: { ...ENV, waAccessToken: undefined } })
  const calls = []
  const selfFetch = async (u, i) => { calls.push({ u, i }); return new Response(null, { status: 202 }) }
  const r = await run({ perms: SEND, fetch: graphFetch(), budgetMs: 0, selfFetch, bypassSecret: "bypass-test" })
  assert.equal((await r.json()).result.more, true)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].u, "https://crm.example/api/crm/queue/run")
  assert.ok(verifyChunkSig(calls[0].i.headers[SIG_HEADER], secret, PNID, Date.now()).ok)
  assert.equal(calls[0].i.headers["x-vercel-protection-bypass"], "bypass-test")
  // lock held by another run -> locked, nothing processed
  await crm.collection(COLL.locks).updateOne({ _id: `fogging:chunk:${PNID}` }, { $set: { owner: "other", leaseUntil: new Date(Date.now() + 60_000) } }, { upsert: true })
  const locked = await runChunk(crm, PNID, { allowList: [PNID], graph: null, requestId: "r", sleep: noSleep })
  assert.equal(locked.locked, true)
})

test("API: segments list/create/preview; broadcast detail lists skipped/failed recipients with reasons; recount rebuilds counts", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await tpl(crm)
  await contact(crm, { customerType: "dealer" })
  await contact(crm, { customerType: "dealer", optedOut: true })
  const d = apiDeps(crm, { perms: SEND, env: ENV })
  const cs = await createSegmentHandler(jreq("POST", "http://x/s", { name: "Dealers", filter: { customerTypes: ["dealer"] } }), NO_PARAMS, d)
  assert.equal(cs.status, 201)
  const segId = (await cs.json()).segment.id
  assert.equal((await body(await listSegmentsHandler(jreq("GET", "http://x/s"), NO_PARAMS, d))).items.length, 1)
  assert.deepEqual((await body(await previewSegmentHandler(jreq("POST", "http://x/p", { filter: { customerTypes: ["dealer"] } }), NO_PARAMS, d))).preview, { total: 2, sendable: 1, optedOut: 1, notOnWhatsApp: 0, tooMany: false })
  const id = await draft(crm, segId)
  await action(crm, "start", id, { fetch: graphFetch() })
  const det = await body(await getBroadcastHandler(jreq("GET", "http://x/b"), reqCtx(id), d))
  assert.equal(det.problems.length, 1); assert.equal(det.problems[0].reason, "opted_out")
  await crm.collection(COLL.broadcasts).updateOne({ _id: new ObjectId(id) }, { $set: { "counts.sent": 99 } })
  const rc = await body(await action(crm, "recount", id))
  assert.equal(rc.broadcast.counts.sent, 1); assert.equal(rc.broadcast.counts.total, 2)
})

test("UI: filter summary and chip toggling; Broadcasts page in the nav behind crm.broadcasts.view", async () => {
  const { loadUiFn } = await import("./crm/helpers/ui-fn.mjs")
  const { readFileSync } = await import("node:fs")
  const toggle = loadUiFn("components/admin/crm/Broadcasts.tsx", "toggleIn")
  assert.deepEqual(toggle(undefined, "dealer"), ["dealer"]); assert.equal(toggle(["dealer"], "dealer"), undefined)
  const d = loadUiFn("components/admin/crm/Broadcasts.tsx", "describeFilter")
  const L = { type: s => s.toUpperCase(), stage: s => s, source: s => s }
  assert.equal(d({}, L), "Everyone")
  assert.equal(d({ customerTypes: ["dealer"], states: ["Haryana"], closedWonWithinDays: 365, existingDealer: true }, L), "DEALER; in Haryana; bought in the last 365 days; existing dealers")
  assert.ok(readFileSync("components/admin/crm/CrmShell.tsx", "utf8").includes('{ href: "/admin/crm/broadcasts", label: "Broadcasts", perm: "crm.broadcasts.view" }'))
})

// ───────────────────────── review fixes (step 9 review) ─────────────────────────
const G = f => ({ accessToken: "t", apiVersion: "v23.0", fetch: f, timeoutMs: 1000 })

test("FIX 1: a retryable failure is really re-sent on retry (new attempt key), never counted as sent without a Graph call; wa_send job retries resend too", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await tpl(crm)
  await contact(crm, { customerType: "dealer" })
  const id = await draft(crm, await seg(crm, { customerTypes: ["dealer"] }))
  await action(crm, "start", id, { fetch: graphFetch([errStep("graph-send-error-130429", 429)]) })
  assert.equal((await bc(crm, id)).counts.sent, 0)
  const ok = graphFetch()
  await runChunk(crm, PNID, { allowList: [PNID], graph: G(ok), requestId: "r", now: () => new Date(NOW.getTime() + 10 * 60_000), sleep: noSleep })
  assert.equal(ok.calls.length, 1, "the retry reached Meta")
  assert.equal((await bc(crm, id)).counts.sent, 1)
  assert.deepEqual((await all(crm, COLL.messages, { direction: "out" })).map(x => x.status).sort(), ["failed", "sent"])
  // a later stray retry never sends again (an earlier attempt succeeded)
  await crm.collection(COLL.broadcastRecipients).updateMany({}, { $set: { status: "pending", nextAttemptAt: NOW } })
  await runChunk(crm, PNID, { allowList: [PNID], graph: G(ok), requestId: "r", now: () => new Date(NOW.getTime() + 20 * 60_000), sleep: noSleep })
  assert.equal(ok.calls.length, 1); assert.equal((await bc(crm, id)).counts.sent, 1, "not double counted")
  // wa_send: two retryable failures in a row, then success
  const crm2 = await freshCrm(m)
  const c = await contact(crm2)
  const conv = new ObjectId()
  await crm2.collection(COLL.conversations).insertOne({ _id: conv, contactId: c._id, phoneNumberId: PNID, waId: c.phone.slice(1), status: "open", lastInboundAt: ago(H), lastMessageAt: ago(H), createdAt: NOW, updatedAt: NOW })
  await sendMessage(crm2, { userId: "u1", name: "A" }, { contactId: c._id, conversationId: conv, idempotencyKey: "reply:u1:k-000002", route: "t", content: { kind: "text", text: fromComposer("Hi").text } },
    { allowList: [PNID], graph: G(graphFetch([errStep("graph-send-error-130429", 429)])), requestId: "r", now: () => NOW })
  const flaky = graphFetch([errStep("graph-send-error-130429", 429), { status: 200, body: fx("graph-send-success") }])
  await runChunk(crm2, PNID, { allowList: [PNID], graph: G(flaky), requestId: "r", now: () => new Date(NOW.getTime() + H), sleep: noSleep })
  await runChunk(crm2, PNID, { allowList: [PNID], graph: G(flaky), requestId: "r", now: () => new Date(NOW.getTime() + 3 * H), sleep: noSleep })
  assert.equal(flaky.calls.length, 2, "retry 1 failed, retry 2 sent")
  assert.equal(await count(crm2, COLL.messages, { status: "sent" }), 1)
  assert.equal((await all(crm2, COLL.jobs))[0].status, "done")
})

test("FIX 2: cancelling while the audience is being expanded sticks: no recipient stays pending", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await tpl(crm)
  for (let i = 0; i < 3; i++) await contact(crm, { customerType: "dealer" })
  const id = await draft(crm, await seg(crm, { customerTypes: ["dealer"] }))
  const { startBroadcast } = await import("../../lib/crm/broadcasts/run.ts")
  const racing = { ...crm, collection(name) {
    const c = crm.collection(name)
    if (name !== COLL.broadcastRecipients) return c
    return new Proxy(c, { get(ct, p) {
      if (p === "insertMany") return async (...a) => { await crm.collection(COLL.broadcasts).updateOne({ _id: new ObjectId(id) }, { $set: { status: "cancelled" } }); return ct.insertMany(...a) }
      const v = Reflect.get(ct, p); return typeof v === "function" ? v.bind(ct) : v
    } })
  } }
  const r = await startBroadcast(racing, { userId: "u1", name: "A", role: "x", permissions: new Set() }, new ObjectId(id), NOW)
  assert.equal(r.ok, false); assert.equal(r.status, 409)
  assert.equal((await bc(crm, id)).status, "cancelled")
  assert.equal(await count(crm, COLL.broadcastRecipients, { status: "pending" }), 0)
})

test("FIX 3+4: ticks that arrived before the recipient knew its wamid are reconciled; concurrent delivered + read both count", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const { reconcileRecipient } = await import("../../lib/crm/broadcasts/tracking.ts")
  const bId = new ObjectId()
  await crm.collection(COLL.broadcasts).insertOne({ _id: bId, status: "sending", counts: { sent: 1, delivered: 0, read: 0, failed: 0 } })
  const msgId = new ObjectId()
  await crm.collection(COLL.messages).insertOne({ _id: msgId, direction: "out", waMessageId: "wamid.EARLY", status: "read", statusAt: { sent: NOW, delivered: NOW, read: NOW }, createdAt: NOW })
  const recId = new ObjectId()
  await crm.collection(COLL.broadcastRecipients).insertOne({ _id: recId, broadcastId: bId, phoneE164: "+91", waMessageId: "wamid.EARLY", messageId: msgId, deliveryStatus: "sent", statusAt: { sent: NOW } })
  await reconcileRecipient(crm, recId)
  const rec = await crm.collection(COLL.broadcastRecipients).findOne({ _id: recId })
  assert.equal(rec.deliveryStatus, "read"); assert.ok(rec.statusAt.delivered && rec.statusAt.read)
  let b = await crm.collection(COLL.broadcasts).findOne({ _id: bId })
  assert.deepEqual([b.counts.delivered, b.counts.read], [1, 1])
  const r2 = new ObjectId()
  await crm.collection(COLL.broadcastRecipients).insertOne({ _id: r2, broadcastId: bId, phoneE164: "+92", waMessageId: "wamid.C", deliveryStatus: "sent", statusAt: { sent: NOW } })
  await Promise.all([applyRecipientStatus(crm, "wamid.C", "delivered", NOW), applyRecipientStatus(crm, "wamid.C", "read", NOW)])
  const rc = await crm.collection(COLL.broadcastRecipients).findOne({ _id: r2 })
  assert.ok(rc.statusAt.read, "read not lost"); assert.equal(rc.deliveryStatus, "read")
  b = await crm.collection(COLL.broadcasts).findOne({ _id: bId })
  assert.deepEqual([b.counts.delivered, b.counts.read], [2, 2])
})

test("FIX 5: the lock is renewed before every send; if it is lost mid-round, sending stops", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await tpl(crm)
  for (let i = 0; i < 3; i++) await contact(crm, { customerType: "dealer" })
  const id = await draft(crm, await seg(crm, { customerTypes: ["dealer"] }))
  await action(crm, "start", id, { env: { ...ENV, waAccessToken: undefined } })
  const f = graphFetch()
  const steal = async () => { await crm.collection(COLL.locks).updateOne({ _id: `fogging:chunk:${PNID}` }, { $set: { owner: "intruder", leaseUntil: new Date(NOW.getTime() + 3600_000) } }) }
  await runChunk(crm, PNID, { allowList: [PNID], graph: G(f), requestId: "r", now: () => NOW, sleep: steal })
  assert.equal(f.calls.length, 1, "stopped after losing the lock")
})

test("FIX 6+7: cancel also covers leased rows; expired leases count as due work", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await tpl(crm)
  for (let i = 0; i < 2; i++) await contact(crm, { customerType: "dealer" })
  const id = await draft(crm, await seg(crm, { customerTypes: ["dealer"] }))
  await action(crm, "start", id, { env: { ...ENV, waAccessToken: undefined } })
  await crm.collection(COLL.broadcastRecipients).updateOne({}, { $set: { status: "leased", leaseUntil: ago(1000), leaseOwner: "dead" } })
  const probe = await runChunk(crm, PNID, { allowList: [PNID], graph: null, requestId: "r", now: () => NOW, sleep: noSleep })
  assert.equal(probe.more, true, "expired lease = due work")
  await action(crm, "cancel", id)
  assert.equal(await count(crm, COLL.broadcastRecipients, { status: { $in: ["pending", "leased"] } }), 0)
  const b = await bc(crm, id)
  assert.equal(b.counts.queued, 0); assert.equal(b.counts.skipped, 2)
})

// ───────────────────────── second review fixes ─────────────────────────
test("FIX2-1: an earlier attempt with an unknown outcome (timeout stored as failed) or a Meta-accepted wamid blocks any new attempt", async t => {
  if (!need(t)) return
  const { priorAttempts } = await import("../../lib/crm/queue/chunk.ts")
  const crm = await freshCrm(m)
  const base = `bc:${new ObjectId()}:+919800000001`
  await crm.collection(COLL.messages).insertOne({ _id: new ObjectId(), direction: "out", idempotencyKey: `${base}:a1`, status: "failed", error: { code: 0, kind: "timeout", outcomeUnknown: true }, waMessageId: null, createdAt: NOW })
  let p = await priorAttempts(crm, base)
  assert.ok(p.unknown && !p.done, "timeout = unknown outcome")
  const base2 = `bc:${new ObjectId()}:+919800000002`
  await crm.collection(COLL.messages).insertOne({ _id: new ObjectId(), direction: "out", idempotencyKey: `${base2}:a1`, status: "failed", error: { code: 131026 }, waMessageId: "wamid.ACCEPTED", createdAt: NOW })
  p = await priorAttempts(crm, base2)
  assert.ok(p.done, "Meta accepted it (wamid) = done, never resend")
  const base3 = `bc:${new ObjectId()}:+919800000003`
  await crm.collection(COLL.messages).insertOne({ _id: new ObjectId(), direction: "out", idempotencyKey: `${base3}:a1`, status: "failed", error: { code: 130429, outcomeUnknown: false }, waMessageId: null, createdAt: NOW })
  p = await priorAttempts(crm, base3)
  assert.ok(!p.done && !p.unknown, "definite failure = a new attempt is allowed")
})

test("FIX2-2+6: a send that completes after the campaign was cancelled is still recorded as sent (wamid kept, counts fixed); reusing an earlier sent attempt reconciles its ticks", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await tpl(crm)
  await contact(crm, { customerType: "dealer" })
  const id = await draft(crm, await seg(crm, { customerTypes: ["dealer"] }))
  await action(crm, "start", id, { env: { ...ENV, waAccessToken: undefined } })
  // the admin cancels while the Graph call is in flight
  const f = graphFetch([async () => {
    await crm.collection(COLL.broadcasts).updateOne({ _id: new ObjectId(id) }, { $set: { status: "cancelled" } })
    await crm.collection(COLL.broadcastRecipients).updateMany({}, { $set: { status: "cancelled", deliveryStatus: "skipped", skipReason: "cancelled" } })
    await crm.collection(COLL.broadcasts).updateOne({ _id: new ObjectId(id) }, { $inc: { "counts.queued": -1, "counts.skipped": 1 } })
    return { status: 200, body: fx("graph-send-success") }
  }])
  await runChunk(crm, PNID, { allowList: [PNID], graph: G(f), requestId: "r", now: () => NOW, sleep: noSleep })
  const rec = (await all(crm, COLL.broadcastRecipients))[0]
  assert.equal(rec.deliveryStatus, "sent"); assert.equal(rec.waMessageId, f.wamids[0]); assert.equal(rec.skipReason, null)
  const b = await bc(crm, id)
  assert.equal(b.counts.sent, 1); assert.equal(b.counts.skipped, 0)
  // reuse path reconciles ticks
  const crm2 = await freshCrm(m)
  await tpl(crm2)
  const c2 = await contact(crm2, { customerType: "dealer" })
  const id2 = await draft(crm2, await seg(crm2, { customerTypes: ["dealer"] }))
  await action(crm2, "start", id2, { env: { ...ENV, waAccessToken: undefined } })
  await crm2.collection(COLL.messages).insertOne({ _id: new ObjectId(), direction: "out", idempotencyKey: `bc:${id2}:${c2.phone}:a1`, status: "read", waMessageId: "wamid.OLD", statusAt: { sent: NOW, delivered: NOW, read: NOW }, createdAt: NOW })
  await runChunk(crm2, PNID, { allowList: [PNID], graph: G(graphFetch()), requestId: "r", now: () => NOW, sleep: noSleep })
  const b2 = await bc(crm2, id2)
  assert.deepEqual([b2.counts.sent, b2.counts.delivered, b2.counts.read], [1, 1, 1])
})

test("FIX2-8: cancel recounts from the rows (no double adjustment)", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await tpl(crm)
  for (let i = 0; i < 3; i++) await contact(crm, { customerType: "dealer" })
  const id = await draft(crm, await seg(crm, { customerTypes: ["dealer"] }))
  await action(crm, "start", id, { env: { ...ENV, waAccessToken: undefined } })
  await crm.collection(COLL.broadcasts).updateOne({ _id: new ObjectId(id) }, { $set: { "counts.queued": 99 } })
  await action(crm, "cancel", id)
  const b = await bc(crm, id)
  assert.deepEqual([b.counts.queued, b.counts.skipped, b.counts.total], [0, 3, 3])
})
