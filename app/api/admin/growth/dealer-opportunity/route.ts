import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { DEALER_STATUSES, isoWeek, type DealerStatus } from "@/lib/growth-os/agents/dealer-opportunity"

/**
 * GET  — current-week Top 20 + archived report.
 *        ?week=YYYY-Www to fetch a specific week.
 *        ?format=md to download the markdown report.
 *        ?list=weeks to list archived report weeks.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const week = searchParams.get("week") || isoWeek()
  const format = searchParams.get("format")
  const list = searchParams.get("list")
  const db = (await clientPromise).db()

  if (list === "weeks") {
    const weeks = await db
      .collection("dealer_opportunity_reports")
      .find({}, { projection: { week: 1, generatedAt: 1, count: 1 } })
      .sort({ week: -1 })
      .toArray()
    return NextResponse.json(JSON.parse(JSON.stringify(weeks)))
  }

  const report = await db.collection("dealer_opportunity_reports").findOne({ week })

  if (format === "md") {
    const md = (report?.markdown as string) || `# No dealer report for ${week}`
    return new Response(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="dealer-opportunities-${week}.md"`,
      },
    })
  }

  const items = await db
    .collection("dealer_opportunities")
    .find({ week })
    .sort({ rank: 1 })
    .toArray()

  return NextResponse.json({
    week,
    top20: JSON.parse(JSON.stringify(items)),
    stateRanking: report?.stateRanking || [],
    generatedAt: report?.generatedAt || null,
    suppressed: report?.suppressed || 0,
  })
}

/**
 * PATCH — set a dealer's action status in the workflow.
 * body: { dealer: string, status: DealerStatus, notes?: string }
 * Won/Lost/Ignore suppress the dealer from future weekly lists.
 */
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const dealer = String(body.dealer || "").trim()
  const status = body.status as DealerStatus
  const notes = body.notes ? String(body.notes) : ""

  if (!dealer) return NextResponse.json({ error: "dealer required" }, { status: 400 })
  if (!DEALER_STATUSES.includes(status)) {
    return NextResponse.json({ error: `status must be one of ${DEALER_STATUSES.join(", ")}` }, { status: 400 })
  }

  const db = (await clientPromise).db()
  const now = new Date().toISOString()

  await db.collection("dealer_action_status").updateOne(
    { dealer },
    { $set: { dealer, status, notes, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true }
  )

  // reflect immediately on any current-week row so the UI updates without a re-run
  await db
    .collection("dealer_opportunities")
    .updateMany({ dealer }, { $set: { action_status: status } })

  await db.collection("growth_os_logs").insertOne({
    ts: now,
    agent: "Dealer Opportunity Engine",
    action: `Dealer "${dealer}" → ${status}`,
    reason: notes || "Status updated via Dealer Intelligence",
    expectedImpact: "",
    actualImpact: "",
    level: "info",
    module: "dealers",
  })

  return NextResponse.json({ ok: true, dealer, status })
}
