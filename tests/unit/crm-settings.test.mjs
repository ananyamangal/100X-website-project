// STEP 10 settings: WhatsApp number tier cap / safety margin / resume (allow-listed only, audited),
// session status endpoint, Settings page helpers + nav.
import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { startMemoryMongo } from "./crm/helpers/memory-mongo.mjs"
import { freshCrm, all } from "./crm/helpers/wa-harness.mjs"
import { NOW, PNID, jreq, apiDeps } from "./crm/helpers/outbound-kit.mjs"
import { COLL } from "../../lib/crm/model.ts"
import { updateNumberHandler } from "../../lib/crm/api/numbers.ts"
import { whatsappStatusHandler } from "../../lib/crm/api/whatsapp-status.ts"
import { loadUiFn } from "./crm/helpers/ui-fn.mjs"

let m
before(async () => { m = await startMemoryMongo() })
after(async () => { if (m) await m.stop() })
const need = t => { if (!m.ok) { t.skip(m.skip); return false } return true }
const NO_PARAMS = { params: Promise.resolve({}) }
const ENV = { waPhoneNumberIds: [PNID] }

test("numbers: set daily limit + margin (row auto-created), margin must stay below the cap, resume clears a Meta pause, only allow-listed numbers, audited", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const call = (b, o = {}) => updateNumberHandler(jreq("PATCH", "http://x/n", b), NO_PARAMS, apiDeps(crm, { perms: ["crm.view", "crm.settings.edit"], env: ENV, ...o }))
  const r = await call({ phoneNumberId: PNID, tierCap: 1000, tierCapSafetyMargin: 30 })
  assert.equal(r.status, 200)
  assert.deepEqual((await r.json()).number, { phoneNumberId: PNID, tierCap: 1000, tierCapSafetyMargin: 30, sendingPaused: null })
  assert.equal((await (await call({ phoneNumberId: PNID, tierCapSafetyMargin: 1000 })).json()).fields.tierCapSafetyMargin, "must_be_below_cap")
  await crm.collection(COLL.waNumbers).updateOne({ phoneNumberId: PNID }, { $set: { sendingPaused: { reason: "meta_131048", at: NOW, until: null } } })
  assert.equal((await (await call({ phoneNumberId: PNID, resume: true })).json()).number.sendingPaused, null)
  assert.equal((await (await call({ phoneNumberId: "999" , tierCap: 5 })).json()).fields.phoneNumberId, "not_allow_listed")
  assert.equal((await call({ phoneNumberId: PNID })).status, 400)
  assert.equal((await call({ phoneNumberId: PNID, tierCap: 0 })).status, 400)
  assert.equal((await call({ phoneNumberId: PNID, tierCap: 5 }, { perms: ["crm.view"] })).status, 403)
  const aud = await crm.collection(COLL.audit).find({ action: "settings.number" }).sort({ _id: 1 }).toArray()
  assert.equal(aud.length, 2); assert.equal(aud[1].before.paused, true); assert.equal(aud[1].after.paused, false)
})

test("whatsapp status endpoint: the health report for a signed-in CRM user (no Bearer secret needed); 401 without a session", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const r = await whatsappStatusHandler(jreq("GET", "http://x/s"), NO_PARAMS, apiDeps(crm, { perms: ["crm.view"], env: { waPhoneNumberIds: [PNID], growthSync: true } }))
  assert.equal(r.status, 200)
  const j = await r.json()
  assert.equal(j.numbers[0].phoneNumberId, PNID); assert.equal(typeof j.queueDepth, "number")
  assert.equal((await whatsappStatusHandler(jreq("GET", "http://x/s"), NO_PARAMS, apiDeps(crm, { noUser: true }))).status, 401)
})

test("UI: conversions download URL; Settings enabled in the nav; links to Automation / Reminders / users", () => {
  const f = loadUiFn("components/admin/crm/Settings.tsx", "conversionsUrl")
  assert.equal(f("all", "", ""), "/api/crm/growth/conversions.csv?kind=all")
  assert.equal(f("closed_won", "2026-10-01", "2026-11-01"), "/api/crm/growth/conversions.csv?kind=closed_won&from=2026-10-01&to=2026-11-01")
  const shell = readFileSync("components/admin/crm/CrmShell.tsx", "utf8")
  assert.ok(shell.includes('{ href: "/admin/crm/settings", label: "Settings" }')); assert.ok(!shell.includes("disabled: true"))
  const s = readFileSync("components/admin/crm/Settings.tsx", "utf8")
  for (const href of ["/admin/crm/automation", "/admin/crm/reminders", "/admin/growth/users"]) assert.ok(s.includes(`href="${href}"`), href)
})

test("numbers: before any row exists the default margin (20) still applies — a cap at or below it is rejected", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const call = b => updateNumberHandler(jreq("PATCH", "http://x/n", b), NO_PARAMS, apiDeps(crm, { perms: ["crm.view", "crm.settings.edit"], env: ENV }))
  assert.equal((await (await call({ phoneNumberId: PNID, tierCap: 20 })).json()).fields.tierCapSafetyMargin, "must_be_below_cap")
  assert.equal((await call({ phoneNumberId: PNID, tierCap: 21 })).status, 200)
})
