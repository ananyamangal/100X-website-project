import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { COLL, isoWeek } from "@/lib/growth-os/opportunity-core"
import { ACTION_STATUSES, TOP_N_COMBINED, type ActionStatus, type Segment } from "@/lib/growth-os/opportunity-config"

const SEGMENTS: Segment[] = ["dealer", "machine_buyer"]

/**
 * Unified read/update surface for the Contact This Week experience.
 *
 * GET
 *   ?week=YYYY-Www              (default: current ISO week)
 *   ?segment=dealer|machine_buyer|all   (default: all)
 *   ?state=, ?minScore=, ?status=       (optional server-side filters)
 *   ?format=md&segment=dealer  → download that segment's weekly report
 *   ?list=weeks                → list archived report weeks
 *   For segment=all also returns combined "Top 50 Opportunities This Week".
 *
 * PATCH  { segment, entityKey, status, notes? } → set action-status workflow state.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const week = searchParams.get("week") || isoWeek()
  const segment = (searchParams.get("segment") || "all") as Segment | "all"
  const format = searchParams.get("format")
  const list = searchParams.get("list")
  const state = searchParams.get("state") || ""
  const minScore = parseFloat(searchParams.get("minScore") || "0")
  const status = searchParams.get("status") || ""
  const db = (await clientPromise).db()

  if (list === "weeks") {
    const weeks = await db.collection(COLL.reports)
      .find({}, { projection: { week: 1, segment: 1, count: 1, generatedAt: 1, scoringVersion: 1, taxonomyVersion: 1 } })
      .sort({ week: -1 }).toArray()
    return NextResponse.json(JSON.parse(JSON.stringify(weeks)))
  }

  if (format === "md") {
    const seg = segment === "all" ? "dealer" : segment
    const report = await db.collection(COLL.reports).findOne({ week, segment: seg })
    const md = (report?.markdown as string) || `# No ${seg} report for ${week}`
    return new Response(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${seg}-opportunities-${week}.md"`,
      },
    })
  }

  const baseFilter: Record<string, unknown> = { week }
  if (segment !== "all") baseFilter.segment = segment
  if (state) baseFilter.geography = state
  if (minScore > 0) baseFilter.score = { $gte: minScore }
  if (status) baseFilter.actionStatus = status

  const items = await db.collection(COLL.opportunities).find(baseFilter).sort({ score: -1 }).toArray()
  type Row = { segment: string; entityName: string; score: number; geography: string | null; [k: string]: unknown }
  const clean = JSON.parse(JSON.stringify(items)) as Row[]

  // Merge Action Center state (owner, follow-up, notes) into each row
  const allStatus = await db.collection(COLL.status).find({}).toArray()
  const actionMap = new Map<string, Record<string, unknown>>(
    allStatus.map((s) => [`${s.segment}::${s.entityKey}`, s])
  )
  for (const r of clean) {
    const rec = actionMap.get(`${r.segment}::${r.entityName}`)
    r.owner = (rec?.owner as string) || null
    r.followUpAt = (rec?.followUpAt as string) || null
    r.notesCount = Array.isArray(rec?.noteLog) ? (rec!.noteLog as unknown[]).length : 0
    r.contactLogCount = Array.isArray(rec?.contactLog) ? (rec!.contactLog as unknown[]).length : 0
  }

  const dealers = clean.filter((r) => r.segment === "dealer")
  const machineBuyers = clean.filter((r) => r.segment === "machine_buyer")
  const combined = [...clean].sort((a, b) => b.score - a.score).slice(0, TOP_N_COMBINED)

  const reports = await db.collection(COLL.reports).find({ week }).toArray()
  const meta = reports.reduce((acc: Record<string, unknown>, r) => {
    acc[r.segment] = { count: r.count, generatedAt: r.generatedAt, suppressed: r.suppressed, scoringVersion: r.scoringVersion, taxonomyVersion: r.taxonomyVersion }
    return acc
  }, {})

  // distinct states for filter UI
  const states = Array.from(new Set(clean.map((r) => r.geography).filter(Boolean))).sort()

  return NextResponse.json({ week, dealers, machineBuyers, combined, states, meta, statuses: ACTION_STATUSES })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const segment = body.segment as Segment
  const entityKey = String(body.entityKey || "").trim()
  const status = body.status as ActionStatus
  const notes = body.notes ? String(body.notes) : ""

  if (!SEGMENTS.includes(segment)) return NextResponse.json({ error: "invalid segment" }, { status: 400 })
  if (!entityKey) return NextResponse.json({ error: "entityKey required" }, { status: 400 })
  if (!ACTION_STATUSES.includes(status)) {
    return NextResponse.json({ error: `status must be one of ${ACTION_STATUSES.join(", ")}` }, { status: 400 })
  }

  const db = (await clientPromise).db()
  const now = new Date().toISOString()

  await db.collection(COLL.status).updateOne(
    { segment, entityKey },
    { $set: { segment, entityKey, status, statusNote: notes, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true }
  )
  // reflect immediately on current rows so the UI updates without a re-run
  await db.collection(COLL.opportunities).updateMany({ segment, entityKey }, { $set: { actionStatus: status } })

  await db.collection("growth_os_logs").insertOne({
    ts: now, agent: "Opportunity Workflow",
    action: `${segment} "${entityKey}" → ${status}`,
    reason: notes || "Status updated via Contact This Week",
    expectedImpact: "", actualImpact: "", level: "info", module: "dealers",
  })

  return NextResponse.json({ ok: true, segment, entityKey, status })
}
