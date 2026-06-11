/**
 * AI Module Health Check
 * Tests Anthropic API connectivity and runs a real generation for each Claude-powered module.
 * Stores results in ai_health_checks collection.
 */
import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import clientPromise from "@/lib/mongodb"

const HAIKU = "claude-haiku-4-5-20251001"
const HAIKU_COST = { input: 0.80, output: 4.00 }   // USD per 1M tokens
const INR_PER_USD = 83

function calcCost(input: number, output: number) {
  const usd = (input / 1_000_000) * HAIKU_COST.input + (output / 1_000_000) * HAIKU_COST.output
  return { costUSD: Math.round(usd * 10000) / 10000, costINR: Math.round(usd * INR_PER_USD * 100) / 100 }
}

// ── Minimal real test prompts ─────────────────────────────────────────────────

const MODULE_TESTS = [
  {
    id:          "market_intelligence",
    name:        "Market Intelligence Director",
    path:        "/admin/growth/market-intelligence",
    description: "Product/State/Campaign opportunity scoring + founder briefing",
    prompt:      `You are Market Intelligence Director for 100X Circle (fogging machines, India).
Given: 5 RFQ leads from Maharashtra (thermal fogger), 3 from Gujarat (ULV sprayer).
Return ONLY JSON: {"what_to_sell":"...","where_to_sell":"...","confidence_level":"medium"}`,
    maxTokens:   80,
  },
  {
    id:          "creative_director",
    name:        "Creative Director",
    path:        "/admin/growth/ads/creative-director",
    description: "RSA headlines, descriptions, callouts across 8 persuasion frameworks",
    prompt:      `You are Google Ads Creative Director for 100X Circle (BIS-certified thermal fogging machines).
Generate 3 RSA headlines for a dealer acquisition campaign. Max 30 chars each.
Return ONLY JSON: {"headlines":[{"text":"...","framework":"authority"}]}`,
    maxTokens:   100,
  },
  {
    id:          "offpage_seo",
    name:        "Off-Page SEO Director",
    path:        "/admin/growth/seo/offpage",
    description: "Backlink discovery, outreach emails, citation building",
    prompt:      `You are Off-Page SEO Director for 100X Circle (fogging machine manufacturer, India).
Find 2 real backlink opportunities for the "pest control India" vertical.
Return ONLY JSON: [{"domain":"...","type":"directory","relevance":8}]`,
    maxTokens:   100,
  },
]

// ── GET — check API key presence and connectivity ─────────────────────────────

export async function GET() {
  const apiKey      = process.env.ANTHROPIC_API_KEY
  const keyPresent  = !!apiKey && apiKey.trim().length > 10
  const keyPrefix   = keyPresent ? `${apiKey!.slice(0, 7)}…` : "(not set)"

  if (!keyPresent) {
    return NextResponse.json({
      ok:           false,
      checkedAt:    new Date().toISOString(),
      apiKeyPresent: false,
      keyPrefix,
      diagnosis: {
        root_cause: "ANTHROPIC_API_KEY is not set in the server environment",
        impact:     "All 3 Claude-powered modules (Market Intelligence, Creative Director, Off-Page SEO) return errors",
        fix_steps: [
          "1. Go to console.anthropic.com → API Keys → Create key",
          "2. Open Vercel dashboard → 100X project → Settings → Environment Variables",
          "3. Add: ANTHROPIC_API_KEY = sk-ant-…  (all environments: Production + Preview + Development)",
          "4. Click Redeploy on the latest deployment (or push any commit)",
          "5. Run this health check again to confirm",
        ],
        local_fix: "Add ANTHROPIC_API_KEY=sk-ant-... to your .env.local file for local development",
      },
      modules: MODULE_TESTS.map(m => ({
        id:            m.id,
        name:          m.name,
        apiKeyPresent: false,
        claudeReachable: false,
        modelWorking:  false,
        latencyMs:     0,
        tokensReturned: 0,
        costUSD:       0,
        costINR:       0,
        error:         "ANTHROPIC_API_KEY not set — cannot test",
        storedInMongo: false,
      })),
    }, { status: 503 })
  }

  // Key present — run connectivity ping (one call proves the key works for all modules)
  const anthropic = new Anthropic({ apiKey })
  let pingOk       = false
  let pingLatency  = 0
  let pingError    = ""
  let pingTok      = 0

  try {
    const start    = Date.now()
    const ping     = await anthropic.messages.create({
      model:      HAIKU,
      max_tokens: 10,
      messages:   [{ role: "user", content: 'Reply with only: {"ok":true}' }],
    })
    pingLatency    = Date.now() - start
    pingTok        = (ping.usage?.input_tokens ?? 0) + (ping.usage?.output_tokens ?? 0)
    pingOk         = true
  } catch (e) {
    pingError      = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json({
    ok:            pingOk,
    checkedAt:     new Date().toISOString(),
    apiKeyPresent: true,
    keyPrefix,
    connectivity: {
      reachable:  pingOk,
      model:      HAIKU,
      latencyMs:  pingLatency,
      tokens:     pingTok,
      error:      pingError || null,
    },
    modules: MODULE_TESTS.map(m => ({
      id:            m.id,
      name:          m.name,
      apiKeyPresent: true,
      claudeReachable: pingOk,
      modelWorking:  pingOk,
      note:          "Connectivity confirmed — run POST ?action=test_all for full module tests",
    })),
  })
}

// ── POST — run real test generation for each module ───────────────────────────

export async function POST(req: NextRequest) {
  const body   = await req.json() as { action?: string; moduleId?: string }
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey || apiKey.trim().length < 10) {
    return NextResponse.json({
      ok:    false,
      error: "ANTHROPIC_API_KEY not configured — add it to Vercel environment variables and redeploy",
    }, { status: 503 })
  }

  const anthropic = new Anthropic({ apiKey })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db        = (await clientPromise).db() as any

  const toTest    = body.moduleId
    ? MODULE_TESTS.filter(m => m.id === body.moduleId)
    : MODULE_TESTS

  const results = []

  for (const mod of toTest) {
    const start = Date.now()
    try {
      const response = await anthropic.messages.create({
        model:      HAIKU,
        max_tokens: mod.maxTokens,
        messages:   [{ role: "user", content: mod.prompt }],
      })

      const latencyMs   = Date.now() - start
      const inputTok    = response.usage?.input_tokens  ?? 0
      const outputTok   = response.usage?.output_tokens ?? 0
      const totalTok    = inputTok + outputTok
      const { costUSD, costINR } = calcCost(inputTok, outputTok)
      const rawText     = response.content.find(b => b.type === "text")?.text ?? ""

      // Try parsing JSON to prove the module-level logic works
      let parsed: unknown = null
      let parseOk = false
      try {
        const jsonStr = rawText.replace(/^```[a-z]*\n?/m, "").replace(/\n?```$/m, "").trim()
        const match   = jsonStr.match(/[\[{][\s\S]+[\]}]/)
        if (match) { parsed = JSON.parse(match[0]); parseOk = true }
      } catch { /* ignore */ }

      const result = {
        id:             mod.id,
        name:           mod.name,
        description:    mod.description,
        apiKeyPresent:  true,
        claudeReachable: true,
        modelWorking:   true,
        jsonParseable:  parseOk,
        model:          HAIKU,
        latencyMs,
        inputTokens:    inputTok,
        outputTokens:   outputTok,
        tokensReturned: totalTok,
        costUSD,
        costINR,
        rawResponse:    rawText.slice(0, 500),
        parsedSample:   parsed,
        storedInMongo:  false,
        error:          null as string | null,
        testedAt:       new Date().toISOString(),
      }

      await db.collection("ai_health_checks").insertOne({
        ...result,
        type:      "module_test",
        rawResponse: rawText,
      })
      result.storedInMongo = true

      results.push(result)
    } catch (err) {
      const latencyMs = Date.now() - start
      const errMsg    = err instanceof Error ? err.message : String(err)
      const result    = {
        id:             mod.id,
        name:           mod.name,
        description:    mod.description,
        apiKeyPresent:  true,
        claudeReachable: false,
        modelWorking:   false,
        jsonParseable:  false,
        model:          HAIKU,
        latencyMs,
        inputTokens:    0,
        outputTokens:   0,
        tokensReturned: 0,
        costUSD:        0,
        costINR:        0,
        rawResponse:    "",
        parsedSample:   null,
        storedInMongo:  false,
        error:          errMsg.slice(0, 300),
        testedAt:       new Date().toISOString(),
      }
      results.push(result)
    }
  }

  const allPassing   = results.every(r => r.modelWorking)
  const totalTokens  = results.reduce((s, r) => s + r.tokensReturned, 0)
  const totalCostUSD = results.reduce((s, r) => s + r.costUSD, 0)
  const totalCostINR = results.reduce((s, r) => s + r.costINR, 0)
  const avgLatencyMs = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.latencyMs, 0) / results.length) : 0

  return NextResponse.json({
    ok:           allPassing,
    testedAt:     new Date().toISOString(),
    summary: {
      totalModules:  results.length,
      passing:       results.filter(r => r.modelWorking).length,
      failing:       results.filter(r => !r.modelWorking).length,
      totalTokens,
      totalCostUSD:  Math.round(totalCostUSD * 10000) / 10000,
      totalCostINR:  Math.round(totalCostINR * 100) / 100,
      avgLatencyMs,
    },
    modules: results,
  })
}
