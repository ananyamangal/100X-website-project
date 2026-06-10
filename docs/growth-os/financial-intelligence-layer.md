# Financial Intelligence Layer — Zoho Books Integration

> ⚠️ DEFERRED TO V2 (course correction 2026-06-10). Preserved, not deleted.
> Zoho Books / financial truth layer is out of scope for V1. See `demand-intelligence-acquisition-os.md`.
>
> Growth OS 3.0 — Financial Intelligence  
> Status: Architecture approved  
> Accounting system: Zoho Books (not Tally)  
> No code. No UI. Business architecture only.

---

## Fundamental Design Principle

Growth OS is NOT an accounting system. Zoho Books remains the financial source of truth. Growth OS remains the intelligence source of truth.

```
ZOHO BOOKS — FINANCIAL SOURCE OF TRUTH
  Owns: Every rupee of financial transaction
  Controls: Invoices, payments, GST, credit notes, customer balances
  Answers: "What did we actually earn and collect?"
  Governed by: GST Act, accounting standards, statutory requirements
  Modified by: Finance team only

GROWTH OS — INTELLIGENCE SOURCE OF TRUTH
  Owns: Every revenue insight derived from financial data
  Controls: Attribution, forecasting, scoring, behavior analysis
  Answers: "Why did we earn it, what will we earn next, who will pay us?"
  Governed by: Commercial intelligence requirements

THE BOUNDARY: THE INVOICE
  Before invoice → Growth OS is primary (pipeline, RFQ, PO)
  At invoice     → Zoho Books becomes primary
  After invoice  → Zoho Books owns the transaction
                 → Growth OS reads and analyzes it

Growth OS never creates, modifies, or cancels invoices.
Zoho Books never calculates attribution, scores buyers, or forecasts pipeline.
```

---

## Part 1: Data Sync Specification

Data flows strictly one-directionally: **Zoho Books → Growth OS**.

The only exception: Growth OS may push custom field values (RFQ number, channel tag, tender reference) into Zoho Books invoices to enable linkage — but never creates or modifies financial records.

---

### Data Object 1: Customer Record Sync

**Fields synced FROM Zoho Books TO Growth OS:**

| Field | Type | Purpose |
|---|---|---|
| zoho_contact_id | string | **Primary linkage key** |
| display_name | string | Customer name in financial records |
| company_name | string | |
| gstin | string | Critical for GeM matching |
| billing_state | string | Feeds Territory Intelligence |
| billing_city | string | |
| outstanding_receivable | number | Total unpaid across all invoices |
| overdue_amount | number | Amount past due date |
| payment_terms | string | "Net 30", "50% advance" etc. |
| credit_limit | number | If configured in Zoho Books |

**Fields that exist ONLY in Growth OS (never synced from Zoho Books):**
- buyer_type, relationship_stage, buyer_quality_score, revenue_potential_score, strategic_value_score, attribution_channel

**Matching logic:**
1. Primary: zoho_contact_id stored on Growth OS buyer profile
2. Secondary: GSTIN (if zoho_contact_id not yet linked)
3. Tertiary: company_name + state (fuzzy — requires human confirmation)

Unmatched Zoho Books customers = revenue that bypassed Growth OS pipeline → reconciliation gap.

---

### Data Object 2: Invoice Record Sync

The central sync object. Every intelligence derivation downstream depends on accurate, timely invoice data.

**Fields synced FROM Zoho Books TO Growth OS:**

```
zoho_invoice_id, invoice_number, invoice_date, due_date
customer_zoho_id, customer_name, customer_gstin, billing_state
line_items: [{item_name, quantity, unit_price, amount, hsn_code}]
subtotal, cgst_amount, sgst_amount, igst_amount, total_gst, total_amount
status (draft|sent|overdue|paid|partially_paid|voided)
amount_paid, balance_due
payment_terms_label

custom_fields:
  growth_os_rfq_id    ← THE BRIDGE — links invoice to Growth OS pipeline
  attribution_channel ← "Google Ads" / "GeM" / "Dealer" / etc.
  gem_tender_id       ← if GeM invoice
  dealer_id           ← if dealer channel
```

**The Linkage Mechanism:**  
When Growth OS logs a PO (Stage 7), it records expected invoice reference fields. When the finance team creates the invoice in Zoho Books, they populate the growth_os_rfq_id custom field.

**Finance team protocol: Every invoice must have growth_os_rfq_id populated.**  
If no RFQ exists: revenue bypassed Growth OS → flagged as reconciliation gap.

---

### Data Object 3: Payment Record Sync

**Fields synced FROM Zoho Books TO Growth OS:**

```
zoho_payment_id, payment_date, payment_mode (NEFT|RTGS|UPI|Cheque|Cash|GeM Portal)
reference_number (UTR / cheque / GeM payment ref)
amount_received
applied_to: [{zoho_invoice_id, invoice_number, amount_applied}]
customer_zoho_id
```

**Critical derived field (calculated by Growth OS on sync):**

```
collection_delay_days = payment_date - invoice.due_date
  Positive = days late (overdue collection)
  Negative = days early (prepaid)
  Zero = paid exactly on due date
```

This single field powers the entire Collections Intelligence layer.

**GeM-specific:** GeM payments arrive via GeM portal with a specific reference. Enables department-level payment timing analysis against the 10 working day legal mandate.

---

### Data Object 4: Credit Note Sync

**Fields synced FROM Zoho Books TO Growth OS:**

```
zoho_credit_note_id, credit_note_number, credit_note_date
customer_zoho_id, linked_invoice_id
reason (Return|Price Adjustment|Short Delivery|Damaged Goods|Dispute Settled|Other)
reason_notes, amount, gst_amount, total_credit_amount
```

**Intelligence impact:**

- **Revenue Attribution:** Effective attributed revenue = Invoice value - Credit notes applied
- **Google Ads GCLID upload:** If already uploaded, send a correction upload (Google Ads API supports negative conversion adjustments)
- **Buyer profile:** Frequent credit notes = quality issue flag; reduces strategic value score
- **Product quality signal:** Credit notes concentrated on one SKU → Manufacturing Intelligence flag

---

### Data Object 5: Receivable Ageing Sync

Synced nightly from Zoho Books ageing report.

```
Per customer:
  total_outstanding
  ageing_buckets:
    current       (not yet due)
    overdue_1_30  (1–30 days overdue)
    overdue_31_60 (31–60 days overdue)
    overdue_61_90 (61–90 days overdue)
    overdue_90_plus (> 90 days overdue)
  oldest_due_date
```

**Derived: Customer Overdue Risk Category**

| Level | Condition |
|---|---|
| 0 — Clear | Zero overdue |
| 1 — Minor | 1–30 days, amount < ₹50K |
| 2 — Moderate | 31–60 days, OR any amount > ₹50K |
| 3 — High | 61–90 days, OR total overdue > ₹2L |
| 4 — Critical | 90+ days, OR total overdue > ₹5L |

**Agent impact:** Level 2+ reduces Buyer Quality Score; Level 3+ credit freeze flag on dealers; Level 3+ discounted from collection forecast.

---

## Part 2: Revenue Reconciliation Model

### Gap Type 1: RFQ-Won Without Invoice

```
Detection: All Growth OS RFQs in status {PO Received / In Production / 
Dispatched / Partially Collected} with no Zoho Books invoice linked
via growth_os_rfq_id.

Flag threshold: > 7 days since "Dispatched" status without invoice.

Cases:
  A: Finance has not yet created the invoice (process lag)
     → Alert to finance: "Invoice not raised for RFQ 100X-2026-000847, 
       Lucknow DHO ₹8.4L — dispatched 5 days ago"
  B: Invoice created without custom field populated → manual matching
  C: Sale invoiced via different route → revenue capture gap

Severity: High — unmatched won RFQs escape attribution.
```

### Gap Type 2: Invoice Without RFQ

```
Detection: All Zoho Books invoices (sent/overdue/paid/partially_paid)
where growth_os_rfq_id is null, empty, or does not match any Growth OS RFQ.

Cases:
  A: Revenue that bypassed Growth OS entirely
     → Sale made without RFQ → zero attribution, zero intelligence extracted
     → Google Ads GCLID upload never triggered
  B: Finance created invoice without populating custom field
     → RFQ exists; needs retroactive linking
  C: Old invoice before Growth OS implementation
     → Expected during initial period; should diminish to zero

Severity: Critical — unattributed revenue leaks intelligence permanently.

Measurement targets:
  Implementation (Month 0): 10–20% of invoices may have this gap
  Month 6 target:  < 5%
  Month 12 target: < 1%
```

### Gap Type 3: Value Mismatch

```
Detection: Matched RFQ ↔ Invoice pairs where:
|Invoice Value - Growth OS PO Value| / Growth OS PO Value > 5%

Cases:
  A: Price renegotiated post-PO without updating Growth OS
     → Update Growth OS PO value to match invoice
  B: Partial delivery invoiced first (multiple invoices for one RFQ)
     → Mark RFQ as "Partially Invoiced"; match multiple invoices to one RFQ
  C: Additional charges post-PO (freight, installation, training)
     → Invoice > PO value; capture as additional charges in Growth OS
  D: Credit note reduces effective value
     → Always use net-of-credit-notes as effective revenue

Attribution principle: Attribution uses effective collected amount.
If ₹12L deal → ₹10L invoice → ₹1L credit note: attributed revenue = ₹9L
```

### Reconciliation Health Score (Monthly)

| Metric | Definition | Target |
|---|---|---|
| Invoice Coverage | Invoices with valid growth_os_rfq_id / total invoices | >95% |
| Won RFQ Coverage | Won RFQs with matched invoice / total won RFQs | >98% |
| Value Accuracy | Matched pairs within 5% tolerance / total matched | >92% |
| Lag Time | Avg days: "Dispatched" status → invoice creation in Zoho Books | <3 days |

Composite score: Green >90 / Yellow 75–90 / Red <75.

---

## Part 3: Collections Intelligence

### Overdue Invoice Tracking

| Classification | Days Overdue | Action |
|---|---|---|
| Current | Due date > today | Monitor |
| Due Today | Due date = today | Reminder should be sent |
| Grace Period | 1–7 days | Watch; no formal action |
| First Overdue | 8–30 days | Alert to Revenue Strategist; minor buyer flag |
| Second Overdue | 31–60 days | Escalation; CEO alert; advance % increases for future orders |
| Serious Overdue | 61–90 days | High-priority; reclassify to "At-Risk Receivable"; remove from 30/90-day forecast |
| Critical Overdue | >90 days | CFO flag; "Doubtful Receivable"; all forecasts exclude |

### Average Collection Period (DSO) Analysis

**Calculated at four levels:**

**Portfolio DSO** — overall average collection delay. Target: <35 days.

**Channel DSO:**
- GeM: Target <20 working days (legal mandate 10; alert at >25)
- Direct Private: Target <30 days (alert >45)
- Municipal Corporations: Target <45 days (alert >75)
- Dealers: Target <21 days (alert >30)
- Export: Target <15 days post-LC maturity

**State-level DSO (government invoices):**
Track by state — slow-paying states require higher margin buffers in bid calculations.

**Individual Buyer DSO:**
Most predictive input for future advance % requirements and cash flow timing.

**Trend tracking:** Rising DSO trend = early warning system. DSO increase from 28 to 41 days over 3 months = cash flow pressure → Revenue Strategist intervention required.

---

### Collection Risk Score (0–100)

Probability that a specific outstanding invoice will require active intervention.

| Factor | Weight | Range |
|---|---|---|
| Days Overdue | 0–30 pts | Current=0, 8–14 days=8, 31–60=22, >90=30 |
| Buyer Payment History | 0–25 pts | Payment Reliability 90–100=0, <30=25 |
| Invoice Size | 0–15 pts | <₹1L=2, >₹15L=15 |
| Buyer Type Risk Profile | 0–20 pts | GeM=2, Municipal=12, New Dealer=15 |
| Dispute Signal | 0–10 pts | Active dispute=10, resolved=0 |

**Thresholds:**
- 0–20: Low Risk — normal collection expected
- 21–45: Moderate — monitor; send payment reminder
- 46–65: High Risk — proactive intervention required
- 66–80: Very High — escalate to senior management
- 81–100: Critical — legal / third-party collection consideration

---

### Payment Reliability Score (0–100)

Persistent buyer-level score tracking historical payment pattern. Lower = higher advance % required.

```
Base: 60 points (new customer starting point)

Per payment event:
  Paid within terms:          +4 points
  Paid 7+ days early:         +6 points
  Paid 1–7 days late:         -3 points
  Paid 8–30 days late:        -8 points
  Paid 31–60 days late:       -15 points
  Paid >60 days late:         -20 points
  Required legal action:      -30 points (permanent)

Capped: 0 (minimum) to 100 (maximum)
Decays toward 60 over 24 months of inactivity
```

**Score implications:**

| Score | Advance Policy |
|---|---|
| 90–100 | No advance required; eligible for extended credit |
| 70–89 | Standard advance per product terms |
| 50–69 | Require 30–50% advance on large orders |
| 30–49 | Require 50–70% advance; senior approval for credit |
| <30 | Full advance required (100% before production) |

---

### Customer Credit Score (0–100)

Composite: Financial Reliability (50%) + Relationship Depth (20%) + Purchase History (15%) + Organisation Type (15%).

**Organisation Type component:**
- Central Government / PSU: 15 pts (sovereign — near-zero default risk)
- State Government: 13 pts
- Municipal Corporation: 10 pts (slow but reliable)
- Private Listed: 11 pts
- Private Unlisted: 8 pts
- Registered Dealer: 9 pts
- PCO: 7 pts

**Usage:** Score >80 = full credit / 65–79 = standard / 50–64 = limited / 35–49 = restricted / <35 = no credit.

---

### Dealer Credit Score (0–100)

| Component | Weight | Key signals |
|---|---|---|
| Payment Reliability to 100X Circle | 35% | Based on Payment Reliability Score |
| Volume and Consistency | 25% | Growing=25, Stable=18, Declining=6 |
| Advance Payment Behavior | 20% | Always pays advance as agreed=20 |
| Attribution Cooperation | 10% | >80% orders with end-buyer data=10 |
| Dispute History | 10% | No disputes in 12 months=10 |

**Usage:** Score >80 = preferred dealer / 65–79 = standard / 50–64 = watch list / 35–49 = cash/advance only / <35 = review for continuation.

---

## Part 4: Executive Dashboard Metrics

### Revenue Metrics (from Zoho Books collections)

| Metric | Definition |
|---|---|
| Revenue Today | Cash received today (ex-GST, net of credit notes applied today) |
| Revenue MTD | All cash received from 1st of month (Indian FY: Apr–Mar) |
| Revenue YTD | All cash received since April 1 this fiscal year, net of credit notes |
| Invoiced Revenue — Pending Collection | Total outstanding balance on all unpaid invoices |

### Collections Metrics

| Metric | Definition |
|---|---|
| Total Outstanding Receivables | All unpaid invoice balances, all customers |
| Overdue Receivables | Amount past due date, broken by ageing bucket |
| Dealer Outstanding | Total outstanding owed by all dealers |
| Government Outstanding | Total outstanding from government buyers, broken by type |
| Average Collection Period (DSO) | Avg days between invoice due date and actual payment |

### Forecasting Metrics (Growth OS + Zoho Books patterns)

| Metric | Definition |
|---|---|
| Expected Cash Flow — 30 days | A: Invoiced due ×reliability factor + B: Near-term new invoices + C: Overdue ×collection probability |
| Collection Forecast — 90 days | Extended to 90-day window with monthly buckets |
| Profit Forecast — 90 days | Expected Revenue × margin mix, less credit note provision, less bad debt provision |

### Pipeline Metrics (from Growth OS)

Pipeline Value (Gross) / Expected Revenue (Weighted) / Committed Revenue / GeM Tender Pipeline / Dealer Pipeline

---

### Executive Financial Brief Format

```
EXECUTIVE FINANCIAL BRIEF — [DATE]

REVENUE STATUS
  Collected Today:          ₹X.XL      (7-day avg: ₹Y.YL/day)
  Collected MTD:            ₹X.XL      (₹Y.YL target → Z% achieved)
  Collected YTD:            ₹X.XL      (₹Y.YL target → Z% achieved)

RECEIVABLES
  Total Outstanding:        ₹X.XL      
  Overdue (any bucket):     ₹X.XL      ← flag if > 15% of outstanding
  90+ Days Overdue:         ₹X.XL      ← flag if > 0

CHANNEL OUTSTANDING
  Dealer Outstanding:       ₹X.XL      (X invoices, avg DSO: Y days)
  Government Outstanding:   ₹X.XL      (X invoices, avg DSO: Y days)
  GeM Outstanding:          ₹X.XL      (X invoices, avg: Y working days)

PIPELINE
  Gross Pipeline:           ₹X.XL      (X active RFQs)
  Expected Revenue (90d):   ₹X.XL      (weighted)
  Committed (POs):          ₹X.XL

FORECAST
  Cash Flow — 30 days:      ₹X.XL ± ₹Y.YL
  Cash Flow — 90 days:      ₹X.XL ± ₹Y.YL
  Profit Forecast — 90 days: ₹X.XL (Z% margin)

ALERTS (only shown if issues exist)
  [⚠]  3 invoices overdue > 60 days: ₹X.XL — intervention required
  [⚠]  Dealer: Rajesh Distributors — outstanding ₹X.XL, 45 days overdue
  [⚠]  GeM invoice INV-2026-00214 — 22 working days unpaid (mandate breach)
  [⚠]  4 Zoho Books invoices without Growth OS RFQ links
```

---

## Part 5: Agent Consumption of Zoho Books Data

### Revenue Attribution Engine

**What it needs from Zoho Books:**
1. Invoice value (actual revenue to attribute — not RFQ estimate)
2. Invoice date (conversion timestamp for Google Ads GCLID upload)
3. Payment received amount (final collected revenue to attribute)
4. Credit note data (reduces effective attributed revenue)

**Daily reconciliation loop:**
- Identify Growth OS RFQs in "Won" status with linked Zoho invoices
- For new payments: find GCLID from attribution chain → trigger Google Ads upload
- For credit notes: update attribution record → send Google Ads correction upload

**Google Ads upload:** Use invoice_taxable_value (ex-GST) as conversion_value and invoice_date as conversion_time. If credit note follows: send negative adjustment upload.

---

### Dealer Intelligence Engine

**What it needs from Zoho Books:**
1. Invoice payment behavior per dealer — raw input for Dealer Credit Score and Payment Reliability Score
2. Dealer outstanding balance — credit exposure monitoring
3. Dealer invoice volume trend — revenue performance vs. pipeline prediction
4. Payment mode analysis — cash payments for large amounts flagged for compliance

**Insight example:**
```
Rajesh Distributors (UP) — trailing 12 months:
  Total invoiced: ₹34.2L | Collected: ₹32.8L
  Average payment delay: 8 days (within terms)
  Payment Reliability Score: 84 — Good

  Last 3 invoices: delay increasing (0 → 4 → 11 days)
  Trend alert: DSO rising for this dealer
  Recommendation: Contact dealer before it reaches 30+ days
```

---

### GeM Intelligence Engine

**What it needs from Zoho Books:**
1. GeM invoice payment timing (invoice accepted on portal → payment received)
   - Legal mandate: 10 working days
   - Alert threshold: >25 working days
2. Department lifetime revenue (historical invoice data by department)
3. GeM vs. Direct Revenue split per government customer (from custom field tagging)
4. Invoice vs. tender value reconciliation (Tender Fulfillment Rate — target >95%)

**Department scoring:**
```
Ministry of Health, UP — last 5 invoices:
  Average payment: 8.2 working days (excellent)
  
Gorakhpur Municipal Corp — last 3 invoices:
  Average payment: 34 working days (over mandate)
  → Apply margin premium in next bid to compensate for time cost of capital
```

---

### Revenue Forecasting

**What it needs from Zoho Books:**
1. Actual collected revenue — benchmark for calibrating forecast accuracy
2. Collection timing patterns by buyer type — statistical distribution of payment delays
3. Overdue inventory probability-weighted into cash flow forecast
4. Seasonal GST payment impact (15th–25th of month: private buyers sometimes delay)

**Calibration loop:**
```
30-day forecast made 2026-03-01: ₹18.4L
Actual collected (Zoho Books):   ₹16.2L
Forecast error: -12%

Root cause: 2 municipal corp invoices (₹2.4L) paid April 2 instead of March
(timing difference — not a loss)

Model adjustment:
  Municipal corp DSO: 35 days → 44 days (observed in last 6 months)
  Impact: Municipal invoices allocated to later collection window in future forecasts
```

---

## Integration Governance Model

### Daily Sync Protocol (automated)

**Morning (07:00):**
- Pull from Zoho Books: all payments received yesterday
- Pull: invoice status changes (new overdue, new paid)
- Pull: any new invoices created yesterday
- Growth OS processes: update collection status, recalculate risk scores, trigger GCLID uploads, update payment reliability scores, refresh overdue inventory, update executive dashboard

**Evening (18:00):**
- Run reconciliation gap detection: won RFQs without invoices (>7 days post-dispatch) + invoices without RFQ links + value mismatches >5%
- Generate reconciliation gap list for finance team morning review

### Weekly Review (Monday 09:00)
Finance team + Revenue Strategist: gap list from the week, new overdue accounts, dealer credit changes, GeM payment violations, forecast accuracy.

### Monthly Review (First working day)
CFO + Revenue Strategist + CEO: full reconciliation report, DSO trend analysis by channel, credit score updates, forecast accuracy for prior month, 90-day collection forecast, probability weight adjustments.

### Custom Field Discipline (non-negotiable)

The entire integration depends on one discipline: **every invoice created in Zoho Books must have the growth_os_rfq_id custom field populated.**

Implementation path:
1. Finance team trained to always enter RFQ number when creating invoices
2. Zoho Books custom view shows invoices missing this field
3. Daily reconciliation report from Growth OS shows same gaps
4. Target: 100% custom field population within 60 days of launch

---

## The Architecture Principle

Zoho Books knows that Invoice INV-2026-00284 was paid by Lucknow Municipal Corporation on April 18 for ₹8.4L.

Growth OS knows that:
- This payment came from a buyer who first clicked a Google Ad 47 days earlier
- The buyer is in Relationship Stage 3 → moving to Stage 4
- Municipal corporations in UP average ₹7.2L per order every 22 months
- The contributing keyword's Revenue Per Click updated from ₹6,200 to ₹6,850
- Google's Smart Bidding algorithm is about to receive the GCLID + ₹8.4L signal
- The UP territory's Revenue from Municipal Corp channel increased to ₹22.6L this fiscal year

That gap — between what Zoho Books records and what Growth OS understands — is the value of the intelligence layer.

**Zoho Books records the transaction. Growth OS extracts the meaning.**
