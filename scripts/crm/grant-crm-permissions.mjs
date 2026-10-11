#!/usr/bin/env node
// Proposes (and, with --apply, makes) the crm.* additions to the LIVE role rows in
// rbac_role_permissions. Live rows govern over the code fallback in lib/rbac/roles.ts, so adding
// crm.* keys to roles.ts alone grants nothing in production (memory: "DB rows govern").
//
// What it grants (additions only; it never removes a key and never creates a role):
//   super_admin      every crm.* key in ROLE_PERMISSIONS.super_admin
//   sales_manager    the Sales set + crm.leads.view_all
//   sales_executive  the Sales set + crm.leads.view_assigned
// The `operations` role is NOT handled (pending owner approval, docs/crm/DATA_MODEL.md §8).
// A role with no row in rbac_role_permissions already runs on the code fallback (which has the
// keys); it is reported and left alone.
//
// Usage (repo root; never loads .env files — the URI comes from the shell env only):
//   node --import ./tests/support/register.mjs scripts/crm/grant-crm-permissions.mjs --offline
//       → prints the intended additions, no connection
//   MONGODB_URI=... CRM_PROD_DB_NAME=<prod db> \
//   node --import ./tests/support/register.mjs scripts/crm/grant-crm-permissions.mjs --db <name> [--roles a,b] [--apply]
//       → default is a DRY RUN: reads the role rows and prints the per-role diff; --apply writes it
//
// Safety:
// - The target DB must be explicit (--db). CRM_PROD_DB_NAME must be set; targeting it (even for a
//   dry run) needs BOTH --allow-prod and CRM_ALLOW_PROD_DB=1.
// - Writes use $addToSet per key (idempotent) and stamp updatedAt/updatedBy="script:grant-crm-permissions".
// - Users must log in again (or wait for JWT expiry) for UI gating; CRM API routes re-resolve
//   permissions from the DB on every request, so they see the change immediately.
// - The URI is never printed.
import { MongoClient } from "mongodb"
import { ROLE_PERMISSIONS } from "../../lib/rbac/roles.ts"

const TARGET_ROLES = ["super_admin", "sales_manager", "sales_executive"]

function arg(name) {
  const i = process.argv.indexOf(name)
  return i === -1 ? undefined : process.argv[i + 1]?.trim() || ""
}
const has = name => process.argv.includes(name)
const fail = msg => {
  console.error(`grant-crm-permissions: ${msg}`)
  process.exit(2)
}
const trimmed = v => (typeof v === "string" && v.trim() ? v.trim() : undefined)

function intendedGrants(roles = TARGET_ROLES) {
  const out = {}
  for (const r of roles) out[r] = (ROLE_PERMISSIONS[r] ?? []).filter(p => typeof p === "string" && p.startsWith("crm."))
  return out
}

/** Pure diff: which intended keys a live row lacks. */
function diffRow(livePermissions, intended) {
  const live = new Set(Array.isArray(livePermissions) ? livePermissions : [])
  return intended.filter(p => !live.has(p))
}

const rolesArg = arg("--roles")
const roles = rolesArg ? rolesArg.split(",").map(s => s.trim()).filter(Boolean) : TARGET_ROLES
for (const r of roles) if (!TARGET_ROLES.includes(r)) fail(`unsupported role "${r}" (allowed: ${TARGET_ROLES.join(", ")})`)
const intended = intendedGrants(roles)

if (has("--offline")) {
  console.log("grant-crm-permissions (offline, no connection): intended crm.* keys per role")
  for (const r of roles) console.log(`  ${r} (${intended[r].length}): ${intended[r].join(", ")}`)
  process.exit(0)
}

const dbName = arg("--db")
if (!dbName) fail("no target DB: pass --db <name> (the DB that holds rbac_role_permissions). There is no default.")
const prodDb = trimmed(process.env.CRM_PROD_DB_NAME)
if (!prodDb) fail("CRM_PROD_DB_NAME is not set; refusing to run without the prod guard")
if (dbName === prodDb && !(has("--allow-prod") && trimmed(process.env.CRM_ALLOW_PROD_DB) === "1")) {
  fail(`"${dbName}" is the production DB; this needs both --allow-prod and CRM_ALLOW_PROD_DB=1`)
}
const apply = has("--apply")
const uri = trimmed(process.env.MONGODB_URI)
if (!uri) fail("MONGODB_URI is not set in the shell environment (.env files are not loaded)")

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 })
let code = 0
try {
  await client.connect()
  const coll = client.db(dbName).collection("rbac_role_permissions")
  console.log(`grant-crm-permissions db=${dbName} mode=${apply ? "APPLY" : "dry-run"}`)
  for (const role of roles) {
    const row = await coll.findOne({ roleSlug: role }, { projection: { permissions: 1 } })
    if (!row) {
      console.log(`  ${role}: no live row → code fallback governs (already includes ${intended[role].length} crm.* keys); skipped`)
      continue
    }
    const missing = diffRow(row.permissions, intended[role])
    if (missing.length === 0) {
      console.log(`  ${role}: up to date`)
      continue
    }
    console.log(`  ${role}: + ${missing.join(", ")}`)
    if (apply) {
      const res = await coll.updateOne(
        { _id: row._id },
        { $addToSet: { permissions: { $each: missing } }, $set: { updatedAt: new Date(), updatedBy: "script:grant-crm-permissions" } },
      )
      console.log(`    applied (modified ${res.modifiedCount})`)
    }
  }
  if (!apply) console.log("dry run: nothing written (re-run with --apply)")
} catch (err) {
  console.error(`grant-crm-permissions failed: ${err?.name ?? "error"}`)
  code = 2
} finally {
  await client.close()
}
process.exit(code)
