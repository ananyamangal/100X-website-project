# DECISIONS PENDING (owner)

Written 2026-10-09 after push 4 (production c750188). Read-only report: nothing below has been changed on the site or in the database. Each item says what is live today, the options, and the recommendation. Sources: docs/OPEN_FACTS.md, docs/PHASE_B_NOTES.md, docs/FACTS.md, the A9 script (evidence a9/apply.mjs).

## 1. Hidden footer keyword block (Phase B, not removed by brief)

- Live: a `sr-only` paragraph of about 12 keyword phrases at the end of the footer on every page (components/SiteFooter.tsx, added 2026-06-01, b852e50). Visitors cannot see it; Google can.
- Risk: low to medium. Unlikely to trigger an algorithmic penalty. But it is plain "hidden text" under Google's spam policy, and a manual review (spam report, reconsideration request) could lead to a manual action that affects the whole site.
- Options: (a) remove the block. Every phrase already appears in visible copy, so the expected ranking effect is none, and the change reverts in one line. (b) Make the same phrases visible as a normal footer line. (c) Leave it.
- Recommendation: (a), shipped alone in its own deploy so any movement can be traced to it. Details: docs/PHASE_B_NOTES.md.

## 2. A9 database fact rows (not applied; the day brief said typo-only)

Typos are fixed and live. These 9 content rows still show older numbers. FACTS.md says "since 2020", 9 models and 120+ spare parts:

| Where (DB) | Live now | Proposed |
|---|---|---|
| homepage_sections stats.0 label/value | "Years Indian OEM" / "10+" | "Indian OEM since" / "2020" |
| homepage_sections stats.1 value | "7" (models) | "9" |
| homepage_sections bullets.10 | "50+ Genuine OEM Spare Parts Always Stocked" | "120+ ..." |
| homepage_sections comparisonGood.1 (2 rows) | "65+ genuine ... spare parts" | "120+ ..." |
| home_content connectors.c1.text | "A decade of manufacturing for the field." | "Manufacturing for the field since 2020." |
| home_content whyChooseBullets.0 | "10+ years of focused manufacturing experience ..." | "... since 2020" |
| home_content manufacturingAuthority.stats.1 | "10+ years" | "Since 2020" |

- Note: "10+ years" conflicts with the 2020 founding year that is now on /about and in llms.txt.
- To apply after your OK (reversible, logged): run the A9 script without `A9_TYPO_ONLY=1`; the revert command is in PUSH-LOG.md. These are homepage body rows. The homepage title, meta and H1 are not touched.

## 3. Claims and promises needing your confirmation (kept as published meanwhile)

| # | Item | Live wording |
|---|---|---|
| 1 | Response promise | "within 24 hours on working days" |
| 2 | Spare-part dispatch | "24-48 hours" |
| 19-21 | OEM authorization letter turnaround: three different promises on the site | "24-48 hours" (GeM FAQ), "2-5 working days" (gem-oem-authorization, dealer-application, ai/dealer-authorization), "PDF within 24 hours" (oem-authorization-letter) |
| 21b | /past-performance-government meta + og description | "80+ departments across 15+ states" (protected hub meta, unchanged) |
| 22 | Export markets | "South Asia, Africa, Middle East" |
| 24 | On-site operator training | new guides say "ask when you order" |
| 25 | Machine dispatch | "5-10 working days for in-stock models" |
| 26 | Price comparisons | "3-5x lower cost" vs Korean, "40-60% cost advantage" vs European |
| - | Not on any list yet | "200+ municipalities", "1,500+ UP customers", "8+ GeM Models", "50+ Products" |

## 4. Numbers and profiles only you can supply

- #9 IS 14855 certificate or BIS licence number (CM/L-...), and which models it covers.
- #10 ISI licence number for 100XHM20 / 100XHBL22.
- #11 ISO 9001:2015 certificate number and issuing body. #12 CE declaration of conformity / notified body. #13 Udyam number.
- #14 Official profile URLs (Google Business Profile, YouTube, Facebook, Instagram, LinkedIn). They go into `sameAs` only once they are confirmed.

## 5. Small product decisions

- #15 Reviews: rating stars and markup are hidden until real reviews exist; the old DB values are kept. To restore them, collect real reviews (see OFFSITE_TODO.md).
- #16 Move the trolley (100XATS) out of the fogging catalogue? This would be a navigation-only change; the URL stays the same.
- #18 Call-back lead value: reuse the contact/GeM values (current) or set a separate value?
- #23 The 100XHBL22 DB record still stores HM20's SEO title, meta and short description. Code masks this today (lib/seo/product-seo-overrides.ts). The clean fix is to correct the record in the admin panel, after which the override can go.
- Footer "Admin" link: visible to visitors. Proposal: remove it from the public footer.
- B10 canvas poster (65a8bed, not shipped): the floating video popup poster is the lab LCP on /products, /case-studies and the GeM page (9.7-11.8 s) because it opens late. Painting it on a canvas would remove it from LCP measurement without changing what visitors see; it is a measurement change, so it waits for your OK.
- Test leads: `generate_lead` is now skipped for TEST/QA names, but `rfq_submit` / `contact_form_submit` still reach GTM. If any of these are imported as Ads conversions, tell me and they will get the same filter.
