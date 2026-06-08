import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { type Db } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requirePermission } from "@/lib/rbac/server"

export const maxDuration = 60

// ─── Query cache helpers ───────────────────────────────────────────────────────

const CACHE_TTL_SECONDS = 3600
let _ttlIndexCreated = false

async function ensureCacheTtlIndex(db: Db): Promise<void> {
  if (_ttlIndexCreated) return
  try {
    await db.collection("gem_procurement_query_cache")
      .createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })
  } catch {
    // Index already exists or non-critical error — ignore
  }
  _ttlIndexCreated = true
}

function makeCacheKey(question: string): string {
  return question.slice(0, 100).toLowerCase().trim()
}

interface CacheDoc {
  key: string
  question: string
  result: Record<string, unknown>
  created_at: Date
  expires_at: Date
}

async function getCached(db: Db, key: string): Promise<CacheDoc | null> {
  return db.collection<CacheDoc>("gem_procurement_query_cache")
    .findOne({ key, expires_at: { $gt: new Date() } })
}

async function setCache(db: Db, key: string, question: string, result: Record<string, unknown>): Promise<void> {
  const now = new Date()
  const expires = new Date(now.getTime() + CACHE_TTL_SECONDS * 1000)
  await db.collection("gem_procurement_query_cache").updateOne(
    { key },
    { $set: { key, question, result, created_at: now, expires_at: expires } },
    { upsert: true }
  )
}

const ALLOWED_COLLECTIONS = new Set([
  "gem_contracts",
  "gem_kg_dealer_scores",
  "gem_kg_dealer_dept",
  "gem_kg_dealer_product",
  "gem_kg_dealer_state",
  "gem_kg_dept_product",
  "gem_kg_dept_scores",
  "gem_kg_product_scores",
])

const ALLOWED_STAGES = new Set([
  "$match", "$group", "$project", "$sort", "$limit", "$unwind",
  "$addFields", "$lookup", "$count", "$skip", "$replaceRoot", "$facet",
])

// ─── Fallback deterministic templates ─────────────────────────────────────────

interface FallbackTemplate {
  id:          string
  keywords:    string[]
  collection:  string
  pipeline:    Record<string, unknown>[]
  explanation: string
}

const FALLBACK_TEMPLATES: FallbackTemplate[] = [
  {
    id: "fogging_dealers",
    keywords: ["fog", "fogging", "thermal", "ulv", "mosquito", "vector", "insecticide", "sprayer"],
    collection: "gem_kg_dealer_product",
    pipeline: [
      { $match: { product: { $regex: "fog|fogger|thermal fog|ulv|mosquito|vector control|insecticide sprayer|knapsack", $options: "i" } } },
      { $group: { _id: "$dealer", product_count: { $sum: 1 }, total_gmv: { $sum: "$total_gmv" }, dept_count: { $max: "$dept_count" } } },
      { $project: { _id: 0, dealer: "$_id", product_count: 1, total_gmv: 1, dept_count: 1 } },
      { $sort: { total_gmv: -1 } },
      { $limit: 50 },
    ],
    explanation: "Dealers who have sold fogging/vector-control products on GeM"
  },
  {
    id: "top_dealers_score",
    keywords: ["top", "dealer", "score", "rank", "best", "distribute", "channel"],
    collection: "gem_kg_dealer_scores",
    pipeline: [
      { $sort: { dealer_score: -1 } },
      { $limit: 20 },
      { $project: { _id: 0, dealer: 1, dealer_score: 1, total_gmv: 1, total_contracts: 1, dept_count: 1, state_count: 1, product_count: 1 } },
    ],
    explanation: "Top 20 dealers ranked by composite GeM score (GMV + reach + breadth)"
  },
  {
    id: "top_dealers_gmv",
    keywords: ["gmv", "revenue", "value", "crore", "largest", "biggest"],
    collection: "gem_kg_dealer_scores",
    pipeline: [
      { $sort: { total_gmv: -1 } },
      { $limit: 20 },
      { $project: { _id: 0, dealer: 1, total_gmv: 1, total_contracts: 1, dept_count: 1, state_count: 1, dealer_score: 1 } },
    ],
    explanation: "Top 20 dealers by total GeM contract value"
  },
  {
    id: "health_dealers",
    keywords: ["health", "hospital", "medical", "phc", "primary health"],
    collection: "gem_kg_dealer_dept",
    pipeline: [
      { $match: { dept: { $regex: "health|hospital|medical|PHC|primary health|district health", $options: "i" } } },
      { $group: { _id: "$dealer", dept_count: { $sum: 1 }, total_gmv: { $sum: "$total_gmv" }, state_count: { $max: "$state_count" } } },
      { $project: { _id: 0, dealer: "$_id", dept_count: 1, total_gmv: 1, state_count: 1 } },
      { $sort: { total_gmv: -1 } },
      { $limit: 30 },
    ],
    explanation: "Dealers serving health departments on GeM"
  },
  {
    id: "municipal_depts",
    keywords: ["municipal", "nagar", "corporation", "urban", "civic", "local body"],
    collection: "gem_kg_dept_scores",
    pipeline: [
      { $match: { dept: { $regex: "municipal|nagar|corporation|urban local|civic|nagar nigam|nagar palika", $options: "i" } } },
      { $sort: { total_gmv: -1 } },
      { $limit: 30 },
      { $project: { _id: 0, dept: 1, ministry: 1, total_gmv: 1, total_contracts: 1, seller_count: 1, product_count: 1 } },
    ],
    explanation: "Municipal / urban local body departments ranked by spend"
  },
  {
    id: "sanitation_growth",
    keywords: ["sanitation", "waste", "cleaning", "hygiene", "sweeper", "solid waste", "growth", "growing"],
    collection: "gem_kg_product_scores",
    pipeline: [
      { $match: { product: { $regex: "sanitation|waste|cleaning|hygiene|sweep|solid waste", $options: "i" } } },
      { $sort: { growth_rate: -1 } },
      { $limit: 25 },
      { $project: { _id: 0, product: 1, total_gmv: 1, total_contracts: 1, growth_rate: 1, seller_count: 1, dept_count: 1 } },
    ],
    explanation: "Sanitation/waste products sorted by growth rate"
  },
  {
    id: "vendor_concentration",
    keywords: ["repeat", "same seller", "monopoly", "concentration", "dependent", "single vendor"],
    collection: "gem_kg_dept_scores",
    pipeline: [
      { $sort: { vendor_concentration: -1 } },
      { $limit: 25 },
      { $project: { _id: 0, dept: 1, ministry: 1, total_gmv: 1, seller_count: 1, vendor_concentration: 1, total_contracts: 1 } },
    ],
    explanation: "Departments most dependent on a single vendor (highest concentration)"
  },
  {
    id: "adjacent_products",
    keywords: ["adjacent", "also buy", "together", "target", "next", "related", "opportunity"],
    collection: "gem_kg_dept_product",
    pipeline: [
      { $match: { dept: { $regex: "municipal|health|sanitation|urban|nagar", $options: "i" } } },
      { $sort: { total_gmv: -1 } },
      { $limit: 50 },
      { $project: { _id: 0, dept: 1, product: 1, total_gmv: 1, contract_count: 1, seller_count: 1 } },
    ],
    explanation: "Products bought by target departments (municipal/health/sanitation)"
  },
  {
    id: "railway_defence",
    keywords: ["railway", "rail", "defence", "army", "military", "cantonm", "drdo"],
    collection: "gem_kg_dept_scores",
    pipeline: [
      { $match: { dept: { $regex: "railway|rail|cantonm|defence|army|armed|RCF|DRM", $options: "i" } } },
      { $sort: { total_gmv: -1 } },
      { $limit: 25 },
      { $project: { _id: 0, dept: 1, ministry: 1, total_gmv: 1, total_contracts: 1, seller_count: 1 } },
    ],
    explanation: "Railway and defence department procurement activity"
  },
  {
    id: "state_analysis",
    keywords: ["state", "region", "geography", "where", "location", "up", "maharashtra", "rajasthan"],
    collection: "gem_kg_dealer_state",
    pipeline: [
      { $group: { _id: "$state", dealer_count: { $sum: 1 }, total_gmv: { $sum: "$total_gmv" }, contract_count: { $sum: "$contract_count" } } },
      { $project: { _id: 0, state: "$_id", dealer_count: 1, total_gmv: 1, contract_count: 1 } },
      { $sort: { total_gmv: -1 } },
      { $limit: 30 },
    ],
    explanation: "Procurement activity by state"
  },
]

function matchTemplate(question: string): FallbackTemplate {
  const q = question.toLowerCase()
  let bestMatch: FallbackTemplate | null = null
  let bestScore = 0
  for (const t of FALLBACK_TEMPLATES) {
    const score = t.keywords.filter(kw => q.includes(kw.toLowerCase())).length
    if (score > bestScore) { bestScore = score; bestMatch = t }
  }
  return bestMatch ?? FALLBACK_TEMPLATES[1]
}

function fallbackSynthesize(
  question: string,
  rows: Record<string, unknown>[],
  template: FallbackTemplate
): { summary: string; findings: string[]; columns: Record<string, string> } {
  const total = rows.length
  const topRow = rows[0]
  const topLabel = topRow
    ? Object.entries(topRow).find(([k]) => ["dealer", "dept", "product", "state"].includes(k))?.[1] ?? ""
    : ""
  return {
    summary: `Found ${total} result${total !== 1 ? "s" : ""} for "${question}". Query used a deterministic template (${template.id}). ${template.explanation}.${total > 0 ? ` Top result: ${topLabel}` : ""}`,
    findings: [
      `${total} records returned using template: ${template.id}`,
      `Collection queried: ${template.collection}`,
      "Configure ANTHROPIC_API_KEY to enable AI-powered query generation and synthesis",
      total > 0 ? `Top entry: ${String(topLabel).slice(0, 80)}` : "No matching records found",
    ].filter(Boolean),
    columns: {},
  }
}

// ─── AI system prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a procurement intelligence analyst for 100X Circle, an Indian manufacturer of thermal fogging machines for vector control and pest management.

Your task: Convert a natural language question into a MongoDB aggregation pipeline.

## SCHEMA

### gem_contracts (~16,000 documents)
- gemc_no: string — unique contract ID like "GEMC-511687797044936"
- seller_name_canonical: string — dealer/seller name in ALL CAPS
- dept_name: string — buying government department
- ministry: string — ministry the dept belongs to
- product_name: string — product purchased
- contract_value_num: number — value in rupees (1 Cr = 10,000,000)
- seller_state: string — dealer's home state e.g. "UTTAR PRADESH"
- state: string — contracting/delivery state
- seller_gst: string — dealer GSTIN (15 chars)
- seller_phone: string — dealer phone
- seller_msme_category: string — "Micro"/"Small"/"Medium" or null
- contract_date_dt: string — ISO date "2024-03-15T..."
- quantity: number
- unit_rate: number — price per unit in rupees
- buyer_name: string — individual buyer
- buying_mode: string — procurement mode e.g. "GeM Pool"

### Pre-computed graph collections (use when built)
- gem_kg_dealer_scores: { dealer, total_contracts, total_gmv, dept_count, state_count, product_count, ministry_count, active_years, network_reach, state_reach, category_breadth, dealer_score }
- gem_kg_dealer_dept: { dealer, dept, ministry, contract_count, total_gmv, first_seen, last_seen, product_count, state_count }
- gem_kg_dealer_product: { dealer, product, contract_count, total_gmv, dept_count, state_count, first_seen, last_seen }
- gem_kg_dealer_state: { dealer, state, contract_count, total_gmv }
- gem_kg_dept_product: { dept, product, ministry, contract_count, total_gmv, seller_count, state_count, first_seen, last_seen }
- gem_kg_dept_scores: { dept, ministry, total_contracts, total_gmv, seller_count, product_count, state_count, vendor_concentration }
- gem_kg_product_scores: { product, total_contracts, total_gmv, dept_count, seller_count, state_count, growth_rate, fragmentation, year_trend }

## KEYWORD PATTERNS
- Fogging / 100X products: fog|fogger|thermal|ulv|mist blower|vector control|mosquito control|insecticide sprayer|knapsack sprayer
- Municipal depts: municipal|corporation|nagar nigam|nagar palika|nagar panchayat|civic|urban local body
- Health depts: health|hospital|medical|PHC|primary health|district health
- Sanitation: sanitation|waste|cleaning|sweeper|hygiene|solid waste
- Military: cantonm|defence|army|armed forces|DRDO
- Railways: railway|rail|RCF|DRM
- Airports: airport|AAI|DGCA

## RESPONSE FORMAT
Respond with ONLY valid JSON (no markdown, no explanation):
{
  "collection": "gem_contracts",
  "pipeline": [...valid MongoDB aggregation stages...],
  "explanation": "One sentence explaining what this query finds"
}

## RULES
1. Always end with { "$limit": 100 } (never exceed 100 results)
2. Put $match as early as possible to filter
3. Case-insensitive regex: { "$regex": "pattern", "$options": "i" }
4. For "more than N" use: { "$gt": N }
5. For grouping, compute both count and gmv
6. For finding dealers with multiple products/depts: group by dealer, use $addToSet, then filter by $size
7. Prefer gem_contracts for raw contract queries; prefer KG collections for pre-computed scores
8. Never use $out, $merge, $delete, $insert, $update (read-only)`

// ─── Validate pipeline ─────────────────────────────────────────────────────────

function validatePipeline(pipeline: unknown): pipeline is Record<string, unknown>[] {
  if (!Array.isArray(pipeline)) return false
  return pipeline.every(stage => {
    if (typeof stage !== "object" || stage === null || Array.isArray(stage)) return false
    const keys = Object.keys(stage as object)
    return keys.length >= 1 && keys.every(k => ALLOWED_STAGES.has(k))
  })
}

// ─── Logging helper ────────────────────────────────────────────────────────────

async function logQuery(
  db: Db,
  entry: {
    question:        string
    success:         boolean
    collection?:     string
    pipeline_stages?: number
    result_count?:   number
    confidence?:     number
    fallback?:       boolean
    error?:          string
  }
) {
  try {
    const logColl = db.collection("gem_procurement_ai_log")
    await logColl.insertOne({ ...entry, ts: new Date() })
    // Keep log to 200 most recent entries
    const count = await logColl.countDocuments()
    if (count > 200) {
      const oldest = await logColl.find().sort({ ts: 1 }).limit(count - 200).toArray()
      if (oldest.length > 0) {
        const ids = oldest.map((d: Record<string, unknown>) => d._id)
      await logColl.deleteMany({ _id: { $in: ids } } as Parameters<typeof logColl.deleteMany>[0])
      }
    }
  } catch { /* best-effort logging */ }
}

// ─── POST /api/admin/procurement/ai-analyst ────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "procurement.ai_analyst.view")
  if (!("user" in auth)) return auth

  let question: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bodyFilter: any
  try {
    const body = await req.json()
    question = (body.question || "").trim()
    bodyFilter = body.filter ?? null
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (question.length < 5) {
    return NextResponse.json({ error: "Question too short" }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  const db = (await clientPromise).db()

  // ── Cache setup (once per cold start) ────────────────────────────────────────
  await ensureCacheTtlIndex(db).catch(() => {})

  // ── Cache lookup (AI mode only — no key = skip cache) ────────────────────────
  const cacheKey = makeCacheKey(question)
  if (apiKey) {
    const hit = await getCached(db, cacheKey).catch(() => null)
    if (hit) {
      return NextResponse.json({ ...hit.result, cached: true, cache_key: cacheKey })
    }
  }

  // ── Shared audit stats ────────────────────────────────────────────────────────
  async function getDbStats() {
    const gc = db.collection("gem_contracts")
    const [total, drResult] = await Promise.all([
      gc.countDocuments(),
      gc.aggregate([
        { $match: { contract_date_dt: { $nin: [null, ""] } } },
        { $group: { _id: null, from: { $min: "$contract_date_dt" }, to: { $max: "$contract_date_dt" } } },
      ]).toArray(),
    ])
    const dr = drResult[0] as { from?: string; to?: string } | undefined
    const [sellers, depts] = await Promise.all([
      gc.distinct("seller_name_canonical").then((r: string[]) => r.filter(Boolean).length),
      gc.distinct("dept_name").then((r: string[]) => r.filter(Boolean).length),
    ])
    return {
      contracts_analyzed:   total,
      sellers_analyzed:     sellers,
      departments_analyzed: depts,
      data_range: { from: dr?.from || null, to: dr?.to || null },
    }
  }

  // ── Fallback mode (no API key) ────────────────────────────────────────────────
  if (!apiKey) {
    const template = matchTemplate(question)
    let rows: Record<string, unknown>[] = []
    try {
      rows = await db
        .collection(template.collection)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .aggregate(template.pipeline as any)
        .toArray()
        // strip MongoDB _id
        .then(r => r.map(({ _id, ...rest }) => { void _id; return rest }))
    } catch (err) {
      await logQuery(db, { question, success: false, fallback: true, error: String(err) })
      return NextResponse.json({
        error:  "Fallback query execution failed.",
        detail: String(err),
        setup:  "Add ANTHROPIC_API_KEY to .env.local or Vercel environment variables for AI mode.",
      }, { status: 500 })
    }

    const synthesis = fallbackSynthesize(question, rows, template)
    const pipelineStages = template.pipeline.length

    await logQuery(db, {
      question,
      success:         true,
      collection:      template.collection,
      pipeline_stages: pipelineStages,
      result_count:    rows.length,
      confidence:      40,
      fallback:        true,
    })

    const dbStats = await getDbStats().catch(() => ({
      contracts_analyzed: 0, sellers_analyzed: 0, departments_analyzed: 0,
      data_range: { from: null, to: null },
    }))

    return NextResponse.json({
      success:       true,
      fallback:      true,
      question,
      summary:       synthesis.summary,
      findings:      synthesis.findings,
      columns:       synthesis.columns,
      data:          rows,
      total:         rows.length,
      collection:    template.collection,
      pipeline_used: template.pipeline,
      explanation:   template.explanation,
      template_id:   template.id,
      audit: {
        data_range:           dbStats.data_range,
        contracts_analyzed:   dbStats.contracts_analyzed,
        sellers_analyzed:     dbStats.sellers_analyzed,
        departments_analyzed: dbStats.departments_analyzed,
        pipeline_stages:      pipelineStages,
        confidence_score:     40,
        collection_queried:   template.collection,
        generated_at:         new Date().toISOString(),
        mode:                 "fallback",
      },
    })
  }

  // ── AI mode ───────────────────────────────────────────────────────────────────
  const anthropic = new Anthropic({ apiKey })

  // Build filter context for system prompt
  let filterContext = ""
  if (bodyFilter) {
    const parts: string[] = []
    if (bodyFilter.dateFrom) parts.push(`date >= ${bodyFilter.dateFrom}`)
    if (bodyFilter.dateTo)   parts.push(`date <= ${bodyFilter.dateTo}`)
    if (bodyFilter.seller)   parts.push(`seller contains "${bodyFilter.seller}"`)
    if (bodyFilter.dept)     parts.push(`dept contains "${bodyFilter.dept}"`)
    if (bodyFilter.state)    parts.push(`state = "${bodyFilter.state}"`)
    if (bodyFilter.ministry) parts.push(`ministry = "${bodyFilter.ministry}"`)
    if (bodyFilter.valueMin) parts.push(`contract_value_num >= ${Number(bodyFilter.valueMin)}`)
    if (bodyFilter.valueMax) parts.push(`contract_value_num <= ${Number(bodyFilter.valueMax)}`)
    if (bodyFilter.msme)     parts.push("seller_msme_category is not null")
    if (bodyFilter.oem)      parts.push("oem = true")
    if (bodyFilter.country_of_origin) parts.push(`country_of_origin = "${bodyFilter.country_of_origin}"`)
    if (bodyFilter.status)   parts.push(`contract_status = "${bodyFilter.status}"`)
    if (parts.length > 0) {
      filterContext = `\n\nACTIVE FILTERS (apply these as early $match stages on gem_contracts):\n${parts.join(", ")}`
    }
  }

  // ── Step 1: Generate MongoDB pipeline ────────────────────────────────────────
  let pipelineData: { collection: string; pipeline: Record<string, unknown>[]; explanation: string }
  try {
    const msg = await anthropic.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 2048,
      system:     SYSTEM_PROMPT + filterContext,
      messages:   [{ role: "user", content: question }],
    })

    const raw = (msg.content[0] as { type: string; text: string }).text.trim()
    const jsonStr = raw.startsWith("{") ? raw : (raw.match(/\{[\s\S]*\}/) || [""])[0]
    const parsed = JSON.parse(jsonStr)

    if (!ALLOWED_COLLECTIONS.has(parsed.collection)) parsed.collection = "gem_contracts"
    if (!validatePipeline(parsed.pipeline)) throw new Error("Invalid pipeline structure")

    const last = parsed.pipeline[parsed.pipeline.length - 1]
    if (!last || !("$limit" in last)) parsed.pipeline.push({ $limit: 100 })
    else if ((last as Record<string, number>)["$limit"] > 100) (last as Record<string, number>)["$limit"] = 100

    pipelineData = {
      collection:  parsed.collection,
      pipeline:    parsed.pipeline,
      explanation: parsed.explanation || "Custom query",
    }
  } catch (err) {
    await logQuery(db, { question, success: false, error: String(err) })
    return NextResponse.json({
      error:  "Could not generate a valid query. Try rephrasing your question.",
      detail: String(err),
    }, { status: 422 })
  }

  // ── Step 2: Execute pipeline ──────────────────────────────────────────────────
  let rows: Record<string, unknown>[]
  let dbStats = { contracts_analyzed: 0, sellers_analyzed: 0, departments_analyzed: 0, data_range: { from: null as string | null, to: null as string | null } }
  try {
    rows = await db
      .collection(pipelineData.collection)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .aggregate(pipelineData.pipeline as any)
      .toArray()

    dbStats = await getDbStats()
  } catch (err) {
    await logQuery(db, { question, success: false, error: String(err), collection: pipelineData.collection })
    return NextResponse.json({
      error:          "Query execution failed. The generated pipeline had an error.",
      pipeline_used:  pipelineData.pipeline,
      collection:     pipelineData.collection,
      detail:         String(err),
    }, { status: 500 })
  }

  const cleanRows = rows.map(r => {
    const { _id, ...rest } = r as { _id: unknown } & Record<string, unknown>
    void _id
    return rest
  })

  // ── Step 3: Synthesize results ────────────────────────────────────────────────
  let synthesis: { summary: string; findings: string[]; columns: Record<string, string> }
  try {
    const sample = cleanRows.slice(0, 8)
    const synthMsg = await anthropic.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `You are a B2G sales intelligence analyst for 100X Circle (thermal fogging machine manufacturer targeting Indian government procurement).
Provide concise, specific, actionable insights. Use Indian number formatting (Cr for crore, L for lakh).`,
      messages: [{
        role:    "user",
        content: `User question: "${question}"
Query explanation: ${pipelineData.explanation}
Total results: ${cleanRows.length}
Sample data (first ${sample.length} rows): ${JSON.stringify(sample, null, 2)}

Respond with ONLY valid JSON:
{
  "summary": "2-3 sentence executive summary with specific numbers and business implications",
  "findings": ["Specific finding 1 with data points", "Finding 2", "Finding 3", "Finding 4", "Finding 5"],
  "columns": { "field_key": "Display Name", ... }
}`,
      }],
    })

    const synthRaw = (synthMsg.content[0] as { type: string; text: string }).text.trim()
    const synthJson = synthRaw.startsWith("{") ? synthRaw : (synthRaw.match(/\{[\s\S]*\}/) || ["{}"])[0]
    synthesis = JSON.parse(synthJson)
  } catch {
    synthesis = {
      summary:  `Found ${cleanRows.length} result${cleanRows.length !== 1 ? "s" : ""} for "${question}". Review the data table for details.`,
      findings: [`${cleanRows.length} records matched your query`, "Check the data table below for specific details"],
      columns:  {},
    }
  }

  // ── Confidence score ──────────────────────────────────────────────────────────
  const pipelineStages = pipelineData.pipeline.length
  const hasMatch = pipelineData.pipeline.some(s => "$match" in s)
  const hasGroup = pipelineData.pipeline.some(s => "$group" in s)
  const confidence = Math.min(100, Math.round(
    (hasMatch ? 25 : 10) +
    (hasGroup ? 20 : 15) +
    (cleanRows.length > 0 ? 20 : 0) +
    (pipelineStages >= 2 && pipelineStages <= 6 ? 20 : 10) +
    (pipelineData.collection !== "gem_contracts" ? 15 : 10)
  ))

  await logQuery(db, {
    question,
    success:         true,
    collection:      pipelineData.collection,
    pipeline_stages: pipelineStages,
    result_count:    cleanRows.length,
    confidence,
    fallback:        false,
  })

  const responseBody: Record<string, unknown> = {
    success:        true,
    fallback:       false,
    cached:         false,
    cache_key:      cacheKey,
    question,
    summary:        synthesis.summary  || "",
    findings:       synthesis.findings || [],
    columns:        synthesis.columns  || {},
    data:           cleanRows,
    total:          cleanRows.length,
    collection:     pipelineData.collection,
    pipeline_used:  pipelineData.pipeline,
    explanation:    pipelineData.explanation,
    audit: {
      data_range:           dbStats.data_range,
      contracts_analyzed:   dbStats.contracts_analyzed,
      sellers_analyzed:     dbStats.sellers_analyzed,
      departments_analyzed: dbStats.departments_analyzed,
      pipeline_stages:      pipelineStages,
      confidence_score:     confidence,
      collection_queried:   pipelineData.collection,
      generated_at:         new Date().toISOString(),
      mode:                 "ai",
    },
  }

  // Store successful AI response in cache
  await setCache(db, cacheKey, question, responseBody).catch(() => {})

  return NextResponse.json(responseBody)
}
