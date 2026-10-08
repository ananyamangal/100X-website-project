# OPEN FACTS: needs the owner's input

Facts the overnight program (2026-10-08) could not verify. Until each is answered, the site either uses the qualitative wording shown or leaves the claim out. Nothing below was invented.

| # | Question | What the site uses meanwhile | Where it matters |
|---|---|---|---|
| 1 | Confirm the single response promise: **"within 24 hours on working days"** | That wording | Contact, RFQ, GeM, gov-procurement, landing pages |
| 2 | Confirm spare-part dispatch: **"24-48 hours"** | That wording | Home, /spare-parts, /products |
| 3 | Total government orders (DB says 500+): which records support it? | Not shown as a number. Qualitative: "many government orders" plus the 23 listed buyers | Home KPI band, past-performance, gov-procurement |
| 4 | Departments served (DB says 80+): which records support it? | Not shown as a number | same |
| 5 | Units supplied (DB says 2,000+): which records support it? | Not shown as a number | same |
| 6 | States served: the records show **12**. Are there more with proof (invoices, POs)? | 12 | everywhere "states" appears |
| 7 | "10,000+ customers / machines": which records support it? | Not shown as a number | GeM landing trust strip, about, dealer program, TrustBlock |
| 8 | "50+ active distributors / dealers": which records support it? | Not shown as a number | GeM landing, llms.txt |
| 9 | IS 14855: certificate number or BIS licence number (CM/L-...), and which models | "built to the requirements of IS 14855; test report on request" | product pages, /is-14855-fogging-machine, gov pages |
| 10 | ISI mark on 100XHM20 / 100XHBL22: licence number | Product names left as they are (no URL changes); new copy does not claim the mark | HM20/HBL22 |
| 11 | ISO 9001:2015 certificate number and issuing body | No new mentions | llms.txt, about |
| 12 | CE marking: declaration of conformity / notified body | No new mentions | llms.txt |
| 13 | MSME / Udyam registration number | No new mentions | llms.txt |
| 14 | Official social / business profiles that exist (YouTube, Facebook, Instagram, Google Business Profile URLs) | Only profiles already linked in the code are used in `sameAs` | Organization schema |
| 15 | Real review collection: once real reviews exist, product rating markup can return | Ratings markup and badges removed (old DB values kept untouched in the DB) | product pages |
| 16 | The trolley (100XATS): move it out of the fogging catalogue? | Proposal only (no URL change) | /products |
| 17 | **Honeypot (A7), owner decision needed.** Sending the hidden `company_website` value lets the server reject bots, but the repo history (BrochureLeadModal, ContactSection, LandingFormBlock comments; PartnerApplyForm fix fb362d1) records real buyers whose browser autofilled that field and lost their lead. With A1, a rejected RFQ would now show an error and the buyer could not submit at all. The safe alternative (server saves a filled-honeypot lead flagged `honeypotFilled` and skips the admin e-mail, instead of rejecting it) was not applied: it changes the lead API's bot handling and needs your OK. | Overnight: the label leak is fixed (no "Company website" text in pages; input stays off-screen, aria-hidden, tabIndex -1); the value is still **not** sent, exactly as in production today. Bot defence = existing 2-second time gates. | RFQForm, ContactSection, LandingFormBlock, QuoteModal |
| 18 | Lead value for call-back requests: contact-page call backs reuse the contact conversion value (`CONTACT_LEAD_VALUE_INR`); GeM-page call backs use the GeM form value (1,000). Keep, or set a separate call-back value? | As described | GTM/Ads conversion values |
