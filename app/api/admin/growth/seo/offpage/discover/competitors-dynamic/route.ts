import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"
export const maxDuration = 180

// ─── Fogging category keywords (reuse from procurement/opportunity) ───────────

const FOGGING_KW = ["fog", "mist", "mosquito", "vector", "pest", "malaria", "dengue",
  "larvi", "aerosol", "spray machine", "fumigat", "ulv", "thermal fog", "cold fog", "disinfect"]
const HEALTH_KW  = ["health", "hospital", "sanit", "hygiene", "epidemic", "phed", "water supply"]
const MUNI_KW    = ["municipal", "civic", "nagar", "corporation", "panchayat", "town"]

// 100x Circle seller name variants — exclude from competitor list
const OUR_NAMES  = ["100x", "hundred x", "hundredx", "100xcircle", "100x circle", "100 x"]
const OUR_REGEX  = new RegExp(OUR_NAMES.join("|"), "i")

// ─── Curated AI Search data (Source 4 — manual seeding of known AI-visible brands)
// These are brands that commonly appear in LLM/AI search results for fogging keywords
const AI_KNOWN_BRANDS: Record<string, { chatgpt: boolean; gemini: boolean; claude: boolean; perplexity: boolean }> = {
  "balwaan enterprises":    { chatgpt: true,  gemini: true,  claude: false, perplexity: true  },
  "kisankraft":             { chatgpt: true,  gemini: true,  claude: true,  perplexity: true  },
  "neptune":                { chatgpt: false, gemini: true,  claude: false, perplexity: false },
  "vectorfog":              { chatgpt: true,  gemini: false, claude: false, perplexity: true  },
  "curtis dyna-fog":        { chatgpt: false, gemini: false, claude: true,  perplexity: false },
  "swingfog":               { chatgpt: true,  gemini: true,  claude: false, perplexity: false },
  "igeba":                  { chatgpt: false, gemini: false, claude: false, perplexity: false },
}

// ─── Industry link sources seeded for all discovered competitors ──────────────
const LINK_SOURCES: { domain: string; da: number; category: string }[] = [
  { domain: "indiamart.com",       da: 72, category: "b2b_marketplace"        },
  { domain: "tradeindia.com",      da: 65, category: "b2b_marketplace"        },
  { domain: "exportersindia.com",  da: 57, category: "b2b_marketplace"        },
  { domain: "justdial.com",        da: 70, category: "local_directory"        },
  { domain: "krishijagran.com",    da: 52, category: "agriculture_media"      },
  { domain: "agrifarming.in",      da: 44, category: "agriculture_media"      },
  { domain: "pestcontrolindia.com",da: 36, category: "pest_control_directory" },
  { domain: "ipca.org.in",         da: 40, category: "industry_association"   },
  { domain: "nvbdcp.gov.in",       da: 58, category: "govt_vector_control"    },
  { domain: "amazon.in",           da: 86, category: "ecommerce"              },
  { domain: "flipkart.com",        da: 83, category: "ecommerce"              },
  { domain: "tractorjunction.com", da: 51, category: "agri_equipment"        },
]

// ─── Scoring ──────────────────────────────────────────────────────────────────

function logScale(val: number, max: number): number {
  if (max <= 0 || val <= 0) return 0
  return Math.round(Math.log10(Math.max(1, val)) / Math.log10(Math.max(2, max)) * 100)
}

function calcScores(seller: {
  contract_count: number; total_gmv: number
  dept_count: number; ministry_count: number; category_count: number
  is_fogging: boolean; is_health: boolean; is_muni: boolean
  ai_mentions: number
}, maxContracts: number, maxGmv: number): {
  gem_visibility: number; tender_visibility: number; search_visibility: number
  revenue_potential: number; ai_search_visibility: number; authority: number; total: number
} {
  const gem_visibility    = Math.min(100, logScale(seller.contract_count, maxContracts))
  const revenue_potential = Math.min(100, logScale(seller.total_gmv, maxGmv))
  const tender_visibility = Math.min(100, Math.round(((seller.dept_count / Math.max(1, 20)) * 60 + (seller.ministry_count / Math.max(1, 5)) * 40)))
  const search_visibility = Math.min(100, Math.round((
    (seller.is_fogging ? 50 : 0) +
    (seller.is_health  ? 20 : 0) +
    (seller.is_muni    ? 20 : 0) +
    Math.min(10, seller.category_count * 2)
  )))
  const ai_search_visibility = Math.min(100, seller.ai_mentions * 25)
  const authority           = Math.min(100, Math.round((gem_visibility * 0.4 + revenue_potential * 0.4 + tender_visibility * 0.2)))

  const total = Math.round(
    gem_visibility    * 0.30 +
    revenue_potential * 0.25 +
    tender_visibility * 0.20 +
    search_visibility * 0.15 +
    ai_search_visibility * 0.05 +
    authority         * 0.05
  )

  return { gem_visibility, tender_visibility, search_visibility, revenue_potential, ai_search_visibility, authority, total }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const db   = (await clientPromise).db()
  const gc   = db.collection("gem_contracts")
  const coll = db.collection("seo_competitors")
  const cl   = db.collection("seo_competitor_links")
  const log  = db.collection("seo_offpage_audit_log")
  const now  = new Date().toISOString()

  // ── Source 1 + 2: Fogging & GeM Intelligence ─────────────────────────────
  // Mine gem_contracts: all sellers in fogging/health/municipal categories
  const fogFilter = { $or: FOGGING_KW.map(k => ({ product_name: { $regex: k, $options: "i" } })) }
  const healthFilter = { $or: HEALTH_KW.map(k => ({ $or: [{ dept_name: { $regex: k, $options: "i" } }, { ministry: { $regex: k, $options: "i" } }] })) }
  const muniFilter   = { $or: MUNI_KW.map(k => ({ dept_name: { $regex: k, $options: "i" } })) }

  const sellers = await gc.aggregate([
    {
      $match: {
        seller_name_canonical: { $nin: [null, ""], $not: OUR_REGEX },
        $or: [
          { $or: FOGGING_KW.map(k => ({ product_name: { $regex: k, $options: "i" } })) },
          { $or: HEALTH_KW.map(k => ({ dept_name:    { $regex: k, $options: "i" } })) },
          { $or: MUNI_KW.map(k   => ({ dept_name:    { $regex: k, $options: "i" } })) },
        ],
      },
    },
    {
      $group: {
        _id:           "$seller_name_canonical",
        contract_count: { $sum: 1 },
        total_gmv:      { $sum: "$contract_value_num" },
        departments:    { $addToSet: "$dept_name" },
        ministries:     { $addToSet: "$ministry" },
        categories:     { $addToSet: "$product_name" },
        gem_ids:        { $addToSet: "$seller_gem_id" },
        states:         { $addToSet: "$seller_state" },
      },
    },
    // Filter out 100x Circle again at group level
    { $match: { _id: { $not: OUR_REGEX } } },
    { $sort: { total_gmv: -1 } },
    { $limit: 60 },
  ]).toArray() as Array<{
    _id: string; contract_count: number; total_gmv: number
    departments: string[]; ministries: string[]; categories: string[]
    gem_ids: string[]; states: string[]
  }>

  if (!sellers.length) {
    return NextResponse.json({ ok: true, discovered: 0, message: "No competitor sellers found in gem_contracts" })
  }

  // ── Source 3: Procurement Intelligence — classify by tender type ──────────
  const isFogging = (cats: string[]) => cats.some(c => FOGGING_KW.some(k => c?.toLowerCase().includes(k)))
  const isHealth  = (depts: string[]) => depts.some(d => HEALTH_KW.some(k => d?.toLowerCase().includes(k)))
  const isMuni    = (depts: string[]) => depts.some(d => MUNI_KW.some(k => d?.toLowerCase().includes(k)))

  const maxGmv      = Math.max(...sellers.map(s => s.total_gmv), 1)
  const maxContracts = Math.max(...sellers.map(s => s.contract_count), 1)

  let upserted = 0
  const competitorNames: string[] = []

  for (const s of sellers) {
    if (!s._id) continue

    const normalized = s._id.toLowerCase().trim().replace(/\s+/g, "_")
    competitorNames.push(normalized)

    // ── Source 4: Check AI Search seeding ──────────────────────────────────
    const aiKey = Object.keys(AI_KNOWN_BRANDS).find(k => s._id.toLowerCase().includes(k.split(" ")[0]))
    const aiData = aiKey ? AI_KNOWN_BRANDS[aiKey] : { chatgpt: false, gemini: false, claude: false, perplexity: false }
    const aiMentionCount = Object.values(aiData).filter(Boolean).length

    const scoreInput = {
      contract_count:  s.contract_count,
      total_gmv:       s.total_gmv,
      dept_count:      (s.departments ?? []).filter(Boolean).length,
      ministry_count:  (s.ministries  ?? []).filter(Boolean).length,
      category_count:  (s.categories  ?? []).filter(Boolean).length,
      is_fogging:      isFogging(s.categories  ?? []),
      is_health:       isHealth(s.departments  ?? []),
      is_muni:         isMuni(s.departments    ?? []),
      ai_mentions:     aiMentionCount,
    }
    const scores = calcScores(scoreInput, maxContracts, maxGmv)

    // Detect primary website pattern (best-effort from name)
    const slug    = s._id.toLowerCase().replace(/[^a-z0-9]/g, "")
    const website = `https://www.${slug}.com`

    const gemId = (s.gem_ids ?? []).filter(Boolean)[0] ?? null
    const gemListingUrl = gemId
      ? `https://mkp.gem.gov.in/seller/${gemId}`
      : `https://mkp.gem.gov.in/search?q=${encodeURIComponent(s._id)}`

    await coll.updateOne(
      { normalized_name: normalized },
      {
        $set: {
          name:            s._id,
          normalized_name: normalized,
          website,
          sources:         [
            "gem_intelligence",
            ...(isFogging(s.categories ?? []) ? ["fogging_intelligence"] : []),
            ...(isHealth(s.departments ?? []) || isMuni(s.departments ?? []) ? ["procurement_intelligence"] : []),
            ...(aiMentionCount > 0 ? ["ai_search_intelligence"] : []),
          ],
          gem_data: {
            contract_count: s.contract_count,
            total_gmv:      s.total_gmv,
            gem_id:         gemId,
            gem_listing_url: gemListingUrl,
            departments:    (s.departments ?? []).filter(Boolean).slice(0, 10),
            ministries:     (s.ministries  ?? []).filter(Boolean).slice(0, 5),
            categories:     (s.categories  ?? []).filter(Boolean).slice(0, 8),
            states:         (s.states      ?? []).filter(Boolean).slice(0, 5),
          },
          procurement_data: {
            tender_count:   s.contract_count,
            is_fogging:     isFogging(s.categories ?? []),
            is_health:      isHealth(s.departments  ?? []),
            is_municipal:   isMuni(s.departments    ?? []),
          },
          ai_mentions: {
            ...aiData,
            mention_count: aiMentionCount,
            last_checked:  now,
            keywords_tracked: ["fogging machine", "thermal fogging machine", "ulv fogger", "mosquito fogger"],
          },
          scores,
          rank:         0,
          backlink_opportunity_count: 0,
          last_updated: now,
        },
        $setOnInsert: { created_at: now },
      },
      { upsert: true }
    )
    upserted++
  }

  // ── Assign ranks ──────────────────────────────────────────────────────────
  const ranked = await coll.find({}).sort({ "scores.total": -1 }).limit(20).toArray()
  for (let i = 0; i < ranked.length; i++) {
    await coll.updateOne({ _id: ranked[i]._id }, { $set: { rank: i + 1 } })
  }

  // ── Source 5: Backlink Intelligence — generate link gap opportunities ──────
  // For each discovered competitor, seed industry link sources as "gap" opportunities
  let linksCreated = 0
  for (const comp of ranked.slice(0, 10)) {
    // Only seed top-10 competitors to avoid DB bloat
    for (const src of LINK_SOURCES) {
      const exists = await cl.findOne({ competitor: comp.normalized_name, domain: src.domain })
      if (exists) continue
      await cl.insertOne({
        competitor:         comp.normalized_name,
        competitor_name:    comp.name,
        competitor_domain:  comp.website,
        backlink_url:       `https://${src.domain}/`,
        domain:             src.domain,
        anchor_text:        `${comp.name.toLowerCase()} fogging machine`,
        domain_authority:   src.da,
        gap_status:         "gap",
        opportunity:        src.da >= 60 ? "high" : src.da >= 40 ? "medium" : "low",
        source:             "dynamic_discovery",
        category:           src.category,
        competitor_rank:    comp.rank,
        discovered_at:      now,
        created_at:         now,
        updated_at:         now,
      })
      linksCreated++
    }
    // Update competitor with backlink opportunity count
    await coll.updateOne(
      { normalized_name: comp.normalized_name },
      { $set: { backlink_opportunity_count: LINK_SOURCES.length } }
    )
  }

  await log.insertOne({
    collection: "seo_competitors", action: "dynamic_competitor_discovery",
    detail: `Dynamic discovery: ${upserted} competitors upserted, ${ranked.length} ranked, ${linksCreated} link gaps created`,
    sources: ["gem_intelligence", "fogging_intelligence", "procurement_intelligence", "ai_search_intelligence", "backlink_intelligence"],
    created_at: now,
  })

  return NextResponse.json({
    ok:              true,
    discovered:      upserted,
    ranked:          ranked.length,
    links_created:   linksCreated,
    top_competitors: ranked.slice(0, 5).map(c => ({ name: c.name, score: (c.scores as {total:number}).total, rank: c.rank })),
  })
}
