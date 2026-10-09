# OFFSITE_TODO: owner's off-site checklist (brief E6)

Draft 2026-10-09. These are things only the owner can do outside the website code. No secrets belong in this file. Anything not known is marked UNKNOWN.

Why this matters in general: Google (and AI answer engines such as ChatGPT, Gemini, Perplexity) decide how far to trust a manufacturer by checking whether independent places agree on the same name, address, phone, founding year and products. Matching profiles elsewhere raise trust in the site; mismatches lower it.

Use these exact facts everywhere (from docs/FACTS.md): company name 100X Circle (as on the site), founded 2020, address and phone exactly as on https://www.100xcircle.com/contact-us. Do not publish a claim off-site that the site does not make.

---

## 0. Urgent, operational (do first)

### 0.1 Lead e-mail delivery is failing
- What: Lead e-mail delivery is failing since 2026-10-08 (Gmail SMTP 535 "Username and Password not accepted"). Leads are still saved in the database and visible in admin; only the notification e-mail fails. Last successful send in the DB: 2026-10-07 16:31Z; first failure 2026-10-08 10:23Z. No mailer code change in between, and a rollback would not fix it.
- Why it matters: new enquiries may go unseen, which costs real sales.
- Steps:
  1. Sign in to the Google account that is the sending mailbox (the one set as EMAIL_USER).
  2. Create a new app password (Google Account > Security > 2-Step Verification > App passwords). If 2-Step Verification is off or the old app password was revoked, that is the likely cause.
  3. In Vercel, open the production project > Settings > Environment Variables, and set `EMAIL_APP_PASSWORD` to the new value for Production. Do not paste it into chat, e-mail or files.
  4. Redeploy production (Vercel > Deployments > Redeploy, without cache is not needed).
  5. Submit one enquiry named "TEST - ignore" and confirm the e-mail arrives (see 0.2 first).
- Owner input needed: access to the sending Google account and the Vercel project. Which mailbox is the sender: UNKNOWN to this draft (it is in EMAIL_USER).

### 0.2 Test submissions fire the real conversion event
- What: Test submissions fire the real `generate_lead` dataLayer event (no test filter). A normal test submit sends a real GA4 / Google Ads conversion. In the 2026-10-09 live tests the Google tag hosts were blocked, so nothing reached Google.
- Why it matters: test enquiries inflate conversions and teach Google Ads to optimise toward junk.
- Steps: consider a GTM exclusion for name "TEST - ignore" (a trigger exception on the generate_lead tags using a dataLayer variable for the name), or an internal-traffic filter in GA4 (Admin > Data streams > Configure tag settings > Define internal traffic, then activate the Internal Traffic data filter) plus a similar IP exclusion in Ads reporting. Three "TEST - ignore" rows already exist in production leads; exclude them when counting.
- Owner input needed: your office/home IP ranges (if using an IP filter), and GTM edit access (container GTM-5JMGCKRW).

---

## 1. Google Business Profile (GBP)

- Status: no Google Business Profile or Maps URL is linked anywhere in the site code (searched app, components, lib). Whether a profile exists: UNKNOWN (OPEN_FACTS #14).
- Why it matters: GBP is the main source for Google's local knowledge panel and for "near me" and brand searches. It is also a strong "this business is real" signal that AI engines reuse. A GBP with the same name, address and phone as the site (NAP consistency) supports the Organization data on the site.
- Steps:
  1. Search Google Maps for the company. If a profile exists, claim it (Verify ownership); if not, create one at business.google.com.
  2. Category: choose the most accurate manufacturer category (for example a manufacturer of pest-control or fogging equipment). Add the website https://www.100xcircle.com/ and the primary phone.
  3. Address exactly as on /contact-us; set service area if you serve all of India. Hours as real business hours.
  4. Add real photos (factory, machines, packaging) and the product list; do not add claims the site does not make.
  5. Add the GBP URL (the short g.page or Maps link) and send it to the developer to add to the site's `sameAs` list (OPEN_FACTS #14).
- Owner input needed: Google account that owns the profile, verification (postcard/phone/video), the final GBP URL, confirmation that the address may be public.

## 2. GeM (Government e-Marketplace) seller profile links

- Status: the site does not link the live GeM listing or seller profile (the conversion study found government buyers have no "buy from us on GeM" link). GeM Seller ID is optional in copy (FACTS). Seller profile/catalogue URLs: UNKNOWN.
- Why it matters: government buyers verify on GeM; a link from the site to the live listing, and the GeM listing naming the same company, is strong proof for both buyers and AI answers about "GeM approved fogging machine OEM".
- Steps:
  1. Log in to the GeM seller dashboard and copy the public URL of each fogging-machine catalogue/product listing and the seller (OEM) profile, if GeM exposes a public one.
  2. Check that the company name, model numbers (HM20, HBL22 and so on) and specs on GeM match the website. Fix mismatches on GeM or tell the developer which side is wrong.
  3. Send the URLs to the developer to link from the GeM page, product pages and the government-procurement page. Only listings that are live and owned by 100X should be linked.
- Owner input needed: the GeM listing URLs, the Seller ID (if it may be shown), and confirmation of which models are listed.

## 3. IndiaMART and TradeIndia listings

- Status: the code refers to https://www.indiamart.com/100xcircle/ and https://www.tradeindia.com/fp/100xcircle only in admin/SEO-tool configuration (citation checker), not on public pages. Whether these listings exist and are claimed: UNKNOWN.
- Why it matters: they are high-authority business directories that rank for "fogging machine manufacturer" and are cited by AI engines. The conversion study found IndiaMART, IndustryBuying and others list 100X models, sometimes with prices, so the information buyers see there should match the website.
- Steps:
  1. Open both URLs. If they do not exist or are unclaimed, register or claim them.
  2. Use identical company name, address, phone, founding year (2020) and product names/model numbers as the site.
  3. Link back to https://www.100xcircle.com/ (a normal link in the profile website field).
  4. Review third-party listings of 100X models (for example on IndustryBuying) and have wrong specs or prices corrected or removed.
  5. Reply to every enquiry quickly; response rate is shown to buyers on IndiaMART.
- Owner input needed: login access, which products to list, and any price policy (the site shows no prices).

## 4. Review collection (real reviews only)

- Status: rating/review markup on the site is under review (program item B2, OPEN_FACTS #15). No verified review source is linked on the site. Number of real reviews held by 100X: UNKNOWN.
- Why it matters: Google may show star ratings only when the markup reflects real, visible, first-party-collectable reviews; fake or unverifiable ratings risk a manual action. Peers (IndiaMART, IndustryBuying) show ratings and counts, so real reviews are also a conversion factor.
- Process (real reviews only):
  1. After a delivered order or a completed GeM supply, ask the buyer to review on the Google Business Profile (GBP gives a direct review link). Send it by WhatsApp or e-mail with a neutral message; do not offer payment or discounts for reviews, do not write reviews for customers, do not filter out negative ones.
  2. Keep a private log (month, platform, review count) with no customer personal data in the repo.
  3. Ask government buyers for a letter of appreciation or a performance certificate instead; these can be shown as documents.
- Re-enabling ratings markup later: when there are real reviews that visitors can read on the page (not only a number), the developer can add Product/Organization `aggregateRating` and `review` JSON-LD again, using the actual count and average, with each review visible on the page. Note that Google does not show stars for reviews of an organisation about itself; Product reviews of a specific model are the usual route. The old values recorded in the database before B2 will be kept in the change log, not deleted.
- Owner input needed: which review platform to use, who sends the requests, and consent to show reviewer first name/organisation.

## 5. Google Search Console (GSC) and GA4 setup checks

- Status: the last stored GSC sync in the database ends 2026-06-16 and the last GA4 sync ends 2026-06-05, so current access cannot be confirmed from here. GA4 is loaded by the site for G-GEWH5YB3PS; a second property G-32RK29MZE5 also receives hits and is not in the code. Which property is the "real" one: UNKNOWN.
- Why it matters: Search Console is the only direct source of how Google sees the site (queries, indexing, the SEO_WATCHLIST checks). GA4 key events tell you which marketing produces leads.

### Search Console
1. Property: confirm a verified property for https://www.100xcircle.com/ (a Domain property for 100xcircle.com is best; it covers www and non-www). Confirm the owner and any other users.
2. Sitemap: Indexing > Sitemaps; submit https://www.100xcircle.com/sitemap.xml (confirm the exact sitemap URL in the site's robots.txt) and check status "Success" and the discovered-URL count.
3. Check Pages (indexing) for "Not indexed" reasons, especially the 404 `/products/100x-thermal-fogger-bf150` (known pre-existing 404, not to be listed in llms.txt).
4. Check that the *.vercel.app deployment hosts are removed from results (earlier removal request still owed per project notes).
5. Export the last 16 months of Performance (queries and pages) and share it; the conversion study and SEO_WATCHLIST need it.

### GA4
1. Admin > Data streams: decide which property is the real one (G-GEWH5YB3PS or G-32RK29MZE5) and stop duplicate sending to the other.
2. Key events: mark `generate_lead` as a key event (the site pushes `generate_lead` to the dataLayer on a successful lead; a GA4 tag in GTM or a gtag event is needed to send it, because the study found GA4 receives no lead events today). Also consider `whatsapp_click` and `phone_click` as secondary events, not key events.
3. Link GA4 to Google Ads and to Search Console (Admin > Product links).
4. Enhanced measurement: check form interactions are on, and set an internal-traffic filter (see 0.2).
5. Google Ads: review the conversion actions list: primary vs secondary, count "one" for leads, and find what `Gwt1...` is (suspected URL-based action firing on every homepage view). See docs/CONVERSION_STUDY.md and docs/gtm-conversion-setup.md.
- Owner input needed: access to GSC, GA4 and Ads accounts (add the developer as a user rather than sharing logins), and the exports above.

## 6. Social profiles

Linked in the site code today (lib/seo/site-config.ts, and the admin social settings defaults):

| Profile | URL in code | Notes |
|---|---|---|
| YouTube | https://www.youtube.com/@100Xcircle | linked; also used for the video pieces |
| Facebook | https://www.facebook.com/100xcircle | linked in code; whether the page exists and is active: UNKNOWN |
| Instagram | https://www.instagram.com/100xcircle | linked in code; existence UNKNOWN |
| LinkedIn | https://www.linkedin.com/company/100xcircle | linked in code; existence UNKNOWN |
| X (Twitter) | https://x.com/100xcircle | linked in code; existence UNKNOWN |

Missing (not linked anywhere in the site code): Google Business Profile, GeM seller profile, IndiaMART and TradeIndia public profile links, Pinterest, WhatsApp Business catalogue link (wa.me chat links exist; a Business profile link is UNKNOWN), any other profile.

- Why it matters: `sameAs` links in the Organization data tell Google and AI engines which profiles belong to the company. Links to profiles that do not exist, or that are empty, look careless and can be treated as errors.
- Steps:
  1. Open each URL above while logged out. Note which load a real, branded page (name, logo, link back to the website, recent posts).
  2. For any that do not exist, either create them with the same logo and company description, or tell the developer to remove them from the site config.
  3. Make sure each profile links back to https://www.100xcircle.com/.
  4. Send the developer any new official URLs (GBP, WhatsApp Business, etc.) for the `sameAs` list (OPEN_FACTS #14). Only profiles that exist will be added.
- Owner input needed: confirmation of which profiles are real and owned, and login access to fix them.

---

## 7. Other open facts that need owner input (from OPEN_FACTS.md, for reference)

IS 14855 certificate/BIS licence number (#9), ISI licence number for HM20/HBL22 (#10), ISO 9001:2015 certificate number and body (#11), CE declaration (#12), MSME/Udyam number (#13), the single response promise (#1) and spare-part dispatch time (#2). Publishing certificate numbers on GBP and directories, once confirmed, strengthens trust everywhere.
