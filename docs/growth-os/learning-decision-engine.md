# Learning & Decision Engine — Architecture

> Growth OS 3.0 — Final Architecture Phase  
> Status: Architecture approved  
> No code. No UI. Business architecture only.

---

## The Core Problem

Growth OS begins with calibration assumptions. Every score, every model, every forecast is calibrated on hypotheses:

- "Municipal corporations have a 55% annual procurement probability"
- "PCO accounts have a 45% repeat purchase probability"
- "A Competitor Threat Score above 60 correlates with lost deals"

These are reasonable starting points. They are not the truth about 100X Circle's specific market.

Over the first 12 months, thousands of commercial events will occur: tenders predicted that arrived and tenders that didn't, forecasts accurate and forecasts wrong, recommendations approved that worked and some that didn't, account risk flags that were correct and false positives.

**Without a learning mechanism, none of this evidence improves the system.** The tender prediction accuracy on Month 12 is identical to Month 1. The same calibration errors repeat indefinitely.

The Learning & Decision Engine turns a system with good initial assumptions into a platform with earned, evidence-based knowledge of 100X Circle's specific market.

---

## Part 1: The Prediction Register

Every prediction made by every engine is logged **before the outcome is known.** This is the foundational discipline. A prediction recorded after the outcome is worthless for learning — it introduces hindsight bias that corrupts calibration.

```
PREDICTION OBJECT

prediction_id         (immutable once created)
made_by               (which engine)
made_at               timestamp
prediction_type       (tender / repeat_purchase / payment_timing /
                        churn / forecast / competitor_win / etc.)
subject_id            (buyer / department / account / tender)

PREDICTION
  predicted_value     (probability % / rupee value / date range)
  predicted_range     {min, max}
  confidence_at_time  (engine's stated confidence at time of prediction)
  resolution_window   (when this should resolve: 30 / 90 / 180 days)

INPUT SNAPSHOT
  input_data: [{factor, value, weight_applied}]
  (exact snapshot of data AND weights — frozen at prediction time)

OUTCOME (written when resolution window closes)
  resolved_at
  actual_value
  outcome_type: Correct / Overestimate / Underestimate /
                Failed_to_occur / Occurred_unpredicted

LEARNING SIGNAL
  prediction_error    (actual − predicted, or binary for classification)
  error_magnitude     (normalised size of error)
  error_factors: [{
    factor
    weight_at_prediction_time
    contribution_to_error
  }]
```

The Prediction Register is the foundation of all calibration. No score weight is changed without pointing to the Prediction Register entries that support the change.

---

## Part 2: Score Calibration Framework

Each score has two calibrations:

- **Initial calibration:** hypothesised weights set at launch (based on B2B industrial benchmarks and business knowledge)
- **Evidence calibration:** weights derived from accumulated Prediction Register data

**The calibration process:**

```
Step 1: Accumulate Predictions
  Run the score. Generate predictions. Log everything before outcomes known.

Step 2: Observe Outcomes
  When resolution window closes, record actual outcome.

Step 3: Compute Error Attribution
  For each incorrect prediction:
    Which input factors contributed most to the error?
    Was a factor's weight too high or too low?
    Was the factor present in the data at all?

Step 4: Recalibrate
  Factors that consistently predict correctly → weight maintained or increased
  Factors that consistently predict incorrectly → weight decreased, flagged for review

Step 5: Human Review
  All recalibrations are presented as Improvement Proposals.
  The system recommends new weights; a human approves before any change is applied.
```

### Calibration Schedules Per Engine

```
PROCUREMENT INTELLIGENCE (Tender Probability Score)
  Trigger: Every 30 predictions OR every 90 days
  
  Key question: "Are our tender probability predictions correct?"
  
  Example finding after 6 months:
    Pre-monsoon seasonal factor: weighted +20 points
    Actual prediction accuracy for pre-monsoon tenders: 52%
    Budget Confidence Score > 70: prediction accuracy 71%
    
    Proposal: Reduce pre-monsoon weight to +12
              Increase Budget Confidence weight from 30 to 38 points
    Evidence: 41 predictions, 2.4 standard deviation support

BUYER INTELLIGENCE (Repeat Purchase Probability)
  Trigger: Every 50 predictions OR every 90 days
  
  Example finding after 9 months:
    Municipal Corp base rate set at 55%
    Actual observed rate (Stage 3 buyers): 62%
    Actual observed rate (Stage 2 buyers): 34%
    
    Proposal: Increase Stage 3 base to 60%, decrease Stage 2 to 35%

REVENUE FORECASTING
  Trigger: Monthly (closed periods vs. actuals)
  
  Example finding after 12 months:
    GeM quotation win probability: modeled 35%, actual 27%
    Dealer collection timing: modeled 12 days, actual 17 days
    
    Proposals: Reduce GeM win probability to 27%
               Increase Dealer collection timing to 17 days

COMPETITOR INTELLIGENCE (Threat Score)
  Trigger: Quarterly + after significant competitive event
  
  Calibration signal: Compare Threat Scores at time of competitive loss
                      vs. competitive win. High score should predict loss.
```

---

## Part 3: The Knowledge Base

The Knowledge Base is distinct from the Prediction Register. It is the system's accumulated **institutional understanding** — structured insights confirmed through evidence.

A Prediction Register entry says: "We predicted X, we observed Y, the error was Z."  
A Knowledge Base entry says: "We have confirmed, with 80% confidence, that departments of type A in region B tend to tender within 45 days of event C."

The Knowledge Base is what separates a generic platform from a platform that belongs to 100X Circle.

### Knowledge Base Entry Structure

```
KNOWLEDGE ENTRY OBJECT

knowledge_id
category              (Procurement / Buyer / Competitor / Seasonal /
                        Channel / Pricing / Operational)
subject_type          (buyer_type / department / state / product /
                        competitor / channel)
subject_filter        (e.g., "State Health Departments, North India")

KNOWLEDGE
  statement           (plain language: "X tends to Y when Z")
  confidence          (0–100)
  evidence_count      (how many data points support this)
  first_observed
  last_validated

EXAMPLES:

  "UP State Health Dept tenders for vector control arrive in Q1 (April–June)
   approximately 65% of the time, correlating with NVBDCP budget releases.
   Confidence: 74%. Based on 11 observations."

  "PCOs who submit RFQs for cold foggers in October–November convert at 58%
   vs. 34% annual average. Driver: post-monsoon pest activity surge.
   Confidence: 68%. Based on 17 observations."

  "Competitor X consistently prices 8–14% below 100X Circle on Maharashtra
   municipal tenders. Range held in 9 of 11 known cases.
   Confidence: 82%."

  "Dealers who do not provide attribution data on 3+ consecutive orders
   show 71% chance of declining relationship quality within 6 months.
   Confidence: 65%. Based on 7 observations."

LIFECYCLE
  auto_expires_after    (seasonal patterns: 2 years before re-validation required)
  contradicting_evidence_count
  (contradictions accumulate → confidence decreases → may be deprecated)
```

### Three Pathways to Build the Knowledge Base

**Pathway 1: Automated Pattern Detection**  
When the Prediction Register accumulates consistent errors in the same direction, the Learning Engine proposes a Knowledge Base entry.

**Pathway 2: Human-Entered Insight**  
A sales person knows something the system cannot observe: "The new procurement officer at MCorp Lucknow prefers GeM portal orders over direct quotations." Not all insight is quantifiable — some is operational.

**Pathway 3: Loss Post-Mortem**  
Every significant lost deal triggers a structured post-mortem. The pattern "we consistently lose UP Health tenders to Competitor X at prices 11% below ours" becomes a confirmed Knowledge Base entry after three such losses.

---

## Part 4: Recommendation Quality Engine

Every recommendation has a full lifecycle. The Recommendation Quality Engine tracks that lifecycle and uses it to improve future recommendation quality.

```
RECOMMENDATION LIFECYCLE:
  State 1: Generated       → engine creates recommendation
  State 2: Queued          → enters Approval Queue
  State 3: Reviewed        → human has seen it
  State 4a: Approved → Executed → Outcome tracked
  State 4b: Rejected → Rejection reason captured
  State 4c: Deferred → Revisited later
```

### Tracking Approved Recommendations

```
After resolution window closes:
  actual_impact: ₹ amount or % change (measured)
  measurement_method: how was this measured?

  LEARNING SIGNAL:
  impact_ratio = actual_impact / expected_impact
    > 1.20:  Engine underestimated → recalibrate upward
    0.80–1.20: Well-calibrated — no change
    0.50–0.80: Engine moderately overstated → recalibrate downward
    < 0.50:  Significantly overstated → flag for review
    < 0:     Recommendation backfired → urgent review
```

### Tracking Rejected Recommendations

```
rejection_reason (structured):
  Wrong_timing           (right idea, wrong moment)
  Wrong_magnitude        (right direction, wrong size)
  Wrong_direction        (fundamentally disagree)
  Budget_constraint      (would have approved, no budget)
  Already_decided        (decision made outside system)
  Insufficient_confidence (not enough evidence to act)
  Context_missing        (agent didn't know something critical)

RETROSPECTIVE (optional, filled 60+ days later):
  was_rejection_correct: boolean
  note: (In hindsight, was the agent right? Feeds recommendation quality improvement)
```

### Agent Recommendation ROI Score (per engine)

```
acceptance_rate = approved / (approved + rejected)
avg_impact_ratio = average(actual / expected) for closed approved recommendations

ROI_score = acceptance_rate × avg_impact_ratio × (₹ generated / recommendations made)

WHAT THIS REVEALS:
  High acceptance + high impact ratio     = well-calibrated. Trust it more.
  Low acceptance rate                     = agent recs humans disagree with.
                                            Is the human or agent wrong?
  High acceptance + low impact ratio      = agent overstates impact.
                                            Reduce confidence multipliers.
  Low acceptance + high impact when taken = agent finds edge cases.
                                            Review rejections carefully.
```

### Recommendation Type Calibration (after 6 months, example)

```
Google Ads bid increases:    Acceptance 72%, Impact ratio 1.04 → well-calibrated
Content creation recs:       Acceptance 45%, Impact ratio 0.61 → overstated impact
Competitor defensive action: Acceptance 38%, Impact ratio 1.18 → right but often rejected
Dealer outreach prompts:     Acceptance 82%, Impact ratio 0.93 → well-calibrated, accepted

ACTIONS:
  → Recalibrate content impact estimates downward
  → Increase urgency signaling on competitor defensive recs (they work when taken)
  → Maintain Google Ads and dealer formats (well-calibrated)
```

---

## Part 5: The Loss Intelligence System

Losses are the most valuable learning signals. A won deal confirms what worked. A lost deal reveals what needs to change.

### Loss Classification

```
LOSS TYPE A: PRICE LOSS
  We lost because competitor price was lower
  Sub-types:
    A1: Lost L1 on GeM (competitor was lowest bidder)
    A2: Lost commercial negotiation (buyer chose cheaper quote)
    A3: Lost without seeing competitor price (assumed)
  Learning signal: Competitor price model + margin floor review

LOSS TYPE B: RELATIONSHIP LOSS
  We lost because buyer preferred another supplier relationship
  Sub-types:
    B1: Competitor had existing relationship (first time competing here)
    B2: Competitor had better department contact
    B3: Buyer switched after having relationship with us (churn)
  Learning signal: Account Risk Score calibration + relationship building priority

LOSS TYPE C: SPECIFICATION LOSS
  We lost because our product didn't meet specifications
  Sub-types:
    C1: Technical spec mismatch (our product genuinely didn't qualify)
    C2: Specification written for a competitor (tender rigging — flag)
    C3: Buyer's need evolved beyond our product capability
  Learning signal: Product Intelligence + GeM bid eligibility model

LOSS TYPE D: EXECUTION LOSS
  We lost due to our own operational failure
  Sub-types:
    D1: Late submission  |  D2: Incomplete documentation
    D3: Slow response    |  D4: Miscommunication in quotation
  Learning signal: Operational Excellence tracking (not an intelligence engine problem)

LOSS TYPE E: MARKET LOSS
  The deal didn't materialise
  Sub-types:
    E1: Budget cancelled or frozen
    E2: Buyer postponed indefinitely
    E3: Internal buyer decision reversed
    E4: Inquiry was speculative — never a real purchase intent
  Learning signal: Pipeline qualification model + Buyer Intelligence prospect scoring
```

### Post-Loss Analysis Protocol

For every loss above significance threshold (₹3L+ direct, ₹2L+ GeM): structured prompt enters Approval Queue within 24 hours.

```
POST-LOSS ANALYSIS PROMPT

Deal: [RFQ/Tender ID] — ₹X.XL — [Buyer name]
Lost: [date]

This loss represents ₹X.XL in foregone revenue. 5 minutes of structured
analysis now improves future win rates.

REQUIRED:
  1. Primary loss reason: [A / B / C / D / E]
  2. Secondary reason (if any)
  3. Competitor who won (if known)
  4. Competitor price (if known): ₹
  5. Was this loss avoidable? [Yes / No / Partially]
  6. One-line learning: [what should we do differently?]

OPTIONAL:
  7. Did we lose the relationship or just this deal?
  8. Should we attempt recovery? [Yes / No / In 6 months]

[Submit Analysis]  [Remind me tomorrow]
```

Submitted analysis simultaneously feeds:
- Competitor Intelligence (price data, win patterns)
- Buyer Intelligence (relationship status update)
- Knowledge Base (if pattern is novel)
- Revenue Forecasting (win probability recalibration)
- Operational improvements (for Type D losses)

---

## Part 6: Seasonal Intelligence Engine

Seasonal patterns are not hardcoded. They are discovered from evidence and confirmed before being applied.

### How Seasonal Patterns Are Detected

```
For each combination of {buyer_type, metric, calendar_month}:

EXAMPLE DETECTION: Municipal Corp RFQ Volume by Month

After Year 1:
  Jan: 3   Feb: 2   Mar: 8 ← spike   Apr: 11 ← spike
  May: 6   Jun: 4   Jul: 3           Aug: 3
  Sep: 5   Oct: 4   Nov: 7 ← mild    Dec: 4

After Year 2 confirms or contradicts the Year 1 pattern.

Confirmation threshold: pattern appears in same months in both years
                        with statistical confidence > 70%

ON CONFIRMATION:
  Knowledge Base entry created:
    "Municipal Corp RFQ volume peaks March–April (confidence 74%).
     Secondary peak November. Off-peak July–September."

  Engines updated:
    Procurement Intelligence: seasonal factor applied to Tender Probability Score
    Google Ads Director: bid increase recommendation generated for March–April
    Revenue Forecasting: seasonal index applied to pipeline conversion rates
    Operations: capacity planning for production peaks
```

### Seasonal Intelligence Index

```
For each {buyer_type, metric, month}:
  index_value  (1.0 = average month, 1.4 = 40% above average, 0.7 = 30% below)
  confidence   (0–100)
  data_years   (years of data supporting this index)

Applied by:
  Revenue Forecasting: multiply monthly pipeline estimates by index
  Procurement Intelligence: adjust Tender Probability Score
  Google Ads Director: seasonal bid multiplier recommendations
  Manufacturing: capacity planning
```

---

## Part 7: Anomaly Detection Engine

The Learning Engine establishes what "normal" looks like for 100X Circle's metrics. Deviations trigger investigation before they become problems.

### Normal Range Establishment

```
METRIC: Weekly RFQ intake volume
After 6+ months of data:
  Mean: 12.4 / week  |  Std dev: 3.2  |  Normal range: 8–18

Alert thresholds:
  SPIKE: > mean + 2σ  (>21/week)
    "RFQ volume unusually high. Review lead quality — spikes include speculative inquiries."

  DROP: < mean − 2σ  (<6/week)
    "RFQ volume critically low. Check Google Ads, website, lead form immediately."
```

### Pattern Anomalies (Structural Breaks vs. Noise)

```
STRUCTURAL BREAK: Conversion rate drops > 25% and stays low for 30+ days
  Different from seasonal drop (recovers) or noise
  Alert: "Conversion rate appears structurally lower. Root cause investigation required.
          Possible causes: competitor entered market, pricing uncompetitive, wrong audience."

DEALER CONCENTRATION: One dealer rises from <20% to >35% of dealer revenue in 90 days
  Alert: "[Dealer] represents 38% of dealer channel. Diversification recommended."

GEOGRAPHIC CONCENTRATION: One state exceeds 40% of total revenue
  Alert: "Revenue concentration high. Consider diversification."

SCORE SYSTEMATIC DRIFT: A score's average drifts > 10 points over 60 days without event
  May indicate: data quality degradation or a changed business reality
  Alert: "Average Buyer Quality Score declined from 52 to 41 without obvious cause.
          Formula review recommended."
```

---

## Part 8: Decision Intelligence

The Learning Engine also learns how the human decision-maker makes decisions — not to automate those decisions, but to surface the right information at the right time.

### Decision Pattern Recognition

```
OBSERVED PATTERN: GOOGLE ADS BID INCREASES
  Approved 85% of the time when:
    Confidence score > 75 AND competitive threat signal present
  Approved only 38% when neither condition met

  APPLIED LEARNING:
    Bid increase recommendations now surface confidence data AND
    competitive context in the first paragraph, not buried below reasoning.

OBSERVED PATTERN: GeM BID PREPARATION
  Rejected 44% of the time when production lead time risk is not assessed
  (Human rejects: "We can't produce in time even if we win")

  APPLIED LEARNING:
    All GeM bid recommendations now include mandatory field:
    "Production feasibility: [Confirmed / At risk — X days needed, X days available]"
```

### Context-Aware Recommendation Surfacing

```
CONTEXT: PRE-MONSOON WINDOW (March–May)
  → Prioritise: Procurement predictions for upcoming vector control tenders
  → Prioritise: GeM bid preparation for vector control categories
  → Deprioritise: long-horizon strategic recommendations

CONTEXT: YEAR-END BUDGET FLUSH (January–March)
  → Surface: high-Procurement-Potential departments with no current engagement
  → Google Ads: bid increases for government-intent keywords

CONTEXT: POST-LOSS EVENT (within 72h of losing ₹5L+ deal)
  → Surface: competitive analysis for the lost deal
  → Surface: Buyer Intelligence — relationship status, other open opportunities
  → Surface: Knowledge Base insights about this buyer type

CONTEXT: REVENUE SHORTFALL SIGNAL (MTD tracking < 75% of forecast)
  → Surface: pipeline acceleration opportunities
  → Surface: Collections Intelligence — overdue invoices collectible this month
  → Surface: cross-sell in high-relationship accounts

CONTEXT: COMPETITOR THREAT ESCALATION (Threat Score rises > 15 points)
  → Immediate surface: which accounts are most at risk?
  → Surface: defensive pricing for accounts where competitor is quoting
  → Surface: relationship strengthening in at-risk accounts
```

---

## Part 9: Operating Cadence

### Daily (Automated)

```
Score recalculation for all buyers/departments with new events
Anomaly monitoring: threshold checks, pattern deviation
Prediction Register: flag closed resolution windows
Recommendation Queue: flag stale items (>72h unreviewed)
GCLID upload status check: yesterday's invoices
Zoho Books sync health: reconciliation gap check
```

### Weekly (CEO + Revenue Strategist)

```
LEARNING ENGINE WEEKLY DIGEST:
  → 30-day forecast accuracy (if window closed this week)
  → Recommendation Queue: X approved, Y rejected, Z pending
  → Top intelligence alert of the week
  → One learning insight: "This week the system learned: [specific insight]"
  → Anomaly summary
  → Competitive signals
```

### Monthly (Calibration Review)

```
MONTHLY CALIBRATION REPORT:
  → Forecast accuracy: 30-day and 90-day
  → Score calibration flags: systematic errors detected?
  → Knowledge Base: entries proposed / validated / deprecated
  → Recommendation Quality: engine ROI scores, type calibration analysis
  → Loss Pattern: loss types + pattern comparison to prior months
  → Seasonal: is this month tracking expected patterns?

MONTHLY HUMAN ACTION:
  → Approve or reject calibration proposals
  → Approve or reject Knowledge Base entry proposals
  → Note business context changes (price change, new product, new market)
  → Review 3 most significant rejections: were they right? Update decision patterns.
```

### Quarterly (Architecture Review)

```
QUARTERLY PLATFORM REVIEW:
  → Are all 9 intelligence engines functioning as designed?
  → Prediction accuracy by engine vs. targets
  → Knowledge Base quality: growing, stagnant, or degrading?
  → Recommendation Quality: which engines generate most business value?
  → Data gaps: what information would improve prediction quality?
  → Improvement Proposals pending: which architecture changes are ready?

QUARTERLY CALIBRATION CYCLE:
  → Full recalibration of all score weights
  → Win probability model update (actual vs. modeled win rates)
  → Seasonal index update
  → Competitor model update
```

### Annual (Strategic Audit)

```
ANNUAL PLATFORM AUDIT:
  → Full accuracy audit: every engine's prediction accuracy for the year
  → Business impact: revenue attributable to Growth OS intelligence
  → Architecture evolution: add, modify, or retire engines for Year 2
  → Knowledge Base audit: accurate and being used?

YEAR 1 → YEAR 2 TRANSITION:
  → First full year = first complete seasonal model (confirmed, not hypothesised)
  → Win probability models calibrated on actual data (more accurate than initial)
  → Competitor Intelligence has 12 months of price points and win/loss patterns
  → Buyer Intelligence LTV calculations grounded in real purchase history

  This is when Growth OS stops operating on assumptions
  and starts operating on 100X Circle's institutional knowledge.
```

---

## Part 10: The Self-Improvement Protocol

The platform improves not only its data models but its own operating rules, recommendation formats, and intelligence logic.

### Four Levels of Change

```
LEVEL 1: WEIGHT CALIBRATION (most frequent — monthly)
  What changes: numeric weights in score formulas
  Approval: Revenue Strategist
  Example: "Reduce pre-monsoon seasonal weight from +20 to +12"
  Reversibility: Easy — one parameter, immediately testable

LEVEL 2: THRESHOLD CALIBRATION (quarterly)
  What changes: thresholds triggering alerts, escalations, recommendations
  Approval: Revenue Strategist + CEO review
  Example: "Raise Account Risk Score alert from 60 to 65
            — 60 was generating too many false positives"

LEVEL 3: FACTOR ADDITION OR REMOVAL (annual)
  What changes: input factors used in a score calculation
  Approval: CEO + Architecture Review
  Example: "Add 'active GeM dispute' as negative factor in Dealer Credit Score
            — 3 cases in Year 1 showed this predicted relationship problems"
  Example: "Remove 'employee count range' from Buyer Revenue Potential
            — near-zero predictive power across 60 observations"

LEVEL 4: SCORE ARCHITECTURE CHANGE (annual or less)
  What changes: structure of a score or engine relationship
  Approval: CEO + Architecture Review
  Example: "Split Procurement Potential Score into State-level and Department-level
            — state-level variance was masking department-level signals"
```

### Improvement Proposal Format

```
IMPROVEMENT PROPOSAL OBJECT

category            (Weight / Threshold / Factor / Architecture / Engine)
proposed_by         (Learning Engine / Human / Post-loss analysis)
priority            (High / Medium / Low)

CURRENT STATE:
  what_currently_happens
  evidence_of_problem: [{data_point, observation, Prediction Register refs}]

PROPOSED CHANGE:
  what_should_change
  proposed_new_value_or_logic

EXPECTED IMPACT:
  prediction_accuracy_improvement (estimated %)
  business_impact (what better decisions does this enable?)

EVIDENCE:
  supporting_data_points: number
  observation_period
  confidence_in_proposal: (0–100)

RISK:
  what_if_wrong: text
  reversibility: Easy / Moderate / Difficult

APPROVAL:
  status: Pending / Approved / Rejected
  reviewed_at / notes
```

---

## Complete Learning Architecture — Map

```
═══════════════════════════════════════════════════════════════════════
         LEARNING & DECISION ENGINE — COMPLETE ARCHITECTURE
═══════════════════════════════════════════════════════════════════════

INPUT LAYER
  ├── Prediction Register     every prediction logged before outcome known
  ├── Outcome Register        actual outcomes as resolution windows close
  ├── Recommendation Lifecycle approval decisions + impact measurement
  ├── Loss Post-Mortems       structured analysis of every significant loss
  ├── Human Notes             institutional knowledge data cannot observe
  └── External Signals        market changes, competitive events, policy shifts

PROCESSING LAYER
  ├── Error Attribution       which factors drove prediction errors?
  ├── Pattern Detection       what consistent patterns emerge from data?
  ├── Anomaly Detection       what deviates from established norms?
  ├── Seasonal Intelligence   what rhythms does 100X Circle follow?
  ├── Recommendation Quality  which recommendations generate actual value?
  ├── Decision Pattern        what information makes human decisions confident?
  └── Loss Analysis           what patterns do losses reveal?

OUTPUT LAYER
  ├── Calibration Proposals   "change these score weights — here is the evidence"
  ├── Knowledge Base Entries  "this pattern confirmed at this confidence level"
  ├── Improvement Proposals   "change this threshold / factor / architecture"
  ├── Context Surfacing       "show this information at this specific moment"
  ├── Anomaly Alerts          "this metric is behaving abnormally"
  └── Platform Evolution      "build these capabilities next — gap analysis"

GOVERNANCE
  ├── Weight calibration      Revenue Strategist approval
  ├── Threshold calibration   Revenue Strategist + CEO review
  ├── Factor changes          CEO + Architecture Review
  └── Engine additions        CEO decision in Annual Strategic Review

  ALL CHANGES: logged with reasoning, approved-by, date, outcome tracking
```

---

## The Platform's North Star

Growth OS begins with calibration assumptions. It matures into institutional knowledge.

On Day 1: "municipal corporations have a 55% annual procurement probability."

On Month 18: "UP State Health Departments tender in April–June 68% of the time, conditioned on NVBDCP budget release which has historically preceded tenders by 35–50 days. Confidence 74% from 11 observations."

That is the difference between a generic platform and a platform that belongs to one company.

The Learning Engine is the mechanism by which Growth OS earns that specificity — from every won deal, every lost deal, every correct prediction, every forecast error, every approved recommendation, every rejected one. Each event teaches the system something. The system makes better predictions. Better predictions generate better decisions. Better decisions generate more revenue.

This is the compounding return on a Revenue Intelligence Platform that a competitor cannot buy — because it takes 24 months of 100X Circle's specific commercial history to build. By the time a competitor begins, they are 24 months behind.
