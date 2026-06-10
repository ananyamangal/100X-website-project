# Revenue Attribution Engine — Architecture

> ⚠️ DEFERRED TO V2 (course correction 2026-06-10). Preserved, not deleted.
> V1 uses enquiry-based ROAS (clicks → calls → WhatsApp → RFQ), not invoice attribution.
> Re-activate after financial truth (Zoho/invoice) data exists. See `demand-intelligence-acquisition-os.md`.
>
> Growth OS 3.0 — Intelligence Layer  
> Status: Architecture approved  
> No code. No UI. Business architecture only.

---

## The Central Intelligence Layer

Revenue attribution is the feedback mechanism that determines whether every other intelligence engine improves over time or stagnates. Without attribution, every agent recommendation is calibrated by intuition. With attribution, every recommendation is calibrated by what has actually produced revenue.

---

## The Attribution Problem — 100X Circle Specific

Three structurally different revenue streams with incompatible tracking characteristics:

**Stream 1: Digital Marketing** — Google Ads click → GCLID captured → Lead form → RFQ → Order. Trackable end-to-end if instrumented correctly.

**Stream 2: GeM Tender** — Government budget released → Tender posted → Bid → Award → PO → Invoice. No "first touch" — procurement is institutional. Attribution is to the tender, not any marketing activity.

**Stream 3: Dealer Channel** — Dealer's buyer relationship → Product inquiry → Dealer order → Invoice. Invisible to 100X Circle's digital systems until order placed.

Additional challenges: 30–180 day sales cycles; multiple decision makers on one purchase; revenue recognized months after the journey ends.

---

## Part 1: Attribution Models

### Model 1: First Touch Attribution
100% credit to the first recorded touchpoint.

**B2B industrial suitability:** Poor as sole model. First touch may be months before revenue.  
**GeM suitability:** Not applicable. GeM procurement decisions are institutional.  
**Dealer suitability:** Poor. Dealer's customer relationship predates any 100X Circle marketing.

### Model 2: Last Touch Attribution
100% credit to the final touchpoint before conversion.

**B2B industrial suitability:** Misleading — leads to conclusion that "WhatsApp generates all revenue."  
**GeM suitability:** More applicable — GeM tender is a strong last-touch signal.  
**Dealer suitability:** Assigns all credit to dealer even when marketing created buyer preference.

### Model 3: Multi-Touch Attribution (Linear)
Equal credit distributed across all touchpoints.

**B2B industrial suitability:** Better than single-touch. But treats a 3-second bounce equally with a 45-minute research session.  
**GeM suitability:** Partially applicable.  
**Dealer suitability:** Can work if dealer contact is modeled as a touchpoint.

### Model 4: Weighted Attribution (W-Shaped Position-Based)
W-shaped: First touch 30% / Lead creation 30% / Opportunity creation 30% / Middle touches 10%.

**B2B industrial suitability:** Good. Reflects reality — first contact, lead confirmation, and RFQ creation are the three pole moments.  
**GeM suitability:** Requires adaptation to tender lifecycle.  
**Dealer suitability:** Better — dealer contact becomes a strong closing pole.

### Model 5: Executive Attribution (Channel-Level)
Revenue classified by primary origin channel. No probability distribution — full assignment.

**B2B industrial suitability:** Excellent as CEO-level view. Not sufficient for operational optimization.  
**GeM suitability:** Excellent — GeM is a distinct channel.  
**Dealer suitability:** Excellent — dealer revenue as a channel metric is directly actionable.

---

### Recommended Model: Tiered Attribution by Channel Type

Single-model attribution is the wrong architecture for 100X Circle.

```
TIER 1: DIGITAL-ORIGIN REVENUE
  Model: W-Shaped Weighted Attribution (30/10/30/30)
  Pole moments: First click → Lead form fill → RFQ submission
  
TIER 2: GEM-ORIGIN REVENUE
  Model: Tender Lifecycle Attribution (custom)
  Revenue unit: the tender, not the lead
  
TIER 3: DEALER AND OFFLINE REVENUE
  Model: Executive Attribution (channel-level)
  Reason: Full multi-touch tracking not possible for dealer-originated sales
```

**Composite reporting:**

| Channel | Attribution Level | Detail Available |
|---|---|---|
| Google Ads | W-Shaped | Keyword, campaign, landing page |
| Organic SEO | W-Shaped | Query, page, organic position |
| GeM | Tender Lifecycle | Tender, dept, state, product |
| Dealer | Channel-Level | Dealer, territory, buyer type |
| Direct | Channel-Level | Source, buyer type |

---

## Part 2: The Revenue Graph

Complete relationship architecture showing all paths from intent to revenue.

### Digital Origin Path
```
[QUERY] → [KEYWORD] → [AD GROUP / ORGANIC POSITION] → [CAMPAIGN]
→ [LANDING PAGE] → [SESSION / VISITOR] → [LEAD] → [RFQ]
→ [QUOTATION] → [NEGOTIATION LOG] → [ORDER] → [INVOICE]
→ [PAYMENT] → [REVENUE RECOGNITION]
```

### GeM Origin Path
```
[BUDGET SIGNAL] → [TENDER] → [BID] → [AWARD]
→ [PURCHASE ORDER] → [INVOICE] → [PAYMENT] → [REVENUE RECOGNITION]
```

### Dealer Origin Path
```
[DEALER] → [END BUYER CONTACT] → [DEALER RFQ]
→ [DEALER ORDER] → [INVOICE] → [PAYMENT] → [REVENUE RECOGNITION]
```

### Cross-Cutting Dimensions (apply to all paths)
- **Buyer Profile** — organisation-level with 4 scores
- **Product** — SKU, margin, manufacturing constraints
- **State / Territory** — State Score, Territory Opportunity Score
- **District** — sub-state geographic dimension
- **Buyer Type** — category classification
- **Department** — for government buyers
- **Dealer** — channel partner entity

---

## Part 3: Attribution Confidence Score

Every attribution claim has uncertainty. Confidence score makes this explicit so agents can reason accordingly.

### Five Confidence Dimensions

**1. Signal Directness (0–100)**
- GCLID present: 98
- UTM parameters complete: 88
- Tender ID linked: 95
- Buyer stated "I found you on Google": 65
- No source information: 10

**2. Chain Completeness (0–100)**
- All links connected: 95–100
- One link missing: 75–85
- Two links missing: 50–70
- Only channel-level attribution known: 20–35

**3. Time Gap Factor (0–100)**
- 0–7 days: 95
- 31–60 days: 70
- 91–180 days: 45
- >365 days: 15

**4. Alternative Source Risk (0–100)**
- Single channel buyer, only ever interacted via Google Ads: 90
- Long journey, multiple channels, some touchpoints missing: 50
- Source unknown: 10

**5. Data Quality (0–100)**
- GCLID auto-captured, form complete: 95
- Manual entry with some fields inferred: 55
- Duplicate lead records: 35

### Composite Formula
```
Confidence = (Signal Directness × 0.30) + (Chain Completeness × 0.25)
           + (Time Gap Factor × 0.20) + (Alternative Source Risk × 0.15)
           + (Data Quality × 0.10)
```

### Confidence Score Reference

| Scenario | Confidence | Interpretation |
|---|---|---|
| Google Ads GCLID → same-day form → RFQ same week → order | 90–98 | Near-certain attribution |
| GCLID → form → 45-day gap → RFQ | 72–82 | Good, gap introduces uncertainty |
| Organic search (GSC match) → form → RFQ within 2 weeks | 78–88 | Good |
| Buyer stated "found you on Google" — no GCLID | 55–65 | Moderate — self-reported |
| GeM tender win → PO → revenue | 92–97 | High — fully documented |
| Dealer order, marketing-assisted | 72–82 | Good — chain mostly known |
| Source unknown | 10–25 | Low — attribution is a guess |

### Confidence Thresholds for Agent Use
- **>80:** Used directly in optimization
- **60–79:** Used with hedging factor; ranges used instead of point estimates
- **40–59:** Directional guidance only; not used for bid calculations
- **<40:** Not used for optimization; flagged for data quality repair

---

## Part 4: RFQ Attribution — Chain Survival

The attribution chain must survive the entire negotiation cycle.

```
STAGE 1: LEAD CREATED
  Attribution established. All upstream touchpoints linked.
  
STAGE 2: LEAD → RFQ
  rfq record created. lead_id is mandatory field.
  Attribution metadata inherited from lead.
  Time gap recorded — confidence score adjusted.
  RFQ carries: origin_channel, origin_campaign, origin_keyword,
               origin_gclid, first_touch_date, attribution_confidence
  
STAGE 3: QUOTATION SENT
  No attribution change. Quotation links to RFQ by rfq_id.
  
STAGE 4: NEGOTIATION
  Attribution chain holds. Close reason captured:
    "Best price" / "Technical confidence" / "Known brand" / 
    "Dealer recommendation" / "Previous experience"
  
STAGE 5: ORDER PLACED
  order.origin_attribution = rfq.attribution (inherited, not re-derived)
  
STAGE 6: INVOICE RAISED
  GCLID offline conversion upload triggered to Google Ads API.
  
STAGE 7: PAYMENT RECEIVED
  Revenue recognition. Attribution record sealed.
```

### Attribution Survival Rules

1. **lead_id is mandatory on every RFQ** — broken chain = confidence capped at 80
2. **rfq_id is mandatory on every Order** — no order without an RFQ reference
3. **Time gaps reduce confidence, never break attribution**
4. **Multiple leads can link to one RFQ** — credit distributed across both
5. **RFQ withdrawal does not destroy attribution** — preserved for buyer return

---

## Part 5: Dealer Attribution

Three scenarios requiring separate treatment:

**Scenario A: Pure Dealer (no upstream marketing)**
Attribution: 100% dealer channel. Confidence: 85–92.

**Scenario B: Marketing-Assisted Dealer**
Buyer encountered 100X Circle marketing before approaching dealer.
Attribution split — W-shaped: Marketing first touch 30% / Lead 10% / Dealer contact 30% / Order 30%.
Confidence: 65–78.

**Scenario C: Lead Forwarded to Dealer**
100X Circle captured the lead and forwarded to dealer to close.
Full upstream attribution to marketing channel + dealer closing credit.
Confidence: 75–88.

**Dealer attribution data capture protocol (mandatory for every dealer order):**
1. dealer_id
2. end_buyer_type
3. end_buyer_state
4. marketing_assist_flag (yes / no / unknown)
5. marketing_assist_type (if yes)
6. end_buyer_name (optional)
7. end_buyer_dept (optional)

**Dealer cooperation incentive:** Complete attribution data → priority access to forwarded leads + co-marketing support + preferential pricing.

---

## Part 6: GeM Attribution

GeM uses the **Tender Lifecycle Attribution Model**. Marketing attribution model does not apply.

```
STAGE 1: TENDER DISCOVERED
  How: system monitoring / dealer tip / direct contact / manual search
  Attribution at discovery: validates investment in each discovery method.
  
STAGE 2: BID DECISION
  Capacity check (Manufacturing Intelligence) + Margin check (Profit Intelligence)
  
STAGE 3: BID SUBMITTED
  tender_id is the primary attribution key for all downstream events.
  
STAGE 4: AWARD DECISION
  IF WON:  award_id created → revenue path continues
  IF LOST: loss_analysis → competitor_winner, competitor_price, loss_reason
           Feeds Competitor Intelligence + Profit Intelligence + GeM bid model
  
STAGE 5: PURCHASE ORDER
  po_number is mandatory — legal document.
  
STAGE 6: INVOICE + PAYMENT + REVENUE RECOGNITION
  No GCLID equivalent for GeM.
  GeM revenue contributes to GeM channel attribution, not Google Ads.
```

**GeM Marketing Attribution Flag:** If a pre-tender lead from the same department is detected, apply marketing contribution: Primary GeM channel 60% / Marketing secondary 40%.

---

## Part 7: Executive Reporting Framework

Ten strategic questions the CEO attribution report answers:

1. **Top Revenue Keywords** — which queries drive digital revenue?
2. **Top Revenue Campaigns** — which campaigns have highest revenue-to-spend ratio?
3. **Top Revenue Products** — which products generate most revenue across all channels?
4. **Top Revenue States** — which states generate revenue and which show demand gaps?
5. **Top Revenue Dealers** — which dealers generate revenue vs. their territory potential?
6. **Top Revenue Departments** — which government departments have highest LTV?
7. **Top Revenue Tenders** — win rate patterns by tender type, state, department?
8. **Top Revenue Landing Pages** — revenue per visitor (not just traffic)?
9. **Top Revenue Channels** — channel revenue with concentration risk flag?
10. **Top Revenue Buyer Types** — revenue per lead by buyer category?

Each answer shows: absolute ₹ value / trend / concentration risk / one recommended action.

---

## Part 8: Agent Integration

### Revenue Strategist
Consumes complete attribution. Answers: which channel to invest in, which products to emphasize, which states to expand.

**Budget allocation example:** Google Ads ROI 19× vs. Dealer ROI 44× → dealer channel is underinvested. Increase dealer budget by ₹1.5L over 6 months.

### Google Ads Director
Key mechanism: **GCLID offline conversion upload.**

For every order where GCLID is present in attribution chain:
- Upload GCLID + revenue value to Google Ads API within 24 hours of invoice
- Google Smart Bidding shifts from optimizing for lead form fills to optimizing for buyers who generate revenue
- Industry benchmark: 20–45% improvement in lead quality

**Bid optimization example:** Keyword A generates ₹6,667 revenue per click. Keyword B generates ₹236 revenue per click. Same bid. Attribution makes the mismatch visible → reallocate.

### SEO Director
Revenue per visitor (not just traffic). A low-traffic product page generating ₹1,833 revenue per visitor beats a high-traffic blog post generating ₹44 per visitor. Create more of what makes buyers, not researchers.

### GeM Intelligence Analyst
Department LTV from historical attribution → justifies aggressive bidding on repeat-buyer departments. L1 price model calibrated from win/loss data.

### Dealer Intelligence Analyst
Marketing-assisted dealer revenue reveals true Google Ads influence. A dealer who closes marketing-driven leads gets partial credit sharing; Google Ads gets partial ROI credit that would otherwise be invisible.

---

## Data Schema

### `attribution_touchpoints`
Core fields: visitorId, sessionId, gclid, utm_*, referrer, landing_page, session_behavior, lead_id (when converted), touch_type (first/middle/last), confidence dimensions.

### `revenue_attribution_records`
Core fields: revenue_event_id, revenue_amount, revenue_type, attribution (executive / first_touch / last_touch / w_shaped), dimensions (buyer_type, state, district, product, dealer, tender, campaign, keyword, landing_page), overall_confidence, gclid_upload_status.

### `attribution_channel_summary`
Pre-aggregated by period + channel: revenue_total, deal_count, avg_confidence, revenue_by_product/state/buyer_type, trend.

### `attribution_data_quality`
Coverage metrics by channel, confidence band distribution, gap detection, improvement tracking.

---

## Attribution Governance Rules

1. GCLID takes priority over UTM and referrer for Google Ads attribution
2. Chain completeness gates confidence — broken chain caps at 80
3. GeM revenue always uses Tender Lifecycle model, never marketing attribution
4. Dealer revenue split determined by declared scenario
5. Time gaps reduce confidence — never break attribution
6. Confidence < 50 excluded from bid optimization; included in reporting
7. Unattributed revenue tracked and targeted for reduction (target: <5%)
8. GCLID upload is mandatory within 24 hours of invoice for Google Ads conversions
9. Attribution records are immutable once sealed at payment
10. Revenue Graph is the single source of truth — no agent calculates attribution independently

---

## Closing Principle

The Attribution Engine earns trust by being transparent about what it does not know. Confidence 95 means near-certain. Confidence 30 means a reasonable guess. Making this visible prevents wrong attributions from looking identical to correct ones.

Every rupee spent must eventually be traceable to revenue. That traceability is built one link at a time: Lead → RFQ → Order → Payment → GCLID Upload → Google Optimization.
