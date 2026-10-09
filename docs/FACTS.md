# FACTS — single source of truth for public claims

Created 2026-10-08 for the overnight conversion + SEO + AEO program. Every number on the site, in schema, in llms.txt and in AI pages must come from this file. If a fact is not here, do not publish it; add it to `docs/OPEN_FACTS.md`.

Counts were taken read-only from the production database on 2026-10-08 (aggregates only, no lead data).

## Owner-confirmed claims (2026-10-09) — these override anything below

The owner confirmed these are real. Keep them exactly as live; never remove or downgrade them for lack of a database record.

| Claim | Live value |
|---|---|
| Government orders | 500+ |
| Departments served | 80+ |
| Units supplied | 2,000+ |
| States served | 15+ (site also says 28 / 29 states in places — unchanged) |
| Customers / machines | 10,000+ |
| Dealers / distributors | 50+ |
| Municipalities / cities | 200+ |
| WHO-approved | Real (owner) |
| ISI | Real (owner) |
| Droplet wording | Live "1–50 micron / sub-50-micron" wording stays |

The database counts further down (24 case studies, 23 buyers, 12 states) are floors: the owner has more performances than the database lists.

## Company

| Fact | Value | Source |
|---|---|---|
| Company start | **2020** | Owner, 2026-10-08 |
| Years in business | `currentYear - 2020` computed at build/render time, or the words "since 2020" | Owner rule. Never "2014", "10+", "12+", "15+ years", "a decade". |
| schema `foundingDate` | `"2020"` | Owner |
| GeM Seller ID for the OEM authorization letter | **Optional**: say so everywhere it is mentioned | Owner (make the copy consistent) |

## Catalogue

| Fact | Value | Source |
|---|---|---|
| Fogging machine models in the live catalogue | **9** | `products` with `isPublished: true` = 10, minus the baggage trolley (100XATS), which is not a fogger |
| Models | 100XTFS50, 100XSSMA20, 100XMCF42, 100XHM20, 100XDB400, 100XHBL22, 100XULV22, 100XULVSS10, 100XBF102 | DB product names |
| Spare parts | **120+** (122 published records; 121 distinct part pages linked on /spare-parts) | `spare_parts` with `isPublished: true` = 122. Rounded down. |
| Droplet size | **Per product only**, from that product's own DB spec. No blanket site-wide micron range. | Owner rule |

## Government track record (verifiable records only)

| Fact | Value | Source |
|---|---|---|
| Published case studies | **24** | `case_studies` with `published: true` (0 samples) |
| States with a verified government order or case study | **12**: Bihar, Gujarat, Haryana, Himachal Pradesh, Jammu & Kashmir, Jharkhand, Kerala, Maharashtra, Rajasthan, Uttar Pradesh, Uttarakhand, West Bengal | Distinct `state` in `case_studies` and `gov_past_performance` (identical sets) |
| Government buyers on record | **23** organisations (ULBs, government departments, PSUs/boards, panchayats, defence/paramilitary) | `gov_past_performance` (source: client list PDF 2026) |
| Units on record | 39 (from the 23 listed orders only) | Sum of `quantity`. Do not publish as a total; it covers only the listed orders. |
| Order years on record | 2020, 2021, 2025, 2026 | `orderYear` |
| Total government orders / departments / units supplied | **Not publishable as numbers.** DB `gov_kpis` says 500 / 80 / 2,000, but no records support them. Use: "Supplied to many government buyers across 12 states, including the 23 organisations listed on our past-performance register." | Owner: "many orders supplied". Listed in OPEN_FACTS.md |

## Promises (owner to confirm; see OPEN_FACTS.md)

| Fact | Value |
|---|---|
| Quote / response time | **"within 24 hours on working days"**: one promise everywhere |
| Spare-part dispatch | **"24-48 hours"** |

## Standards and certifications

| Fact | Value |
|---|---|
| IS 14855 | No certificate or BIS licence number is on file. Wording: "built to the requirements of IS 14855; test report on request". Do not say "certified", "ISI-marked" or "BIS approved" unless a licence number is added here. |
| WHO | Never about machines. Chemical formulations may be referred to "as per WHO guidance" only where the page already cites a source. |
| ISO 9001 / CE / MSME | Not verified: no certificate numbers on file. Do not add new mentions. |
| GeM | Products are sold through GeM (OEM / reseller path). OEM authorization letters are issued to resellers. |

## Reviews

| Fact | Value |
|---|---|
| Visible customer reviews | 6 published records in `reviews` (homepage block). Product-level `rating` / `reviewsCount` values have no visible reviews behind them: do not mark them up, and do not show the badges. |
