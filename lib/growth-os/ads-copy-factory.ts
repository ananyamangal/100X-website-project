/**
 * Phase 2D: Ad Copy Factory.
 *
 * Generates RSA (Responsive Search Ad) variants per ad group using Claude
 * claude-haiku-4-5. Each variant is scored for quality and keyword relevance.
 *
 * Every generated ad variant stores:
 *   adQualityScore, relevanceScore, funnel, recommendedLandingPage
 *
 * Falls back to the FUV RSA asset bank if:
 *   - ANTHROPIC_API_KEY is not set
 *   - Claude returns malformed JSON
 *   - Generated headlines/descriptions are empty after enforcement
 */

import Anthropic from "@anthropic-ai/sdk"
import type { Db } from "mongodb"
import clientPromise from "@/lib/mongodb"
import type { AdGroupTheme } from "@/lib/growth-os/ads-keyword-intelligence"
import type { GeneratedKeyword }  from "@/lib/growth-os/ads-keyword-intelligence"
import type { Funnel, RSAAssets } from "@/lib/growth-os/ads-fuv-config"
import { RSA_ASSETS, AD_GROUPS }  from "@/lib/growth-os/ads-fuv-config"

// ── Types ────────────────────────────────────────────────────────────────────

export type GenerationMethod = "llm" | "fallback_template"

export interface RSAAdVariant {
  adGroupTheme:          AdGroupTheme
  headlines:             string[]   // max 15, each ≤30 chars
  descriptions:          string[]   // max 4, each ≤90 chars
  callouts:              string[]
  sitelinks:             Array<{ text: string; url: string }>
  adQualityScore:        number     // 0–100
  relevanceScore:        number     // 0–100, keyword match in headlines
  funnel:                Funnel
  recommendedLandingPage:string
  generationMethod:      GenerationMethod
}

export interface AdCopyRun {
  runId:         string
  funnel:        Funnel
  generatedAt:   string
  variants:      RSAAdVariant[]
  engineVersion: string
}

export const AD_COPY_COLL = "ads_ad_copy_variants"
const ENGINE_VERSION = "v1.0.0"
const MODEL = "claude-haiku-4-5-20251001"

// ── Character limit enforcement ───────────────────────────────────────────────

function enforceHeadline(h: string): string {
  return h.replace(/[.!?]$/, "").trim().slice(0, 30)
}

function enforceDescription(d: string): string {
  return d.trim().slice(0, 90)
}

// ── Quality scoring ───────────────────────────────────────────────────────────

function scoreAdVariant(
  variant:  Pick<RSAAdVariant, "headlines" | "descriptions" | "callouts" | "sitelinks">,
  keywords: GeneratedKeyword[],
): { adQualityScore: number; relevanceScore: number } {
  // Ad quality: structure completeness
  const hlCount  = variant.headlines.length
  const dscCount = variant.descriptions.length
  let quality    = 0
  quality += Math.min(hlCount  / 15, 1) * 40   // 15 headlines = 40 pts
  quality += Math.min(dscCount / 4,  1) * 25   // 4 descriptions = 25 pts
  quality += variant.callouts.length > 0  ? 20 : 0
  quality += variant.sitelinks.length > 0 ? 15 : 0

  // Relevance: % of top-5 keywords that appear in any headline
  const topKws   = keywords.slice(0, 5).map(k => k.text.toLowerCase())
  const hlLower  = variant.headlines.map(h => h.toLowerCase())
  const matched  = topKws.filter(kw => hlLower.some(h => h.includes(kw) || kw.includes(h)))
  const relevance = topKws.length > 0 ? Math.round((matched.length / topKws.length) * 100) : 50

  return {
    adQualityScore: Math.min(100, Math.round(quality)),
    relevanceScore: relevance,
  }
}

// ── LLM prompt ────────────────────────────────────────────────────────────────

function buildPrompt(
  theme:       AdGroupTheme,
  landingPage: string,
  keywords:    GeneratedKeyword[],
): string {
  const themeLabel = theme === "dealer" ? "Dealer Acquisition"
    : theme === "oem" ? "OEM Authorization"
    : "GeM Reseller Program"

  const topKws = keywords.slice(0, 5).map(k => `"${k.text}"`).join(", ")

  return `You are a Google Ads copywriter for 100X Circle, an Indian manufacturer of IS 14855 certified fogging machines.

Campaign type: Search (Funnel A — Dealer Acquisition)
Ad group: ${themeLabel}
Landing page: ${landingPage}
Top keywords: ${topKws}

Brand signals:
- IS 14855 certified fogging machines
- GeM-listed manufacturer (government procurement portal)
- OEM authorization available
- Pan-India dealer network
- Government supply experience
- Apply → Enquire → Onboard → Earn

Write RSA assets for Google Ads. Output ONLY valid JSON, no explanation.

Rules:
1. Exactly 15 headlines. Each MUST be ≤30 characters (count carefully, every space counts).
2. Exactly 4 descriptions. Each MUST be ≤90 characters.
3. Headlines must NOT end with punctuation (no period, exclamation, question mark).
4. At least 2 headlines must contain a word from the top keywords list.
5. At least 1 headline must be a clear CTA (Apply Now, Enquire Today, Join Network, Get Started).
6. Descriptions should be complete sentences with CTAs.
7. Do NOT include trademarks, superlatives ("best", "#1"), or competitor names.

JSON format:
{
  "headlines": ["...", "...", "...", "...", "...", "...", "...", "...", "...", "...", "...", "...", "...", "...", "..."],
  "descriptions": ["...", "...", "...", "..."]
}`
}

// ── LLM generation ────────────────────────────────────────────────────────────

async function generateViaLLM(
  theme:       AdGroupTheme,
  landingPage: string,
  keywords:    GeneratedKeyword[],
): Promise<{ headlines: string[]; descriptions: string[]; method: GenerationMethod }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { headlines: [], descriptions: [], method: "fallback_template" }
  }

  try {
    const client  = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model:      MODEL,
      max_tokens: 1024,
      messages:   [{ role: "user", content: buildPrompt(theme, landingPage, keywords) }],
    })

    const raw  = message.content[0]
    if (raw.type !== "text") throw new Error("Non-text response")

    const jsonStr = raw.text.match(/\{[\s\S]*\}/)?.[0]
    if (!jsonStr)  throw new Error("No JSON found in response")

    const parsed = JSON.parse(jsonStr) as { headlines?: unknown; descriptions?: unknown }
    const hls    = Array.isArray(parsed.headlines)    ? (parsed.headlines as string[]).map(enforceHeadline).filter(h => h.length > 0)    : []
    const descs  = Array.isArray(parsed.descriptions) ? (parsed.descriptions as string[]).map(enforceDescription).filter(d => d.length > 0) : []

    if (hls.length < 5 || descs.length < 2) throw new Error("Insufficient assets generated")

    return { headlines: hls.slice(0, 15), descriptions: descs.slice(0, 4), method: "llm" }
  } catch {
    return { headlines: [], descriptions: [], method: "fallback_template" }
  }
}

// ── Fallback: FUV RSA asset bank ──────────────────────────────────────────────

function getFallbackAssets(theme: AdGroupTheme): RSAAssets {
  return RSA_ASSETS[theme]
}

// ── Per-theme sitelinks ───────────────────────────────────────────────────────

const SITELINKS: Record<AdGroupTheme, Array<{ text: string; url: string }>> = {
  dealer: [
    { text: "Become a Dealer",   url: "/become-a-dealer" },
    { text: "OEM Authorization", url: "/gem-oem-authorization" },
    { text: "GeM Support",       url: "/dealers-and-government" },
    { text: "Product Range",     url: "/products" },
  ],
  oem: [
    { text: "OEM Authorization", url: "/gem-oem-authorization" },
    { text: "Become a Dealer",   url: "/become-a-dealer" },
    { text: "GeM Tender Support",url: "/gem-tender-support" },
    { text: "Product Range",     url: "/products" },
  ],
  gem: [
    { text: "GeM Support",       url: "/dealers-and-government" },
    { text: "GeM Tender Help",   url: "/gem-tender-support" },
    { text: "OEM Authorization", url: "/gem-oem-authorization" },
    { text: "Become a Dealer",   url: "/become-a-dealer" },
  ],
}

const CALLOUTS: Record<AdGroupTheme, string[]> = {
  dealer: ["OEM Authorized", "GeM Listed", "Pan-India Dealers", "Govt Supply Experience"],
  oem:    ["IS 14855 Certified", "GeM Listed", "OEM Support", "Govt Experience"],
  gem:    ["GeM Listed", "Tender Support", "OEM Authorized", "Pan-India Supply"],
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function runAdCopyFactory(opts: {
  funnel:   Funnel
  byTheme:  Record<AdGroupTheme, GeneratedKeyword[]>
}): Promise<AdCopyRun> {
  const db = (await clientPromise).db() as Db
  const { funnel, byTheme } = opts

  const themeToLandingPage: Record<AdGroupTheme, string> = {
    dealer: AD_GROUPS.find(g => g.theme === "dealer")?.landingPage ?? "/become-a-dealer",
    oem:    AD_GROUPS.find(g => g.theme === "oem")?.landingPage    ?? "/gem-oem-authorization",
    gem:    AD_GROUPS.find(g => g.theme === "gem")?.landingPage    ?? "/dealers-and-government",
  }

  const variants: RSAAdVariant[] = []

  for (const theme of ["dealer", "oem", "gem"] as AdGroupTheme[]) {
    const keywords    = byTheme[theme]
    const landingPage = themeToLandingPage[theme]

    const { headlines, descriptions, method } = await generateViaLLM(theme, landingPage, keywords)

    const finalHeadlines    = headlines.length >= 5    ? headlines    : getFallbackAssets(theme).headlines
    const finalDescriptions = descriptions.length >= 2 ? descriptions : getFallbackAssets(theme).descriptions
    const usedMethod: GenerationMethod = headlines.length >= 5 ? method : "fallback_template"

    const { adQualityScore, relevanceScore } = scoreAdVariant(
      { headlines: finalHeadlines, descriptions: finalDescriptions, callouts: CALLOUTS[theme], sitelinks: SITELINKS[theme] },
      keywords,
    )

    variants.push({
      adGroupTheme:          theme,
      headlines:             finalHeadlines,
      descriptions:          finalDescriptions,
      callouts:              CALLOUTS[theme],
      sitelinks:             SITELINKS[theme],
      adQualityScore,
      relevanceScore,
      funnel,
      recommendedLandingPage: landingPage,
      generationMethod:      usedMethod,
    })
  }

  const runId = `acf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const run: AdCopyRun = {
    runId, funnel, generatedAt: new Date().toISOString(), variants, engineVersion: ENGINE_VERSION,
  }

  await db.collection(AD_COPY_COLL).insertOne({ ...run })
  return run
}
