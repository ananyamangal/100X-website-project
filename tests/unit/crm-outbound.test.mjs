// Run: node --import ./tests/support/register.mjs --test tests/unit/crm-outbound.test.mjs
// STEP 5 independent tests: send gate (window, templates, opt-out, notes tripwire), tier cap, send path, Graph errors, logs.
import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { ObjectId } from "mongodb"
import { startMemoryMongo } from "./crm/helpers/memory-mongo.mjs"
import { freshCrm, all, count } from "./crm/helpers/wa-harness.mjs"
import { TEST_WA } from "./crm/helpers/wa-sign.mjs"
import {
  PNID, NOW, H, MIN, PHONE, ago, out, graphFetch, fx, errStep, timeoutErr, cfgOf, sendDeps, seedContact, seedConv, seedTemplate,
} from "./crm/helpers/outbound-kit.mjs"
import { COLL } from "../../lib/crm/model.ts"
import { checkSend, consumePass, GatePassError, normaliseOutboundForHash, outboundTextHash, PASS_TTL_MS } from "../../lib/crm/outbound/gate.ts"
import { sendText, sendTemplate, sendDocument, sendImage, sendAudio } from "../../lib/crm/outbound/graph.ts"
import { sendMessage } from "../../lib/crm/outbound/send.ts"
import { fromPersistedOutbound } from "../../lib/crm/outbound/compose.ts"
import { tierUsed24h } from "../../lib/crm/outbound/ledger.ts"
import { createInternalNote, normaliseForHash, noteTextHash, toNoteText } from "../../lib/crm/notes/index.ts"
import { buildHealthReport } from "../../lib/crm/health.ts"
import { readCrmEnv } from "../../lib/crm/env.ts"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
let m
before(async () => { m = await startMemoryMongo() })
after(async () => { if (m) await m.stop() })
const need = t => { if (!m.ok) { t.skip(m.skip); return false } return true }

const gate = (crm, input, now = NOW, extra = {}) => checkSend(crm, input, { allowList: [PNID], now, ...extra })
const textReq = (contact, conv, text, key = "k-" + new ObjectId().toHexString(), extra = {}) => ({
  contactId: contact._id, conversationId: conv, idempotencyKey: key, route: "test", content: { kind: "text", text: out(text) }, ...extra,
})
const tplReq = (contact, conv, name, params = [], key = "t-" + new ObjectId().toHexString(), extra = {}) => ({
  contactId: contact._id, conversationId: conv, idempotencyKey: key, route: "test",
  content: { kind: "template", name, language: "en_US", params: params.map(out), ...(extra.header ? { header: extra.header } : {}) },
  ...(extra.purpose ? { purpose: extra.purpose } : {}),
})

// ───────────────────────── 24h window ─────────────────────────
test("window: text and media allowed inside the window", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await seedContact(crm)
  const conv = await seedConv(crm, c, { lastInboundAt: ago(1 * H) })
  for (const kind of ["session_text", "session_media"]) {
    const r = await gate(crm, { contact: c._id, conversationId: conv, kind, text: kind === "session_text" ? out("hi") : null })
    assert.equal(r.ok, true, kind)
    assert.equal(r.businessInitiated, false)
  }
  const f = graphFetch()
  const res = await sendMessage(crm, { system: "t" }, { contactId: c._id, conversationId: conv, idempotencyKey: "media-1-ok", route: "t", content: { kind: "media", mediaType: "image", link: "https://res.cloudinary.com/x/a.png", mime: "image/png", caption: out("cap") } }, sendDeps(f))
  assert.equal(res.ok, true)
  assert.equal(f.calls.length, 1)
  assert.equal(f.calls[0].body.type, "image")
})

test("window: 23h49m allowed, 23h50m/23h55m denied (10-min margin) -> 409 window_closed, zero Graph calls", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await seedContact(crm)
  const conv = await seedConv(crm, c, { lastInboundAt: ago(23 * H + 49 * MIN) })
  assert.equal((await gate(crm, { contact: c._id, conversationId: conv, kind: "session_text", text: out("x") })).ok, true)
  for (const mins of [50, 55, 59]) {
    await crm.collection(COLL.conversations).updateOne({ _id: conv }, { $set: { lastInboundAt: ago(23 * H + mins * MIN) } })
    const f = graphFetch()
    const r = await sendMessage(crm, { system: "t" }, textReq(c, conv, "hello"), sendDeps(f))
    assert.equal(r.ok, false, `23h${mins}m`)
    assert.equal(r.status, 409); assert.equal(r.error, "window_closed")
    assert.equal(f.calls.length, 0)
    const media = await sendMessage(crm, { system: "t" }, { contactId: c._id, conversationId: conv, idempotencyKey: "m-" + mins + "-aaaa", route: "t", content: { kind: "media", mediaType: "document", link: "https://res.cloudinary.com/x/a.pdf", mime: "application/pdf" } }, sendDeps(f))
    assert.equal(media.status, 409); assert.equal(media.error, "window_closed")
    assert.equal(f.calls.length, 0)
  }
  assert.equal(await count(crm, COLL.messages), 0, "no message row for gate refusals")
})

test("window: never-inbound conversation / no conversation -> text denied, template allowed (business-initiated)", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await seedTemplate(crm, { name: "fog_open", bodyParamCount: 0, bodyText: "Hello" })
  const c = await seedContact(crm)
  assert.equal((await gate(crm, { contact: c._id, kind: "session_text", text: out("x") })).reason, "window_closed")
  const conv = await seedConv(crm, c, { lastInboundAt: null })
  assert.equal((await gate(crm, { contact: c._id, conversationId: conv, kind: "session_text", text: out("x") })).reason, "window_closed")
  const r = await gate(crm, { contact: c._id, conversationId: conv, kind: "template", templateName: "fog_open", language: "en_US", params: [] })
  assert.equal(r.ok, true); assert.equal(r.businessInitiated, true)
})

test("templates: outside the window only APPROVED; unknown/PAUSED/PENDING/REJECTED/DISABLED denied", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await seedContact(crm)
  const conv = await seedConv(crm, c, { lastInboundAt: ago(30 * H) })
  await seedTemplate(crm, { name: "t_ok", bodyParamCount: 0 })
  for (const [name, status] of [["t_paused", "PAUSED"], ["t_pending", "PENDING"], ["t_rejected", "REJECTED"], ["t_disabled", "DISABLED"]]) await seedTemplate(crm, { name, status, bodyParamCount: 0 })
  const g = name => gate(crm, { contact: c._id, conversationId: conv, kind: "template", templateName: name, language: "en_US", params: [] })
  assert.equal((await g("t_ok")).ok, true)
  const unk = await g("nope")
  assert.deepEqual([unk.reason, unk.status], ["template_unknown", 422])
  assert.equal((await g("t_paused")).reason, "template_paused")
  for (const n of ["t_pending", "t_rejected", "t_disabled"]) {
    const r = await g(n)
    assert.equal(r.ok, false, n); assert.equal(r.reason, "template_not_approved", n); assert.equal(r.status, 422, n)
  }
  assert.equal((await gate(crm, { contact: c._id, conversationId: conv, kind: "template", templateName: "t_ok", language: "hi", params: [] })).reason, "template_unknown")
  const f = graphFetch()
  for (const n of ["nope", "t_paused", "t_pending", "t_rejected", "t_disabled"]) assert.equal((await sendMessage(crm, { system: "t" }, tplReq(c, conv, n), sendDeps(f))).ok, false, n)
  assert.equal(f.calls.length, 0)
})

test("templates: wrong param count denied; media header required; named params unsupported", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await seedContact(crm)
  const conv = await seedConv(crm, c, { lastInboundAt: ago(30 * H) })
  await seedTemplate(crm, { name: "two", bodyParamCount: 2 })
  await seedTemplate(crm, { name: "doc", bodyParamCount: 1, headerType: "DOCUMENT" })
  await seedTemplate(crm, { name: "named", bodyParamCount: 1, parameterFormat: "NAMED" })
  const g = (name, params, extra = {}) => gate(crm, { contact: c._id, conversationId: conv, kind: "template", templateName: name, language: "en_US", params: params.map(out), ...extra })
  assert.equal((await g("two", ["a"])).reason, "template_param_count")
  assert.equal((await g("two", ["a", "b", "c"])).reason, "template_param_count")
  assert.deepEqual({ ...(await g("two", ["a"])).detail }, { expected: 2, got: 1 })
  assert.equal((await g("two", ["a", "b"])).ok, true)
  assert.equal((await g("doc", ["a"])).reason, "template_needs_header")
  assert.equal((await g("doc", ["a"], { headerMedia: true })).ok, true)
  assert.equal((await g("named", ["a"])).reason, "template_named_params_unsupported")
})

test("gate: sender number rules, unknown contact, paused number", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await seedContact(crm)
  const conv = await seedConv(crm, c)
  const input = { contact: c._id, conversationId: conv, kind: "session_text", text: out("x") }
  assert.equal((await checkSend(crm, input, { allowList: [], now: NOW })).reason, "sender_not_allow_listed")
  assert.equal((await checkSend(crm, { contact: c._id, kind: "session_text", text: out("x") }, { allowList: [], now: NOW })).reason, "no_sender_number")
  assert.equal((await checkSend(crm, { contact: c._id, kind: "session_text", text: out("x") }, { allowList: ["1", "2"], now: NOW })).reason, "sender_ambiguous")
  assert.equal((await checkSend(crm, { contact: new ObjectId(), kind: "session_text", text: out("x") }, { allowList: [PNID], now: NOW })).reason, "contact_not_found")
  await crm.collection(COLL.waNumbers).insertOne({ phoneNumberId: PNID, sendingPaused: { reason: "meta_131048", at: NOW, until: null } })
  const r = await gate(crm, input)
  assert.equal(r.reason, "sending_paused"); assert.equal(r.status, 409)
})

// ───────────────────────── notes can never be sent ─────────────────────────
const NOTE = "Customer is a tough negotiator, offer 8% max discount"

test("notes: type-level separation (tsc on tests/unit/crm/types/notes-unsendable.ts exits 0 = every @ts-expect-error fired)", () => {
  const file = "tests/unit/crm/types/notes-unsendable.ts"
  const args = ["tsc", "--noEmit", "--strict", "--skipLibCheck", "--module", "esnext", "--moduleResolution", "bundler", "--target", "es2020", "--esModuleInterop", file]
  const r = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", args, { cwd: ROOT, encoding: "utf8", shell: process.platform === "win32", timeout: 180_000 })
  assert.equal(r.status, 0, `tsc failed:\n${r.stdout}\n${r.stderr}`)
})

test("notes: hash parity outbound vs note hashing, incl. unicode / tabs / NBSP / newlines", () => {
  const samples = [NOTE, "  UPPER   Case\tTabs\nNew  line ", "बंद करें", "a b", "\n x \n", "Mixed ÀÉ ß"]
  for (const s of samples) {
    assert.equal(normaliseOutboundForHash(s), normaliseForHash(s), JSON.stringify(s))
    assert.equal(outboundTextHash(s), noteTextHash(s), JSON.stringify(s))
  }
  assert.equal(outboundTextHash(" Tough   NEGOTIATOR "), outboundTextHash("tough negotiator"))
})

test("notes: exact / case / whitespace / .trim() / template param / media caption -> 422 matches_internal_note, zero fetch, one audit row each, no text", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await seedContact(crm)
  const conv = await seedConv(crm, c)
  await seedTemplate(crm, { name: "one", bodyParamCount: 1 })
  const author = { userId: "u1", name: "Asha" }
  const nt = toNoteText(NOTE)
  assert.ok(nt.ok)
  await createInternalNote(crm, { contactId: c._id, dealId: null, author, text: nt.text, now: NOW })
  const f = graphFetch()
  const attempts = {
    exact: { kind: "text", text: out(NOTE) },
    upper: { kind: "text", text: out(NOTE.toUpperCase()) },
    lower: { kind: "text", text: out(NOTE.toLowerCase()) },
    spaces: { kind: "text", text: out(NOTE.replace(/ /g, "   ")) },
    newlines: { kind: "text", text: out(NOTE.replace(/ /g, "\n")) },
    tabs: { kind: "text", text: out(NOTE.replace(/ /g, "\t")) },
    padded_trim: { kind: "text", text: out(("   " + NOTE + "  \n").trim()) },
    param: { kind: "template", name: "one", language: "en_US", params: [out(NOTE)] },
    caption: { kind: "media", mediaType: "image", link: "https://res.cloudinary.com/x/a.png", mime: "image/png", caption: out(NOTE) },
  }
  let n = 0
  for (const [name, content] of Object.entries(attempts)) {
    const auditBefore = await count(crm, COLL.audit, { action: "outbound.blocked_internal_note" })
    const r = await sendMessage(crm, author, { contactId: c._id, conversationId: conv, idempotencyKey: `note-${name}-0001`, route: "test." + name, content }, sendDeps(f))
    assert.equal(r.ok, false, name)
    assert.equal(r.status, 422, name); assert.equal(r.error, "matches_internal_note", name)
    assert.equal(await count(crm, COLL.audit, { action: "outbound.blocked_internal_note" }), auditBefore + 1, `exactly one audit row for ${name}`)
    n++
  }
  assert.equal(f.calls.length, 0, "zero Graph calls")
  assert.equal(await count(crm, COLL.messages), 0, "no message rows")
  assert.equal(await count(crm, COLL.sendLedger), 0)
  const rows = await all(crm, COLL.audit, { action: "outbound.blocked_internal_note" })
  assert.equal(rows.length, n)
  const dump = JSON.stringify(rows)
  assert.ok(!dump.includes("negotiator") && !dump.includes("8%"), "audit has no note text")
  assert.ok(rows[0].after.noteId && rows[0].after.route && rows[0].after.kind)
  // unrelated text still sends; a soft-deleted note stays unsendable
  assert.equal((await sendMessage(crm, author, textReq(c, conv, "Namaste, quotation attached"), sendDeps(f))).ok, true)
  await crm.collection(COLL.internalNotes).updateMany({}, { $set: { deletedAt: NOW } })
  assert.equal((await sendMessage(crm, author, textReq(c, conv, NOTE), sendDeps(f))).error, "matches_internal_note")
  // a note on ANOTHER contact does not block this contact (hash lookup is per contact)
  const c2 = await seedContact(crm)
  const conv2 = await seedConv(crm, c2)
  assert.equal((await sendMessage(crm, author, textReq(c2, conv2, NOTE), sendDeps(f))).ok, true)
})

test("notes: tampered persisted outbound row (queued retry path) is caught by the gate", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await seedContact(crm)
  const conv = await seedConv(crm, c)
  await createInternalNote(crm, { contactId: c._id, dealId: null, author: { userId: "u1", name: "A" }, text: toNoteText(NOTE).text, now: NOW })
  const _id = new ObjectId()
  await crm.collection(COLL.messages).insertOne({ _id, conversationId: conv, contactId: c._id, direction: "out", type: "text", text: "  " + NOTE.toUpperCase() + " ", media: null, template: null, status: "failed", createdAt: NOW })
  const p = await fromPersistedOutbound(crm, _id)
  assert.ok(p && p.text)
  const f = graphFetch()
  const r = await sendMessage(crm, { system: "chunk" }, { contactId: c._id, conversationId: conv, idempotencyKey: "retry:" + _id.toHexString(), route: "queue.wa_send", content: { kind: "text", text: p.text } }, sendDeps(f))
  assert.equal(r.status, 422); assert.equal(r.error, "matches_internal_note")
  assert.equal(f.calls.length, 0)
  assert.equal(await count(crm, COLL.audit, { action: "outbound.blocked_internal_note" }), 1)
  // tampered template params / caption on a persisted row
  const _id2 = new ObjectId()
  await crm.collection(COLL.messages).insertOne({ _id: _id2, conversationId: conv, contactId: c._id, direction: "out", type: "template", text: null, media: { caption: NOTE, mime: "image/png" }, template: { name: "x", language: "en_US", params: [NOTE] }, status: "failed", createdAt: NOW })
  const p2 = await fromPersistedOutbound(crm, _id2)
  assert.equal(p2.template.params.length, 1); assert.equal(p2.caption, NOTE)
  const r2 = await sendMessage(crm, { system: "chunk" }, { contactId: c._id, conversationId: conv, idempotencyKey: "retry:" + _id2.toHexString(), route: "queue.wa_send", content: { kind: "media", mediaType: "image", link: "https://res.cloudinary.com/x/a.png", mime: "image/png", caption: p2.caption } }, sendDeps(f))
  assert.equal(r2.error, "matches_internal_note")
  assert.equal(f.calls.length, 0)
  assert.equal(await fromPersistedOutbound(crm, new ObjectId()), null)
  const inbound = new ObjectId()
  await crm.collection(COLL.messages).insertOne({ _id: inbound, conversationId: conv, contactId: c._id, direction: "in", type: "text", text: "hi" })
  assert.equal(await fromPersistedOutbound(crm, inbound), null, "inbound rows are never re-read for sending")
})

// ───────────────────────── tier cap ─────────────────────────
async function capSetup(crm, cap, margin) {
  await crm.collection(COLL.waNumbers).insertOne({ phoneNumberId: PNID, tierCap: cap, tierCapSafetyMargin: margin })
  await seedTemplate(crm, { name: "bi", bodyParamCount: 0, bodyText: "Hello" })
}
async function biContact(crm) {
  const c = await seedContact(crm)
  const conv = await seedConv(crm, c, { lastInboundAt: ago(40 * H) })
  return { c, conv }
}

test("tier cap: N unique recipients allowed, N+1 -> 429 tier_cap (no Graph call, no ledger row); same recipient twice counts once", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await capSetup(crm, 3, 1)
  const f = graphFetch()
  const people = []
  for (let i = 0; i < 4; i++) people.push(await biContact(crm))
  assert.equal((await sendMessage(crm, { system: "t" }, tplReq(people[0].c, people[0].conv, "bi"), sendDeps(f))).ok, true)
  assert.equal((await sendMessage(crm, { system: "t" }, tplReq(people[0].c, people[0].conv, "bi"), sendDeps(f))).ok, true)
  assert.equal(await tierUsed24h(crm, PNID, NOW), 1, "same recipient counts once")
  for (const p of people.slice(1, 3)) assert.equal((await sendMessage(crm, { system: "t" }, tplReq(p.c, p.conv, "bi"), sendDeps(f))).ok, true)
  assert.equal(await tierUsed24h(crm, PNID, NOW), 3)
  const callsBefore = f.calls.length
  const ledgerBefore = await count(crm, COLL.sendLedger)
  const r = await sendMessage(crm, { system: "t" }, tplReq(people[3].c, people[3].conv, "bi"), sendDeps(f))
  assert.equal(r.ok, false); assert.equal(r.status, 429); assert.equal(r.error, "tier_cap")
  assert.equal(r.detail.used, 3); assert.equal(r.detail.limit, 3)
  assert.equal(f.calls.length, callsBefore); assert.equal(await count(crm, COLL.sendLedger), ledgerBefore)
  // an already-counted recipient is still allowed at the cap
  assert.equal((await sendMessage(crm, { system: "t" }, tplReq(people[1].c, people[1].conv, "bi"), sendDeps(f))).ok, true)
  // session text inside the window is not business-initiated: never counted or capped
  const inWin = await seedContact(crm)
  const cw = await seedConv(crm, inWin, { lastInboundAt: ago(1 * H) })
  assert.equal((await sendMessage(crm, { system: "t" }, textReq(inWin, cw, "hi there"), sendDeps(f))).ok, true)
  assert.equal(await tierUsed24h(crm, PNID, NOW), 3)
  // rolling window: a 25h-old ledger row no longer counts; 24h+ later everything has aged out
  await crm.collection(COLL.sendLedger).insertOne({ phoneNumberId: PNID, recipient: "+910000000000", sentAt: ago(25 * H), expireAt: new Date(NOW.getTime() + H) })
  assert.equal(await tierUsed24h(crm, PNID, NOW), 3)
  assert.equal(await tierUsed24h(crm, PNID, new Date(NOW.getTime() + 24 * H + 1)), 0)
})

test("tier cap: broadcast keeps the safety margin free; staff may use it", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await capSetup(crm, 4, 2) // broadcast limit 2, staff limit 4
  const f = graphFetch()
  const ps = []
  for (let i = 0; i < 5; i++) ps.push(await biContact(crm))
  for (const p of ps.slice(0, 2)) assert.equal((await sendMessage(crm, { system: "b" }, tplReq(p.c, p.conv, "bi", [], undefined, { purpose: "broadcast" }), sendDeps(f))).ok, true)
  const b = await sendMessage(crm, { system: "b" }, tplReq(ps[2].c, ps[2].conv, "bi", [], undefined, { purpose: "broadcast" }), sendDeps(f))
  assert.equal(b.status, 429); assert.equal(b.error, "tier_cap"); assert.equal(b.detail.limit, 2)
  for (const p of ps.slice(2, 4)) assert.equal((await sendMessage(crm, { system: "s" }, tplReq(p.c, p.conv, "bi", [], undefined, { purpose: "staff" }), sendDeps(f))).ok, true)
  const s = await sendMessage(crm, { system: "s" }, tplReq(ps[4].c, ps[4].conv, "bi"), sendDeps(f))
  assert.equal(s.status, 429); assert.equal(s.detail.limit, 4)
  assert.ok(s.detail.retryAfter, "retryAfter reported")
})

test("tier cap: ledger row is written BEFORE the Graph call and stays when Graph fails", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await capSetup(crm, 10, 1)
  const { c, conv } = await biContact(crm)
  let ledgerAtCall = -1
  const f = graphFetch([async () => { ledgerAtCall = await count(crm, COLL.sendLedger); return errStep("graph-send-error-131047") }])
  const r = await sendMessage(crm, { system: "t" }, tplReq(c, conv, "bi"), sendDeps(f))
  assert.equal(r.ok, false); assert.equal(r.error, "send_failed")
  assert.equal(ledgerAtCall, 1, "ledger row existed when Graph was called")
  assert.equal(await count(crm, COLL.sendLedger), 1, "row kept after failure (over-count, never under-count)")
  const row = (await all(crm, COLL.sendLedger))[0]
  assert.equal(row.recipient, c.phoneE164); assert.equal(row.phoneNumberId, PNID); assert.ok(row.expireAt > NOW)
  assert.equal(await tierUsed24h(crm, PNID, NOW), 1)
})

// ───────────────────────── send path ─────────────────────────
test("send: success stores wamid + sent, no activity row, conversation/contact/number bumped; Bearer header only; request id on row + audit", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await seedContact(crm, { phoneE164: PHONE })
  const conv = await seedConv(crm, c)
  const f = graphFetch()
  const r = await sendMessage(crm, { userId: "u1", name: "Asha" }, textReq(c, conv, "Namaste ji", "send-ok-0001"), sendDeps(f, { requestId: "req-abc-123" }))
  assert.equal(r.ok, true); assert.equal(r.deduped, false)
  assert.equal(f.calls.length, 1)
  const call = f.calls[0]
  assert.equal(call.url, `https://graph.facebook.com/v23.0/${PNID}/messages`)
  assert.equal(call.init.headers.Authorization, `Bearer ${TEST_WA.accessToken}`)
  assert.ok(!call.url.includes(TEST_WA.accessToken))
  assert.equal(call.body.to, c.waId); assert.equal(call.body.messaging_product, "whatsapp")
  assert.equal(call.body.text.body, "Namaste ji")
  const [msg] = await all(crm, COLL.messages)
  assert.equal(msg.status, "sent"); assert.equal(msg.waMessageId, f.wamids[0]); assert.equal(msg.direction, "out")
  assert.equal(msg.sendRequestId, "req-abc-123"); assert.ok(msg.sendAttemptedAt)
  assert.equal(msg.businessInitiated, false)
  assert.equal(await count(crm, COLL.activities), 0, "sends write no activity row")
  const cv = (await all(crm, COLL.conversations))[0]
  assert.deepEqual(cv.lastOutboundAt, NOW); assert.equal(cv.lastMessagePreview, "Namaste ji")
  assert.deepEqual((await all(crm, COLL.contacts))[0].lastActivityAt, NOW)
  assert.deepEqual((await all(crm, COLL.waNumbers))[0].lastSendAt, NOW)
  const aud = await all(crm, COLL.audit, { action: "message.send" })
  assert.equal(aud.length, 1); assert.equal(aud[0].after.requestId, "req-abc-123"); assert.equal(aud[0].after.outcome, "sent")
  assert.ok(!JSON.stringify(aud).includes("Namaste"))
})

test("send: two successful sends in one workspace store two distinct wamids (fake Graph returns a unique id per message, like Meta)", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const a = await seedContact(crm); const ca = await seedConv(crm, a)
  const b = await seedContact(crm); const cb = await seedConv(crm, b)
  const f = graphFetch(); const g = graphFetch()
  assert.equal((await sendMessage(crm, { system: "t" }, textReq(a, ca, "one"), sendDeps(f))).ok, true)
  assert.equal((await sendMessage(crm, { system: "t" }, textReq(b, cb, "two"), sendDeps(g))).ok, true, "a second fetch instance must not reuse the first id")
  const ids = (await all(crm, COLL.messages)).map(x => x.waMessageId)
  assert.equal(new Set(ids).size, 2); assert.ok(ids.every(x => /^wamid\./.test(x)))
  assert.deepEqual(ids.sort(), [...f.wamids, ...g.wamids].sort())
})

test("send: first send on an allow-listed number with no crm_wa_numbers row auto-creates it (DATA_MODEL §1.8) with lastSendAt / lastSendError / sendingPaused", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await seedContact(crm); const conv = await seedConv(crm, c)
  assert.equal(await count(crm, COLL.waNumbers), 0)
  await sendMessage(crm, { system: "t" }, textReq(c, conv, "hi"), sendDeps(graphFetch()))
  let rows = await all(crm, COLL.waNumbers)
  assert.equal(rows.length, 1); assert.equal(rows[0].phoneNumberId, PNID); assert.deepEqual(rows[0].lastSendAt, NOW)
  assert.equal(typeof rows[0].tierCap, "number", "defaults applied on insert")
  const crm2 = await freshCrm(m)
  const c2 = await seedContact(crm2); const conv2 = await seedConv(crm2, c2)
  await sendMessage(crm2, { system: "t" }, textReq(c2, conv2, "x"), sendDeps(graphFetch([errStep("graph-send-error-131047")])))
  rows = await all(crm2, COLL.waNumbers)
  assert.equal(rows.length, 1); assert.equal(rows[0].lastSendError.code, 131047); assert.equal(rows[0].lastSendAt, null)
  const crm3 = await freshCrm(m)
  const c3 = await seedContact(crm3); const conv3 = await seedConv(crm3, c3)
  await sendMessage(crm3, { system: "t" }, textReq(c3, conv3, "x"), sendDeps(graphFetch([{ status: 400, body: { error: { message: "(#131048) Spam rate limit", code: 131048, fbtrace_id: "T" } } }])))
  rows = await all(crm3, COLL.waNumbers)
  assert.equal(rows.length, 1); assert.equal(rows[0].sendingPaused.reason, "meta_131048")
})

test("send: row is `queued` (wamid null, sendAttemptedAt set) while Graph is in flight; token unset -> 503 and no row", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await seedContact(crm)
  const conv = await seedConv(crm, c)
  let seen = null
  const f = graphFetch([async () => { const [row] = await all(crm, COLL.messages); seen = { status: row.status, wamid: row.waMessageId, attempted: !!row.sendAttemptedAt }; return { status: 200, body: fx("graph-send-success") } }])
  await sendMessage(crm, { system: "t" }, textReq(c, conv, "hello"), sendDeps(f))
  assert.deepEqual(seen, { status: "queued", wamid: null, attempted: true })
  const crm2 = await freshCrm(m)
  const c2 = await seedContact(crm2); const conv2 = await seedConv(crm2, c2)
  const r = await sendMessage(crm2, { system: "t" }, textReq(c2, conv2, "hello"), sendDeps(null))
  assert.equal(r.status, 503); assert.equal(r.error, "whatsapp_not_configured")
  assert.equal(await count(crm2, COLL.messages), 0)
})

test("send: idempotency key -> exactly one Graph call (also when concurrent); same key for another contact -> 409", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await seedContact(crm); const conv = await seedConv(crm, c)
  const c2 = await seedContact(crm); await seedConv(crm, c2)
  const f = graphFetch()
  const a = await sendMessage(crm, { system: "t" }, textReq(c, conv, "hello", "idem-key-0001"), sendDeps(f))
  const b = await sendMessage(crm, { system: "t" }, textReq(c, conv, "hello", "idem-key-0001"), sendDeps(f))
  assert.equal(a.ok && !a.deduped, true); assert.equal(b.ok && b.deduped, true)
  assert.equal(String(a.message._id), String(b.message._id))
  assert.equal(f.calls.length, 1)
  assert.equal(await count(crm, COLL.messages), 1)
  const x = await sendMessage(crm, { system: "t" }, textReq(c2, undefined, "hello", "idem-key-0001"), sendDeps(f))
  assert.equal(x.status, 409); assert.equal(x.error, "idempotency_conflict")
  assert.equal(f.calls.length, 1)
  const g = graphFetch()
  const [p, q] = await Promise.all([
    sendMessage(crm, { system: "t" }, textReq(c, conv, "race", "idem-race-0001"), sendDeps(g)),
    sendMessage(crm, { system: "t" }, textReq(c, conv, "race", "idem-race-0001"), sendDeps(g)),
  ])
  assert.ok(p.ok && q.ok)
  assert.equal(g.calls.length, 1, "concurrent duplicate key sends once")
})

test("graph pass: one-shot reuse refused, payload mismatch refused, forged/expired pass refused, Meta never called", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await seedContact(crm); const conv = await seedConv(crm, c)
  await seedTemplate(crm, { name: "two", bodyParamCount: 2 })
  const f = graphFetch(); const cfg = cfgOf(f)
  const mk = async input => { const r = await gate(crm, { contact: c._id, conversationId: conv, ...input }); assert.ok(r.ok, JSON.stringify(r)); return r.pass }
  const codeOf = async p => { try { await p; return "no throw" } catch (e) { assert.ok(e instanceof GatePassError); return e.code } }
  const p1 = await mk({ kind: "session_text", text: out("a") })
  assert.equal((await sendText(cfg, p1, out("a"))).ok, true)
  assert.equal(await codeOf(sendText(cfg, p1, out("a"))), "invalid_pass")
  assert.equal(f.calls.length, 1)
  const p2 = await mk({ kind: "session_text", text: out("a") })
  assert.equal(await codeOf(sendText(cfg, p2, out("different"))), "payload_mismatch")
  assert.equal(await codeOf(sendText(cfg, p2, out("a"))), "invalid_pass", "a mismatching attempt still burns the pass")
  assert.equal(await codeOf(sendImage(cfg, await mk({ kind: "session_text", text: out("a") }), { link: "https://res.cloudinary.com/x.png" })), "payload_mismatch")
  assert.equal(await codeOf(sendText(cfg, await mk({ kind: "session_media", caption: out("c") }), out("c"))), "payload_mismatch")
  assert.equal(await codeOf(sendImage(cfg, await mk({ kind: "session_media", caption: out("c1") }), { link: "https://res.cloudinary.com/x.png", caption: out("c2") })), "payload_mismatch")
  assert.equal(await codeOf(sendDocument(cfg, await mk({ kind: "session_media", caption: null }), { link: "https://res.cloudinary.com/x.pdf", caption: out("smuggled") })), "payload_mismatch")
  assert.equal(await codeOf(sendAudio(cfg, await mk({ kind: "session_media", caption: out("c") }), { link: "https://res.cloudinary.com/x.ogg" })), "payload_mismatch")
  const tp = () => mk({ kind: "template", templateName: "two", language: "en_US", params: [out("a"), out("b")] })
  assert.equal(await codeOf(sendTemplate(cfg, await tp(), { name: "other", language: "en_US" }, [out("a"), out("b")])), "payload_mismatch")
  assert.equal(await codeOf(sendTemplate(cfg, await tp(), { name: "two", language: "hi" }, [out("a"), out("b")])), "payload_mismatch")
  assert.equal(await codeOf(sendTemplate(cfg, await tp(), { name: "two", language: "en_US" }, [out("a"), out("x")])), "payload_mismatch")
  assert.equal(await codeOf(sendTemplate(cfg, await tp(), { name: "two", language: "en_US" }, [out("a")])), "payload_mismatch")
  assert.equal(await codeOf(sendText(cfg, { passId: "forged" }, out("a"))), "invalid_pass")
  assert.equal(await codeOf(sendText(cfg, undefined, out("a"))), "invalid_pass")
  assert.equal(await codeOf(sendText(cfg, Object.freeze({ passId: "x" }), out("a"))), "invalid_pass")
  const pe = await mk({ kind: "session_text", text: out("a") })
  const realNow = Date.now
  Date.now = () => realNow() + PASS_TTL_MS + 1000
  try { assert.equal(await codeOf(sendText(cfg, pe, out("a"))), "pass_expired") } finally { Date.now = realNow }
  assert.equal(f.calls.length, 1, "only the first, valid send reached Meta")
  assert.throws(() => consumePass({ passId: "nope" }), GatePassError)
})

test("Meta 131026: failed, error stored scrubbed, contact flagged notOnWhatsApp, later sends refused until they write again; no retry job", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await seedContact(crm, { phoneE164: PHONE }); const conv = await seedConv(crm, c)
  const f = graphFetch([errStep("graph-send-error-131026")])
  const r = await sendMessage(crm, { system: "t" }, textReq(c, conv, "hello", "k131026-0001"), sendDeps(f))
  assert.equal(r.ok, false); assert.equal(r.status, 502); assert.equal(r.error, "send_failed"); assert.equal(r.detail.code, 131026); assert.equal(r.detail.retryQueued, false)
  const [msg] = await all(crm, COLL.messages)
  assert.equal(msg.status, "failed"); assert.equal(msg.error.code, 131026); assert.equal(msg.error.fbtraceId, "ATraceSend131026"); assert.equal(msg.error.retryable, false)
  assert.ok(!/\+?91\d{8,}/.test(JSON.stringify(msg.error)), "phone masked in stored error")
  assert.ok(!/https?:/.test(JSON.stringify(msg.error)), "url masked in stored error")
  assert.ok((await all(crm, COLL.contacts))[0].notOnWhatsApp instanceof Date)
  assert.equal(await count(crm, COLL.jobs), 0)
  assert.equal((await all(crm, COLL.waNumbers))[0].lastSendError.code, 131026)
  const f2 = graphFetch()
  const r2 = await sendMessage(crm, { system: "t" }, textReq(c, conv, "again", "k131026-0002"), sendDeps(f2))
  assert.equal(r2.error, "not_on_whatsapp"); assert.equal(r2.status, 409); assert.equal(f2.calls.length, 0)
  await crm.collection(COLL.conversations).updateOne({ _id: conv }, { $set: { lastInboundAt: new Date(NOW.getTime() + 1000) } })
  const r3 = await sendMessage(crm, { system: "t" }, textReq(c, conv, "again", "k131026-0003"), sendDeps(f2, { now: () => new Date(NOW.getTime() + 2000) }))
  assert.equal(r3.ok, true, "customer wrote after the flag -> sendable")
})

test("Meta 131047 (window): failed with code, not retried; 131048 pauses the number", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await seedContact(crm); const conv = await seedConv(crm, c)
  const f = graphFetch([errStep("graph-send-error-131047")])
  const r = await sendMessage(crm, { system: "t" }, textReq(c, conv, "hello", "k131047-0001"), sendDeps(f))
  assert.equal(r.detail.code, 131047); assert.equal(r.detail.retryQueued, false)
  assert.equal((await all(crm, COLL.messages))[0].error.code, 131047)
  assert.equal(await count(crm, COLL.jobs), 0)
  const body = { error: { message: "(#131048) Spam rate limit", type: "OAuthException", code: 131048, fbtrace_id: "T48" } }
  const f2 = graphFetch([{ status: 400, body }])
  await sendMessage(crm, { system: "t" }, textReq(c, conv, "x", "k131048-0001"), sendDeps(f2))
  assert.equal((await all(crm, COLL.waNumbers))[0].sendingPaused.reason, "meta_131048")
  const f3 = graphFetch()
  const r3 = await sendMessage(crm, { system: "t" }, textReq(c, conv, "y", "k131048-0002"), sendDeps(f3))
  assert.equal(r3.error, "sending_paused"); assert.equal(f3.calls.length, 0)
})

test("Meta 130429 (rate limit): retryable -> exactly one wa_send job queued, idempotent on repeat", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await seedContact(crm); const conv = await seedConv(crm, c)
  const f = graphFetch([errStep("graph-send-error-130429", 429)])
  const r = await sendMessage(crm, { system: "t" }, textReq(c, conv, "hello", "k130429-0001"), sendDeps(f))
  assert.equal(r.ok, false); assert.equal(r.detail.code, 130429); assert.equal(r.detail.retryQueued, true)
  const jobs = await all(crm, COLL.jobs)
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].kind, "wa_send"); assert.equal(jobs[0].status, "pending"); assert.equal(jobs[0].phoneNumberId, PNID)
  assert.equal(String(jobs[0].payload.messageId), String(r.message._id))
  assert.ok(jobs[0].nextAttemptAt > NOW)
  assert.equal(r.message.error.retryable, true)
  const again = await sendMessage(crm, { system: "t" }, textReq(c, conv, "hello", "k130429-0001"), sendDeps(f))
  assert.equal(again.deduped, true); assert.equal(f.calls.length, 1); assert.equal(await count(crm, COLL.jobs), 1)
  const f5 = graphFetch([{ status: 503, body: { error: { message: "temporarily unavailable", code: 2 } } }])
  const r5 = await sendMessage(crm, { system: "t" }, textReq(c, conv, "hello2", "k503-0001"), sendDeps(f5))
  assert.equal(r5.detail.retryQueued, true); assert.equal(await count(crm, COLL.jobs), 2)
})

test("timeout/network: unknown outcome, failed row marked, never auto-retried (no job, no second call)", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await seedContact(crm); const conv = await seedConv(crm, c)
  const f = graphFetch([timeoutErr()])
  const r = await sendMessage(crm, { system: "t" }, textReq(c, conv, "hello", "ktimeout-0001"), sendDeps(f))
  assert.equal(r.ok, false); assert.equal(r.status, 502)
  assert.equal(r.message.error.kind, "timeout"); assert.equal(r.message.error.outcomeUnknown, true); assert.equal(r.message.error.retryable, false)
  assert.equal(await count(crm, COLL.jobs), 0)
  assert.equal(r.detail.retryQueued, false)
  const again = await sendMessage(crm, { system: "t" }, textReq(c, conv, "hello", "ktimeout-0001"), sendDeps(f))
  assert.equal(again.deduped, true); assert.equal(f.calls.length, 1)
  const f2 = graphFetch([new TypeError("fetch failed")])
  const r2 = await sendMessage(crm, { system: "t" }, textReq(c, conv, "hello", "knet-0001"), sendDeps(f2))
  assert.equal(r2.message.error.kind, "network"); assert.equal(r2.message.error.outcomeUnknown, true); assert.equal(await count(crm, COLL.jobs), 0)
  const f3 = graphFetch([{ status: 200, body: { messages: [] } }])
  const r3 = await sendMessage(crm, { system: "t" }, textReq(c, conv, "hello", "kbad-0001"), sendDeps(f3))
  assert.equal(r3.message.error.kind, "bad_response"); assert.equal(await count(crm, COLL.jobs), 0)
})

test("Meta 131050 on send -> contact opted out; subsequent template sends refused (in-window staff text stays allowed, DATA_MODEL §1.11)", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await seedTemplate(crm, { name: "promo", bodyParamCount: 0, category: "MARKETING" })
  const c = await seedContact(crm, { phoneE164: PHONE }); const conv = await seedConv(crm, c)
  const f = graphFetch([{ status: 400, body: { error: { message: "(#131050) User opted out of marketing messages", code: 131050, fbtrace_id: "T50" } } }])
  await sendMessage(crm, { system: "t" }, textReq(c, conv, "promo", "k131050-0001"), sendDeps(f))
  const o = await all(crm, COLL.optOuts)
  assert.equal(o.length, 1); assert.equal(o[0].phoneE164, PHONE); assert.equal(o[0].via, "meta_131050")
  assert.equal((await all(crm, COLL.contacts))[0].marketingOptOut.via, "meta_131050")
  const f2 = graphFetch()
  const r = await sendMessage(crm, { system: "t" }, tplReq(c, conv, "promo", [], "k131050-0002"), sendDeps(f2))
  assert.equal(r.error, "opted_out"); assert.equal(f2.calls.length, 0)
  const s = await sendMessage(crm, { userId: "u1", name: "Asha" }, textReq(c, conv, "Sure, here is the info", "k131050-0003"), sendDeps(f2))
  assert.equal(s.ok, true, "staff reply in a customer-opened window"); assert.equal(f2.calls.length, 1)
})

// ───────────────────────── health ─────────────────────────
test("health: last send and tierUsed24h per number", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const env = readCrmEnv({ CRM_WA_PHONE_NUMBER_IDS: PNID })
  await seedTemplate(crm, { name: "bi", bodyParamCount: 0 })
  const f = graphFetch()
  const a = await seedContact(crm); const ca = await seedConv(crm, a, { lastInboundAt: ago(40 * H) })
  const b = await seedContact(crm); const cb = await seedConv(crm, b, { lastInboundAt: ago(40 * H) })
  const before0 = await buildHealthReport(crm, env, NOW)
  assert.equal(before0.lastSendAt, null); assert.equal(before0.numbers[0].tierUsed24h, 0)
  const sendAt = new Date(NOW.getTime() - 5 * MIN)
  await sendMessage(crm, { system: "t" }, tplReq(a, ca, "bi"), sendDeps(f, { now: () => sendAt }))
  await sendMessage(crm, { system: "t" }, tplReq(a, ca, "bi"), sendDeps(f, { now: () => sendAt }))
  await sendMessage(crm, { system: "t" }, tplReq(b, cb, "bi"), sendDeps(f, { now: () => sendAt }))
  const h = await buildHealthReport(crm, env, NOW)
  assert.equal(h.lastSendAt, sendAt.toISOString())
  assert.equal(h.numbers[0].lastSendAt, sendAt.toISOString())
  assert.equal(h.numbers[0].tierUsed24h, 2, "unique recipients only")
  assert.equal(h.numbers[0].lastSendError, null)
  const bad = graphFetch([errStep("graph-send-error-131047")])
  const c3 = await seedContact(crm); const cv3 = await seedConv(crm, c3)
  await sendMessage(crm, { system: "t" }, textReq(c3, cv3, "x"), sendDeps(bad))
  const h2 = await buildHealthReport(crm, env, NOW)
  assert.equal(h2.numbers[0].lastSendError.code, 131047)
  const later = await buildHealthReport(crm, env, new Date(NOW.getTime() + 25 * H))
  assert.equal(later.numbers[0].tierUsed24h, 0)
})
