/**
 * Market Intelligence Director
 * Aggregates GSC, Ads, Lead, and GeM signals into scored opportunities
 * and a founder-level weekly briefing answering: What to sell? Where? Who? Which campaign?
 */
import { callLLM, ALL_PROVIDERS_UNAVAILABLE } from "@/lib/llm-client"
import clientPromise from "@/lib/mongodb"
import { logAgentRun } from "@/lib/growth-os/log-agent"

export type MIModelTier = "haiku" | "sonnet" | "opus"

const MODEL_IDS: Record<MIModelTier, string> = {
  haiku:  "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-6",
  opus:   "claude-opus-4-8-20251101",
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProductOpportunity {
  product:          string
  leadCount:        number
  brochureCount:    number
  searchClicks:     number
  opportunityScore: number   // 0-100
  momentum:         "rising" | "stable" | "low"
  insight:          string
}

export interface StateOpportunity {
  state:            string
  leadCount:        number
  brochureCount:    number
  opportunityScore: number   // 0-100
  coverageGap:      boolean  // high demand but likely underserved
  insight:          string
}

export interface CampaignBudgetScore {
  campaign:       string
  spend:          number
  clicks:         number
  conversions:    number
  cpa:            number
  recommendation: "increase" | "maintain" | "reduce" | "pause"
  score:          number  // 0-100, higher = more deserving of budget
  insight:        string
}

export interface FounderBriefing {
  whatToSell:               string
  whereToSell:              string
  whoToTarget:              string
  whichCampaignNeedsBudget: string
  topActionThisWeek:        string
  confidenceLevel:          "high" | "medium" | "low"
  dataQualityNote:          string
}

export interface MarketIntelligenceRun {
  runId:                string
  generatedAt:          string
  modelUsed:            string
  dateRange:            number
  dataSnapshot: {
    totalLeadsAnalyzed:  number
    totalSearchQueries:  number
    totalCampaigns:      number
    totalBrochureLeads:  number
    attributionLeads:    number
  }
  productOpportunities: ProductOpportunity[]
  stateOpportunities:   StateOpportunity[]
  campaignScores:       CampaignBudgetScore[]
  founderBriefing:      FounderBriefing
}

// ── Normalised product labels ─────────────────────────────────────────────────

const PRODUCT_MAP: Array<{ pattern: string; label: string }> = [
  { pattern: "thermal fog",      label: "Thermal Fogging Machine" },
  { pattern: "100x fgg",         label: "Thermal Fogging Machine" },
  { pattern: "fgg",              label: "Thermal Fogging Machine" },
  { pattern: "thermal fogger",   label: "Thermal Fogging Machine" },
  { pattern: "ulv",              label: "ULV Sprayer" },
  { pattern: "ultra low volume", label: "ULV Sprayer" },
  { pattern: "vehicle mount",    label: "Vehicle-Mounted Fogger" },
  { pattern: "vehicle-mount",    label: "Vehicle-Mounted Fogger" },
  { pattern: "truck mount",      label: "Vehicle-Mounted Fogger" },
  { pattern: "cold fog",         label: "Cold Fogger" },
  { pattern: "mist blow",        label: "Mist Blower" },
  { pattern: "sprayer",          label: "Agri Sprayer" },
  { pattern: "fogging machine",  label: "Thermal Fogging Machine" },
  { pattern: "fogger",           label: "Thermal Fogging Machine" },
]

const KNOWN_STATES: string[] = [
  "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh",
  "goa", "gujarat", "haryana", "himachal pradesh", "jharkhand", "karnataka",
  "kerala", "madhya pradesh", "maharashtra", "manipur", "meghalaya", "mizoram",
  "nagaland", "odisha", "punjab", "rajasthan", "sikkim", "tamil nadu",
  "telangana", "tripura", "uttar pradesh", "uttarakhand", "west bengal",
  "delhi", "jammu and kashmir", "ladakh",
]

function detectProduct(text: string): string | null {
  const t = text.toLowerCase()
  for (const { pattern, label } of PRODUCT_MAP) {
    if (t.includes(pattern)) return label
  }
  return null
}

function detectState(text: string): string | null {
  const t = text.toLowerCase()
  for (const state of KNOWN_STATES) {
    if (t.includes(state)) return state
  }
  return null
}

// ── Data gathering ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function gatherLeadData(db: any, daysBack: number) {
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()

  const [rfqLeads, attribLeads] = await Promise.all([
    db.collection("rfq_popup_leads")
      .find({ createdAt: { $gte: since } })
      .project({ answers: 1 })
      .toArray(),
    db.collection("revenue_attribution")
      .find({ createdAt: { $gte: since } })
      .project({ state: 1, product: 1 })
      .toArray(),
  ])

  const productCounts: Record<string, number> = {}
  const stateCounts:   Record<string, number> = {}

  for (const lead of rfqLeads) {
    const vals = Object.values(lead.answers ?? {}).map(v => String(v))
    for (const val of vals) {
      const p = detectProduct(val)
      if (p) productCounts[p] = (productCounts[p] ?? 0) + 1
      const s = detectState(val)
      if (s) stateCounts[s] = (stateCounts[s] ?? 0) + 1
    }
  }

  for (const lead of attribLeads) {
    if (lead.state) {
      const s = detectState(String(lead.state))
      if (s) stateCounts[s] = (stateCounts[s] ?? 0) + 1
      else {
        const normalized = String(lead.state).toLowerCase()
        stateCounts[normalized] = (stateCounts[normalized] ?? 0) + 1
      }
    }
    if (lead.product) {
      const p = detectProduct(String(lead.product))
      if (p) productCounts[p] = (productCounts[p] ?? 0) + 1
    }
  }

  return {
    rfqTotal:      rfqLeads.length,
    attribTotal:   attribLeads.length,
    productCounts,
    stateCounts,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function gatherBrochureData(db: any, daysBack: number) {
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()
  const leads  = await db.collection("brochure_leads")
    .find({ createdAt: { $gte: since } })
    .project({ productName: 1, state: 1 })
    .toArray()

  const byProduct: Record<string, number> = {}
  const byState:   Record<string, number> = {}
  for (const l of leads) {
    if (l.productName) {
      const p = detectProduct(String(l.productName)) ?? String(l.productName)
      byProduct[p] = (byProduct[p] ?? 0) + 1
    }
    if (l.state) {
      const s = detectState(String(l.state)) ?? String(l.state).toLowerCase()
      byState[s] = (byState[s] ?? 0) + 1
    }
  }
  return { total: leads.length, byProduct, byState }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function gatherSearchData(db: any) {
  const queries = await db.collection("gsc_query_rows")
    .find({ period: "current" })
    .sort({ clicks: -1 })
    .limit(50)
    .project({ query: 1, clicks: 1 })
    .toArray()

  const byProduct: Record<string, number> = {}
  for (const q of queries) {
    const p = detectProduct(String(q.query ?? ""))
    if (p) byProduct[p] = (byProduct[p] ?? 0) + (Number(q.clicks) || 0)
  }

  return { total: queries.length, byProduct, topQueries: queries.slice(0, 10) }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function gatherAdsData(db: any) {
  const rows = await db.collection("ads_campaign_rows")
    .find({})
    .sort({ syncDate: -1 })
    .limit(100)
    .toArray()

  // Keep most recent row per campaign
  const seen = new Set<string>()
  const deduped: Record<string, unknown>[] = []
  for (const r of rows) {
    if (!seen.has(r.campaignName)) {
      seen.add(r.campaignName)
      deduped.push(r)
    }
  }
  return deduped.slice(0, 15)
}

// ── Score computation ─────────────────────────────────────────────────────────

function buildProductOpportunities(
  leadData:    Awaited<ReturnType<typeof gatherLeadData>>,
  brochureData: Awaited<ReturnType<typeof gatherBrochureData>>,
  searchData:  Awaited<ReturnType<typeof gatherSearchData>>,
): ProductOpportunity[] {
  const allProducts = new Set([
    ...Object.keys(leadData.productCounts),
    ...Object.keys(brochureData.byProduct),
    ...Object.keys(searchData.byProduct),
  ])

  const maxL = Math.max(...Object.values(leadData.productCounts), 1)
  const maxB = Math.max(...Object.values(brochureData.byProduct), 1)
  const maxS = Math.max(...Object.values(searchData.byProduct), 1)

  return [...allProducts]
    .filter(p => p.length > 2)
    .map(product => {
      const lc = leadData.productCounts[product] ?? 0
      const bc = brochureData.byProduct[product] ?? 0
      const sc = searchData.byProduct[product] ?? 0
      const score = Math.round((lc / maxL) * 50 + (bc / maxB) * 30 + (sc / maxS) * 20)
      return {
        product,
        leadCount:        lc,
        brochureCount:    bc,
        searchClicks:     sc,
        opportunityScore: score,
        momentum:         (lc >= 5 ? "rising" : lc >= 1 ? "stable" : "low") as ProductOpportunity["momentum"],
        insight:          "",
      }
    })
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 10)
}

function buildStateOpportunities(
  leadData:    Awaited<ReturnType<typeof gatherLeadData>>,
  brochureData: Awaited<ReturnType<typeof gatherBrochureData>>,
): StateOpportunity[] {
  const allStates = new Set([
    ...Object.keys(leadData.stateCounts),
    ...Object.keys(brochureData.byState),
  ])

  const maxL = Math.max(...Object.values(leadData.stateCounts), 1)
  const maxB = Math.max(...Object.values(brochureData.byState), 1)

  return [...allStates]
    .filter(s => s.length > 2)
    .map(state => {
      const lc = leadData.stateCounts[state] ?? 0
      const bc = brochureData.byState[state] ?? 0
      const score = Math.round((lc / maxL) * 65 + (bc / maxB) * 35)
      return {
        state:            state.replace(/\b\w/g, c => c.toUpperCase()),
        leadCount:        lc,
        brochureCount:    bc,
        opportunityScore: score,
        coverageGap:      score > 30,
        insight:          "",
      }
    })
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 15)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildCampaignScores(campaigns: any[]): CampaignBudgetScore[] {
  return campaigns
    .filter(c => c.campaignName)
    .map(c => {
      const spend       = Number(c.spend) || 0
      const clicks      = Number(c.clicks) || 0
      const conversions = Number(c.conversions) || 0
      const cpa         = conversions > 0 ? Math.round(spend / conversions) : 0
      const ctr         = clicks > 0 && c.impressions ? clicks / Number(c.impressions) : 0

      let score = 0
      if (conversions > 0 && spend > 0) {
        score = Math.min(100, Math.round(
          Math.min(conversions / ((spend / 1000) + 0.01), 40) +  // conv per ₹1k
          Math.min(ctr * 500, 30) +                               // CTR signal
          (cpa > 0 && cpa < 500 ? 30 : cpa < 2000 ? 15 : 5),   // CPA quality
        ))
      } else if (clicks > 0) {
        score = Math.min(25, Math.round(ctr * 200))
      }

      const recommendation: CampaignBudgetScore["recommendation"] =
        score > 65 ? "increase" : score > 35 ? "maintain" : score > 10 ? "reduce" : "pause"

      return {
        campaign:       String(c.campaignName),
        spend,
        clicks,
        conversions,
        cpa,
        recommendation,
        score,
        insight:        "",
      }
    })
    .sort((a, b) => b.score - a.score)
}

// ── Claude synthesis ──────────────────────────────────────────────────────────

async function synthesize(
  products:    ProductOpportunity[],
  states:      StateOpportunity[],
  campaigns:   CampaignBudgetScore[],
  snapshot:    MarketIntelligenceRun["dataSnapshot"],
  tier:        MIModelTier,
): Promise<{
  founderBriefing: FounderBriefing
  products:        ProductOpportunity[]
  states:          StateOpportunity[]
  campaigns:       CampaignBudgetScore[]
}> {
  const productLines = products.slice(0, 6).map((p, i) =>
    `${i+1}. ${p.product}: ${p.leadCount} leads · ${p.brochureCount} brochures · ${p.searchClicks} search clicks · Score ${p.opportunityScore}/100 [${p.momentum}]`
  ).join("\n")

  const stateLines = states.slice(0, 8).map((s, i) =>
    `${i+1}. ${s.state}: ${s.leadCount} leads · ${s.brochureCount} brochures · Score ${s.opportunityScore}/100`
  ).join("\n")

  const campLines = campaigns.slice(0, 5).map((c, i) =>
    `${i+1}. ${c.campaign}: ₹${c.spend} spent · ${c.conversions} conv · CPA ₹${c.cpa || "N/A"} · Score ${c.score}/100`
  ).join("\n")

  const prompt = `You are Market Intelligence Director for 100X Circle — India's leading BIS-certified thermal fogging machine manufacturer (100xcircle.com).

Products: Thermal foggers (100X FGG), ULV sprayers, vehicle-mounted foggers.
Markets: Municipal corps, NHM/NVBDCP vector control, agriculture, pest control, industrial.
Certifications: BIS, IS 14855:2019, GeM OEM, MSME, Startup India.

DATA (last ${snapshot.totalLeadsAnalyzed > 0 ? "90" : "N/A"} days):
Leads: ${snapshot.totalLeadsAnalyzed} · Brochures: ${snapshot.totalBrochureLeads} · GSC queries: ${snapshot.totalSearchQueries} · Campaigns: ${snapshot.totalCampaigns}

PRODUCT DEMAND:
${productLines || "No product data available"}

STATE DEMAND:
${stateLines || "No state data available"}

CAMPAIGN PERFORMANCE:
${campLines || "No campaign data available"}

Synthesize into founder-level intelligence. Be specific — name products, states, campaign names. Avoid vague generalities.

Return ONLY JSON (no preamble):
{
  "what_to_sell": "Specific product + concrete reason (mention dengue season, tender cycle, or lead signal)",
  "where_to_sell": "Top 2 states with highest untapped demand + why (be specific)",
  "who_to_target": "Most valuable buyer segment + why they convert best",
  "which_campaign_needs_budget": "Exact campaign name if available + budget action + rationale",
  "top_action_this_week": "Single most impactful thing founder should do Monday morning (be very specific)",
  "confidence_level": "high|medium|low",
  "data_quality_note": "Honest 20-word note on data gaps",
  "product_insights": [{"product": "exact product name from list", "insight": "one-line signal reason"}],
  "state_insights": [{"state": "exact state name from list", "insight": "one-line opportunity reason"}],
  "campaign_insights": [{"campaign": "exact campaign name from list", "insight": "one-line budget rationale"}]
}`

  let raw: string
  try {
    raw = await callLLM(prompt, { model: MODEL_IDS[tier], maxTokens: 1500 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg !== ALL_PROVIDERS_UNAVAILABLE) console.warn("[market-intelligence] LLM failed:", msg)
    raw = "{}"
  }
  const json = raw.replace(/^```[a-z]*\n?/m, "").replace(/\n?```$/m, "").trim()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsed: any = {}
  try { parsed = JSON.parse(json) }
  catch { const m = json.match(/\{[\s\S]+\}/); if (m) { try { parsed = JSON.parse(m[0]) } catch { /* ignore */ } } }

  const founderBriefing: FounderBriefing = {
    whatToSell:               parsed.what_to_sell               ?? "Insufficient data — sync more leads",
    whereToSell:              parsed.where_to_sell              ?? "Insufficient data — sync more leads",
    whoToTarget:              parsed.who_to_target              ?? "Insufficient data — sync more leads",
    whichCampaignNeedsBudget: parsed.which_campaign_needs_budget ?? "No campaign data available",
    topActionThisWeek:        parsed.top_action_this_week       ?? "Sync leads and ads data to unlock recommendations",
    confidenceLevel:          parsed.confidence_level           ?? "low",
    dataQualityNote:          parsed.data_quality_note          ?? "Limited data — sync leads and ads to improve accuracy",
  }

  // Enrich each scored item with Claude's insight
  const piMap: Record<string, string> = {}
  for (const pi of (parsed.product_insights ?? [])) piMap[String(pi.product ?? "").toLowerCase()] = pi.insight ?? ""

  const siMap: Record<string, string> = {}
  for (const si of (parsed.state_insights ?? [])) siMap[String(si.state ?? "").toLowerCase()] = si.insight ?? ""

  const ciMap: Record<string, string> = {}
  for (const ci of (parsed.campaign_insights ?? [])) ciMap[String(ci.campaign ?? "").toLowerCase()] = ci.insight ?? ""

  return {
    founderBriefing,
    products:  products.map(p => ({ ...p, insight: piMap[p.product.toLowerCase()] ?? "" })),
    states:    states.map(s => ({ ...s, insight: siMap[s.state.toLowerCase()] ?? "" })),
    campaigns: campaigns.map(c => ({ ...c, insight: ciMap[c.campaign.toLowerCase()] ?? "" })),
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function runMarketIntelligence(input: {
  dateRange?: number
  model?:     MIModelTier
} = {}): Promise<MarketIntelligenceRun> {
  const daysBack = input.dateRange ?? 90
  const tier     = input.model    ?? "sonnet"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db       = (await clientPromise).db() as any
  const runId    = `mi_${Date.now()}`

  const [leadData, brochureData, searchData, adsData] = await Promise.all([
    gatherLeadData(db, daysBack),
    gatherBrochureData(db, daysBack),
    gatherSearchData(db),
    gatherAdsData(db),
  ])

  const snapshot: MarketIntelligenceRun["dataSnapshot"] = {
    totalLeadsAnalyzed:  leadData.rfqTotal + leadData.attribTotal,
    totalSearchQueries:  searchData.total,
    totalCampaigns:      adsData.length,
    totalBrochureLeads:  brochureData.total,
    attributionLeads:    leadData.attribTotal,
  }

  const rawProducts  = buildProductOpportunities(leadData, brochureData, searchData)
  const rawStates    = buildStateOpportunities(leadData, brochureData)
  const rawCampaigns = buildCampaignScores(adsData)

  const { founderBriefing, products, states, campaigns } =
    await synthesize(rawProducts, rawStates, rawCampaigns, snapshot, tier)

  const run: MarketIntelligenceRun = {
    runId,
    generatedAt:          new Date().toISOString(),
    modelUsed:            MODEL_IDS[tier],
    dateRange:            daysBack,
    dataSnapshot:         snapshot,
    productOpportunities: products,
    stateOpportunities:   states,
    campaignScores:       campaigns,
    founderBriefing,
  }

  await db.collection("market_intelligence_runs").insertOne({ ...run })

  await logAgentRun(db, {
    agent:          "Market Intelligence Director",
    action:         `Intelligence report — ${snapshot.totalLeadsAnalyzed} leads · ${snapshot.totalCampaigns} campaigns`,
    reason:         `Date range: ${daysBack} days · Model: ${tier}`,
    expectedImpact: "Founder has clear weekly priorities based on demand data",
    actualImpact:   `Confidence: ${founderBriefing.confidenceLevel} · Products: ${products.length} · States: ${states.length}`,
    level:          "success",
    module:         "ads",
  })

  return run
}
