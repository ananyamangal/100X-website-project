// Run: node --import ./tests/support/register.mjs --test tests/unit/api-lockdown.test.mjs
// Pins the middleware gate on the GeM procurement APIs: /api/fogging/* and /api/growth/*
// must be matched by the middleware and treated like /api/admin/* (session required,
// confined roles default-denied by canAccessAdminApi).
import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import { canAccessAdminApi, isRestrictedRole } from "../../lib/rbac/access.ts"

const middleware = fs.readFileSync(new URL("../../middleware.ts", import.meta.url), "utf8")

test("middleware matcher lists the fogging and growth API families explicitly", () => {
  // The generic catch-all matcher excludes /api, so each protected family must be listed.
  for (const entry of ['"/api/admin/:path*"', '"/api/fogging/:path*"', '"/api/growth/:path*"']) {
    assert.ok(middleware.includes(entry), `matcher is missing ${entry}`)
  }
})

test("middleware gates /api/fogging and /api/growth with the same branch as /api/admin", () => {
  const m = /const PROTECTED_API_PREFIXES = \[([^\]]+)\]/.exec(middleware)
  assert.ok(m, "PROTECTED_API_PREFIXES not found")
  const prefixes = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1])
  assert.deepEqual(prefixes, ["/api/admin/", "/api/fogging/", "/api/growth/"])
  assert.ok(middleware.includes("PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))"))
})

test("confined roles are default-denied on every fogging/growth path", () => {
  const paths = [
    ["GET", "/api/fogging/buyers"],
    ["GET", "/api/fogging/pricing/quote-advisor"],
    ["GET", "/api/fogging/attack-accounts/export"],
    ["POST", "/api/fogging/copilot"],
    ["GET", "/api/growth/fogging/sellers/export"],
  ]
  for (const role of ["seo_team", "content_team"]) {
    assert.ok(isRestrictedRole(role))
    for (const [method, path] of paths) {
      assert.equal(
        canAccessAdminApi(["seo.view", "content.view", "landing_pages.view"], method, path, role),
        false,
        `${role} must not reach ${method} ${path}`,
      )
    }
  }
})

test("unconfined roles are not gated by canAccessAdminApi (session check alone applies)", () => {
  for (const role of ["super_admin", "growth_admin", "sales_manager", "procurement_analyst"]) {
    assert.equal(isRestrictedRole(role), false)
  }
})
