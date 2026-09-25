// Run: node --test tests/unit/rbac-access.test.mjs
import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import {
  isRestrictedRole,
  canAccessAdminApi as canAccessAdminApiForRole,
  canSeeDashboardTab,
  canSeeGrowthOS as canSeeGrowthOSForRole,
  canSeeLandingPages as canSeeLandingPagesForRole,
  canOpenAdminPage,
  firstVisibleDashboardTab,
  DASHBOARD_TAB_PERMISSIONS,
} from "../../lib/rbac/access.ts"

// Growth OS / Landing Pages / page access depend on the ROLE as well as the permissions.
// Fixtures are registered with their role; anything else is treated as content_team.
const ROLE_OF = new Map()
const roleOf = perms => ROLE_OF.get(perms) ?? "content_team"
const canAccessAdminApi = (perms, m, p) => canAccessAdminApiForRole(perms, m, p, roleOf(perms))
const canSeeGrowthOS = perms => canSeeGrowthOSForRole(perms, roleOf(perms))
const canSeeLandingPages = perms => canSeeLandingPagesForRole(perms, roleOf(perms))

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
ROLE_OF.set(SEO_TEAM, "seo_team")

const visibleTabs = perms => Object.keys(DASHBOARD_TAB_PERMISSIONS).filter(t => canSeeDashboardTab(perms, t))

test("content_team with the full permission set sees every section it can .view", () => {
  assert.deepEqual(
    visibleTabs(CONTENT_TEAM).sort(),
    ["banners", "blogs", "caseStudies", "categories", "certifications", "knowledge", "productBadges", "products", "spareParts"]
  )
  assert.equal(canSeeLandingPages(CONTENT_TEAM), false)
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
  assert.equal(ok("GET", "/api/admin/landing-pages/metrics"), false)
  assert.equal(ok("POST", "/api/admin/landing-pages/some-slug/override"), false)
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

// ── Site content scope (owner decision 2026-09-25) ────────────────────────────
const SITE_CONTENT = ["site_content.view", "site_content.edit", "site_content.delete",
  "redirects.view", "redirects.create", "migration.view", "migration.run"]
const CONTENT_TEAM_WIDE = [...CONTENT_TEAM, ...SITE_CONTENT]
// The live seo_team row in rbac_role_permissions (2026-09-25).
const SEO_TEAM_LIVE = ["analytics.export", "analytics.view", "blog.create", "blog.delete", "blog.edit",
  "blog.publish", "blog.view", "content.edit", "dashboard.view", "geo.view", "knowledge.edit",
  "knowledge.view", "landing_pages.view", "products.view", "seo.export", "seo.view"]
ROLE_OF.set(SEO_TEAM_LIVE, "seo_team")
// The live content_team row after the 2026-09-25 migration (56 permissions; includes
// dashboard.view, seo.view and logs.view, which drove the Growth OS exposure).
const CONTENT_TEAM_LIVE = JSON.parse(fs.readFileSync(new URL("./fixtures/content-team-live-2026-09-25.json", import.meta.url), "utf8"))
const SITE_CONTENT_APIS = ["about-page", "home-content", "homepage-sections", "trust-badges", "brand-assets",
  "accreditations", "customers", "videos", "video-popup", "celebrity-assets", "brochure", "rfq-popup",
  "media-assets", "media-library", "legal-pages", "reviews", "gov-past-performance", "gov-kpis"]

test("content_team with site content permissions sees exactly the approved tabs", () => {
  assert.deepEqual(visibleTabs(CONTENT_TEAM_WIDE).sort(), [
    "aboutUs", "accreditations", "banners", "blogs", "brochure", "caseStudies", "categories",
    "celebrityAssets", "certifications", "customers", "govKPIs", "govPastPerformance",
    "homepageContent", "homepageSections", "knowledge", "legalPages", "mediaLibrary", "migration",
    "productBadges", "products", "redirects", "reviews", "rfqPopup", "spareParts", "trustBadges",
    "videoPopup", "videos", "websiteSettings",
  ])
})

test("site content APIs: view / edit / delete are independent", () => {
  for (const api of SITE_CONTENT_APIS) {
    const p = "/api/admin/" + api
    assert.ok(canAccessAdminApi(CONTENT_TEAM_WIDE, "GET", p), "GET " + p)
    assert.ok(canAccessAdminApi(CONTENT_TEAM_WIDE, "PUT", p + "/x"), "PUT " + p)
    assert.ok(canAccessAdminApi(CONTENT_TEAM_WIDE, "POST", p), "POST " + p)
    assert.ok(canAccessAdminApi(CONTENT_TEAM_WIDE, "DELETE", p + "/x"), "DELETE " + p)
    const viewOnly = ["site_content.view"]
    assert.ok(canAccessAdminApi(viewOnly, "GET", p))
    assert.equal(canAccessAdminApi(viewOnly, "PUT", p + "/x"), false, "view-only PUT " + p)
    const noDelete = ["site_content.view", "site_content.edit"]
    assert.ok(canAccessAdminApi(noDelete, "PUT", p + "/x"))
    assert.equal(canAccessAdminApi(noDelete, "DELETE", p + "/x"), false, "no-delete DELETE " + p)
  }
  assert.ok(canAccessAdminApi(CONTENT_TEAM_WIDE, "POST", "/api/admin/brochure/upload"))
  assert.ok(canAccessAdminApi(CONTENT_TEAM_WIDE, "POST", "/api/admin/gov-past-performance/import"))
})

test("lead and customer data stays closed even with site content permissions", () => {
  const no = (m, p) => assert.equal(canAccessAdminApi(CONTENT_TEAM_WIDE, m, p), false, m + " " + p)
  for (const m of ["GET", "POST", "PUT", "DELETE"]) no(m, "/api/admin/rfq-popup/leads")
  no("GET", "/api/admin/rfq-popup/leads/123")
  no("GET", "/api/admin/brochure-analytics")
  no("GET", "/api/admin/oem-leads")
  no("GET", "/api/admin/lead-analytics")
  for (const tab of ["submissions", "brochureLeads", "oemLeads", "leadAnalytics"]) {
    assert.equal(canSeeDashboardTab(CONTENT_TEAM_WIDE, tab), false, tab)
  }
})

test("redirects: view + add only, existing redirects cannot be edited or deleted", () => {
  const ok = (m, p) => canAccessAdminApi(CONTENT_TEAM_WIDE, m, p)
  assert.ok(ok("GET", "/api/admin/redirects"))
  assert.ok(ok("POST", "/api/admin/redirects"))
  assert.equal(ok("PUT", "/api/admin/redirects/abc"), false)
  assert.equal(ok("PATCH", "/api/admin/redirects/abc"), false)
  assert.equal(ok("DELETE", "/api/admin/redirects/abc"), false)
  assert.equal(canAccessAdminApi(["redirects.view"], "POST", "/api/admin/redirects"), false)
})

test("migration: view reads the report, run is separate; migrate-products stays closed", () => {
  assert.ok(canAccessAdminApi(["migration.view"], "GET", "/api/admin/migrate"))
  assert.equal(canAccessAdminApi(["migration.view"], "POST", "/api/admin/migrate"), false)
  assert.ok(canAccessAdminApi(CONTENT_TEAM_WIDE, "POST", "/api/admin/migrate"))
  assert.equal(canAccessAdminApi(CONTENT_TEAM_WIDE, "POST", "/api/admin/migrate-products"), false)
  assert.equal(canAccessAdminApi(CONTENT_TEAM_WIDE, "GET", "/api/admin/migrate-products"), false)
})

test("still closed for content_team: settings, deployments, users, audits, rebuild, Growth OS writes", () => {
  const no = (m, p) => assert.equal(canAccessAdminApi(CONTENT_TEAM_WIDE, m, p), false, m + " " + p)
  no("GET", "/api/admin/site-settings")
  no("POST", "/api/admin/site-settings")
  no("GET", "/api/admin/deployments")
  no("GET", "/api/admin/users")
  no("GET", "/api/admin/permissions")
  no("GET", "/api/admin/seo-health")
  no("GET", "/api/admin/schema-health")
  no("GET", "/api/admin/health")
  no("GET", "/api/admin/catalog-audit")
  no("POST", "/api/admin/knowledge/rebuild")
  no("POST", "/api/admin/growth/agents/run")
  for (const tab of ["dashboard", "analytics", "content", "siteSettings", "settings", "deployments",
    "procurement", "seoHealth", "schemaHealth"]) {
    assert.equal(canSeeDashboardTab(CONTENT_TEAM_WIDE, tab), false, tab)
  }
})

test("the live seo_team row gains nothing from this change", () => {
  assert.deepEqual(visibleTabs(SEO_TEAM_LIVE).sort(), ["blogs", "knowledge", "products"])
  for (const api of SITE_CONTENT_APIS) {
    for (const m of ["GET", "POST", "PUT", "DELETE"]) {
      assert.equal(canAccessAdminApi(SEO_TEAM_LIVE, m, "/api/admin/" + api), false, m + " " + api)
    }
  }
  assert.equal(canAccessAdminApi(SEO_TEAM_LIVE, "GET", "/api/admin/redirects"), false)
  assert.equal(canAccessAdminApi(SEO_TEAM_LIVE, "GET", "/api/admin/migrate"), false)
})

// ── Growth OS closed to content_team (2026-09-25 incident) ────────────────────
// eb48100 opened Growth OS reads to any confined role holding seo.view/analytics.view;
// content_team holds seo.view, so Vivek could read ~116 Growth OS GET routes whose
// handlers have no permission check. Growth OS is now a role decision (seo_team only).
const GROWTH_GETS = fs.readFileSync(new URL("./fixtures/growth-get-routes.txt", import.meta.url), "utf8")
  .split("\n").map(l => l.trim()).filter(Boolean)

test("content_team (live row) cannot read or write ANY Growth OS / GSC / GA4 route", () => {
  assert.ok(GROWTH_GETS.length > 100, "fixture lists the Growth OS GET routes")
  for (const p of GROWTH_GETS) {
    for (const m of ["GET", "HEAD", "POST", "PUT", "DELETE"]) {
      assert.equal(canAccessAdminApi(CONTENT_TEAM_LIVE, m, p), false, m + " " + p)
    }
  }
  for (const p of ["/api/admin/gsc/overview", "/api/admin/ga4/summary", "/api/admin/growth/cron/revenue-director",
    "/api/admin/growth/crm/dealers", "/api/admin/growth/director/customer-match-export", "/api/admin/growth/logs"]) {
    assert.equal(canAccessAdminApi(CONTENT_TEAM_LIVE, "GET", p), false, p)
  }
  assert.equal(canSeeGrowthOS(CONTENT_TEAM_LIVE), false)
  assert.equal(canSeeLandingPages(CONTENT_TEAM_LIVE), false)
  assert.equal(canAccessAdminApi(CONTENT_TEAM_LIVE, "GET", "/api/admin/landing-pages"), false)
})

test("content_team pages: main dashboard and change-password only", () => {
  assert.ok(canOpenAdminPage("content_team", "/admin"))
  assert.ok(canOpenAdminPage("content_team", "/admin/"))
  assert.ok(canOpenAdminPage("content_team", "/admin/change-password"))
  for (const p of ["/admin/growth", "/admin/growth/security", "/admin/growth/logs", "/admin/growth/founder",
    "/admin/growth/market-intelligence", "/admin/growth/platform-registry", "/admin/growth/agents/health-check",
    "/admin/growth/landing-pages", "/admin/system-health", "/admin/catalog-audit", "/admin/seo-pages",
    "/admin/visibility", "/admin/growthx"]) {
    assert.equal(canOpenAdminPage("content_team", p), false, p)
  }
})

test("content_team keeps its whole CMS scope after the Growth OS fix", () => {
  assert.deepEqual(visibleTabs(CONTENT_TEAM_LIVE).sort(), [
    "aboutUs", "accreditations", "banners", "blogs", "brochure", "caseStudies", "categories",
    "celebrityAssets", "certifications", "customers", "govKPIs", "govPastPerformance",
    "homepageContent", "homepageSections", "knowledge", "legalPages", "mediaLibrary", "migration",
    "productBadges", "products", "redirects", "reviews", "rfqPopup", "spareParts", "trustBadges",
    "videoPopup", "videos", "websiteSettings",
  ])
  assert.ok(canAccessAdminApi(CONTENT_TEAM_LIVE, "PUT", "/api/admin/about-page"))
  assert.ok(canAccessAdminApi(CONTENT_TEAM_LIVE, "POST", "/api/admin/blogs"))
})

test("seo_team is unchanged by the Growth OS fix (reads, pages, landing pages)", () => {
  assert.ok(canAccessAdminApi(SEO_TEAM_LIVE, "GET", "/api/admin/growth/dashboard"))
  assert.ok(canAccessAdminApi(SEO_TEAM_LIVE, "GET", "/api/admin/gsc/overview"))
  assert.equal(canAccessAdminApi(SEO_TEAM_LIVE, "POST", "/api/admin/growth/dashboard"), false)
  assert.ok(canAccessAdminApi(SEO_TEAM_LIVE, "GET", "/api/admin/landing-pages"))
  assert.equal(canAccessAdminApi(SEO_TEAM_LIVE, "PUT", "/api/admin/landing-pages/x"), false)
  assert.equal(canSeeGrowthOS(SEO_TEAM_LIVE), true)
  assert.equal(canSeeLandingPages(SEO_TEAM_LIVE), true)
  assert.ok(canOpenAdminPage("seo_team", "/admin/growth/seo"))
})
