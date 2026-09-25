# SEO Team access reduction: PLAN (nothing applied)

Status: proposal for owner approval, 2026-09-25. No code or DB change has been made.

## Today
- 5 accounts hold role `seo_team` (agency). Live DB row (16 perms): dashboard.view, seo.view,
  analytics.view, geo.view, content.edit, blog.view/create/edit/publish/delete, products.view,
  landing_pages.view, seo.export, analytics.export, knowledge.view/edit.
- Because the role is in GROWTH_OS_ROLES and holds seo.view, it gets **GET on every route under
  /api/admin/growth/*, /gsc/*, /ga4/*** (about 117 routes) and can open **every /admin/growth page**.
  Most of those handlers have no permission check of their own, so this includes:
  CRM dealers + opportunities, dealer prospects, Google Ads (27 routes incl. customer-match exports),
  Revenue Director / founder / exec-summary / business-outcomes dashboards, lead scores,
  Growth dashboard (reads brochure leads, RFQ popup leads, contact-form submissions),
  market intelligence, GeM/fogging procurement data, logs, security/users/permissions pages.
- Writes on Growth OS are already closed (GET only). Cron routes now require CRON_SECRET (set today),
  so a logged-in SEO user can no longer trigger jobs.

## Proposed: SEO Team keeps only SEO work
Replace "all Growth OS reads" with an explicit SEO allowlist (default-deny for everything else).

### API (GET only, as today)
| Keep | Why |
|---|---|
| /api/admin/growth/seo/* (35 routes: recommendations, traffic monitor, offpage, content factory, workflow, risk score, page history, protected pages, impact report) | core SEO work |
| /api/admin/gsc/data | Search Console data |
| /api/admin/ga4/data | site traffic (see decision B) |
| /api/admin/growth/content, citations, citation-tasks, competitors, page-guidance/* | content + AI citation work |
| /api/admin/landing-pages (view, as today) | Landing Pages editor, view only |

Closed for SEO Team (everything else), notably: growth/crm, dealers, director, founder-v2,
exec-summary, business-outcomes, attribution, conversion-dashboard, daily-briefing, lead-scores,
market-intelligence, procurement, categories (GeM data), landing (reads dealer/contract data),
ads/* (all 27), dashboard (reads leads), opportunities*, logs, operations, reports, snapshots,
automation, audit, diagnostics, readiness, launch-status, changelog, execution, agents/*, cron/*,
gsc/oauth|sync|test, ga4/debug|properties|sync|test.

### Pages
- Allowed: /admin (their Blogs + Knowledge tabs), /admin/change-password, /admin/growth/seo and its
  subpages (execution, offpage, workflow, setup: view only), /admin/growth/content,
  /admin/growth/competitors, /admin/growth/geo, /admin/growth/analytics, /admin/growth/landing-pages.
- Every other /admin/growth page redirects to /admin/growth/seo.
- Growth OS sidebar: hide every item not in the list above for seo_team.

### Implementation (code, one commit)
- lib/rbac/access.ts: `GROWTH_OS_ALLOWLIST` per role (seo_team = the list above); canAccessAdminApi
  and canOpenAdminPage use it instead of the blanket prefix match.
- Growth OS sidebar mirrors the same list (single source, like the CMS tabs).
- Tests: every one of the ~117 Growth OS GET routes x all methods checked against the live seo_team
  row (allowed set exactly = the list); page allowlist; content_team unchanged; signed-token
  end-to-end on local `next start` as seo_team.
- Gate as usual (unit tests, tsc baseline 58, build, SEO snapshot 0 public diffs), rollback tag,
  deploy. Takes effect on existing sessions (role is in the token), no re-login needed.

## Decisions for the owner
A. Approve the keep-list above (or tell me what to add/remove, e.g. do they need Opportunities?).
B. GA4 traffic data (/ga4/data, /admin/growth/analytics): keep or close?
C. Optional DB row trim (separate from the code change; backup + audit entry as before):
   remove blog.delete, seo.export, analytics.export, content.edit, geo.view, products.view.
   None is needed for the keep-list except geo.view (only if the GEO page stays).
   Default: leave the row as is and do only the code change.

## Implementation status (resumed after crash, 2026-09-25 evening)
Owner decision: A approved, B = GA4 closed, C = DB row unchanged. Code committed locally, NOT deployed.
Allowlist adjusted from the table above after checking what the allowed pages actually call:
added GETs for agents/internal-link|schema-audit|ai-citation (stored results), gsc/sync (status),
gsc/oauth/status, snapshots?module=competitors only; /admin/growth/analytics page dropped (GA4 closed).
gsc/oauth/start and gsc/test stay closed (connecting GSC is admin setup).

| Gate | Result |
|---|---|
| Unit tests | 98 / 98 pass |
| Typecheck | 58 source errors = baseline; 0 in changed files (+80 stale .next/types) |
| Lint (changed files) | clean |
| `next build` | PASS |
| Signed-token e2e, local `next start` | 256 checks, 0 failures: seo_team GET open on exactly the allowlist and 403 on every other Growth OS/GSC/GA4 route, writes 403, snapshots competitors-only, page redirects to /admin/growth/seo or /admin; content_team 403 on all; super_admin not blocked |
| SEO snapshot | NOT OBTAINED. Local `next start` cannot connect to MongoDB (secureConnect timeout on first connect, then lib/mongodb.ts caches the rejected promise so every DB page 500s / falls back). A standalone node client with identical options connects in <0.5 s. Change is confined to /admin and /api/admin branches of middleware. |

Deploy held: SEO snapshot gate not met.
Side finding (not fixed): lib/mongodb.ts caches a rejected connect promise for the life of the process; a Vercel instance whose first connect times out keeps failing until recycled.
