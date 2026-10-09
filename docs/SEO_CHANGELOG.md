# SEO changelog

URL | field | old | new | reason | commit | rollback

Only server-rendered TITLE / META / OG / H1-H3 changes are listed here. Body-text changes are in the SEO diff review list in the branch report. Commit hashes are filled in from `git log overnight/facts` (facts pass, 2026-10-08).

| URL | field | old | new | reason | commit | rollback |
|---|---|---|---|---|---|---|
| /about | meta description | "...pulse-jet thermal fogging machines. Founded 2014. ISO 9001:2015 certified. ..." | "...Founded 2020. ISO 9001:2015 certified. ..." | Company start is 2020 (FACTS) | 64bb39e | `git revert 64bb39e` |
| /about | og:description | "...Supplies to 50+ dealers and government bodies pan-India." | "...Supplies to dealers and government bodies pan-India." | "50+ dealers" unsupported (OPEN_FACTS 8) | 3df5bbe | `git revert 3df5bbe` |
| /become-a-dealer | og:description | "Join 50+ active dealers selling 100X Circle fogging machines across India. ..." | "Join the active dealer network selling 100X Circle fogging machines across India. ..." | "50+ active dealers" unsupported | 3df5bbe | `git revert 3df5bbe` |
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
| /about, /ai/about-100x, /ai/dealer-authorization | ProfilePage.mainEntity | full second definition of `/#organization` (different descriptions) | `{ "@id": "https://www.100xcircle.com/#organization" }` reference (B3) | No duplicate @id per page; one identity | 316c74f | `git revert 316c74f` |
| /ai/entity-graph | @graph | Organization node redefining `/#organization`; 4 product-category nodes typed Product | Organization node removed (defined sitewide); categories typed Thing with name + description (B3) | Product schema only on product pages; no duplicate @id | 316c74f | `git revert 316c74f` |
| /gem-approved-fogging-machine-oem | JSON-LD | standalone Organization node redefining `/#organization` | removed; the sitewide node covers it (B3) | duplicate @id | 316c74f | `git revert 316c74f` |
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
