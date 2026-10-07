// Run: node --import ./tests/support/register.mjs --test tests/unit/lead-data-lockdown.test.mjs
// Pins the middleware gate on lead data: RFQ attachments, the brochure-lead and submission
// lists (GET only — the public brochure / quote / contact / dealer form POSTs must keep
// working) and the legacy /api/upload route.
// /api/files/<id> must stay public: admin-uploaded product brochures / case-study files are
// served from it on public pages.
import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import { canAccessAdminApi } from "../../lib/rbac/access.ts"

const middleware = fs.readFileSync(new URL("../../middleware.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n")
const matcher = /matcher: \[([\s\S]*?)\n  \],/.exec(middleware)?.[1] ?? ""
const SET_LITERALS = {
  PROTECTED_API_PATHS: /const PROTECTED_API_PATHS[^=]*= new Set\(\[([^\]]+)\]\)/,
  PROTECTED_LEAD_READ_PATHS: /const PROTECTED_LEAD_READ_PATHS[^=]*= new Set\(\[([^\]]+)\]\)/,
}
const setEntries = (name) => [...(SET_LITERALS[name].exec(middleware)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1])

test("matcher lists the lead-data routes and keeps /api/files public", () => {
  for (const entry of ['"/api/rfq-attachments/:path*"', '"/api/brochure-leads"', '"/api/upload"', '"/api/submissions"']) {
    assert.ok(matcher.includes(entry), `matcher is missing ${entry}`)
  }
  assert.ok(!matcher.includes("/api/files"), "/api/files must not be matched (public product/case-study files)")
})

test("rfq attachments are a protected prefix; /api/upload is a protected exact path", () => {
  const prefixes = [...(/const PROTECTED_API_PREFIXES = \[([^\]]+)\]/.exec(middleware)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1])
  assert.ok(prefixes.includes("/api/rfq-attachments/"))
  assert.ok(!prefixes.includes("/api/files/"))
  assert.deepEqual(setEntries("PROTECTED_API_PATHS"), ["/api/upload"])
})

test("only the GETs of /api/brochure-leads and /api/submissions are gated (the public form POSTs pass)", () => {
  assert.deepEqual(setEntries("PROTECTED_LEAD_READ_PATHS"), ["/api/brochure-leads", "/api/submissions"])
  const fn = /function isProtectedLeadRead\(method: string, pathname: string\): boolean \{\n([\s\S]*?)\n\}/.exec(middleware)?.[1] ?? ""
  assert.ok(fn.includes("PROTECTED_LEAD_READ_PATHS.has(pathname)"))
  assert.ok(fn.includes('method.toUpperCase() === "GET"'))
  assert.ok(middleware.includes("isProtectedLeadRead(request.method, pathname)"))
  // The old session-only branch for /api/submissions must be gone (it let confined roles read every lead).
  assert.ok(!middleware.includes('pathname === "/api/submissions" && request.method === "GET"'))
})

test("confined roles are default-denied on the gated lead routes", () => {
  for (const role of ["seo_team", "content_team"]) {
    const perms = ["seo.view", "content.view", "dashboard.view", "logs.view"]
    assert.equal(canAccessAdminApi(perms, "GET", "/api/brochure-leads", role), false)
    assert.equal(canAccessAdminApi(perms, "GET", "/api/submissions", role), false)
    assert.equal(canAccessAdminApi(perms, "GET", "/api/rfq-attachments/6ac62b4ad04d6d93fc8e9006", role), false)
    assert.equal(canAccessAdminApi(perms, "POST", "/api/upload", role), false)
  }
})
