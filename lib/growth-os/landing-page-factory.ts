/**
 * Landing Page Factory — generates conversion-optimised landing page drafts
 * from four opportunity sources: SEO, Dealer, Procurement, Ads.
 *
 * Pipeline:
 *   1. Load opportunity data from source collection
 *   2. Call Claude to generate full page content
 *   3. Score and validate output
 *   4. Persist to landing_page_plans (status: draft)
 *
 * Mirrors SEO Content Factory architecture exactly:
 *   Opportunity → Draft → Approve → Publish → Track
 *
 * Falls back to a template if ANTHROPIC_API_KEY is not set.
 */

import clientPromise from "@/lib/mongodb"
import Anthropic from "@anthropic-ai/sdk"

// ── Types ────────────────────────────────────────────────────────────────────

export type LandingPageStatus =
  | "draft"
  | "approved"
  | "rejected"
  | "modify_requested"
  | "published"
  | "tracking"

export type OpportunitySource = "seo" | "dealer" | "procurement" | "ads"

export interface LpHero {
  headline:    string
  subheadline: string
  badge:       string
}

export interface LpCta {
  primary:   string
  secondary: string
  urgency:   string
}

export interface LpBenefit {
  title:       string
  description: string
  icon:        string
}

export interface LpFaqItem {
  question: string
  answer:   string
}

export interface LpSection {
  heading:   string
  content:   string
  wordCount: number
}

export interface LpInternalLink {
  anchor:    string
  url:       string
  rationale: string
}

export interface LpGeneratedContent {
  metaTitle:       string   // ≤60 chars
  metaDescription: string   // ≤160 chars
  hero:            LpHero
  cta:             LpCta
  benefits:        LpBenefit[]
  faq:             LpFaqItem[]
  sections:        LpSection[]
  schema:          string   // JSON-LD string
  internalLinks:   LpInternalLink[]
  wordCount:       number
  generationMethod: "llm" | "template"
}

export interface LpQualityScores {
  heroStrength:   number   // 0–100: headline clarity + badge present
  ctaClarity:     number   // 0–100: primary CTA present and actionable
  benefitDepth:   number   // 0–100: ≥3 benefits with descriptions
  faqCoverage:    number   // 0–100: ≥3 FAQ items
  metaQuality:    number   // 0–100: title/desc length compliance
  schemaPresent:  number   // 0 or 100
  confidence:     number   // weighted composite
  gaps:           string[]
}

export interface LpPerformance {
  pageViews?:       number
  uniqueVisitors?:  number
  leads?:           number
  leadRate?:        number   // leads / visitors %
  revenueAttributed?: number // INR
  trackedAt?:       string
  lastCheckedAt?:   string
}

export interface LandingPagePlan {
  planId:           string
  opportunityId:    string
  source:           OpportunitySource
  keyword:          string
  targetUrl:        string
  pageType:         string
  priority:         string
  status:           LandingPageStatus
  simulated:        boolean
  generatedContent: LpGeneratedContent
  qualityScores:    LpQualityScores
  deploymentInfo?: {
    publishedAt?:    string
    publishedUrl?:   string
    revalidatedAt?:  string
  }
  performance?:     LpPerformance
  modifyReason?:    string
  rejectedReason?:  string
  approvedAt?:      string
  sourceContext?:   Record<string, unknown>
  createdAt:        string
  updatedAt:        string
}

export const COLL_LANDING_PLANS = "landing_page_plans"
export const COLL_LANDING_PUBLISHED = "landing_pages_published"

// ── Brand context ────────────────────────────────────────────────────────────

const BRAND_CONTEXT = `
Brand: 100x Circle
Product: Thermal fogging machines for mosquito control, pest control, and public health.
Market: India (B2B) — municipalities, hospitals, hotels, industrial facilities, contractors.
USP: OEM-authorized dealer, GeM-registered supplier, 500+ machines sold, pan-India service.
Tone: Professional, technical authority, trust-building. Conversion-focused but never pushy.
Primary CTA: RFQ form or WhatsApp for bulk pricing.
`

// ── Quality scorer ────────────────────────────────────────────────────────────

function scoreContent(content: LpGeneratedContent): LpQualityScores {
  const gaps: string[] = []

  // Hero strength
  const hasHeadline = (content.hero?.headline?.length ?? 0) > 10
  const hasBadge    = (content.hero?.badge?.length ?? 0) > 3
  const heroStrength = (hasHeadline ? 70 : 0) + (hasBadge ? 30 : 0)
  if (!hasHeadline) gaps.push("Hero headline too short or missing")
  if (!hasBadge)    gaps.push("Hero badge (trust signal) missing")

  // CTA clarity
  const hasPrimary   = (content.cta?.primary?.length ?? 0) > 5
  const hasUrgency   = (content.cta?.urgency?.length ?? 0) > 5
  const ctaClarity   = (hasPrimary ? 70 : 0) + (hasUrgency ? 30 : 0)
  if (!hasPrimary) gaps.push("Primary CTA missing or too vague")

  // Benefit depth
  const benefitCount = content.benefits?.length ?? 0
  const benefitDepth = Math.min(Math.round((benefitCount / 3) * 100), 100)
  if (benefitCount < 3) gaps.push(`Only ${benefitCount} benefits — add at least 3`)

  // FAQ coverage
  const faqCount    = content.faq?.length ?? 0
  const faqCoverage = Math.min(Math.round((faqCount / 3) * 100), 100)
  if (faqCount < 3) gaps.push(`Only ${faqCount} FAQ items — add at least 3`)

  // Meta quality
  const titleLen = content.metaTitle?.length ?? 0
  const descLen  = content.metaDescription?.length ?? 0
  const titleOk  = titleLen >= 30 && titleLen <= 60
  const descOk   = descLen >= 80 && descLen <= 160
  const metaQuality = (titleOk ? 50 : 20) + (descOk ? 50 : 20)
  if (!titleOk) gaps.push(`Meta title length ${titleLen} (target 30–60 chars)`)
  if (!descOk)  gaps.push(`Meta description length ${descLen} (target 80–160 chars)`)

  // Schema
  let schemaPresent = 0
  try {
    if (content.schema?.trim()) { JSON.parse(content.schema); schemaPresent = 100 }
    else gaps.push("No schema markup generated")
  } catch { gaps.push("Schema markup is invalid JSON") }

  const confidence = Math.round(
    heroStrength  * 0.25 +
    ctaClarity    * 0.20 +
    benefitDepth  * 0.20 +
    faqCoverage   * 0.15 +
    metaQuality   * 0.12 +
    schemaPresent * 0.08
  )

  return { heroStrength, ctaClarity, benefitDepth, faqCoverage, metaQuality, schemaPresent, confidence, gaps }
}

// ── Template fallback ─────────────────────────────────────────────────────────

function generateTemplate(
  keyword: string,
  targetUrl: string,
  pageType: string,
  source: OpportunitySource,
): LpGeneratedContent {
  const isDealer      = source === "dealer"
  const isProcurement = source === "procurement"

  const headline = isDealer
    ? `Become a 100x Circle Authorized Dealer — ${keyword}`
    : isProcurement
    ? `Supply ${keyword} to Government & Municipal Buyers via GeM`
    : `${keyword} | OEM-Authorized Thermal Fogging Machines — India`

  const badge = isDealer
    ? "Dealer Network Open — Apply Now"
    : isProcurement
    ? "GeM Registered Supplier · L1 Rate Contracts"
    : "500+ Machines Deployed · Pan-India Service"

  const sections: LpSection[] = [
    {
      heading: headline,
      content: `${keyword} is a high-demand category in India's pest control and public health sector. 100x Circle is the OEM-authorized supplier with proven track record across municipalities, hospitals, hotels, and industrial facilities.`,
      wordCount: 35,
    },
    {
      heading: "Why 100x Circle",
      content: "OEM-authorized. GeM-registered. 500+ machines deployed pan-India. 24/7 technical support. WHO-approved chemical compatibility. Fast delivery within 48 hours from stock.",
      wordCount: 28,
    },
    {
      heading: "Technical Specifications",
      content: "High-output fogging engines engineered for Indian conditions. Fuel-efficient motors. Corrosion-resistant stainless steel tanks. Output rate: 8–12 litres/hour. Compatible with all standard ULV chemicals.",
      wordCount: 30,
    },
    {
      heading: isProcurement ? "GeM & Direct Procurement" : isDealer ? "Dealer Margins & Support" : "Pricing & Availability",
      content: isProcurement
        ? "Available on GeM portal under Schedule Rate Contract. Government institutions qualify for priority delivery. DPIIT and MSE registration. All compliance documentation provided."
        : isDealer
        ? "Attractive dealer margins on all SKUs. Co-marketing support. Demo unit provision. Territory exclusivity for qualifying partners. Monthly payouts."
        : "Competitive pricing for bulk orders. GeM rate contracts available. Rental options for seasonal demand. Request a detailed quote via RFQ form.",
      wordCount: 40,
    },
  ]

  return {
    metaTitle:       `${keyword} | 100x Circle — Trusted India Supplier`.slice(0, 60),
    metaDescription: `${keyword} from 100x Circle — OEM-authorized, GeM-registered. 500+ machines deployed. Fast delivery, pan-India support. Get a quote today.`.slice(0, 160),
    hero: {
      headline,
      subheadline: isProcurement
        ? "GeM-registered supplier with verified rate contracts and government buyer relationships across India."
        : isDealer
        ? "Join 100x Circle's authorized dealer network — India's fastest-growing thermal fogging brand."
        : "India's most trusted OEM-authorized thermal fogging machine supplier. 500+ machines sold. 24/7 support.",
      badge,
    },
    cta: {
      primary:   isDealer ? "Apply for Dealership →" : isProcurement ? "Get Rate Card & Compliance Docs →" : "Request a Free Quote →",
      secondary: "WhatsApp for Instant Pricing",
      urgency:   isDealer ? "Limited territories available in your region" : "In-stock units ship within 48 hours",
    },
    benefits: [
      {
        title:       "OEM Authorized",
        description: "Direct supply from manufacturer with full warranty and genuine spare parts.",
        icon:        "shield",
      },
      {
        title:       "GeM Registered",
        description: "Onboarded on Government e-Marketplace for frictionless government procurement.",
        icon:        "building",
      },
      {
        title:       "Pan-India Service",
        description: "Technicians in 20+ cities for commissioning, training, and AMC.",
        icon:        "map-pin",
      },
      {
        title:       "Fast Delivery",
        description: "In-stock models dispatched within 48 hours. Bulk orders fulfilled in 7–10 days.",
        icon:        "truck",
      },
    ],
    faq: [
      {
        question: "How quickly can I get delivery of a fogging machine?",
        answer:   "In-stock units ship within 48 hours. Bulk orders of 5+ machines are fulfilled in 7–10 working days.",
      },
      {
        question: "Are your machines available on GeM portal?",
        answer:   "Yes. 100x Circle is a registered GeM supplier. All models are listed with competitive rate contracts.",
      },
      {
        question: "What after-sales support do you provide?",
        answer:   "We provide on-site commissioning, operator training, AMC plans, and genuine spare parts availability pan-India.",
      },
      {
        question: "Which chemicals are compatible with your fogging machines?",
        answer:   "All WHO-approved public health insecticides and commercial pesticides. We provide a compatibility guide with every purchase.",
      },
    ],
    sections,
    schema: JSON.stringify({
      "@context": "https://schema.org",
      "@type":    pageType === "dealer_page" ? "Service" : "Product",
      "name":     keyword,
      "brand":    { "@type": "Brand", "name": "100x Circle" },
      "offers":   { "@type": "Offer", "priceCurrency": "INR", "availability": "https://schema.org/InStock" },
      "areaServed": { "@type": "Country", "name": "India" },
      "seller":   { "@type": "Organization", "name": "100x Circle Pvt Ltd" },
    }),
    internalLinks: [
      { anchor: "thermal fogging machines",    url: "/thermal-fogging-machine",           rationale: "Main product category" },
      { anchor: "become a dealer",             url: "/become-a-dealer",                   rationale: "Dealer acquisition" },
      { anchor: "GeM OEM authorization",       url: "/gem-oem-authorization",             rationale: "Government procurement trust signal" },
      { anchor: "spare parts",                 url: "/spare-parts",                       rationale: "After-sales ecosystem" },
    ],
    wordCount:        sections.reduce((s, sec) => s + sec.wordCount, 0) + 60,
    generationMethod: "template",
  }
}

// ── LLM generation ────────────────────────────────────────────────────────────

async function generateWithLLM(
  keyword: string,
  targetUrl: string,
  pageType: string,
  source: OpportunitySource,
  context: string,
): Promise<LpGeneratedContent> {
  const client = new Anthropic()

  const sourceHint = {
    seo:         "SEO opportunity — optimise for organic search ranking and informational intent",
    dealer:      "Dealer recruitment opportunity — persuade qualified distributors to apply for dealership",
    procurement: "Procurement opportunity — address government/institutional buyer purchase criteria and GeM compliance",
    ads:         "Paid ads landing page — high conversion focus, match search intent exactly, minimal friction to lead capture",
  }[source]

  const prompt = `You are a conversion copywriter for 100x Circle, India's leading thermal fogging machine company.

${BRAND_CONTEXT}

Generate a complete, conversion-optimised landing page for:

Target keyword: "${keyword}"
Target URL: ${targetUrl}
Page type: ${pageType}
Opportunity source: ${source} — ${sourceHint}
Market context: ${context}

Output ONLY valid JSON with no markdown, no commentary:
{
  "metaTitle": "string (30-60 chars, keyword near start)",
  "metaDescription": "string (80-160 chars, include keyword + CTA)",
  "hero": {
    "headline": "Compelling H1 (keyword + value prop, under 80 chars)",
    "subheadline": "Supporting sentence expanding on headline (1-2 sentences)",
    "badge": "Short trust signal or urgency badge (under 50 chars)"
  },
  "cta": {
    "primary": "Primary CTA button text (action-oriented, under 40 chars)",
    "secondary": "Secondary CTA (under 40 chars)",
    "urgency": "Urgency/scarcity line below CTA (under 60 chars)"
  },
  "benefits": [
    { "title": "Benefit title", "description": "2-3 sentence explanation", "icon": "icon-name" }
  ],
  "faq": [
    { "question": "Common buyer question?", "answer": "Direct, helpful answer (2-4 sentences)" }
  ],
  "sections": [
    { "heading": "H2 section heading", "content": "Full paragraph (80-150 words)", "wordCount": number }
  ],
  "schema": "JSON-LD markup as a string (Product or Service or FAQPage)",
  "internalLinks": [
    { "anchor": "anchor text", "url": "/path", "rationale": "why this link" }
  ],
  "wordCount": total_word_count_number
}

Requirements:
- 4+ benefits covering: OEM authorization, GeM supplier status, service coverage, delivery speed
- 4+ FAQ items covering: delivery time, GeM availability, after-sales support, chemical compatibility
- 3-4 body sections beyond hero/CTA
- Schema must be valid JSON (escape all inner quotes)
- At least 3 internal links
- 2 CTAs that reduce friction to lead capture
- Source-appropriate tone: ${sourceHint}`

  const response = await client.messages.create({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages:   [{ role: "user", content: prompt }],
  })

  const text  = (response.content[0] as { type: string; text: string }).text?.trim() ?? ""
  const clean = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim()
  const parsed = JSON.parse(clean) as Omit<LpGeneratedContent, "generationMethod">

  return { ...parsed, generationMethod: "llm" }
}

// ── Source context fetcher ────────────────────────────────────────────────────

async function fetchSourceContext(
  source: OpportunitySource,
  opportunityId: string,
): Promise<string> {
  try {
    const db = (await clientPromise).db()

    if (source === "seo") {
      const rec = await db.collection("seo_recommendations").findOne({ $or: [
        { _id: opportunityId as unknown as import("mongodb").ObjectId },
        { id:  opportunityId },
      ]})
      if (!rec) return "SEO opportunity — no additional context available."
      return `GSC position: ${rec.current_position ?? "unknown"}, impressions: ${rec.impressions ?? 0}, proposed change: ${rec.proposed_change ?? ""}`
    }

    if (source === "dealer") {
      const dealer = await db.collection("gem_dealers").findOne({ $or: [
        { _id: opportunityId as unknown as import("mongodb").ObjectId },
        { canonical_name: { $regex: opportunityId, $options: "i" } },
      ]})
      if (!dealer) return "Dealer opportunity — high GeM activity region."
      return `GeM dealer: ${dealer.canonical_name ?? ""}, contracts: ${dealer.total_contracts ?? 0}, opportunity score: ${dealer.opportunity_score ?? 0}`
    }

    if (source === "procurement") {
      const contract = await db.collection("fogging_contracts").findOne({ $or: [
        { _id: opportunityId as unknown as import("mongodb").ObjectId },
        { gemc_no: opportunityId },
      ]})
      if (!contract) return "Procurement opportunity — government buyer segment."
      return `Contract: ${contract.item_description ?? ""}, value: ₹${contract.total_contract_value ?? 0}, buyer: ${contract.buyer_organisation ?? ""}`
    }

    if (source === "ads") {
      const plan = await db.collection("ads_campaign_plans").findOne({ $or: [
        { planId: opportunityId },
        { _id: opportunityId as unknown as import("mongodb").ObjectId },
      ]})
      if (!plan) return "Ads opportunity — paid search landing page."
      return `Campaign: ${plan.campaignName ?? ""}, funnel: ${plan.funnelType ?? ""}, target: ${plan.targetKeyword ?? plan.keyword ?? ""}`
    }

    return "No additional context available."
  } catch {
    return "Context fetch failed — generating without enrichment."
  }
}

// ── Baseline performance capture ──────────────────────────────────────────────

async function captureBaseline(targetUrl: string, keyword: string): Promise<LpPerformance | undefined> {
  try {
    const db = (await clientPromise).db()
    // Check GSC for existing performance
    const row = await db.collection("gsc_query_rows")
      .findOne({ query: new RegExp(`^${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") })
    if (!row) return undefined
    return {
      pageViews:     Number(row.impressions ?? 0),
      leads:         0,
      trackedAt:     new Date().toISOString(),
    }
  } catch {
    return undefined
  }
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export interface LandingPageFactoryInput {
  opportunityId: string
  source:        OpportunitySource
  keyword:       string
  targetUrl:     string
  pageType:      string
  priority:      string
  sourceContext?: string
}

export interface LandingPageFactoryResult {
  ok:          boolean
  simulated:   boolean
  planId?:     string
  keyword?:    string
  confidence?: number
  error?:      string
}

export async function runLandingPageFactory(
  input: LandingPageFactoryInput,
): Promise<LandingPageFactoryResult> {
  const { opportunityId, source, keyword, targetUrl, pageType, priority } = input

  const db  = (await clientPromise).db()
  const now = new Date().toISOString()
  const planId = `lp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  // Prevent duplicate drafts for the same opportunity
  const existing = await db.collection(COLL_LANDING_PLANS).findOne({
    opportunityId,
    status: { $in: ["draft", "approved", "published"] },
  })
  if (existing) {
    return {
      ok:         true,
      simulated:  existing.simulated,
      planId:     existing.planId,
      keyword:    existing.keyword,
      confidence: existing.qualityScores?.confidence,
    }
  }

  const hasApiKey    = !!(process.env.ANTHROPIC_API_KEY || "").trim()
  const context      = input.sourceContext ?? await fetchSourceContext(source, opportunityId)
  const baseline     = await captureBaseline(targetUrl, keyword)

  let generatedContent: LpGeneratedContent
  let simulated = false

  if (hasApiKey) {
    try {
      generatedContent = await generateWithLLM(keyword, targetUrl, pageType, source, context)
    } catch (e) {
      console.warn("[landing-page-factory] LLM failed, falling back to template:", String(e))
      generatedContent = generateTemplate(keyword, targetUrl, pageType, source)
      simulated = true
    }
  } else {
    generatedContent = generateTemplate(keyword, targetUrl, pageType, source)
    simulated = true
  }

  const qualityScores = scoreContent(generatedContent)

  const plan: LandingPagePlan = {
    planId,
    opportunityId,
    source,
    keyword,
    targetUrl,
    pageType,
    priority,
    status:           "draft",
    simulated,
    generatedContent,
    qualityScores,
    performance:      baseline ? { ...baseline } : undefined,
    sourceContext:    { raw: context },
    createdAt:        now,
    updatedAt:        now,
  }

  await db.collection(COLL_LANDING_PLANS).insertOne(plan)

  await db.collection("growth_os_logs").insertOne({
    ts:     now,
    agent:  "landing-page-factory",
    action: simulated ? "lp_generated_template" : "lp_generated_llm",
    planId, opportunityId, source, keyword, pageType,
    confidence: qualityScores.confidence,
    module: "landing", level: "success",
  })

  return {
    ok:         true,
    simulated,
    planId,
    keyword,
    confidence: qualityScores.confidence,
  }
}
