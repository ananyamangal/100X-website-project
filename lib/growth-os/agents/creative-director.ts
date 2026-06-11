/**
 * Creative Director Agent
 * Generates scored Google Ads RSA assets across 8 persuasion frameworks.
 * Learns from performance data to weight future generation.
 */
import Anthropic from "@anthropic-ai/sdk"
import clientPromise from "@/lib/mongodb"
import { logAgentRun } from "@/lib/growth-os/log-agent"

// ── Types ─────────────────────────────────────────────────────────────────────

export type PersuasionFramework =
  | "authority" | "urgency" | "risk_reduction" | "government"
  | "dealer_growth" | "revenue" | "compliance" | "trust"

export type AssetType =
  | "headline" | "description" | "callout" | "snippet" | "sitelink" | "image_concept"

export type CampaignObjective =
  | "dealer_acquisition" | "oem_authorization" | "gem_tender"
  | "brand_awareness" | "machine_sales"

export type AudienceType =
  | "government_buyers" | "dealers" | "pest_control"
  | "agriculture" | "industrial" | "mixed"

export interface CreativeDirectorInput {
  product:        string
  landingPage:    string
  objective:      CampaignObjective
  audience:       AudienceType
  keywordCluster: string[]
  notes?:         string
}

export interface AssetScore {
  ctrPotential:      number  // 0-10
  authority:         number  // 0-10
  urgency:           number  // 0-10
  commercialIntent:  number  // 0-10
  conversionImpact:  number  // 0-10
  composite:         number  // weighted composite
}

export interface ScoredAsset {
  text:            string
  framework:       PersuasionFramework
  type:            AssetType
  scores:          AssetScore
  charCount:       number
  withinLimit:     boolean
  keywordsMatched: string[]
  rationale?:      string
}

export interface SiteLink {
  title:        string
  description1: string
  description2: string
  url?:         string
  framework:    PersuasionFramework
  scores:       AssetScore
}

export interface StructuredSnippet {
  header: string
  values: string[]
}

export interface ImageConcept {
  concept:     string
  visualHook:  string
  textOverlay: string
  cta:         string
  framework:   PersuasionFramework
}

export interface CreativeDirectorRun {
  runId:            string
  input:            CreativeDirectorInput
  headlines:        ScoredAsset[]
  descriptions:     ScoredAsset[]
  callouts:         ScoredAsset[]
  snippets:         StructuredSnippet[]
  sitelinks:        SiteLink[]
  imageConcepts:    ImageConcept[]
  topHeadlines:     ScoredAsset[]    // top 15 by composite
  topDescriptions:  ScoredAsset[]    // top 5 by composite
  frameworkCounts:  Record<PersuasionFramework, number>
  generatedAt:      string
  modelUsed:        string
  totalTokens:      number
  learningsApplied: string[]
}

// ── Character limits ──────────────────────────────────────────────────────────

const CHAR_LIMITS: Record<string, number> = {
  headline:     30,
  description:  90,
  callout:      25,
  sitelink:     25,
  sitelink_desc: 35,
}

// ── Power words per dimension ─────────────────────────────────────────────────

const POWER_WORDS = {
  authority:    ["certified", "authorized", "approved", "official", "licensed", "accredited", "registered", "verified", "standard", "bis", "iso"],
  urgency:      ["now", "today", "limited", "hurry", "deadline", "pre-monsoon", "season", "last", "act now", "ending", "fast", "immediately", "urgent"],
  risk:         ["free", "guaranteed", "warranty", "refund", "no risk", "support", "assured", "safe", "protected", "secure", "demo", "trial"],
  government:   ["gem", "oem", "tender", "msme", "government", "ministry", "nhm", "nvbdcp", "municipal", "corporation", "public health", "procurement"],
  dealer:       ["dealer", "distributor", "territory", "exclusive", "franchise", "partner", "authorized", "resell", "dealership", "regional"],
  revenue:      ["revenue", "income", "profit", "earn", "monthly", "annual", "return", "roi", "commission", "margin", "business"],
  compliance:   ["is 14855", "is-14855", "bis certified", "compliant", "certified", "cpcsea", "who", "standard", "approved", "quality"],
  trust:        ["trusted", "since", "years", "states", "customers", "machines", "deployed", "proven", "india", "make in india", "startup"],
  cta:          ["call", "get", "apply", "contact", "enquire", "request", "quote", "buy", "order", "visit", "know more", "learn more"],
}

const NUMBERS_RE = /[\d₹%+]/

// ── Scoring ───────────────────────────────────────────────────────────────────

function scoreAsset(
  text:      string,
  type:      AssetType,
  framework: PersuasionFramework,
  keywords:  string[],
): AssetScore {
  const t = text.toLowerCase()
  const kw = keywords.map(k => k.toLowerCase())

  // CTR potential
  let ctr = 5
  const kwHits = kw.filter(k => t.includes(k)).length
  ctr += Math.min(kwHits * 1.5, 3)
  const pwHits = POWER_WORDS.authority.concat(POWER_WORDS.trust).filter(p => t.includes(p)).length
  ctr += Math.min(pwHits * 0.4, 1.5)
  if (NUMBERS_RE.test(text)) ctr += 0.5
  if (text.includes("?")) ctr += 0.5
  if (POWER_WORDS.cta.some(c => t.includes(c))) ctr += 0.5
  if (type === "headline") {
    const len = text.length
    if (len >= 20 && len <= 30) ctr += 0.5
    if (len < 12) ctr -= 2
  }

  // Authority
  let auth = 0
  auth += POWER_WORDS.authority.filter(p => t.includes(p)).length * 2
  auth += POWER_WORDS.compliance.filter(p => t.includes(p)).length * 2
  if (NUMBERS_RE.test(text)) auth += 1
  if (framework === "authority" || framework === "compliance") auth += 2

  // Urgency
  let urg = 0
  urg += POWER_WORDS.urgency.filter(p => t.includes(p)).length * 2
  if (framework === "urgency") urg += 3
  const SEASONS = ["monsoon", "pre-monsoon", "summer", "season"]
  if (SEASONS.some(s => t.includes(s))) urg += 2

  // Commercial intent
  let com = 3
  com += POWER_WORDS.cta.filter(p => t.includes(p)).length * 1.5
  com += POWER_WORDS.government.filter(p => t.includes(p)).length * 1.5
  com += POWER_WORDS.dealer.filter(p => t.includes(p)).length * 1.5
  com += kw.filter(k => t.includes(k)).length * 1
  if (["dealer_acquisition", "oem_authorization", "gem_tender", "machine_sales"].some(o => t.includes(o))) com += 1

  // Conversion impact
  let conv = 4
  conv += POWER_WORDS.risk.filter(p => t.includes(p)).length * 1.5
  conv += POWER_WORDS.government.filter(p => t.includes(p)).length * 1
  conv += POWER_WORDS.dealer.filter(p => t.includes(p)).length * 1
  conv += kw.filter(k => t.includes(k)).length * 0.5
  if (framework === "risk_reduction") conv += 2
  if (framework === "government" || framework === "dealer_growth") conv += 1.5

  // Clamp 0–10
  const clamp = (n: number) => Math.min(Math.max(Math.round(n * 10) / 10, 0), 10)
  const ctrF = clamp(ctr)
  const authF = clamp(auth)
  const urgF = clamp(urg)
  const comF = clamp(com)
  const convF = clamp(conv)

  // Composite: CTR 30%, convImpact 25%, commercialIntent 20%, authority 15%, urgency 10%
  const composite = clamp(ctrF * 0.30 + convF * 0.25 + comF * 0.20 + authF * 0.15 + urgF * 0.10)

  return {
    ctrPotential:     ctrF,
    authority:        authF,
    urgency:          urgF,
    commercialIntent: comF,
    conversionImpact: convF,
    composite,
  }
}

function buildAsset(
  text:      string,
  type:      AssetType,
  framework: PersuasionFramework,
  keywords:  string[],
  limit:     number,
  rationale?: string,
): ScoredAsset {
  const trimmed = text.trim()
  return {
    text:            trimmed,
    framework,
    type,
    charCount:       trimmed.length,
    withinLimit:     trimmed.length <= limit,
    keywordsMatched: keywords.filter(k => trimmed.toLowerCase().includes(k.toLowerCase())),
    scores:          scoreAsset(trimmed, type, framework, keywords),
    rationale,
  }
}

function scoreSitelink(sl: Omit<SiteLink, "scores">, keywords: string[]): SiteLink {
  return {
    ...sl,
    scores: scoreAsset(sl.title + " " + sl.description1, "sitelink", sl.framework, keywords),
  }
}

// ── Learnings from past performance ──────────────────────────────────────────

async function loadLearnings(): Promise<string[]> {
  try {
    const db = (await clientPromise).db()
    const learnings = await db.collection("creative_learnings")
      .find({})
      .sort({ impact: -1 })
      .limit(10)
      .toArray()
    return learnings.map(l => `- ${l.insight}`)
  } catch {
    return []
  }
}

// ── Claude prompt ─────────────────────────────────────────────────────────────

function buildPrompt(input: CreativeDirectorInput, learnings: string[]): string {
  const { product, landingPage, objective, audience, keywordCluster, notes } = input

  const objectiveLabels: Record<CampaignObjective, string> = {
    dealer_acquisition: "Recruit new dealers/distributors who will sell our machines",
    oem_authorization:  "Get government agencies to request OEM authorization from 100X Circle",
    gem_tender:         "Win GeM tenders and direct government purchases",
    brand_awareness:    "Build brand recognition as India's leading fogging machine maker",
    machine_sales:      "Sell machines directly to pest control operators, municipalities, farms",
  }

  const audienceLabels: Record<AudienceType, string> = {
    government_buyers: "Government procurement officers, NHM officials, municipal corporations",
    dealers:           "Entrepreneurs looking to start or expand a dealership business",
    pest_control:      "Pest control operators, fumigation companies, sanitation contractors",
    agriculture:       "Farmers, FPOs, agri-input dealers, crop protection companies",
    industrial:        "Factory owners, warehouse managers, export unit operators",
    mixed:             "Mixed audience — all of the above",
  }

  const learningSection = learnings.length > 0
    ? `\nPERFORMANCE LEARNINGS FROM PAST WINNING ADS:\n${learnings.join("\n")}\nApply these patterns.`
    : ""

  return `You are India's top Google Ads Creative Director specializing in industrial machinery and government procurement.

BRAND: 100X Circle — India's leading thermal fogging machine manufacturer
KEY FACTS:
- BIS Certified manufacturer, IS 14855:2019 compliant machines
- GeM Registered OEM with MSME certification
- 10+ years manufacturing, 5,000+ machines deployed across 28 states
- Make in India, Startup India certified
- Key products: 100X FGG (thermal fogging), ULV sprayers, vehicle-mounted foggers
- Segments: Municipal corporations, NHM/NVBDCP, public health, agriculture, pest control
- Dealer program: territorial exclusivity, training, ₹5L–15L monthly revenue potential

CAMPAIGN BRIEF:
Product: ${product}
Landing Page: ${landingPage}
Objective: ${objectiveLabels[objective]}
Target Audience: ${audienceLabels[audience]}
Keyword Cluster: ${keywordCluster.join(", ")}
${notes ? `Additional Notes: ${notes}` : ""}
${learningSection}

PERSUASION FRAMEWORKS TO USE ACROSS YOUR ASSETS:
1. authority — certifications, IS 14855, BIS, years of experience, deployment scale
2. urgency — pre-monsoon season, limited stock, tender deadlines, monsoon preparedness
3. risk_reduction — free demo, warranty, EMI options, after-sale support, trial
4. government — GeM, OEM authorization, MSME preference, IS standards, compliance
5. dealer_growth — territory rights, monthly revenue, training, margins, business growth
6. revenue — ₹5L–15L monthly income, ROI, recurring orders, profit margins
7. compliance — IS 14855:2019, BIS, WHO standards, CPCSEA, MSME certified
8. trust — 10,000+ customers, 28 states, 10+ years, Make in India, Startup India

STRICT CHARACTER LIMITS (COUNT EVERY CHARACTER INCLUDING SPACES):
- Headlines: MAXIMUM 30 characters (NEVER exceed — Google will reject them)
- Descriptions: MAXIMUM 90 characters
- Callouts: MAXIMUM 25 characters
- Sitelink Titles: MAXIMUM 25 characters
- Sitelink Descriptions: MAXIMUM 35 characters each

GENERATE EXACTLY:
- 50 RSA headlines (varied frameworks, some with keywords, some without)
- 20 RSA descriptions (include CTAs, benefits, proof)
- 10 callouts (benefit snippets, compliance markers)
- 10 structured snippets (header + 3–4 values each)
- 10 sitelinks (title + 2 description lines each)
- 10 image concepts (visual direction for responsive display ads)

Return ONLY a JSON object (no markdown, no explanation, no preamble) exactly matching this schema:
{
  "headlines": [
    {"text": "...", "framework": "authority|urgency|risk_reduction|government|dealer_growth|revenue|compliance|trust", "rationale": "one line why this works"}
  ],
  "descriptions": [
    {"text": "...", "framework": "..."}
  ],
  "callouts": [
    {"text": "...", "framework": "..."}
  ],
  "snippets": [
    {"header": "...", "values": ["...", "...", "..."], "framework": "..."}
  ],
  "sitelinks": [
    {"title": "...", "description1": "...", "description2": "...", "framework": "..."}
  ],
  "image_concepts": [
    {"concept": "...", "visual_hook": "...", "text_overlay": "...", "cta": "...", "framework": "..."}
  ]
}`
}

// ── Parse Claude response ─────────────────────────────────────────────────────

interface RawResponse {
  headlines?:      Array<{ text: string; framework: string; rationale?: string }>
  descriptions?:   Array<{ text: string; framework: string }>
  callouts?:       Array<{ text: string; framework: string }>
  snippets?:       Array<{ header: string; values: string[]; framework?: string }>
  sitelinks?:      Array<{ title: string; description1: string; description2: string; framework: string }>
  image_concepts?: Array<{ concept: string; visual_hook: string; text_overlay: string; cta: string; framework: string }>
}

function validFramework(f: string): PersuasionFramework {
  const VALID: PersuasionFramework[] = ["authority","urgency","risk_reduction","government","dealer_growth","revenue","compliance","trust"]
  return VALID.includes(f as PersuasionFramework) ? (f as PersuasionFramework) : "trust"
}

function parseResponse(raw: RawResponse, input: CreativeDirectorInput): Omit<CreativeDirectorRun, "runId" | "generatedAt" | "modelUsed" | "totalTokens" | "learningsApplied"> {
  const kw = input.keywordCluster

  const headlines: ScoredAsset[] = (raw.headlines ?? []).map(h =>
    buildAsset(h.text, "headline", validFramework(h.framework), kw, CHAR_LIMITS.headline, h.rationale)
  )

  const descriptions: ScoredAsset[] = (raw.descriptions ?? []).map(d =>
    buildAsset(d.text, "description", validFramework(d.framework), kw, CHAR_LIMITS.description)
  )

  const callouts: ScoredAsset[] = (raw.callouts ?? []).map(c =>
    buildAsset(c.text, "callout", validFramework(c.framework), kw, CHAR_LIMITS.callout)
  )

  const snippets: StructuredSnippet[] = (raw.snippets ?? []).map(s => ({
    header: s.header,
    values: s.values ?? [],
  }))

  const sitelinks: SiteLink[] = (raw.sitelinks ?? []).map(sl =>
    scoreSitelink({
      title:        sl.title,
      description1: sl.description1,
      description2: sl.description2,
      framework:    validFramework(sl.framework),
    }, kw)
  )

  const imageConcepts: ImageConcept[] = (raw.image_concepts ?? []).map(ic => ({
    concept:     ic.concept,
    visualHook:  ic.visual_hook,
    textOverlay: ic.text_overlay,
    cta:         ic.cta,
    framework:   validFramework(ic.framework),
  }))

  // Sort by composite, take top
  const sortedH    = [...headlines].sort((a, b) => b.scores.composite - a.scores.composite)
  const sortedD    = [...descriptions].sort((a, b) => b.scores.composite - a.scores.composite)

  // Framework distribution
  const frameworkCounts = {} as Record<PersuasionFramework, number>
  for (const asset of [...headlines, ...descriptions, ...callouts]) {
    frameworkCounts[asset.framework] = (frameworkCounts[asset.framework] ?? 0) + 1
  }

  return {
    input,
    headlines,
    descriptions,
    callouts,
    snippets,
    sitelinks,
    imageConcepts,
    topHeadlines:    sortedH.slice(0, 15),
    topDescriptions: sortedD.slice(0, 5),
    frameworkCounts,
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function runCreativeDirector(input: CreativeDirectorInput): Promise<CreativeDirectorRun> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured")

  const db = (await clientPromise).db()
  const learnings = await loadLearnings()
  const prompt    = buildPrompt(input, learnings)

  const anthropic  = new Anthropic({ apiKey })
  const runId      = `cr_${Date.now()}`
  const generatedAt = new Date().toISOString()

  const message = await anthropic.messages.create({
    model:      "claude-opus-4-8-20251101",
    max_tokens: 8000,
    messages:   [{ role: "user", content: prompt }],
  })

  const rawText = message.content.find(b => b.type === "text")?.text ?? ""

  // Strip any markdown fences
  const jsonStr = rawText.replace(/^```[a-z]*\n?/m, "").replace(/\n?```$/m, "").trim()

  let parsed: RawResponse
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    // Try extracting JSON from the middle of the response
    const match = jsonStr.match(/\{[\s\S]+\}/)
    if (!match) throw new Error("Could not parse JSON from Creative Director response")
    parsed = JSON.parse(match[0])
  }

  const run: CreativeDirectorRun = {
    runId,
    ...parseResponse(parsed, input),
    generatedAt,
    modelUsed:        "claude-opus-4-8-20251101",
    totalTokens:      (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0),
    learningsApplied: learnings,
  }

  // Persist to MongoDB
  await db.collection("creative_director_runs").insertOne({ ...run })

  await logAgentRun(db, {
    agent:          "Creative Director",
    action:         `Generated ${run.headlines.length} headlines, ${run.descriptions.length} descriptions for "${input.product}"`,
    reason:         `Objective: ${input.objective}, Audience: ${input.audience}`,
    expectedImpact: "Higher CTR and conversion rate for campaigns",
    actualImpact:   `Top headline score: ${run.topHeadlines[0]?.scores.composite.toFixed(1) ?? "—"}/10`,
    level:          "success",
    module:         "ads",
  })

  return run
}

// ── Record performance data for A/B learning ─────────────────────────────────

export async function recordAssetPerformance(data: {
  text:         string
  type:         AssetType
  impressions:  number
  clicks:       number
  conversions:  number
  ctr:          number
}) {
  const db = (await clientPromise).db()

  // Extract patterns from winning assets
  const { text, type, impressions, clicks, conversions, ctr } = data
  if (impressions < 100) return  // not enough data

  const isWinner = ctr > 0.08  // 8%+ CTR is a winner for industrial B2B

  if (isWinner) {
    const t = text.toLowerCase()
    const insights: string[] = []

    // Extract patterns
    if (NUMBERS_RE.test(text)) insights.push(`${type}s with numbers achieve higher CTR (e.g., "${text}")`)
    if (text.includes("?")) insights.push(`Question-format ${type}s outperform statements`)
    if (POWER_WORDS.urgency.some(p => t.includes(p))) insights.push(`Urgency language in ${type}s drives ${(ctr * 100).toFixed(1)}% CTR`)
    if (POWER_WORDS.government.some(p => t.includes(p))) insights.push(`Government/GeM references improve CTR for this audience`)

    for (const insight of insights) {
      await db.collection("creative_learnings").updateOne(
        { insight },
        { $inc: { impact: 1 }, $set: { updatedAt: new Date().toISOString() } },
        { upsert: true }
      )
    }
  }

  // Store raw performance
  await db.collection("creative_asset_performance").insertOne({
    text, type, impressions, clicks, conversions, ctr,
    isWinner,
    recordedAt: new Date().toISOString(),
  })
}
