# AGENCY-PROTECTED SURFACE (read-only except for the approved defect fixes)

Built 2026-10-08 from `git log` (authors other than the owner/maintainer accounts) plus the guardrail addendum. `F:/dev/100x-evidence/agency/` did not exist when this was built, so the hub pages below are **assumed protected, awaiting the agency list**.

## Files with agency commits

| Author | Commits (examples) | Files |
|---|---|---|
| Hassan010103 | "SEO" (38cfead, 218641c, 2025-11-10), "added meta tags" (c6e281c), 100XDB400 permanent redirect (842c961), blog fixes | `app/layout.tsx`, `app/page.tsx`, `app/products/[id]/page.tsx`, `components/Footer.tsx`, `next.config.mjs` (redirects), `public/robots.txt`, `public/sitemap.xml`, `lib/rich-text.ts`, `components/admin/AdminRichTextEditor.tsx`, `app/admin/page.tsx` |
| Bhargesh Varsani | "Added SEO slug routing for product pages" (596123f), favicon (2990428) | `app/[slug]/page.tsx`, `app/[slug]/ProductPage.tsx`, `app/api/admin/[slug]/route.ts`, `components/ProductCard.tsx`, `lib/mongodb.ts`, `index.html` |
| Kanik Chawla | GA tag G-7EXHP2B0SD on all pages (ddac9f2) | `app/layout.tsx`, static `*.html` |

Some of these paths have since moved (e.g. `app/(site)/...`, `app/[locale]/[slug]/...`). The protected things are what they did: product slug routing, redirects, robots rules, the sitemap entries, meta tags, the GA/GTM tags and the favicon.

## Protected without exception

- All URLs, slugs, redirects (301/308), canonicals, locale routes and existing sitemap entries. Only two sitemap edits are allowed: removing the duplicate `/gem-approved-fogging-machine-oem` line and adding case-study detail URLs.
- Existing robots.txt rules. Additions that repeat the existing disallows for named bot groups are allowed (B7); nothing is removed.
- GA / GTM / Ads tags, verification files and meta tags, security headers.
- The hidden footer keyword block (`SiteFooter.tsx`): unchanged.
- Existing internal links and their anchor texts: add only.

## Assumed protected (no title / meta / H1 change tonight)

`/`, `/products`, `/gem-approved-fogging-machine-oem`, `/past-performance-government`, `/case-studies`, `/spare-parts`, `/knowledge`, `/blog`.
Only error-class fixes are allowed on these (wrong schema, factual number fixes, the "Best ..." OG/Twitter default, og:url pointing to the homepage).
