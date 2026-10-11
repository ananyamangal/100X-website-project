// Run: node --import ./tests/support/register.mjs --test tests/unit/crm-reports.test.mjs
// Independent tests (STEP 4c): GET /api/crm/reports + parseReportParams + presetRange (UI helper).
import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { ObjectId } from "mongodb"
import { startMemoryMongo } from "./crm/helpers/memory-mongo.mjs"
import { freshCrm } from "./crm/helpers/wa-harness.mjs"
import { loadUiFn } from "./crm/helpers/ui-fn.mjs"
import { COLL, LEAD_SOURCES } from "../../lib/crm/model.ts"
import { ROLE_PERMISSIONS } from "../../lib/rbac/roles.ts"
import { reportsHandler } from "../../lib/crm/api/reports.ts"
import { buildReport, parseReportParams } from "../../lib/crm/leads/reports.ts"

let m
before(async () => { m = await startMemoryMongo() })
after(async () => { if (m) await m.stop() })
const need = t => { if (!m.ok) { t.skip(m.skip); return false } return true }

const hex = () => new ObjectId().toHexString()
const NOW = new Date("2026-04-20T06:00:00Z")
const OWNER = ROLE_PERMISSIONS.super_admin
const NOP = { params: Promise.resolve({}) }
const D = 86_400_000
const ME = hex(), OTHER = hex()

const mkDeps = (crm, perms, user = { sub: ME, name: "Rep", role: "sales_manager" }) => ({
  getDb: async () => crm,
  auth: { getUser: async () => user, resolvePermissions: async () => perms },
  now: () => NOW,
})
const get = async (deps, qs = "") => { const r = await reportsHandler(new Request("http://x/api/crm/reports" + qs), NOP, deps); return { status: r.status, body: await r.json(), res: r } }

async function deal(crm, o) {
  const created = new Date(o.created)
  const stage = o.stage ?? "new"
  const closed = stage === "closed_won" || stage === "closed_lost"
  await crm.collection(COLL.deals).insertOne({
    contactId: new ObjectId(), stage, isOpen: !closed, leadSource: o.source ?? "call", customerType: o.type === undefined ? "dealer" : o.type,
    assignedTo: o.to ? { userId: o.to, name: "x" } : null,
    createdAt: created, updatedAt: created, stageEnteredAt: created, stageHistory: [],
    closedAt: closed ? new Date(o.closedAt ?? created.getTime() + 3 * D) : null,
    won: stage === "closed_won" ? { invoiceNumber: "INV-1", invoiceAmountText: null, orderValue: 100000, wonAt: created } : null,
    lost: stage === "closed_lost" ? { reason: o.reason, text: "SECRET-LOST-TEXT", lostAt: created } : null,
    // junk that must never reach the report
    gclid: "G-LEAK", utm: { source: "google" }, attribution: { gclid: "G-LEAK" },
  })
}

async function fixture(crm) {
  const t = s => new Date(s).getTime()
  const c1 = t("2026-03-31T18:00:00Z") // Tue 31 Mar 23:30 IST  (March, W14)
  const c2 = t("2026-03-31T19:00:00Z") // Wed  1 Apr 00:30 IST  (April, W14)
  const c3 = t("2026-04-05T18:00:00Z") // Sun  5 Apr 23:30 IST  (W14; UTC would also say Sun)
  const c4 = t("2026-04-05T19:00:00Z") // Mon  6 Apr 00:30 IST  (W15; UTC says Sun = W14)
  const c5 = t("2026-04-10T05:00:00Z")
  await deal(crm, { created: c1, source: "call", type: "dealer", stage: "closed_won", closedAt: c1 + 5 * D, to: ME })
  await deal(crm, { created: c2, source: "call", type: "dealer" })
  await deal(crm, { created: c3, source: "website", type: "dealer", stage: "closed_won", closedAt: c3 + 2 * D, to: ME })
  await deal(crm, { created: c4, source: "website", type: "gem_supplier", stage: "closed_lost", reason: "price_too_high", to: OTHER })
  await deal(crm, { created: c5, source: "whatsapp", type: null, stage: "closed_lost", reason: "no_budget", to: ME })
  await deal(crm, { created: c5 + 1000, source: "whatsapp", type: null, stage: "closed_lost", reason: "no_budget", to: OTHER })
  await deal(crm, { created: c5 + 2000, source: "gem", type: "govt_dept", stage: "closed_lost", reason: "other", to: OTHER })
  await deal(crm, { created: c5 + 3000, source: "gem", type: "govt_dept", stage: "closed_lost", reason: "weird_legacy", to: OTHER })
  // outside the cohort window used below (2026-03-01..2026-04-30)
  await deal(crm, { created: t("2026-02-28T18:29:00Z"), source: "referral", type: "b2c" }) // 23:59 IST Feb 28
  await deal(crm, { created: t("2026-04-30T18:30:00Z"), source: "referral", type: "b2c" }) // 00:00 IST May 1
}
const RANGE = "?from=2026-03-01&to=2026-04-30"

test("reports: totals, bySource, byCustomerType, lost reasons, avg days", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m); await fixture(crm)
  const { status, body } = await get(mkDeps(crm, OWNER), RANGE + "&granularity=month")
  assert.equal(status, 200)
  assert.deepEqual(body.range, { from: "2026-03-01", to: "2026-04-30", granularity: "month" })
  assert.deepEqual(body.totals, { created: 8, won: 2, lost: 5, open: 1, conversionRate: 0.25, avgDaysToWon: 3.5 })
  const src = Object.fromEntries(body.bySource.map(r => [r.source, r]))
  assert.deepEqual(src.call, { source: "call", created: 2, won: 1, conversionRate: 0.5, avgDaysToWon: 5 })
  assert.deepEqual(src.website, { source: "website", created: 2, won: 1, conversionRate: 0.5, avgDaysToWon: 2 })
  assert.deepEqual(src.whatsapp, { source: "whatsapp", created: 2, won: 0, conversionRate: 0, avgDaysToWon: null })
  assert.deepEqual(src.gem, { source: "gem", created: 2, won: 0, conversionRate: 0, avgDaysToWon: null })
  assert.equal(src.referral, undefined, "out-of-window deals excluded")
  assert.deepEqual(body.bySource.map(r => r.source), ["call", "gem", "website", "whatsapp"], "created desc then source asc")
  const typ = Object.fromEntries(body.byCustomerType.map(r => [r.customerType, r]))
  assert.deepEqual(typ.dealer, { customerType: "dealer", created: 3, won: 2, conversionRate: 0.667, avgDaysToWon: 3.5 })
  assert.equal(typ.unknown.created, 2, "null customerType grouped as unknown"); assert.equal(typ.gem_supplier.created, 1); assert.equal(typ.govt_dept.created, 2)
  assert.deepEqual(body.lostReasons, [
    { reason: "no_budget", count: 2 }, { reason: "other", count: 1 }, { reason: "price_too_high", count: 1 }, { reason: "unknown", count: 1 },
  ])
})

test("reports: IST month and ISO-week boundaries (23:30 vs 00:30 IST)", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m); await fixture(crm)
  const mo = (await get(mkDeps(crm, OWNER), RANGE + "&granularity=month")).body
  assert.deepEqual(mo.periods.map(p => [p.period, p.total]), [["2026-03", 1], ["2026-04", 7]])
  assert.equal(mo.periods[0].bySource.call, 1); assert.equal(mo.periods[1].bySource.call, 1)
  for (const p of mo.periods) for (const s of LEAD_SOURCES) assert.equal(typeof p.bySource[s], "number", s)
  const wk = (await get(mkDeps(crm, OWNER), RANGE + "&granularity=week")).body
  const byP = Object.fromEntries(wk.periods.map(p => [p.period, p]))
  assert.deepEqual(Object.keys(byP), ["2026-W14", "2026-W15"])
  assert.equal(byP["2026-W14"].total, 3, "Mar 31 23:30, Apr 1 00:30, Apr 5 23:30 IST all in W14")
  assert.equal(byP["2026-W15"].total, 5, "Apr 6 00:30 IST is Monday W15 (UTC would still be Sunday)")
  assert.equal(byP["2026-W14"].bySource.website, 1); assert.equal(byP["2026-W15"].bySource.website, 1)
  assert.deepEqual(wk.periods.map(p => p.period), [...wk.periods.map(p => p.period)].sort(), "sorted ascending")
  // default granularity is week
  assert.equal((await get(mkDeps(crm, OWNER), RANGE)).body.range.granularity, "week")
})

test("reports: from/to edges are IST calendar days, to inclusive", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m); await fixture(crm)
  const d = mkDeps(crm, OWNER)
  assert.equal((await get(d, "?from=2026-04-01&to=2026-04-01")).body.totals.created, 1, "only Apr 1 00:30 IST")
  assert.equal((await get(d, "?from=2026-03-31&to=2026-03-31")).body.totals.created, 1, "only Mar 31 23:30 IST")
  assert.equal((await get(d, "?from=2026-03-01&to=2026-03-31")).body.totals.created, 1)
  assert.equal((await get(d, "?from=2026-02-28&to=2026-02-28")).body.totals.created, 1, "Feb 28 23:59 IST")
  assert.equal((await get(d, "?from=2026-05-01&to=2026-05-01")).body.totals.created, 1, "May 1 00:00 IST")
  const empty = (await get(d, "?from=2025-01-01&to=2025-01-31")).body
  assert.deepEqual(empty.totals, { created: 0, won: 0, lost: 0, open: 0, conversionRate: 0, avgDaysToWon: null })
  assert.deepEqual([empty.periods, empty.bySource, empty.byCustomerType, empty.lostReasons], [[], [], [], []])
  // defaults come from deps.now: last 30 days to today (IST)
  const def = (await get(d, "")).body
  assert.deepEqual([def.range.from, def.range.to], ["2026-03-22", "2026-04-20"])
})

test("reports: date / granularity validation -> 400 validation + fields", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m); const d = mkDeps(crm, OWNER)
  const f = async qs => { const r = await get(d, qs); assert.equal(r.status, 400, qs); assert.equal(r.body.error, "validation"); return r.body.fields }
  assert.equal((await f("?from=2026-4-1&to=2026-04-30")).from, "invalid_date")
  assert.equal((await f("?from=01-04-2026&to=2026-04-30")).from, "invalid_date")
  assert.equal((await f("?from=2026-04-01&to=notadate")).to, "invalid_date")
  assert.equal((await f("?from=2026-04-01&to=2026-04-01T00:00:00Z")).to, "invalid_date")
  assert.equal((await f("?from=2026-13-01&to=2026-14-01")).from, "invalid_date")
  // FINDING: impossible calendar dates (Feb 30) are accepted and roll over (Date parsing), not rejected
  { const r = await get(d, "?from=2026-02-30&to=2026-03-05"); console.log("FINDING-ROLLOVER 2026-02-30 -> status " + r.status); assert.ok([200, 400].includes(r.status)) }
  assert.equal((await f("?from=2019-12-31&to=2020-01-31")).from, "invalid_date")
  assert.equal((await f("?from=2026-04-30&to=2026-04-01")).to, "before_from")
  assert.equal((await f("?from=2024-01-01&to=2026-01-02")).to, "range_too_long")
  assert.equal((await f("?from=2026-04-01&to=2026-04-30&granularity=day")).granularity, "invalid_enum")
  assert.equal((await f("?from=2026-04-01&to=2026-04-30&granularity=__proto__")).granularity, "invalid_enum")
  assert.equal((await get(d, "?from=2024-01-01&to=2026-01-01")).status, 200, "exactly 732 days allowed")
  assert.equal((await get(d, "?from=2026-04-01&to=2026-04-01")).status, 200, "single day allowed")
  // pure parser
  const bad = parseReportParams(new URLSearchParams("from=x"), NOW); assert.equal(bad.ok, false)
})

test("reports: view_assigned user sees only own deals; no scope -> 403", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m); await fixture(crm)
  const base = ["crm.view", "crm.reports.view"]
  const mine = (await get(mkDeps(crm, [...base, "crm.leads.view_assigned"]), RANGE + "&granularity=month")).body
  // ME owns: deal1 (won), deal3 (won), deal5 (lost no_budget)
  assert.deepEqual(mine.totals, { created: 3, won: 2, lost: 1, open: 0, conversionRate: 0.667, avgDaysToWon: 3.5 })
  assert.deepEqual(mine.lostReasons, [{ reason: "no_budget", count: 1 }])
  assert.deepEqual(mine.bySource.map(r => r.source).sort(), ["call", "website", "whatsapp"])
  const all = (await get(mkDeps(crm, [...base, "crm.leads.view_all"]), RANGE)).body
  assert.equal(all.totals.created, 8)
  const none = await get(mkDeps(crm, base), RANGE)
  assert.equal(none.status, 403); assert.ok(none.body.required[0].includes("view_all"))
  // view_assigned for a user with nothing assigned -> empty, not everything
  const nobody = (await get(mkDeps(crm, [...base, "crm.leads.view_assigned"], { sub: hex(), name: "N", role: "sales_executive" }), RANGE)).body
  assert.equal(nobody.totals.created, 0)
})

test("reports: response never carries attribution / click ids / utm / contact data / lost free text", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m); await fixture(crm)
  const cid = new ObjectId()
  await crm.collection(COLL.attribution).insertOne({ _id: "sub-1", dealId: null, contactId: cid, gclid: "G-LEAK2", utm: { source: "x" } })
  for (const url of [RANGE + "&granularity=month", RANGE + "&granularity=week"]) {
    const { body, res } = await get(mkDeps(crm, OWNER), url)
    const keys = []
    const walk = v => { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { keys.push(k); walk(x) } }
    walk(body)
    assert.deepEqual(keys.filter(k => /attribution|gclid|gbraid|wbraid|utm|landing|phone|name|company|mobile|note|text|invoice/i.test(k)), [])
    const dump = JSON.stringify(body)
    for (const leak of ["G-LEAK", "SECRET-LOST-TEXT", "INV-1"]) assert.ok(!dump.includes(leak), leak)
    assert.equal(res.headers.get("cache-control"), "no-store")
    assert.ok(res.headers.get("x-request-id"))
  }
})

test("reports: auth - 401 unauthenticated, 403 without crm.reports.view or crm.view", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  let r = await get({ ...mkDeps(crm, OWNER), auth: { getUser: async () => null, resolvePermissions: async () => OWNER } }, RANGE)
  assert.equal(r.status, 401)
  r = await get(mkDeps(crm, ["crm.view", "crm.leads.view_all"]), RANGE)
  assert.equal(r.status, 403); assert.ok(r.body.required.includes("crm.reports.view"))
  r = await get(mkDeps(crm, ["crm.reports.view", "crm.leads.view_all"]), RANGE)
  assert.equal(r.status, 403); assert.ok(r.body.required.includes("crm.view"))
  r = await get({ ...mkDeps(crm, OWNER), auth: { getUser: async () => ({ sub: ME, role: "x" }), resolvePermissions: async () => { throw new Error("db down") } } }, RANGE)
  assert.equal(r.status, 503)
  // sales role fallback sets can read reports
  for (const role of ["sales_manager", "sales_executive"]) assert.equal((await get(mkDeps(crm, ROLE_PERMISSIONS[role]), RANGE)).status, 200, role)
})

// ───────────── UI helper presetRange ─────────────
test("UI presetRange: last quarter across year boundary, month, 30d (IST day)", () => {
  const f = loadUiFn("components/admin/crm/Reports.tsx", "presetRange", ["const istDate = "])
  assert.deepEqual(f("quarter", new Date("2026-02-10T00:00:00Z")), { from: "2025-10-01", to: "2025-12-31" }, "Q1 -> previous year's Q4")
  assert.deepEqual(f("quarter", new Date("2026-01-01T00:00:00Z")), { from: "2025-10-01", to: "2025-12-31" })
  assert.deepEqual(f("quarter", new Date("2026-04-01T00:00:00Z")), { from: "2026-01-01", to: "2026-03-31" })
  assert.deepEqual(f("quarter", new Date("2026-06-30T23:00:00Z")), { from: "2026-04-01", to: "2026-06-30" }, "Jun 30 23:00Z is Jul 1 IST: Q3 -> last quarter is Q2")
  assert.deepEqual(f("quarter", new Date("2026-10-10T00:00:00Z")), { from: "2026-07-01", to: "2026-09-30" })
  assert.deepEqual(f("quarter", new Date("2026-03-31T19:00:00Z")), { from: "2026-01-01", to: "2026-03-31" }, "Apr 1 00:30 IST -> Q2 so last = Q1")
  assert.deepEqual(f("month", new Date("2026-03-31T19:00:00Z")), { from: "2026-04-01", to: "2026-04-01" })
  assert.deepEqual(f("30d", new Date("2026-01-05T00:00:00Z")), { from: "2025-12-07", to: "2026-01-05" })
  // every preset output passes the server parser
  for (const p of ["month", "30d", "quarter"]) for (const iso of ["2026-01-01T00:00:00Z", "2026-03-31T19:00:00Z", "2026-12-31T20:00:00Z"]) {
    const r = f(p, new Date(iso)); const q = parseReportParams(new URLSearchParams(r), new Date(iso))
    assert.ok(q.ok, p + iso)
  }
})

test("reports: impossible dates rejected (round trip)", () => {
  for (const [from, to] of [["2026-02-30", "2026-03-10"], ["2026-04-01", "2026-04-31"], ["2026-13-01", "2026-04-02"]]) {
    const r = parseReportParams(new URLSearchParams({ from, to }), NOW)
    assert.equal(r.ok, false, from + ".." + to)
  }
  assert.equal(parseReportParams(new URLSearchParams({ from: "2028-02-29", to: "2028-03-01" }), NOW).ok, true)
})

test("reports: view_assigned also counts deals whose CONTACT is assigned (matches dealVisible)", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  const cid = new ObjectId()
  await crm.collection(COLL.contacts).insertOne({ _id: cid, phoneE164: "+919800000001", assignedTo: { userId: ME, name: "Rep" }, createdAt: NOW, updatedAt: NOW })
  const created = new Date(NOW.getTime() - 2 * D)
  await crm.collection(COLL.deals).insertOne({ contactId: cid, stage: "new", isOpen: true, leadSource: "call", customerType: "dealer", assignedTo: { userId: OTHER, name: "o" }, createdAt: created, updatedAt: created, stageEnteredAt: created, stageHistory: [] })
  const r = (await get(mkDeps(crm, [...OWNER.filter(p => p !== "crm.leads.view_all"), "crm.leads.view_assigned"]), "?from=2026-04-01&to=2026-04-20")).body
  assert.equal(r.totals.created, 1)
})

test("reports: truncated flag when the assigned-contact cap is hit (and absent otherwise)", async t => {
  if (!need(t)) return
  const crm = await freshCrm(m)
  for (const ph of ["+919800000011", "+919800000012"]) await crm.collection(COLL.contacts).insertOne({ phoneE164: ph, assignedTo: { userId: ME, name: "Rep" }, createdAt: NOW, updatedAt: NOW })
  const p = parseReportParams(new URLSearchParams({ from: "2026-04-01", to: "2026-04-20" }), NOW).params
  const scope = { kind: "assigned", userId: ME }
  const orig = console.error; const logs = []; console.error = (...a) => logs.push(a.join(" "))
  let cut; try { cut = await buildReport(crm, scope, p, { contactCap: 1 }) } finally { console.error = orig }
  assert.equal(cut.truncated, true); assert.equal(logs.length, 1); assert.ok(!logs[0].includes("+9198"))
  assert.equal((await buildReport(crm, scope, p, { contactCap: 2 })).truncated, undefined)
  assert.equal((await buildReport(crm, { kind: "all" }, p)).truncated, undefined)
})
