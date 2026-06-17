import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"
export const maxDuration = 180

// ─── Category keywords ─────────────────────────────────────────────────────────

const FOGGING_KW = ["fog", "mist", "mosquito", "vector", "pest", "malaria", "dengue",
  "larvi", "aerosol", "spray machine", "fumigat", "ulv", "thermal fog", "cold fog", "disinfect"]
const HEALTH_KW  = ["health", "hospital", "sanit", "hygiene", "epidemic", "phed", "water supply"]
const MUNI_KW    = ["municipal", "civic", "nagar", "corporation", "panchayat", "town"]

const OUR_NAMES  = ["100x", "hundred x", "hundredx", "100xcircle", "100x circle", "100 x"]
const OUR_REGEX  = new RegExp(OUR_NAMES.join("|"), "i")

// ─── Known OEM brands — these are manufacturers, NOT resellers ────────────────
// Contract Winner → Seller → OEM Brand → Competitor

const OEM_REGISTRY = [
  {
    name: "Neptune", normalized: "neptune",
    website: "neptunefoggers.com",
    seller_patterns: ["neptune"],
    product_patterns: ["neptune"],
    ai_known: { chatgpt: false, gemini: true, claude: false, perplexity: false },
    search_visibility: 65,
  },
  {
    name: "Pulsfog", normalized: "pulsfog",
    website: "pulsfog.de",
    seller_patterns: ["pulsfog", "puls fog"],
    product_patterns: ["pulsfog", "puls fog"],
    ai_known: { chatgpt: false, gemini: false, claude: false, perplexity: false },
    search_visibility: 40,
  },
  {
    name: "Foggers India", normalized: "foggers_india",
    website: "foggersindia.com",
    seller_patterns: ["foggers india", "foggersindia"],
    product_patterns: ["foggers india"],
    ai_known: { chatgpt: false, gemini: false, claude: false, perplexity: false },
    search_visibility: 70,
  },
  {
    name: "GLVM", normalized: "glvm",
    website: "glvm.co.in",
    seller_patterns: ["glvm"],
    product_patterns: ["glvm"],
    ai_known: { chatgpt: false, gemini: false, claude: false, perplexity: false },
    search_visibility: 35,
  },
  {
    name: "Sai Shree Enterprises", normalized: "sai_shree_enterprises",
    website: null,
    seller_patterns: ["sai shree"],
    product_patterns: ["sai shree"],
    ai_known: { chatgpt: false, gemini: false, claude: false, perplexity: false },
    search_visibility: 20,
  },
  {
    name: "Royal Trade Links", normalized: "royal_trade_links",
    website: null,
    seller_patterns: ["royal trade links", "royaltradelinks"],
    product_patterns: ["royal trade"],
    ai_known: { chatgpt: false, gemini: false, claude: false, perplexity: false },
    search_visibility: 15,
  },
  {
    name: "Infinity", normalized: "infinity_foggers",
    website: null,
    seller_patterns: ["infinity fog", "infinity ulv", "infinityfog"],
    product_patterns: ["infinity fog", "infinity ulv"],
    ai_known: { chatgpt: false, gemini: false, claude: false, perplexity: false },
    search_visibility: 10,
  },
  {
    name: "Instafog", normalized: "instafog",
    website: "foggingmachines.in",
    seller_patterns: ["instafog", "insta fog"],
    product_patterns: ["instafog"],
    ai_known: { chatgpt: true, gemini: false, claude: false, perplexity: true },
    search_visibility: 60,
  },
]

type OemEntry = typeof OEM_REGISTRY[0]

// ─── AI Search data for dealer brands ────────────────────────────────────────

const AI_KNOWN_BRANDS: Record<string, { chatgpt: boolean; gemini: boolean; claude: boolean; perplexity: boolean }> = {
  "balwaan enterprises":    { chatgpt: true,  gemini: true,  claude: false, perplexity: true  },
  "kisankraft":             { chatgpt: true,  gemini: true,  claude: true,  perplexity: true  },
  "vectorfog":              { chatgpt: true,  gemini: false, claude: false, perplexity: true  },
  "curtis dyna-fog":        { chatgpt: false, gemini: false, claude: true,  perplexity: false },
  "swingfog":               { chatgpt: true,  gemini: true,  claude: false, perplexity: false },
}

// ─── Industry link sources for dealer backlink gap analysis ──────────────────

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

function calcScores(input: {
  contract_count: number; total_gmv: number
  dept_count: number; ministry_count: number; category_count: number
  is_fogging: boolean; is_health: boolean; is_muni: boolean
  ai_mentions: number; search_visibility_override?: number
}, maxContracts: number, maxGmv: number) {
  const gem_visibility    = Math.min(100, logScale(input.contract_count, maxContracts))
  const revenue_potential = Math.min(100, logScale(input.total_gmv, maxGmv))
  const tender_visibility = Math.min(100, Math.round(
    (input.dept_count / Math.max(1, 20)) * 60 + (input.ministry_count / Math.max(1, 5)) * 40
  ))
  const search_visibility = input.search_visibility_override ?? Math.min(100, Math.round(
    (input.is_fogging ? 50 : 0) + (input.is_health ? 20 : 0) + (input.is_muni ? 20 : 0) +
    Math.min(10, input.category_count * 2)
  ))
  const ai_search_visibility = Math.min(100, input.ai_mentions * 25)
  const authority = Math.min(100, Math.round(gem_visibility * 0.4 + revenue_potential * 0.4 + tender_visibility * 0.2))
  const total = Math.round(
    gem_visibility * 0.30 + revenue_potential * 0.25 + tender_visibility * 0.20 +
    search_visibility * 0.15 + ai_search_visibility * 0.05 + authority * 0.05
  )
  return { gem_visibility, tender_visibility, search_visibility, revenue_potential, ai_search_visibility, authority, total }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchesOem(sellerName: string): OemEntry | null {
  const lower = sellerName.toLowerCase()
  return OEM_REGISTRY.find(oem => oem.seller_patterns.some(p => lower.includes(p))) ?? null
}

const isFogging = (cats: string[]) => cats.some(c => FOGGING_KW.some(k => c?.toLowerCase().includes(k)))
const isHealth  = (depts: string[]) => depts.some(d => HEALTH_KW.some(k => d?.toLowerCase().includes(k)))
const isMuni    = (depts: string[]) => depts.some(d => MUNI_KW.some(k => d?.toLowerCase().includes(k)))

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

  // ── Step 1: Mine all fogging/health/municipal sellers from GeM ────────────
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
        _id:            "$seller_name_canonical",
        contract_count: { $sum: 1 },
        total_gmv:      { $sum: "$contract_value_num" },
        departments:    { $addToSet: "$dept_name" },
        ministries:     { $addToSet: "$ministry" },
        categories:     { $addToSet: "$product_name" },
        gem_ids:        { $addToSet: "$seller_gem_id" },
        states:         { $addToSet: "$seller_state" },
      },
    },
    { $match: { _id: { $not: OUR_REGEX } } },
    { $sort: { total_gmv: -1 } },
    { $limit: 60 },
  ]).toArray() as Array<{
    _id: string; contract_count: number; total_gmv: number
    departments: string[]; ministries: string[]; categories: string[]
    gem_ids: string[]; states: string[]
  }>

  if (!sellers.length) {
    return NextResponse.json({ ok: true, oem_competitors: 0, dealer_network: 0, message: "No sellers found" })
  }

  const maxGmv       = Math.max(...sellers.map(s => s.total_gmv), 1)
  const maxContracts = Math.max(...sellers.map(s => s.contract_count), 1)

  // ── Step 2: Classify each seller as OEM or Dealer ─────────────────────────
  // Contract Winner → Seller → if matches OEM pattern → "oem", else → "dealer"
  const oemSellersFound = new Set<string>()
  let upserted = 0

  for (const s of sellers) {
    if (!s._id) continue

    const normalized = s._id.toLowerCase().trim().replace(/\s+/g, "_")
    const matchedOem = matchesOem(s._id)
    if (matchedOem) oemSellersFound.add(matchedOem.normalized)

    const aiKey  = Object.keys(AI_KNOWN_BRANDS).find(k => s._id.toLowerCase().includes(k.split(" ")[0]))
    const aiData = matchedOem?.ai_known ?? (aiKey ? AI_KNOWN_BRANDS[aiKey] : { chatgpt: false, gemini: false, claude: false, perplexity: false })
    const aiMentionCount = Object.values(aiData).filter(Boolean).length

    const scores = calcScores({
      contract_count:  s.contract_count,
      total_gmv:       s.total_gmv,
      dept_count:      (s.departments ?? []).filter(Boolean).length,
      ministry_count:  (s.ministries  ?? []).filter(Boolean).length,
      category_count:  (s.categories  ?? []).filter(Boolean).length,
      is_fogging:      isFogging(s.categories  ?? []),
      is_health:       isHealth(s.departments  ?? []),
      is_muni:         isMuni(s.departments    ?? []),
      ai_mentions:     aiMentionCount,
      search_visibility_override: matchedOem?.search_visibility,
    }, maxContracts, maxGmv)

    const slug    = s._id.toLowerCase().replace(/[^a-z0-9]/g, "")
    const website = matchedOem?.website ? `https://www.${matchedOem.website}` : `https://www.${slug}.com`
    const gemId   = (s.gem_ids ?? []).filter(Boolean)[0] ?? null

    await coll.updateOne(
      { normalized_name: normalized },
      {
        $set: {
          name:            s._id,
          normalized_name: normalized,
          website,
          competitor_type: matchedOem ? "oem" : "dealer",
          sources: [
            "gem_intelligence",
            ...(isFogging(s.categories ?? []) ? ["fogging_intelligence"] : []),
            ...(isHealth(s.departments ?? []) || isMuni(s.departments ?? []) ? ["procurement_intelligence"] : []),
            ...(aiMentionCount > 0 ? ["ai_search_intelligence"] : []),
          ],
          gem_data: {
            contract_count:  s.contract_count,
            total_gmv:       s.total_gmv,
            gem_id:          gemId,
            gem_listing_url: gemId
              ? `https://mkp.gem.gov.in/seller/${gemId}`
              : `https://mkp.gem.gov.in/search?q=${encodeURIComponent(s._id)}`,
            departments: (s.departments ?? []).filter(Boolean).slice(0, 10),
            ministries:  (s.ministries  ?? []).filter(Boolean).slice(0, 5),
            categories:  (s.categories  ?? []).filter(Boolean).slice(0, 8),
            states:      (s.states      ?? []).filter(Boolean).slice(0, 5),
          },
          procurement_data: {
            tender_count:  s.contract_count,
            is_fogging:    isFogging(s.categories ?? []),
            is_health:     isHealth(s.departments  ?? []),
            is_municipal:  isMuni(s.departments    ?? []),
          },
          ai_mentions: {
            ...aiData,
            mention_count:    aiMentionCount,
            last_checked:     now,
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

  // ── Step 3: Seed known OEMs not appearing as direct GeM sellers ───────────
  // These OEMs exist in the market but may sell through dealers only
  let oemSeeded = 0
  for (const oem of OEM_REGISTRY) {
    if (oemSellersFound.has(oem.normalized)) continue

    // Count how many dealers sell products mentioning this OEM brand
    const dealerNames = oem.product_patterns.length > 0
      ? (await gc.distinct("seller_name_canonical", {
          product_name:           { $in: oem.product_patterns.map(p => new RegExp(p, "i")) },
          seller_name_canonical:  { $nin: [null, ""], $not: OUR_REGEX },
        })).filter(Boolean)
      : []
    const dealerNetworkSize = dealerNames.length

    const aiMentionCount = Object.values(oem.ai_known).filter(Boolean).length

    await coll.updateOne(
      { normalized_name: oem.normalized },
      {
        $set: {
          name:            oem.name,
          normalized_name: oem.normalized,
          website:         oem.website ? `https://www.${oem.website}` : "",
          competitor_type: "oem",
          sources:         ["known_oem"],
          gem_data: {
            contract_count:  0,
            total_gmv:       0,
            gem_id:          null,
            gem_listing_url: `https://mkp.gem.gov.in/search?q=${encodeURIComponent(oem.name)}`,
            departments:     [],
            ministries:      [],
            categories:      [],
            states:          [],
          },
          procurement_data: { tender_count: 0, is_fogging: true, is_health: false, is_municipal: false },
          ai_mentions: {
            ...oem.ai_known,
            mention_count:    aiMentionCount,
            last_checked:     now,
            keywords_tracked: ["fogging machine", "thermal fogging machine", "ulv fogger"],
          },
          dealer_network_size: dealerNetworkSize,
          scores: {
            gem_visibility:      0,
            revenue_potential:   0,
            tender_visibility:   0,
            search_visibility:   oem.search_visibility,
            ai_search_visibility: Math.min(100, aiMentionCount * 25),
            authority:            Math.round(oem.search_visibility * 0.5),
            total:                Math.round(oem.search_visibility * 0.4 + aiMentionCount * 8 + dealerNetworkSize * 2),
          },
          rank:         0,
          backlink_opportunity_count: 0,
          last_updated: now,
        },
        $setOnInsert: { created_at: now },
      },
      { upsert: true }
    )
    oemSeeded++
  }

  // ── Step 4: Update dealer_network_size for OEMs found as GeM sellers ──────
  for (const oem of OEM_REGISTRY) {
    if (!oemSellersFound.has(oem.normalized)) continue
    const dealerNetworkSize = oem.product_patterns.length > 0
      ? (await gc.distinct("seller_name_canonical", {
          product_name:          { $in: oem.product_patterns.map(p => new RegExp(p, "i")) },
          seller_name_canonical: { $nin: [null, ""], $not: OUR_REGEX },
        })).filter(Boolean).length
      : 0
    await coll.updateOne(
      { normalized_name: oem.normalized },
      { $set: { dealer_network_size: dealerNetworkSize } }
    )
  }

  // ── Step 5: Rank OEMs and Dealers independently ───────────────────────────
  const rankedOems    = await coll.find({ competitor_type: "oem"    }).sort({ "scores.total": -1 }).toArray()
  const rankedDealers = await coll.find({ competitor_type: "dealer" }).sort({ "scores.total": -1 }).toArray()

  for (let i = 0; i < rankedOems.length; i++) {
    await coll.updateOne({ _id: rankedOems[i]._id }, { $set: { rank: i + 1, oem_rank: i + 1 } })
  }
  for (let i = 0; i < rankedDealers.length; i++) {
    await coll.updateOne({ _id: rankedDealers[i]._id }, { $set: { rank: i + 1, dealer_rank: i + 1 } })
  }

  // ── Step 6: Backlink gap analysis — dealers only (not OEMs) ───────────────
  let linksCreated = 0
  for (const comp of rankedDealers.slice(0, 10)) {
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
        discovered_at:      now, created_at: now, updated_at: now,
      })
      linksCreated++
    }
    await coll.updateOne(
      { normalized_name: comp.normalized_name },
      { $set: { backlink_opportunity_count: LINK_SOURCES.length } }
    )
  }

  await log.insertOne({
    collection: "seo_competitors", action: "dynamic_competitor_discovery_v321",
    detail: `v3.2.1: ${upserted} sellers classified, ${oemSellersFound.size} OEMs via GeM, ${oemSeeded} OEMs seeded, ${rankedDealers.length} dealers ranked, ${linksCreated} link gaps`,
    created_at: now,
  })

  return NextResponse.json({
    ok:              true,
    oem_competitors: rankedOems.length,
    dealer_network:  rankedDealers.length,
    links_created:   linksCreated,
    top_oems:        rankedOems.slice(0, 5).map(c => ({ name: c.name, score: (c.scores as {total:number}).total })),
    top_dealers:     rankedDealers.slice(0, 5).map(c => ({ name: c.name, score: (c.scores as {total:number}).total })),
  })
}
