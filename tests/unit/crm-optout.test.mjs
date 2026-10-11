// Run: node --import ./tests/support/register.mjs --test --test-concurrency=1 tests/unit/crm-optout.test.mjs
// STEP 5 opt-out compliance (DATA_MODEL §1.11): STOP / बंद / "Stop promotions" button / START via the
// real webhook path, idempotency, confirmation text, 131050 status, and what an opted-out contact may receive.
import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { ObjectId } from "mongodb"
import { startMemoryMongo } from "./crm/helpers/memory-mongo.mjs"
import { freshCrm, all, count, post, mockMedia, variant, ingestDeps } from "./crm/helpers/wa-harness.mjs"
import { TEST_WA, loadFixtureJson } from "./crm/helpers/wa-sign.mjs"
import { PNID, NOW, H, ago, out, graphFetch, sendDeps, seedContact, seedConv, seedTemplate } from "./crm/helpers/outbound-kit.mjs"
import { COLL } from "../../lib/crm/model.ts"
import { detectOptKeyword, handleInboundOptOut, normaliseKeyword } from "../../lib/crm/outbound/optout.ts"
import { sendMessage } from "../../lib/crm/outbound/send.ts"
import { checkSend } from "../../lib/crm/outbound/gate.ts"
import { graphConfigFrom } from "../../lib/crm/outbound/graph.ts"

let m
before(async () => { m = await startMemoryMongo() })
after(async () => { if (m) await m.stop() })
const need = t => { if (!m.ok) { t.skip(m.skip); return false } return true }

const CUSTOMER = "+919800000001"
const EN_CONFIRM = "You've been unsubscribed from promotional messages. Reply START to subscribe again."

/** Webhook fetch: POST …/messages goes to a recording Graph fake, everything else to the media mock. */
function webhookFetch(plan) {
  const graph = graphFetch(plan)
  const media = mockMedia()
  const fetch = (url, init) => (init?.method === "POST" && /\/messages$/.test(url) ? graph(url, init) : media.fetch(url, init))
  return { graph, media: { ...media, fetch } }
}
const sends = graph => graph.calls.filter(c => c.body?.type === "text")

// ───────────────────────── detection (pure) ─────────────────────────
test("detect: whole-message keywords, case/punctuation-insensitive; START; button payload/title; settings override", () => {
  const txt = s => ({ type: "text", text: s, interactive: null })
  for (const s of ["STOP", "stop", " Stop! ", "Stop.", "UNSUBSCRIBE", "stop   promotions", "बंद", "बंद।", "प्रमोशन बंद करें"]) {
    assert.equal(detectOptKeyword(txt(s))?.action, "stop", JSON.stringify(s))
  }
  assert.equal(detectOptKeyword(txt("बंद")).hindi, true)
  assert.equal(detectOptKeyword(txt("STOP")).hindi, false)
  for (const s of ["please stop", "stop sending me the price list", "stopwatch", "", "  ", "don't stop"]) assert.equal(detectOptKeyword(txt(s)), null, JSON.stringify(s))
  assert.deepEqual(detectOptKeyword(txt("start")), { action: "start" })
  assert.equal(detectOptKeyword({ type: "button", text: "x", interactive: { kind: "button_reply", id: "opt_out", title: "Anything" } }).via, "stop_button")
  assert.equal(detectOptKeyword({ type: "interactive", text: "x", interactive: { kind: "button_reply", id: "b1", title: "Stop promotions" } }).via, "stop_button")
  assert.equal(detectOptKeyword({ type: "interactive", text: "Yes", interactive: { kind: "button_reply", id: "b1", title: "Yes" } }), null)
  assert.equal(detectOptKeyword(txt("ruko"), ["RUKO"]).action, "stop", "settings.stopKeywords used when set")
  assert.equal(detectOptKeyword(txt("STOP"), ["RUKO"]), null, "settings list replaces the defaults")
  assert.equal(detectOptKeyword(txt("STOP"), []).action, "stop", "empty settings list falls back to defaults")
  assert.equal(normaliseKeyword("  \"Stop!!\" "), "STOP")
})

// ───────────────────────── webhook path ─────────────────────────
test("webhook STOP: opt-out row (E.164), contact mirror, one activity, one audit, English confirmation sent inside the window; automation hook skipped", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const { graph, media } = webhookFetch()
  const hookCalls = []
  const { res } = await post(crm, loadFixtureJson("stop-text"), { media, afterInbound: async ctx => { hookCalls.push(ctx.messageId) } })
  assert.equal(res.status, 200)
  const [o] = await all(crm, COLL.optOuts)
  assert.equal(o.phoneE164, CUSTOMER); assert.equal(o.via, "stop_keyword"); assert.equal(o.scope, "marketing")
  const [c] = await all(crm, COLL.contacts)
  assert.equal(c.marketingOptOut.via, "stop_keyword")
  assert.equal(await count(crm, COLL.activities, { kind: "opt_out" }), 1)
  assert.equal(await count(crm, COLL.audit, { action: "optout.set" }), 1)
  const s = sends(graph)
  assert.equal(s.length, 1, "one confirmation")
  assert.equal(s[0].body.text.body, EN_CONFIRM)
  assert.equal(s[0].body.to, "919800000001")
  const outRow = (await all(crm, COLL.messages, { direction: "out" }))[0]
  assert.equal(outRow.status, "sent"); assert.ok(outRow.idempotencyKey.startsWith("optout:"))
  assert.equal(hookCalls.length, 0)
  // redelivery of the same webhook: event dedupe -> nothing repeats
  await post(crm, loadFixtureJson("stop-text"), { media })
  assert.equal(await count(crm, COLL.optOuts), 1)
  assert.equal(await count(crm, COLL.activities, { kind: "opt_out" }), 1)
  assert.equal(sends(graph).length, 1)
})

test("webhook STOP in Hindi -> Hindi confirmation; 'Stop promotions' button -> via stop_button", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const a = webhookFetch()
  await post(crm, loadFixtureJson("stop-text-hindi"), { media: a.media })
  assert.match(sends(a.graph)[0].body.text.body, /START/)
  assert.match(sends(a.graph)[0].body.text.body, /[ऀ-ॿ]/, "Hindi text")
  const crm2 = await freshCrm(m)
  const b = webhookFetch()
  await post(crm2, loadFixtureJson("stop-promotions-button"), { media: b.media })
  const [o] = await all(crm2, COLL.optOuts)
  assert.equal(o.via, "stop_button")
  assert.equal(sends(b.graph).length, 1)
})

test("webhook START after STOP: opt-out row and mirror removed, opt-in activity + audit, no reply sent", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const { graph, media } = webhookFetch()
  await post(crm, loadFixtureJson("stop-text"), { media })
  assert.equal(await count(crm, COLL.optOuts), 1)
  await post(crm, variant("start-text", { ts: 1760000200 }), { media, now: () => new Date(1760000600 * 1000) })
  assert.equal(await count(crm, COLL.optOuts), 0)
  assert.equal((await all(crm, COLL.contacts))[0].marketingOptOut, null)
  assert.equal(await count(crm, COLL.activities, { kind: "opt_out", "data.action": "opt_in" }), 1)
  assert.equal(await count(crm, COLL.audit, { action: "optout.clear" }), 1)
  assert.equal(sends(graph).length, 1, "only the STOP confirmation, nothing for START")
  // START with nothing to clear writes nothing
  await post(crm, variant("start-text", { wamid: "wamid.TEST_START_0002", ts: 1760000300 }), { media, now: () => new Date(1760000700 * 1000) })
  assert.equal(await count(crm, COLL.audit, { action: "optout.clear" }), 1)
})

test("handleInboundOptOut is idempotent on re-processing (same message id): one row, one activity, one Graph call", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await seedContact(crm, { phoneE164: CUSTOMER })
  const conv = await seedConv(crm, c, { lastInboundAt: ago(1000) })
  const f = graphFetch()
  const ctx = { event: { type: "text", text: "STOP", interactive: null, from: CUSTOMER }, contactId: c._id, conversationId: conv, messageId: new ObjectId() }
  const deps = { allowList: [PNID], graph: graphConfigFrom({ waAccessToken: TEST_WA.accessToken, waApiVersion: "v23.0" }, f), requestId: "r1", now: () => NOW }
  const r1 = await handleInboundOptOut(crm, ctx, deps)
  const r2 = await handleInboundOptOut(crm, ctx, deps)
  assert.equal(r1.confirmation, "sent"); assert.equal(r2.confirmation, "deduped")
  assert.equal(await count(crm, COLL.optOuts), 1)
  assert.equal(await count(crm, COLL.activities, { kind: "opt_out" }), 1)
  assert.equal(f.calls.length, 1)
  // no access token: opt-out still stored, confirmation skipped, nothing thrown
  const crm2 = await freshCrm(m)
  const c2 = await seedContact(crm2, { phoneE164: CUSTOMER }); const conv2 = await seedConv(crm2, c2)
  const r3 = await handleInboundOptOut(crm2, { ...ctx, contactId: c2._id, conversationId: conv2 }, { ...deps, graph: null })
  assert.equal(r3.confirmation, "not_configured"); assert.equal(await count(crm2, COLL.optOuts), 1)
})

test("a normal inbound text still reaches the automation hook; a STOP does not", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const { media } = webhookFetch()
  const seen = []
  const afterInbound = async ctx => { seen.push(ctx.event.text) }
  await post(crm, loadFixtureJson("text"), { media, afterInbound })
  assert.equal(seen.length, 1, "plain text -> hook")
  await post(crm, variant("stop-text", { wamid: "wamid.TEST_STOP_X", ts: 1760000120 }), { media, afterInbound })
  assert.equal(seen.length, 1, "STOP -> no hook")
  assert.equal(await count(crm, COLL.optOuts), 1)
})

// ───────────────────────── 131050 via status webhook ─────────────────────────
test("status webhook failed 131050 -> opt-out (via meta_131050) + mirror; conversation updatedAt bumped for inbox polling", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const c = await seedContact(crm, { phoneE164: "+919800000002" })
  const conv = await seedConv(crm, c, { updatedAt: ago(10 * H) })
  await crm.collection(COLL.messages).insertOne({
    _id: new ObjectId(), conversationId: conv, contactId: c._id, phoneNumberId: PNID, direction: "out", waMessageId: TEST_WA.outboundWamid,
    type: "template", status: "sent", statusRank: 1, statusAt: {}, createdAt: ago(H),
  })
  const j = loadFixtureJson("status-failed")
  j.entry[0].changes[0].value.statuses[0].errors[0] = { code: 131050, title: "User stopped marketing messages", message: "x" }
  const at = new Date(1760000500 * 1000)
  await post(crm, j, { now: () => at })
  const [o] = await all(crm, COLL.optOuts)
  assert.equal(o?.via, "meta_131050"); assert.equal(o.phoneE164, "+919800000002")
  assert.equal((await all(crm, COLL.contacts))[0].marketingOptOut.via, "meta_131050")
  assert.deepEqual((await all(crm, COLL.conversations))[0].updatedAt, at)
})

// ───────────────────────── what an opted-out contact may receive ─────────────────────────
test("opted out: staff free-form reply inside a customer-opened window is allowed (DATA_MODEL §1.11); templates, broadcasts and automation are refused", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await seedTemplate(crm, { name: "promo", bodyParamCount: 0, category: "MARKETING" })
  await seedTemplate(crm, { name: "util", bodyParamCount: 0, category: "UTILITY" })
  const c = await seedContact(crm, { marketingOptOut: { at: NOW, via: "stop_keyword" } })
  await crm.collection(COLL.optOuts).insertOne({ phoneE164: c.phoneE164, scope: "marketing", via: "stop_keyword", at: NOW, by: null, sourceMessageId: null })
  const conv = await seedConv(crm, c, { lastInboundAt: ago(H) })
  const g = (kind, purpose, extra = {}) => checkSend(crm, { contact: c._id, conversationId: conv, kind, purpose, text: kind === "session_text" ? out("Sure, the price is attached") : null, ...extra }, { allowList: [PNID], now: NOW })
  assert.equal((await g("session_text", "staff")).ok, true, "staff text in window")
  assert.equal((await g("session_media", "staff")).ok, true, "staff media in window")
  assert.equal((await g("session_text", "quotation")).ok, true)
  assert.equal((await g("session_text", "optout_confirmation")).ok, true)
  for (const p of ["automation", "broadcast", "staff_push"]) assert.equal((await g("session_text", p)).reason, "opted_out", p)
  for (const name of ["promo", "util"]) {
    for (const p of ["staff", "broadcast"]) assert.equal((await g("template", p, { templateName: name, language: "en_US", params: [] })).reason, "opted_out", `${name}/${p}`)
  }
  // outside the window a staff text is still refused (window rule)
  await crm.collection(COLL.conversations).updateOne({ _id: conv }, { $set: { lastInboundAt: ago(30 * H) } })
  assert.equal((await g("session_text", "staff")).reason, "window_closed")
  // end to end through sendMessage
  await crm.collection(COLL.conversations).updateOne({ _id: conv }, { $set: { lastInboundAt: ago(H) } })
  const f = graphFetch()
  const r = await sendMessage(crm, { userId: "u1", name: "Asha" }, { contactId: c._id, conversationId: conv, idempotencyKey: "oo-staff-0001", route: "t", content: { kind: "text", text: out("Sure") } }, sendDeps(f))
  assert.equal(r.ok, true); assert.equal(f.calls.length, 1)
})
