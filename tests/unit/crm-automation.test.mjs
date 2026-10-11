// Run: node --import ./tests/support/register.mjs --test --test-concurrency=1 tests/unit/crm-automation.test.mjs
// STEP 8 inbound automation: keyword suggestions, auto-ack (once, new contacts), after-hours reply
// (once per interval), one message when both apply, Hindi, staff/STOP/opt-out skips, settings API.
import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { ObjectId } from "mongodb"
import { startMemoryMongo } from "./crm/helpers/memory-mongo.mjs"
import { freshCrm, all, count, post, mockMedia, NOW as HNOW } from "./crm/helpers/wa-harness.mjs"
import { loadFixtureJson } from "./crm/helpers/wa-sign.mjs"
import { graphFetch, jreq, apiDeps } from "./crm/helpers/outbound-kit.mjs"
import { COLL } from "../../lib/crm/model.ts"
import { matchKeywordRules } from "../../lib/crm/automation/keywords.ts"
import { AUTOMATION_DEFAULTS, formatBusinessHours, isWithinBusinessHours, mergeSettings, parseAutomationSettings, SUGGESTED_KEYWORD_RULES } from "../../lib/crm/automation/settings.ts"
import { fromAutomationText } from "../../lib/crm/outbound/compose.ts"
import { getAutomationHandler, putAutomationHandler } from "../../lib/crm/api/automation.ts"

let m
before(async () => { m = await startMemoryMongo() })
after(async () => { if (m) await m.stop() })
const need = t => { if (!m.ok) { t.skip(m.skip); return false } return true }
const NO_PARAMS = { params: Promise.resolve({}) }
const BH = AUTOMATION_DEFAULTS.businessHours
const IN_HOURS = HNOW() // Thu 2025-10-09 14:31 IST
const AFTER = new Date("2025-10-09T15:00:00Z") // Thu 20:30 IST
const H = 3600_000

/** Webhook fetch: POST …/messages -> recording Graph fake; anything else -> media mock. */
function wf() {
  const graph = graphFetch()
  const media = mockMedia()
  return { graph, media: { ...media, fetch: (u, i) => (i?.method === "POST" && /\/messages$/.test(u) ? graph(u, i) : media.fetch(u, i)) } }
}
let seq = 0
function msg(text, { from = "919800000001", ts } = {}) {
  const j = loadFixtureJson("text")
  const v = j.entry[0].changes[0].value
  v.messages[0].id = `wamid.AUTO_${++seq}`
  v.messages[0].from = from
  v.contacts[0].wa_id = from
  v.messages[0].text.body = text
  if (ts) v.messages[0].timestamp = String(Math.floor(ts / 1000))
  return j
}
const texts = g => g.calls.filter(c => c.body?.type === "text").map(c => c.body.text.body)
async function settings(crm, s) {
  await crm.collection(COLL.settings).updateOne({ _id: "fogging" }, { $set: s }, { upsert: true })
}

// ───────────────────────── pure ─────────────────────────
test("keywords: whole word, case-insensitive, multi-word with flexible spaces, punctuation, Hindi; never partial words", () => {
  const rules = [{ keyword: "GeM", field: "interestTag", value: "gem" }, { keyword: "nagar nigam", field: "customerType", value: "govt_dept" }, { keyword: "निविदा", field: "interestTag", value: "tender" }]
  const v = t => matchKeywordRules(t, rules).map(r => r.value)
  assert.deepEqual(v("Need it on gem portal"), ["gem"])
  assert.deepEqual(v("GeM, urgent!"), ["gem"])
  assert.deepEqual(v("gemstone machine"), [])
  assert.deepEqual(v("From Nagar   Nigam Gurugram"), ["govt_dept"])
  assert.deepEqual(v("नगर निगम की निविदा के लिए"), ["tender"])
  assert.deepEqual(v("निविदाएँ"), [], "a Hindi word with a vowel sign after the keyword is a different word")
  assert.deepEqual(v(null), [])
  assert.deepEqual(matchKeywordRules("a.b", [{ keyword: "a.b", field: "interestTag", value: "x" }]).length, 1, "regex characters are literal")
  assert.deepEqual(matchKeywordRules("axb", [{ keyword: "a.b", field: "interestTag", value: "x" }]).length, 0)
})

test("business hours (IST): days + open/close boundaries; text form", () => {
  assert.equal(isWithinBusinessHours(BH, new Date("2025-10-09T04:00:00Z")), true, "Thu 09:30 IST")
  assert.equal(isWithinBusinessHours(BH, new Date("2025-10-09T03:59:00Z")), false, "Thu 09:29")
  assert.equal(isWithinBusinessHours(BH, new Date("2025-10-09T12:59:00Z")), true, "18:29")
  assert.equal(isWithinBusinessHours(BH, new Date("2025-10-09T13:00:00Z")), false, "18:30")
  assert.equal(isWithinBusinessHours(BH, new Date("2025-10-12T06:00:00Z")), false, "Sunday")
  assert.equal(formatBusinessHours(BH), "Mon–Sat, 9:30 AM–6:30 PM")
  assert.equal(formatBusinessHours({ ...BH, days: [1, 3, 5], open: "10:00", close: "12:00" }), "Mon, Wed, Fri, 10 AM–12 PM")
  assert.equal(formatBusinessHours({ ...BH, days: [0, 1, 2, 3, 4, 5, 6] }), "Sun–Sat, 9:30 AM–6:30 PM")
})

test("settings: defaults (both replies OFF, no keyword rules); partial docs merged; PUT validation", () => {
  const d = mergeSettings(null)
  assert.equal(d.autoAck.enabled, false); assert.equal(d.afterHoursReply.enabled, false); assert.deepEqual(d.keywordRules, [])
  assert.ok(d.stopKeywords.includes("STOP"))
  assert.equal(mergeSettings({ businessHours: { open: "25:00" }, afterHoursReply: { enabled: true, minIntervalHours: 0 } }).businessHours.open, "09:30")
  assert.equal(mergeSettings({ afterHoursReply: { enabled: true, minIntervalHours: 0 } }).afterHoursReply.minIntervalHours, 12)
  const good = { ...AUTOMATION_DEFAULTS, keywordRules: SUGGESTED_KEYWORD_RULES }
  assert.equal(parseAutomationSettings(JSON.parse(JSON.stringify(good))).ok, true)
  const f = b => parseAutomationSettings({ ...JSON.parse(JSON.stringify(good)), ...b }).fields ?? {}
  assert.equal(f({ businessHours: { tz: "Asia/Kolkata", days: [1, 1], open: "09:30", close: "18:30" } })["businessHours.days"], "invalid")
  assert.equal(f({ businessHours: { tz: "Asia/Kolkata", days: [1], open: "18:30", close: "09:30" } })["businessHours.close"], "must_be_after_open")
  assert.equal(f({ keywordRules: [{ keyword: "x", field: "customerType", value: "alien" }] })["keywordRules.0.value"], "invalid_enum")
  assert.equal(f({ keywordRules: [{ keyword: "x", field: "interestTag", value: "Bad Tag!" }] })["keywordRules.0.value"], "invalid_tag")
  assert.equal(f({ stopKeywords: [] }).stopKeywords, "invalid_list")
  assert.equal(f({ afterHoursReply: { enabled: true, text: "x".repeat(1001), textHi: null, minIntervalHours: 12 } })["afterHoursReply.text"], "too_long")
  assert.equal(f({ extra: 1 }).extra, "unknown_field")
})

test("automation texts: defaults per language, {hours} filled, overrides used, a bad override falls back to the filled default", () => {
  assert.match(fromAutomationText("after_hours", "en_US", { vars: { hours: "Mon–Sat, 9:30 AM–6:30 PM" } }), /Our office hours are Mon–Sat, 9:30 AM–6:30 PM\./)
  assert.match(fromAutomationText("auto_ack", "hi"), /धन्यवाद/)
  assert.equal(fromAutomationText("auto_ack", "en_US", { override: "Hi! Back soon." }), "Hi! Back soon.")
  assert.equal(fromAutomationText("after_hours", "en_US", { override: "Open {hours}", vars: { hours: "10–5" } }), "Open 10–5")
  assert.match(fromAutomationText("after_hours", "en_US", { override: "bad\u0001", vars: { hours: "X" } }), /office hours are X\./)
})

// ───────────────────────── through the webhook ─────────────────────────
test("keyword suggestions: added once per tag; an existing tag / customer type or a rejected suggestion is never re-suggested", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await settings(crm, { keywordRules: [{ keyword: "tender", field: "interestTag", value: "tender" }, { keyword: "dealer", field: "customerType", value: "dealer" }, { keyword: "GeM", field: "interestTag", value: "gem" }] })
  const { media } = wf()
  await post(crm, msg("Is this on GeM? We have a tender"), { media })
  let c = await crm.collection(COLL.contacts).findOne({ phoneE164: "+919800000001" })
  assert.deepEqual(c.suggestions.map(s => `${s.field}:${s.value}:${s.status}`).sort(), ["interestTag:gem:pending", "interestTag:tender:pending"])
  assert.ok(c.suggestions[0].fromMessageId)
  await post(crm, msg("another tender question"), { media })
  c = await crm.collection(COLL.contacts).findOne({ _id: c._id })
  assert.equal(c.suggestions.length, 2, "no duplicate")
  await crm.collection(COLL.contacts).updateOne({ _id: c._id }, { $set: { "suggestions.$[s].status": "rejected", customerType: "dealer" } }, { arrayFilters: [{ "s.value": "gem" }] })
  await post(crm, msg("GeM again, I am a dealer"), { media })
  c = await crm.collection(COLL.contacts).findOne({ _id: c._id })
  assert.equal(c.suggestions.length, 2, "rejected gem not re-suggested; dealer already the customer type")
})

test("auto-ack: OFF by default; when on, sent once to a NEW contact in office hours; never to an existing contact; never twice", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const a = wf()
  await post(crm, msg("hello"), { media: a.media })
  assert.equal(texts(a.graph).length, 0, "off by default")
  const crm2 = await freshCrm(m)
  await settings(crm2, { autoAck: { enabled: true } })
  const b = wf()
  await post(crm2, msg("hello"), { media: b.media })
  assert.deepEqual(texts(b.graph), ["Thanks for contacting 100X Circle. We've received your message and our team will reply shortly."])
  const conv = (await all(crm2, COLL.conversations))[0]
  assert.ok(conv.autoAckSentAt)
  const out = (await all(crm2, COLL.messages, { direction: "out" }))[0]
  assert.equal(out.idempotencyKey, `autoack:${conv._id.toHexString()}`); assert.equal(out.author.kind, "system")
  await post(crm2, msg("are you there?"), { media: b.media })
  assert.equal(texts(b.graph).length, 1, "once per conversation")
  // an existing contact (created by a website form earlier) gets no ack
  const crm3 = await freshCrm(m)
  await settings(crm3, { autoAck: { enabled: true } })
  await crm3.collection(COLL.contacts).insertOne({ _id: new ObjectId(), phoneE164: "+919800000001", waId: "919800000001", name: "Known", mergedInto: null, suggestions: [], interestTags: [], createdAt: IN_HOURS, updatedAt: IN_HOURS })
  const c3 = wf()
  await post(crm3, msg("hi"), { media: c3.media })
  assert.equal(texts(c3.graph).length, 0)
})

test("after-hours: office hours text with {hours}; once per interval per conversation; again after the interval; new contact after hours gets ONE message", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await settings(crm, { afterHoursReply: { enabled: true, minIntervalHours: 12 }, autoAck: { enabled: true } })
  const g = wf()
  await post(crm, msg("hello", { ts: AFTER.getTime() }), { media: g.media, now: () => AFTER })
  assert.deepEqual(texts(g.graph), ["Thanks for your message. Our office hours are Mon–Sat, 9:30 AM–6:30 PM. We'll reply as soon as we're back."])
  const conv = (await all(crm, COLL.conversations))[0]
  assert.ok(conv.autoAckSentAt, "the after-hours text counts as the acknowledgement")
  await post(crm, msg("still there?", { ts: AFTER.getTime() + H }), { media: g.media, now: () => new Date(AFTER.getTime() + H) })
  assert.equal(texts(g.graph).length, 1, "within 12 h: nothing")
  const nextNight = new Date(AFTER.getTime() + 24 * H)
  await post(crm, msg("hello again", { ts: nextNight.getTime() }), { media: g.media, now: () => nextNight })
  assert.equal(texts(g.graph).length, 2, "after the interval: again")
  // in office hours with only after-hours on: nothing
  const crm2 = await freshCrm(m)
  await settings(crm2, { afterHoursReply: { enabled: true, minIntervalHours: 12 } })
  const g2 = wf()
  await post(crm2, msg("hello"), { media: g2.media })
  assert.equal(texts(g2.graph).length, 0)
})

test("Hindi: a Devanagari message (or a hi contact) gets the Hindi text; custom texts override", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await settings(crm, { autoAck: { enabled: true, text: "Thanks! – 100X", textHi: null } })
  const g = wf()
  await post(crm, msg("नमस्ते, मशीन का रेट बताइए"), { media: g.media })
  assert.match(texts(g.graph)[0], /100X Circle से संपर्क करने के लिए धन्यवाद/)
  const crm2 = await freshCrm(m)
  await settings(crm2, { autoAck: { enabled: true, text: "Thanks! – 100X", textHi: null } })
  const g2 = wf()
  await post(crm2, msg("hello"), { media: g2.media })
  assert.deepEqual(texts(g2.graph), ["Thanks! – 100X"])
})

test("skips: staff numbers (no tags, no reply), STOP messages (only the STOP confirmation), opted-out numbers (gate refuses, no Graph call), no token (no crash)", async t => {
  if (!need(t)) return
  const on = { autoAck: { enabled: true }, afterHoursReply: { enabled: true, minIntervalHours: 1 }, keywordRules: [{ keyword: "tender", field: "interestTag", value: "tender" }] }
  const crm = await freshCrm(m)
  await settings(crm, { ...on, staff: [{ userId: "u9", name: "V", waE164: "+919800000001", pushTasks: false }] })
  const g = wf()
  await post(crm, msg("tender update"), { media: g.media })
  assert.equal(texts(g.graph).length, 0)
  assert.deepEqual((await crm.collection(COLL.contacts).findOne({ phoneE164: "+919800000001" })).suggestions, [])
  const crm2 = await freshCrm(m)
  await settings(crm2, on)
  const g2 = wf()
  await post(crm2, msg("STOP"), { media: g2.media })
  assert.equal(texts(g2.graph).length, 1); assert.match(texts(g2.graph)[0], /unsubscribed/)
  const crm3 = await freshCrm(m)
  await settings(crm3, on)
  await crm3.collection(COLL.optOuts).insertOne({ phoneE164: "+919800000001", scope: "marketing", via: "manual", at: IN_HOURS, by: null, sourceMessageId: null })
  const g3 = wf()
  await post(crm3, msg("hello"), { media: g3.media })
  assert.equal(texts(g3.graph).length, 0, "automation to an opted-out number is refused by the gate")
  const crm4 = await freshCrm(m)
  await settings(crm4, on)
  const { env } = await import("./crm/helpers/wa-harness.mjs")
  const r = await post(crm4, msg("hello"), { env: env({ CRM_WA_ACCESS_TOKEN: "" }) })
  assert.equal(r.res.status, 200)
  assert.equal(await count(crm4, COLL.messages, { direction: "in" }), 1)
})

// ───────────────────────── API ─────────────────────────
test("API: crm.settings.edit only; GET returns merged settings + defaults + suggestions; PUT validates, saves and audits", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const d = apiDeps(crm, { perms: ["crm.view", "crm.settings.edit"] })
  assert.equal((await getAutomationHandler(jreq("GET", "http://x/a"), NO_PARAMS, apiDeps(crm, { perms: ["crm.view"] }))).status, 403)
  const g = await (await getAutomationHandler(jreq("GET", "http://x/a"), NO_PARAMS, d)).json()
  assert.equal(g.settings.autoAck.enabled, false); assert.equal(g.hoursText, "Mon–Sat, 9:30 AM–6:30 PM")
  assert.ok(g.defaults.autoAck.en_US && g.defaults.afterHours.hi); assert.equal(g.suggestedKeywordRules.length, SUGGESTED_KEYWORD_RULES.length)
  const body = { ...g.settings, autoAck: { enabled: true, text: null, textHi: null }, keywordRules: [{ keyword: "Tender", field: "interestTag", value: "Tender" }] }
  const p = await putAutomationHandler(jreq("PUT", "http://x/a", body), NO_PARAMS, d)
  assert.equal(p.status, 200)
  assert.deepEqual((await p.json()).settings.keywordRules, [{ keyword: "Tender", field: "interestTag", value: "tender" }])
  const stored = await crm.collection(COLL.settings).findOne({ _id: "fogging" })
  assert.equal(stored.autoAck.enabled, true); assert.equal(stored.updatedBy.userId, "u1")
  const [aud] = await all(crm, COLL.audit, { action: "settings.automation" })
  assert.equal(aud.before.autoAck, false); assert.equal(aud.after.autoAck, true); assert.equal(aud.after.keywordRules, 1)
  assert.equal((await putAutomationHandler(jreq("PUT", "http://x/a", { ...body, stopKeywords: [] }), NO_PARAMS, d)).status, 400)
})

test("UI: hours preview matches the server text; Automation page is in the nav behind crm.settings.edit", async () => {
  const { loadUiFn } = await import("./crm/helpers/ui-fn.mjs")
  const { readFileSync } = await import("node:fs")
  const f = loadUiFn("components/admin/crm/Automation.tsx", "hoursPreview", ['const DAYS = '])
  for (const bh of [BH, { ...BH, days: [1, 3, 5], open: "10:00", close: "12:00" }, { ...BH, days: [0, 6] }]) assert.equal(f(bh.days, bh.open, bh.close), formatBusinessHours(bh))
  assert.equal(f([], "09:30", "18:30"), "—")
  assert.ok(readFileSync("components/admin/crm/CrmShell.tsx", "utf8").includes('{ href: "/admin/crm/automation", label: "Automation", perm: "crm.settings.edit" }'))
})
