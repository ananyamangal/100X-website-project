import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { runWeeklyExecSummary } from "@/lib/growth-os/agents/weekly-exec-summary"
import { isoWeek } from "@/lib/growth-os/opportunity-core"

const COLL_SUMMARY = "growth_exec_summaries"

/**
 * GET  ?week= (default latest) ; ?format=md to download.
 * POST → generate/refresh this week's executive summary on demand.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const week = searchParams.get("week")
  const format = searchParams.get("format")
  const db = (await clientPromise).db()

  const doc = week
    ? await db.collection(COLL_SUMMARY).findOne({ week })
    : await db.collection(COLL_SUMMARY).findOne({}, { sort: { week: -1 } })

  if (format === "md") {
    const md = (doc?.markdown as string) || `# No executive summary yet (week ${week || isoWeek()})`
    return new Response(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="exec-summary-${doc?.week || isoWeek()}.md"`,
      },
    })
  }
  return NextResponse.json(doc ? JSON.parse(JSON.stringify(doc)) : { week: isoWeek(), stats: null, markdown: null })
}

export async function POST() {
  try {
    const result = await runWeeklyExecSummary()
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: "Failed", detail: String(err) }, { status: 500 })
  }
}
