// Run: node --import ./tests/support/register.mjs --test tests/unit/crm-env-guard.test.mjs
// Spec: docs/crm/DATA_MODEL.md section 10, DECISIONS section 18.
import test from "node:test"
import assert from "node:assert/strict"
import { readCrmEnv, describeCrmEnv } from "../../lib/crm/env.ts"
import { assertCrmDbAllowed, CrmWorkspaceViolation } from "../../lib/crm/db.ts"
import { CRM_ENV } from "../../lib/crm/model.ts"

test("readCrmEnv: trims values; empty / whitespace = unset", () => {
  const e = readCrmEnv({
    [CRM_ENV.mongoDb]: "  crm_staging \n",
    [CRM_ENV.prodDbName]: "\t100x\t",
    [CRM_ENV.publicBaseUrl]: "   ",
    [CRM_ENV.healthSecret]: "",
    [CRM_ENV.waAppSecret]: " s3cret ",
    VERCEL_ENV: " preview ",
  })
  assert.equal(e.mongoDb, "crm_staging")
  assert.equal(e.prodDbName, "100x")
  assert.equal(e.publicBaseUrl, undefined)
  assert.equal(e.healthSecret, undefined)
  assert.equal(e.waAppSecret, "s3cret")
  assert.equal(e.vercelEnv, "preview")
  const none = readCrmEnv({})
  for (const k of ["mongoDb", "prodDbName", "publicBaseUrl", "previewBypass", "healthSecret", "waAppSecret", "waVerifyToken", "waAccessToken", "waApiVersion", "vercelEnv"]) assert.equal(none[k], undefined, k)
  assert.deepEqual(none.waPhoneNumberIds, [])
})

test("readCrmEnv: CRM_GROWTH_OS_SYNC defaults ON; off|0|false (any case, trimmed) = OFF", () => {
  const f = v => readCrmEnv(v === undefined ? {} : { [CRM_ENV.growthSync]: v }).growthSync
  assert.equal(f(undefined), true)
  assert.equal(f(""), true)
  assert.equal(f("   "), true)
  for (const on of ["1", "true", "on", "yes", "TRUE", "anything"]) assert.equal(f(on), true, on)
  for (const off of ["off", "OFF", "Off", "0", "false", "FALSE", "False", " off ", "\t0\n"]) assert.equal(f(off), false, JSON.stringify(off))
})

test("readCrmEnv: CRM_ALLOW_PROD_DB only exact '1'; phone number ids trimmed, de-duplicated, empties dropped", () => {
  const a = v => readCrmEnv({ [CRM_ENV.allowProdDb]: v }).allowProdDb
  assert.equal(a("1"), true)
  assert.equal(a(" 1 "), true)
  for (const v of ["", "0", "true", "yes", "11", undefined]) assert.equal(a(v), false, String(v))
  const ids = readCrmEnv({ [CRM_ENV.waPhoneNumberIds]: " 111 , 222,,111 ,  , 333 " }).waPhoneNumberIds
  assert.deepEqual(ids, ["111", "222", "333"])
})

test("describeCrmEnv never leaks secret values", () => {
  const secrets = ["sekret-app", "sekret-verify", "sekret-token", "sekret-health", "sekret-bypass"]
  const d = describeCrmEnv({
    [CRM_ENV.waAppSecret]: secrets[0], [CRM_ENV.waVerifyToken]: secrets[1], [CRM_ENV.waAccessToken]: secrets[2],
    [CRM_ENV.healthSecret]: secrets[3], [CRM_ENV.previewBypass]: secrets[4],
  })
  const json = JSON.stringify(d)
  for (const s of secrets) assert.equal(json.includes(s), false, s)
})

const guard = (name, env) => assertCrmDbAllowed(name, env)
const throwsGuard = (name, env) => assert.throws(() => guard(name, env), e => e instanceof CrmWorkspaceViolation && e.kind === "db_guard")

test("assertCrmDbAllowed: blocks the prod DB name outside production", () => {
  for (const vercelEnv of [undefined, "preview", "development", ""]) {
    const env = { [CRM_ENV.prodDbName]: "100x", ...(vercelEnv === undefined ? {} : { VERCEL_ENV: vercelEnv }) }
    throwsGuard("100x", env)
    assert.doesNotThrow(() => guard("crm_staging", env))
  }
  throwsGuard("100x", { [CRM_ENV.prodDbName]: " 100x ", [CRM_ENV.allowProdDb]: "0" }) // value is trimmed on read
  throwsGuard("100x", { [CRM_ENV.prodDbName]: "100x", [CRM_ENV.allowProdDb]: "true" })
})

test("assertCrmDbAllowed: CRM_ALLOW_PROD_DB=1 is the deliberate override", () => {
  assert.doesNotThrow(() => guard("100x", { [CRM_ENV.prodDbName]: "100x", [CRM_ENV.allowProdDb]: "1", VERCEL_ENV: "preview" }))
})

test("assertCrmDbAllowed: fails closed when CRM_PROD_DB_NAME is unset/blank outside production", () => {
  throwsGuard("anything", {})
  throwsGuard("crm_staging", { VERCEL_ENV: "preview" })
  throwsGuard("crm_staging", { VERCEL_ENV: "development", [CRM_ENV.prodDbName]: "   " })
  throwsGuard("100x", { [CRM_ENV.allowProdDb]: "1" }) // override alone does not open the gate
})

test("assertCrmDbAllowed: production is always allowed", () => {
  assert.doesNotThrow(() => guard("100x", { VERCEL_ENV: "production" }))
  assert.doesNotThrow(() => guard("100x", { VERCEL_ENV: "production", [CRM_ENV.prodDbName]: "100x" }))
  assert.doesNotThrow(() => guard("whatever", { VERCEL_ENV: " production " }))
})
