# SEO changelog

URL | field | old | new | reason | commit | rollback

Only server-rendered TITLE / META / OG / H1-H3 changes are listed here. Body-text changes are in the SEO diff review list in the branch report. Commit hashes are filled in from `git log overnight/facts` (facts pass, 2026-10-08).

| URL | field | old | new | reason | commit | rollback |
|---|---|---|---|---|---|---|
| /about | meta description | "...pulse-jet thermal fogging machines. Founded 2014. ISO 9001:2015 certified. ..." | "...Founded 2020. ISO 9001:2015 certified. ..." | Company start is 2020 (FACTS) | 64bb39e | `git revert 64bb39e` |
| /about | og:description | "...Supplies to 50+ dealers and government bodies pan-India." | "...Supplies to dealers and government bodies pan-India." | "50+ dealers" unsupported (OPEN_FACTS 8) | 3df5bbe | `git revert 3df5bbe` (SUPERSEDED: restored by 00c0ee0 per owner 2026-10-09; live keeps "50+") |
| /become-a-dealer | og:description | "Join 50+ active dealers selling 100X Circle fogging machines across India. ..." | "Join the active dealer network selling 100X Circle fogging machines across India. ..." | "50+ active dealers" unsupported | 3df5bbe | `git revert 3df5bbe` (SUPERSEDED: restored by 00c0ee0 per owner 2026-10-09; live keeps "50+") |
| /oem-authorization-letter | og:description / twitter:description | "...ISO 9001. 4-hour response." | "...ISO 9001. Response within 24 hours on working days." | One response promise (FACTS) | 3df5bbe | `git revert 3df5bbe` |
| / (home) | trust card heading | "15+ Years Manufacturing" | "6 Years Manufacturing" (computed: current year - 2020) | Company start is 2020 | 64bb39e | `git revert 64bb39e` |
| /ai/product-catalog | H2 | "Current Product Listing (15 models)" | "Current Product Listing (N fogging machine models)" where N counts published foggers (9 today) | Heading counted every product record, including unpublished and the baggage trolley | 3df5bbe | `git revert 3df5bbe` |
| /knowledge/how-thermal-fogging-works | meta description (code seed only; the live copy comes from the knowledge database and is unchanged until the DB step) | "...heat vaporization, sub-50-micron droplet formation, and why..." | "...heat vaporization, fine droplet formation, and why..." | Blanket micron claim removed | 051232d | `git revert 051232d` |
| /knowledge/how-thermal-fogging-works | og:description (same caveat) | "...forming sub-50-micron droplets that penetrate..." | "...forming fine droplets that penetrate..." | same | 051232d | `git revert 051232d` |
| /compare/* (all 20) | FAQPage JSON-LD answers and body text | "...since 2014...", "10+ year track record", "sub-50-micron droplets" | "...since 2020...", "track record ... since 2020", "fine droplets" | Facts | 64bb39e, 051232d | revert those commits |

Not changed (protected hubs): `/past-performance-government` still carries "80+ departments across 15+ states" in its meta description and "across 15+ states" in og:description. See the branch report.

## Batch 4 (overnight/batch4, 2026-10-09)

No title, meta description, H1/H2 text, existing body copy, URL, canonical, hreflang or existing link changed. All changes are additive blocks, schema fixes, sitemap and robots.

| URL | field | old | new | reason | commit | rollback |
|---|---|---|---|---|---|---|
| /products (list cards) | card feature bullets | feature title only ("Tank Material") | "title: value" ("Tank Material: Stainless Steel"), or the one non-empty part (A9) | featLabel dropped every feature value; DB features are `{title, value}` objects | 5e94f35 | `git revert 5e94f35` |
| /become-a-dealer, /fogging-machine-for-nagar-panchayat, /fogging-machine-government-procurement, /gem-oem-authorization, /gem-reverse-auction-fogging, /gem-tender-support, /is-14855-fogging-machine, /make-in-india-fogging-machine, /municipal-fogging-programme, /nvbdcp-fogging-machine, /public-health-equipment, /vector-control-equipment | body (new H2 block at end of main) | FAQPage schema questions not on the page | new "More frequently asked questions" block (H2 "Frequently asked questions" on nagar-panchayat and make-in-india, which had no visible FAQ), each schema Q&A verbatim in `<details open>` (B1) | Schema Q&A must be visible; schema text unchanged, existing visible FAQs unchanged | 3b77fd0 | `git revert 3b77fd0` |
| /knowledge/agricultural-fogging-guide, /knowledge/dengue-prevention-thermal-fogging, /knowledge/fogging-machine-maintenance-guide, /knowledge/fogging-machine-operators-guide, /knowledge/fogging-machine-safety-guide, /knowledge/how-to-choose-fogging-machine, /knowledge/malaria-control-fogging-india, /knowledge/thermal-fogging-chemicals-guide | body (new H2 block at end of main) | visible FAQ was a shorter, reworded version of the schema Q&A | "More frequently asked questions" block with the schema Q&A verbatim, open (B1). how-to-choose skips the one question already shown verbatim | same | 3b77fd0 | `git revert 3b77fd0` |
| / (home) | FAQ accordion markup | Radix accordion: closed answers were not in the HTML | native `<details>`, same questions/answers/styling; every answer in the server HTML (B1) | FAQPage answers were missing from the page HTML | 3b77fd0 | `git revert 3b77fd0` |
| /knowledge/[slug] (DB articles), /compare/*, /dealer-program, /products, /nhm-fogging-machine, /vehicle-mounted-fogging-machine, landing pages | FAQ | (checked) | not changed: schema Q&A already rendered in the HTML (closed `<details>` or plain text). One DB row (government-procurement-guide, visible "What is the GeM direct purchase limit?") differs from its schema question only by the words "for fogging machines"; same answer | B1 check | none | none |
| all product pages (/products/<slug>, product landing pages, /<locale>/<slug>) | Product JSON-LD aggregateRating | AggregateRating from DB rating/reviewsCount | not emitted (B2) | No visible reviews behind the numbers (FACTS "Reviews"). Flag `SHOW_PRODUCT_RATINGS` in lib/seo/ratings.ts | 6c25ee2 | `git revert 6c25ee2` |
| /products, product pages, product cards (home, related products) | rating badge (stars, value, review count) | shown | hidden (B2) | same | 6c25ee2 | `git revert 6c25ee2` |
| / (home) | Organization JSON-LD (HomepageTestimonialsJsonLd) | second `/#organization` node with AggregateRating 4.7 / 3 reviews and 3 hard-coded Review nodes (anonymous authors "Municipal Health Department, Haryana", "Agricultural Cooperative Society, Punjab", "Pest Control Operator, Pan-India"), not shown on the page | not rendered (B2). The full sitewide Organization node is unchanged. The visible homepage reviews section (6 published `reviews` records with real names) is unchanged; it never had markup and none was added | Review markup must match visible reviews; also a duplicate @id | 6c25ee2 | `git revert 6c25ee2` |
| /ai/about-100x | ProfilePage.mainEntity | full second definition of `/#organization` (different descriptions) | `{ "@id": "https://www.100xcircle.com/#organization" }` reference (B3) | No duplicate @id per page; one identity | 316c74f | `git revert 316c74f` |
| /ai/entity-graph | @graph | Organization node redefining `/#organization`; 4 product-category nodes typed Product | Organization node removed (defined sitewide); categories typed Thing with name + description (B3) | Product schema only on product pages; no duplicate @id | 316c74f | `git revert 316c74f` |
| /about, /ai/dealer-authorization, /gem-approved-fogging-machine-oem | Organization JSON-LD | 316c74f had replaced or removed their `/#organization` node | restored exactly as before 316c74f (all original properties). Agency-protected pages: a duplicate `/#organization` node is valid (Google merges same-@id nodes), so it stays | AGENCY_PROTECTED: keep valid existing schema on protected pages | commit "revert(seo): restore the Organization node on agency-protected pages" | `git revert $(git log --format=%h -1 --grep="restore the Organization node on agency-protected")` |
| /fogging-machine-for-nagar-panchayat, /fogging-machine-government-procurement, /is-14855-fogging-machine, /make-in-india-fogging-machine, /municipal-fogging-programme, /nhm-fogging-machine, /nvbdcp-fogging-machine, /public-health-equipment, /vector-control-equipment | Product JSON-LD | standalone Product node (page-level, not a single product) | removed (B3) | Product schema only on product detail pages | 316c74f | `git revert 316c74f` |
| /ai/product-catalog | CollectionPage.hasPart | Product nodes (name, offers, brand) | WebPage nodes (name, description, url of each product page) (B3) | same | 316c74f | `git revert 316c74f` |
| /factory | JSON-LD | `["LocalBusiness","AutoPartsStore"]` named "100X Circle Manufacturing Facility", OfferCatalog of name-only Products, credentials | `Place` (same @id, name, address, geo, phone, hours, map); OfferCatalog and credentials removed (credentials stay on the sitewide Organization) (B3) | second LocalBusiness with a different name; name-only Products | 316c74f | `git revert 316c74f` |
| all pages (GlobalJsonLd) | Organization / LocalBusiness | Organization had no address; LocalBusiness had no foundingDate | Organization.address = the LocalBusiness address (UG, 398, Sector 7, Industrial Model Township, Gurugram, Haryana 122050, IN); LocalBusiness.foundingDate "2020" (B3) | Same name/address/phone/foundingDate everywhere | 316c74f | `git revert 316c74f` |
| /contact-us | JSON-LD | none page-specific | ContactPage (about `/#organization`, mainEntity `/#localbusiness`) + BreadcrumbList Home > Contact (B3) | brief B3 | 316c74f | `git revert 316c74f` |
| /sitemap.xml | entries | no case-study detail pages; /gem-approved-fogging-machine-oem listed twice | + 24 /case-studies/<slug> entries, lastmod = record updatedAt (else createdAt, else omitted); static duplicate of /gem-approved-fogging-machine-oem removed, landing-registry entry kept (B6) | brief B6 | f0586c1 | `git revert f0586c1` |
| /robots.txt | named User-agent groups (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-User, anthropic-ai, Google-Extended, Googlebot, PerplexityBot, FacebookBot, Twitterbot, cohere-ai, YouBot, Diffbot) | Disallow /admin, /api/admin/ only | same two lines + every `*` Disallow (/admin/, /api/submissions, /api/brochure, /brochure-thank-you, /thank-you, /*?utm_*, /*?fbclid=*, /*?gclid=*, /*?msclkid=*). Allow lines, `*` group, sitemap and host unchanged (B7) | named groups ignore the `*` group | dfbc6f1 | `git revert dfbc6f1` |
| product pages (/products/<slug>, product landing pages) | body (new H2 block at end) | none | "Related case studies": up to 3 same-type case studies + /gem-approved-fogging-machine-oem (B9) | internal linking | 443cf3f | `git revert 443cf3f` |
| /case-studies/<slug> | body (new H2 block at end of main) | none | "Related products": up to 3 same-type products (canonical URLs) + one buying guide (B9) | same | 443cf3f | `git revert 443cf3f` |
| the 8 static /knowledge/* guides listed above, /gem-approved-fogging-machine-oem | body (new H2 block at end of main) | none | "Related products" / "Related products and case studies" / "Related case studies", max 4 links; the GeM page adds /knowledge/gem-oem-authorization-process (B9) | same | 443cf3f | `git revert 443cf3f` |

### B2: suppressed DB values (read-only query, 2026-10-09; nothing deleted or changed)

`products.rating` / `products.reviewsCount`:

| slug | isPublished | rating | reviewsCount |
|---|---|---|---|
| thermal-cold-fogging-machine-100xtfs50-90602f | true | 4.6 | 36 |
| thermal-fogging-machine-with-stainless-steel-tank-100xssma20-1b5dd8 | true | 4.4 | 20 |
| cold-fogger-machine-with-2-stoke-engine-100xmcf42-c42ca1 | true | 4.4 | 25 |
| passenger-baggage-trolleys-stainless-steel-with-brakes-100xats | true | 4.8 | 8 |
| isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhm20-fcbbde | true | 5 | 46 |
| double-barrel-thermal-fogging-machine-vehicle-mounted | true | 4.8 | 12 |
| isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhbl22-c-ea7f75 | true | 5 | 49 |
| ulv-cold-fogger-machine-100xmcf42-copy-8dcd42lvlv | true | 4.4 | 25 |
| 100xulvss10-5e46c5 | true | 4.5 | 9 |
| mini-fogger-100xbf102-2d9887 | true | 4.5 | 8 |
| 100x-heavy-duty-thermal-fogger-bf400 | false | 4.9 | 31 |
| 100x-minisuper-2000-gold-classic | false | 4.6 | 42 |
| 100x-thermal-fogger-bf150 | false | 4.8 | 56 |
| 100x-thermal-fogger-bf200 | false | 4.9 | 38 |
| 100x-minisuper-2000-gold-new | false | 4.8 | 29 |

`reviews` collection: 6 published records (ratings 4.5, 5, 5, 5, 5, 5), none linked to a product. They are the visible homepage reviews; left as they are, with no markup.

### B3: page classification

Product detail pages (Product JSON-LD kept): `/products/<slug>` (ProductJsonLd); the product landing pages rendered by LandingRenderer with `type: "product"` (e.g. /thermal-and-cold-fogging-machine-100xtfs50, /thermal-fogging-machine-with-stainless-steel-tank-100xssma20, /double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400); spare-part detail pages `/spare-parts/<product>/<part>` (one purchasable part each; their nested `isRelatedTo` Product names are unchanged).

Non-product pages that carried Product schema (all fixed above): the 9 landing pages, /ai/entity-graph, /ai/product-catalog, /factory.

### Protected pages (protected_pages_union.csv) touched by 316c74f

- Organization node restored by commit "revert(seo): restore the Organization node on agency-protected pages": /about (Tier A), /gem-approved-fogging-machine-oem (Tier A), /ai/dealer-authorization (Tier B).
- /contact-us (Tier A): additive ContactPage + BreadcrumbList only; kept.
- Standalone Product node removed and kept removed (B3), awaiting the coordinator decision: /fogging-machine-for-nagar-panchayat, /fogging-machine-government-procurement, /is-14855-fogging-machine, /nhm-fogging-machine, /nvbdcp-fogging-machine, /public-health-equipment (all Tier B). The /fogging-machine-government-procurement Product node also carried a nested manufacturer Organization with @id `/#organization`, name and address; it went with the Product node.
- Not protected, 316c74f changes kept: /ai/about-100x, /ai/entity-graph, /ai/product-catalog, /factory, /make-in-india-fogging-machine, /municipal-fogging-programme, /vector-control-equipment.
## Batch 5 (2026-10-09, branch overnight/batch5): B4, B5, E1-E5

Title/meta budget for this batch: at most 12 URLs with a changed `<title>` or meta description. Used: **8** (all B4 rows below). Social tags (og/twitter), JSON-LD, llms.txt, API and new pages are outside the budget and listed separately. Commit hashes: see the `commit` column (`{B4}` etc. are filled in by the last commit of the batch).

| URL | field | old | new | reason | commit | rollback |
|---|---|---|---|---|---|---|
| /products/isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhbl22-c-ea7f75 (Tier A) | title | "ISI marked Thermal Fogging Machine with HDPE Tanks \| India Manufacturer \| 100X" (78, identical to HM20) | "ISI Marked Thermal Fogging Machine HDPE Tank 100XHBL22 \| 100X" (61) | B4: duplicate of HM20, too long, no model. Ranking words kept. Applied in code (`lib/seo/product-seo-overrides.ts`), DB untouched | {B4} | `git revert {B4}` |
| same | meta description | "ISI marked Thermal Fogging Machine with HDPE tank-100XHM20 : fogging machines for Municipal mosquito and vector control (dengue, malaria, chikungunya pr…" | "100XHBL22 pulse jet thermal fogging machine, ISI marked, with HDPE tanks: 6 L solution tank, 2 L fuel tank, 30-40 L/hr output. For municipal vector control." | B4: named the wrong model (HM20) and was cut off. Specs from this product's DB record | {B4} | same |
| /products/isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhm20-fcbbde | title | "ISI marked Thermal Fogging Machine with HDPE Tanks \| India Manufacturer \| 100X" (78) | "ISI Marked Thermal Fogging Machine HDPE Tank 100XHM20 \| 100X" (60) | B4: too long, no model, duplicate of HBL22 | {B4} | same |
| same | meta description | "...(dengue, malaria, chikungunya pr…" (cut off) | "100XHM20 ISI marked thermal fogging machine with HDPE tanks: 5.5 L solution tank, 2 L fuel tank, 30-40 L/hr adjustable output. For municipal vector control." | B4: truncated mid-word | {B4} | same |
| /products/ulv-cold-fogger-machine-100xmcf42-copy-8dcd42lvlv (Tier B) | title | "ULV Cold fogger machine wi \| India Manufacturer \| 100X" | "ULV Cold Fogger Machine 100XULV22 \| India Manufacturer \| 100X" (61) | B4: truncated title, model added. Meta unchanged (no defect) | {B4} | same |
| /products/100xulvss10-5e46c5 | title | "100XULVSS10 \| 100x Circle" (fallback; DB field empty) | "ULV Electric Cold Fogger 100XULVSS10 \| 100x Circle" (50) | B4: title was the model code only | {B4} | same |
| same | meta description | "Ulv electric cold fogger / Mist Sprayer" (fallback) | "100XULVSS10 ULV electric cold fogger and mist sprayer: 240 V AC, 5 L chemical tank, 0.5-30 micron adjustable droplets. For hospitals and food facilities." | B4: 39-char fragment | {B4} | same |
| /products/cold-fogger-machine-with-2-stoke-engine-100xmcf42-c42ca1 (Tier B) | title | "Cold fogger machine with 2 stoke engine \| India Manufacturer \| 100X" (67) | "Cold Fogger Machine with 2 Stroke Engine 100XMCF42 \| 100X" (57) | B4: typo "stoke", too long, no model. Slug unchanged | {B4} | same |
| same | meta description | "...(dengue, malaria, chikungunya prevention) & Disinfect" (cut off) | "100XMCF42 cold fogger machine with a 2-stroke petrol engine: 14 L chemical tank, 20-100 micron adjustable droplets. For mosquito control and disinfection." | B4: truncated | {B4} | same |
| /products/passenger-baggage-trolleys-stainless-steel-with-brakes-100xats | title | "Passenger Baggage Trolleys Stainless  \| India Manufacturer \| 100X" | "Passenger Baggage Trolleys Stainless Steel 100XATS \| 100X" (57) | B4: truncated title, model added | {B4} | same |
| same | meta description | "...OEM manufacturer i…" (cut off) | "Passenger baggage trolleys 100XATS in grade 304 stainless steel with foot-operated locking brakes, 150 kg load. For airports, railway stations and hotels." | B4: truncated | {B4} | same |
| /double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400 (Tier B) | title (and og/twitter title, which follow it) | "Buy Double Barrel Thermal Fogging Machine \| 100x Circle" | "Buy Double Barrel Thermal Fogging Machine 100XDB400 \| 100X" (58) | B4: model number added; `displayName` pinned so footer/breadcrumb labels do not change | {B4} | same |
| /thermal-fogging-machine-with-stainless-steel-tank-100xssma20 (Tier B) | title (and og/twitter title) | "Buy Stainless Steel Tank Thermal Fogger \| 100x Circle" | "Buy Stainless Steel Tank Thermal Fogger 100XSSMA20 \| 100X" (57) | B4: model number added; `displayName` pinned | {B4} | same |

B4 notes: on /products/* pages og:title and twitter:title follow the `<title>` (no stored og fields), so they change with it. No H1 was changed: both HDPE pages already show the correct model in their H1 (the mismatch was only in HBL22's title and meta). 100XTFS50 (title already has the model) and 100XBF102 ("100XBF102 \| Mini Fogger", no defect) were left alone.

### B5 social tags (not in the title/meta budget)

| URL | field | old | new | reason | commit | rollback |
|---|---|---|---|---|---|---|
| site-wide default (every page without its own og/twitter title, incl. /) | og:title, twitter:title | "Best Thermal Fogging Machine Manufacturer \| 100x Circle" | "Thermal Fogging Machine Manufacturer in India \| 100x Circle" | B5: stop the inherited "Best ..." title. Default descriptions (with "agriculture"/"agricultural") unchanged | {B5} | `git revert {B5}` |
| /case-studies | og:title / og:description / og:url / twitter:* | inherited: "Best ..." title, homepage description, og:url = https://www.100xcircle.com | own: "Fogging Machine Case Studies: Government & Municipal Supply \| 100X Circle"; "Case studies of 100X Circle fogging machines supplied to municipal corporations, health departments, defence units and agricultural cooperatives in India."; og:url = /case-studies | B5: wrong og:url, inherited title | {B5} | same |
| /knowledge | og:title / og:description / og:url / twitter:* | inherited (same as above, og:url = homepage) | own: "Knowledge Hub: Thermal Fogging & Vector Control Guides \| 100X Circle"; "Guides on thermal and cold fogging, mosquito and vector control, chemicals, maintenance, safety and buying fogging machines through GeM, by 100X Circle."; og:url = /knowledge | B5 | {B5} | same |
| /spare-parts | twitter:title / twitter:description | inherited "Best ..." / homepage text | = its own og tags ("Spare Parts \| 100X Circle") | B5 | {B5} | same |
| /products | twitter:title / twitter:description | "Products \| 100x Circle" / "Thermal fogging machines and agricultural equipment from 100x Circle." (from products/layout.tsx) | = its own og tags ("Fogging Machines & Agricultural Equipment \| 100X Circle"; agricultural wording kept) | B5 | {B5} | same |
| /oem-authorization-letter | twitter:title / twitter:description | inherited "Best ..." | = its own og tags | B5 | {B5} | same |
| /gem-oem-authorization | twitter:title / twitter:description | inherited "Best ..." | = its own og tags | B5 | {B5} | same |

Checked and left as is (already own og:url and own social title): /gem-approved-fogging-machine-oem, /past-performance-government, /blog.

### E4 Organization node (JSON-LD, every page; not in the title/meta budget)

| URL | field | old | new | reason | commit | rollback |
|---|---|---|---|---|---|---|
| all pages (GlobalJsonLd in the root layout) | Organization JSON-LD | built inline in components/seo/GlobalJsonLd.tsx | built by `buildOrganizationNode()` in the new `lib/seo/organization.ts` (single source, `@id` https://www.100xcircle.com/#organization unchanged) | E4: one consistent node | {E4} | `git revert {E4}` |
| same | sameAs | social profiles + gem.gov.in + udyamregistration.gov.in + /ai/about-100x + /ai/entity-graph | social profiles only (admin social links; defaults YouTube, Facebook, Instagram, LinkedIn, X), de-duplicated | generic portals and own pages are not profiles of the company (OPEN_FACTS 14) | {E4} | same |
| same | hasCredential / identifier | ISO 9001:2015, CE, ISI, MSME/UDYAM, GeM; identifier list (MSME, GeM, NAICS) | ISI (owner-confirmed) and GeM seller registration only; identifier list removed (NAICS stays in `naics`) | no ISO / CE / Udyam certificate on file (OPEN_FACTS 11-13) | {E4} | same |
| same | description | "...GeM-listed, ISO 9001 certified, MSME/UDYAM registered... Distributed across 50+ Indian locations. Export to South Asia, Africa, and the Middle East." | "...in business since 2020. Machines are sold directly and through the Government e-Marketplace (GeM). Factory at IMT Manesar, Gurugram, Haryana." | facts only | {E4} | same |
| same | areaServed | India, South Asia, Middle East, Africa | India | export markets not in FACTS (OPEN_FACTS 22) | {E4} | same |
| same | added / removed | contactPoint `contactOption: TollFree`; `numberOfEmployees` 25-100 | removed (mobile numbers are not toll-free; headcount unverified); `address` (PostalAddress from site-config) added | accuracy | {E4} | same |

LocalBusiness and WebSite nodes in GlobalJsonLd.tsx were not touched (B3 / structured-data batch owns LocalBusiness).

### E3 answer-first summaries (new visible block; no title/meta/H1/paragraph changed)

Block = `components/seo/AnswerSummary.tsx` ("In short" + 40-60 word answer + "Last updated 9 October 2026 · By 100X Circle Pvt Ltd, fogging machine manufacturer, Gurugram"). Text lives in `lib/seo/answer-summaries.ts`. Rollback for all rows: `git revert {E3}`.

| URL | placement | protected? | commit |
|---|---|---|---|
| /gem-approved-fogging-machine-oem | new block directly after the hero (LandingRenderer, English only) | Tier A: additive block, hero/H1/body unchanged | {E3} |
| /thermal-vs-cold-fogging-machine | same | Tier A: additive | {E3} |
| /is-14855-fogging-machine | new block after the intro paragraph, before the CTA bar | Tier B: additive | {E3} |
| /fogging-machine-government-procurement | new white band directly after the hero section | Tier B: additive | {E3} |
| /thermal-and-cold-fogging-machine-100xtfs50 | under the H1/subhead/tagline in the product hero (new `answerSummary` prop on ProductDetailV2) | Tier A: additive | {E3} |
| /double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400 | same | Tier B | {E3} |
| /thermal-fogging-machine-with-stainless-steel-tank-100xssma20 | same | Tier B | {E3} |
| /products/isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhm20-fcbbde | same | no | {E3} |
| /products/isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhbl22-c-ea7f75 | same | Tier A: additive | {E3} |
| /products/cold-fogger-machine-with-2-stoke-engine-100xmcf42-c42ca1 | same | Tier B | {E3} |
| /products/ulv-cold-fogger-machine-100xmcf42-copy-8dcd42lvlv | same | Tier B | {E3} |
| /products/100xulvss10-5e46c5 | same | no | {E3} |
| /products/mini-fogger-100xbf102-2d9887 | same | Tier B | {E3} |

Skipped on purpose: /knowledge/* and /blog/* articles (AGENCY rule 3/4: nothing before the first content paragraph; the knowledge "government procurement guide" (Tier A) and the GeM blog guide keep their text; their topics are covered by /fogging-machine-government-procurement above and the new E5 pages). Trolley 100XATS not a key page.
