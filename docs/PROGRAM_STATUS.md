# PROGRAM STATUS (audit, 2026-10-09, read-only)

Sources: BRIEF.md, BRIEF-2026-10-09-day.md, CHECKPOINT.md, PUSH-LOG.md, git (origin/main = 7785acf; ov3 `overnight/facts` = 05c4c04, 24 commits ahead of origin/main, not pushed), gh pr list, docs in F:/dev/100x-ov3/docs.
Status key: live = commit on origin/main; ready-unpushed = committed in the ov3 push-3 stack (gates passed per CHECKPOINT; push blocked by the auto-mode classifier, awaiting owner OK); in progress; not started; blocked.

**docs/PHASE0.md does not exist anywhere.** Not in F:/dev/100X-website-project, 100x-ov3, 100x-ov2, 100x-overnight, 100x-study (file search), and `git log --all -- docs/PHASE0.md` is empty. The Phase 0 outputs live instead in docs/AGENCY_PROTECTED.md + docs/agency/*.csv (ov3 548d569) and docs/seo-baseline (live, PR #26). The "product pages listed in Phase 0" for B4 therefore have no list; derive it from docs/seo-baseline.

## 1. Status table

| item | description | status | commit(s) | evidence / notes |
|---|---|---|---|---|
| Step 0 | rollback tag, FACTS / OPEN_FACTS / AGENCY_PROTECTED | live (first versions); updates ready-unpushed | 4faebfc (live); 86d751e, 548d569 (ov3) | tag rollback-pre-overnight-2026-10-08 -> d81aaed. ov3 docs carry the owner decisions of 10-09 |
| A1 | RFQForm saves first, WhatsApp optional | live | bee42fc, 2703ee2, 7785acf (test) | push 2; live-push2 21/21 ok |
| A2 | success-gated rfq_submit/generate_lead; IS 14855 RfqForm event; WA double count | live | 4fd7af2 | push 2 |
| A3 | optional email on contact + GeM; buyer/reseller choice | ready-unpushed | 9357caf, 7af099e | review PASS-WITH-FIXES (0033c3d); stand-in tests c3ac9ca; OPEN_FACTS #18 |
| A4 | "Request a call back" with time slot (type callback) | ready-unpushed | 7a57cff, 7af099e | same stack |
| A5 | 30-day localStorage attribution on all lead forms + server fields | live | e9d3228, b27cae5 | push 2 |
| A6 | on-page quote actions beside WhatsApp/mailto-only CTAs | ready-unpushed | e9b0970 | reviewed with A3/A4 |
| A7 | honeypot: send value + hide label | live (partial) | 479f63f, 55d8956 | label leak fixed, input hidden; value deliberately still NOT sent (OPEN_FACTS #17, owner decision needed) |
| A8 | home pills after 300 px; /about image dims | live | ebfa2c5 (pills), 68d6da9 (about) | push 1 / push 2 |
| A9 | DB typo fixes (reversible) + featLabel bullets + taglines + trolley | in progress | none | owner 10-09: typo-only. a9/apply.mjs dry run 45 changes (a9/dry.txt); trimmed re-dry-run needed; apply only after push 3 verified; docs/db-changes-2026-10-08.json not yet written; featLabel code fix TODO; trolley = proposal (OPEN_FACTS #16) |
| A10 | remove TEMP DEBUG logs | live | a1101d0 | push 2; footer Admin link left (proposal only) |
| Facts pass | 2020 founding, SSR counters, 9 models, 24h response, states | ready-unpushed | ab67a87, 64bb39e, 1675254, 3df5bbe, ce44315, e4c9c6b, 78cea58, 00c0ee0, 9021252 | owner 10-09 kept live trust numbers/WHO/ISI/droplet wording: 8240bd1 and 65cd8c0 revert those commits, 00c0ee0 restores counters. 2e2176a Seller-ID rewording reverted by 60daaff, logged in SKIPPED_FOR_SEO_SAFETY |
| B1 | FAQPage schema matches visible Q&A on 12 pages | not started | - | no commits |
| B2 | remove aggregateRating/review markup + hide rating badges | not started | - | aggregateRating still in code (case-studies/page.tsx, HomepageTestimonialsJsonLd); OPEN_FACTS #15 |
| B3 | Product schema off non-product pages; breadcrumb on /contact-us; ContactPage; Org consistency | not started | - | |
| B4 | product titles with model numbers, dedupe HM20/HBL22, under ~60 chars | not started | - | cap 12 URLs/deploy, 24/night; PHASE0 list missing, use seo-baseline |
| B5 | OG/Twitter: no inherited "Best ..." titles, hub og:url, agricultural wording | not started | - | 10-09 brief: do NOT remove agricultural wording |
| B6 | sitemap: add case-study detail pages, drop duplicate gem-oem line | not started | - | no sitemap diff in ov3 |
| B7 | robots.txt repeat disallows for named bots | not started | - | no robots diff in ov3 |
| B8 | remove/soften unsupported claims | blocked (skipped by owner) | - | owner 10-09: published claims are real, B8 claim removals skipped; logged in SKIPPED_FOR_SEO_SAFETY. IS 14855 certificate number still open (#9) |
| B9 | internal linking, related case studies / related products | not started | - | additive only |
| B10 | image formats/dims, lazy-load, LCP preload, CLS, CWV before/after | not started | - | earlier partial perf already live: 1a92e0d (card logo 5 KB), 63a43b2 + 9bbdc91 (video facade), 68d6da9 (about dims). No Lighthouse/CWV baseline captured |
| E1 | rewrite public/llms.txt (+ full) | not started | - | live3/llms.txt is only a snapshot of live; no public/ diff in ov3 |
| E2 | /api/ai/knowledge dates, coverage, dedupe | not started | - | lib/ai/knowledge.ts touched only for facts (e4c9c6b) |
| E3 | answer-first summaries, Last updated, byline | not started | - | |
| E4 | single Organization entity, sameAs | not started | - | OPEN_FACTS #14 |
| E5 | 4 new buyer-question pages | not started | - | 10-09 brief forbids the "buyer's guide landing page" (new scope); confirm whether E5 pages count. Cannibalisation check first |
| E6 | docs/OFFSITE_TODO.md | not started | - | file absent in every worktree |
| Phase 0b | conversion study docs/CONVERSION_STUDY.md | live (needs final pass) | 4ae9bee | on origin/main; study was stopped early, some steps marked "not done in time"; summary section 0 exists |
| PR #27 | Phase 0b conversion study PR | live | merge d81aaed | base = main (gh: baseRefName main), mergedAt 2026-10-08T16:55:42Z, merge commit d81aaed is on origin/main with 4ae9bee. Nothing left to merge |
| Measurement docs | tracking / conversion measurement docs | live (older) + study | 4ae9bee; b9a73fd, 3b8b0d7 (gtm-conversion-setup.md, Funnel B, GTM import) | no new doc for post-A2/A5 tracking; no CWV doc |
| docs/SEO_WATCHLIST.md | 20 URLs, GSC checks at 7 and 14 days | not started | - | absent everywhere |
| docs/PHASE_B_NOTES.md | hidden footer keyword block assessment | not started | - | absent; footer block untouched (correct) |
| docs/OFFSITE_TODO.md | off-site tasks | not started | - | absent (same as E6) |
| Other docs | SEO_CHANGELOG, SKIPPED_FOR_SEO_SAFETY, DB_FACT_FIXES; DEFERRED_FOR_NEXT_WINDOW, OVERNIGHT_REPORT, docs/PROGRAM_STATUS.md | first three ready-unpushed; rest not started | ce44315, 95c486e, 548d569 | this file is in the evidence folder, not docs/ |

Push 3 stack (24 commits on origin/main..05c4c04): 9357caf 7a57cff 7af099e e9b0970 ab67a87 64bb39e 1675254 3df5bbe 051232d 71cc2bc 2e2176a ce44315 95c486e e4c9c6b 78cea58 9021252 8240bd1 65cd8c0 00c0ee0 86d751e c3ac9ca 60daaff 548d569 05c4c04 (051232d, 71cc2bc, 2e2176a are reverted within the stack by 65cd8c0, 8240bd1, 60daaff). The day-brief pre-check (rfq-save-first + video-popup x5) has output in push3-repeat/ but no result is recorded in CHECKPOINT.md.
Other worktrees: ov2 (overnight/batch2, 4 ahead, a subset of ov3), overnight/pills and chore/overnight-2026-10-08 (0 ahead). 100x-launch/ab/menu/uptime/video hold no B/E work.

## 2. Remaining work (order of today's brief)

0. Push 3 (05c4c04): needs owner OK for push to main (classifier block), then live checks and three "TEST - ignore" enquiries.
1. A9 typo-only reversible script (old values to docs/db-changes-<date>.json), featLabel code fix, duplicate taglines. A7 value-sending needs owner decision (#17).
2. PHASE B, at most 12 title/meta URL changes per deploy, 24 per night, validate JSON-LD before each push.
 - B1: "on the 12 pages where schema questions are not visible, render the Q&A visibly (accordion open in HTML, not click-only) so they match; remove any schema question that cannot be shown." Guardrail: additive; word count, headings and links may not drop; no schema type removed.
 - B2: "remove aggregateRating/review markup from Product and Organization schema and hide the rating badges/review counts that have no visible reviews, until real reviews exist (record the old DB values in the change log; do not delete them)." Guardrail: keep Product/Organization nodes and all other properties. Owner says published data is real, so confirm before hiding.
 - B3: "Remove Product schema from non-product pages. Add BreadcrumbList to /contact-us. Add ContactPage, and LocalBusiness/Organization consistency (foundingDate 2020, same name/address/phone everywhere)." Guardrail: parse every JSON-LD, absolute URLs, no duplicate @id.
 - B4: "include model numbers, fix the truncated and duplicate titles, align H1/title/meta (HM20 vs HBL22 mismatch). Keep each title under about 60 characters. Do not change slugs." Guardrail: only truncated/duplicate/missing-model defects; the 143 URLs in protected_pages_union.csv allow error-class fixes only; no home title/meta/H1.
 - B5: "stop the inherited 'Best ...' titles, fix og:url on hub pages to their own URL, remove 'agricultural equipment' wording wherever no such product exists, give each page its own social title and description." Guardrail: day brief says do not remove agricultural wording; hubs (/products, /gem-approved-fogging-machine-oem, /past-performance-government, /case-studies, /spare-parts, /knowledge, /blog) are protected, og:url fix only.
 - B6: "add the case-study detail pages and remove the duplicate /gem-approved-fogging-machine-oem entry. Keep lastmod honest." Guardrail: no other sitemap entry changes.
 - B7: "repeat the disallows for named bot groups; leave the AI bots allowed." Guardrail: existing robots rules unchanged.
 - B8: skipped by owner decision (see table).
 - Hidden footer keyword block: stays exactly as is; write docs/PHASE_B_NOTES.md assessing the Google hidden-text risk.
3. B9: "link product pages, case studies, knowledge guides and the GeM page to each other with descriptive anchors; add a 'Related case studies' block on product pages and a 'Related products' block on case studies. No keyword stuffing." Guardrail: add links only; never remove or reword existing links.
4. B10: "serve images in modern formats with fixed dimensions, lazy-load below the fold, preload the LCP image on home and product pages, fix any layout shift found; report Lighthouse/CWV before and after." Guardrail: no content change; one build at a time.
5. AEO (check protected_pages_union.csv and top_queries_union.csv for cannibalisation before each new page):
 - E1: "Rewrite public/llms.txt (and llms-full.txt if present) from the live catalogue and FACTS.md: correct products and URLs (no 404s), 2020 founding, services, certifications that are provable, GeM path ..., contact method, an FAQ section, and a 'last updated' date." Guardrail: valid existing llms.txt URLs may not be moved or removed; /products/100x-thermal-fogger-bf150 is a pre-existing 404, do not list it.
 - E2: "add per-item dates, product coverage for MCF42, ULV22, ULVSS10, IS 14855, ISO/CE only if provable, the GeM landing page, FAQ items; drop duplicates (mirrors) or mark canonical." ISO/CE certificate facts are open (#11, #12), so omit.
 - E3: "concise, answer-first summaries (40-60 words) at the top of the key pages (GeM OEM, IS 14855, thermal vs cold, government procurement, each product), plus a visible 'Last updated' and author/organization byline." Guardrail: new blocks only, no rewriting of existing paragraphs, no title/H1 change on protected pages.
 - E4: "one consistent Organization node (name, logo, url, foundingDate 2020, areaServed, contactPoint, sameAs for real profiles that exist)... Do not add profiles that do not exist." Use only profiles already linked in code (#14).
 - E5: "'How to buy a fogging machine on GeM (step by step)', 'IS 14855 explained for procurement officers', 'Fogging machine specifications checklist for tenders', 'Thermal vs cold fogging for municipalities'. Each 600-1,000 words, factual, with FAQ schema matching visible FAQs, internal links, added to the sitemap, and no unsupported claims." Guardrail: new URLs only; cannibalisation check; day brief forbids new scope "buyer's guide landing page" (confirm).
 - E6: docs/OFFSITE_TODO.md: Google Business Profile, GeM seller profile links, IndiaMART/TradeIndia, review collection, Search Console and GA4 setup, social profiles. No secrets.
6. Phase 0b: finalise docs/CONVERSION_STUDY.md; PR #27 is already merged; 15-line summary in the final report.
7. docs/SEO_WATCHLIST.md (every changed URL, GSC checks at 7 and 14 days), docs/DEFERRED_FOR_NEXT_WINDOW.md for anything above 24 URLs/night, SEO_CHANGELOG entries per change.
8. Final verification: SEO diff vs docs/seo-baseline, full Playwright on production, post-deploy checks, docs/OVERNIGHT_REPORT.md.
General: one build at a time, CI=1, 7.4 GB RAM. Agency folder exists: F:/dev/100x-evidence/agency/ (AGENCY_PROTECTED.md, protected_pages_union.csv, top_queries_union.csv, agency_keywords_union.csv); for those URLs only error-class fixes.

## 3. Open facts still unanswered (OPEN_FACTS.md)

- #1 Confirm single response promise "within 24 hours on working days".
- #2 Confirm spare-part dispatch "24-48 hours".
- #9 IS 14855 certificate number or BIS licence number (CM/L-...), and which models.
- #10 ISI licence number for 100XHM20 / 100XHBL22 (ISI claim itself confirmed real).
- #11 ISO 9001:2015 certificate number and issuing body.
- #12 CE marking declaration of conformity / notified body.
- #13 MSME / Udyam registration number.
- #14 Official social / business profile URLs (YouTube, Facebook, Instagram, Google Business Profile) beyond those already in code.
- #15 Real review collection (ratings markup returns when real reviews exist; also whether B2 proceeds).
- #16 Move the trolley (100XATS) out of the fogging catalogue (proposal only).
- #17 Honeypot: approve sending the hidden value or the flag-and-save alternative.
- #18 Lead value for call-back requests (separate value or reuse contact/GeM value).
- #19 GeM landing FAQ: OEM authorization "typically within 24-48 hours of receiving your registration".
- #20 Authorization turnaround "2-5 working days" on gem-oem-authorization, dealer-application, ai/dealer-authorization.
- #21 Letter PDF "within 24 hours" on /oem-authorization-letter and OemProcessSteps. (OPEN_FACTS also has a second row numbered 21: /past-performance-government meta/og still say "80+ departments across 15+ states"; owner to approve a meta fix.)
- Resolved 10-09, no longer open: #3-#8 trust numbers (kept as live), WHO-approved, ISI.
- Not numbered, noticed but unchanged: "200+ municipalities", "1,500+ UP customers", "8+ GeM Models", "50+ Products", machine dispatch lead times ("5-10 working days", "24-72h transit"); GeM Seller ID optional wording on pages (skipped, owner to approve exact wording).
