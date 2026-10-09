# SEO_WATCHLIST

Draft 2026-10-09. Every URL whose indexed content was changed by the overnight program, with the Search Console (GSC) checks due at +7 and +14 days. Baselines are the maximum values over the agency windows in `F:/dev/100x-evidence/agency/protected_pages_union.csv` (clicks and impressions are the highest seen in any window, position is the best seen), not a single comparable period. "-" means the URL is not in that file, so no baseline exists here. Rollback tag: `rollback-pre-overnight-2026-10-08` -> d81aaed.

## How to do the check in Search Console

1. Open Search Console for https://www.100xcircle.com/ (or the Domain property) > Performance > Search results.
2. Set the date range: Custom > the 7 days (or 14 days) ending on the check date. For comparison, use the Compare tab with the same-length period immediately before the change date.
3. Add a filter: Page > "URL exactly" > paste the full URL (https://www.100xcircle.com + path). Turn on Clicks, Impressions, Average CTR and Average position.
4. Record clicks, impressions and position for the after-period and the before-period in the Result column. Also open the Queries tab for the page and note the top queries.
5. Indexing: paste the URL into the top "Inspect any URL" bar. Confirm "URL is on Google", the last crawl date is after the change date, and the crawled page shows the new text (View crawled page).
6. Do NOT use "Request indexing", do not resubmit, and do not change anything because of a small movement. Small dips of a few positions or low-volume clicks are normal noise. Only report a clear drop: for example clicks or impressions down by more than half versus the prior period, position worse by more than 3 for a page with real volume, or the page dropping out of the index. If found, report it to the owner; the fix is a revert of the specific commit/DB value, decided by the owner.
7. For pages with tiny volume (impressions under about 50 in a window), judge by the Indexing status and the top queries, not by clicks.

Result values to use: OK (no meaningful change), WATCH (small change, recheck later), DROP (clear loss, report), N/A (no data).

## Dates

Change date: 2026-10-09 for all rows below. +7 day check: 2026-10-16. +14 day check: 2026-10-23. (If a change went live on a different date, shift the check dates by the same amount.)

## Entries

| URL | What changed | Date live | Protected tier | GSC check +7 days | GSC check +14 days | Baseline clicks / impressions / position | Result |
|---|---|---|---|---|---|---|---|
| /about | Meta description only: "Founded 2014" -> "Founded 2020" (fact fix; title, H1 unchanged). Push 3, commit 64bb39e, logged in SEO_CHANGELOG | 2026-10-09 (push 3 deployed 06:46Z) | A | 2026-10-16 | 2026-10-23 | 0 / 126 / 1.9 | |
| /products/thermal-cold-fogging-machine-100xtfs50-90602f | Body only (DB typo fix): features.0.title "Therma & Cold fog" -> "Thermal & Cold fog". No title, meta or H1 change | 2026-10-09 | - | 2026-10-16 | 2026-10-23 | - | |
| /products/cold-fogger-machine-with-2-stoke-engine-100xmcf42-c42ca1 | Body only (DB typo fixes in detailedDescription and filmChapters.0.description). No title, meta or H1 change | 2026-10-09 | B | 2026-10-16 | 2026-10-23 | 1 / 62 / 7 | |
| /products/isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhm20-fcbbde | Body only: "corrossion" -> "corrosion" in features.1.value and filmChapters.0.title | 2026-10-09 | - | 2026-10-16 | 2026-10-23 | - | |
| /products/isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhbl22-c-ea7f75 | Body only: "corrossion" -> "corrosion" in features.1.value | 2026-10-09 | A | 2026-10-16 | 2026-10-23 | 5 / 230 / 4.5 | |
| /products/double-barrel-thermal-fogging-machine-vehicle-mounted | Body only: specifications.15.label "Techology" -> "Technology"; filmChapters.0.description typo fix | 2026-10-09 | - | 2026-10-16 | 2026-10-23 | - | |
| /products/100xulvss10-5e46c5 | Body only: whatsappMessageText "(0Please mention..." -> "(Please mention..." | 2026-10-09 | - | 2026-10-16 | 2026-10-23 | - | |
| /spare-parts/double-barrel-thermal-fogging-machine-vehicle-mounted/fuel-filet | Part name typo "Fuel Filet" -> "Fuel Filter" (affects page title and H1). URL slug unchanged | 2026-10-09 | - | 2026-10-16 | 2026-10-23 | - (related query "fogging machine spare parts": 14 clicks / 29 impr / best pos 8.35, site-wide) | |
| /spare-parts/isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhm20-fcbbde/diphragm | Part name and category "Diphragm" -> "Diaphragm" (title and H1). Slug unchanged | 2026-10-09 | - | 2026-10-16 | 2026-10-23 | - | |
| /spare-parts/thermal-cold-fogging-machine-100xtfs50-90602f/diphragm | Same name/category fix "Diphragm" -> "Diaphragm". Slug unchanged | 2026-10-09 | - | 2026-10-16 | 2026-10-23 | - | |
| /spare-parts/thermal-fogging-machine-with-stainless-steel-tank-100xssma20-1b5dd8/diphragm | Same name/category fix "Diphragm" -> "Diaphragm". Slug unchanged | 2026-10-09 | - | 2026-10-16 | 2026-10-23 | - | |
| /spare-parts/isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhbl22-c-ea7f75/geen-washer-for-combustion-tube | Part name typo "Geen Washer" -> "Green Washer" (title and H1). Slug unchanged | 2026-10-09 | - | 2026-10-16 | 2026-10-23 | - | |
| /spare-parts/isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhm20-fcbbde/geen-washer-for-combustion-tube | Same "Geen Washer" -> "Green Washer" fix. Slug unchanged | 2026-10-09 | - | 2026-10-16 | 2026-10-23 | - | |
| /spare-parts/thermal-cold-fogging-machine-100xtfs50-90602f/geen-washer-for-combustion-tube | Same "Geen Washer" -> "Green Washer" fix. Slug unchanged | 2026-10-09 | - | 2026-10-16 | 2026-10-23 | - | |
| /spare-parts/thermal-fogging-machine-with-stainless-steel-tank-100xssma20-1b5dd8/geen-washer-for-combustion-tube | Same "Geen Washer" -> "Green Washer" fix. Slug unchanged | 2026-10-09 | - | 2026-10-16 | 2026-10-23 | - | |

### Notes on this table

- A9 source of truth: `F:/dev/100x-evidence/overnight-2026-10-08/a9/db-changes-2026-10-09.json` holds the exact old and new values (13 DB field changes, applied 2026-10-09 ~06:59Z). The change is reversible by writing the old values back. The 14-line `a9/urls.txt` URL list was used here; the spare-part rows were mapped from the changed spare_parts records (name/category) and their compatible products. Whether a given spare-part page title is rendered from the name field: UNKNOWN until checked on the live page; verify with "View crawled page" in the URL Inspection.
- The vehicle-mounted product and the HM20 product have the same DB-change set recorded; per-page differences were taken from the change log only. Exactly which spare-part pages a changed part appears under (the 7 spare URLs above) comes from `urls.txt`.
- Only the /about meta change touches a protected (Tier A) title/meta/H1 element, and it was an approved fact fix. HBL22 (Tier A) and MCF42 (Tier B) were body-only.
- Slugs, redirects, JSON-LD types, robots and sitemap were not changed by these edits.
- Baseline caveat: the numbers are maxima over different windows; use them only to see the order of magnitude. Take a fresh before/after from GSC at check time.

## Batch 4/5 URLs (to be appended)

Append rows here in the same format as the table above as Phase B batches ship (title/meta changes: at most 12 URLs per deploy, 24 per night). For each row fill: URL, what changed (old -> new text), date live, protected tier (look up the path in protected_pages_union.csv, else "-"), the two check dates (date live + 7 and + 14 days), and the baseline from protected_pages_union.csv / top_queries_union.csv if present.

| URL | What changed | Date live | Protected tier | GSC check +7 days | GSC check +14 days | Baseline clicks / impressions / position | Result |
|---|---|---|---|---|---|---|---|
| (none yet) | | | | | | | |
