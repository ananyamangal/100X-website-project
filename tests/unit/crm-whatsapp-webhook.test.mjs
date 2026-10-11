// Run: node --import ./tests/support/register.mjs --test tests/unit/crm-whatsapp-webhook.test.mjs
// STEP 3b independent tests: webhook integration per fixture, signature, verify, routing, health, middleware.
import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import { startMemoryMongo } from "./crm/helpers/memory-mongo.mjs"
import { TEST_WA, loadFixture, loadFixtureJson, signBody, verifyUrl, testWaEnv } from "./crm/helpers/wa-sign.mjs"
import { freshCrm, post, all, count, env, seedOutbound, mockMedia, NOW, ingestDeps } from "./crm/helpers/wa-harness.mjs"
import { checkWaSignature, verifyWaSignature } from "../../lib/crm/whatsapp/signature.ts"
import { handleVerify } from "../../lib/crm/whatsapp/webhook.ts"
import { silentLogger, drainStaleEvents } from "../../lib/crm/whatsapp/ingest.ts"
import { captureLead } from "../../lib/crm/capture.ts"
import { buildHealthReport, isHealthAuthorized } from "../../lib/crm/health.ts"
import { readCrmEnv } from "../../lib/crm/env.ts"
import { COLL } from "../../lib/crm/model.ts"

let m
before(async () => { m = await startMemoryMongo() })
after(async () => { if (m) await m.stop() })
const need = t => { if (!m.ok) { t.skip(m.skip); return false } return true }

// ───────────────────────── integration, one per fixture ─────────────────────────
test("fixture text: contact+deal(new, whatsapp)+conversation+message stored", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const { res } = await post(crm, loadFixture("text"))
  assert.equal(res.status, 200)
  const msgs = await all(crm, COLL.messages)
  assert.equal(msgs.length, 1)
  assert.equal(msgs[0].type, "text")
  assert.equal(msgs[0].direction, "in")
  assert.equal(msgs[0].text, loadFixtureJson("text").entry[0].changes[0].value.messages[0].text.body)
  assert.equal(msgs[0].waMessageId, "wamid.TEST_TEXT_0001")
  const convs = await all(crm, COLL.conversations)
  assert.equal(convs.length, 1); assert.equal(convs[0].unreadCount, 1); assert.equal(convs[0].hasUnread, true)
  const ev = await all(crm, COLL.waEvents)
  assert.equal(ev.length, 1); assert.equal(ev[0].status, "done")
})

test("fixture image: media downloaded and stored with url/mime/size", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const bytes = Buffer.from("imgbytes-0123456789")
  const { res, up } = await post(crm, loadFixture("image"), { media: mockMedia({ bytes, mime: "image/jpeg" }) })
  assert.equal(res.status, 200)
  const [msg] = await all(crm, COLL.messages)
  assert.equal(msg.type, "image")
  assert.equal(msg.media.storage, "stored")
  assert.match(msg.media.url, /^https:\/\/res\.cloudinary\.com\//)
  assert.equal(msg.media.mime, "image/jpeg")
  assert.equal(msg.media.bytes, bytes.length)
  assert.equal(up.uploads.length, 1)
})

test("fixture document: stored with filename and mime", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const { res } = await post(crm, loadFixture("document"), { media: mockMedia({ mime: "application/pdf" }) })
  assert.equal(res.status, 200)
  const [msg] = await all(crm, COLL.messages)
  assert.equal(msg.type, "document")
  assert.equal(msg.media.storage, "stored")
  assert.equal(msg.media.mime, "application/pdf")
  assert.ok(msg.media.filename, "filename kept from the webhook")
})

test("fixture voice note: audio stored, voice flag kept", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const { res } = await post(crm, loadFixture("voice-note"), { media: mockMedia({ mime: "audio/ogg" }) })
  assert.equal(res.status, 200)
  const [msg] = await all(crm, COLL.messages)
  assert.equal(msg.type, "audio")
  assert.equal(msg.media.voice, true)
  assert.equal(msg.media.storage, "stored")
})

test("fixture status update: updates the message by wamid, forward only, creates no contact", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await seedOutbound(crm)
  const { res } = await post(crm, loadFixture("status-delivered"))
  assert.equal(res.status, 200)
  const [msg] = await all(crm, COLL.messages)
  assert.equal(msg.status, "delivered")
  assert.equal(msg.statusRank, 2)
  assert.ok(msg.statusAt.delivered instanceof Date)
  assert.equal((await all(crm, COLL.waEvents))[0].status, "done")
  assert.equal(await count(crm, COLL.contacts), 0)
})

test("fixture unknown number: creates contact + deal stage New, source whatsapp, profile name, first message", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const { res } = await post(crm, loadFixture("unknown-number-new-contact"))
  assert.equal(res.status, 200)
  const contacts = await all(crm, COLL.contacts)
  assert.equal(contacts.length, 1)
  assert.equal(contacts[0].phoneE164, "+919800000003")
  assert.equal(contacts[0].waProfileName, "Brand New Lead")
  const deals = await all(crm, COLL.deals)
  assert.equal(deals.length, 1)
  assert.equal(deals[0].stage, "new")
  assert.equal(deals[0].leadSource, "whatsapp")
  assert.equal(deals[0].isOpen, true)
  assert.equal(String(deals[0].contactId), String(contacts[0]._id))
  const msgs = await all(crm, COLL.messages)
  assert.equal(msgs.length, 1)
  assert.equal(String(deals[0].origin.firstMessageId), String(msgs[0]._id))
  assert.equal((await all(crm, COLL.conversations))[0].stage, "new")
})

test("fixture known number: appends to the existing contact, no new contact or deal", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const seed = await captureLead(crm, { channel: "call", phone: { phoneE164: "+919800000002", waId: "919800000002", phoneKind: "mobile" }, createdBy: { system: "test" }, now: NOW() })
  const { res } = await post(crm, loadFixture("known-number-existing-contact"))
  assert.equal(res.status, 200)
  assert.equal(await count(crm, COLL.contacts), 1)
  assert.equal(await count(crm, COLL.deals), 1)
  const [msg] = await all(crm, COLL.messages)
  assert.equal(String(msg.contactId), seed.contactId)
})

test("wrong signature: 401 and nothing stored", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const raw = loadFixture("text")
  const { res, tasks } = await post(crm, raw, { sign: { secret: "some-other-secret" } })
  assert.equal(res.status, 401)
  assert.equal(tasks.length, 0)
  for (const c of [COLL.waEvents, COLL.contacts, COLL.deals, COLL.messages, COLL.conversations]) assert.equal(await count(crm, c), 0, c)
  const r2 = await post(crm, raw.replace("price", "pr1ce"), { sign: { signature: signBody(raw) } })
  assert.equal(r2.res.status, 401)
  assert.equal(await count(crm, COLL.waEvents), 0)
})

// ───────────────────────── signature unit ─────────────────────────
test("signature: valid / wrong secret / missing / malformed / untrimmed secret", () => {
  const body = loadFixture("text")
  const good = signBody(body)
  assert.equal(verifyWaSignature(body, good, TEST_WA.appSecret), true)
  assert.equal(verifyWaSignature(Buffer.from(body), good, TEST_WA.appSecret), true)
  assert.equal(checkWaSignature(body, signBody(body, "nope"), TEST_WA.appSecret).ok, false)
  assert.deepEqual(checkWaSignature(body, null, TEST_WA.appSecret), { ok: false, reason: "missing_header" })
  assert.deepEqual(checkWaSignature(body, "", TEST_WA.appSecret), { ok: false, reason: "missing_header" })
  for (const bad of ["abc", "sha256=zz", "sha256=" + "a".repeat(63), "sha1=" + good.slice(7), good.slice(7), "sha256=" + "a".repeat(65)]) {
    const r = checkWaSignature(body, bad, TEST_WA.appSecret)
    assert.equal(r.ok, false, bad); assert.equal(r.reason, "malformed_header", bad)
  }
  assert.equal(checkWaSignature(body, good, undefined).ok, false)
  assert.equal(checkWaSignature(body, good, "   ").ok, false)
  assert.equal(verifyWaSignature(body, good, "  " + TEST_WA.appSecret + "\n"), true)
  assert.equal(readCrmEnv(testWaEnv({ CRM_WA_APP_SECRET: " " + TEST_WA.appSecret + "\r\n" })).waAppSecret, TEST_WA.appSecret)
})

test("signature over HTTP: missing and malformed header are 401; untrimmed env secret still verifies", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  for (const sig of [null, "garbage", "sha256=short"]) {
    const { res } = await post(crm, loadFixture("text"), { sign: { signature: sig } })
    assert.equal(res.status, 401, String(sig))
  }
  assert.equal(await count(crm, COLL.waEvents), 0)
  const untrimmed = await post(crm, loadFixture("text"), { env: env({ CRM_WA_APP_SECRET: "  " + TEST_WA.appSecret + "\n" }) })
  assert.equal(untrimmed.res.status, 200)
  assert.equal(await count(crm, COLL.messages), 1)
})

// ───────────────────────── GET verify ─────────────────────────
test("GET verify: correct token echoes challenge, wrong token / mode / missing is 403", async () => {
  const e = env()
  const ok = handleVerify(verifyUrl(), e, silentLogger)
  assert.equal(ok.status, 200)
  assert.equal(ok.headers.get("content-type"), "text/plain")
  assert.equal(await ok.text(), "1158201444")
  assert.equal(handleVerify(verifyUrl({ token: "wrong" }), e, silentLogger).status, 403)
  assert.equal(handleVerify(verifyUrl({ token: null }), e, silentLogger).status, 403)
  assert.equal(handleVerify(verifyUrl({ mode: "unsubscribe" }), e, silentLogger).status, 403)
  assert.equal(handleVerify(verifyUrl(), env({ CRM_WA_VERIFY_TOKEN: "" }), silentLogger).status, 403)
})

// ───────────────────────── POST failure / duplicate ─────────────────────────
test("POST: storage failure returns non-2xx so Meta retries, and schedules no processing", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const boom = Object.assign(new Error("boom"), { code: 6 })
  const broken = {
    workspace: crm.workspace,
    collection: name => {
      const c = crm.collection(name)
      return new Proxy(c, { get(tg, p) { if (p === "insertMany" || p === "insertOne") return async () => { throw boom }; const v = tg[p]; return typeof v === "function" ? v.bind(tg) : v } })
    },
  }
  const a = await post(crm, loadFixture("text"), { getDb: async () => broken })
  assert.ok(a.res.status >= 500, "status " + a.res.status)
  assert.equal(a.tasks.length, 0)
  const b = await post(crm, loadFixture("text"), { getDb: async () => { throw new Error("db down") } })
  assert.ok(b.res.status >= 500)
  assert.equal(await count(crm, COLL.waEvents), 0)
  const c = await post(crm, loadFixture("text"))
  assert.equal(c.res.status, 200); assert.equal(await count(crm, COLL.messages), 1)
})

test("POST: duplicate delivery stores no second message and does not double-count unread", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const raw = loadFixture("text")
  assert.equal((await post(crm, raw)).res.status, 200)
  const second = await post(crm, raw)
  assert.equal(second.res.status, 200)
  assert.equal(await count(crm, COLL.messages), 1)
  assert.equal(await count(crm, COLL.waEvents), 1)
  assert.equal((await all(crm, COLL.conversations))[0].unreadCount, 1)
  assert.equal(await count(crm, COLL.contacts), 1); assert.equal(await count(crm, COLL.deals), 1)
  // same wamid inside a re-wrapped payload (different bytes)
  const j = loadFixtureJson("text"); j.entry[0].id = "200000000000009"
  const third = await post(crm, j)
  assert.equal(third.res.status, 200)
  assert.equal(await count(crm, COLL.messages), 1)
  assert.equal((await all(crm, COLL.conversations))[0].unreadCount, 1, "unread must stay 1")
})

test("POST: invalid JSON is 400, non-WABA object is ignored with 200", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  assert.equal((await post(crm, "{not json")).res.status, 400)
  assert.equal((await post(crm, { object: "page", entry: [] })).res.status, 200)
  assert.equal(await count(crm, COLL.waEvents), 0)
})

// ───────────────────────── phone_number_id routing ─────────────────────────
test("routing: allow-listed processed; non-allow-listed stored cancelled with expireAt, never processed, no contact", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const bad = await post(crm, loadFixture("non-allowlisted-number"))
  assert.equal(bad.res.status, 200)
  const [ev] = await all(crm, COLL.waEvents)
  assert.equal(ev.status, "cancelled"); assert.equal(ev.allowed, false)
  assert.ok(ev.expireAt instanceof Date && ev.expireAt > NOW())
  for (const c of [COLL.contacts, COLL.deals, COLL.messages, COLL.conversations]) assert.equal(await count(crm, c), 0, c)
  const good = await post(crm, loadFixture("text"))
  assert.equal(good.res.status, 200)
  assert.equal(await count(crm, COLL.contacts), 1)
  assert.equal((await all(crm, COLL.waEvents, { allowed: true }))[0].status, "done")
  await drainStaleEvents(crm, ingestDeps({ now: () => new Date(NOW().getTime() + 86400000) }))
  assert.equal((await all(crm, COLL.waEvents, { allowed: false }))[0].status, "cancelled")
  assert.equal(await count(crm, COLL.contacts), 1)
})

// ───────────────────────── /health ─────────────────────────
test("health: bearer-only (401 without, 401 with secret in query), 200 report has numeric queue depth", async t => {
  const S = "test-cron-secret-not-real"
  assert.equal(isHealthAuthorized(null, S), false)
  assert.equal(isHealthAuthorized("Bearer wrong", S), false)
  assert.equal(isHealthAuthorized("Bearer " + S, undefined), false)
  assert.equal(isHealthAuthorized("Bearer " + S, S), true)
  assert.equal(isHealthAuthorized(S, S), false, "bare secret is not a bearer")
  const prev = process.env.CRON_SECRET
  process.env.CRON_SECRET = S
  try {
    const { GET } = await import("../../app/api/crm/health/route.ts")
    const { NextRequest } = await import("next/server")
    assert.equal((await GET(new NextRequest("http://localhost/api/crm/health"))).status, 401)
    for (const q of ["secret", "key", "token", "cron_secret", "CRON_SECRET", "authorization"]) {
      const r = await GET(new NextRequest("http://localhost/api/crm/health?" + q + "=" + S))
      assert.equal(r.status, 401, "query param " + q)
    }
    assert.equal((await GET(new NextRequest("http://localhost/api/crm/health", { headers: { authorization: "Bearer nope" } }))).status, 401)
  } finally { if (prev === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = prev }
  if (!need(t)) return
  const crm = await freshCrm(m)
  await post(crm, loadFixture("text"), { runAfter: false })
  const rep = await buildHealthReport(crm, env(), NOW())
  assert.equal(rep.ok, true)
  assert.equal(typeof rep.queueDepth, "number")
  assert.equal(rep.queueDepth, 1)
  assert.equal(rep.workspace, "fogging")
  const s = JSON.stringify(rep)
  assert.equal(s.includes(TEST_WA.appSecret) || s.includes(TEST_WA.accessToken) || s.includes(TEST_WA.verifyToken), false)
})

// ───────────────────────── middleware ─────────────────────────
test("middleware: non-exempt /api/crm/* without a session is 401; the two exempt paths pass through", async () => {
  // middleware.ts imports the type NextFetchEvent as a value (fine for the Next compiler, not for
  // Node's ESM loader), so load a copy with only that type-only name removed. Logic is untouched.
  const copy = new URL("./crm/helpers/.middleware-under-test.ts", import.meta.url)
  const src = fs.readFileSync(new URL("../../middleware.ts", import.meta.url), "utf8").replace("NextResponse, NextFetchEvent }", "NextResponse }")
  assert.notEqual(src, fs.readFileSync(new URL("../../middleware.ts", import.meta.url), "utf8"))
  fs.writeFileSync(copy, src)
  let middleware
  try { ({ middleware } = await import(copy.href)) } finally { fs.rmSync(copy, { force: true }) }
  const { NextRequest } = await import("next/server")
  const run = (path, method = "GET") => middleware(new NextRequest("http://localhost" + path, { method }), { waitUntil() {} })
  for (const p of ["/api/crm/contacts", "/api/crm/whatsapp/send", "/api/crm/health/x", "/api/crm/whatsapp/webhook/extra", "/api/crm/healthz"]) {
    assert.equal((await run(p)).status, 401, p)
  }
  assert.equal((await run("/api/crm/contacts", "POST")).status, 401)
  for (const [p, method] of [["/api/crm/whatsapp/webhook", "POST"], ["/api/crm/whatsapp/webhook", "GET"], ["/api/crm/health", "GET"]]) {
    const r = await run(p, method)
    assert.equal(r.headers.get("x-middleware-next"), "1", method + " " + p + " should pass through")
  }
})

// ───────────────────────── internal-notes rule ─────────────────────────
test("webhook/ingest/capture/health never import or name the internal-notes module", () => {
  for (const f of ["lib/crm/whatsapp/webhook.ts", "lib/crm/whatsapp/ingest.ts", "lib/crm/whatsapp/media.ts", "lib/crm/whatsapp/parse.ts", "lib/crm/capture.ts", "lib/crm/health.ts", "app/api/crm/whatsapp/webhook/route.ts"]) {
    const src = fs.readFileSync(new URL("../../" + f, import.meta.url), "utf8")
    const specs = [...src.matchAll(/(?:from\s*|import\s*\(\s*|require\s*\(\s*)["']([^"']+)["']/g)].map(x => x[1])
    for (const s of specs) assert.ok(!/notes/i.test(s), f + " imports " + s)
    assert.ok(!/COLL\.internalNotes|crm_internal_notes/.test(src), f + " names the notes collection")
  }
})
