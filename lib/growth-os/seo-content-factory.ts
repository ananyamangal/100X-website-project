/**
 * SEO Content Factory — generates CMS-ready page content from an SEO recommendation.
 *
 * Pipeline:
 *   1. Load recommendation + supporting GSC data
 *   2. Call Claude to generate full page content
 *   3. Score and validate output
 *   4. Persist to seo_content_plans collection (status: pending_review)
 *
 * Mirrors the Ads Campaign Factory architecture:
 *   Recommendation → Draft (pending_review) → Approve → Publish → Index → Track
 *
 * Falls back to a template if ANTHROPIC_API_KEY is not set.
 */

import clientPromise from "@/lib/mongodb"
import Anthropic from "@anthropic-ai/sdk"

// ── Types ────────────────────────────────────────────────────────────────────

export type SeoContentStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "modify_requested"
  | "published"
  | "indexed"
  | "tracking"

export interface SeoContentSection {
  heading: string
  content: string
  wordCount: number
}

export interface SeoInternalLink {
  anchor: string
  url: string
  rationale: string
}

export interface SeoGeneratedContent {
  metaTitle:       string   // ≤60 chars
  metaDescription: string   // ≤160 chars
  h1:              string
  sections:        SeoContentSection[]
  schema:          string   // JSON-LD string
  internalLinks:   SeoInternalLink[]
  ctas:            string[]
  wordCount:       number
  generationMethod: "llm" | "template"
}

export interface SeoQualityScores {
  keywordPresence: number   // 0–100: keyword in title/H1/sections
  contentDepth:    number   // 0–100: word count vs target
  metaQuality:     number   // 0–100: title/desc length compliance
  schemaPresent:   number   // 0 or 100
  linksPresent:    number   // 0–100: internal links count
  confidence:      number   // weighted composite
  gaps:            string[]
}

export interface SeoContentPlan {
  planId:              string
  recommendationId:    string
  keyword:             string
  targetUrl:           string
  contentType:         string
  priority:            string
  status:              SeoContentStatus
  simulated:           boolean   // true when ANTHROPIC_API_KEY missing
  generatedContent:    SeoGeneratedContent
  qualityScores:       SeoQualityScores
  publishedContent?:   SeoGeneratedContent  // set when approved copy differs
  deploymentInfo?: {
    publishedAt?:       string
    publishedUrl?:      string
    indexRequestedAt?:  string
    indexStatus?:       "requested" | "indexed" | "error" | "not_indexed"
  }
  outcomeTracking?: {
    baselineImpressions: number
    baselineClicks:      number
    baselinePosition:    number
    trackedAt:           string
    latestImpressions?:  number
    latestClicks?:       number
    latestPosition?:     number
    lastCheckedAt?:      string
  }
  modifyReason?:     string
  rejectedReason?:   string
  approvedAt?:       string
  createdAt:         string
  updatedAt:         string
}

export const COLL_SEO_CONTENT_PLANS = "seo_content_plans"

// ── Brand context ────────────────────────────────────────────────────────────

const BRAND_CONTEXT = `
Brand: 100x Circle
Product: Thermal fogging machines for mosquito control, pest control, and public health.
Market: India (B2B) — municipalities, hospitals, hotels, industrial facilities, contractors.
USP: OEM-authorized dealer, GeM registered supplier, 500+ machines sold, pan-India service.
Tone: Professional, technical authority, trust-building. Never salesy. Data-driven.
`

// ── Quality scorer ────────────────────────────────────────────────────────────

function scoreContent(content: SeoGeneratedContent, keyword: string): SeoQualityScores {
  const gaps: string[] = []
  const kw = keyword.toLowerCase()

  // Keyword presence
  const inTitle = content.metaTitle.toLowerCase().includes(kw) ? 100 : 0
  const inH1    = content.h1.toLowerCase().includes(kw)         ? 100 : 0
  const inBody  = content.sections.some(s =>
    s.content.toLowerCase().includes(kw) || s.heading.toLowerCase().includes(kw)
  ) ? 100 : 0
  const keywordPresence = Math.round((inTitle + inH1 + inBody) / 3)
  if (keywordPresence < 100) gaps.push(`Keyword "${keyword}" not fully present in title/H1/body`)

  // Content depth (target: 800+ words)
  const contentDepth = Math.min(Math.round((content.wordCount / 800) * 100), 100)
  if (content.wordCount < 600) gaps.push(`Content too short (${content.wordCount} words — target 800+)`)

  // Meta quality
  const titleLen = content.metaTitle.length
  const descLen  = content.metaDescription.length
  const titleOk  = titleLen >= 30 && titleLen <= 60
  const descOk   = descLen >= 80 && descLen <= 160
  const metaQuality = ((titleOk ? 50 : 20) + (descOk ? 50 : 20))
  if (!titleOk) gaps.push(`Meta title length ${titleLen} (target 30–60 chars)`)
  if (!descOk)  gaps.push(`Meta description length ${descLen} (target 80–160 chars)`)

  // Schema
  let schemaPresent = 0
  try { JSON.parse(content.schema); schemaPresent = 100 } catch { gaps.push("Schema markup is invalid JSON") }
  if (!content.schema.trim()) { schemaPresent = 0; gaps.push("No schema markup generated") }

  // Internal links
  const linksPresent = Math.min(content.internalLinks.length * 25, 100)
  if (content.internalLinks.length < 2) gaps.push("Add at least 2 internal links for SEO value")

  const confidence = Math.round(
    keywordPresence * 0.30 +
    contentDepth    * 0.25 +
    metaQuality     * 0.20 +
    schemaPresent   * 0.15 +
    linksPresent    * 0.10
  )

  return { keywordPresence, contentDepth, metaQuality, schemaPresent, linksPresent, confidence, gaps }
}

// ── Template fallback ─────────────────────────────────────────────────────────

function generateTemplate(keyword: string, targetUrl: string, contentType: string): SeoGeneratedContent {
  const isProduct = contentType === "product_page" || contentType === "landing_page"
  const title = `${keyword} | 100x Circle — Trusted Fogging Machine Supplier`
  const sections: SeoContentSection[] = [
    {
      heading: `What is ${keyword}?`,
      content: `${keyword} is a critical component of modern pest control and public health operations in India. 100x Circle provides reliable, OEM-authorized equipment backed by pan-India service support.`,
      wordCount: 32,
    },
    {
      heading: "Why Choose 100x Circle",
      content: "With 500+ machines deployed across municipalities, hospitals, hotels, and industrial facilities, 100x Circle is India's trusted partner for thermal fogging solutions. GeM-registered supplier. OEM-authorized. 24/7 support.",
      wordCount: 36,
    },
    {
      heading: isProduct ? "Technical Specifications" : "Key Considerations",
      content: "Our fogging machines are engineered for Indian conditions — high-volume output, fuel-efficient motors, corrosion-resistant tanks, and compatibility with WHO-approved chemicals. Each unit ships with a comprehensive maintenance kit.",
      wordCount: 33,
    },
    {
      heading: "Pricing & Procurement",
      content: "Available through direct purchase, GeM portal (GEM/2024/B/xxxxxxx), and rental. Government institutions get priority delivery. Request a quote via our RFQ form or WhatsApp for bulk pricing.",
      wordCount: 33,
    },
    {
      heading: "Frequently Asked Questions",
      content: `**How quickly can I get delivery?** Most in-stock units ship within 48 hours. **Is installation support available?** Yes, our technicians visit for commissioning in major cities. **Are spare parts available?** Comprehensive spare parts are available pan-India via our distributor network.`,
      wordCount: 45,
    },
  ]
  const totalWords = sections.reduce((s, sec) => s + sec.wordCount, 0)

  return {
    metaTitle:       title.slice(0, 60),
    metaDescription: `Buy ${keyword} from 100x Circle — OEM-authorized, GeM-registered supplier. 500+ machines deployed across India. Get a quote today.`.slice(0, 160),
    h1:              `${keyword} — Trusted Supplier in India`,
    sections,
    schema:          JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      "name": keyword,
      "brand": { "@type": "Brand", "name": "100x Circle" },
      "offers": { "@type": "Offer", "priceCurrency": "INR", "availability": "https://schema.org/InStock" },
    }),
    internalLinks: [
      { anchor: "thermal fogging machines", url: "/thermal-fogging-machine", rationale: "Main product page" },
      { anchor: "become a dealer", url: "/become-a-dealer", rationale: "Dealer acquisition CTA" },
      { anchor: "GeM supplier", url: "/gem-oem-authorization", rationale: "Government procurement" },
    ],
    ctas: [
      "Request a Free Quote →",
      "WhatsApp for Bulk Pricing",
      "Download Product Brochure",
    ],
    wordCount: totalWords,
    generationMethod: "template",
  }
}

// ── LLM generation ────────────────────────────────────────────────────────────

async function generateWithLLM(
  keyword: string,
  targetUrl: string,
  contentType: string,
  currentState: string,
  proposedChange: string,
  gscContext: string,
): Promise<SeoGeneratedContent> {
  const client = new Anthropic()

  const prompt = `You are an expert SEO content writer for 100x Circle, a B2B fogging machine company in India.

${BRAND_CONTEXT}

Generate complete, publish-ready SEO page content for the following:

Target keyword: "${keyword}"
Target URL: ${targetUrl}
Content type: ${contentType}
Current page state: ${currentState}
Required change: ${proposedChange}
GSC performance context: ${gscContext}

Output ONLY valid JSON matching this exact schema (no markdown, no commentary):
{
  "metaTitle": "string (30-60 chars, include keyword near start)",
  "metaDescription": "string (80-160 chars, compelling, include keyword and CTA)",
  "h1": "string (include primary keyword, different from metaTitle)",
  "sections": [
    {
      "heading": "H2 heading string",
      "content": "Full paragraph content (minimum 100 words each section)",
      "wordCount": number
    }
  ],
  "schema": "JSON-LD schema markup as escaped string (Product or Article or FAQPage)",
  "internalLinks": [
    { "anchor": "anchor text", "url": "/path", "rationale": "why this link" }
  ],
  "ctas": ["Primary CTA text", "Secondary CTA text"],
  "wordCount": total_word_count_number
}

Requirements:
- 5-7 sections covering: what it is, specifications/details, use cases, why 100x Circle, FAQ, procurement/pricing
- 800–1200 total words across all sections
- Include keyword "${keyword}" naturally in H1, first section, and at least 2 other sections
- Schema must be valid JSON-LD (escape all double quotes inside the string)
- At least 3 internal links to: /thermal-fogging-machine, /become-a-dealer, /gem-oem-authorization
- 2-3 compelling CTAs specific to B2B fogging machine buyers in India`

  const response = await client.messages.create({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages:   [{ role: "user", content: prompt }],
  })

  const text = (response.content[0] as { type: string; text: string }).text?.trim() ?? ""
  // Strip any accidental markdown code fence
  const clean = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim()
  const parsed = JSON.parse(clean) as Omit<SeoGeneratedContent, "generationMethod">

  return { ...parsed, generationMethod: "llm" }
}

// ── GSC context fetcher ───────────────────────────────────────────────────────

async function fetchGscContext(keyword: string): Promise<string> {
  try {
    const db = (await clientPromise).db()
    const rows = await db.collection("gsc_query_rows")
      .find({ query: new RegExp(keyword.split(" ")[0], "i") })
      .sort({ impressions: -1 })
      .limit(5)
      .toArray()

    if (rows.length === 0) return "No GSC data available for this keyword."
    const top = rows[0]
    return `GSC data: position ${Number(top.position ?? 0).toFixed(1)}, ${top.impressions ?? 0} impressions, ${top.clicks ?? 0} clicks, CTR ${Number(top.ctr ?? 0).toFixed(1)}%`
  } catch {
    return "GSC context unavailable."
  }
}

// ── Baseline outcome tracking ─────────────────────────────────────────────────

async function fetchBaseline(keyword: string): Promise<SeoContentPlan["outcomeTracking"]> {
  try {
    const db = (await clientPromise).db()
    const row = await db.collection("gsc_query_rows")
      .findOne({ query: new RegExp(`^${keyword}$`, "i") })
    if (!row) return undefined
    return {
      baselineImpressions: Number(row.impressions ?? 0),
      baselineClicks:      Number(row.clicks ?? 0),
      baselinePosition:    Number(row.position ?? 0),
      trackedAt:           new Date().toISOString(),
    }
  } catch {
    return undefined
  }
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export interface SeoFactoryInput {
  recommendationId: string
  keyword:          string
  targetUrl:        string
  contentType:      string
  priority:         string
  currentState:     string
  proposedChange:   string
}

export interface SeoFactoryResult {
  ok:         boolean
  simulated:  boolean
  planId?:    string
  keyword?:   string
  confidence?: number
  error?:     string
}

export async function runSeoContentFactory(input: SeoFactoryInput): Promise<SeoFactoryResult> {
  const { recommendationId, keyword, targetUrl, contentType, priority, currentState, proposedChange } = input

  const db = (await clientPromise).db()
  const now = new Date().toISOString()
  const planId = `seo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  // Check if we already have a recent plan for this recommendation
  const existing = await db.collection(COLL_SEO_CONTENT_PLANS).findOne({
    recommendationId,
    status: { $in: ["pending_review", "approved", "published"] },
  })
  if (existing) {
    return {
      ok:         true,
      simulated:  existing.simulated,
      planId:     existing.planId,
      keyword:    existing.keyword,
      confidence: existing.qualityScores?.confidence,
      error:      undefined,
    }
  }

  const hasApiKey = !!(process.env.ANTHROPIC_API_KEY || "").trim()
  const gscContext = await fetchGscContext(keyword)
  const baseline   = await fetchBaseline(keyword)

  let generatedContent: SeoGeneratedContent
  let simulated = false

  if (hasApiKey) {
    try {
      generatedContent = await generateWithLLM(keyword, targetUrl, contentType, currentState, proposedChange, gscContext)
    } catch (e) {
      console.warn("[seo-content-factory] LLM failed, falling back to template:", String(e))
      generatedContent = generateTemplate(keyword, targetUrl, contentType)
      simulated = true
    }
  } else {
    generatedContent = generateTemplate(keyword, targetUrl, contentType)
    simulated = true
  }

  const qualityScores = scoreContent(generatedContent, keyword)

  const plan: SeoContentPlan = {
    planId,
    recommendationId,
    keyword,
    targetUrl,
    contentType,
    priority,
    status:           "pending_review",
    simulated,
    generatedContent,
    qualityScores,
    outcomeTracking:  baseline,
    createdAt:        now,
    updatedAt:        now,
  }

  await db.collection(COLL_SEO_CONTENT_PLANS).insertOne(plan)

  // Log
  await db.collection("growth_os_logs").insertOne({
    ts:    now, agent: "seo-content-factory",
    action: simulated ? "content_generated_template" : "content_generated_llm",
    planId, recommendationId, keyword, contentType,
    confidence: qualityScores.confidence,
    module: "seo", level: "success",
  })

  return {
    ok: true,
    simulated,
    planId,
    keyword,
    confidence: qualityScores.confidence,
  }
}
