# Demand Intelligence & Acquisition OS — Master Architecture

> Growth OS 4.0 — Course-Corrected Architecture
> Status: Architecture approved · Supersedes the Growth OS 3.0 sequencing
> Architecture decisions: Claude Opus · Implementation: Claude Sonnet
> No code in this document. Business + system architecture only.

---

## 0. What This System Is

An **autonomous Demand Intelligence & Acquisition OS** — a virtual growth team for 100X Circle. It exists to do exactly ten things:

1. Find buyers · 2. Find dealers · 3. Find GeM resellers · 4. Find procurement opportunities · 5. Find search demand · 6. Find AI demand · 7. Generate campaigns · 8. Generate content · 9. Generate enquiries · 10. Improve ROAS.

**The build filter:** if a feature does not directly improve buyer acquisition, lead generation, campaign performance, dealer acquisition, procurement discovery, AI visibility, or ROAS — it does not get built.

The system continuously **observes → learns → recommends → creates → optimizes**, while **humans retain approval over all spending and publishing**.

---

## 1. Course Correction (2026-06-10)

### Frozen — moved to future roadmap, preserved, not deleted

| Deferred capability | Document | Action taken |
|---|---|---|
| Revenue Attribution Engine | `revenue-attribution-engine.md` | Banner → DEFERRED |
| Revenue Capture (13-stage lifecycle) | `revenue-capture-architecture.md` | Banner → DEFERRED |
| Financial Intelligence / Zoho Books | `financial-intelligence-layer.md` | Banner → DEFERRED |
| Offline conversion uploads (GCLID→invoice) | Part 6 + Attribution docs | Deferred to V2 ROAS |
| Revenue Forecasting / ERP reporting / CRM workflows | `strategic-intelligence-layer.md` Part 5 | Deferred |

**Why deferred, not deleted:** the financial truth layer is the *correct V2*, but it depends on invoice/Zoho data that does not yet exist in the system. Building it first optimizes for a feedback signal we cannot yet measure. We move to enquiry-based ROAS now and re-activate financial attribution later.

### Retained from 3.0 (re-sequenced into the layers below)

- **Procurement / GeM Intelligence** — already operational (`/admin/growth`, 16,011 contracts).
- **Google Ads Director** business logic — Part 6 of `strategic-intelligence-layer.md` stands.
- **AI Search Intelligence**, **Buyer/Intent**, **Local Presence**, **Approval Governance** — folded into Layers 3, 4, 5, and the Governance section.

---

## 2. System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    ADMIN EXPERIENCE  (/admin/growth)                        │
│   "What should we act on this week?" — keywords · campaigns · dealers ·     │
│    tenders · AI queries · pages · opportunities                             │
└───────────────▲──────────────────────────────────────────▲────────────────┘
                │ recommendations / drafts                  │ approve · reject · modify
┌───────────────┴──────────────────────────────────────────┴────────────────┐
│                    GOVERNANCE GATE  (no auto-spend · no auto-publish)        │
│        Every executing action passes a human approval checkpoint            │
└───────────────▲────────────────────────────────────────────────────────────┘
                │ proposes
┌───────────────┴────────────────────────────────────────────────────────────┐
│  AUTONOMOUS AGENTS   observe → log → recommend → learn  (every run audited)  │
│  Search · AI-Visibility · Dealer · GeM · Tender · Ads-Director ·            │
│  Content-Factory · Marketplace · Intent-Scoring · Communication             │
└───────────────▲──────────────────────────────────────────▲─────────────────┘
                │ read intelligence                         │ write outputs
┌───────────────┴──────────────────────────────────────────┴─────────────────┐
│  INTELLIGENCE LAYERS                                                         │
│   L9 ROAS ENGINE          spend → clicks → calls → WhatsApp → RFQ (V1)       │
│   L8 COMMUNICATION        WhatsApp · calls · RFQ · forms · brochure = conv.  │
│   L7 MARKETPLACE          GeM · IndiaMART · Justdial movement                │
│   L6 CONTENT FACTORY      demand-mapped pages / ad copy / GEO / scripts      │
│   L5 GOOGLE ADS DIRECTOR  read-only → campaign factory → optimization        │
│   L4 AI SEARCH INTEL      citation / authority / GEO visibility              │
│   L3 BUYER INTENT         every lead → Intent Score 1–10 + category          │
│   L2 DEALER INTEL ★       match · cluster · score · geo opportunity          │
└───────────────▲──────────────────────────────────────────▲─────────────────┘
                │ signals                                   │
┌───────────────┴──────────────────────────────────────────┴─────────────────┐
│  L1 DEMAND SIGNAL ENGINE                                                     │
│   Google (GSC · Ads · GBP) · AI Search (GPT/Claude/Gemini/Perplexity/AIO) · │
│   Marketplaces (GeM · IndiaMART · Justdial) · Procurement (tenders) ·       │
│   Website (visits · RFQ · brochure · calls · WhatsApp)                       │
└──────────────────────────────────────────────────────────────────────────┘
   ★ Dealer Intelligence = highest business priority
```

**Flow:** raw signals enter L1 → enriched into intelligence across L2–L9 → agents read intelligence and emit recommendations/drafts → governance gate requires human approval → approved actions execute → outcomes flow back into L9/L8 and the agents' learning loop.

---

## 3. The Nine Layers

### L1 — Demand Signal Engine
**Job:** ingest every demand signal into one normalized store. **Output:** demand opportunities answering *what demand is rising/falling, which buyers are appearing, which opportunities are emerging.*

| Source group | Members | Existing asset |
|---|---|---|
| Google | Search Console, Google Ads, Google Business Profile | GSC OAuth built — config-blocked at consent screen |
| AI Search | ChatGPT, Claude, Gemini, Perplexity, Copilot, Google AI Overviews | none yet |
| Marketplaces | GeM, IndiaMART, Justdial | GeM harvester live (16,011 contracts) |
| Procurement | Tender portals, govt procurement | GeM contracts collector |
| Website | visits, RFQ, brochure downloads, calls, WhatsApp clicks | RFQ/WhatsApp components live |

Canonical object: **DemandSignal** `{signal_id, source, captured_at, query/keyword, geo, product_hint, raw_payload, normalized_intent}`.

### L2 — Dealer Intelligence Engine ★ (highest priority)
**Job:** convert the existing GeM dealer corpus into a ranked acquisition pipeline.
**Existing assets:** `gem_dealers` (1,437 canonical) · `gem_contracts` (seller drill-down) · `DEALER-LEAD-REPORT` (3,815 leads w/ phone·email·GSTIN) · `/admin/growth` Target Lists tab.
**Capabilities:** dealer matching, clustering, scoring, geographic opportunity detection.
**Outputs:** top dealer opportunities · acquisition heatmaps · state-wise opportunities · weekly dealer report.
Canonical object: **Dealer** `{dealer_id, name, gstin, state/district, products, gem_activity, contact, dealer_score, cluster, status}`.

### L3 — Buyer Intent Engine
**Job:** classify every lead. **Output:** Intent Score 1–10 + category ∈ {GeM reseller, dealer, OEM-authorization seeker, government buyer, municipal buyer, pest-control operator, agricultural buyer, distributor, unknown}.
**Inputs:** search query · ad keyword · AI query · landing page · session behaviour · WhatsApp/call click · RFQ · dealer-DB match · GeM-DB match.
**Rule:** no lead is left unclassified.
Canonical object: **Lead** `{lead_id, captured_at, channel, signals[], intent_score, category, matched_dealer_id?, matched_gem_id?, state, product_interest}`.

### L4 — AI Search Intelligence
**Job:** monitor brand visibility across GPT, Claude, Gemini, Perplexity, Google AI Overviews. **Track:** is 100X cited · which competitors cited · which pages cited · which queries trigger citations. **Output:** GEO opportunity reports · citation gap · authority gap · AI Visibility Score + auto-generated recommendations.

### L5 — Google Ads Director (highest implementation priority after Search Console)
Three-phase capability, governed at every phase:
- **Phase 1 — Read-only intelligence:** monitor campaigns/keywords/search-terms/CPC/CTR/calls/WhatsApp/RFQ → suggest negatives, new keywords, ad copy, budget, campaigns.
- **Phase 2 — Campaign Factory:** generate full campaign structures (ad groups, keywords, headlines, descriptions, LP recommendations) → create **draft** campaigns via Google Ads API → notify admin → admin approves. Never auto-publishes.
- **Phase 3 — Optimization Engine:** monitor proxies (calls/WhatsApp/RFQ/search-terms) → recommend bids, budgets, keyword add/exclude, ad tests. Approval required.
Business logic detail: `strategic-intelligence-layer.md` Part 6 (retained).

### L6 — Content Factory
A **demand generation engine**, not a blog writer. Generates landing/dealer/procurement/GeM/comparison/FAQ/knowledge/GEO pages, ad copy, video scripts, image concepts, sales collateral. **Constraint:** every asset maps to a demand signal from L1/L4/L7. No vanity content, no content without demand evidence.

### L7 — Marketplace Intelligence
Monitor GeM, IndiaMART, Justdial for new dealers, new suppliers, competitor movement, geographic & product opportunities → marketplace opportunity reports.

### L8 — Communication Intelligence
Track WhatsApp clicks · calls · RFQs · contact forms · brochure downloads — treated as **primary conversion events**. The system does **not** wait for invoice attribution.

### L9 — ROAS Engine (V1)
`spend → clicks → calls → WhatsApp → RFQ`. Enquiry generation is the success metric. Complex revenue attribution is explicitly out of scope for V1 (see deferred docs).

---

## 4. The Ten Autonomous Agents

Every agent obeys one contract: **Observe → Log → Recommend → Learn**, and **every action is auditable**.

| # | Agent | Reads | Writes (recommendations) | Governance |
|---|---|---|---|---|
| 1 | Search Intelligence | L1 GSC | keyword/content gaps | suggest only |
| 2 | AI Visibility | L4 | GEO/citation actions | suggest only |
| 3 | Dealer Intelligence ★ | L2 | dealer target lists, heatmaps | suggest only |
| 4 | GeM Intelligence | L1/L7 GeM | reseller & product opportunities | suggest only |
| 5 | Tender Intelligence | L1 procurement | tender shortlists, bid windows | suggest only |
| 6 | Google Ads Director | L5/L8/L9 | negatives, keywords, drafts, bids | draft + approval |
| 7 | Content Factory | L1/L4/L7 | demand-mapped content drafts | draft + approval |
| 8 | Marketplace Intelligence | L7 | marketplace opportunity reports | suggest only |
| 9 | Intent Scoring | L3 | lead scores + categories | auto-label, no spend |
| 10 | Communication Intelligence | L8 | conversion events, channel ROAS | suggest only |

Canonical audit object: **AgentRun** `{run_id, agent, started_at, inputs_snapshot, observations[], recommendations[], status, reviewed_by?, decision?}` — immutable once written.

---

## 5. Governance

Non-negotiable, reinforced from existing governance rules:

- **No** automatic publishing · spending · budget increases · campaign launches.
- The system **may** create: drafts, recommendations, draft campaigns, content drafts.
- **Every executing action requires admin approval** (APPROVE / REJECT / MODIFY).
- Every recommendation carries: **Confidence (0–100) · Expected ROI (L/M/H) · Risk (L/M/H) · Priority (Critical/Important/Optional)** + business rationale.

---

## 6. Admin Experience

`/admin/growth` must answer seven questions — and nothing about accounting or ERP:

1. Which keywords matter? 2. Which campaigns matter? 3. Which dealers matter? 4. Which tenders matter? 5. Which AI queries matter? 6. Which pages matter? 7. **What should we act on this week?**

The weekly action queue is the product's primary surface.

---

## 7. Revised Implementation Roadmap

Sequenced to the course-correction order, grounded in what already exists.

```
PHASE 1 — SIGNAL FOUNDATION
  Goal: real demand signals flowing + the priority dealer pipeline live.
  1. Search Console — unblock consent screen (config, not code) → first sync → SEO opportunity report.
  2. AI Search Intelligence — visibility probing baseline + AI Visibility Score.
  3. Dealer Intelligence ★ — scoring/clustering/heatmaps on existing gem_dealers +
     3,815 lead corpus; weekly dealer report; Target Lists upgraded in /admin/growth.
  DoD: weekly dealer opportunity report generated; GSC live; first AI visibility baseline.

PHASE 2 — ACQUISITION ENGINE
  4. Google Ads Director Phase 1 (read-only intelligence + suggestions).
  5. Campaign Factory (draft campaigns via Ads API, never auto-publish).
  6. ROAS Engine V1 (spend → clicks → calls → WhatsApp → RFQ).
  DoD: first structured Ads recommendation set; first draft campaign awaiting approval; ROAS V1 dashboard.

PHASE 3 — DEMAND AMPLIFICATION
  7. Content Factory (demand-mapped pages, GEO, ad copy).
  8. Marketplace Intelligence (GeM · IndiaMART · Justdial monitoring).
  9. GeM Intelligence agent (reseller + product opportunity surfacing).
  DoD: first demand-evidenced content drafts; marketplace opportunity report.

PHASE 4 — PREDICTIVE
  10. Tender Intelligence (bid windows, shortlists).
  11. Intent Engine (full 1–10 scoring across all channels).
  DoD: every inbound lead auto-classified; tender shortlist with bid windows.

DEFERRED (V2): Revenue Attribution · Revenue Capture · Financial/Zoho · Offline conversions.
```

**Model usage:** Claude **Opus** for architecture/sequencing/scoring-model decisions; Claude **Sonnet** for implementation.

---

## 8. The Principle

The system earns intelligence from every demand signal and every enquiry — won or lost. It does not wait for an invoice to learn. Applied with human judgment at every approval gate, that compounding demand model is the acquisition advantage competitors cannot buy with ad budget alone.
