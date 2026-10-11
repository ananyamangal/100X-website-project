// Run: node --import ./tests/support/register.mjs --test --test-concurrency=1 tests/unit/crm-inbox.test.mjs
// STEP 5 inbox API: lead-scoped lists, ETag polling, messages + markRead, reply/template/media sends
// (idempotent, gated), assign / resolve / reopen, nav summary + stale-event sweep, request-id logs.
import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { ObjectId } from "mongodb"
import { startMemoryMongo } from "./crm/helpers/memory-mongo.mjs"
import { freshCrm, all, count } from "./crm/helpers/wa-harness.mjs"
import { TEST_WA } from "./crm/helpers/wa-sign.mjs"
import {
  NOW, H, MIN, PHONE, ago, graphFetch, errStep, seedContact, seedConv, seedTemplate, reqCtx, jreq, apiDeps, captureConsole,
} from "./crm/helpers/outbound-kit.mjs"
import { COLL } from "../../lib/crm/model.ts"
import {
  listConversationsHandler, listMessagesHandler, replyHandler, templateHandler, mediaHandler, assignHandler, resolveHandler, reopenHandler,
  inboxSummaryHandler, isAllowedMediaLink,
} from "../../lib/crm/api/inbox.ts"

let m
before(async () => { m = await startMemoryMongo() })
after(async () => { if (m) await m.stop() })
const need = t => { if (!m.ok) { t.skip(m.skip); return false } return true }

const NO_PARAMS = { params: Promise.resolve({}) }
const ASSIGNED = ["crm.view", "crm.inbox.view", "crm.inbox.reply", "crm.leads.view_assigned"]
const U = "http://x/api/crm/inbox"
const get = (url, headers) => jreq("GET", url, undefined, headers)
const body = r => r.json()
const key = s => `client-key-${s}`

async function msg(crm, conv, contact, o = {}) {
  const _id = new ObjectId()
  await crm.collection(COLL.messages).insertOne({
    _id, conversationId: conv, contactId: contact._id, phoneNumberId: TEST_WA.allowedPhoneNumberId, direction: o.direction ?? "in", waMessageId: `wamid.M${_id}`,
    type: "text", text: o.text ?? "hello", status: o.direction === "out" ? "sent" : "received", statusRank: 1, statusAt: {}, createdAt: o.at ?? NOW,
  })
  return _id
}

// ───────────────────────── list + scope + polling ─────────────────────────
test("list: view_all sees every conversation; assigned scope sees own / contact-assigned / deal-assigned only; no lead scope -> 403", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const a = await seedContact(crm); const ca = await seedConv(crm, a, { assignedTo: { userId: "u2", name: "Ravi" } })
  const b = await seedContact(crm, { assignedTo: { userId: "u2", name: "Ravi" } }); await seedConv(crm, b)
  const c = await seedContact(crm); await seedConv(crm, c)
  await crm.collection(COLL.deals).insertOne({ contactId: c._id, assignedTo: { userId: "u2", name: "Ravi" }, stage: "new", createdAt: NOW })
  const d = await seedContact(crm); const cd = await seedConv(crm, d)
  const allRes = await listConversationsHandler(get(`${U}/conversations`), NO_PARAMS, apiDeps(crm))
  assert.equal(allRes.status, 200)
  assert.equal((await body(allRes)).items.length, 4)
  const mine = await body(await listConversationsHandler(get(`${U}/conversations`), NO_PARAMS, apiDeps(crm, { perms: ASSIGNED, sub: "u2" })))
  assert.equal(mine.items.length, 3)
  assert.ok(!mine.items.some(i => i.id === String(cd)), "unrelated conversation hidden")
  assert.ok(mine.items.some(i => i.id === String(ca)))
  assert.equal((await listConversationsHandler(get(`${U}/conversations`), NO_PARAMS, apiDeps(crm, { perms: ["crm.view", "crm.inbox.view"] }))).status, 403)
  assert.equal((await listConversationsHandler(get(`${U}/conversations?status=nope&limit=0`), NO_PARAMS, apiDeps(crm))).status, 400)
  // single conversation outside scope -> 404 (not 403: no existence leak)
  assert.equal((await listMessagesHandler(get(`${U}/conversations/${cd}/messages`), reqCtx(cd), apiDeps(crm, { perms: ASSIGNED, sub: "u2" }))).status, 404)
  assert.equal((await replyHandler(jreq("POST", "http://x/r", { text: "hi", idempotencyKey: key("scope") }), reqCtx(cd), apiDeps(crm, { perms: ASSIGNED, sub: "u2", fetch: graphFetch() }))).status, 404)
})

test("list: unread first, cursor paging without overlap, filters (unread / assignee / status / since), window view", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const ids = []
  for (let i = 0; i < 5; i++) {
    const c = await seedContact(crm)
    ids.push(await seedConv(crm, c, { lastInboundAt: ago((i + 1) * H), hasUnread: i === 3, unreadCount: i === 3 ? 2 : 0, assignedTo: i === 1 ? { userId: "u1", name: "Asha" } : null, updatedAt: ago((i + 1) * H) }))
  }
  const p1 = await body(await listConversationsHandler(get(`${U}/conversations?limit=2`), NO_PARAMS, apiDeps(crm)))
  assert.equal(p1.items[0].id, String(ids[3]), "unread first")
  assert.ok(p1.nextCursor)
  const p2 = await body(await listConversationsHandler(get(`${U}/conversations?limit=2&cursor=${p1.nextCursor}`), NO_PARAMS, apiDeps(crm)))
  const p3 = await body(await listConversationsHandler(get(`${U}/conversations?limit=2&cursor=${p2.nextCursor}`), NO_PARAMS, apiDeps(crm)))
  const seen = [...p1.items, ...p2.items, ...p3.items].map(i => i.id)
  assert.equal(new Set(seen).size, 5); assert.equal(p3.nextCursor, null)
  assert.equal((await body(await listConversationsHandler(get(`${U}/conversations?unread=1`), NO_PARAMS, apiDeps(crm)))).items.length, 1)
  assert.equal((await body(await listConversationsHandler(get(`${U}/conversations?assignee=me`), NO_PARAMS, apiDeps(crm)))).items[0].id, String(ids[1]))
  assert.equal((await body(await listConversationsHandler(get(`${U}/conversations?assignee=unassigned`), NO_PARAMS, apiDeps(crm)))).items.length, 4)
  assert.equal((await body(await listConversationsHandler(get(`${U}/conversations?status=resolved`), NO_PARAMS, apiDeps(crm)))).items.length, 0)
  const since = await body(await listConversationsHandler(get(`${U}/conversations?since=${encodeURIComponent(ago(2.5 * H).toISOString())}`), NO_PARAMS, apiDeps(crm)))
  assert.equal(since.items.length, 2); assert.equal(since.serverTime, NOW.toISOString())
  const w = p1.items[0].window
  assert.equal(w.open, true); assert.ok(w.openUntil && w.freeFormUntil < w.openUntil)
})

test("polling: ETag + no-cache on list/summary; If-None-Match -> 304; any conversation change invalidates", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await seedContact(crm); const conv = await seedConv(crm, c, { updatedAt: ago(H) })
  const r1 = await listConversationsHandler(get(`${U}/conversations`), NO_PARAMS, apiDeps(crm))
  const tag = r1.headers.get("etag")
  assert.ok(tag); assert.equal(r1.headers.get("cache-control"), "private, no-cache")
  const r2 = await listConversationsHandler(get(`${U}/conversations`, { "if-none-match": tag }), NO_PARAMS, apiDeps(crm))
  assert.equal(r2.status, 304); assert.equal(r2.headers.get("etag"), tag)
  const s1 = await inboxSummaryHandler(get(`${U}/summary`), NO_PARAMS, apiDeps(crm))
  assert.equal((await inboxSummaryHandler(get(`${U}/summary`, { "if-none-match": s1.headers.get("etag") }), NO_PARAMS, apiDeps(crm))).status, 304)
  await crm.collection(COLL.conversations).updateOne({ _id: conv }, { $set: { updatedAt: NOW } })
  assert.equal((await listConversationsHandler(get(`${U}/conversations`, { "if-none-match": tag }), NO_PARAMS, apiDeps(crm))).status, 200)
})

// ───────────────────────── messages ─────────────────────────
test("messages: newest first with nextBefore paging; markRead clears unread and changes the ETag; optedOut flag", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await seedContact(crm); const conv = await seedConv(crm, c, { hasUnread: true, unreadCount: 3, updatedAt: ago(H) })
  for (let i = 0; i < 5; i++) await msg(crm, conv, c, { at: ago((5 - i) * MIN), text: `m${i}` })
  const url = `${U}/conversations/${conv}/messages?limit=3`
  const r1 = await listMessagesHandler(get(url), reqCtx(conv), apiDeps(crm))
  const b1 = await body(r1)
  assert.deepEqual(b1.messages.map(x => x.text), ["m4", "m3", "m2"])
  assert.equal(b1.conversation.optedOut, false)
  const b2 = await body(await listMessagesHandler(get(`${url}&before=${b1.nextBefore}`), reqCtx(conv), apiDeps(crm)))
  assert.deepEqual(b2.messages.map(x => x.text), ["m1", "m0"]); assert.equal(b2.nextBefore, null)
  assert.equal((await listMessagesHandler(get(url, { "if-none-match": r1.headers.get("etag") }), reqCtx(conv), apiDeps(crm))).status, 304)
  const r3 = await listMessagesHandler(get(`${url}&markRead=1`), reqCtx(conv), apiDeps(crm))
  assert.equal((await body(r3)).conversation.hasUnread, false)
  const cv = (await all(crm, COLL.conversations))[0]
  assert.equal(cv.hasUnread, false); assert.equal(cv.unreadCount, 0); assert.deepEqual(cv.updatedAt, NOW)
  assert.equal((await listMessagesHandler(get(url, { "if-none-match": r1.headers.get("etag") }), reqCtx(conv), apiDeps(crm))).status, 200, "markRead invalidated the ETag")
  await crm.collection(COLL.optOuts).insertOne({ phoneE164: c.phoneE164, scope: "marketing", via: "manual", at: NOW, by: null, sourceMessageId: null })
  assert.equal((await body(await listMessagesHandler(get(url), reqCtx(conv), apiDeps(crm)))).conversation.optedOut, true)
  assert.equal((await listMessagesHandler(get(`${url}&before=xyz`), reqCtx(conv), apiDeps(crm))).status, 400)
})

// ───────────────────────── sends ─────────────────────────
test("reply: 201 sends once; same client key -> 200 deduped, no second Graph call; validation; window closed -> 409 with no call", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await seedContact(crm); const conv = await seedConv(crm, c)
  const f = graphFetch()
  const deps = apiDeps(crm, { fetch: f })
  const send = (b, id = conv) => replyHandler(jreq("POST", "http://x/r", b), reqCtx(id), deps)
  const r1 = await send({ text: "Namaste, price list attached", idempotencyKey: key("a1") })
  assert.equal(r1.status, 201)
  const j1 = await body(r1)
  assert.equal(j1.message.status, "sent"); assert.equal(j1.message.direction, "out")
  const r2 = await send({ text: "Namaste, price list attached", idempotencyKey: key("a1") })
  assert.equal(r2.status, 200); assert.equal((await body(r2)).deduped, true)
  assert.equal(f.calls.length, 1)
  assert.equal((await send({ text: "x", idempotencyKey: "short" })).status, 400)
  assert.equal((await send({ text: "   ", idempotencyKey: key("a2") })).status, 400)
  assert.equal((await send({ idempotencyKey: key("a3") })).status, 400)
  assert.equal((await send({ text: "x", idempotencyKey: key("a4") }, "zz")).status, 400)
  assert.equal((await replyHandler(jreq("POST", "http://x/r", { text: "x", idempotencyKey: key("a5") }), reqCtx(conv), apiDeps(crm, { fetch: f, perms: ["crm.view", "crm.inbox.view", "crm.leads.view_all"] }))).status, 403)
  await crm.collection(COLL.conversations).updateOne({ _id: conv }, { $set: { lastInboundAt: ago(30 * H) } })
  const closed = await send({ text: "late", idempotencyKey: key("a6") })
  assert.equal(closed.status, 409); assert.equal((await body(closed)).error, "window_closed")
  assert.equal(f.calls.length, 1)
})

test("a failed send moves conversation updatedAt, so pollers see the failed row (messages ETag changes)", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await seedContact(crm); const conv = await seedConv(crm, c, { updatedAt: ago(H) })
  const url = `${U}/conversations/${conv}/messages`
  const r0 = await listMessagesHandler(get(url), reqCtx(conv), apiDeps(crm))
  const tag = r0.headers.get("etag")
  const later = new Date(NOW.getTime() + MIN)
  const f = graphFetch([errStep("graph-send-error-131047")])
  const res = await replyHandler(jreq("POST", "http://x/r", { text: "hello", idempotencyKey: key("fail1") }), reqCtx(conv), apiDeps(crm, { fetch: f, now: () => later }))
  assert.equal(res.status, 502)
  assert.deepEqual((await all(crm, COLL.conversations))[0].updatedAt, later)
  const r1 = await listMessagesHandler(get(url, { "if-none-match": tag }), reqCtx(conv), apiDeps(crm, { now: () => later }))
  assert.equal(r1.status, 200)
  assert.equal((await body(r1)).messages[0].status, "failed")
})

test("template send: approved template 201; bad name/params 400; unapproved -> 422 from the gate", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await seedTemplate(crm, { name: "fog_t", bodyParamCount: 1 })
  await seedTemplate(crm, { name: "fog_p", bodyParamCount: 0, status: "PENDING" })
  const c = await seedContact(crm); const conv = await seedConv(crm, c, { lastInboundAt: ago(40 * H) })
  const f = graphFetch()
  const deps = apiDeps(crm, { fetch: f })
  const send = b => templateHandler(jreq("POST", "http://x/t", b), reqCtx(conv), deps)
  const ok = await send({ name: "fog_t", language: "en_US", params: ["Ravi"], idempotencyKey: key("t1") })
  assert.equal(ok.status, 201)
  assert.equal(f.calls[0].body.type, "template"); assert.equal(f.calls[0].body.template.name, "fog_t")
  assert.equal((await send({ name: "Fog T!", language: "en_US", params: [], idempotencyKey: key("t2") })).status, 400)
  assert.equal((await send({ name: "fog_t", language: "english", params: ["a"], idempotencyKey: key("t3") })).status, 400)
  assert.equal((await send({ name: "fog_t", language: "en_US", params: [1], idempotencyKey: key("t4") })).status, 400)
  const pend = await send({ name: "fog_p", language: "en_US", params: [], idempotencyKey: key("t5") })
  assert.equal(pend.status, 422); assert.equal((await body(pend)).error, "template_not_approved")
  assert.equal(f.calls.length, 1)
})

test("media: only https res.cloudinary.com links; type/size/caption rules; multipart uploads once and a retry with the same key does not upload again", async t => {
  if (!need(t)) return
  assert.equal(isAllowedMediaLink("https://res.cloudinary.com/x/a.pdf"), true)
  for (const bad of ["http://res.cloudinary.com/x", "https://evil.com/res.cloudinary.com", "https://u:p@res.cloudinary.com/x", "javascript:alert(1)", "nope"]) assert.equal(isAllowedMediaLink(bad), false, bad)
  const crm = await freshCrm(m)
  const c = await seedContact(crm); const conv = await seedConv(crm, c)
  const f = graphFetch()
  const uploads = []
  const deps = apiDeps(crm, { fetch: f, uploadMedia: async (file, rt) => { uploads.push([file.name, rt]); return `https://res.cloudinary.com/demo/${file.name}` } })
  const json = b => mediaHandler(jreq("POST", "http://x/m", b), reqCtx(conv), deps)
  const v = async b => (await body(await json(b))).fields
  assert.equal((await v({ link: "https://evil.com/a.pdf", mime: "application/pdf", idempotencyKey: key("m1") })).link, "invalid")
  assert.equal((await v({ link: "https://res.cloudinary.com/a.exe", mime: "application/x-msdownload", idempotencyKey: key("m2") })).mime, "unsupported")
  assert.equal((await v({ link: "https://res.cloudinary.com/a.png", mime: "image/png", bytes: 6 * 1024 * 1024, idempotencyKey: key("m3") })).file, "too_large")
  assert.equal((await v({ link: "https://res.cloudinary.com/a.ogg", mime: "audio/ogg", caption: "hi", idempotencyKey: key("m4") })).caption, "not_supported_for_audio")
  const okJson = await json({ link: "https://res.cloudinary.com/a.pdf", mime: "application/pdf", filename: "Quote/Q-1.pdf", caption: "Quotation", idempotencyKey: key("m5") })
  assert.equal(okJson.status, 201)
  assert.equal(f.calls[0].body.type, "document"); assert.equal(f.calls[0].body.document.filename, "Quote_Q-1.pdf")
  const form = () => {
    const fd = new FormData()
    fd.set("file", new File([Buffer.from("%PDF-1.4 test")], "q.pdf", { type: "application/pdf" }))
    fd.set("caption", "Quotation attached"); fd.set("idempotencyKey", key("mp1"))
    return new Request("http://x/m", { method: "POST", body: fd })
  }
  const mp = await mediaHandler(form(), reqCtx(conv), deps)
  assert.equal(mp.status, 201); assert.deepEqual(uploads, [["q.pdf", "raw"]])
  const again = await mediaHandler(form(), reqCtx(conv), deps)
  assert.equal(again.status, 200); assert.equal(uploads.length, 1, "no second upload"); assert.equal(f.calls.length, 2)
  const failing = apiDeps(crm, { fetch: f, uploadMedia: async () => { throw new Error("cloudinary down https://res.cloudinary.com/secret") } })
  const fd = new FormData(); fd.set("file", new File([Buffer.from("x")], "a.png", { type: "image/png" })); fd.set("idempotencyKey", key("mp2"))
  assert.equal((await mediaHandler(new Request("http://x/m", { method: "POST", body: fd }), reqCtx(conv), failing)).status, 502)
})

// ───────────────────────── assign / resolve / reopen ─────────────────────────
test("assign: self-assign with inbox.reply; assigning others needs crm.leads.assign; assignee must be assignable; activity + audit", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await seedContact(crm); const conv = await seedConv(crm, c)
  const asg = (b, o) => assignHandler(jreq("POST", "http://x/a", b), reqCtx(conv), apiDeps(crm, o))
  const noAssign = ["crm.view", "crm.inbox.view", "crm.inbox.reply", "crm.leads.view_all"]
  assert.equal((await asg({ assignedTo: "u1" }, { perms: noAssign })).status, 200, "self-assign")
  assert.equal((await asg({ assignedTo: "u2" }, { perms: noAssign })).status, 403)
  assert.equal((await asg({ assignedTo: "ghost" })).status, 400)
  assert.equal((await asg({ assignedTo: "bad id!" })).status, 400)
  const r = await asg({ assignedTo: "u2" })
  assert.equal(r.status, 200); assert.equal((await body(r)).conversation.assignedTo.userId, "u2")
  assert.equal((await all(crm, COLL.conversations))[0].assignedTo.name, "Ravi")
  assert.equal(await count(crm, COLL.activities, { kind: "assignment" }), 2)
  const aud = await crm.collection(COLL.audit).find({ action: "conversation.assign" }).sort({ _id: 1 }).toArray()
  assert.equal(aud.length, 2); assert.equal(aud[1].before.assignedTo, "u1"); assert.equal(aud[1].after.assignedTo, "u2")
  assert.equal((await asg({ assignedTo: null })).status, 200)
  assert.equal((await all(crm, COLL.conversations))[0].assignedTo, null)
})

test("resolve / reopen: state change once (changed flag), unread cleared on resolve, audit per change", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await seedContact(crm); const conv = await seedConv(crm, c, { hasUnread: true, unreadCount: 2 })
  const deps = apiDeps(crm)
  const r1 = await body(await resolveHandler(jreq("POST", "http://x/s"), reqCtx(conv), deps))
  assert.equal(r1.changed, true); assert.equal(r1.conversation.status, "resolved")
  const cv = (await all(crm, COLL.conversations))[0]
  assert.equal(cv.hasUnread, false); assert.equal(cv.resolvedBy.userId, "u1")
  assert.equal((await body(await resolveHandler(jreq("POST", "http://x/s"), reqCtx(conv), deps))).changed, false)
  assert.equal((await body(await reopenHandler(jreq("POST", "http://x/s"), reqCtx(conv), deps))).changed, true)
  assert.equal((await all(crm, COLL.conversations))[0].resolvedAt, null)
  assert.equal(await count(crm, COLL.audit, { action: { $in: ["conversation.resolve", "conversation.reopen"] } }), 2)
  assert.equal((await resolveHandler(jreq("POST", "http://x/s"), reqCtx(conv), apiDeps(crm, { perms: ["crm.view", "crm.inbox.view", "crm.leads.view_all"] }))).status, 403)
})

// ───────────────────────── summary ─────────────────────────
test("summary: unread counts (open only, scoped); schedules the stale-event sweep only when an event is due", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const a = await seedContact(crm); await seedConv(crm, a, { hasUnread: true, unreadCount: 2, assignedTo: { userId: "u1", name: "Asha" } })
  const b = await seedContact(crm); await seedConv(crm, b, { hasUnread: true, unreadCount: 1 })
  const d = await seedContact(crm); await seedConv(crm, d, { hasUnread: true, unreadCount: 5, status: "resolved" })
  const tasks = []
  const s = await body(await inboxSummaryHandler(get(`${U}/summary`), NO_PARAMS, apiDeps(crm, { schedule: task => tasks.push(task) })))
  assert.deepEqual([s.unreadConversations, s.unreadMessages, s.unreadAssignedToMe], [2, 3, 1])
  assert.equal(tasks.length, 0, "nothing due -> no sweep")
  const scoped = await body(await inboxSummaryHandler(get(`${U}/summary`), NO_PARAMS, apiDeps(crm, { perms: ASSIGNED, sub: "u1" })))
  assert.equal(scoped.unreadConversations, 1)
  await crm.collection(COLL.waEvents).insertOne({ allowed: true, status: "pending", nextAttemptAt: ago(MIN), kind: "message", attempts: 0, createdAt: NOW })
  await inboxSummaryHandler(get(`${U}/summary`), NO_PARAMS, apiDeps(crm, { schedule: task => tasks.push(task) }))
  assert.equal(tasks.length, 1, "due event -> one sweep scheduled")
})

// ───────────────────────── logs ─────────────────────────
test("logs via the reply API: request id on every line, Meta code + body fields on failure, no token/app secret/phone/message text", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await seedContact(crm, { phoneE164: PHONE }); const conv = await seedConv(crm, c)
  const secretText = "MYSECRETBODY-quotation-amount-123456"
  const f = graphFetch([errStep("graph-send-error-131026")])
  const deps = apiDeps(crm, { fetch: f })
  let res
  const bad = await captureConsole(async () => {
    res = await replyHandler(jreq("POST", "http://x/r", { text: secretText, idempotencyKey: "log-key-0001" }, { "x-request-id": "rid-fail-0001" }), reqCtx(conv), deps)
  })
  assert.equal(res.status, 502)
  assert.equal(res.headers.get("x-request-id"), "rid-fail-0001")
  assert.ok(bad.lines.length >= 1)
  for (const line of bad.lines) assert.equal(JSON.parse(line).requestId, "rid-fail-0001", "request id on every log line: " + line)
  const failLine = bad.lines.map(l => JSON.parse(l)).find(j => j.msg === "message send failed")
  assert.ok(failLine, "failure is logged")
  assert.equal(failLine.metaCode, 131026); assert.equal(failLine.fbtraceId, "ATraceSend131026"); assert.equal(failLine.httpStatus, 400); assert.ok(failLine.metaTitle)
  assert.equal((await all(crm, COLL.messages))[0].sendRequestId, "rid-fail-0001")
  // refused follow-up (131026 flagged the contact) also logs with its own request id
  let res2
  const refused = await captureConsole(async () => {
    res2 = await replyHandler(jreq("POST", "http://x/r", { text: secretText, idempotencyKey: "log-key-0002" }, { "x-request-id": "rid-ref-0002" }), reqCtx(conv), deps)
  })
  assert.equal(res2.status, 409)
  for (const line of refused.lines) assert.equal(JSON.parse(line).requestId, "rid-ref-0002")
  // success path for a second contact
  const c2 = await seedContact(crm, { phoneE164: "+919811122233" }); const conv2 = await seedConv(crm, c2)
  const f2 = graphFetch(); const deps2 = apiDeps(crm, { fetch: f2 })
  let okRes
  const okCap = await captureConsole(async () => {
    okRes = await replyHandler(jreq("POST", "http://x/r", { text: secretText, idempotencyKey: "log-key-0003" }, { "x-request-id": "rid-ok-0003" }), reqCtx(conv2), deps2)
  })
  assert.equal(okRes.status, 201)
  assert.ok(okCap.lines.length >= 1)
  for (const line of okCap.lines) assert.equal(JSON.parse(line).requestId, "rid-ok-0003")
  const everything = [bad.text, refused.text, okCap.text].join("\n")
  for (const secret of [TEST_WA.accessToken, TEST_WA.appSecret, TEST_WA.verifyToken, "Bearer ", secretText, "919800000001", "9800000001", "919811122233", "9811122233"]) {
    assert.ok(!everything.includes(secret), `logs must not contain ${secret}`)
  }
})


test("UI: template preview fills {{n}} (missing values stay visible); Inbox is enabled in the nav behind crm.inbox.view", async () => {
  const { loadUiFn } = await import("./crm/helpers/ui-fn.mjs")
  const { readFileSync } = await import("node:fs")
  const f = loadUiFn("components/admin/crm/Inbox.tsx", "fillTemplate")
  assert.equal(f("Hello {{1}}, {{2}} is ₹{{3}}", ["Ramesh", "TF-35", ""]), "Hello Ramesh, TF-35 is ₹{{3}}")
  const shell = readFileSync("components/admin/crm/CrmShell.tsx", "utf8")
  assert.ok(shell.includes('{ href: "/admin/crm/inbox", label: "Inbox", perm: "crm.inbox.view" }'))
  assert.ok(!shell.includes('label: "Inbox", disabled: true'))
})
