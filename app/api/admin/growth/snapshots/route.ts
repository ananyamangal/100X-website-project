/**
 * GET  /api/admin/growth/snapshots         — list recent snapshots per module
 * POST /api/admin/growth/snapshots         — create today's snapshots (all or specific module)
 *
 * Snapshot collections:
 *   competitor_snapshots   — daily competitor threat scores + AI visibility
 *   procurement_snapshots  — daily procurement stats (GMV, contracts, coverage)
 *   market_snapshots       — daily market summary (top states, top OEMs, search)
 */
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DB = "100xDB"

function todayKey() {
  return new Date().toISOString().slice(0, 10)   // YYYY-MM-DD
}

// ── Snapshot builders ──────────────────────────────────────────────────────────

async function buildProcurementSnapshot(db: Awaited<ReturnType<typeof clientPromise>>["db"] extends (...args: unknown[]) => infer R ? R : never) {
  const [summary, topStates, topOems] = await Promise.all([
    db.collection("fogging_contracts").aggregate([
      { $group: {
        _id:      null,
        total:    { $sum: 1 },
        totalGmv: { $sum: "$contract_value_num" },
        enriched: { $sum: { $cond: [{ $ne: ["$oem_canonical", null] }, 1, 0] } },
      }},
    ]).toArray(),
    db.collection("fogging_contracts").aggregate([
      { $group: { _id: "$buyer_state", count: { $sum: 1 }, gmv: { $sum: "$contract_value_num" } } },
      { $sort: { gmv: -1 } }, { $limit: 10 },
      { $match: { _id: { $ne: null } } },
    ]).toArray(),
    db.collection("fogging_contracts").aggregate([
      { $group: { _id: "$oem_canonical", count: { $sum: 1 }, gmv: { $sum: "$contract_value_num" } } },
      { $sort: { gmv: -1 } }, { $limit: 10 },
      { $match: { _id: { $ne: null } } },
    ]).toArray(),
  ])
  const s = summary[0] ?? {}
  return {
    totalContracts: s.total ?? 0,
    totalGmvCr:     +((s.totalGmv ?? 0) / 10_000_000).toFixed(2),
    enrichedPct:    s.total ? Math.round(((s.enriched ?? 0) / s.total) * 100) : 0,
    topStates:      topStates.map(x => ({ state: x._id, count: x.count, gmvCr: +(x.gmv / 10_000_000).toFixed(2) })),
    topOems:        topOems.map(x => ({ oem: x._id, count: x.count, gmvCr: +(x.gmv / 10_000_000).toFixed(2) })),
  }
}

async function buildCompetitorSnapshot(db: ReturnType<typeof clientPromise extends Promise<infer C> ? (C extends { db: (...a: unknown[]) => infer D } ? () => D : never) : never>) {
  const docs = await db.collection("seo_competitors").find({}, {
    projection: { name: 1, competitor_type: 1, scores: 1, ai_mentions: 1, last_updated: 1 },
  }).toArray()

  const weightedScores = docs.map(c => {
    const s  = c.scores ?? {}
    const ai = c.ai_mentions ?? {}
    const searchVis = Math.min(s.search_visibility ?? 0, 100)
    const aiVis     = Math.min(Math.max(s.ai_search_visibility ?? 0, (ai.mention_count ?? 0) * 25), 100)
    const authority = Math.min(s.authority ?? 0, 100)
    const govScore  = Math.min(Math.max(s.gem_visibility ?? 0, s.tender_visibility ?? 0), 100)
    const score     = Math.round(searchVis * 0.25 + aiVis * 0.15 + authority * 0.15 + govScore * 0.15 + (s.revenue_potential ?? 0) * 0.10)
    return { name: c.name, type: c.competitor_type, score, aiCount: ai.mention_count ?? 0 }
  })

  const high   = weightedScores.filter(c => c.score >= 55).length
  const medium = weightedScores.filter(c => c.score >= 30 && c.score < 55).length
  const aiVisible = weightedScores.filter(c => c.aiCount > 0).length
  const avgScore  = weightedScores.length
    ? Math.round(weightedScores.reduce((s, c) => s + c.score, 0) / weightedScores.length)
    : 0

  return {
    totalTracked: docs.length,
    highThreat:   high,
    mediumThreat: medium,
    lowThreat:    docs.length - high - medium,
    aiVisible,
    avgThreatScore: avgScore,
    topThreats: weightedScores.sort((a, b) => b.score - a.score).slice(0, 5),
  }
}

async function buildMarketSnapshot(db: ReturnType<typeof clientPromise extends Promise<infer C> ? (C extends { db: (...a: unknown[]) => infer D } ? () => D : never) : never>) {
  const [gscStats, contractStats] = await Promise.all([
    db.collection("gsc_query_rows").aggregate([
      { $group: { _id: null, clicks: { $sum: "$clicks" }, impressions: { $sum: "$impressions" }, queries: { $sum: 1 } } },
    ]).toArray(),
    db.collection("fogging_contracts").aggregate([
      { $group: { _id: null, total: { $sum: 1 }, gmv: { $sum: "$contract_value_num" } } },
    ]).toArray(),
  ])
  return {
    gscClicks:      gscStats[0]?.clicks ?? 0,
    gscImpressions: gscStats[0]?.impressions ?? 0,
    totalQueries:   gscStats[0]?.queries ?? 0,
    procurementContracts: contractStats[0]?.total ?? 0,
    procurementGmvCr:     +((contractStats[0]?.gmv ?? 0) / 10_000_000).toFixed(2),
  }
}

// ── Route handlers ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const client = await clientPromise
  const db     = client.db(DB)
  const module = req.nextUrl.searchParams.get("module") ?? "all"
  const days   = parseInt(req.nextUrl.searchParams.get("days") ?? "30")

  const since  = new Date()
  since.setDate(since.getDate() - days)

  const filter = { date: { $gte: since.toISOString().slice(0, 10) } }
  const sort   = { date: -1 } as const

  const [procurement, competitors, market] = await Promise.all([
    module === "all" || module === "procurement"
      ? db.collection("procurement_snapshots").find(filter).sort(sort).limit(90).toArray()
      : [],
    module === "all" || module === "competitors"
      ? db.collection("competitor_snapshots").find(filter).sort(sort).limit(90).toArray()
      : [],
    module === "all" || module === "market"
      ? db.collection("market_snapshots").find(filter).sort(sort).limit(90).toArray()
      : [],
  ])

  return NextResponse.json({
    procurement: procurement.map(s => ({ ...s, _id: String(s._id) })),
    competitors:  competitors.map(s => ({ ...s, _id: String(s._id) })),
    market:       market.map(s => ({ ...s, _id: String(s._id) })),
  })
}

export async function POST(req: NextRequest) {
  const body   = await req.json().catch(() => ({})) as { module?: string; force?: boolean }
  const module = body.module ?? "all"
  const force  = body.force ?? false
  const today  = todayKey()
  const execId = `snap_${today}_${Date.now()}`

  const client = await clientPromise
  const db     = client.db(DB)
  const t0     = Date.now()
  const created: string[] = []

  async function upsertSnapshot(collection: string, data: Record<string, unknown>) {
    const existing = await db.collection(collection).findOne({ date: today })
    if (existing && !force) {
      return { skipped: true, collection }
    }
    await db.collection(collection).updateOne(
      { date: today },
      { $set: {
        date:        today,
        createdAt:   new Date().toISOString(),
        executionId: execId,
        version:     "v1.4",
        ...data,
      }},
      { upsert: true }
    )
    created.push(collection)
    return { created: true, collection }
  }

  try {
    if (module === "all" || module === "procurement") {
      const data = await buildProcurementSnapshot(db as Parameters<typeof buildProcurementSnapshot>[0])
      await upsertSnapshot("procurement_snapshots", { metrics: data })
    }
    if (module === "all" || module === "competitors") {
      const data = await buildCompetitorSnapshot(db as Parameters<typeof buildCompetitorSnapshot>[0])
      await upsertSnapshot("competitor_snapshots", { metrics: data })
    }
    if (module === "all" || module === "market") {
      const data = await buildMarketSnapshot(db as Parameters<typeof buildMarketSnapshot>[0])
      await upsertSnapshot("market_snapshots", { metrics: data })
    }

    // Write execution log
    await db.collection("growth_os_logs").insertOne({
      ts:          new Date().toISOString(),
      agent:       "snapshot-engine",
      action:      "daily_snapshot_created",
      module:      "snapshots",
      executionId: execId,
      created,
      durationMs:  Date.now() - t0,
      date:        today,
      level:       "info",
    })

    return NextResponse.json({
      ok:          true,
      executionId: execId,
      date:        today,
      created,
      durationMs:  Date.now() - t0,
    })
  } catch (e) {
    await db.collection("growth_os_logs").insertOne({
      ts:     new Date().toISOString(),
      agent:  "snapshot-engine",
      action: "daily_snapshot_failed",
      module: "snapshots",
      error:  String(e),
      level:  "error",
    })
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
