# OPEN FACTS: needs the owner's input

Facts the overnight program (2026-10-08) could not verify. Until each is answered, the site either uses the qualitative wording shown or leaves the claim out. Nothing below was invented.

| # | Question | What the site uses meanwhile | Where it matters |
|---|---|---|---|
| 1 | Confirm the single response promise: **"within 24 hours on working days"** | That wording | Contact, RFQ, GeM, gov-procurement, landing pages |
| 2 | Confirm spare-part dispatch: **"24-48 hours"** | That wording | Home, /spare-parts, /products |
| 3 | Total government orders (DB says 500+): which records support it? | **RESOLVED 2026-10-09: owner confirmed the live number is real; kept as live** | Home KPI band, past-performance, gov-procurement |
| 4 | Departments served (DB says 80+): which records support it? | **RESOLVED 2026-10-09: owner confirmed the live number is real; kept as live** | same |
| 5 | Units supplied (DB says 2,000+): which records support it? | **RESOLVED 2026-10-09: owner confirmed the live number is real; kept as live** | same |
| 6 | States served: the records show **12**. Are there more with proof (invoices, POs)? | **RESOLVED 2026-10-09: owner confirmed the live number is real; kept as live** | everywhere "states" appears |
| 7 | "10,000+ customers / machines": which records support it? | **RESOLVED 2026-10-09: owner confirmed the live number is real; kept as live** | GeM landing trust strip, about, dealer program, TrustBlock |
| 8 | "50+ active distributors / dealers": which records support it? | **RESOLVED 2026-10-09: owner confirmed the live number is real; kept as live** | GeM landing, llms.txt |
| 9 | IS 14855: certificate number or BIS licence number (CM/L-...), and which models | "built to the requirements of IS 14855; test report on request" | product pages, /is-14855-fogging-machine, gov pages |
| 10 | ISI mark on 100XHM20 / 100XHBL22: licence number | **Owner 2026-10-09: ISI is real; keep existing ISI claims.** Licence number still useful for B8 wording | HM20/HBL22 |
| 11 | ISO 9001:2015 certificate number and issuing body | No new mentions | llms.txt, about |
| 12 | CE marking: declaration of conformity / notified body | No new mentions | llms.txt |
| 13 | MSME / Udyam registration number | No new mentions | llms.txt |
| 14 | Official social / business profiles that exist (YouTube, Facebook, Instagram, Google Business Profile URLs) | Only profiles already linked in the code are used in `sameAs` | Organization schema |
| 15 | Real review collection: once real reviews exist, product rating markup can return | Ratings markup and badges removed (old DB values kept untouched in the DB) | product pages |
| 16 | The trolley (100XATS): move it out of the fogging catalogue? | Proposal only (no URL change) | /products |
| 17 | **Honeypot (A7), owner decision needed.** Sending the hidden `company_website` value lets the server reject bots, but the repo history (BrochureLeadModal, ContactSection, LandingFormBlock comments; PartnerApplyForm fix fb362d1) records real buyers whose browser autofilled that field and lost their lead. With A1, a rejected RFQ would now show an error and the buyer could not submit at all. The safe alternative (server saves a filled-honeypot lead flagged `honeypotFilled` and skips the admin e-mail, instead of rejecting it) was not applied: it changes the lead API's bot handling and needs your OK. | Overnight: the label leak is fixed (no "Company website" text in pages; input stays off-screen, aria-hidden, tabIndex -1); the value is still **not** sent, exactly as in production today. Bot defence = existing 2-second time gates. | RFQForm, ContactSection, LandingFormBlock, QuoteModal |
| 18 | Lead value for call-back requests: contact-page call backs reuse the contact conversion value (`CONTACT_LEAD_VALUE_INR`); GeM-page call backs use the GeM form value (1,000). Keep, or set a separate call-back value? | As described | GTM/Ads conversion values |

## Separate promise needing confirmation: OEM authorization letter turnaround

The OEM authorization letter has its own turnaround wording that was deliberately left unchanged by the facts pass. It is a different promise from the quote / response time in row 1, and nobody has confirmed it.

| # | Where | Wording currently on the site |
|---|---|---|
| 19 | `lib/seo/landing-pages.ts` (GeM landing FAQ, "How quickly will I receive the OEM authorization") | "Typically within 24–48 hours of receiving your registration" |
| 20 | `app/(site)/gem-oem-authorization/page.tsx`, `app/(site)/dealer-application/page.tsx`, `app/(site)/ai/dealer-authorization/page.tsx` | "2–5 working days" |
| 21 | `app/(site)/oem-authorization-letter/page.tsx` ("PDF Delivered: to your email within 24 hours", "within 24 hours of approval") and `components/oem/OemProcessSteps.tsx` ("PDF within 24 hours") | letter PDF within 24 hours |

Question for the owner: what is the real turnaround from request to signed letter, and is it the same for resellers and direct dealers?

## Also noticed, not changed (not on the owner's token list)

- "200+ municipalities" (`components/home/IndustryApplicationsSection.tsx`, `CinematicManufacturingSection` tile) has no record behind it (23 buyers are listed).
- "1,500+ UP customers" (`lib/seo/landing-pages.ts`), "8+ GeM Models" (`GovPastPerformance.tsx`), "50+ Products" (about-page default `manufacturingStat4Value`), "5,000+ machines" and "28 states" inside `lib/growth-os/agents/*` prompts (internal LLM prompts, not rendered).
- `/api/mcp` and `lib/pageSections.ts:143` (admin hint text) still mention "10,000+ customers, 50+ dealers" in the section-picker description only.
- Machine-dispatch lead times ("5–10 working days", "24–72h transit" on UP/Bihar pages) are a separate promise from spare-part dispatch; not in FACTS.

- 21: /past-performance-government meta + og description still say "80+ departments across 15+ states" (protected hub meta, left unchanged) — owner to approve a meta fix.
- 22: Export markets (South Asia, Africa, Middle East): kept as published per owner rule (2026-10-09) in llms.txt and the Organization schema; owner may confirm the countries.
- 23: The 100XHBL22 database record still stores the HM20 SEO title and meta description (and its short description repeats HM20 wording). Batch 5 (B4) masks this in code (`lib/seo/product-seo-overrides.ts`); the clean fix is to correct the record in the admin, after which the override switches itself off. Owner/admin action, no fact needed.
- 24: On-site operator training on delivery: is it offered, and where? The new guides (E5) say "we share the operating manual, operator demo videos and maintenance guidance with every supply; on-site training: ask when you order".
- 25: Machine dispatch lead time "5-10 working days for in-stock models": kept as published per owner rule (2026-10-09) in llms.txt; owner may confirm.
- 26: Price comparisons ("3-5x lower cost" vs Korean imports, "40-60% cost advantage" vs European): kept as published per owner rule (2026-10-09) in llms.txt; owner may confirm.
