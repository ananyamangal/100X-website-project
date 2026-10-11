#!/usr/bin/env node
// Replays stored website submissions into the CRM through the SAME function the live route uses
// (captureWebsiteSubmission, lib/crm/website.ts). Idempotent: the crm_attribution claim
// (u_submission) makes already-ingested submissions "duplicate".
//
// Usage (from the repo root; never loads .env files, the URI comes from the shell env only):
//   MONGODB_URI=... CRM_PROD_DB_NAME=<prod db> \
//   node --import ./tests/support/register.mjs scripts/crm/backfill-website-leads.mjs \
//     --db 100x_crm_staging [--since 2026-10-01T00:00:00Z] [--limit 200] [--source-db <name>] [--apply]
//
// Safety:
// - DRY RUN BY DEFAULT: reads submissions, maps each one and reports what would happen
//   (would_capture / already_ingested / skip:no_phone / skip:invalid_phone). Nothing is written
//   without --apply.
// - The CRM target DB must be explicit: --db <name> or CRM_MONGODB_DB. There is no default.
// - CRM_PROD_DB_NAME must be set; the CRM guard (assertCrmDbAllowed) refuses the prod DB outside
//   VERCEL_ENV=production unless CRM_ALLOW_PROD_DB=1, and this script additionally requires
//   --allow-prod for it.
// - Submissions are read (read-only) from --source-db, or the DB named in MONGODB_URI.
// - CRM_GROWTH_OS_SYNC applies exactly as in the live route.
// - Output contains submission ids and outcomes only, never lead data. The URI is never printed.
import { MongoClient } from "mongodb"
import { crmDbFrom, assertCrmDbAllowed } from "../../lib/crm/db.ts"
import { readCrmEnv } from "../../lib/crm/env.ts"
import { DEFAULT_WORKSPACE, COLL } from "../../lib/crm/model.ts"
import { captureWebsiteSubmission, mapWebsiteSubmission, submissionIdOf } from "../../lib/crm/website.ts"

function arg(name) {
  const i = process.argv.indexOf(name)
  return i === -1 ? undefined : process.argv[i + 1]?.trim() || ""
}
const has = name => process.argv.includes(name)
const fail = msg => {
  console.error(`backfill-website-leads: ${msg}`)
  process.exit(2)
}

const env = readCrmEnv()
const apply = has("--apply")

const dbArg = arg("--db")
if (dbArg === "") fail("--db needs a value")
const dbName = dbArg ?? env.mongoDb
if (!dbName) fail("no target CRM DB: pass --db <name> (or set CRM_MONGODB_DB). There is no default.")
if (!env.prodDbName) fail("CRM_PROD_DB_NAME is not set; refusing to run without the prod guard")
if (dbName === env.prodDbName && !(has("--allow-prod") && env.allowProdDb)) {
  fail(`"${dbName}" is the production DB; this needs both --allow-prod and CRM_ALLOW_PROD_DB=1`)
}
try {
  assertCrmDbAllowed(dbName)
} catch (e) {
  fail(e?.message ?? String(e))
}

const sinceArg = arg("--since")
if (sinceArg === "") fail("--since needs an ISO date")
let since
if (sinceArg !== undefined) {
  since = new Date(sinceArg)
  if (Number.isNaN(since.getTime())) fail(`--since is not a valid ISO date: ${JSON.stringify(sinceArg)}`)
}
const limitArg = arg("--limit")
if (limitArg === "") fail("--limit needs a number")
const limit = limitArg === undefined ? 500 : Number(limitArg)
if (!Number.isInteger(limit) || limit < 1 || limit > 10000) fail("--limit must be an integer 1..10000")
const sourceDbArg = arg("--source-db")
if (sourceDbArg === "") fail("--source-db needs a value")

const uri = process.env.MONGODB_URI?.trim()
if (!uri) fail("MONGODB_URI is not set in the shell environment (.env files are not loaded)")

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 })
let code = 0
const counts = {}
const bump = k => { counts[k] = (counts[k] ?? 0) + 1 }
try {
  await client.connect()
  const source = client.db(sourceDbArg || undefined).collection("submissions")
  const crm = crmDbFrom(client.db(dbName), DEFAULT_WORKSPACE, { client })

  // createdAt is an ISO string on rows written by the routes; older rows may hold a Date.
  const filter = since ? { $or: [{ createdAt: { $gte: since.toISOString() } }, { createdAt: { $gte: since } }] } : {}
  const rows = await source.find(filter, { sort: { _id: 1 }, limit }).toArray()
  console.log(`backfill-website-leads ${apply ? "APPLY" : "dry run"} crmDb=${dbName} growthSync=${env.growthSync} rows=${rows.length}${since ? ` since=${since.toISOString()}` : ""}`)

  for (const row of rows) {
    const id = submissionIdOf(row) ?? "(no id)"
    try {
      if (!apply) {
        const claimed = submissionIdOf(row)
          ? await crm.collection(COLL.attribution).findOne({ submissionId: submissionIdOf(row) }, { projection: { completedAt: 1 } })
          : null
        const mapped = mapWebsiteSubmission(row)
        const outcome = !submissionIdOf(row)
          ? "invalid:no_submission_id"
          : claimed
            ? (claimed.completedAt ? "already_ingested" : "claim_in_progress")
            : mapped.ok ? "would_capture" : `skip:${mapped.reason}`
        bump(outcome)
        console.log(`  ${id} ${outcome}`)
        continue
      }
      const r = await captureWebsiteSubmission(crm, row, env)
      const outcome = r.status === "captured" ? `captured:${r.dealOutcome}` : "reason" in r ? `${r.status}:${r.reason}` : r.status
      bump(outcome)
      console.log(`  ${id} ${outcome}`)
    } catch (err) {
      bump("error")
      code = 1
      // Class/code only: driver messages can echo document values.
      console.error(`  ${id} error ${err?.name ?? "Error"}${err?.code !== undefined ? ` code=${err.code}` : ""}`)
    }
  }
  console.log(`summary ${JSON.stringify(counts)}`)
} catch (err) {
  console.error(`backfill-website-leads failed: ${err?.name ?? "Error"}${err?.code !== undefined ? ` code=${err.code}` : ""}`)
  code = 2
} finally {
  await client.close()
}
process.exit(code)
