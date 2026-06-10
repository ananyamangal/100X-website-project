import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { runKeywordIntelligence, KEYWORD_INTELLIGENCE_COLL } from "@/lib/growth-os/ads-keyword-intelligence"
import { runNegativeIntelligence, NEGATIVE_INTELLIGENCE_COLL } from "@/lib/growth-os/ads-negative-intelligence"

export const dynamic = "force-dynamic"

// GET — latest keyword + negative intelligence runs
export async function GET() {
  try {
    const db = (await clientPromise).db()

    const [keywordRuns, negativeRuns] = await Promise.all([
      db.collection(KEYWORD_INTELLIGENCE_COLL)
        .find({}, { sort: { generatedAt: -1 }, limit: 5 })
        .toArray(),
      db.collection(NEGATIVE_INTELLIGENCE_COLL)
        .find({}, { sort: { generatedAt: -1 }, limit: 5 })
        .toArray(),
    ])

    return NextResponse.json({
      keywords: keywordRuns.map(({ _id, ...r }) => r),
      negatives: negativeRuns.map(({ _id, ...r }) => r),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST — run keyword + negative intelligence engines (standalone, no campaign deploy)
export async function POST() {
  try {
    const kwRun  = await runKeywordIntelligence({ funnel: "A" })

    const flat = [...kwRun.byTheme.dealer, ...kwRun.byTheme.oem, ...kwRun.byTheme.gem]
    const negRun = await runNegativeIntelligence({ positiveKeywords: flat })

    return NextResponse.json({
      ok:            true,
      keywordRunId:  kwRun.runId,
      negativeRunId: negRun.runId,
      summary: {
        totalKeywords:  kwRun.totalCount,
        byTheme: {
          dealer: kwRun.byTheme.dealer.length,
          oem:    kwRun.byTheme.oem.length,
          gem:    kwRun.byTheme.gem.length,
        },
        bySource:        kwRun.bySource,
        byIntent:        kwRun.byIntent,
        totalNegatives:  negRun.totalCount,
        negativesBySource: negRun.bySource,
      },
    })
  } catch (err) {
    console.error("[keyword-intelligence] error:", String(err))
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
