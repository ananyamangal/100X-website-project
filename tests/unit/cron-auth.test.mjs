// Run: node --import ./tests/support/register.mjs --test tests/unit/cron-auth.test.mjs
import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import { CRON_PATHS, isAuthorizedCronRequest } from "../../lib/rbac/cron.ts"

const SECRET = "a".repeat(64)
const ok = (m, p, auth, secret = SECRET) => isAuthorizedCronRequest(m, p, auth, secret)

test("CRON_PATHS is exactly the vercel.json crons list", () => {
  const vercel = JSON.parse(fs.readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"))
  assert.deepEqual([...CRON_PATHS].sort(), vercel.crons.map(c => c.path).sort())
})

test("every scheduled path passes with GET + the right Bearer secret", () => {
  for (const p of CRON_PATHS) assert.ok(ok("GET", p, "Bearer " + SECRET), p)
})

test("fails closed: no secret configured, wrong/missing header, wrong method", () => {
  const p = "/api/admin/growth/cron/revenue-director"
  // Call directly: passing undefined to ok() would fall back to its default SECRET.
  assert.equal(isAuthorizedCronRequest("GET", p, "Bearer " + SECRET, undefined), false)
  assert.equal(isAuthorizedCronRequest("GET", p, "Bearer undefined", undefined), false)
  assert.equal(isAuthorizedCronRequest("GET", p, "Bearer ", ""), false)
  assert.equal(ok("GET", p, null), false)
  assert.equal(ok("GET", p, "Bearer " + "b".repeat(64)), false)
  assert.equal(ok("GET", p, SECRET), false)                  // missing "Bearer "
  assert.equal(ok("GET", p, "bearer " + SECRET), false)      // exact scheme only
  assert.equal(ok("GET", p, "Bearer " + SECRET + "x"), false)
  for (const m of ["POST", "PUT", "PATCH", "DELETE"]) assert.equal(ok(m, p, "Bearer " + SECRET), false, m)
})

test("only exact scheduled paths: no children, neighbours or other admin routes", () => {
  const auth = "Bearer " + SECRET
  for (const p of [
    "/api/admin/growth/cron/revenue-director/x",
    "/api/admin/growth/cron/revenue-director/",
    "/api/admin/growth/cron",
    "/api/admin/growth/cron/unknown",
    "/api/admin/growth/seo/offpage/discover/run-all",
    "/api/admin/growth/dashboard",
    "/api/admin/procurement/insights/x",
    "/api/admin/users",
    "/api/admin/knowledge/rebuild",
  ]) assert.equal(ok("GET", p, auth), false, p)
})
