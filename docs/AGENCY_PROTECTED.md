# Agency SEO evidence and protection rules (built from the agency's two reports, Sept-Oct 2026)

Sources: "Performance on search" (Google Search Console export, 1-28 Sep 2026) and "off page 100X Circle seo Report" (off-page work, keyword ranking as of 01-10-2026).

## What the reports show
- Search Console, 28 days: about 650 clicks, 33,000 impressions. Mobile 355 clicks, desktop 292, tablet 4. 288 pages and about 1,000 queries had impressions.
- Traffic is mostly INFORMATIONAL: the top pages are blog and knowledge articles (chemicals, best time for fogging, side effects, fumigation vs fogging). Commercial pages with clicks: home (70), /spare-parts (35), /gem-approved-fogging-machine-oem (34), TFS50 (25), /products (18), /fogging-machine-supplier-in-bihar (11).
- Brand and commercial queries that convert: "fogging machine on gem" (pos 3.3), "fogging machine in gem portal", "cold fog machine", "cold fogging machine", "agriculture fogging machine", "fogging machine manufacturer", "100x circle private limited", "pulse fogging machine", "gem authorization code provider".
- The agency keyword report lists 29 keywords, 22 shown at position 1 (their own checks); Search Console's average positions for the same terms are lower (e.g. "fogging machine" 4.8, "cold fogging machine" 14.7). Trust Search Console.
- Off-page work: about 264 submissions (bookmarking 57, classifieds 99, article 10, blog 78, directory 20, plus citations). Targets: home, /gem-approved-fogging-machine-oem, /products. Quality of these links is low (bookmarking, classified, directory and generic community sites). Do not remove anything; do not add more of this type.

## Rules for the overnight program (override the program)
1. Protected pages: protected_pages.csv. TIER A (31 pages): no change to title, meta description, H1, body copy, headings, URL, canonical or existing internal links. Allowed: fixes for factual numbers (years, states, models, response time), schema validity errors, typos that are plain spelling mistakes, and ADDITIVE blocks (below), all logged per URL.
   TIER B (63 pages): additive only; titles/meta only if the page is on the approved defect list.
2. AGRICULTURE CONTENT IS RANKING. The agency ranks for "agriculture fogging machine" and the pages /blog/how-agricultural-fogging-equipment-helps-protect-crops-and-farms-e17500, /knowledge/agricultural-fogging-guide, /compare/best-thermal-fogger-for-agriculture-india get clicks. Do NOT remove the words "agricultural" or "agriculture" from any title, meta, H1 or body on those pages or on /power-tiller. Step B5: only fix the site-wide default social tags (og/twitter) that say "Best ..." and make og:url correct; leave /products and agriculture pages' search titles and descriptions as they are.
3. Informational pages are the traffic. Add conversion without changing the ranking text: a closing "Get a quote / Get GeM authorization" block and a "Related products" block at the END of each Tier A and B blog/knowledge page (new component, below the article, no text above changed). Same block on /compare/*. Do not insert anything before the first content paragraph.
4. No change to /blog/* and /knowledge/* slugs, titles, H1s or body, including the chemicals, best-time, side-effects, fumigation, how-long articles.
5. Agency off-page links point to /, /products, /gem-approved-fogging-machine-oem and the maps link. Do not change, redirect or retitle these target URLs.
6. Keep the exact-match keyword areas that already rank at 1-5 (see top_queries.csv, agency_keywords.csv): do not rewrite sections that contain them.
7. No change to the homepage title, meta description or H1 tonight. Homepage may receive additive blocks only below the fold.
8. After the run, compare against Search Console after 7 and 14 days for the Tier A list.

## UPDATE: monthly reports (Aug and Sep 2026 compared)
- Search Console 28-day windows: 22 Jul-18 Aug = 538 clicks / 37,286 impressions; 1-28 Sep = 666 clicks / 37,284 impressions. Clicks up about 24% with flat impressions (better CTR/position). Mobile is the larger source in both.
- The August off-page report tracks 102 keywords (many commercial and local: "buy double barrel fogger online", "stainless steel fogger supplier in bihar", "cold fogging machine supplier in patna/gurgaon/up", "vehicle mounted fogging machine", "agricultural fogging equipment/spraying equipment"). The September report tracks only 29. Treat the UNION of all tracked keywords as protected (agency_keywords_union.csv).
- RULE: any URL that appears with impressions in ANY monthly Search Console report is protected. Use protected_pages_union.csv (Aug + Sep). The agency adds a new report each month: put every new export in F:\dev\100x-evidence\agency\ and re-run the union before any SEO change.
- Extra protected pages from August not in September's top list: /gem-oem-authorization, /gem-tender-support, /knowledge/mosquito-control-india (and the Bihar/UP/Gurgaon supplier pages if present). Never change their title, meta, H1 or body.
- Off-page link counts grew month to month (bookmarking 57 to 72, classified 99 to 119, article 10 to 30, directory 20 to 45, citations to 30). The targets are the home page, the GeM page, /products and the Google Maps link. Keep these URLs and their titles stable so the links keep their value.


## UPDATE 2: May-June and July reports added (all agency reports so far)
Search Console 28-day windows (each is a 28-day export, not a calendar month):
- 12 May - 8 Jun: 74 clicks, 9,036 impressions, 56 pages, 309 queries
- 22 Jul - 18 Aug: 518 clicks, 32,464 impressions, 255 pages, 957 queries
- 1 Sep - 28 Sep: 651 clicks, 33,046 impressions, 288 pages, 1,000 queries
(The 9 Jun - 21 Jul window is missing: ask the agency for it.)
Result: clicks rose about 8.8x from May-June to September; impressions about 3.7x; indexed-and-ranking pages 56 to 288. This growth is what the agency's blog, knowledge and off-page work produced. The site must not lose these rankings.
Off-page work counted per report (links submitted): July 63 keywords tracked, bookmarking 60, classified 56, article 50, blog 20; August 102 keywords, bookmarking 72, classified 119, article 30, blog 24, directory 45, citations 30; September-October 29 keywords, bookmarking 57, classified 99, article 10, blog 78, directory 20.
Protected lists now cover every window above: protected_pages_union.csv (38 Tier A, 93 Tier B, built from the maximum clicks/impressions in any window) and top_queries_union.csv (1,710 queries). Re-run the union whenever the agency sends a new report.

## UPDATE 3: all reports received so far (Dec 2025 - Sep 2026)
Search Console windows:
- 24 Dec 2025 - 23 Mar 2026 (92 days): 81 clicks, 2,516 impressions, 14 pages ranking
- 6 Feb - 5 May 2026 (89 days): 86 clicks, 3,245 impressions, 20 pages
- 12 May - 8 Jun: 74 clicks (28 days), 9,036 impressions, 56 pages
- 22 Jul - 18 Aug: 518 clicks, 32,464 impressions, 255 pages
- 1 Sep - 28 Sep: 651 clicks, 33,046 impressions, 288 pages
Before May the site earned roughly 25-30 clicks per 28 days on 14-20 ranking pages. September is about 20-25x that, on about 290 pages. The growth is recent and comes from the agency's content and link work, so the ranking pages are fragile and must not be edited casually.
Off-page reports received: April (25 keywords tracked), June (56), July (63), August (102), Sept-Oct (29). Links per report: bookmarking 40-72, classified 50-119, article 10-50, blog 20-78, plus profiles, PDF, directory and citation lists. Missing: Jan-Mar, May, and the 9 Jun-21 Jul Search Console window.
protected_pages_union.csv = 38 Tier A + 97 Tier B pages. top_queries_union.csv = 1,921 queries. agency_keywords_union.csv = 139 tracked keywords with their position per month.

## UPDATE 4: June-July window added (final count so far)
- 17 Jun - 14 Jul: 232 clicks, 20,787 impressions, 94 pages, 505 queries.
Timeline of 28-day windows: May 12-Jun 8 = 74 clicks; Jun 17-Jul 14 = 232; Jul 22-Aug 18 = 518; Sep 1-28 = 651. Clicks about doubled or tripled each step, so the site is still in a steep growth phase. Remaining gaps: 9-16 Jun, 15-21 Jul, 19-31 Aug, and anything after 28 Sep.
Totals now: protected_pages_union.csv = 40 Tier A + 103 Tier B pages; top_queries_union.csv = 2,078 queries; agency_keywords_union.csv = 139 keywords (April, June, July, August, Sept-Oct). One more July off-page file (64 keywords) was a variant of the existing July report.
