import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db  = (await clientPromise).db()
    const doc = await db.collection("crm_opportunities").findOne({ _id: new ObjectId(params.id) })
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ ...doc, _id: String(doc._id) })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body   = await req.json()
    const db     = (await clientPromise).db()
    const now    = new Date().toISOString()
    const update: Record<string, unknown> = { updated_at: now }
    const fields = [
      "name", "organization", "state", "opportunity_type", "stage",
      "value", "probability", "actual_revenue", "owner",
      "source_recommendation_id", "source_type", "notes", "next_action",
    ]
    for (const f of fields) {
      if (body[f] !== undefined) update[f] = body[f]
    }
    // Record terminal timestamps
    if (body.stage === "won"  && !body.won_at)  update.won_at  = now
    if (body.stage === "lost" && !body.lost_at) update.lost_at = now
    const result = await db.collection("crm_opportunities").updateOne(
      { _id: new ObjectId(params.id) },
      { $set: update }
    )
    if (result.matchedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = (await clientPromise).db()
    await db.collection("crm_opportunities").deleteOne({ _id: new ObjectId(params.id) })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
