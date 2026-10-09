# OVERNIGHT REPORT (program 2026-10-08 / day run 2026-10-09)

Production: main 47d0c8d (push 5, deployed 2026-10-09 ~13:08Z). Item-by-item status: docs/PROGRAM_STATUS.md. Evidence: F:/dev/100x-evidence/overnight-2026-10-08 (CHECKPOINT.md, PUSH-LOG.md, push*/, live*/).

## Pushes

| # | head | contents | rollback |
|---|---|---|---|
| 1 | ebfa2c5 | step 0 docs, home pills | d81aaed |
| 2 | 7785acf | A1 A2 A5 A7(partial) A8b A10 | ebfa2c5 |
| 3 | 05c4c04 | A3 A4 A6, facts pass, lead-form tests | 7785acf |
| 4 | c750188 | batch 4 (A9 featLabel, B1-B3, B6, B7, B9), batch 5 (B4, B5, E1-E5), test-lead filter, A7 honeypot | revert 05c4c04..c750188 |
| 5 | 47d0c8d | B10 performance, watchlist, decisions report | revert c750188..47d0c8d |

## Final verification on production (2026-10-09 ~13:10-13:18Z, evidence live5/)

- Vercel production status success for 47d0c8d. Post-deploy checks 21/21: key pages 200, sitemap, robots, llms.txt, /api/health ok, protected APIs 401/403/405.
- SEO crawl of production: 234 sitemap URLs, all 200; identical to the gated build (0 diffs). Against docs/seo-baseline: 186 diffs, 26 added URLs, 0 missing; the same set reviewed at the push-4 gate (approved B/E items, A9 typo fixes and facts-pass wording). No canonical, robots or status change.
- Agency-protected title/meta/H1 (143 URLs): 0 changes in push 5. Changes over the whole program: /about meta (fact fix) and the B4 rows only. /products/100x-thermal-fogger-bf150 was 404 before the program and still is.
- Playwright on production (all lead APIs intercepted, no real leads): desktop-chrome 30 passed + 1 touch-only skip, mobile-chrome 31 passed. Mobile-safari was not run on production: WebKit hung on exit twice in the push-5 gates (all its specs passed there).
- Lead forms after push 4 (honeypot): RFQ, contact and GeM "TEST - ignore" enquiries saved with email + attribution; RFQ e-mail sent; no generate_lead fired for test names.

## Lighthouse (mobile, local Lighthouse 12.8.2 against production)

Before B10 (b10/lh-before.txt): home perf 45-51, LCP 7.9 s (hero image lazy, preload pointed at an unused tablet image); TFS50 LCP 7.0 s; mini-fogger LCP 4.0 s; /products, /case-studies, GeM page LCP 9.7-11.8 s; CLS 0 everywhere; TBT 0.5-1.1 s (mostly Google Tag Manager). After B10 (b10/lh-after.txt, 2026-10-09, same pages, 2 runs each, min/max perf and median LCP; lab numbers vary run to run):

| page | perf before | perf after | LCP before | LCP after | TBT before | TBT after |
|---|---|---|---|---|---|---|
| / | 45/51 | 48/51 | 7.9 s | 5.3 s | 1062 ms | 1156 ms |
| /thermal-and-cold-fogging-machine-100xtfs50 | 46/56 | 44/59 | 7.0 s | 6.5 s | 775 ms | 697 ms |
| /products/mini-fogger-100xbf102-2d9887 | 42/65 | 64/70 | 4.0 s | 3.8 s | 863 ms | 720 ms |
| /gem-approved-fogging-machine-oem | 49/53 | 51/55 | 11.2 s | 9.6 s | 604 ms | 574 ms |
| /products | 49/61 | 53/62 | 9.7 s | 7.9 s | 484 ms | 514 ms |
| /case-studies | 55/57 | 51/56 | 11.8 s | 9.7 s | 687 ms | 563 ms |

CLS stays 0.000 everywhere. The clearest gain is the homepage LCP (hero image now preloaded at high priority). On /products, /case-studies and the GeM page the LCP is still the floating video popup thumbnail (see below).

The 9.7-11.8 s LCP on /products, /case-studies and the GeM page is the floating video popup: its 25 KB thumbnail is not slow, the admin popup delay on live is 0 (delayMs 0; 5 s is only the code fallback), so the popup opens about 0.8 s into the page, before visitors interact, and is then the largest paint. The thumbnail is already fetched only when the popup opens. Options for the owner: raise the popup delay in admin to about 5-8 s (no code; improves field LCP for visitors who scroll or tap first, lab score unchanged), or open the popup on first scroll/tap (code change; removes it from LCP in lab and field).

## Owner decisions and open facts

See docs/DECISIONS_PENDING.md (footer keyword block, A9 fact rows, claims and promises to confirm, certificate numbers, profiles, canvas poster, test-lead conversions) and docs/OPEN_FACTS.md.

## Search Console follow-up

docs/SEO_WATCHLIST.md: every changed URL, checks on 2026-10-16 and 2026-10-23 (Core Web Vitals on 2026-10-23 and 2026-11-06).
