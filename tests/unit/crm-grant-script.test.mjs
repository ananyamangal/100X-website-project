// Run: node --import ./tests/support/register.mjs --test tests/unit/crm-grant-script.test.mjs
// Independent tests: scripts/crm/grant-crm-permissions.mjs (dry run default, prod guard, additions only).
import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { startMemoryMongo } from "./crm/helpers/memory-mongo.mjs"
import { ROLE_PERMISSIONS } from "../../lib/rbac/roles.ts"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const SCRIPT = "scripts/crm/grant-crm-permissions.mjs"
let m
before(async () => { m = await startMemoryMongo() })
after(async () => { if (m) await m.stop() })

function run(args, env = {}) {
  const base = { ...process.env }
  for (const k of ["MONGODB_URI", "CRM_PROD_DB_NAME", "CRM_ALLOW_PROD_DB", "MONGODB_DB"]) delete base[k]
  const r = spawnSync(process.execPath, ["--import", "./tests/support/register.mjs", SCRIPT, ...args], { cwd: ROOT, env: { ...base, ...env }, encoding: "utf8", timeout: 60000 })
  return { code: r.status, out: r.stdout ?? "", err: r.stderr ?? "" }
}
const UNREACHABLE = "mongodb://127.0.0.1:1/?serverSelectionTimeoutMS=500"
const crmKeys = r => ROLE_PERMISSIONS[r].filter(p => p.startsWith("crm."))

test("script: static facts - never loads .env, additions only ($addToSet, no $pull/$set permissions/deleteMany), no operations role", () => {
  const src = fs.readFileSync(path.join(ROOT, SCRIPT), "utf8")
  assert.ok(!/dotenv|readFileSync|readFile\(|process\.loadEnvFile|loadEnvConfig|@next\/env/.test(src), "must not load .env files")
  assert.ok(!/\$pull|\$unset|deleteMany|deleteOne|drop\(/.test(src))
  assert.ok(!/\$set:\s*\{\s*permissions/.test(src))
  assert.ok(!/operations/.test(src.split("\n").filter(l => !l.trim().startsWith("//")).join("\n")))
  assert.ok(!/console\.(log|error)\([^)]*\buri\b/i.test(src), "URI never printed")
})

test("--offline prints intended keys per role with no connection and no env", () => {
  const r = run(["--offline"], { MONGODB_URI: UNREACHABLE })
  assert.equal(r.code, 0, r.err)
  assert.match(r.out, /super_admin \(23\)/)
  assert.match(r.out, new RegExp(`sales_manager \\(${crmKeys("sales_manager").length}\\)`))
  assert.match(r.out, new RegExp(`sales_executive \\(${crmKeys("sales_executive").length}\\)`))
  assert.match(r.out, /crm\.leads\.view_assigned/)
  assert.ok(!r.out.includes("127.0.0.1"))
  const one = run(["--offline", "--roles", "sales_executive"])
  assert.ok(!one.out.includes("super_admin") && one.out.includes("sales_executive"))
})

test("refuses: no --db, no CRM_PROD_DB_NAME, unsupported role (exit 2, nothing connects)", () => {
  let r = run([], { MONGODB_URI: UNREACHABLE })
  assert.equal(r.code, 2); assert.match(r.err, /no target DB/)
  r = run(["--db", "x"], { MONGODB_URI: UNREACHABLE })
  assert.equal(r.code, 2); assert.match(r.err, /CRM_PROD_DB_NAME is not set/)
  r = run(["--db", "x", "--roles", "operations"], { MONGODB_URI: UNREACHABLE, CRM_PROD_DB_NAME: "prod" })
  assert.equal(r.code, 2); assert.match(r.err, /unsupported role "operations"/)
  r = run(["--db", "x", "--roles", "viewer"], { MONGODB_URI: UNREACHABLE, CRM_PROD_DB_NAME: "prod" })
  assert.equal(r.code, 2)
  r = run(["--db", "x"], { CRM_PROD_DB_NAME: "prod" })
  assert.equal(r.code, 2); assert.match(r.err, /MONGODB_URI is not set/)
})

test("prod DB needs BOTH --allow-prod and CRM_ALLOW_PROD_DB=1, even for a dry run and with --apply", () => {
  const env = { MONGODB_URI: UNREACHABLE, CRM_PROD_DB_NAME: "proddb" }
  for (const [args, extra] of [
    [["--db", "proddb"], {}],
    [["--db", "proddb", "--allow-prod"], {}],
    [["--db", "proddb"], { CRM_ALLOW_PROD_DB: "1" }],
    [["--db", "proddb", "--allow-prod"], { CRM_ALLOW_PROD_DB: "true" }],
    [["--db", "proddb", "--allow-prod"], { CRM_ALLOW_PROD_DB: "0" }],
    [["--db", "proddb", "--apply"], {}],
    [["--db", "proddb", "--apply", "--allow-prod"], {}],
  ]) {
    const r = run(args, { ...env, ...extra })
    assert.equal(r.code, 2, JSON.stringify([args, extra]))
    assert.match(r.err, /production DB/, JSON.stringify([args, extra]))
    assert.ok(!r.out.includes("grant-crm-permissions db="), "must not reach the connect stage")
  }
})

test("dry run (default) prints the per-role diff and writes nothing; --apply adds only; second run is up to date", async t => {
  if (!m.ok) return t.skip(m.skip)
  const { hosts } = m.client.options
  const uri = `mongodb://${hosts[0].host}:${hosts[0].port}/?directConnection=true`
  const dbName = `grant_${process.pid}`
  const coll = m.client.db(dbName).collection("rbac_role_permissions")
  const keepOwner = ["dashboard.view", "crm.view"]
  await coll.insertMany([
    { roleSlug: "super_admin", permissions: [...keepOwner, "x.custom"] },
    { roleSlug: "sales_manager", permissions: ["leads.view_all", ...crmKeys("sales_manager")] }, // already complete
    { roleSlug: "sales_executive", permissions: ["leads.view_assigned", "custom.keep"] },
  ])
  const snap = async () => JSON.stringify((await coll.find({}).sort({ roleSlug: 1 }).toArray()).map(d => [d.roleSlug, d.permissions]))
  const before = await snap()
  const env = { MONGODB_URI: uri, CRM_PROD_DB_NAME: "someotherprod" }
  let r = run(["--db", dbName], env)
  assert.equal(r.code, 0, r.err + r.out)
  assert.match(r.out, /mode=dry-run/); assert.match(r.out, /dry run: nothing written/)
  const sa = r.out.split(/\r?\n/).find(l => l.includes("super_admin:")) || ""
  assert.ok(sa.includes("crm.leads.view_all") && !/[ ,]crm\.view(,|$)/.test(sa), "owner gets missing keys only; crm.view already held")
  assert.match(r.out, /sales_manager: up to date/)
  assert.match(r.out, /sales_executive: \+ crm\.view/)
  assert.ok(!r.out.includes(uri) && !r.err.includes(uri) && !r.out.includes(String(hosts[0].port)), "URI never printed")
  assert.equal(await snap(), before, "dry run wrote nothing")
  // roles filter + a role with no row
  await coll.deleteOne({ roleSlug: "sales_executive" })
  r = run(["--db", dbName, "--roles", "sales_executive"], env)
  assert.match(r.out, /sales_executive: no live row/)
  await coll.insertOne({ roleSlug: "sales_executive", permissions: ["leads.view_assigned", "custom.keep"] })
  // apply
  r = run(["--db", dbName, "--apply"], env)
  assert.equal(r.code, 0, r.err); assert.match(r.out, /mode=APPLY/)
  const rows = Object.fromEntries((await coll.find({}).toArray()).map(d => [d.roleSlug, d]))
  assert.deepEqual([...rows.super_admin.permissions].sort(), [...new Set([...keepOwner, "x.custom", ...crmKeys("super_admin")])].sort())
  assert.ok(rows.super_admin.permissions.includes("x.custom"), "existing custom keys kept")
  assert.ok(rows.sales_executive.permissions.includes("custom.keep") && rows.sales_executive.permissions.includes("leads.view_assigned"))
  assert.deepEqual([...rows.sales_executive.permissions.filter(p => p.startsWith("crm."))].sort(), [...crmKeys("sales_executive")].sort())
  assert.ok(!rows.sales_executive.permissions.includes("crm.leads.view_all"), "executive never gets view_all")
  assert.ok(!rows.sales_executive.permissions.includes("crm.leads.assign"))
  assert.equal(rows.super_admin.updatedBy, "script:grant-crm-permissions")
  assert.equal(rows.sales_manager.updatedBy, undefined, "up-to-date row not touched")
  for (const d of Object.values(rows)) assert.equal(new Set(d.permissions).size, d.permissions.length, "no duplicates")
  // idempotent
  const after1 = await snap()
  r = run(["--db", dbName, "--apply"], env)
  assert.match(r.out, /super_admin: up to date/); assert.match(r.out, /sales_executive: up to date/)
  assert.equal(await snap(), after1)
  // prod name with both flags is allowed (dry run)
  r = run(["--db", dbName, "--allow-prod"], { ...env, CRM_PROD_DB_NAME: dbName, CRM_ALLOW_PROD_DB: "1" })
  assert.equal(r.code, 0, r.err); assert.match(r.out, /mode=dry-run/)
  // only the target collection was created in that db
  const cols = (await m.client.db(dbName).listCollections().toArray()).map(c => c.name)
  assert.deepEqual(cols, ["rbac_role_permissions"])
})
