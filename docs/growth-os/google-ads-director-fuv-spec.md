# Google Ads Director — First Usable Version (FUV) Specification

> Growth OS 4.0 — Build spec for `google-ads-director-ai.md` (Phases 1–2)
> Status: FUV spec for review · No production code until approved
> Scope owner: Funnel A (Dealer Acquisition) · Search-only

---

## 0. Purpose

Define the **smallest system** that takes a **demand signal** and produces a
**non-serving Google Ads draft campaign** with an admin approval request — safely,
end to end. Nothing in the FUV can spend money or serve traffic.

**The FUV must do exactly these eleven things:**

1. Detect demand (dealer-intent, validated against real GSC/Ads data).
2. Create a Search campaign (PAUSED / draft — non-serving).
3. Create ad groups.
4. Generate keywords.
5. Select match types — Exact / Phrase / Broad / Negative.
6. Generate RSA ads.
7. Generate landing-page recommendations.
8. Score campaign quality (Opportunity · Keyword · Ad Copy · Landing Page · Deployment Confidence).
9. Push the campaign into Google Ads as a **non-serving draft**.
10. Create an approval request in Growth OS.
11. Notify the admin.

**Hard limitations (explicitly out of FUV scope):**

| Excluded | Deferred to |
|---|---|
| Performance Max campaigns | later phase |
| YouTube campaigns | later phase |
| Funnels B (Machine Sales) & C (Govt Procurement) | after Funnel A proven |
| Customer Match uploads | Phase 5 (compliance-gated) |
| AI Search automation | Phase 5 (framework only) |
| Competitor campaigns | Phase 5 |
| Automated budget changes / Budget Allocation Engine | Phase 4 |
| Full Campaign Discovery Engine (multi-cluster autonomy) | Phase 3 |
| Landing-page **spend-block enforcement** | Phase 3 (FUV *generates* the rec only) |
| Optimization as draft mutations | Phase 4 (v1 read-only Director continues meanwhile) |

**Objective:** the fastest, safest path from **Demand Signal → Draft Campaign**.

---

## A. Inputs

| Input | Source (existing) | Role in FUV |
|---|---|---|
| **Dealer-intent seed terms** | curated seed list (config) | the Funnel A theme vocabulary (e.g. "fogging machine dealership", "OEM authorization", "GeM reseller") |
| **GSC query rows** | `gsc_query_rows` (live, syncing) | validate which dealer-intent terms have *real* impressions/clicks |
| **Ads search-term rows** | `ads_searchterm_rows` (if synced) | confirm queries already reaching the account; spot converters |
| **100X dealer landing pages** | site routes (live) | map ad groups → pages: `/become-a-dealer`, `/gem-oem-authorization`, `/dealers-and-government`, `/gem-tender-support` |
| **Geo intent** | Dealer Opportunity Engine state ranking + GeM demand | geo-targeting (India; weight UP / MH / Delhi / Bihar) |
| **Ads account settings** | `getAdsSettings()` (`lib/google-ads`) | customerId / loginCustomerId for the mutate calls |
| **Config** | new `ads-fuv-config.ts` | seed terms, match-type heuristics, RSA asset bank, negative list, versioned |

**Demand detection (FUV-minimal):** not the full Discovery Engine. The FUV cross-
checks the **dealer-intent seed list** against `gsc_query_rows` (and
`ads_searchterm_rows` when present). A seed term with real impressions/clicks
qualifies as "demand detected." All qualifying terms cluster into **one** campaign:
*"Funnel A — Dealer Acquisition — Search."* (Multi-cluster autonomy = Phase 3.)

---

## B. Processing flow

```
[1] DETECT DEMAND
    seed dealer-intent terms ✕ gsc_query_rows / ads_searchterm_rows
    → keep terms with real demand → one cluster: "Dealer Acquisition — Search" (Funnel A)
                       │
[2] DESIGN CAMPAIGN (config-driven, deterministic for FUV)
    campaign shell (Search, PAUSED, inert budget) + 3 ad groups by sub-intent:
      • Dealer Program     • OEM Authorization     • GeM Reseller
                       │
[3] GENERATE KEYWORDS  (per ad group, from qualifying terms + catalogue expansion)
                       │
[4] SELECT MATCH TYPES  (Exact / Phrase / Broad / Negative + rationale; §G heuristics)
    + seed campaign-level NEGATIVES (exclude Funnel B/C + junk intent)
                       │
[5] GENERATE RSA ADS   (per ad group: ≥10 headlines, ≥3 descriptions, callouts,
                         sitelinks, structured snippets — scored, weak variants dropped)
                       │
[6] LANDING-PAGE RECOMMENDATION  (map each ad group → page, score 0–100,
                                  list gaps; attach to the approval request — advisory in FUV)
                       │
[7] DEPLOY AS DRAFT  (lib/google-ads MUTATE → create non-serving entities;
                      write ads_deployments record with rollback handles)
                       │
[8] APPROVAL REQUEST  (write to growth_opportunities + ads_campaign_plans;
                       full campaign tree + exec header)
                       │
[9] NOTIFY ADMIN  (growth_os_opportunities card + growth_os_logs; appears in
                   Media Buyer Review / Contact-This-Week-style queue)
                       │
                 ── HUMAN: APPROVE / REJECT / MODIFY ──
```

Steps 1–6 are **automatic** (no spend, no serving). Step 7 creates **non-serving**
Google Ads entities. Steps 8–9 ask the human. Only a later APPROVE can enable.

---

## C. Outputs

| Output | Where | Notes |
|---|---|---|
| One **draft Search campaign** (Funnel A) | Google Ads (PAUSED/draft) | non-serving; inert budget |
| **Deployment Record** | `ads_deployments` | resource_names + rollback handles + state + **quality scores** |
| **Campaign Plan** | `ads_campaign_plans` | tree + exec header (Confidence/ROI/Risk/Priority) |
| **Keyword set** w/ match types + rationale | `ads_keyword_sets` | per keyword: why this match type |
| **Scored RSA variants** | `ads_ad_variants` | with Ad-Strength/relevance/policy scores |
| **Landing-page recommendation** | `ads_landing_recommendations` | page + score + gaps (advisory) |
| **Campaign Quality Scores** | `ads_deployments` (embedded) | see §I |
| **Approval request** | `growth_opportunities` (+ card in `growth_os_opportunities`) | APPROVE/REJECT/MODIFY |
| **Admin notification** | queue + `growth_os_logs` | actionable, with summary |
| **Audit record** | `growth_os_logs` (AgentRun) | versioned, immutable |

---

## D. Google Ads entities created (all non-serving)

| Order | API service | Entity | State / safety |
|---|---|---|---|
| 1 | `CampaignBudgetService` | Campaign budget | created but **inert** (campaign paused) |
| 2 | `CampaignService` *(or `CampaignDraftService`)* | Search campaign | **PAUSED** (or true Draft); never ENABLED by AI |
| 3 | `AdGroupService` | 3 ad groups | within paused campaign |
| 4 | `AdGroupCriterionService` | keywords (Exact/Phrase/Broad) | per ad group |
| 5 | `AdGroupCriterionService` | **negative** keywords | exclude wrong intent |
| 6 | `CampaignCriterionService` | geo targeting (India + weighted states) + campaign negatives | — |
| 7 | `AdGroupAdService` | RSA ad(s) | per ad group |
| 8 | `AssetService` / extensions | callouts, sitelinks, structured snippets | linked |

**Not created in FUV:** PMax/YouTube assets, Customer Match user lists, audiences,
bid-strategy changes. **`status=ENABLED` is never called by the AI** — enabling is a
human action after approval.

---

## E. Approval workflow

```
AI deploys draft ─► Approval request appears in Media Buyer Review (Funnel A tab)
   card shows: campaign → 3 ad groups → keywords (+match type +why) → scored RSAs
               → landing-page recs+scores → inert budget → exec header
                         │
        ┌────────────────┼─────────────────────────────┐
     APPROVE           MODIFY                          REJECT
        │                │                               │
 human enables the   AI regenerates only the          rollback (see F):
 campaign (status     flagged part (e.g. retighten     remove the draft
 ENABLED) + commits   a match type, swap a low-scoring  entities, mark plan
 budget — the FIRST   ad, fix LP rec) and re-stages     "rejected", log
 moment spend is      the draft for re-review
 possible
```

- **APPROVE** = the only path to serving. Executes `CampaignService.update
  status=ENABLED` + budget commit. Logged as a human-authorized AgentRun.
- **MODIFY** = targeted regeneration; campaign stays a draft.
- **REJECT** = triggers rollback (F). Nothing ever served, so nothing to claw back.
- Reuses the existing `opportunity-action` mutation + audit pattern.

---

## F. Rollback workflow

Every deploy writes an `ads_deployments` record:
```
{ deploymentId, funnel:"A", campaignPlanId, syncCustomerId,
  resourceNames: { campaignBudget, campaign, adGroups[], criteria[], ads[], extensions[] },
  state: "draft" | "paused", createdAt, status: "pending|approved|rolled_back",
  qualityScores: {
    opportunityScore: 0-100,       // demand signal strength
    keywordQualityScore: 0-100,    // match-type coverage, negatives, intent precision
    adCopyQualityScore: 0-100,     // RSA headline/description coverage and strength
    landingPageScore: 0-100,       // LP relevance, CTA, trust signals
    deploymentConfidence: 0-100,   // weighted composite of above four
    recommendation: "recommended_for_deployment" | "needs_review"
  }
}
```
**On REJECT (or a bad draft):**
1. Remove created entities in safe order via mutate `remove` (ads → criteria →
   ad groups → campaign → budget), or set the paused campaign + children to `REMOVED`.
2. Mark the `ads_campaign_plans` record `rejected`; mark deployment `rolled_back`.
3. Log an immutable AgentRun with the removed resource_names.

**Safety guarantees:** entities were **non-serving**, so rollback never affects live
spend. Rollback is **idempotent** (re-running skips already-removed handles). If a
remove fails, the campaign **remains PAUSED** (still non-serving) and is flagged for
manual cleanup — the failure mode is "stuck draft," never "unwanted spend."

---

## G. Example — campaign generated from real dealer-intent keywords (Funnel A)

> Illustrative output the FUV would produce and stage for approval.

**Campaign:** `100X | Funnel A | Dealer Acquisition | Search` — Search, **PAUSED**,
budget ₹500/day *(inert until approved)*, geo: India (bid-weighted UP, Maharashtra,
Delhi, Bihar), exec header: Confidence 74 · ROI High · Risk Low · Priority Important.

**Ad group 1 — Dealer Program**
| Keyword | Match | Why |
|---|---|---|
| `[fogging machine dealership]` | Exact | high commercial dealer intent; protect efficiency |
| `[thermal fogging machine distributor]` | Exact | proven dealer term |
| `"fogging machine dealer"` | Phrase | catch variants ("become fogging machine dealer") |
| `"fogging machine dealership opportunity"` | Phrase | intent + variants |
| `fogging machine franchise` | Broad | discovery, guarded by negatives |

**Ad group 2 — OEM Authorization**
| Keyword | Match | Why |
|---|---|---|
| `[oem authorization fogging machine]` | Exact | specific high-intent |
| `"oem authorized fogging machine supplier"` | Phrase | variant capture |
| `"fogging machine oem partnership"` | Phrase | dealer/OEM intent |

**Ad group 3 — GeM Reseller**
| Keyword | Match | Why |
|---|---|---|
| `[gem fogging machine reseller]` | Exact | GeM dealer intent |
| `"gem reseller fogging machine"` | Phrase | variants |
| `"fogging machine gem seller registration"` | Phrase | tender/reseller onboarding intent |

**Campaign negatives (exclude wrong intent / other funnels):**
`-price`, `-buy`, `-repair`, `-spare parts`, `-second hand`, `-rent`,
`-how to use`, `-[machine sales consumer terms]` *(keep Funnel B/C demand out of A)*.

**RSA — Ad group 1 (scored; weak variants dropped):**
- Headlines: "Become a 100X Dealer" · "Fogging Machine Dealership" · "OEM Authorized Brand" · "GeM-Listed Manufacturer" · "Pan-India Dealer Network" · "IS 14855 Certified" · "Govt Supply Experience" · "High-Margin Dealership" · "Apply for Dealership" · "Trusted Fogging OEM"
- Descriptions: "Partner with a leading Indian fogging machine manufacturer. Apply for dealership today." · "OEM authorization, GeM support, pan-India network. Become a 100X dealer." · "IS 14855 certified machines, government supply experience, strong margins."
- Callouts: "OEM Authorized" · "GeM Listed" · "Pan-India Dealers" · "Govt Supply Experience"
- Sitelinks: Become a Dealer · OEM Authorization · GeM Support · Product Range
- Structured snippets: Products — Thermal Foggers, ULV Foggers, Vehicle-Mounted, Sprayers

**Landing-page recommendations (advisory in FUV):**
| Ad group | Mapped page | Score | Gaps flagged |
|---|---|---|---|
| Dealer Program | `/become-a-dealer` | 84 | OK — strong CTA + form |
| OEM Authorization | `/gem-oem-authorization` | 73 | add FAQ schema + "How OEM authorization works" + sticky CTA |
| GeM Reseller | `/dealers-and-government` | 78 | add GeM-registration steps + trust signals |

**Approval request (Growth OS):** "New draft campaign — *Funnel A: Dealer
Acquisition (Search)*. 3 ad groups, 11 keywords, 1 LP gap (gem-oem-authorization
73/100). Confidence 74. Review → Approve to launch." → card in the Media Buyer
Review queue; admin notified.

**If approved:** human enables the campaign + commits the ₹500/day budget — the first
moment spend is possible. **If rejected:** the three ad groups, keywords, ads, and
campaign are removed via the Deployment Record; nothing ever served.

---

## I. Campaign Quality Scoring

Every generated campaign is scored before the approval request is created.
Scores are stored with the Deployment Record and displayed prominently in the
Approval Queue. They are advisory — they do not block submission — but the
recommendation badge signals to the admin whether the campaign needs extra review.

### Scores (all 0–100)

| Score | What it measures | Inputs |
|---|---|---|
| **Opportunity Score** | Strength of the demand signal that triggered this campaign | Count + total impressions of seed terms with real GSC data; bonus for Ads search-term coverage; bonus from Dealer Engine opportunity count |
| **Keyword Quality Score** | Health of the keyword set | Match-type coverage (Exact + Phrase + Broad all present = max); negative completeness; keyword count per ad group; average intent specificity |
| **Ad Copy Quality Score** | RSA coverage and strength | Headline count (≥10 = full marks on that dimension); description count (≥3); character utilization; extension count (callouts + sitelinks) |
| **Landing Page Score** | LP relevance and conversion readiness | Page→ad-group alignment; CTA presence; trust signals; gap count (each unfixed gap deducts points) |
| **Deployment Confidence** | Composite readiness signal | Weighted average: Opportunity 30% + Keyword 25% + Ad Copy 25% + Landing Page 20%; penalty if GSC data > 14 days stale |

### Final recommendation

| Recommendation | Condition |
|---|---|
| **Recommended for Deployment** | `deploymentConfidence ≥ 65` AND `landingPageScore ≥ 60` |
| **Needs Review** | Any score below those thresholds |

"Needs Review" does not block deployment — it signals the admin to examine the
flagged dimensions before approving. Each score below threshold shows a specific
gap (e.g. "only 2 Exact keywords — add more high-intent exact terms").

### Storage
Scores are embedded in `ads_deployments.qualityScores` and copied to the
`ads_campaign_plans` exec header so they appear in the Approval Queue without
a separate lookup.

---

## H. Definition of Done (FUV)

The FUV is complete when, on the real account (developer token at Basic Access):
1. A demand check produces a qualifying Funnel-A cluster from live GSC/Ads data.
2. The system stages a complete **non-serving** Search draft (campaign → ad groups →
   keywords + match types → scored RSAs → negatives → geo) in Google Ads.
3. A landing-page recommendation is attached (advisory).
4. Campaign quality scores (Opportunity / Keyword / Ad Copy / Landing Page /
   Deployment Confidence) are computed and stored with the Deployment Record.
5. The Approval Queue shows the recommendation badge ("Recommended for Deployment"
   or "Needs Review") alongside per-score breakdowns and gap explanations.
6. An approval request + admin notification appear in Growth OS.
7. APPROVE enables + commits budget; REJECT cleanly rolls back; both are audited.
8. No code path can serve traffic or spend without the human APPROVE click.

**This proves Demand Signal → Draft Campaign — the smallest safe media-buyer loop.**
Phases 3–5 then layer Discovery autonomy, budget allocation, optimization-as-drafts,
audiences, and competitor/AI-search onto the same governed spine.
