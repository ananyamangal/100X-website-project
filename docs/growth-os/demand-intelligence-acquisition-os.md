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
│   L10 COMPETITIVE INTEL   GeM · IndiaMART · Justdial · search · AI rivals    │
│   L9  ROAS ENGINE         spend → clicks → calls → WhatsApp → RFQ (V1)       │
│   L8  COMMUNICATION       WhatsApp · calls · RFQ · forms · brochure = conv.  │
│   L7  MARKETPLACE         GeM · IndiaMART · Justdial movement                │
│   L6  CONTENT FACTORY     demand-mapped pages / ad copy / GEO / scripts      │
│   L5  GOOGLE ADS DIRECTOR read-only → campaign factory → optimization        │
│   L4  AI SEARCH INTEL     query framework / citation DB (no paid API yet)    │
│   L3  BUYER INTENT        every lead → Intent Score 1–10 + category          │
│   L2  DEALER OPP ENGINE ★ score · cluster · contract-history · "contact this wk"│
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

### L2 — Dealer Opportunity Engine ★ (highest business priority)
**Job:** convert the existing GeM dealer corpus into a **weekly, actionable contact list** — not a dashboard. The single question it answers: **"Which dealers should 100X contact this week?"**
**Existing assets:** `gem_dealers` (1,437 canonical) · `gem_contracts` (16,011, seller/product/dept drill-down) · `DEALER-LEAD-REPORT` (3,815 leads w/ phone·email·GSTIN) · `/admin/growth` Target Lists tab.

**Build (this is the priority engine):**
- **Dealer scoring** — rank each dealer on acquisition value (GeM activity volume, product fit with 100X catalogue, GMV handled, recency, contactability).
- **Dealer clustering** — group by state/district + product line to reveal coverage gaps.
- **Contract-history-based targeting** — use `gem_contracts` seller history to identify dealers already moving fogging/agri/sprayer volume (warm OEM-authorization candidates).
- **State-wise opportunity ranking** — rank states by unworked dealer potential vs. current 100X coverage.
- **Top dealer recommendations** — the weekly shortlist with contact details + why-now rationale.

**Primary output (decided 2026-06-10):** **Top 20 Dealers to Contact This Week**, optimized for *"which dealers are most likely to become successful 100X dealers?"* — NOT "which are largest." Each row carries: **Score · Reason for ranking · Product fit explanation · GeM activity summary · Contact details · Recommended next action.** Delivered in **both** the `/admin/growth` recommendation queue **and** a weekly generated report archive (GeMArchive pattern).

**Blended Dealer Score (weights):**
| Component | Weight | Source |
|---|---|---|
| Product Fit (overlap with 100X catalogue: fogging/agri/sprayer/etc.) | 40% | `gem_contracts` product lines per seller |
| GeM Contract Volume | 25% | count/GMV of seller contracts |
| Recent Activity | 15% | recency of last GeM contract |
| Geography Gap (weak 100X coverage where demand exists) | 10% | state/district vs. current coverage |
| Contactability (phone/email/GSTIN present + quality) | 10% | dealer lead record |

**OEM Authorization Probability Score** — bonus signal layered on top: likelihood a dealer would seek/accept 100X OEM authorization (strong product fit + active GeM seller + not already a competitor-OEM lock-in). Surfaces high-intent authorization targets first.

**Dealer Action Status workflow:** `New → Contacted → Interested → OEM Sent → Follow-up → Won / Lost / Ignore`. The engine **suppresses Won/Lost/Ignore and downgrades** already-in-progress dealers so the weekly list surfaces fresh, actionable targets.

Canonical object: **Dealer** `{dealer_id, name, gstin, state/district, products, gem_activity, gmv_handled, contact, last_contacted}`.
Canonical object: **DealerScore** `{dealer_id, product_fit, gem_volume, recent_activity, geo_gap, contactability, blended_score, oem_auth_probability, computed_at}`.
Canonical object: **DealerOpportunity** `{opportunity_id, dealer_id, week, rank, score, reason, product_fit_explanation, gem_activity_summary, contact, next_action, action_status, generated_at}`.

### L3 — Buyer Intent Engine
**Job:** classify every lead. **Output:** Intent Score 1–10 + category ∈ {GeM reseller, dealer, OEM-authorization seeker, government buyer, municipal buyer, pest-control operator, agricultural buyer, distributor, unknown}.
**Inputs:** search query · ad keyword · AI query · landing page · session behaviour · WhatsApp/call click · RFQ · dealer-DB match · GeM-DB match.
**Rule:** no lead is left unclassified.
Canonical object: **Lead** `{lead_id, captured_at, channel, signals[], intent_score, category, matched_dealer_id?, matched_gem_id?, state, product_interest}`.

### L4 — AI Search Intelligence
**Job:** monitor brand visibility across GPT, Claude, Gemini, Perplexity, Google AI Overviews. **Track:** is 100X cited · which competitors cited · which pages cited · which queries trigger citations. **Output:** GEO opportunity reports · citation gap · authority gap · AI Visibility Score + auto-generated recommendations.

**Phase 1 = framework only. NO paid LLM API integrations yet.** Build the plumbing so probing can be switched on later without rework:
- **Query tracking framework** — curated set of buyer/dealer/procurement queries to monitor (`ai_search_queries`).
- **Citation database** — schema to record, per query, whether 100X was cited and which page (`ai_search_citations`).
- **Competitor citation tracking** — same records capture competitor citations alongside 100X.
- **Weekly visibility reporting** — report shape defined now; populated by manual/seed entries until paid probing is approved.
Canonical object: **AICitation** `{query_id, platform, checked_at, cited_100x, page_cited?, competitors_cited[], source}`.

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

### L10 — Competitive Intelligence Engine
**Job:** know who is winning the demand 100X should be winning, and where the gaps are. Cross-channel competitor monitoring feeding the Dealer, Ads, and Content engines.
**Monitor:** GeM competitors (award/seller movement in `gem_contracts`) · IndiaMART competitors · Justdial competitors · Search competitors (Ads Auction Insights, GSC rivals) · AI-search competitors (from L4 citation tracking).
**Outputs:**
- **Competitor movement** — who is gaining/losing share by product, state, channel.
- **Opportunity gaps** — segments competitors hold that 100X does not contest.
- **Lost opportunities** — GeM contracts / queries won by competitors that 100X could have served.
- **New opportunity recommendations** — concrete "go contest this" actions routed to Dealer/Ads/Content engines.
Canonical object: **Competitor** `{competitor_id, name, channels[], products, states, share_signal, last_seen}`.
Canonical object: **CompetitiveSignal** `{signal_id, competitor_id, channel, signal_type (movement/gap/lost/new), detail, generated_at, status}`.

---

## 4. The Autonomous Agents

Every agent obeys one contract: **Observe → Log → Recommend → Learn**, and **every action is auditable**.

| # | Agent | Reads | Writes (recommendations) | Governance |
|---|---|---|---|---|
| 1 | Search Intelligence | L1 GSC | keyword/content gaps | suggest only |
| 2 | AI Visibility | L4 | GEO/citation actions | suggest only |
| 3 | Dealer Opportunity ★ | L2 | weekly "contact this week" list | suggest only |
| 4 | GeM Intelligence | L1/L7 GeM | reseller & product opportunities | suggest only |
| 5 | Tender Intelligence | L1 procurement | tender shortlists, bid windows | suggest only |
| 6 | Google Ads Director | L5/L8/L9 | negatives, keywords, drafts, bids | draft + approval |
| 7 | Content Factory | L1/L4/L7 | demand-mapped content drafts | draft + approval |
| 8 | Marketplace Intelligence | L7 | marketplace opportunity reports | suggest only |
| 9 | Intent Scoring | L3 | lead scores + categories | auto-label, no spend |
| 10 | Communication Intelligence | L8 | conversion events, channel ROAS | suggest only |
| 11 | Competitive Intelligence | L10 | movement, gaps, lost, new-opportunity recs | suggest only |

Canonical audit object: **AgentRun** `{run_id, agent, started_at, inputs_snapshot, observations[], recommendations[], status, reviewed_by?, decision?}` — immutable once written.

### Scheduling — Vercel Cron (decided)
All Phase 1 agents run on **Vercel Cron** invoking secured API routes. **No queue/worker infrastructure is built at this stage.** Each cron route: authenticates → runs the agent → writes an `AgentRun` audit record → emits recommendations to the approval queue. Long jobs stay within Fluid Compute timeout; if an agent outgrows a single invocation, revisit queues in a later phase (not now).

```
vercel.json crons (Phase 1):
  /api/growth/cron/dealer-opportunity   weekly  → Dealer Opportunity Engine
  /api/growth/cron/search-intelligence  weekly  → GSC opportunity report
  /api/growth/cron/ai-visibility        weekly  → AI visibility report (framework data)
  /api/growth/cron/competitive-intel    weekly  → competitor movement/gaps
```

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

## 7. Revised 90-Day Implementation Roadmap

**90-day goal:** generate more qualified **dealers, OEM-authorization requests, GeM reseller enquiries, and procurement opportunities.** Five focus tracks: demand generation · dealer acquisition · procurement opportunities · Google Ads Director · Competitive Intelligence. All agents on Vercel Cron. No queues. No financial/ERP. No paid AI-search APIs yet.

```
DAYS 1–30 — DEALER ACQUISITION + SIGNAL ON  ("contact this week" live)
  ★ Dealer Opportunity Engine — scoring, clustering, contract-history targeting,
    state-wise ranking → weekly "Which dealers to contact this week?" queue.
  • Search Console — unblock consent screen (config) → first sync → SEO opportunity report.
  • AI Search FRAMEWORK only — query tracking + citation DB + competitor-citation schema
    + weekly visibility report shell (no paid API).
  • Vercel Cron wiring for dealer-opportunity + search-intelligence agents.
  DoD: weekly dealer contact list in /admin/growth; GSC live; AI-search schema seeded.

DAYS 31–60 — PROCUREMENT + COMPETITIVE INTELLIGENCE
  • Procurement Opportunities — surface live GeM contract/tender opportunities as a
    weekly actionable queue (build on 16,011-contract corpus), GeM reseller enquiry targets.
  • Competitive Intelligence Engine — GeM/IndiaMART/Justdial/search/AI rivals →
    movement, opportunity gaps, lost opportunities, new-opportunity recommendations.
  • Cron wiring for competitive-intel agent.
  DoD: weekly procurement opportunity queue; first competitor movement + gap report.

DAYS 61–90 — GOOGLE ADS DIRECTOR + ROAS V1
  • Google Ads Director Phase 1 (read-only) — campaigns/keywords/search-terms/CPC/CTR
    + calls/WhatsApp/RFQ proxies → negatives, new keywords, ad copy, budget suggestions.
  • ROAS Engine V1 — spend → clicks → calls → WhatsApp → RFQ.
  • Campaign Factory (draft-only via Ads API) — begin if Phase 1 signals are clean.
  DoD: first structured Ads recommendation set; ROAS V1 view; (optional) first draft campaign awaiting approval.

LATER PHASES (post-90d): Content Factory · Marketplace deep-monitoring · Tender prediction ·
  full Intent Engine · Campaign Factory scale-up.

DEFERRED (V2, frozen): Revenue Attribution · Revenue Capture · Financial/Zoho ·
  Offline conversions · ERP/CRM · paid AI-search probing.
```

**Output discipline:** every engine emits an **actionable recommendation queue**, not a dashboard. The product surface is the weekly action list answering "what should we act on this week?"

**Model usage:** Claude **Opus** for architecture/sequencing/scoring-model decisions; Claude **Sonnet** for implementation.

---

## 8. The Principle

The system earns intelligence from every demand signal and every enquiry — won or lost. It does not wait for an invoice to learn. Applied with human judgment at every approval gate, that compounding demand model is the acquisition advantage competitors cannot buy with ad budget alone.
