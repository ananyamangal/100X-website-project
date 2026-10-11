// Run: node --import ./tests/support/register.mjs --test tests/unit/crm-website-routes.test.mjs
// STEP 3c: the public lead routes are unchanged by the CRM ingest hook (status, body, e-mail), a
// failing ingest never leaks into the response, honeypot hits schedule nothing, logs hold no lead data.
// Also: backfill script CLI guards (no DB is ever contacted) and static import guard.
import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import { spawnSync } from "node:child_process"
import { register } from "node:module"

register("../support/route-fakes/hooks.mjs", import.meta.url)
const { state, resetRouteFakes, flushAfter } = await import("../support/route-fakes/state.mjs")
const subs = await import("../../app/api/submissions/route.ts")
const rfq = await import("../../app/api/rfq-submit/route.ts")

const post = (path, body, headers = {}) =>
  new Request(`http://localhost${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) })

const PII = ["Asha Verma", "9876543210", "asha@example.test"]
const LEAD = { type: "contact", name: "Asha Verma", mobile: "9876543210", email: "asha@example.test", message: "hello", attribution: { gclid: "G1", utm_source: "google" } }
const RFQ = { product: "Fogger", quantity: "3", name: "Asha Verma", phone: "9876543210", email: "asha@example.test", organization: "Org", cityState: "Patna", description: "d", dealerInquiry: true }

function withEnv(vars, fn) {
  const saved = {}
  for (const k of Object.keys(vars)) { saved[k] = process.env[k]; if (vars[k] === undefined) delete process.env[k]; else process.env[k] = vars[k] }
  return fn().finally(() => { for (const k of Object.keys(saved)) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k] } })
}

async function run(handler, request, envVars) {
  resetRouteFakes()
  const lines = { log: [], error: [], warn: [] }
  const orig = { log: console.log, error: console.error, warn: console.warn }
  for (const k of Object.keys(orig)) console[k] = (...a) => lines[k].push(a.map(x => (x instanceof Error ? x.message : String(x))).join(" "))
  try {
    return await withEnv(envVars, async () => {
      const res = await handler(request)
      const queued = state.afterQueue.length
      await flushAfter()
      const json = await res.json()
      return { status: res.status, json, emails: state.emails, lines, queued }
    })
  } finally { Object.assign(console, orig) }
}
const strip = j => { const { _id, createdAt, dbId, ...rest } = j; return rest }
// Kill switch on, CRM env unconfigured: the hook logs one skip line and touches no DB.
const NOCRM = { CRM_WEBSITE_INGEST: "on", VERCEL_ENV: undefined, CRM_PROD_DB_NAME: undefined }
// VERCEL_ENV=production makes the ingest proceed to crmDb(), which needs the real Mongo client: no URI -> it throws.
const THROWS = { CRM_WEBSITE_INGEST: "on", VERCEL_ENV: "production", MONGODB_URI: undefined, CRM_PROD_DB_NAME: "prod_db_x" }
// Same environment with the kill switch unset (default OFF): the hook must do nothing at all.
const SWITCH_OFF = { ...THROWS, CRM_WEBSITE_INGEST: undefined }

for (const [name, handler, path, body, schedules] of [
  ["/api/submissions", subs.POST, "/api/submissions", LEAD, 2],
  ["/api/rfq-submit", rfq.POST, "/api/rfq-submit", RFQ, 1],
]) {
  test(`${name}: failing CRM ingest leaves status, body and e-mail identical; log has no lead data`, async () => {
    const base = await run(handler, post(path, body), NOCRM)
    const bad = await run(handler, post(path, body), THROWS)
    assert.ok(base.status === 200 || base.status === 201, String(base.status))
    assert.equal(bad.status, base.status)
    assert.deepEqual(strip(bad.json), strip(base.json))
    assert.equal(bad.emails.length, 1); assert.equal(base.emails.length, 1)
    assert.equal(bad.emails[0].subject, base.emails[0].subject)
    assert.equal(bad.emails[0].replyTo, base.emails[0].replyTo)
    assert.ok(bad.queued >= 1, "ingest scheduled via after()")
    const all = [...bad.lines.log, ...bad.lines.error, ...bad.lines.warn].join("\n")
    for (const p of PII) assert.ok(!all.includes(p), `log leaks ${p}`)
    assert.match(all, /crm website ingest failed/, "ingest was attempted and failed safely")
    const ok = [...base.lines.log, ...base.lines.error].join("\n")
    for (const p of PII) assert.ok(!ok.includes(p), `skip log leaks ${p}`)
    void schedules
  })

  test(`${name}: CRM_WEBSITE_INGEST unset (default off) -> no ingest attempted, no CRM log, response unchanged`, async () => {
    const base = await run(handler, post(path, body), NOCRM)
    for (const off of [SWITCH_OFF, { ...THROWS, CRM_WEBSITE_INGEST: "off" }, { ...THROWS, CRM_WEBSITE_INGEST: "yes" }]) {
      const r = await run(handler, post(path, body), off)
      assert.equal(r.status, base.status)
      assert.deepEqual(strip(r.json), strip(base.json))
      assert.equal(r.emails.length, 1)
      const all = [...r.lines.log, ...r.lines.error, ...r.lines.warn].join("\n")
      assert.ok(!all.includes("crm website ingest"), `no ingest when CRM_WEBSITE_INGEST=${off.CRM_WEBSITE_INGEST}`)
    }
  })

  test(`${name}: honeypot-tripped request schedules no CRM ingest, no e-mail`, async () => {
    const r = await run(handler, post(path, { ...body, website: "http://spam.example" }), THROWS)
    assert.equal(r.queued, 0); assert.equal(r.emails.length, 0)
    assert.ok(![...r.lines.log, ...r.lines.error].join("\n").includes("crm website ingest"))
  })
}

test("/api/rfq-submit: validation 400 schedules no ingest", async () => {
  const r = await run(rfq.POST, post("/api/rfq-submit", { product: "x", name: "", phone: "" }), THROWS)
  assert.equal(r.status, 400); assert.equal(r.queued, 0)
})

// ───────────── backfill script CLI guards ─────────────
const SCRIPT = "scripts/crm/backfill-website-leads.mjs"
const runScript = (args, env = {}) => {
  const clean = { ...process.env }
  for (const k of Object.keys(clean)) if (/^(MONGODB|CRM_|VERCEL)/.test(k)) delete clean[k]
  return spawnSync(process.execPath, ["--import", "./tests/support/register.mjs", SCRIPT, ...args], {
    cwd: new URL("../../", import.meta.url), env: { ...clean, ...env }, encoding: "utf8", timeout: 60000,
  })
}
const BASE = { CRM_PROD_DB_NAME: "prod_db_x", MONGODB_URI: "mongodb://127.0.0.1:1/x" }

test("backfill: refuses prod DB name, missing --db, missing prod guard", () => {
  let r = runScript(["--db", "prod_db_x"], BASE)
  assert.equal(r.status, 2); assert.match(r.stderr, /production DB/)
  r = runScript(["--db", "prod_db_x", "--allow-prod"], BASE)
  assert.equal(r.status, 2, "--allow-prod alone is not enough")
  r = runScript([], BASE); assert.equal(r.status, 2); assert.match(r.stderr, /no target CRM DB/)
  r = runScript(["--db", "stg"], { MONGODB_URI: BASE.MONGODB_URI }); assert.equal(r.status, 2); assert.match(r.stderr, /CRM_PROD_DB_NAME/)
  r = runScript(["--db", "stg"], { CRM_PROD_DB_NAME: "prod_db_x" }); assert.equal(r.status, 2); assert.match(r.stderr, /MONGODB_URI/)
  assert.ok(!(r.stdout + r.stderr).includes("127.0.0.1"))
})

test("backfill: rejects bad --since / --limit before any connection", () => {
  for (const [args, re] of [
    [["--since", "not-a-date"], /--since/], [["--since", ""], /--since/],
    [["--limit", "0"], /--limit/], [["--limit", "abc"], /--limit/], [["--limit", "10001"], /--limit/], [["--limit", "1.5"], /--limit/], [["--limit", "-1"], /--limit/],
  ]) {
    const r = runScript(["--db", "stg", ...args], BASE)
    assert.equal(r.status, 2, args.join(" ")); assert.match(r.stderr, re, args.join(" "))
  }
})

test("backfill: dry run is the default and the source only calls write APIs behind --apply", () => {
  const src = fs.readFileSync(new URL(`../../${SCRIPT}`, import.meta.url), "utf8")
  assert.match(src, /const apply = has\("--apply"\)/)
  const i = src.indexOf("if (!apply) {"); const j = src.indexOf("captureWebsiteSubmission(crm, row, env)")
  assert.ok(i > 0 && j > i, "capture call comes after the dry-run branch that `continue`s")
  assert.ok(/continue\s*\n\s*\}/.test(src.slice(i, j)))
  // Never loads .env files: no dotenv / Next env loader, no file read of a .env path.
  const code = src.split("\n").filter(l => !/^\s*\/\//.test(l)).join("\n")
  assert.ok(!/\bdotenv\b|loadEnvConfig|@next\/env/.test(code), "no env-file loader")
  assert.ok(!/readFileSync\([^)]*\.env/.test(code), "no .env file read")
  assert.ok(!/["'`][^"'`\n]*\.env(\.[a-z]+)?["'`]/.test(code), "no .env path literal")
})

// ───────────── static ─────────────
test("website.ts / conversions.ts never import lib/growth-os; ingest hook is never awaited in the response path", () => {
  for (const f of ["lib/crm/website.ts", "lib/crm/conversions.ts"]) {
    const src = fs.readFileSync(new URL(`../../${f}`, import.meta.url), "utf8")
    assert.ok(!/from\s+["'][^"']*growth-os/.test(src), f)
    assert.ok(!/import\(["'][^"']*growth-os/.test(src), f)
  }
  for (const f of ["app/api/submissions/route.ts", "app/api/rfq-submit/route.ts"]) {
    const src = fs.readFileSync(new URL(`../../${f}`, import.meta.url), "utf8")
    assert.ok(/after\(\(\) => ingestWebsiteSubmissionSafely\(/.test(src), f)
    assert.ok(!/await ingestWebsiteSubmissionSafely/.test(src), f)
  }
})
