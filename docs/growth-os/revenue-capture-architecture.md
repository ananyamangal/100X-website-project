# Revenue Capture Architecture

> Growth OS 3.0 — Revenue Entry Design  
> Status: Architecture approved  
> No code. No UI. Business architecture only.

---

## The Core Problem

Attribution only works if revenue is captured. Today a 100X Circle sale may involve:

```
Lead → WhatsApp → Phone Call → RFQ → Quotation → Negotiation
→ Advance Payment → Dispatch → Balance Payment → Revenue
```

Revenue that stays in a WhatsApp conversation, a handwritten delivery receipt, or a salesperson's memory is invisible to every intelligence layer. Every revenue event that bypasses Growth OS is a permanent gap in the learning loop.

**Design goal: No revenue event should occur outside Growth OS.**

---

## Part 1: Complete Revenue Lifecycle — 13 Stages

---

### Stage 0: Trigger
The moment before the buyer enters 100X Circle's world.

- **Digital buyers:** Search query → ad click → website visit. Growth OS begins tracking automatically (session, GCLID, UTM).
- **GeM buyers:** Government budget released → tender posted. Growth OS detects via GeM monitoring.
- **Dealer buyers:** Dealer's end customer approaches dealer. First signal arrives when dealer contacts 100X Circle.
- **Direct buyers:** Phone call, WhatsApp, email from existing contact or referral.

---

### Stage 1: Inquiry
A potential buyer has made contact. Intent is unknown (may be researcher, competitor, or genuine buyer).

Signal types: website form / WhatsApp / phone call / email / dealer inquiry

**What is captured automatically:** timestamp, contact method, GCLID/UTM, raw inquiry text  
**What requires human action:** log phone/WhatsApp inquiries within 4 hours  
**Failure mode:** Inquiry received but not logged → permanently lost

---

### Stage 2: Lead
The inquiry is now a formal record in Growth OS. The Lead is the atomic revenue unit — everything downstream references it.

**Properties established:** name, contact, product interest, lead source, timestamp, assigned to, buyer type (AI-classified), initial quality score

**Transition:** when qualification criteria are assessed

---

### Stage 3: Qualified Lead
Lead confirmed as genuine purchase opportunity worth pursuing.

**Qualification criteria (BANT):**
- Budget: does the buyer have allocated funds?
- Authority: is this the decision-maker?
- Need: what problem are they solving?
- Timeline: when do they need delivery?

**Disqualification options:** Not a Buyer / Future Long Term / Duplicate / Out of Territory

Disqualified leads are never deleted — they remain as future re-engagement opportunities and territory demand signals.

**SLA:** Qualify within 24 hours (48 hours for government leads).

---

### Stage 4: RFQ (Request for Quotation)
**The most important stage transition.** Before this point, revenue is speculative. At this point, it becomes real.

Triggered by: written requirement (email/WhatsApp/form) / verbal specification during call (must be logged immediately) / official government spec email / dealer specification / GeM tender posting

The RFQ record becomes the central object. All prior lead attribution carries forward. RFQ is the anchor point for all downstream revenue.

---

### Stage 5: Quotation
100X Circle has sent a formal price response to the RFQ.

Revenue state at this stage: **Quoted** (not yet committed)

**Key tracks:**
- Buyer accepts directly → transition to Stage 7 (PO)
- Buyer counter-offers → transition to Stage 6 (Negotiation)
- Buyer rejects → "Quotation Rejected" (loss)

---

### Stage 6: Negotiation
Active price and terms negotiation. The deal is alive but terms are not final.

**Every negotiation round must be logged** — even phone calls. "We discussed on phone and they want 10% off" must be in Growth OS before the next action.

**Margin floor enforcement:** If current negotiated price puts margin below the admin-configured floor, system generates alert before human concedes the floor.

**Loss at this stage:** "Negotiation Failed" — most valuable loss to analyze because it reveals exactly where the competitive gap is.

---

### Stage 7: Purchase Order
Buyer has issued a formal Purchase Order / Work Order / Supply Order / GeM PO.

**First stage where revenue is COMMITTED.** A PO is a binding commercial document.

**Revenue reclassification:** Expected Revenue → Committed Revenue  
**PO document (PDF/image) is mandatory.**

---

### Stage 8: Advance Payment
Partial payment received before production/dispatch.

Typical patterns:
- Private buyers: 30–50% advance standard
- Dealers: may have credit terms (zero advance)
- Government: typically no advance; full payment post-delivery
- Municipal corporations: advance unlikely

**Advance payment confirmation triggers the manufacturing schedule** (Manufacturing Intelligence Engine receives production slot request).

---

### Stage 9: Production
Manufacturing of ordered units.

Tracked by Manufacturing Intelligence Engine: start date, estimated completion, current stage, delays, QC clearance.

**Revenue impact of production delay:** Advance is collected but balance at risk. Late GeM delivery may result in order cancellation.

---

### Stage 10: Dispatch
Goods shipped / handed over to buyer. 100X Circle has fulfilled its delivery obligation.

**Mandatory data:** Dispatch date, LR number, transporter, E-way bill number.

**Revenue reclassification:** Committed → Invoiced (or "Earned") — even before invoice is formally raised.

---

### Stage 11: Invoice
Formal GST invoice raised. This is the legal claim for payment.

**GCLID offline conversion upload triggered here** (if GCLID in attribution chain):
- Send to Google Ads API: GCLID + invoice taxable value + invoice date
- Effect: Google's algorithm learns this specific click → sale of ₹X

---

### Stage 12: Balance Payment
Remaining payment received after delivery.

**Payment risk flag:** If due date passes without collection → overdue alert to Revenue Strategist → DSO tracking → Buyer Intelligence payment delay flag.

**GeM-specific:** 10 working day payment mandate. Track invoice date → payment date gap per department.

---

### Stage 13: Revenue Recognition
Revenue recognized — cash received, reconciled, no disputes pending.

**Terminal event for all intelligence engines:**
- Attribution Engine: seal attribution record
- Buyer Intelligence: update relationship stage + purchase history
- Dealer Intelligence: update dealer revenue score
- GeM Intelligence: update department payment behavior
- Profit Intelligence: record actual margin vs. quoted margin
- Manufacturing Intelligence: close production slot

---

### Stage Transition Map

```
INQUIRY → [logged] → LEAD → [BANT fails] → DISQUALIFIED
                           → [BANT passes] → QUALIFIED LEAD
                                           → [formal requirements] → RFQ
                                                                   → [100X responds] → QUOTATION
                                                                                     → [counter-offer] → NEGOTIATION → [fail] → LOST
                                                                                                                      → [agree] → PURCHASE ORDER
                                                                                     → [direct accept] → PURCHASE ORDER
                                                                                                       → [advance] → ADVANCE PAYMENT
                                                                                                       → PRODUCTION → DISPATCH → INVOICE
                                                                                                       → BALANCE PAYMENT → REVENUE RECOGNITION
```

---

## Part 2: Revenue Capture Points

### Capture Completeness Score (0–100)

Every deal has a Capture Completeness Score tracking how much required data has been entered.

- **90–100:** Complete — full attribution and intelligence extraction possible
- **70–89:** Good — most intelligence extraction works
- **50–69:** Partial — confidence is reduced
- **<50:** Incomplete — attribution is unreliable; flagged for improvement

**Stage-by-stage mandatory fields summary:**

| Stage | Mandatory | Optional | Confidence Impact |
|---|---|---|---|
| Inquiry | Contact method, timestamp, contact info | GCLID, UTM, raw text | +20 if GCLID present |
| Lead | Name, org, state, contact, product interest, source | Designation | — |
| Qualified | Qualification method, BANT answers, next action | Revenue estimate | +10 |
| RFQ | Products, quantity, state, competitive situation, close date, probability | Budget, specs | +15 |
| Quotation | Line items, total value, discount, payment terms, win probability | Competitor price | +10 |
| Negotiation | Date, type, our position, buyer position, price | Close reason | +8 |
| PO | PO number, PO document, buyer GSTIN, products, value, terms | — | +20 (seals commitment) |
| Invoice | Invoice number, value, GCLID carried | — | GCLID upload triggered |
| Revenue | Recognized amount, COGS | — | Attribution sealed |

**Owner discipline:** Lead creation is the responsibility of whoever received the inquiry. Salesperson takes a call → creates the lead within 2 hours. No exceptions.

---

## Part 3: RFQ Management Architecture

The RFQ is the central revenue object. Equivalent to an "Opportunity" in Salesforce terminology, designed for 100X Circle's specific context.

### RFQ Identity
```
Format: 100X-YYYY-NNNNNN
Example: 100X-2026-000847
```
Never changes. Buyer reference numbers stored separately.

### RFQ Classification (four dimensions)

**Origin Channel:** Direct Digital / Direct Non-Digital / GeM Tender / Dealer-Forwarded / Dealer-Originated / Referral / Trade Show

**Buyer Category:** Municipal Corp / State Health Dept / Central Govt / PCO / Agricultural Dealer / Equipment Dealer / OEM Partner / Export Buyer / Industrial / Institutional

**Size:** Small <₹2L / Medium ₹2L–₹10L / Large ₹10L–₹50L / Major >₹50L

**Urgency:** High <2 weeks / Medium 2–8 weeks / Low >8 weeks / Unknown

### RFQ Status Lifecycle

| Status | Definition | SLA / Action |
|---|---|---|
| New | Received and logged, not yet analyzed | 4 hours to assign |
| Under Analysis | Evaluating requirements and pricing | 24–48 hours to quote |
| Quotation Sent | Formal quotation dispatched | Follow up D3, D7, D14 |
| Negotiation Active | Active counter-offer in progress | Log every round |
| On Hold (Buyer) | Buyer paused decision | Re-engage every 30 days |
| Verbally Committed | Oral commitment; PO not yet received | Chase PO urgently |
| PO Received | Binding PO in hand | Process advance, start production |
| In Production | Manufacturing in progress | — |
| Dispatched | Goods shipped | Invoice within 24 hours |
| Invoiced | Invoice raised; awaiting payment | Track DSO |
| Partially Collected | Advance received; balance outstanding | Chase balance |
| Fully Collected | All payments received | Seal attribution |
| Lost | Competitor won | Capture loss reason |
| Cancelled | Buyer abandoned | — |
| Expired | Quotation validity lapsed | Re-engage or close |

### Loss Reason Classification (mandatory on all lost RFQs)

Price / Product Fit / Relationship / Timeline / Payment Terms / Trust / No Budget / Policy Change / Internal / Unknown

**Competitor Who Won (if known):** Name + winning price + difference from our price → feeds Competitor Intelligence Engine.

**Target:** Unknown < 20% of losses.

### RFQ Priority Score (0–100)

```
Value component:     10–60 points (by size bracket)
Win probability:     Score × 0.15
Buyer quality:       5–20 points (from Buyer Intelligence)
Urgency:             3–15 points
Activity decay:      -1 point/day without logged activity (max -20)
```

Tiers: P1 (80–100, daily check) / P2 (60–79, 48hr) / P3 (40–59, weekly) / P4 (<40, monthly)

---

## Part 4: Quotation Intelligence

### Quotation Quality Score (0–100)

Answers: does this quotation give us the best chance of winning?

- Technical completeness: 0–25 points (spec match + model recommendation)
- Commercial competitiveness: 0–30 points (price, payment terms, delivery)
- Response speed: 0–15 points (within 24hrs = 15, within 72hrs = 5, after = 0)
- Document quality: 0–10 points (formatting + attachments)

Threshold: Score < 60 = fix before sending.

### Win Probability Score (0–100%)

Base rates by buyer type (from historical data):
- Municipal Corp: 32%
- State Health Dept: 28%
- PCO: 45%
- Dealer: 72%
- Private Industrial: 38%

Adjustments (multiplicative):
- Buyer relationship stage (0.7× for cold, 1.35× for strategic)
- Prior purchases (1.0× first time, 1.35× for 3+)
- Competitive situation (1.5× sole source, 0.7× open tender)
- Price position vs. competitor (1.2× if below, 0.75× if above)
- Urgency (1.15× if urgent need)

Cap at 95%.

### Margin Score (0–100)

```
>30% margin: 100 points
25–30%:       85 points
20–24%:       70 points
15–19%:       55 points
14% (floor):  40 points  [orange zone]
10–13%:       20 points  [red — requires override]
<10%:          0 points  [do not quote without CFO review]
```

Strategic value overlay: +10 for reference account / new territory / new category; -10 for habitual low-price negotiator; -15 for poor payment history.

Decision guidance:
- Margin Score >70: Quote confidently
- 50–69: Flag if negotiated further
- 30–49: Senior review before quoting
- <30: Reject or requote

### Competitive Quotation Database

Every known competitor quote captured: competitor name, product equivalent, unit price, deal context, date, source reliability. Used by GeM Analyst (L1 price model) and Ads Director (bid calibration).

---

## Part 5: Revenue Recognition Model

### Five Revenue States — Precise Definitions

**State 1: Expected Revenue**

```
Definition: Probability-weighted sum of all active RFQs.
Formula: Σ(RFQ Value × Win Probability)
Applies to: Qualified Lead through Negotiation Active stages.
Limitation: Based on estimated win probabilities — can be biased.
```

**State 2: Committed Revenue**

```
Definition: Revenue from Purchase Orders received and formally logged.
A PO is a legal commitment from the buyer to pay upon delivery.
Formula: Σ(PO Value for all active POs)
Unlike Expected (probabilistic), Committed is certain barring force majeure.
Sub-categories: Not Yet In Production / In Production / Dispatched
```

**State 3: Invoiced Revenue**

```
Definition: Revenue for which a formal GST invoice has been raised.
The money is owed — not yet in the bank.
Formula: Σ(Invoice taxable value, current unpaid invoices)
DSO Tracking: Days between invoice date and collection date.
  GeM target: < 20 working days
  Private: < 30 days
  Municipal: < 45 days
  Dealers: < 21 days
```

**State 4: Collected Revenue**

```
Definition: Cash actually received and reconciled.
The only revenue that exists in the physical world.
Advance payments count — an advance is real cash.
Difference between Invoiced and Collected = collection risk.
```

**State 5: Profit**

```
Definition: Collected Revenue minus COGS minus attributable overhead.
Formula: Revenue - Direct Materials - Direct Labor - Manufacturing Overhead
       - Dealer Commission - GST collected (not 100X Circle's revenue)

By channel:
  Direct Digital:  ~22% gross margin
  GeM:             ~18% (competitive bidding compresses margin)
  Dealer:          ~14% (dealer discount taken)
  Mini Fogger Direct: ~28%

Optimization target: Profit, not Revenue. A ₹20L tender at 3% margin
is worse than a ₹12L direct sale at 28% margin.
```

### Revenue State Transitions

```
OPPORTUNITY CREATED    → Expected Revenue += (RFQ Value × Win Probability)
PO RECEIVED            → Expected Revenue -= (RFQ Value × Win Probability)
                       → Committed Revenue += PO Value
INVOICE RAISED         → Committed Revenue -= Invoiced Amount
                       → Invoiced Revenue += Invoice Taxable Value
PAYMENT RECEIVED       → Invoiced Revenue -= Payment Amount
                       → Collected Revenue += Payment Amount
COGS POSTED            → Profit = Collected Revenue - COGS
```

---

## Part 6: Forecasting Model

### 30-Day Forecast: Operational Certainty

**Methodology:** Sum of high-confidence events.

| Tier | Source | Weight | Timing condition |
|---|---|---|---|
| A | Dispatched + Invoiced | 95% | Collection expected within 30 days based on buyer type DSO |
| B | Verbally Committed | 80% | Commitment > 10 days old + PO + collection realistic in window |
| C | Advanced Negotiations | 55% | Close date within 10 days (stocked items only for 30-day collection) |

Confidence band: ±15%

### 90-Day Forecast: Tactical Planning

**Methodology:** Stage-weighted pipeline + seasonal adjustment.

| Tier | Source | Weight |
|---|---|---|
| D | Quotation Sent, close date within 90 days | 38% (buyer-type-specific) |
| E | New RFQs under analysis, close date within 90 days | 20% |
| F | GeM tenders bid, awaiting award | 35% (adjusted by dept familiarity ±8%) |
| G | Seasonal patterns | Multiplier: Q3 ag ×1.35, Q4 GeM ×1.45 |

Confidence band: ±25%  
Used for: manufacturing capacity planning, raw material procurement, ad budget planning.

### 180-Day Forecast: Strategic Planning

**Methodology:** Capacity × Market × Historical Efficiency

```
Base:  3-year trailing average for equivalent 6-month window
Adjustments:
  ± marketing investment change vs. prior year
  ± new territory expansion (dealer territory ramp: 90–180 days)
  ± new product introductions
  ± GeM empanelment changes
  ± manufacturing capacity changes
  ± government budget announcements
  ± competitive landscape changes
Ceiling: 90% of manufacturing capacity maximum
```

Confidence band: ±35–40%  
Used for: fundraising, hiring, capital expenditure, new market entry.

### Forecast Accuracy Tracking

Every forecast is recorded at generation time. Actual vs. forecast compared at period end. Accuracy target: 30-day ±15%, 90-day ±25%, 180-day ±35%.

Persistent accuracy failure → recalibrate win probability weights and DSO inputs.

---

## Part 7: Executive Metrics — Precise Definitions

| Metric | Source | Definition |
|---|---|---|
| Revenue Today | Collections today | Cash received today, ex-GST, net of credit notes |
| Revenue MTD | Collections this month | All cash received since 1st of month (Indian FY: Apr–Mar) |
| Revenue YTD | Collections this year | All cash received since April 1 this fiscal year |
| Pipeline Value (Gross) | Growth OS RFQs | Sum of all active RFQ values, unweighted |
| Expected Revenue | Growth OS weighted | Gross Pipeline × stage-appropriate win probability |
| Committed Revenue | Growth OS POs | Active PO values not yet fully invoiced |
| RFQ Value | Growth OS | Total value of all RFQs received (New → Negotiation) |
| Quotation Value | Growth OS | Total value of quotations sent awaiting decision |
| Tender Value (GeM) | Growth OS GeM | Identified + Bid + Awarded tender values |
| Dealer Pipeline | Growth OS Dealer | Known dealer RFQs and active dealer orders |
| Profit Forecast | Growth OS + COGS | Expected Revenue × estimated margin mix |

**Concentration risk flag:** Any single channel >40% of total revenue = fragile. Surfaced prominently in executive view.

---

## Part 8: Agent Consumption of Revenue Capture Data

### Revenue Attribution Engine
- Seals attribution record at Stage 13 (Revenue Recognition)
- Calibrates win probability weights from actual RFQ close rates
- Updates average sales cycle length by buyer type from actual data

### Dealer Intelligence Engine
- Dealer RFQ volume and conversion rate → dealer performance scoring
- Dealer advance payment behavior → Dealer Credit Score
- Marketing-assisted sales flags → true Google Ads revenue influence

### Google Ads Director
**Critical mechanism: GCLID offline conversion upload**
- Every Stage 11 invoice with GCLID in chain → upload to Google Ads API within 24 hours
- Google's Smart Bidding shifts from optimizing for lead form fills to optimizing for revenue-generating buyers
- Industry benchmark: 20–45% lead quality improvement

Bid decisions use Revenue Per Click (RFQ revenue ÷ clicks per keyword) as the primary bidding signal, not cost per lead.

### GeM Intelligence Engine
- Department LTV from historical order data → justifies aggressive bidding for repeat-buyer departments
- L1 price model calibrated from win/loss price data at Stage 4 (Award)
- Department payment timing → DSO by department → margin adjustment for slow payers

### Buyer Intelligence Engine
- Every RFQ updates buyer's intent confirmed status and relationship stage
- Every PO confirms buyer as active purchaser, updates purchase history
- Every negotiation round reveals price sensitivity profile
- Payment behavior from Stage 12 updates Payment Reliability Score

---

## Governance Principle

Every revenue event must enter Growth OS before any action is taken on it.

Not after dispatch. Not at invoicing. Not at collection. Before the next action.

The value of capturing one ₹15L sale correctly is not ₹15L. It is ₹15L plus every future decision that becomes more accurate because this data exists. Over three years, one well-captured deal might influence ₹2–3 crore in revenue decisions through the intelligence it generates.
