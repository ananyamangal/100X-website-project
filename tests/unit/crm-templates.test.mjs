// Run: node --import ./tests/support/register.mjs --test --test-concurrency=1 tests/unit/crm-templates.test.mjs
// STEP 5 template catalogue: parsing, Graph sync (paging, disable-on-complete), picker, preview, API permissions + audit.
import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { startMemoryMongo } from "./crm/helpers/memory-mongo.mjs"
import { freshCrm, all, count } from "./crm/helpers/wa-harness.mjs"
import { TEST_WA } from "./crm/helpers/wa-sign.mjs"
import { NOW, graphFetch, fx, cfgOf, seedTemplate, jreq, apiDeps, captureConsole } from "./crm/helpers/outbound-kit.mjs"
import { COLL } from "../../lib/crm/model.ts"
import { parseTemplate, positionalParamCount, syncTemplates, listApprovedTemplates, renderTemplatePreview } from "../../lib/crm/outbound/templates.ts"
import { listTemplatesHandler, syncTemplatesHandler } from "../../lib/crm/api/templates.ts"

let m
before(async () => { m = await startMemoryMongo() })
after(async () => { if (m) await m.stop() })
const need = t => { if (!m.ok) { t.skip(m.skip); return false } return true }
const NO_PARAMS = { params: Promise.resolve({}) }
const page = (data, after) => ({ status: 200, body: { data, paging: after ? { cursors: { after }, next: "https://graph.facebook.com/next?ignored=1" } : { cursors: {} } } })

test("parseTemplate: positional count, header type, named detection, opt-out button (en + hi)", () => {
  const p = fx("graph-templates-page").data.map(parseTemplate)
  const by = n => p.find(x => x.name === n)
  assert.equal(by("fog_quote_followup").bodyParamCount, 4, "max {{n}}, not occurrence order")
  assert.equal(by("fog_quote_followup").headerType, "NONE")
  assert.equal(by("fog_quote_followup").hasOptOutButton, false)
  assert.equal(by("fog_product_offer").hasOptOutButton, true, "Hindi 'प्रमोशन बंद करें' button")
  assert.equal(by("fog_quote_document").headerType, "DOCUMENT")
  assert.equal(by("fog_quote_document").bodyParamCount, 5)
  assert.equal(by("fog_service_reminder").parameterFormat, "POSITIONAL", "no parameter_format + {{1}} -> positional")
  assert.equal(parseTemplate({ name: "n", language: "en_US", components: [{ type: "BODY", text: "Hi {{first_name}}" }] }).parameterFormat, "NAMED")
  assert.equal(parseTemplate({ name: "n", language: "en_US", components: [{ type: "BUTTONS", buttons: [{ type: "MARKETING_OPT_OUT", text: "x" }] }] }).hasOptOutButton, true)
  assert.equal(parseTemplate({ name: "n", language: "en_US", components: [{ type: "HEADER", format: "TEXT", text: "Order {{1}}" }] }).headerParamCount, 1)
  assert.equal(parseTemplate({ language: "en_US" }), null)
  assert.equal(parseTemplate("x"), null)
  assert.equal(positionalParamCount("{{ 2 }} and {{1}}"), 2)
})

test("sync: one page -> upserts by (name, language), cursor paging, token only in the header, WABA id in the path", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const data = fx("graph-templates-page").data
  const f = graphFetch([page(data.slice(0, 2), "CUR1"), page(data.slice(2))])
  const r = await syncTemplates(crm, cfgOf(f), TEST_WA.wabaId, NOW)
  assert.deepEqual(r, { ok: true, fetched: 4, upserted: 4, disabled: 0, complete: true })
  assert.equal(f.calls.length, 2)
  for (const c of f.calls) {
    assert.ok(c.url.startsWith(`https://graph.facebook.com/v23.0/${TEST_WA.wabaId}/message_templates?`), c.url)
    assert.ok(!c.url.includes(TEST_WA.accessToken))
    assert.equal(c.init.headers.Authorization, `Bearer ${TEST_WA.accessToken}`)
  }
  assert.ok(!f.calls[0].url.includes("after="))
  assert.ok(f.calls[1].url.includes("after=CUR1"), "second page by cursor, never by following paging.next")
  const rows = await all(crm, COLL.waTemplates)
  assert.equal(rows.length, 4)
  const doc = rows.find(x => x.name === "fog_quote_document")
  assert.equal(doc.status, "APPROVED"); assert.equal(doc.headerType, "DOCUMENT"); assert.equal(doc.metaId, "9003"); assert.deepEqual(doc.syncedAt, NOW)
  // re-sync is an update, not a duplicate
  await syncTemplates(crm, cfgOf(graphFetch([page(data)])), TEST_WA.wabaId, new Date(NOW.getTime() + 1000))
  assert.equal(await count(crm, COLL.waTemplates), 4)
})

test("sync: after a COMPLETE sync, templates Meta no longer returns become DISABLED; an incomplete (failed) sync disables nothing", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await seedTemplate(crm, { name: "old_one", status: "APPROVED", syncedAt: new Date(NOW.getTime() - 86400_000) })
  const data = fx("graph-templates-page").data
  // page 1 ok, page 2 fails -> no disabling
  const failing = graphFetch([page(data.slice(0, 2), "CUR1"), { status: 500, body: { error: { message: "oops", code: 1 } } }])
  const bad = await syncTemplates(crm, cfgOf(failing), TEST_WA.wabaId, NOW)
  assert.equal(bad.ok, false); assert.equal(bad.error, "graph_error")
  assert.equal((await all(crm, COLL.waTemplates, { name: "old_one" }))[0].status, "APPROVED")
  const ok = await syncTemplates(crm, cfgOf(graphFetch([page(data)])), TEST_WA.wabaId, new Date(NOW.getTime() + 1000))
  assert.equal(ok.disabled, 1)
  const old = (await all(crm, COLL.waTemplates, { name: "old_one" }))[0]
  assert.equal(old.status, "DISABLED"); assert.equal(old.removedFromMeta, true)
  // it comes back -> live again
  await syncTemplates(crm, cfgOf(graphFetch([page([...data, { id: "1", name: "old_one", language: "en_US", status: "APPROVED", category: "UTILITY", components: [] }])])), TEST_WA.wabaId, new Date(NOW.getTime() + 2000))
  const back = (await all(crm, COLL.waTemplates, { name: "old_one" }))[0]
  assert.equal(back.status, "APPROVED"); assert.equal(back.removedFromMeta, false)
})

test("sync: page cap reached (MAX_PAGES) -> complete:false and nothing is disabled", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await seedTemplate(crm, { name: "old_one", status: "APPROVED", syncedAt: new Date(NOW.getTime() - 86400_000) })
  let n = 0
  const endless = graphFetch([() => page([{ id: String(++n), name: `t${n}`, language: "en_US", status: "APPROVED", category: "UTILITY", components: [] }], `C${n}`)])
  const r = await syncTemplates(crm, cfgOf(endless), TEST_WA.wabaId, NOW)
  assert.equal(r.ok, true); assert.equal(r.complete, false); assert.equal(r.disabled, 0)
  assert.equal(endless.calls.length, 20)
  assert.equal((await all(crm, COLL.waTemplates, { name: "old_one" }))[0].status, "APPROVED")
})

test("sync: not configured / WABA unset -> error, no Graph call", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  assert.deepEqual(await syncTemplates(crm, null, TEST_WA.wabaId, NOW), { ok: false, error: "whatsapp_not_configured" })
  const f = graphFetch()
  assert.deepEqual(await syncTemplates(crm, cfgOf(f), "  ", NOW), { ok: false, error: "waba_not_set" })
  assert.equal(f.calls.length, 0)
})

test("picker lists APPROVED positional templates only; language filter; preview fills params and refuses a wrong count", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await syncTemplates(crm, cfgOf(graphFetch([page(fx("graph-templates-page").data)])), TEST_WA.wabaId, NOW)
  await seedTemplate(crm, { name: "named_one", parameterFormat: "NAMED" })
  const items = await listApprovedTemplates(crm)
  assert.deepEqual(items.map(i => i.name).sort(), ["fog_quote_document", "fog_quote_followup"])
  assert.equal((await listApprovedTemplates(crm, { language: "hi" })).length, 0)
  const row = (await all(crm, COLL.waTemplates, { name: "fog_quote_followup" }))[0]
  const p = renderTemplatePreview(row, ["Ravi", "10 Oct", "ULV fogger", "Q-0001"])
  assert.equal(p.ok, true)
  assert.match(p.body, /^Hello Ravi, we sent you quotation Q-0001 for ULV fogger on 10 Oct\./)
  assert.deepEqual(p.buttons, ["Need changes", "Will confirm soon"])
  assert.deepEqual(renderTemplatePreview(row, ["a"]), { ok: false, error: "param_count", expected: 4, got: 1 })
  const docRow = (await all(crm, COLL.waTemplates, { name: "fog_quote_document" }))[0]
  assert.equal(renderTemplatePreview(docRow, ["a", "b", "c", "d", "e"]).header, "[DOCUMENT]")
})

test("API: list needs crm.inbox.view, sync needs crm.settings.edit; sync audits counts; errors map to 503/502 with Meta fields logged, no token", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  await seedTemplate(crm, { name: "fog_t" })
  const listOk = await listTemplatesHandler(jreq("GET", "http://x/api/crm/templates"), NO_PARAMS, apiDeps(crm))
  assert.equal(listOk.status, 200)
  assert.equal((await listOk.json()).items.length, 1)
  assert.equal((await listTemplatesHandler(jreq("GET", "http://x/api/crm/templates"), NO_PARAMS, apiDeps(crm, { perms: ["crm.view"] }))).status, 403)
  assert.equal((await listTemplatesHandler(jreq("GET", "http://x/api/crm/templates?language=EN!"), NO_PARAMS, apiDeps(crm))).status, 400)
  assert.equal((await listTemplatesHandler(jreq("GET", "http://x/api/crm/templates"), NO_PARAMS, apiDeps(crm, { noUser: true }))).status, 401)

  const f = graphFetch([page(fx("graph-templates-page").data)])
  assert.equal((await syncTemplatesHandler(jreq("POST", "http://x/s"), NO_PARAMS, apiDeps(crm, { fetch: f, perms: ["crm.view", "crm.inbox.view"] }))).status, 403)
  assert.equal(f.calls.length, 0, "no Graph call without permission")
  const ok = await syncTemplatesHandler(jreq("POST", "http://x/s"), NO_PARAMS, apiDeps(crm, { fetch: f }))
  assert.equal(ok.status, 200)
  assert.equal((await ok.json()).fetched, 4)
  const [aud] = await all(crm, COLL.audit, { action: "templates.sync" })
  assert.equal(aud.after.fetched, 4); assert.ok(aud.after.requestId)

  const noWaba = await syncTemplatesHandler(jreq("POST", "http://x/s"), NO_PARAMS, apiDeps(crm, { fetch: f, env: { waPhoneNumberIds: ["1"], waAccessToken: TEST_WA.accessToken, waApiVersion: "v23.0", waWabaId: undefined } }))
  assert.equal(noWaba.status, 503); assert.equal((await noWaba.json()).error, "waba_not_set")

  const bad = graphFetch([{ status: 400, body: { error: { message: "Invalid OAuth access token", type: "OAuthException", code: 190, fbtrace_id: "TRC190" } } }])
  let res
  const cap = await captureConsole(async () => { res = await syncTemplatesHandler(jreq("POST", "http://x/s", undefined, { "x-request-id": "rid-sync-0001" }), NO_PARAMS, apiDeps(crm, { fetch: bad })) })
  assert.equal(res.status, 502)
  const line = cap.lines.map(l => JSON.parse(l)).find(j => j.msg === "template sync failed")
  assert.equal(line.metaCode, 190); assert.equal(line.fbtraceId, "TRC190"); assert.equal(line.requestId, "rid-sync-0001")
  assert.ok(!cap.text.includes(TEST_WA.accessToken))
})
