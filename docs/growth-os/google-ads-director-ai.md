# Google Ads Director — AI Media Buyer Architecture

> Growth OS 4.0 — Acquisition Engine
> Status: Final architecture revision for approval · Supersedes the v1 read-only recommendation Director
> Architecture: Claude Opus · Implementation: Claude Sonnet
> No code in this document. Business + system architecture only.
> Revision 2 adds: Campaign Discovery Triggers, Budget Allocation Engine, Landing
> Page Intelligence Engine, three-funnel segmentation, and a final addendum
> (admin surfaces, automatic vs. approval decisions, notifications, data sources,
> Google Ads API actions, rollback, and an end-to-end day-in-the-life proof).

---

## 0. What This Is — and What It Is Not

The v1 Google Ads Director is a **recommendation engine**: it reads synced Ads data and suggests negatives, keywords, and bid reviews. Useful, but passive. It waits to be read.

This document redefines the Director as an **AI Media Buyer** — a system that **thinks and operates like a senior Google Ads strategist** for 100X Circle. It does not produce reports for a human to act on. It **decides what should exist, builds it, and stages it for one-click human approval.**

```
NOT THIS (v1)                          THIS (AI Media Buyer)
─────────────────────────────────────  ─────────────────────────────────────
"Here are 12 keyword ideas."           Designs the campaign, writes the ads,
"Search term X has no conversions."    builds the ad groups + keywords with
"Consider adding a negative."          match types, attaches audiences, and
A dashboard a human reads.             pushes the whole thing to Google Ads
                                        as a DRAFT awaiting one approval click.
```

**The role.** A senior media buyer does not ask "what does the data say?" — they ask *"what campaigns should 100X Circle be running this quarter to win municipal fogging tenders, recruit GeM dealers, and sell machines directly, and what is the cheapest path to each rupee of qualified enquiry?"* The AI Media Buyer holds that intent and works backward into structure.

**The hard line (unchanged from Growth OS governance).** The AI builds. The human spends. The AI may create drafts, audiences, ad copy, and full campaign structures. The AI may **never** publish, enable, raise a budget, or cause a single rupee to be spent without explicit human approval. Every decision carries Confidence / Expected ROI / Risk / Priority.

**v1 is not deleted.** The existing read-only Director (`lib/growth-os/agents/google-ads-director.ts`) is absorbed as the *monitoring substrate* of Engine 9 (Optimization). Its recommendations become one input to the buyer's daily decision loop, not the product.

---

## 1. The Operating Loop

The AI Media Buyer runs a continuous strategist loop. Each engine is a stage; nothing serves traffic without crossing the Governance Gate.

```
                 ┌──────────────────────────────────────────────────────┐
                 │                 INTENT (standing)                     │
                 │  Win fogging/vector tenders · recruit GeM dealers ·   │
                 │  sell machines direct · grow OEM authorizations ·     │
                 │  defend brand · cheapest cost per qualified enquiry   │
                 └───────────────────────────┬──────────────────────────┘
                                             ▼
   OBSERVE ─────────────────────────────────────────────────────────────────────
     Demand signals (GSC, Ads, GeM, AI-search), Dealer + Machine-Buyer engines,
     Competitor Intelligence, GBP, website enquiries (RFQ/WhatsApp/calls)
                                             ▼
   DECIDE ──────────────────────────────────────────────  per funnel (A dealer / B machine / C govt)
     1 Campaign Discovery   → which campaigns SHOULD exist (+ TRIGGERS: discover NEW clusters)
     2 Keyword Intelligence → which keywords + match types, and WHY
     4 Audience Intelligence→ who to target (dealer/GeM/remarketing/competitor)
     5 Competitor Intel     → where rivals are winning we are absent
     6 Google Business Intel→ local/regional demand to capture
     7 AI Search Intel      → AI-visibility gaps to close
    11 Match-Type Layer     → exact/phrase/broad/negative per keyword (cross-cut)
    12 Budget Allocation    → capital split across channels × funnels (envelopes ring-fenced)
                                             ▼
   GENERATE ────────────────────────────────────────────────────────────────────
     3 Ad Copy Factory      → RSA variants, callouts, sitelinks, snippets, scored
    13 Landing Page Intel   → map each cluster → page; block spend if page score <80
                                             ▼
   ┌─────────────────────────  GOVERNANCE GATE  ──────────────────────────────┐
   │  AI may create DRAFTS only. No spend. No publish. Human APPROVE/REJECT/   │
   │  MODIFY. Every artifact carries Confidence / ROI / Risk / Priority.       │
   └───────────────────────────────────┬──────────────────────────────────────┘
                                             ▼
   DEPLOY (draft) ──────────────────────────────────────────────────────────────
     8 Deployment Engine    → push campaigns/ad groups/keywords/negatives/
                              audiences into Google Ads in a NON-SERVING state
                                             ▼
   MONITOR + OPTIMIZE ──────────────────────────────────────────────────────────
     9 Optimization Engine  → daily; mine search terms, discover negatives,
                              propose ad swaps, budget/bid/ROAS moves (as drafts)
                                             └────────────► back to DECIDE
```

**Principle:** the buyer is always trying to close the gap between *intent* and *what is currently live*. Every cycle it asks "what is missing, what is wasteful, and what is winnable?" and produces draft mutations to fix it.

---

## 1.5 Acquisition Funnel Segmentation — the spine of the system

**The system never treats all acquisition equally.** A dealer, a machine buyer, and a government procurement office have different buying journeys, intent language, audiences, economics, and definitions of success. Mixing them into one account average is how media budgets are wasted. So the AI Media Buyer runs **three independent funnels**, and *every engine in this document operates per-funnel*. Budgets and success metrics are **never** shared across them.

```
FUNNEL A — DEALER ACQUISITION        FUNNEL B — MACHINE SALES          FUNNEL C — GOVERNMENT PROCUREMENT
──────────────────────────────      ──────────────────────────────    ──────────────────────────────────
Objective: grow dealer network      Objective: sell machines direct   Objective: win government business
Intents: become a dealer, OEM       Intents: thermal fogging machine,  Intents: municipal fogging machine,
  authorization, GeM reseller,        vehicle mounted fogger, ULV        NHM/NVBDCP, vector control, tender
  distributor, dealer network         fogger, agricultural sprayer       contractor, GeM procurement
Conversion: dealer/OEM enquiry      Conversion: product RFQ / WhatsApp Conversion: tender/municipal enquiry
Audiences: Dealer Opportunity       / call                             Audiences: Machine Buyer Engine
  Engine + GeM dealer corpus        Audiences: remarketing, custom-      (govt buyers of ULV/chemicals),
  (Customer Match)                    intent, product-page visitors      dept/state custom segments
Landing: become-a-dealer,           Landing: product pages,            Landing: gem-tender-support,
  gem-oem-authorization               compare/spec pages                 nhm/nvbdcp/municipal pages
Success metric: cost per dealer/    Success metric: cost per product   Success metric: cost per tender/
  OEM application                     RFQ / WhatsApp / call              municipal enquiry
SEPARATE campaigns · audiences · keywords · BUDGET ENVELOPE · reports — each funnel optimized independently
```

**Why this mirrors Growth OS already:** the Dealer Opportunity Engine and Machine Buyer Engine are *already* segmented and never mixed. Funnel C (government) is the procurement-specific extension, fed by the GeM corpus and Machine Buyer signals. The AI Media Buyer carries that same discipline into paid acquisition: three envelopes, three scorecards, one strategist managing all three.

**Rule enforced everywhere below:** when any engine designs a campaign, keyword, audience, ad, landing page, or budget move, it is *stamped with a funnel*, and the Budget Allocation Engine (Engine 12) keeps the three envelopes ring-fenced. Cross-funnel budget movement is a separate, explicit human decision.

---

## 2. Strategic Inputs (the buyer's worldview)

The AI Media Buyer is only as good as the context it reasons over. It consumes, every cycle:

| Source | Already in Growth OS | What the buyer extracts |
|---|---|---|
| Google Ads (synced `ads_*`) | ✅ `lib/google-ads` | current structure, spend, CTR, CPC, search terms, conversions |
| Search Console | ✅ `lib/gsc` | real query demand, page authority, rising/falling intent |
| Dealer Opportunity Engine | ✅ | who the high-fit dealers are, by state/product (audience seed) |
| Machine Buyer Engine | ✅ | govt buyers of ULV/chemicals/machines (customer-match seed) |
| GeM corpus (16,011 contracts) | ✅ | which depts/states buy fogging, seasonality, L1 price bands |
| Competitor Intelligence (L10) | ✅ arch | rivals on GeM/IndiaMART/Justdial/search/AI |
| AI Search framework (L4) | ✅ arch | citation gaps across GPT/Gemini/Claude/Perplexity |
| Google Business Profile | ⬜ new | local demand, regional gaps, dealer-coverage whitespace |
| Website enquiries | ✅ | RFQ/WhatsApp/call volume = the V1 conversion event |
| 100X product catalogue | ✅ | thermal/mini/vehicle foggers, sprayers, tillers, brush cutters |

**The conversion definition stays V1.** Until offline conversion import is reactivated (deferred), the optimization target is **qualified enquiry** (RFQ / WhatsApp / call / dealer-application), not invoice revenue. The buyer optimizes cost-per-qualified-enquiry and routes high-intent clicks to the right landing pages.

---

## 3. Engine 1 — Campaign Discovery Engine

**Question it answers:** *Which campaigns should exist that do not exist today — and which existing ones should not?*

A senior buyer designs a **campaign portfolio**, not a pile of keywords. The Discovery Engine maps 100X's intent and demand onto campaign archetypes and decides which to propose, by expected return and strategic role.

**Campaign archetypes considered:**

| Archetype | When the buyer proposes it | Primary objective |
|---|---|---|
| **Search — high intent** | Proven query demand (GSC + search terms) for "thermal fogging machine", "ULV fogger price", "vehicle mounted fogger" | Capture in-market buyers/dealers |
| **Search — tender/GeM intent** | Queries like "GeM fogging machine", "OEM authorization", "reverse auction fogging" | Dealer + OEM recruitment |
| **Performance Max** | Catalogue breadth + need to harvest across Search/Display/YT/Maps when manual coverage is thin | Efficient incremental enquiry volume |
| **YouTube** | Demonstrable product (fogging in action), municipal/agri buyer education, remarketing reinforcement | Demand creation + assist |
| **Remarketing** | Site has dealer-page / product-page traffic not converting first-touch | Re-engage warm intent |
| **Competitor** | Competitor Intelligence shows rivals capturing branded/category demand 100X is absent from | Conquest + defense |

**How it decides (per candidate campaign):** demand evidence (search volume / GeM signal), strategic role, estimated CPC band (from `ads_*` + benchmarks), landing-page readiness (must score ≥80, per governance), and expected cost-per-enquiry. Output is a **Campaign Plan** object with Confidence / ROI / Risk / Priority and an explicit rationale. It also flags **redundant or wasteful existing campaigns** for proposed pause.

### Discovery Triggers — how entirely NEW campaigns are found

Managing existing campaigns is table stakes. The defining behavior of a media *buyer* is **discovering campaigns that should exist but don't.** The Discovery Engine runs continuously and watches for **clusters** crossing an opportunity threshold in any funnel:

| Cluster type | Signal source | Example |
|---|---|---|
| **New keyword cluster** | Rising GSC queries + Ads search terms grouping around a theme | "fogging machine for dengue control" trending up |
| **New demand cluster** | Search + AI-search + seasonality (dengue/monsoon, tender cycles) | Pre-monsoon vector-control demand surge |
| **New audience cluster** | Dealer/Machine-Buyer engines surfacing a new high-fit segment | Cluster of pest-control operators buying ULV |
| **New geographic opportunity** | GBP + GeM + GSC showing state/district demand with no coverage | District-level municipal demand, no dealer/campaign |
| **New competitor opportunity** | Competitor Intelligence: rival capturing demand 100X is absent from | Competitor newly bidding on "IS 14855 fogging machine" |
| **New procurement opportunity** | GeM corpus: surge of fogging/ULV tenders by dept/state | NHM tender wave in a state |

**Trigger → action sequence (the proof behavior):** when a cluster crosses threshold **and no dedicated campaign serves it**, the AI:

```
1. Identify the intent cluster   → name it, assign a funnel (A/B/C), gather member queries
2. Estimate the opportunity      → volume, CPC band, expected enquiries, expected cost-per-enquiry,
                                    landing-page readiness, confidence
3. Design the campaign           → archetype, ad groups, themes (Engine 1 → 2/3/4/11/13)
4. Create draft assets           → keywords + match types, RSA variants, audiences, negatives,
                                    geo settings — all non-serving
5. Notify the admin              → "New intent cluster detected: dengue-control fogging (Funnel C).
                                    Draft campaign ready for review." with the exec header
```

**Worked example.** Searches rise for *"fogging machine for dengue control"*, *"municipal fogging machine"*, *"IS 14855 fogging machine"* and no campaign targets them. The Discovery Engine clusters these as **"Municipal / Vector-Control Demand" (Funnel C)**, estimates the opportunity (volume, CPC ~₹X, expected municipal enquiries), designs a Search campaign with tender-intent ad groups, generates keywords with match types, writes RSA variants citing IS 14855 + govt-supply experience, attaches a municipal/dept audience, sets geo-weighting to high-demand states, maps it to `nhm-fogging-machine` / `gem-tender-support` landing pages (flagging any LP gap), pushes the **draft**, and notifies the admin. **The AI created a campaign — it didn't wait to be asked.**

**Output:** ranked Campaign Plans (each funnel-stamped, with discovery provenance) → feed Engines 2/3/4/11/13 to be fleshed out, Engine 12 for a budget envelope, then Engine 8 to deploy as drafts.

---

## 4. Engine 2 — Keyword Intelligence Engine

**Question:** *For each campaign, which keywords, in which match type, and why?*

The buyer generates keywords from real demand (GSC queries, Ads search terms, GeM product language, competitor terms, catalogue + synonyms) — never from imagination alone. Each keyword is a **decision with a reason**, not a string.

**Generation sources:** GSC query rows · Ads search-term rows · GeM product/category language (e.g. "Deltamethrin ULV", "knapsack sprayer") · competitor keywords (Engine 5) · catalogue expansion (thermal fogger → cold fogger → ULV fogger → mosquito fogging machine) · question/intent variants.

**Per keyword the engine decides and explains:** match type (see Engine 11), the campaign/ad group it belongs to, intent tier (buyer / dealer / tender / research), expected CPC band, and a one-line rationale ("'gem fogging machine reverse auction' → Phrase; tender-intent, mid volume, want control without missing close variants").

**Continuous refinement (loop with Engine 9):** match types are not set once. A Broad keyword that mines good search terms gets those terms promoted to Exact; a Phrase term bleeding into irrelevant queries gets tightened or negated. The engine maintains a **match-type lifecycle** per keyword (see Engine 11).

**Output:** Keyword Sets (keyword + match type + ad group + rationale + Confidence/ROI/Risk/Priority), plus a seeded Negative list.

---

## 5. Engine 3 — Ad Copy Factory

**Question:** *What is the strongest set of ads for each ad group, and how do we know?*

Generates complete **Responsive Search Ads** and all extensions, in multiple variants, scored before a human ever sees them — like a strategist drafting and self-critiquing.

**Generates per ad group:**
- **Headlines** (up to 15) — pinned/unpinned strategy, covering: product specificity (thermal/ULV/vehicle), proof (IS 14855, OEM, made-in-India), intent match (price, dealer, tender, GeM), CTA.
- **Descriptions** (up to 4) — value prop, trust, urgency, offer.
- **Callouts** — "OEM Authorized", "GeM Listed", "Pan-India Dealers", "Govt Supply Experience".
- **Sitelinks** — Become a Dealer, GeM Support, Product Range, Fogging in Action.
- **Structured snippets** — product line / service catalogue.
- **Multiple variants** per ad group for A/B (e.g. proof-led vs price-led vs dealer-led).

**Scoring system (before human review):** each variant scored on relevance to the ad group's keywords/intent, predicted Ad Strength (coverage, pinning discipline, keyword inclusion), policy safety (no superlatives/medical claims that violate Google policy), and message-to-landing-page match. Low-scoring variants are discarded automatically; only strong variants reach the Governance Gate.

**Output:** scored RSA + extension sets attached to each ad group's draft.

---

## 6. Engine 4 — Audience Intelligence

**Question:** *Who should we be in front of, and how do we assemble that audience legitimately?*

Turns Growth OS's proprietary data into Google Ads audiences — the buyer's structural advantage competitors can't replicate.

| Audience | Source | Use |
|---|---|---|
| **Dealer audiences** | Dealer Opportunity Engine (high-fit equipment sellers by state/product) | Customer Match + observation/targeting on dealer-recruitment campaigns |
| **GeM dealer audiences** | `gem_dealers` + dealer lead corpus (phone/email/GSTIN) | Customer Match upload (hashed) for OEM/dealer campaigns |
| **Customer match uploads** | Machine Buyer Engine (govt buyer contacts) + website enquiries | Re-engagement + lookalike seeds for direct machine sales |
| **Remarketing audiences** | Website visitors by page intent (dealer page, product page, GeM page) | Remarketing + PMax audience signals |
| **Competitor audiences** | Competitor Intelligence (custom-intent from competitor terms/sites) | Conquest campaigns |

**Governance/compliance note:** Customer Match uploads use **hashed** PII and require consent/eligibility; the engine flags any audience that needs a compliance check before upload. No raw PII leaves the system; uploads are themselves draft actions requiring approval.

**Output:** Audience definitions + customer-match upload jobs (staged, not executed) attached to relevant campaign drafts.

---

## 7. Engine 5 — Competitor Intelligence (feeds the buyer)

**Question:** *Where are competitors winning demand 100X should be contesting?* (Consumes the L10 Competitive Intelligence Engine — not a new monitor, a buyer-facing lens.)

Sources: **Search** (Auction Insights, rivals on category/brand terms) · **AI search** (who GPT/Gemini/Claude/Perplexity cite for fogging queries) · **GeM** (L1 winners, repeat suppliers in `gem_contracts`) · **IndiaMART** · **JustDial**.

Outputs the buyer acts on:
- **Conquest opportunities** → competitor Search campaigns (Engine 1) + custom-intent audiences (Engine 4).
- **Defensive gaps** → brand-defense keywords when rivals bid on "100X".
- **Message gaps** → ad-copy angles competitors own that 100X should counter (Engine 3).
- **Price intelligence** → GeM L1 bands inform CPC ceilings and which categories are worth bidding.

---

## 8. Engine 6 — Google Business Intelligence

**Question:** *What local and regional demand can we capture that paid search alone misses?*

- **Google Business Profile opportunities** — completeness, categories, posts, review velocity; gaps that suppress local visibility for "fogging machine near me" / city-level intent.
- **Local dealer opportunities** — overlay dealer-coverage whitespace (from Dealer Engine state ranking) with local demand → propose local campaigns / location-targeted ad groups where 100X has demand but no dealer.
- **Regional demand opportunities** — state/district demand (GeM + GSC + Maps) → geo-targeting and budget-weighting recommendations for campaign drafts (e.g. weight UP/MH/Delhi where municipal fogging demand concentrates).

**Output:** geo-targeting + local-campaign drafts and GBP action recommendations.

---

## 9. Engine 7 — AI Search Intelligence (feeds the buyer)

**Question:** *Are we visible where buyers now research — AI answers — and how do we convert that into demand?* (Consumes the L4 AI Search framework.)

- **Visibility tracking** — is 100X cited by **ChatGPT / Gemini / Claude / Perplexity / AI Overviews** for fogging/dealer/tender queries; which competitors are.
- **Citation opportunities** — queries where a citation is winnable with the right authoritative page.
- **Content opportunities** — gaps that, if filled (Content Factory), earn AI citations and feed Search demand.

**Why a media buyer cares:** AI-search visibility shifts where top-funnel demand forms. The buyer uses citation/content gaps to (a) prioritize Search/PMax themes that AI is steering buyers toward, and (b) brief the Content Factory so paid and organic/AI compound. (Phase-1 framework only — no paid LLM probing yet, per current direction.)

---

## Engine 12 — Budget Allocation Engine (capital allocation)

**Question:** *Given finite budget, where does each rupee earn the most qualified enquiry — across channels and across funnels?*

A true media buyer allocates capital; they don't just optimize keywords. The Budget Allocation Engine recommends how to distribute spend **across channels** (Search, Performance Max, YouTube, Remarketing, Competitor) **and across the three funnels** (Dealer Acquisition, Machine Sales, Government Procurement), holding each funnel's envelope separate.

**Inputs (per channel × funnel):** intent score (from the demand/opportunity engines) · current CPC · competition level (Auction Insights) · historical performance (cost-per-enquiry by campaign) · demand growth trend (GSC/search-term momentum) · seasonality (monsoon/dengue vector-control spikes; GeM tender cycles) · procurement signals (GeM tender surges → Funnel C) · dealer opportunity signals (Dealer Engine pipeline → Funnel A).

**Output:** a recommended allocation, each line stamped with **reason · expected impact · confidence**, e.g.:

```
PROPOSED MONTHLY ALLOCATION — total ₹1,00,000           reason / expected impact / confidence
──────────────────────────────────────────────────────────────────────────────────────────────
FUNNEL B  Machine Sales — Search          ₹40,000   Proven product RFQ intent, lowest CPL · +RFQs · 82
FUNNEL A  Dealer Acquisition — Search     ₹15,000   Dealer pipeline strong, OEM intent rising · 76
FUNNEL C  Govt Procurement — Search       ₹20,000   GeM tender surge + monsoon season · municipal enquiries · 71
FUNNEL B  Machine Sales — Performance Max ₹12,000   Harvest incremental beyond manual coverage · 64
          Remarketing (all funnels)        ₹5,000   Re-engage warm dealer/product visitors · 70
FUNNEL A  Competitor (conquest)            ₹8,000   Rival bidding on category terms we're absent · 60
```

**Governance:** allocations are recommendations only. **Any budget set or increase >10% requires explicit human approval** (Growth OS budget workflow). **Budget is never moved between funnels automatically** — each funnel's envelope is ring-fenced; cross-funnel reallocation is a separate human decision with its own justification. Seasonality and procurement triggers can *propose* a reallocation, never execute one.

---

## Engine 13 — Landing Page Intelligence Engine

**Question:** *Does every campaign / ad group / keyword cluster point at a page that can actually convert — and if not, what's missing?*

Paid clicks are wasted on weak pages. This engine continuously maps **every campaign, ad group, and keyword cluster to a recommended landing page** and evaluates that page's conversion readiness. It is the enforcement point for the governance rule that **no ad spend is recommended to a page scoring below 80**.

**Detects, per mapped page:** missing landing pages (intent with no page) · weak pages (low conversion score) · missing trust signals (certifications, govt-supply proof, IS 14855) · missing FAQs / FAQ schema · missing or weak CTAs · missing certifications/compliance content · poor conversion structure (form length, mobile, load).

**Scores each page 0–100** (relevance to the keyword intent, trust signals, CTA quality, mobile, form quality, conversion likelihood) and **generates recommendations automatically** — which become briefs for the Content Factory (existing Growth OS engine), not manual tickets.

**Worked example.**
```
Keyword cluster:  "OEM authorization fogging machine" (Funnel A)
Mapped page:      /gem-oem-authorization
Page score:       73 / 100  → below the 80 spend threshold
Issues:           missing FAQ section · no OEM-process explainer · weak CTA above the fold
Recommendation:   add FAQ schema + "How OEM authorization works" section + sticky CTA
Gate effect:      Deployment Engine flags this campaign — spend recommendation withheld until
                  the page reaches ≥80 OR the admin explicitly overrides with justification
```

**The gate:** the Deployment Engine (Engine 8) will stage a campaign draft, but the Governance Gate marks any ad group whose landing page scores <80 as **spend-blocked** until remediated or overridden. This stops the AI from ever sending paid traffic to a page that can't convert.

---

## 10. Engine 8 — Campaign Deployment Engine (drafts only)

**Question:** *How does a decided, generated campaign become a real Google Ads draft — with zero risk of spend?*

This is the engine that makes it a media *buyer*, not a recommender. It writes to the Google Ads API via the **mutate** operations (extending the existing `lib/google-ads`, which today only reads) to **create**:

- Campaigns · ad groups · keywords · negative keywords · ads (RSA + extensions) · audiences · geo/schedule settings.

**The non-serving guarantee (how "draft" is enforced):**
- **Search campaigns** → created as **Campaign Drafts** (Google Ads Drafts & Experiments) where supported, OR as campaigns in **PAUSED** status with budgets that cannot serve until enabled.
- **PMax / YouTube / others** (no native draft) → created in **PAUSED** state with assets/audiences attached, awaiting human enable.
- **Budgets** are attached but **inert while paused**; enabling a campaign and confirming budget is a **human-only** action.
- **Customer Match uploads** are staged jobs requiring separate approval before any list is pushed.

Every deployment is recorded as a reversible **Deployment Record** (what was created, where, draft/paused state, rollback handle) so a rejected draft can be cleanly removed.

**Output:** real, inspectable Google Ads drafts/paused entities + a deployment manifest surfaced for one-click approve/enable or reject/rollback.

---

## 11. Engine 9 — Optimization Engine (continuous)

**Question:** *Now that things are live, what should change — and propose it as drafts.*

Runs **daily**. Absorbs v1's read-only monitoring as its sensing layer, then acts like a buyer doing a morning account review.

- **Daily monitoring** — spend pace, CTR/CPC drift, conversion (enquiry) collapse, budget exhaustion before peak hours, anomaly detection.
- **Search-term mining** — promote converting terms to Exact keywords (Engine 2); route by intent.
- **Negative keyword discovery** — terms burning clicks with no enquiry → draft negatives (auto-generated, approval-gated).
- **Ad replacement** — when a variant underperforms, the Ad Copy Factory drafts a replacement; propose the swap.
- **Budget recommendations** — reallocate toward state/campaign with lowest cost-per-enquiry; any **increase >10%** needs explicit approval (governance).
- **Bid recommendations** — manual-bid nudges or bid-strategy changes, with rationale and risk.
- **ROAS / efficiency recommendations** — once enough enquiry data, propose target-CPA/enquiry or value-based pacing (offline-conversion import remains deferred; until then, optimize cost-per-qualified-enquiry).

**Every optimization is a draft mutation or a recommendation — never an auto-applied spend or bid change.**

---

## 12. Engine 11 — Match-Type Intelligence Layer (cross-cutting)

Applied to **every** keyword the system touches (generation in Engine 2, refinement in Engine 9). For each keyword it decides **Exact / Phrase / Broad / Negative** and **explains why**.

**Decision policy (senior-buyer heuristics, config-driven):**

| Match type | Chosen when | Rationale pattern |
|---|---|---|
| **Exact** | Proven converter, high commercial intent, control matters, CPC premium justified | "Converted 4× as a search term; lock it Exact to protect efficiency." |
| **Phrase** | Clear intent with useful close/long-tail variants, want control + reach | "Tender intent with many phrasings; Phrase to catch variants without broad waste." |
| **Broad** | Discovery/mining with Smart Bidding + tight negatives + good audience signals | "Use Broad to mine new municipal phrasings; guarded by negatives + dealer audience." |
| **Negative** | Wastes clicks, wrong intent, or zero enquiry historically | "'repair', 'spare part', 'air freshener' → Negative; non-buyer intent." |

**Lifecycle:** keywords move between match types over time based on Engine 9 evidence (Broad → mine → promote winners to Exact; Phrase bleeding → tighten or negate). Each transition is logged with its evidence (the Prediction-Register discipline from the Learning Engine applies: log the expected effect before the change).

**Output:** every keyword carries `{match_type, intent_tier, rationale, lifecycle_state, evidence}`.

---

## 13. Engine 10 — Governance Layer (hard constraints)

Non-negotiable. Binds every engine above.

```
AI CAN                                  AI CANNOT (human-only)
──────────────────────────────────     ──────────────────────────────────
Create campaign drafts                  Publish / enable any campaign
Create ad groups, keywords, negatives   Cause any spend
Generate ads + extensions               Increase any budget (>10% = approval)
Define audiences                        Push a Customer Match list
Stage customer-match uploads            Change live bids/budgets automatically
Propose bid/budget/ROAS changes         Approve its own work
```

**Every artifact (campaign plan, keyword set, ad, audience, optimization) carries the executive-mode header** (from Growth OS governance): **Confidence (0–100) · Expected ROI (L/M/H) · Risk (L/M/H) · Priority (Critical/Important/Optional)** + business rationale + landing-page score (must be ≥80 before any ad-spend recommendation).

**Approval surface:** a single review queue where a human sees the full draft (campaign → ad groups → keywords+match types+why → ads+scores → audiences → budget) and chooses **APPROVE / REJECT / MODIFY**. Approve enables the draft in Google Ads; reject triggers rollback via the Deployment Record. Nothing serves traffic until that click.

**Auditability:** every AI action is an immutable `AgentRun` (observe → log → recommend/create → learn), versioned (scoring/taxonomy/policy versions), reversible.

---

## 14. Data & System Architecture

**Extends, does not replace.** The existing `lib/google-ads` read client gains a **mutate** capability (campaign/ad-group/keyword/ad/audience create, draft/paused). Auth, developer token, and account selection already exist.

**New collections (proposed):** every record is **funnel-stamped** (A / B / C).
- `ads_clusters` — discovered intent/demand/audience/geo/competitor/procurement clusters + opportunity estimate + trigger state.
- `ads_campaign_plans` — Discovery output (archetype, funnel, demand evidence, exec header, status).
- `ads_keyword_sets` — keyword + match type + rationale + lifecycle.
- `ads_ad_variants` — generated RSA/extension variants + scores.
- `ads_audiences` — definitions + customer-match staging + compliance flags.
- `ads_budget_allocations` — proposed channel × funnel allocation + reason/impact/confidence + envelope caps.
- `ads_landing_recommendations` — page mappings, scores, gaps, Content-Factory briefs, spend-block state.
- `ads_deployments` — deployment manifest + rollback handles + draft/paused state.
- `ads_optimizations` — daily proposed changes (negatives, swaps, budget/bid) + approval state.
- `ads_director_decisions` — unified decision log (exec header + evidence + version) for learning/calibration.

**Versioning & learning:** policy/heuristic versions on every decision; outcomes (enquiries, CTR, cost-per-enquiry) flow back to calibrate match-type and copy-scoring heuristics over time (Learning Engine discipline).

---

## 15. Relationship to Existing Growth OS

| Existing | Role in the AI Media Buyer |
|---|---|
| v1 read-only Director (`google-ads-director.ts`) | Becomes Engine 9's sensing layer (monitoring + negative discovery) |
| Dealer + Machine Buyer engines | Seed Engine 4 audiences + Engine 1 campaign intent |
| GeM corpus / Competitive Intel (L10) | Engines 1/5 (campaigns, conquest, price ceilings) |
| AI Search framework (L4) | Engine 7 (visibility-driven demand prioritization) |
| GSC sync + SEO Opportunity | Engine 2 keyword demand + Engine 7 content gaps |
| Governance + executive mode | Engine 10 (unchanged, binding) |
| Contact This Week / enquiry data | The V1 conversion signal the buyer optimizes toward |

---

## 16. Phasing (for a later implementation plan — not built here)

0. **Funnel + governance foundation** — three funnel envelopes (A/B/C), the Approval Queue surface, Deployment Record / rollback scaffolding.
1. **Mutate foundation** — extend `lib/google-ads` to create paused/draft entities + remove (rollback).
2. **Discovery + Triggers** — cluster detection across the six signal types; opportunity estimation; campaign design.
3. **Keyword + Match-Type** — keyword sets with explained Exact/Phrase/Broad/Negative + lifecycle.
4. **Ad Copy Factory** — scored RSA/extension generation.
5. **Landing Page Intelligence** — page mapping + scoring + spend-block gate + Content-Factory briefs.
6. **Deployment Engine** — push first Search campaign (one funnel) as a draft, end-to-end, approval-gated.
7. **Budget Allocation** — channel × funnel envelopes with reason/impact/confidence.
8. **Audience Intelligence** — dealer/GeM customer-match (compliance-gated) + remarketing.
9. **Optimization Engine** — daily mining/negatives/swaps/bids as drafts.
10. **Competitor / GBP / AI-search** lenses layered into Discovery across all three funnels.

Each phase ships behind the Governance Gate: drafts only, human approval, full auditability.

---

## 18. Final Architecture Addendum — Operating Specification

This addendum answers the review questions and proves the system works end-to-end.

### 18.1 What admin screens will exist?

Minimal **control surfaces, not dashboards.** No keyword reports, no performance dashboards beyond what is needed to make an approval decision. Four surfaces:

1. **Media Buyer Review (the Approval Queue)** — the primary surface. Each pending item is a draft card; expanding it shows the full tree the AI built: *campaign → ad groups → keywords (with match type + rationale) → RSA variants (with scores) → audiences → landing page (with score) → proposed budget envelope*, plus the exec header (Confidence / ROI / Risk / Priority). Actions: **APPROVE / REJECT / MODIFY.** Tabbed by funnel (A / B / C).
2. **Budget Envelopes** — where the human sets/confirms the **per-funnel monthly ceilings** the AI is allowed to allocate *within*. The AI proposes; the human sets the caps. Ring-fenced per funnel.
3. **Notifications Inbox** — actionable, prioritized alerts (also mirrored as cards in the existing `growth_os_opportunities` queue).
4. **Deployment & Rollback** — the manifest of what the AI pushed into Google Ads (draft/paused state) with one-click rollback per item.

These reuse the Contact-This-Week approval UX pattern. The product is a *decision surface*, not a reporting tool.

### 18.2 What decisions does the AI make automatically (no approval)?

Everything **up to, but not including, serving or spending**:
- Detect demand/keyword/audience/geo/competitor/procurement clusters; estimate opportunity.
- Design campaigns, ad groups, and themes (per funnel).
- Generate keywords and **decide match types** (Exact/Phrase/Broad/Negative) with rationale.
- Write and **score** RSA variants, callouts, sitelinks, structured snippets.
- Define audiences (the *definition* — not the upload).
- Generate negative keywords.
- Map every cluster to a landing page, **score** it, and write LP improvement recommendations.
- Propose budget allocations across channels × funnels.
- **Create non-serving drafts** in Google Ads (paused / campaign drafts).
- Daily monitoring, search-term mining, anomaly detection; generate optimization drafts.

### 18.3 What decisions require admin approval?

Everything that **serves traffic, spends money, or exposes data**:
- Enable / publish / launch any campaign (turn a paused/draft campaign ENABLED).
- Commit any budget; **any budget increase >10%**; **any cross-funnel budget movement**.
- Upload any **Customer Match** list (PII).
- Apply any optimization that changes **live** bids/budgets/spend.
- Override a landing-page **<80 spend-block**.
- Change bid strategy on a serving campaign.

The AI can stage all of these as drafts/proposals; none execute without an explicit human click.

### 18.4 What notifications will the admin receive?

Prioritized (Critical / Important / Optional), batched to avoid noise, delivered to the in-app queue (+ optional email):
- **New intent cluster discovered → draft campaign ready** (with funnel + opportunity estimate).
- **Budget reallocation proposed** / envelope nearing its cap / seasonality or procurement trigger.
- **Landing-page gap blocking a campaign** (spend-blocked until remediated/overridden).
- **Daily optimization batch ready** (negatives, ad swaps, bid/budget proposals) — one digest, not per-item spam.
- **Anomaly alerts** — CPC spike on a key term, enquiry/conversion collapse, budget exhausted before peak hours, competitor incursion.
- **Approval reminders** — drafts awaiting review > N days.

### 18.5 What data sources feed each decision?

| Decision | Primary sources |
|---|---|
| Cluster discovery | GSC queries, Ads search terms, AI-search signals, GeM tender surges, Dealer/Machine-Buyer engines, GBP/Maps, Competitor Intel |
| Campaign design | the cluster + funnel intent + catalogue + landing-page readiness |
| Keywords + match type | GSC/search-terms/GeM language/competitor terms + historical conversion evidence |
| Ad copy | catalogue, proof assets (IS 14855, OEM, govt-supply), funnel intent, competitor message gaps |
| Audiences | Dealer Engine, `gem_dealers`, Machine Buyer Engine, website visitors, competitor custom-intent |
| Budget allocation | intent score, CPC, competition, historical cost-per-enquiry, demand growth, seasonality, procurement + dealer signals |
| Landing page | site pages, page conversion structure, governance LP scoring |
| Optimization | daily `ads_*` sync, search terms, enquiry data (RFQ/WhatsApp/call) |

### 18.6 What Google Ads API actions will be executed?

Extends `lib/google-ads` from read-only to **read + mutate**, but **every mutate creates a non-serving entity**:

- **READ:** `GoogleAdsService.searchStream` — campaigns, ad groups, keywords, search terms, metrics, Auction Insights, geo (already built).
- **MUTATE (non-serving):**
  - `CampaignBudgetService` → create budget (attached but inert while paused).
  - `CampaignDraftService` → create **Search campaign drafts**; OR `CampaignService` → create campaign in **PAUSED** status (PMax/YouTube, which have no native draft).
  - `AdGroupService` → create ad groups.
  - `AdGroupCriterionService` → create **keywords (with match type)** + **negative keywords**.
  - `AdGroupAdService` → create **RSA** ads; `AssetService` / extensions → callouts, sitelinks, structured snippets.
  - `CampaignCriterionService` → geo targeting, campaign-level negatives.
  - `UserListService` + `OfflineUserDataJobService` → Customer Match (**staged, not run** until approved).
- **ENABLE (human-gated):** `CampaignService.update status=ENABLED` and budget commitment — executed **only after an APPROVE click**. The AI never calls enable on its own.

### 18.7 What rollback mechanism exists if a draft is incorrect?

Every deployment writes a **Deployment Record** (`ads_deployments`) capturing the created `resource_name`s, their draft/paused handles, and the funnel/campaign-plan they belong to.
- **REJECT** → the engine removes the created entities (`CampaignDraftService.remove`, or set the paused campaign + children to `REMOVED`), and **discards any staged Customer Match job** (which was never uploaded). Fully reversible.
- **MODIFY** → the AI regenerates only the flagged part (e.g. re-score ads, retighten a match type, fix the landing-page block) and re-stages the draft.
- Because **everything is created non-serving**, rollback **never touches live spend** — there is nothing to claw back. Every deploy and rollback is logged as an immutable `AgentRun`.

### 18.8 Day-in-the-life — end-to-end proof (Monday)

> Scenario: a dengue-season demand surge in Funnel C (Government Procurement).

```
06:00  DISCOVER   Discovery Engine detects a rising cluster: "fogging machine for dengue
                  control", "municipal fogging machine", "IS 14855 fogging machine" (GSC +
                  search terms + seasonality). No campaign serves it. → fires a trigger.
06:01  CLASSIFY   Names the cluster "Municipal / Vector-Control Demand", assigns FUNNEL C.
06:02  ESTIMATE   Opportunity: volume, CPC band ~₹X, expected municipal enquiries, expected
                  cost-per-enquiry, confidence 71. Checks Funnel C envelope headroom (Engine 12).
06:03  DESIGN     Designs a Search campaign: ad groups by intent (dengue control / municipal /
                  IS-14855 / NHM). (Engine 1)
06:04  KEYWORDS   Generates keywords; Match-Type Layer (Engine 11) sets each Exact/Phrase/Broad
                  with rationale; seeds negatives ("repair", "spare part"). (Engines 2, 11)
06:05  ADS        Ad Copy Factory writes RSA variants citing IS 14855, govt-supply experience,
                  OEM-authorized; generates callouts/sitelinks/snippets; scores them, discards
                  weak variants. (Engine 3)
06:06  AUDIENCE   Attaches a municipal/health-dept audience seeded from the Machine Buyer Engine
                  + GeM dept signals (Customer Match staged, not uploaded). (Engine 4)
06:07  LANDING    Maps ad groups to nhm-fogging-machine / gem-tender-support. LP Intel scores
                  pages; one scores 73 → flags FAQ + CTA gap, briefs Content Factory, marks that
                  ad group spend-blocked until ≥80. (Engine 13)
06:08  BUDGET     Proposes a Funnel C envelope line (e.g. +₹20,000) with reason/impact/confidence
                  — within the human-set Funnel C cap, no cross-funnel movement. (Engine 12)
06:09  DEPLOY     Deployment Engine pushes the whole structure into Google Ads as a PAUSED/draft
                  campaign (non-serving); writes a Deployment Record with rollback handles. (Engine 8)
06:10  NOTIFY     Admin notification: "New intent cluster (Funnel C: dengue/municipal) — draft
                  campaign ready. 1 ad group spend-blocked (landing page 73/100). Confidence 71."
─────────────────────────────────────────────────────────────────────────────────────────────
09:30  REVIEW     Admin opens Media Buyer Review → Funnel C tab → expands the draft: sees campaign
                  tree, keywords + why, scored ads, audience, the LP block, the budget line.
09:35  DECIDE     Approves the campaign + budget; fixes (or accepts the AI's brief for) the LP gap;
                  approves the Customer Match upload. (Governance Gate)
09:36  LAUNCH     On APPROVE, the engine enables the campaign (CampaignService.update ENABLED) and
                  commits the budget — the FIRST and ONLY moment spend becomes possible.
─────────────────────────────────────────────────────────────────────────────────────────────
DAILY  MONITOR    Optimization Engine watches the live campaign: mines search terms (promotes
                  converters to Exact, drafts new negatives), flags CPC drift / enquiry pace,
                  proposes ad swaps + budget nudges — all as approval-gated drafts. The remediated
                  landing page unblocks its ad group once it crosses 80. The cycle repeats.
```

**This proves the chain:** the AI *discovered* demand no one asked it to look for, *designed* a funnel-correct campaign, *built* every asset with explained match types and scored ads, *assembled* proprietary audiences, *respected* the landing-page and budget governance, *deployed* a non-serving draft, *notified* the admin, and after a single approval, *launched and now optimizes* it daily — never spending a rupee without the human yes. That is an AI Media Buyer, not a dashboard.

---

## 19. The Standard This Must Meet

The deliverable is an **AI Media Buyer for 100X Circle** — a system that, given the standing intent to win fogging/vector demand, recruit dealers, and sell machines, will independently design the campaign portfolio, write and score the ads, build the keywords with defensible match types, assemble proprietary audiences from Growth OS data, and stage the entire thing in Google Ads as drafts that a human approves in minutes.

It is not a dashboard. It is not a report. It is a strategist that does the work and asks only for the final yes.
