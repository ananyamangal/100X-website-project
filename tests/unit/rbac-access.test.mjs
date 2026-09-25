// Run: node --test tests/unit/rbac-access.test.mjs
import test from "node:test"
import assert from "node:assert/strict"
import {
  isRestrictedRole,
  canAccessAdminApi,
  canSeeDashboardTab,
  canSeeGrowthOS,
  canSeeLandingPages,
  firstVisibleDashboardTab,
  DASHBOARD_TAB_PERMISSIONS,
} from "../../lib/rbac/access.ts"

// Mirrors lib/rbac/engine.ts: (role base + grants) - denials.
const effective = (base, granted = [], denied = []) => {
  const s = new Set(base)
  granted.forEach(p => s.add(p))
  denied.forEach(p => s.delete(p))
  return [...s]
}

// The Content Team set from the bug report (view/edit slice that matters here).
const CONTENT_TEAM = [
  "dashboard.view",
  "blog.view", "blog.create", "blog.edit", "blog.publish", "blog.delete",
  "knowledge.view", "knowledge.edit",
  "products.view", "products.create", "products.edit", "products.delete",
  "case_studies.view", "case_studies.create", "case_studies.edit",
  "spare_parts.view", "spare_parts.edit",
  "banners.view", "banners.edit",
  "landing_pages.view", "landing_pages.edit", "landing_pages.publish",
  "product_cat.fogging.view", "product_cat.fogging.edit",
]

const SEO_TEAM = ["dashboard.view", "seo.view", "seo.gsc.view", "analytics.view",
  "blog.view", "blog.create", "blog.edit", "blog.publish", "knowledge.view", "knowledge.edit"]

const visibleTabs = perms => Object.keys(DASHBOARD_TAB_PERMISSIONS).filter(t => canSeeDashboardTab(perms, t))

test("content_team with the full permission set sees every section it can .view", () => {
  assert.deepEqual(
    visibleTabs(CONTENT_TEAM).sort(),
    ["banners", "blogs", "caseStudies", "knowledge", "products", "spareParts"]
  )
  assert.equal(canSeeLandingPages(CONTENT_TEAM), true)
  assert.equal(canSeeGrowthOS(CONTENT_TEAM), false)
  assert.equal(firstVisibleDashboardTab(CONTENT_TEAM), "blogs")
})

test("tabs with no permission mapping stay hidden from a confined role", () => {
  for (const tab of ["dashboard", "siteSettings", "settings", "procurement", "customers", "redirects"]) {
    assert.equal(canSeeDashboardTab(CONTENT_TEAM, tab), false, tab)
  }
})

test("API perimeter follows permissions for the content surfaces", () => {
  const ok = (m, p) => canAccessAdminApi(CONTENT_TEAM, m, p)
  assert.ok(ok("GET", "/api/admin/products"))
  assert.ok(ok("POST", "/api/admin/products"))
  assert.ok(ok("POST", "/api/admin/products/abc/duplicate"))
  assert.ok(ok("PUT", "/api/admin/products/abc"))
  assert.ok(ok("DELETE", "/api/admin/products/abc"))
  assert.ok(ok("GET", "/api/admin/case-studies"))
  assert.ok(ok("PUT", "/api/admin/case-studies/abc"))
  assert.ok(ok("GET", "/api/admin/spare-parts"))
  assert.ok(ok("PUT", "/api/admin/spare-parts/abc"))
  assert.ok(ok("GET", "/api/admin/banners"))
  assert.ok(ok("PUT", "/api/admin/banners/abc"))
  assert.ok(ok("GET", "/api/admin/landing-pages/metrics"))
  assert.ok(ok("POST", "/api/admin/landing-pages/some-slug/override"))
  assert.ok(ok("POST", "/api/admin/upload-file"))
  assert.ok(ok("GET", "/api/admin/blogs"))
  assert.ok(ok("GET", "/api/admin/knowledge"))
  assert.ok(ok("GET", "/api/admin/auth/me"))
})

test("everything not mapped stays default-deny for a confined role", () => {
  const no = (m, p) => assert.equal(canAccessAdminApi(CONTENT_TEAM, m, p), false, `${m} ${p}`)
  no("GET", "/api/admin/users")
  no("GET", "/api/admin/site-settings")
  no("GET", "/api/admin/customers")
  no("GET", "/api/admin/redirects")
  no("GET", "/api/admin/procurement/contracts")
  no("GET", "/api/admin/growth/dashboard")
  no("POST", "/api/admin/growth/agents/run")
  no("GET", "/api/admin/products-evil")          // prefix must match on a path boundary
  no("POST", "/api/admin/categories")            // categories is read-only
})

test("method split: view-only holders cannot write, and create/edit/delete are independent", () => {
  const viewOnly = ["products.view", "banners.view", "spare_parts.view", "case_studies.view"]
  assert.ok(canAccessAdminApi(viewOnly, "GET", "/api/admin/products"))
  assert.equal(canAccessAdminApi(viewOnly, "POST", "/api/admin/products"), false)
  assert.equal(canAccessAdminApi(viewOnly, "PUT", "/api/admin/products/x"), false)
  assert.equal(canAccessAdminApi(viewOnly, "DELETE", "/api/admin/products/x"), false)
  assert.equal(canAccessAdminApi(viewOnly, "PUT", "/api/admin/banners/x"), false)

  const noDelete = effective(CONTENT_TEAM, [], ["products.delete"])
  assert.ok(canAccessAdminApi(noDelete, "PUT", "/api/admin/products/x"))
  assert.equal(canAccessAdminApi(noDelete, "DELETE", "/api/admin/products/x"), false)
})

test("DENY override removes a section and its API; other sections are untouched", () => {
  const perms = effective(CONTENT_TEAM, [], ["products.view", "banners.view"])
  assert.equal(canSeeDashboardTab(perms, "products"), false)
  assert.equal(canSeeDashboardTab(perms, "banners"), false)
  assert.equal(canAccessAdminApi(perms, "GET", "/api/admin/products"), false)
  assert.equal(canAccessAdminApi(perms, "GET", "/api/admin/banners"), false)
  assert.equal(canSeeDashboardTab(perms, "caseStudies"), true)
  assert.equal(canSeeDashboardTab(perms, "blogs"), true)
})

test("GRANT override adds a section to a user whose role default lacks it", () => {
  const roleDefault = ["dashboard.view", "blog.view", "blog.edit", "knowledge.view", "knowledge.edit"]
  assert.deepEqual(visibleTabs(roleDefault).sort(), ["blogs", "knowledge"])
  const perms = effective(roleDefault, ["banners.view", "banners.edit"])
  assert.equal(canSeeDashboardTab(perms, "banners"), true)
  assert.ok(canAccessAdminApi(perms, "PUT", "/api/admin/banners/x"))
  assert.equal(canSeeDashboardTab(perms, "products"), false)
})

test("a role with no visible content tab gets no default tab (no redirect loop)", () => {
  assert.equal(firstVisibleDashboardTab(["dashboard.view"]), null)
})

test("seo_team is unchanged: blogs+knowledge, read-only Growth OS", () => {
  assert.deepEqual(visibleTabs(SEO_TEAM).sort(), ["blogs", "knowledge"])
  assert.equal(canSeeGrowthOS(SEO_TEAM), true)
  assert.equal(canSeeLandingPages(SEO_TEAM), false)
  assert.ok(canAccessAdminApi(SEO_TEAM, "GET", "/api/admin/growth/seo/recommendations"))
  assert.ok(canAccessAdminApi(SEO_TEAM, "GET", "/api/admin/gsc/overview"))
  assert.ok(canAccessAdminApi(SEO_TEAM, "GET", "/api/admin/ga4/summary"))
  assert.equal(canAccessAdminApi(SEO_TEAM, "POST", "/api/admin/growth/agents/run"), false)
  assert.equal(canAccessAdminApi(SEO_TEAM, "DELETE", "/api/admin/gsc/x"), false)
  assert.equal(canAccessAdminApi(SEO_TEAM, "GET", "/api/admin/products"), false)
  assert.equal(canAccessAdminApi(SEO_TEAM, "GET", "/api/admin/users"), false)
})

test("only seo_team and content_team are confined; other roles are not gated here", () => {
  assert.equal(isRestrictedRole("content_team"), true)
  assert.equal(isRestrictedRole("seo_team"), true)
  for (const r of ["super_admin", "growth_admin", "sales_manager", "viewer", null, undefined, ""]) {
    assert.equal(isRestrictedRole(r), false, String(r))
  }
})
