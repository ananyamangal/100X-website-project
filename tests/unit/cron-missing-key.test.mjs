// Run: node --import ./tests/support/register.mjs --test tests/unit/cron-missing-key.test.mjs
// Pins the "missing key, silent skip" cron guard: with GOOGLE_ADS_DEVELOPER_TOKEN unset the
// Revenue Director and Google Ads Director crons answer 200, log one line naming the variable
// and never load the job (so no database, API or e-mail work). With the key set they run
// the job exactly as before. No database is touched: MONGODB_URI stays unset, so loading the
// job fails at import (lib/mongodb cannot load without a bundler/URI), which is how the
// "key present" case proves the job was reached.
import test from "node:test"
import assert from "node:assert/strict"
import { missingCronEnv } from "../../lib/cron/require-env.ts"

const SECRET = "c".repeat(64)
const KEY = "GOOGLE_ADS_DEVELOPER_TOKEN"
const ROUTES = {
  "revenue-director": "../../app/api/admin/growth/cron/revenue-director/route.ts",
  "google-ads-director": "../../app/api/admin/growth/cron/google-ads-director/route.ts",
}

const cronRequest = (secret = SECRET) =>
  new Request("http://localhost/api/admin/growth/cron/x", { headers: { authorization: `Bearer ${secret}` } })

function captureConsole() {
  const lines = []
  const orig = { log: console.log, error: console.error, warn: console.warn }
  for (const k of Object.keys(orig)) console[k] = (...a) => lines.push(a.map(String).join(" "))
  return { lines, restore: () => Object.assign(console, orig) }
}

function withEnv(vars, fn) {
  const saved = {}
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k]
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  return Promise.resolve(fn()).finally(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  })
}

test("missingCronEnv returns the first missing name and logs only that name", () => {
  const c = captureConsole()
  try {
    assert.equal(missingCronEnv("job", ["A", "B"], { A: "set", B: "  " }), "B")
    assert.equal(missingCronEnv("job", ["A"], { A: "secret-value" }), null)
  } finally { c.restore() }
  assert.deepEqual(c.lines, ["[cron:job] skipped: B is not set"])
})

for (const [job, path] of Object.entries(ROUTES)) {
  test(`${job}: key missing -> 200 skip, one log line, job never loaded`, async () => {
    await withEnv({ CRON_SECRET: SECRET, [KEY]: undefined, MONGODB_URI: undefined }, async () => {
      const { GET } = await import(path)
      const c = captureConsole()
      let res
      try { res = await GET(cronRequest()) } finally { c.restore() }
      assert.equal(res.status, 200)
      assert.deepEqual(await res.json(), { ok: true, skipped: "missing_env", missing: KEY })
      assert.deepEqual(c.lines, [`[cron:${job}] skipped: ${KEY} is not set`])
    })
  })

  test(`${job}: wrong secret is still 401 before the guard`, async () => {
    await withEnv({ CRON_SECRET: SECRET, [KEY]: undefined }, async () => {
      const { GET } = await import(path)
      const res = await GET(cronRequest("d".repeat(64)))
      assert.equal(res.status, 401)
    })
  })

  test(`${job}: key present -> the job itself is loaded and run (unchanged path)`, async () => {
    await withEnv({ CRON_SECRET: SECRET, [KEY]: "test-token-not-real", MONGODB_URI: undefined }, async () => {
      const { GET } = await import(path)
      const c = captureConsole()
      let res
      try { res = await GET(cronRequest()) } finally { c.restore() }
      // Reaching the job means importing it and its Mongo client, which cannot load here — so the
      // handler's own 500 path proves the guard let the run through.
      assert.equal(res.status, 500)
      const body = await res.json()
      assert.equal(body.ok, false)
      assert.match(body.error, /mongo/i)
      assert.ok(!c.lines.some((l) => l.includes("skipped")), "no skip line when the key is set")
    })
  })
}
