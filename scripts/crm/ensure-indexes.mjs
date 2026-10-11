#!/usr/bin/env node
// Applies INDEX_SPECS (lib/crm/model.ts) through the CRM wrapper's ensureIndexes(). Idempotent:
// existing identical indexes are left alone; conflicting ones are REPORTED, never dropped.
//
// Usage (from the repo root; never loads .env files, the URI comes from the shell env only):
//   MONGODB_URI=... CRM_PROD_DB_NAME=<prod db> \
//   node --import ./tests/support/register.mjs scripts/crm/ensure-indexes.mjs --db 100x_crm_staging [--dry-run]
//
// Safety:
// - The target DB must be explicit: --db <name> or CRM_MONGODB_DB. There is no default.
// - CRM_PROD_DB_NAME must be set so the prod guard can compare; targeting it additionally needs
//   BOTH --allow-prod and CRM_ALLOW_PROD_DB=1.
// - --dry-run lists what would be created without connecting.
// - The URI is never printed.
import { MongoClient } from "mongodb"
import { crmDbFrom } from "../../lib/crm/db.ts"
import { readCrmEnv } from "../../lib/crm/env.ts"
import { DEFAULT_WORKSPACE, INDEX_SPECS } from "../../lib/crm/model.ts"
import { validateIndexSpecs } from "../../lib/crm/indexes.ts"

function arg(name) {
  const i = process.argv.indexOf(name)
  return i === -1 ? undefined : process.argv[i + 1]?.trim() || ""
}
const has = name => process.argv.includes(name)
const fail = msg => {
  console.error(`ensure-indexes: ${msg}`)
  process.exit(2)
}

const env = readCrmEnv()
const dbArg = arg("--db")
if (dbArg === "") fail("--db needs a value")
const dbName = dbArg ?? env.mongoDb
if (!dbName) fail("no target DB: pass --db <name> (or set CRM_MONGODB_DB). There is no default.")
if (!env.prodDbName) fail("CRM_PROD_DB_NAME is not set; refusing to run without the prod guard")
if (dbName === env.prodDbName && !(has("--allow-prod") && env.allowProdDb)) {
  fail(`"${dbName}" is the production DB; this needs both --allow-prod and CRM_ALLOW_PROD_DB=1`)
}

validateIndexSpecs(INDEX_SPECS)

if (has("--dry-run")) {
  console.log(`ensure-indexes (dry run, no connection) db=${dbName}: ${INDEX_SPECS.length} specs`)
  for (const s of INDEX_SPECS) console.log(`  ${s.collection}.${s.name} ${JSON.stringify(s.key)}`)
  process.exit(0)
}

const uri = process.env.MONGODB_URI?.trim()
if (!uri) fail("MONGODB_URI is not set in the shell environment (.env files are not loaded)")

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 })
let code = 0
try {
  await client.connect()
  const crm = crmDbFrom(client.db(dbName), DEFAULT_WORKSPACE, { client })
  const report = await crm.ensureIndexes()
  console.log(`ensure-indexes db=${dbName}: created ${report.created.length}, existing ${report.existing.length}, conflicts ${report.conflicts.length}`)
  for (const c of report.created) console.log(`  + ${c}`)
  for (const c of report.conflicts) console.log(`  ! ${c.index}: ${c.reason}`)
  if (report.conflicts.length) code = 1
} catch (err) {
  console.error(`ensure-indexes failed: ${err?.message ?? err}`)
  code = 2
} finally {
  await client.close()
}
process.exit(code)
