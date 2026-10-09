# Phase 0b: conversion study, www.100xcircle.com (FINAL)

Final pass 2026-10-09. The original findings below are unchanged and describe the site as of 2026-10-08 (main `b81bbe4`). Items the study could not finish are now marked **NOT TESTED** with the data or test that would settle them. See "9. Status after the 2026-10-08/09 program" at the end for what shipped.

Date: 2026-10-08. This was read-only work. Code was read from production main `b81bbe4`, through the clean worktree `F:/dev/100x-seo-baseline`. The live site is https://www.100xcircle.com.

**Data rules followed.** I only read the production DB (find/aggregate/count). Every number was computed inside the scripts, and only aggregates were written out. Cells under 3 are shown as "<3". No name, phone, e-mail, organisation or message appears anywhere in this folder. Duplicates were found by salted-hashing phone numbers inside the script. In the browser, every non-GET request was answered locally with a fake 200, and every GA4 and Ads beacon was captured and stubbed, so nothing reached Google. WhatsApp was blocked and only dummy data was typed. Nothing was sent to production.

**Disclosure.** One early schema probe captured `name` values from the `revenue_attribution` collection, because a field allow-list included "name". I removed them from the output file straight away. They appear nowhere in this folder or in this report.

**Collection was stopped early on the owner's instruction.** Steps that were not finished are marked **NOT TESTED** (originally "not done in time" or "could not complete"). No results were invented for them; section 7 lists the data or test each one needs.

---

## 0. Summary (15 lines)

1. Leads, 8 Apr to 8 Oct 2026: 236 rows (submissions 173, RFQ popup 34, brochure 29). 71 (30%) are test or junk. 72 rows come from 6 phones that were each used 5 or more times, which is almost certainly staff testing.
2. Probable real buyers: about **110 distinct phones in 6 months (about 18 a month)**. August peaked at 41.
3. Storage gaps: `submissions` stores no device or user agent. Brochure leads store no UTM or gclid. UTM tags are almost never present: 3 clean leads carried a `chatgpt.com` utm_source and nothing else did.
4. 58 clean leads carry a **gclid**, mostly from Aug and Sep. Ads traffic converts, but the DB's own Ads and GA4 sync stopped in June 2026, with zero spend in the stored rows.
5. Field completeness is thin. 78% of clean leads have **no organisation**, so the buyer mix cannot be measured. Of the leads that do, private businesses outnumber government about 8 to 1 (17 vs <3, with 17 more unclassifiable).
6. **The tracking over-counts.** Every homepage page view fires a Google Ads conversion (label `Gwt1…`), so Ads "conversions" include plain visits.
7. An RFQ submit fires **2 Ads conversions** (`generate_lead` plus the `/thank-you?type=rfq` URL rule). It fires them **even when the server returns 500**: I tested this, and the user still sees "Thank you".
8. GA4 receives **no lead events at all**, only page_view, form_start, form_submit, scroll and user_engagement. Hits go to two GA4 properties (G-GEWH… and G-32RK…). The stored GA4 sync shows 0 conversions.
9. Phone and WhatsApp clicks each fire an Ads conversion, which counts intent, not leads. The quote modal, contact form, reseller form and dealer form fire on success only. Brochure tracking was NOT TESTED (code says it fires brochure_download and generate_lead).
10. Mobile, slow 4G: the first unobstructed CTA appears in 2.4–4.7 s, but CTAs only respond to taps after **3.1–8.8 s** (the homepage is slowest). On desktop the figures are 0.4–0.8 s and 0.7–1.2 s.
11. **Biggest friction on mobile:** a floating YouTube Shorts player opens on most pages. Together with the GeM pill, the RFQ ribbon and the bottom bar, it **physically covers in-page form submit buttons**. My scripted taps on "Send enquiry", "Register as Reseller" and "Apply for Dealership" all timed out until I closed the video.
12. Shortest working paths: mobile bottom bar to quote modal (4 taps, 2 fields) and product page to on-page form (4 taps). The RFQ ribbon takes 6–7 taps because its product dropdown comes first.
13. Gov-buyer friction: the GeM page form is for resellers only. The government-procurement form sits about 26,500 px down on mobile and uses 14 px inputs, so iPhones zoom in. /dealer-application has no form, only WhatsApp links. Many government CTAs are WhatsApp-only or mailto-only.
14. Peers (IndiaMART, IndustryBuying, GeM listings, Aspee, BigHaat) show **prices or price bands, ratings with counts, response-rate badges, BIS CM/L numbers and test reports** (on GeM), plus delivery estimates and catalogue PDFs. 100X shows none of these on its own site, although IndustryBuying lists a 100X model with a price.
15. Revised Phase A, in order: (1) fix conversion tracking, (2) remove the video popup and declutter the mobile floating stack, (3) make the RFQ flow honest on failure, (4) store device, UTM and gclid on every lead and persist attribution, (5) add a government-buyer form and trust pack (prices or bands, BIS/test docs, GeM link), (6) shorten the RFQ ribbon form.

---

## 1. Lead data (production DB, aggregates only)

Sources: `leads-aggregate.json`, `repeaters.json`, `gclid-by-month.json`. Scripts: `scripts/leads-aggregate.mjs`, `scripts/repeaters.mjs` and `scripts/gclid-month.mjs`.

**Collections.** Lead data lives in `submissions` (234 rows all-time; types: rfq, contact, sticky_quote_request, brochure, gem_popup, gem_popup_submit_only, partner_application, gem_reseller_registration, dealer_application, contact_inquiry), in `rfq_popup_leads` (34) and in `brochure_leads` (29). `oem_leads`, `rfq_leads` and the other candidate collections are empty or absent. Also present: `analytics_events` (490 click beacons) and `revenue_attribution` (136 rows, a copy of leads). The earliest lead is from 2025-07. `createdAt` is stored as an ISO string.

### 1.1 By month (IST)

| Month | submissions | rfq_popup | brochure | all rows | junk/test | clean | clean, first-time phone |
|---|---|---|---|---|---|---|---|
| 2026-04 (from 8th) | 10 | <3 | <3 | 10 | 3 | 7 | 5 |
| 2026-05 | 30 | 13 | <3 | 43 | 14 | 29 | 5 |
| 2026-06 | 36 | 12 | 4 | 52 | 37 | 15 | 11 |
| 2026-07 | 14 | 9 | 8 | 31 | 6 | 25 | 18 |
| 2026-08 | 54 | <3 | 8 | 62 | 9 | 53 | 41 |
| 2026-09 | 24 | <3 | 6 | 30 | <3 | 28 | 25 |
| 2026-10 (to 8th) | 5 | <3 | 3 | 8 | <3 | 8 | 4 |

The RFQ popup produced nothing after July. It looks disabled; I did not check its config.

**Probable genuine buyers.** I counted distinct phones in the window after excluding `_test` rows, bad phone patterns, the company's own numbers and any phone used 5 or more times. The result is **110**, split by first month as Apr 5, May 3, Jun 14, Jul 18, Aug 41, Sep 25, Oct 4.

### 1.2 By form and location (clean rows)

| Form @ location | n |
|---|---|
| RFQ form @ floating ribbon | 42 |
| RFQ popup | 25 |
| Brochure @ navbar | 21 |
| Quote modal (mobile bottom bar, `sticky_quote_request`) | 17 |
| RFQ form @ product page | 14 |
| gem_popup_submit_only | 10 |
| submissions/brochure | 9 |
| Contact form | 6 |
| partner_application | 5 |
| gem_reseller_registration | 4 |
| gem_popup; RFQ @ mid-page block | 3 each |
| brochure @ product page or products page; RFQ @ vehicle-mounted landing | <3 each |

Of the window's rows, 35 had "GeM authorization required" ticked and 31 had "Dealer/distributor inquiry" ticked. 10 had a file upload.

The app's own lead classifier (`leadType`) is applied to only 124 of 236 rows. Its labels: general 57, gem_inquiry 10, dealer_application 4, farmer 3, OEM authorisation <3, end customer <3.

### 1.3 By page URL, landing page and referrer (clean rows)

- **Form page** (where the lead was submitted): / 47; not stored 18; /gem-approved-fogging-machine-oem 18; HBL22 product 13; TFS50 landing 12; mini fogger 9; DB400 landing 8; /products 6; /contact-us 5; /fogging-machine-government-procurement 4; SSMA20 3; HM20 3; each other page <3. That covers 3 knowledge or blog pages, 2 compare pages and spare parts.
- **Session landing page:** / 56; not stored 63; /gem-approved-fogging-machine-oem 14; /products 10; DB400, gov-procurement, vehicle-mounted and mini fogger 3 each.
- **Entry referrer:** direct/none 97; google.com 62; Google app 3; Bing <3. Search is the main source of tracked leads.

### 1.4 UTM, gclid and device

- **utm_source, utm_medium and utm_campaign are effectively unused.** 3 clean leads carry utm_source `chatgpt.com`. The rest are test values (verification, acceptance tests) or empty. Medium and campaign are empty on every lead.
- **gclid** is present on 50 of 173 submissions and 11 of 34 popup leads. Brochure leads never store it. **Clean leads with a gclid: 58.** By month (submissions): Jun <3, Jul <3, **Aug 32, Sep 12**, Oct <3. Popup: Jun 4, Jul 7.
- For gclid leads, the landing page was / 29, /products 10, the GeM page 6 and others <3. Session depth was 1 page for 15, 2–3 pages for 26 and 4+ pages for 9.
- **Device** is not stored on `submissions`, which hold 73% of leads. From the popup user agent: desktop 25, mobile 9. Brochure `device` field: desktop 20, mobile 8. This desktop skew is unusual for India, and it may be partly staff testing.
- fbclid: 0.

### 1.5 Field completeness per form (whole window, so tests are included)

| Form | n | valid phone | email | organisation | state | quantity | message | message length bands |
|---|---|---|---|---|---|---|---|---|
| RFQ form | 76 | 87% | 21% | 18% | 20% | 83% | 18% | empty 62, 1–20: 6, 21–100: 7, 101–300 <3 |
| Contact | 34 | 62% | 24% | 59% | 0% | 0% | 82% | empty 6, 1–20: 9, 21–100: 16, longer <3 |
| RFQ popup | 34 | 88% | 97% | 0% | 0% | 0% | 97% | 1–20: 16, 21–100: 17 |
| Brochure (`brochure_leads`) | 29 | 100% | 100% | 76% | 97% | 0% | 0% | empty |
| Quote modal | 17 | 100% | 0% | 0% | 0% | 0% | 100% | 21–100: 13 |
| partner_application | 11 | 82% | 82% | 100% | 100% | 0% | 82% | mostly 1–20 |
| gem_popup_submit_only | 10 | 100% | 0% | 0% | 0% | 0% | 0% | empty |
| gem_reseller_registration | 4 | 100% | 0% | 100% | 100% | 0% | 0% | empty |

Two things stand out. The forms that collect the most leads (RFQ form and quote modal) collect almost no qualifying data. And only 3 leads in total had a gov.in or nic.in e-mail domain.

### 1.6 Junk rate

- Flags across the 236 rows (a row can have more than one): test-like name 49; `_test` flag 23; invalid phone pattern 32; phone under 10 digits 4; honeypot filled 0. The honeypot is never sent by the forms, as PHASE0 already noted.
- **71 of 236 rows (30%) are junk or test.** June was worst, at 37 of 52.
- **Duplicates.** There are 148 distinct phones across all time. 29 of them appear more than once, and one phone appears 43 times. In the window, 99 rows repeat an earlier phone, 56 of them among the "clean" rows. 72 rows come from the 6 phones each used 5 or more times; these are not the company's published numbers, but they are almost certainly internal testers. Rows using a company number: <5.
- **Empty leads** (no name and no phone): 0. The RFQ popup's `gem_popup` type has a valid phone on only 43% of rows.

### 1.7 Buyer mix (rough)

**Method.** Keyword rules ran on the organisation text inside the script, with the e-mail domain used as a tie-break:
- government: defence, PSU, health, municipal/local and other-department keyword lists;
- private: Pvt, Ltd, LLP, traders, agency, services and similar;
- individual: an empty or "self" organisation, or an organisation identical to the name.

Results for clean rows (n=165):
- **no organisation given: 129 (78%)**
- private business: 17
- organisation text matched no rule: 17
- government (other department): <3
- government (health): <3
- defence, PSU and municipal: 0

**Error margin.** Unknowable for 78% of leads. Among the 36 that give an organisation, I estimate ±5 leads of misclassification. Known weaknesses:
- "health" or "hospital" also matches private hospitals;
- municipal words in a firm's name (for example "Nagar Traders") are caught as private only if a business word is present;
- Hindi-script text is not handled;
- abbreviations such as "NN" or "CMO office" are only partly covered.

The real finding is that **the forms do not ask who the buyer is**, so the government share cannot be measured.

### 1.8 Peak days and hours (clean, first-time leads, IST)

- **Days:** Tue 23, Wed 18, Thu 17, Mon 15, Fri 14, Sat 12, Sun 10.
- **Hours:** the peak is 12:00–13:00 (14). Other strong slots are 09:00, 10:00 and 15:00 (9, 9 and 8). There is a smaller evening tail from 20:00 to 23:00 (15 in total).
- Leads are business-hours weighted, as you would expect for government and B2B buyers.

### 1.9 Click beacons (`analytics_events`, the site's own)

| Month | whatsapp_click | call_click | rfq_start | rfq_submit | contact_submit |
|---|---|---|---|---|---|
| Jun | 53 | 22 | 10 | 8 | 4 |
| Jul | 31 | 20 | 10 | <3 | 0 |
| Aug | 62 | 23 | 70 | 41 | 4 |
| Sep | 43 | 23 | 23 | 12 | <3 |
| Oct (8 days) | 12 | 4 | 8 | 3 | 0 |

Where these come from:
- WhatsApp clicks: mobile bar 166, floating button 34.
- Call clicks: all from the mobile bar.
- WhatsApp clicks by page: the GeM page (57) beats the homepage (44).

The **RFQ start-to-submit ratio is about 55%** (Aug 41 of 70; across the whole window 61 of 121, the denominator including test and verify rows). That is roughly 2 starts for every submit.

### 1.10 What is missing in the data

- Device or user agent on `submissions`.
- UTM and gclid on brochure leads, GovRFQ, the tender pack and the RFQ popup's top-level fields. Partial elsewhere.
- Persistent attribution: it is kept in sessionStorage, which is lost after the session.
- Organisation type or buyer type, on any form.
- Lead outcome (quoted, won, value). `revenue_attribution` has only stage `lead`, apart from 1 `qualified_lead`, with no revenue and no gclid.
- A fresh GA4, Ads or GSC sync. The newest synced rows are from June 2026. Ads overview rows show 0 spend because campaigns were paused at sync time.

---

## 2. Persona walk-throughs (real headless Chromium)

**Setup.** Mobile: 390 px viewport with Lighthouse "slow 4G" (150 ms RTT, 1.6 Mbps, 4x CPU throttling). Desktop: 1366 px, unthrottled. Screenshots are in `shots/<flow>/` (and `shots/discover/`, `shots/explore/`). Results are in `discover.json`, `personas-gov-home.json`, `personas-rerun.json` and `personas-run.log`.

**How taps are counted:** CTA clicks, dropdown opens and option picks, checkbox taps and field taps. The final submit is included. "Closing the video popup" is counted where it was needed.

**Timing columns:**
- "First CTA": time until the first unobstructed CTA is painted. It is usually the header phone icon.
- "Interactive": time until a quote CTA has React handlers attached, meaning it reacts to a tap.

### 2.1 Results

| Persona / page | Device | Path to a submitted enquiry | Taps | Fields typed (required) | First CTA / interactive | Result |
|---|---|---|---|---|---|---|
| Gov buyer, homepage | mobile | RFQ ribbon → product dropdown → GeM tick → name, phone → Send RFQ | 7 (8 incl. closing video) | 2 (product, name, phone) | 4.4–4.7 s / **8.4–8.8 s** | /thank-you?type=rfq |
| Gov buyer, homepage | desktop | same | 7 | 2 | 0.5–0.8 s / 0.7–1.0 s | thank-you |
| Gov buyer, homepage, GeM pill | mobile and desktop | pill → form opens **with GeM box pre-ticked** (verified) → product → name, phone | 6 | 2 | 4.3–4.5 s / 6.3–7.0 s | thank-you |
| Gov buyer, TFS50 product page | mobile | bottom bar "Get Price" → quote modal (name, phone, optional need) | 4 | 2 (name, phone) | 3.5 s / 5.5 s | /thank-you?type=sticky_quote |
| Gov buyer, TFS50 product page | desktop | "Request Formal Quote" → on-page RFQ (product preset) | 4 | 2 | 0.8 s / 1.1 s | thank-you |
| Gov buyer, /gem-approved-fogging-machine-oem | mobile | bottom bar "Request Tender Quote" → quote modal | 4 | 2 | 3.8 s / 5.4 s | thank-you |
| Gov buyer, GeM page | desktop | RFQ ribbon. The page's own form is reseller-only (company, name, mobile, city, GeM ID, GST, capacity) | 7 | 2 | 0.7 s / 0.9 s | thank-you |
| Gov buyer, knowledge article (gov procurement guide) | mobile / desktop | bottom bar → modal / ribbon | 4 / 7 | 2 | 2.4 s / 3.1 s; 0.7 s / 0.7 s | thank-you |
| Gov buyer, /past-performance-government | mobile / desktop | the in-page "Request Reference List" is WhatsApp-only and "Email Reference Request" is mailto-only; used bottom bar / ribbon | 4 / 7 | 2 | 4.1 s / 5.2 s; 0.4 s / 0.7 s | thank-you |
| Gov buyer, case study (Muzaffarpur) | mobile / desktop | no in-page form; bottom bar / ribbon | 4 / 7 | 2 | 3.7 s / 4.7 s; 0.8 s / 1.0 s | thank-you |
| Gov buyer, /fogging-machine-government-procurement department RFQ form | mobile | scroll **26,545 px** to the form; 9 fields, 4 required (department, officer, state, phone) | NOT COMPLETED: typing the officer name timed out twice; needs a re-run with the floating video closed and the form scrolled into view | — | 4.0 s / 5.1 s | not completed |
| GeM reseller, GeM page | mobile | close video → "Register as Reseller" → form | 7 | 4 (company, name, mobile, city/state) | 3.4 s / 4.7 s | /thank-you?type=oem_authorization |
| Dealer, /dealer-program | mobile | close video → "Apply for Dealership" → form | 7 | 2 + state dropdown (3 required) | 2.9 s / 5.3 s | /thank-you?type=dealer_inquiry |
| Dealer, /become-a-dealer → /dealer-application | mobile | the application page has **no form**: 4 "Apply via WhatsApp" buttons only | 2 taps then WhatsApp | 0 | 2.7 s / 4.7 s | leaves the site, no lead record |
| Farmer / B2C, blog "best fog machine for home use" | mobile / desktop | bottom bar "Get Quote" → modal / ribbon | 4 / 6 | 2 | 2.9 s / 3.6 s; 0.6 s / 0.9 s | thank-you |
| Farmer / B2C, mini fogger product | mobile / desktop | "Get Price" → modal / "Request Formal Quote" | 4 / 4 | 2 | 3.5 s / 4.9 s; 0.7 s / 1.0 s | thank-you |
| Any buyer, /contact-us (where the header "Request a Quote" leads) | mobile | close video → scroll about 3,400 px → name, phone → Send enquiry | 4 | 2 | 2.8 s / 3.5 s | /thank-you?type=contact |

### 2.2 Field details

| Form | Fields (required\*) | tel / email keyboard | autocomplete | Validation |
|---|---|---|---|---|
| RFQ form (ribbon, pill, product page) | product\* (custom dropdown, 7 generic options), quantity, 2 checkboxes; then name\*, phone\*; e-mail, organisation, city/state, description and upload behind "Add more details" | phone `type=tel` / `inputmode=tel` OK; quantity `inputmode=numeric`; no e-mail keyboard shown | name and tel OK | The **Send RFQ button stays disabled** until a product is chosen, with no message saying why. JS messages for phone and e-mail. Product trigger text is 14 px. |
| Quote modal (mobile bottom bar) | name\*, phone\*, "what do you need" | tel OK | name and tel OK | Native "Please fill out this field"; on server error: "We couldn't save your request. Please try again or call us." The placeholder asks for "Phone number (with country code)", which is unnecessary friction for Indian numbers. |
| Contact form | name\*, phone\*, organisation, requirement | tel OK | name, tel and organisation OK | Native; on error, a clear message |
| GeM reseller form | company\*, name\*, mobile\*, city/state\*, GeM seller ID, GST, capacity | tel OK | organisation, name, tel, address-level1 OK | Native |
| Dealer form | name\*, mobile\*, state\* (select), city, company, business type, GeM ID | tel OK | name, tel, organisation OK | Native |
| Gov department RFQ form | department\*, officer\*, state\*, phone\*, e-mail, quantity, procurement type, tender deadline, message | phone is `type=tel` but has **no autocomplete on any field** | none | **14 px inputs: iOS zooms in on focus.** Native validation. |
| Brochure modal (header "Brochure" or "Download Brochure") | name\*, phone\*, **e-mail\***, organisation, state select (+ hidden honeypot) | — | **none** | NOT TESTED: the modal was not submitted. Needs a stubbed-network run of the brochure form |

### 2.3 Success state, thank-you and slow connections

- **Success state.** Every successful path routes to /thank-you with the same text: "Thank you — we received your inquiry | Your message has been saved securely. A member of our team will review it and respond as soon as possible." It shows phone, WhatsApp, e-mail and "Contact Us" links. There is no reference number, no promised response time and no next step specific to the form (for example, a GeM buyer gets no "here is our GeM listing" link). The RFQ form also **opens WhatsApp in a new tab** before the POST.
- **Slow API (8 s delay), RFQ form.** The button shows "Sending…" and is disabled, then the page navigates after about 9.7 s. That is acceptable.
- **Failing API (HTTP 500), RFQ form.** The user still sees the thank-you page, and both Ads conversions fire. The lead is lost silently, with only the WhatsApp tab as a fallback.
- **Failing API, quote modal and contact form.** A clear error is shown, no conversion fires, and the user stays on the page. This is correct behaviour.
- In 3 of 12 mobile runs, the client-side navigation to /thank-you took about 61 s. This may be an artefact of the test harness and needs a field (RUM) check.

### 2.4 Friction points (page → element)

1. **Every page on mobile:** a floating YouTube Shorts player (bottom-right, about 50% of the width and 360 px tall) **covers in-page submit buttons and CTAs**. Seen on /contact-us "Send enquiry", the GeM page "Register as Reseller", and /dealer-program "Apply for Dealership". Scripted taps timed out until it was closed. (`shots/contact/contact-m-2-submitEmpty.png`, `shots/gem-reseller/gem-reseller-m-1-click.png`)
2. **Mobile floating stack:** the GeM pill (y≈667), the RFQ ribbon (y≈719) and the 3-button bottom bar (y≈786) take about 22% of an 844 px viewport, plus the header. They overlap the product H1 and description (`shots/discover/product-tfs50-m-top.png`).
3. **Mobile homepage:** quote CTAs only respond after **8.4–8.8 s** on slow 4G, against 3–5.5 s on other pages. The hero is an image carousel with a video popup, and the header logo overlaps the banner text.
4. **RFQ ribbon form:** the product dropdown comes first, with 7 generic categories. Name and phone appear only after a product is picked. Send stays disabled with no hint. It takes 6–7 taps, against 4 for the quote modal.
5. **RFQ form:** shows "thank you" and fires conversions on server failure. It opens WhatsApp automatically, so the user leaves the site mid-flow.
6. **GeM page:** the only form is for resellers. A government buyer has no "buy from us on GeM" path or GeM listing link and must use the generic ribbon or WhatsApp.
7. **/fogging-machine-government-procurement:** the department form is about 26,500 px down on mobile. The top CTA "WhatsApp: Request Tender Quote" and its 12 table "Quote / Tender Quote" buttons are WhatsApp-only. Inputs are 14 px (iOS zoom) with no autocomplete. The scripted run could not complete typing the officer name.
8. **/past-performance-government:** "Request Reference List" is WhatsApp-only and "Email Reference Request" is mailto-only. Neither creates a trackable lead record.
9. **/become-a-dealer → /dealer-application:** no form, only 4 "Apply via WhatsApp" buttons. /dealer-program has a working form, so dealers meet two inconsistent paths.
10. **Header "Request a Quote" → /contact-us:** the contact form is about 3,400 px down on mobile, and there is no e-mail field.
11. **Brochure modal:** e-mail is required and no field has autocomplete. Gating a brochure behind 3 required fields is the heaviest ask on the site.
12. **Thank-you page:** generic, with no reference number, no response-time promise and no next step.
13. **Quote modal:** the phone placeholder demands a country code.

---

## 3. Tracking reality (code plus live, with every beacon stubbed)

**Setup.**
- GTM container `GTM-5JMGCKRW` (public gtm.js, version 10, parsed in `scripts/gtm-parse.cjs`) has only Google Ads tags (`AW-17730009010`) and **no GA4 tag**.
- GA4 is loaded directly by gtag (`G-GEWH5YB3PS`, page_view only). A second GA4 property, **`G-32RK29MZE5`**, also receives every hit. It is not in the code and is presumably linked through the Google tag.
- Custom `dataLayer.push({event})` calls reach GTM, but the gtag GA4 config ignores them.

**Ads conversion tags in GTM:**

| Trigger | Ads label | Status |
|---|---|---|
| `whatsapp_click` | `8j5s…` | live |
| tel: link click | `n7D2…` | live |
| `contact_form_submission` | `d5fW…` | live |
| `generate_lead` | `MaD0…` | live |
| YouTube channel link click | `b3QO…` | live |
| URL contains `/thank-you?type=rfq` (history change) | `j_-s…` | live |
| `rfq_submit` | — | paused |
| GTM form submit | user-provided-data tag | live |

**Observed live** (`personas-gov-home.json`, `personas-rerun.json`, `beacons.json`):

| Action | dataLayer | Google Ads conversion(s) | GA4 | Fires on |
|---|---|---|---|---|
| **Homepage page view** | — | **`Gwt1…` conversion on every homepage load** (not on /products, /contact-us, a blog post or the GeM page) | page_view (×2 properties) | every visit. Probably the Ads URL-based "Request quote (www.100xcircle.com/)" action. Owner to confirm in the Ads UI. |
| RFQ form submit (ribbon, pill, product page) | rfq_form_submit_attempt, rfq_submit, generate_lead | **MaD0 + j_-s = 2 conversions** | form_start, form_submit, page_view of /thank-you; **no lead event** | **attempt** (fires even on HTTP 500; verified) |
| Quote modal (mobile bar) | quote_form_submit_attempt, then generate_lead | MaD0 (1) | form_start / form_submit only | success only (verified on a 500) |
| Contact form | contact_form_submit (global listener, on attempt), contact_form_submit_attempt, then generate_lead + contact_form_submission on the thank-you page | **MaD0 + d5fW = 2** | form_start / form_submit | success only (verified) |
| GeM reseller form (LandingFormBlock) | (pushes not visible after navigation) | MaD0 (1) | form_start | success (per code) |
| Dealer form | dealer_application_attempt, generate_lead | MaD0 (1) | form_start | success (per code) |
| Gov department RFQ | generate_lead | MaD0 (1) | — | success (per code; `data.ok`) |
| Phone click (header, mobile bar) | phone_click | n7D2 (1) | nothing | the click (intent, not a call) |
| WhatsApp click (link, mobile bar, floating button) | whatsapp_click (one push each; **no double count seen**) | 8j5s (1) | nothing | the click |
| RFQ form's automatic WhatsApp | none (`window.open`) | none | none | — |
| Brochure download | brochure_download + generate_lead on /brochure-thank-you (per code) | MaD0 (per code) | file_download only if a .pdf link | NOT TESTED live. Needs a stubbed-network brochure run to confirm the events and whether Ads fires |

**What each tool can count today:**

- **Google Ads:**
  - Every homepage view.
  - 2 conversions per RFQ attempt (successful or not) and 2 per contact lead.
  - 1 per quote-modal, reseller, dealer or gov lead.
  - Every phone and WhatsApp tap.
  - Its "conversions" therefore mix visits, clicks and double-counted leads, and cannot be used for bidding as configured.
  - The DB's last Ads sync (June) showed "Request quote" 3 and "Contact" 2. Every other action was 0.
- **GA4:**
  - Page views, scrolls, engagement and enhanced-measurement form_start / form_submit (form_submit fires on attempts).
  - **No generate_lead or lead key event**, so GA4 cannot count leads or attribute them. The DB's GA4 sync showed 0 conversions.
  - Some traffic is split across two properties.
- **The site's own `analytics_events`:** clicks, plus rfq_submit on attempt.
- **The DB lead records:** the only reliable lead count, after the junk filtering in §1.

---

## 4. Peer benchmark (public pages only; described, not copied)

| Peer / listing | What a buyer sees that 100X's own site does not show |
|---|---|
| **GeM listings: Indofog (CI-125/CI-175), Boschwise (HDHDA18 / HDCM18), Pulsfog (RPF-10, K-30 vehicle)** | Exact offered price next to MRP (portable thermal about ₹54k–79k; vehicle-mounted about ₹10.9 lakh); a stated BIS **CM/L licence number** and test-certificate reference; IS 14855 (Part 1) declared per listing; ISI mark yes/no; minimum quantity; stock quantity; downloadable specification. Some licence dates look expired, which is a verification gap 100X could exploit by showing a current licence. |
| **IndiaMART category and seller pages (e.g. a Gujarat agri seller; a mini-fogger category)** | A price per piece on every card (handheld thermal about ₹4k–15k; petrol thermal about ₹14k–19.5k; SS / ISI about ₹25k–45k; vehicle-mounted about ₹80k–1.8 lakh); star rating with review count (e.g. 4.4 from 130-plus); **response-rate %**; years in business; GST / TrustSEAL badges; "Get Best Price", Call and WhatsApp on every card. |
| **IndustryBuying (fogging category; Aspee, Kisankraft, Vinspire, and a 100X DB50 listing)** | Price with strike-through MRP and % off (**a 100X double-barrel model is listed there at about ₹3.46 lakh**, so a price is already public elsewhere); ships-within estimates (24 h / 3 / 8 days); ratings and written reviews; "Smart Quotation" for bulk; buy on credit; add to cart. |
| **Aspee (own site)** | Downloadable pocket and technical catalogue PDFs; dealer search; "78+ years / 2000+ dealers" scale claims; floating WhatsApp; a "Get in touch" popup with a product-category selector. No prices and no response promise. |
| **Kisankraft (own site)** | Public MRP-list PDF; "Find a Dealer"; app QR code. No enquiry form. |
| **BigHaat (Neptune handheld, B2C)** | Price with % discount; free-delivery claim; missed-call ordering; review count; warranty / defect window; bulk-order banner when out of stock. |
| **Neptune (marketplaces only; no own site found)** | Model codes with tank size and fuel consumption on every listing; prices from about ₹10k to ₹60k. |

**Common pattern 100X lacks:** some price signal (exact, band or MRP list); third-party ratings with counts; a stated response promise or response rate; certificate numbers rather than logos; a downloadable spec or catalogue without a lead gate; a delivery estimate; and, for government buyers, a link to the live GeM listing with its price.

Benchmark limits: GeM pages could not be fetched directly (DNS failure from this machine), so GeM details come from search-result snippets. I did not cover 8 manufacturer sites, only 6 brands and 3 marketplaces.

### 4.1 Owner's local projects (vipdealers / togetherimport, read-only)

Togetherimport is not a separate folder. It lives inside `F:/dev/vipdealers` (`docs/togetherbuying/`). Patterns worth reusing:
- **An instant WhatsApp plus e-mail confirmation to the submitter**, carrying what changed, the next action and a deep link, with an admin mirror notification.
- **A honeypot that flags instead of blocks.** It adds `spamSignals: ['honeypot']` and still accepts, because a wrongly blocked real buyer costs more than spam.
- Per-phone and per-IP rate limits on public lead forms.
- **Pincode → state lookup**, which saves a field.
- A Hindi/English toggle in a colloquial register.
- A public brochure-request form whose payload carries no price.
- Dealer-side items: a dealer "Kamai" (earnings) calculator, shareable co-branded dealer pages, and a "login to see dealer price" gate.
- Group-buy items: progress and social proof ("X dealers backing"), plain-language refund terms, and a public Q&A that cuts repeat WhatsApp questions.

---

## 5. Funnel numbers I could measure

| Stage | Number (8 Apr to 8 Oct 2026, unless noted) |
|---|---|
| Sessions | Not measurable now. Last GA4 sync, 8 May to 5 Jun 2026: 499 sessions, 172 users, 2,673 page views; Organic 214, Direct 192, Referral 47 sessions; 0 conversions |
| Search clicks | Last GSC sync, 19 May to 16 Jun: homepage 32 clicks from 1,727 impressions (position 6.9); top blog post 19 from 1,008; GeM page 6 from 291 (position 5.7) |
| RFQ form starts → submits (site beacons) | 121 → 61 (about 50%; includes some test rows) |
| WhatsApp / call taps (site beacons, Jun to 8 Oct) | 201 / 92 |
| Lead rows stored | 236 |
| Clean (non-test) | 165 |
| Probable distinct real buyers | about 110 (about 18 a month; Aug 41, Sep 25) |
| Clean leads with gclid (paid search) | 58 |
| Leads with an organisation stated | 36 |
| Government-identifiable leads | <5 |
| Quoted / won / revenue | Not stored |

---

## 6. Top 10 friction points, ranked by expected impact and effort

| # | Fix | Impact | Effort |
|---|---|---|---|
| 1 | **Fix conversion tracking:** remove the homepage-view Ads conversion; one `generate_lead` per lead, fired only on server success (RFQ too); drop the `/thank-you?type=rfq` URL tag or the generate_lead tag; send `generate_lead` to GA4 (gtag event or GTM GA4 tag) and mark it a key event; settle the second GA4 property | Very high: Ads bidding is optimising on page views and clicks | S |
| 2 | **Remove or defer the floating YouTube Shorts popup on mobile** (and anywhere it overlaps forms) | High: it blocks submit buttons | S |
| 3 | **Declutter the mobile floating stack:** keep the bottom bar, merge the GeM pill and RFQ ribbon into it or hide them near forms | High | S |
| 4 | **RFQ form honesty:** check `res.ok`, show an error and retry, no thank-you or conversion on failure; do not auto-open WhatsApp (offer it on the thank-you page) | High: silent lead loss | S |
| 5 | **Store attribution on every lead:** device / user agent, utm_*, gclid, gbraid, wbraid on all endpoints (brochure, GovRFQ, tender pack, popup); persist in a first-party cookie or localStorage for 90 days, not sessionStorage | High: enables any ROI view | S–M |
| 6 | **Government buyer path:** a short "Department quote" form (department type, state, quantity, phone) on the GeM, procurement, past-performance and case-study pages, near the top; replace WhatsApp-only and mailto-only CTAs with form-plus-WhatsApp; link the live GeM listing | High for the target segment | M |
| 7 | **Shorten the RFQ ribbon:** name and phone first, product optional; enable Send immediately with a clear message | Medium–high: 6–7 taps down to 4 | S |
| 8 | **Trust pack on product and GeM pages:** price band or "GeM price from ₹…", BIS CM/L and test-report numbers, downloadable spec without a lead gate, response promise ("call-back within N working hours") | Medium–high: peers all show these | M (needs owner facts) |
| 9 | **Speed up mobile interactivity on the homepage** (8.4–8.8 s until CTAs work on slow 4G): lighter hero, defer video embeds | Medium | M |
| 10 | **Thank-you page and dealer path:** reference number, response promise and next step per form type; give /dealer-application a real form (or redirect to /dealer-program#dealer-form); make brochure e-mail optional and add autocomplete; 16 px inputs and autocomplete on the gov form | Medium | S |

---

## 7. What I could not measure, and what the owner should supply

- **Google Search Console:** a fresh 16-month export of queries and pages, and click-through on the GeM, product and procurement pages. The stored sync ends 16 Jun 2026.
- **GA4:** a property access check for G-GEWH5YB3PS and G-32RK29MZE5 (which one is "real"); sessions by device and channel for Apr to Oct; landing-page engagement; whether enhanced measurement form events are on; key-event configuration.
- **Google Ads:** the conversion-action list with "primary / secondary" flags and the counting setting (one vs every); what `Gwt1…` is (suspected URL-based "Request quote"); spend, clicks and conversions by campaign for Aug to Sep (when 32 gclid leads arrived); search-term report.
- **Sales outcomes:** for the about 110 real buyers, which were quoted, which became orders, and order value. Even a spreadsheet keyed by month and form type would do; no names needed.
- **WhatsApp Business:** count of inbound chats per month. WhatsApp taps (201) exceed form leads, but chats are invisible to the site.
- **Phone:** call counts per month from the business lines.
- **NOT TESTED (needs a follow-up run; no result is claimed here):**
  - Brochure-modal submission: needs a stubbed-network run to confirm the dataLayer events and which Ads tags fire.
  - Failure mode (HTTP 500) for the reseller, dealer and gov forms: needs the same 500-stub test used for the RFQ, quote and contact forms. Code suggests success-only firing.
  - The 61 s client-side navigation to /thank-you seen in 3 of 12 mobile runs: needs real-user (RUM) timing, or a re-run outside the throttled harness, to tell artefact from real.
  - A complete run of the gov department form on mobile.
  - A desktop "close video" run of the mobile homepage flow.
  - Benchmark depth: only 6 brands and 3 marketplaces were covered, not 8 manufacturer sites; GeM pages were read from search snippets only.

---

## 8. Revised Phase A order (evidence-based)

1. **Tracking truth (S):** item 1 above, plus a GA4 key event. Without it every later change is unmeasurable, and Ads is currently optimising toward homepage views.
2. **Mobile unblock (S):** remove the video popup on mobile, slim the floating stack, 16 px inputs, autocomplete everywhere.
3. **No silent lead loss (S):** RFQ `res.ok` handling, no auto-WhatsApp, honeypot sent but flag-only, and an instant WhatsApp / e-mail confirmation to the buyer (the vipdealers pattern).
4. **Attribution on every lead (S–M):** device, UTMs, gclid / gbraid / wbraid persisted for 90 days, plus a "buyer type" select (Govt department / Municipal / Defence / PSU / Dealer / Business / Farmer-individual). This makes the buyer mix measurable next month.
5. **Government path and trust pack (M):** department quote form near the top of the GeM, procurement, past-performance and case-study pages; live GeM listing link; BIS and test numbers; price band or GeM price; a single response promise used site-wide.
6. **Form simplification (S):** RFQ ribbon name and phone first; one dealer path; brochure e-mail optional; thank-you page with reference number and next step.
7. **Homepage mobile performance (M):** reach interactive in under 4 s on slow 4G.

Previously planned Phase A items that are not about conversion (content and SEO fixes from PHASE0) should follow steps 1–3, because their effect cannot be measured until tracking is fixed.

---

## Files in this folder

- `scripts/`: `probe.mjs`, `probe2.mjs`, `leads-aggregate.mjs`, `repeaters.mjs`, `gclid-month.mjs` (DB, read-only); `harness.mjs`, `discover.mjs`, `explore.mjs`, `personas.mjs`, `beacons.mjs` (browser); `gtm-parse.cjs`.
- Data: `leads-aggregate.json`, `repeaters.json`, `gclid-by-month.json`, `probe-schema.json`, `probe-analytics-schema.json` (keys only), `discover.json`, `personas-gov-home.json`, `personas-rerun.json`, `personas-run.log`, `beacons.json`, `gtm-container.js` (the public container).
- Screenshots: `shots/discover/`, `shots/explore/`, `shots/<flow>/`, `shots/brochure-modal-*.png`.

---

## 9. Status after the 2026-10-08/09 program

Sources: `PROGRAM_STATUS.md` (audit 2026-10-09) and `PUSH-LOG.md`. "Live" means on origin/main and checked after deploy. Rollback tag `rollback-pre-overnight-2026-10-08` -> d81aaed.

| Study recommendation (section 6 / 8) | Program item | Status | Commits / push |
|---|---|---|---|
| 1 Tracking truth: RFQ event only on server success; one generate_lead; IS 14855 event | A2 | Shipped (push 2, live) | 4fd7af2 |
| 3 No silent lead loss: RFQ saves first, WhatsApp optional | A1 | Shipped (push 2, live) | bee42fc, 2703ee2, 7785acf |
| 5 / 8.4 Attribution on every lead, persisted (localStorage plus server fields) | A5 | Shipped (push 2, live) as 30 days, not the 90 days recommended. Device field and buyer-type select: UNKNOWN, not listed in PROGRAM_STATUS | e9d3228, b27cae5 |
| Honeypot value sent, flag-only | A7 | Partly shipped: label leak fixed and input hidden; value deliberately NOT sent yet (owner decision, OPEN_FACTS #17) | 479f63f, 55d8956 |
| Mobile unblock: floating stack | A8a (home pills appear after 300 px) | Partly shipped (push 1). Video facade also live earlier (63a43b2, 9bbdc91). Removal of the floating YouTube Shorts player, 16 px inputs and autocomplete: not in the program list, status UNKNOWN | ebfa2c5 |
| 6 Government path: optional e-mail on contact and GeM forms, buyer / reseller choice | A3 | Shipped (push 3, deployed 2026-10-09 06:46Z) | 9357caf, 7af099e |
| 6 / 10 Call-back option with time slot | A4 | Shipped (push 3) | 7a57cff, 7af099e |
| 6 On-page quote actions beside WhatsApp-only / mailto-only CTAs | A6 | Shipped (push 3) | e9b0970 |
| Performance: /about image dimensions | A8b | Shipped (push 2) | 68d6da9 |
| Remove TEMP DEBUG logs | A10 | Shipped (push 2) | a1101d0 |
| Facts pass (2020 founding, counters, 9 models, states; owner kept published trust numbers) | Facts | Shipped (push 3) | see PROGRAM_STATUS |

**Not shipped by the program (still open from this study):**
- Google Ads / GTM side fixes: the homepage-view conversion (`Gwt1...`), the duplicate `/thank-you?type=rfq` URL tag, sending `generate_lead` to GA4 as a key event, and the second GA4 property. These are configuration in GTM, Ads and GA4, not code. Whether the owner has changed them: UNKNOWN. `docs/gtm-conversion-setup.md` documents the intended setup.
- Shortening the RFQ ribbon (name and phone first); brochure e-mail optional; thank-you page reference number and response promise; a real /dealer-application form; 16 px inputs and autocomplete on the gov form. Not in PROGRAM_STATUS.
- Trust pack (price band, BIS CM/L number, test reports, response promise): blocked on owner facts (OPEN_FACTS #1, #9, #10).
- Homepage mobile performance (interactive under 4 s): no Lighthouse / CWV baseline was captured (B10 not started).
- Rating-based trust signals: ratings-markup removal (B2) not started; real reviews needed (see OFFSITE_TODO).

**Issues found while verifying push 3 that affect conversion:**
- Lead e-mail delivery has failed on production since 2026-10-08 (Gmail SMTP 535 EAUTH). Leads are still saved to the database; only the admin e-mail fails. Owner action: new Gmail app password, set `EMAIL_APP_PASSWORD` on the Vercel production project, redeploy.
- The lead forms push the real `generate_lead` event on a normal test submit; there is no test-name filter. Test enquiries would count as conversions unless tag hosts are blocked or GTM excludes them.
- Three "TEST - ignore" enquiries (rfq, contact, GeM landing) are saved in production and should be excluded from lead counts.

**Re-measurement plan (data needed):** 30 days of post-push-3 lead rows (clean-lead share, organisation completeness now that e-mail and buyer choice exist, attribution fields present), a fresh GA4 / Ads export once the tag fixes are made, and the sales-outcome sheet from section 7.
