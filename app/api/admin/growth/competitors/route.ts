/**
 * GET /api/admin/growth/competitors
 *
 * Returns live competitor intelligence from seo_competitors collection.
 * Computes weighted threat score (0-100) from component signals.
 * Includes module metadata for IntelligenceStatus component.
 */
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

const DB   = "100xDB"
const COLL = "seo_competitors"

interface ScoreBreakdown {
  label:      string
  value:      number   // 0-100
  weight:     number   // fraction, e.g. 0.25
  pts:        number   // weighted contribution 0-100
  source:     string
}

interface CompetitorDoc {
  _id:                  unknown
  name:                 string
  website?:             string
  normalized_name?:     string
  competitor_type?:     string
  rank?:                number
  dealer_rank?:         number
  oem_rank?:            number
  dealer_network_size?: number
  last_updated?:        string
  created_at?:          string
  sources?:             string[]
  ai_mentions?: {
    chatgpt?:            boolean
    gemini?:             boolean
    claude?:             boolean
    perplexity?:         boolean
    mention_count?:      number
    last_checked?:       string
    keywords_tracked?:   string[]
  }
  gem_data?: {
    contract_count?:    number
    total_gmv?:         number
    gem_id?:            string
    gem_listing_url?:   string
    departments?:       string[]
    ministries?:        string[]
    categories?:        string[]
    states?:            string[]
  }
  procurement_data?: {
    tender_count?:      number
    is_fogging?:        boolean
    is_health?:         boolean
    is_municipal?:      boolean
  }
  backlink_opportunity_count?: number
  scores?: {
    gem_visibility?:         number
    tender_visibility?:      number
    search_visibility?:      number
    ai_search_visibility?:   number
    authority?:              number
    revenue_potential?:      number
    total?:                  number
  }
}

function computeThreatScore(c: CompetitorDoc): { score: number; breakdown: ScoreBreakdown[] } {
  const s = c.scores ?? {}
  const ai = c.ai_mentions ?? {}
  const gem = c.gem_data ?? {}
  const proc = c.procurement_data ?? {}

  const searchVis  = Math.min(s.search_visibility ?? 0, 100)
  const aiVis      = Math.min(s.ai_search_visibility ?? 0, 100)
  const gemVis     = Math.min(s.gem_visibility ?? 0, 100)
  const tendVis    = Math.min(s.tender_visibility ?? 0, 100)
  const authority  = Math.min(s.authority ?? 0, 100)
  const revPot     = Math.min(s.revenue_potential ?? 0, 100)
  const aiMentions = Math.min((ai.mention_count ?? 0) * 25, 100) // 1 mention = 25 pts
  const dealerNet  = c.dealer_network_size ? Math.min(c.dealer_network_size / 2, 100) : 0
  const gemContracts = gem.contract_count ? Math.min(gem.contract_count * 5, 100) : 0
  const govScore   = Math.max(gemVis, tendVis, gemContracts * 0.8, proc.is_fogging ? 20 : 0, proc.is_municipal ? 15 : 0)

  const breakdown: ScoreBreakdown[] = [
    { label: "Organic Visibility",   value: searchVis,  weight: 0.25, pts: Math.round(searchVis  * 0.25), source: "Search Console / GSC" },
    { label: "AI Citations",          value: Math.max(aiVis, aiMentions), weight: 0.15,
      pts: Math.round(Math.max(aiVis, aiMentions) * 0.15), source: "AI Search Monitor" },
    { label: "Authority / Backlinks", value: authority,  weight: 0.15, pts: Math.round(authority  * 0.15), source: "SEO Intelligence" },
    { label: "Government Presence",   value: Math.round(govScore), weight: 0.15,
      pts: Math.round(govScore  * 0.15), source: "GeM + Procurement" },
    { label: "Dealer Network",        value: Math.round(dealerNet), weight: 0.10,
      pts: Math.round(dealerNet * 0.10), source: "OEM Registry" },
    { label: "Content / Revenue",     value: revPot,    weight: 0.10, pts: Math.round(revPot     * 0.10), source: "Revenue Intelligence" },
    { label: "Growth Velocity",       value: Math.round(aiMentions * 0.5 + searchVis * 0.5), weight: 0.05,
      pts: Math.round((aiMentions * 0.5 + searchVis * 0.5) * 0.05), source: "Multi-signal" },
    { label: "Product Breadth",       value: Math.min((gem.categories?.length ?? 0) * 10, 100), weight: 0.05,
      pts: Math.round(Math.min((gem.categories?.length ?? 0) * 10, 100) * 0.05), source: "GeM Categories" },
  ]

  const score = Math.min(100, breakdown.reduce((sum, b) => sum + b.pts, 0))
  return { score, breakdown }
}

function threatLevel(score: number): "HIGH" | "MEDIUM" | "LOW" {
  if (score >= 55) return "HIGH"
  if (score >= 30) return "MEDIUM"
  return "LOW"
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["intelligence:read", "competitor:read"])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const client = await clientPromise
    const db     = client.db(DB)
    const coll   = db.collection<CompetitorDoc>(COLL)

    const sp   = req.nextUrl.searchParams
    const type = sp.get("type")    // oem | dealer | all
    const sort = sp.get("sort")    // threat | name | gem | ai
    const q    = sp.get("q")

    const filter: Record<string, unknown> = {}
    if (type && type !== "all") filter.competitor_type = type
    if (q) filter.name = { $regex: q, $options: "i" }

    const docs = await coll.find(filter).toArray()

    // Compute threat scores
    const competitors = docs.map(c => {
      const { score, breakdown } = computeThreatScore(c)
      return {
        id:               String(c._id),
        name:             c.name,
        website:          c.website ?? null,
        type:             c.competitor_type ?? "unknown",
        rank:             c.rank ?? null,
        threatScore:      score,
        threatLevel:      threatLevel(score),
        breakdown,
        aiMentions: {
          chatgpt:        c.ai_mentions?.chatgpt ?? false,
          gemini:         c.ai_mentions?.gemini ?? false,
          claude:         c.ai_mentions?.claude ?? false,
          perplexity:     c.ai_mentions?.perplexity ?? false,
          count:          c.ai_mentions?.mention_count ?? 0,
          lastChecked:    c.ai_mentions?.last_checked ?? null,
          keywords:       c.ai_mentions?.keywords_tracked ?? [],
        },
        gemData: {
          contractCount:  c.gem_data?.contract_count ?? 0,
          totalGmv:       c.gem_data?.total_gmv ?? 0,
          gemId:          c.gem_data?.gem_id ?? null,
          gemUrl:         c.gem_data?.gem_listing_url ?? null,
          departments:    c.gem_data?.departments ?? [],
          states:         c.gem_data?.states ?? [],
          categories:     c.gem_data?.categories ?? [],
        },
        procurement: {
          tenderCount:    c.procurement_data?.tender_count ?? 0,
          isFogging:      c.procurement_data?.is_fogging ?? false,
          isMunicipal:    c.procurement_data?.is_municipal ?? false,
        },
        dealerNetworkSize:  c.dealer_network_size ?? null,
        backlinks:          c.backlink_opportunity_count ?? 0,
        sources:            c.sources ?? [],
        lastUpdated:        c.last_updated ?? c.created_at ?? null,
      }
    })

    // Sort
    const sorted = competitors.slice().sort((a, b) => {
      if (sort === "name")  return a.name.localeCompare(b.name)
      if (sort === "gem")   return b.gemData.contractCount - a.gemData.contractCount
      if (sort === "ai")    return b.aiMentions.count - a.aiMentions.count
      return b.threatScore - a.threatScore   // default: threat
    })

    // Module metadata for IntelligenceStatus
    const lastUpdatedDates = docs.map(d => d.last_updated ?? d.created_at).filter(Boolean) as string[]
    const latestUpdate     = lastUpdatedDates.sort().at(-1)
    const highCount  = sorted.filter(c => c.threatLevel === "HIGH").length
    const medCount   = sorted.filter(c => c.threatLevel === "MEDIUM").length

    return NextResponse.json({
      competitors: sorted,
      meta: {
        total:           sorted.length,
        highThreat:      highCount,
        mediumThreat:    medCount,
        lowThreat:       sorted.length - highCount - medCount,
        lastUpdated:     latestUpdate ?? null,
        refreshFrequency: "Daily 02:00 IST",
        autoRefresh:     false,
        confidenceScore: 72,
        coveragePct:     Math.round((docs.length / 68) * 100),
        health:          latestUpdate && (Date.now() - new Date(latestUpdate).getTime()) < 7 * 24 * 3_600_000
                         ? "healthy" : "stale",
        sources: [
          { name: "GeM Intelligence",       active: true,  recordCount: docs.filter(d => d.gem_data?.gem_id).length },
          { name: "Procurement",            active: true,  recordCount: docs.filter(d => (d.procurement_data?.tender_count ?? 0) > 0).length },
          { name: "AI Search Monitor",      active: true,  recordCount: docs.filter(d => (d.ai_mentions?.mention_count ?? 0) > 0).length },
          { name: "OEM Registry",           active: true,  recordCount: docs.filter(d => d.competitor_type === "oem").length },
          { name: "Website Crawl",          active: false, recordCount: 0 },
          { name: "Search Console",         active: false, recordCount: 0 },
          { name: "Backlink Intelligence",  active: false, recordCount: 0 },
        ],
        version: "2.0",
      },
    })
  } catch (e) {
    console.error("[competitors API]", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
