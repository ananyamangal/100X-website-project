# DB fact fixes (to be applied by a separate, logged, reversible script)

Wrong facts that live in the MongoDB database, not in code. Field paths are best guesses from reading how each collection is rendered; the script must locate each value by matching the CURRENT text (and log old value, new value, `_id`, timestamp so every change can be rolled back). Nothing here has been applied. Values come from `docs/FACTS.md`. "Current" comes from `F:/dev/100x-evidence/program-phase0/PHASE0.md` (live text of 2026-10-08) and from the seed in `app/api/admin/seed-homepage/route.ts` (the live rows were edited after seeding, so match on current live text, not the seed).

Code already ignores or overrides some of these (marked CODE-GUARDED), so the DB value no longer shows on the site, but the stale value should still be corrected so admin screens and any other consumer agree.

## 1. `homepage_sections` (find by `sectionKey`; arrays `stats[]`, `bullets[]`, `comparisonGood[]`, plus `headline` / `subheadline` / `bodyText`)

| sectionKey (best guess) | field path | current | proposed | FACT |
|---|---|---|---|---|
| technology-pillars-india | `stats[label="Models Available"].value` | "7" | "9" | 9 fogging models |
| technology-pillars-india | `stats[label~"Years ... OEM"]` (live label "Years Indian OEM", value "10+"; seed "Years Genuine OEM" "15+") | "10+" / "15+" | label "Indian OEM since", value "2020" (a static year count goes stale) | Company start 2020 |
| technology-pillars-india | `bullets[]` containing "8–20 Micron Ultra-Fine Fog Droplets" (seed: "8–15 Micron Ultra-Fine Fog") | "8–20 Micron Ultra-Fine Fog Droplets" | "Ultra-Fine Fog (droplet size per model)" | Droplet size per product only |
| technology-pillars-india | `bullets[]` "WHO-Approved Chemical Compatibility" | as shown | "Compatible with oil-based insecticide formulations" | WHO never about machines |
| technology-pillars-india | `bullets[]` "50+ Genuine OEM Spare Parts Always Stocked" | "50+" | "120+ Genuine OEM Spare Parts Always Stocked" | 120+ |
| technology-pillars-india | `bullets[]` "Pan-India Spare Parts — 3-Day Delivery" (seed: "3-Day Pan-India Parts Shipping") | "3-Day Delivery" | "Pan-India Spare Parts — Dispatch in 24-48 hours" | 24-48 hours |
| technology-pillars-india | (JSON-LD `Thing` nodes on the home page are generated from these bullets: "…Spare Parts — 3-Day Delivery", "50+ Genuine OEM Spare Parts") | | corrected automatically once the bullets are corrected | |
| celebrity-solution-mushtaq | `subheadline` | "…Trusted by 200+ municipalities across 22 states." | "Made in India. India-proven. Supplied to many government buyers across 12 states." | 12 states; "200+ municipalities" unsupported (OPEN_FACTS) |
| celebrity-solution-mushtaq | `stats[label="States Covered"].value` | "22" | "12" | 12 |
| celebrity-solution-mushtaq | `stats[label="Municipalities Served"]` | "200+" | remove the stat (no record behind it) | not publishable |
| celebrity-solution-mushtaq | `stats[label="Spare Parts Stocked"].value` | "65+" | "120+" | 120+ |
| comparison-oem-vs-trader | `comparisonGood[]` "65+ genuine spare parts stocked — ships in 3 days" | as shown | "120+ genuine spare parts stocked — dispatched in 24-48 hours" | 120+, 24-48 hours |
| public-health-authority | `stats[label="States Covered"].value` | "22" | "12" | 12 |
| manufacturing-authority | `bullets[]` / feature line "65+ genuine OEM spare parts always stocked" | "65+" | "120+ genuine OEM spare parts always stocked" | 120+ |
| manufacturing-authority | any `stats[]` "10+" years / "Indian OEM" tile (live home text: "10+" "Indian OEM") | "10+" | label "Indian OEM since", value "2020" | 2020 |
| field-operator-story | `bodyText` "…HDPE Pesticide tank that can handle every WHO-approved formulation…" | "every WHO-approved formulation" | "every approved formulation" | WHO never about machines |

Also scan every `homepage_sections` row (all `sectionKey`s, including `celebrity-problem-mushtaq` and the sections used on `/gem-approved-fogging-machine-oem`, `/fogging-machine-government-procurement`, `/become-a-dealer`) for the regex set: `2014|15\+|12\+|10\+ ?(years|yrs)|\b(22|29|28|15\+?) states|65\+|50\+|3[- ]day|WHO[- ]approved|8[–-]\d+ ?[Mm]icron|10,000\+|50\+ (dealers|distributors)`, and report matches before replacing.

## 2. `home_content` (`key: "main"`)

Code defaults were fixed (`lib/homeContentTypes.ts`), but any saved override wins at render (`lib/homeContent.ts` merges the DB doc over the defaults). Check and correct if present:

| field path | old defaults (may still be saved) | proposed |
|---|---|---|
| `manufacturerIntro.body` | "…trusted by 10,000+ customers including municipalities…" | "…trusted by customers across India including municipalities…" |
| `manufacturerIntro.bullets[]` | "10,000+ customers", "50+ distributors" | "Customers across India", "Dealer network" |
| `manufacturerIntro.whyChooseBullets[]` (name per type file) | "10+ years of focused manufacturing experience…", "50+ active distributors across India…" | "Focused manufacturing experience in fogging equipment since 2020", "Dealer network across India for local support" |
| `manufacturingAuthority.stats[]` | "10+ years / Of OEM production", "50+ / Distribution points" | "{current year - 2020} years / Of OEM production" (or label "Since 2020"), "Pan-India / Distribution" |
| `connectors.c1.text` | "A decade of manufacturing for the field." | "Manufacturing for the field since 2020." |

## 3. `gov_kpis` (`key: "main"`)

CODE-GUARDED: `GovKPIStrip` and `GovPerformanceSnapshot` no longer read these numbers; the three page-level defaults were zeroed. Still correct the row so the admin form (`components/admin/GovKPIsTab.tsx`) and `/api/gov-kpis` stop serving unsupported numbers.

| field | current | proposed |
|---|---|---|
| `totalOrders` | 500 | unset / null (not publishable; no records) |
| `departmentsServed` | 80 | unset / null |
| `unitsSupplied` | 2000 | unset / null (39 units on the 23 listed orders only; do not publish as a total) |
| `statesServed` | 15 | 12 |
| `yearsExperience` | 12 | unset (computed in code from 2020) or 6 |

Note: the admin form treats these as required numbers (`Number(body.yearsExperience) || 0`); setting them to null may need a form tweak, which is outside this branch.

## 4. `about_page` (`key: "about_page"`)

| field | current (live / default) | proposed | note |
|---|---|---|---|
| `journeyStat1Value` | "2015" | "2020" | CODE-GUARDED (page forces `String(FOUNDED_YEAR)`) |
| `journeyStat1Label` | "Founded" | unchanged | |
| `journeyStat2Value` / `journeyStat2Label` | "10K+" / "Happy customers" | "24" / "Case studies" | CODE-GUARDED (page and component force these) |
| `journeyParagraph1` | "…delivering CE-certified, ISO 9001-compliant, and W.H.O-compliant solutions…" | "…delivering CE-certified and ISO 9001-compliant solutions…" | not guarded: DB text renders as is |
| `manufacturingStat4Value` / `Label` | "50+" / "Products" | owner to decide (catalogue is 9 foggers + 1 trolley) | unsupported in FACTS; left alone in code defaults |
| hero tiles ("15+ Years", "10,000+ Machines Deployed") | | | static in `AboutPageContent.tsx`, already fixed in code |

## 5. `products` (find by `name`; fields `shortDescription`, `detailedDescription`, `features[]`, `faqs[]` ({q,a}), `specifications[]`, plus SEO fields such as `seoDescription` if present)

| product (name) | field path (best guess) | current | proposed |
|---|---|---|---|
| 100XHM20 | `shortDescription` / meta text (PHASE0 txt lines 144, 182) | "ISO 9001, WHO complied, ISI marked Heavy duty Hand carried Thermal fogging machine…" | drop "WHO complied": "ISO 9001, ISI marked Heavy duty Hand carried Thermal fogging machine…" |
| 100XHBL22 | same (lines 144, 182) | same | same |
| 100XHM20 | `detailedDescription` / feature body (line 215) | "…handles all WHO-approved insecticide formulations without degradation…" | "…handles approved insecticide formulations without degradation…" |
| 100XSSMA20 | feature / description body (PHASE0 :243) | "WHO-approved …" | "approved …" |
| 100XMCF42 | description body (line 234) | "The same WHO-approved chemicals deliver the same efficacy…" | "The same approved chemicals deliver the same efficacy…" |
| 100XTFS50 | `faqs[]` answer | "…all WHO-approved thermal fogging formulations…" | "…all approved thermal fogging formulations…" |
| all with blanket micron wording in free text (search `sub-50|1[–-]50 ?micron`) | description / FAQ | blanket range | "droplet size depends on the model; see each product's specifications" or the model's own spec value |
| 100XDB400, 100XSSMA20 | `specifications[]` droplet row (PHASE0 :244, :232: "8–20 microns") | per-product spec | keep (a per-product value is allowed) but the owner should confirm it |
| 100XULVSS10 ("1–30"), 100XMCF42 ("20–100") | specifications | per-product spec | keep |

Not touched: product `rating` / `reviewsCount` (OPEN_FACTS 15; the badges are handled in code by another branch).

## 6. Knowledge Hub articles (`blogs` collection, rows migrated from `lib/knowledge/seed-data.json`)

The Knowledge Hub was migrated into the database (see memory: 15 /knowledge articles). The code seed was corrected in this branch, but the live rows are separate copies and still hold the old wording. Apply the same edits to the DB rows:

| article (slug) | field | old | new |
|---|---|---|---|
| the article whose `aboutAuthor` ends "…since 2014." (seed-data.json:253, how-thermal-fogging-works family) | `aboutAuthor` | "…thermal fogging machines since 2014." | "…since 2020." |
| article with `aboutAuthor` "10+ years supplying to Nagar Nigams…" (seed :1628) | `aboutAuthor` | "10+ years supplying to Nagar Nigams, health departments, and pest control operators." | "Supplying to Nagar Nigams, health departments, and pest control operators." |
| article with `aboutAuthor` "10+ years manufacturing experience." (seed :1870) | `aboutAuthor` | "10+ years manufacturing experience." | "Manufacturing since 2020." |
| government-market article (seed :1076) | `schemaAnswer` | "…across India's 28+ states." | "…across India's states." |
| how-thermal-fogging-works | `metaDescription`, `ogDescription`, FAQ answers, body paragraphs | "sub-50-micron droplets" | "fine droplets" |

Run the same regex set as section 1 over all `blogs` rows (including regular blog posts: e.g. "one of India's most trusted GeM-approved OEMs" is out of scope for this pass; report only).

## 7. Other DB-sourced text to scan (report matches, do not blind-replace)

- `page_sections` (landing-page and page-level section overrides) and the landing-page override docs read by `lib/seo/get-merged-landing-page.ts`: same regex set, plus "GeM Seller ID" wording (must say optional for the authorization letter) and "Year(s)" stat tiles.
- `case_studies` and `gov_past_performance` free-text fields: "WHO", "sub-50", "2014" (these hold the verifiable records, so edit only the wording, never the order data).
- `reviews`: no change.
