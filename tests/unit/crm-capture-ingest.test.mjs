// Run: node --import ./tests/support/register.mjs --test tests/unit/crm-capture-ingest.test.mjs
// STEP 3b independent tests: captureLead, statuses, lastInboundAt $max, media, log hygiene, drain/lease.
import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { ObjectId } from "mongodb"
import { startMemoryMongo } from "./crm/helpers/memory-mongo.mjs"
import { TEST_WA, loadFixture } from "./crm/helpers/wa-sign.mjs"
import { freshCrm, post, all, count, env, seedOutbound, mockMedia, mockUploader, NOW, T0, DL_URL, ingestDeps, variant } from "./crm/helpers/wa-harness.mjs"
import { captureLead } from "../../lib/crm/capture.ts"
import { fetchAndStoreMedia, MediaError, MEDIA_MAX_BYTES } from "../../lib/crm/whatsapp/media.ts"
import { drainStaleEvents, processFreshEvents, processEventDoc, silentLogger } from "../../lib/crm/whatsapp/ingest.ts"
import { COLL, CRM_DEFAULTS } from "../../lib/crm/model.ts"

let m
before(async () => { m = await startMemoryMongo() })
after(async () => { if (m) await m.stop() })
const need = t => { if (!m.ok) { t.skip(m.skip); return false } return true }
const phone = d => ({ phoneE164: "+" + d, waId: d, phoneKind: "mobile" })
const cap = (crm, d, extra = {}) => captureLead(crm, { channel: "whatsapp", phone: phone(d), createdBy: { system: "test" }, now: NOW(), ...extra })
const DAY = 86400000

// ───────────────────────── capture ─────────────────────────
test("capture: dealer-directory match flags the existing dealer exactly once", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await crm.collection(COLL.dealerDirectory).insertOne({ phoneE164: "+919811110001", name: "Ravi", company: "Ravi Traders", createdAt: NOW() })
  const a = await cap(crm, "919811110001")
  assert.equal(a.existingDealerMatched, true); assert.equal(a.existingDealer, true); assert.equal(a.contactCreated, true)
  const b = await cap(crm, "919811110001")
  assert.equal(b.existingDealerMatched, false); assert.equal(b.existingDealer, true)
  const [c] = await all(crm, COLL.contacts)
  assert.ok(c.existingDealer && c.existingDealer.matchedAt instanceof Date)
  assert.equal(await count(crm, COLL.activities, { kind: "existing_dealer_match" }), 1)
  assert.equal(c.suggestions.filter(s => s.field === "customerType" && s.value === "dealer").length, 1)
  // concurrent first captures still flag once
  await crm.collection(COLL.dealerDirectory).insertOne({ phoneE164: "+919811110002", name: "Sam", createdAt: NOW() })
  const rs = await Promise.all(Array.from({ length: 6 }, () => cap(crm, "919811110002")))
  assert.equal(rs.filter(r => r.existingDealerMatched).length, 1)
  assert.equal(await count(crm, COLL.activities, { kind: "existing_dealer_match" }), 2)
})

test("capture: dealer match also found through altPhones", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await crm.collection(COLL.dealerDirectory).insertOne({ phoneE164: "+919811110099", name: "Alt", createdAt: NOW() })
  const first = await cap(crm, "919811110003")
  await crm.collection(COLL.contacts).updateOne({ _id: new ObjectId(first.contactId) }, { $set: { altPhones: ["+919811110099"] } })
  const again = await cap(crm, "919811110003")
  assert.equal(again.existingDealerMatched, true)
})

test("capture: altPhones and mergedInto are followed to the surviving contact", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const a = await cap(crm, "919822220001")
  await crm.collection(COLL.contacts).updateOne({ _id: new ObjectId(a.contactId) }, { $set: { altPhones: ["+919822220002"] } })
  const viaAlt = await cap(crm, "919822220002")
  assert.equal(viaAlt.contactId, a.contactId); assert.equal(viaAlt.contactCreated, false)
  const b = await cap(crm, "919822220003")
  await crm.collection(COLL.contacts).updateOne({ _id: new ObjectId(b.contactId) }, { $set: { mergedInto: new ObjectId(a.contactId) } })
  const viaMerged = await cap(crm, "919822220003")
  assert.equal(viaMerged.contactId, a.contactId); assert.equal(viaMerged.contactCreated, false)
  assert.equal(await count(crm, COLL.contacts), 2)
})

test("capture: concurrent captureLead for the same new number makes exactly one contact and one open deal", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  for (let round = 0; round < 3; round++) {
    const d = "91983333000" + round
    const rs = await Promise.all(Array.from({ length: 10 }, () => cap(crm, d)))
    assert.equal(await count(crm, COLL.contacts, { phoneE164: "+" + d }), 1, "contacts round " + round)
    assert.equal(await count(crm, COLL.deals, { isOpen: true }), round + 1)
    assert.equal(new Set(rs.map(r => r.contactId)).size, 1)
    assert.equal(new Set(rs.map(r => r.dealId)).size, 1)
    assert.equal(rs.filter(r => r.contactCreated).length, 1)
    assert.equal(rs.filter(r => r.dealOutcome === "created").length, 1)
  }
  assert.equal(await count(crm, COLL.activities, { kind: "stage_change" }), 3)
})

test("capture: fills only empty fields; waProfileName refreshed; later captures never overwrite", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await cap(crm, "919844440001", { profile: { name: "Alpha", waProfileName: "W1", company: null } })
  await cap(crm, "919844440001", { profile: { name: "Beta", waProfileName: "W2", company: "Acme", city: "Pune", email: "a@b.in" } })
  const [c] = await all(crm, COLL.contacts)
  assert.equal(c.name, "Alpha"); assert.equal(c.waProfileName, "W2")
  assert.equal(c.company, "Acme"); assert.equal(c.city, "Pune"); assert.equal(c.email, "a@b.in")
  await cap(crm, "919844440001", { profile: { company: "Other", city: "Delhi", waProfileName: "  " } })
  const [d] = await all(crm, COLL.contacts)
  assert.equal(d.company, "Acme"); assert.equal(d.city, "Pune"); assert.equal(d.waProfileName, "W2", "blank profile name does not blank it")
})

test("capture: repeat-enquiry only after the quiet days, otherwise timeline only", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const a = await cap(crm, "919855550001")
  await crm.collection(COLL.deals).updateOne({ _id: new ObjectId(a.dealId) }, { $set: { isOpen: false, closedAt: new Date(NOW().getTime() - 1 * DAY), won: true } })
  const soon = await cap(crm, "919855550001")
  assert.equal(soon.dealOutcome, "timeline_only"); assert.equal(soon.dealId, null)
  assert.equal(await count(crm, COLL.deals), 1)
  const later = await cap(crm, "919855550001", { now: new Date(NOW().getTime() + (CRM_DEFAULTS.repeatEnquiryQuietDays + 1) * DAY) })
  assert.equal(later.dealOutcome, "created"); assert.equal(later.dealStage, "repeat_enquiry")
})

// ───────────────────────── statuses ─────────────────────────
test("status before message: stays pending with backoff, then ignored (not dead) after maxAttempts", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const { res } = await post(crm, loadFixture("status-sent"))
  assert.equal(res.status, 200)
  let [ev] = await all(crm, COLL.waEvents)
  assert.equal(ev.status, "pending"); assert.equal(ev.attempts, 1)
  assert.equal(ev.lastError.code, "message_not_found"); assert.equal(ev.lastError.retryable, true)
  assert.ok(ev.nextAttemptAt > NOW(), "backoff pushes nextAttemptAt out")
  // not due yet -> a drain at the same instant leaves it alone
  await drainStaleEvents(crm, ingestDeps())
  ;[ev] = await all(crm, COLL.waEvents); assert.equal(ev.attempts, 1)
  let t1 = NOW().getTime()
  for (let i = 0; i < 10 && ev.status !== "ignored"; i++) {
    t1 += 3 * 3600_000
    await drainStaleEvents(crm, ingestDeps({ now: () => new Date(t1) }))
    ;[ev] = await all(crm, COLL.waEvents)
  }
  // review fix 9: a wamid with no crm_messages row after maxAttempts is not ours -> "ignored", TTL'd
  assert.equal(ev.status, "ignored")
  assert.equal(ev.attempts, ev.maxAttempts)
  assert.ok(ev.expireAt instanceof Date, "ignored rows expire")
})

test("status before message then message arrives: the retry applies the status", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await post(crm, loadFixture("status-delivered"))
  await seedOutbound(crm, { extra: { status: null, statusRank: 0 } })
  await drainStaleEvents(crm, ingestDeps({ now: () => new Date(NOW().getTime() + 3 * 3600_000) }))
  assert.equal((await all(crm, COLL.messages))[0].status, "delivered")
  assert.equal((await all(crm, COLL.waEvents))[0].status, "done")
})

test("status out of order: delivered after read keeps read but records statusAt.delivered", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await seedOutbound(crm, { extra: { status: "sent", statusRank: 1 } })
  await post(crm, loadFixture("status-read"))
  await post(crm, loadFixture("status-delivered"))
  const [msg] = await all(crm, COLL.messages)
  assert.equal(msg.status, "read"); assert.equal(msg.statusRank, 3)
  assert.ok(msg.statusAt.delivered instanceof Date); assert.ok(msg.statusAt.read instanceof Date)
  assert.equal(msg.statusAt.delivered.getTime(), (T0 + 200) * 1000)
  await post(crm, loadFixture("status-sent"))
  assert.equal((await all(crm, COLL.messages))[0].status, "read")
})

test("status failed 131026 marks the contact notOnWhatsApp and records the error", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await cap(crm, "919800000002")
  await seedOutbound(crm, { contactId: new ObjectId(c.contactId) })
  await post(crm, loadFixture("status-failed"))
  const [msg] = await all(crm, COLL.messages)
  assert.equal(msg.status, "failed"); assert.equal(msg.error.code, 131026)
  const [contact] = await all(crm, COLL.contacts)
  assert.ok(contact.notOnWhatsApp instanceof Date)
  assert.equal((await all(crm, COLL.waEvents))[0].status, "done")
})

// ───────────────────────── lastInboundAt ─────────────────────────
test("lastInboundAt uses waTimestamp with $max: an older late event does not move it back", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await post(crm, variant("text", { wamid: "wamid.NEWER", ts: T0 + 1000 }))
  await post(crm, variant("text", { wamid: "wamid.OLDER", ts: T0 }))
  const [conv] = await all(crm, COLL.conversations)
  assert.equal(conv.lastInboundAt.getTime(), (T0 + 1000) * 1000)
  assert.equal(conv.lastMessageAt.getTime(), (T0 + 1000) * 1000)
  assert.equal(conv.unreadCount, 2)
  assert.ok(conv.lastMessagePreview.length > 0)
  const [num] = await all(crm, COLL.waNumbers, { phoneNumberId: TEST_WA.allowedPhoneNumberId })
  assert.equal(num.lastInboundAt.getTime(), (T0 + 1000) * 1000)
  // and it is the message timestamp, not processing time
  assert.notEqual(conv.lastInboundAt.getTime(), NOW().getTime())
})

test("same wamid processed concurrently twice does not double-count unread (extra)", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await post(crm, loadFixture("text"), { runAfter: false })
  const [ev] = await all(crm, COLL.waEvents)
  await Promise.all([processEventDoc(crm, ev, ingestDeps(), silentLogger), processEventDoc(crm, ev, ingestDeps(), silentLogger)])
  assert.equal(await count(crm, COLL.messages), 1)
  assert.equal((await all(crm, COLL.conversations))[0].unreadCount, 1)
})

// ───────────────────────── media (direct) ─────────────────────────
const mediaIn = { waMediaId: "900000000000001", mime: "image/jpeg", filename: null, kind: "image", waTimestamp: new Date((T0) * 1000) }
const mdeps = (media, up, o = {}) => ({ accessToken: TEST_WA.accessToken, fetch: media.fetch, upload: up.upload, now: NOW(), ...o })
const caught = async p => { try { await p; return null } catch (e) { return e } }

test("media: success returns url/mime/size; bearer sent on both hops; Graph version honoured", async () => {
  const media = mockMedia({ bytes: Buffer.alloc(1234, 1), mime: "image/png" }); const up = mockUploader()
  const r = await fetchAndStoreMedia(mediaIn, mdeps(media, up, { apiVersion: "v99.0" }))
  assert.equal(r.storage, "stored"); assert.equal(r.bytes, 1234); assert.equal(r.mime, "image/png")
  assert.match(r.url, /^https:\/\/res\.cloudinary\.com\//)
  assert.equal(media.calls.length, 2)
  assert.match(media.calls[0].url, /^https:\/\/graph\.facebook\.com\/v99\.0\/900000000000001$/)
  for (const c of media.calls) assert.equal(c.init.headers.Authorization, "Bearer " + TEST_WA.accessToken)
  assert.equal(up.uploads[0].bytes.byteLength, 1234)
})

test("media: too large is rejected (declared size, content-length, and actual bytes) without uploading", async () => {
  for (const mk of [
    () => mockMedia({ fileSize: MEDIA_MAX_BYTES + 1 }),
    () => mockMedia({ dlHeaders: { "content-length": String(MEDIA_MAX_BYTES + 5) } }),
    () => mockMedia({ bytes: Buffer.alloc(MEDIA_MAX_BYTES + 1), fileSize: 10 }),
  ]) {
    const media = mk(); const up = mockUploader()
    const r = await fetchAndStoreMedia(mediaIn, mdeps(media, up))
    assert.equal(r.storage, "too_large"); assert.equal(up.uploads.length, 0)
  }
})

test("media: retryable vs permanent errors", async () => {
  const run = async (opts, up = mockUploader(), inp = mediaIn, extra = {}) => caught(fetchAndStoreMedia(inp, mdeps(mockMedia(opts), up, extra)))
  for (const o of [{ lookupStatus: 500 }, { lookupStatus: 429 }, { throwOn: "lookup" }, { throwOn: "download" }, { dlStatus: 503 }, { lookupStatus: 400, lookupBody: { error: { code: 131000, message: "x" } } }]) {
    const e = await run(o); assert.ok(e instanceof MediaError, JSON.stringify(o)); assert.equal(e.retryable, true, JSON.stringify(o) + " " + e.code)
  }
  const up = await run({}, mockUploader({ fail: true })); assert.equal(up.retryable, true); assert.equal(up.code, "cloudinary_upload_failed")
  for (const o of [{ lookupStatus: 404 }, { lookupStatus: 400 }, { lookupStatus: 401 }, { dlStatus: 404 }, { dlStatus: 403 }]) {
    const e = await run(o); assert.ok(e instanceof MediaError); assert.equal(e.retryable, false, JSON.stringify(o) + " " + e.code)
  }
  assert.equal((await run({}, mockUploader(), mediaIn, { accessToken: undefined })).retryable, false)
  const expired = await run({}, mockUploader(), mediaIn, { now: new Date(NOW().getTime() + 31 * DAY) })
  assert.equal(expired.code, "media_expired"); assert.equal(expired.retryable, false)
})

test("media: MediaError messages never contain the download URL, token or cloudinary URL", async () => {
  for (const o of [{ lookupStatus: 400 }, { lookupStatus: 500 }, { throwOn: "download" }, { throwOn: "lookup" }, { dlStatus: 500 }]) {
    const e = await caught(fetchAndStoreMedia(mediaIn, mdeps(mockMedia(o), mockUploader())))
    const blob = JSON.stringify({ m: e.message, c: e.code, meta: e.meta, s: e.stack?.split("\n")[0] })
    for (const secret of ["SECRETMEDIAURL123", "lookaside", TEST_WA.accessToken]) assert.equal(blob.includes(secret), false, secret + " leaked in " + blob)
  }
  const e = await caught(fetchAndStoreMedia(mediaIn, mdeps(mockMedia(), mockUploader({ fail: true }))))
  assert.equal(JSON.stringify([e.message, e.code]).includes("cloudinary.com"), false)
})

// ───────────────────────── media (through ingest) ─────────────────────────
test("ingest media: too_large keeps the message and finishes the event; permanent error -> failed; retryable -> pending then stored", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await post(crm, variant("image", { wamid: "wamid.IMG_BIG" }), { media: mockMedia({ fileSize: MEDIA_MAX_BYTES + 1 }) })
  let msg = (await all(crm, COLL.messages, { waMessageId: "wamid.IMG_BIG" }))[0]
  assert.equal(msg.media.storage, "too_large")
  assert.equal((await all(crm, COLL.waEvents))[0].status, "done")

  await post(crm, variant("image", { wamid: "wamid.IMG_PERM" }), { media: mockMedia({ lookupStatus: 404 }) })
  msg = (await all(crm, COLL.messages, { waMessageId: "wamid.IMG_PERM" }))[0]
  assert.equal(msg.media.storage, "failed"); assert.ok(msg.media.error.code)
  const permEv = (await all(crm, COLL.waEvents)).find(e => e.dedupeKey && JSON.stringify(e.payload).includes("IMG_PERM"))
  assert.equal(permEv.status, "failed")
  assert.equal(await count(crm, COLL.messages, { waMessageId: "wamid.IMG_PERM" }), 1)

  await post(crm, variant("image", { wamid: "wamid.IMG_RETRY" }), { media: mockMedia({ lookupStatus: 503 }) })
  const rEv = () => all(crm, COLL.waEvents).then(a => a.find(e => JSON.stringify(e.payload).includes("IMG_RETRY")))
  assert.equal((await rEv()).status, "pending")
  assert.equal((await all(crm, COLL.conversations))[0].unreadCount, 3, "retry path must not recount unread")
  const ok = mockMedia(); const up = mockUploader()
  await drainStaleEvents(crm, ingestDeps({ fetch: ok.fetch, upload: up.upload, now: () => new Date(NOW().getTime() + 3600_000) }))
  msg = (await all(crm, COLL.messages, { waMessageId: "wamid.IMG_RETRY" }))[0]
  assert.equal(msg.media.storage, "stored"); assert.ok(msg.media.url)
  assert.equal((await rEv()).status, "done")
  assert.equal(await count(crm, COLL.messages, { waMessageId: "wamid.IMG_RETRY" }), 1)
  assert.equal((await all(crm, COLL.conversations))[0].unreadCount, 3, "unread not double counted after media retry")
})

// ───────────────────────── log hygiene ─────────────────────────
test("console spy: no media URL, bearer token or app secret is ever logged (success and failure paths)", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const lines = []
  const orig = {}
  for (const k of ["log", "info", "warn", "error", "debug"]) { orig[k] = console[k]; console[k] = (...a) => { lines.push(a.map(x => (typeof x === "string" ? x : JSON.stringify(x))).join(" ")) } }
  try {
    const opts = media => ({ media, logger: "default", env: env() })
    await post(crm, variant("image", { wamid: "wamid.LOG1" }), opts(mockMedia()))
    await post(crm, variant("image", { wamid: "wamid.LOG2" }), opts(mockMedia({ lookupStatus: 400 })))
    await post(crm, variant("image", { wamid: "wamid.LOG3" }), opts(mockMedia({ throwOn: "download" })))
    await post(crm, variant("document", { wamid: "wamid.LOG4" }), { media: mockMedia(), up: mockUploader({ fail: true }), logger: "default" })
    await post(crm, loadFixture("text"), { sign: { secret: "wrong" }, logger: "default" })
    await post(crm, loadFixture("status-sent"), { logger: "default" })
  } finally { for (const k of Object.keys(orig)) console[k] = orig[k] }
  assert.ok(lines.length > 0, "default logger must actually log")
  const blob = lines.join("\n")
  for (const secret of [DL_URL, "SECRETMEDIAURL123", "lookaside.fbsbx.com", TEST_WA.accessToken, TEST_WA.appSecret, TEST_WA.verifyToken, "res.cloudinary.com", "Bearer "]) {
    assert.equal(blob.includes(secret), false, "logged: " + secret)
  }
  assert.ok(lines.some(l => l.includes("req-test")), "request id on log lines")
})

// ───────────────────────── drain / lease ─────────────────────────
test("stale drain processes at most 5 events per sweep", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  for (let i = 0; i < 8; i++) await post(crm, variant("text", { wamid: "wamid.STALE" + i }), { runAfter: false })
  assert.equal(await count(crm, COLL.waEvents, { status: "pending" }), 8)
  const tally = await drainStaleEvents(crm, ingestDeps())
  assert.equal(Object.values(tally).reduce((a, b) => a + b, 0), 5)
  assert.equal(await count(crm, COLL.messages), 5)
  assert.equal(await count(crm, COLL.waEvents, { status: "pending" }), 3)
  await drainStaleEvents(crm, ingestDeps())
  assert.equal(await count(crm, COLL.messages), 8)
})

test("lease: unexpired lease blocks other workers; after expiry another worker claims and finishes it", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await post(crm, loadFixture("text"), { runAfter: false })
  const [ev] = await all(crm, COLL.waEvents)
  await crm.collection(COLL.waEvents).updateOne({ _id: ev._id }, { $set: { status: "leased", leaseOwner: "other-worker", leaseUntil: new Date(NOW().getTime() + CRM_DEFAULTS.jobLeaseMs) }, $inc: { attempts: 1 } })
  const early = await drainStaleEvents(crm, ingestDeps({ leaseOwner: "w2" }))
  assert.deepEqual(early, {}); assert.equal(await count(crm, COLL.messages), 0)
  const late = await drainStaleEvents(crm, ingestDeps({ leaseOwner: "w2", now: () => new Date(NOW().getTime() + CRM_DEFAULTS.jobLeaseMs + 1000) }))
  assert.deepEqual(late, { done: 1 })
  assert.equal(await count(crm, COLL.messages), 1)
  const [after] = await all(crm, COLL.waEvents)
  assert.equal(after.status, "done"); assert.equal(after.leaseOwner, null); assert.equal(after.attempts, 2)
  // the previous owner cannot overwrite the finished row (finish is guarded by leaseOwner)
  const none = await processFreshEvents(crm, [ev._id], ingestDeps({ leaseOwner: "other-worker" }))
  assert.deepEqual(none, {})
})
