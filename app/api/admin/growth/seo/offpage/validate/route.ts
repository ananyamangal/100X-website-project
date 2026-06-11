import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { discoverOpportunities } from "@/lib/growth-os/agents/offpage-seo-director"
import { logAgentRun } from "@/lib/growth-os/log-agent"

const VALIDATION_VERTICALS = [
  "government pest control India",
  "agricultural fogging equipment India",
  "public health vector control India",
  "MSME manufacturing directories India",
  "pest control industry associations India",
  "municipal corporation procurement India",
  "dengue malaria prevention equipment India",
  "industrial fumigation services India",
  "horticultural spray equipment India",
  "B2B directory thermal fogging India",
]

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function GET() {
  const db      = (await clientPromise).db()
  const reports = await db.collection("offpage_validation_reports")
    .find({})
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray()
  return NextResponse.json(JSON.parse(JSON.stringify(reports)))
}

export async function POST(req: NextRequest) {
  const body  = await req.json() as { action?: string; cycles?: number }
  const db    = (await clientPromise).db()

  if (body.action !== "run_validation" && body.action !== undefined) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  }

  const totalCycles = Math.min(body.cycles ?? 10, 10)
  const verticals   = VALIDATION_VERTICALS.slice(0, totalCycles)

  const startTime    = Date.now()
  const startedAt    = new Date().toISOString()
  const startCount   = await db.collection("offpage_opportunities").countDocuments()

  const cycleResults: Array<{
    cycle:      number
    vertical:   string
    newInserted: number
    domains:    string[]
    topScore:   number
    avgScore:   number
    error:      string | null
    durationMs: number
  }> = []

  let totalInserted    = 0
  const allNewDomains  = new Set<string>()
  let crossCycleDupCaught = 0

  for (let i = 0; i < verticals.length; i++) {
    const vertical    = verticals[i]
    const cycleStart  = Date.now()
    const beforeCount = await db.collection("offpage_opportunities").countDocuments()

    let newItems: Awaited<ReturnType<typeof discoverOpportunities>> = []
    let cycleError: string | null = null

    try {
      newItems = await discoverOpportunities(vertical, 10)
    } catch (e) {
      cycleError = e instanceof Error ? e.message : "Unknown error"
    }

    const afterCount   = await db.collection("offpage_opportunities").countDocuments()
    const newInserted  = afterCount - beforeCount
    const durationMs   = Date.now() - cycleStart

    totalInserted += newInserted

    // Track cross-cycle domain uniqueness
    const cycleDomains = newItems.map(o => o.domain.toLowerCase())
    let caughtThisCycle = 0
    for (const d of cycleDomains) {
      if (allNewDomains.has(d)) caughtThisCycle++
      else allNewDomains.add(d)
    }
    crossCycleDupCaught += caughtThisCycle

    cycleResults.push({
      cycle:       i + 1,
      vertical,
      newInserted,
      domains:     newItems.map(o => o.domain),
      topScore:    newItems.length > 0 ? Math.max(...newItems.map(o => o.scores.priorityScore)) : 0,
      avgScore:    newItems.length > 0 ? Math.round(newItems.reduce((s, o) => s + o.scores.priorityScore, 0) / newItems.length * 10) / 10 : 0,
      error:       cycleError,
      durationMs,
    })

    // Throttle between cycles to avoid Claude rate limits
    if (i < verticals.length - 1) await sleep(1500)
  }

  // Query all newly inserted items for quality analysis
  const newOpportunities = await db.collection("offpage_opportunities")
    .find({ createdAt: { $gte: startedAt } })
    .project({ domain: 1, scores: 1, type: 1, metadata: 1 })
    .toArray()

  // Domain uniqueness check on all items ever in DB
  const allDomains = await db.collection("offpage_opportunities")
    .find({}, { projection: { domain: 1 } })
    .toArray()
  const domainFreq: Record<string, number> = {}
  for (const d of allDomains) {
    const dom = String(d.domain ?? "").toLowerCase()
    domainFreq[dom] = (domainFreq[dom] ?? 0) + 1
  }
  const duplicatesInDB = Object.values(domainFreq).filter(f => f > 1).length

  // Score distribution for new items
  const scoreDistribution = {
    excellent: newOpportunities.filter(o => o.scores?.priorityScore >= 8).length,
    good:      newOpportunities.filter(o => o.scores?.priorityScore >= 6 && o.scores?.priorityScore < 8).length,
    average:   newOpportunities.filter(o => o.scores?.priorityScore >= 4 && o.scores?.priorityScore < 6).length,
    low:       newOpportunities.filter(o => o.scores?.priorityScore < 4).length,
  }

  // Type distribution
  const typeDistribution: Record<string, number> = {}
  for (const o of newOpportunities) {
    const t = String(o.type ?? "unknown")
    typeDistribution[t] = (typeDistribution[t] ?? 0) + 1
  }

  // Vertical distribution uniqueness: count unique domains per cycle
  const domainsByCycle = cycleResults.map(r => new Set(r.domains))
  const overlapCount = cycleResults.reduce((total, r, i) => {
    if (i === 0) return 0
    const prev = new Set(cycleResults.slice(0, i).flatMap(c => c.domains))
    return total + r.domains.filter(d => prev.has(d)).length
  }, 0)

  const totalDurationMs = Date.now() - startTime
  const errorCount      = cycleResults.filter(r => r.error).length

  const report = {
    reportId:    `seovalidate_${Date.now()}`,
    createdAt:   startedAt,
    completedAt: new Date().toISOString(),
    totalDurationMs,
    summary: {
      cyclesRun:              totalCycles,
      errorsEncountered:      errorCount,
      totalNewInserted:       totalInserted,
      totalOpportunitiesInDB: startCount + totalInserted,
      crossCycleDuplicatesCaught: overlapCount,
      duplicateDomainCountInDB:   duplicatesInDB,
      deduplicationWorking:   duplicatesInDB === 0,
      avgNewPerCycle:         totalCycles > 0 ? Math.round((totalInserted / totalCycles) * 10) / 10 : 0,
    },
    qualityReport: {
      scoreDistribution,
      typeDistribution,
      avgPriorityScore: newOpportunities.length > 0
        ? Math.round(newOpportunities.reduce((s, o) => s + (o.scores?.priorityScore ?? 0), 0) / newOpportunities.length * 10) / 10
        : 0,
      topDomains: newOpportunities
        .sort((a, b) => (b.scores?.priorityScore ?? 0) - (a.scores?.priorityScore ?? 0))
        .slice(0, 5)
        .map(o => ({ domain: o.domain, score: o.scores?.priorityScore ?? 0, vertical: o.metadata?.vertical ?? "" })),
    },
    cycleResults,
  }

  await db.collection("offpage_validation_reports").insertOne({ ...report })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await logAgentRun(db as any, {
    agent:          "Off-Page SEO Director",
    action:         `Validation: ${totalCycles} cycles · ${totalInserted} new · ${overlapCount} cross-cycle dups caught`,
    reason:         "Dedup + spam filtering validation run",
    expectedImpact: "Confirm deduplication and spam filtering are working correctly",
    actualImpact:   `DB dups: ${duplicatesInDB} · Score avg: ${report.qualityReport.avgPriorityScore}/10 · Errors: ${errorCount}`,
    level:          errorCount > 0 ? "warning" : "success",
    module:         "seo",
  })

  return NextResponse.json({ ok: true, report: JSON.parse(JSON.stringify(report)) })
}
