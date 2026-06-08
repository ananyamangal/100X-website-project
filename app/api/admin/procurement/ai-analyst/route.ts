import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import clientPromise from "@/lib/mongodb"

export const maxDuration = 60

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

// ─── System prompt ────────────────────────────────────────────────────────────

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

// ─── Validate pipeline ────────────────────────────────────────────────────────

function validatePipeline(pipeline: unknown): pipeline is Record<string, unknown>[] {
  if (!Array.isArray(pipeline)) return false
  return pipeline.every(stage => {
    if (typeof stage !== "object" || stage === null || Array.isArray(stage)) return false
    const keys = Object.keys(stage as object)
    return keys.length >= 1 && keys.every(k => ALLOWED_STAGES.has(k))
  })
}

// ─── POST /api/admin/procurement/ai-analyst ───────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({
      error: "ANTHROPIC_API_KEY not configured",
      setup: "Add ANTHROPIC_API_KEY to .env.local or Vercel environment variables, then redeploy."
    }, { status: 503 })
  }

  let question: string
  try {
    const body = await req.json()
    question = (body.question || "").trim()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (question.length < 5) {
    return NextResponse.json({ error: "Question too short" }, { status: 400 })
  }

  const anthropic = new Anthropic({ apiKey })

  // ── Step 1: Generate MongoDB pipeline ────────────────────────────────────────
  let pipelineData: { collection: string; pipeline: Record<string, unknown>[]; explanation: string }
  try {
    const msg = await anthropic.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 2048,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: "user", content: question }],
    })

    const raw = (msg.content[0] as { type: string; text: string }).text.trim()
    const jsonStr = raw.startsWith("{") ? raw : (raw.match(/\{[\s\S]*\}/) || [""])[0]
    const parsed = JSON.parse(jsonStr)

    if (!ALLOWED_COLLECTIONS.has(parsed.collection)) parsed.collection = "gem_contracts"
    if (!validatePipeline(parsed.pipeline)) throw new Error("Invalid pipeline structure")

    // Ensure hard limit
    const last = parsed.pipeline[parsed.pipeline.length - 1]
    if (!last || !("$limit" in last)) parsed.pipeline.push({ $limit: 100 })
    else if ((last as Record<string, number>)["$limit"] > 100) (last as Record<string, number>)["$limit"] = 100

    pipelineData = {
      collection:  parsed.collection,
      pipeline:    parsed.pipeline,
      explanation: parsed.explanation || "Custom query",
    }
  } catch (err) {
    return NextResponse.json({
      error:  "Could not generate a valid query. Try rephrasing your question.",
      detail: String(err),
    }, { status: 422 })
  }

  // ── Step 2: Execute pipeline ──────────────────────────────────────────────────
  let rows: Record<string, unknown>[]
  try {
    const db = (await clientPromise).db()
    rows = await db.collection(pipelineData.collection)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .aggregate(pipelineData.pipeline as any)
      .toArray()
  } catch (err) {
    return NextResponse.json({
      error:          "Query execution failed. The generated pipeline had an error.",
      pipeline_used:  pipelineData.pipeline,
      collection:     pipelineData.collection,
      detail:         String(err),
    }, { status: 500 })
  }

  // Remove MongoDB _id from rows
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
        role: "user",
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

  return NextResponse.json({
    success:        true,
    question,
    summary:        synthesis.summary  || "",
    findings:       synthesis.findings || [],
    columns:        synthesis.columns  || {},
    data:           cleanRows,
    total:          cleanRows.length,
    collection:     pipelineData.collection,
    pipeline_used:  pipelineData.pipeline,
    explanation:    pipelineData.explanation,
  })
}
