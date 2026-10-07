# Vercel fair-use fix — Phase 1: route-group split (2026-10-07)

Branch: `fix/vercel-cpu-usage`. Scope was narrowed mid-task by the owner to the
route-group split only (crons, bots, image work, admin polling and most API
caching are listed under Follow-ups).

## Problem

Hobby fair-use pause: Fluid Active CPU 4h14m / 4h, 163K function invocations,
171K CDN requests per 30 days; ~95% of requests ran a function.

## Root cause (confirmed)

`app/layout.tsx` (the single root layout) called `await headers()` to tell
admin and locale-managed requests apart. In Next 15 a request-time API in the
root layout opts **every** route into dynamic rendering, so all page-level
`revalidate` exports were ignored.

Baseline build (`build-before.log`, `prerender-manifest-before.json`):

- 9 prerendered routes in the whole app, all of them API/metadata routes
  (`/api/video-popup`, `/api/site-settings`, `/robots.txt`, …).
- Every HTML page was `ƒ Dynamic`, including `/`, `/about`, the policy pages,
  the 14 landing pages and `/knowledge/*`.
- Routes shown as `● SSG` in the table (`/[locale]/blog`, `/knowledge/[slug]`,
  `/compare/[slug]`) were **not** in the prerender manifest — they were
  rendered per request too.
- `next start` served `/about` with
  `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`.

On top of the HTML render, every public page view fires three client-side API
calls (`/api/seo/page-overrides?path=…`, `/api/video-popup`,
`/api/rfq-popup/config`); the last two were already ISR-cached, the first was
`force-dynamic` with no `s-maxage`.

## Fix

Three root layouts, chosen by route group instead of by request header:

| Group | Root layout | `<html>` | Pages |
|---|---|---|---|
| `app/(site)/` | `app/(site)/layout.tsx` | `lang="en-IN"`, no `dir` | every public page outside `[locale]` (47 entries moved with `git mv`, URLs unchanged) |
| `app/[locale]/` | `app/[locale]/layout.tsx` (now a root layout) | `lang={locale} dir=ltr/rtl` | the 9 locale-managed slugs + blog |
| `app/(admin)/` | `app/(admin)/layout.tsx` | bare `<html><body>` | `/admin/*` (moved to `app/(admin)/admin/`) |

- The public `<html>…</html>` markup (GTM/GA4 tags, preloads, Navbar, Footer,
  popups, next-intl provider) moved verbatim into
  `components/layout/SiteShell.tsx`; `generateMetadata`/`viewport` moved
  verbatim into `lib/seo/root-metadata.ts`; the Inter font into `lib/fonts.ts`
  (next/font hashes the generated CSS, so the class name is unchanged).
- next-intl: `setRequestLocale()` is called in both public root layouts before
  `getMessages()`, so next-intl never falls back to reading request headers.
  (`SiteFooter` already passes an explicit locale to `getTranslations`.)
- 404 handling: with multiple root layouts there is no `app/not-found.tsx`.
  `app/(site)/not-found.tsx`, `app/[locale]/not-found.tsx` and
  `app/(admin)/not-found.tsx` render the same content; `app/(site)/[...notFound]`
  routes unmatched URLs into the public shell with a real 404; the invalid-locale
  `notFound()` moved from the (now root) `[locale]` layout into the nested
  `[slug]` and `blog` layouts.
- On-demand ISR for dynamic segments: `products/[id]`, `[locale]/[slug]`,
  `[locale]/blog/[slug]`, `case-studies/[slug]`, `spare-parts/[product]`,
  `spare-parts/[product]/[part]` export an empty `generateStaticParams`
  (without it Next renders a dynamic segment per request even with
  `revalidate` set — verified with `next start`).
- `products/[id]`: `force-dynamic` + `cookies()` removed (`revalidate = 300`).
  Trade-off: the cookie-based admin preview of **draft** products at the public
  URL is gone (drafts 404 for everyone). No admin UI linked to it.
- `ai/product-catalog`: `force-dynamic` → `revalidate = 300`.
- Two API cache headers (small, already applied before the scope change, kept):
  `/api/seo/page-overrides` adds `s-maxage=300, stale-while-revalidate=3600`;
  `/api/redirects/active` `no-store` → `s-maxage=300, stale-while-revalidate=600`.
  Worst-case delay for a new manual redirect: 5 min CDN + 1 min middleware TTL.

## Verification

### Build route table (`build-after.log`, `prerender-manifest-after.json`)

| | before | after |
|---|---|---|
| Prerendered routes in manifest (non-API, non-admin) | 9 (0 HTML pages) | 146 |
| Public page rows `○ Static` | 0 | 62 |
| Public page rows `● SSG/ISR` (dynamic segments with `generateStaticParams`) | 3 (not actually in manifest) | 9 |
| Public page rows `ƒ Dynamic` | ~70 | 4: `/[...notFound]` (404 catch-all), `/preview/product-v2`, `/preview/product-v2/compare`, `/thank-you` (reads `?type=`) |

Admin: `/admin/*` is forced dynamic (as before). Public API routes are unchanged
except the two cache headers above.

Effective revalidate on public pages is **60 s**, not 300: the root layouts'
`unstable_cache` reads (`lib/layoutData.ts`, `LAYOUT_DATA_REVALIDATE_SECONDS`)
are the lowest value in the tree and Next takes the minimum. Admin saves that
call `revalidateTag`/`revalidatePath` still take effect immediately.

### Runtime cache probes (`next start`, `cache-probes-after.txt`)

- Static pages: `Cache-Control: s-maxage=60, stale-while-revalidate=…`,
  `x-nextjs-cache: HIT/STALE` (before: `private, no-cache, no-store`).
- On-demand ISR: `/products/<slug>`, `/blog/<slug>`,
  `/thermal-and-cold-fogging-machine-100xtfs50`, `/hi/<slug>` → `MISS` on
  first request, `HIT` on the second.
- 404s under dynamic segments (`/products/no-such-product`,
  `/hi/<untranslatable product>`) are cached too (`MISS` → `HIT`, status 404).
- Unknown single-segment URLs (`/[...notFound]`) stay dynamic, as before.

### SEO snapshot (`seo-snapshot-{before,after}.json`, `seo-snapshot-diff.txt`)

`node scripts/seo-snapshot.mjs diff` over all 215 sitemap + extra URLs:
**0 pages only-before, 0 only-after, 0 changed** (status, redirect chain,
canonical, robots, hreflang, title, meta description, H1, H2 count, internal
link count, JSON-LD hashes per @type).

### 58-URL HTML/header diff (`scripts/html-dump.mjs`, `html-diff.txt`)

61 fetches (58 URLs + 7 redirect probes), raw body + headers, baseline vs new
build, comparing status, Location, `X-Robots-Tag`, `<html>` attributes, the
full set of `<title>/<meta>/<link>`/JSON-LD tags (build hashes normalised),
and the multiset of visible words.

- All 7 redirect probes: same status and Location.
- `/sitemap.xml`, `/api/merchant/products.xml`: identical after timestamp
  normalisation; `/robots.txt`, `/manifest.webmanifest`, `/llms.txt`: identical.
- All sample pages: same `<html lang/dir/class>`, same tag set, same words.
  Expected, non-SEO differences: `Cache-Control` (now cacheable); the HTTP
  `Link: …; rel=preload` early-hint header is dynamic-only, the same preloads
  are `<link>` tags in the prerendered HTML; the streamed baseline also
  contained `loading.tsx`'s "Loading…" fallback text; route metadata
  (canonical, hreflang, og:*) sat in the body of the streamed baseline and is
  in `<head>` now (React hoists it on the client either way).
- One behavioural difference, 404s: unknown single-segment URLs
  (`/this-url-does-not-exist`) used to get the styled 404 inside the public
  shell; now Next's bare 404 shell is served and the styled content renders
  client-side (status is 404 either way). Two-segment unknown URLs
  (`/foo/bar`, `/zz/blog`) already behaved this way before the change.
  Follow-up: a nested layout + `not-found` one level below the root group
  should restore the server-rendered shell; needs a build to verify.

### Admin / forms smoke (against `next start`)

- `/admin` and `/admin/growth/seo` without a session → 307 to `/admin/login`
  (middleware unchanged; the SEO-team confinement code and its 52 unit tests
  are untouched and pass).
- `/admin/login` renders server-side with the sign-in form; `/admin/*` is
  `force-dynamic` via `app/(admin)/layout.tsx`, as it effectively was before.
- `/api/admin/products` without a cookie → 401; bad credentials → 401.
- `POST /api/rfq-submit {}` → 400 (validation reachable).
- `POST /api/submissions {}` → **201**. This smoke request was a mistake on my
  part: it inserted one empty submission document into the production
  database (`.env.local` points at it) at roughly 2026-10-07 17:05 IST. I did
  not delete it (no DB writes by rule); please remove it from the admin
  Submissions tab.
- Typecheck of the touched files is clean (`tsc --noEmit`, filtered).

### Not verified

- Vercel Usage per route/function, Firewall/bot traffic, cron CPU: the Vercel
  CLI is installed but not logged in (`vercel whoami` → Not authorized).
- Draft-product count (to size the removed admin-preview feature): a
  read-only production DB query was blocked by the session's permission policy.
- Real CDN hit ratio: only measurable after deploy (see "What to check").

## What to check in Vercel after deploy

- Usage → Fluid Active CPU by route: `/`, landing pages, `/products/[id]`,
  `/[locale]/[slug]` should nearly vanish; what remains should be `/api/*`
  POSTs, `/api/seo/page-overrides` (now ≤1 run per path per 5 min per
  region), crons and `/[...notFound]`.
- Usage → Function invocations/day: expect a drop from ~5.4K/day to a low
  four-digit number (3 client API calls per page view remain; two of them are
  ISR-cached, the third is now CDN-cached).
- Usage → Edge requests with `x-vercel-cache: HIT/STALE` (CDN cache hit
  ratio) on HTML responses: should go from ~0% to the large majority.
- Logs filtered by Function: no 5xx on `/[locale]/[slug]`, `/products/[id]`;
  confirm `x-nextjs-cache`/`x-vercel-cache` HIT on a second request.
- Spot-check after deploy: `/`, a product page, `/blog/<slug>`,
  `/thermal-and-cold-fogging-machine-100xtfs50`, `/hi/fogging-machine-supplier-in-bihar`,
  `/admin/login`, `/contact-us` form, RFQ popup.

## Follow-ups (parked by the owner's scope change; see Phase 2 brief)

1. `/api/i18n/available-locales`, `/api/spare-parts`,
   `/api/case-studies/by-product`: add `s-maxage` (prepared, not applied).
2. `middleware.ts` `REDIRECT_CACHE_TTL_MS` 60 s → 5–10 min (prepared, not applied).
3. Admin pollers (`growth/layout.tsx` heartbeat 5 min, `launch/page.tsx` 60 s,
   `founder/page.tsx` 90 s): skip while `document.hidden`, slow the intervals
   (prepared, not applied).
4. Cron CPU per job (8 schedules in `vercel.json`) — measure in Vercel Usage;
   ask before changing any schedule.
5. Crawler load / rate limits — Vercel Firewall review; ask first.
6. Styled server-rendered 404 shell for unknown URLs (see above).
7. `/api/fogging/*` GET routes are public and uncached (not in robots
   disallow) — worth an auth or cache decision; out of scope here.
8. `lib/mongodb.ts` + `tests/unit/mongodb-client.test.mjs`: an uncommitted
   change (retry a failed connect instead of caching the rejection) was
   already on this branch before this work; left uncommitted, not reviewed here.
9. The removed cookie-based admin preview of draft products at
   `/products/<slug>`: re-add via a dedicated dynamic preview route if wanted.
