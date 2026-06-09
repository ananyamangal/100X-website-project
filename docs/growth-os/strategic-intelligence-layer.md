# Strategic Intelligence Layer — Architecture

> Growth OS 3.0 — Strategic Intelligence  
> Status: Architecture approved  
> No code. No UI. Business architecture only.

---

## Platform Overview

Growth OS is not a collection of dashboards. It is a connected system of intelligence engines where every engine makes every other engine smarter.

Three operational layers:

```
LAYER 1: DATA CAPTURE
  RFQ Engine (commercial events)
  Zoho Books Integration (financial reality)
  GeM Monitoring (procurement events)
  Digital Tracking (Google Ads, GSC, GA4)
  AI Search Probing (visibility signals)

LAYER 2: INTELLIGENCE ENGINES
  Buyer Intelligence           → Who are our buyers and what will they do next?
  Competitor Intelligence      → Who threatens our revenue and how?
  Procurement Intelligence     → Where is government money going and when?
  AI Search Intelligence       → How visible are we in AI-powered buyer journeys?
  Revenue Forecasting          → What revenue should we plan for?
  Google Ads Director          → How should we spend our digital budget?
  Local Presence Engine        → How do we own geography?
  Revenue Attribution          → Why did we earn what we earned?
  Dealer Intelligence          → How is the dealer channel performing?
  Territory Intelligence       → Where should we invest next?

LAYER 3: OPERATING MODEL
  CEO Command Center           → Synthesis of everything
  Approval Governance          → Human review of every recommendation
  Revenue Strategist           → Cross-engine synthesis and prioritisation
```

**Architecture principle:** Every score is a question about future revenue. A score that does not answer "how much additional revenue can this generate?" has no place in Growth OS.

---

## Part 1: Buyer Intelligence Engine

### The Problem This Engine Solves

Without Buyer Intelligence, 100X Circle treats a municipal corporation in Lucknow the same as a first-time PCO inquiry. Every interaction is stateless — the system has no memory.

With Buyer Intelligence, every commercial interaction builds toward a permanent organisational understanding of who this buyer is, what they value, how they behave, and what they are likely to do next.

### Buyers Are Organisations, Not Contacts

The engine tracks organisations. A government department is one buyer regardless of how many individuals interact with 100X Circle. Individual contacts live inside the buyer profile — but intelligence is at the organisation level.

### Buyer Profile — Core Properties

```
IDENTITY
  buyer_id            (permanent)
  organisation_name
  buyer_type          (see classification below)

  For government:
    department_name / parent_department / ministry or state govt
    state / district / municipality_tier

  For private:
    gstin / industry category / employee count range

CONTACTS
  contacts: [{
    name, designation, phone, email,
    is_decision_maker, is_influencer, is_technical_evaluator,
    last_contacted, relationship_quality (warm / neutral / cold)
  }]

COMMERCIAL HISTORY (from RFQ Engine + Zoho Books)
  first_inquiry_date / first_purchase_date
  last_purchase_date / last_rfq_date / last_contact_date

  total_rfqs_received / total_quotations_sent
  total_orders_placed
  total_revenue_collected        (from Zoho Books)
  total_revenue_outstanding      (from Zoho Books)
  average_order_value / median_order_value / largest_single_order

  products_purchased: [{product_id, quantity, revenue, date}]
  products_never_purchased       (catalogue gap)

  win_rate
  average_quotation_to_order_days
  average_negotiation_rounds
  average_discount_achieved

  For government buyers:
    tenders_participated_in / tenders_won_by_us
    tenders_lost_to_competitors / average_tender_value

PAYMENT BEHAVIOUR (from Zoho Books)
  payment_reliability_score
  average_collection_delay_days
  advance_payment_compliance
  has_outstanding_overdue
```

### Buyer Type Classification

```
TYPE 1: MUNICIPAL CORPORATION
  Sub-types: Metro / Class-A / Class-B / Class-C
  Mechanism: GeM + direct tender + limited quotation
  Driver: Monsoon season, outbreak response, civic health mandate
  Products: VM500, vehicle-mounted foggers
  Order value: ₹5L–₹50L
  Frequency: Every 18–36 months
  Key signals: Budget approval, disease outbreak, new ward commissioner

TYPE 2: STATE HEALTH DEPARTMENT
  Sub-types: NHM / NVBDCP / State Disease Control / Malaria Dept
  Mechanism: GeM mandatory above threshold
  Driver: Disease surveillance, seasonal prevention campaigns
  Order value: ₹3L–₹25L
  Frequency: Annual or biennial
  Key signals: Monsoon budget, outbreak, health policy

TYPE 3: CENTRAL GOVERNMENT / GPA
  Sub-types: CPWD / Railways / Military / AIIMS / Central Universities
  Mechanism: GeM + GPA-specific procurement
  Key signals: Annual budget cycle, institutional tender calendar

TYPE 4: PCO (PEST CONTROL OPERATOR)
  Sub-types: Franchise chains / Independent operators / Agricultural PCOs
  Mechanism: Direct purchase / Dealer
  Driver: Business expansion, equipment upgrade, new contract
  Order value: ₹50K–₹5L
  Frequency: 2–4 years per unit
  Key signals: New commercial contracts, equipment failure, seasonal demand

TYPE 5: DEALER
  Sub-types: Regional distributor / State / District dealer
  Mechanism: Direct from 100X Circle
  Driver: End-customer demand, stocking
  Key signals: Seasonal demand, end-customer tenders, territory expansion

TYPE 6: INDUSTRIAL BUYER
  Sub-types: Food processing / Warehouse / Manufacturing / Hospitality
  Mechanism: Direct quotation / Dealer
  Driver: Pest prevention compliance, FSSAI requirements
  Order value: ₹1L–₹8L

TYPE 7: EXPORT BUYER
  Sub-types: African market / Middle East / Southeast Asia
  Mechanism: Direct export / Agent-mediated
  Key signals: Trade inquiries, agent introduction, international tender

TYPE 8: INSTITUTION
  Sub-types: Hospitals / Airports / Railways / Universities / Schools
  Mechanism: GeM + institutional tender
  Driver: Health & safety compliance, disease prevention

TYPE 9: OEM PARTNER
  Sub-types: Vehicle integrators / Sprayer assembly partners
  Mechanism: Regular B2B orders
  Key signals: Vehicle fleet expansion, new model introduction

TYPE 10: AGRICULTURAL
  Sub-types: Progressive farmers / FPO / Agricultural co-operatives
  Mechanism: Dealer / Direct / Agricultural scheme
  Driver: Crop protection, Rabi/Kharif season
  Products: Agricultural sprayers, agri-adapted foggers
```

### The Ten Buyer Intelligence Scores

**Score 1: Buyer Quality Score (0–100)**

```
Revenue Contribution (trailing 12 months):
  > ₹20L: 30 pts  |  ₹10–20L: 22 pts  |  ₹5–10L: 16 pts
  ₹2–5L: 10 pts   |  ₹1–2L: 6 pts     |  < ₹1L: 2 pts

Revenue Growth Trend:
  Growing >25% YoY: 15 pts  |  Growing 10–25%: 12 pts
  Stable (±10%): 8 pts      |  Declining: 1–4 pts

Relationship Stage:
  Stage 5: 15 pts  |  Stage 4: 12 pts  |  Stage 3: 9 pts
  Stage 2: 6 pts   |  Stage 1: 3 pts   |  Stage 0: 0 pts

Payment Reliability Score:
  90–100: 15 pts  |  70–89: 11 pts  |  50–69: 7 pts  |  < 50: 0–3 pts

Strategic Alignment:
  Perfect fit: 15 pts  |  Aligns: 10 pts  |  Partial: 5 pts  |  Low priority: 1 pt

Engagement Depth:
  Multi-product, all depts: 10 pts  |  Multi-product: 7 pts
  Single-product: 4 pts             |  Never purchased: 0 pts
```

**Score 2: Relationship Score (0–5 stages)**

```
STAGE 0 — COLD PROSPECT
  Evidence: Inquiry received, no purchase, no ongoing engagement

STAGE 1 — ENGAGED PROSPECT
  Evidence: Active RFQ in system OR multiple inquiries without purchase

STAGE 2 — FIRST PURCHASE COMPLETE
  Evidence: One order fulfilled, payment received

STAGE 3 — ACTIVE BUYER
  Evidence: 2–5 purchases, OR a single high-value purchase with confirmed repeat intent

STAGE 4 — PARTNER BUYER
  Evidence: 5+ purchases, consistent engagement, may provide referrals

STAGE 5 — STRATEGIC ACCOUNT
  Evidence: Multi-year relationship, multi-product, acts as reference customer
             OR buyer whose logo on a case study wins other accounts

Stage transitions require human confirmation. System recommends; Revenue Strategist approves.
```

**Score 3: Revenue Potential Score (0–100)**

```
Organisation Revenue Potential (estimated annual procurement for category):
  Metro Municipal Corp:      ₹50L–₹2Cr annual
  State Health Dept:         ₹20L–₹80L annual
  PCO national chain:        ₹5L–₹30L annual
  PCO independent:           ₹50K–₹5L annual
  Dealer (state level):      ₹20L–₹80L annual

Score = inverted wallet share:
  Capturing 10% of estimated spend → high potential score
  Capturing 80% of estimated spend → lower potential score (already developed)

Cross-Sell Gap:
  Products logically applicable but not yet purchased: 10–20 pts each
  Products from natural product set for this buyer type that are missing

Geographic Expansion:
  Buyer has multiple districts but 100X Circle has only delivered to one: +15 pts

Referral Potential:
  Buyer type positioned to refer other buyers of same type: +10 pts
```

**Score 4: Strategic Account Score (0–100)**

```
Revenue Weight (same as Quality Score revenue component): 0–30 pts

Reference Value:
  National-profile organisation (NDMC, BMC, major state health dept): 25 pts
  State-level name: 15 pts  |  District-level: 5 pts

Network Effect:
  High influence (decision influences other departments nationally): 20 pts
  Medium: 12 pts  |  Low: 4 pts

Market Signal:
  Displacing a competitor's long-held account: 15 pts
  Entering a new geography through this buyer: 15 pts
  Standard win: 5 pts

Category Precedent:
  First major municipal corp in a new state: 15 pts
  First PCO chain in a new state: 10 pts
  Nth buyer in established category: 3 pts
```

**Score 5: Cross-Sell Opportunity Score (0–100)**

```
Natural Product Set Analysis:
  For each buyer type, the system maintains a natural product set —
  what a fully-developed buyer in this category should own.

  Municipal Corporation natural set:
    VM500 (most have bought) / Mini fogger for parks / Spare parts / Backup unit

  PCO natural set:
    Thermal fogger (first purchase) / Cold fogger (second logical) /
    Agricultural adaptor / Spare parts subscription

  Score: each missing product from natural set = 10–20 pts (scaled by value)
  Recency: purchased > 18 months ago = +10 (equipment aging)
  Engagement signal: recent inquiry about a new product = +15

Output: ranked list of cross-sell recommendations with probability and timing
```

**Score 6: Reference Customer Score (0–100)**

```
Brand Visibility of Buyer:
  National name (NDMC, BMC): 30 pts  |  State-level: 20 pts
  District-level: 10 pts             |  Unknown/private: 3 pts
  Has provided case study: +10 bonus

Willingness to Reference (from notes):
  Has provided testimonial: 25 pts  |  Agreed on request: 18 pts
  Not asked yet: 10 pts             |  Has declined: 0 pts

Geographic Signal Value:
  First reference in a new state: 20 pts  |  Additional in existing state: 8 pts

Use Case Visibility:
  Visible publicly (municipal spraying): 25 pts
  Partially visible: 12 pts  |  Private: 5 pts
```

**Score 7: Payment Reliability Score (0–100)**
Already fully designed in the Financial Intelligence Layer. Carries forward directly.

**Score 8: Lifetime Value Score (₹)**

```
LTV = Average Annual Revenue × Expected Relationship Years × Growth Factor

Relationship years by stage:
  Stage 5: 12–15 years  |  Stage 4: 8–12 years  |  Stage 3: 5–8 years
  Stage 2: 3–5 years    |  Stage 1: 3 years (if converted)

Growth Factor:
  Revenue growing: 1.10–1.25  |  Stable: 1.00  |  Declining: 0.85–0.95

Examples:
  NDMC Delhi (Stage 5, ₹18L/yr avg, 12 years): LTV = ₹2.16Cr
  UP DHO Lucknow (Stage 3, ₹8L/yr, 6 years):  LTV = ₹48L
  PCO (Stage 2, ₹1.2L/yr, 4 years):           LTV = ₹4.8L
  New dealer (Stage 1, est ₹12L/yr, 8 years):  LTV = ₹96L
```

**Score 9: Repeat Purchase Probability (0–100%)**

```
Base rate by buyer type:
  Municipal Corp: 55%  |  State Health: 60%  |  PCO chain: 70%
  PCO independent: 45% |  Dealer: 90%        |  Industrial: 50%

Adjustments:
  Stage 4–5: × 1.3       |  Stage 2–3: × 1.0    |  Stage 0–1: × 0.6
  Last purchase > 24mo:  × 1.2  (equipment aging → replacement due)
  Last purchase < 6mo:   × 0.7  (just bought)
  Open RFQ in system:    × 1.5  (active engagement)
  Competitor in territory: × 0.85

Output: probability + estimated next purchase window
```

**Score 10: Account Risk Score (0–100)**

```
Activity Decay:
  Days since last contact: 1 pt per 5 days (max 20)
  Days since last purchase: 1 pt per 10 days (max 15)

Relationship Reversal Signals:
  Key contact changed (decision-maker left): 20 pts
  Multiple unanswered outreach attempts: 15 pts
  Unresolved complaint in system: 10 pts

Competitive Threat:
  Competitor won similar account in same geography: 15 pts
  Competitor known to be quoting this buyer: 20 pts
  Competitor recently won a tender this buyer participates in: 12 pts

Payment Health:
  Overdue payment (Collection Risk > 50): 10 pts
  Overdue > 60 days: 15 pts

Thresholds:
  0–20:   Low Risk — healthy
  21–40:  Monitor — proactive outreach recommended
  41–60:  Moderate — Revenue Strategist intervention
  61–80:  High Risk — escalate to senior management
  81–100: Critical — CEO attention + immediate action plan
```

### Score Evolution Triggers

Every score recalculates on commercial events:

```
New RFQ received:         Repeat Purchase Probability +, Account Risk -
Order placed and paid:    All revenue components recalculate, Relationship Stage assess
RFQ lost (competitor):   Account Risk +, feeds Competitor Intelligence
No activity 60 days:     Account Risk increases via decay, re-engagement recommendation
New government budget:   Government buyer Repeat Purchase Probability updates
```

---

## Part 2: Competitor Intelligence Engine

### The Dynamic Discovery Principle

No competitor is ever hardcoded. The system discovers competitors from commercial evidence. A company becomes a competitor when evidence of competition appears — not when someone lists them.

Today's known competitors (2026): GVLM, Foggers India, Neptune, Pulsfog, Royal Tradelinks, Quality Enviro. These are starting points. The system discovers others.

### Competitor Discovery Sources

```
SOURCE 1: GeM Award Data
  When 100X Circle loses a GeM tender, the portal shows the winner.
  Every loss → company name, winning price, product, state, department.
  If name is new → competitor profile created automatically.

SOURCE 2: Lost RFQ Analysis
  Every lost quotation with reason "Competitor" and a company name entered
  → competitor name, product, our price, their implied price, buyer type, state.
  If new → new profile created.

SOURCE 3: Google Ads Auction Insights
  Shows which companies appear for the same keyword auctions.
  Confirmed digital competitors.

SOURCE 4: Google Search Visibility
  Regular probing of target search queries reveals organic competitors.

SOURCE 5: AI Search Monitoring
  Companies appearing in ChatGPT/Gemini/Perplexity recommendations
  for target product queries.

SOURCE 6: Dealer Feedback
  "What other brands are your customers comparing?"
  Structured question in dealer communication cadence.

SOURCE 7: Industry References
  Government tender specifications, trade show exhibitor lists,
  industry directory monitoring.

SOURCE 8: YouTube Monitoring
  Product demonstration videos targeting the same audience.

SOURCE 9: Buyer-Disclosed Comparisons
  "I got a quote from Company X at ₹Y" — captured in negotiation log,
  flows directly to Competitor Intelligence.
```

### Competitor Profile

```
IDENTITY
  competitor_id / company_name
  discovery_date / discovery_source / discovery_evidence
  profile_confidence: Confirmed / Probable / Suspected
    Confirmed:  Multiple independent data points
    Probable:   2+ data points from different sources
    Suspected:  1 data point, needs verification

CATEGORISATION
  competitor_tier:
    TIER 1 — DIRECT: Same product, same geography, same buyer type
    TIER 2 — PARTIAL: Same product, different geography or buyer type
    TIER 3 — REGIONAL: Strong in specific states, not national
    TIER 4 — EMERGING: Recent entries, limited evidence
    TIER 5 — ADJACENT: Different product, overlapping buyers

  product_categories_competing: string[]
  states_active_in: string[]
  buyer_types_targeting: string[]

DIGITAL PRESENCE
  website_url / gem_seller_id / google_ads_active
  organic_ranking_keywords: string[]
  youtube_presence: boolean
  ai_recommendation_frequency: number (per 100 probes)

PRICE INTELLIGENCE
  price_data_points: [{
    date, product_category, their_price, our_price_at_time,
    source, source_confidence
  }]
  price_position: Significantly Lower / Slightly Lower / At Parity /
                  Slightly Higher / Significantly Higher
  estimated_price_vs_100x: % (negative = they are cheaper)

TENDER PERFORMANCE
  tenders_competed_against_us / tenders_won_against_us
  win_rate_against_us: %
  states_with_highest_wins / departments_with_highest_wins
```

### Competitor Threat Score (0–100)

```
Revenue Overlap (0–25):
  Full overlap (same products, buyers, geographies): 25 pts
  Significant: 18 pts  |  Partial: 10 pts  |  Minimal: 3 pts

Win Rate Against 100X Circle (0–25):
  > 50% win rate: 25 pts  |  30–50%: 18 pts
  15–30%: 10 pts          |  < 15%: 4 pts
  Insufficient data: 12 pts (unknown = moderate caution)

Price Advantage (0–20):
  Significantly cheaper (>15%): 20 pts  |  Slightly cheaper (5–15%): 14 pts
  At parity (±5%): 8 pts                |  More expensive: 2 pts

Digital Presence Threat (0–15):
  Outranking on target keywords: 8 pts
  Active Google Ads on our terms: 4 pts
  Appearing in AI recommendations: 3 pts

Geographic Depth (0–15):
  Strong in 100X Circle's highest-revenue states: 15 pts
  Moderate: 10 pts  |  Different states: 4 pts

Thresholds:
  80–100: Critical Threat — immediate strategic response
  60–79:  High Threat — active monitoring, defensive strategy active
  40–59:  Moderate Threat — quarterly review
  20–39:  Low Threat — passive monitoring
  0–19:   Minimal Threat — awareness only
```

### Emerging Competitor Detection

```
SIGNAL 1: First GeM appearance
  New company in GeM award for fogging category
  → TIER 4 profile created, Threat Score = 20 (unknown = moderate caution)
  → Revenue Strategist notified

SIGNAL 2: First Google Ads appearance
  Company not previously seen in Auction Insights for target keyword
  → Cross-reference database, if new: create profile

SIGNAL 3: First AI recommendation
  Company not in database appears in AI search response for target query
  → Flag for human verification

SIGNAL 4: Dealer mentions new brand name
  → Research and cross-reference with GeM, Google, organic

SIGNAL 5: Buyer mentions during negotiation
  Most relevant signal. Company that buyers compare against you
  → Immediate priority research
```

---

## Part 3: Procurement Intelligence Engine

### Why This May Be the Most Valuable Engine

Government procurement in India follows predictable patterns. Budgets are allocated annually. Monsoon season drives vector control procurement. NVBDCP disbursals follow fiscal timelines. Municipal corporations hold council budget approvals before tender season.

The Procurement Intelligence Engine predicts these patterns. Instead of reacting to tenders, 100X Circle anticipates them 60 days in advance.

### Department Profile

```
IDENTITY
  department_id / department_name / department_type
  parent_ministry_or_govt / state / district
  linked_buyer_profile_id (link to Buyer Intelligence Engine)
  gem_buyer_id / gem_empanelment_status

PROCUREMENT HISTORY
  first_procurement_date / last_procurement_date
  tenders_issued_total / tenders_relevant_to_100x

  procurement_from_100x: [{date, tender_id, product, quantity, value, payment_date}]
  procurement_from_competitors: [{date, tender_id, competitor, value, our_bid}]

  total_category_spend_from_100x
  total_category_spend_all_suppliers (from GeM public data)

TENDER PATTERNS
  average_tender_frequency_months
  average_tender_value
  last_tender_date
  predicted_next_tender_date (system calculated)

  seasonal_pattern:
    typical_months_for_tender: string[]
    budget_cycle_trigger: boolean
    outbreak_triggered: boolean
```

### Procurement Intelligence Scores

**Department Score (0–100)** — How valuable is this department?

```
Budget Potential (0–25):
  > ₹20L annual: 25 pts  |  ₹10–20L: 20 pts  |  ₹5–10L: 14 pts
  ₹2–5L: 8 pts           |  < ₹2L: 3 pts

Purchase Frequency (0–25):
  > 2 tenders/year: 25 pts  |  1–2/year: 18 pts
  1 per 2 years: 10 pts     |  1 per 3+ years: 5 pts

Payment Reliability (0–20): from Zoho Books payment data
Product Fit (0–15): % of their procurement needs our products meet
Relationship Depth (0–15): Relationship Stage from Buyer Intelligence
```

**Tender Probability Score (0–100%)** — Probability of tender in next 90 days

```
Base rate from department type + season
(e.g., Municipal Corp Q1 April–June: 35%, Q4 Jan–Mar: 55%)

Adjustments:
  Active budget signal:              × 1.4
  Overdue by historical pattern:     × 1.3
  Contact activity in last 30 days:  × 1.2
  Competitor won their last tender:  × 0.85

Output: "75% probability of tender from UP NHM in next 90 days.
         Basis: Pre-monsoon season + last tender 22 months ago + budget signal."
```

**Budget Confidence Score (0–100)** — How confident are we budget exists?

```
Tier 1 — Confirmed (90–100):
  Government budget document explicitly names scheme + allocation
Tier 2 — Strong Signal (70–89):
  State budget includes increase in health / vector control
Tier 3 — Pattern-Based (50–69):
  Department historically receives budget this quarter
Tier 4 — Uncertain (30–49):
  Budget cycle expected but no confirmation signals
Tier 5 — Unlikely (10–29):
  Budget freeze or austerity signals detected
```

### Procurement Calendar Output

Generated monthly — a forward-looking prediction of upcoming tenders:

```
PROCUREMENT CALENDAR — NEXT 90 DAYS

HIGH CONFIDENCE (>65% probability):
  UP NHM (Health) → Vector control tender expected July 2026
    Basis: Pre-monsoon + 22 months since last + budget signal
    Estimated value: ₹8–15L
    Our win probability: 58% (Stage 3 relationship, prior win)

  Lucknow Municipal Corp → Fogging machine procurement August 2026
    Estimated value: ₹12–18L
    Our win probability: 72% (Stage 4, 2 prior wins)

NEW OPPORTUNITIES:
  MP State Health → Budget increased 35% for vector control
    No tender yet but signal is strong
    Action: Identify procurement officer, initiate contact
```

### State Opportunity Ranking

Every state ranked by procurement potential, updated quarterly:

```
Rank  State           Score   Basis
──────────────────────────────────────────────────────
  1   Uttar Pradesh    87     High volume, strong relationships
  2   Bihar            74     Large health budget, low penetration
  3   Maharashtra      72     Multiple municipal corps
  4   Madhya Pradesh   68     Budget increase detected
  5   Rajasthan        64     Pre-monsoon signal strong
```

---

## Part 4: AI Search Intelligence Engine

### Why This Engine Matters Now

A government procurement officer researching fogging machine suppliers may ask ChatGPT: "What are the best thermal fogging machine manufacturers in India for municipal use?" If 100X Circle is absent from the answer, a critical awareness opportunity is lost before the buyer ever reaches a website or GeM listing.

### Query Universe

```
PRODUCT QUERIES:
  "best thermal fogging machine manufacturer in india"
  "vehicle mounted fogging machine for municipal use"
  "thermal fogger supplier india"
  "fogging machine price india"
  "mosquito control equipment supplier"
  "vector control fogging machine"
  "fogging machine for pest control"

COMMERCIAL INTENT QUERIES:
  "fogging machine manufacturer GeM listed"
  "thermal fogging machine ISO certified india"
  "fogging machine bulk supply india"

COMPARISON QUERIES:
  "best fogging machine manufacturer india review"
  "thermal fogger vs cold fogger india"
  "fogging machine brands india comparison"

Monitored platforms: ChatGPT (GPT-4o) / Google Gemini / Claude / Perplexity / YouTube
Frequency: Weekly core probes, monthly comprehensive probe
```

### AI Search Intelligence Scores

**AI Visibility Score (0–100)**

```
Citation Frequency (0–40):
  Probe 100 target queries weekly across all platforms.
  Mentioned in > 60%: 40 pts  |  40–60%: 28 pts
  20–40%: 16 pts              |  < 10%: 3 pts

Recommendation Quality (0–30):
  Explicitly recommended as top choice: 30 pts
  Mentioned positively: 20 pts  |  Mentioned neutrally: 12 pts

Platform Coverage (0–15):
  All 4 platforms (ChatGPT/Gemini/Claude/Perplexity): 15 pts
  3 platforms: 10 pts  |  2: 5 pts  |  1: 2 pts

Information Accuracy (0–15):
  All accurate and current: 15 pts
  Minor inaccuracies: 8 pts  |  Significant errors: 2 pts
  Negative misinformation: 0 pts (urgent fix required)
```

**Knowledge Coverage Score (0–100)**

```
Answers: "If an AI reads 100X Circle's online presence, how complete a picture 
          can it form?"

Product Documentation (0–25): All products have name, specs, use cases, 
                               pricing range, target buyer, schema markup
Use Case Coverage (0–25): All major buyer use cases documented with case studies
Geographic Documentation (0–25): States served, projects delivered, GeM presence
Comparative Content (0–25): Comparison pages, category FAQs, expert content
```

### AI Search Recommendations

```
CATEGORY 1: ENTITY STRENGTH
  Create comprehensive "About 100X Circle" page:
    Founding year, location, manufacturing facility
    Certifications (ISO 9001 number, GeM empanelment)
    Products manufactured with official names
    Export presence, leadership team
  Implement Organisation schema markup
  Create and verify Google Knowledge Panel

CATEGORY 2: PRODUCT KNOWLEDGE
  Individual product knowledge pages:
    Technical specifications (engine type, capacity, range, output rate)
    Applications by buyer type
    GeM item ID and availability
  Implement Product schema markup

CATEGORY 3: AUTHORITY CONTENT
  "How to choose a fogging machine for municipal mosquito control"
  "Thermal fogging vs cold fogging: which is better for vector control?"
  "GeM procurement guide for fogging machines"
  "Case study: [Municipal Corp] reduced dengue cases with fogging programme"

CATEGORY 4: COMPARISON PRESENCE
  "100X Circle VM500 vs [competitor equivalent]"
  "Best fogging machines for municipal use in India"
  These pages teach AI systems that 100X Circle belongs in the comparison set.
```

---

## Part 5: Revenue Forecasting Engine

### Four Forecast Horizons

**30-Day Forecast: Cash Certainty**

```
TIER A — Near-Certain Collections (95% weight):
  Zoho Books: invoiced, due within 30 days × payment reliability factor

TIER B — Committed Pipeline (90% weight):
  PO received, in production, dispatched × invoice-to-collection timing

TIER C — Verbal Commitment (75% weight):
  Verbal commitment status × probability of invoicing within 30 days

TIER D — Overdue Collections (variable weight):
  Overdue invoices × Collection Risk Score-adjusted probability

TIER E — Dealer Orders with Advance (70% weight):
  Advance paid × production timeline × dealer DSO

Output:
  Expected: ₹X.XL
  Confidence range: ₹Y.YL to ₹Z.ZL
  Critical risk items (named, with amounts)
```

**90-Day Forecast: Tactical Planning**

```
Additional inputs:
  Active quotations × buyer-type win rates
    (Municipal Corp 32% / PCO 45% / Dealer 72% / Industrial 38%)
  GeM bids awaiting award × 35% base, adjusted by dept familiarity
  Procurement Calendar predictions × Tender Probability Score %
  Seasonal revenue patterns × seasonal index

Output:
  Monthly breakdown (Month 1 / Month 2 / Month 3)
  By channel: Direct / GeM / Dealer / Export
  By product: VM500 / Mini Fogger / Agricultural / Spare Parts
  Sensitivity analysis: named scenarios with ₹ impact
```

**180-Day and 365-Day Forecasts**

```
Additional inputs:
  Pipeline volume × historical conversion rates
  New dealer onboarding ramp (90–180 day lag)
  Manufacturing capacity ceiling
  Strategic account development plans

Output format (annual):
  Quarterly breakdown
  Best Case (90th percentile): ₹X Cr
  Expected Case (50th percentile): ₹Y Cr
  Worst Case (10th percentile): ₹Z Cr
  Primary upside drivers / downside risks
```

### Forecast Quality Scores

**Forecast Confidence Score (0–100)**

```
Data completeness:          30% weight
Attribution coverage:       20% weight
Historical accuracy:        25% weight
Pipeline stage distribution: 15% weight
Seasonal data available:    10% weight

>90: High — board-level planning  |  70–89: Good — operational decisions
50–69: Moderate — directional     |  <50: Low — rough indicator only
```

**Forecast Accuracy Score (trailing)**

```
For each closed period:
  Accuracy = 1 − (|actual − forecast| / forecast)

Targets:
  30-day forecast: > 88% accuracy
  90-day forecast: > 80% accuracy

Accuracy by channel (which channel is hardest to forecast?)
Accuracy feeds model recalibration:
  GeM consistently over-estimated by 20% → reduce GeM win probability weights
```

---

## Part 6: Google Ads Director

### The Senior Consultant Mental Model

The Google Ads Director thinks like a senior PPC consultant who has studied 100X Circle deeply: understands the B2B industrial context, knows the buyer journey, and proactively identifies what will improve revenue — not just click metrics.

A junior manager optimises for CPC and conversion rate. A senior consultant asks: "Which buyers are worth ₹8L and which are worth ₹80K? What am I doing to find more ₹8L buyers?"

### Data Inputs

```
FROM GOOGLE ADS:
  Campaign, keyword, ad performance
  Auction Insights (who is competing for same keywords)
  Search Terms Report (actual searches before clicks)
  Geographic performance / Device / Dayparting

FROM GROWTH OS:
  Every lead: source, buyer type, product interest, state
  Win rates by campaign / keyword / landing page
  Revenue per lead by source (primary signal)
  GCLID → revenue chain (which clicks became revenue at what value)

FROM INTELLIGENCE ENGINES:
  Buyer types generating highest revenue (inform targeting)
  Geographic distribution of high-value buyers (geo-targeting)
  Competitor keywords and messaging
  Procurement Calendar (pre-tender bid increases)
```

### Capability 1: Opportunity Discovery

```
KEYWORD OPPORTUNITIES:
  Analyse Search Terms: queries generating clicks but no conversions
  Cross-reference with RFQ Engine: do these queries appear in leads?
  Output: "17 high-intent queries with leads but no dedicated ad group.
           Estimated opportunity: ₹3–6L at current conversion rates."

NEGATIVE KEYWORD OPPORTUNITIES:
  Queries generating clicks, zero leads in any period
  Queries generating leads but zero revenue ever (from attribution)
  Output: "Spare parts queries: 140 clicks/month, zero leads.
           Likely repair shops, not buyers. Recommended negatives: [list]"

GEO-TARGETING OPPORTUNITIES:
  Compare State Opportunity Rankings vs. current Ads budget distribution
  If UP is highest potential state but getting only 15% of budget → reallocation
```

### Capability 2: Anomaly Detection

```
CPC SPIKE: Average CPC > 25% week-over-week on critical keyword
  Cause check: new competitor? quality score drop? match type broadening?
  Alert if keyword > 20% of revenue

CONVERSION COLLAPSE: Lead form conversion rate drops > 30% week-over-week
  Cause check: landing page broken? traffic composition shift?
  Alert: Critical if sustained > 3 days

BUDGET EXHAUSTION: Daily budget consumed before peak hours (post-12pm)
  Implication: invisible during key buying hours
  Recommendation: increase budget OR reduce bids to extend visibility

COMPETITOR ATTACK: New competitor appears in > 50% of target keyword auctions
  Recommendation: review their ads and landing pages, assess defensive response
```

### Capability 3: Recommendation Format

```
EXAMPLE RECOMMENDATION:
  BID INCREASE — "vehicle mounted fogging machine" group
  From: ₹32 → Proposed: ₹55

  Expected Impact:
    Current average position: 2.3 → Projected: 1.4
    Estimated impression share increase: +22%
    Revenue impact: +₹8–12L/quarter (₹6,800 revenue per click historical)

  Confidence Score: 78/100
    High: Revenue per click from 14 months of GCLID attribution
    Medium: Competitor bid levels estimated, not measured

  Risk Score: 24/100
    Budget increase: ₹5,400/month max additional spend
    Concern: Competitor may respond with counter-increase

  Reasoning:
    This keyword generated ₹28.4L in 12 months from 420 clicks.
    Revenue per click: ₹6,762. At ₹55 CPC, cost = 0.81% of revenue generated.
    At ₹32, average position 2.3 with low impression share.
    Consider switching to Target ROAS bidding at 4000% after 18 GCLID uploads.

  Awaiting: Human approval before any change is made.
```

---

## Part 7: Local Presence Engine

### Monitored Presence Points

```
GOOGLE BUSINESS PROFILE
  Completeness: all fields filled, photos recent, posts active
  Performance: Map views / Direction requests / Phone calls / Website visits from GBP

GOOGLE MAPS RANKINGS
  "Fogging machine manufacturer near [city]" — position in Maps pack
  "Fogging machine supplier [state]" — tracked for Gurugram + key state capitals

REVIEWS
  Total count / Average rating / Review velocity / Sentiment themes
  Response rate and quality (generic vs. specific responses)

DEALER VISIBILITY
  Are 100X Circle dealers findable on Google Maps in their territories?
  Do dealer GBPs mention 100X Circle products?
```

### Local Presence Scores

**Local Presence Score (0–100)**

```
GBP Completeness + Activity (0–25):
  All fields + monthly posts + recent photos: 25 pts
  Partial + occasional: 10–20 pts  |  Inactive: 0–8 pts

Maps Visibility (0–25):
  In Maps Pack for primary queries in key cities: 20–25 pts
  Some queries: 10–18 pts  |  Not appearing: 0–5 pts

Review Strength (0–25):
  4.5+ stars, 50+ reviews, recent: 20–25 pts
  4.0–4.5, 20+ reviews: 12–18 pts  |  Below 4.0 or <10 reviews: 3–8 pts

Geographic Coverage (0–25):
  Visible in > 5 key states for target queries: 20–25 pts
  2–5 states: 10–18 pts  |  Primarily Gurugram/Delhi only: 3–8 pts
```

**Dealer Coverage Score (0–100)**

```
Per target state:
  Active dealers with GBP listings
  Dealers mentioning 100X Circle on their profiles
  Dealer visibility for local product searches in their districts

Score based on % of high-priority states with dealer presence
```

---

## Part 8: CEO Command Center

### Design Philosophy

The CEO spends 5 minutes on the Command Center every morning. In those 5 minutes they know: how much money came in, what is about to come in, what needs their attention, what is growing and declining, what competition is doing.

Every metric drills down. The summary is clean enough that drilling is optional.

### Command Center Structure

```
SECTION 1: REVENUE PULSE
  TODAY          MTD              YTD
  ₹X.XL          ₹X.XL / ₹Y.YL   ₹X.XL / ₹Y.YL
  ▲ +8%          ▲ 67% to target  ▲ 72% to target

  COMMITTED      INVOICED         EXPECTED (90d)
  ₹X.XL          ₹X.XL            ₹X.XL ± ₹Y.YL
  [X active POs] [X unpaid invcs] [78% confidence]

  OUTSTANDING    OVERDUE          PROFIT FORECAST
  ₹X.XL          ₹X.XL            ₹X.XL (Z% margin)
  [X customers]  ⚠ 2 critical     90-day view

SECTION 2: PIPELINE
  GROSS PIPELINE  GEM PIPELINE    DEALER PIPELINE
  ₹X.XL           ₹X.XL           ₹X.XL
  [46 active RFQs][8 active bids] [12 orders]

SECTION 3: CHANNEL PERFORMANCE
  CHANNEL         REVENUE (YTD)   TREND    MARGIN
  Google Ads      ₹42L ████████  ▲+18%    22%
  GeM             ₹35L ███████   ▲+6%     17%
  Dealer          ₹22L ████      ▼-5%     14%
  Organic         ₹9L  ██        ▲+34%    24%

SECTION 4: TOP LISTS (5 panels)
  TOP BUYERS (YTD) / TOP STATES / TOP PRODUCTS /
  TOP DEPARTMENTS (GeM) / TOP DEALERS

SECTION 5: INTELLIGENCE ALERTS
  🔴 CRITICAL (action today)
  🟠 HIGH PRIORITY (this week)
  🟡 MONITOR (awareness)

SECTION 6: GROWTH OPPORTUNITIES
  Top 3 opportunities this month with ₹ revenue estimate and action

SECTION 7: COMPETITIVE INTELLIGENCE SUMMARY
  Threat landscape: critical / high / emerging counts
  Recent competitive events

SECTION 8: AI AND SEARCH VISIBILITY
  AI Visibility Score trend / Search Authority Score
  Top visibility gaps + content actions queued
```

---

## Part 9: Approval Governance

### Non-Negotiable Architecture

No agent, no intelligence engine, no automation can take any commercial action without explicit human approval.

### What AI May Do Without Approval

```
AUTONOMOUS (no approval required):
  → Monitor and collect data
  → Calculate and update scores
  → Detect anomalies and generate alerts
  → Draft recommendations
  → Analyse patterns and predict trends
  → Identify opportunities and risks
  → Generate content suggestions (not publish)
  → Create keyword lists (not add to campaigns)
  → Model bid changes (not submit to Google)
  → Prepare quotation drafts (not send)
  → Generate tender analysis (not submit bid)
```

### What Requires Approval

```
Commercial: Send any quotation / Submit any GeM bid / Update pricing /
            Issue credit note / Change payment terms

Google Ads: Any keyword addition / Any bid change / Any budget change /
            Enable any paused campaign / Create any new campaign /
            Add or remove any negative keyword / Publish any ad copy

Content: Publish any page / Update any product page /
         Send any WhatsApp outreach / Update GBP / Respond to reviews

Dealer: Appoint new dealer / Change dealer terms / Revoke dealer status /
        Forward a lead to dealer

Communications: Any external communication / Government department contact /
                Any follow-up to lost RFQ
```

### The Recommendation Object — Standard Format

```
recommendation_id
generated_by              (which engine)
generated_at              timestamp
category
priority                  (Critical / High / Medium / Low)

CONTEXT
  current_situation       (2–3 sentences)
  problem_or_opportunity

EXPECTED IMPACT
  revenue_impact_estimate (₹ — specific estimate)
  revenue_impact_range    {min, max}
  impact_horizon          (Immediate / 30-day / 90-day / 180-day)
  impact_basis            (how was this estimated)

SCORES
  confidence_score        (0–100)
  confidence_basis
  risk_score              (0–100, higher = riskier to act)
  risk_basis

EVIDENCE
  data_points_used: [{source, metric, value, period, relevance}]

REASONING
  step_by_step: [{step_number, reasoning, supporting_data}]
  (each step shows the logic chain from evidence to conclusion)

RECOMMENDED_ACTION
  action_type / action_detail
  affected_objects: [{object_type, object_id, current_value, proposed_value}]

ALTERNATIVES_CONSIDERED
  [{alternative_action, why_not_recommended}]

APPROVAL
  status: Pending / Approved / Rejected / Deferred
  reviewed_by / reviewed_at / review_notes
```

### Approval Queue Priority

```
Priority 1 — Time-Sensitive (red):
  GeM tender closing < 48 hours
  Active campaign budget exhausted
  Critical overdue payment requiring escalation

Priority 2 — High Impact (orange):
  Bid changes on high-revenue keywords
  Quotation for high-value RFQ
  New competitor detected on key terms

Priority 3 — Standard (blue):
  Routine keyword additions
  Content publication recommendations
  Dealer outreach scheduling

Priority 4 — Informational (grey):
  Monthly intelligence summaries
  Score updates and trend reports
  Low-impact optimisation suggestions
```

### Strategic Lock Levels

```
LOCK LEVEL 1 — BRAND STRATEGY LOCK
  Protects: Brand keywords, brand bidding strategy, brand safety exclusions
  Who sets: CEO  |  Unlock requires: CEO confirmation + reason

LOCK LEVEL 2 — BUDGET LOCK
  Protects: Total monthly ad budget ceiling
  Who sets: CFO or CEO  |  Effect: No recommendation can exceed locked ceiling

LOCK LEVEL 3 — PRICING FLOOR LOCK
  Protects: Minimum quotation margin per product
  Who sets: CFO  |  Effect: No quotation below locked margin floor

LOCK LEVEL 4 — DEALER RELATIONSHIP LOCK
  Protects: Strategic dealer relationships
  Who sets: Revenue Strategist  |  Effect: No recommendation to change terms
            without senior review
```

---

## Part 10: Synthesis — Architecture, Roadmap, Business Impact

### Engine-to-Engine Relationship Map

```
ENGINE          FEEDS                           CONSUMES FROM
──────────────────────────────────────────────────────────────────────
Buyer Intel     Revenue Forecast (pipeline)     RFQ Engine (all events)
                GeM Intel (dept LTV)            Zoho Books (payment)
                Google Ads (audience signals)   Revenue Attribution

Competitor      Google Ads Director (bids)      Lost RFQ (mandatory)
                GeM Intel (L1 price model)      GeM awards (public)
                AI Search Intel (visibility)    Auction Insights

Procurement     Revenue Forecast (tender pipe)  GeM data
                GeM Intelligence (bid priority) Govt budget sources
                Google Ads (pre-tender bids)    Buyer Intel (depts)

AI Search       Google Ads Director (gaps)      Platform probes
                Content recommendations          GSC data

Revenue Forecast Operations + manufacturing     All 4 pipelines
                CEO Command Center              Zoho Books (actuals)

Google Ads Dir  Revenue outcomes                Revenue Attribution
                Market position                 Buyer + Competitor Intel
                Budget efficiency               GSC + GA4 + Ads API

Local Presence  Territory Intel (geography)     GBP + Maps data
                Dealer Intel (coverage)         Competitor Maps data
```

### Priority Order of Implementation

```
RANK  ENGINE                    MONTHLY REVENUE IMPACT  DEPENDENCY
────────────────────────────────────────────────────────────────────
  1   RFQ Engine                ₹8–20L                  None
  2   Zoho Books Integration    ₹5–10L                  RFQ Engine
  3   Revenue Attribution       ₹15–25L                 RFQ + Zoho
  4   Buyer Intelligence        ₹10–18L                 RFQ Engine
  5   Procurement Intelligence  ₹20–50L                 Buyer + GeM data
  6   Google Ads Director       ₹12–25L                 Attribution + Competitor
  7   Competitor Intelligence   ₹8–15L                  Lost RFQs + GeM
  8   Revenue Forecasting       ₹6–12L                  All pipelines + Zoho
  9   AI Search Intelligence    ₹5–15L                  Content team + Search
 10   Local Presence Engine     ₹8–18L                  Dealer + Territory
 11   CEO Command Center        Multiplier               All engines
```

### 12-Month Implementation Roadmap

```
PHASE 1 — FOUNDATION (Month 1–2): "Capture Everything"
  Goal: No revenue event happens outside Growth OS. Wire financial truth layer.
  Month 1: RFQ Engine operational (4 pipelines) + Zoho Books sync
  Month 2: Revenue Attribution GCLID pipeline + Buyer Intelligence basic profiles
  Success: 95%+ invoices have growth_os_rfq_id / GCLID uploads running

PHASE 2 — REVENUE INTELLIGENCE (Month 3–4): "Understand What Drives Revenue"
  Month 3: All 10 Buyer Intelligence scores + Procurement Calendar live
  Month 4: Google Ads Director monitoring + Competitor Intelligence discovery
  Success: First Procurement Calendar / First structured Ads recommendations

PHASE 3 — STRATEGIC INTELLIGENCE (Month 5–7): "See Ahead"
  Month 5: Revenue Forecasting 4 horizons + AI Search monitoring baseline
  Month 6: Local Presence scoring + Procurement seasonal pattern detection
  Month 7: Agent collaboration: Procurement feeding Google Ads Director
  Success: 90-day forecast ±25% accuracy / First AI Visibility Score baseline

PHASE 4 — AMPLIFICATION (Month 8–10): "Engines Talking to Engines"
  Month 8: CEO Command Center full version live
  Month 9: Complete Approval Governance with all lock levels
  Month 10: Recommendation quality review + all probability recalibrations
  Success: CEO Command Center in daily use / Approval queue reviewed < 24h

PHASE 5 — OPTIMISATION (Month 11–12): "Compounding Returns"
  Annual calibration with full year of data
  First complete seasonal model from confirmed patterns
  Year 2 roadmap from gap analysis
```

### Estimated Business Impact

```
ENGINE                  12-MONTH REVENUE IMPACT
──────────────────────────────────────────────────────────────────
RFQ Engine             ₹20–40L (capture previously untracked deals)
Revenue Attribution    ₹25–50L (GCLID → Google optimises for real buyers)
Buyer Intelligence     ₹15–30L (cross-sell + churn prevention)
Procurement Intel      ₹30–80L (60-day advance vs. 24-hour reactive bidding)
Google Ads Director    ₹20–40L (bid optimisation + quality score improvement)
Competitor Intel       ₹10–25L (win-back + price calibration)
Revenue Forecasting    ₹8–20L (capacity planning + cash flow management)
AI Search Intel        ₹10–25L (long-term brand visibility)
Local Presence         ₹8–18L (geographic expansion enabled)
CEO Command Center     Multiplier on all above
──────────────────────────────────────────────────────────────────
TOTAL ESTIMATED:        ₹1.5–3.3 Crore over 12–24 months
```

### The Platform Principle

Each engine in isolation is useful. All engines connected is transformational.

A buyer score tells you who your best buyers are. Connected to Procurement Intelligence it tells you when they'll buy next. Connected to Google Ads Director it adjusts bidding before they begin their procurement research cycle. Connected to Revenue Forecasting it tells you what cash to expect and when. Connected to the CEO Command Center it puts all of that in 5 minutes every morning.

The platform earns intelligence from every commercial event — won or lost. Over time it becomes the most accurate model of 100X Circle's market that has ever existed. That model, applied with human judgment at every approval point, is the unfair competitive advantage that cannot be replicated by spending more on advertising.
