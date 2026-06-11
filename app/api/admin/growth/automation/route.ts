import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { Automation } from "@/lib/growth-os/types"

const DEFAULT_AGENTS: Omit<Automation, "_id">[] = [
  { id: "keyword-discovery", name: "Keyword Discovery Agent", description: "Scans GSC search queries and competitor pages to surface new keyword opportunities", module: "seo", riskLevel: "low", status: "paused", schedule: "Weekly — Monday 09:00", lastRun: undefined, successRate: undefined, runCount: 0, lastResult: undefined, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "competitor-monitor", name: "Competitor Monitor Agent", description: "Checks competitor sites for new pages, keywords, and content changes", module: "competitors", riskLevel: "low", status: "paused", schedule: "Daily — 08:00", lastRun: undefined, successRate: undefined, runCount: 0, lastResult: undefined, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "ai-citation-agent", name: "AI Citation Agent", description: "Tests whether 100X Circle appears in ChatGPT/Perplexity/Gemini answers for target queries", module: "geo", riskLevel: "low", status: "paused", schedule: "Weekly — Wednesday 10:00", lastRun: undefined, successRate: undefined, runCount: 0, lastResult: undefined, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "schema-audit", name: "Schema Audit Agent", description: "Verifies structured data on all pages, flags missing or broken schemas", module: "seo", riskLevel: "low", status: "active", schedule: "Weekly — Friday 10:00", lastRun: undefined, successRate: undefined, runCount: 0, lastResult: undefined, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "internal-link-agent", name: "Internal Link Agent", description: "Identifies pages with low internal link density and suggests additions", module: "seo", riskLevel: "low", status: "active", schedule: "Monthly — 1st Monday", lastRun: undefined, successRate: undefined, runCount: 0, lastResult: undefined, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "gem-opportunity-agent", name: "GeM Opportunity Agent", description: "Monitors GeM for new tender listings, category changes, and OEM demand signals", module: "gem", riskLevel: "low", status: "paused", schedule: "Daily — 07:00", lastRun: undefined, successRate: undefined, runCount: 0, lastResult: undefined, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "dealer-lead-agent", name: "Dealer Lead Agent", description: "Classifies incoming leads by dealer type, scores them, and flags high-potential applications", module: "dealers", riskLevel: "low", status: "active", schedule: "Continuous — on new lead", lastRun: undefined, successRate: undefined, runCount: 0, lastResult: undefined, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "content-brief-agent", name: "Content Brief Agent", description: "Generates content briefs for approved opportunities and queues them in Content Factory", module: "content", riskLevel: "medium", status: "paused", schedule: "On opportunity approval", lastRun: undefined, successRate: undefined, runCount: 0, lastResult: undefined, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "ads-keyword-agent", name: "Ads Keyword Agent", description: "Analyzes Search Console data to surface high-converting terms for Google Ads campaigns", module: "ads", riskLevel: "low", status: "paused", schedule: "Monthly — 1st", lastRun: undefined, successRate: undefined, runCount: 0, lastResult: undefined, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "metadata-optimizer", name: "Metadata Optimizer Agent", description: "Reviews title/description CTR in GSC and recommends improvements for low-CTR pages", module: "seo", riskLevel: "low", status: "paused", schedule: "Monthly — 15th", lastRun: undefined, successRate: undefined, runCount: 0, lastResult: undefined, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "gsc-sync", name: "GSC Data Sync", description: "Pulls 28-day query and page data from Google Search Console into MongoDB for analysis", module: "seo", riskLevel: "low", status: "paused", schedule: "Weekly — Monday 08:00", lastRun: undefined, successRate: undefined, runCount: 0, lastResult: undefined, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "seo-opportunity-agent", name: "SEO Opportunity Agent", description: "Scans GSC data for near-wins, rank drops, CTR gaps, and new keywords — creates actionable opportunities", module: "seo", riskLevel: "low", status: "paused", schedule: "Weekly — Monday 09:00", lastRun: undefined, successRate: undefined, runCount: 0, lastResult: undefined, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
]

export async function GET() {
  const db = (await clientPromise).db()
  const existing = await db.collection("growth_os_automations").find({}).toArray()

  if (existing.length === 0) {
    await db.collection("growth_os_automations").insertMany(DEFAULT_AGENTS)
    const seeded = await db.collection("growth_os_automations").find({}).toArray()
    return NextResponse.json(JSON.parse(JSON.stringify(seeded)))
  }

  // Upsert agents added to DEFAULT_AGENTS after initial seed
  const existingIds = new Set(existing.map((a: { id: string }) => a.id))
  const missing = DEFAULT_AGENTS.filter(a => !existingIds.has(a.id))
  if (missing.length > 0) {
    await db.collection("growth_os_automations").insertMany(missing)
    const updated = await db.collection("growth_os_automations").find({}).toArray()
    return NextResponse.json(JSON.parse(JSON.stringify(updated)))
  }

  // One-time migration: clear fake seed metrics (runCount > 0, no real lastRun evidence)
  // Agents that have never been truly dispatched had their counts set as demo values.
  // We reset any agent whose id is NOT in AGENT_DISPATCH keys.
  const realAgentIds = new Set([
    "dealer-lead-agent", "schema-audit", "internal-link-agent",
    "ai-citation-agent", "seo-opportunity-agent", "gsc-sync",
  ])
  const needsReset = existing.filter(
    (a: { id: string; runCount?: number; _fakeSeedCleaned?: boolean }) =>
      !realAgentIds.has(a.id) && (a.runCount ?? 0) > 0 && !a._fakeSeedCleaned
  )
  if (needsReset.length > 0) {
    for (const a of needsReset as Array<{ _id: unknown }>) {
      await db.collection("growth_os_automations").updateOne(
        { _id: a._id },
        { $set: { runCount: 0, successRate: undefined, lastRun: undefined, lastResult: undefined, _fakeSeedCleaned: true } }
      )
    }
    const cleaned = await db.collection("growth_os_automations").find({}).toArray()
    return NextResponse.json(JSON.parse(JSON.stringify(cleaned)))
  }

  return NextResponse.json(JSON.parse(JSON.stringify(existing)))
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, status, config } = body
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const db = (await clientPromise).db()
  const update: Record<string, unknown> = { status, updatedAt: new Date().toISOString() }
  if (config) update.config = config

  await db.collection("growth_os_automations").updateOne(
    { _id: new ObjectId(id) },
    { $set: update }
  )

  await db.collection("growth_os_logs").insertOne({
    ts: new Date().toISOString(),
    agent: "manual",
    action: `Automation ${status}: ${id}`,
    reason: `Status changed to ${status} by admin`,
    expectedImpact: "",
    level: "info",
    module: "automation",
  })

  return NextResponse.json({ ok: true })
}

const AGENT_DISPATCH: Record<string, () => Promise<{ summary: string }>> = {}

async function runGSCSync(): Promise<{ summary: string }> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.100xcircle.com").replace(/\/$/, "")
  const res = await fetch(`${base}/api/admin/gsc/sync`, {
    method: "POST",
    headers: { "Cookie": "admin-token=authenticated" },
  })
  const d = await res.json() as { ok?: boolean; queryCount?: number; pageCount?: number; errors?: string[] }
  if (!d.ok) throw new Error(d.errors?.[0] || "GSC sync failed")
  return { summary: `GSC sync complete: ${d.queryCount} queries, ${d.pageCount} pages` }
}

async function getDispatch() {
  if (Object.keys(AGENT_DISPATCH).length === 0) {
    const [{ runDealerLeadAgent }, { runSchemaAuditAgent }, { runInternalLinkAgent }, { runAICitationAgent }, { runSEOOpportunityAgent }] = await Promise.all([
      import("@/lib/growth-os/agents/dealer-lead"),
      import("@/lib/growth-os/agents/schema-audit"),
      import("@/lib/growth-os/agents/internal-link"),
      import("@/lib/growth-os/agents/ai-citation"),
      import("@/lib/growth-os/agents/seo-opportunity"),
    ])
    AGENT_DISPATCH["dealer-lead-agent"] = runDealerLeadAgent
    AGENT_DISPATCH["schema-audit"] = runSchemaAuditAgent
    AGENT_DISPATCH["internal-link-agent"] = runInternalLinkAgent
    AGENT_DISPATCH["ai-citation-agent"] = runAICitationAgent
    AGENT_DISPATCH["seo-opportunity-agent"] = runSEOOpportunityAgent
    AGENT_DISPATCH["gsc-sync"] = runGSCSync
  }
  return AGENT_DISPATCH
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const db = (await clientPromise).db()
  const agent = await db.collection("growth_os_automations").findOne({ _id: new ObjectId(id) })
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 })

  let runResult: string
  try {
    const dispatch = await getDispatch()
    const fn = dispatch[agent.id as string]
    if (fn) {
      const result = await fn()
      runResult = result.summary
    } else {
      return NextResponse.json({
        ok: false,
        result: `${agent.name} is not yet implemented. This agent is on the roadmap — check back in a future update.`,
        notImplemented: true,
      }, { status: 501 })
    }
  } catch (err) {
    runResult = `Error: ${err instanceof Error ? err.message : String(err)}`
  }

  await db.collection("growth_os_automations").updateOne(
    { _id: new ObjectId(id) },
    { $set: { lastRun: new Date().toISOString(), lastResult: runResult, updatedAt: new Date().toISOString() }, $inc: { runCount: 1 } }
  )

  await db.collection("growth_os_logs").insertOne({
    ts: new Date().toISOString(),
    agent: agent.name,
    action: `Manual run: ${runResult.slice(0, 120)}`,
    reason: "Admin triggered manual run",
    expectedImpact: agent.description,
    level: runResult.startsWith("Error") ? "error" : "info",
    module: agent.module,
  })

  return NextResponse.json({ ok: true, result: runResult })
}
