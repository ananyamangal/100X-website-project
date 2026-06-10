# Google Ads Director (AI Media Buyer) — Implementation Roadmap

> Growth OS 4.0 — Implementation planning for `google-ads-director-ai.md`
> Status: Roadmap for review · No production code until approved
> Planning: Claude Opus · Implementation: Claude Sonnet

---

## 0. How to read this

This is a build plan, not a design doc. It translates the approved AI Media Buyer
architecture into phases, dependencies, effort, required APIs/credentials/screens/
collections/crons/approval workflows, and a recommended **shortest path to the
first usable version**.

**Effort scale** (one engineer + AI pair, focused days):
`S` ≤1d · `M` 2–3d · `L` 4–6d · `XL` 7–10d. Estimates assume credentials are in
hand; the credential lead time (§5) is the real schedule risk, not code.

**The first usable version (FUV) we are optimizing for:**
> "AI creates complete Google Ads campaigns as drafts, notifies admin, and
> continuously optimizes recommendations."

Everything below is sequenced to reach the FUV fast, then expand.

---

## 1. Current reality (what already exists — do not rebuild)

| Capability | State | Implication for the roadmap |
|---|---|---|
| Google OAuth (`lib/google-oauth`) | ✅ tokens, refresh, `getValidAccessToken` | Reuse; needs `adwords` scope re-consent |
| Google Ads **read** (`lib/google-ads`) | ✅ `searchAds`, `QUERIES`, `getAdsSettings`, dev-token check | Extend with **mutate**; read layer done |
| Ads sync (`/api/admin/ads/sync`) | ✅ campaigns/keywords/search-terms/CPC/CTR/conversions → `ads_*` | Reuse as Optimization sensing layer |
| v1 Director (read-only) | ✅ recommendations on `ads_*` | Becomes Optimization Engine substrate |
| Search Console (`lib/gsc`, `gsc-sync`) | ✅ OAuth + 28-day sync + daily cron | "Completion" = scope + prod-cron verification |
| Governance/approval UX | ✅ Contact This Week + `opportunity-action` | Reuse pattern for the Approval Queue |
| Demand engines (Dealer / Machine Buyer) | ✅ live | Audience + funnel seeds (Phase 5 / cross-cut) |

**Net new core capability the whole plan hinges on:** turning `lib/google-ads`
from **read-only into read+mutate** (create non-serving entities) + a reversible
Deployment Record. That is the spine of Phase 1.

---

## 2. Cross-cutting requirements

### 2.1 Required Google APIs

| API | Used by | Phase | Notes |
|---|---|---|---|
| **Google Ads API** (v17+) | Draft creation, keywords, ads, audiences, optimization, sync | 1+ | Needs developer token (§5) |
| **Search Console API** | Keyword demand, content gaps | 1 | Already integrated |
| **Google Analytics (GA4)** | Conversion/enquiry signals (optional) | 4 | GA4 integration already exists |
| **Google Business Profile API** | GBP opportunities (Engine 6) | 5+ | New; later |
| External LLM APIs (GPT/Gemini/Claude/Perplexity) | AI-search visibility (Engine 7) | 5+ | Deferred — framework only, no paid probing yet |

### 2.2 Required credentials  ⚠️ schedule-critical

| Credential | For | Lead time / risk |
|---|---|---|
| OAuth client id/secret | All Google APIs | ✅ already configured (prod) |
| Refresh token with **`adwords` scope** | Ads API | Re-consent required (existing token is webmasters-only) — **hours** |
| **`GOOGLE_ADS_DEVELOPER_TOKEN`** | Ads API access | **DAYS–WEEKS** — apply in Google Ads API Center; starts as *test-account only*, then **Basic Access** approval needed to touch the real account. **#1 external blocker.** |
| `login-customer-id` (MCC) + `customer-id` | Target the 100X account | Minutes once dev token exists; `getAdsSettings` already models this |
| `CRON_SECRET` | Securing crons | Minutes (Vercel env) |

> **Critical-path note:** Phase 1 *code* can be built and tested against a Google
> Ads **test account** while Basic Access is pending. Production drafts on the real
> account are blocked until the developer token reaches Basic Access. Apply for the
> token **on day 1**, in parallel with Phase 1 build.

### 2.3 Required admin screens (control surfaces, not dashboards)

| Screen | Phase | Purpose |
|---|---|---|
| **Media Buyer Review** (Approval Queue) | 1 | Approve/Reject/Modify a full campaign draft tree |
| **Deployment & Rollback** | 1 | What was pushed to Google Ads + one-click rollback |
| **Notifications inbox** | 1 (reuse queue) | Actionable alerts; mirror to `growth_os_opportunities` |
| **Budget Envelopes** | 4 | Human-set per-funnel caps the AI allocates within |
| (Discovery review folds into the Approval Queue) | 3 | New-cluster drafts appear as queue items |

### 2.4 Required database collections (funnel-stamped)

| Collection | Phase | Holds |
|---|---|---|
| `ads_deployments` | 1 | Deployment manifest + rollback handles + draft/paused state |
| `ads_director_decisions` | 1 | Unified decision log (exec header + evidence + version) |
| `ads_campaign_plans` | 1–3 | Designed campaigns (archetype, funnel, status) |
| `ads_keyword_sets` | 2 | Keyword + match type + rationale + lifecycle |
| `ads_ad_variants` | 2 | RSA/extension variants + scores |
| `ads_clusters` | 3 | Discovered intent/demand/geo/competitor/procurement clusters |
| `ads_landing_recommendations` | 3 | Page mapping + score + gaps + spend-block state |
| `ads_budget_allocations` | 4 | Channel × funnel allocation + reason/impact/confidence |
| `ads_optimizations` | 4 | Daily proposed changes + approval state |
| `ads_audiences` | 5 | Definitions + customer-match staging + compliance flags |
| (existing) `ads_*` sync rows, `growth_os_logs/opportunities` | — | Reuse |

### 2.5 Required cron schedules (Vercel, under existing pattern)

| Cron | Schedule | Phase | Job |
|---|---|---|---|
| `ads-sync` | daily ~01:00 | 1 | Refresh `ads_*` (extend existing sync to cron) |
| `gsc-sync` | daily 05:00 | 1 | ✅ already shipped (feeds keyword demand) |
| `ads-discovery` | daily ~06:00 | 3 | Cluster detection → draft campaigns |
| `ads-optimization` | daily ~07:00 | 4 | Mine terms, negatives, ad swaps, bid/budget drafts |
| `ads-landing-scan` | weekly Mon | 3 | Re-score landing pages, refresh spend-blocks |
| `ads-budget-review` | weekly Mon | 4 | Propose channel × funnel reallocation |

> **Pre-req for all crons:** confirm Vercel Cron can reach `/api/admin/*` routes
> (middleware gates by session). Set `CRON_SECRET` and verify, same caveat as the
> existing procurement/opportunity crons. (One-time infra check, Phase 1.)

### 2.6 Required approval workflows

| Workflow | Gate | Phase |
|---|---|---|
| **Draft approval** (campaign tree) | APPROVE → enable; REJECT → rollback; MODIFY → regenerate | 1 |
| **Campaign enable** | `CampaignService.update status=ENABLED` only post-approve | 1 |
| **Budget commit / increase >10%** | explicit human confirm | 4 |
| **Cross-funnel budget movement** | separate human decision | 4 |
| **Customer Match upload** | compliance + human approve before upload | 5 |
| **Landing-page <80 override** | human justification to unblock spend | 3 |

All reuse the `opportunity-action` mutation pattern + `AgentRun` audit logging.

---

## 3. Phase plan

Each phase: scope · deliverables · **Business Value · Complexity · Risk · Dependencies** · effort.

### PHASE 1 — Foundation: Auth + Draft Creation  → *the FUV backbone*
**Scope:** `adwords` scope re-consent; extend `lib/google-ads` with **mutate**
(create budget [inert], campaign [PAUSED / Search draft], ad group, keywords,
negatives, a minimal RSA) for **one funnel, Search only**; Deployment Record +
rollback; Approval Queue screen; Search Console completion (scope verify + confirm
prod cron). Manually-specified campaign input is fine here — Discovery comes later.
**Deliverables:** push a hand-specified Search campaign into Google Ads as a draft,
see it in the Approval Queue, approve → enable, reject → clean rollback.
- **Business value:** High (unlocks the entire media-buyer capability)
- **Complexity:** L (mutate API + non-serving guarantees + rollback)
- **Risk:** High — *external*: developer-token Basic Access; *technical*: draft vs.
  paused asymmetry, idempotent rollback. Mitigate: build against test account first.
- **Dependencies:** §5 credentials (dev token, adwords scope)
- **Effort:** **L–XL** · APIs: Ads (mutate), GSC · Collections: `ads_deployments`,
  `ads_director_decisions`, `ads_campaign_plans` · Cron: `ads-sync` · Screen: Approval Queue + Deployment/Rollback

### PHASE 2 — Make the draft *intelligent*: Keyword + Match-Type + Ad Copy
**Scope:** Keyword Intelligence (generate from GSC/search-terms/GeM/catalogue);
Match-Type Intelligence (Exact/Phrase/Broad/Negative + rationale + lifecycle);
Ad Copy Factory (scored RSA variants + extensions). Feeds the Phase-1 deployment
so a *complete, well-built* campaign drafts automatically from a chosen theme.
- **Business value:** High (this is the "senior strategist" quality leap)
- **Complexity:** M–L (generation + scoring heuristics, config-driven)
- **Risk:** Medium — ad policy compliance, match-type discipline. Mitigate: scoring
  + policy checks before queueing; config-driven thresholds.
- **Dependencies:** Phase 1
- **Effort:** **L** · APIs: Ads, GSC · Collections: `ads_keyword_sets`, `ads_ad_variants`

> ✅ **End of Phase 2 = FIRST USABLE VERSION.** AI builds a complete Search
> campaign (keywords + match types + scored ads + negatives) as a draft, notifies
> admin, admin approves → launches; v1 Director continues optimization
> *recommendations*. The shortest path stops here for v1. (See §4.)

### PHASE 3 — Autonomy: Campaign Discovery + Landing Page Intelligence
**Scope:** Discovery Triggers (cluster detection across the six signal types →
auto-design draft campaigns, per funnel); Landing Page Intelligence (map → score →
≥80 spend-block gate → Content-Factory briefs). This makes the AI *find* campaigns,
not just build ones it's told to.
- **Business value:** High (true media-buyer autonomy + conversion protection)
- **Complexity:** L (clustering + opportunity estimation + LP scoring)
- **Risk:** Medium — false-positive clusters, LP-score calibration. Mitigate:
  thresholds + everything still draft + approval-gated.
- **Dependencies:** Phases 1–2; demand engines + GSC (have)
- **Effort:** **L** · Collections: `ads_clusters`, `ads_landing_recommendations` ·
  Crons: `ads-discovery`, `ads-landing-scan`

### PHASE 4 — Capital + Continuous: Budget Allocation + Optimization
**Scope:** Budget Allocation Engine (channel × funnel, ring-fenced envelopes,
reason/impact/confidence; >10% & cross-funnel gated); Optimization Engine (promote
Phase-0 v1 recommendations into *draft mutations*: negatives, ad swaps, bid/budget
proposals, daily). Budget Envelopes screen.
- **Business value:** High (efficiency + hands-off daily management)
- **Complexity:** M–L (allocation model + safe optimization drafts)
- **Risk:** Medium — budget mistakes. Mitigate: envelopes + >10% approval + never
  auto-applied to live spend.
- **Dependencies:** Phases 1–3; ads sync history
- **Effort:** **L** · Collections: `ads_budget_allocations`, `ads_optimizations` ·
  Crons: `ads-optimization`, `ads-budget-review` · Screen: Budget Envelopes

### PHASE 5 — Edge: Audience + Competitor + AI-Search
**Scope:** Audience Intelligence (Dealer/GeM Customer Match — compliance-gated —
+ remarketing + custom-intent); Competitor Intelligence lens into Discovery; AI
Search visibility integration (framework only, no paid probing yet).
- **Business value:** Medium–High (compounding, structural advantage)
- **Complexity:** L (Customer Match PII/compliance, competitor data plumbing)
- **Risk:** Medium-High — PII/consent compliance for Customer Match. Mitigate:
  hashed upload, eligibility checks, explicit upload approval.
- **Dependencies:** Phases 1–4; Competitor Intel (L10) + AI-Search (L4) frameworks
- **Effort:** **L–XL** · Collections: `ads_audiences` · APIs: Ads (user lists),
  later GBP + LLM APIs

---

## 4. Recommended shortest path to the first usable version

**Goal:** *"AI creates complete Google Ads campaigns as drafts, notifies admin, and
continuously optimizes recommendations."*

**Shortest path = Phase 1 + Phase 2 only.** Everything else is expansion.

```
Day 0      Apply for Google Ads developer token (external clock starts) + adwords re-consent
Phase 1    Mutate foundation + draft creation + Approval Queue + rollback   (build on TEST account
           while Basic Access pends)  → GSC completion verify
Phase 2    Keyword + Match-Type + Ad Copy Factory feeding the draft
─────────────────────────────────────────────────────────────────────────────────────────────
FUV ACHIEVED:  AI builds a complete Search campaign (keywords + match types + scored RSA +
               negatives) as a DRAFT → notifies admin → admin approves → launches.
               "Continuously optimizes recommendations" is already satisfied by the v1
               read-only Director running daily on the synced account.
```

**Why this is genuinely usable:** it delivers a complete, approval-gated, draft-
creating media buyer for the **highest-value single funnel first** (recommend
**Funnel A — Dealer Acquisition**, since dealer/OEM recruitment is the stated top
business priority and the Dealer Engine already supplies the targeting intent).
Discovery, budget allocation, landing-page gating, audiences, and competitor/AI
lenses then layer on without re-architecting — each is additive behind the same
Governance Gate.

**Scope discipline for the FUV (cut to go fast):** Search only (no PMax/YouTube);
one funnel; manual or single-cluster campaign input (full Discovery in Phase 3);
optimization stays *recommendations* (v1) until Phase 4 turns them into draft
mutations.

---

## 5. Critical path, risks, and the one thing to start today

```
DEVELOPER TOKEN (Basic Access)  ──────────────► gates PRODUCTION drafts on the real account
   apply day 0  ·  test-account build in parallel  ·  approval days–weeks (Google)

Phase1 mutate+rollback ─► Phase2 keyword/match/ads ─► FUV
                                     └─► Phase3 discovery/LP ─► Phase4 budget/opt ─► Phase5 edge
```

| Risk | Severity | Mitigation |
|---|---|---|
| Developer-token approval latency | High (schedule) | Apply day 0; build/test on a Google Ads test account meanwhile |
| `adwords` scope re-consent | Low | One re-auth; OAuth plumbing exists |
| Draft vs. paused asymmetry (PMax/YT) | Medium | FUV is Search-only (true drafts); paused-with-inert-budget for others later |
| Mutate causing accidental spend | High | Non-serving guarantee + enable is human-only + rollback + test-account first |
| Cron reachability under `/api/admin/*` middleware | Medium | One-time infra check + `CRON_SECRET` (Phase 1) |
| Customer Match PII/compliance | Medium-High | Phase 5; hashed, eligibility-checked, upload-approved |
| Landing-page-score false gating | Low-Medium | Override workflow + calibration |

**Start today:** (1) apply for the Google Ads API developer token, (2) re-consent
OAuth with the `adwords` scope, (3) confirm the target customer/MCC IDs. These have
external lead time; the code does not.

---

## 6. Summary table

| Phase | Theme | BV | Complexity | Risk | Effort | Unlocks |
|---|---|---|---|---|---|---|
| 1 | Auth + Draft Creation | High | L | High (ext) | L–XL | drafts + approval + rollback |
| 2 | Keyword + Match-Type + Ad Copy | High | M–L | Med | L | **FUV** |
| 3 | Discovery + Landing Page | High | L | Med | L | autonomy |
| 4 | Budget + Optimization | High | M–L | Med | L | capital + daily |
| 5 | Audience + Competitor + AI-Search | Med–High | L | Med-High | L–XL | edge |

**Recommendation:** approve **Phases 1–2 as the first build**, start the developer-
token application immediately, target the FUV on **Funnel A (Dealer Acquisition),
Search-only**, then expand through Phases 3–5 behind the same Governance Gate.
