# Pre-program SEO baseline (2026-10-08)

Captured from the LIVE site (https://www.100xcircle.com) before any Phase A change, per the SEO protection addendum, point 1.
Production was on commit 520dfd3 at the time of capture.

- `sitemap-urls.txt`: every `<loc>` in the live sitemap.xml (209 entries, 208 unique; `/gem-approved-fogging-machine-oem` is listed twice).
- `pre-program-baseline-2026-10-08.json`: one record per URL with status, redirect chain, final URL, canonical, meta robots, title, meta description, H1, H2 list, visible word count, JSON-LD types plus a sha256 prefix of each block, hreflang, internal link count, and the internal links themselves (href + anchor).
- `capture-baseline.mjs`: the script used (`node capture-baseline.mjs <outDir>`). Read-only GETs, concurrency 2.

Result at capture: 208/208 final 200, 0 redirects, every page has a canonical, exactly one H1 and JSON-LD, and none is noindex.
Pending from owner: Search Console exports (90 days) and the agency's protected pages and keywords list.
