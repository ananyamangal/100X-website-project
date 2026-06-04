import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET() {
  const db = (await clientPromise).db()
  const citations = await db.collection("growth_os_citations").find({}).sort({ checkedAt: -1 }).toArray()
  return NextResponse.json(JSON.parse(JSON.stringify(citations)))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { platform, query, status, competitor, source, notes } = body
  if (!platform || !query || !status) {
    return NextResponse.json({ error: "platform, query, and status are required" }, { status: 400 })
  }

  const db = (await clientPromise).db()
  const now = new Date().toISOString()

  await db.collection("growth_os_citations").updateOne(
    { platform, query },
    {
      $set: {
        platform,
        query,
        status,
        competitor: competitor || null,
        source: source || null,
        notes: notes || null,
        checkedAt: now,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  )

  // If marking as completed task in citation_tasks, auto-complete the pending task
  await db.collection("growth_os_citation_tasks").updateMany(
    { platform, query, status: "pending" },
    { $set: { status: "completed", completedAt: now } }
  )

  return NextResponse.json({ ok: true })
}
