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

## Batch 4/5 URLs (push 4, c750188, live 2026-10-09 ~11:55Z)

Append rows here in the same format as the table above as Phase B batches ship (title/meta changes: at most 12 URLs per deploy, 24 per night). For each row fill: URL, what changed (old -> new text), date live, protected tier (look up the path in protected_pages_union.csv, else "-"), the two check dates (date live + 7 and + 14 days), and the baseline from protected_pages_union.csv / top_queries_union.csv if present.

| URL | What changed | Date live | Protected tier | GSC check +7 days | GSC check +14 days | Baseline clicks / impressions / position | Result |
|---|---|---|---|---|---|---|---|
| / | words 2555->2814 | 2026-10-09 (push 4, c750188) | A | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /become-a-dealer | +H2 "More frequently asked questions"; words 1161->1430 | 2026-10-09 (push 4, c750188) | B | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /case-studies/Nagar-Nigam-Muzaffarpur-Bihar-mosquito-control-program | Now listed in sitemap.xml (B6, f0586c1); page itself existed before and was not changed by this row | 2026-10-09 (push 4, c750188) | - | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /case-studies/defence-central-reserve-police-force-crpf-kerala | Now listed in sitemap.xml (B6, f0586c1); page itself existed before and was not changed by this row | 2026-10-09 (push 4, c750188) | B | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /case-studies/defence-indian-army-164-military-hospital-binnaguri-west-bengal | Now listed in sitemap.xml (B6, f0586c1); page itself existed before and was not changed by this row | 2026-10-09 (push 4, c750188) | B | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /case-studies/defence-indian-army-college-of-military-engineering-pune-maharashtra | Now listed in sitemap.xml (B6, f0586c1); page itself existed before and was not changed by this row | 2026-10-09 (push 4, c750188) | - | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /case-studies/defence-indian-army-hisar-military-station-haryana | Now listed in sitemap.xml (B6, f0586c1); page itself existed before and was not changed by this row | 2026-10-09 (push 4, c750188) | B | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /case-studies/defence-national-security-guard-nsg-haryana | Now listed in sitemap.xml (B6, f0586c1); page itself existed before and was not changed by this row | 2026-10-09 (push 4, c750188) | - | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /case-studies/municipal-public-health-deoghar-municipal-corporation-jharkhand | Now listed in sitemap.xml (B6, f0586c1); page itself existed before and was not changed by this row | 2026-10-09 (push 4, c750188) | - | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /case-studies/municipal-public-health-nagar-nigam-muzaffarpur-bihar | Now listed in sitemap.xml (B6, f0586c1); page itself existed before and was not changed by this row | 2026-10-09 (push 4, c750188) | - | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /case-studies/municipal-public-health-nagar-palika-parishad-gulaothi-uttar-pradesh | Now listed in sitemap.xml (B6, f0586c1); page itself existed before and was not changed by this row | 2026-10-09 (push 4, c750188) | - | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /case-studies/municipal-public-health-nagar-palika-uttarakhand | Now listed in sitemap.xml (B6, f0586c1); page itself existed before and was not changed by this row | 2026-10-09 (push 4, c750188) | - | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /case-studies/municipal-public-health-nagar-panchayat-barun-bihar | Now listed in sitemap.xml (B6, f0586c1); page itself existed before and was not changed by this row | 2026-10-09 (push 4, c750188) | - | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /case-studies/municipal-public-health-nagar-panchayat-gokul-mathura-uttar-pradesh | Now listed in sitemap.xml (B6, f0586c1); page itself existed before and was not changed by this row | 2026-10-09 (push 4, c750188) | - | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /case-studies/municipal-public-health-nagar-panchayat-mahavan-uttar-pradesh | Now listed in sitemap.xml (B6, f0586c1); page itself existed before and was not changed by this row | 2026-10-09 (push 4, c750188) | - | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /case-studies/municipal-public-health-nagar-panchayat-mawana-uttar-pradesh | Now listed in sitemap.xml (B6, f0586c1); page itself existed before and was not changed by this row | 2026-10-09 (push 4, c750188) | - | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /case-studies/municipal-public-health-nagar-panchayat-sahanpur-uttar-pradesh | Now listed in sitemap.xml (B6, f0586c1); page itself existed before and was not changed by this row | 2026-10-09 (push 4, c750188) | - | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /case-studies/municipal-public-health-rajkot-district-panchayat-gujarat | Now listed in sitemap.xml (B6, f0586c1); page itself existed before and was not changed by this row | 2026-10-09 (push 4, c750188) | B | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /case-studies/municipal-public-health-rewari-district-panchayats-haryana | Now listed in sitemap.xml (B6, f0586c1); page itself existed before and was not changed by this row | 2026-10-09 (push 4, c750188) | - | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /case-studies/municipal-public-health-urban-development-directorate-uttarakhand | Now listed in sitemap.xml (B6, f0586c1); page itself existed before and was not changed by this row | 2026-10-09 (push 4, c750188) | - | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /case-studies/public-sector-jammu-and-kashmir-state-pollution-control-board-jkspcb-jammu-kashm | Now listed in sitemap.xml (B6, f0586c1); page itself existed before and was not changed by this row | 2026-10-09 (push 4, c750188) | B | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /case-studies/public-sector-power-grid-corporation-of-india-limited-400kv-bhiwadi-rajasthan | Now listed in sitemap.xml (B6, f0586c1); page itself existed before and was not changed by this row | 2026-10-09 (push 4, c750188) | - | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /case-studies/public-sector-power-grid-corporation-of-india-limited-rajasthan | Now listed in sitemap.xml (B6, f0586c1); page itself existed before and was not changed by this row | 2026-10-09 (push 4, c750188) | - | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /case-studies/state-health-department-chief-medical-officer-solan-himachal-pradesh | Now listed in sitemap.xml (B6, f0586c1); page itself existed before and was not changed by this row | 2026-10-09 (push 4, c750188) | - | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /case-studies/state-health-department-medical-health-and-family-welfare-department-up-etawah-u | Now listed in sitemap.xml (B6, f0586c1); page itself existed before and was not changed by this row | 2026-10-09 (push 4, c750188) | - | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /case-studies/state-health-department-medical-health-and-family-welfare-department-up-uttar-pr | Now listed in sitemap.xml (B6, f0586c1); page itself existed before and was not changed by this row | 2026-10-09 (push 4, c750188) | - | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400 | title "Buy Double Barrel Thermal Fogging Machine | 100x Circle" -> "Buy Double Barrel Thermal Fogging Machine 100XDB400 | 100X"; +H2 "Related case studies"; links 116->121; words 1315->1412 | 2026-10-09 (push 4, c750188) | B | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /fogging-machine-delivery-inspection-checklist | NEW page (E5, c4fd89a); was 404 before | 2026-10-09 (push 4, c750188) | - | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /fogging-machine-for-nagar-panchayat | +H2 "Frequently asked questions"; words 773->970 | 2026-10-09 (push 4, c750188) | B | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /fogging-machine-government-procurement | +H2 "More frequently asked questions"; links 151->152; words 4067->4471 | 2026-10-09 (push 4, c750188) | B | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /fogging-machine-tender-specification-checklist | NEW page (E5, c4fd89a); was 404 before | 2026-10-09 (push 4, c750188) | - | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /gem-approved-fogging-machine-oem | links 114->115; words 1668->1741 | 2026-10-09 (push 4, c750188) | A | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /gem-oem-authorization | +H2 "More frequently asked questions"; words 1409->1720 | 2026-10-09 (push 4, c750188) | A | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /gem-reverse-auction-fogging | +H2 "More frequently asked questions"; words 1172->1361 | 2026-10-09 (push 4, c750188) | - | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /gem-tender-support | +H2 "More frequently asked questions"; words 1309->1521 | 2026-10-09 (push 4, c750188) | A | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /is-14855-fogging-machine | +H2 "More frequently asked questions"; links 116->117; words 1455->1786 | 2026-10-09 (push 4, c750188) | B | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /knowledge/agricultural-fogging-guide | +H2 "More frequently asked questions", "Related products"; links 117->120; words 1082->1319 | 2026-10-09 (push 4, c750188) | A | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /knowledge/dengue-prevention-thermal-fogging | +H2 "More frequently asked questions", "Related products and case studies"; links 122->126; words 1299->1637 | 2026-10-09 (push 4, c750188) | B | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /knowledge/fogging-machine-maintenance-guide | +H2 "More frequently asked questions", "Related products and case studies"; links 117->121; words 1215->1539 | 2026-10-09 (push 4, c750188) | A | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /knowledge/fogging-machine-operators-guide | +H2 "More frequently asked questions", "Related products and case studies"; links 120->124; words 1868->2355 | 2026-10-09 (push 4, c750188) | B | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /knowledge/fogging-machine-safety-guide | +H2 "More frequently asked questions", "Related products and case studies"; links 117->121; words 1089->1296 | 2026-10-09 (push 4, c750188) | B | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /knowledge/how-to-choose-fogging-machine | +H2 "More frequently asked questions", "Related products and case studies"; links 125->129; words 1520->1846 | 2026-10-09 (push 4, c750188) | B | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /knowledge/malaria-control-fogging-india | +H2 "More frequently asked questions", "Related products and case studies"; links 122->126; words 1471->1815 | 2026-10-09 (push 4, c750188) | - | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /knowledge/thermal-fogging-chemicals-guide | +H2 "More frequently asked questions", "Related products and case studies"; links 119->123; words 1407->1828 | 2026-10-09 (push 4, c750188) | A | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /make-in-india-fogging-machine | +H2 "Frequently asked questions"; words 1057->1254 | 2026-10-09 (push 4, c750188) | - | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /municipal-fogging-programme | +H2 "More frequently asked questions"; words 1334->1566 | 2026-10-09 (push 4, c750188) | - | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /nvbdcp-fogging-machine | +H2 "More frequently asked questions"; words 1342->1510 | 2026-10-09 (push 4, c750188) | B | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /products | words 1161->1229 | 2026-10-09 (push 4, c750188) | A | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /products/100xulvss10-5e46c5 | title "100XULVSS10 | 100x Circle" -> "ULV Electric Cold Fogger 100XULVSS10 | 100x Circle"; meta description rewritten (B4); +H2 "Related case studies"; links 114->117; words 937->1019 | 2026-10-09 (push 4, c750188) | - | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /products/cold-fogger-machine-with-2-stoke-engine-100xmcf42-c42ca1 | title "Cold fogger machine with 2 stoke engine | India Manufacturer | 100X" -> "Cold Fogger Machine with 2 Stroke Engine 100XMCF42 | 100X"; meta description rewritten (B4); +H2 "Related case studies"; links 118->121; words 1270->1353 | 2026-10-09 (push 4, c750188) | B | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /products/isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhbl22-c-ea7f75 | title "ISI marked Thermal Fogging Machine with HDPE Tanks | India Manufacturer | 100X" -> "ISI Marked Thermal Fogging Machine HDPE Tank 100XHBL22 | 100X"; meta description rewritten (B4); +H2 "Related case studies"; links 116->121; words 1420->1525 | 2026-10-09 (push 4, c750188) | A | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /products/isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhm20-fcbbde | title "ISI marked Thermal Fogging Machine with HDPE Tanks | India Manufacturer | 100X" -> "ISI Marked Thermal Fogging Machine HDPE Tank 100XHM20 | 100X"; meta description rewritten (B4); +H2 "Related case studies"; links 120->125; words 1493->1601 | 2026-10-09 (push 4, c750188) | - | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /products/mini-fogger-100xbf102-2d9887 | +H2 "Related case studies"; links 116->121; words 1061->1167 | 2026-10-09 (push 4, c750188) | B | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /products/passenger-baggage-trolleys-stainless-steel-with-brakes-100xats | title "Passenger Baggage Trolleys Stainless | India Manufacturer | 100X" -> "Passenger Baggage Trolleys Stainless Steel 100XATS | 100X"; meta description rewritten (B4); words 766->765 | 2026-10-09 (push 4, c750188) | - | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /products/ulv-cold-fogger-machine-100xmcf42-copy-8dcd42lvlv | title "ULV Cold fogger machine wi | India Manufacturer | 100X" -> "ULV Cold Fogger Machine 100XULV22 | India Manufacturer | 100X"; +H2 "Related case studies"; links 114->117; words 1129->1214 | 2026-10-09 (push 4, c750188) | B | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /public-health-equipment | +H2 "More frequently asked questions"; words 1228->1445 | 2026-10-09 (push 4, c750188) | B | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /spare-parts | +H2 "Diaphragm"; -H2 "Diphragm" | 2026-10-09 (push 4, c750188) | A | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /thermal-and-cold-fogging-machine-100xtfs50 | +H2 "Related case studies"; links 116->121; words 1564->1672 | 2026-10-09 (push 4, c750188) | A | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /thermal-fogging-machine-with-stainless-steel-tank-100xssma20 | title "Buy Stainless Steel Tank Thermal Fogger | 100x Circle" -> "Buy Stainless Steel Tank Thermal Fogger 100XSSMA20 | 100X"; +H2 "Related case studies"; links 116->121; words 1281->1378 | 2026-10-09 (push 4, c750188) | B | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /thermal-vs-cold-fogging-machine | links 120->121; words 1076->1143 | 2026-10-09 (push 4, c750188) | A | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /vector-control-equipment | +H2 "More frequently asked questions"; words 1168->1360 | 2026-10-09 (push 4, c750188) | - | 2026-10-16 | 2026-10-23 | see agency baseline | |
| /robots.txt | B7 (dfbc6f1): each named bot group now repeats the generic Disallow lines (/admin/, /api/submissions, /api/brochure, thank-you pages, utm/fbclid/gclid/msclkid parameters). Existing rules unchanged; AI bots still allowed | 2026-10-09 (push 4, c750188) | - | 2026-10-16 (GSC > Settings > robots.txt report: fetched OK, no errors) | 2026-10-23 | - | |
| /sitemap.xml | B6 + E5: +24 case-study detail URLs, +2 E5 guides; duplicate /gem-approved-fogging-machine-oem row removed (page still listed once) | 2026-10-09 (push 4, c750188) | - | 2026-10-16 (GSC > Sitemaps: status Success, discovered URL count up by ~25) | 2026-10-23 | - | |
| /llms.txt | E1 (bc27c0d, 701ec2e): rewritten from the live catalogue + FACTS.md; every published claim kept; founding year 2014 -> 2020; 5 dead/redirected product URLs removed | 2026-10-09 (push 4, c750188) | - | n/a (not in GSC) | n/a | - | |
| /api/ai/knowledge | E2 (7bf82b0): per-item dates, product/FAQ coverage, canonical marking | 2026-10-09 (push 4, c750188) | - | n/a | n/a | - | |
| (site-wide default og:title/twitter:title) | B5 (7e04270): "Best Thermal Fogging Machine Manufacturer \| 100x Circle" -> "Thermal Fogging Machine Manufacturer in India \| 100x Circle" on pages without their own social title. Not the <title> | 2026-10-09 (push 4, c750188) | - | n/a (social only) | n/a | - | |


## B10 performance (push 5)

No SEO-surface change (image delivery and preload only). Watch Core Web Vitals in GSC > Experience > Core Web Vitals on 2026-10-23 and 2026-11-06 (field data needs ~28 days): mobile LCP for /, product pages and /gem-approved-fogging-machine-oem. Lighthouse before/after: evidence b10/.
