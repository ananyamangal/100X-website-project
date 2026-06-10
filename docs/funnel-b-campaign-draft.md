# Funnel B — Direct Buyer Campaign Draft
## Status: PAUSED — DO NOT ACTIVATE until conversion tracking is verified

**Created:** 2026-06-10  
**Condition to activate:** All 5 conversion actions show "Recording conversions" in Google Ads Goals

---

## Campaign Settings

| Field | Value |
|---|---|
| Campaign name | `Funnel B — Direct Buyer` |
| Campaign type | Search |
| Networks | Search only (uncheck Display and Search Partners) |
| Status | **PAUSED** |
| Bid strategy | Manual CPC |
| Enhanced CPC | OFF |
| Daily budget | ₹300 |
| Budget type | Daily |
| Ad schedule | All days, all hours (review after 14 days) |
| Location | India |
| Language | English, Hindi |
| Start date | Set to 2 days after conversion tracking verified |
| Ad rotation | Optimize (prefer best-performing ads) |

**Separate from Funnel A.** Do not merge. Funnel A = Dealer Acquisition (dealer, OEM, GeM keywords). Funnel B = Direct Buyer (machine purchase keywords).

---

## Ad Groups + Keywords

### Ad Group 1: Public Health Equipment
**Landing page:** `https://100xcircle.com/public-health-equipment`  
**Default Max CPC:** ₹25

| Keyword | Match type |
|---|---|
| fogging machine for mosquito control | EXACT |
| mosquito fogging machine | EXACT |
| dengue fogging machine | EXACT |
| malaria fogging machine | EXACT |
| municipal fogging machine | EXACT |
| public health fogging equipment | EXACT |
| vector control equipment | EXACT |
| vector control machine | EXACT |
| mosquito fogging machine manufacturer | PHRASE |
| vector control equipment India | PHRASE |
| public health fogging | PHRASE |

---

### Ad Group 2: Thermal Fogging Machine
**Landing page:** `https://100xcircle.com/products`  
**Default Max CPC:** ₹20

| Keyword | Match type |
|---|---|
| thermal fogging machine | EXACT |
| thermal fogging machine manufacturer | EXACT |
| double barrel fogging machine | EXACT |
| IS 14855 fogging machine | EXACT |
| fogging machine manufacturer | EXACT |
| commercial mosquito fogger | EXACT |
| thermal fogging machine manufacturer | PHRASE |
| fogging machine manufacturer India | PHRASE |
| thermal fogger manufacturer | PHRASE |

---

### Ad Group 3: Vehicle Mounted Fogging Machine
**Landing page:** `https://100xcircle.com/vehicle-mounted-fogging-machine`  
**Default Max CPC:** ₹22

| Keyword | Match type |
|---|---|
| vehicle mounted fogging machine | EXACT |
| truck mounted fogging machine | EXACT |
| vehicle mounted fogging | PHRASE |
| truck mounted fogger | PHRASE |

---

### Ad Group 4: Make in India / Government
**Landing page:** `https://100xcircle.com/make-in-india-fogging-machine`  
**Default Max CPC:** ₹18

| Keyword | Match type |
|---|---|
| fogging machine manufacturer India | EXACT |
| fogger machine manufacturers in india | EXACT |
| government fogging machine | EXACT |
| make in india fogging machine | PHRASE |
| fogging machine government supplier | PHRASE |

---

### Ad Group 5: Portable / General Product
**Landing page:** `https://100xcircle.com/products`  
**Default Max CPC:** ₹15

| Keyword | Match type |
|---|---|
| portable fogging machine | EXACT |
| battery fogging machine | EXACT |
| agricultural fogger | EXACT |
| fogging machine market | EXACT |
| fogging machine supplier | PHRASE |
| fogging machine company India | PHRASE |

---

## Campaign-Level Negative Keywords
Apply ALL of these at the **campaign level** before activating.

### Consumer / Home Use
```
for home
for room
home use
room fogger
household fogger
personal fogger
garden fogger
bedroom fogger
domestic fogger
for indoor use
```

### Location Queries
```
near me
nearby
in delhi
in mumbai
in bangalore
in pune
in hyderabad
in chennai
in kolkata
in jaipur
```

### Consumer E-commerce
```
amazon
flipkart
snapdeal
meesho
buy online
online shopping
second hand
used fogger
used fogging machine
old fogger
refurbished
```

### Anti-fog / Defog / Coating (different products)
```
anti fog
anti-fog
defog
de-fog
anti mist
anti condensation
fogging agent
fog coating
fog film
fog spray
windshield
glass coating
lens fogging
```

### Informational / Not Commercial
```
how to use
manual
tutorial
video
what is
meaning
definition
review
reviews
compare
comparison
vs
alternative
alternatives
price list
how much
cost of
which is best
```

### After-sale / Service (not buyers)
```
repair
service center
spare parts
spare part
maintenance
servicing
not working
broken
```

### Rental / Hire
```
rental
rent
on rent
on hire
hire
contract basis
per day rate
```

### Pest Control / Chemicals (not machines)
```
insecticide
pesticide
chemical only
pest control chemical
bed bug fogger
cockroach fogger
```

### Consumer Fog Machine (entertainment / stage)
```
fog machine stage
fog machine party
halloween fogger
disco fog
stage effect
dry ice fog
mini fogger
small fogger
```

---

## Ad Copy — Reference

RSA assets are in `lib/growth-os/ads-fuv-config.ts` under `direct_buyer`. Key points:

- All headlines reference product: "Thermal Fogging Machine", "IS 14855 Certified Fogger", "Mosquito Control Equipment"
- Callouts: IS 14855 Certified, GeM Listed, Mosquito Control, Pan-India Delivery
- Sitelinks: /products, /public-health-equipment, /vehicle-mounted-fogging-machine, /make-in-india-fogging-machine
- Do NOT use dealer/OEM/GeM partnership language in Funnel B ads — these are product purchase ads

---

## Match Type Rules

| Rule | Rationale |
|---|---|
| No broad match | Protects ₹300/day budget from irrelevant spend |
| EXACT for 3+ word specific queries | High precision, low waste |
| PHRASE for 2-word root terms | Captures tail variants without going broad |
| No auto-apply recommendations | Manual CPC means manual control |

---

## Budget Justification

At ₹300/day:
- Estimated 15–30 clicks/day at ₹10–₹20 avg CPC
- At 3–5% conversion rate: 0.5–1.5 leads/day
- 14-day run: 7–21 leads with full search term data
- Break-even: 1 converted inquiry covers 30+ days of budget

---

## Activation Checklist

**Do not activate until ALL boxes are checked:**

- [ ] All 5 Google Ads conversion actions created
- [ ] GTM container import file applied (docs/gtm-container-import.json)
- [ ] All AW- IDs and labels filled in conversion-tracking.ts
- [ ] GTM Preview tests passed: RFQ submit, WhatsApp, phone, dealer, OEM
- [ ] GTM container published
- [ ] Google Ads shows "Recording conversions" for at least RFQ Submit + WhatsApp Click
- [ ] All campaign-level negatives loaded
- [ ] Campaign reviewed and approved by sulabh.mangal@gmail.com
- [ ] Campaign activated (status changed from PAUSED to ENABLED)

---

## Day 14 Review Trigger

After 14 days of data, evaluate:
1. Search terms report — any irrelevant terms to add as negatives?
2. Which ad groups are spending? Which have zero impressions?
3. CTR by ad group — below 1% may indicate keyword/ad mismatch
4. Conversion rate — if 0 conversions in 14 days, review landing page CTA placement
5. Bucket B graduation — if "fogger machine" or "fogging machine" shows CTR > 0.5% and position < 5 → move to Bucket A, add to campaign
